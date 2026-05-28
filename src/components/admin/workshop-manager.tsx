"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { WORKSHOP_TYPE_LABELS, formatDate } from "@/lib/utils"
import { Plus, CheckCircle2, Users, Loader2 } from "lucide-react"

interface Workshop {
  id: string
  type: string
  sessionDate: Date
  status: string
  description: string | null
  surveyUrlOverride: string | null
  surveyTriggers: { id: string; status: string }[]
  attendees: { id: string; user: { name: string; companyName: string | null } }[]
}

interface WorkshopManagerProps {
  workshops: Workshop[]
  editionId: string
}

export function WorkshopManager({ workshops, editionId }: WorkshopManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [newWorkshop, setNewWorkshop] = useState({
    type: "",
    sessionDate: "",
    description: "",
  })
  const [createOpen, setCreateOpen] = useState(false)

  async function handleCreate() {
    if (!newWorkshop.type || !newWorkshop.sessionDate) return
    setIsCreating(true)
    try {
      const res = await fetch("/api/workshops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newWorkshop, editionId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
        return
      }
      toast({ title: "Workshop created" })
      setCreateOpen(false)
      router.refresh()
    } finally {
      setIsCreating(false)
    }
  }

  async function markCompleted(workshopId: string) {
    setIsLoading(workshopId)
    try {
      const res = await fetch(`/api/workshops/${workshopId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
        return
      }
      toast({ title: "Workshop marked as completed. Survey trigger TRG-003 has been fired." })
      router.refresh()
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="ibl">
              <Plus className="h-4 w-4 mr-2" />
              Add Workshop Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Workshop Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Workshop Type</Label>
                <Select value={newWorkshop.type} onValueChange={(v) => setNewWorkshop((p) => ({ ...p, type: v }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WORKSHOP_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Session Date</Label>
                <Input
                  type="datetime-local"
                  className="mt-1"
                  value={newWorkshop.sessionDate}
                  onChange={(e) => setNewWorkshop((p) => ({ ...p, sessionDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Input
                  className="mt-1"
                  placeholder="Workshop details..."
                  value={newWorkshop.description}
                  onChange={(e) => setNewWorkshop((p) => ({ ...p, description: e.target.value }))}
                />
              </div>
              <Button variant="ibl" className="w-full" onClick={handleCreate} disabled={isCreating}>
                {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Workshop
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {workshops.length === 0 ? (
        <Card>
          <CardContent className="pt-8 pb-8 text-center text-muted-foreground">
            No workshops scheduled yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workshops.map((workshop) => (
            <Card key={workshop.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold">
                        {WORKSHOP_TYPE_LABELS[workshop.type as keyof typeof WORKSHOP_TYPE_LABELS] || workshop.type}
                      </p>
                      <Badge
                        variant={
                          workshop.status === "COMPLETED"
                            ? "success"
                            : workshop.status === "CANCELLED"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {workshop.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatDate(workshop.sessionDate)}</p>
                    {workshop.description && (
                      <p className="text-sm text-muted-foreground mt-1">{workshop.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {workshop.attendees.length} attendee(s)
                      {workshop.surveyTriggers.length > 0 && (
                        <span className="ml-2">
                          · Survey trigger: <Badge variant="info" className="text-xs">{workshop.surveyTriggers[0].status}</Badge>
                        </span>
                      )}
                    </div>
                  </div>
                  {workshop.status === "SCHEDULED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markCompleted(workshop.id)}
                      disabled={isLoading === workshop.id}
                    >
                      {isLoading === workshop.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      )}
                      Mark Completed
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
