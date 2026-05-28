"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface Criterion {
  id: string
  number: number
  name: string
  weightPctCX: number
  weightPctBI: number
  weightPctOE: number
  isTiebreakerBonus: boolean
}

interface Edition {
  id: string
  name: string
  launchDate: Date | string
  regDeadline: Date | string
  briefSessionStart: Date | string
  briefSessionEnd?: Date | string
  qfStart: Date | string
  sfStart: Date | string
  finalDate: Date | string
  surveyUrlPostJury: string | null
  surveyUrlPostParticipant: string | null
  surveyUrlPostWorkshopDefault: string | null
}

interface SettingsFormProps {
  edition: Edition | null
  criteria: Criterion[]
}

function toDatetimeLocal(d: Date | string | null | undefined): string {
  if (!d) return ""
  const date = new Date(d)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function SettingsForm({ edition, criteria }: SettingsFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const [surveyUrls, setSurveyUrls] = useState({
    postJury: edition?.surveyUrlPostJury || "",
    postParticipant: edition?.surveyUrlPostParticipant || "",
    postWorkshopDefault: edition?.surveyUrlPostWorkshopDefault || "",
  })

  const [dates, setDates] = useState({
    name: edition?.name ?? "",
    launchDate: toDatetimeLocal(edition?.launchDate),
    regDeadline: toDatetimeLocal(edition?.regDeadline),
    briefSessionStart: toDatetimeLocal(edition?.briefSessionStart),
    briefSessionEnd: toDatetimeLocal(edition?.briefSessionEnd),
    qfStart: toDatetimeLocal(edition?.qfStart),
    sfStart: toDatetimeLocal(edition?.sfStart),
    finalDate: toDatetimeLocal(edition?.finalDate),
  })

  const [weights, setWeights] = useState<Record<string, { CX: number; BI: number; OE: number }>>(
    criteria.reduce(
      (acc, c) => ({
        ...acc,
        [c.id]: { CX: c.weightPctCX, BI: c.weightPctBI, OE: c.weightPctOE },
      }),
      {}
    )
  )

  async function saveDates() {
    if (!edition) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editionId: edition.id,
          editionUpdates: {
            name: dates.name,
            launchDate: dates.launchDate ? new Date(dates.launchDate).toISOString() : undefined,
            regDeadline: dates.regDeadline ? new Date(dates.regDeadline).toISOString() : undefined,
            briefSessionStart: dates.briefSessionStart ? new Date(dates.briefSessionStart).toISOString() : undefined,
            briefSessionEnd: dates.briefSessionEnd ? new Date(dates.briefSessionEnd).toISOString() : undefined,
            qfStart: dates.qfStart ? new Date(dates.qfStart).toISOString() : undefined,
            sfStart: dates.sfStart ? new Date(dates.sfStart).toISOString() : undefined,
            finalDate: dates.finalDate ? new Date(dates.finalDate).toISOString() : undefined,
          },
        }),
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Edition dates saved" })
      router.refresh()
    } catch {
      toast({ title: "Error saving dates", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  async function saveSurveyUrls() {
    if (!edition) return
    setIsLoading(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editionId: edition.id,
          editionUpdates: {
            surveyUrlPostJury: surveyUrls.postJury || null,
            surveyUrlPostParticipant: surveyUrls.postParticipant || null,
            surveyUrlPostWorkshopDefault: surveyUrls.postWorkshopDefault || null,
          },
        }),
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Survey URLs saved" })
      router.refresh()
    } catch {
      toast({ title: "Error saving URLs", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  async function saveWeights() {
    if (!edition) return
    setIsLoading(true)
    try {
      const criterionUpdates = Object.entries(weights).map(([id, w]) => ({
        id,
        weightPctCX: w.CX,
        weightPctBI: w.BI,
        weightPctOE: w.OE,
      }))
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editionId: edition.id, criterionUpdates }),
      })
      if (!res.ok) throw new Error("Failed")
      toast({ title: "Scoring weights saved" })
      router.refresh()
    } catch {
      toast({ title: "Error saving weights", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  if (!edition) {
    return (
      <Card>
        <CardContent className="pt-8 text-center text-muted-foreground">
          No active edition found. Please create an edition first.
        </CardContent>
      </Card>
    )
  }

  return (
    <Tabs defaultValue="dates">
      <TabsList className="mb-4">
        <TabsTrigger value="dates">Edition Dates</TabsTrigger>
        <TabsTrigger value="surveys">Survey URLs</TabsTrigger>
        <TabsTrigger value="weights">Scoring Weights</TabsTrigger>
      </TabsList>

      <TabsContent value="dates">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Edition Dates — {edition.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Edition Name</Label>
                <Input
                  className="mt-1"
                  value={dates.name}
                  onChange={(e) => setDates((d) => ({ ...d, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Launch Date</Label>
                <Input type="datetime-local" className="mt-1" value={dates.launchDate} onChange={(e) => setDates((d) => ({ ...d, launchDate: e.target.value }))} />
              </div>
              <div>
                <Label>Registration Deadline</Label>
                <Input type="datetime-local" className="mt-1" value={dates.regDeadline} onChange={(e) => setDates((d) => ({ ...d, regDeadline: e.target.value }))} />
              </div>
              <div>
                <Label>Brief Session Start</Label>
                <Input type="datetime-local" className="mt-1" value={dates.briefSessionStart} onChange={(e) => setDates((d) => ({ ...d, briefSessionStart: e.target.value }))} />
              </div>
              <div>
                <Label>Brief Session End</Label>
                <Input type="datetime-local" className="mt-1" value={dates.briefSessionEnd} onChange={(e) => setDates((d) => ({ ...d, briefSessionEnd: e.target.value }))} />
              </div>
              <div>
                <Label>Quarter-Finals Start</Label>
                <Input type="datetime-local" className="mt-1" value={dates.qfStart} onChange={(e) => setDates((d) => ({ ...d, qfStart: e.target.value }))} />
              </div>
              <div>
                <Label>Semi-Finals Start</Label>
                <Input type="datetime-local" className="mt-1" value={dates.sfStart} onChange={(e) => setDates((d) => ({ ...d, sfStart: e.target.value }))} />
              </div>
              <div>
                <Label>Final Date</Label>
                <Input type="datetime-local" className="mt-1" value={dates.finalDate} onChange={(e) => setDates((d) => ({ ...d, finalDate: e.target.value }))} />
              </div>
            </div>
            <Button variant="ibl" className="mt-4" onClick={saveDates} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Dates
            </Button>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="surveys">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SurveyMonkey URLs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>TRG-001 — Post-Award Jury Survey URL</Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  placeholder="https://www.surveymonkey.com/r/..."
                  value={surveyUrls.postJury}
                  onChange={(e) => setSurveyUrls((p) => ({ ...p, postJury: e.target.value }))}
                />
              </div>
              <div>
                <Label>TRG-002 — Post-Award Participant Survey URL</Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  placeholder="https://www.surveymonkey.com/r/..."
                  value={surveyUrls.postParticipant}
                  onChange={(e) => setSurveyUrls((p) => ({ ...p, postParticipant: e.target.value }))}
                />
              </div>
              <div>
                <Label>TRG-003 — Post-Workshop Survey URL (default)</Label>
                <Input
                  className="mt-1 font-mono text-sm"
                  placeholder="https://www.surveymonkey.com/r/..."
                  value={surveyUrls.postWorkshopDefault}
                  onChange={(e) => setSurveyUrls((p) => ({ ...p, postWorkshopDefault: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This URL is used for all workshops unless a session-specific URL is configured.
                </p>
              </div>
              <Button variant="ibl" onClick={saveSurveyUrls} disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Survey URLs
              </Button>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="weights">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scoring Criteria Weights (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 pr-4">Criterion</th>
                    <th className="w-20 text-center">CX</th>
                    <th className="w-20 text-center">BI</th>
                    <th className="w-20 text-center">OE</th>
                  </tr>
                </thead>
                <tbody>
                  {criteria.map((c) => (
                    <tr key={c.id} className="border-b">
                      <td className="py-2 pr-4">
                        <div className="font-medium">#{c.number} {c.name}</div>
                        {c.isTiebreakerBonus && (
                          <span className="text-xs text-orange-600">Tie-break bonus</span>
                        )}
                      </td>
                      {(["CX", "BI", "OE"] as const).map((cat) => (
                        <td key={cat} className="py-2 px-2">
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            step={0.5}
                            className="w-16 text-center h-8 text-sm"
                            disabled={c.isTiebreakerBonus}
                            value={weights[c.id]?.[cat] ?? 0}
                            onChange={(e) =>
                              setWeights((prev) => ({
                                ...prev,
                                [c.id]: {
                                  ...prev[c.id],
                                  [cat]: parseFloat(e.target.value) || 0,
                                },
                              }))
                            }
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Weights must sum to 100% per category (excluding tie-break bonus criterion).
            </p>
            <Button variant="ibl" className="mt-4" onClick={saveWeights} disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Weights
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
