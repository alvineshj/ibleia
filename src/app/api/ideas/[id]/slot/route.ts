import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, slotBookingEmail } from "@/lib/email"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { slotId } = await req.json()
  if (!slotId) return NextResponse.json({ error: "slotId is required" }, { status: 400 })

  const idea = await prisma.idea.findUnique({
    where: { id: params.id },
    include: {
      team: { include: { members: { include: { user: true } } } },
      edition: true,
    },
  })

  if (!idea) return NextResponse.json({ error: "Idea not found" }, { status: 404 })

  const isMember = idea.team?.members.some((m) => m.user?.id === session.user.id)
  if (!isMember) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  // Check deadline
  if (idea.edition.regDeadline && new Date() > new Date(idea.edition.regDeadline)) {
    return NextResponse.json({ error: "Registration is closed. The slot booking deadline has passed." }, { status: 403 })
  }

  const existingSlot = await prisma.slot.findFirst({ where: { ideaId: idea.id } })
  if (existingSlot) {
    return NextResponse.json({ error: "A slot is already booked for this idea." }, { status: 409 })
  }

  const slot = await prisma.slot.findUnique({ where: { id: slotId } })
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 })
  if (slot.isBooked) return NextResponse.json({ error: "This slot has already been booked." }, { status: 409 })
  if (slot.editionId !== idea.editionId) return NextResponse.json({ error: "Slot does not belong to this edition" }, { status: 400 })

  await prisma.slot.update({
    where: { id: slotId },
    data: { isBooked: true, bookedById: session.user.id, ideaId: idea.id },
  })

  await prisma.auditLog.create({
    data: {
      editionId: idea.editionId,
      actorId: session.user.id,
      action: "SLOT_BOOKED",
      entityType: "Slot",
      entityId: slotId,
      metadata: { ideaId: idea.id, slotId } as object,
    },
  })

  // Email all team members
  const slotDate = new Date(slot.date).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const slotTime = new Date(slot.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })

  for (const member of idea.team?.members ?? []) {
    const email = member.user?.email ?? member.contactEmail
    const name = member.user?.name ?? member.contactName ?? "Team member"
    if (!email) continue
    await sendEmail({
      to: email,
      ...slotBookingEmail({
        name,
        slotDate,
        slotTime,
        teamsLink: slot.teamsLink ?? undefined,
        ideaCodeName: idea.codeName,
      }),
      recipientId: member.user?.id,
      type: "SLOT_BOOKING",
      editionId: idea.editionId,
    }).catch(console.error)
  }

  return NextResponse.json({ success: true })
}
