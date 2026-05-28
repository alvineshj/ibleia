import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const updateSchema = z.object({
  id: z.string(),
  status: z.enum(["PENDING", "LAUNCHED", "CLOSED"]).optional(),
  notes: z.string().optional(),
  surveyUrl: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const editionId = searchParams.get("editionId")

  const triggers = await prisma.externalSurveyTrigger.findMany({
    where: editionId ? { editionId } : undefined,
    include: { workshop: true },
    orderBy: { firedAt: "desc" },
  })

  return NextResponse.json(triggers)
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (data.status) {
      updateData.status = data.status
      if (data.status === "LAUNCHED") updateData.launchedAt = new Date()
      if (data.status === "CLOSED") updateData.closedAt = new Date()
    }
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.surveyUrl !== undefined) updateData.surveyUrl = data.surveyUrl

    const trigger = await prisma.externalSurveyTrigger.update({
      where: { id: data.id },
      data: updateData,
    })

    await prisma.auditLog.create({
      data: {
        editionId: trigger.editionId,
        actorId: session.user.id,
        action: `SURVEY_TRIGGER_${data.status || "UPDATED"}`,
        entityType: "ExternalSurveyTrigger",
        entityId: trigger.id,
      },
    })

    return NextResponse.json(trigger)
  } catch (error) {
    return NextResponse.json({ error: "Failed to update trigger" }, { status: 500 })
  }
}
