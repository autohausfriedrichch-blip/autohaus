'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Plus, Search, Check, X, Clock } from 'lucide-react'
import { formatDate, formatDateTime } from '@/lib/utils'

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-600',
}
const statusLabels: Record<string, string> = {
  pending: 'Ausstehend', confirmed: 'Bestätigt', cancelled: 'Storniert', completed: 'Abgeschlossen'
}

export function BookingsPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [bookings, setBookings] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<any>({ status: 'pending', urgency: 'normal', is_mobile: false, duration_minutes: 60 })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: b }, { data: c }, { data: v }] = await Promise.all([
      supabase.from('bookings').select('*, customer:customers(full_name,phone), vehicle:vehicles(make,model,license_plate)').order('scheduled_date', { ascending: false }).order('scheduled_time'),
      supabase.from('customers').select('id, full_name').order('full_name'),
      supabase.from('vehicles').select('id, make, model, license_plate, customer_id').order('license_plate'),
    ])
    setBookings(b || [])
    setCustomers(c || [])
    setVehicles(v || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const filtered = bookings.filter(b => {
    const s = search.toLowerCase()
    return !s || (b.customer?.full_name || '').toLowerCase().includes(s) || (b.vehicle?.license_plate || '').toLowerCase().includes(s) || b.service_type?.toLowerCase().includes(s)
  })

  const handleSave = async () => {
    if (!form.customer_id || !form.service_type || !form.scheduled_date) { toast('Pflichtfelder fehlen', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('bookings').insert(form)
    if (error) { toast('Fehler: ' + error.message, 'error') } else { toast('Buchung erstellt'); setModalOpen(false); load() }
    setSaving(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('bookings').update({ status }).eq('id', id)
    toast('Status aktualisiert')
    load()
  }

  const filteredVehicles = form.customer_id ? vehicles.filter(v => v.customer_id === form.customer_id) : vehicles

  return (
    <div className="animate-fade-in">
      <div className="flex gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa0b5]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ügyfél, rendszám, szolgáltatás..."
            className="w-full pl-9 pr-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0B1E3D]" />
        </div>
        <Button variant="primary" onClick={() => { setForm({ status: 'pending', urgency: 'normal', is_mobile: false, duration_minutes: 60 }); setModalOpen(true) }}>
          <Plus size={14} /> Neue Buchung
        </Button>
      </div>

      {loading ? <div className="text-center py-12 text-[#5a6a80] text-sm">Wird geladen...</div> : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#F4F5F7] border-b border-[rgba(11,30,61,0.10)]">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider">Datum / Zeit</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider">Kunde</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider hidden md:table-cell">Service</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider hidden sm:table-cell">Jármű</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id} className="border-b border-[rgba(11,30,61,0.06)] hover:bg-[#fafbfc]">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#0B1E3D]">{formatDate(b.scheduled_date)}</div>
                    <div className="text-[11px] text-[#5a6a80] flex items-center gap-1"><Clock size={10} /> {b.scheduled_time?.slice(0,5)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{b.customer?.full_name}</div>
                    <div className="text-[11px] text-[#5a6a80]">{b.customer?.phone}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-[12px] text-[#5a6a80]">{b.service_type}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {b.vehicle && <span className="bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-0.5 rounded">{b.vehicle.license_plate}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[b.status] || 'bg-gray-100 text-gray-600'}`}>
                      {statusLabels[b.status] || b.status}
                    </span>
                    {b.urgency === 'urgent' && <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-semibold">DRINGEND</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {b.status === 'pending' && <>
                        <button onClick={() => updateStatus(b.id, 'confirmed')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Bestätigen"><Check size={14} /></button>
                        <button onClick={() => updateStatus(b.id, 'cancelled')} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Stornieren"><X size={14} /></button>
                      </>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-10 text-[#8fa0b5] text-sm">Nem található foglalás</div>}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Neue Buchung" className="max-w-xl"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup>
            <FormLabel>Kunde *</FormLabel>
            <Select value={form.customer_id || ''} onChange={e => setForm((f: any) => ({ ...f, customer_id: e.target.value, vehicle_id: '' }))}>
              <option value="">Bitte wählen...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Jármű</FormLabel>
            <Select value={form.vehicle_id || ''} onChange={e => setForm((f: any) => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">Bitte wählen...</option>
              {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} – {v.license_plate}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Service *</FormLabel>
            <Select value={form.service_type || ''} onChange={e => setForm((f: any) => ({ ...f, service_type: e.target.value }))}>
              <option value="">Bitte wählen...</option>
              <option value="Mobil Reifenwechsel">Mobil Reifenwechsel</option>
              <option value="Mobil Detailing">Mobil Detailing</option>
              <option value="Garázs Szerviz">Garázs Szerviz</option>
              <option value="Diagnose">Diagnose</option>
              <option value="Ölwechsel">Ölwechsel</option>
              <option value="Pickup & Delivery">Pickup & Delivery</option>
              <option value="Flotte Wartung">Flotte Wartung</option>
              <option value="Sonstiges">Sonstiges</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Dringlichkeit</FormLabel>
            <Select value={form.urgency || 'normal'} onChange={e => setForm((f: any) => ({ ...f, urgency: e.target.value }))}>
              <option value="normal">Normal</option>
              <option value="urgent">Dringend</option>
              <option value="asap">So schnell wie möglich</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Datum *</FormLabel>
            <Input type="date" value={form.scheduled_date || ''} onChange={e => setForm((f: any) => ({ ...f, scheduled_date: e.target.value }))} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Uhrzeit</FormLabel>
            <Input type="time" value={form.scheduled_time || ''} onChange={e => setForm((f: any) => ({ ...f, scheduled_time: e.target.value }))} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Mobil Service</FormLabel>
            <Select value={form.is_mobile ? 'yes' : 'no'} onChange={e => setForm((f: any) => ({ ...f, is_mobile: e.target.value === 'yes' }))}>
              <option value="no">Nein</option>
              <option value="yes">Ja</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Dauer (Min.)</FormLabel>
            <Input type="number" value={form.duration_minutes || 60} onChange={e => setForm((f: any) => ({ ...f, duration_minutes: parseInt(e.target.value) }))} />
          </FormGroup>
          {form.is_mobile && (
            <FormGroup className="col-span-2">
              <FormLabel>Adresse</FormLabel>
              <Input value={form.mobile_address || ''} onChange={e => setForm((f: any) => ({ ...f, mobile_address: e.target.value }))} placeholder="Kundenadresse..." />
            </FormGroup>
          )}
          <FormGroup className="col-span-2">
            <FormLabel>Notizen</FormLabel>
            <Textarea value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
