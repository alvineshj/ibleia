import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateWeightedScore } from "@/lib/scoring"
import { IdeaCategory } from "@prisma/client"
import { z } from "zod"

const scoreSchema = z.object({
  ideaId: z.string(),
  round: z.enum(["QF", "SF", "FINAL"]),
  scoreId: z.string().optional(),
  items: z.array(
    z.object({
      criterionId: z.string(),
      rawScore: z.number().min(0).max(5).nullable(),
      note: z.string().nullable().optional(),
    })
  ),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "JURY") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = scoreSchema.parse(body)
    const juryId = session.user.id

    const idea = await prisma.idea.findUnique({
      where: { id: data.ideaId },
      select: { category: true, editionId: true },
    })
    if (!idea) return NextResponse.json({ error: "Idea not found" }, { status: 404 })

    const conflict = await prisma.conflictDeclaration.findFirst({
      where: {
        juryMemberId: juryId,
        editionId: idea.editionId,
        conflictedIdeaIds: { has: data.ideaId },
      },
    })
    if (conflict) {
      return NextResponse.json({ error: "You have declared a conflict for this idea" }, { status: 403 })
    }

    const criteria = await prisma.criterion.findMany({ where: { editionId: idea.editionId } })
    const criteriaMap = new Map(criteria.map((c) => [c.id, c]))

    const scoredItems = data.items
      .filter((item) => item.rawScore !== null)
      .map((item) => {
        const criterion = criteriaMap.get(item.criterionId)
        return {
          criterionNumber: criterion?.number ?? 0,
          rawScore: item.rawScore as number,
        }
      })

    const weightedTotal = calculateWeightedScore(scoredItems, idea.category as IdeaCategory)

    let score
    if (data.scoreId) {
      score = await prisma.score.update({
        where: { id: data.scoreId },
        data: {
          weightedTotal,
          finalScore: weightedTotal,
          submittedAt: new Date(),
          isLocked: true,
          items: {
            deleteMany: {},
            create: data.items.map((item) => ({
              criterionId: item.criterionId,
              rawScore: item.rawScore,
              note: item.note || null,
            })),
          },
        },
      })
    } else {
      const existing = await prisma.score.findUnique({
        where: {
          ideaId_round_juryMemberId: {
            ideaId: data.ideaId,
            round: data.round,
            juryMemberId: juryId,
          },
        },
      })
      if (existing?.submittedAt) {
        return NextResponse.json({ error: "Score already submitted" }, { status: 400 })
      }

      score = await prisma.score.upsert({
        where: {
          ideaId_round_juryMemberId: {
            ideaId: data.ideaId,
            round: data.round,
            juryMemberId: juryId,
          },
        },
        create: {
          ideaId: data.ideaId,
          editionId: idea.editionId,
          round: data.round,
          juryMemberId: juryId,
          weightedTotal,
          finalScore: weightedTotal,
          submittedAt: new Date(),
          isLocked: true,
          items: {
            create: data.items.map((item) => ({
              criterionId: item.criterionId,
              rawScore: item.rawScore,
              note: item.note || null,
            })),
          },
        },
        update: {
          weightedTotal,
          finalScore: weightedTotal,
          submittedAt: new Date(),
          isLocked: true,
          items: {
            deleteMany: {},
            create: data.items.map((item) => ({
              criterionId: item.criterionId,
              rawScore: item.rawScore,
              note: item.note || null,
            })),
          },
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        editionId: idea.editionId,
        actorId: juryId,
        action: "SCORE_SUBMITTED",
        entityType: "Score",
        entityId: score.id,
        metadata: { ideaId: data.ideaId, round: data.round, weightedTotal } as object,
      },
    })

    return NextResponse.json({ id: score.id, finalScore: weightedTotal })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to submit score" }, { status: 500 })
  }
}
