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
    <div
      className="bg-white border-b border-[rgba(11,30,61,0.18)] flex items-center px-4 gap-3 shrink-0"
      style={{ minHeight: 56, paddingTop: 'max(0px, env(safe-area-inset-top, 0px))' }}
    >
      {/* Hamburger – hidden on desktop where sidebar is always visible */}
      <button
        onClick={onMenuClick}
        className="md:hidden text-[#0B1E3D] p-2 -ml-1 rounded-lg active:bg-[#F4F5F7] transition-colors"
        aria-label="Menü megnyitása"
        style={{ minWidth: 44, minHeight: 44 }}
      >
        <Menu size={22} />
      </button>

      <h1 className="font-['DM_Serif_Display'] text-[17px] md:text-[18px] text-[#0B1E3D] flex-1 truncate">
        {title}
      </h1>

      <div className="text-[12px] text-[#5a6a80] hidden md:flex items-center gap-1.5 shrink-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
        {dateStr}
      </div>

      <button
        onClick={onRefresh}
        className="text-[#5a6a80] hover:text-[#0B1E3D] active:text-[#0B1E3D] transition-colors p-2 rounded-lg active:bg-[#F4F5F7]"
        title="Frissítés"
        style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
