import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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

  const resolvedEditionId = editionId
    ? editionId
    : (await prisma.edition.findFirst({ where: { status: "ACTIVE" }, orderBy: { year: "desc" } }))?.id

  if (!resolvedEditionId) return NextResponse.json({ error: "No active edition" }, { status: 404 })

  const slots = await prisma.slot.findMany({
    where: { editionId: resolvedEditionId },
    include: {
      bookedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  })

  return NextResponse.json(slots)
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { id, teamsLink, bookedById, isBooked } = body

  if (!id) return NextResponse.json({ error: "Missing slot id" }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (teamsLink !== undefined) updates.teamsLink = teamsLink || null
  if (bookedById !== undefined) updates.bookedById = bookedById
  if (isBooked !== undefined) updates.isBooked = isBooked

  const slot = await prisma.slot.update({
    where: { id },
    data: updates,
    include: {
      bookedBy: { select: { id: true, name: true, email: true } },
    },
  })

  await writeAuditLog(session.user.id, "UPDATE_SLOT", "Slot", id, updates)

  return NextResponse.json(slot)
}
