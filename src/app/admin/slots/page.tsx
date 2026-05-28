"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { formatTime } from "@/lib/utils"
import { Calendar, Link2, Users } from "lucide-react"

interface SlotData {
  id: string
  date: string
  startTime: string
  durationMins: number
  isBooked: boolean
  bookedById: string | null
  teamsLink: string | null
  ideaId: string | null
  bookedBy: { id: string; name: string; email: string } | null
}

interface GroupedSlots {
  [date: string]: SlotData[]
}

export default function AdminSlotsPage() {
  const [slots, setSlots] = useState<SlotData[]>([])
  const [loading, setLoading] = useState(true)
  const [editSlot, setEditSlot] = useState<SlotData | null>(null)
  const [teamsLinkInput, setTeamsLinkInput] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function fetchSlots() {
    setLoading(true)
    const res = await fetch("/api/admin/slots")
    if (res.ok) {
      const data = await res.json()
      setSlots(Array.isArray(data) ? data : data.slots ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchSlots()
  }, [])

  async function handleUpdateSlot(e: React.FormEvent) {
    e.preventDefault()
    if (!editSlot) return
    setSubmitting(true)
    await fetch("/api/admin/slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editSlot.id, teamsLink: teamsLinkInput }),
    })
    setEditSlot(null)
    await fetchSlots()
    setSubmitting(false)
  }

  async function handleUnbook(slotId: string) {
    await fetch("/api/admin/slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: slotId, bookedById: null, isBooked: false, teamsLink: null }),
    })
    await fetchSlots()
  }

  const grouped: GroupedSlots = {}
  for (const slot of slots) {
    const date = new Date(slot.date).toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    if (!grouped[date]) grouped[date] = []
    grouped[date].push(slot)
  }

  const totalBooked = slots.filter((s) => s.isBooked).length
  const totalAvailable = slots.filter((s) => !s.isBooked).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Slot Bookings</h1>
        <p className="text-muted-foreground">Idea Brief Presentation sessions — 6–7 April 2026</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold">{slots.length}</p>
            <p className="text-sm text-muted-foreground">Total Slots</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-green-600">{totalBooked}</p>
            <p className="text-sm text-muted-foreground">Booked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-2xl font-bold text-blue-600">{totalAvailable}</p>
            <p className="text-sm text-muted-foreground">Available</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
      ) : slots.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No slots found for the active edition.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped).map(([date, daySlots]) => (
          <Card key={date}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {date}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {daySlots
                  .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                  .map((slot) => (
                    <SlotCell
                      key={slot.id}
                      slot={slot}
                      onEdit={(s) => {
                        setEditSlot(s)
                        setTeamsLinkInput(s.teamsLink ?? "")
                      }}
                      onUnbook={handleUnbook}
                    />
                  ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={!!editSlot} onOpenChange={(o) => { if (!o) setEditSlot(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Slot</DialogTitle>
            <DialogDescription>
              {editSlot && formatTime(editSlot.startTime)} — {editSlot?.durationMins} min
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateSlot} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="teams-link">MS Teams Link</Label>
              <Input
                id="teams-link"
                type="url"
                placeholder="https://teams.microsoft.com/l/meetup-join/..."
                value={teamsLinkInput}
                onChange={(e) => setTeamsLinkInput(e.target.value)}
              />
            </div>
            {editSlot?.isBooked && editSlot.bookedBy && (
              <div className="p-3 bg-gray-50 rounded-md text-sm">
                <p className="font-medium text-gray-700 mb-1">Booked by</p>
                <p>{editSlot.bookedBy.name}</p>
                <p className="text-muted-foreground text-xs">{editSlot.bookedBy.email}</p>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditSlot(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="ibl" disabled={submitting}>
                {submitting ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SlotCell({
  slot,
  onEdit,
  onUnbook,
}: {
  slot: SlotData
  onEdit: (s: SlotData) => void
  onUnbook: (id: string) => void
}) {
  return (
    <div
      className={`relative p-2 rounded-md border text-xs cursor-pointer transition-colors ${
        slot.isBooked
          ? "bg-green-50 border-green-200 hover:bg-green-100"
          : "bg-gray-50 border-gray-200 hover:bg-gray-100"
      }`}
      onClick={() => onEdit(slot)}
    >
      <div className="font-semibold mb-0.5">{formatTime(slot.startTime)}</div>
      <div className="text-muted-foreground">{slot.durationMins}min</div>
      {slot.isBooked ? (
        <div className="mt-1 space-y-0.5">
          <Badge variant="success" className="text-xs px-1 py-0">Booked</Badge>
          {slot.bookedBy && (
            <p className="text-gray-600 text-xs truncate flex items-center gap-0.5">
              <Users className="h-2.5 w-2.5" />
              {slot.bookedBy.name}
            </p>
          )}
          {slot.teamsLink && (
            <p className="text-blue-600 flex items-center gap-0.5">
              <Link2 className="h-2.5 w-2.5" />
              Link set
            </p>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onUnbook(slot.id) }}
            className="text-red-500 hover:text-red-700 text-xs mt-0.5"
          >
            Unbook
          </button>
        </div>
      ) : (
        <Badge variant="secondary" className="text-xs px-1 py-0 mt-1">Available</Badge>
      )}
    </div>
  )
}
