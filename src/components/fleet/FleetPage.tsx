'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Plus, Building2, Edit2 } from 'lucide-react'
import type { FleetAccount } from '@/lib/types'

export function FleetPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [fleets, setFleets] = useState<FleetAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editFleet, setEditFleet] = useState<FleetAccount | null>(null)
  const [form, setForm] = useState<Partial<FleetAccount>>({})
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('fleet_accounts').select('*').order('company_name')
    setFleets(data || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const openNew = () => { setEditFleet(null); setForm({ contract_status: 'active', discount_percent: 0 }); setModalOpen(true) }
  const openEdit = (f: FleetAccount) => { setEditFleet(f); setForm(f); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.company_name) { toast('Firmenname ist Pflicht', 'error'); return }
    setSaving(true)
    if (editFleet) {
      await supabase.from('fleet_accounts').update(form).eq('id', editFleet.id)
      toast('Flottenkunde aktualisiert')
    } else {
      await supabase.from('fleet_accounts').insert(form)
      toast('Flottenkunde erstellt')
    }
    setModalOpen(false); load(); setSaving(false)
  }

  const statusColors: Record<string, string> = { active: 'text-emerald-600 bg-emerald-50', inactive: 'text-gray-500 bg-gray-100', pending: 'text-amber-600 bg-amber-50' }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <p className="text-[#4a4a4a] text-sm">{fleets.length} Flottenkonten</p>
        <Button variant="primary" onClick={openNew}><Plus size={14} /> Neuer Flottenkunde</Button>
      </div>

      {loading ? <div className="text-center py-12 text-[#4a4a4a] text-sm">Wird geladen...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {fleets.map(f => (
            <Card key={f.id} className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-[#0D0D0D] rounded-lg flex items-center justify-center shrink-0">
                  <Building2 size={18} className="text-[#C8102E]" />
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[f.contract_status] || ''}`}>
                  {f.contract_status === 'active' ? 'Aktiv' : f.contract_status === 'inactive' ? 'Inaktiv' : 'Ausstehend'}
                </span>
              </div>
              <h3 className="font-semibold text-[14px] text-[#0D0D0D] mb-1">{f.company_name}</h3>
              {f.contact_name && <p className="text-[12px] text-[#4a4a4a]">{f.contact_name}</p>}
              {f.contact_phone && <p className="text-[12px] text-[#4a4a4a]">{f.contact_phone}</p>}
              {f.discount_percent > 0 && (
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold bg-[rgba(201,168,76,0.15)] text-[#7a5a10] px-2 py-0.5 rounded-full">
                  {f.discount_percent}% Rabatt
                </div>
              )}
              <button onClick={() => openEdit(f)} className="absolute top-4 right-10 p-1.5 text-[#4a4a4a] hover:text-[#0D0D0D]"><Edit2 size={14} /></button>
            </Card>
          ))}
          {fleets.length === 0 && <div className="col-span-full text-center py-10 text-[#888888] text-sm">Nincs flottafiók</div>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editFleet ? 'Flottenkunde bearbeiten' : 'Neuer Flottenkunde'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup className="col-span-2">
            <FormLabel>Firmenname *</FormLabel>
            <Input value={form.company_name || ''} onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Musterfirma AG" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Ansprechpartner</FormLabel>
            <Input value={form.contact_name || ''} onChange={e => setForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Max Mustermann" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Telefon</FormLabel>
            <Input value={form.contact_phone || ''} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))} placeholder="+41 44 123 45 67" />
          </FormGroup>
          <FormGroup>
            <FormLabel>E-Mail</FormLabel>
            <Input type="email" value={form.contact_email || ''} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Rabatt (%)</FormLabel>
            <Input type="number" min="0" max="100" value={form.discount_percent || 0} onChange={e => setForm(f => ({ ...f, discount_percent: parseFloat(e.target.value) }))} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Vertragsstatus</FormLabel>
            <Select value={form.contract_status || 'active'} onChange={e => setForm(f => ({ ...f, contract_status: e.target.value as any }))}>
              <option value="active">Aktiv</option>
              <option value="pending">Ausstehend</option>
              <option value="inactive">Inaktiv</option>
            </Select>
          </FormGroup>
          <FormGroup className="col-span-2">
            <FormLabel>Rechnungsadresse</FormLabel>
            <Textarea value={form.billing_address || ''} onChange={e => setForm(f => ({ ...f, billing_address: e.target.value }))} />
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
