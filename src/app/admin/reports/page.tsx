import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ROUND_LABELS, CATEGORY_LABELS, formatDateTime } from "@/lib/utils"
import { FileText, Download, ExternalLink } from "lucide-react"

export default async function ReportsPage() {
  const edition = await prisma.edition.findFirst({ where: { status: "ACTIVE" } })
  if (!edition) return <div>No active edition</div>

  const reports = await prisma.report.findMany({
    where: { editionId: edition.id },
    include: {
      idea: { select: { codeName: true, category: true } },
      submittedBy: { select: { name: true } },
    },
    orderBy: { submittedAt: "desc" },
  })

  const byRound = {
    QF: reports.filter((r) => r.round === "QF"),
    SF: reports.filter((r) => r.round === "SF"),
    FINAL: reports.filter((r) => r.round === "FINAL"),
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Report Access</h1>
        <p className="text-muted-foreground">View and download all submitted reports</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(["QF", "SF", "FINAL"] as const).map((round) => (
          <Card key={round}>
            <CardContent className="pt-4">
              <p className="text-2xl font-bold">{byRound[round].length}</p>
              <p className="text-sm text-muted-foreground">{ROUND_LABELS[round]} Reports</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {(["QF", "SF", "FINAL"] as const).map((round) => (
        <div key={round}>
          <h2 className="text-base font-semibold mb-3">{ROUND_LABELS[round]}</h2>
          {byRound[round].length === 0 ? (
            <p className="text-sm text-muted-foreground pl-2">No reports submitted yet.</p>
          ) : (
            <div className="grid gap-2">
              {byRound[round].map((report) => (
                <Card key={report.id}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{report.idea.codeName}</p>
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[report.idea.category as keyof typeof CATEGORY_LABELS]}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{report.language}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Submitted by {report.submittedBy.name} · {formatDateTime(report.submittedAt)}
                          {report.fileSizeMb && ` · ${report.fileSizeMb.toFixed(1)} MB`}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {report.fileUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={report.fileUrl} target="_blank" rel="noreferrer">
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </a>
                          </Button>
                        )}
                        {report.wetransferLink && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={report.wetransferLink} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" />
                              WeTransfer
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
