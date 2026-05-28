import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendEmail, surveyTriggerEmail } from "@/lib/email"
import { z } from "zod"

const createSchema = z.object({
  editionId: z.string(),
  type: z.enum(["IDEATION", "CUSTOMER_DISCOVERY", "BUSINESS_MODELLING", "TESTING_BUSINESS_IDEAS", "PITCHING", "OTHER"]),
  sessionDate: z.string(),
  description: z.string().optional(),
})

const updateSchema = z.object({
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED"]).optional(),
  surveyUrlOverride: z.string().url().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const editionId = searchParams.get("editionId")

  const workshops = await prisma.workshop.findMany({
    where: editionId ? { editionId } : undefined,
    include: {
      attendees: { include: { user: { select: { id: true, name: true, companyName: true } } } },
    },
    orderBy: { sessionDate: "asc" },
  })

  return NextResponse.json(workshops)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const data = createSchema.parse(body)

    const workshop = await prisma.workshop.create({
      data: {
        editionId: data.editionId,
        type: data.type,
        sessionDate: new Date(data.sessionDate),
        description: data.description,
      },
    })

    return NextResponse.json(workshop, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    return NextResponse.json({ error: "Failed to create workshop" }, { status: 500 })
  }
}
