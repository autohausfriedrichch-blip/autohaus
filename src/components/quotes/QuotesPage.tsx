'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Plus, Search, Send, Check, X, Trash2 } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  expired: 'bg-orange-100 text-orange-800',
}
const statusLabels: Record<string, string> = {
  draft: 'Entwurf', sent: 'Gesendet', approved: 'Genehmigt', rejected: 'Abgelehnt', expired: 'Abgelaufen'
}

export function QuotesPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [quotes, setQuotes] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<any>({ status: 'draft', tax_rate: 7.7, items: [] })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: q }, { data: c }, { data: v }, { data: wo }] = await Promise.all([
      supabase.from('quotes').select('*, customer:customers(full_name), vehicle:vehicles(make,model,license_plate)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, full_name').order('full_name'),
      supabase.from('vehicles').select('id, make, model, license_plate, customer_id'),
      supabase.from('work_orders').select('id, order_number, customer_id').not('status', 'in', '(delivered,closed)'),
    ])
    setQuotes(q || [])
    setCustomers(c || [])
    setVehicles(v || [])
    setWorkOrders(wo || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const filtered = quotes.filter(q => {
    const s = search.toLowerCase()
    return !s || (q.customer?.full_name || '').toLowerCase().includes(s) || (q.vehicle?.license_plate || '').toLowerCase().includes(s)
  })

  const addItem = () => setForm((f: any) => ({ ...f, items: [...(f.items || []), { description: '', quantity: 1, unit_price: 0, item_type: 'labor' }] }))
  const removeItem = (i: number) => setForm((f: any) => ({ ...f, items: f.items.filter((_: any, idx: number) => idx !== i) }))
  const updateItem = (i: number, field: string, value: any) => setForm((f: any) => {
    const items = [...f.items]
    items[i] = { ...items[i], [field]: value }
    return { ...f, items }
  })

  const calcTotals = () => {
    const items = form.items || []
    const parts = items.filter((i: any) => i.item_type === 'part').reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0)
    const labor = items.filter((i: any) => i.item_type !== 'part').reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0)
    const subtotal = parts + labor
    const total = subtotal * (1 + (form.tax_rate || 0) / 100)
    return { parts, labor, subtotal, total }
  }

  const handleSave = async () => {
    if (!form.customer_id) { toast('Kunde ist Pflichtfeld', 'error'); return }
    setSaving(true)
    const { parts, labor, total } = calcTotals()
    const payload = { customer_id: form.customer_id, vehicle_id: form.vehicle_id || null, work_order_id: form.work_order_id || null, status: form.status, valid_until: form.valid_until, items: form.items, labor_cost: labor, parts_cost: parts, tax_rate: form.tax_rate || 7.7, total_amount: total, notes: form.notes }
    const { error } = await supabase.from('quotes').insert(payload)
    if (error) { toast('Fehler: ' + error.message, 'error') } else { toast('Angebot erstellt'); setModalOpen(false); load() }
    setSaving(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('quotes').update({ status }).eq('id', id)
    toast('Status aktualisiert')
    load()
  }

  const { parts, labor, subtotal, total } = calcTotals()
  const filteredVehicles = form.customer_id ? vehicles.filter(v => v.customer_id === form.customer_id) : vehicles

  return (
    <div className="animate-fade-in">
      <div className="flex gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa0b5]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Kunde, Kennzeichen..."
            className="w-full pl-9 pr-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0B1E3D]" />
        </div>
        <Button variant="primary" onClick={() => { setForm({ status: 'draft', tax_rate: 7.7, items: [] }); setModalOpen(true) }}><Plus size={14} /> Neues Angebot</Button>
      </div>

      {loading ? <div className="text-center py-12 text-[#5a6a80] text-sm">Wird geladen...</div> : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#F4F5F7] border-b border-[rgba(11,30,61,0.10)]">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Datum</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Kunde</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase hidden md:table-cell">Fahrzeug</th>
                <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Betrag</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(q => (
                <tr key={q.id} className="border-b border-[rgba(11,30,61,0.06)] hover:bg-[#fafbfc]">
                  <td className="px-4 py-3 text-[12px] text-[#5a6a80]">{formatDate(q.created_at)}</td>
                  <td className="px-4 py-3 font-medium">{q.customer?.full_name}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {q.vehicle && <span className="bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-0.5 rounded">{q.vehicle.license_plate}</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-[#0B1E3D]">{formatCurrency(q.total_amount || 0)}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[q.status] || ''}`}>{statusLabels[q.status] || q.status}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {q.status === 'draft' && <button onClick={() => updateStatus(q.id, 'sent')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Senden"><Send size={14} /></button>}
                      {q.status === 'sent' && <>
                        <button onClick={() => updateStatus(q.id, 'approved')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Genehmigen"><Check size={14} /></button>
                        <button onClick={() => updateStatus(q.id, 'rejected')} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="Ablehnen"><X size={14} /></button>
                      </>}
                      <button onClick={async () => { if (confirm('Löschen?')) { await supabase.from('quotes').delete().eq('id', q.id); load() } }} className="p-1.5 text-[#5a6a80] hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-10 text-[#8fa0b5] text-sm">Keine Angebote gefunden</div>}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Neues Angebot" className="max-w-2xl"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Erstellen...' : 'Erstellen'}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup>
            <FormLabel>Kunde *</FormLabel>
            <Select value={form.customer_id || ''} onChange={e => setForm((f: any) => ({ ...f, customer_id: e.target.value }))}>
              <option value="">Bitte wählen...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Fahrzeug</FormLabel>
            <Select value={form.vehicle_id || ''} onChange={e => setForm((f: any) => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">–</option>
              {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} – {v.license_plate}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Auftrag</FormLabel>
            <Select value={form.work_order_id || ''} onChange={e => setForm((f: any) => ({ ...f, work_order_id: e.target.value }))}>
              <option value="">–</option>
              {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.order_number}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Gültig bis</FormLabel>
            <Input type="date" value={form.valid_until || ''} onChange={e => setForm((f: any) => ({ ...f, valid_until: e.target.value }))} />
          </FormGroup>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#5a6a80] uppercase">Positionen</span>
            <Button variant="secondary" size="sm" onClick={addItem}><Plus size={12} /> Position</Button>
          </div>
          {(form.items || []).map((item: any, i: number) => (
            <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-start">
              <div className="col-span-5">
                <Input value={item.description} onChange={e => updateItem(i, 'description', e.target.value)} placeholder="Beschreibung" />
              </div>
              <div className="col-span-2">
                <Input type="number" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value))} placeholder="Menge" />
              </div>
              <div className="col-span-2">
                <Input type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value))} placeholder="CHF" />
              </div>
              <div className="col-span-2">
                <Select value={item.item_type} onChange={e => updateItem(i, 'item_type', e.target.value)}>
                  <option value="labor">Arbeit</option>
                  <option value="part">Teil</option>
                  <option value="other">Sonstiges</option>
                </Select>
              </div>
              <div className="col-span-1 flex justify-center pt-1.5">
                <button onClick={() => removeItem(i)} className="text-[#C9384C] hover:text-red-700"><X size={16} /></button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 bg-[#F4F5F7] rounded-lg p-3 text-[12px]">
          <div className="flex justify-between mb-1"><span className="text-[#5a6a80]">Teile:</span><span>{formatCurrency(parts)}</span></div>
          <div className="flex justify-between mb-1"><span className="text-[#5a6a80]">Arbeit:</span><span>{formatCurrency(labor)}</span></div>
          <div className="flex justify-between mb-2 items-center">
            <span className="text-[#5a6a80]">MwSt (%):</span>
            <Input type="number" step="0.1" value={form.tax_rate || 7.7} onChange={e => setForm((f: any) => ({ ...f, tax_rate: parseFloat(e.target.value) }))} className="w-20 text-right" />
          </div>
          <div className="flex justify-between font-bold text-[#0B1E3D] border-t border-[rgba(11,30,61,0.10)] pt-2">
            <span>Gesamt:</span><span>{formatCurrency(total)}</span>
          </div>
        </div>

        <FormGroup className="mt-3">
          <FormLabel>Notizen</FormLabel>
          <Textarea value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
        </FormGroup>
      </Modal>
    </div>
  )
}
