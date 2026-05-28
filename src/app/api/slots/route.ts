import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET /api/slots?editionId=xxx  – returns available (unbooked) slots
// GET /api/slots?editionId=xxx&all=true  – returns all slots (admin)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const editionId = searchParams.get("editionId")
  const showAll = searchParams.get("all") === "true" && session.user.role === "ADMIN"

  try {
    // If no editionId provided, use active edition
    let resolvedEditionId = editionId
    if (!resolvedEditionId) {
      const edition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } })
      if (!edition) {
        return NextResponse.json({ error: "No active edition found" }, { status: 404 })
      }
      resolvedEditionId = edition.id
    }

    const slots = await prisma.slot.findMany({
      where: {
        editionId: resolvedEditionId,
        ...(showAll ? {} : { isBooked: false }),
      },
      include: showAll
        ? { bookedBy: { select: { id: true, name: true, email: true } } }
        : undefined,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    })

    return NextResponse.json({ slots })
  } catch (error) {
    console.error("[GET /api/slots]", error)
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 })
  }
}

// POST /api/slots  – admin only: bulk-create slots for an edition
// Body: { editionId?: string, dates?: string[] }
// If no dates given, generates default slots: 6 & 7 April 2026, 8:30–12:00, 15-min intervals
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden – admins only" }, { status: 403 })
  }

  let body: { editionId?: string; dates?: string[] } = {}
  try {
    body = await req.json()
  } catch {
    // empty body is fine – we will use defaults
  }

  try {
    let resolvedEditionId = body.editionId
    if (!resolvedEditionId) {
      const edition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } })
      if (!edition) {
        return NextResponse.json({ error: "No active edition found" }, { status: 404 })
      }
      resolvedEditionId = edition.id
    }

    // Default slot dates: 6 and 7 April 2026
    const slotDates = body.dates ?? ["2026-04-06", "2026-04-07"]

    // 8:30 am to 12:00 pm, 15-min intervals
    // Start times: 08:30, 08:45, 09:00, … 11:45  (last slot ends at 12:00)
    const startMinutesFrom830 = []
    for (let m = 0; m < (12 * 60 - (8 * 60 + 30)); m += 15) {
      startMinutesFrom830.push(m)
    }
    // That gives: 0,15,30,45,…,210  →  8:30 to 11:45 inclusive (14 slots per day)

    const slotsToCreate: {
      editionId: string
      date: Date
      startTime: Date
      durationMins: number
    }[] = []

    for (const dateStr of slotDates) {
      for (const offset of startMinutesFrom830) {
        const baseHour = 8
        const baseMin = 30
        const totalMins = baseHour * 60 + baseMin + offset
        const h = Math.floor(totalMins / 60)
        const m = totalMins % 60

        // Date at midnight UTC
        const date = new Date(`${dateStr}T00:00:00.000Z`)
        // startTime encoded as absolute UTC datetime on that day
        const startTime = new Date(`${dateStr}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00.000Z`)

        slotsToCreate.push({
          editionId: resolvedEditionId,
          date,
          startTime,
          durationMins: 15,
        })
      }
    }

    // Avoid duplicates: delete existing unbooked slots for this edition on those dates before recreating
    const dateObjects = slotDates.map((d) => new Date(`${d}T00:00:00.000Z`))
    await prisma.slot.deleteMany({
      where: {
        editionId: resolvedEditionId,
        isBooked: false,
        date: { in: dateObjects },
      },
    })

    await prisma.slot.createMany({ data: slotsToCreate })

    const created = await prisma.slot.findMany({
      where: { editionId: resolvedEditionId, date: { in: dateObjects } },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    })

    return NextResponse.json(
      { success: true, count: created.length, slots: created },
      { status: 201 }
    )
  } catch (error) {
    console.error("[POST /api/slots]", error)
    return NextResponse.json({ error: "Failed to create slots" }, { status: 500 })
  }
}
