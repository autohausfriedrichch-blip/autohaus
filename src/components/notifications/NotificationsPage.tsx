'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCheck, Trash2, Info, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'

interface Notif {
  id: string
  type: string
  title: string
  message: string
  is_read: boolean
  created_at: string
}

interface Props {
  refreshKey?: number
  onRefresh?: () => void
  onNavigate?: (page: string, id?: string) => void
}

export function NotificationsPage({ refreshKey, onRefresh, onNavigate }: Props = {}) {
  const supabase = createClient()
  const { toast } = useToast()
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    setNotifs(data || [])
    setLoading(false)
  }

  async function markRead(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false)
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    toast('Minden értesítés olvasottként jelölve')
  }

  async function deleteNotif(id: string) {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  const displayed = filter === 'unread' ? notifs.filter(n => !n.is_read) : notifs
  const unreadCount = notifs.filter(n => !n.is_read).length

  function typeIcon(type: string) {
    if (type.includes('error') || type.includes('overdue')) return <AlertCircle size={16} className="text-red-500" />
    if (type.includes('success') || type.includes('approved')) return <CheckCircle size={16} className="text-green-500" />
    return <Info size={16} className="text-blue-500" />
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell size={22} className="text-[#C9A84C]" />
          <div>
            <h1 className="text-xl font-semibold text-[#1a2942]">Értesítések</h1>
            <p className="text-sm text-[#5a6a80]">{unreadCount} olvasatlan</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            <CheckCheck size={13} /> Mind olvasott
          </Button>
        )}
      </div>

      <div className="flex gap-2 mb-4">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${filter === f ? 'bg-[#0B1E3D] text-white' : 'bg-white border border-[#e0e4e8] text-[#5a6a80] hover:border-[#0B1E3D]'}`}>
            {f === 'all' ? 'Összes' : `Olvasatlan (${unreadCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-[#9aabb8] text-center py-8">Betöltés...</div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e8ecf0] flex flex-col items-center justify-center py-12 gap-2">
          <Bell size={32} className="text-[#e0e4e8]" />
          <p className="text-sm text-[#9aabb8]">Nincs értesítés</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map(n => (
            <div key={n.id}
              className={`bg-white rounded-xl border p-4 flex items-start gap-3 transition-colors ${!n.is_read ? 'border-[#C9A84C]/30 bg-[rgba(201,168,76,0.04)]' : 'border-[#e8ecf0]'}`}
              onClick={() => !n.is_read && markRead(n.id)}>
              <div className="mt-0.5">{typeIcon(n.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#1a2942]">{n.title}</span>
                  {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#C9A84C] shrink-0" />}
                </div>
                <p className="text-[12px] text-[#5a6a80] mt-0.5">{n.message}</p>
                <p className="text-[10px] text-[#9aabb8] mt-1">
                  {new Date(n.created_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button onClick={e => { e.stopPropagation(); deleteNotif(n.id) }}
                className="text-[#d0d8e0] hover:text-red-400 transition-colors p-1">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
