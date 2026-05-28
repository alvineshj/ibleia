import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail } from "@/lib/email"
import { z } from "zod"

const schema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  editionId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const data = schema.parse(await req.json())

    const recipients = await prisma.user.findMany({
      where: {
        role: "PARTICIPANT",
        isActive: true,
        ...(data.editionId ? { editionId: data.editionId } : {}),
      },
    })

    let count = 0
    for (const user of recipients) {
      await sendEmail({
        to: user.email,
        subject: data.subject,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:#003087;color:white;padding:20px;text-align:center;">
            <h2 style="margin:0;">IBL Excellence & Innovation Award 2026</h2>
          </div>
          <div style="padding:30px;">${data.body.replace(/\n/g, "<br>")}</div>
          <div style="background:#f5f5f5;padding:15px;text-align:center;font-size:12px;color:#666;">
            IBL Group Excellence & Innovation Award Committee
          </div>
        </div>`,
        recipientId: user.id,
        type: "BROADCAST",
        editionId: data.editionId,
      }).catch(console.error)
      count++
    }

    await prisma.auditLog.create({
      data: {
        editionId: data.editionId,
        actorId: session.user.id,
        action: "BROADCAST_SENT",
        entityType: "Notification",
        metadata: { subject: data.subject, recipientCount: count },
      },
    })

    return NextResponse.json({ count })
  } catch (error) {
    return NextResponse.json({ error: "Failed to send broadcast" }, { status: 500 })
  }
}
