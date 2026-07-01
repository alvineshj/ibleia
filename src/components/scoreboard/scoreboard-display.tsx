"use client"

import { forwardRef } from "react"
import { countryFlagEmoji, countryName } from "@/lib/countries"
import { CORNER_COLORS, CornerState, formatClock } from "./types"

interface ScoreboardDisplayProps {
  matchTitle: string
  corners: [CornerState, CornerState]
  remainingMs: number
  running: boolean
  timeExpired: boolean
}

function CornerBlock({ corner }: { corner: CornerState }) {
  const colorDef = CORNER_COLORS[corner.color]
  return (
    <div className={`flex flex-1 flex-col items-center justify-between gap-4 p-6 sm:p-10 ${colorDef.panel} ${colorDef.text}`}>
      <div className="flex w-full items-center justify-center gap-3">
        {corner.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={corner.logo} alt="" className="h-12 w-12 sm:h-16 sm:w-16 object-contain rounded bg-white/10 p-1" />
        )}
        <div className="text-center">
          <p className="text-xl sm:text-3xl font-bold leading-tight break-words">
            {corner.countryCode && <span className="mr-2">{countryFlagEmoji(corner.countryCode)}</span>}
            {corner.name || "Competitor"}
          </p>
          {(corner.team || corner.countryCode) && (
            <p className="text-sm sm:text-base opacity-80">
              {[corner.team, corner.countryCode ? countryName(corner.countryCode) : ""].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>

      <p className="text-7xl sm:text-[9rem] font-black leading-none tabular-nums">{corner.points}</p>

      <div className="flex gap-6 text-sm sm:text-lg font-semibold uppercase tracking-wide">
        <span>ADV {corner.advantages}</span>
        <span>PEN {corner.penalties}</span>
      </div>
    </div>
  )
}

export const ScoreboardDisplay = forwardRef<HTMLDivElement, ScoreboardDisplayProps>(
  ({ matchTitle, corners, remainingMs, running, timeExpired }, ref) => {
    return (
      <div ref={ref} className="flex flex-col overflow-hidden rounded-xl border bg-black shadow-lg">
        {matchTitle && (
          <div className="bg-neutral-950 py-2 text-center text-sm sm:text-base font-semibold uppercase tracking-widest text-white">
            {matchTitle}
          </div>
        )}
        <div className="flex flex-col sm:flex-row">
          <CornerBlock corner={corners[0]} />

          <div className="flex shrink-0 items-center justify-center bg-neutral-950 px-6 py-4 sm:w-64">
            <p
              className={`text-5xl sm:text-6xl font-black tabular-nums text-white ${
                timeExpired ? "animate-pulse text-red-500" : running ? "text-emerald-400" : ""
              }`}
            >
              {formatClock(remainingMs)}
            </p>
          </div>

          <CornerBlock corner={corners[1]} />
        </div>
      </div>
    )
  }
)
ScoreboardDisplay.displayName = "ScoreboardDisplay"
