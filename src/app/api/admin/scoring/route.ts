import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { CompetitionRound, IdeaCategory } from "@prisma/client"
import { calculateWeightedScore, calculateStandardDeviation } from "@/lib/scoring"

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  if (session.user.role !== "ADMIN") return null
  return session
}

const VARIANCE_THRESHOLD = 1.5

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const round = (searchParams.get("round") ?? "QF") as CompetitionRound
  const editionId = searchParams.get("editionId")

  const edition = editionId
    ? await prisma.edition.findUnique({ where: { id: editionId } })
    : await prisma.edition.findFirst({ where: { status: "ACTIVE" }, orderBy: { year: "desc" } })

  if (!edition) return NextResponse.json({ error: "No active edition" }, { status: 404 })

  const scores = await prisma.score.findMany({
    where: {
      editionId: edition.id,
      round,
      submittedAt: { not: null },
      conflictDeclared: false,
    },
    include: {
      idea: {
        select: {
          id: true,
          codeName: true,
          category: true,
          status: true,
        },
      },
      items: {
        include: {
          criterion: { select: { number: true, isTiebreakerBonus: true } },
        },
      },
    },
  })

  type IdeaAgg = {
    ideaId: string
    codeName: string
    category: IdeaCategory
    status: string
    perJuryScores: number[]
    tiebreakerApplied: boolean
  }

  const ideaMap = new Map<string, IdeaAgg>()

  for (const score of scores) {
    const rawItems = score.items
      .filter((i) => i.rawScore !== null)
      .map((i) => ({ criterionNumber: i.criterion.number, rawScore: i.rawScore as number }))

    const weighted = calculateWeightedScore(rawItems, score.idea.category)

    const existing = ideaMap.get(score.ideaId)
    if (existing) {
      existing.perJuryScores.push(weighted)
      if (score.tiebreakerBonusApplied) existing.tiebreakerApplied = true
    } else {
      ideaMap.set(score.ideaId, {
        ideaId: score.ideaId,
        codeName: score.idea.codeName,
        category: score.idea.category,
        status: score.idea.status,
        perJuryScores: [weighted],
        tiebreakerApplied: score.tiebreakerBonusApplied,
      })
    }
  }

  const allIdeas = Array.from(ideaMap.values()).map((idea) => {
    const avgScore =
      idea.perJuryScores.length > 0
        ? idea.perJuryScores.reduce((a, b) => a + b, 0) / idea.perJuryScores.length
        : 0
    const stdDev = calculateStandardDeviation(idea.perJuryScores)
    return {
      ideaId: idea.ideaId,
      codeName: idea.codeName,
      category: idea.category,
      status: idea.status,
      avgScore: Math.round(avgScore * 100) / 100,
      stdDev: Math.round(stdDev * 100) / 100,
      juryCount: idea.perJuryScores.length,
      tiebreakerApplied: idea.tiebreakerApplied,
      isTied: false,
      scores: [],
    }
  })

  const byCategory: Record<string, typeof allIdeas> = { CX: [], BI: [], OE: [] }
  for (const idea of allIdeas) {
    byCategory[idea.category]?.push(idea)
  }

  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort((a, b) => b.avgScore - a.avgScore)
    for (let i = 0; i < byCategory[cat].length - 1; i++) {
      if (byCategory[cat][i].avgScore === byCategory[cat][i + 1].avgScore) {
        byCategory[cat][i].isTied = true
        byCategory[cat][i + 1].isTied = true
      }
    }
  }

  const varianceAlerts = allIdeas.filter((i) => i.stdDev > VARIANCE_THRESHOLD)

  return NextResponse.json({
    round,
    editionId: edition.id,
    byCategory,
    varianceAlerts,
  })
}
