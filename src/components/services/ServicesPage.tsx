'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { Service } from '@/lib/types'

const CATEGORIES = ['autószerviz', 'mobil gumiszerviz', 'mobil autótakarítás', 'detailing', 'pickup & delivery', 'flotta']

export function ServicesPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editService, setEditService] = useState<Service | null>(null)
  const [form, setForm] = useState<Partial<Service>>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('services').select('*').order('category').order('name')
    setServices(data || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const openNew = () => { setEditService(null); setForm({ is_active: true, is_mobile: false, is_visible_to_customer: true, category: 'autószerviz' }); setModalOpen(true) }
  const openEdit = (s: Service) => { setEditService(s); setForm(s); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.name || !form.category) { toast('Name und Kategorie sind Pflicht', 'error'); return }
    setSaving(true)
    if (editService) {
      const { error } = await supabase.from('services').update(form).eq('id', editService.id)
      if (error) { toast('Fehler', 'error') } else { toast('Service aktualisiert'); setModalOpen(false); load() }
    } else {
      const { error } = await supabase.from('services').insert(form)
      if (error) { toast('Fehler', 'error') } else { toast('Service erstellt'); setModalOpen(false); load() }
    }
    setSaving(false)
  }

  const toggleActive = async (s: Service) => {
    await supabase.from('services').update({ is_active: !s.is_active }).eq('id', s.id)
    load()
  }

  const grouped = CATEGORIES.map(cat => ({ cat, items: services.filter(s => s.category === cat) })).filter(g => g.items.length > 0)

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <p className="text-[#5a6a80] text-sm">{services.length} Dienste konfiguriert</p>
        <Button variant="primary" onClick={openNew}><Plus size={14} /> Neuer Service</Button>
      </div>

      {loading ? <div className="text-center py-12 text-[#5a6a80] text-sm">Wird geladen...</div> : (
        grouped.map(({ cat, items }) => (
          <div key={cat} className="mb-5">
            <h3 className="text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[1px] mb-2.5 flex items-center gap-2">
              <span className="flex-1 h-px bg-[rgba(11,30,61,0.08)]" />
              {cat}
              <span className="flex-1 h-px bg-[rgba(11,30,61,0.08)]" />
            </h3>
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F4F5F7] border-b border-[rgba(11,30,61,0.10)]">
                    <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-[#5a6a80] uppercase">Name</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-[#5a6a80] uppercase hidden sm:table-cell">Preis</th>
                    <th className="text-right px-4 py-2.5 text-[11px] font-semibold text-[#5a6a80] uppercase hidden md:table-cell">Dauer</th>
                    <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-[#5a6a80] uppercase hidden sm:table-cell">Mobil</th>
                    <th className="text-center px-4 py-2.5 text-[11px] font-semibold text-[#5a6a80] uppercase">Aktiv</th>
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {items.map(s => (
                    <tr key={s.id} className={`border-b border-[rgba(11,30,61,0.06)] ${!s.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.name}</div>
                        {s.description && <div className="text-[11px] text-[#8fa0b5] mt-0.5">{s.description}</div>}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell font-semibold">{s.price ? formatCurrency(s.price) : '–'}</td>
                      <td className="px-4 py-3 text-right hidden md:table-cell text-[#5a6a80]">{s.duration_minutes ? `${s.duration_minutes} min` : '–'}</td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        {s.is_mobile ? <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">JA</span> : <span className="text-[#8fa0b5] text-[12px]">–</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => toggleActive(s)} className={s.is_active ? 'text-emerald-500' : 'text-[#8fa0b5]'}>
                          {s.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(s)} className="p-1.5 text-[#5a6a80] hover:text-[#0B1E3D]"><Edit2 size={14} /></button>
                          <button onClick={async () => { if (confirm('Löschen?')) { await supabase.from('services').delete().eq('id', s.id); load() } }} className="p-1.5 text-[#5a6a80] hover:text-[#C9384C]"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        ))
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editService ? 'Service bearbeiten' : 'Neuer Service'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Speichern...' : 'Speichern'}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup className="col-span-2">
            <FormLabel>Name *</FormLabel>
            <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Servicename..." />
          </FormGroup>
          <FormGroup>
            <FormLabel>Kategorie *</FormLabel>
            <Select value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Preis (CHF)</FormLabel>
            <Input type="number" step="0.01" value={form.price || ''} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) }))} placeholder="0.00" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Dauer (Min.)</FormLabel>
            <Input type="number" value={form.duration_minutes || ''} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) }))} placeholder="60" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Mobil Service</FormLabel>
            <Select value={form.is_mobile ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, is_mobile: e.target.value === 'yes' }))}>
              <option value="no">Nein</option>
              <option value="yes">Ja</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Aktiv</FormLabel>
            <Select value={form.is_active ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'yes' }))}>
              <option value="yes">Aktiv</option>
              <option value="no">Inaktiv</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Kundenseitig sichtbar</FormLabel>
            <Select value={form.is_visible_to_customer ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, is_visible_to_customer: e.target.value === 'yes' }))}>
              <option value="yes">Ja</option>
              <option value="no">Nein</option>
            </Select>
          </FormGroup>
          <FormGroup className="col-span-2">
            <FormLabel>Beschreibung</FormLabel>
            <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
