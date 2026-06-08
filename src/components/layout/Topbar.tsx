'use client'
import { Menu, RefreshCw, Plus, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TopbarProps {
  title: string
  onMenuClick: () => void
  onRefresh: () => void
  onNewItem?: () => void
  newItemLabel?: string
  userRoleKey?: string
}

export function Topbar({ title, onMenuClick, onRefresh, onNewItem, newItemLabel, userRoleKey }: TopbarProps) {
  const now = new Date()
  const dateStr = format(now, 'EEEE, d. MMMM yyyy', { locale: de })
  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const isAdmin = userRoleKey === 'super_admin' || userRoleKey === 'admin'

  const loadNotifications = async () => {
    if (!isAdmin) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
  }

  useEffect(() => {
    loadNotifications()
    if (!isAdmin) return
    // Poll every 30s for new notifications
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [isAdmin])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
    loadNotifications()
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <div
      className="bg-white border-b border-[rgba(11,30,61,0.18)] flex items-center px-4 gap-3 shrink-0"
      style={{ minHeight: 56, paddingTop: 'max(0px, env(safe-area-inset-top, 0px))' }}
    >
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

      {/* Notification bell – admin only */}
      {isAdmin && (
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => { setOpen(v => !v); if (!open) loadNotifications() }}
            className="relative text-[#5a6a80] hover:text-[#0B1E3D] transition-colors p-2 rounded-lg hover:bg-[#F4F5F7]"
            style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 bg-[#C9384C] text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <span className="font-semibold text-[#0B1E3D] text-sm">Értesítések</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-[#C9A84C] hover:underline">Összes olvasott</button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[#5a6a80]">Nincs értesítés</div>
                ) : notifications.map(n => (
                  <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 transition-colors ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? 'bg-[#C9A84C]' : 'bg-gray-200'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0B1E3D] leading-tight">{n.title}</p>
                        <p className="text-xs text-[#5a6a80] mt-0.5 leading-snug">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{n.created_at ? new Date(n.created_at).toLocaleString('hu-HU') : ''}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

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
