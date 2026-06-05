import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CompetitionRound, IdeaStatus } from "@prisma/client"
import { calculateWeightedScore, calculateStandardDeviation, TIEBREAK_BONUS_PCT } from "@/lib/scoring"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  if (session.user.role !== "ADMIN") return null
  return session
}

async function writeAuditLog(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata?: Record<string, unknown>
) {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      metadata: (metadata ?? {}) as object,
    },
  })
}

const ROUND_ORDER: CompetitionRound[] = ["QF", "SF", "FINAL"]

const ROUND_TO_STATUS: Record<CompetitionRound, IdeaStatus> = {
  QF: "QUARTER_FINALIST",
  SF: "SEMI_FINALIST",
  FINAL: "FINALIST",
}

const ELIMINATED_STATUS: IdeaStatus = "ELIMINATED"

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const editionId = searchParams.get("editionId")

  const edition = editionId
    ? await prisma.edition.findUnique({ where: { id: editionId } })
    : await prisma.edition.findFirst({ where: { status: "ACTIVE" }, orderBy: { year: "desc" } })

  if (!edition) return NextResponse.json({ error: "No active edition found" }, { status: 404 })

  const rounds = await Promise.all(
    ROUND_ORDER.map(async (round) => {
      const roundStatus = ROUND_TO_STATUS[round]

      const ideas = await prisma.idea.findMany({
        where: {
          editionId: edition.id,
          status: {
            in: [
              roundStatus,
              ELIMINATED_STATUS,
              round === "FINAL" ? "WINNER" : roundStatus,
            ],
          },
          presentations: { some: { round } },
        },
        include: {
          scores: {
            where: { round },
            include: {
              items: {
                include: { criterion: { select: { number: true } } },
              },
            },
          },
        },
      })

      const juryMembers = await prisma.user.findMany({
        where: { role: "JURY", editionId: edition.id },
        select: { id: true, name: true },
      })

      const quorumStatus = ideas.map((idea) => {
        const scores = idea.scores
        const juryScored = juryMembers.map((j) => {
          const score = scores.find((s) => s.juryMemberId === j.id)
          return {
            juryId: j.id,
            juryName: j.name,
            hasScored: !!score?.submittedAt,
            isConflict: score?.conflictDeclared ?? false,
          }
        })
        const allDone = juryScored.every((j) => j.hasScored || j.isConflict)
        return {
          ideaId: idea.id,
          codeName: idea.codeName,
          allJuryDone: allDone,
          juryScored,
        }
      })

      const quorumMet = quorumStatus.every((s) => s.allJuryDone)

      return {
        round,
        editionId: edition.id,
        ideasCount: ideas.length,
        quorumMet,
        quorumStatus,
      }
    })
  )

  return NextResponse.json({ edition, rounds })
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { action, round, editionId } = body as {
    action: "close_round" | "trigger_progression" | "apply_tiebreak" | "open_round" | "assign_to_round"
    round: CompetitionRound
    editionId: string
  }

  if (!action || !round || !editionId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  if (!ROUND_ORDER.includes(round)) {
    return NextResponse.json({ error: "Invalid round" }, { status: 400 })
  }

  const edition = await prisma.edition.findUnique({ where: { id: editionId } })
  if (!edition) return NextResponse.json({ error: "Edition not found" }, { status: 404 })

  if (action === "assign_to_round") {
    const { ideaIds } = body as { ideaIds: string[] }
    if (!ideaIds?.length) return NextResponse.json({ error: "ideaIds required" }, { status: 400 })

    const targetStatus = ROUND_TO_STATUS[round]

    await prisma.idea.updateMany({
      where: { id: { in: ideaIds } },
      data: { status: targetStatus },
    })

    // Create a Presentation record for each idea that doesn't have one yet in this round
    for (const ideaId of ideaIds) {
      const exists = await prisma.presentation.findFirst({ where: { ideaId, round } })
      if (!exists) await prisma.presentation.create({ data: { ideaId, editionId, round } })
    }

    await writeAuditLog(session.user.id, "ASSIGN_TO_ROUND", "Edition", editionId, {
      round,
      ideaIds,
    })

    return NextResponse.json({ success: true, assigned: ideaIds.length })
  }

  if (action === "open_round") {
    await writeAuditLog(session.user.id, "OPEN_ROUND", "Edition", editionId, { round })
    return NextResponse.json({ success: true, message: `Round ${round} marked open` })
  }

  if (action === "close_round") {
    const juryMembers = await prisma.user.findMany({
      where: { role: "JURY", editionId },
      select: { id: true },
    })

    const roundStatus = ROUND_TO_STATUS[round]
    const ideas = await prisma.idea.findMany({
      where: {
        editionId,
        presentations: { some: { round } },
        status: roundStatus,
      },
      select: { id: true, codeName: true },
    })

    for (const idea of ideas) {
      for (const jury of juryMembers) {
        const score = await prisma.score.findUnique({
          where: { ideaId_round_juryMemberId: { ideaId: idea.id, round, juryMemberId: jury.id } },
        })
        if (!score?.submittedAt && !score?.conflictDeclared) {
          return NextResponse.json(
            {
              error: "Quorum not met",
              message: `Jury member ${jury.id} has not scored idea ${idea.codeName} in round ${round}`,
            },
            { status: 422 }
          )
        }
      }
    }

    if (round === "FINAL") {
      await prisma.externalSurveyTrigger.createMany({
        data: [
          {
            editionId,
            triggerType: "TRG_001",
            targetAudienceDescription: "Jury members",
            surveyUrl: edition.surveyUrlPostJury ?? null,
            status: "PENDING",
          },
          {
            editionId,
            triggerType: "TRG_002",
            targetAudienceDescription: "Participants",
            surveyUrl: edition.surveyUrlPostParticipant ?? null,
            status: "PENDING",
          },
        ],
      })
    }

    await writeAuditLog(session.user.id, "CLOSE_ROUND", "Edition", editionId, { round })
    return NextResponse.json({ success: true, message: `Round ${round} closed` })
  }

  if (action === "trigger_progression") {
    const roundIdx = ROUND_ORDER.indexOf(round)
    const nextRound = ROUND_ORDER[roundIdx + 1] as CompetitionRound | undefined
    const currentStatus = ROUND_TO_STATUS[round]

    const scores = await prisma.score.findMany({
      where: { editionId, round },
      include: {
        idea: { select: { id: true, codeName: true, category: true, status: true } },
        items: {
          include: { criterion: { select: { number: true } } },
        },
      },
    })

    type IdeaAgg = {
      ideaId: string
      codeName: string
      category: "CX" | "BI" | "OE"
      scores: number[]
      avgScore: number
    }

    const ideaMap = new Map<string, IdeaAgg>()

    for (const score of scores) {
      if (score.idea.status !== currentStatus) continue
      if (!score.submittedAt && !score.conflictDeclared) continue
      if (score.conflictDeclared) continue

      const rawItems = score.items
        .filter((i) => i.rawScore !== null)
        .map((i) => ({ criterionNumber: i.criterion.number, rawScore: i.rawScore as number }))

      const weighted = calculateWeightedScore(rawItems, score.idea.category)

      const existing = ideaMap.get(score.ideaId)
      if (existing) {
        existing.scores.push(weighted)
        existing.avgScore = existing.scores.reduce((a, b) => a + b, 0) / existing.scores.length
      } else {
        ideaMap.set(score.ideaId, {
          ideaId: score.ideaId,
          codeName: score.idea.codeName,
          category: score.idea.category,
          scores: [weighted],
          avgScore: weighted,
        })
      }
    }

    const byCategory: Record<string, IdeaAgg[]> = {}
    for (const agg of Array.from(ideaMap.values())) {
      if (!byCategory[agg.category]) byCategory[agg.category] = []
      byCategory[agg.category].push(agg)
    }

    const advancingIds: string[] = []
    const eliminatedIds: string[] = []

    for (const [, ideas] of Object.entries(byCategory)) {
      const sorted = [...ideas].sort((a, b) => b.avgScore - a.avgScore)
      const cutoff = round === "QF" ? Math.ceil(sorted.length / 2) : Math.ceil(sorted.length / 2)

      for (let i = 0; i < sorted.length; i++) {
        if (i < cutoff) advancingIds.push(sorted[i].ideaId)
        else eliminatedIds.push(sorted[i].ideaId)
      }
    }

    if (nextRound) {
      await prisma.idea.updateMany({
        where: { id: { in: advancingIds } },
        data: { status: ROUND_TO_STATUS[nextRound] },
      })
      // Create Presentation records for the next round so ideas appear in scoring/rounds views
      for (const ideaId of advancingIds) {
        const exists = await prisma.presentation.findFirst({ where: { ideaId, round: nextRound } })
        if (!exists) await prisma.presentation.create({ data: { ideaId, editionId, round: nextRound } })
      }
    } else {
      await prisma.idea.updateMany({
        where: { id: { in: advancingIds } },
        data: { status: "WINNER" },
      })
    }

    await prisma.idea.updateMany({
      where: { id: { in: eliminatedIds } },
      data: { status: ELIMINATED_STATUS },
    })

    await writeAuditLog(session.user.id, "TRIGGER_PROGRESSION", "Edition", editionId, {
      round,
      advancing: advancingIds,
      eliminated: eliminatedIds,
    })

    return NextResponse.json({
      success: true,
      advancing: advancingIds.length,
      eliminated: eliminatedIds.length,
    })
  }

  if (action === "apply_tiebreak") {
    const { ideaId } = body as { ideaId: string }
    if (!ideaId) return NextResponse.json({ error: "Missing ideaId" }, { status: 400 })

    const scores = await prisma.score.findMany({
      where: { ideaId, round, editionId },
      include: {
        items: {
          include: { criterion: { select: { number: true, isTiebreakerBonus: true } } },
        },
      },
    })

    for (const score of scores) {
      if (!score.submittedAt) continue
      const criterion2Item = score.items.find((i) => i.criterion.isTiebreakerBonus)
      if (!criterion2Item || criterion2Item.rawScore === null) continue

      const bonusMultiplier = 1 + TIEBREAK_BONUS_PCT / 100
      const criterion2Score = (criterion2Item.rawScore / 5) * 100
      const bonus = criterion2Score * (bonusMultiplier - 1)
      const newFinal = (score.weightedTotal ?? 0) + bonus

      await prisma.score.update({
        where: { id: score.id },
        data: {
          tiebreakerBonusApplied: true,
          finalScore: Math.round(newFinal * 100) / 100,
        },
      })
    }

    await writeAuditLog(session.user.id, "APPLY_TIEBREAK", "Idea", ideaId, { round })

    return NextResponse.json({ success: true, message: "Tiebreak bonus applied" })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
