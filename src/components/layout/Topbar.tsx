'use client'
import { Menu, RefreshCw, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

interface TopbarProps {
  title: string
  onMenuClick: () => void
  onRefresh: () => void
  onNewItem?: () => void
  newItemLabel?: string
}

export function Topbar({ title, onMenuClick, onRefresh, onNewItem, newItemLabel }: TopbarProps) {
  const now = new Date()
  const dateStr = format(now, 'EEEE, d. MMMM yyyy', { locale: de })

  return (
    <div className="h-14 bg-white border-b border-[rgba(11,30,61,0.18)] flex items-center px-5 gap-3 shrink-0">
      <button
        onClick={onMenuClick}
        className="md:hidden text-[#0B1E3D] p-1"
        aria-label="Menü"
      >
        <Menu size={22} />
      </button>

      <h1 className="font-['DM_Serif_Display'] text-[18px] text-[#0B1E3D] flex-1">{title}</h1>

      <div className="text-[12px] text-[#5a6a80] hidden md:flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
        {dateStr}
      </div>

      <button
        onClick={onRefresh}
        className="text-[#5a6a80] hover:text-[#0B1E3D] transition-colors p-1.5"
        title="Aktualisieren"
      >
        <RefreshCw size={16} />
      </button>

      {onNewItem && (
        <Button variant="primary" size="sm" onClick={onNewItem}>
          <Plus size={14} />
          <span className="hidden sm:inline">{newItemLabel || 'Neu'}</span>
        </Button>
      )}
    </div>
  )
}
