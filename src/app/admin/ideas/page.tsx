"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CATEGORY_LABELS, STATUS_LABELS } from "@/lib/utils"
import { Lightbulb, Search, CheckCircle2, XCircle, Eye, Trophy } from "lucide-react"

type IdeaCategory = "CX" | "BI" | "OE"
type IdeaStatus =
  | "REGISTERED"
  | "IDEA_BRIEF_PRESENTED"
  | "ELIGIBILITY_REVIEW"
  | "ACCEPTED"
  | "NOT_ACCEPTED"
  | "UNDER_DEVELOPMENT"
  | "QUARTER_FINALIST"
  | "SEMI_FINALIST"
  | "FINALIST"
  | "WINNER"
  | "ELIMINATED"

interface IdeaRow {
  id: string
  editionId: string
  codeName: string
  description1Line: string
  category: IdeaCategory
  status: IdeaStatus
  internalShowcaseApproved: boolean
  createdAt: string
  team: {
    members: {
      role: string
      user: { id: string; name: string; email: string }
    }[]
  } | null
  presentations: { round: string; scheduledDatetime: string | null }[]
  scores: {
    round: string
    weightedTotal: number | null
    submittedAt: string | null
    juryMemberId: string
    conflictDeclared: boolean
  }[]
}

const STATUS_VARIANTS: Record<string, "success" | "destructive" | "info" | "warning" | "secondary" | "outline"> = {
  REGISTERED: "secondary",
  IDEA_BRIEF_PRESENTED: "secondary",
  ELIGIBILITY_REVIEW: "warning",
  ACCEPTED: "success",
  NOT_ACCEPTED: "destructive",
  UNDER_DEVELOPMENT: "info",
  QUARTER_FINALIST: "info",
  SEMI_FINALIST: "info",
  FINALIST: "info",
  WINNER: "success",
  ELIMINATED: "destructive",
}

