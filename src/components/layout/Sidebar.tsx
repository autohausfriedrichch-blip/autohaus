'use client'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Car, ClipboardList, CalendarDays,
  FileText, Receipt, Building2, FolderOpen, Truck, Star,
  Crown, BarChart2, TrendingUp, Settings, LogOut, Wrench,
  ChevronRight, Camera, CheckSquare, Package, ListTodo, Bell,
  MapPin, Hammer, Cog, Route, MessageSquare, Sparkles
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface NavItem {
  id: string
  label: string
  icon: any
  badge?: string
  roles?: string[]
}

interface NavSection {
  label?: string       // section header label (undefined = no label)
  roles?: string[]     // hide whole section from these roles
  items: NavItem[]
  // items with children (grouped)
  groups?: NavGroup[]
}

interface NavGroup {
  id: string
  label: string
  icon: any
  roles?: string[]
  badge?: string
  children: { id: string; label: string; badge?: string; roles?: string[] }[]
}

// ─── Admin navigation ─────────────────────────────────────────────────────────

const ADMIN_SECTIONS: { label?: string; roles?: string[]; items: NavItem[]; groups?: NavGroup[] }[] = [
  {
    items: [
      { id: 'dashboard',    label: 'Dashboard',   icon: LayoutDashboard },
      { id: 'calendar',     label: 'Calendar',    icon: CalendarDays },
    ],
  },
  {
    label: 'Operations',
    groups: [
      {
        id: 'wo_group',
        label: 'Work Orders',
        icon: ClipboardList,
        badge: 'open',
        children: [
          { id: 'workorders', label: 'All Work Orders', badge: 'open' },
          { id: 'checkin',    label: 'Check-In / Out' },
          { id: 'garage',     label: 'Workshop / Garage' },
          { id: 'photos',     label: 'Photo Documentation' },
        ],
      },
    ],
    items: [
      { id: 'customers', label: 'Customers',    icon: Users },
      { id: 'vehicles',  label: 'Vehicles',     icon: Car },
      { id: 'bookings',  label: 'Appointments', icon: CalendarDays, badge: 'today' },
    ],
  },
  {
    label: 'Business',
    items: [
      { id: 'quotes',   label: 'Quotes',      icon: FileText,  badge: 'quotes', roles: ['super_admin', 'admin'] },
      { id: 'finance',  label: 'Invoices',    icon: Receipt,   roles: ['super_admin', 'admin'] },
      { id: 'fleet',    label: 'Fleet',       icon: Building2, roles: ['super_admin', 'admin'] },
    ],
  },
  {
    label: 'Documents',
    items: [
      { id: 'documents', label: 'Document Center', icon: FolderOpen, roles: ['super_admin', 'admin'] },
    ],
  },
  {
    label: 'Customer Experience',
    items: [
      { id: 'pickup',         label: 'Pickup & Delivery', icon: Truck,         roles: ['super_admin', 'admin'] },
      { id: 'mobile_service', label: 'Mobile Service',    icon: Wrench,        roles: ['super_admin', 'admin'] },
    ],
  },
  {
    label: 'Tools',
    items: [
      { id: 'ai_assistant', label: 'AI Assistant', icon: Sparkles },
      { id: 'tasks',        label: 'Tasks',         icon: ListTodo,  badge: 'tasks' },
    ],
  },
  {
    label: 'Management',
    roles: ['super_admin', 'admin'],
    items: [
      { id: 'reports',       label: 'Reports',       icon: BarChart2,  roles: ['super_admin', 'admin'] },
      { id: 'ceo_dashboard', label: 'Analytics',     icon: TrendingUp, roles: ['super_admin', 'admin'] },
      { id: 'founder_brain', label: 'Founder Brain', icon: Crown,      roles: ['super_admin'] },
    ],
  },
  {
    items: [
      { id: 'settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'admin'] },
    ],
  },
]

// ─── Mechanic navigation (flat) ──────────────────────────────────────────────

const MECHANIC_ITEMS: NavItem[] = [
  { id: 'technician',     label: 'My Work Today',     icon: Hammer },
  { id: 'calendar',       label: 'Calendar',           icon: CalendarDays },
  { id: 'workorders',     label: 'Active Work Orders', icon: ClipboardList, badge: 'open' },
  { id: 'checkin',        label: 'Check-In / Out',     icon: CheckSquare },
  { id: 'mobile_service', label: 'Mobile Service',     icon: Truck },
  { id: 'route_planner',  label: 'Route Planner',      icon: Route },
  { id: 'photos',         label: 'Photos',             icon: Camera },
  { id: 'tasks',          label: 'Tasks',              icon: ListTodo,      badge: 'tasks' },
  { id: 'parts',          label: 'Parts Request',      icon: Cog,           badge: 'parts' },
  { id: 'ai_assistant',   label: 'AI Assistant',       icon: Sparkles },
]

// ─── Helper ───────────────────────────────────────────────────────────────────

function groupContainsPage(group: NavGroup, page: string) {
  return group.children.some(c => c.id === page)
}

function findGroupParent(page: string): string | null {
  for (const section of ADMIN_SECTIONS) {
    for (const group of section.groups || []) {
      if (groupContainsPage(group, page)) return group.id
    }
  }
  return null
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

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

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const parent = findGroupParent(activePage)
    return parent ? new Set([parent]) : new Set()
  })

  useEffect(() => {
    const parent = findGroupParent(activePage)
    if (parent) setExpanded(prev => prev.has(parent) ? prev : new Set([...prev, parent]))
  }, [activePage])

  function toggle(id: string) {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function navigate(page: string) { onNavigate(page); onClose?.() }

  function b(key?: string) { return key ? (badges[key] || 0) : 0 }

  function roleOk(roles?: string[]) {
    if (!roles) return true
    if (!userRoleKey) return true
    return roles.includes(userRoleKey)
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/50 z-[39] md:hidden" onClick={onClose} />}
      <aside className={cn(
        'w-[240px] min-w-[240px] bg-[#0D0D0D] flex flex-col overflow-hidden relative z-40',
        'border-r border-r-[rgba(200,16,46,0.15)]',
        'max-md:fixed max-md:top-0 max-md:left-0 max-md:h-full max-md:transition-transform max-md:duration-300',
        isOpen ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
      )}>

        {/* ── Logo ── */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.05] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 relative"
                 style={{ background: 'linear-gradient(135deg, #1a1a1a, #242424)', border: '1px solid rgba(200,16,46,0.4)' }}>
              <span className="font-['Montserrat'] font-black text-[15px] text-[#E6E6E6]">AF</span>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[2px] rounded-full bg-[#C8102E]" />
            </div>
            <div>
              <div className="font-['Montserrat'] text-[13px] font-bold text-white tracking-[0.5px] leading-tight">AUTOHAUS FRIEDRICH</div>
              <div className="text-[9px] text-[#555] tracking-[2px] uppercase mt-0.5">Swiss Garage OS</div>
            </div>
          </div>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 py-2 overflow-y-auto scrollbar-hide">

          {isMechanic ? (
            // Mechanic flat nav
            <>
              <div className="section-label">Mechanic Menu</div>
              {MECHANIC_ITEMS.map(item => {
                const Icon = item.icon
                const isActive = activePage === item.id
                const badge = b(item.badge)
                return (
                  <SidebarItem
                    key={item.id}
                    icon={<Icon size={15} />}
                    label={item.label}
                    isActive={isActive}
                    badge={badge}
                    onClick={() => navigate(item.id)}
                  />
                )
              })}
            </>
          ) : (
            // Admin sectioned nav
            ADMIN_SECTIONS.map((section, si) => {
              const items = (section.items || []).filter(i => roleOk(i.roles))
              const groups = (section.groups || []).filter(g => roleOk(g.roles))
              if (items.length === 0 && groups.length === 0) return null
              return (
                <div key={si}>
                  {section.label && <div className="section-label">{section.label}</div>}

                  {/* Groups (expandable) */}
                  {groups.map(group => {
                    const GroupIcon = group.icon
                    const isExpanded = expanded.has(group.id)
                    const hasActive = group.children.some(c => c.id === activePage)
                    const groupBadge = b(group.badge)
                    const childBadgeSum = group.children.reduce((s, c) => s + b(c.badge), 0)

                    return (
                      <div key={group.id}>
                        <button
                          onClick={() => toggle(group.id)}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-5 py-[8px] text-[12.5px] transition-all border-l-2 text-left',
                            hasActive
                              ? 'text-white border-l-[#C8102E] bg-[rgba(200,16,46,0.08)]'
                              : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border-l-transparent'
                          )}
                        >
                          <GroupIcon size={14} className="shrink-0" />
                          <span className="flex-1 truncate font-medium">{group.label}</span>
                          {!isExpanded && childBadgeSum > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#C8102E] text-white shrink-0 mr-1">
                              {childBadgeSum}
                            </span>
                          )}
                          <ChevronRight size={12} className={cn('shrink-0 text-white/20 transition-transform duration-200', isExpanded && 'rotate-90')} />
                        </button>

                        {isExpanded && (
                          <div className="pb-1">
                            {group.children.filter(c => roleOk(c.roles)).map(child => {
                              const isActive = activePage === child.id
                              const cb = b(child.badge)
                              return (
                                <button
                                  key={child.id}
                                  onClick={() => navigate(child.id)}
                                  className={cn(
                                    'w-full flex items-center gap-2 pl-[42px] pr-5 py-[7px] text-[12px] transition-all border-l-2 text-left',
                                    isActive
                                      ? 'text-[#C8102E] bg-[rgba(200,16,46,0.09)] border-l-[#C8102E]'
                                      : 'text-white/35 hover:text-white/70 hover:bg-white/[0.03] border-l-transparent'
                                  )}
                                >
                                  <span className="w-1 h-1 rounded-full bg-current shrink-0 opacity-50" />
                                  <span className="flex-1 truncate">{child.label}</span>
                                  {cb > 0 && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#C8102E] text-white shrink-0">
                                      {cb}
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

                  {/* Direct items */}
                  {items.map(item => {
                    const Icon = item.icon
                    const isActive = activePage === item.id
                    const badge = b(item.badge)
                    return (
                      <SidebarItem
                        key={item.id}
                        icon={<Icon size={14} />}
                        label={item.label}
                        isActive={isActive}
                        badge={badge}
                        onClick={() => navigate(item.id)}
                      />
                    )
                  })}
                </div>
              )
            })
          )}
        </nav>

        {/* ── User footer ── */}
        <div className="px-4 py-3.5 border-t border-white/[0.05] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[rgba(200,16,46,0.15)] border border-[rgba(200,16,46,0.4)] flex items-center justify-center text-[11px] font-bold text-[#C8102E] shrink-0">
              {userInitials || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] text-white font-medium truncate">{userName || 'Loading...'}</div>
              <div className="text-[10px] text-white/30 truncate">{userRole}</div>
            </div>
            <button onClick={onLogout} className="text-white/30 hover:text-white/70 transition-colors p-1.5 rounded-lg hover:bg-white/5" title="Sign out">
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}

// ─── Reusable sidebar item ────────────────────────────────────────────────────

function SidebarItem({ icon, label, isActive, badge, onClick }: {
  icon: React.ReactNode
  label: string
  isActive: boolean
  badge?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-5 py-[8px] text-[12.5px] transition-all border-l-2 text-left font-medium',
        isActive
          ? 'text-white bg-[rgba(200,16,46,0.10)] border-l-[#C8102E]'
          : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04] border-l-transparent'
      )}
    >
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {(badge ?? 0) > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#C8102E] text-white shrink-0">
          {badge}
        </span>
      )}
    </button>
  )
}
