import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CATEGORY_LABELS, ROUND_LABELS } from "@/lib/utils"
import { Star, FileText } from "lucide-react"
import Link from "next/link"
import { ConflictDeclarationForm } from "@/components/scoring/conflict-declaration-form"

interface PageProps {
  searchParams: { action?: string }
}

export default async function ScoringPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions)!
  const juryId = session!.user.id

  const activeEdition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } })
  if (!activeEdition) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No active edition found.
      </div>
    )
  }

  const [conflictDeclaration, assignedScores] = await Promise.all([
    prisma.conflictDeclaration.findFirst({
      where: {
        juryMemberId: juryId,
        editionId: activeEdition.id,
      },
      orderBy: { declaredAt: "desc" },
    }),
    prisma.score.findMany({
      where: {
        juryMemberId: juryId,
        editionId: activeEdition.id,
        conflictDeclared: false,
      },
      include: {
        idea: {
          include: { reports: true },
        },
        items: true,
      },
    }),
  ])

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

  const pending = assignedScores.filter((s) => !s.submittedAt)
  const submitted = assignedScores.filter((s) => s.submittedAt)

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
            {pending.map((score) => (
              <Card key={score.id} className="border-orange-200">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{score.idea.codeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {CATEGORY_LABELS[score.idea.category as keyof typeof CATEGORY_LABELS]} ·{" "}
                        {ROUND_LABELS[score.round as keyof typeof ROUND_LABELS]}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {score.idea.reports.length} report(s) available
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {score.idea.reports.map((r) => (
                        <Button key={r.id} variant="outline" size="sm" asChild>
                          <a href={r.fileUrl || "#"} target="_blank" rel="noreferrer">
                            <FileText className="h-3 w-3 mr-1" />
                            Report
                          </a>
                        </Button>
                      ))}
                      <Button variant="ibl" size="sm" asChild>
                        <Link href={`/jury/scoring/${score.idea.id}?round=${score.round}&scoreId=${score.id}`}>
                          Score
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {submitted.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3 flex items-center gap-2 text-muted-foreground">
            Submitted ({submitted.length})
          </h2>
          <div className="grid gap-3">
            {submitted.map((score) => (
              <Card key={score.id} className="opacity-60">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{score.idea.codeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {CATEGORY_LABELS[score.idea.category as keyof typeof CATEGORY_LABELS]} · {ROUND_LABELS[score.round as keyof typeof ROUND_LABELS]}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{score.finalScore?.toFixed(1)}%</span>
                      <Badge variant="success">Submitted</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {pending.length === 0 && submitted.length === 0 && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
            No ideas assigned for scoring in this round.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
