'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea, FormGroup, FormLabel } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { MapPin, Truck } from 'lucide-react'

const MOBILE_SERVICE_TYPES = [
  { value: 'tire_service', label: 'Mobil Gumiszerviz', icon: '🔧' },
  { value: 'cleaning_express', label: 'Express Clean', icon: '🧹' },
  { value: 'cleaning_interior', label: 'Interior Clean', icon: '🧹' },
  { value: 'cleaning_exterior', label: 'Exterior Clean', icon: '🧹' },
  { value: 'cleaning_premium', label: 'Premium Clean', icon: '🧹' },
  { value: 'detailing_interior', label: 'Interior Detail', icon: '✨' },
  { value: 'detailing_exterior', label: 'Exterior Detail', icon: '✨' },
  { value: 'detailing_full', label: 'Full Detail', icon: '✨' },
  { value: 'detailing_ceramic', label: 'Ceramic Prep', icon: '✨' },
  { value: 'diagnostics', label: 'Mobil Diagnosztika', icon: '🔍' },
  { value: 'assessment', label: 'Állapotfelmérés', icon: '📋' },
  { value: 'pickup_delivery', label: 'Pickup & Delivery', icon: '🚗' },
]

const MOBILE_STATUSES: Record<string, string> = {
  scheduled: 'Időpont egyeztetve',
  en_route: 'Úton',
  arrived: 'Megérkezett',
  checked_in: 'Check-In kész',
  in_progress: 'Munka folyamatban',
  documented: 'Fotódokumentáció kész',
  checked_out: 'Check-Out kész',
  paid: 'Fizetve',
  completed: 'Lezárva',
}

const MOBILE_STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  en_route: 'bg-yellow-100 text-yellow-700',
  arrived: 'bg-orange-100 text-orange-700',
  checked_in: 'bg-purple-100 text-purple-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  documented: 'bg-cyan-100 text-cyan-700',
  checked_out: 'bg-teal-100 text-teal-700',
  paid: 'bg-green-100 text-green-700',
  completed: 'bg-gray-100 text-gray-600',
}

const TABS = [
  { id: 'dashboard', label: '🏠 Dashboard' },
  { id: 'jobs', label: '📋 Mobile Jobs' },
  { id: 'route', label: '🗺️ Útvonal' },
  { id: 'pickup', label: '🚗 Pickup & Delivery' },
  { id: 'tire', label: '🔧 Gumiszerviz' },
  { id: 'cleaning', label: '🧹 Takarítás' },
  { id: 'detailing', label: '✨ Detailing' },
  { id: 'diagnostics', label: '🔍 Diagnosztika' },
]

function getServiceLabel(value: string) {
  return MOBILE_SERVICE_TYPES.find(t => t.value === value)?.label || value
}
function getServiceIcon(value: string) {
  return MOBILE_SERVICE_TYPES.find(t => t.value === value)?.icon || '🔧'
}

function StatusPill({ status }: { status: string }) {
  const color = MOBILE_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>
      {MOBILE_STATUSES[status] || status}
    </span>
  )
}

interface Job {
  id: string
  order_number: string
  mobile_service_type: string
  mobile_status: string
  mobile_address: string
  mobile_km: number
  travel_cost: number
  travel_cost_charged: boolean
  technician_name: string
  scheduled_date: string
  scheduled_time: string
  notes: string
  tire_size: string
  tire_dot: string
  tire_tread_depth: number
  tire_pressure: number
  customer: { full_name: string; phone: string; is_vip: boolean } | null
  vehicle: { make: string; model: string; license_plate: string } | null
}

interface NewJobForm {
  customer_id: string
  vehicle_id: string
  mobile_service_type: string
  mobile_address: string
  scheduled_date: string
  scheduled_time: string
  technician_name: string
  travel_cost: string
  notes: string
  is_vip_override: boolean
}

