import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  const role = session.user.role
  if (role === "ADMIN") redirect("/admin/dashboard")
  if (role === "JURY") redirect("/jury/dashboard")
  if (role === "COMMS") redirect("/comms/showcase")
  redirect("/participant/dashboard")
}
