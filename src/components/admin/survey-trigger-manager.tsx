"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { formatDateTime } from "@/lib/utils"
import { Loader2, ExternalLink, CheckCircle2, XCircle } from "lucide-react"

interface Trigger {
  id: string
  triggerType: string
  targetAudienceDescription: string
  status: string
  firedAt: Date
  launchedAt: Date | null
  closedAt: Date | null
  surveyUrl: string | null
  escalationSent: boolean
  workshop: { type: string; sessionDate: Date } | null
}

interface SurveyTriggerManagerProps {
  triggers: Trigger[]
}

export function SurveyTriggerManager({ triggers }: SurveyTriggerManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editingUrl, setEditingUrl] = useState<string | null>(null)
  const [urlValues, setUrlValues] = useState<Record<string, string>>({})

  async function updateStatus(id: string, status: "LAUNCHED" | "CLOSED") {
    setLoadingId(id)
    try {
      const res = await fetch("/api/survey-triggers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
        return
      }
      toast({ title: `Task marked as ${status}` })
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  async function saveUrl(id: string) {
    const surveyUrl = urlValues[id]
    setLoadingId(id)
    try {
      await fetch("/api/survey-triggers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, surveyUrl }),
      })
      toast({ title: "Survey URL saved" })
      setEditingUrl(null)
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  const triggerLabels: Record<string, string> = {
    TRG_001: "Post-Award — Jury Survey",
    TRG_002: "Post-Award — Participant Survey",
    TRG_003: "Post-Workshop — Participant Survey",
  }

  if (triggers.length === 0) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
          No survey triggers fired yet. Triggers will appear here when the Final round is closed or a workshop is completed.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {triggers.map((trigger) => (
        <Card key={trigger.id} className={trigger.status === "PENDING" ? "border-orange-300" : ""}>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{triggerLabels[trigger.triggerType] || trigger.triggerType}</span>
                    <Badge
                      variant={
                        trigger.status === "CLOSED"
                          ? "success"
                          : trigger.status === "LAUNCHED"
                          ? "info"
                          : "warning"
                      }
                    >
                      {trigger.status}
                    </Badge>
                    {trigger.escalationSent && (
                      <Badge variant="destructive" className="text-xs">Escalated</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Audience: {trigger.targetAudienceDescription}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Fired: {formatDateTime(trigger.firedAt)}</p>
                  {trigger.launchedAt && (
                    <p className="text-xs text-muted-foreground">Launched: {formatDateTime(trigger.launchedAt)}</p>
                  )}
                  {trigger.workshop && (
                    <p className="text-xs text-muted-foreground">
                      Workshop: {trigger.workshop.type} ({new Date(trigger.workshop.sessionDate).toDateString()})
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  {trigger.status === "PENDING" && (
                    <Button
                      variant="ibl"
                      size="sm"
                      onClick={() => updateStatus(trigger.id, "LAUNCHED")}
                      disabled={loadingId === trigger.id}
                    >
                      {loadingId === trigger.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                      Mark Launched
                    </Button>
                  )}
                  {trigger.status === "LAUNCHED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateStatus(trigger.id, "CLOSED")}
                      disabled={loadingId === trigger.id}
                    >
                      {loadingId === trigger.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3 mr-1" />}
                      Close Survey
                    </Button>
                  )}
                </div>
              </div>

              {editingUrl === trigger.id ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="https://www.surveymonkey.com/r/..."
                    value={urlValues[trigger.id] || ""}
                    onChange={(e) => setUrlValues((p) => ({ ...p, [trigger.id]: e.target.value }))}
                    className="text-xs h-8"
                  />
                  <Button size="sm" onClick={() => saveUrl(trigger.id)} disabled={loadingId === trigger.id}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingUrl(null)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {trigger.surveyUrl ? (
                    <a
                      href={trigger.surveyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open SurveyMonkey
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">No URL configured</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      setEditingUrl(trigger.id)
                      setUrlValues((p) => ({ ...p, [trigger.id]: trigger.surveyUrl || "" }))
                    }}
                  >
                    Edit URL
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
