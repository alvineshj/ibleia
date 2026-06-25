import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  memberId: z.string(),
  classId: z.string(),
  date: z.string(),
  notes: z.string().optional(),
})

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const classId = searchParams.get('classId')

  const attendance = await prisma.attendance.findMany({
    where: {
      ...(date && { date: new Date(date) }),
      ...(classId && { classId }),
    },
    include: { member: true, class: true },
    orderBy: { date: 'desc' },
    take: 100,
  })
  return NextResponse.json(attendance)
}

export async function POST(req: Request) {
  const body = await req.json()
  const data = createSchema.parse(body)
  const record = await prisma.attendance.create({
    data: { ...data, date: new Date(data.date) },
    include: { member: true, class: true },
  })
  return NextResponse.json(record, { status: 201 })
}
