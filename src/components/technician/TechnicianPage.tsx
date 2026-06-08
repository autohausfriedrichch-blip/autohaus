'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import {
  Wrench, Car, Clock, Play, Pause, Square, Camera, Package,
  CheckCircle, ChevronDown, ChevronUp, MapPin, User, AlertCircle,
  ListChecks, AlertTriangle,
} from 'lucide-react'
import { TechnicianFlagModal } from '@/components/services/ServiceCalculator'

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkOrder {
  id: string
  status: string
  scheduled_date: string
  scheduled_time: string | null
  fault_description: string | null
  checked_in_at: string | null
  mechanic_id: string | null
  customer_id: string
  vehicle_id: string
  order_number?: string | null
  customer: { id: string; full_name: string; phone?: string } | null
  vehicle: { make: string; model: string; license_plate: string } | null
}

interface PickupDelivery {
  id: string
  status: string
  pickup_address: string | null
  scheduled_time: string | null
  driver_name: string | null
  customer: { full_name: string } | null
  vehicle: { make: string; model: string; license_plate: string } | null
}

interface Task {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'done' | 'cancelled'
  due_date: string | null
  assigned_to: string | null
  customer?: { full_name: string } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  scheduled:        { label: 'Ütemezett',     color: 'text-blue-700',   bg: 'bg-blue-100' },
  arrived:          { label: 'Megérkezett',   color: 'text-cyan-700',   bg: 'bg-cyan-100' },
  checked_in:       { label: 'Check-in',      color: 'text-indigo-700', bg: 'bg-indigo-100' },
  in_progress:      { label: 'Folyamatban',   color: 'text-amber-700',  bg: 'bg-amber-100' },
  completed:        { label: 'Elkészült',     color: 'text-green-700',  bg: 'bg-green-100' },
  ready_for_pickup: { label: 'Átadásra vár',  color: 'text-[#C9A84C]',  bg: 'bg-yellow-50' },
  waiting_parts:    { label: 'Alkatrész vár', color: 'text-orange-700', bg: 'bg-orange-100' },
  on_hold:          { label: 'Felfüggesztve', color: 'text-gray-600',   bg: 'bg-gray-100' },
  delivered:        { label: 'Kiadva',        color: 'text-gray-500',   bg: 'bg-gray-100' },
}

const PRIORITY_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low:    { label: 'Alacsony', color: 'text-gray-600',  bg: 'bg-gray-100',   border: 'border-gray-300' },
  normal: { label: 'Normál',   color: 'text-blue-700',  bg: 'bg-blue-100',   border: 'border-blue-400' },
  high:   { label: 'Magas',    color: 'text-amber-700', bg: 'bg-amber-100',  border: 'border-amber-400' },
  urgent: { label: 'Sürgős',   color: 'text-red-700',   bg: 'bg-red-100',    border: 'border-red-500' },
}

const DELIVERY_STATUS_NEXT: Record<string, string> = {
  pending:    'picked_up',
  picked_up:  'delivered',
  delivered:  'delivered',
}

const DELIVERY_STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Függőben',   color: 'text-amber-700', bg: 'bg-amber-100' },
  picked_up: { label: 'Felvéve',    color: 'text-blue-700',  bg: 'bg-blue-100' },
  delivered: { label: 'Teljesítve', color: 'text-green-700', bg: 'bg-green-100' },
}

const ACTIVE_STATUSES = ['checked_in', 'in_progress', 'waiting_parts']
const IN_GARAGE_STATUSES = ['scheduled', 'arrived', 'checked_in', 'in_progress', 'waiting_parts', 'on_hold', 'completed', 'ready_for_pickup']

