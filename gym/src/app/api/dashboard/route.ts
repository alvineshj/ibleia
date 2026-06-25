import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const [
    totalMembers,
    activeMembers,
    totalClasses,
    recentPayments,
    beltDistribution,
    recentAttendance,
  ] = await Promise.all([
    prisma.member.count(),
    prisma.member.count({ where: { active: true } }),
    prisma.class.count({ where: { active: true } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'PAID' } }),
    prisma.member.groupBy({ by: ['belt'], _count: true }),
    prisma.attendance.count({
      where: { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    }),
  ])

  return NextResponse.json({
    totalMembers,
    activeMembers,
    totalClasses,
    totalRevenue: recentPayments._sum.amount ?? 0,
    beltDistribution,
    recentAttendance,
  })
}
