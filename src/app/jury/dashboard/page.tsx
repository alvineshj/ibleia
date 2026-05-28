import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CATEGORY_LABELS, ROUND_LABELS } from "@/lib/utils"
import { Star, AlertTriangle, CheckCircle2, Clock } from "lucide-react"
import Link from "next/link"

export default async function JuryDashboard() {
  const session = await getServerSession(authOptions)!
  const juryId = session!.user.id

  const [conflicts, scores, activeEdition] = await Promise.all([
    prisma.conflictDeclaration.findMany({
      where: { juryMemberId: juryId },
      orderBy: { declaredAt: "desc" },
    }),
    prisma.score.findMany({
      where: { juryMemberId: juryId },
      include: { idea: true },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.edition.findFirst({ where: { status: "ACTIVE" } }),
  ])

  const submittedScores = scores.filter((s) => s.submittedAt)
  const pendingScores = scores.filter((s) => !s.submittedAt)

  const latestConflict = conflicts[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Jury Dashboard</h1>
        <p className="text-muted-foreground">Welcome, {session!.user.name}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Star className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{submittedScores.length}</p>
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
                <p className="text-2xl font-bold">{pendingScores.length}</p>
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
                  You must complete a conflict-of-interest declaration before you can score any ideas in the current round.
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

      {pendingScores.length > 0 ? (
        <div className="grid gap-3">
          {pendingScores.map((score) => (
            <Card key={score.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{score.idea.codeName}</p>
                    <p className="text-sm text-muted-foreground">
                      {CATEGORY_LABELS[score.idea.category as keyof typeof CATEGORY_LABELS]} ·{" "}
                      {ROUND_LABELS[score.round as keyof typeof ROUND_LABELS]}
                    </p>
                  </div>
                  <Button variant="ibl" size="sm" asChild>
                    <Link href={`/jury/scoring/${score.idea.id}?round=${score.round}`}>
                      Score Now
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-muted-foreground">No pending scorecards. You&apos;re all caught up!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
