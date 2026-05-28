import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/utils"
import { SurveyTriggerManager } from "@/components/admin/survey-trigger-manager"

export default async function SurveyTriggersPage() {
  const edition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } })
  if (!edition) return <div>No active edition</div>

  const triggers = await prisma.externalSurveyTrigger.findMany({
    where: { editionId: edition.id },
    include: { workshop: true },
    orderBy: { firedAt: "desc" },
  })

  const pending = triggers.filter((t) => t.status === "PENDING").length
  const launched = triggers.filter((t) => t.status === "LAUNCHED").length
  const closed = triggers.filter((t) => t.status === "CLOSED").length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Survey Trigger Management</h1>
        <p className="text-muted-foreground">
          External survey reminders — surveys are administered on SurveyMonkey
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className={pending > 0 ? "border-orange-400 bg-orange-50" : ""}>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-orange-600">{pending}</p>
            <p className="text-sm text-muted-foreground">Pending Action</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-600">{launched}</p>
            <p className="text-sm text-muted-foreground">Launched</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{closed}</p>
            <p className="text-sm text-muted-foreground">Closed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Survey URL Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-muted-foreground">TRG-001 Post-award Jury Survey</span>
              <span className="font-mono text-xs truncate max-w-xs">{edition.surveyUrlPostJury || "Not configured"}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-muted-foreground">TRG-002 Post-award Participant Survey</span>
              <span className="font-mono text-xs truncate max-w-xs">{edition.surveyUrlPostParticipant || "Not configured"}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
              <span className="text-muted-foreground">TRG-003 Post-workshop Survey (default)</span>
              <span className="font-mono text-xs truncate max-w-xs">{edition.surveyUrlPostWorkshopDefault || "Not configured"}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Configure URLs in Platform Settings → Edition Settings
          </p>
        </CardContent>
      </Card>

      <SurveyTriggerManager triggers={triggers} />
    </div>
  )
}
