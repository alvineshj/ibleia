import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const draftSchema = z.object({
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
    const data = draftSchema.parse(body)
    const juryId = session.user.id

    const idea = await prisma.idea.findUnique({
      where: { id: data.ideaId },
      select: { editionId: true },
    })
    if (!idea) return NextResponse.json({ error: "Idea not found" }, { status: 404 })

    const score = await prisma.score.upsert({
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
        items: {
          create: data.items.map((item) => ({
            criterionId: item.criterionId,
            rawScore: item.rawScore,
            note: item.note || null,
          })),
        },
      },
      update: {
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

    return NextResponse.json({ id: score.id })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save draft" }, { status: 500 })
  }
}
