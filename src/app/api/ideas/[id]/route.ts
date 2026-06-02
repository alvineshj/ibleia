import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { IdeaStatus } from "@prisma/client"

type RouteContext = { params: { id: string } }

export async function GET(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const idea = await prisma.idea.findUnique({
      where: { id: params.id },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, email: true, companyName: true } },
              },
            },
          },
        },
        reports: {
          select: {
            id: true,
            round: true,
            fileUrl: true,
            fileSizeMb: true,
            wetransferLink: true,
            language: true,
            submittedAt: true,
            submittedBy: { select: { id: true, name: true } },
          },
          orderBy: { submittedAt: "desc" },
        },
        presentations: {
          select: {
            id: true,
            round: true,
            scheduledDatetime: true,
            isRehearsal: true,
            pptxUrl: true,
            presenters: {
              include: { user: { select: { id: true, name: true } } },
            },
          },
          orderBy: { scheduledDatetime: "asc" },
        },
      },
    })

    if (!idea) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 })
    }

    // Participants can only view ideas they belong to; admins/jury see all
    const isAdmin = session.user.role === "ADMIN" || session.user.role === "JURY"
    if (!isAdmin) {
      const isMember = idea.team?.members.some((m) => m.user?.id === session.user.id)
      if (!isMember) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    return NextResponse.json({ idea })
  } catch (error) {
    console.error("[GET /api/ideas/:id]", error)
    return NextResponse.json({ error: "Failed to fetch idea" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    status?: string
    internalShowcaseApproved?: boolean
    wetransferLink?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  try {
    const idea = await prisma.idea.findUnique({
      where: { id: params.id },
      include: {
        team: {
          include: { members: { select: { userId: true } } },
        },
      },
    })

    if (!idea) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 })
    }

    const isAdmin = session.user.role === "ADMIN"
    const isMember = idea.team?.members.some((m) => m.userId === session.user.id)

    // Status changes are admin-only
    if (body.status !== undefined && !isAdmin) {
      return NextResponse.json(
        { error: "Only admins can update idea status" },
        { status: 403 }
      )
    }

    // internalShowcaseApproved is admin-only
    if (body.internalShowcaseApproved !== undefined && !isAdmin) {
      return NextResponse.json(
        { error: "Only admins can update internal showcase approval" },
        { status: 403 }
      )
    }

    // wetransferLink can be updated by team members or admins
    if (body.wetransferLink !== undefined && !isMember && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Validate status value
    const validStatuses = Object.values(IdeaStatus)
    if (body.status && !validStatuses.includes(body.status as IdeaStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (body.status !== undefined) updateData.status = body.status
    if (body.internalShowcaseApproved !== undefined)
      updateData.internalShowcaseApproved = body.internalShowcaseApproved
    if (body.wetransferLink !== undefined) updateData.wetransferLink = body.wetransferLink

    const updated = await prisma.idea.update({
      where: { id: params.id },
      data: updateData,
    })

    if (body.status !== undefined) {
      await prisma.auditLog.create({
        data: {
          editionId: idea.editionId,
          actorId: session.user.id,
          action: "IDEA_STATUS_CHANGED",
          entityType: "Idea",
          entityId: idea.id,
          metadata: { from: idea.status, to: body.status },
        },
      })
    }

    return NextResponse.json({ idea: updated })
  } catch (error) {
    console.error("[PATCH /api/ideas/:id]", error)
    return NextResponse.json({ error: "Failed to update idea" }, { status: 500 })
  }
}
