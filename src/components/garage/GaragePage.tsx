'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { Card } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  ChevronLeft,
  ChevronRight,
  Phone,
  Plus,
  Clock,
  Car,
  User,
  Wrench,
  CheckCircle,
  MessageCircle,
  LogIn,
  LogOut,
} from 'lucide-react'

interface WorkOrder {
  id: string
  customer_id: string
  vehicle_id: string
  mechanic_id: string | null
  scheduled_date: string
  scheduled_time: string | null
  fault_description: string | null
  status: string
  total_amount: number | null
  payment_status: string | null
  checked_in_at: string | null
  completed_at: string | null
  created_at: string
  customer: { full_name: string; phone: string | null } | null
  vehicle: { make: string; model: string; license_plate: string } | null
  mechanic: { full_name: string } | null
}

interface Customer {
  id: string
  full_name: string
}

interface Vehicle {
  id: string
  make: string
  model: string
  license_plate: string
  customer_id: string
}

interface Profile {
  id: string
  full_name: string
  role: string
}

type TabKey = 'daily' | 'arriving' | 'inworkshop' | 'completed' | 'pickup'

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Ütemezve',
  arrived: 'Megérkezett',
  checked_in: 'Check-in',
  in_progress: 'Folyamatban',
  waiting_parts: 'Alkatrészre vár',
  on_hold: 'Visszatartva',
  completed: 'Elkészült',
  ready_for_pickup: 'Átadásra vár',
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700 border-blue-200',
  arrived: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  checked_in: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  waiting_parts: 'bg-orange-100 text-orange-700 border-orange-200',
  on_hold: 'bg-gray-100 text-gray-600 border-gray-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  ready_for_pickup: 'bg-yellow-100 text-yellow-700 border-yellow-200',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Fizetetlen',
  paid: 'Fizetve',
  partial: 'Részben fizetve',
  invoiced: 'Számlázva',
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  unpaid: 'bg-red-100 text-red-700',
  paid: 'bg-green-100 text-green-700',
  partial: 'bg-amber-100 text-amber-700',
  invoiced: 'bg-blue-100 text-blue-700',
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function elapsedTime(from: string | null): string {
  if (!from) return '—'
  const ms = Date.now() - new Date(from).getTime()
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h > 0) return `${h}ó ${m}p`
  return `${m}p`
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function GaragePage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const supabase = createClient()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<TabKey>('daily')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  const [showNewModal, setShowNewModal] = useState(false)
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsAppOrder, setWhatsAppOrder] = useState<WorkOrder | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [mechanics, setMechanics] = useState<Profile[]>([])
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])
  const [newForm, setNewForm] = useState({
    customer_id: '',
    vehicle_id: '',
    scheduled_date: toDateString(new Date()),
    scheduled_time: '',
    fault_description: '',
    mechanic_id: '',
  })

  const fetchWorkOrders = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('work_orders')
      .select('*, customer:customers(full_name,phone), vehicle:vehicles(make,model,license_plate), mechanic:profiles!work_orders_mechanic_id_fkey(full_name)')
      .order('scheduled_date', { ascending: true })
      .order('scheduled_time', { ascending: true })
    if (error) {
      toast('Hiba a munkalapok betöltésekor', 'error')
    } else {
      setWorkOrders((data as WorkOrder[]) || [])
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFormData = useCallback(async () => {
    const [{ data: custs }, { data: vehs }, { data: mechs }] = await Promise.all([
      supabase.from('customers').select('id, full_name').order('full_name'),
      supabase.from('vehicles').select('id, make, model, license_plate, customer_id').order('license_plate'),
      supabase.from('profiles').select('id, full_name, role').eq('role', 'mechanic').order('full_name'),
    ])
    setCustomers(custs || [])
    setVehicles(vehs || [])
    setMechanics(mechs || [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchWorkOrders()
  }, [fetchWorkOrders, refreshKey])

  useEffect(() => {
    if (showNewModal) fetchFormData()
  }, [showNewModal, fetchFormData])

  useEffect(() => {
    if (newForm.customer_id) {
      setFilteredVehicles(vehicles.filter(v => v.customer_id === newForm.customer_id))
    } else {
      setFilteredVehicles(vehicles)
    }
  }, [newForm.customer_id, vehicles])

  const todayStr = toDateString(selectedDate)
  const todayOrders = workOrders.filter(o => o.scheduled_date === todayStr)
  const arrivingOrders = workOrders.filter(o =>
    o.scheduled_date === toDateString(new Date()) &&
    ['scheduled', 'arrived'].includes(o.status)
  )
  const inWorkshopOrders = workOrders.filter(o =>
    ['checked_in', 'in_progress', 'waiting_parts', 'on_hold'].includes(o.status)
  )
  const completedOrders = workOrders.filter(o => o.status === 'completed')
  const pickupOrders = workOrders.filter(o => o.status === 'ready_for_pickup')

  const statsToday = {
    arriving: todayOrders.filter(o => ['scheduled', 'arrived'].includes(o.status)).length,
    inWorkshop: todayOrders.filter(o => ['checked_in', 'in_progress', 'waiting_parts', 'on_hold'].includes(o.status)).length,
    done: todayOrders.filter(o => o.status === 'completed').length,
    pickup: todayOrders.filter(o => o.status === 'ready_for_pickup').length,
  }

  async function handleStatusChange(orderId: string, newStatus: string) {
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'checked_in') updates.checked_in_at = new Date().toISOString()
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString()
    const { error } = await supabase.from('work_orders').update(updates).eq('id', orderId)
    if (error) {
      toast('Hiba a státusz frissítésekor', 'error')
    } else {
      toast('Státusz frissítve', 'success')
      fetchWorkOrders()
      onRefresh()
    }
  }

  async function handleNewWorkOrder(e: React.FormEvent) {
    e.preventDefault()
    if (!newForm.customer_id || !newForm.vehicle_id || !newForm.scheduled_date) {
      toast('Töltsd ki a kötelező mezőket', 'error')
      return
    }
    setSubmitting(true)
    const { error } = await supabase.from('work_orders').insert({
      customer_id: newForm.customer_id,
      vehicle_id: newForm.vehicle_id,
      scheduled_date: newForm.scheduled_date,
      scheduled_time: newForm.scheduled_time || null,
      fault_description: newForm.fault_description || null,
      mechanic_id: newForm.mechanic_id || null,
      status: 'scheduled',
    })
    setSubmitting(false)
    if (error) {
      toast('Hiba a munkalap létrehozásakor', 'error')
    } else {
      toast('Munkalap létrehozva', 'success')
      setShowNewModal(false)
      setNewForm({ customer_id: '', vehicle_id: '', scheduled_date: toDateString(new Date()), scheduled_time: '', fault_description: '', mechanic_id: '' })
      fetchWorkOrders()
      onRefresh()
    }
  }

  function openWhatsApp(order: WorkOrder) {
    setWhatsAppOrder(order)
    setShowWhatsAppModal(true)
  }

  function buildWhatsAppMessage(order: WorkOrder): string {
    const name = order.customer?.full_name || ''
    const plate = order.vehicle?.license_plate || ''
    if (order.status === 'completed') {
      return `Tisztelt ${name}!\n\nÖn ${plate} rendszámú járműve elkészült a szervizünkben.\nKérjük, vegye fel velünk a kapcsolatot az átvétel egyeztetése érdekében.\n\nÜdvözlettel,\nAutohaus Friedrich`
    }
    if (order.status === 'ready_for_pickup') {
      return `Tisztelt ${name}!\n\nÖn ${plate} rendszámú járműve átvételre kész.\nKérjük, látogasson el hozzánk a jármű átvételéhez.\n\nÜdvözlettel,\nAutohaus Friedrich`
    }
    return `Tisztelt ${name}!\n\nTájékoztatjuk, hogy ${plate} rendszámú járműve jelenleg szervizünkben van.\nStátusz: ${STATUS_LABELS[order.status] || order.status}\n\nÜdvözlettel,\nAutohaus Friedrich`
  }

  function sendWhatsApp(order: WorkOrder) {
    const msg = buildWhatsAppMessage(order)
    const phone = order.customer?.phone?.replace(/\D/g, '') || ''
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    setShowWhatsAppModal(false)
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'daily', label: 'Napi nézet' },
    { key: 'arriving', label: 'Érkező autók' },
    { key: 'inworkshop', label: 'Bent lévő autók' },
    { key: 'completed', label: 'Elkészült' },
    { key: 'pickup', label: 'Átadásra vár' },
  ]

  return (
    <div className="relative min-h-[60vh]">
      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-[rgba(11,30,61,0.10)] mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-[#C9A84C] text-[#0B1E3D]'
                : 'border-transparent text-[#5a6a80] hover:text-[#0B1E3D]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* NAPI NÉZET */}
      {activeTab === 'daily' && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <button
              onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() - 1); setSelectedDate(d) }}
              className="p-1.5 rounded-lg hover:bg-[#F4F5F7] text-[#5a6a80]"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-[15px] font-bold text-[#0B1E3D] min-w-[200px] text-center">
              {selectedDate.toLocaleDateString('hu-HU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
            <button
              onClick={() => { const d = new Date(selectedDate); d.setDate(d.getDate() + 1); setSelectedDate(d) }}
              className="p-1.5 rounded-lg hover:bg-[#F4F5F7] text-[#5a6a80]"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={() => setSelectedDate(new Date())}
              className="ml-2 px-3 py-1 text-[12px] font-semibold text-[#C9A84C] border border-[#C9A84C] rounded-lg hover:bg-[#C9A84C]/10"
            >
              Ma
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Érkező', value: statsToday.arriving, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Bent van', value: statsToday.inWorkshop, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Elkészült', value: statsToday.done, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Átvételre vár', value: statsToday.pickup, color: 'text-yellow-700', bg: 'bg-yellow-50' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 flex flex-col gap-1`}>
                <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
                <span className="text-[12px] text-[#5a6a80] font-medium">{s.label}</span>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-[#5a6a80]">Betöltés...</div>
          ) : todayOrders.length === 0 ? (
            <div className="text-center py-12 text-[#5a6a80]">
              <Car size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-[14px]">Nincs munkalap erre a napra</p>
            </div>
          ) : (
            <div className="space-y-2">
              {todayOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 p-3 bg-white border border-[rgba(11,30,61,0.08)] rounded-xl hover:border-[rgba(11,30,61,0.18)] transition-colors">
                  <span className="flex-shrink-0 inline-block bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-1 rounded-lg font-mono tracking-wide">
                    {order.vehicle?.license_plate || '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#0B1E3D] truncate">{order.customer?.full_name || '—'}</span>
                      {order.mechanic && (
                        <span className="text-[11px] text-[#5a6a80]">· {order.mechanic.full_name}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#5a6a80]">{order.vehicle ? `${order.vehicle.make} ${order.vehicle.model}` : '—'}</div>
                  </div>
                  {order.scheduled_time && (
                    <div className="flex items-center gap-1 text-[12px] text-[#5a6a80]">
                      <Clock size={12} />
                      {order.scheduled_time.substring(0, 5)}
                    </div>
                  )}
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ÉRKEZŐ AUTÓK */}
      {activeTab === 'arriving' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-[#0B1E3D]">Mai érkezők</h2>
            <span className="text-[12px] text-[#5a6a80]">{arrivingOrders.length} munkalap</span>
          </div>
          {loading ? (
            <div className="text-center py-12 text-[#5a6a80]">Betöltés...</div>
          ) : arrivingOrders.length === 0 ? (
            <div className="text-center py-12 text-[#5a6a80]">
              <Car size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-[14px]">Nincs érkező autó ma</p>
            </div>
          ) : (
            <div className="space-y-2">
              {arrivingOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 p-4 bg-white border border-[rgba(11,30,61,0.08)] rounded-xl hover:border-[rgba(11,30,61,0.18)] transition-colors">
                  <span className="flex-shrink-0 inline-block bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-1 rounded-lg font-mono">
                    {order.vehicle?.license_plate || '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#0B1E3D]">{order.customer?.full_name || '—'}</div>
                    <div className="text-[11px] text-[#5a6a80]">{order.vehicle ? `${order.vehicle.make} ${order.vehicle.model}` : '—'}</div>
                  </div>
                  {order.scheduled_time && (
                    <div className="flex items-center gap-1 text-[12px] text-[#5a6a80]">
                      <Clock size={12} />
                      {order.scheduled_time.substring(0, 5)}
                    </div>
                  )}
                  <StatusBadge status={order.status} />
                  <div className="flex items-center gap-1.5">
                    {order.customer?.phone && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(`tel:${order.customer?.phone}`, '_self')}
                        title="Hívás"
                      >
                        <Phone size={12} />
                      </Button>
                    )}
                    {order.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleStatusChange(order.id, 'arrived')}
                      >
                        <LogIn size={12} />
                        Check-in
                      </Button>
                    )}
                    {order.status === 'arrived' && (
                      <Button
                        size="sm"
                        variant="gold"
                        onClick={() => handleStatusChange(order.id, 'checked_in')}
                      >
                        <CheckCircle size={12} />
                        Bejelentkezés
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BENT LÉVŐ AUTÓK */}
      {activeTab === 'inworkshop' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-[#0B1E3D]">Garázsban lévő autók</h2>
            <span className="text-[12px] text-[#5a6a80]">{inWorkshopOrders.length} jármű</span>
          </div>
          {loading ? (
            <div className="text-center py-12 text-[#5a6a80]">Betöltés...</div>
          ) : inWorkshopOrders.length === 0 ? (
            <div className="text-center py-12 text-[#5a6a80]">
              <Wrench size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-[14px]">Nincs autó a garázsban</p>
            </div>
          ) : (
            <div className="space-y-2">
              {inWorkshopOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 p-4 bg-white border border-[rgba(11,30,61,0.08)] rounded-xl hover:border-[rgba(11,30,61,0.18)] transition-colors">
                  <span className="flex-shrink-0 inline-block bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-1 rounded-lg font-mono">
                    {order.vehicle?.license_plate || '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#0B1E3D]">{order.customer?.full_name || '—'}</div>
                    <div className="text-[11px] text-[#5a6a80] flex items-center gap-1">
                      {order.mechanic ? <><User size={10} /> {order.mechanic.full_name}</> : 'Nincs szerelő'}
                    </div>
                  </div>
                  <div className="text-[11px] text-[#5a6a80] flex items-center gap-1">
                    <Clock size={12} />
                    {elapsedTime(order.checked_in_at)}
                  </div>
                  <StatusBadge status={order.status} />
                  <div className="flex items-center gap-1.5">
                    {order.status === 'checked_in' && (
                      <Button size="sm" variant="gold" onClick={() => handleStatusChange(order.id, 'in_progress')}>
                        Munka kezdése
                      </Button>
                    )}
                    {order.status === 'in_progress' && (
                      <Button size="sm" variant="primary" onClick={() => handleStatusChange(order.id, 'completed')}>
                        <CheckCircle size={12} />
                        Elkészült
                      </Button>
                    )}
                    {(order.status === 'waiting_parts' || order.status === 'on_hold') && (
                      <Button size="sm" variant="secondary" onClick={() => handleStatusChange(order.id, 'in_progress')}>
                        Folytatás
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ELKÉSZÜLT */}
      {activeTab === 'completed' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-[#0B1E3D]">Elkészült munkák</h2>
            <span className="text-[12px] text-[#5a6a80]">{completedOrders.length} munkalap</span>
          </div>
          {loading ? (
            <div className="text-center py-12 text-[#5a6a80]">Betöltés...</div>
          ) : completedOrders.length === 0 ? (
            <div className="text-center py-12 text-[#5a6a80]">
              <CheckCircle size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-[14px]">Nincs elkészült munka</p>
            </div>
          ) : (
            <div className="space-y-2">
              {completedOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 p-4 bg-white border border-[rgba(11,30,61,0.08)] rounded-xl hover:border-[rgba(11,30,61,0.18)] transition-colors">
                  <span className="flex-shrink-0 inline-block bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-1 rounded-lg font-mono">
                    {order.vehicle?.license_plate || '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#0B1E3D]">{order.customer?.full_name || '—'}</div>
                    <div className="text-[11px] text-[#5a6a80]">
                      {order.completed_at
                        ? `Kész: ${new Date(order.completed_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
                        : '—'}
                    </div>
                  </div>
                  {order.total_amount != null && (
                    <div className="text-[13px] font-bold text-[#0B1E3D]">{formatCurrency(order.total_amount)}</div>
                  )}
                  {order.payment_status && (
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${PAYMENT_STATUS_COLORS[order.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                      {PAYMENT_STATUS_LABELS[order.payment_status] || order.payment_status}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="gold" onClick={() => openWhatsApp(order)}>
                      <MessageCircle size={12} />
                      Értesítés
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => handleStatusChange(order.id, 'ready_for_pickup')}>
                      Átadásra kész
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ÁTADÁSRA VÁR */}
      {activeTab === 'pickup' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-[#0B1E3D]">Átadásra váró járművek</h2>
            <span className="text-[12px] text-[#5a6a80]">{pickupOrders.length} jármű</span>
          </div>
          {loading ? (
            <div className="text-center py-12 text-[#5a6a80]">Betöltés...</div>
          ) : pickupOrders.length === 0 ? (
            <div className="text-center py-12 text-[#5a6a80]">
              <Car size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-[14px]">Nincs átadásra váró jármű</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pickupOrders.map(order => (
                <div key={order.id} className="flex items-center gap-3 p-4 bg-yellow-50/40 border border-[rgba(201,168,76,0.3)] rounded-xl">
                  <span className="flex-shrink-0 inline-block bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-1 rounded-lg font-mono">
                    {order.vehicle?.license_plate || '—'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#0B1E3D]">{order.customer?.full_name || '—'}</div>
                    <div className="text-[11px] text-[#5a6a80]">
                      {order.completed_at ? `Vár: ${elapsedTime(order.completed_at)} óta` : 'Ismeretlen ideje vár'}
                    </div>
                  </div>
                  {order.total_amount != null && (
                    <div className="text-[13px] font-bold text-[#0B1E3D]">{formatCurrency(order.total_amount)}</div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Button size="sm" variant="secondary" onClick={() => openWhatsApp(order)}>
                      <MessageCircle size={12} />
                      WhatsApp
                    </Button>
                    <Button size="sm" variant="gold" onClick={() => handleStatusChange(order.id, 'delivered')}>
                      <LogOut size={12} />
                      Átadás
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating new work order button */}
      <button
        onClick={() => setShowNewModal(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-[#C9A84C] text-[#0B1E3D] font-bold text-[13px] rounded-full shadow-lg hover:bg-[#e8c96b] transition-colors"
      >
        <Plus size={16} />
        Új munkalap
      </button>

      {/* New Work Order Modal */}
      <Modal open={showNewModal} onClose={() => setShowNewModal(false)} title="Új munkalap létrehozása">
        <form onSubmit={handleNewWorkOrder} className="p-5 space-y-1">
          <FormGroup>
            <FormLabel>Ügyfél *</FormLabel>
            <Select
              value={newForm.customer_id}
              onChange={e => setNewForm(f => ({ ...f, customer_id: e.target.value, vehicle_id: '' }))}
              required
            >
              <option value="">Válassz ügyfelet...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Jármű *</FormLabel>
            <Select
              value={newForm.vehicle_id}
              onChange={e => setNewForm(f => ({ ...f, vehicle_id: e.target.value }))}
              required
            >
              <option value="">Válassz járművet...</option>
              {filteredVehicles.map(v => (
                <option key={v.id} value={v.id}>{v.license_plate} – {v.make} {v.model}</option>
              ))}
            </Select>
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup>
              <FormLabel>Időpont dátuma *</FormLabel>
              <Input
                type="date"
                value={newForm.scheduled_date}
                onChange={e => setNewForm(f => ({ ...f, scheduled_date: e.target.value }))}
                required
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Időpont ideje</FormLabel>
              <Input
                type="time"
                value={newForm.scheduled_time}
                onChange={e => setNewForm(f => ({ ...f, scheduled_time: e.target.value }))}
              />
            </FormGroup>
          </div>
          <FormGroup>
            <FormLabel>Hiba leírása</FormLabel>
            <Textarea
              value={newForm.fault_description}
              onChange={e => setNewForm(f => ({ ...f, fault_description: e.target.value }))}
              rows={3}
              placeholder="Ügyfél által jelzett hibák..."
            />
          </FormGroup>
          <FormGroup>
            <FormLabel>Szerelő</FormLabel>
            <Select
              value={newForm.mechanic_id}
              onChange={e => setNewForm(f => ({ ...f, mechanic_id: e.target.value }))}
            >
              <option value="">Nincs hozzárendelve</option>
              {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </Select>
          </FormGroup>
          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="secondary" onClick={() => setShowNewModal(false)}>Mégse</Button>
            <Button type="submit" variant="gold" disabled={submitting}>
              {submitting ? 'Mentés...' : 'Munkalap létrehozása'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* WhatsApp Modal */}
      <Modal open={showWhatsAppModal} onClose={() => setShowWhatsAppModal(false)} title="WhatsApp értesítés">
        {whatsAppOrder && (
          <div className="p-5">
            <div className="bg-[#dcf8c6] rounded-xl p-4 mb-4 text-[13px] text-gray-800 whitespace-pre-wrap font-mono">
              {buildWhatsAppMessage(whatsAppOrder)}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowWhatsAppModal(false)}>Mégse</Button>
              <Button variant="gold" onClick={() => sendWhatsApp(whatsAppOrder)}>
                <MessageCircle size={14} />
                Küldés WhatsApp-on
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
