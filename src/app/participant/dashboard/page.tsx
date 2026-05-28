import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { STATUS_LABELS, CATEGORY_LABELS, ROUND_LABELS, getCountdown, formatDate } from "@/lib/utils"
import { Lightbulb, Clock, FileText, Calendar, AlertCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default async function ParticipantDashboard() {
  const session = await getServerSession(authOptions)!
  const userId = session!.user.id

  const [teamMemberships, activeEdition] = await Promise.all([
    prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            idea: { include: { reports: true } },
          },
        },
      },
    }),
    prisma.edition.findFirst({ where: { status: "ACTIVE" } }),
  ])

  const ideas = teamMemberships.map((m) => m.team.idea)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {session!.user.name}
        </h1>
        <p className="text-muted-foreground">IBL Excellence & Innovation Award 2026</p>
      </div>

      {activeEdition && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-ibl-blue/20 bg-ibl-light">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-ibl-blue">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Registration Deadline</span>
              </div>
              <p className="text-lg font-bold mt-1">
                {formatDate(activeEdition.regDeadline)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {getCountdown(activeEdition.regDeadline)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-orange-700">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Idea Brief Sessions</span>
              </div>
              <p className="text-lg font-bold mt-1">6–7 April 2026</p>
              <p className="text-xs text-muted-foreground mt-1">MS Teams, 8:30am–12:00pm</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Q/F Report Deadline</span>
              </div>
              <p className="text-lg font-bold mt-1">5 June 2026</p>
              <p className="text-xs text-muted-foreground mt-1">
                {getCountdown(new Date("2026-06-05T23:59:00"))}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Ideas</h2>
        <Button variant="ibl" asChild>
          <Link href="/participant/ideas/register">
            <Lightbulb className="h-4 w-4 mr-2" />
            Register New Idea
          </Link>
        </Button>
      </div>

      {ideas.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">You haven&apos;t registered any ideas yet.</p>
            <Button variant="ibl" className="mt-4" asChild>
              <Link href="/participant/ideas/register">Register Your Idea</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ideas.map((idea) => (
            <IdeaCard key={idea.id} idea={idea} />
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Award Consultant</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Need help developing your idea? Contact the Award Consultant team.
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href="mailto:excellenceaward@iblgroup.com">
              Contact Consultant
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function IdeaCard({ idea }: { idea: { id: string; codeName: string; description1Line: string; category: string; status: string; reports: { round: string }[] } }) {
  const statusBadgeVariant =
    idea.status === "WINNER"
      ? "success"
      : idea.status === "ELIMINATED" || idea.status === "NOT_ACCEPTED"
      ? "destructive"
      : idea.status === "ACCEPTED" || idea.status === "QUARTER_FINALIST" || idea.status === "SEMI_FINALIST" || idea.status === "FINALIST"
      ? "info"
      : "secondary"

  const hasQFReport = idea.reports.some((r) => r.round === "QF")

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-base">{idea.codeName}</span>
              <Badge variant="outline" className="text-xs">
                {CATEGORY_LABELS[idea.category as keyof typeof CATEGORY_LABELS]}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{idea.description1Line}</p>
          </div>
          <Badge variant={statusBadgeVariant as "success" | "destructive" | "info" | "secondary"}>
            {STATUS_LABELS[idea.status] || idea.status}
          </Badge>
        </div>

        {(idea.status === "ACCEPTED" || idea.status === "UNDER_DEVELOPMENT") && !hasQFReport && (
          <div className="mt-3 flex items-start gap-2 p-2 bg-orange-50 rounded-md">
            <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
            <div className="text-xs text-orange-700">
              <strong>Action required:</strong> Submit your Q/F report by 5 June 2026.
            </div>
          </div>
        )}

        {hasQFReport && (
          <div className="mt-3 flex items-center gap-2 text-xs text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            Q/F report submitted
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/participant/ideas/${idea.id}`}>View Details</Link>
          </Button>
          {(idea.status === "ACCEPTED" || idea.status === "UNDER_DEVELOPMENT" ||
            idea.status === "QUARTER_FINALIST" || idea.status === "SEMI_FINALIST" ||
            idea.status === "FINALIST") && (
            <Button variant="ibl" size="sm" asChild>
              <Link href={`/participant/ideas/${idea.id}/report`}>
                <FileText className="h-3 w-3 mr-1" />
                Submit Report
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
