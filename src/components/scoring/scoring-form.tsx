"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { cn, CATEGORY_LABELS, ROUND_LABELS } from "@/lib/utils"
import { SCORING_CRITERIA, CRITERIA_WEIGHTS } from "@/lib/scoring"
import { Loader2, ChevronDown, ChevronUp } from "lucide-react"

interface ScoringFormProps {
  idea: {
    id: string
    codeName: string
    category: string
    description1Line: string
    reports: { id: string; fileUrl: string | null; round: string; language: string }[]
  }
  criteria: {
    id: string
    number: number
    name: string
    description: string
    anchor0: string
    anchor1: string
    anchor2: string
    anchor3: string
    anchor4: string
    anchor5: string
    isTiebreakerBonus: boolean
    weightPctCX: number
    weightPctBI: number
    weightPctOE: number
  }[]
  round: "QF" | "SF" | "FINAL"
  juryMemberId: string
  existingScore: {
    id: string
    items: { criterionId: string; rawScore: number | null; note: string | null }[]
  } | null
}

export function ScoringForm({ idea, criteria, round, juryMemberId, existingScore }: ScoringFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedCriteria, setExpandedCriteria] = useState<Set<number>>(new Set())

  const initialScores: Record<string, number | null> = {}
  const initialNotes: Record<string, string> = {}

  if (existingScore) {
    for (const item of existingScore.items) {
      initialScores[item.criterionId] = item.rawScore
      initialNotes[item.criterionId] = item.note || ""
    }
  }

  const [scores, setScores] = useState<Record<string, number | null>>(initialScores)
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes)

  const category = idea.category as "CX" | "BI" | "OE"

  function getWeight(criterionNumber: number): number {
    const w = CRITERIA_WEIGHTS[String(criterionNumber)]
    return w ? w[category] : 0
  }

  function calculateRunningTotal(): number {
    let total = 0
    for (const c of criteria) {
      if (c.isTiebreakerBonus) continue
      const score = scores[c.id]
      const weight = getWeight(c.number)
      if (score !== null && score !== undefined && weight > 0) {
        total += (score / 5) * weight
      }
    }
    return Math.round(total * 100) / 100
  }

  function getAnchors(c: (typeof criteria)[0]) {
    return [c.anchor0, c.anchor1, c.anchor2, c.anchor3, c.anchor4, c.anchor5]
  }

  function toggleExpand(num: number) {
    setExpandedCriteria((prev) => {
      const next = new Set(prev)
      next.has(num) ? next.delete(num) : next.add(num)
      return next
    })
  }

  async function handleSubmit() {
    const scored = criteria.filter((c) => !c.isTiebreakerBonus)
    const unscored = scored.filter((c) => scores[c.id] === null || scores[c.id] === undefined)
    if (unscored.length > 0) {
      toast({ title: "Incomplete scorecard", description: "Please score all criteria before submitting.", variant: "destructive" })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: idea.id,
          round,
          scoreId: existingScore?.id,
          items: criteria.map((c) => ({
            criterionId: c.id,
            rawScore: scores[c.id] ?? null,
            note: notes[c.id] || null,
          })),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
        return
      }

      toast({ title: "Scorecard submitted!", variant: "default" })
      router.push("/jury/scoring")
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSaveDraft() {
    setIsSubmitting(true)
    try {
      await fetch("/api/scores/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ideaId: idea.id,
          round,
          scoreId: existingScore?.id,
          items: criteria.map((c) => ({
            criterionId: c.id,
            rawScore: scores[c.id] ?? null,
            note: notes[c.id] || null,
          })),
        }),
      })
      toast({ title: "Draft saved", variant: "default" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const runningTotal = calculateRunningTotal()

  return (
    <div className="space-y-4">
      <Card className="bg-ibl-light border-ibl-blue/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="info">{CATEGORY_LABELS[category]}</Badge>
              <Badge variant="secondary">{ROUND_LABELS[round]}</Badge>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Running Total</p>
              <p className="text-2xl font-bold text-ibl-blue">{runningTotal.toFixed(1)}%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {criteria.map((criterion) => {
        const weight = getWeight(criterion.number)
        const anchors = getAnchors(criterion)
        const currentScore = scores[criterion.id]
        const isExpanded = expandedCriteria.has(criterion.number)

        return (
          <Card key={criterion.id} className={cn(currentScore !== null && currentScore !== undefined ? "border-green-300" : "")}>
            <CardHeader className="pb-2 cursor-pointer" onClick={() => toggleExpand(criterion.number)}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">#{criterion.number}</span>
                    <CardTitle className="text-base">{criterion.name}</CardTitle>
                    {criterion.isTiebreakerBonus && (
                      <Badge variant="warning" className="text-xs">Tie-break</Badge>
                    )}
                  </div>
                  {weight > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Weight: {weight}%</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {currentScore !== null && currentScore !== undefined && (
                    <Badge variant="success" className="text-sm px-3">{currentScore}/5</Badge>
                  )}
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {isExpanded && (
                <div className="mb-4 rounded-md bg-gray-50 border p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Scoring Anchors:</p>
                  <div className="grid grid-cols-1 gap-1">
                    {anchors.map((anchor, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex gap-2 text-xs p-2 rounded",
                          currentScore === i ? "bg-ibl-blue text-white" : "text-gray-700"
                        )}
                      >
                        <span className="font-bold shrink-0 w-4">{i}</span>
                        <span>{anchor}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium mr-2">Score:</span>
                {[0, 1, 2, 3, 4, 5].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setScores((prev) => ({ ...prev, [criterion.id]: val }))
                      if (!isExpanded) toggleExpand(criterion.number)
                    }}
                    className={cn(
                      "w-10 h-10 rounded-md border text-sm font-semibold transition-all",
                      currentScore === val
                        ? "bg-ibl-blue text-white border-ibl-blue shadow-md scale-110"
                        : "bg-white hover:bg-gray-100 border-gray-200"
                    )}
                    title={anchors[val]}
                  >
                    {val}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <Textarea
                  placeholder="Optional notes (internal use only, not shared with participants)"
                  className="text-sm min-h-[60px]"
                  value={notes[criterion.id] || ""}
                  onChange={(e) => setNotes((prev) => ({ ...prev, [criterion.id]: e.target.value }))}
                />
              </div>
            </CardContent>
          </Card>
        )
      })}

      <div className="flex items-center justify-between pt-4 border-t">
        <div>
          <p className="text-sm text-muted-foreground">
            Weighted Total: <strong>{runningTotal.toFixed(1)}%</strong>
          </p>
          <p className="text-xs text-muted-foreground">
            Submission is final. Request Admin unlock to revise before round closes.
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleSaveDraft} disabled={isSubmitting}>
            Save Draft
          </Button>
          <Button variant="ibl" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Scorecard
          </Button>
        </div>
      </div>
    </div>
  )
}
