import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CATEGORY_LABELS, STATUS_LABELS, formatDate, getCountdown } from "@/lib/utils"
import {
  Lightbulb,
  Plus,
  FileText,
  AlertCircle,
  CheckCircle2,
  Clock,
  Calendar,
} from "lucide-react"
import Link from "next/link"
import { IdeaStatus } from "@prisma/client"

function getStatusBadgeVariant(
  status: IdeaStatus
): "success" | "destructive" | "info" | "warning" | "secondary" | "outline" {
  switch (status) {
    case "WINNER":
      return "success"
    case "ELIMINATED":
    case "NOT_ACCEPTED":
      return "destructive"
    case "QUARTER_FINALIST":
    case "SEMI_FINALIST":
    case "FINALIST":
    case "ACCEPTED":
      return "info"
    case "UNDER_DEVELOPMENT":
      return "warning"
    case "ELIGIBILITY_REVIEW":
    case "IDEA_BRIEF_PRESENTED":
      return "secondary"
    default:
      return "outline"
  }
}

const ACTIVE_REPORT_STATUSES: IdeaStatus[] = [
  "ACCEPTED",
  "UNDER_DEVELOPMENT",
  "QUARTER_FINALIST",
  "SEMI_FINALIST",
  "FINALIST",
]

export default async function IdeasListPage() {
  const session = await getServerSession(authOptions)
  const userId = session!.user.id

  const [teamMemberships, activeEdition] = await Promise.all([
    prisma.teamMember.findMany({
      where: { userId },
      include: {
        team: {
          include: {
            idea: {
              include: {
                reports: true,
                team: {
                  include: {
                    members: { include: { user: { select: { id: true, name: true, email: true } } } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
    }),
    prisma.edition.findFirst({ where: { status: "ACTIVE" } }),
  ])

  const ideas = teamMemberships.map((m) => m.team.idea)
  const regDeadlinePassed = activeEdition
    ? new Date() > new Date(activeEdition.regDeadline)
    : true

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Ideas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your registered ideas and track their progress
          </p>
        </div>
        {!regDeadlinePassed && (
          <Button variant="ibl" asChild>
            <Link href="/ideas/register">
              <Plus className="h-4 w-4" />
              Register New Idea
            </Link>
          </Button>
        )}
      </div>

      {activeEdition && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Card className={regDeadlinePassed ? "border-gray-200 bg-gray-50" : "border-ibl-blue/20 bg-ibl-light"}>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-sm text-ibl-blue">
                <Clock className="h-4 w-4" />
                <span className="font-medium">Registration Deadline</span>
              </div>
              <p className="text-base font-bold mt-1">{formatDate(activeEdition.regDeadline)}</p>
              <p className={`text-xs mt-1 ${regDeadlinePassed ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                {regDeadlinePassed ? "Registration is closed" : getCountdown(activeEdition.regDeadline)}
              </p>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Idea Brief Sessions</span>
              </div>
              <p className="text-base font-bold mt-1">6–7 April 2026</p>
              <p className="text-xs text-muted-foreground mt-1">MS Teams · 8:30am–12:00pm</p>
            </CardContent>
          </Card>
        </div>
      )}

      {ideas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Lightbulb className="h-14 w-14 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700">No ideas registered yet</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Submit your first idea to participate in the IBL Excellence &amp; Innovation Award.
            </p>
            {!regDeadlinePassed ? (
              <Button variant="ibl" asChild>
                <Link href="/ideas/register">
                  <Lightbulb className="h-4 w-4" />
                  Register Your First Idea
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-red-500 font-medium">Registration is now closed.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ideas.map((idea) => {
            const hasQFReport = idea.reports.some((r) => r.round === "QF")
            const hasSFReport = idea.reports.some((r) => r.round === "SF")
            const hasFinalReport = idea.reports.some((r) => r.round === "FINAL")
            const needsReport =
              ACTIVE_REPORT_STATUSES.includes(idea.status as IdeaStatus) && !hasQFReport
            const memberCount = idea.team?.members.length ?? 0

            return (
              <Card key={idea.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-bold text-lg leading-tight">{idea.codeName}</span>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {CATEGORY_LABELS[idea.category as keyof typeof CATEGORY_LABELS]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{idea.description1Line}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {memberCount} team member{memberCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <Badge
                      variant={getStatusBadgeVariant(idea.status as IdeaStatus)}
                      className="shrink-0"
                    >
                      {STATUS_LABELS[idea.status] ?? idea.status}
                    </Badge>
                  </div>

                  {needsReport && (
                    <div className="mt-3 flex items-start gap-2 p-2.5 bg-orange-50 border border-orange-200 rounded-md">
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-orange-700">
                        <strong>Action required:</strong> Submit your Q/F report by 5 June 2026.
                      </p>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {hasQFReport && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Q/F report submitted
                      </span>
                    )}
                    {hasSFReport && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> S/F report submitted
                      </span>
                    )}
                    {hasFinalReport && (
                      <span className="inline-flex items-center gap-1 text-xs text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Final report submitted
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/ideas/${idea.id}`}>View Details</Link>
                    </Button>
                    {ACTIVE_REPORT_STATUSES.includes(idea.status as IdeaStatus) && (
                      <Button variant="ibl" size="sm" asChild>
                        <Link href={`/ideas/${idea.id}/report`}>
                          <FileText className="h-3.5 w-3.5" />
                          Submit Report
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
