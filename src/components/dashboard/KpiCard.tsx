import { cn } from '@/lib/utils'

interface KpiCardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'gold' | 'red' | 'navy' | 'green'
  icon?: React.ReactNode
}

export function KpiCard({ label, value, sub, accent = 'navy', icon }: KpiCardProps) {
  const accents = {
    gold: 'from-[#C9A84C] to-[#e8c96b]',
    red: 'bg-[#C9384C]',
    navy: 'bg-[#0B1E3D]',
    green: 'bg-emerald-500',
  }
  return (
    <div className="relative bg-white border border-[rgba(11,30,61,0.10)] rounded-[14px] p-4 overflow-hidden">
      <div className={cn(
        'absolute top-0 left-0 right-0 h-[3px]',
        accent === 'gold' ? `bg-gradient-to-r ${accents.gold}` : accents[accent]
      )} />
      {icon && (
        <div className="text-[#C9A84C] mb-2">{icon}</div>
      )}
      <div className="font-['DM_Serif_Display'] text-[28px] text-[#0B1E3D] leading-none">{value}</div>
      <div className="text-[11px] text-[#5a6a80] mt-1.5">{label}</div>
      {sub && <div className="text-[11px] font-medium mt-1.5 text-[#5a6a80]">{sub}</div>}
    </div>
  )
}