const defaultForm: NewJobForm = {
  customer_id: '',
  vehicle_id: '',
  mobile_service_type: 'tire_service',
  mobile_address: '',
  scheduled_date: new Date().toISOString().split('T')[0],
  scheduled_time: '08:00',
  technician_name: 'Karl',
  travel_cost: '',
  notes: '',
  is_vip_override: false,
}

// ---- New Job Modal ----
function NewJobModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<NewJobForm>(defaultForm)
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (!open) return
    supabase.from('customers').select('id, full_name, is_vip').order('full_name').then(({ data }) => setCustomers(data || []))
    setForm(defaultForm)
  }, [open])

  useEffect(() => {
    if (!form.customer_id) { setVehicles([]); return }
    supabase.from('vehicles').select('id, make, model, license_plate').eq('customer_id', form.customer_id)
      .then(({ data }) => setVehicles(data || []))
    const cust = customers.find(c => c.id === form.customer_id)
    if (cust?.is_vip) setForm(f => ({ ...f, travel_cost: '0', is_vip_override: true }))
    else setForm(f => ({ ...f, is_vip_override: false }))
  }, [form.customer_id])

  const set = (k: keyof NewJobForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.customer_id || !form.mobile_service_type) {
      toast('Ügyfél és szolgáltatás megadása kötelező', 'error')
      return
    }
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const orderNum = `MOB-${Date.now().toString().slice(-6)}`
    const { error } = await supabase.from('work_orders').insert({
      order_number: orderNum,
      customer_id: form.customer_id || null,
      vehicle_id: form.vehicle_id || null,
      is_mobile: true,
      mobile_service_type: form.mobile_service_type,
      mobile_address: form.mobile_address,
      mobile_status: 'scheduled',
      travel_cost: form.travel_cost ? parseFloat(form.travel_cost) : null,
      travel_cost_charged: !form.is_vip_override,
      technician_name: form.technician_name,
      scheduled_date: form.scheduled_date || today,
      scheduled_time: form.scheduled_time || null,
      notes: form.notes,
      status: 'open',
    } as any)
    setSaving(false)
    if (error) { toast(error.message, 'error'); return }
    toast('Új mobil munka létrehozva')
    onSaved()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Új Mobil Munka"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Mégse</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</Button>
      </>}>
      <FormGroup>
        <FormLabel>Ügyfél</FormLabel>
        <Select value={form.customer_id} onChange={e => set('customer_id', e.target.value)}>
          <option value="">-- Válassz ügyfelet --</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}{c.is_vip ? ' ⭐' : ''}</option>)}
        </Select>
      </FormGroup>
      <FormGroup>
        <FormLabel>Jármű</FormLabel>
        <Select value={form.vehicle_id} onChange={e => set('vehicle_id', e.target.value)} disabled={!form.customer_id}>
          <option value="">-- Válassz járművet --</option>
          {vehicles.map(v => <option key={v.id} value={v.id}>{v.license_plate} – {v.make} {v.model}</option>)}
        </Select>
      </FormGroup>
      <FormGroup>
        <FormLabel>Szolgáltatás típusa</FormLabel>
        <Select value={form.mobile_service_type} onChange={e => set('mobile_service_type', e.target.value)}>
          {MOBILE_SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
        </Select>
      </FormGroup>
      <FormGroup>
        <FormLabel>Cím</FormLabel>
        <Input value={form.mobile_address} onChange={e => set('mobile_address', e.target.value)} placeholder="Ügyél címe..." />
      </FormGroup>
      <div className="grid grid-cols-2 gap-3">
        <FormGroup>
          <FormLabel>Dátum</FormLabel>
          <Input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)} />
        </FormGroup>
        <FormGroup>
          <FormLabel>Időpont</FormLabel>
          <Input type="time" value={form.scheduled_time} onChange={e => set('scheduled_time', e.target.value)} />
        </FormGroup>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormGroup>
          <FormLabel>Technikus</FormLabel>
          <Input value={form.technician_name} onChange={e => set('technician_name', e.target.value)} placeholder="Karl" />
        </FormGroup>
        <FormGroup>
          <FormLabel>Kiszállási díj CHF {form.is_vip_override && <span className="text-[#C9A84C]">⭐ VIP</span>}</FormLabel>
          <Input type="number" value={form.travel_cost} onChange={e => set('travel_cost', e.target.value)} placeholder="0.00" disabled={form.is_vip_override} />
        </FormGroup>
      </div>
      <FormGroup>
        <FormLabel>Megjegyzés</FormLabel>
        <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Megjegyzések..." />
      </FormGroup>
    </Modal>
  )
}

