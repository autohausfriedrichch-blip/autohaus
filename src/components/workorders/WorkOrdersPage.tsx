'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { StatusBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { DocumentActions } from '@/components/documents/DocumentActions'
import { Plus, Search, ExternalLink, CheckSquare, Square, Edit2, Car, Wrench, Calendar, CreditCard, User } from 'lucide-react'
import type { WorkOrder } from '@/lib/types'
import { formatCurrency, formatDate, STATUS_LABELS } from '@/lib/utils'
import { WorkOrderDetail } from '@/components/workorders/WorkOrderDetail'

const STATUSES = [
  'new_booking','confirmed','checked_in','diagnostics','waiting_quote',
  'waiting_approval','waiting_parts','in_repair','quality_check',
  'ready','checkout_ready','delivered','closed'
]

function HealthDot({ health }: { health?: string }) {
  if (health === 'red') return <span className="w-2.5 h-2.5 rounded-full bg-[#C8102E] inline-block flex-shrink-0" title="Piros" />
  if (health === 'yellow') return <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block flex-shrink-0" title="Sárga" />
  return <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block flex-shrink-0" title="Zöld" />
}

export function WorkOrdersPage({ refreshKey, onRefresh, profile, onNewQuote }: { refreshKey: number; onRefresh: () => void; profile?: any; onNewQuote?: () => void }) {
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [mechanics, setMechanics] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailOrderId, setDetailOrderId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<WorkOrder>>({})
  const [saving, setSaving] = useState(false)
  const [services, setServices] = useState<any[]>([])
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [editOrder, setEditOrder] = useState<WorkOrder | null>(null)
  const { toast } = useToast()
  const supabase = createClient()
  const isMechanic = profile?.role === 'mechanic'

  const load = useCallback(async () => {
    setLoading(true)
    let woQuery = supabase.from('work_orders').select('*, customer:customers(full_name,phone,email,whatsapp), vehicle:vehicles(make,model,license_plate,year), mechanic:profiles!work_orders_mechanic_id_fkey(full_name)').order('created_at', { ascending: false })
    if (isMechanic && profile?.id) woQuery = woQuery.eq('mechanic_id', profile.id)
    const [{ data: wo }, { data: c }, { data: v }, { data: m }, { data: svc }] = await Promise.all([
      woQuery,
      supabase.from('customers').select('id, full_name').order('full_name'),
      supabase.from('vehicles').select('id, make, model, license_plate, customer_id'),
      supabase.from('profiles').select('id, full_name').in('role', ['mechanic', 'admin', 'super_admin']),
      supabase.from('services').select('id, name, category, pricing_type, base_price, hourly_rate, duration_minutes, description, checklist_template, technician_task, technician_checklist').eq('is_active', true).order('sort_order', { ascending: true }),
    ])
    setOrders((wo as any) || [])
    setCustomers(c || [])
    setVehicles(v || [])
    const mechList = m || []
    setMechanics(mechList)
    if (mechList.length === 1) setForm(f => ({ ...f, mechanic_id: mechList[0].id }))
    setServices(svc || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const filtered = orders.filter(o => {
    const s = search.toLowerCase()
    const matchSearch = !s || (o.order_number || '').toLowerCase().includes(s) ||
      ((o as any).customer?.full_name || '').toLowerCase().includes(s) ||
      ((o as any).vehicle?.license_plate || '').toLowerCase().includes(s)
    const matchStatus = !statusFilter || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const openNew = () => {
    const autoMechanic = mechanics.length === 1 ? mechanics[0].id : undefined
    setForm({ status: 'new_booking', is_mobile: false, payment_status: 'pending', parts_cost: 0, labor_cost: 0, total_amount: 0, mechanic_id: autoMechanic })
    setSelectedServiceIds([])
    setEditOrder(null)
    setModalOpen(true)
  }

  const openEdit = (o: WorkOrder) => {
    setEditOrder(o)
    setForm({ ...o })
    setSelectedServiceIds([])
    setModalOpen(true)
  }

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const assignMechanic = async (orderId: string, mechanicId: string) => {
    await supabase.from('work_orders').update({ mechanic_id: mechanicId }).eq('id', orderId)
    load()
  }

  const handleSave = async () => {
    if (!form.customer_id || !form.vehicle_id) { toast('Ügyfél és jármű kötelező!', 'error'); return }
    setSaving(true)

    const selectedSvcs = services.filter(s => selectedServiceIds.includes(s.id))
    const serviceNames = selectedSvcs.map(s => s.name).join(', ')

    // Derive pricing_mode from selected services
    const hasHourly = selectedSvcs.some(s => s.pricing_type === 'hourly')
    const hasFixed = selectedSvcs.some(s => s.pricing_type !== 'hourly')
    const pricingMode = hasHourly && hasFixed ? 'combined' : hasHourly ? 'hourly' : 'fixed'

    const payload = {
      customer_id: form.customer_id, vehicle_id: form.vehicle_id,
      service_type: serviceNames || form.service_type || null,
      status: form.status || 'new_booking',
      mechanic_id: form.mechanic_id || null,
      scheduled_date: form.scheduled_date || null,
      scheduled_time: form.scheduled_time || null,
      is_mobile: form.is_mobile || false,
      mobile_address: form.mobile_address || null,
      fault_description: form.fault_description || null,
      work_to_do: form.work_to_do || null,
      parts_cost: form.parts_cost || 0, labor_cost: form.labor_cost || 0,
      total_amount: (form.parts_cost || 0) + (form.labor_cost || 0),
      internal_notes: form.internal_notes || null,
      customer_notes: form.customer_notes || null,
      payment_status: form.payment_status || 'pending',
      pricing_mode: pricingMode,
    }
    if (editOrder) {
      const { error } = await supabase.from('work_orders').update(payload).eq('id', editOrder.id)
      if (error) { toast(`Hiba: ${error.message}`, 'error'); setSaving(false); return }
      toast('Munkalap frissítve')
      setModalOpen(false)
      load()
      setSaving(false)
      return
    }

    const { data: woData, error } = await supabase.from('work_orders').insert(payload).select('id').single()
    if (error) {
      toast(`Hiba: ${error.message}`, 'error')
      setSaving(false)
      return
    }

    // Timeline: work order created
    await supabase.from('work_order_events').insert({
      work_order_id: woData.id,
      event_type: 'created',
      title: 'Munkalap létrehozva',
      user_name: 'Barbara',
      phase: 'general',
      metadata: { service_count: selectedSvcs.length },
    })

    if (selectedSvcs.length > 0 && woData?.id) {
      const mechanic = mechanics.find(m => m.id === form.mechanic_id)
      const taskInserts = selectedSvcs.map((svc, idx) => ({
        work_order_id: woData.id,
        title: svc.technician_task || svc.name,
        assigned_name: mechanic?.full_name || null,
        sort_order: idx,
        status: 'pending',
        service_id: svc.id,
        pricing_type: svc.pricing_type || 'fixed',
        price: svc.pricing_type === 'hourly' ? (svc.hourly_rate || 0) : (svc.base_price || 0),
        estimated_minutes: svc.duration_minutes || 0,
        checklist: Array.isArray(svc.technician_checklist) && svc.technician_checklist.length > 0 ? svc.technician_checklist : (Array.isArray(svc.checklist_template) ? svc.checklist_template : []),
        checklist_done: [],
        requires_photo: false,
        priority: 'normal',
        notes_internal: '',
        notes_customer: '',
        notes_problem: '',
        notes_extra: svc.description || '',
      }))
      const { error: taskErr } = await supabase.from('work_order_tasks').insert(taskInserts)
      if (taskErr) {
        toast(`Feladat hiba: ${taskErr.message}`, 'error')
      } else {
        // Timeline: one event per generated task
        const taskEvents = selectedSvcs.map(svc => ({
          work_order_id: woData.id,
          event_type: 'task_created',
          title: `Feladat generálva: ${svc.technician_task || svc.name}`,
          user_name: 'Rendszer',
          phase: 'repair',
          metadata: { service_id: svc.id, service_name: svc.name },
        }))
        await supabase.from('work_order_events').insert(taskEvents)
      }
    }

    toast(`Munkalap létrehozva${selectedSvcs.length ? ` – ${selectedSvcs.length} feladat generálva` : ''}`)
    setModalOpen(false)
    load()
    setSaving(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('work_orders').update({ status }).eq('id', id)
    toast('Státusz frissítve')
    load()
  }

  const recordPayment = async (id: string, method: 'cash' | 'card' | 'invoice') => {
    await supabase.from('work_orders').update({
      payment_status: 'paid',
      status: 'delivered',
      internal_notes: `Fizetve: ${method === 'cash' ? 'Készpénz' : method === 'card' ? 'Kártya' : 'Számla'} – ${new Date().toLocaleString('hu-HU')}`
    }).eq('id', id)
    toast('Fizetés rögzítve ✓')
    load()
  }

  const updateLaborCost = async (id: string, labor: number, parts: number) => {
    const total = labor + parts
    await supabase.from('work_orders').update({ labor_cost: labor, total_amount: total }).eq('id', id)
  }

  const filteredVehicles = form.customer_id ? vehicles.filter(v => v.customer_id === form.customer_id) : vehicles

  const detailProfile = profile ? { id: profile.id || '', full_name: profile.full_name || 'Ismeretlen', role: profile.role || 'mechanic' } : { id: '', full_name: 'Ismeretlen', role: 'mechanic' }

  return (
    <div className="animate-fade-in">

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap gap-2.5 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#999]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Munkalapszám, ügyfél, rendszám..."
            className="w-full pl-9 pr-3 py-2.5 border border-[rgba(0,0,0,0.12)] rounded-xl text-[13px] bg-white outline-none focus:border-[#C8102E] transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-[rgba(0,0,0,0.12)] rounded-xl text-[13px] bg-white outline-none focus:border-[#C8102E] transition-colors cursor-pointer"
        >
          <option value="">Minden státusz</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <Button variant="primary" onClick={openNew}><Plus size={14} /> Új munkalap</Button>
      </div>

      {/* ── List ── */}
      {loading ? (
        <div className="text-center py-16 text-[#999] text-sm">Betöltés...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#999] text-sm">Nincs találat</div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map(o => {
            const vehicle = (o as any).vehicle
            const customer = (o as any).customer
            const mechanic = (o as any).mechanic
            const assignedMechanic = mechanics.find(m => m.id === (o as any).mechanic_id)
            const isReady = ['ready','checkout_ready','delivered'].includes(o.status)
            const docType = ['ready','checkout_ready','delivered','closed'].includes(o.status) ? 'invoice' : 'workorder'

            return (
              <div
                key={o.id}
                className="bg-white rounded-2xl border border-[rgba(0,0,0,0.08)] overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* ── Top row: identity + actions ── */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[rgba(0,0,0,0.06)]">
                  <HealthDot health={(o as any).health} />

                  {/* Order number */}
                  <span className="font-mono text-[11px] font-bold text-[#888] bg-[#F5F5F5] px-2 py-0.5 rounded-lg shrink-0">
                    {o.order_number || `#${o.id.slice(0,8)}`}
                  </span>

                  {/* Customer */}
                  <span className="font-semibold text-[14px] text-[#0D0D0D] flex-1 min-w-0 truncate">
                    {customer?.full_name}
                  </span>

                  {/* License plate */}
                  {vehicle && (
                    <span className="bg-[#0D0D0D] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg tracking-wider shrink-0 hidden sm:inline">
                      {vehicle.license_plate}
                    </span>
                  )}

                  {/* Status */}
                  <StatusBadge status={o.status} />

                  {o.is_mobile && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold hidden md:inline">MOBIL</span>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    {!isMechanic && (
                      <button
                        onClick={() => openEdit(o)}
                        className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[#666] hover:text-[#0D0D0D] px-3 py-1.5 border border-[rgba(0,0,0,0.12)] rounded-xl hover:border-[#0D0D0D] transition-all"
                        style={{ minHeight: 36 }}
                      >
                        <Edit2 size={12} />
                        <span className="hidden sm:inline">Szerkesztés</span>
                      </button>
                    )}
                    <button
                      onClick={() => setDetailOrderId(o.id)}
                      className="flex items-center gap-1.5 text-[11.5px] font-semibold text-white bg-[#C8102E] hover:bg-[#a50d24] px-3 py-1.5 rounded-xl transition-all"
                      style={{ minHeight: 36 }}
                    >
                      <ExternalLink size={12} />
                      <span className="hidden sm:inline">Megnyitás</span>
                    </button>
                  </div>
                </div>

                {/* ── Bottom row: details + document actions ── */}
                <div className="px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">

                  {/* Vehicle info */}
                  {vehicle && (
                    <div className="flex items-center gap-1.5 text-[12px] text-[#555]">
                      <Car size={12} className="text-[#999] shrink-0" />
                      <span>{vehicle.make} {vehicle.model}</span>
                    </div>
                  )}

                  {/* Service */}
                  {o.service_type && (
                    <div className="flex items-center gap-1.5 text-[12px] text-[#555] max-w-[220px]">
                      <Wrench size={12} className="text-[#999] shrink-0" />
                      <span className="truncate">{o.service_type}</span>
                    </div>
                  )}

                  {/* Date */}
                  {o.scheduled_date && (
                    <div className="flex items-center gap-1.5 text-[12px] text-[#555]">
                      <Calendar size={12} className="text-[#999] shrink-0" />
                      <span>{formatDate(o.scheduled_date)}</span>
                    </div>
                  )}

                  {/* Amount */}
                  {o.total_amount > 0 && (
                    <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0D0D0D]">
                      <CreditCard size={12} className="text-[#999] shrink-0" />
                      <span>{formatCurrency(o.total_amount)}</span>
                    </div>
                  )}

                  {/* Mechanic assignment */}
                  {!isMechanic && mechanics.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {mechanics.map(m => (
                        <button
                          key={m.id}
                          onClick={() => assignMechanic(o.id, m.id)}
                          className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-all ${
                            (o as any).mechanic_id === m.id
                              ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]'
                              : 'bg-white text-[#666] border-[rgba(0,0,0,0.15)] hover:border-[#C8102E] hover:text-[#C8102E]'
                          }`}
                        >
                          <User size={10} />
                          {m.full_name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Right side: payment + status selector + doc actions */}
                  <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
                    {o.payment_status === 'paid' && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-bold">✓ Fizetve</span>
                    )}

                    {isReady && o.payment_status !== 'paid' && !isMechanic && (
                      <div className="flex gap-1">
                        <button onClick={() => recordPayment(o.id, 'cash')} className="text-[10.5px] bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-emerald-700 transition-colors">Készpénz</button>
                        <button onClick={() => recordPayment(o.id, 'card')} className="text-[10.5px] bg-[#2563eb] text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-blue-700 transition-colors">Kártya</button>
                        <button onClick={() => recordPayment(o.id, 'invoice')} className="text-[10.5px] bg-[#0D0D0D] text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-[#333] transition-colors">Számla</button>
                      </div>
                    )}

                    <select
                      value={o.status}
                      onChange={e => updateStatus(o.id, e.target.value)}
                      className="text-[11.5px] border border-[rgba(0,0,0,0.12)] rounded-xl px-2.5 py-1.5 bg-white outline-none cursor-pointer hover:border-[#C8102E] transition-colors"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                    </select>

                    <DocumentActions
                      type={docType}
                      data={o}
                      customerId={(o as any).customer_id}
                      workOrderId={o.id}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {detailOrderId && (
        <WorkOrderDetail
          workOrderId={detailOrderId}
          profile={detailProfile}
          onClose={() => { setDetailOrderId(null); load(); onRefresh() }}
          onNewQuote={onNewQuote}
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editOrder ? `Munkalap szerkesztése – ${editOrder.order_number || ''}` : 'Új Munkalap'} className="max-w-2xl"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : editOrder ? 'Frissítés' : 'Létrehozás'}</Button></>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormGroup>
            <FormLabel>Ügyfél *</FormLabel>
            <Select value={form.customer_id || ''} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value, vehicle_id: '' }))}>
              <option value="">Válassz...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Jármű *</FormLabel>
            <Select value={form.vehicle_id || ''} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Válassz...</option>
              {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} – {v.license_plate}</option>)}
            </Select>
          </FormGroup>
          {!editOrder && <FormGroup className="col-span-2">
            <FormLabel>
              Elvégzendő szolgáltatások
              {selectedServiceIds.length > 0 && <span className="ml-2 text-[#C8102E] font-bold">{selectedServiceIds.length} kiválasztva</span>}
            </FormLabel>
            {services.length === 0 ? (
              <p className="text-xs text-[#888888] py-2">Nincs aktív szolgáltatás – add hozzá a Szolgáltatások menüben.</p>
            ) : (
              <div className="border border-gray-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-gray-100">
                {Object.entries(
                  services.reduce((acc: Record<string, any[]>, s) => {
                    const cat = s.category || 'Egyéb'
                    if (!acc[cat]) acc[cat] = []
                    acc[cat].push(s)
                    return acc
                  }, {})
                ).map(([cat, svcs]) => (
                  <div key={cat}>
                    <div className="px-3 py-1 bg-gray-50 text-[10px] font-bold text-[#4a4a4a] uppercase tracking-wider">{cat}</div>
                    {(svcs as any[]).map((svc: any) => {
                      const checked = selectedServiceIds.includes(svc.id)
                      return (
                        <button key={svc.id} type="button" onClick={() => toggleService(svc.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 transition-colors text-left ${checked ? 'bg-blue-50/60' : ''}`}>
                          {checked ? <CheckSquare size={15} className="text-[#0D0D0D] flex-shrink-0" /> : <Square size={15} className="text-gray-300 flex-shrink-0" />}
                          <span className="flex-1 text-[13px] font-medium text-[#0D0D0D]">{svc.name}</span>
                          <span className="text-[11px] text-[#888888] shrink-0">
                            {svc.pricing_type === 'hourly' ? `${svc.hourly_rate || 0} CHF/h` : svc.base_price ? `${svc.base_price} CHF` : ''}
                            {svc.duration_minutes ? ` · ${svc.duration_minutes}p` : ''}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </FormGroup>}
          <FormGroup>
            <FormLabel>Státusz</FormLabel>
            <Select value={form.status || 'new_booking'} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Dátum</FormLabel>
            <Input type="date" value={form.scheduled_date || ''} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Időpont</FormLabel>
            <Input type="time" value={form.scheduled_time || ''} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Szerelő</FormLabel>
            <Select value={form.mechanic_id || ''} onChange={e => setForm(f => ({ ...f, mechanic_id: e.target.value }))}>
              <option value="">Nincs hozzárendelve</option>
              {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Mobil szolgáltatás</FormLabel>
            <Select value={form.is_mobile ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, is_mobile: e.target.value === 'yes' }))}>
              <option value="no">Nem</option>
              <option value="yes">Igen</option>
            </Select>
          </FormGroup>
          {form.is_mobile && (
            <FormGroup className="col-span-2">
              <FormLabel>Mobil cím</FormLabel>
              <Input value={form.mobile_address || ''} onChange={e => setForm(f => ({ ...f, mobile_address: e.target.value }))} placeholder="Ügyfél címe..." />
            </FormGroup>
          )}
          <FormGroup className="col-span-2">
            <FormLabel>Hibaleírás</FormLabel>
            <Textarea value={form.fault_description || ''} onChange={e => setForm(f => ({ ...f, fault_description: e.target.value }))} placeholder="Mit jelzett az ügyfél?" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Alkatrész (CHF)</FormLabel>
            <Input type="number" step="0.01" value={form.parts_cost || ''} onChange={e => setForm(f => ({ ...f, parts_cost: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Munkadíj (CHF)</FormLabel>
            <Input type="number" step="0.01" value={form.labor_cost || ''} onChange={e => setForm(f => ({ ...f, labor_cost: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
          </FormGroup>
          <FormGroup className="col-span-2">
            <FormLabel>Belső megjegyzés</FormLabel>
            <Textarea value={form.internal_notes || ''} onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))} />
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
