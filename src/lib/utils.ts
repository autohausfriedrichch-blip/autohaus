import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleDateString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF' }).format(amount)
}

export const STATUS_LABELS: Record<string, string> = {
  new_booking: 'Új foglalás',
  confirmed: 'Megerősítve',
  checked_in: 'Check-in',
  diagnostics: 'Diagnosztika',
  waiting_quote: 'Árajánlatra vár',
  waiting_approval: 'Jóváhagyásra vár',
  waiting_parts: 'Alkatrészre vár',
  in_repair: 'Javítás folyamatban',
  quality_check: 'Minőség-ellenőrzés',
  ready: 'Kész',
  checkout_ready: 'Átadásra vár',
  delivered: 'Kiadva',
  closed: 'Lezárva',
}

export const STATUS_COLORS: Record<string, string> = {
  new_booking: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  checked_in: 'bg-cyan-100 text-cyan-800',
  diagnostics: 'bg-purple-100 text-purple-800',
  waiting_quote: 'bg-yellow-100 text-yellow-800',
  waiting_approval: 'bg-orange-100 text-orange-800',
  waiting_parts: 'bg-amber-100 text-amber-800',
  in_repair: 'bg-blue-100 text-blue-800',
  quality_check: 'bg-indigo-100 text-indigo-800',
  ready: 'bg-emerald-100 text-emerald-800',
  checkout_ready: 'bg-teal-100 text-teal-800',
  delivered: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-600',
}
