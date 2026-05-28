"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { CATEGORY_LABELS } from "@/lib/utils"
import { Loader2, AlertTriangle } from "lucide-react"

interface Idea {
  id: string
  codeName: string
  category: string
}

interface ConflictDeclarationFormProps {
  ideas: Idea[]
  editionId: string
  juryMemberId: string
}

export function ConflictDeclarationForm({
  ideas,
  editionId,
  juryMemberId,
}: ConflictDeclarationFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [conflictedIds, setConflictedIds] = useState<Set<string>>(new Set())

  function toggleConflict(ideaId: string) {
    setConflictedIds((prev) => {
      const next = new Set(prev)
      next.has(ideaId) ? next.delete(ideaId) : next.add(ideaId)
      return next
    })
  }

  async function handleSubmit() {
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/scores/conflict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editionId,
          conflictedIdeaIds: Array.from(conflictedIds),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        toast({ title: "Error", description: data.error, variant: "destructive" })
        return
      }

      toast({ title: "Declaration submitted", variant: "default" })
      router.push("/jury/scoring")
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-4">
          <div className="flex gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              Mark any ideas where you have a conflict of interest (personal, financial, or professional relationship with the team). You will not be able to score flagged ideas.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-2">
        {ideas.map((idea) => {
          const hasConflict = conflictedIds.has(idea.id)
          return (
            <div
              key={idea.id}
              onClick={() => toggleConflict(idea.id)}
              className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                hasConflict ? "border-red-400 bg-red-50" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <div>
                <p className="font-medium text-sm">{idea.codeName}</p>
                <Badge variant="outline" className="text-xs mt-1">
                  {CATEGORY_LABELS[idea.category as keyof typeof CATEGORY_LABELS]}
                </Badge>
              </div>
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                  hasConflict ? "border-red-500 bg-red-500" : "border-gray-300"
                }`}
              >
                {hasConflict && <span className="text-white text-xs font-bold">✓</span>}
              </div>
            </div>
          )
        })}
      </div>

      {conflictedIds.size === 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">
          No conflicts selected — you can score all ideas.
        </p>
      )}

      <Button variant="ibl" className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Declaration & Proceed to Scoring
      </Button>
    </div>
  )
}
