import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const BELT_COLORS: Record<string, string> = {
  WHITE: 'bg-gray-100 text-gray-800 border-gray-300',
  BLUE: 'bg-blue-100 text-blue-800 border-blue-300',
  PURPLE: 'bg-purple-100 text-purple-800 border-purple-300',
  BROWN: 'bg-amber-100 text-amber-800 border-amber-300',
  BLACK: 'bg-gray-900 text-white border-gray-700',
}

export const BELT_ORDER = ['WHITE', 'BLUE', 'PURPLE', 'BROWN', 'BLACK']

export function formatBelt(belt: string) {
  return belt.charAt(0) + belt.slice(1).toLowerCase()
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}
