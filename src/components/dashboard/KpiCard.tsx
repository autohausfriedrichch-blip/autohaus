import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'gold' | 'red' | 'navy' | 'green'
  icon?: React.ReactNode
  onClick?: () => void
}

const ACCENT: Record<string, { bar: string; icon: string }> = {
  gold:  { bar: 'bg-[#C8102E]',   icon: '#C8102E' },
  red:   { bar: 'bg-[#C8102E]',   icon: '#C8102E' },
  navy:  { bar: 'bg-[#0D0D0D]',   icon: '#0D0D0D' },
  green: { bar: 'bg-emerald-500',  icon: '#16a34a' },
}

export function KpiCard({ label, value, sub, accent = 'navy', icon, onClick }: KpiCardProps) {
  const a = ACCENT[accent]
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-5 overflow-hidden',
        'transition-all duration-150',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-[1px] active:scale-[0.99]'
      )}
    >
      <div className={cn('absolute top-0 left-0 right-0 h-[3px]', a.bar)} />
      {icon && (
        <div className="mb-3 opacity-70" style={{ color: a.icon }}>{icon}</div>
      )}
      <div className="text-[28px] font-bold text-[#0D0D0D] leading-none tracking-tight">{value}</div>
      <div className="text-[11.5px] text-[#888888] font-medium mt-2">{label}</div>
      {sub && <div className="text-[11px] text-[#4a4a4a] mt-1">{sub}</div>}
    </div>
  )
}
