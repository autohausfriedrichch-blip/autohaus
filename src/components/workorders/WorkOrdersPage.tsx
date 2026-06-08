'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { StatusBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { DocumentActions } from '@/components/documents/DocumentActions'
import { Plus, Search, ExternalLink } from 'lucide-react'
import type { WorkOrder } from '@/lib/types'
import { formatCurrency, formatDate, STATUS_LABELS } from '@/lib/utils'
import { WorkOrderDetail } from '@/components/workorders/WorkOrderDetail'

const STATUSES = [
  'new_booking','confirmed','checked_in','diagnostics','waiting_quote',
  'waiting_approval','waiting_parts','in_repair','quality_check',
  'ready','checkout_ready','delivered','closed'
]

function HealthDot({ health }: { health?: string }) {
  if (health === 'red') return <span className="w-2.5 h-2.5 rounded-full bg-[#C9384C] inline-block flex-shrink-0" title="Piros" />
  if (health === 'yellow') return <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block flex-shrink-0" title="Sárga" />
  return <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block flex-shrink-0" title="Zöld" />
}

export function WorkOrdersPage({ refreshKey, profile, openOrderId, onClearOpenOrder }: { refreshKey: number; onRefresh: () => void; profile?: any; openOrderId?: string | null; onClearOpenOrder?: () => void }) {
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
  const { toast } = useToast()
  const supabase = createClient()
  const isMechanic = profile?.role === 'mechanic'

  const load = useCallback(async () => {
    setLoading(true)
    let woQuery = supabase.from('work_orders').select('*, customer:customers(full_name,phone,email,whatsapp), vehicle:vehicles(make,model,license_plate,year), mechanic:profiles!work_orders_mechanic_id_fkey(full_name)').order('created_at', { ascending: false })
    if (isMechanic && profile?.id) woQuery = woQuery.eq('mechanic_id', profile.id)
    const [{ data: wo }, { data: c }, { data: v }, { data: m }] = await Promise.all([
      woQuery,
      supabase.from('customers').select('id, full_name').order('full_name'),
      supabase.from('vehicles').select('id, make, model, license_plate, customer_id'),
      supabase.from('profiles').select('id, full_name').in('role', ['mechanic', 'admin', 'super_admin']),
    ])
    setOrders((wo as any) || [])
    setCustomers(c || [])
    setVehicles(v || [])
    setMechanics(m || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (openOrderId) {
      setDetailOrderId(openOrderId)
      onClearOpenOrder?.()
    }
  }, [openOrderId])

  const filtered = orders.filter(o => {
    const s = search.toLowerCase()
    const matchSearch = !s || (o.order_number || '').toLowerCase().includes(s) ||
      ((o as any).customer?.full_name || '').toLowerCase().includes(s) ||
      ((o as any).vehicle?.license_plate || '').toLowerCase().includes(s)
    const matchStatus = !statusFilter || o.status === statusFilter
    return matchSearch && matchStatus
  })

  const openNew = () => {
    setForm({ status: 'new_booking', is_mobile: false, payment_status: 'pending', parts_cost: 0, labor_cost: 0, total_amount: 0 })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.customer_id || !form.vehicle_id) { toast('Kunde und Fahrzeug sind Pflichtfelder', 'error'); return }
    setSaving(true)
    const payload = {
      customer_id: form.customer_id, vehicle_id: form.vehicle_id,
      service_id: (form as any).service_id || null,
      service_type: form.service_type || null,
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
    }
    const { error } = await supabase.from('work_orders').insert(payload)
    if (error) {
      console.error('Work order insert error:', error)
      toast(`Hiba: ${error.message} (${error.code})`, 'error')
    }
    else { toast('Munkalap létrehozva'); setModalOpen(false); load() }
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
      internal_notes: `Fizetve: ${method === 'cash' ? 'Készpénz' : method === 'card' ? 'Kártya' : 'Számla'} – ${new Date().toLocaleString('de-CH')}`
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
      <div className="flex flex-wrap gap-2.5 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa0b5]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Auftragsnummer, Kunde, Kennzeichen..."
            className="w-full pl-9 pr-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0B1E3D]" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0B1E3D]">
          <option value="">Alle Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <Button variant="primary" onClick={openNew}><Plus size={14} /> Új munkalap</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div>
      ) : (
        <div>
          {filtered.map(o => (
            <div key={o.id} className="bg-white border border-[rgba(11,30,61,0.10)] rounded-[14px] overflow-hidden mb-3">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(11,30,61,0.08)]">
                <HealthDot health={(o as any).health} />
                <span className="text-[11px] font-bold text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded">{o.order_number}</span>
                <span className="font-semibold text-[13px] flex-1">{(o as any).customer?.full_name}</span>
                {(o as any).vehicle && (
                  <span className="bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-1 rounded hidden sm:inline">
                    {(o as any).vehicle.license_plate}
                  </span>
                )}
                <StatusBadge status={o.status} />
                {o.is_mobile && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold hidden sm:inline">MOBIL</span>}
                <button onClick={() => setDetailOrderId(o.id)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#C9A84C] hover:text-[#0B1E3D] ml-1 px-2 py-1 border border-[#C9A84C] rounded hover:border-[#0B1E3D] transition-colors">
                  <ExternalLink size={12} /> Megnyitás
                </button>
              </div>

              <div className="px-4 py-2 flex flex-wrap gap-3 text-[12px] text-[#5a6a80] items-center">
                {(o as any).vehicle && <span>{(o as any).vehicle.make} {(o as any).vehicle.model}</span>}
                {o.service_type && <span>· {o.service_type}</span>}
                {o.scheduled_date && <span>· {formatDate(o.scheduled_date)}</span>}
                {o.total_amount > 0 && <span className="font-semibold text-[#0B1E3D]">{formatCurrency(o.total_amount)}</span>}
                <div className="ml-auto flex items-center gap-2 flex-wrap">
                  {o.payment_status === 'paid' && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">✓ Fizetve</span>
                  )}
                  {['ready','checkout_ready','delivered'].includes(o.status) && o.payment_status !== 'paid' && !isMechanic && (
                    <div className="flex gap-1">
                      <button onClick={() => recordPayment(o.id, 'cash')} className="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded font-semibold hover:bg-emerald-700">Készpénz</button>
                      <button onClick={() => recordPayment(o.id, 'card')} className="text-[10px] bg-[#2563eb] text-white px-2 py-1 rounded font-semibold hover:bg-blue-700">Kártya</button>
                      <button onClick={() => recordPayment(o.id, 'invoice')} className="text-[10px] bg-[#0B1E3D] text-white px-2 py-1 rounded font-semibold">Számla</button>
                    </div>
                  )}
                  <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                    className="text-[11px] border border-[rgba(11,30,61,0.18)] rounded px-2 py-1 bg-white outline-none cursor-pointer">
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                  <div className="flex gap-1">
                    <DocumentActions type="workorder" data={o} customerId={(o as any).customer_id} workOrderId={o.id} />
                    <DocumentActions type="checkin" data={o} small />
                    {['ready','checkout_ready','delivered','closed'].includes(o.status) && (
                      <>
                        <DocumentActions type="checkout" data={o} small />
                        <DocumentActions type="invoice" data={o} small />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-10 text-[#8fa0b5] text-sm">Nincs munkalap</div>}
        </div>
      )}

      {detailOrderId && (
        <WorkOrderDetail
          workOrderId={detailOrderId}
          profile={detailProfile}
          onClose={() => { setDetailOrderId(null); load() }}
        />
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Új Munkalap" className="max-w-2xl"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Létrehozás'}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
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
          <FormGroup>
            <FormLabel>Szolgáltatás</FormLabel>
            <Select value={form.service_type || ''} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))}>
              <option value="">Válassz...</option>
              <option value="Inspektion">Inspektion</option>
              <option value="Ölwechsel">Ölwechsel</option>
              <option value="Diagnose">Diagnose</option>
              <option value="Reparatur">Reparatur</option>
              <option value="Reifenwechsel">Reifenwechsel</option>
              <option value="Detailing">Detailing</option>
              <option value="MFK Vorbereitung">MFK Vorbereitung</option>
              <option value="Sonstiges">Sonstiges</option>
            </Select>
          </FormGroup>
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
