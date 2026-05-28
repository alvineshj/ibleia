"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ROUND_LABELS } from "@/lib/utils"
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Upload,
  X,
} from "lucide-react"

const MAX_FILE_SIZE_MB = 16
const SOFT_PAGE_WARNING_SIZE_MB = 10 // rough proxy for >20 pages warning
const QF_REPORT_DEADLINE = "5 June 2026"

type IdeaStatus =
  | "REGISTERED"
  | "IDEA_BRIEF_PRESENTED"
  | "ELIGIBILITY_REVIEW"
  | "ACCEPTED"
  | "UNDER_DEVELOPMENT"
  | "QUARTER_FINALIST"
  | "SEMI_FINALIST"
  | "FINALIST"
  | "WINNER"
  | "NOT_ACCEPTED"
  | "ELIMINATED"

type IdeaSummary = {
  id: string
  codeName: string
  status: IdeaStatus
  reports: { round: string; submittedAt: string }[]
}

const STATUS_TO_AVAILABLE_ROUNDS: Record<string, string[]> = {
  ACCEPTED: ["QF"],
  UNDER_DEVELOPMENT: ["QF"],
  QUARTER_FINALIST: ["QF", "SF"],
  SEMI_FINALIST: ["QF", "SF"],
  FINALIST: ["QF", "SF", "FINAL"],
  WINNER: ["QF", "SF", "FINAL"],
}

