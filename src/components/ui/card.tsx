import { cn } from '@/lib/utils'

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('bg-white border border-[rgba(0,0,0,0.10)] rounded-[14px] p-[18px]', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, icon, className }: { children: React.ReactNode; icon?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-[0.8px] mb-3.5', className)}>
      {icon && <span className="text-[#C8102E] text-base">{icon}</span>}
      {children}
    </div>
  )
}
