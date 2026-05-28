import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/utils"
import { Download, Filter } from "lucide-react"
import { ShowcaseExport } from "@/components/admin/showcase-export"

export default async function ShowcasePage() {
  const ideas = await prisma.idea.findMany({
    where: { internalShowcaseApproved: true },
    select: {
      id: true,
      codeName: true,
      description1Line: true,
      category: true,
      status: true,
    },
    orderBy: [{ category: "asc" }, { codeName: "asc" }],
  })

  const byCategory = {
    CX: ideas.filter((i) => i.category === "CX"),
    BI: ideas.filter((i) => i.category === "BI"),
    OE: ideas.filter((i) => i.category === "OE"),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Internal Idea Showcase</h1>
          <p className="text-muted-foreground">
            Approved ideas for the 2026 Excellence & Innovation Award ({ideas.length} ideas)
          </p>
          <p className="text-xs text-orange-600 mt-1">
            For internal use by Communications Department only. Names and contact details are not shown.
          </p>
        </div>
        <ShowcaseExport ideas={ideas} />
      </div>

      {(["CX", "BI", "OE"] as const).map((cat) => (
        <div key={cat}>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Badge variant="info">{CATEGORY_LABELS[cat]}</Badge>
            <span className="text-sm font-normal text-muted-foreground">
              ({byCategory[cat].length} ideas)
            </span>
          </h2>
          {byCategory[cat].length === 0 ? (
            <p className="text-sm text-muted-foreground pl-2">No approved ideas in this category.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {byCategory[cat].map((idea) => (
                <Card key={idea.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{idea.codeName}</p>
                        <p className="text-sm text-muted-foreground mt-1">{idea.description1Line}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0 text-xs">
                        {STATUS_LABELS[idea.status] || idea.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      ))}

      {ideas.length === 0 && (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
            No ideas have been approved for the showcase yet.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
