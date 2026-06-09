'use client'
import { useEffect, useState, useCallback, useRef, memo } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Plus, Search, Phone, Mail, MapPin, Car, Edit2, Trash2, ClipboardList } from 'lucide-react'
import type { Customer } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { NewCustomerWizard } from './NewCustomerWizard'

export function CustomersPage({ refreshKey, onNavigate }: { refreshKey: number; onRefresh: () => void; onNavigate?: (page: string) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null)
  const [form, setForm] = useState<Partial<Customer>>({})
  const [saving, setSaving] = useState(false)
  const [whatsappSame, setWhatsappSame] = useState(true)
  const [wizardCustomer, setWizardCustomer] = useState<{ id: string; name: string } | null>(null)
  const { toast } = useToast()

  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '')
    if (digits.startsWith('41') && digits.length >= 11) {
      return `+41 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`
    }
    if (digits.startsWith('0') && digits.length >= 10) {
      return `+41 ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`
    }
    if (digits.length === 10 && !digits.startsWith('0')) {
      return `+41 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`
    }
    return value
  }

  const handlePhoneChange = (raw: string) => {
    // Store raw value while typing – format only on blur
    setForm(f => ({ ...f, phone: raw, ...(whatsappSame ? { whatsapp: raw } : {}) }))
  }

  const handlePhoneBlur = (raw: string) => {
    const formatted = formatPhone(raw)
    setForm(f => ({ ...f, phone: formatted, ...(whatsappSame ? { whatsapp: formatted } : {}) }))
  }
  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('customers')
      .select('*, vehicles:vehicles(id)')
      .order('full_name')
    setCustomers((data as any) || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.phone || '').includes(search) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.customer_number || '').toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => {
    setEditCustomer(null)
    setForm({ preferred_contact: 'phone', marketing_consent: false })
    setWhatsappSame(true)
    setModalOpen(true)
  }

  const openEdit = (c: Customer) => {
    setEditCustomer(c)
    setForm(c)
    setWhatsappSame(!!(c.whatsapp && c.whatsapp === c.phone))
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.full_name || !form.phone) { toast('A név és telefonszám kötelező', 'error'); return }
    setSaving(true)
    const payload = {
      full_name: form.full_name, phone: form.phone, email: form.email,
      whatsapp: form.whatsapp, address: form.address, city: form.city,
      postal_code: form.postal_code, preferred_contact: form.preferred_contact,
      marketing_consent: form.marketing_consent, notes: form.notes,
    }
    if (editCustomer) {
      const { error } = await supabase.from('customers').update(payload).eq('id', editCustomer.id)
      if (error) { toast('Hiba: ' + error.message, 'error'); console.error(error) } else { toast('Ügyfél frissítve'); setModalOpen(false); load() }
    } else {
      const { data: newC, error } = await supabase.from('customers').insert(payload).select('id, full_name').single()
      if (error) { toast('Hiba: ' + error.message, 'error'); console.error(error) }
      else {
        setModalOpen(false)
        load()
        setWizardCustomer({ id: newC.id, name: newC.full_name })
      }
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Biztosan törlöd az ügyfelet?')) return
    const { error } = await supabase.from('customers').delete().eq('id', id)
    if (error) { toast('Hiba a törlés során', 'error') } else { toast('Ügyfél törölve'); load() }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa0b5]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Keresés név, telefon, e-mail, ügyfélszám szerint..."
            className="w-full pl-9 pr-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0B1E3D]"
          />
        </div>
        <Button variant="primary" onClick={openNew}><Plus size={14} /> Új ügyfél</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a80] text-sm">Ügyfelek betöltése...</div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#F4F5F7] border-b border-[rgba(11,30,61,0.10)]">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider">Név</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider hidden md:table-cell">Kapcsolat</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider hidden lg:table-cell">Cím</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider hidden sm:table-cell">Járművek</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider hidden lg:table-cell">Regisztrált</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} className="border-b border-[rgba(11,30,61,0.06)] hover:bg-[#fafbfc] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[#0B1E3D] flex items-center gap-2">
                      {c.full_name}
                      {c.customer_number && <span className="text-[10px] font-bold text-[#185FA5] bg-[#E6F1FB] px-1.5 py-0.5 rounded font-mono">{c.customer_number}</span>}
                    </div>
                    <div className="text-[11px] text-[#5a6a80] flex items-center gap-1 mt-0.5 md:hidden">
                      <Phone size={10} /> {c.phone}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1.5 text-[12px] text-[#5a6a80]"><Phone size={12} /> {c.phone}</div>
                    {c.email && <div className="flex items-center gap-1.5 text-[12px] text-[#5a6a80] mt-0.5"><Mail size={12} /> {c.email}</div>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-[12px] text-[#5a6a80]">
                    {c.address ? <div className="flex items-center gap-1"><MapPin size={12} /> {c.city || c.address}</div> : '–'}
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    <div className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0B1E3D]">
                      <Car size={13} className="text-[#C9A84C]" />
                      {(c.vehicles as any)?.length || 0}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-[12px] text-[#8fa0b5]">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setWizardCustomer({ id: c.id, name: c.full_name })} title="Árajánlat / Munkalap indítása"
                        className="p-1.5 text-[#5a6a80] hover:text-[#C9A84C] transition-colors"><ClipboardList size={14} /></button>
                      <button onClick={() => openEdit(c)} className="p-1.5 text-[#5a6a80] hover:text-[#0B1E3D] transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 text-[#5a6a80] hover:text-[#C9384C] transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-[#8fa0b5] text-sm">
              {search ? 'Nem található ügyfél' : 'Még nincs ügyfél'}
            </div>
          )}
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editCustomer ? 'Ügyfél szerkesztése' : 'Új ügyfél'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormGroup className="col-span-2">
            <FormLabel>Teljes név *</FormLabel>
            <Input defaultValue={form.full_name || ''} onBlur={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Kovács János" key={`name-${editCustomer?.id}`} />
          </FormGroup>
          <FormGroup className="col-span-2">
            <FormLabel>Telefonszám *</FormLabel>
            <Input
              type="tel"
              defaultValue={form.phone || ''}
              onChange={e => handlePhoneChange(e.target.value)}
              onBlur={e => handlePhoneBlur(e.target.value)}
              placeholder="+41 79 123 45 67"
              key={`phone-${editCustomer?.id}`}
            />
          </FormGroup>
          <FormGroup className="col-span-2">
            <div className="flex items-center justify-between mb-1">
              <FormLabel>WhatsApp</FormLabel>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={whatsappSame}
                  onChange={e => {
                    setWhatsappSame(e.target.checked)
                    if (e.target.checked) setForm(f => ({ ...f, whatsapp: f.phone }))
                  }}
                  className="w-3.5 h-3.5 accent-[#C9A84C]"
                />
                <span className="text-[11px] text-[#5a6a80]">Ugyanaz mint a telefon</span>
              </label>
            </div>
            <Input
              type="tel"
              defaultValue={form.whatsapp || ''}
              onBlur={e => { setForm(f => ({ ...f, whatsapp: e.target.value })) }}
              placeholder="+41 79 123 45 67"
              disabled={whatsappSame}
              className={whatsappSame ? 'opacity-50' : ''}
              key={`wa-${editCustomer?.id}-${whatsappSame}`}
            />
          </FormGroup>
          <FormGroup className="col-span-2">
            <FormLabel>E-Mail</FormLabel>
            <Input type="email" defaultValue={form.email || ''} onBlur={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="max@example.com" key={`email-${editCustomer?.id}`} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Utca & hsz.</FormLabel>
            <Input defaultValue={form.address || ''} onBlur={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Fő utca 1" key={`addr-${editCustomer?.id}`} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Irányítószám / Város</FormLabel>
            <div className="flex gap-2">
              <Input defaultValue={form.postal_code || ''} onBlur={e => setForm(f => ({ ...f, postal_code: e.target.value }))} placeholder="1234" className="w-20" key={`plz-${editCustomer?.id}`} />
              <Input defaultValue={form.city || ''} onBlur={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Budapest" key={`city-${editCustomer?.id}`} />
            </div>
          </FormGroup>
          <FormGroup>
            <FormLabel>Preferált kapcsolat</FormLabel>
            <Select value={form.preferred_contact || 'phone'} onChange={e => setForm(f => ({ ...f, preferred_contact: e.target.value as any }))}>
              <option value="phone">Telefon</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-Mail</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Marketing</FormLabel>
            <Select value={form.marketing_consent ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, marketing_consent: e.target.value === 'yes' }))}>
              <option value="no">Nem</option>
              <option value="yes">Igen, hozzájárult</option>
            </Select>
          </FormGroup>
          <FormGroup className="col-span-2">
            <FormLabel>Megjegyzések</FormLabel>
            <Textarea defaultValue={form.notes || ''} onBlur={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Belső megjegyzések..." key={`notes-${editCustomer?.id}`} />
          </FormGroup>
        </div>
      </Modal>

      {wizardCustomer && (
        <NewCustomerWizard
          customerId={wizardCustomer.id}
          customerName={wizardCustomer.name}
          onClose={() => setWizardCustomer(null)}
          onNavigate={onNavigate}
        />
      )}
    </div>
  )
}
