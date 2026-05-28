import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { ScoringForm } from "@/components/scoring/scoring-form"

interface PageProps {
  params: { ideaId: string }
  searchParams: { round?: string; scoreId?: string }
}

export default async function ScoringDetailPage({ params, searchParams }: PageProps) {
  const session = await getServerSession(authOptions)!
  const juryId = session!.user.id

  const { ideaId } = params
  const round = searchParams.round as "QF" | "SF" | "FINAL" | undefined
  const scoreId = searchParams.scoreId

  const [idea, criteria, existingScore] = await Promise.all([
    prisma.idea.findUnique({
      where: { id: ideaId },
      include: { reports: true, team: { include: { members: { include: { user: true } } } } },
    }),
    prisma.criterion.findMany({
      where: { editionId: (await prisma.edition.findFirst({ where: { status: "ACTIVE" } }))?.id },
      orderBy: { number: "asc" },
    }),
    scoreId
      ? prisma.score.findUnique({
          where: { id: scoreId },
          include: { items: true },
        })
      : null,
  ])

  if (!idea) notFound()
  if (!round) redirect("/jury/scoring")
  if (existingScore?.submittedAt) redirect("/jury/scoring")

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">{idea.codeName}</h1>
        <p className="text-muted-foreground">{idea.description1Line}</p>
      </div>

      <ScoringForm
        idea={idea}
        criteria={criteria}
        round={round}
        juryMemberId={juryId}
        existingScore={existingScore}
      />
    </div>
  )
}
