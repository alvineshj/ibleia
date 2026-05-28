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

  const edition = editionId
    ? await prisma.edition.findUnique({ where: { id: editionId } })
    : await prisma.edition.findFirst({ where: { status: "ACTIVE" }, orderBy: { year: "desc" } })

  if (!edition) return NextResponse.json({ error: "No active edition found" }, { status: 404 })

  const criteria = await prisma.criterion.findMany({
    where: { editionId: edition.id },
    orderBy: { number: "asc" },
  })

  return NextResponse.json({ edition, criteria })
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { editionId, editionUpdates, criterionUpdates } = body as {
    editionId: string
    editionUpdates?: Record<string, unknown>
    criterionUpdates?: { id: string; weightPctCX?: number; weightPctBI?: number; weightPctOE?: number }[]
  }

  if (!editionId) return NextResponse.json({ error: "Missing editionId" }, { status: 400 })

  const results: Record<string, unknown> = {}

  if (editionUpdates && Object.keys(editionUpdates).length > 0) {
    const allowedFields = [
      "launchDate",
      "regDeadline",
      "briefSessionStart",
      "briefSessionEnd",
      "qfStart",
      "sfStart",
      "finalDate",
      "surveyUrlPostJury",
      "surveyUrlPostParticipant",
      "surveyUrlPostWorkshopDefault",
      "name",
    ]

    const safeUpdates: Record<string, unknown> = {}
    for (const key of allowedFields) {
      if (key in editionUpdates) {
        safeUpdates[key] = editionUpdates[key]
      }
    }

    const updated = await prisma.edition.update({
      where: { id: editionId },
      data: safeUpdates,
    })

    await writeAuditLog(session.user.id, "UPDATE_EDITION_SETTINGS", "Edition", editionId, safeUpdates)
    results.edition = updated
  }

  if (criterionUpdates && criterionUpdates.length > 0) {
    const updatedCriteria = []
    for (const cu of criterionUpdates) {
      const data: Record<string, number> = {}
      if (cu.weightPctCX !== undefined) data.weightPctCX = cu.weightPctCX
      if (cu.weightPctBI !== undefined) data.weightPctBI = cu.weightPctBI
      if (cu.weightPctOE !== undefined) data.weightPctOE = cu.weightPctOE

      const updated = await prisma.criterion.update({
        where: { id: cu.id },
        data,
      })
      updatedCriteria.push(updated)
      await writeAuditLog(session.user.id, "UPDATE_CRITERION_WEIGHT", "Criterion", cu.id, data)
    }
    results.criteria = updatedCriteria
  }

  return NextResponse.json(results)
}
