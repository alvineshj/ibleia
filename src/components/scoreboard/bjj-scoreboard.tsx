"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Maximize, Minimize, Pause, Play, RotateCcw, ArrowLeftRight, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CornerControl } from "./corner-control"
import { ScoreboardDisplay } from "./scoreboard-display"
import {
  CornerState,
  DEFAULT_STATE,
  ScoreboardState,
  TIMER_PRESETS_MIN,
  clampNonNegative,
  formatClock,
} from "./types"

const STORAGE_KEY = "bjj-scoreboard-state-v1"

function playBuzzer() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "square"
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.5, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.4)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 1.4)
    osc.onended = () => ctx.close()
  } catch {
    // Audio isn't critical to scoring; ignore failures (e.g. autoplay policies).
  }
}

export function BjjScoreboard() {
  const [state, setState] = useState<ScoreboardState>(DEFAULT_STATE)
  const [running, setRunning] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const displayRef = useRef<HTMLDivElement>(null)
  const endTimeRef = useRef<number | null>(null)
  const rafRef = useRef<number>()

  // Load persisted state on mount.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ScoreboardState
        setState({ ...DEFAULT_STATE, ...parsed })
      }
    } catch {
      // Ignore corrupt/unavailable storage; fall back to defaults.
    } finally {
      setLoaded(true)
    }
  }, [])

  // Persist on change.
  useEffect(() => {
    if (!loaded) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state, loaded])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  // Timer loop.
  useEffect(() => {
    if (!running) return
    endTimeRef.current = Date.now() + state.remainingMs

    const tick = () => {
      const remaining = Math.max(0, (endTimeRef.current ?? 0) - Date.now())
      setState((s) => ({ ...s, remainingMs: remaining }))
      if (remaining <= 0) {
        setRunning(false)
        playBuzzer()
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  const timeExpired = state.remainingMs <= 0

  function updateCorner(index: 0 | 1, next: CornerState) {
    setState((s) => {
      const corners: [CornerState, CornerState] = [...s.corners]
      corners[index] = next
      return { ...s, corners }
    })
  }

  function setDuration(ms: number) {
    setState((s) => ({ ...s, durationMs: ms, remainingMs: ms }))
    setRunning(false)
  }

  function resetTimer() {
    setRunning(false)
    setState((s) => ({ ...s, remainingMs: s.durationMs }))
  }

  function adjustRemaining(deltaMs: number) {
    setState((s) => ({ ...s, remainingMs: clampNonNegative(s.remainingMs + deltaMs) }))
  }

  function swapCorners() {
    setState((s) => ({
      ...s,
      corners: [
        { ...s.corners[1], id: "a" },
        { ...s.corners[0], id: "b" },
      ],
    }))
  }

  function resetMatch() {
    if (!window.confirm("Reset scores, timer and competitor details for a new match?")) return
    setRunning(false)
    setState(DEFAULT_STATE)
  }

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      displayRef.current?.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }, [])

  return (
    <div className="space-y-6">
      <ScoreboardDisplay
        ref={displayRef}
        matchTitle={state.matchTitle}
        corners={state.corners}
        remainingMs={state.remainingMs}
        running={running}
        timeExpired={timeExpired}
      />

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" variant={running ? "secondary" : "ibl"} onClick={() => setRunning((r) => !r)}>
          {running ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
          {running ? "Pause" : "Start"}
        </Button>
        <Button type="button" variant="outline" onClick={resetTimer}>
          <RotateCcw className="h-4 w-4 mr-2" /> Reset timer
        </Button>
        <Button type="button" variant="outline" onClick={() => adjustRemaining(-1000)} disabled={running}>
          -1s
        </Button>
        <Button type="button" variant="outline" onClick={() => adjustRemaining(1000)} disabled={running}>
          +1s
        </Button>
        <Button type="button" variant="outline" onClick={swapCorners}>
          <ArrowLeftRight className="h-4 w-4 mr-2" /> Swap corners
        </Button>
        <Button type="button" variant="outline" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize className="h-4 w-4 mr-2" /> : <Maximize className="h-4 w-4 mr-2" />}
          {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        </Button>
        <Button type="button" variant="outline" onClick={() => setShowControls((v) => !v)}>
          {showControls ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
          {showControls ? "Hide controls" : "Show controls"}
        </Button>
      </div>

      {showControls && (
        <div className="space-y-6">
          <div className="rounded-lg border p-4 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Match title (shown on the board)</label>
              <Input
                value={state.matchTitle}
                onChange={(e) => setState((s) => ({ ...s, matchTitle: e.target.value }))}
                placeholder="e.g. Adult Black Belt -82kg — Final"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Round length</label>
              <div className="flex flex-wrap items-center gap-2">
                {TIMER_PRESETS_MIN.map((min) => (
                  <Button
                    key={min}
                    type="button"
                    size="sm"
                    variant={state.durationMs === min * 60_000 ? "ibl" : "outline"}
                    onClick={() => setDuration(min * 60_000)}
                  >
                    {min} min
                  </Button>
                ))}
                <span className="text-sm text-muted-foreground ml-2">Current: {formatClock(state.remainingMs)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CornerControl corner={state.corners[0]} onChange={(next) => updateCorner(0, next)} />
            <CornerControl corner={state.corners[1]} onChange={(next) => updateCorner(1, next)} />
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="destructive" onClick={resetMatch}>
              Reset match
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
