import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSchema = z.object({
  memberId: z.string(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  type: z.enum(['MONTHLY', 'ANNUAL', 'DROP_IN', 'GRADING_FEE', 'OTHER']),
  status: z.enum(['PAID', 'PENDING', 'OVERDUE', 'CANCELLED']).default('PAID'),
  paidAt: z.string().optional(),
  dueDate: z.string().optional(),
  description: z.string().optional(),
})

export async function GET() {
  const payments = await prisma.payment.findMany({
    include: { member: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return NextResponse.json(payments)
}

export async function POST(req: Request) {
  const body = await req.json()
  const data = createSchema.parse(body)
  const payment = await prisma.payment.create({
    data: {
      ...data,
      paidAt: data.paidAt ? new Date(data.paidAt) : undefined,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    },
    include: { member: true },
  })
  return NextResponse.json(payment, { status: 201 })
}