export default function ReportUploadPage() {
  const params = useParams()
  const router = useRouter()
  const ideaId = params.id as string

  const [idea, setIdea] = useState<IdeaSummary | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [round, setRound] = useState("")
  const [language, setLanguage] = useState("EN")
  const [file, setFile] = useState<File | null>(null)
  const [wetransferLink, setWetransferLink] = useState("")
  const [dragOver, setDragOver] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load idea
  useEffect(() => {
    fetch(`/api/ideas/${ideaId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setLoadError(data.error)
        else setIdea(data.idea)
      })
      .catch(() => setLoadError("Failed to load idea"))
  }, [ideaId])

  // Pre-select round from URL param or default
  useEffect(() => {
    if (!idea) return
    const available = STATUS_TO_AVAILABLE_ROUNDS[idea.status] ?? []
    if (available.length === 1) setRound(available[0])
  }, [idea])

  const availableRounds = idea ? (STATUS_TO_AVAILABLE_ROUNDS[idea.status] ?? []) : []
  const existingRounds = idea?.reports.map((r) => r.round) ?? []

  function handleFileSelect(selected: File | null) {
    if (!selected) return
    if (selected.type !== "application/pdf") {
      setSubmitError("Only PDF files are accepted.")
      return
    }
    if (selected.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setSubmitError(
        `File is larger than ${MAX_FILE_SIZE_MB} MB. Please compress the PDF or use the WeTransfer link option.`
      )
      return
    }
    setSubmitError(null)
    setFile(selected)
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  const fileSizeMb = file ? file.size / (1024 * 1024) : 0
  const softPageWarning = fileSizeMb > SOFT_PAGE_WARNING_SIZE_MB

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!round) {
      setSubmitError("Please select the competition round.")
      return
    }
    if (!file && !wetransferLink.trim()) {
      setSubmitError("Please upload a PDF or provide a WeTransfer link.")
      return
    }
    if (wetransferLink.trim() && !/^https?:\/\//i.test(wetransferLink.trim())) {
      setSubmitError("WeTransfer link must be a valid URL starting with http:// or https://")
      return
    }

    setSubmitting(true)
    try {
      const form = new FormData()
      form.append("ideaId", ideaId)
      form.append("round", round)
      form.append("language", language)
      if (file) form.append("file", file)
      if (wetransferLink.trim()) form.append("wetransferLink", wetransferLink.trim())

      const res = await fetch("/api/reports", {
        method: "POST",
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Submission failed")

      setSubmitSuccess(true)
      setTimeout(() => router.push(`/ideas/${ideaId}`), 2000)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed")
    } finally {
      setSubmitting(false)
    }
  }

  if (loadError) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-red-200">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
            <p className="text-red-600 font-medium">{loadError}</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/ideas">Back to My Ideas</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!idea) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading…
      </div>
    )
  }

  if (availableRounds.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-amber-800">Reports Not Yet Available</h2>
            <p className="text-sm text-amber-700 mt-1">
              Report submission is not available for ideas with status{" "}
              <strong>{idea.status.replace(/_/g, " ")}</strong>.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href={`/ideas/${ideaId}`}>Back to Idea</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitSuccess) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-8 pb-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-800">Report Submitted!</h2>
            <p className="text-sm text-green-700 mt-1">Redirecting to idea details…</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Submit Report</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Idea: <span className="font-medium text-gray-700">{idea.codeName}</span>
        </p>
      </div>

      {/* Deadline banner */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <strong>Q/F Report deadline:</strong> {QF_REPORT_DEADLINE}.{" "}
          Late submissions will not be accepted.
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-5 w-5 text-ibl-blue" />
            Report Details
          </CardTitle>
          <CardDescription>
            Upload your PDF (max {MAX_FILE_SIZE_MB} MB) or provide a WeTransfer link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Round selection */}
            <div className="space-y-1.5">
              <Label htmlFor="round">
                Competition Round <span className="text-red-500">*</span>
              </Label>
              <Select value={round} onValueChange={setRound}>
                <SelectTrigger id="round">
                  <SelectValue placeholder="Select round" />
                </SelectTrigger>
                <SelectContent>
                  {availableRounds.map((r) => (
                    <SelectItem key={r} value={r}>
                      <div className="flex items-center gap-2">
                        {ROUND_LABELS[r as keyof typeof ROUND_LABELS]}
                        {existingRounds.includes(r) && (
                          <Badge variant="warning" className="text-xs ml-1">
                            Resubmission
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {existingRounds.includes(round) && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  You have already submitted a report for this round. Submitting again will replace it.
                </p>
              )}
            </div>

            {/* Language selection */}
            <div className="space-y-1.5">
              <Label htmlFor="language">Report Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language" className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EN">English (EN)</SelectItem>
                  <SelectItem value="FR">French (FR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* File upload */}
            <div className="space-y-1.5">
              <Label>
                PDF File{" "}
                <span className="text-muted-foreground font-normal">(max {MAX_FILE_SIZE_MB} MB)</span>
              </Label>

              {/* Drop zone */}
              <div
                role="button"
                tabIndex={0}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
                className={[
                  "flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors",
                  dragOver
                    ? "border-ibl-blue bg-ibl-light"
                    : file
                    ? "border-green-400 bg-green-50"
                    : "border-gray-300 hover:border-ibl-blue hover:bg-ibl-light/50",
                ].join(" ")}
              >
                {file ? (
                  <div className="text-center">
                    <FileText className="h-10 w-10 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-700">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {fileSizeMb.toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600">
                      Drag &amp; drop your PDF here
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      or click to browse (PDF only, max {MAX_FILE_SIZE_MB} MB)
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="sr-only"
                onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
              />

              {file && (
                <button
                  type="button"
                  onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:underline"
                >
                  <X className="h-3.5 w-3.5" /> Remove file
                </button>
              )}

              {/* Soft warning for large file */}
              {file && softPageWarning && (
                <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    Your file is {fileSizeMb.toFixed(1)} MB, which may indicate more than 20 pages.
                    Please ensure your report does not exceed the recommended length.
                  </span>
                </div>
              )}
            </div>

            {/* WeTransfer link fallback */}
            <div className="space-y-1.5">
              <Label htmlFor="wetransfer">
                WeTransfer Link{" "}
                <span className="text-muted-foreground font-normal">(fallback or supplement)</span>
              </Label>
              <Input
                id="wetransfer"
                type="url"
                placeholder="https://we.tl/t-xxxxxxxxxxxx"
                value={wetransferLink}
                onChange={(e) => setWetransferLink(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use this if your PDF exceeds {MAX_FILE_SIZE_MB} MB or you prefer WeTransfer.
                {" "}
                <a
                  href="https://wetransfer.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ibl-blue hover:underline inline-flex items-center gap-0.5"
                >
                  Open WeTransfer <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            {/* Error */}
            {submitError && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {submitError}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={submitting}
                asChild
              >
                <Link href={`/ideas/${ideaId}`}>Cancel</Link>
              </Button>
              <Button
                type="submit"
                variant="ibl"
                className="flex-1"
                disabled={submitting || (!file && !wetransferLink.trim())}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Submit Report
                  </>
                )}
              </Button>
            </div>

            {!file && !wetransferLink.trim() && (
              <p className="text-xs text-center text-muted-foreground">
                Add a PDF file or WeTransfer link to enable submission.
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
