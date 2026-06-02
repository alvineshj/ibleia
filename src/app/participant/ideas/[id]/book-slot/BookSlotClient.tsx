"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatTime } from "@/lib/utils"
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Loader2,
  Lock,
} from "lucide-react"

type Slot = {
  id: string
  date: string
  startTime: string
  durationMins: number
  isBooked: boolean
}

type SlotsByDate = Record<string, Slot[]>

const SLOT_DATE_LABELS: Record<string, string> = {
  "2026-04-06": "Sunday, 6 April 2026",
  "2026-04-07": "Monday, 7 April 2026",
}

function groupSlotsByDate(slots: Slot[]): SlotsByDate {
  return slots.reduce<SlotsByDate>((acc, slot) => {
    const key = slot.date.slice(0, 10)
    if (!acc[key]) acc[key] = []
    acc[key].push(slot)
    return acc
  }, {})
}

type Props = {
  ideaId: string
  ideaCodeName: string
  deadlinePassed: boolean
}

export default function BookSlotClient({ ideaId, ideaCodeName, deadlinePassed }: Props) {
  const router = useRouter()
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [selectedSlotId, setSelectedSlotId] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await fetch("/api/slots")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load slots")
      setSlots(data.slots)
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load slots")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSlots() }, [fetchSlots])

  async function handleBook() {
    if (!selectedSlotId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch(`/api/ideas/${ideaId}/slot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId: selectedSlotId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Booking failed")
      router.push(`/participant/ideas/${ideaId}?slotBooked=1`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Booking failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (deadlinePassed) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-8 pb-8 text-center">
            <Lock className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-700">Slot Booking Closed</h2>
            <p className="text-sm text-red-600 mt-2">
              The registration deadline has passed. Please contact the organiser.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => router.push(`/participant/ideas/${ideaId}`)}>
              Back to Idea
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const slotsByDate = groupSlotsByDate(slots)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Book Idea Brief Session Slot</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a 15-minute slot for <strong>{ideaCodeName}</strong>.
          Sessions run 8:30 am – 12:00 pm on 6 and 7 April 2026.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-5 w-5 text-ibl-blue" />
            Available Slots
          </CardTitle>
          <CardDescription>
            Choose an available time slot for your Idea Brief Session on MS Teams.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading available slots…
            </div>
          )}

          {fetchError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {fetchError}
              <Button variant="ghost" size="sm" onClick={fetchSlots} className="ml-auto">
                Retry
              </Button>
            </div>
          )}

          {!loading && !fetchError && slots.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No available slots. Please contact the organiser.</p>
            </div>
          )}

          {!loading && !fetchError && slots.length > 0 && (
            <div className="space-y-5">
              {Object.entries(slotsByDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dateKey, daySlots]) => (
                  <div key={dateKey}>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-ibl-blue" />
                      {SLOT_DATE_LABELS[dateKey] ?? dateKey}
                    </h3>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {daySlots.map((slot) => {
                        const isSelected = selectedSlotId === slot.id
                        return (
                          <button
                            key={slot.id}
                            type="button"
                            disabled={slot.isBooked}
                            onClick={() => setSelectedSlotId(slot.id)}
                            className={[
                              "rounded-md border px-2 py-2 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ibl-blue",
                              slot.isBooked
                                ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed line-through"
                                : isSelected
                                ? "bg-ibl-blue border-ibl-blue text-white shadow-md"
                                : "bg-white border-gray-300 text-gray-700 hover:border-ibl-blue hover:bg-ibl-light cursor-pointer",
                            ].join(" ")}
                          >
                            {formatTime(slot.startTime)}
                            {isSelected && <CheckCircle2 className="h-3 w-3 inline-block ml-1" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {submitError}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => router.push(`/participant/ideas/${ideaId}`)}
              disabled={submitting}
              className="flex-1"
            >
              Back to Idea
            </Button>
            <Button
              variant="ibl"
              onClick={handleBook}
              disabled={submitting || !selectedSlotId}
              className="flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Booking…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirm Slot
                </>
              )}
            </Button>
          </div>

          {!selectedSlotId && !loading && slots.length > 0 && (
            <p className="text-xs text-center text-muted-foreground">
              Select a time slot above to confirm.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
