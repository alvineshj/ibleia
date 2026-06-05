import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CATEGORY_LABELS, ROUND_LABELS } from "@/lib/utils"
import { Star, CheckCircle2, FileText } from "lucide-react"
import Link from "next/link"
import { ConflictDeclarationForm } from "@/components/scoring/conflict-declaration-form"

interface PageProps {
  searchParams: { action?: string }
}

const ROUND_FOR_STATUS: Record<string, "QF" | "SF" | "FINAL"> = {
  QUARTER_FINALIST: "QF",
  SEMI_FINALIST: "SF",
  FINALIST: "FINAL",
}

export default async function ScoringPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const juryId = session.user.id

  const activeEdition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } })
  if (!activeEdition) {
    return (
      <div className="text-center py-12 text-muted-foreground">No active edition found.</div>
    )
  }

  const conflictDeclaration = await prisma.conflictDeclaration.findFirst({
    where: { juryMemberId: juryId, editionId: activeEdition.id },
    orderBy: { declaredAt: "desc" },
  })

  const showConflictForm = searchParams.action === "declare-conflict" || !conflictDeclaration

  if (showConflictForm && !conflictDeclaration) {
    const allIdeas = await prisma.idea.findMany({
      where: { editionId: activeEdition.id },
      select: { id: true, codeName: true, category: true },
    })
    return (
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold">Conflict of Interest Declaration</h1>
          <p className="text-muted-foreground mt-1">
            Please declare any conflicts before scoring. This is required per round.
          </p>
        </div>
        <ConflictDeclarationForm
          ideas={allIdeas}
          editionId={activeEdition.id}
          juryMemberId={juryId}
        />
      </div>
    )
  }

  const conflictedIds = conflictDeclaration?.conflictedIdeaIds ?? []

  // Discover ideas in active competition rounds directly from Presentation records.
  // This works regardless of whether Score rows were pre-seeded.
  const activeIdeas = await prisma.idea.findMany({
    where: {
      editionId: activeEdition.id,
      status: { in: ["QUARTER_FINALIST", "SEMI_FINALIST", "FINALIST"] },
      presentations: { some: {} },
      id: { notIn: conflictedIds },
    },
    include: {
      presentations: { select: { round: true } },
      reports: { select: { id: true, round: true, fileUrl: true } },
    },
    orderBy: { codeName: "asc" },
  })

  // For each idea, check if this jury member already has a score in the relevant round
  const existingScores = await prisma.score.findMany({
    where: {
      juryMemberId: juryId,
      editionId: activeEdition.id,
      ideaId: { in: activeIdeas.map((i) => i.id) },
    },
    select: { id: true, ideaId: true, round: true, submittedAt: true, finalScore: true },
  })

  const scoreMap = new Map(
    existingScores.map((s) => [`${s.ideaId}:${s.round}`, s])
  )

  type ScoringItem = {
    idea: (typeof activeIdeas)[number]
    round: "QF" | "SF" | "FINAL"
    scoreId?: string
    submitted: boolean
    finalScore?: number | null
  }

  const items: ScoringItem[] = activeIdeas.flatMap((idea) => {
    const round = ROUND_FOR_STATUS[idea.status]
    if (!round) return []
    const existing = scoreMap.get(`${idea.id}:${round}`)
    return [
      {
        idea,
        round,
        scoreId: existing?.id,
        submitted: !!existing?.submittedAt,
        finalScore: existing?.finalScore,
      },
    ]
  })

  const pending = items.filter((i) => !i.submitted)
  const submitted = items.filter((i) => i.submitted)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Score Ideas</h1>
          <p className="text-muted-foreground">{activeEdition.name}</p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/jury/scoring?action=declare-conflict">Update Conflict Declaration</Link>
        </Button>
      </div>

      {pending.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 text-orange-500" />
            Pending ({pending.length})
          </h2>
          <div className="grid gap-3">
            {pending.map(({ idea, round, scoreId }) => {
              const roundReports = idea.reports.filter((r) => r.round === round)
              const href = scoreId
                ? `/jury/scoring/${idea.id}?round=${round}&scoreId=${scoreId}`
                : `/jury/scoring/${idea.id}?round=${round}`
              return (
                <Card key={`${idea.id}:${round}`} className="border-orange-200">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{idea.codeName}</p>
                        <p className="text-sm text-muted-foreground">
                          {CATEGORY_LABELS[idea.category as keyof typeof CATEGORY_LABELS]} ·{" "}
                          {ROUND_LABELS[round as keyof typeof ROUND_LABELS]}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {roundReports.length} report(s) available
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap justify-end">
                        {roundReports.map((r) => (
                          <Button key={r.id} variant="outline" size="sm" asChild>
                            <a href={r.fileUrl || "#"} target="_blank" rel="noreferrer">
                              <FileText className="h-3 w-3 mr-1" />
                              Report
                            </a>
                          </Button>
                        ))}
                        <Button variant="ibl" size="sm" asChild>
                          <Link href={href}>Score</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {submitted.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Submitted ({submitted.length})
          </h2>
          <div className="grid gap-3">
            {submitted.map(({ idea, round, finalScore }) => (
              <Card key={`${idea.id}:${round}`} className="opacity-60">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{idea.codeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {CATEGORY_LABELS[idea.category as keyof typeof CATEGORY_LABELS]} ·{" "}
                        {ROUND_LABELS[round as keyof typeof ROUND_LABELS]}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {finalScore != null && (
                        <span className="text-sm font-medium">{finalScore.toFixed(1)}%</span>
                      )}
                      <Badge variant="success">Submitted</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {conflictedIds.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 text-muted-foreground">
            Conflicts declared ({conflictedIds.length})
          </h2>
          <p className="text-sm text-muted-foreground">
            You have declared a conflict of interest for {conflictedIds.length} idea(s). These
            will not appear in your scoring queue.
          </p>
        </div>
      )}

      {pending.length === 0 && submitted.length === 0 && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center space-y-2">
            <p className="text-muted-foreground font-medium">No ideas assigned for scoring yet.</p>
            <p className="text-sm text-muted-foreground">
              The admin will assign ideas to a competition round. Check back shortly.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
