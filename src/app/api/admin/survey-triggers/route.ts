import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TriggerStatus } from "@prisma/client"

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
  const editionId = searchParams.get("editionId")

  const where: Record<string, unknown> = {}
  if (editionId) where.editionId = editionId

  const triggers = await prisma.externalSurveyTrigger.findMany({
    where,
    include: {
      edition: { select: { id: true, name: true, year: true } },
      workshop: { select: { id: true, type: true, sessionDate: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
  const escalations = triggers.filter(
    (t) => t.status === "PENDING" && t.firedAt < twoDaysAgo && !t.escalationSent
  )

  return NextResponse.json({ triggers, escalationCount: escalations.length })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { id, status, surveyUrl, notes } = body

  if (!id) return NextResponse.json({ error: "Missing trigger id" }, { status: 400 })

  const updates: Record<string, unknown> = {}

  if (status !== undefined) {
    if (!Object.values(TriggerStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    updates.status = status
    if (status === "LAUNCHED") updates.launchedAt = new Date()
    if (status === "CLOSED") updates.closedAt = new Date()
  }

  if (surveyUrl !== undefined) updates.surveyUrl = surveyUrl
  if (notes !== undefined) updates.notes = notes

  const trigger = await prisma.externalSurveyTrigger.update({
    where: { id },
    data: updates,
  })

  await writeAuditLog(session.user.id, "UPDATE_SURVEY_TRIGGER", "ExternalSurveyTrigger", id, {
    status,
    surveyUrl,
  })

  return NextResponse.json(trigger)
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { action } = body

  if (action === "mark_escalated") {
    const { ids } = body as { ids: string[] }
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Missing ids" }, { status: 400 })
    }
    await prisma.externalSurveyTrigger.updateMany({
      where: { id: { in: ids } },
      data: { escalationSent: true },
    })
    return NextResponse.json({ updated: ids.length })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
