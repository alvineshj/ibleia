import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { AppLayout } from "@/components/shared/app-layout"

export default async function CommsLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (!["COMMS", "ADMIN"].includes(session.user.role)) redirect("/")
  return <AppLayout>{children}</AppLayout>
}
