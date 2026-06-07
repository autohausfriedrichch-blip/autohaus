'use client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Calendar, Users, Car, ClipboardList, CheckSquare,
  Truck, Wrench, Route, MessageCircle, BarChart2, Settings,
  Camera, FileText, Package, LogOut, ChevronRight, Building2
} from 'lucide-react'

const navItems = [
  {
    section: 'Hauptmenü',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'calendar', label: 'Kalender', icon: Calendar, badge: 'today' },
      { id: 'customers', label: 'Kunden', icon: Users },
      { id: 'vehicles', label: 'Fahrzeuge', icon: Car },
      { id: 'workorders', label: 'Munkalapok', icon: ClipboardList, badge: 'open' },
      { id: 'bookings', label: 'Foglalások', icon: Calendar },
    ]
  },
  {
    section: 'Dienste',
    items: [
      { id: 'checkin', label: 'Check-In', icon: CheckSquare },
      { id: 'mobile', label: 'Mobil Reifen', icon: Truck },
      { id: 'detailing', label: 'Detailing', icon: Car },
      { id: 'garage', label: 'Garázs', icon: Wrench },
      { id: 'pickup', label: 'Hozom-Viszem', icon: Route },
    ]
  },
  {
    section: 'Verwaltung',
    items: [
      { id: 'quotes', label: 'Árajánlatok', icon: FileText, badge: 'quotes' },
      { id: 'photos', label: 'Fotók', icon: Camera },
      { id: 'communication', label: 'WhatsApp Napló', icon: MessageCircle },
      { id: 'fleet', label: 'Flotta', icon: Building2 },
      { id: 'services', label: 'Szolgáltatások', icon: Package },
      { id: 'reports', label: 'Berichte', icon: BarChart2 },
      { id: 'settings', label: 'Beállítások', icon: Settings },
    ]
  }
]

interface SidebarProps {
  activePage: string
  onNavigate: (page: string) => void
  onLogout: () => void
  userName?: string
  userRole?: string
  userInitials?: string
  badges?: Record<string, number>
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({
  activePage, onNavigate, onLogout, userName, userRole, userInitials,
  badges = {}, isOpen, onClose
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[39] md:hidden" onClick={onClose} />
      )}
      <aside className={cn(
        'w-[230px] min-w-[230px] bg-[#0B1E3D] flex flex-col overflow-y-auto relative z-40',
        'border-r border-r-[rgba(201,168,76,0.15)]',
        'max-md:fixed max-md:top-0 max-md:left-0 max-md:h-full max-md:transition-transform max-md:duration-300',
        isOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
      )}>
        {/* Logo */}
        <div className="px-[18px] pt-[22px] pb-[18px] border-b border-white/5">
          <div className="w-9 h-9 bg-[#C9A84C] rounded-lg flex items-center justify-center mb-2.5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0B1E3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <div className="font-['DM_Serif_Display'] text-[16px] text-white leading-tight">Autohaus Friedrich</div>
          <div className="text-[10px] text-white/35 tracking-[2px] uppercase mt-0.5">Operations</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2">
          {navItems.map(section => (
            <div key={section.section} className="pt-3.5 pb-1.5">
              <div className="text-[9px] text-white/25 tracking-[2px] uppercase px-[18px] pb-2">{section.section}</div>
              {section.items.map(item => {
                const Icon = item.icon
                const isActive = activePage === item.id
                const badgeCount = item.badge ? badges[item.badge] : undefined
                return (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); onClose?.() }}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-[18px] py-[9px] text-[13px] transition-all duration-200 border-l-2 text-left',
                      isActive
                        ? 'text-white bg-[rgba(201,168,76,0.12)] border-l-[#C9A84C]'
                        : 'text-white/55 hover:text-white/90 hover:bg-white/5 border-l-transparent'
                    )}
                  >
                    <Icon size={17} className="shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {badgeCount !== undefined && badgeCount > 0 && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xl bg-[#C9384C] text-white">
                        {badgeCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-[18px] py-3.5 border-t border-white/5 mt-auto">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[rgba(201,168,76,0.2)] border border-[rgba(201,168,76,0.4)] flex items-center justify-center text-[11px] font-semibold text-[#C9A84C] shrink-0">
              {userInitials || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-white font-medium truncate">{userName || 'Laden...'}</div>
              <div className="text-[10px] text-white/35">{userRole}</div>
            </div>
            <button
              onClick={onLogout}
              className="text-white/40 hover:text-white/80 transition-colors p-1"
              title="Abmelden"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
