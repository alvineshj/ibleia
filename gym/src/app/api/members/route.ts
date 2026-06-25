import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  belt: z.enum(['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK']).optional(),
  stripes: z.number().min(0).max(4).optional(),
  notes: z.string().optional(),
})

export async function GET() {
  const members = await prisma.member.findMany({
    orderBy: [{ active: 'desc' }, { lastName: 'asc' }],
    include: { _count: { select: { attendances: true, payments: true } } },
  })
  return NextResponse.json(members)
}

export async function POST(req: Request) {
  const body = await req.json()
  const data = createSchema.parse(body)
  const member = await prisma.member.create({
    data: {
      ...data,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
    },
  })
  return NextResponse.json(member, { status: 201 })
}
