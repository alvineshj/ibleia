import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function formatDateTime(date: Date | string) {
  return new Date(date).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatTime(date: Date | string) {
  return new Date(date).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function getCountdown(target: Date | string) {
  const now = new Date()
  const end = new Date(target)
  const diff = end.getTime() - now.getTime()

  if (diff <= 0) return "Passed"

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) return `${days}d ${hours}h remaining`
  return `${hours}h remaining`
}

export const CATEGORY_LABELS = {
  CX: "Customer Experience",
  BI: "Business Innovation",
  OE: "Operational Excellence",
} as const

export const STATUS_LABELS: Record<string, string> = {
  REGISTERED: "Registered",
  IDEA_BRIEF_PRESENTED: "Idea Brief Presented",
  ELIGIBILITY_REVIEW: "Eligibility Review",
  ACCEPTED: "Accepted",
  NOT_ACCEPTED: "Not Accepted",
  UNDER_DEVELOPMENT: "Under Development",
  QUARTER_FINALIST: "Quarter-Finalist",
  SEMI_FINALIST: "Semi-Finalist",
  FINALIST: "Finalist",
  WINNER: "Winner",
  ELIMINATED: "Eliminated",
}

export const ROUND_LABELS = {
  QF: "Quarter-Finals",
  SF: "Semi-Finals",
  FINAL: "Final",
} as const

export const WORKSHOP_TYPE_LABELS = {
  IDEATION: "Ideation",
  CUSTOMER_DISCOVERY: "Customer Discovery",
  BUSINESS_MODELLING: "Business Modelling",
  TESTING_BUSINESS_IDEAS: "Testing Business Ideas",
  PITCHING: "Pitching",
  OTHER: "Other",
} as const
