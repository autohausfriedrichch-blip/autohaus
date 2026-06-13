'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Car, Calendar, FileText, Camera, MessageCircle, Star,
  ChevronRight, LogOut, Wrench, Clock, CheckCircle, AlertCircle, User
} from 'lucide-react'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed:      { label: 'Megerősítve',    color: 'bg-blue-100 text-blue-700' },
  checked_in:     { label: 'Beérkezett',     color: 'bg-indigo-100 text-indigo-700' },
  in_repair:      { label: 'Javítás alatt',  color: 'bg-amber-100 text-amber-700' },
  ready:          { label: 'Kész',           color: 'bg-emerald-100 text-emerald-700' },
  delivered:      { label: 'Átadva',         color: 'bg-gray-100 text-gray-600' },
  draft:          { label: 'Tervezet',       color: 'bg-gray-100 text-gray-600' },
  sent:           { label: 'Elküldve',       color: 'bg-blue-100 text-blue-700' },
  approved:       { label: 'Elfogadva',      color: 'bg-emerald-100 text-emerald-700' },
  rejected:       { label: 'Elutasítva',     color: 'bg-red-100 text-red-700' },
}

export default function CustomerDashboard() {
  const [tab, setTab] = useState('overview')
  const [profile, setProfile] = useState<any>(null)
  const [customer, setCustomer] = useState<any>(null)
  const [vehicles, setVehicles] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [quotes, setQuotes] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [photos, setPhotos] = useState<any[]>([])
  const [reminders, setReminders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/portal'); return }

      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || p.role !== 'customer') { router.replace('/portal'); return }
      setProfile(p)

      const { data: cust } = await supabase.from('customers').select('*').eq('email', user.email).single()
      if (!cust) { setLoading(false); return }
      setCustomer(cust)

      const [vRes, woRes, qRes, bRes, phRes, remRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('customer_id', cust.id).order('created_at', { ascending: false }),
        supabase.from('work_orders').select('*, vehicle:vehicles(make,model,license_plate)').eq('customer_id', cust.id).order('created_at', { ascending: false }).limit(20),
        supabase.from('quotes').select('*').eq('customer_id', cust.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('bookings').select('*, vehicle:vehicles(make,model,license_plate)').eq('customer_id', cust.id).order('scheduled_date', { ascending: false }).limit(10),
        supabase.from('work_order_photos').select('*').in('work_order_id', []).limit(20),
        supabase.from('maintenance_reminders').select('*').eq('customer_id', cust.id).order('due_date').limit(10),
      ])

      setVehicles(vRes.data || [])
      setWorkOrders(woRes.data || [])
      setQuotes(qRes.data || [])
      setBookings(bRes.data || [])
      setReminders(remRes.data || [])

      // Photos: get from work orders
      if (woRes.data && woRes.data.length > 0) {
        const ids = woRes.data.map((w: any) => w.id)
        const { data: ph } = await supabase.from('work_order_photos').select('*').in('work_order_id', ids).limit(30)
        setPhotos(ph || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/portal')
  }

  const handleQuoteAction = async (quoteId: string, action: 'approved' | 'rejected') => {
    await supabase.from('quotes').update({ status: action }).eq('id', quoteId)
    setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: action } : q))
  }

  const sendMessage = async () => {
    if (!message.trim() || !customer) return
    await supabase.from('messages').insert({
      customer_id: customer.id,
      direction: 'inbound',
      channel: 'portal',
      content: message.trim(),
    })
    setMessage('')
    alert('Üzenete elküldve. Hamarosan válaszolunk!')
  }

  if (loading) return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
      <div className="text-[#4a4a4a]">Betöltés...</div>
    </div>
  )

  const tabs = [
    { id: 'overview',  label: 'Áttekintés',      icon: User },
    { id: 'vehicles',  label: 'Autóim',           icon: Car },
    { id: 'workorders',label: 'Munkalapok',       icon: Wrench },
    { id: 'quotes',    label: 'Árajánlatok',      icon: FileText },
    { id: 'bookings',  label: 'Foglalásaim',      icon: Calendar },
    { id: 'photos',    label: 'Fotók',            icon: Camera },
    { id: 'reminders', label: 'Emlékeztetők',     icon: Clock },
    { id: 'message',   label: 'Üzenet',           icon: MessageCircle },
  ]

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      {/* Header */}
      <header className="bg-[#0D0D0D] text-white px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 bg-[#C8102E] rounded-lg flex items-center justify-center shrink-0">
          <Wrench size={16} color="#0D0D0D" />
        </div>
        <div className="flex-1">
          <div className="text-[13px] font-semibold">Autohaus Friedrich</div>
          <div className="text-[10px] text-white/50">Ügyfélportál</div>
        </div>
        <button onClick={handleLogout} className="text-white/50 hover:text-white p-1 transition-colors">
          <LogOut size={16} />
        </button>
      </header>

      {/* Welcome */}
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] px-4 py-3">
        <p className="text-[13px] font-semibold text-[#0D0D0D]">Üdvözöljük, {customer?.full_name || profile?.full_name}!</p>
        <p className="text-[11px] text-[#4a4a4a]">{customer?.phone} · {customer?.email}</p>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-[rgba(0,0,0,0.08)] overflow-x-auto scrollbar-hide">
        <div className="flex gap-0 min-w-max px-2">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-3 text-[12px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? 'border-[#C8102E] text-[#0D0D0D]'
                    : 'border-transparent text-[#4a4a4a] hover:text-[#0D0D0D]'
                }`}
              >
                <Icon size={13} />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto">

        {tab === 'overview' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl p-4 text-center border border-[rgba(0,0,0,0.08)]">
                <div className="text-[22px] font-bold text-[#0D0D0D]">{vehicles.length}</div>
                <div className="text-[11px] text-[#4a4a4a]">Regisztrált jármű</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-[rgba(0,0,0,0.08)]">
                <div className="text-[22px] font-bold text-[#0D0D0D]">{workOrders.length}</div>
                <div className="text-[11px] text-[#4a4a4a]">Szerviz alkalom</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-[rgba(0,0,0,0.08)]">
                <div className="text-[22px] font-bold text-[#C8102E]">{quotes.filter(q => q.status === 'sent').length}</div>
                <div className="text-[11px] text-[#4a4a4a]">Nyitott árajánlat</div>
              </div>
              <div className="bg-white rounded-xl p-4 text-center border border-[rgba(0,0,0,0.08)]">
                <div className="text-[22px] font-bold text-emerald-600">{workOrders.filter(w => w.status === 'delivered').length}</div>
                <div className="text-[11px] text-[#4a4a4a]">Lezárt munkalap</div>
              </div>
            </div>

            {/* Active work orders */}
            {workOrders.filter(w => !['delivered','closed'].includes(w.status)).length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-[12px] font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                  <AlertCircle size={13} /> Folyamatban lévő munkák
                </p>
                {workOrders.filter(w => !['delivered','closed'].includes(w.status)).map(wo => (
                  <div key={wo.id} className="flex items-center justify-between py-1.5 border-b border-amber-100 last:border-0">
                    <div>
                      <span className="text-[11px] font-bold text-[#333333]">{wo.order_number}</span>
                      <span className="text-[11px] text-[#4a4a4a] ml-2">{wo.vehicle?.make} {wo.vehicle?.model}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[wo.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[wo.status]?.label || wo.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Upcoming reminders */}
            {reminders.filter(r => r.status !== 'completed').length > 0 && (
              <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] p-4">
                <p className="text-[12px] font-semibold text-[#0D0D0D] mb-2 flex items-center gap-1.5">
                  <Clock size={13} /> Közelgő szervizek
                </p>
                {reminders.filter(r => r.status !== 'completed').slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1.5 border-b border-[rgba(0,0,0,0.06)] last:border-0">
                    <span className="text-[12px] text-[#0D0D0D]">{r.title}</span>
                    <span className="text-[11px] text-[#888888]">{r.due_date}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Google review */}
            <button
              onClick={() => window.open('https://g.page/r/review', '_blank')}
              className="w-full flex items-center gap-3 bg-white border border-[rgba(0,0,0,0.08)] rounded-xl p-4 text-left hover:bg-gray-50 transition-colors"
            >
              <Star size={20} className="text-[#C8102E]" />
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-[#0D0D0D]">Google értékelés</div>
                <div className="text-[11px] text-[#4a4a4a]">Mondja el véleményét szervizünkről</div>
              </div>
              <ChevronRight size={15} className="text-[#888888]" />
            </button>
          </div>
        )}

        {tab === 'vehicles' && (
          <div className="space-y-3">
            {vehicles.map(v => (
              <div key={v.id} className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#F4F5F7] rounded-xl flex items-center justify-center">
                    <Car size={18} className="text-[#4a4a4a]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[14px] text-[#0D0D0D]">{v.make} {v.model} {v.year}</div>
                    <div className="text-[11px] text-[#4a4a4a]">{v.license_plate} · {v.color}</div>
                    {v.vin && <div className="text-[10px] text-[#888888]">VIN: {v.vin}</div>}
                  </div>
                </div>
                {v.next_service_date && (
                  <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.06)] flex items-center gap-2 text-[12px] text-[#4a4a4a]">
                    <Clock size={12} />
                    Következő ajánlott szerviz: <span className="font-medium text-[#0D0D0D]">{v.next_service_date}</span>
                  </div>
                )}
              </div>
            ))}
            {vehicles.length === 0 && <p className="text-center text-[13px] text-[#888888] py-8">Nincs regisztrált jármű</p>}
          </div>
        )}

        {tab === 'workorders' && (
          <div className="space-y-3">
            {workOrders.map(wo => (
              <div key={wo.id} className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-[#333333] bg-[#F0F0F0] px-2 py-0.5 rounded">{wo.order_number}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[wo.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[wo.status]?.label || wo.status}
                  </span>
                </div>
                <div className="text-[12px] text-[#4a4a4a]">{wo.vehicle?.make} {wo.vehicle?.model} · {wo.vehicle?.license_plate}</div>
                {wo.description && <div className="text-[12px] text-[#0D0D0D] mt-1">{wo.description}</div>}
                <div className="text-[11px] text-[#888888] mt-1">{wo.scheduled_date}</div>
              </div>
            ))}
            {workOrders.length === 0 && <p className="text-center text-[13px] text-[#888888] py-8">Nincs munkalap</p>}
          </div>
        )}

        {tab === 'quotes' && (
          <div className="space-y-3">
            {quotes.map(q => (
              <div key={q.id} className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] font-semibold text-[#0D0D0D]">Árajánlat #{q.id.slice(0, 8)}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[q.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[q.status]?.label || q.status}
                  </span>
                </div>
                <div className="text-[13px] font-semibold text-[#0D0D0D]">CHF {(q.total_amount || 0).toFixed(2)}</div>
                {q.valid_until && <div className="text-[11px] text-[#888888] mt-1">Érvényes: {q.valid_until}</div>}
                {q.notes && <div className="text-[12px] text-[#4a4a4a] mt-1">{q.notes}</div>}
                {q.status === 'sent' && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleQuoteAction(q.id, 'approved')}
                      className="flex-1 py-2 bg-emerald-600 text-white text-[12px] font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                    >
                      <CheckCircle size={13} className="inline mr-1" /> Elfogadom
                    </button>
                    <button
                      onClick={() => handleQuoteAction(q.id, 'rejected')}
                      className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 text-[12px] font-medium rounded-lg hover:bg-red-100 transition-colors"
                    >
                      Elutasítom
                    </button>
                  </div>
                )}
              </div>
            ))}
            {quotes.length === 0 && <p className="text-center text-[13px] text-[#888888] py-8">Nincs árajánlat</p>}
          </div>
        )}

        {tab === 'bookings' && (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-[#0D0D0D]">{b.scheduled_date} {b.scheduled_time}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[b.status]?.color || 'bg-gray-100 text-gray-600'}`}>
                    {b.status}
                  </span>
                </div>
                <div className="text-[12px] text-[#4a4a4a]">{b.vehicle?.make} {b.vehicle?.model} · {b.vehicle?.license_plate}</div>
                {b.service_type && <div className="text-[12px] text-[#0D0D0D] mt-1">{b.service_type}</div>}
              </div>
            ))}
            {bookings.length === 0 && <p className="text-center text-[13px] text-[#888888] py-8">Nincs foglalás</p>}
          </div>
        )}

        {tab === 'photos' && (
          <div>
            {photos.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {photos.map(p => (
                  <div key={p.id} className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                    {p.photo_url && <img src={p.photo_url} alt="" className="w-full h-full object-cover" />}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-[13px] text-[#888888] py-8">Nincs fotó</p>
            )}
          </div>
        )}

        {tab === 'reminders' && (
          <div className="space-y-3">
            {reminders.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[13px] font-semibold text-[#0D0D0D]">{r.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{r.status}</span>
                </div>
                {r.due_date && <div className="text-[12px] text-[#4a4a4a]">Esedékes: {r.due_date}</div>}
                {r.notes && <div className="text-[12px] text-[#888888] mt-1">{r.notes}</div>}
              </div>
            ))}
            {reminders.length === 0 && <p className="text-center text-[13px] text-[#888888] py-8">Nincs emlékeztető</p>}
          </div>
        )}

        {tab === 'message' && (
          <div className="bg-white rounded-xl border border-[rgba(0,0,0,0.08)] p-4">
            <h3 className="text-[14px] font-semibold text-[#0D0D0D] mb-3">Üzenet küldése</h3>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={5}
              placeholder="Írja ide üzenetét..."
              className="w-full border border-[rgba(0,0,0,0.18)] rounded-lg p-3 text-[13px] outline-none focus:border-[#0D0D0D] resize-none"
            />
            <button
              onClick={sendMessage}
              disabled={!message.trim()}
              className="mt-3 w-full py-2.5 bg-[#0D0D0D] text-white text-[13px] font-medium rounded-lg hover:bg-[#1A1A1A] transition-colors disabled:opacity-50"
            >
              <MessageCircle size={14} className="inline mr-2" /> Küldés
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
