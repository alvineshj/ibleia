import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import BookSlotClient from "./BookSlotClient"

type Props = { params: { id: string } }

export default async function BookSlotPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const idea = await prisma.idea.findUnique({
    where: { id: params.id },
    include: {
      team: { include: { members: { select: { userId: true } } } },
      edition: true,
    },
  })

  if (!idea) notFound()

  const isMember = idea.team?.members.some((m) => m.userId === session.user.id)
  if (!isMember) redirect("/participant/ideas")

  const existingSlot = await prisma.slot.findFirst({ where: { ideaId: idea.id } })
  if (existingSlot) redirect(`/participant/ideas/${idea.id}`)

  const regDeadline = idea.edition.regDeadline ? new Date(idea.edition.regDeadline) : null
  const deadlinePassed = regDeadline ? new Date() > regDeadline : false

  return (
    <BookSlotClient
      ideaId={idea.id}
      ideaCodeName={idea.codeName}
      deadlinePassed={deadlinePassed}
    />
  )
}
