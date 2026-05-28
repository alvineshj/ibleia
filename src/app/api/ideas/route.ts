import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const REGISTRATION_DEADLINE = new Date("2026-03-31T23:59:00.000Z")

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const memberships = await prisma.teamMember.findMany({
      where: { userId: session.user.id },
      include: {
        team: {
          include: {
            idea: {
              include: {
                reports: {
                  select: { id: true, round: true, submittedAt: true, language: true, fileUrl: true },
                },
                team: {
                  include: {
                    members: {
                      include: {
                        user: { select: { id: true, name: true, email: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    })

    const ideas = memberships.map((m) => m.team.idea)
    return NextResponse.json({ ideas })
  } catch (error) {
    console.error("[GET /api/ideas]", error)
    return NextResponse.json({ error: "Failed to fetch ideas" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Hard enforce registration deadline
  if (new Date() > REGISTRATION_DEADLINE) {
    return NextResponse.json(
      { error: "Registration is closed. The deadline was 31 March 2026 at 11:59 pm." },
      { status: 403 }
    )
  }

  let body: {
    codeName: string
    description1Line: string
    category: string
    slotId: string
    teamMemberEmails?: string[]
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { codeName, description1Line, category, slotId, teamMemberEmails = [] } = body

  // Validate required fields
  if (!codeName || !description1Line || !category || !slotId) {
    return NextResponse.json(
      { error: "codeName, description1Line, category, and slotId are required" },
      { status: 400 }
    )
  }

  // Validate category
  if (!["CX", "BI", "OE"].includes(category)) {
    return NextResponse.json(
      { error: "category must be one of CX, BI, OE" },
      { status: 400 }
    )
  }

  // Validate description word count (max 10 words)
  const wordCount = description1Line.trim().split(/\s+/).filter(Boolean).length
  if (wordCount > 10) {
    return NextResponse.json(
      { error: "description1Line must be 10 words or fewer" },
      { status: 400 }
    )
  }

  // Validate code name format (no spaces, URL-safe)
  if (!/^[a-zA-Z0-9_-]+$/.test(codeName)) {
    return NextResponse.json(
      { error: "Code name can only contain letters, numbers, hyphens, and underscores" },
      { status: 400 }
    )
  }

  // Validate team size: at most 10 members total (including registrant)
  if (teamMemberEmails.length > 9) {
    return NextResponse.json(
      { error: "A team can have at most 10 members (including yourself)" },
      { status: 400 }
    )
  }

  try {
    // Get active edition
    const edition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } })
    if (!edition) {
      return NextResponse.json({ error: "No active edition found" }, { status: 404 })
    }

    // Check code name uniqueness (system-wide)
    const existing = await prisma.idea.findUnique({ where: { codeName } })
    if (existing) {
      return NextResponse.json(
        { error: "This code name is already taken. Please choose a different one." },
        { status: 409 }
      )
    }

    // Check one idea per category per team (current user's existing ideas in same category)
    const userIdeaInCategory = await prisma.teamMember.findFirst({
      where: {
        userId: session.user.id,
        team: {
          idea: {
            category: category as "CX" | "BI" | "OE",
            editionId: edition.id,
          },
        },
      },
    })
    if (userIdeaInCategory) {
      return NextResponse.json(
        { error: "You already have an idea registered in this category for the current edition." },
        { status: 409 }
      )
    }

    // Validate slot
    const slot = await prisma.slot.findUnique({ where: { id: slotId } })
    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 })
    }
    if (slot.isBooked) {
      return NextResponse.json(
        { error: "This slot has already been booked. Please select another slot." },
        { status: 409 }
      )
    }
    if (slot.editionId !== edition.id) {
      return NextResponse.json({ error: "Slot does not belong to active edition" }, { status: 400 })
    }

    // Resolve additional team member user IDs
    let additionalMemberIds: string[] = []
    if (teamMemberEmails.length > 0) {
      const memberUsers = await prisma.user.findMany({
        where: { email: { in: teamMemberEmails }, isActive: true },
        select: { id: true, email: true },
      })
      const foundEmails = memberUsers.map((u) => u.email)
      const missing = teamMemberEmails.filter((e) => !foundEmails.includes(e))
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `These email addresses were not found: ${missing.join(", ")}` },
          { status: 400 }
        )
      }
      // Exclude the registrant if they added themselves
      additionalMemberIds = memberUsers
        .map((u) => u.id)
        .filter((id) => id !== session.user.id)
    }

    // Create idea, team, book slot in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const idea = await tx.idea.create({
        data: {
          editionId: edition.id,
          codeName,
          description1Line,
          category: category as "CX" | "BI" | "OE",
          status: "REGISTERED",
        },
      })

      const team = await tx.team.create({
        data: {
          editionId: edition.id,
          ideaId: idea.id,
          members: {
            create: [
              { userId: session.user.id, role: "MEMBER" },
              ...additionalMemberIds.map((uid) => ({ userId: uid, role: "MEMBER" as const })),
            ],
          },
        },
        include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
      })

      await tx.slot.update({
        where: { id: slotId },
        data: { isBooked: true, bookedById: session.user.id, ideaId: idea.id },
      })

      await tx.auditLog.create({
        data: {
          editionId: edition.id,
          actorId: session.user.id,
          action: "IDEA_REGISTERED",
          entityType: "Idea",
          entityId: idea.id,
          metadata: { codeName, category, slotId },
        },
      })

      return { idea, team, slot }
    })

    return NextResponse.json({ success: true, idea: result.idea, team: result.team }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/ideas]", error)
    return NextResponse.json({ error: "Failed to create idea" }, { status: 500 })
  }
}
