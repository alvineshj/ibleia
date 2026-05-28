"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface Idea {
  codeName: string
  description1Line: string
  category: string
  status: string
}

export function ShowcaseExport({ ideas }: { ideas: Idea[] }) {
  function exportCSV() {
    const headers = ["Code Name", "Description", "Category", "Status"]
    const rows = ideas.map((i) => [
      `"${i.codeName}"`,
      `"${i.description1Line}"`,
      `"${i.category}"`,
      `"${i.status}"`,
    ])
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "ibl-idea-showcase.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" onClick={exportCSV}>
      <Download className="h-4 w-4 mr-2" />
      Export CSV
    </Button>
  )
}
