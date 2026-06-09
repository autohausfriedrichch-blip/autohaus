'use client'
import { Menu, RefreshCw, Plus, Bell, CheckCheck, ChevronRight, Zap, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface TopbarProps {
  title: string
  onMenuClick: () => void
  onRefresh: () => void
  onNewItem?: () => void
  newItemLabel?: string
  userRoleKey?: string
  userId?: string
  onNavigate?: (page: string, id?: string) => void
}

const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high:   'bg-amber-400',
  normal: 'bg-blue-400',
  low:    'bg-gray-300',
}

export function Topbar({ title, onMenuClick, onRefresh, onNewItem, newItemLabel, userRoleKey, userId, onNavigate }: TopbarProps) {
  const dateStr = format(new Date(), 'EEEE, yyyy. MMMM d.', { locale: hu })
  const [notifications, setNotifications] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const isAdmin = userRoleKey === 'super_admin' || userRoleKey === 'admin'

  const loadNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)
    setNotifications(data || [])
  }, [])

  useEffect(() => {
    loadNotifications()

    // Realtime subscription
    const channel = supabase.channel('topbar-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => [payload.new, ...prev.slice(0, 29)])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, () => loadNotifications())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [loadNotifications])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const handleAction = (n: any) => {
    markRead(n.id)
    setOpen(false)
    if (!n.action_type || !n.action_id || !onNavigate) return
    if (n.action_type === 'open_workorder') onNavigate('workorders', n.action_id)
    else if (n.action_type === 'open_quote') onNavigate('quotes', n.action_id)
    else if (n.action_type === 'open_customer') onNavigate('customers', n.action_id)
    else if (n.action_type === 'open_photos') onNavigate('photos', n.action_id)
  }

  const unreadCount = notifications.filter(n => !n.is_read).length
  const urgentUnread = notifications.filter(n => !n.is_read && n.priority === 'urgent').length

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

      {/* Notification bell */}
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setOpen(v => !v)}
          className={`relative p-2 rounded-lg transition-colors ${urgentUnread > 0 ? 'text-red-500 hover:bg-red-50' : 'text-[#5a6a80] hover:text-[#0B1E3D] hover:bg-[#F4F5F7]'}`}
          style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          title="Értesítések"
        >
          <Bell size={18} className={urgentUnread > 0 ? 'animate-pulse' : ''} />
          {unreadCount > 0 && (
            <span className={`absolute top-1.5 right-1.5 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5 ${urgentUnread > 0 ? 'bg-red-500' : 'bg-[#C9384C]'}`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="notif-dropdown absolute right-0 top-full mt-1.5 w-[340px] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-[#0B1E3D]" />
                <span className="font-semibold text-[#0B1E3D] text-[13px]">Értesítések</span>
                {unreadCount > 0 && (
                  <span className="bg-[#C9384C] text-white text-[9px] font-bold rounded-full min-w-[18px] h-4 flex items-center justify-center px-1">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-[11px] text-[#C9A84C] hover:text-[#b8963e] font-medium transition-colors flex items-center gap-1">
                    <CheckCheck size={11}/> Összes olvasott
                  </button>
                )}
                {onNavigate && (
                  <button
                    onClick={() => { setOpen(false); onNavigate('notifications') }}
                    className="text-[11px] text-[#5a6a80] hover:text-[#0B1E3D] transition-colors"
                  >
                    Összes
                  </button>
                )}
              </div>
            </div>

            {/* Urgent banner */}
            {urgentUnread > 0 && (
              <div className="bg-red-50 border-b border-red-100 px-4 py-2 flex items-center gap-2">
                <Zap size={12} className="text-red-500" />
                <span className="text-[11px] font-semibold text-red-700">{urgentUnread} sürgős értesítés</span>
              </div>
            )}

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-[13px] text-[#5a6a80]">Nincs értesítés</div>
              ) : notifications.slice(0, 15).map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group ${
                    !n.is_read
                      ? n.priority === 'urgent' ? 'bg-red-50/60' : n.priority === 'high' ? 'bg-amber-50/40' : 'bg-blue-50/30'
                      : ''
                  }`}
                  onClick={() => handleAction(n)}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${PRIORITY_DOT[n.priority] || PRIORITY_DOT.normal}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-[12.5px] leading-tight ${!n.is_read ? 'font-semibold text-[#0B1E3D]' : 'font-medium text-[#5a6a80]'}`}>
                          {n.title}
                        </p>
                        {n.priority === 'urgent' && (
                          <Zap size={11} className="text-red-500 shrink-0 mt-0.5" />
                        )}
                        {n.priority === 'high' && !n.is_read && (
                          <AlertTriangle size={11} className="text-amber-500 shrink-0 mt-0.5" />
                        )}
                      </div>
                      {n.message && (
                        <p className="text-[11px] text-[#5a6a80] mt-0.5 leading-snug line-clamp-2">{n.message}</p>
                      )}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-[#8fa0b5]">
                          {new Date(n.created_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          {n.created_by && ` · ${n.created_by}`}
                        </span>
                        {n.action_type && (
                          <ChevronRight size={11} className="text-[#C9A84C] opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {notifications.length > 15 && (
              <div className="border-t border-gray-100 px-4 py-2.5 text-center">
                <button
                  onClick={() => { setOpen(false); onNavigate?.('notifications') }}
                  className="text-[12px] text-[#C9A84C] font-medium hover:text-[#b8963e] transition-colors"
                >
                  Összes megtekintése ({notifications.length} értesítés)
                </button>
              </div>
            )}
          </div>
        )}
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
          <span className="hidden sm:inline">{newItemLabel || 'Új'}</span>
        </Button>
      )}
    </div>
  )
}
