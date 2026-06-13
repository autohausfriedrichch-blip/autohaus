'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import {
  Wrench, CheckCircle, Truck, Bell, FileText, CreditCard, StickyNote, Camera,
  Edit2, Plus, ChevronDown, Activity, Calendar, DollarSign, Clock, X
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string
  make: string
  model: string
  license_plate: string
  mileage: number | null
  health_score: number | null
  tire_profile_mm: number | null
  brake_condition: 'good' | 'fair' | 'poor' | null
  battery_condition: 'good' | 'fair' | 'poor' | null
  last_service_date: string | null
  next_service_date: string | null
  customer_id: string
  customer?: { full_name: string }
}

interface VehicleEvent {
  id: string
  vehicle_id: string
  event_type: string
  title: string
  description: string | null
  amount: number | null
  event_date: string
  created_at: string
  _source: 'event'
}

interface WorkOrder {
  id: string
  order_number: string
  status: string
  total_amount: number | null
  created_at: string
  fault_description: string | null
  _source: 'work_order'
}

type TimelineItem = (VehicleEvent | WorkOrder) & { _displayDate: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const conditionMap: Record<string, { label: string; color: string }> = {
  good: { label: 'jó', color: '#22c55e' },
  fair: { label: 'közepes', color: '#f59e0b' },
  poor: { label: 'rossz', color: '#C8102E' },
}

function ConditionDot({ value }: { value: string | null }) {
  const c = value ? conditionMap[value] : { label: '—', color: '#888888' }
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
      <span className="text-[12px] text-[#0D0D0D] font-medium">{c.label}</span>
    </span>
  )
}

function HealthBadge({ score }: { score: number | null }) {
  const s = score ?? 0
  const color = s >= 70 ? '#22c55e' : s >= 40 ? '#f59e0b' : '#C8102E'
  const bg = s >= 70 ? '#dcfce7' : s >= 40 ? '#fef3c7' : '#fee2e2'
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ color, backgroundColor: bg }}
    >
      <Activity size={11} /> {s}%
    </span>
  )
}

function eventTypeIcon(type: string) {
  const iconClass = 'shrink-0'
  switch (type) {
    case 'work_order': return <Wrench size={15} className={iconClass} />
    case 'checkin': return <CheckCircle size={15} className={iconClass} />
    case 'checkout':
    case 'pickup': return <Truck size={15} className={iconClass} />
    case 'reminder': return <Bell size={15} className={iconClass} />
    case 'invoice': return <FileText size={15} className={iconClass} />
    case 'payment': return <CreditCard size={15} className={iconClass} />
    case 'photo': return <Camera size={15} className={iconClass} />
    default: return <StickyNote size={15} className={iconClass} />
  }
}

