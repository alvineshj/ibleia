import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  CATEGORY_LABELS,
  STATUS_LABELS,
  ROUND_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/utils"
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileText,
  Lightbulb,
  Link2,
  Users,
} from "lucide-react"
import { IdeaStatus } from "@prisma/client"

type Props = { params: { id: string } }

const STATUS_FLOW: IdeaStatus[] = [
  "REGISTERED",
  "IDEA_BRIEF_PRESENTED",
  "ELIGIBILITY_REVIEW",
  "ACCEPTED",
  "UNDER_DEVELOPMENT",
  "QUARTER_FINALIST",
  "SEMI_FINALIST",
  "FINALIST",
  "WINNER",
]

const STATUS_BADGE_MAP: Record<
  IdeaStatus,
  "success" | "destructive" | "info" | "warning" | "secondary" | "outline"
> = {
  WINNER: "success",
  FINALIST: "success",
  SEMI_FINALIST: "info",
  QUARTER_FINALIST: "info",
  ACCEPTED: "info",
  UNDER_DEVELOPMENT: "warning",
  ELIGIBILITY_REVIEW: "secondary",
  IDEA_BRIEF_PRESENTED: "secondary",
  REGISTERED: "outline",
  NOT_ACCEPTED: "destructive",
  ELIMINATED: "destructive",
}

