import type { Metadata } from "next"
import { BjjScoreboard } from "@/components/scoreboard/bjj-scoreboard"

export const metadata: Metadata = {
  title: "BJJ Scoreboard",
  description: "Live BJJ competition scoreboard with timer, scores, and competitor branding",
}

export default function ScoreboardPage() {
  return (
    <main className="min-h-screen bg-neutral-100 py-8">
      <div className="mx-auto max-w-5xl px-4 space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold text-ibl-blue">BJJ Competition Scoreboard</h1>
          <p className="text-sm text-muted-foreground">
            Set the round timer, edit competitor names, scores and club/country branding, then switch to fullscreen for
            display on a mat-side screen or projector.
          </p>
        </div>
        <BjjScoreboard />
      </div>
    </main>
  )
}
