import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDateTime } from "@/lib/utils"
import {
  Lightbulb,
  Users,
  Trophy,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  BarChart3,
  Bell,
} from "lucide-react"
import Link from "next/link"

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions)

  const [
    totalIdeas,
    acceptedIdeas,
    qfIdeas,
    sfIdeas,
    finalistIdeas,
    winnerIdeas,
    totalUsers,
    juryUsers,
    pendingTriggers,
    escalationTriggers,
    recentAuditLogs,
    activeEdition,
  ] = await Promise.all([
    prisma.idea.count(),
    prisma.idea.count({ where: { status: { in: ["ACCEPTED", "UNDER_DEVELOPMENT"] } } }),
    prisma.idea.count({ where: { status: "QUARTER_FINALIST" } }),
    prisma.idea.count({ where: { status: "SEMI_FINALIST" } }),
    prisma.idea.count({ where: { status: "FINALIST" } }),
    prisma.idea.count({ where: { status: "WINNER" } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "JURY", isActive: true } }),
    prisma.externalSurveyTrigger.count({ where: { status: "PENDING" } }),
    prisma.externalSurveyTrigger.count({
      where: {
        status: "PENDING",
        firedAt: { lt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        escalationSent: false,
      },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { timestamp: "desc" },
      include: {
        actor: { select: { name: true, email: true } },
      },
    }),
    prisma.edition.findFirst({ where: { status: "ACTIVE" }, orderBy: { year: "desc" } }),
  ])

  const eligibilityPending = await prisma.idea.count({
    where: { status: "ELIGIBILITY_REVIEW" },
  })

  const statsCards = [
    { label: "Total Ideas", value: totalIdeas, icon: Lightbulb, color: "text-ibl-blue", bg: "bg-blue-50" },
    { label: "Accepted / In Development", value: acceptedIdeas, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
    { label: "Quarter-Finalists", value: qfIdeas, icon: Trophy, color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: "Semi-Finalists", value: sfIdeas, icon: Trophy, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Finalists", value: finalistIdeas, icon: Trophy, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Winners", value: winnerIdeas, icon: Trophy, color: "text-ibl-gold", bg: "bg-amber-50" },
    { label: "Active Users", value: totalUsers, icon: Users, color: "text-slate-600", bg: "bg-slate-50" },
    { label: "Jury Members", value: juryUsers, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            {activeEdition ? activeEdition.name : "IBL Excellence & Innovation Award"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/notifications">
              <Bell className="h-4 w-4 mr-2" />
              Broadcast
            </Link>
          </Button>
          <Button variant="ibl" asChild>
            <Link href="/admin/rounds">
              <Trophy className="h-4 w-4 mr-2" />
              Manage Rounds
            </Link>
          </Button>
        </div>
      </div>

      {(eligibilityPending > 0 || escalationTriggers > 0) && (
        <div className="space-y-2">
          {eligibilityPending > 0 && (
            <div className="flex items-center gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-800">
                  {eligibilityPending} idea{eligibilityPending !== 1 ? "s" : ""} pending eligibility review
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin/ideas?status=ELIGIBILITY_REVIEW">Review</Link>
              </Button>
            </div>
          )}
          {escalationTriggers > 0 && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">
                  {escalationTriggers} survey trigger{escalationTriggers !== 1 ? "s" : ""} pending &gt;2 days — escalation required
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/admin/survey-triggers">View</Link>
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="pt-4 pb-4">
                <div className={`inline-flex p-2 rounded-md ${stat.bg} mb-2`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Survey Trigger Queue
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/survey-triggers">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
            <CardDescription>
              {pendingTriggers} pending trigger{pendingTriggers !== 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingTriggers === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                All survey triggers up to date
              </div>
            ) : (
              <div className="space-y-2">
                <SurveyTriggerQueue />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="justify-start" asChild>
                <Link href="/admin/users">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Users
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="justify-start" asChild>
                <Link href="/admin/ideas">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Review Ideas
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="justify-start" asChild>
                <Link href="/admin/slots">
                  <Clock className="h-4 w-4 mr-2" />
                  Slot Bookings
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="justify-start" asChild>
                <Link href="/admin/scoring">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Leaderboard
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="justify-start" asChild>
                <Link href="/admin/rounds">
                  <Trophy className="h-4 w-4 mr-2" />
                  Round Control
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="justify-start" asChild>
                <Link href="/admin/settings">
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAuditLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                      {log.action}
                    </span>
                    <span className="text-muted-foreground">by {log.actor.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

async function SurveyTriggerQueue() {
  const triggers = await prisma.externalSurveyTrigger.findMany({
    where: { status: "PENDING" },
    take: 5,
    orderBy: { firedAt: "asc" },
  })

  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)

  return (
    <>
      {triggers.map((t) => {
        const isOverdue = t.firedAt < twoDaysAgo && !t.escalationSent
        return (
          <div key={t.id} className="flex items-center justify-between text-sm py-1.5 border-b last:border-0">
            <div>
              <span className="font-medium">{t.triggerType.replace("_", "-")}</span>
              <span className="text-muted-foreground ml-2 text-xs">{t.targetAudienceDescription}</span>
            </div>
            <div className="flex items-center gap-2">
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">Overdue</Badge>
              )}
              <Badge variant="warning" className="text-xs">Pending</Badge>
            </div>
          </div>
        )
      })}
    </>
  )
}
