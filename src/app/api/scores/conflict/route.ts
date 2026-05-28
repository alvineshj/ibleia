import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const schema = z.object({
  editionId: z.string(),
  round: z.enum(["QF", "SF", "FINAL"]).optional(),
  conflictedIdeaIds: z.array(z.string()),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "JURY") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = schema.parse(body)
    const juryId = session.user.id

    const round = data.round || "QF"

    const declaration = await prisma.conflictDeclaration.upsert({
      where: {
        juryMemberId_editionId_round: {
          juryMemberId: juryId,
          editionId: data.editionId,
          round,
        },
      },
      create: {
        juryMemberId: juryId,
        editionId: data.editionId,
        round,
        conflictedIdeaIds: data.conflictedIdeaIds,
      },
      update: {
        conflictedIdeaIds: data.conflictedIdeaIds,
      },
    })

    if (data.conflictedIdeaIds.length > 0) {
      await prisma.score.updateMany({
        where: {
          juryMemberId: juryId,
          ideaId: { in: data.conflictedIdeaIds },
          round,
        },
        data: { conflictDeclared: true },
      })
    }

    return NextResponse.json({ id: declaration.id })
  } catch (error) {
    return NextResponse.json({ error: "Failed to save declaration" }, { status: 500 })
  }
}