function StatusTracker({ status }: { status: IdeaStatus }) {
  const isTerminal = status === "NOT_ACCEPTED" || status === "ELIMINATED"
  const currentIndex = STATUS_FLOW.indexOf(status)

  if (isTerminal) {
    return (
      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
        <AlertCircle className="h-4 w-4 shrink-0" />
        This idea was {STATUS_LABELS[status]?.toLowerCase()}.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <ol className="flex items-start gap-0 min-w-max">
        {STATUS_FLOW.map((s, i) => {
          const done = i < currentIndex
          const active = i === currentIndex
          const upcoming = i > currentIndex
          return (
            <li key={s} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={[
                    "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                    done
                      ? "bg-green-500 border-green-500 text-white"
                      : active
                      ? "bg-ibl-blue border-ibl-blue text-white"
                      : "bg-white border-gray-300 text-gray-400",
                  ].join(" ")}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                <span
                  className={[
                    "text-xs text-center max-w-[72px] leading-tight",
                    active ? "font-semibold text-ibl-blue" : upcoming ? "text-gray-400" : "text-gray-600",
                  ].join(" ")}
                >
                  {STATUS_LABELS[s]}
                </span>
              </div>
              {i < STATUS_FLOW.length - 1 && (
                <div
                  className={[
                    "h-0.5 w-8 -mt-5 mx-0.5",
                    i < currentIndex ? "bg-green-500" : "bg-gray-200",
                  ].join(" ")}
                />
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function UnderDevelopmentChecklist({
  hasQFReport,
  wetransferLink,
}: {
  hasQFReport: boolean
  wetransferLink: string | null
}) {
  const QF_REPORT_DEADLINE = "5 June 2026"
  const WORKSHOP_REG_URL = "https://forms.iblgroup.com/workshop-registration"
  const CONSULTANT_BOOKING_URL = "https://calendly.com/ibl-innovation"

  const items = [
    {
      done: hasQFReport,
      label: `Submit Q/F Report (deadline: ${QF_REPORT_DEADLINE})`,
      action: !hasQFReport ? (
        <Link href="report" className="text-xs text-ibl-blue hover:underline flex items-center gap-1">
          Submit report <ExternalLink className="h-3 w-3" />
        </Link>
      ) : null,
    },
    {
      done: false,
      label: "Register for innovation workshops (Ideation, Customer Discovery, etc.)",
      action: (
        <a
          href={WORKSHOP_REG_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-ibl-blue hover:underline flex items-center gap-1"
        >
          Register <ExternalLink className="h-3 w-3" />
        </a>
      ),
    },
    {
      done: false,
      label: "Book a session with an IBL innovation consultant",
      action: (
        <a
          href={CONSULTANT_BOOKING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-ibl-blue hover:underline flex items-center gap-1"
        >
          Book session <ExternalLink className="h-3 w-3" />
        </a>
      ),
    },
    {
      done: !!wetransferLink,
      label: "Upload supporting documents via WeTransfer (optional)",
      action: null,
    },
  ]

  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between gap-3 rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
        >
          <div className="flex items-center gap-2">
            {item.done ? (
              <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
            ) : (
              <Circle className="h-4 w-4 text-gray-300 shrink-0" />
            )}
            <span className={`text-sm ${item.done ? "line-through text-muted-foreground" : "text-gray-700"}`}>
              {item.label}
            </span>
          </div>
          {!item.done && item.action && <div className="shrink-0">{item.action}</div>}
        </div>
      ))}
    </div>
  )
}

export default async function IdeaDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const idea = await prisma.idea.findUnique({
    where: { id: params.id },
    include: {
      team: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true, companyName: true } },
            },
            orderBy: { joinedAt: "asc" },
          },
        },
      },
      reports: {
        select: {
          id: true,
          round: true,
          fileUrl: true,
          fileSizeMb: true,
          wetransferLink: true,
          language: true,
          submittedAt: true,
          submittedBy: { select: { id: true, name: true } },
        },
        orderBy: { submittedAt: "desc" },
      },
      presentations: {
        select: {
          id: true,
          round: true,
          scheduledDatetime: true,
          isRehearsal: true,
          pptxUrl: true,
        },
        orderBy: { scheduledDatetime: "asc" },
      },
    },
  })

  if (!idea) notFound()

  const isAdmin = session.user.role === "ADMIN" || session.user.role === "JURY"
  const isMember = idea.team?.members.some((m) => m.user?.id === session.user.id)
  if (!isMember && !isAdmin) redirect("/participant/ideas")

  const hasQFReport = idea.reports.some((r) => r.round === "QF")
  const hasSFReport = idea.reports.some((r) => r.round === "SF")
  const hasFinalReport = idea.reports.some((r) => r.round === "FINAL")

  const ACTIVE_REPORT_STATUSES: IdeaStatus[] = [
    "ACCEPTED",
    "UNDER_DEVELOPMENT",
    "QUARTER_FINALIST",
    "SEMI_FINALIST",
    "FINALIST",
  ]
  const canSubmitReport = ACTIVE_REPORT_STATUSES.includes(idea.status as IdeaStatus)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{idea.codeName}</h1>
            <Badge variant={STATUS_BADGE_MAP[idea.status as IdeaStatus] ?? "outline"}>
              {STATUS_LABELS[idea.status] ?? idea.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {CATEGORY_LABELS[idea.category as keyof typeof CATEGORY_LABELS]}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">{idea.description1Line}</p>
          <p className="text-xs text-gray-400 mt-1">Registered {formatDate(idea.createdAt)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {canSubmitReport && (
            <Button variant="ibl" size="sm" asChild>
              <Link href={`/participant/ideas/${idea.id}/report`}>
                <FileText className="h-3.5 w-3.5" />
                Submit Report
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href="/participant/ideas">Back to My Ideas</Link>
          </Button>
        </div>
      </div>

      {/* Competition progress tracker */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-ibl-blue" />
            Competition Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <StatusTracker status={idea.status as IdeaStatus} />
        </CardContent>
      </Card>

      {/* Under Development checklist */}
      {idea.status === "UNDER_DEVELOPMENT" && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-amber-800 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Under Development — Action Checklist
            </CardTitle>
            <CardDescription className="text-xs text-amber-700">
              Complete these steps while developing your idea.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UnderDevelopmentChecklist
              hasQFReport={hasQFReport}
              wetransferLink={idea.wetransferLink}
            />
          </CardContent>
        </Card>
      )}

      {/* Team members */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Users className="h-4 w-4 text-ibl-blue" />
            Team Members ({idea.team?.members.length ?? 0})
          </CardTitle>
          <CardDescription className="text-xs">
            Up to 4 members may present on stage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!idea.team?.members.length ? (
            <p className="text-sm text-muted-foreground">No team members found.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {idea.team.members.map((m) => {
                const name = m.user?.name ?? m.contactName ?? "—"
                const email = m.user?.email ?? m.contactEmail ?? "—"
                const phone = m.contactPhone
                const company = m.user?.companyName
                return (
                  <li key={m.id} className="flex items-start justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">{email}</p>
                      {phone && <p className="text-xs text-gray-400">{phone}</p>}
                      {company && <p className="text-xs text-gray-400">{company}</p>}
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize shrink-0">
                      {m.role.toLowerCase()}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Reports */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <FileText className="h-4 w-4 text-ibl-blue" />
            Submitted Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          {idea.reports.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              <FileText className="h-8 w-8 mx-auto mb-2 text-gray-200" />
              No reports submitted yet.
              {canSubmitReport && (
                <div className="mt-3">
                  <Button variant="ibl" size="sm" asChild>
                    <Link href={`/participant/ideas/${idea.id}/report`}>Submit Report</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {idea.reports.map((report) => (
                <li key={report.id} className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">
                          {ROUND_LABELS[report.round]} Report
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {report.language}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Submitted {formatDateTime(report.submittedAt)} by{" "}
                        {report.submittedBy.name}
                      </p>
                      {report.fileSizeMb && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {report.fileSizeMb.toFixed(2)} MB
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      {report.fileUrl && (
                        <a
                          href={report.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-ibl-blue hover:underline"
                        >
                          <FileText className="h-3.5 w-3.5" /> View PDF
                        </a>
                      )}
                      {report.wetransferLink && (
                        <a
                          href={report.wetransferLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-ibl-blue hover:underline"
                        >
                          <Link2 className="h-3.5 w-3.5" /> WeTransfer link
                        </a>
                      )}
                    </div>
                  </div>
                  {canSubmitReport && (
                    <div className="mt-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/participant/ideas/${idea.id}/report`}>
                          Re-submit / Update
                        </Link>
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Presentations */}
      {idea.presentations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Video className="h-4 w-4 text-ibl-blue" />
              Presentations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-gray-100">
              {idea.presentations.map((p) => (
                <li key={p.id} className="py-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium">{ROUND_LABELS[p.round]}</span>
                        {p.isRehearsal && (
                          <Badge variant="warning" className="text-xs">
                            Rehearsal
                          </Badge>
                        )}
                      </div>
                      {p.scheduledDatetime && (
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(p.scheduledDatetime)}
                        </p>
                      )}
                    </div>
                    {p.pptxUrl && (
                      <a
                        href={p.pptxUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-ibl-blue hover:underline shrink-0"
                      >
                        <FileText className="h-3.5 w-3.5" /> Presentation
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* WeTransfer link (Under Development or winner) */}
      {idea.wetransferLink && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Link2 className="h-4 w-4 text-ibl-blue" />
              Supporting Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={idea.wetransferLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-ibl-blue hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Open WeTransfer link
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
