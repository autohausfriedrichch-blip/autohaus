'use client'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Car, ClipboardList, CheckSquare,
  Wrench, Route, MessageCircle, BarChart2, Settings,
  Camera, FileText, Package, LogOut, Building2, ListTodo,
  Cog, Hammer, Star, TrendingUp, MapPin, History, ScanLine,
  Truck, ChevronRight, Crown, Bell, BarChart, Calendar
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavChild {
  id: string
  label: string
  badge?: string
  roles?: string[]
}

interface NavGroup {
  id: string
  label: string
  icon: any
  roles?: string[]
  // direct navigation (no children)
  direct?: boolean
  badge?: string
  children?: NavChild[]
}

// ─── Admin / Barbara navigation ──────────────────────────────────────────────

const ADMIN_NAV: NavGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    direct: true,
  },
  {
    id: 'calendar',
    label: 'Naptár',
    icon: Calendar,
    direct: true,
  },
  {
    id: 'customers_group',
    label: 'Ügyfelek & Járművek',
    icon: Users,
    roles: ['super_admin', 'admin'],
    children: [
      { id: 'customers',          label: 'Ügyfelek' },
      { id: 'customer_value',     label: 'Ügyfélerték' },
      { id: 'vehicles',           label: 'Járművek' },
      { id: 'vehicle_lifecycle',  label: 'Jármű élettörténet' },
      { id: 'registration_scan',  label: 'Forgalmi OCR' },
      { id: 'fleet',              label: 'Flotta / Cégek' },
    ],
  },
  {
    id: 'workshop_group',
    label: 'Műhely & Munkalapok',
    icon: Wrench,
    children: [
      { id: 'workorders',       label: 'Munkalapok',        badge: 'open' },
      { id: 'checkin',          label: 'Check-In / Out' },
      { id: 'garage',           label: 'Garázs / Műhely' },
      { id: 'parts_admin',      label: 'Alkatrészek',       badge: 'parts' },
      { id: 'parts_inventory',  label: 'Alkatrész raktár' },
      { id: 'photos',           label: 'Fotók' },
    ],
  },
  {
    id: 'bookings_group',
    label: 'Foglalások & Ütemezés',
    icon: Calendar,
    roles: ['super_admin', 'admin'],
    children: [
      { id: 'bookings',       label: 'Foglalások',      badge: 'today' },
      { id: 'mobile_service', label: 'Mobile Service' },
      { id: 'pickup',         label: 'Hozom-Viszem' },
      { id: 'route_planner',  label: 'Útvonaltervező' },
    ],
  },
  {
    id: 'docs_group',
    label: 'Ajánlatok & Dokumentumok',
    icon: FileText,
    roles: ['super_admin', 'admin'],
    children: [
      { id: 'quotes',   label: 'Árajánlatok', badge: 'quotes' },
      { id: 'reports',  label: 'KPI / Riportok' },
    ],
  },
  {
    id: 'communication_group',
    label: 'Kommunikáció',
    icon: MessageCircle,
    roles: ['super_admin', 'admin'],
    children: [
      { id: 'communication', label: 'Üzenetek' },
      { id: 'reminders',     label: 'Emlékeztetők' },
      { id: 'reviews',       label: 'Review kérések' },
    ],
  },
  {
    id: 'finance_group',
    label: 'Pénzügy & Elemzés',
    icon: BarChart,
    roles: ['super_admin', 'admin'],
    children: [
      { id: 'profit',        label: 'Profit & Költség' },
      { id: 'ceo_dashboard', label: 'CEO Dashboard' },
    ],
  },
  {
    id: 'services_group',
    label: 'Szolgáltatások & Készlet',
    icon: Package,
    roles: ['super_admin', 'admin'],
    children: [
      { id: 'services',   label: 'Árlista' },
      { id: 'inventory',  label: 'Készlet & Árlista' },
    ],
  },
  {
    id: 'quality_control',
    label: 'Minőségellenőrzés',
    icon: CheckSquare,
    direct: true,
    roles: ['super_admin', 'admin'],
  },
  {
    id: 'ai_assistant',
    label: 'AI Asszisztens',
    icon: Star,
    direct: true,
    roles: ['super_admin', 'admin', 'mechanic'],
  },
  {
    id: 'tasks',
    label: 'Feladatok',
    icon: ListTodo,
    direct: true,
    badge: 'tasks',
  },
  {
    id: 'settings',
    label: 'Beállítások',
    icon: Settings,
    direct: true,
    roles: ['super_admin', 'admin'],
  },
]

// ─── Karl / Mechanic navigation (flat, no groups) ────────────────────────────

const MECHANIC_NAV: NavGroup[] = [
  { id: 'technician',   label: 'Mai munkáim',         icon: Hammer,       direct: true },
  { id: 'calendar',    label: 'Naptár',              icon: Calendar,     direct: true },
  { id: 'workorders',   label: 'Aktív munkalapok',    icon: ClipboardList, direct: true, badge: 'open' },
  { id: 'checkin',      label: 'Check-In / Out',      icon: CheckSquare,  direct: true },
  { id: 'mobile_service', label: 'Mobile Service',   icon: Truck,        direct: true },
  { id: 'route_planner', label: 'Útvonaltervező',    icon: MapPin,       direct: true },
  { id: 'photos',       label: 'Fotók',               icon: Camera,       direct: true },
  { id: 'tasks',        label: 'Feladatok',            icon: ListTodo,     direct: true, badge: 'tasks' },
  { id: 'parts',        label: 'Alkatrész igénylés',  icon: Cog,          direct: true, badge: 'parts' },
  { id: 'ai_assistant', label: 'AI Asszisztens',      icon: Star,         direct: true },
]

