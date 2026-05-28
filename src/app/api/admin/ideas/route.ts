import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { IdeaStatus, IdeaCategory, CompetitionRound } from "@prisma/client"

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

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") as IdeaStatus | null
  const category = searchParams.get("category") as IdeaCategory | null
  const round = searchParams.get("round") as CompetitionRound | null

  const where: Record<string, unknown> = {}
  if (status && Object.values(IdeaStatus).includes(status)) where.status = status
  if (category && Object.values(IdeaCategory).includes(category)) where.category = category
  if (round && Object.values(CompetitionRound).includes(round)) {
    where.presentations = { some: { round } }
  }

  const ideas = await prisma.idea.findMany({
    where,
    include: {
      team: {
        include: {
          members: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
      scores: {
        select: {
          round: true,
          weightedTotal: true,
          finalScore: true,
          submittedAt: true,
          juryMemberId: true,
          conflictDeclared: true,
          tiebreakerBonusApplied: true,
        },
      },
      presentations: {
        select: { round: true, scheduledDatetime: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(ideas)
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { id, ids, status, internalShowcaseApproved } = body

  if (ids && Array.isArray(ids)) {
    if (!status || !Object.values(IdeaStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status for bulk update" }, { status: 400 })
    }
    await prisma.idea.updateMany({
      where: { id: { in: ids } },
      data: { status },
    })
    for (const ideaId of ids) {
      await writeAuditLog(session.user.id, "BULK_UPDATE_IDEA_STATUS", "Idea", ideaId, { status })
    }
    return NextResponse.json({ updated: ids.length })
  }

  if (!id) return NextResponse.json({ error: "Missing idea id" }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (status !== undefined) {
    if (!Object.values(IdeaStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    updates.status = status
  }
  if (internalShowcaseApproved !== undefined) {
    updates.internalShowcaseApproved = internalShowcaseApproved
  }

  const idea = await prisma.idea.update({
    where: { id },
    data: updates,
  })

  await writeAuditLog(session.user.id, "UPDATE_IDEA", "Idea", id, updates)

  return NextResponse.json(idea)
}
