'use client'
import { cn } from '@/lib/utils'
import { STATUS_LABELS, STATUS_COLORS } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'gold' | 'fleet'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-blue-100 text-blue-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    gold: 'bg-yellow-100 text-yellow-800',
    fleet: 'bg-purple-100 text-purple-800',
  }
  return (
    <span className={cn('inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', variants[variant], className)}>
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] || status
  const color = STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'
  return (
    <span className={cn('inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap', color)}>
      {label}
    </span>
  )
}
