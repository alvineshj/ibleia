import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CATEGORY_LABELS, ROUND_LABELS } from "@/lib/utils"
import { Star, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

const ROUND_FOR_STATUS: Record<string, "QF" | "SF" | "FINAL"> = {
  QUARTER_FINALIST: "QF",
  SEMI_FINALIST: "SF",
  FINALIST: "FINAL",
}

export default async function JuryDashboard() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const juryId = session.user.id

  const activeEdition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } })

  const [conflicts, existingScores] = await Promise.all([
    prisma.conflictDeclaration.findMany({
      where: { juryMemberId: juryId },
      orderBy: { declaredAt: "desc" },
    }),
    prisma.score.findMany({
      where: { juryMemberId: juryId, editionId: activeEdition?.id },
      select: { id: true, ideaId: true, round: true, submittedAt: true },
    }),
  ])

  const latestConflict = conflicts[0]
  const conflictedIds = latestConflict?.conflictedIdeaIds ?? []

  // Discover ideas in active rounds directly — no dependency on pre-seeded Score rows
  const activeIdeas = activeEdition
    ? await prisma.idea.findMany({
        where: {
          editionId: activeEdition.id,
          status: { in: ["QUARTER_FINALIST", "SEMI_FINALIST", "FINALIST"] },
          presentations: { some: {} },
          id: { notIn: conflictedIds },
        },
        select: { id: true, codeName: true, category: true, status: true },
      })
    : []

  const scoreMap = new Map(existingScores.map((s) => [`${s.ideaId}:${s.round}`, s]))

  const pendingIdeas = activeIdeas.filter((idea) => {
    const round = ROUND_FOR_STATUS[idea.status]
    if (!round) return false
    const score = scoreMap.get(`${idea.id}:${round}`)
    return !score?.submittedAt
  })

  const submittedCount = existingScores.filter((s) => s.submittedAt).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jury Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {session.user.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{submittedCount}</p>
                <p className="text-sm text-muted-foreground">Scorecards Submitted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingIdeas.length}</p>
                <p className="text-sm text-muted-foreground">Pending Scorecards</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{conflicts.length}</p>
                <p className="text-sm text-muted-foreground">Conflict Declarations</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!latestConflict && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-orange-800">Conflict of Interest Declaration Required</p>
                <p className="text-sm text-orange-700 mt-1">
                  You must complete a conflict-of-interest declaration before scoring any ideas.
                </p>
                <Button variant="outline" size="sm" className="mt-2 border-orange-400 text-orange-700" asChild>
                  <Link href="/jury/scoring?action=declare-conflict">Declare Now</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Active Round — Ideas to Score</h2>
        <Button variant="ibl" asChild>
          <Link href="/jury/scoring">
            <Star className="h-4 w-4 mr-2" />
            Go to Scoring
          </Link>
        </Button>
      </div>

      {pendingIdeas.length > 0 ? (
        <div className="grid gap-3">
          {pendingIdeas.map((idea) => {
            const round = ROUND_FOR_STATUS[idea.status]!
            const existing = scoreMap.get(`${idea.id}:${round}`)
            const href = existing
              ? `/jury/scoring/${idea.id}?round=${round}&scoreId=${existing.id}`
              : `/jury/scoring/${idea.id}?round=${round}`
            return (
              <Card key={idea.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{idea.codeName}</p>
                      <p className="text-sm text-muted-foreground">
                        {CATEGORY_LABELS[idea.category as keyof typeof CATEGORY_LABELS]} ·{" "}
                        {ROUND_LABELS[round as keyof typeof ROUND_LABELS]}
                      </p>
                    </div>
                    <Button variant="ibl" size="sm" asChild>
                      <Link href={href}>Score Now</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-muted-foreground">
              {activeIdeas.length === 0
                ? "No ideas have been assigned to a round yet."
                : "All scorecards submitted. You’re all caught up!"}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
