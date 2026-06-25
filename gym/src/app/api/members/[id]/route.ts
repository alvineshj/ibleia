import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  belt: z.enum(['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK']).optional(),
  stripes: z.number().min(0).max(4).optional(),
  active: z.boolean().optional(),
  notes: z.string().optional(),
})

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const member = await prisma.member.findUnique({
    where: { id: params.id },
    include: {
      attendances: { include: { class: true }, orderBy: { date: 'desc' }, take: 20 },
      payments: { orderBy: { createdAt: 'desc' } },
      promotions: { orderBy: { date: 'desc' } },
    },
  })
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(member)
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const body = await req.json()
  const data = updateSchema.parse(body)
  const member = await prisma.member.update({ where: { id: params.id }, data })
  return NextResponse.json(member)
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  await prisma.member.delete({ where: { id: params.id } })
  return NextResponse.json({ ok: true })
}
