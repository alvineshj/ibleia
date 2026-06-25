import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  instructor: z.string().min(1),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  startTime: z.string(),
  durationMin: z.number().default(60),
  maxStudents: z.number().optional(),
})

export async function GET() {
  const classes = await prisma.class.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { attendances: true } } },
  })
  return NextResponse.json(classes)
}

export async function POST(req: Request) {
  const body = await req.json()
  const data = createSchema.parse(body)
  const cls = await prisma.class.create({ data })
  return NextResponse.json(cls, { status: 201 })
}
