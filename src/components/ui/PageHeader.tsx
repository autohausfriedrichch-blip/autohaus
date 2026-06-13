import { cn } from '@/lib/utils'

interface StatCard {
  label: string
  value: string | number
  accent?: 'gold' | 'navy' | 'green' | 'red'
}

interface PageHeaderProps {
  title: string
  description?: string
  stats?: StatCard[]
  actions?: React.ReactNode
  className?: string
}

const ACCENT_COLORS: Record<string, string> = {
  gold:  '#C8102E',
  navy:  '#0D0D0D',
  green: '#16a34a',
  red:   '#C8102E',
}

export function PageHeader({ title, description, stats, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-5', className)}>
      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="page-header-title">{title}</h1>
          {description && <p className="page-header-desc">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">{actions}</div>}
      </div>

      {/* Stats row */}
      {stats && stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="stat-card">
              <div
                className="stat-card-value"
                style={{ color: s.accent ? ACCENT_COLORS[s.accent] : '#0D0D0D' }}
              >
                {s.value}
              </div>
              <div className="stat-card-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
