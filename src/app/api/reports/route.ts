import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const MAX_FILE_SIZE_BYTES = 16 * 1024 * 1024 // 16 MB

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 })
  }

  const ideaId = formData.get("ideaId") as string | null
  const round = formData.get("round") as string | null
  const language = (formData.get("language") as string | null) ?? "EN"
  const wetransferLink = formData.get("wetransferLink") as string | null
  const file = formData.get("file") as File | null

  // Validate required fields
  if (!ideaId) {
    return NextResponse.json({ error: "ideaId is required" }, { status: 400 })
  }
  if (!round || !["QF", "SF", "FINAL"].includes(round)) {
    return NextResponse.json(
      { error: "round must be one of QF, SF, FINAL" },
      { status: 400 }
    )
  }
  if (!["EN", "FR"].includes(language)) {
    return NextResponse.json(
      { error: "language must be EN or FR" },
      { status: 400 }
    )
  }

  // Must provide file or WeTransfer link
  if (!file && !wetransferLink) {
    return NextResponse.json(
      { error: "Either a PDF file or a WeTransfer link must be provided" },
      { status: 400 }
    )
  }

  try {
    // Verify idea exists and user is a team member
    const idea = await prisma.idea.findUnique({
      where: { id: ideaId },
      include: {
        team: {
          include: { members: { select: { userId: true } } },
        },
      },
    })

    if (!idea) {
      return NextResponse.json({ error: "Idea not found" }, { status: 404 })
    }

    const isMember = idea.team?.members.some((m) => m.userId === session.user.id)
    const isAdmin = session.user.role === "ADMIN"
    if (!isMember && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check for existing report for this round (upsert)
    const existingReport = await prisma.report.findUnique({
      where: { ideaId_round: { ideaId, round: round as "QF" | "SF" | "FINAL" } },
    })

    let fileUrl: string | null = null
    let fileSizeMb: number | null = null

    if (file) {
      // Validate file type
      if (file.type !== "application/pdf") {
        return NextResponse.json(
          { error: "Only PDF files are accepted" },
          { status: 400 }
        )
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: "File size exceeds 16 MB limit. Please use the WeTransfer link option instead." },
          { status: 413 }
        )
      }

      fileSizeMb = file.size / (1024 * 1024)

      // Save file to local storage
      const uploadsDir = path.join(process.cwd(), "public", "uploads", "reports")
      await mkdir(uploadsDir, { recursive: true })

      const safeCodeName = idea.codeName.replace(/[^a-zA-Z0-9_-]/g, "_")
      const fileName = `${safeCodeName}_${round}_${language}_${Date.now()}.pdf`
      const filePath = path.join(uploadsDir, fileName)

      const buffer = Buffer.from(await file.arrayBuffer())
      await writeFile(filePath, buffer)

      fileUrl = `/uploads/reports/${fileName}`
    }

    // Create or update report
    const report = existingReport
      ? await prisma.report.update({
          where: { id: existingReport.id },
          data: {
            fileUrl: fileUrl ?? existingReport.fileUrl,
            fileSizeMb: fileSizeMb ?? existingReport.fileSizeMb,
            wetransferLink: wetransferLink ?? existingReport.wetransferLink,
            language: language as "EN" | "FR",
            submittedAt: new Date(),
            submittedById: session.user.id,
          },
        })
      : await prisma.report.create({
          data: {
            ideaId,
            editionId: idea.editionId,
            round: round as "QF" | "SF" | "FINAL",
            fileUrl,
            fileSizeMb,
            wetransferLink,
            language: language as "EN" | "FR",
            submittedById: session.user.id,
          },
        })

    await prisma.auditLog.create({
      data: {
        editionId: idea.editionId,
        actorId: session.user.id,
        action: existingReport ? "REPORT_UPDATED" : "REPORT_SUBMITTED",
        entityType: "Report",
        entityId: report.id,
        metadata: { ideaId, round, language, hasFile: !!fileUrl, hasWeTransfer: !!wetransferLink },
      },
    })

    return NextResponse.json({ success: true, report }, { status: existingReport ? 200 : 201 })
  } catch (error) {
    console.error("[POST /api/reports]", error)
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 })
  }
}
