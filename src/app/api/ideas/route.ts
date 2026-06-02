import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

type TeamContact = {
  name: string
  email: string
  phone: string
}

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

  let body: {
    codeName: string
    description1Line: string
    category: string
    slotId?: string
    teamMembers?: TeamContact[]
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { codeName, description1Line, category, slotId, teamMembers = [] } = body

  if (!codeName || !description1Line || !category) {
    return NextResponse.json(
      { error: "codeName, description1Line, and category are required" },
      { status: 400 }
    )
  }

  if (!["CX", "BI", "OE"].includes(category)) {
    return NextResponse.json(
      { error: "category must be one of CX, BI, OE" },
      { status: 400 }
    )
  }

  const wordCount = description1Line.trim().split(/\s+/).filter(Boolean).length
  if (wordCount > 10) {
    return NextResponse.json(
      { error: "description1Line must be 10 words or fewer" },
      { status: 400 }
    )
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(codeName)) {
    return NextResponse.json(
      { error: "Code name can only contain letters, numbers, hyphens, and underscores" },
      { status: 400 }
    )
  }

  if (teamMembers.length === 0) {
    return NextResponse.json(
      { error: "At least one team member contact is required." },
      { status: 400 }
    )
  }

  if (teamMembers.length > 9) {
    return NextResponse.json(
      { error: "A team can have at most 9 additional members (10 total including yourself)" },
      { status: 400 }
    )
  }

  for (const m of teamMembers) {
    if (!m.name?.trim() || !m.email?.trim() || !m.phone?.trim()) {
      return NextResponse.json(
        { error: "Each team member must have a name, email, and phone number." },
        { status: 400 }
      )
    }
  }

  try {
    const edition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } })
    if (!edition) {
      return NextResponse.json({ error: "No active edition found" }, { status: 404 })
    }

    if (edition.regDeadline && new Date() > new Date(edition.regDeadline)) {
      return NextResponse.json(
        { error: "Registration is closed. The submission deadline has passed." },
        { status: 403 }
      )
    }

    const existing = await prisma.idea.findUnique({ where: { codeName } })
    if (existing) {
      return NextResponse.json(
        { error: "This code name is already taken. Please choose a different one." },
        { status: 409 }
      )
    }

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

    if (slotId) {
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
    }

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
              // Registrant linked to their account
              { userId: session.user.id, role: "MEMBER" },
              // Additional members stored as contact info only
              ...teamMembers.map((m) => ({
                contactName: m.name.trim(),
                contactEmail: m.email.trim().toLowerCase(),
                contactPhone: m.phone.trim(),
                role: "MEMBER" as const,
              })),
            ],
          },
        },
        include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
      })

      if (slotId) {
        await tx.slot.update({
          where: { id: slotId },
          data: { isBooked: true, bookedById: session.user.id, ideaId: idea.id },
        })
      }

      await tx.auditLog.create({
        data: {
          editionId: edition.id,
          actorId: session.user.id,
          action: "IDEA_REGISTERED",
          entityType: "Idea",
          entityId: idea.id,
          metadata: { codeName, category, slotId, memberCount: teamMembers.length + 1 },
        },
      })

      return { idea, team }
    })

    return NextResponse.json({ success: true, idea: result.idea, team: result.team }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/ideas]", error)
    return NextResponse.json({ error: "Failed to create idea" }, { status: 500 })
  }
}
