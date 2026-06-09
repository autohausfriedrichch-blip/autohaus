'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCheck, Trash2, Filter, Search, ExternalLink,
  AlertTriangle, Info, Zap, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

// ─── Type meta ────────────────────────────────────────────────────────────────

const PRIORITY_CFG = {
  urgent: { label: 'Sürgős',  color: 'bg-red-100 text-red-700 border-red-200',    dot: 'bg-red-500',    icon: Zap },
  high:   { label: 'Magas',   color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400', icon: AlertTriangle },
  normal: { label: 'Normál',  color: 'bg-blue-50 text-blue-700 border-blue-100',  dot: 'bg-blue-400',   icon: Info },
  low:    { label: 'Alacsony',color: 'bg-gray-50 text-gray-600 border-gray-200',  dot: 'bg-gray-300',   icon: Info },
}

const TYPE_LABELS: Record<string, string> = {
  workorder_assigned: 'Munkalap kiosztva',
  workorder_status: 'Státusz változás',
  workorder_started: 'Munka megkezdve',
  workorder_checkin: 'Check-In',
  workorder_repair_done: 'Javítás kész',
  workorder_qc_done: 'QC kész',
  workorder_returned: 'Visszaadva Barbarának',
  workorder_closed: 'Munkalap lezárva',
  photo_uploaded: 'Fotó feltöltve',
  photo_checkin: 'Check-In fotók',
  photo_checkout: 'Check-Out fotók',
  task_assigned: 'Feladat kiosztva',
  task_done: 'Feladat kész',
  task_delayed: 'Feladat késik',
  task_problem: 'Probléma jelölve',
  quote_created: 'Árajánlat létrehozva',
  quote_sent: 'Árajánlat elküldve',
  quote_accepted: 'Árajánlat elfogadva',
  quote_rejected: 'Árajánlat elutasítva',
  quote_expired: 'Árajánlat lejárt',
  message_whatsapp: 'WhatsApp üzenet',
  message_email: 'Email',
  message_reply: 'Ügyfél válasz',
  callback_due: 'Visszahívás esedékes',
  parts_requested: 'Alkatrész igény',
  parts_ordered: 'Alkatrész megrendelve',
  parts_arrived: 'Alkatrész megérkezett',
  parts_delayed: 'Alkatrész késik',
  qc_needed: 'QC szükséges',
  qc_failed: 'QC hibás',
  qc_approved: 'QC jóváhagyva',
  signature_waiting: 'Aláírásra vár',
  signature_done: 'Aláírás kész',
  system: 'Rendszer',
}

const TYPE_GROUPS: Record<string, string[]> = {
  'Munkalapok': ['workorder_assigned','workorder_status','workorder_started','workorder_checkin','workorder_repair_done','workorder_qc_done','workorder_returned','workorder_closed'],
  'Fotók': ['photo_uploaded','photo_checkin','photo_checkout'],
  'Feladatok': ['task_assigned','task_done','task_delayed','task_problem'],
  'Árajánlatok': ['quote_created','quote_sent','quote_accepted','quote_rejected','quote_expired'],
  'Kommunikáció': ['message_whatsapp','message_email','message_reply','callback_due'],
  'Alkatrészek': ['parts_requested','parts_ordered','parts_arrived','parts_delayed'],
  'QC': ['qc_needed','qc_failed','qc_approved'],
  'Aláírások': ['signature_waiting','signature_done'],
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  refreshKey: number
  onRefresh: () => void
  onNavigate?: (page: string, id?: string) => void
  userId?: string
}

export function NotificationsPage({ refreshKey, onRefresh, onNavigate, userId }: Props) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    let query = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)
    const { data } = await query
    setNotifications(data || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('notifications-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, () => load())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, () => load())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  const markAllRead = async () => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    toast('Összes értesítés olvasottnak jelölve')
  }

  const deleteNotif = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const handleAction = (n: any) => {
    if (!n.action_type || !n.action_id) return
    markRead(n.id)
    if (n.action_type === 'open_workorder' && onNavigate) onNavigate('workorders', n.action_id)
    if (n.action_type === 'open_quote' && onNavigate) onNavigate('quotes', n.action_id)
    if (n.action_type === 'open_customer' && onNavigate) onNavigate('customers', n.action_id)
    if (n.action_type === 'open_photos' && onNavigate) onNavigate('photos', n.action_id)
  }

  // Apply filters
  const filtered = notifications.filter(n => {
    if (filter === 'unread' && n.is_read) return false
    if (filter === 'urgent' && n.priority !== 'urgent') return false
    if (typeFilter !== 'all') {
      const group = TYPE_GROUPS[typeFilter]
      if (group && !group.includes(n.type)) return false
    }
    if (search) {
      const s = search.toLowerCase()
      return (n.title || '').toLowerCase().includes(s) || (n.message || '').toLowerCase().includes(s)
    }
    return true
  })

  const unreadCount = notifications.filter(n => !n.is_read).length
  const urgentCount = notifications.filter(n => n.priority === 'urgent' && !n.is_read).length

  return (
    <div className="animate-fade-in space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Olvasatlan', value: unreadCount, color: 'text-[#0B1E3D]', bg: 'bg-white', action: () => setFilter('unread') },
          { label: 'Sürgős',     value: urgentCount, color: 'text-red-600',    bg: 'bg-red-50', action: () => setFilter('urgent') },
          { label: 'Összes',     value: notifications.length, color: 'text-[#5a6a80]', bg: 'bg-white', action: () => setFilter('all') },
        ].map(s => (
          <button key={s.label} onClick={s.action} className={`${s.bg} rounded-xl p-3 text-center border border-[rgba(11,30,61,0.08)] hover:border-[rgba(11,30,61,0.2)] transition-colors`}>
            <div className={`text-[22px] font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-[#5a6a80]">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa0b5]" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Keresés értesítések közt..."
            className="w-full pl-9 pr-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[12px] bg-white outline-none focus:border-[#0B1E3D]"
          />
        </div>

        {/* Status tabs */}
        <div className="flex bg-[#F4F5F7] rounded-lg p-0.5 gap-0.5">
          {(['all', 'unread', 'urgent'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${filter === f ? 'bg-white text-[#0B1E3D] shadow-sm' : 'text-[#5a6a80] hover:text-[#0B1E3D]'}`}>
              {f === 'all' ? 'Összes' : f === 'unread' ? 'Olvasatlan' : 'Sürgős'}
            </button>
          ))}
        </div>

        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-[rgba(11,30,61,0.18)] rounded-lg px-3 py-2 text-[12px] bg-white outline-none">
          <option value="all">Minden típus</option>
          {Object.keys(TYPE_GROUPS).map(g => <option key={g} value={g}>{g}</option>)}
        </select>

        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <CheckCheck size={13} /> Összes olvasott
          </Button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center text-[#5a6a80] py-8">Betöltés...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Bell size={32} className="text-[#8fa0b5] mx-auto mb-3" />
          <p className="text-[14px] font-medium text-[#5a6a80]">Nincs értesítés</p>
          <p className="text-[12px] text-[#8fa0b5] mt-1">
            {filter !== 'all' ? 'Módosítsa a szűrőt a többi megtekintéséhez' : 'Új értesítések automatikusan megjelennek'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const pCfg = PRIORITY_CFG[n.priority as keyof typeof PRIORITY_CFG] || PRIORITY_CFG.normal
            const PIcon = pCfg.icon
            return (
              <div
                key={n.id}
                className={`rounded-xl border p-3.5 transition-all ${
                  !n.is_read
                    ? n.priority === 'urgent'
                      ? 'bg-red-50 border-red-200'
                      : n.priority === 'high'
                        ? 'bg-amber-50/50 border-amber-200'
                        : 'bg-blue-50/30 border-blue-100'
                    : 'bg-white border-[rgba(11,30,61,0.08)]'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Priority dot */}
                  <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${pCfg.dot}`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold leading-tight ${!n.is_read ? 'text-[#0B1E3D]' : 'text-[#5a6a80]'}`}>
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="text-[12px] text-[#5a6a80] mt-0.5 leading-snug">{n.message}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {n.priority !== 'normal' && n.priority !== 'low' && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${pCfg.color}`}>
                            {pCfg.label}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-[10px] text-[#8fa0b5]">
                        {new Date(n.created_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {n.type && (
                        <span className="text-[10px] text-[#8fa0b5] bg-[#F4F5F7] px-1.5 py-0.5 rounded">
                          {TYPE_LABELS[n.type] || n.type}
                        </span>
                      )}
                      {n.created_by && (
                        <span className="text-[10px] text-[#8fa0b5]">– {n.created_by}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-2">
                      {n.action_type && n.action_id && (
                        <button
                          onClick={() => handleAction(n)}
                          className="flex items-center gap-1 text-[11px] font-medium text-[#C9A84C] hover:text-[#b8963e] transition-colors"
                        >
                          {n.action_label || 'Megnyitás'} <ChevronRight size={11} />
                        </button>
                      )}
                      {!n.is_read && (
                        <button onClick={() => markRead(n.id)}
                          className="text-[11px] text-[#8fa0b5] hover:text-[#5a6a80] transition-colors">
                          Olvasott
                        </button>
                      )}
                      <button onClick={() => deleteNotif(n.id)}
                        className="text-[11px] text-[#8fa0b5] hover:text-red-500 transition-colors ml-auto">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
