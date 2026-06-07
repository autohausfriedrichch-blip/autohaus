'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Plus, Search, Edit2, Trash2 } from 'lucide-react'
import type { Vehicle } from '@/lib/types'

export function VehiclesPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null)
  const [form, setForm] = useState<Partial<Vehicle>>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: v }, { data: c }] = await Promise.all([
      supabase.from('vehicles').select('*, customer:customers(full_name, phone)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, full_name').order('full_name'),
    ])
    setVehicles((v as any) || [])
    setCustomers(c || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const filtered = vehicles.filter(v =>
    (v.license_plate || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.make || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.model || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.vin || '').toLowerCase().includes(search.toLowerCase()) ||
    ((v as any).customer?.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => { setEditVehicle(null); setForm({ fuel_type: 'petrol' }); setModalOpen(true) }
  const openEdit = (v: Vehicle) => { setEditVehicle(v); setForm(v); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.customer_id || !form.make || !form.license_plate) { toast('Pflichtfelder fehlen', 'error'); return }
    setSaving(true)
    const payload = {
      customer_id: form.customer_id, make: form.make, model: form.model,
      year: form.year, license_plate: form.license_plate?.toUpperCase(),
      vin: form.vin, mileage: form.mileage, fuel_type: form.fuel_type,
      color: form.color, notes: form.notes,
    }
    if (editVehicle) {
      const { error } = await supabase.from('vehicles').update(payload).eq('id', editVehicle.id)
      if (error) { toast('Fehler', 'error') } else { toast('Fahrzeug aktualisiert'); setModalOpen(false); load() }
    } else {
      const { error } = await supabase.from('vehicles').insert(payload)
      if (error) { toast('Fehler', 'error') } else { toast('Fahrzeug erstellt'); setModalOpen(false); load() }
    }
    setSaving(false)
  }

  const fuelLabels: Record<string, string> = { petrol: 'Benzin', diesel: 'Diesel', electric: 'Elektro', hybrid: 'Hybrid', lpg: 'LPG' }

  return (
    <div className="animate-fade-in">
      <div className="flex gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa0b5]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Kennzeichen, Marke, VIN, Besitzer..."
            className="w-full pl-9 pr-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0B1E3D]" />
        </div>
        <Button variant="primary" onClick={openNew}><Plus size={14} /> Fahrzeug</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a80] text-sm">Fahrzeuge werden geladen...</div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#F4F5F7] border-b border-[rgba(11,30,61,0.10)]">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider">Kennzeichen</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider">Fahrzeug</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider hidden md:table-cell">Besitzer</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider hidden lg:table-cell">Kraftstoff</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider hidden lg:table-cell">KM-Stand</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="border-b border-[rgba(11,30,61,0.06)] hover:bg-[#fafbfc] transition-colors">
                  <td className="px-4 py-3">
                    <span className="bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-1 rounded">{v.license_plate}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold">{v.make} {v.model}</div>
                    <div className="text-[11px] text-[#5a6a80]">{v.year} {v.color ? `· ${v.color}` : ''}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-[12px] text-[#5a6a80]">{(v as any).customer?.full_name || '–'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-[12px] text-[#5a6a80]">{fuelLabels[v.fuel_type] || v.fuel_type}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-[12px] text-[#5a6a80]">{v.mileage ? `${v.mileage.toLocaleString()} km` : '–'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => openEdit(v)} className="p-1.5 text-[#5a6a80] hover:text-[#0B1E3D]"><Edit2 size={14} /></button>
                      <button onClick={async () => { if (confirm('Fahrzeug löschen?')) { await supabase.from('vehicles').delete().eq('id', v.id); load() } }} className="p-1.5 text-[#5a6a80] hover:text-[#C9384C]"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-10 text-[#8fa0b5] text-sm">Keine Fahrzeuge gefunden</div>}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editVehicle ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup className="col-span-2">
            <FormLabel>Besitzer *</FormLabel>
            <Select value={form.customer_id || ''} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
              <option value="">Bitte wählen...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Marke *</FormLabel>
            <Input value={form.make || ''} onChange={e => setForm(f => ({ ...f, make: e.target.value }))} placeholder="BMW" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Modell</FormLabel>
            <Input value={form.model || ''} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="320d" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Kennzeichen *</FormLabel>
            <Input value={form.license_plate || ''} onChange={e => setForm(f => ({ ...f, license_plate: e.target.value }))} placeholder="ZH 123456" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Baujahr</FormLabel>
            <Input type="number" value={form.year || ''} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))} placeholder="2020" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Kraftstoff</FormLabel>
            <Select value={form.fuel_type || 'petrol'} onChange={e => setForm(f => ({ ...f, fuel_type: e.target.value as any }))}>
              <option value="petrol">Benzin</option>
              <option value="diesel">Diesel</option>
              <option value="electric">Elektro</option>
              <option value="hybrid">Hybrid</option>
              <option value="lpg">LPG</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>KM-Stand</FormLabel>
            <Input type="number" value={form.mileage || ''} onChange={e => setForm(f => ({ ...f, mileage: parseInt(e.target.value) }))} placeholder="50000" />
          </FormGroup>
          <FormGroup>
            <FormLabel>VIN</FormLabel>
            <Input value={form.vin || ''} onChange={e => setForm(f => ({ ...f, vin: e.target.value }))} placeholder="WBA..." />
          </FormGroup>
          <FormGroup>
            <FormLabel>Farbe</FormLabel>
            <Input value={form.color || ''} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="Schwarz" />
          </FormGroup>
          <FormGroup className="col-span-2">
            <FormLabel>Notizen</FormLabel>
            <Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
