"use client"

import { useState } from "react"
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
import { CATEGORY_LABELS } from "@/lib/utils"
import {
  AlertCircle,
  CheckCircle2,
  Lightbulb,
  Loader2,
  Lock,
  Plus,
  Trash2,
} from "lucide-react"

function countWords(str: string): number {
  return str.trim().split(/\s+/).filter(Boolean).length
}

export default function RegisterIdeaClient({ regDeadline }: { regDeadline: Date | null }) {
  const router = useRouter()
  const isDeadlinePassed = regDeadline ? new Date() > regDeadline : false

  const [codeName, setCodeName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [teamEmails, setTeamEmails] = useState<string[]>([])
  const [newEmail, setNewEmail] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const wordCount = countWords(description)
  const wordCountOk = wordCount <= 10
  const codeNameValid = /^[a-zA-Z0-9_-]+$/.test(codeName)

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (!codeName.trim()) e.codeName = "Code name is required"
    else if (!codeNameValid) e.codeName = "Only letters, numbers, hyphens, and underscores"
    if (!description.trim()) e.description = "Description is required"
    else if (!wordCountOk) e.description = "Must be 10 words or fewer"
    if (!category) e.category = "Please select a category"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function addTeamEmail() {
    const email = newEmail.trim().toLowerCase()
    if (!email) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((e) => ({ ...e, newEmail: "Enter a valid email address" }))
      return
    }
    if (teamEmails.includes(email)) {
      setErrors((e) => ({ ...e, newEmail: "Email already added" }))
      return
    }
    if (teamEmails.length >= 9) {
      setErrors((e) => ({ ...e, newEmail: "Maximum 9 additional members (10 total)" }))
      return
    }
    setTeamEmails((prev) => [...prev, email])
    setNewEmail("")
    setErrors((e) => { const { newEmail: _, ...rest } = e; return rest })
  }

  async function handleSubmit() {
    if (!validate()) return
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
          teamMemberEmails: teamEmails,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Registration failed")
      router.push(`/participant/ideas/${data.idea.id}?registered=1`)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (isDeadlinePassed) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-8 pb-8 text-center">
            <Lock className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-700">Registration Closed</h2>
            <p className="text-sm text-red-600 mt-2">
              The registration deadline has passed. No new ideas can be registered.
            </p>
            <Button variant="outline" className="mt-6" onClick={() => router.push("/participant/ideas")}>
              Back to My Ideas
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Register a New Idea</h1>
        <p className="text-sm text-muted-foreground mt-1">
          IBL Excellence &amp; Innovation Award 2026 — You can book your Idea Brief Session slot
          after registration.
        </p>
      </div>

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
              className={errors.codeName ? "border-red-400" : ""}
              maxLength={60}
            />
            {errors.codeName ? (
              <p className="text-xs text-red-500">{errors.codeName}</p>
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
              className={errors.description ? "border-red-400" : ""}
            />
            <div className="flex items-center justify-between">
              {errors.description ? (
                <p className="text-xs text-red-500">{errors.description}</p>
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
              <SelectTrigger id="category" className={errors.category ? "border-red-400" : ""}>
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
            {errors.category && (
              <p className="text-xs text-red-500">{errors.category}</p>
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
                className={errors.newEmail ? "border-red-400" : ""}
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
            {errors.newEmail && (
              <p className="text-xs text-red-500">{errors.newEmail}</p>
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
                      onClick={() => setTeamEmails((prev) => prev.filter((e) => e !== email))}
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

          {submitError && (
            <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {submitError}
            </div>
          )}

          <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
            After registering, you can book your Idea Brief Session slot from the idea page.
          </div>

          <Button variant="ibl" className="w-full" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registering…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Register Idea
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
