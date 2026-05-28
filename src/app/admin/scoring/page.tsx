"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { CATEGORY_LABELS, ROUND_LABELS } from "@/lib/utils"
import { BarChart3, AlertTriangle, Download, Trophy } from "lucide-react"

type IdeaCategory = "CX" | "BI" | "OE"
type CompetitionRound = "QF" | "SF" | "FINAL"

interface ScoreEntry {
  juryMemberId: string
  weightedTotal: number | null
  finalScore: number | null
  submittedAt: string | null
  conflictDeclared: boolean
  tiebreakerBonusApplied: boolean
  items: { criterionNumber: number; rawScore: number | null }[]
}

interface IdeaLeaderboardEntry {
  ideaId: string
  codeName: string
  category: IdeaCategory
  status: string
  avgScore: number
  scores: ScoreEntry[]
  stdDev: number
  juryCount: number
  tiebreakerApplied: boolean
  isTied: boolean
}

interface ScoringData {
  round: CompetitionRound
  byCategory: Record<IdeaCategory, IdeaLeaderboardEntry[]>
  varianceAlerts: IdeaLeaderboardEntry[]
}

export default function AdminScoringPage() {
  const [data, setData] = useState<(ScoringData & { editionId?: string }) | null>(null)
  const [loading, setLoading] = useState(true)
  const [round, setRound] = useState<CompetitionRound>("QF")
  const [tiebreakSubmitting, setTiebreakSubmitting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  async function fetchScoring() {
    setLoading(true)
    const res = await fetch(`/api/admin/scoring?round=${round}`)
    if (res.ok) {
      const json = await res.json()
      setData(json)
    }
    setLoading(false)
  }

  useEffect(() => {
    void fetchScoring()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round])

  async function applyTiebreak(ideaId: string, editionId: string) {
    setTiebreakSubmitting(ideaId)
    setMessage(null)
    const res = await fetch("/api/admin/rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "apply_tiebreak", round, editionId, ideaId }),
    })
    const json = await res.json()
    if (res.ok) {
      setMessage({ text: "Tie-break bonus applied.", type: "success" })
      fetchScoring()
    } else {
      setMessage({ text: json.error ?? "Failed to apply tie-break.", type: "error" })
    }
    setTiebreakSubmitting(null)
  }

  function exportCsv(category: IdeaCategory) {
    if (!data) return
    const ideas = data.byCategory[category] ?? []
    const rows = [
      ["Rank", "Code Name", "Category", "Status", "Avg Score", "Std Dev", "Jury Count", "Tiebreaker Applied"],
      ...ideas.map((idea, idx) => [
        String(idx + 1),
        idea.codeName,
        category,
        idea.status,
        idea.avgScore.toFixed(2),
        idea.stdDev.toFixed(2),
        String(idea.juryCount),
        idea.tiebreakerApplied ? "Yes" : "No",
      ]),
    ]
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `leaderboard-${round}-${category}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scoring Leaderboard</h1>
          <p className="text-muted-foreground">Per-category rankings with variance alerts</p>
        </div>
        <Select value={round} onValueChange={(v) => setRound(v as CompetitionRound)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="QF">Quarter-Finals</SelectItem>
            <SelectItem value="SF">Semi-Finals</SelectItem>
            <SelectItem value="FINAL">Final</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <p className="text-sm">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto text-sm opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
      ) : !data ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No scoring data available.</p>
      ) : (
        <>
          {data.varianceAlerts.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  Variance Alerts — Std Dev &gt; 1.5 ({data.varianceAlerts.length} idea{data.varianceAlerts.length !== 1 ? "s" : ""})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {data.varianceAlerts.map((idea) => (
                    <Badge key={idea.ideaId} variant="warning">
                      {idea.codeName} (σ={idea.stdDev.toFixed(2)})
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-amber-700 mt-2">
                  These ideas have significant score disagreement among jury members. Consider a moderation session.
                </p>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="CX">
            <TabsList>
              <TabsTrigger value="CX">Customer Experience</TabsTrigger>
              <TabsTrigger value="BI">Business Innovation</TabsTrigger>
              <TabsTrigger value="OE">Operational Excellence</TabsTrigger>
            </TabsList>

            {(["CX", "BI", "OE"] as IdeaCategory[]).map((cat) => (
              <TabsContent key={cat} value={cat}>
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        {CATEGORY_LABELS[cat]} — {ROUND_LABELS[round]}
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => exportCsv(cat)}
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" />
                        Export CSV
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {(data.byCategory[cat] ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No scored ideas in this category for this round.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="text-left py-2 pr-4 font-medium">Rank</th>
                              <th className="text-left py-2 pr-4 font-medium">Code Name</th>
                              <th className="text-left py-2 pr-4 font-medium">Avg Score</th>
                              <th className="text-left py-2 pr-4 font-medium">Std Dev</th>
                              <th className="text-left py-2 pr-4 font-medium">Jury</th>
                              <th className="text-left py-2 pr-4 font-medium">Flags</th>
                              <th className="text-left py-2 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(data.byCategory[cat] ?? []).map((idea, idx) => (
                              <tr
                                key={idea.ideaId}
                                className={`border-b last:border-0 ${
                                  idea.isTied ? "bg-yellow-50" : "hover:bg-gray-50"
                                }`}
                              >
                                <td className="py-2.5 pr-4">
                                  <div className="flex items-center gap-1.5">
                                    {idx === 0 && <Trophy className="h-3.5 w-3.5 text-ibl-gold" />}
                                    <span className={idx === 0 ? "font-bold" : ""}>{idx + 1}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 pr-4 font-semibold">{idea.codeName}</td>
                                <td className="py-2.5 pr-4">
                                  <span className="font-mono font-bold">{idea.avgScore.toFixed(2)}</span>
                                </td>
                                <td className="py-2.5 pr-4">
                                  <span className={`font-mono ${idea.stdDev > 1.5 ? "text-amber-600 font-bold" : ""}`}>
                                    {idea.stdDev.toFixed(2)}
                                  </span>
                                </td>
                                <td className="py-2.5 pr-4 text-muted-foreground">{idea.juryCount}</td>
                                <td className="py-2.5 pr-4">
                                  <div className="flex gap-1 flex-wrap">
                                    {idea.isTied && (
                                      <Badge variant="warning" className="text-xs">Tied</Badge>
                                    )}
                                    {idea.stdDev > 1.5 && (
                                      <Badge variant="warning" className="text-xs">High Variance</Badge>
                                    )}
                                    {idea.tiebreakerApplied && (
                                      <Badge variant="info" className="text-xs">TB Applied</Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2.5">
                                  {idea.isTied && !idea.tiebreakerApplied && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs"
                                      disabled={!!tiebreakSubmitting}
                                      onClick={() => applyTiebreak(idea.ideaId, data?.editionId ?? "")}
                                    >
                                      Apply Tie-Break
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </>
      )}
    </div>
  )
}
