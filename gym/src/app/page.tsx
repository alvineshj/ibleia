import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, DollarSign, TrendingUp } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatCurrency, BELT_COLORS, formatBelt } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  const [totalMembers, activeMembers, totalClasses, revenueAgg, beltDistribution, recentAttendance] =
    await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { active: true } }),
      prisma.class.count({ where: { active: true } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'PAID' } }),
      prisma.member.groupBy({ by: ['belt'], _count: true }),
      prisma.attendance.count({
        where: { date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ])
  return { totalMembers, activeMembers, totalClasses, totalRevenue: revenueAgg._sum.amount ?? 0, beltDistribution, recentAttendance }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  const stats = [
    { label: 'Total Members', value: data.totalMembers, sub: `${data.activeMembers} active`, icon: Users, color: 'text-blue-600' },
    { label: 'Active Classes', value: data.totalClasses, sub: 'per week', icon: Calendar, color: 'text-green-600' },
    { label: 'Total Revenue', value: formatCurrency(data.totalRevenue), sub: 'all time', icon: DollarSign, color: 'text-yellow-600' },
    { label: 'Attendance (30d)', value: data.recentAttendance, sub: 'check-ins', icon: TrendingUp, color: 'text-purple-600' },
  ]

  const beltOrder = ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK']
  const beltMap = Object.fromEntries(data.beltDistribution.map((b) => [b.belt, b._count]))

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Welcome to your BJJ gym management platform.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{s.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Belt Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {beltOrder.map((belt) => (
              <div key={belt} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${BELT_COLORS[belt]}`}>
                <span>{formatBelt(belt)}</span>
                <span className="font-bold">{beltMap[belt] ?? 0}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