export default function AdminIdeasPage() {
  const [ideas, setIdeas] = useState<IdeaRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [categoryFilter, setCategoryFilter] = useState("ALL")
  const [roundFilter, setRoundFilter] = useState("ALL")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState<string | null>(null)

  const fetchIdeas = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== "ALL") params.set("status", statusFilter)
    if (categoryFilter !== "ALL") params.set("category", categoryFilter)
    if (roundFilter !== "ALL") params.set("round", roundFilter)

    const res = await fetch(`/api/admin/ideas?${params}`)
    if (res.ok) {
      const data: IdeaRow[] = await res.json()
      setIdeas(data)
    }
    setLoading(false)
  }, [statusFilter, categoryFilter, roundFilter])

  useEffect(() => {
    fetchIdeas()
  }, [fetchIdeas])

  const filtered = ideas.filter((i) => {
    if (!search) return true
    const q = search.toLowerCase()
    return i.codeName.toLowerCase().includes(q) || i.description1Line.toLowerCase().includes(q)
  })

  async function updateIdeaStatus(id: string, status: IdeaStatus) {
    setSubmitting(id)
    await fetch("/api/admin/ideas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    })
    await fetchIdeas()
    setSubmitting(null)
  }

  async function toggleShowcase(id: string, current: boolean) {
    setSubmitting(id + "-showcase")
    await fetch("/api/admin/ideas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, internalShowcaseApproved: !current }),
    })
    await fetchIdeas()
    setSubmitting(null)
  }

  async function bulkUpdate(status: IdeaStatus) {
    if (selected.size === 0) return
    setSubmitting("bulk")
    await fetch("/api/admin/ideas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected), status }),
    })
    setSelected(new Set())
    await fetchIdeas()
    setSubmitting(null)
  }

  async function assignToRound(ideaIds: string[], round: "QF" | "SF" | "FINAL") {
    setSubmitting("bulk")
    // Get editionId from the first matching idea via the API response
    const editionId = ideas.find((i) => ideaIds.includes(i.id))?.editionId
    if (!editionId) { setSubmitting(null); return }
    await fetch("/api/admin/rounds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "assign_to_round", round, editionId, ideaIds }),
    })
    setSelected(new Set())
    await fetchIdeas()
    setSubmitting(null)
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((i) => i.id)))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ideas</h1>
          <p className="text-muted-foreground">{filtered.length} idea{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by code name or description..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                <SelectItem value="REGISTERED">Registered</SelectItem>
                <SelectItem value="IDEA_BRIEF_PRESENTED">Brief Presented</SelectItem>
                <SelectItem value="ELIGIBILITY_REVIEW">Eligibility Review</SelectItem>
                <SelectItem value="ACCEPTED">Accepted</SelectItem>
                <SelectItem value="NOT_ACCEPTED">Not Accepted</SelectItem>
                <SelectItem value="UNDER_DEVELOPMENT">Under Development</SelectItem>
                <SelectItem value="QUARTER_FINALIST">Quarter-Finalist</SelectItem>
                <SelectItem value="SEMI_FINALIST">Semi-Finalist</SelectItem>
                <SelectItem value="FINALIST">Finalist</SelectItem>
                <SelectItem value="WINNER">Winner</SelectItem>
                <SelectItem value="ELIMINATED">Eliminated</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                <SelectItem value="CX">Customer Experience</SelectItem>
                <SelectItem value="BI">Business Innovation</SelectItem>
                <SelectItem value="OE">Operational Excellence</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roundFilter} onValueChange={setRoundFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All rounds" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All rounds</SelectItem>
                <SelectItem value="QF">Quarter-Finals</SelectItem>
                <SelectItem value="SF">Semi-Finals</SelectItem>
                <SelectItem value="FINAL">Final</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex-wrap">
          <span className="text-sm font-medium text-blue-800">{selected.size} selected</span>
          <div className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="text-green-700 border-green-300 hover:bg-green-50"
              disabled={submitting === "bulk"}
              onClick={() => bulkUpdate("ACCEPTED")}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              Accept All
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-red-700 border-red-300 hover:bg-red-50"
              disabled={submitting === "bulk"}
              onClick={() => bulkUpdate("NOT_ACCEPTED")}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              Reject All
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-purple-700 border-purple-300 hover:bg-purple-50"
              disabled={submitting === "bulk"}
              onClick={() => assignToRound(Array.from(selected), "QF")}
            >
              <Trophy className="h-3.5 w-3.5 mr-1.5" />
              Assign to QF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Idea List
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No ideas found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={selected.size === filtered.length && filtered.length > 0}
                        onChange={toggleAll}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </th>
                    <th className="text-left py-2 pr-4 font-medium">Code Name</th>
                    <th className="text-left py-2 pr-4 font-medium">Description</th>
                    <th className="text-left py-2 pr-4 font-medium">Category</th>
                    <th className="text-left py-2 pr-4 font-medium">Team Size</th>
                    <th className="text-left py-2 pr-4 font-medium">Status</th>
                    <th className="text-left py-2 pr-4 font-medium">Showcase</th>
                    <th className="text-left py-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((idea) => {
                    const teamSize = idea.team?.members?.length ?? 0
                    return (
                      <tr key={idea.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2.5 pr-3">
                          <input
                            type="checkbox"
                            checked={selected.has(idea.id)}
                            onChange={() => toggleSelect(idea.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </td>
                        <td className="py-2.5 pr-4 font-semibold">{idea.codeName}</td>
                        <td className="py-2.5 pr-4 text-muted-foreground max-w-xs truncate">
                          {idea.description1Line}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge variant="outline" className="text-xs">
                            {CATEGORY_LABELS[idea.category]}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-center">{teamSize}</td>
                        <td className="py-2.5 pr-4">
                          <Badge variant={STATUS_VARIANTS[idea.status] ?? "secondary"}>
                            {STATUS_LABELS[idea.status] ?? idea.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4">
                          <button
                            onClick={() => toggleShowcase(idea.id, idea.internalShowcaseApproved)}
                            disabled={submitting === idea.id + "-showcase"}
                            className="text-xs"
                          >
                            {idea.internalShowcaseApproved ? (
                              <Badge variant="success">Approved</Badge>
                            ) : (
                              <Badge variant="secondary">Not Approved</Badge>
                            )}
                          </button>
                        </td>
                        <td className="py-2.5">
                          <div className="flex gap-1 flex-wrap">
                            {(idea.status === "ELIGIBILITY_REVIEW" || idea.status === "IDEA_BRIEF_PRESENTED" || idea.status === "REGISTERED") && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                                  disabled={submitting === idea.id}
                                  onClick={() => updateIdeaStatus(idea.id, "ACCEPTED")}
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Accept
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs text-red-700 border-red-300 hover:bg-red-50"
                                  disabled={submitting === idea.id}
                                  onClick={() => updateIdeaStatus(idea.id, "NOT_ACCEPTED")}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Reject
                                </Button>
                              </>
                            )}
                            {(idea.status === "ACCEPTED" || idea.status === "UNDER_DEVELOPMENT") && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-purple-700 border-purple-300 hover:bg-purple-50"
                                disabled={submitting === idea.id}
                                onClick={() => assignToRound([idea.id], "QF")}
                                title="Set as Quarter-Finalist and register for QF scoring"
                              >
                                <Trophy className="h-3 w-3 mr-1" />
                                → QF
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0"
                              title="View idea"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