function eventTypeColor(type: string) {
  switch (type) {
    case 'work_order': return '#C8102E'
    case 'checkin': return '#22c55e'
    case 'checkout':
    case 'pickup': return '#3b82f6'
    case 'reminder': return '#f59e0b'
    case 'invoice': return '#8b5cf6'
    case 'payment': return '#22c55e'
    default: return '#4a4a4a'
  }
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtCHF(n: number | null) {
  if (!n) return null
  return `CHF ${n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Health indicators ────────────────────────────────────────────────────────

function healthIndicators(v: Vehicle) {
  const score = v.health_score ?? 0
  const mileage = v.mileage ?? 0
  const mileageOk = mileage < 150000 ? 'good' : mileage < 250000 ? 'fair' : 'poor'
  const hasRecent = v.last_service_date
    ? (Date.now() - new Date(v.last_service_date).getTime()) / 86400000 < 180
      ? 'good' : 'fair'
    : 'poor'

  return [
    { label: 'Szerviz előzmény', value: score >= 70 ? 'good' : score >= 40 ? 'fair' : 'poor' },
    { label: 'Futásteljesítmény', value: mileageOk },
    { label: 'Gumiprofil', value: v.tire_profile_mm == null ? null : v.tire_profile_mm >= 4 ? 'good' : v.tire_profile_mm >= 2 ? 'fair' : 'poor' },
    { label: 'Fék állapot', value: v.brake_condition },
    { label: 'Akkumulátor', value: v.battery_condition },
    { label: 'Utolsó karbantartás', value: hasRecent },
  ]
}

// ─── EVENT_TYPE options ───────────────────────────────────────────────────────

const eventTypeOptions = [
  { value: 'work_order', label: 'Munkalap' },
  { value: 'checkin', label: 'Beérkezés' },
  { value: 'checkout', label: 'Kiadás' },
  { value: 'reminder', label: 'Emlékeztető' },
  { value: 'invoice', label: 'Számla' },
  { value: 'payment', label: 'Befizetés' },
  { value: 'note', label: 'Megjegyzés' },
]

// ─── Main Component ───────────────────────────────────────────────────────────

export function VehicleLifecyclePage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const supabase = createClient()
  const { toast } = useToast()

  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [vehicleId, setVehicleId] = useState<string>('')
  const [vehicle, setVehicle] = useState<Vehicle | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [loadingVehicles, setLoadingVehicles] = useState(true)
  const [loadingTimeline, setLoadingTimeline] = useState(false)

  // Stats
  const [totalSpent, setTotalSpent] = useState(0)
  const [visitCount, setVisitCount] = useState(0)

  // Health editor
  const [editingHealth, setEditingHealth] = useState(false)
  const [healthForm, setHealthForm] = useState<Partial<Vehicle>>({})
  const [savingHealth, setSavingHealth] = useState(false)

  // Add event modal
  const [eventModalOpen, setEventModalOpen] = useState(false)
  const [eventForm, setEventForm] = useState({
    event_type: 'note',
    title: '',
    description: '',
    amount: '',
    event_date: new Date().toISOString().split('T')[0],
  })
  const [savingEvent, setSavingEvent] = useState(false)

  // ── Load vehicles ────────────────────────────────────────────────────────────
  const loadVehicles = useCallback(async () => {
    setLoadingVehicles(true)
    const { data } = await supabase
      .from('vehicles')
      .select('*, customer:customers(full_name)')
      .order('make')
    setVehicles((data as any) || [])
    setLoadingVehicles(false)
  }, [refreshKey])

  useEffect(() => { loadVehicles() }, [loadVehicles])

  // ── Load vehicle detail + timeline ──────────────────────────────────────────
  const loadVehicleData = useCallback(async (id: string) => {
    if (!id) { setVehicle(null); setTimeline([]); return }
    setLoadingTimeline(true)

    const [{ data: vData }, { data: evData }, { data: woData }] = await Promise.all([
      supabase.from('vehicles').select('*, customer:customers(full_name)').eq('id', id).single(),
      supabase.from('vehicle_events').select('*').eq('vehicle_id', id).order('event_date', { ascending: false }),
      supabase.from('work_orders').select('id,order_number,status,total_amount,created_at,fault_description').eq('vehicle_id', id).order('created_at', { ascending: false }),
    ])

    setVehicle((vData as any) || null)
    if (vData) {
      setHealthForm(vData as any)
    }

    // Merge timeline
    const events: TimelineItem[] = [
      ...((evData || []) as any[]).map((e: any) => ({ ...e, _source: 'event', _displayDate: e.event_date })),
      ...((woData || []) as any[]).map((w: any) => ({ ...w, _source: 'work_order', _displayDate: w.created_at })),
    ]
    events.sort((a, b) => new Date(b._displayDate).getTime() - new Date(a._displayDate).getTime())
    setTimeline(events)

    // Stats
    const spent = (woData || []).reduce((s: number, w: any) => s + (w.total_amount || 0), 0)
    setTotalSpent(spent)
    setVisitCount((woData || []).length)

    setLoadingTimeline(false)
  }, [])

  useEffect(() => { loadVehicleData(vehicleId) }, [vehicleId, loadVehicleData])

  // ── Health save ──────────────────────────────────────────────────────────────
  const saveHealth = async () => {
    if (!vehicleId) return
    setSavingHealth(true)
    const { error } = await supabase.from('vehicles').update({
      health_score: healthForm.health_score,
      tire_profile_mm: healthForm.tire_profile_mm,
      brake_condition: healthForm.brake_condition,
      battery_condition: healthForm.battery_condition,
      last_service_date: healthForm.last_service_date,
      next_service_date: healthForm.next_service_date,
      mileage: healthForm.mileage,
    }).eq('id', vehicleId)
    setSavingHealth(false)
    if (error) { toast('Hiba a mentésnél', 'error') }
    else {
      toast('Jármű adatok frissítve')
      setEditingHealth(false)
      loadVehicleData(vehicleId)
      onRefresh()
    }
  }

  // ── Add event save ────────────────────────────────────────────────────────────
  const saveEvent = async () => {
    if (!eventForm.title || !vehicleId) { toast('Cím megadása kötelező', 'error'); return }
    setSavingEvent(true)
    const { error } = await supabase.from('vehicle_events').insert({
      vehicle_id: vehicleId,
      event_type: eventForm.event_type,
      title: eventForm.title,
      description: eventForm.description || null,
      amount: eventForm.amount ? parseFloat(eventForm.amount) : null,
      event_date: eventForm.event_date,
    })
    setSavingEvent(false)
    if (error) { toast('Hiba a mentésnél', 'error') }
    else {
      toast('Esemény hozzáadva')
      setEventModalOpen(false)
      setEventForm({ event_type: 'note', title: '', description: '', amount: '', event_date: new Date().toISOString().split('T')[0] })
      loadVehicleData(vehicleId)
    }
  }

  const indicators = vehicle ? healthIndicators(vehicle) : []
  const healthScore = vehicle?.health_score ?? 0
  const healthColor = healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#f59e0b' : '#C8102E'

  return (
    <div className="animate-fade-in space-y-4">

      {/* ── Vehicle Selector ── */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888888] pointer-events-none" />
            <select
              className="w-full pl-3 pr-8 py-2 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] bg-white text-[#0D0D0D] outline-none focus:border-[#0D0D0D] appearance-none"
              value={vehicleId}
              onChange={e => { setVehicleId(e.target.value); setEditingHealth(false) }}
              disabled={loadingVehicles}
            >
              <option value="">— Jármű kiválasztása —</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} · {v.license_plate}{v.customer ? ` · ${(v as any).customer.full_name}` : ''}
                </option>
              ))}
            </select>
          </div>
          {vehicleId && (
            <Button variant="secondary" size="sm" onClick={() => { setEventModalOpen(true) }}>
              <Plus size={13} /> Esemény
            </Button>
          )}
        </div>
      </Card>

      {/* ── Vehicle Dashboard ── */}
      {vehicle && (
        <>
          {/* Header card */}
          <Card>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2.5 mb-1">
                  <h2 className="font-['Montserrat'] text-[22px] text-[#0D0D0D]">
                    {vehicle.make} {vehicle.model}
                  </h2>
                  <HealthBadge score={vehicle.health_score} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[#4a4a4a]">
                  <span className="font-semibold text-[#0D0D0D] bg-[#F4F5F7] px-2 py-0.5 rounded text-[12px]">
                    {vehicle.license_plate}
                  </span>
                  {(vehicle as any).customer?.full_name && (
                    <span>{(vehicle as any).customer.full_name}</span>
                  )}
                  {vehicle.mileage && (
                    <span>{vehicle.mileage.toLocaleString('de-CH')} km</span>
                  )}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-[rgba(0,0,0,0.08)]">
              {[
                { icon: <DollarSign size={14} />, label: 'Összes kiadás', value: `CHF ${totalSpent.toLocaleString('de-CH', { minimumFractionDigits: 2 })}` },
                { icon: <Wrench size={14} />, label: 'Munkák száma', value: `${visitCount} db` },
                { icon: <Clock size={14} />, label: 'Utolsó szerviz', value: fmtDate(vehicle.last_service_date) },
                { icon: <Calendar size={14} />, label: 'Következő szerviz', value: fmtDate(vehicle.next_service_date) },
              ].map(stat => (
                <div key={stat.label} className="bg-[#F4F5F7] rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-[#C8102E] mb-1">{stat.icon}</div>
                  <div className="text-[11px] text-[#4a4a4a] mb-0.5">{stat.label}</div>
                  <div className="text-[13px] font-semibold text-[#0D0D0D]">{stat.value}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Health Score Card ── */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <CardTitle icon={<Activity size={14} />}>Egészségi állapot</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setEditingHealth(v => !v)}>
                {editingHealth ? <X size={13} /> : <Edit2 size={13} />}
                {editingHealth ? 'Mégse' : 'Szerkesztés'}
              </Button>
            </div>

            {/* Progress bar */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-[#4a4a4a]">Összesített pontszám</span>
                <span className="text-[18px] font-bold" style={{ color: healthColor }}>{healthScore}/100</span>
              </div>
              <div className="w-full h-3 bg-[#F4F5F7] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${healthScore}%`, backgroundColor: healthColor }}
                />
              </div>
            </div>

            {/* 6 indicators */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {indicators.map(ind => (
                <div key={ind.label} className="flex items-center justify-between bg-[#F4F5F7] rounded-lg px-3 py-2.5">
                  <span className="text-[11px] text-[#4a4a4a]">{ind.label}</span>
                  <ConditionDot value={ind.value} />
                </div>
              ))}
            </div>

            {/* Inline health editor */}
            {editingHealth && (
              <div className="mt-5 pt-5 border-t border-[rgba(0,0,0,0.10)] space-y-0">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <FormGroup>
                    <FormLabel>Egészségi pontszám (0–100)</FormLabel>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={0} max={100}
                        value={healthForm.health_score ?? 0}
                        onChange={e => setHealthForm(f => ({ ...f, health_score: parseInt(e.target.value) }))}
                        className="flex-1 accent-[#0D0D0D]"
                      />
                      <span className="text-[13px] font-bold text-[#0D0D0D] w-8 text-right">{healthForm.health_score ?? 0}</span>
                    </div>
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Futásteljesítmény (km)</FormLabel>
                    <Input
                      type="number"
                      value={healthForm.mileage ?? ''}
                      onChange={e => setHealthForm(f => ({ ...f, mileage: parseInt(e.target.value) || 0 }))}
                    />
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Gumiprofil (mm)</FormLabel>
                    <Input
                      type="number" step="0.1"
                      value={healthForm.tire_profile_mm ?? ''}
                      onChange={e => setHealthForm(f => ({ ...f, tire_profile_mm: parseFloat(e.target.value) || null }))}
                    />
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Fék állapot</FormLabel>
                    <Select
                      value={healthForm.brake_condition ?? ''}
                      onChange={e => setHealthForm(f => ({ ...f, brake_condition: e.target.value as any }))}
                    >
                      <option value="">—</option>
                      <option value="good">Jó</option>
                      <option value="fair">Közepes</option>
                      <option value="poor">Rossz</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Akkumulátor állapot</FormLabel>
                    <Select
                      value={healthForm.battery_condition ?? ''}
                      onChange={e => setHealthForm(f => ({ ...f, battery_condition: e.target.value as any }))}
                    >
                      <option value="">—</option>
                      <option value="good">Jó</option>
                      <option value="fair">Közepes</option>
                      <option value="poor">Rossz</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Utolsó szerviz dátuma</FormLabel>
                    <Input
                      type="date"
                      value={healthForm.last_service_date ?? ''}
                      onChange={e => setHealthForm(f => ({ ...f, last_service_date: e.target.value }))}
                    />
                  </FormGroup>
                  <FormGroup className="col-span-2 md:col-span-1">
                    <FormLabel>Következő szerviz dátuma</FormLabel>
                    <Input
                      type="date"
                      value={healthForm.next_service_date ?? ''}
                      onChange={e => setHealthForm(f => ({ ...f, next_service_date: e.target.value }))}
                    />
                  </FormGroup>
                </div>
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" onClick={saveHealth} disabled={savingHealth}>
                    {savingHealth ? 'Mentés...' : 'Mentés'}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* ── Timeline ── */}
          <Card>
            <CardTitle icon={<Clock size={14} />}>Előzmények</CardTitle>

            {loadingTimeline ? (
              <div className="text-[13px] text-[#4a4a4a] py-6 text-center">Betöltés...</div>
            ) : timeline.length === 0 ? (
              <div className="text-[13px] text-[#4a4a4a] py-6 text-center">Még nincs esemény ehhez a járműhöz.</div>
            ) : (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[rgba(0,0,0,0.08)]" />
                <div className="space-y-0">
                  {timeline.map((item, idx) => {
                    const isWO = item._source === 'work_order'
                    const wo = item as WorkOrder
                    const ev = item as VehicleEvent
                    const type = isWO ? 'work_order' : ev.event_type
                    const color = eventTypeColor(type)
                    const title = isWO ? `#${wo.order_number} – Munkalap` : ev.title
                    const desc = isWO ? wo.fault_description : ev.description
                    const amount = isWO ? wo.total_amount : ev.amount
                    const date = item._displayDate

                    return (
                      <div key={`${item._source}-${item.id}`} className="flex gap-4 pb-5 last:pb-0">
                        {/* Icon bubble */}
                        <div
                          className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0 border-2 border-white shadow-sm"
                          style={{ backgroundColor: `${color}18`, color }}
                        >
                          {eventTypeIcon(type)}
                        </div>
                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold text-[#0D0D0D] truncate">{title}</div>
                              {desc && <div className="text-[12px] text-[#4a4a4a] mt-0.5 line-clamp-2">{desc}</div>}
                              {isWO && (
                                <span
                                  className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{
                                    color: wo.status === 'completed' ? '#22c55e' : wo.status === 'in_progress' ? '#f59e0b' : '#4a4a4a',
                                    backgroundColor: wo.status === 'completed' ? '#dcfce7' : wo.status === 'in_progress' ? '#fef3c7' : '#F4F5F7',
                                  }}
                                >
                                  {wo.status === 'completed' ? 'Kész' : wo.status === 'in_progress' ? 'Folyamatban' : wo.status}
                                </span>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[11px] text-[#4a4a4a]">{fmtDate(date)}</div>
                              {amount != null && (
                                <div className="text-[12px] font-semibold text-[#0D0D0D] mt-0.5">{fmtCHF(amount)}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </Card>
        </>
      )}

      {/* ── Add Event Modal ── */}
      <Modal
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        title="Esemény hozzáadása"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEventModalOpen(false)}>Mégse</Button>
            <Button variant="primary" onClick={saveEvent} disabled={savingEvent}>
              {savingEvent ? 'Mentés...' : 'Mentés'}
            </Button>
          </>
        }
      >
        <FormGroup>
          <FormLabel>Esemény típusa</FormLabel>
          <Select value={eventForm.event_type} onChange={e => setEventForm(f => ({ ...f, event_type: e.target.value }))}>
            {eventTypeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </Select>
        </FormGroup>
        <FormGroup>
          <FormLabel>Cím *</FormLabel>
          <Input
            value={eventForm.title}
            onChange={e => setEventForm(f => ({ ...f, title: e.target.value }))}
            placeholder="pl. Olajcsere elvégezve"
          />
        </FormGroup>
        <FormGroup>
          <FormLabel>Leírás</FormLabel>
          <Textarea
            value={eventForm.description}
            onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Részletek..."
          />
        </FormGroup>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup>
            <FormLabel>Összeg (CHF)</FormLabel>
            <Input
              type="number" step="0.01"
              value={eventForm.amount}
              onChange={e => setEventForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
            />
          </FormGroup>
          <FormGroup>
            <FormLabel>Dátum</FormLabel>
            <Input
              type="date"
              value={eventForm.event_date}
              onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))}
            />
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
