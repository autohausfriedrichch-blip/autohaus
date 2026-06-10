'use client'
import { Hammer, MapPin, Package, Camera, LayoutDashboard, ClipboardList, CheckSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileBottomNavProps {
  activePage: string
  onNavigate: (page: string) => void
  role?: string
  badges?: Record<string, number>
}

// Karl's mechanic bottom nav
const MECHANIC_TABS = [
  { id: 'technician',   label: 'Munkáim',   icon: Hammer },
  { id: 'workorders',   label: 'Munkalapok', icon: ClipboardList, badge: 'open' },
  { id: 'checkin',      label: 'Check-In',  icon: CheckSquare },
  { id: 'parts',        label: 'Alkatrész', icon: Package, badge: 'parts' },
]

// Admin/Barbara tabs
const ADMIN_TABS = [
  { id: 'dashboard',   label: 'Dashboard', icon: LayoutDashboard },
  { id: 'workorders',  label: 'Munkák',    icon: Hammer, badge: 'open' },
  { id: 'checkin',     label: 'Check-In',  icon: Camera },
  { id: 'customers',   label: 'Ügyfelek',  icon: Package },
]

export function MobileBottomNav({ activePage, onNavigate, role, badges = {} }: MobileBottomNavProps) {
  const tabs = role === 'mechanic' ? MECHANIC_TABS : ADMIN_TABS

  return (
    <nav className="mobile-nav fixed bottom-0 left-0 right-0 bg-[#0B1E3D] border-t border-white/10 flex md:hidden z-30">
      {tabs.map(tab => {
        const Icon = tab.icon
        const isActive = activePage === tab.id
        const badgeCount = tab.badge ? badges[tab.badge] : undefined
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className={cn(
              'flex-1 flex flex-col items-center justify-center py-1 gap-0 relative transition-colors',
              isActive ? 'text-[#C9A84C]' : 'text-white/40 active:text-white/70'
            )}
          >
            <div className="relative">
              <Icon size={18} />
              {badgeCount !== undefined && badgeCount > 0 && (
                <span className="absolute -top-1 -right-1.5 bg-[#C9384C] text-white text-[8px] font-bold min-w-[14px] h-3.5 flex items-center justify-center rounded-full px-0.5">
                  {badgeCount}
                </span>
              )}
            </div>
            <span className="text-[9px] font-medium leading-tight mt-0.5">{tab.label}</span>
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-[#C9A84C] rounded-full" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
