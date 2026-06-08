'use client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Calendar, Users, Car, ClipboardList, CheckSquare,
  Truck, Wrench, Route, MessageCircle, BarChart2, Settings,
  Camera, FileText, Package, LogOut, Building2, ListTodo,
  Cog, Hammer, Star, CreditCard, Archive, Crown, Bell,
  TrendingUp, MapPin, History, ScanLine
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  icon: any
  badge?: string
  roles?: string[]
}

interface NavSection {
  section: string
  items: NavItem[]
  roles?: string[]
}

const navItems: NavSection[] = [
  {
    section: 'Főmenü',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'ceo_dashboard', label: 'CEO Dashboard', icon: TrendingUp, roles: ['super_admin','admin'] },
      { id: 'bookings', label: 'Foglalások', icon: Calendar, badge: 'today', roles: ['super_admin','admin'] },
      { id: 'customers', label: 'Ügyfelek', icon: Users, roles: ['super_admin','admin'] },
      { id: 'customer_value', label: 'Ügyfélerték', icon: Crown, roles: ['super_admin','admin'] },
      { id: 'vehicles', label: 'Járművek', icon: Car, roles: ['super_admin','admin'] },
      { id: 'vehicle_lifecycle', label: 'Jármű élettörténet', icon: History, roles: ['super_admin','admin'] },
      { id: 'registration_scan', label: 'Forgalmi OCR', icon: ScanLine, roles: ['super_admin','admin'] },
      { id: 'workorders', label: 'Munkalapok', icon: ClipboardList, badge: 'open' },
    ]
  },
  {
    section: 'Technikus',
    roles: ['mechanic'],
    items: [
      { id: 'technician', label: 'Az én munkáim', icon: Hammer, roles: ['mechanic'] },
      { id: 'route_planner', label: 'Útvonaltervező', icon: MapPin, roles: ['mechanic'] },
      { id: 'parts', label: 'Alkatrész igénylés', icon: Cog, roles: ['mechanic'] },
    ]
  },
  {
    section: 'Szolgáltatások',
    items: [
      { id: 'checkin', label: 'Check-In / Out', icon: CheckSquare },
      { id: 'garage', label: 'Garázs / Műhely', icon: Wrench },
      { id: 'pickup', label: 'Hozom-Viszem', icon: Route },
      { id: 'mobile_service', label: 'Mobile Service', icon: Truck },
      { id: 'route_planner', label: 'Útvonaltervező', icon: MapPin, roles: ['super_admin','admin'] },
    ]
  },
  {
    section: 'Adminisztráció',
    roles: ['super_admin','admin'],
    items: [
      { id: 'quotes', label: 'Árajánlatok', icon: FileText, badge: 'quotes' },
      { id: 'profit', label: 'Profit & Költség', icon: TrendingUp },
      { id: 'reminders', label: 'Emlékeztetők', icon: Bell },
      { id: 'tasks', label: 'Feladatok', icon: ListTodo, badge: 'tasks' },
      { id: 'parts_admin', label: 'Alkatrészek', icon: Cog, badge: 'parts' },
      { id: 'parts_inventory', label: 'Alkatrész raktár', icon: Package },
      { id: 'photos', label: 'Fotók', icon: Camera },
      { id: 'communication', label: 'Kommunikáció', icon: MessageCircle },
      { id: 'fleet', label: 'Flotta', icon: Building2 },
      { id: 'services', label: 'Árlista', icon: Package },
      { id: 'reviews', label: 'Review kérések', icon: Star },
      { id: 'reports', label: 'KPI / Riportok', icon: BarChart2 },
    ]
  },
  {
    section: 'Rendszer',
    roles: ['super_admin', 'admin'],
    items: [
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
  userRoleKey?: string
  userInitials?: string
  badges?: Record<string, number>
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({
  activePage, onNavigate, onLogout, userName, userRole, userRoleKey,
  userInitials, badges = {}, isOpen, onClose
}: SidebarProps) {
  const visibleSections = navItems.filter(section => {
    if (!section.roles) return true
    if (!userRoleKey) return true
    return section.roles.includes(userRoleKey)
  })

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[39] md:hidden" onClick={onClose} />
      )}
      <aside className={cn(
        'w-[220px] min-w-[220px] bg-[#0B1E3D] flex flex-col overflow-y-auto relative z-40',
        'border-r border-r-[rgba(201,168,76,0.15)]',
        'max-md:fixed max-md:top-0 max-md:left-0 max-md:h-full max-md:transition-transform max-md:duration-300',
        isOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
      )}>
        {/* Logo */}
        <div className="px-[16px] pt-[20px] pb-[16px] border-b border-white/5">
          <div className="w-9 h-9 bg-[#C9A84C] rounded-lg flex items-center justify-center mb-2.5">
            <Wrench size={18} color="#0B1E3D" />
          </div>
          <div className="font-['DM_Serif_Display'] text-[15px] text-white leading-tight">Autohaus Friedrich</div>
          <div className="text-[9px] text-white/35 tracking-[2px] uppercase mt-0.5">Swiss Operations</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {visibleSections.map(section => {
            const visibleItems = section.items.filter(item => {
              if (!item.roles) return true
              if (!userRoleKey) return true
              return item.roles.includes(userRoleKey)
            })
            if (visibleItems.length === 0) return null
            return (
              <div key={section.section} className="pt-3 pb-1">
                <div className="text-[9px] text-white/25 tracking-[2px] uppercase px-[16px] pb-1.5">{section.section}</div>
                {visibleItems.map(item => {
                  const Icon = item.icon
                  const isActive = activePage === item.id
                  const badgeCount = item.badge ? badges[item.badge] : undefined
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onNavigate(item.id); onClose?.() }}
                      className={cn(
                        'w-full flex items-center gap-2.5 px-[16px] py-[8px] text-[12.5px] transition-all duration-200 border-l-2 text-left',
                        isActive
                          ? 'text-white bg-[rgba(201,168,76,0.12)] border-l-[#C9A84C]'
                          : 'text-white/50 hover:text-white/85 hover:bg-white/5 border-l-transparent'
                      )}
                    >
                      <Icon size={16} className="shrink-0" />
                      <span className="flex-1 truncate">{item.label}</span>
                      {badgeCount !== undefined && badgeCount > 0 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xl bg-[#C9384C] text-white shrink-0">
                          {badgeCount}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-[16px] py-3 border-t border-white/5 mt-auto shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[rgba(201,168,76,0.2)] border border-[rgba(201,168,76,0.4)] flex items-center justify-center text-[11px] font-semibold text-[#C9A84C] shrink-0">
              {userInitials || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-white font-medium truncate">{userName || 'Betöltés...'}</div>
              <div className="text-[10px] text-white/35">{userRole}</div>
            </div>
            <button
              onClick={onLogout}
              className="text-white/40 hover:text-white/80 transition-colors p-1"
              title="Kijelentkezés"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