// ─── Helper: which pages belong to a group ───────────────────────────────────

function groupForPage(page: string, nav: NavGroup[]): string | null {
  for (const group of nav) {
    if (group.direct && group.id === page) return null
    if (group.children?.some(c => c.id === page)) return group.id
  }
  return null
}

// ─── Sidebar component ───────────────────────────────────────────────────────

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
  const isMechanic = userRoleKey === 'mechanic'
  const nav = isMechanic ? MECHANIC_NAV : ADMIN_NAV

  // Auto-expand the group that contains the current active page
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const parentId = groupForPage(activePage, ADMIN_NAV)
    return parentId ? new Set([parentId]) : new Set()
  })

  useEffect(() => {
    const parentId = groupForPage(activePage, nav)
    if (parentId) {
      setExpanded(prev => {
        if (prev.has(parentId)) return prev
        return new Set([...prev, parentId])
      })
    }
  }, [activePage])

  function toggleGroup(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function navigate(page: string) {
    onNavigate(page)
    onClose?.()
  }

  function isRoleVisible(roles?: string[]) {
    if (!roles) return true
    if (!userRoleKey) return true
    return roles.includes(userRoleKey)
  }

  function getBadge(badge?: string) {
    if (!badge) return 0
    return badges[badge] || 0
  }

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
        <div className="px-4 pt-5 pb-4 border-b border-white/5 shrink-0">
          <div className="w-9 h-9 bg-[#C9A84C] rounded-lg flex items-center justify-center mb-2.5">
            <Wrench size={18} color="#0B1E3D" />
          </div>
          <div className="font-['DM_Serif_Display'] text-[15px] text-white leading-tight">Autohaus Friedrich</div>
          <div className="text-[9px] text-white/35 tracking-[2px] uppercase mt-0.5">Swiss Operations</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {nav.map(group => {
            if (!isRoleVisible(group.roles)) return null

            const groupBadge = getBadge(group.badge)

            // ── Direct navigation item ───────────────────────────────────
            if (group.direct) {
              const isActive = activePage === group.id
              const Icon = group.icon
              return (
                <button
                  key={group.id}
                  onClick={() => navigate(group.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-4 py-[8px] text-[12.5px] transition-all border-l-2 text-left',
                    isActive
                      ? 'text-white bg-[rgba(201,168,76,0.12)] border-l-[#C9A84C]'
                      : 'text-white/50 hover:text-white/85 hover:bg-white/5 border-l-transparent'
                  )}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="flex-1 truncate">{group.label}</span>
                  {groupBadge > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xl bg-[#C9384C] text-white shrink-0">
                      {groupBadge}
                    </span>
                  )}
                </button>
              )
            }

            // ── Expandable group ─────────────────────────────────────────
            const Icon = group.icon
            const isOpen2 = expanded.has(group.id)
            const hasActiveChild = group.children?.some(c => c.id === activePage)

            // Sum up badges from children
            const childBadgeSum = group.children?.reduce((sum, c) => sum + getBadge(c.badge), 0) || 0

            return (
              <div key={group.id}>
                <button
                  onClick={() => toggleGroup(group.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-4 py-[8px] text-[12.5px] transition-all border-l-2 text-left',
                    hasActiveChild
                      ? 'text-white border-l-[#C9A84C] bg-[rgba(201,168,76,0.06)]'
                      : 'text-white/50 hover:text-white/85 hover:bg-white/5 border-l-transparent'
                  )}
                >
                  <Icon size={15} className="shrink-0" />
                  <span className="flex-1 truncate">{group.label}</span>
                  {!isOpen2 && childBadgeSum > 0 && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xl bg-[#C9384C] text-white shrink-0 mr-1">
                      {childBadgeSum}
                    </span>
                  )}
                  <ChevronRight
                    size={13}
                    className={cn('shrink-0 text-white/25 transition-transform duration-200', isOpen2 && 'rotate-90')}
                  />
                </button>

                {/* Children */}
                {isOpen2 && (
                  <div className="pb-1">
                    {group.children?.filter(c => isRoleVisible(c.roles)).map(child => {
                      const isChildActive = activePage === child.id
                      const childBadge = getBadge(child.badge)
                      return (
                        <button
                          key={child.id}
                          onClick={() => navigate(child.id)}
                          className={cn(
                            'w-full flex items-center gap-2 pl-[38px] pr-4 py-[7px] text-[12px] transition-all border-l-2 text-left',
                            isChildActive
                              ? 'text-[#C9A84C] bg-[rgba(201,168,76,0.10)] border-l-[#C9A84C]'
                              : 'text-white/40 hover:text-white/75 hover:bg-white/5 border-l-transparent'
                          )}
                        >
                          <span className="w-1 h-1 rounded-full bg-current shrink-0 opacity-60" />
                          <span className="flex-1 truncate">{child.label}</span>
                          {childBadge > 0 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-xl bg-[#C9384C] text-white shrink-0">
                              {childBadge}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User footer */}
        <div className="px-4 py-3 border-t border-white/5 mt-auto shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[rgba(201,168,76,0.2)] border border-[rgba(201,168,76,0.4)] flex items-center justify-center text-[11px] font-semibold text-[#C9A84C] shrink-0">
              {userInitials || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-white font-medium truncate">{userName || 'Betöltés...'}</div>
              <div className="text-[10px] text-white/35 truncate">{userRole}</div>
            </div>
            <button onClick={onLogout} className="text-white/40 hover:text-white/80 transition-colors p-1" title="Kijelentkezés">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