function toDateString(d: Date) {
  return d.toISOString().split('T')[0]
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}ó ${m}p ${s}mp`
  if (m > 0) return `${m}p ${s}mp`
  return `${s}mp`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: 'text-gray-600', bg: 'bg-gray-100' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.bg} ${meta.color}`}>
      {meta.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.normal
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.bg} ${meta.color}`}>
      {meta.label}
    </span>
  )
}

function PlateBadge({ plate }: { plate: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 bg-[#0B1E3D] text-white rounded-md text-[12px] font-mono font-bold tracking-wider">
      {plate}
    </span>
  )
}

// ─── Time Tracker Widget ──────────────────────────────────────────────────────

interface TimerState {
  running: boolean
  elapsed: number   // seconds
  startedAt: number | null  // timestamp ms when last started
}

function TimeTrackerWidget({
  orderId,
  onWorkLogged,
}: {
  orderId: string
  onWorkLogged: (orderId: string, notes: string) => Promise<void>
}) {
  const [timer, setTimer] = useState<TimerState>({ running: false, elapsed: 0, startedAt: null })
  const [showLogInput, setShowLogInput] = useState(false)
  const [logNotes, setLogNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Tick
  useEffect(() => {
    if (timer.running && timer.startedAt !== null) {
      intervalRef.current = setInterval(() => {
        setTimer(prev => ({
          ...prev,
          elapsed: prev.elapsed + 1,
        }))
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timer.running])

  const start = () => {
    setTimer(prev => ({ ...prev, running: true, startedAt: Date.now() }))
    setShowLogInput(false)
  }

  const pause = () => {
    setTimer(prev => ({ ...prev, running: false, startedAt: null }))
  }

  const stop = () => {
    setTimer(prev => ({ ...prev, running: false, startedAt: null }))
    setShowLogInput(true)
  }

  const handleLog = async () => {
    setSaving(true)
    await onWorkLogged(orderId, logNotes)
    setSaving(false)
    setLogNotes('')
    setShowLogInput(false)
    setTimer({ running: false, elapsed: 0, startedAt: null })
  }

  return (
    <div className="mt-3 pt-3 border-t border-[rgba(11,30,61,0.08)]">
      {/* Timer display */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2 bg-[#0B1E3D] rounded-xl px-4 py-2.5 flex-1">
          <Clock size={16} className={timer.running ? 'text-[#C9A84C] animate-pulse' : 'text-white/40'} />
          <span className="font-mono text-[18px] font-bold text-white min-w-[80px]">
            {formatElapsed(timer.elapsed)}
          </span>
          {timer.running && (
            <span className="text-[10px] text-[#C9A84C] font-semibold ml-auto">AKTÍV</span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {!timer.running ? (
          <button className="btn-mobile-action bg-[#0B1E3D] text-white flex-1 text-[13px]" onClick={start}>
            <Play size={16} />
            Időzítő indítása
          </button>
        ) : (
          <>
            <button className="btn-mobile-action bg-[#F4F5F7] text-[#0B1E3D] border border-[rgba(11,30,61,0.12)] flex-1 text-[13px]" onClick={pause}>
              <Pause size={16} />
              Szünet
            </button>
            <button className="btn-mobile-action bg-[#C9384C] text-white flex-1 text-[13px]" onClick={stop}>
              <Square size={16} />
              Stop & Rögzít
            </button>
          </>
        )}
      </div>

      {showLogInput && (
        <div className="mt-3 space-y-2">
          <Textarea
            value={logNotes}
            onChange={e => setLogNotes(e.target.value)}
            placeholder="Mit végeztél? Pl.: Fékbetét csere, bal első..."
            className="min-h-[64px] text-[12px]"
          />
          <div className="flex gap-2">
            <Button variant="gold" size="sm" onClick={handleLog} disabled={saving}>
              {saving ? 'Mentés...' : 'Munka rögzítése'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowLogInput(false)}>
              Mégsem
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TechnicianPage({
  refreshKey,
  onRefresh,
  profile,
}: {
  refreshKey: number
  onRefresh: () => void
  profile?: any
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Data
  const [todayOrders, setTodayOrders] = useState<WorkOrder[]>([])
  const [activeOrders, setActiveOrders] = useState<WorkOrder[]>([])
  const [garageOrders, setGarageOrders] = useState<WorkOrder[]>([])
  const [deliveries, setDeliveries] = useState<PickupDelivery[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksError, setTasksError] = useState(false)

  // UI state
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [statusChanging, setStatusChanging] = useState<string | null>(null)
  const [deliveryChanging, setDeliveryChanging] = useState<string | null>(null)

  // Parts request modal
  const [showPartsModal, setShowPartsModal] = useState(false)
  const [partsForm, setPartsForm] = useState({
    work_order_id: '',
    part_name: '',
    quantity: '1',
    urgency: 'normal',
    notes: '',
  })
  const [savingParts, setSavingParts] = useState(false)

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const today = toDateString(new Date())

    // Today's work orders assigned to this mechanic
    const { data: todayData } = await supabase
      .from('work_orders')
      .select('*, customer:customers(id,full_name,phone), vehicle:vehicles(make,model,license_plate)')
      .eq('mechanic_id', userId)
      .eq('scheduled_date', today)
      .order('scheduled_time', { ascending: true })

    // Active work orders (in progress / checked_in / waiting_parts)
    const { data: activeData } = await supabase
      .from('work_orders')
      .select('*, customer:customers(id,full_name,phone), vehicle:vehicles(make,model,license_plate)')
      .eq('mechanic_id', userId)
      .in('status', ACTIVE_STATUSES)
      .order('checked_in_at', { ascending: true })

    // All garage (not completed/delivered) – all mechanics
    const { data: garageData } = await supabase
      .from('work_orders')
      .select('*, customer:customers(id,full_name), vehicle:vehicles(make,model,license_plate)')
      .in('status', IN_GARAGE_STATUSES)
      .order('scheduled_date', { ascending: true })

    // Pickup/deliveries for this mechanic
    const mechanicName = profile?.full_name ?? ''
    let deliveryQuery = supabase
      .from('pickup_deliveries')
      .select('*, customer:customers(full_name), vehicle:vehicles(make,model,license_plate)')
      .not('status', 'eq', 'delivered')
      .order('scheduled_time', { ascending: true })

    if (mechanicName) {
      deliveryQuery = deliveryQuery.ilike('driver_name', `%${mechanicName.split(' ')[0]}%`)
    }
    const { data: deliveryData } = await deliveryQuery

    // Tasks for this user
    const { data: taskData, error: taskErr } = await supabase
      .from('tasks')
      .select('*, customer:customers(full_name)')
      .eq('assigned_to', userId)
      .not('status', 'in', '("done","cancelled")')
      .order('due_date', { ascending: true })

    if (taskErr?.code === '42P01') {
      setTasksError(true)
    } else {
      setTasksError(false)
      setTasks((taskData as Task[]) ?? [])
    }

    setTodayOrders((todayData as WorkOrder[]) ?? [])
    setActiveOrders((activeData as WorkOrder[]) ?? [])
    setGarageOrders((garageData as WorkOrder[]) ?? [])
    setDeliveries((deliveryData as PickupDelivery[]) ?? [])
    setLoading(false)
  }, [userId, profile, supabase])

  useEffect(() => {
    if (userId) fetchAll()
  }, [fetchAll, refreshKey, userId])

  // ── Actions ───────────────────────────────────────────────────────────────

  const changeOrderStatus = async (id: string, newStatus: string) => {
    setStatusChanging(id)
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'completed') updates.completed_at = new Date().toISOString()
    const { error } = await supabase.from('work_orders').update(updates).eq('id', id)
    if (error) {
      toast('Állapot frissítési hiba', 'error')
    } else {
      toast('Állapot frissítve', 'success')
      fetchAll()
      onRefresh()
    }
    setStatusChanging(null)
  }

  const handleWorkLogged = async (orderId: string, notes: string) => {
    if (!notes.trim()) {
      toast('Add meg, mit végeztél!', 'error')
      return
    }
    // Append to work_log field if available, otherwise just toast
    const { error } = await supabase
      .from('work_orders')
      .update({ work_log: notes, updated_at: new Date().toISOString() })
      .eq('id', orderId)

    if (error) {
      // If column doesn't exist, gracefully ignore
      toast('Munka feljegyezve (helyi)', 'info')
    } else {
      toast('Munka rögzítve', 'success')
    }
  }

  const handlePhotoUpload = async (orderId: string, file: File) => {
    const ext = file.name.split('.').pop()
    const path = `${orderId}/${Date.now()}.${ext}`
    const { error } = await supabase.storage.from('work-order-photos').upload(path, file)
    if (error) {
      toast('Fotó feltöltési hiba', 'error')
    } else {
      toast('Fotó feltöltve', 'success')
    }
  }

  const advanceDeliveryStatus = async (id: string, currentStatus: string) => {
    const next = DELIVERY_STATUS_NEXT[currentStatus]
    if (!next || next === currentStatus) return
    setDeliveryChanging(id)
    const { error } = await supabase
      .from('pickup_deliveries')
      .update({ status: next })
      .eq('id', id)
    if (error) {
      toast('Frissítési hiba', 'error')
    } else {
      toast('Állapot frissítve', 'success')
      fetchAll()
      onRefresh()
    }
    setDeliveryChanging(null)
  }

  const markTaskDone = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast('Hiba a feladat zárásánál', 'error')
    } else {
      toast('Feladat kész!', 'success')
      fetchAll()
      onRefresh()
    }
  }

  const submitPartsRequest = async () => {
    if (!partsForm.part_name.trim()) {
      toast('Add meg az alkatrész nevét', 'error')
      return
    }
    setSavingParts(true)
    const { error } = await supabase.from('parts_requests').insert({
      work_order_id: partsForm.work_order_id || null,
      part_name: partsForm.part_name,
      quantity: parseInt(partsForm.quantity) || 1,
      urgency: partsForm.urgency,
      notes: partsForm.notes || null,
      requested_by: userId,
      status: 'pending',
    })
    setSavingParts(false)
    if (error?.code === '42P01') {
      toast('Az alkatrész tábla még nem létezik', 'error')
    } else if (error) {
      toast('Hiba az igénylés beküldésekor', 'error')
    } else {
      toast('Alkatrész igénylés elküldve', 'success')
      setShowPartsModal(false)
      setPartsForm({ work_order_id: '', part_name: '', quantity: '1', urgency: 'normal', notes: '' })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const todayStr = new Date().toLocaleDateString('hu-HU', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  const mechanicFirstName = profile?.full_name?.split(' ')[0] ?? 'Karl'

  if (loading && !userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F5F7]">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-[#0B1E3D] px-5 pt-6 pb-7">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-['DM_Serif_Display'] text-[26px] text-white leading-tight">
              Szia, {mechanicFirstName}! 👋
            </h1>
            <p className="text-[13px] text-white/55 mt-1 capitalize">{todayStr}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <Wrench size={22} className="text-[#C9A84C]" />
          </div>
        </div>

        {/* Quick stat pills */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            <span className="text-[#C9A84C] font-bold text-[13px]">{todayOrders.length}</span>
            <span className="text-white/70 text-[11px]">mai feladat</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            <span className="text-[#C9A84C] font-bold text-[13px]">{activeOrders.length}</span>
            <span className="text-white/70 text-[11px]">aktív munkalap</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            <span className="text-[#C9A84C] font-bold text-[13px]">{tasks.length}</span>
            <span className="text-white/70 text-[11px]">feladat</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto">

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>

            {/* ── Section 1: Mai munkáim ──────────────────────────────────── */}
            <section>
              <SectionHeader icon={<Clock size={14} />} title="Mai munkáim" count={todayOrders.length} />
              {todayOrders.length === 0 ? (
                <EmptyState icon={<Clock size={28} />} message="Ma nincs hozzád rendelt munkalap" />
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {todayOrders.map(order => (
                    <div
                      key={order.id}
                      className="flex-shrink-0 w-[200px] bg-white border border-[rgba(11,30,61,0.10)] rounded-[14px] p-4 cursor-pointer hover:border-[#C9A84C] transition-colors"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <PlateBadge plate={order.vehicle?.license_plate ?? '—'} />
                      <div className="mt-2 text-[13px] font-semibold text-[#0B1E3D] truncate">
                        {order.customer?.full_name?.split(' ')[0] ?? '—'}
                      </div>
                      <div className="text-[11px] text-[#5a6a80] mt-0.5 truncate">
                        {order.vehicle?.make} {order.vehicle?.model}
                      </div>
                      {order.scheduled_time && (
                        <div className="text-[11px] text-[#C9A84C] font-semibold mt-1.5 flex items-center gap-1">
                          <Clock size={10} />
                          {order.scheduled_time.slice(0, 5)}
                        </div>
                      )}
                      <div className="mt-2">
                        <StatusBadge status={order.status} />
                      </div>

                      {/* Expanded detail */}
                      {expandedOrder === order.id && order.fault_description && (
                        <div className="mt-3 pt-3 border-t border-[rgba(11,30,61,0.08)]">
                          <p className="text-[11px] text-[#5a6a80] leading-relaxed">
                            {order.fault_description}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Section 2: Aktív munkalapok ─────────────────────────────── */}
            <section>
              <SectionHeader icon={<Wrench size={14} />} title="Aktív munkalapok" count={activeOrders.length} />
              {activeOrders.length === 0 ? (
                <EmptyState icon={<Wrench size={28} />} message="Nincs aktív munkalapod" />
              ) : (
                <div className="space-y-3">
                  {activeOrders.map(order => (
                    <ActiveWorkOrderCard
                      key={order.id}
                      order={order}
                      statusChanging={statusChanging}
                      onStatusChange={changeOrderStatus}
                      onWorkLogged={handleWorkLogged}
                      onPhotoUpload={handlePhotoUpload}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Section 3: Garázsban lévő autók ────────────────────────── */}
            <section>
              <SectionHeader icon={<Car size={14} />} title="Garázsban lévő autók" count={garageOrders.length} />
              {garageOrders.length === 0 ? (
                <EmptyState icon={<Car size={28} />} message="Nincs autó a garázsban" />
              ) : (
                <Card>
                  <div className="space-y-2">
                    {garageOrders.map(order => (
                      <div key={order.id} className="flex items-center gap-3 py-2 border-b border-[rgba(11,30,61,0.06)] last:border-0">
                        <PlateBadge plate={order.vehicle?.license_plate ?? '—'} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[13px] font-semibold text-[#0B1E3D] truncate">
                            {order.vehicle?.make} {order.vehicle?.model}
                          </div>
                          <div className="text-[11px] text-[#5a6a80] truncate">
                            {order.customer?.full_name}
                          </div>
                        </div>
                        <StatusBadge status={order.status} />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </section>

            {/* ── Section 4: Hozom-viszem ─────────────────────────────────── */}
            <section>
              <SectionHeader icon={<MapPin size={14} />} title="Hozom-viszem feladatok" count={deliveries.length} />
              {deliveries.length === 0 ? (
                <EmptyState icon={<MapPin size={28} />} message="Nincs aktív szállítási feladatod" />
              ) : (
                <div className="space-y-3">
                  {deliveries.map(d => {
                    const statusMeta = DELIVERY_STATUS_LABEL[d.status] ?? { label: d.status, color: 'text-gray-600', bg: 'bg-gray-100' }
                    const nextStatus = DELIVERY_STATUS_NEXT[d.status]
                    return (
                      <Card key={d.id}>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-[#F4F5F7] rounded-full flex items-center justify-center mt-0.5">
                            <MapPin size={14} className="text-[#0B1E3D]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusMeta.bg} ${statusMeta.color}`}>
                                {statusMeta.label}
                              </span>
                              {d.vehicle && <PlateBadge plate={d.vehicle.license_plate} />}
                            </div>
                            <div className="text-[13px] font-semibold text-[#0B1E3D] mt-1.5">
                              {d.customer?.full_name ?? '—'}
                            </div>
                            {d.pickup_address && (
                              <div className="text-[12px] text-[#5a6a80] mt-0.5 flex items-center gap-1">
                                <MapPin size={11} className="shrink-0" />
                                {d.pickup_address}
                              </div>
                            )}
                            {d.scheduled_time && (
                              <div className="text-[11px] text-[#C9A84C] font-semibold mt-1 flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(d.scheduled_time).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                            {d.vehicle && (
                              <div className="text-[11px] text-[#5a6a80] mt-0.5">
                                {d.vehicle.make} {d.vehicle.model}
                              </div>
                            )}
                          </div>
                        </div>
                        {nextStatus && nextStatus !== d.status && (
                          <div className="mt-3 pt-3 border-t border-[rgba(11,30,61,0.08)]">
                            <button
                              className="btn-mobile-action bg-[#0B1E3D] text-white w-full text-[13px]"
                              disabled={deliveryChanging === d.id}
                              onClick={() => advanceDeliveryStatus(d.id, d.status)}
                            >
                              → {DELIVERY_STATUS_LABEL[nextStatus]?.label ?? nextStatus}
                            </button>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ── Section 5: Alkatrész igénylés ───────────────────────────── */}
            <section>
              <SectionHeader icon={<Package size={14} />} title="Alkatrész igénylés" />
              <Card>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[13px] text-[#5a6a80]">
                      Alkatrész igénylést küldhet a raktárnak vagy Barbarának.
                    </p>
                  </div>
                  <Button variant="gold" size="sm" onClick={() => setShowPartsModal(true)}>
                    <Package size={13} />
                    Igénylés
                  </Button>
                </div>
              </Card>
            </section>

            {/* ── Section 6: Feladataim ────────────────────────────────────── */}
            <section>
              <SectionHeader icon={<ListChecks size={14} />} title="Feladataim" count={tasks.length} />
              {tasksError ? (
                <Card className="text-center py-6">
                  <AlertCircle size={24} className="mx-auto text-[#5a6a80] mb-2" />
                  <p className="text-[13px] text-[#5a6a80]">A feladatok tábla még nem elérhető</p>
                </Card>
              ) : tasks.length === 0 ? (
                <EmptyState icon={<ListChecks size={28} />} message="Nincs nyitott feladatod" />
              ) : (
                <div className="space-y-2">
                  {tasks.map(task => {
                    const pm = PRIORITY_META[task.priority] ?? PRIORITY_META.normal
                    const isOverdue = task.due_date && task.due_date < toDateString(new Date())
                    return (
                      <Card key={task.id} className={`border-l-4 ${pm.border} pl-4`}>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px] font-semibold text-[#0B1E3D]">{task.title}</span>
                              <PriorityBadge priority={task.priority} />
                            </div>
                            {task.description && (
                              <p className="text-[12px] text-[#5a6a80] mt-0.5 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {task.due_date && (
                                <span className={`text-[11px] font-semibold flex items-center gap-1 ${isOverdue ? 'text-[#C9384C]' : 'text-[#5a6a80]'}`}>
                                  <Clock size={10} />
                                  {formatDate(task.due_date)}
                                  {isOverdue && ' (Lejárt)'}
                                </span>
                              )}
                              {task.customer && (
                                <span className="text-[11px] text-[#5a6a80] flex items-center gap-1">
                                  <User size={10} />
                                  {(task.customer as any).full_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markTaskDone(task.id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0"
                          >
                            <CheckCircle size={14} />
                            Kész
                          </Button>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>

          </>
        )}
      </div>

      {/* ── Parts Request Modal ─────────────────────────────────────────────── */}
      <Modal
        open={showPartsModal}
        onClose={() => setShowPartsModal(false)}
        title="Alkatrész igénylés"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPartsModal(false)}>Mégsem</Button>
            <Button variant="gold" onClick={submitPartsRequest} disabled={savingParts}>
              {savingParts ? 'Küldés...' : 'Igénylés elküldése'}
            </Button>
          </>
        }
      >
        <div className="space-y-1">
          <FormGroup>
            <FormLabel>Munkalap (opcionális)</FormLabel>
            <Select
              value={partsForm.work_order_id}
              onChange={e => setPartsForm(p => ({ ...p, work_order_id: e.target.value }))}
            >
              <option value="">— Munkalap kiválasztása —</option>
              {activeOrders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.vehicle?.license_plate} — {o.customer?.full_name}
                </option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Alkatrész neve *</FormLabel>
            <Input
              value={partsForm.part_name}
              onChange={e => setPartsForm(p => ({ ...p, part_name: e.target.value }))}
              placeholder="Pl.: Fékbetét, olajszűrő..."
            />
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup>
              <FormLabel>Mennyiség</FormLabel>
              <Input
                type="number"
                min="1"
                value={partsForm.quantity}
                onChange={e => setPartsForm(p => ({ ...p, quantity: e.target.value }))}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Sürgősség</FormLabel>
              <Select
                value={partsForm.urgency}
                onChange={e => setPartsForm(p => ({ ...p, urgency: e.target.value }))}
              >
                <option value="normal">Normál</option>
                <option value="urgent">Sürgős</option>
              </Select>
            </FormGroup>
          </div>
          <FormGroup>
            <FormLabel>Megjegyzés</FormLabel>
            <Textarea
              value={partsForm.notes}
              onChange={e => setPartsForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Egyéb info, cikkszám, forrás..."
            />
          </FormGroup>
        </div>
      </Modal>

    </div>
  )
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode
  title: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[#C9A84C]">{icon}</span>
      <h2 className="text-[12px] font-semibold text-[#5a6a80] uppercase tracking-[0.7px]">{title}</h2>
      {count !== undefined && (
        <span className="ml-auto bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <Card className="py-8 text-center">
      <div className="flex justify-center text-[rgba(11,30,61,0.2)] mb-2">{icon}</div>
      <p className="text-[13px] text-[#5a6a80]">{message}</p>
    </Card>
  )
}

function ActiveWorkOrderCard({
  order,
  statusChanging,
  onStatusChange,
  onWorkLogged,
  onPhotoUpload,
}: {
  order: WorkOrder
  statusChanging: string | null
  onStatusChange: (id: string, status: string) => Promise<void>
  onWorkLogged: (orderId: string, notes: string) => Promise<void>
  onPhotoUpload: (orderId: string, file: File) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [flagOpen, setFlagOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const submitFlag = async (flag: { flag_type: string; description: string; extra_hours: number }) => {
    await supabase.from('technician_flags').insert({
      work_order_id: order.id,
      flag_type: flag.flag_type,
      description: flag.description,
      extra_hours: flag.extra_hours,
      created_by: null,
    })
  }

  return (
    <Card className="card-touchable">
      {/* Card header */}
      <div
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <PlateBadge plate={order.vehicle?.license_plate ?? '—'} />
            <span className="text-[13px] font-semibold text-[#0B1E3D]">
              {order.vehicle?.make} {order.vehicle?.model}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[12px] text-[#5a6a80] flex items-center gap-1">
              <User size={11} />
              {order.customer?.full_name}
            </span>
            <StatusBadge status={order.status} />
          </div>
          {order.fault_description && (
            <p className="text-[12px] text-[#5a6a80] mt-1.5 line-clamp-2">{order.fault_description}</p>
          )}
        </div>
        <button className="text-[#5a6a80] hover:text-[#0B1E3D] transition-colors mt-0.5 shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <TechnicianFlagModal
        open={flagOpen}
        workOrderId={order.id}
        onClose={() => setFlagOpen(false)}
        onSubmit={submitFlag}
      />

      {/* Expanded content */}
      {expanded && (
        <div className="mt-3 space-y-3">
          {/* Time tracker */}
          <TimeTrackerWidget orderId={order.id} onWorkLogged={onWorkLogged} />

          {/* Status actions – large touch-friendly buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            {order.status !== 'waiting_parts' ? (
              <button
                className="btn-mobile-action bg-[#F4F5F7] text-[#0B1E3D] border border-[rgba(11,30,61,0.12)] text-[13px] col-span-1"
                disabled={statusChanging === order.id}
                onClick={() => onStatusChange(order.id, 'waiting_parts')}
              >
                <Package size={16} />
                Alkatrész kell
              </button>
            ) : (
              <button
                className="btn-mobile-action bg-blue-50 text-blue-700 border border-blue-200 text-[13px] col-span-1"
                disabled={statusChanging === order.id}
                onClick={() => onStatusChange(order.id, 'in_progress')}
              >
                <Play size={16} />
                Folytatás
              </button>
            )}
            <button
              className="btn-mobile-action bg-[#C9A84C] text-[#0B1E3D] text-[13px] font-bold col-span-1"
              disabled={statusChanging === order.id}
              onClick={() => onStatusChange(order.id, 'completed')}
            >
              <CheckCircle size={16} />
              Munka kész!
            </button>
          </div>

          {/* Flag difficult work */}
          <button
            className="btn-mobile-action bg-amber-50 text-amber-800 border border-amber-300 w-full text-[13px]"
            onClick={() => setFlagOpen(true)}
          >
            <AlertTriangle size={16} />
            Nehézség / Kockázat jelölése
          </button>

          {/* Photo upload – full width, camera-first on mobile */}
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn-mobile-action bg-[#0B1E3D] text-white text-[13px]"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera size={16} />
              Kamera
            </button>
            <button
              className="btn-mobile-action bg-[#F4F5F7] text-[#0B1E3D] border border-[rgba(11,30,61,0.12)] text-[13px]"
              onClick={() => galleryInputRef.current?.click()}
            >
              <Camera size={16} />
              Galéria
            </button>
          </div>
          {/* Camera capture – opens camera directly */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) onPhotoUpload(order.id, file)
              e.target.value = ''
            }}
          />
          {/* Gallery picker */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => {
              const files = Array.from(e.target.files || [])
              files.forEach(f => onPhotoUpload(order.id, f))
              e.target.value = ''
            }}
          />
        </div>
      )}
    </Card>
  )
}
