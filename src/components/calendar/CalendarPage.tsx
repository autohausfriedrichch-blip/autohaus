'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import {
  ChevronLeft, ChevronRight, Plus, Calendar, List, Clock,
  MapPin, User, Car, Phone, Navigation, AlertTriangle, X,
  CheckCircle, RefreshCw
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'month' | 'week' | 'day' | 'list'

interface CalEvent {
  id: string
  title: string
  type: EventType
  date: string          // YYYY-MM-DD
  start_time?: string   // HH:MM
  end_time?: string
  customer_name?: string
  customer_phone?: string
  vehicle_info?: string
  license_plate?: string
  address?: string
  assigned_to?: string
  status: EventStatus
  work_order_id?: string
  quote_id?: string
  notes?: string
  source_table: string
  source_id: string
  color: string
}

type EventType =
  | 'booking' | 'workorder' | 'mobile_service' | 'mobile_tire'
  | 'mobile_cleaning' | 'pickup' | 'delivery' | 'quote_followup'
  | 'callback' | 'task'

type EventStatus =
  | 'planned' | 'confirmed' | 'in_progress' | 'done'
  | 'postponed' | 'cancelled' | 'no_show'

// ─── Config ───────────────────────────────────────────────────────────────────

const EVENT_META: Record<EventType, { label: string; color: string; bg: string; border: string; dot: string }> = {
  booking:         { label: 'Foglalás',            color: 'text-blue-700',    bg: 'bg-blue-100',    border: 'border-blue-300',    dot: 'bg-blue-500' },
  workorder:       { label: 'Munkalap',             color: 'text-indigo-700',  bg: 'bg-indigo-100',  border: 'border-indigo-300',  dot: 'bg-indigo-600' },
  mobile_service:  { label: 'Mobil szerviz',        color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300', dot: 'bg-emerald-500' },
  mobile_tire:     { label: 'Mobil gumiszerviz',    color: 'text-teal-700',    bg: 'bg-teal-100',    border: 'border-teal-300',    dot: 'bg-teal-500' },
  mobile_cleaning: { label: 'Mobil takarítás',      color: 'text-cyan-700',    bg: 'bg-cyan-100',    border: 'border-cyan-300',    dot: 'bg-cyan-500' },
  pickup:          { label: 'Pickup',               color: 'text-orange-700',  bg: 'bg-orange-100',  border: 'border-orange-300',  dot: 'bg-orange-500' },
  delivery:        { label: 'Delivery',             color: 'text-purple-700',  bg: 'bg-purple-100',  border: 'border-purple-300',  dot: 'bg-purple-500' },
  quote_followup:  { label: 'Árajánlat utánkövetés', color: 'text-yellow-700', bg: 'bg-yellow-100',  border: 'border-yellow-300',  dot: 'bg-yellow-500' },
  callback:        { label: 'Visszahívás',          color: 'text-amber-700',   bg: 'bg-amber-100',   border: 'border-amber-300',   dot: 'bg-amber-500' },
  task:            { label: 'Feladat',              color: 'text-gray-700',    bg: 'bg-gray-100',    border: 'border-gray-300',    dot: 'bg-gray-500' },
}

const STATUS_META: Record<EventStatus, { label: string; color: string }> = {
  planned:     { label: 'Tervezett',     color: 'bg-gray-100 text-gray-700' },
  confirmed:   { label: 'Visszaigazolva', color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Folyamatban',   color: 'bg-amber-100 text-amber-700' },
  done:        { label: 'Kész',          color: 'bg-emerald-100 text-emerald-700' },
  postponed:   { label: 'Elhalasztva',  color: 'bg-orange-100 text-orange-700' },
  cancelled:   { label: 'Lemondva',     color: 'bg-red-100 text-red-700' },
  no_show:     { label: 'No-show',      color: 'bg-red-200 text-red-800' },
}

const HU_MONTHS = ['Január','Február','Március','Április','Május','Június','Július','Augusztus','Szeptember','Október','November','December']
const HU_DAYS_SHORT = ['H','K','Sze','Cs','P','Szo','V']
const HU_DAYS = ['Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat','Vasárnap']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return d.toISOString().split('T')[0]
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function startOfWeek(d: Date) {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day // Monday start
  return addDays(d, diff)
}

function isSameDay(a: string, b: string) { return a === b }

function formatTime(t?: string) {
  if (!t) return ''
  return t.slice(0, 5)
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

// ─── Default form ─────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  title: '', type: 'booking' as EventType,
  date: toDateStr(new Date()), start_time: '09:00', end_time: '10:00',
  customer_id: '', vehicle_id: '', address: '', assigned_to: '',
  status: 'planned' as EventStatus, notes: '', work_order_id: '',
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CalendarPage({ refreshKey, profile }: { refreshKey: number; profile?: any; onRefresh?: () => void }) {
  const [view, setView] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(new Date())
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CalEvent | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<any>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [mechanics, setMechanics] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [typeFilter, setTypeFilter] = useState<EventType | 'all'>('all')
  const { toast } = useToast()
  const supabase = createClient()
  const isMechanic = profile?.role === 'mechanic'

  // Date range for current view
  const rangeStart = useCallback(() => {
    if (view === 'month') {
      const d = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
      return startOfWeek(d)
    }
    if (view === 'week') return startOfWeek(cursor)
    return cursor
  }, [view, cursor])

  const rangeEnd = useCallback(() => {
    if (view === 'month') {
      const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      const end = addDays(startOfWeek(last), 6)
      return end
    }
    if (view === 'week') return addDays(startOfWeek(cursor), 6)
    return cursor
  }, [view, cursor])

  const load = useCallback(async () => {
    setLoading(true)
    const start = toDateStr(rangeStart())
    // For list view, load 30 days ahead
    const end = view === 'list' ? toDateStr(addDays(cursor, 30)) : toDateStr(rangeEnd())

    const [
      { data: bookings },
      { data: workorders },
      { data: pickups },
      { data: tasks },
      { data: quotes },
      { data: cust },
      { data: vehs },
      { data: mechs },
      { data: wos },
    ] = await Promise.all([
      supabase.from('bookings')
        .select('id, scheduled_date, scheduled_time, service_type, status, customer_id, vehicle_id, customer:customers(full_name,phone), vehicle:vehicles(make,model,license_plate), notes')
        .gte('scheduled_date', start).lte('scheduled_date', end),
      supabase.from('work_orders')
        .select('id, order_number, scheduled_date, scheduled_time, service_type, status, is_mobile, mobile_address, mechanic_id, customer:customers(full_name,phone), vehicle:vehicles(make,model,license_plate), mechanic:profiles!work_orders_mechanic_id_fkey(full_name)')
        .gte('scheduled_date', start).lte('scheduled_date', end).not('scheduled_date', 'is', null),
      supabase.from('pickup_deliveries')
        .select('id, status, pickup_address, delivery_address, scheduled_time, driver_name, customer:customers(full_name,phone), vehicle:vehicles(make,model,license_plate)')
        .or(`scheduled_time.gte.${start},scheduled_time.lte.${end + 'T23:59:59'}`),
      supabase.from('tasks')
        .select('id, title, status, due_date, priority, assigned_to, task_type')
        .gte('due_date', start).lte('due_date', end).not('due_date', 'is', null).not('is_template', 'eq', true),
      supabase.from('quotes')
        .select('id, valid_until, status, customer:customers(full_name,phone), total_amount')
        .gte('valid_until', start).lte('valid_until', end).not('valid_until', 'is', null).in('status', ['sent', 'draft']),
      supabase.from('customers').select('id, full_name, phone').order('full_name'),
      supabase.from('vehicles').select('id, make, model, license_plate, customer_id'),
      supabase.from('profiles').select('id, full_name').in('role', ['mechanic','admin','super_admin']),
      supabase.from('work_orders').select('id, order_number').not('status', 'in', '(delivered,closed)').limit(100),
    ])

    setCustomers(cust || [])
    setVehicles(vehs || [])
    setMechanics(mechs || [])
    setWorkOrders(wos || [])

    const evList: CalEvent[] = []

    // Bookings
    for (const b of bookings || []) {
      evList.push({
        id: `booking-${b.id}`, title: b.service_type || 'Foglalás',
        type: 'booking', date: b.scheduled_date, start_time: b.scheduled_time || undefined,
        customer_name: (b.customer as any)?.full_name, customer_phone: (b.customer as any)?.phone,
        vehicle_info: b.vehicle ? `${(b.vehicle as any).make} ${(b.vehicle as any).model}` : undefined,
        license_plate: (b.vehicle as any)?.license_plate,
        status: (b.status === 'confirmed' ? 'confirmed' : b.status === 'completed' ? 'done' : b.status === 'cancelled' ? 'cancelled' : 'planned') as EventStatus,
        source_table: 'bookings', source_id: b.id, notes: b.notes,
        color: EVENT_META.booking.dot,
      })
    }

    // Work orders
    for (const wo of workorders || []) {
      const isM = (wo as any).is_mobile
      const type: EventType = isM ? 'mobile_service' : 'workorder'
      const statusMap: Record<string, EventStatus> = {
        new_booking: 'planned', confirmed: 'confirmed', checked_in: 'in_progress',
        in_repair: 'in_progress', quality_check: 'in_progress', ready: 'done',
        delivered: 'done', closed: 'done',
      }
      evList.push({
        id: `wo-${wo.id}`, title: (wo as any).order_number + (wo.service_type ? ` – ${wo.service_type}` : ''),
        type, date: wo.scheduled_date!, start_time: wo.scheduled_time || undefined,
        customer_name: (wo.customer as any)?.full_name, customer_phone: (wo.customer as any)?.phone,
        vehicle_info: wo.vehicle ? `${(wo.vehicle as any).make} ${(wo.vehicle as any).model}` : undefined,
        license_plate: (wo.vehicle as any)?.license_plate,
        address: (wo as any).mobile_address,
        assigned_to: (wo.mechanic as any)?.full_name,
        status: statusMap[wo.status] || 'planned',
        work_order_id: wo.id, source_table: 'work_orders', source_id: wo.id,
        color: EVENT_META[type].dot,
      })
    }

    // Pickup/Delivery
    for (const pd of pickups || []) {
      const dateStr = (pd.scheduled_time as string || '').split('T')[0]
      if (!dateStr) continue
      const type: EventType = (pd as any).pickup_address ? 'pickup' : 'delivery'
      evList.push({
        id: `pd-${pd.id}`, title: type === 'pickup' ? 'Pickup' : 'Delivery',
        type, date: dateStr, start_time: (pd.scheduled_time as string || '').split('T')[1]?.slice(0,5),
        customer_name: (pd.customer as any)?.full_name, customer_phone: (pd.customer as any)?.phone,
        vehicle_info: pd.vehicle ? `${(pd.vehicle as any).make} ${(pd.vehicle as any).model}` : undefined,
        license_plate: (pd.vehicle as any)?.license_plate,
        address: (pd as any).pickup_address || (pd as any).delivery_address,
        assigned_to: pd.driver_name || undefined,
        status: (pd.status === 'done' || pd.status === 'delivered' ? 'done' : pd.status === 'in_progress' ? 'in_progress' : 'confirmed') as EventStatus,
        source_table: 'pickup_deliveries', source_id: pd.id,
        color: EVENT_META[type].dot,
      })
    }

    // Tasks
    for (const t of tasks || []) {
      evList.push({
        id: `task-${t.id}`, title: t.title,
        type: 'task', date: t.due_date!,
        status: (t.status === 'done' ? 'done' : t.status === 'in_progress' ? 'in_progress' : 'planned') as EventStatus,
        source_table: 'tasks', source_id: t.id,
        color: EVENT_META.task.dot,
      })
    }

    // Quotes followup
    for (const q of quotes || []) {
      evList.push({
        id: `quote-${q.id}`, title: `Árajánlat utánkövetés – ${(q.customer as any)?.full_name || ''}`,
        type: 'quote_followup', date: q.valid_until!,
        customer_name: (q.customer as any)?.full_name, customer_phone: (q.customer as any)?.phone,
        status: 'planned', quote_id: q.id,
        source_table: 'quotes', source_id: q.id, notes: `Összeg: ${q.total_amount} CHF`,
        color: EVENT_META.quote_followup.dot,
      })
    }

    setEvents(evList)
    setLoading(false)
  }, [cursor, view, refreshKey])

  useEffect(() => { load() }, [load])

  // ── Navigation ──────────────────────────────────────────────────────────────

  const navigate = (dir: -1 | 1) => {
    const d = new Date(cursor)
    if (view === 'month') d.setMonth(d.getMonth() + dir)
    else if (view === 'week') d.setDate(d.getDate() + dir * 7)
    else d.setDate(d.getDate() + dir)
    setCursor(d)
  }

  const goToday = () => setCursor(new Date())

  // ── Event save ──────────────────────────────────────────────────────────────

  const saveEvent = async () => {
    if (!form.title || !form.date) { toast('Cím és dátum kötelező', 'error'); return }
    setSaving(true)
    const customer = customers.find(c => c.id === form.customer_id)
    const vehicle = vehicles.find(v => v.id === form.vehicle_id)
    const mechanic = mechanics.find(m => m.id === form.assigned_to)

    if (form.type === 'booking') {
      const payload: any = {
        service_type: form.title, scheduled_date: form.date,
        scheduled_time: form.start_time || null, status: 'pending',
        customer_id: form.customer_id || null, vehicle_id: form.vehicle_id || null,
        notes: form.notes || null,
      }
      const { error } = await supabase.from('bookings').insert(payload)
      if (error) { toast('Hiba: ' + error.message, 'error'); setSaving(false); return }
    } else if (['mobile_service','mobile_tire','mobile_cleaning','workorder'].includes(form.type)) {
      const payload: any = {
        service_type: form.title, scheduled_date: form.date, scheduled_time: form.start_time || null,
        is_mobile: form.type !== 'workorder', mobile_address: form.address || null,
        status: 'new_booking', customer_id: form.customer_id || null, vehicle_id: form.vehicle_id || null,
        mechanic_id: form.assigned_to || null, internal_notes: form.notes || null,
        parts_cost: 0, labor_cost: 0, total_amount: 0, payment_status: 'pending',
      }
      const { error } = await supabase.from('work_orders').insert(payload)
      if (error) { toast('Hiba: ' + error.message, 'error'); setSaving(false); return }
    } else if (['pickup','delivery'].includes(form.type)) {
      const payload: any = {
        status: 'pending', driver_name: mechanic?.full_name || null,
        pickup_address: form.type === 'pickup' ? form.address : null,
        delivery_address: form.type === 'delivery' ? form.address : null,
        scheduled_time: form.date + 'T' + (form.start_time || '09:00') + ':00',
        customer_id: form.customer_id || null, vehicle_id: form.vehicle_id || null,
        notes: form.notes || null,
      }
      const { error } = await supabase.from('pickup_deliveries').insert(payload)
      if (error) { toast('Hiba: ' + error.message, 'error'); setSaving(false); return }
    } else {
      // task / callback / quote_followup → tasks table
      const payload: any = {
        title: form.title, status: 'open', due_date: form.date,
        task_type: form.type === 'callback' ? 'general' : form.type === 'quote_followup' ? 'general' : 'general',
        priority: 'normal', assigned_to: form.assigned_to || null, notes: form.notes || null,
      }
      const { error } = await supabase.from('tasks').insert(payload)
      if (error) { toast('Hiba: ' + error.message, 'error'); setSaving(false); return }
    }

    toast('Esemény létrehozva')
    setModalOpen(false)
    setForm({ ...DEFAULT_FORM, date: form.date })
    setSaving(false)
    load()
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const eventsForDay = (dateStr: string) =>
    events.filter(e => e.date === dateStr && (typeFilter === 'all' || e.type === typeFilter))
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))

  const todayStr = toDateStr(new Date())

  // ── Render helpers ───────────────────────────────────────────────────────────

  function EventChip({ ev, compact = false }: { ev: CalEvent; compact?: boolean }) {
    const meta = EVENT_META[ev.type]
    const isDone = ev.status === 'done' || ev.status === 'cancelled'
    return (
      <button
        onClick={e => { e.stopPropagation(); setSelected(ev) }}
        className={`w-full text-left rounded px-1.5 py-0.5 text-[10px] font-semibold truncate border-l-2 transition-opacity hover:opacity-80
          ${isDone ? 'opacity-50' : ''}
          ${meta.bg} ${meta.color} ${meta.border}`}
        style={{ minHeight: 20 }}
      >
        {ev.start_time && <span className="opacity-70 mr-1">{formatTime(ev.start_time)}</span>}
        {compact ? ev.license_plate || ev.title : ev.title}
      </button>
    )
  }

  // ── Month view ───────────────────────────────────────────────────────────────

  function MonthView() {
    const year = cursor.getFullYear()
    const month = cursor.getMonth()
    const firstDay = new Date(year, month, 1)
    const gridStart = startOfWeek(firstDay)
    const days: Date[] = []
    for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i))

    return (
      <div className="flex-1 overflow-auto">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-[rgba(11,30,61,0.10)]">
          {HU_DAYS_SHORT.map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-[#5a6a80] uppercase py-2">{d}</div>
          ))}
        </div>
        {/* Weeks */}
        <div className="grid grid-cols-7 flex-1">
          {days.map((day, idx) => {
            const ds = toDateStr(day)
            const isCurrentMonth = day.getMonth() === month
            const isToday = ds === todayStr
            const dayEvs = eventsForDay(ds)
            const maxShow = 3
            return (
              <div
                key={ds}
                onClick={() => { setCursor(day); setView('day') }}
                className={`min-h-[80px] sm:min-h-[100px] border-r border-b border-[rgba(11,30,61,0.07)] p-1 cursor-pointer hover:bg-[#F4F5F7] transition-colors ${
                  !isCurrentMonth ? 'bg-[#FAFAFA]' : 'bg-white'
                } ${idx % 7 === 0 ? 'border-l-0' : ''}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[11px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-[#C9A84C] text-white' : isCurrentMonth ? 'text-[#0B1E3D]' : 'text-[#c0ccd8]'
                  }`}>
                    {day.getDate()}
                  </span>
                  {dayEvs.length > maxShow && (
                    <span className="text-[9px] text-[#5a6a80] font-semibold">+{dayEvs.length - maxShow}</span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayEvs.slice(0, maxShow).map(ev => (
                    <EventChip key={ev.id} ev={ev} compact />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Week view ────────────────────────────────────────────────────────────────

  function WeekView() {
    const weekStart = startOfWeek(cursor)
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    return (
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-7 border-b border-[rgba(11,30,61,0.10)] sticky top-0 bg-white z-10">
          {days.map((day, i) => {
            const ds = toDateStr(day)
            const isToday = ds === todayStr
            return (
              <div key={ds} className="text-center py-2 border-r border-[rgba(11,30,61,0.07)]">
                <div className="text-[10px] text-[#5a6a80] uppercase font-semibold">{HU_DAYS_SHORT[i]}</div>
                <div className={`text-[15px] font-bold mx-auto w-8 h-8 flex items-center justify-center rounded-full ${isToday ? 'bg-[#C9A84C] text-white' : 'text-[#0B1E3D]'}`}>
                  {day.getDate()}
                </div>
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-7 min-h-[400px]">
          {days.map((day) => {
            const ds = toDateStr(day)
            const isToday = ds === todayStr
            const dayEvs = eventsForDay(ds)
            return (
              <div
                key={ds}
                onClick={() => { setCursor(day); setView('day') }}
                className={`border-r border-[rgba(11,30,61,0.07)] p-1.5 cursor-pointer hover:bg-[#F9FAFB] ${isToday ? 'bg-[#FFFBF0]' : ''}`}
              >
                <div className="space-y-1">
                  {dayEvs.map(ev => <EventChip key={ev.id} ev={ev} />)}
                </div>
                {dayEvs.length === 0 && (
                  <div className="text-[10px] text-[#c0ccd8] text-center mt-4">–</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Day view ─────────────────────────────────────────────────────────────────

  function DayView() {
    const ds = toDateStr(cursor)
    const dayEvs = eventsForDay(ds)
    const hours = Array.from({ length: 14 }, (_, i) => i + 7) // 07:00 – 20:00
    return (
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="max-w-2xl mx-auto">
          {/* Unscheduled */}
          {dayEvs.filter(e => !e.start_time).length > 0 && (
            <div className="mb-4">
              <div className="text-[11px] font-bold text-[#5a6a80] uppercase mb-2">Időpont nélkül</div>
              <div className="space-y-1.5">
                {dayEvs.filter(e => !e.start_time).map(ev => (
                  <EventCard key={ev.id} ev={ev} />
                ))}
              </div>
            </div>
          )}
          {/* Hourly grid */}
          <div className="space-y-0.5">
            {hours.map(h => {
              const hStr = h.toString().padStart(2, '0') + ':00'
              const hEvs = dayEvs.filter(e => e.start_time && e.start_time.startsWith(h.toString().padStart(2, '0')))
              return (
                <div key={h} className="flex gap-3 min-h-[48px]">
                  <div className="w-12 text-[11px] text-[#8fa0b5] pt-1 shrink-0 text-right">{hStr}</div>
                  <div className={`flex-1 border-t border-[rgba(11,30,61,0.07)] pt-1 space-y-1 ${hEvs.length > 0 ? '' : 'hover:bg-[#F9FAFB] cursor-pointer'}`}
                    onClick={() => { if (hEvs.length === 0) { setForm({ ...DEFAULT_FORM, date: ds, start_time: hStr }); setModalOpen(true) } }}>
                    {hEvs.map(ev => <EventCard key={ev.id} ev={ev} />)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── List view ────────────────────────────────────────────────────────────────

  function ListView() {
    const grouped: Record<string, CalEvent[]> = {}
    const filtered = events.filter(e => typeFilter === 'all' || e.type === typeFilter)
    filtered.sort((a, b) => a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || ''))
    filtered.forEach(ev => {
      if (!grouped[ev.date]) grouped[ev.date] = []
      grouped[ev.date].push(ev)
    })
    const dates = Object.keys(grouped).sort()
    if (dates.length === 0) return (
      <div className="flex-1 flex items-center justify-center text-[#8fa0b5] text-sm">Nincs esemény ebben az időszakban</div>
    )
    return (
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {dates.map(ds => {
            const d = new Date(ds + 'T12:00:00')
            const isToday = ds === todayStr
            return (
              <div key={ds}>
                <div className={`text-[12px] font-bold uppercase tracking-wide mb-2 flex items-center gap-2 ${isToday ? 'text-[#C9A84C]' : 'text-[#5a6a80]'}`}>
                  {isToday && <span className="bg-[#C9A84C] text-white text-[10px] px-2 py-0.5 rounded-full font-bold">MA</span>}
                  {HU_DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1]}, {d.getDate()}. {HU_MONTHS[d.getMonth()]}
                </div>
                <div className="space-y-2">
                  {grouped[ds].map(ev => <EventCard key={ev.id} ev={ev} />)}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // ── Event card ────────────────────────────────────────────────────────────────

  function EventCard({ ev }: { ev: CalEvent }) {
    const meta = EVENT_META[ev.type]
    const statusMeta = STATUS_META[ev.status]
    return (
      <button
        onClick={() => setSelected(ev)}
        className={`w-full text-left rounded-xl border p-3 transition-all hover:shadow-sm ${meta.bg} ${meta.border}`}
      >
        <div className="flex items-start gap-2">
          <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${meta.dot}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[12px] font-semibold ${meta.color} flex-1 truncate`}>{ev.title}</span>
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${statusMeta.color}`}>{statusMeta.label}</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
              {ev.start_time && (
                <span className="text-[11px] text-[#5a6a80] flex items-center gap-1"><Clock size={9} />{formatTime(ev.start_time)}{ev.end_time ? `–${formatTime(ev.end_time)}` : ''}</span>
              )}
              {ev.customer_name && (
                <span className="text-[11px] text-[#5a6a80] flex items-center gap-1"><User size={9} />{ev.customer_name}</span>
              )}
              {ev.license_plate && (
                <span className="text-[11px] font-mono font-bold text-[#0B1E3D] bg-[#0B1E3D]/10 px-1.5 py-0.5 rounded">{ev.license_plate}</span>
              )}
              {ev.address && (
                <span className="text-[11px] text-[#5a6a80] flex items-center gap-1 truncate"><MapPin size={9} />{ev.address}</span>
              )}
              {ev.assigned_to && (
                <span className="text-[11px] text-[#5a6a80] flex items-center gap-1"><User size={9} />{ev.assigned_to}</span>
              )}
            </div>
          </div>
        </div>
      </button>
    )
  }

  // ── Event detail modal ────────────────────────────────────────────────────────

  function EventDetail() {
    if (!selected) return null
    const meta = EVENT_META[selected.type]
    const statusMeta = STATUS_META[selected.status]
    const isMobile = ['mobile_service','mobile_tire','mobile_cleaning'].includes(selected.type)
    const googleMapsUrl = selected.address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.address)}`
      : null

    return (
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4" onClick={() => setSelected(null)}>
        <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()}>
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 bg-[rgba(11,30,61,0.15)] rounded-full" /></div>
          {/* Header */}
          <div className={`px-5 py-4 border-b ${meta.bg} ${meta.border} border-b flex items-start gap-3`}>
            <span className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${meta.dot}`} />
            <div className="flex-1 min-w-0">
              <div className={`text-[11px] font-bold uppercase tracking-wide ${meta.color} mb-0.5`}>{meta.label}</div>
              <h3 className="text-[15px] font-bold text-[#0B1E3D] leading-snug">{selected.title}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusMeta.color}`}>{statusMeta.label}</span>
                {selected.start_time && <span className="text-[11px] text-[#5a6a80] flex items-center gap-1"><Clock size={10} />{formatTime(selected.start_time)}</span>}
              </div>
            </div>
            <button onClick={() => setSelected(null)} className="text-[#5a6a80] hover:text-[#0B1E3D] p-1"><X size={18} /></button>
          </div>
          {/* Body */}
          <div className="px-5 py-4 space-y-3">
            {selected.customer_name && (
              <div className="flex items-center gap-3">
                <User size={14} className="text-[#5a6a80] flex-shrink-0" />
                <div>
                  <div className="text-[12px] font-semibold text-[#0B1E3D]">{selected.customer_name}</div>
                  {selected.customer_phone && <div className="text-[11px] text-[#5a6a80]">{selected.customer_phone}</div>}
                </div>
              </div>
            )}
            {selected.vehicle_info && (
              <div className="flex items-center gap-3">
                <Car size={14} className="text-[#5a6a80] flex-shrink-0" />
                <div>
                  <div className="text-[12px] font-semibold text-[#0B1E3D]">{selected.vehicle_info}</div>
                  {selected.license_plate && <span className="text-[11px] font-mono font-bold bg-[#0B1E3D] text-white px-2 py-0.5 rounded mt-0.5 inline-block">{selected.license_plate}</span>}
                </div>
              </div>
            )}
            {selected.address && (
              <div className="flex items-start gap-3">
                <MapPin size={14} className="text-[#5a6a80] flex-shrink-0 mt-0.5" />
                <div className="text-[12px] text-[#0B1E3D]">{selected.address}</div>
              </div>
            )}
            {selected.assigned_to && (
              <div className="flex items-center gap-3">
                <User size={14} className="text-[#5a6a80] flex-shrink-0" />
                <div className="text-[12px] text-[#5a6a80]">Felelős: <span className="font-semibold text-[#0B1E3D]">{selected.assigned_to}</span></div>
              </div>
            )}
            {selected.notes && (
              <div className="bg-[#F4F5F7] rounded-lg px-3 py-2 text-[12px] text-[#5a6a80]">{selected.notes}</div>
            )}
          </div>
          {/* Actions */}
          <div className="px-5 pb-5 pt-1 grid grid-cols-2 gap-2" style={{ paddingBottom: 'max(20px, env(safe-area-inset-bottom, 20px))' }}>
            {isMobile && googleMapsUrl && (
              <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer"
                className="col-span-2 flex items-center justify-center gap-2 py-3 bg-[#0B1E3D] text-white rounded-xl text-[13px] font-bold">
                <Navigation size={15} /> Navigáció indítása
              </a>
            )}
            {selected.customer_phone && (
              <a href={`tel:${selected.customer_phone}`}
                className="flex items-center justify-center gap-1.5 py-2.5 border border-[rgba(11,30,61,0.18)] text-[#0B1E3D] rounded-xl text-[12px] font-semibold">
                <Phone size={13} /> Hívás
              </a>
            )}
            {selected.customer_phone && (
              <a href={`https://wa.me/${selected.customer_phone?.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 bg-emerald-500 text-white rounded-xl text-[12px] font-semibold">
                💬 WhatsApp
              </a>
            )}
            {selected.work_order_id && (
              <button
                onClick={() => { setSelected(null) }}
                className="col-span-2 flex items-center justify-center gap-2 py-2.5 bg-[#185FA5] text-white rounded-xl text-[12px] font-semibold">
                <CheckCircle size={13} /> Munkalap megnyitása
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Header title ──────────────────────────────────────────────────────────────

  const headerTitle = () => {
    if (view === 'month') return `${HU_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    if (view === 'week') {
      const ws = startOfWeek(cursor)
      const we = addDays(ws, 6)
      return `${ws.getDate()}. – ${we.getDate()}. ${HU_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    }
    if (view === 'day') {
      return `${cursor.getDate()}. ${HU_MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}, ${HU_DAYS[cursor.getDay() === 0 ? 6 : cursor.getDay() - 1]}`
    }
    return 'Következő 30 nap'
  }

  // ── Filtered vehicle list ─────────────────────────────────────────────────────
  const filteredVehicles = form.customer_id ? vehicles.filter(v => v.customer_id === form.customer_id) : vehicles

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full animate-fade-in">

      {/* ── Toolbar ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {/* View selector */}
        <div className="flex bg-[#F4F5F7] rounded-xl p-1 gap-0.5">
          {(['month','week','day','list'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-[12px] font-semibold transition-colors ${view === v ? 'bg-[#0B1E3D] text-white' : 'text-[#5a6a80] hover:text-[#0B1E3D]'}`}>
              {v === 'month' ? 'Hónap' : v === 'week' ? 'Hét' : v === 'day' ? 'Nap' : 'Lista'}
            </button>
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-1">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[#F4F5F7] text-[#5a6a80] hover:text-[#0B1E3D]" style={{ minHeight: 36, minWidth: 36 }}>
            <ChevronLeft size={16} />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 text-[11px] font-semibold text-[#0B1E3D] border border-[rgba(11,30,61,0.18)] rounded-lg hover:bg-[#F4F5F7]" style={{ minHeight: 36 }}>
            Ma
          </button>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-[#F4F5F7] text-[#5a6a80] hover:text-[#0B1E3D]" style={{ minHeight: 36, minWidth: 36 }}>
            <ChevronRight size={16} />
          </button>
        </div>

        <span className="text-[13px] font-semibold text-[#0B1E3D] flex-1 min-w-0 truncate">{headerTitle()}</span>

        <button onClick={load} className="p-2 text-[#5a6a80] hover:text-[#0B1E3D] rounded-lg hover:bg-[#F4F5F7]" title="Frissítés" style={{ minHeight: 36, minWidth: 36 }}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
        {!isMechanic && (
          <Button variant="primary" onClick={() => { setForm({ ...DEFAULT_FORM, date: toDateStr(cursor) }); setModalOpen(true) }}>
            <Plus size={14} /> <span className="hidden sm:inline">Új esemény</span>
          </Button>
        )}
      </div>

      {/* ── Type filter chips ─────────────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-hide mb-2">
        <button onClick={() => setTypeFilter('all')}
          className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${typeFilter === 'all' ? 'bg-[#0B1E3D] text-white border-[#0B1E3D]' : 'bg-white text-[#5a6a80] border-[rgba(11,30,61,0.18)] hover:border-[#0B1E3D]'}`}>
          Összes
        </button>
        {(Object.entries(EVENT_META) as [EventType, typeof EVENT_META[EventType]][]).map(([type, meta]) => (
          <button key={type} onClick={() => setTypeFilter(type === typeFilter ? 'all' : type)}
            className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${typeFilter === type ? `${meta.bg} ${meta.color} ${meta.border}` : 'bg-white text-[#5a6a80] border-[rgba(11,30,61,0.18)] hover:border-[#0B1E3D]'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </button>
        ))}
      </div>

      {/* ── Calendar body ─────────────────────────────────────────────────────── */}
      <div className="flex-1 bg-white rounded-2xl border border-[rgba(11,30,61,0.10)] overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-[#5a6a80] text-sm">Betöltés...</div>
        ) : (
          <>
            {view === 'month' && <MonthView />}
            {view === 'week' && <WeekView />}
            {view === 'day' && <DayView />}
            {view === 'list' && <ListView />}
          </>
        )}
      </div>

      {/* ── New event modal ───────────────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Új esemény" className="max-w-xl"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={saveEvent} disabled={saving}>{saving ? 'Mentés...' : 'Létrehozás'}</Button></>}>
        <div className="space-y-3">
          <div className="flex gap-1.5 flex-wrap">
            {(Object.entries(EVENT_META) as [EventType, typeof EVENT_META[EventType]][]).map(([type, meta]) => (
              <button key={type} onClick={() => setForm((f: any) => ({ ...f, type }))}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-colors ${form.type === type ? `${meta.bg} ${meta.color} ${meta.border}` : 'bg-white text-[#5a6a80] border-[rgba(11,30,61,0.18)]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />{meta.label}
              </button>
            ))}
          </div>

          <FormGroup>
            <FormLabel>Cím *</FormLabel>
            <Input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="Esemény megnevezése..." />
          </FormGroup>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormGroup>
              <FormLabel>Dátum *</FormLabel>
              <Input type="date" value={form.date} onChange={e => setForm((f: any) => ({ ...f, date: e.target.value }))} />
            </FormGroup>
            <FormGroup>
              <FormLabel>Kezdés</FormLabel>
              <Input type="time" value={form.start_time} onChange={e => setForm((f: any) => ({ ...f, start_time: e.target.value }))} />
            </FormGroup>
            <FormGroup>
              <FormLabel>Vége</FormLabel>
              <Input type="time" value={form.end_time} onChange={e => setForm((f: any) => ({ ...f, end_time: e.target.value }))} />
            </FormGroup>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormGroup>
              <FormLabel>Ügyfél</FormLabel>
              <Select value={form.customer_id} onChange={e => setForm((f: any) => ({ ...f, customer_id: e.target.value, vehicle_id: '' }))}>
                <option value="">–</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </Select>
            </FormGroup>
            <FormGroup>
              <FormLabel>Jármű</FormLabel>
              <Select value={form.vehicle_id} onChange={e => setForm((f: any) => ({ ...f, vehicle_id: e.target.value }))}>
                <option value="">–</option>
                {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} – {v.license_plate}</option>)}
              </Select>
            </FormGroup>
          </div>

          {['mobile_service','mobile_tire','mobile_cleaning','pickup','delivery'].includes(form.type) && (
            <FormGroup>
              <FormLabel>Cím / Helyszín</FormLabel>
              <Input value={form.address} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} placeholder="Utca, házszám, irányítószám..." />
            </FormGroup>
          )}

          <FormGroup>
            <FormLabel>Felelős</FormLabel>
            <Select value={form.assigned_to} onChange={e => setForm((f: any) => ({ ...f, assigned_to: e.target.value }))}>
              <option value="">–</option>
              {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </Select>
          </FormGroup>

          <FormGroup>
            <FormLabel>Megjegyzés</FormLabel>
            <Textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2} />
          </FormGroup>
        </div>
      </Modal>

      {/* ── Event detail ──────────────────────────────────────────────────────── */}
      {selected && <EventDetail />}
    </div>
  )
}
