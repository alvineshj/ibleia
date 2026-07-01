export type CornerColorId = "blue" | "red" | "black" | "white" | "green" | "gold"

export interface CornerColorDef {
  label: string
  swatch: string
  panel: string
  text: string
}

export const CORNER_COLORS: Record<CornerColorId, CornerColorDef> = {
  blue: { label: "Blue", swatch: "bg-blue-700", panel: "bg-blue-700", text: "text-white" },
  red: { label: "Red", swatch: "bg-red-700", panel: "bg-red-700", text: "text-white" },
  black: { label: "Black", swatch: "bg-neutral-900", panel: "bg-neutral-900", text: "text-white" },
  white: {
    label: "White",
    swatch: "bg-white border border-neutral-400",
    panel: "bg-white border-2 border-neutral-300",
    text: "text-neutral-900",
  },
  green: { label: "Green", swatch: "bg-emerald-700", panel: "bg-emerald-700", text: "text-white" },
  gold: { label: "Gold", swatch: "bg-amber-600", panel: "bg-amber-600", text: "text-white" },
}

export interface CornerState {
  id: "a" | "b"
  name: string
  team: string
  countryCode: string
  logo: string | null
  points: number
  advantages: number
  penalties: number
  color: CornerColorId
}

export interface ScoreboardState {
  matchTitle: string
  corners: [CornerState, CornerState]
  durationMs: number
  remainingMs: number
}

export const DEFAULT_CORNER_A: CornerState = {
  id: "a",
  name: "Competitor 1",
  team: "",
  countryCode: "",
  logo: null,
  points: 0,
  advantages: 0,
  penalties: 0,
  color: "blue",
}

export const DEFAULT_CORNER_B: CornerState = {
  id: "b",
  name: "Competitor 2",
  team: "",
  countryCode: "",
  logo: null,
  points: 0,
  advantages: 0,
  penalties: 0,
  color: "red",
}

export const DEFAULT_DURATION_MS = 5 * 60 * 1000

export const DEFAULT_STATE: ScoreboardState = {
  matchTitle: "",
  corners: [DEFAULT_CORNER_A, DEFAULT_CORNER_B],
  durationMs: DEFAULT_DURATION_MS,
  remainingMs: DEFAULT_DURATION_MS,
}

export const TIMER_PRESETS_MIN = [3, 4, 5, 6, 8, 10]

export function clampNonNegative(n: number) {
  return n < 0 ? 0 : n
}

export function formatClock(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}
