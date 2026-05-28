"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ROUND_LABELS } from "@/lib/utils"
import {
  Trophy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Lock,
  ArrowRight,
} from "lucide-react"

type CompetitionRound = "QF" | "SF" | "FINAL"

interface JuryScoredEntry {
  juryId: string
  juryName: string
  hasScored: boolean
  isConflict: boolean
}

interface QuorumEntry {
  ideaId: string
  codeName: string
  allJuryDone: boolean
  juryScored: JuryScoredEntry[]
}

interface RoundData {
  round: CompetitionRound
  editionId: string
  ideasCount: number
  quorumMet: boolean
  quorumStatus: QuorumEntry[]
}

interface RoundsResponse {
  edition: {
    id: string
    name: string
    year: number
  }
  rounds: RoundData[]
}

export default function AdminRoundsPage() {
  const [data, setData] = useState<RoundsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [expandedRound, setExpandedRound] = useState<CompetitionRound | null>(null)

  async function fetchRounds() {
    setLoading(true)
    const res = await fetch("/api/admin/rounds")
    if (res.ok) {
      const json = await res.json()
      setData(json)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRounds()
  }, [])

  async function performAction(action: string, round: CompetitionRound, extra?: Record<string, unknown>) {
    if (!data) return
    setSubmitting(`${action}-${round}`)
    setMessage(null)
    const res = await fetch("/api/admin/rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, round, editionId: data.edition.id, ...extra }),
    })
    const json = await res.json()
    if (res.ok) {
      setMessage({ text: json.message ?? "Action completed successfully.", type: "success" })
      await fetchRounds()
    } else {
      setMessage({ text: json.message ?? json.error ?? "Action failed.", type: "error" })
    }
    setSubmitting(null)
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No active edition found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Round Management</h1>
        <p className="text-muted-foreground">{data.edition.name}</p>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-lg border ${
            message.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0" />
          )}
          <p className="text-sm">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto text-sm opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-4">
        {data.rounds.map((roundData) => {
          const label = ROUND_LABELS[roundData.round]
          const isExpanded = expandedRound === roundData.round
          const scoredCount = roundData.quorumStatus.filter((s) => s.allJuryDone).length
          const totalIdeas = roundData.quorumStatus.length

          return (
            <Card key={roundData.round}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-ibl-blue/10 rounded-md">
                      <Trophy className="h-5 w-5 text-ibl-blue" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{label}</CardTitle>
                      <CardDescription>
                        {roundData.ideasCount} idea{roundData.ideasCount !== 1 ? "s" : ""} in this round
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {roundData.quorumMet ? (
                      <Badge variant="success">Quorum Met</Badge>
                    ) : (
                      <Badge variant="warning">
                        {scoredCount}/{totalIdeas} ideas fully scored
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!submitting}
                    onClick={() => performAction("open_round", roundData.round)}
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    Open Round
                    {submitting === `open_round-${roundData.round}` && "..."}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!submitting || !roundData.quorumMet}
                    title={!roundData.quorumMet ? "Quorum not met — all jury must score or abstain first" : undefined}
                    onClick={() => performAction("close_round", roundData.round)}
                  >
                    <Lock className="h-3.5 w-3.5 mr-1.5" />
                    Close Round
                    {submitting === `close_round-${roundData.round}` && "..."}
                  </Button>
                  <Button
                    size="sm"
                    variant="ibl"
                    disabled={!!submitting || !roundData.quorumMet}
                    title={!roundData.quorumMet ? "Quorum not met" : undefined}
                    onClick={() => performAction("trigger_progression", roundData.round)}
                  >
                    <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                    Trigger Progression
                    {submitting === `trigger_progression-${roundData.round}` && "..."}
                  </Button>
                </div>

                {!roundData.quorumMet && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    Quorum rule: round cannot close until all jury members have scored or marked conflict for every idea in this round.
                  </p>
                )}

                {totalIdeas > 0 && (
                  <div>
                    <button
                      className="text-sm font-medium text-ibl-blue hover:underline flex items-center gap-1"
                      onClick={() => setExpandedRound(isExpanded ? null : roundData.round)}
                    >
                      {isExpanded ? "Hide" : "Show"} jury scoring status ({totalIdeas} ideas)
                    </button>

                    {isExpanded && (
                      <div className="mt-3 space-y-2">
                        {roundData.quorumStatus.map((entry) => (
                          <div key={entry.ideaId} className="p-3 bg-gray-50 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{entry.codeName}</span>
                              {entry.allJuryDone ? (
                                <Badge variant="success" className="text-xs">All scored</Badge>
                              ) : (
                                <Badge variant="warning" className="text-xs">Incomplete</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {entry.juryScored.map((j) => (
                                <div key={j.juryId} className="flex items-center gap-1 text-xs">
                                  {j.isConflict ? (
                                    <XCircle className="h-3 w-3 text-amber-500" />
                                  ) : j.hasScored ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <XCircle className="h-3 w-3 text-red-400" />
                                  )}
                                  <span className={j.isConflict ? "text-amber-600" : j.hasScored ? "text-green-700" : "text-red-600"}>
                                    {j.juryName}
                                    {j.isConflict && " (conflict)"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Tie-Break Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>When two ideas are tied on average score, +5% is applied to Criterion 2 (Impact on Business Model) raw score.</li>
            <li>If still tied after the bonus, a jury re-vote is triggered.</li>
            <li>Use the &quot;Apply Tie-Break&quot; action from the Leaderboard page for specific tied ideas.</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
