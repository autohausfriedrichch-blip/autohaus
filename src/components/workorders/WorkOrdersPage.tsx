'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { StatusBadge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { Plus, Search, Eye, Edit2, ChevronDown } from 'lucide-react'
import type { WorkOrder } from '@/lib/types'
import { formatCurrency, formatDate, STATUS_LABELS } from '@/lib/utils'

const STATUSES = [
  'new_booking','confirmed','checked_in','diagnostics','waiting_quote',
  'waiting_approval','waiting_parts','in_repair','quality_check',
  'ready','checkout_ready','delivered','closed'
]

export function WorkOrdersPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [mechanics, setMechanics] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [detailOrder, setDetailOrder] = useState<WorkOrder | null>(null)
  const [form, setForm] = useState<Partial<WorkOrder>>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: wo }, { data: c }, { data: v }, { data: m }] = await Promise.all([
      supabase.from('work_orders').select('*, customer:customers(full_name,phone), vehicle:vehicles(make,model,license_plate,year), mechanic:profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, full_name').order('full_name'),
      supabase.from('vehicles').select('id, make, model, license_plate, customer_id').order('license_plate'),
      supabase.from('profiles').select('id, full_name').in('role', ['mechanic', 'admin', 'super_admin']),
    ])
    setOrders((wo as any) || [])
    setCustomers(c || [])
    setVehicles(v || [])
    setMechanics(m || [])
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
    setForm({ status: 'new_booking', is_mobile: false, payment_status: 'pending', parts_cost: 0, labor_cost: 0, total_amount: 0 })
    setDetailOrder(null)
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.customer_id || !form.vehicle_id) { toast('Kunde und Fahrzeug sind Pflichtfelder', 'error'); return }
    setSaving(true)
    const payload = {
      customer_id: form.customer_id, vehicle_id: form.vehicle_id, service_type: form.service_type,
      status: form.status, mechanic_id: form.mechanic_id || null, scheduled_date: form.scheduled_date,
      scheduled_time: form.scheduled_time, is_mobile: form.is_mobile, mobile_address: form.mobile_address,
      fault_description: form.fault_description, work_to_do: form.work_to_do,
      parts_cost: form.parts_cost || 0, labor_cost: form.labor_cost || 0,
      total_amount: (form.parts_cost || 0) + (form.labor_cost || 0),
      internal_notes: form.internal_notes, customer_notes: form.customer_notes,
      payment_status: form.payment_status || 'pending',
    }
    const { error } = await supabase.from('work_orders').insert(payload)
    if (error) { toast('Fehler beim Erstellen: ' + error.message, 'error') }
    else { toast('Auftrag erstellt'); setModalOpen(false); load() }
    setSaving(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('work_orders').update({ status }).eq('id', id)
    toast('Status aktualisiert')
    load()
  }

  const filteredVehicles = form.customer_id ? vehicles.filter(v => v.customer_id === form.customer_id) : vehicles

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
        <Button variant="primary" onClick={openNew}><Plus size={14} /> Neuer Auftrag</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a80] text-sm">Aufträge werden geladen...</div>
      ) : (
        <div>
          {filtered.map(o => (
            <div key={o.id} className="bg-white border border-[rgba(11,30,61,0.10)] rounded-[14px] overflow-hidden mb-3">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(11,30,61,0.08)]">
                <span className="text-[11px] font-bold text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded">{o.order_number}</span>
                <span className="font-semibold text-[13px] flex-1">{(o as any).customer?.full_name}</span>
                {(o as any).vehicle && (
                  <span className="bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-1 rounded hidden sm:inline">
                    {(o as any).vehicle.license_plate}
                  </span>
                )}
                <StatusBadge status={o.status} />
                {o.is_mobile && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">MOBIL</span>}
              </div>
              <div className="px-4 py-2.5 flex flex-wrap gap-4 text-[12px] text-[#5a6a80]">
                {(o as any).vehicle && <span>{(o as any).vehicle.make} {(o as any).vehicle.model}</span>}
                {o.service_type && <span>· {o.service_type}</span>}
                {o.scheduled_date && <span>· {formatDate(o.scheduled_date)}</span>}
                {o.total_amount > 0 && <span className="ml-auto font-semibold text-[#0B1E3D]">{formatCurrency(o.total_amount)}</span>}
                <div className="flex items-center gap-2 ml-auto">
                  <select value={o.status} onChange={e => updateStatus(o.id, e.target.value)}
                    className="text-[11px] border border-[rgba(11,30,61,0.18)] rounded px-2 py-1 bg-white outline-none cursor-pointer">
                    {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>
              {o.fault_description && (
                <div className="px-4 pb-3 text-[12px] text-[#5a6a80] border-t border-[rgba(11,30,61,0.05)] pt-2">
                  {o.fault_description}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-10 text-[#8fa0b5] text-sm">Keine Aufträge gefunden</div>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Neuer Arbeitsauftrag" className="max-w-2xl"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Erstellen...' : 'Erstellen'}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup>
            <FormLabel>Kunde *</FormLabel>
            <Select value={form.customer_id || ''} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value, vehicle_id: '' }))}>
              <option value="">Bitte wählen...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Fahrzeug *</FormLabel>
            <Select value={form.vehicle_id || ''} onChange={e => setForm(f => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Bitte wählen...</option>
              {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} – {v.license_plate}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Serviceart</FormLabel>
            <Select value={form.service_type || ''} onChange={e => setForm(f => ({ ...f, service_type: e.target.value }))}>
              <option value="">Bitte wählen...</option>
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
            <FormLabel>Status</FormLabel>
            <Select value={form.status || 'new_booking'} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Datum</FormLabel>
            <Input type="date" value={form.scheduled_date || ''} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Uhrzeit</FormLabel>
            <Input type="time" value={form.scheduled_time || ''} onChange={e => setForm(f => ({ ...f, scheduled_time: e.target.value }))} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Mechanikar</FormLabel>
            <Select value={form.mechanic_id || ''} onChange={e => setForm(f => ({ ...f, mechanic_id: e.target.value }))}>
              <option value="">Nicht zugewiesen</option>
              {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Mobil Service</FormLabel>
            <Select value={form.is_mobile ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, is_mobile: e.target.value === 'yes' }))}>
              <option value="no">Nein</option>
              <option value="yes">Ja</option>
            </Select>
          </FormGroup>
          {form.is_mobile && (
            <FormGroup className="col-span-2">
              <FormLabel>Mobil-Adresse</FormLabel>
              <Input value={form.mobile_address || ''} onChange={e => setForm(f => ({ ...f, mobile_address: e.target.value }))} placeholder="Kundenadresse..." />
            </FormGroup>
          )}
          <FormGroup className="col-span-2">
            <FormLabel>Fehlerbeschreibung</FormLabel>
            <Textarea value={form.fault_description || ''} onChange={e => setForm(f => ({ ...f, fault_description: e.target.value }))} placeholder="Was hat der Kunde beschrieben?" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Teilekosten (CHF)</FormLabel>
            <Input type="number" step="0.01" value={form.parts_cost || ''} onChange={e => setForm(f => ({ ...f, parts_cost: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Arbeitskosten (CHF)</FormLabel>
            <Input type="number" step="0.01" value={form.labor_cost || ''} onChange={e => setForm(f => ({ ...f, labor_cost: parseFloat(e.target.value) || 0 }))} placeholder="0.00" />
          </FormGroup>
          <FormGroup className="col-span-2">
            <FormLabel>Interne Notizen</FormLabel>
            <Textarea value={form.internal_notes || ''} onChange={e => setForm(f => ({ ...f, internal_notes: e.target.value }))} />
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
