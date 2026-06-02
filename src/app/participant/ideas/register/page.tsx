import { prisma } from "@/lib/prisma"
import RegisterIdeaClient from "./RegisterIdeaClient"

export default async function RegisterIdeaPage() {
  const edition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } })
  const regDeadline = edition?.regDeadline ? new Date(edition.regDeadline) : null
  return <RegisterIdeaClient regDeadline={regDeadline} />
}
