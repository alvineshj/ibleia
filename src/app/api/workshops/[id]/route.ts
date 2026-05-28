import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, surveyTriggerEmail } from "@/lib/email"
import { z } from "zod"

const updateSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  surveyUrlOverride: z.string().optional().nullable(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = updateSchema.parse(body)

    const workshop = await prisma.workshop.update({
      where: { id: params.id },
      data,
      include: { edition: true },
    })

    if (data.status === "COMPLETED") {
      const surveyUrl = workshop.surveyUrlOverride || workshop.edition.surveyUrlPostWorkshopDefault

      const trigger = await prisma.externalSurveyTrigger.create({
        data: {
          editionId: workshop.editionId,
          triggerType: "TRG_003",
          workshopId: workshop.id,
          surveyUrl: surveyUrl || undefined,
          targetAudienceDescription: `Participants who attended the ${workshop.type} workshop on ${workshop.sessionDate.toDateString()}`,
          status: "PENDING",
        },
      })

      const adminUsers = await prisma.user.findMany({
        where: { role: "ADMIN", isActive: true },
      })

      const emailContent = surveyTriggerEmail({
        triggerType: "TRG-003",
        eventDescription: `Post-workshop survey for ${workshop.type} session (${workshop.sessionDate.toDateString()})`,
        audience: trigger.targetAudienceDescription,
        surveyUrl: surveyUrl || undefined,
      })

      for (const admin of adminUsers) {
        await sendEmail({
          to: admin.email,
          ...emailContent,
          recipientId: admin.id,
          type: "SURVEY_TRIGGER",
          editionId: workshop.editionId,
        }).catch(console.error)
      }

      await prisma.auditLog.create({
        data: {
          editionId: workshop.editionId,
          actorId: session.user.id,
          action: "WORKSHOP_COMPLETED_TRIGGER_FIRED",
          entityType: "Workshop",
          entityId: workshop.id,
          metadata: { triggerType: "TRG_003", triggerId: trigger.id } as object,
        },
      })
    }

    return NextResponse.json(workshop)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to update workshop" }, { status: 500 })
  }
}
