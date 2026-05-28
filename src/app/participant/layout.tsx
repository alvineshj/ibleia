import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { AppLayout } from "@/components/shared/app-layout"

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.role !== "PARTICIPANT") redirect("/")
  return <AppLayout>{children}</AppLayout>
}