// ---- Job Card ----
function JobCard({ job, onStatusChange }: { job: Job; onStatusChange: (id: string, status: string) => void }) {
  return (
    <Card>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded">{job.order_number}</span>
        <div className="flex items-center gap-1.5">
          {job.customer?.is_vip && <span className="text-[#C9A84C] text-[13px]" title="VIP ügyfél">⭐</span>}
          <StatusPill status={job.mobile_status || 'scheduled'} />
        </div>
      </div>
      <div className="font-semibold text-[14px] mb-1">{job.customer?.full_name}</div>
      <div className="mb-2">
        <span className="bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-0.5 rounded mr-2">{job.vehicle?.license_plate}</span>
        <span className="text-[12px] text-[#5a6a80]">{job.vehicle?.make} {job.vehicle?.model}</span>
      </div>
      {job.mobile_address && (
        <div className="flex items-start gap-1.5 text-[12px] text-[#5a6a80] mb-1.5">
          <MapPin size={13} className="mt-0.5 shrink-0 text-[#C9A84C]" />
          {job.mobile_address}
        </div>
      )}
      <div className="text-[12px] text-[#C9A84C] font-medium mb-2">
        {getServiceIcon(job.mobile_service_type)} {getServiceLabel(job.mobile_service_type)}
      </div>
      {job.scheduled_time && (
        <div className="text-[11px] text-[#8fa0b5] mb-2">{job.scheduled_time?.slice(0, 5)}</div>
      )}
      <div className="pt-2 border-t border-[rgba(11,30,61,0.08)]">
        <Select
          className="text-[11px] py-1 min-h-[36px]"
          value={job.mobile_status || 'scheduled'}
          onChange={e => onStatusChange(job.id, e.target.value)}
        >
          {Object.entries(MOBILE_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
      </div>
    </Card>
  )
}

// ---- Dashboard Tab ----
function MobileDashboard({ jobs }: { jobs: Job[] }) {
  const today = new Date().toISOString().split('T')[0]
  const todayJobs = jobs.filter(j => j.scheduled_date === today)
  const activeJobs = jobs.filter(j => !['completed', 'paid'].includes(j.mobile_status))
  const totalKm = todayJobs.reduce((s, j) => s + (j.mobile_km || 0), 0)
  const revenue = todayJobs.reduce((s, j) => s + (j.travel_cost || 0), 0)

  const nextJob = todayJobs.filter(j => !['completed', 'paid'].includes(j.mobile_status))
    .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''))[0]

  return (
    <div className="space-y-4">
      <div className="p-4 bg-[#0B1E3D] rounded-[14px] text-white">
        <div className="flex items-center gap-2 mb-1">
          <Truck size={18} className="text-[#C9A84C]" />
          <span className="font-semibold text-[15px]">🚐 Mobile Service – Napi Áttekintés</span>
        </div>
        <div className="text-white/50 text-[12px]">{new Date().toLocaleDateString('hu-HU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Mai munkák', value: todayJobs.length, color: 'text-[#0B1E3D]' },
          { label: 'Aktív', value: activeJobs.length, color: 'text-[#185FA5]' },
          { label: 'Km ma', value: totalKm.toFixed(0) + ' km', color: 'text-[#5a6a80]' },
          { label: 'Bevétel ma', value: 'CHF ' + revenue.toFixed(2), color: 'text-green-600' },
          { label: 'Profit ma', value: 'CHF ' + (revenue * 0.7).toFixed(2), color: 'text-[#C9A84C]' },
        ].map(kpi => (
          <Card key={kpi.label}>
            <div className="text-[10px] text-[#8fa0b5] uppercase tracking-wide mb-1">{kpi.label}</div>
            <div className={`text-[18px] font-bold ${kpi.color}`}>{kpi.value}</div>
          </Card>
        ))}
      </div>

      {nextJob && (
        <Card>
          <CardTitle className="text-[13px] mb-3">Karl aktuális helyzete</CardTitle>
          <div className="text-[13px] font-semibold mb-1">{nextJob.customer?.full_name}</div>
          <div className="flex items-start gap-1.5 text-[12px] text-[#5a6a80] mb-1">
            <MapPin size={13} className="mt-0.5 text-[#C9A84C]" />
            {nextJob.mobile_address || 'Nincs cím'}
          </div>
          <div className="text-[12px] text-[#C9A84C]">{getServiceIcon(nextJob.mobile_service_type)} {getServiceLabel(nextJob.mobile_service_type)}</div>
          <div className="text-[11px] text-[#8fa0b5] mt-1">ETA: {nextJob.scheduled_time?.slice(0, 5) || '–'}</div>
          <StatusPill status={nextJob.mobile_status} />
        </Card>
      )}

      <Card>
        <CardTitle className="text-[13px] mb-3">Mai mobil munkák</CardTitle>
        {todayJobs.length === 0 ? (
          <p className="text-[12px] text-[#8fa0b5] text-center py-4">Nincsenek mai munkák</p>
        ) : (
          <div className="space-y-2">
            {todayJobs.map(job => (
              <div key={job.id} className="flex items-center justify-between py-2 border-b border-[rgba(11,30,61,0.06)] last:border-0">
                <div>
                  <div className="text-[12px] font-medium">{job.customer?.full_name}</div>
                  <div className="text-[11px] text-[#8fa0b5]">{job.mobile_address}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-[#5a6a80]">{job.scheduled_time?.slice(0, 5)}</div>
                  <StatusPill status={job.mobile_status || 'scheduled'} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardTitle className="text-[13px] mb-3">Napi KPI részletek</CardTitle>
        <table className="w-full text-[12px]">
          <tbody>
            {[
              ['Munkák száma', todayJobs.length],
              ['Összes km', totalKm.toFixed(1) + ' km'],
              ['Bevétel', 'CHF ' + revenue.toFixed(2)],
              ['Kiszállási díj', 'CHF ' + revenue.toFixed(2)],
              ['Profit (est.)', 'CHF ' + (revenue * 0.7).toFixed(2)],
            ].map(([k, v]) => (
              <tr key={k as string} className="border-b border-[rgba(11,30,61,0.06)] last:border-0">
                <td className="py-1.5 text-[#5a6a80]">{k}</td>
                <td className="py-1.5 font-medium text-right">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ---- Jobs Tab ----
function MobileJobs({ jobs, onStatusChange, onNewJob }: { jobs: Job[]; onStatusChange: (id: string, s: string) => void; onNewJob: () => void }) {
  const [filter, setFilter] = useState<'today' | 'week' | 'active' | 'closed'>('today')
  const [typeFilter, setTypeFilter] = useState('')
  const today = new Date().toISOString().split('T')[0]

  const filtered = jobs.filter(j => {
    if (typeFilter && j.mobile_service_type !== typeFilter) return false
    if (filter === 'today') return j.scheduled_date === today
    if (filter === 'active') return !['completed', 'paid'].includes(j.mobile_status)
    if (filter === 'closed') return ['completed', 'paid'].includes(j.mobile_status)
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {(['today', 'week', 'active', 'closed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[11px] px-3 py-1.5 rounded-full font-medium transition-colors ${filter === f ? 'bg-[#0B1E3D] text-white' : 'bg-[#F4F5F7] text-[#5a6a80] hover:bg-[#e8eaed]'}`}>
              {f === 'today' ? 'Mai' : f === 'week' ? 'Heti' : f === 'active' ? 'Aktív' : 'Lezárt'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Select className="text-[11px] py-1 min-h-[36px] w-auto" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="">Minden típus</option>
            {MOBILE_SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
          </Select>
          <Button onClick={onNewJob} className="text-[12px] py-1.5 px-3">+ Új Mobil Munka</Button>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-[#8fa0b5] text-sm">Nincsenek munkák</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(job => <JobCard key={job.id} job={job} onStatusChange={onStatusChange} />)}
        </div>
      )}
    </div>
  )
}

// ---- Route Tab ----
function RouteTab({ jobs }: { jobs: Job[] }) {
  const today = new Date().toISOString().split('T')[0]
  const todayJobs = [...jobs.filter(j => j.scheduled_date === today)]
    .sort((a, b) => (a.scheduled_time || '').localeCompare(b.scheduled_time || ''))

  const openMaps = () => {
    const addrs = todayJobs.map(j => encodeURIComponent(j.mobile_address || '')).filter(Boolean)
    if (!addrs.length) return
    window.open(`https://www.google.com/maps/dir/?api=1&waypoints=${addrs.join('|')}`, '_blank')
  }

  const totalKm = todayJobs.reduce((s, j) => s + (j.mobile_km || 0), 0)
  const totalMin = todayJobs.reduce((s, j) => s + (j.travel_cost || 0), 0)

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle className="text-[13px]">Mai Útvonal</CardTitle>
          <Button onClick={openMaps} className="text-[11px] py-1.5 px-3">🗺️ Navigáció indítása</Button>
        </div>
        <p className="text-[11px] text-[#8fa0b5] mb-3">Google Maps / Waze integráció</p>
        {todayJobs.length === 0 ? (
          <p className="text-[12px] text-[#8fa0b5] text-center py-4">Nincsenek mai útvonalak</p>
        ) : (
          <div className="space-y-2">
            {todayJobs.map((job, idx) => (
              <div key={job.id} className="flex items-start gap-3 p-2 bg-[#F4F5F7] rounded-lg">
                <div className="w-7 h-7 rounded-full bg-[#0B1E3D] text-white text-[11px] font-bold flex items-center justify-center shrink-0">{idx + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium">{job.customer?.full_name}</div>
                  <div className="flex items-start gap-1 text-[11px] text-[#5a6a80]">
                    <MapPin size={11} className="mt-0.5 shrink-0 text-[#C9A84C]" />
                    <span className="truncate">{job.mobile_address}</span>
                  </div>
                  <div className="text-[11px] text-[#C9A84C]">{getServiceIcon(job.mobile_service_type)} {getServiceLabel(job.mobile_service_type)}</div>
                </div>
                <div className="text-[11px] text-[#5a6a80] shrink-0">{job.scheduled_time?.slice(0, 5)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Összes megálló', value: todayJobs.length },
          { label: 'Összes km', value: totalKm.toFixed(0) + ' km' },
          { label: 'Menetidő', value: Math.round(totalMin) + ' perc' },
        ].map(s => (
          <Card key={s.label}>
            <div className="text-[10px] text-[#8fa0b5] uppercase tracking-wide mb-1">{s.label}</div>
            <div className="text-[16px] font-bold text-[#0B1E3D]">{s.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <CardTitle className="text-[13px] mb-3">Kiszállási díj összesítő</CardTitle>
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-[rgba(11,30,61,0.08)]">
              <th className="text-left py-1.5 text-[#5a6a80] font-medium">Ügyfél</th>
              <th className="text-right py-1.5 text-[#5a6a80] font-medium">Díj</th>
            </tr>
          </thead>
          <tbody>
            {todayJobs.map(job => (
              <tr key={job.id} className="border-b border-[rgba(11,30,61,0.06)] last:border-0">
                <td className="py-1.5">{job.customer?.full_name}</td>
                <td className="py-1.5 text-right font-medium">
                  {job.travel_cost_charged === false ? <span className="text-[#C9A84C]">⭐ VIP</span> : `CHF ${(job.travel_cost || 0).toFixed(2)}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ---- Pickup & Delivery Tab ----
function PickupDeliveryTab({ jobs, onStatusChange }: { jobs: Job[]; onStatusChange: (id: string, s: string) => void }) {
  const [filter, setFilter] = useState<'all' | 'pickup' | 'delivery'>('all')
  const today = new Date().toISOString().split('T')[0]
  const pdJobs = jobs.filter(j => j.mobile_service_type === 'pickup_delivery' && j.scheduled_date === today)

  return (
    <div className="space-y-4">
      <div className="flex gap-1 mb-2">
        {(['all', 'pickup', 'delivery'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[11px] px-3 py-1.5 rounded-full font-medium transition-colors ${filter === f ? 'bg-[#0B1E3D] text-white' : 'bg-[#F4F5F7] text-[#5a6a80]'}`}>
            {f === 'all' ? 'Mind' : f === 'pickup' ? 'Mai pickupok' : 'Mai visszaszállítások'}
          </button>
        ))}
      </div>
      {pdJobs.length === 0 ? (
        <div className="text-center py-12 text-[#8fa0b5] text-sm">Nincsenek pickup & delivery munkák ma</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pdJobs.map(job => (
            <Card key={job.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded">{job.order_number}</span>
                <StatusPill status={job.mobile_status || 'scheduled'} />
              </div>
              <div className="font-semibold text-[13px] mb-1">{job.customer?.full_name}</div>
              <div className="mb-1">
                <span className="bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-0.5 rounded mr-2">{job.vehicle?.license_plate}</span>
                <span className="text-[12px] text-[#5a6a80]">{job.vehicle?.make} {job.vehicle?.model}</span>
              </div>
              <div className="flex items-start gap-1.5 text-[11px] text-[#5a6a80] mb-2">
                <MapPin size={11} className="mt-0.5 text-[#C9A84C]" />
                {job.mobile_address}
              </div>
              <div className="flex gap-1.5 mt-2">
                <Button variant="ghost" className="text-[11px] py-1 px-2 flex-1" onClick={() => onStatusChange(job.id, 'en_route')}>Indulás</Button>
                <Button variant="ghost" className="text-[11px] py-1 px-2 flex-1" onClick={() => onStatusChange(job.id, 'arrived')}>Megérkezett</Button>
                <Button className="text-[11px] py-1 px-2 flex-1" onClick={() => onStatusChange(job.id, 'completed')}>Kész</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Tire Service Tab ----
function TireServiceTab({ jobs, onNewJob }: { jobs: Job[]; onNewJob: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const tireJobs = jobs.filter(j => j.mobile_service_type === 'tire_service' && j.scheduled_date === today)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[#0B1E3D]">🔧 Mobil Gumiszerviz – ma ({tireJobs.length})</h2>
        <Button onClick={onNewJob} className="text-[12px] py-1.5 px-3">+ Új gumicsere</Button>
      </div>
      {tireJobs.length === 0 ? (
        <div className="text-center py-12 text-[#8fa0b5] text-sm">Nincsenek mai gumiszerviz munkák</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tireJobs.map(job => (
            <Card key={job.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded">{job.order_number}</span>
                <StatusPill status={job.mobile_status || 'scheduled'} />
              </div>
              <div className="font-semibold text-[13px] mb-1">{job.customer?.full_name}</div>
              <div className="mb-1">
                <span className="bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-0.5 rounded mr-2">{job.vehicle?.license_plate}</span>
              </div>
              <div className="flex items-start gap-1.5 text-[11px] text-[#5a6a80] mb-2">
                <MapPin size={11} className="mt-0.5 text-[#C9A84C]" />
                {job.mobile_address}
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] mt-2 pt-2 border-t border-[rgba(11,30,61,0.08)]">
                <div><span className="text-[#8fa0b5]">Méret: </span>{job.tire_size || '–'}</div>
                <div><span className="text-[#8fa0b5]">DOT: </span>{job.tire_dot || '–'}</div>
                <div><span className="text-[#8fa0b5]">Profil: </span>{job.tire_tread_depth != null ? job.tire_tread_depth + ' mm' : '–'}</div>
                <div><span className="text-[#8fa0b5]">Nyomás: </span>{job.tire_pressure != null ? job.tire_pressure + ' bar' : '–'}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Cleaning Tab ----
function CleaningTab({ jobs, onNewJob }: { jobs: Job[]; onNewJob: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const cleaningJobs = jobs.filter(j => j.mobile_service_type?.startsWith('cleaning_') && j.scheduled_date === today)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-[14px] font-semibold text-[#0B1E3D]">🧹 Takarítás</h2>
          <span className="text-[11px] bg-[#E6F1FB] text-[#185FA5] px-2 py-0.5 rounded-full font-medium">Mai: {cleaningJobs.length}</span>
        </div>
        <Button onClick={onNewJob} className="text-[12px] py-1.5 px-3">+ Új munka</Button>
      </div>
      {cleaningJobs.length === 0 ? (
        <div className="text-center py-12 text-[#8fa0b5] text-sm">Nincsenek mai takarítási munkák</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {cleaningJobs.map(job => (
            <Card key={job.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded">{job.order_number}</span>
                <StatusPill status={job.mobile_status || 'scheduled'} />
              </div>
              <div className="font-semibold text-[13px] mb-1">{job.customer?.full_name}</div>
              <div className="text-[12px] text-[#C9A84C] font-medium mb-1">🧹 {getServiceLabel(job.mobile_service_type)}</div>
              <div className="flex items-start gap-1.5 text-[11px] text-[#5a6a80]">
                <MapPin size={11} className="mt-0.5 text-[#C9A84C]" />
                {job.mobile_address}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Detailing Tab ----
function DetailingTab({ jobs, onNewJob }: { jobs: Job[]; onNewJob: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const detailJobs = jobs.filter(j => j.mobile_service_type?.startsWith('detailing_') && j.scheduled_date === today)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[#0B1E3D]">✨ Detailing</h2>
        <Button onClick={onNewJob} className="text-[12px] py-1.5 px-3">+ Új munka</Button>
      </div>
      {detailJobs.length === 0 ? (
        <div className="text-center py-12 text-[#8fa0b5] text-sm">Nincsenek mai detailing munkák</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {detailJobs.map(job => (
            <Card key={job.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded">{job.order_number}</span>
                <StatusPill status={job.mobile_status || 'scheduled'} />
              </div>
              <div className="font-semibold text-[13px] mb-1">{job.customer?.full_name}</div>
              <div className="text-[12px] text-[#C9A84C] font-medium mb-1">✨ {getServiceLabel(job.mobile_service_type)}</div>
              <div className="flex items-start gap-1.5 text-[11px] text-[#5a6a80] mb-3">
                <MapPin size={11} className="mt-0.5 text-[#C9A84C]" />
                {job.mobile_address}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#F4F5F7] rounded-lg aspect-video flex items-center justify-center text-[11px] text-[#8fa0b5]">
                  📷 Előtte fotó
                </div>
                <div className="bg-[#F4F5F7] rounded-lg aspect-video flex items-center justify-center text-[11px] text-[#8fa0b5]">
                  📷 Utána fotó
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Diagnostics Tab ----
function DiagnosticsTab({ jobs, onNewJob }: { jobs: Job[]; onNewJob: () => void }) {
  const today = new Date().toISOString().split('T')[0]
  const diagJobs = jobs.filter(j => ['diagnostics', 'assessment'].includes(j.mobile_service_type) && j.scheduled_date === today)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-[#0B1E3D]">🔍 Diagnosztika & Állapotfelmérés</h2>
        <Button onClick={onNewJob} className="text-[12px] py-1.5 px-3">+ Új munka</Button>
      </div>
      {diagJobs.length === 0 ? (
        <div className="text-center py-12 text-[#8fa0b5] text-sm">Nincsenek mai diagnosztika munkák</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {diagJobs.map(job => (
            <Card key={job.id}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded">{job.order_number}</span>
                <StatusPill status={job.mobile_status || 'scheduled'} />
              </div>
              <div className="font-semibold text-[13px] mb-1">{job.customer?.full_name}</div>
              <div className="text-[12px] text-[#C9A84C] font-medium mb-1">{getServiceIcon(job.mobile_service_type)} {getServiceLabel(job.mobile_service_type)}</div>
              <div className="flex items-start gap-1.5 text-[11px] text-[#5a6a80] mb-2">
                <MapPin size={11} className="mt-0.5 text-[#C9A84C]" />
                {job.mobile_address}
              </div>
              <div className="space-y-1.5 pt-2 border-t border-[rgba(11,30,61,0.08)]">
                <div className="text-[11px]"><span className="text-[#8fa0b5]">Hibakód: </span>–</div>
                <div className="text-[11px]"><span className="text-[#8fa0b5]">Akkumulátor: </span>–</div>
                <div className="text-[11px]"><span className="text-[#8fa0b5]">Állapot: </span>–</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// ---- Main Component ----
export function MobileServicePage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewJob, setShowNewJob] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('work_orders')
      .select('*, customer:customers(full_name, phone, is_vip), vehicle:vehicles(make, model, license_plate)')
      .eq('is_mobile', true)
      .order('scheduled_date')
      .order('scheduled_time')
    setJobs((data || []) as any)
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from('work_orders').update({ mobile_status: status } as any).eq('id', id)
    if (error) { toast(error.message, 'error'); return }
    toast(MOBILE_STATUSES[status] || 'Státusz frissítve')
    load()
  }

  const handleNewJobSaved = () => { load(); onRefresh() }

  return (
    <div className="animate-fade-in">
      {/* Sub-navigation */}
      <div className="flex gap-1 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-[12px] px-3 py-2 rounded-lg font-medium whitespace-nowrap transition-colors shrink-0 ${
              activeTab === tab.id
                ? 'bg-[#0B1E3D] text-white'
                : 'bg-[#F4F5F7] text-[#5a6a80] hover:bg-[#e8eaed]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div>
      ) : (
        <>
          {activeTab === 'dashboard' && <MobileDashboard jobs={jobs} />}
          {activeTab === 'jobs' && <MobileJobs jobs={jobs} onStatusChange={handleStatusChange} onNewJob={() => setShowNewJob(true)} />}
          {activeTab === 'route' && <RouteTab jobs={jobs} />}
          {activeTab === 'pickup' && <PickupDeliveryTab jobs={jobs} onStatusChange={handleStatusChange} />}
          {activeTab === 'tire' && <TireServiceTab jobs={jobs} onNewJob={() => setShowNewJob(true)} />}
          {activeTab === 'cleaning' && <CleaningTab jobs={jobs} onNewJob={() => setShowNewJob(true)} />}
          {activeTab === 'detailing' && <DetailingTab jobs={jobs} onNewJob={() => setShowNewJob(true)} />}
          {activeTab === 'diagnostics' && <DiagnosticsTab jobs={jobs} onNewJob={() => setShowNewJob(true)} />}
        </>
      )}

      <NewJobModal open={showNewJob} onClose={() => setShowNewJob(false)} onSaved={handleNewJobSaved} />
    </div>
  )
}
