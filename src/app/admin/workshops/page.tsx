import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { WORKSHOP_TYPE_LABELS, formatDate } from "@/lib/utils"
import { WorkshopManager } from "@/components/admin/workshop-manager"

export default async function WorkshopsPage() {
  const edition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } })
  if (!edition) return <div>No active edition</div>

  const workshops = await prisma.workshop.findMany({
    where: { editionId: edition.id },
    include: {
      attendees: { include: { user: { select: { id: true, name: true, companyName: true } } } },
      surveyTriggers: true,
    },
    orderBy: { sessionDate: "asc" },
  })

  const stats = {
    total: workshops.length,
    completed: workshops.filter((w) => w.status === "COMPLETED").length,
    scheduled: workshops.filter((w) => w.status === "SCHEDULED").length,
    totalAttendees: workshops.reduce((sum, w) => sum + w.attendees.length, 0),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workshop Management</h1>
          <p className="text-muted-foreground">{edition.name}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Sessions</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-green-600">{stats.completed}</p><p className="text-sm text-muted-foreground">Completed</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold text-blue-600">{stats.scheduled}</p><p className="text-sm text-muted-foreground">Scheduled</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-2xl font-bold">{stats.totalAttendees}</p><p className="text-sm text-muted-foreground">Total Attendees</p></CardContent></Card>
      </div>

      <WorkshopManager workshops={workshops} editionId={edition.id} />
    </div>
  )
}
