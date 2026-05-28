import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SettingsForm } from "@/components/admin/settings-form"

export default async function SettingsPage() {
  const edition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } })

  const criteria = await prisma.criterion.findMany({
    where: edition ? { editionId: edition.id } : undefined,
    orderBy: { number: "asc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Settings</h1>
        <p className="text-muted-foreground">Configure edition dates, scoring weights, and survey URLs</p>
      </div>

      <SettingsForm edition={edition} criteria={criteria} />
    </div>
  )
}
