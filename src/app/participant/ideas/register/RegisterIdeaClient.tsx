"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { CATEGORY_LABELS, formatTime } from "@/lib/utils"
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Lightbulb,
  Loader2,
  Lock,
  Plus,
  Trash2,
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
    const dateKey = slot.date.slice(0, 10)
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(slot)
    return acc
  }, {})
}

function countWords(str: string): number {
  return str.trim().split(/\s+/).filter(Boolean).length
}

export default function RegisterIdeaClient({ regDeadline }: { regDeadline: Date | null }) {
  const router = useRouter()
  const isDeadlinePassed = regDeadline ? new Date() > regDeadline : false

  const [step, setStep] = useState<1 | 2>(1)
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  const [codeName, setCodeName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [teamEmails, setTeamEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState("")
  const [selectedSlotId, setSelectedSlotId] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({})

  const wordCount = countWords(description)
  const wordCountOk = wordCount <= 10
  const codeNameValid = /^[a-zA-Z0-9_-]+$/.test(codeName)

  const fetchSlots = useCallback(async () => {
    setSlotsLoading(true)
    setSlotsError(null)
    try {
      const res = await fetch("/api/slots")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to load slots")
      setSlots(data.slots)
    } catch (err) {
      setSlotsError(err instanceof Error ? err.message : "Failed to load slots")
    } finally {
      setSlotsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (step === 2) fetchSlots()
  }, [step, fetchSlots])

  function validateStep1(): boolean {
    const errors: Record<string, string> = {}
    if (!codeName.trim()) errors.codeName = "Code name is required"
    else if (!codeNameValid) errors.codeName = "Only letters, numbers, hyphens, and underscores"
    if (!description.trim()) errors.description = "Description is required"
    else if (!wordCountOk) errors.description = "Must be 10 words or fewer"
    if (!category) errors.category = "Please select a category"
    setStep1Errors(errors)
    return Object.keys(errors).length === 0
  }

  function handleNextStep() {
    if (validateStep1()) setStep(2)
  }

  function addTeamEmail() {
    const email = newEmail.trim().toLowerCase()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStep1Errors((e) => ({ ...e, newEmail: "Enter a valid email address" }))
      return
    }
    if (teamEmails.includes(email)) {
      setStep1Errors((e) => ({ ...e, newEmail: "Email already added" }))
      return
    }
    if (teamEmails.length >= 9) {
      setStep1Errors((e) => ({ ...e, newEmail: "Maximum 9 additional members (10 total)" }))
      return
    }
    setTeamEmails((prev) => [...prev, email])
    setNewEmail("")
    setStep1Errors((e) => { const { newEmail: _, ...rest } = e; return rest })
  }

  function removeTeamEmail(email: string) {
    setTeamEmails((prev) => prev.filter((e) => e !== email))
  }

  async function handleSubmit() {
    if (!selectedSlotId) {
      setSubmitError("Please select a time slot before submitting.")
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeName,
          description1Line: description,
          category,
          slotId: selectedSlotId,
          teamMemberEmails: teamEmails,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Registration failed")
      router.push(`/ideas/${data.idea.id}?registered=1`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setSubmitting(false)
    }
  }

  const slotsByDate = groupSlotsByDate(slots)

  if (isDeadlinePassed) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-8 pb-8 text-center">
            <Lock className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-700">Registration Closed</h2>
            <p className="text-sm text-red-600 mt-2">
              The registration deadline was 31 March 2026 at 11:59 pm. No new ideas can be
              registered.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => router.push("/ideas")}>
              Back to My Ideas
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Register a New Idea</h1>
        <p className="text-sm text-muted-foreground mt-1">
          IBL Excellence &amp; Innovation Award 2026 — Registration closes 31 March 2026
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        <div
          className={`flex items-center gap-1.5 font-medium ${step >= 1 ? "text-ibl-blue" : "text-muted-foreground"}`}
        >
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              step > 1 ? "bg-green-500 text-white" : step === 1 ? "bg-ibl-blue text-white" : "bg-gray-200 text-gray-500"
            }`}
          >
            {step > 1 ? <CheckCircle2 className="h-4 w-4" /> : "1"}
          </span>
          Idea Details
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300" />
        <div
          className={`flex items-center gap-1.5 font-medium ${step === 2 ? "text-ibl-blue" : "text-muted-foreground"}`}
        >
          <span
            className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
              step === 2 ? "bg-ibl-blue text-white" : "bg-gray-200 text-gray-500"
            }`}
          >
            2
          </span>
          Book a Slot
        </div>
      </div>

      {/* ── Step 1: Idea details ─────────────────────────────── */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-ibl-blue" />
              Idea Information
            </CardTitle>
            <CardDescription>
              Give your idea a unique code name and a brief description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Code name */}
            <div className="space-y-1.5">
              <Label htmlFor="codeName">
                Idea Code Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="codeName"
                placeholder="e.g. ProjectPhoenix"
                value={codeName}
                onChange={(e) => setCodeName(e.target.value)}
                className={step1Errors.codeName ? "border-red-400" : ""}
                maxLength={60}
              />
              {step1Errors.codeName ? (
                <p className="text-xs text-red-500">{step1Errors.codeName}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Letters, numbers, hyphens, and underscores only. Must be unique system-wide.
                </p>
              )}
            </div>

            {/* One-line description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">
                One-Line Description <span className="text-red-500">*</span>
              </Label>
              <Input
                id="description"
                placeholder="e.g. Streamline client onboarding with AI-assisted forms"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={step1Errors.description ? "border-red-400" : ""}
              />
              <div className="flex items-center justify-between">
                {step1Errors.description ? (
                  <p className="text-xs text-red-500">{step1Errors.description}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Maximum 10 words.</p>
                )}
                <span
                  className={`text-xs font-medium ${
                    wordCount > 10 ? "text-red-500" : wordCount >= 8 ? "text-amber-500" : "text-muted-foreground"
                  }`}
                >
                  {wordCount}/10 words
                </span>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <Label htmlFor="category">
                Category <span className="text-red-500">*</span>
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category" className={step1Errors.category ? "border-red-400" : ""}>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      <span className="font-mono text-xs mr-2 text-muted-foreground">{value}</span>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {step1Errors.category && (
                <p className="text-xs text-red-500">{step1Errors.category}</p>
              )}
            </div>

            {/* Team members */}
            <div className="space-y-1.5">
              <Label>Additional Team Members</Label>
              <p className="text-xs text-muted-foreground">
                Add colleagues by their IBL platform email address. Team: min 1, max 10 members.
              </p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="colleague@iblgroup.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTeamEmail())}
                  className={step1Errors.newEmail ? "border-red-400" : ""}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={addTeamEmail}
                  disabled={teamEmails.length >= 9}
                  title="Add member"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {step1Errors.newEmail && (
                <p className="text-xs text-red-500">{step1Errors.newEmail}</p>
              )}
              {teamEmails.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {teamEmails.map((email) => (
                    <li
                      key={email}
                      className="flex items-center justify-between rounded-md bg-gray-50 border border-gray-200 px-3 py-1.5 text-sm"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => removeTeamEmail(email)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                {teamEmails.length + 1} / 10 members added (including you)
              </p>
            </div>

            <Button variant="ibl" className="w-full" onClick={handleNextStep}>
              Continue to Slot Booking
              <ChevronRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Step 2: Slot booking ─────────────────────────────── */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-5 w-5 text-ibl-blue" />
              Book Your Idea Brief Session Slot
            </CardTitle>
            <CardDescription>
              Select an available 15-minute slot for your idea brief presentation on MS Teams.
              Sessions run 8:30 am – 12:00 pm on 6 and 7 April 2026.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary of step 1 */}
            <div className="rounded-md bg-gray-50 border border-gray-200 p-3 text-sm space-y-1">
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">Code name</span>
                <span className="font-semibold">{codeName}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">Description</span>
                <span>{description}</span>
              </div>
              <div className="flex gap-2">
                <span className="text-muted-foreground w-28 shrink-0">Category</span>
                <Badge variant="outline" className="text-xs">
                  {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
                </Badge>
              </div>
              {teamEmails.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-28 shrink-0">Team</span>
                  <span className="text-xs text-muted-foreground">{teamEmails.join(", ")}</span>
                </div>
              )}
            </div>

            {slotsLoading && (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading available slots…
              </div>
            )}

            {slotsError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {slotsError}
                <Button variant="ghost" size="sm" onClick={fetchSlots} className="ml-auto">
                  Retry
                </Button>
              </div>
            )}

            {!slotsLoading && !slotsError && slots.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No available slots found. Please contact the organiser.</p>
              </div>
            )}

            {!slotsLoading && !slotsError && slots.length > 0 && (
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
                              {isSelected && (
                                <CheckCircle2 className="h-3 w-3 inline-block ml-1" />
                              )}
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
                onClick={() => setStep(1)}
                disabled={submitting}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                variant="ibl"
                onClick={handleSubmit}
                disabled={submitting || !selectedSlotId}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Registering…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Register Idea &amp; Book Slot
                  </>
                )}
              </Button>
            </div>

            {!selectedSlotId && !slotsLoading && slots.length > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Select a time slot above to confirm your registration.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
