'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormGroup, FormLabel, Select } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'
import {
  Users, Car, Plus, Edit2, Phone, Mail, Star, ChevronDown, ChevronUp,
  TrendingUp, Clock, Wrench
} from 'lucide-react'

interface FamilyAccount {
  id: string
  name: string
  contact_person: string
  phone: string
  email: string
  address: string
  vip: boolean
  discount_type: string
  notes: string
  created_at: string
  // joined
  customer_ids?: string[]
  vehicle_count?: number
  total_spend?: number
}

const DISCOUNT_TYPES = [
  { value: 'none',      label: 'Nincs kedvezmény' },
  { value: 'family_2',  label: '2 autó – 5% kedvezmény' },
  { value: 'family_3',  label: '3 autó – 8% kedvezmény' },
  { value: 'family_4',  label: '4+ autó – 10% kedvezmény' },
  { value: 'vip',       label: 'VIP – 15% kedvezmény' },
  { value: 'custom',    label: 'Egyedi kedvezmény' },
]

const DISCOUNT_PCT: Record<string, number> = {
  none: 0, family_2: 5, family_3: 8, family_4: 10, vip: 15
}

export function FamilyFleetPage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const [accounts, setAccounts] = useState<FamilyAccount[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<FamilyAccount | null>(null)
  const [form, setForm] = useState<any>({})
  const [memberVehicles, setMemberVehicles] = useState<Record<string, any[]>>({})
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [faRes, custRes, vehRes] = await Promise.all([
      supabase.from('family_accounts').select('*').order('name'),
      supabase.from('customers').select('id,full_name,phone,email,family_account_id').order('full_name'),
      supabase.from('vehicles').select('id,make,model,license_plate,year,customer_id').order('make'),
    ])
    const accs = faRes.data || []
    const custs = custRes.data || []
    const vehs = vehRes.data || []

    // Enrich accounts
    const enriched = accs.map((acc: any) => {
      const members = custs.filter((c: any) => c.family_account_id === acc.id)
      const memberIds = members.map((c: any) => c.id)
      const famVehicles = vehs.filter((v: any) => memberIds.includes(v.customer_id))
      return { ...acc, customer_ids: memberIds, vehicle_count: famVehicles.length }
    })

    setAccounts(enriched)
    setCustomers(custs)
    setVehicles(vehs)

    // Build vehicle map per account
    const vmap: Record<string, any[]> = {}
    enriched.forEach((acc: any) => {
      const memberIds = acc.customer_ids || []
      vmap[acc.id] = vehs.filter((v: any) => memberIds.includes(v.customer_id))
    })
    setMemberVehicles(vmap)
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ name: '', contact_person: '', phone: '', email: '', address: '', vip: false, discount_type: 'none', notes: '' })
    setModalOpen(true)
  }

  const openEdit = (acc: FamilyAccount) => {
    setEditing(acc)
    setForm({ ...acc })
    setModalOpen(true)
  }

  const handleSave = async () => {
    const payload = {
      name: form.name,
      contact_person: form.contact_person || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      vip: form.vip || false,
      discount_type: form.discount_type || 'none',
      notes: form.notes || null,
    }

    if (editing) {
      await supabase.from('family_accounts').update(payload).eq('id', editing.id)
      toast('Family Fleet fiók frissítve')
    } else {
      await supabase.from('family_accounts').insert(payload)
      toast('Family Fleet fiók létrehozva')
    }
    setModalOpen(false)
    onRefresh()
  }

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const getMembers = (accId: string) => customers.filter(c => c.family_account_id === accId)

  return (
    <div className="animate-fade-in space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[16px] font-semibold text-[#0B1E3D]">Family Fleet</h2>
          <p className="text-[12px] text-[#5a6a80]">Családi ügyfélek és flotta kezelése</p>
        </div>
        <Button variant="gold" size="sm" onClick={openNew}>
          <Plus size={14} /> Új fiók
        </Button>
      </div>

      {loading ? (
        <div className="text-center text-[#5a6a80] py-8">Betöltés...</div>
      ) : accounts.length === 0 ? (
        <Card>
          <div className="text-center py-10">
            <Users size={32} className="text-[#8fa0b5] mx-auto mb-3" />
            <p className="text-[14px] font-medium text-[#5a6a80]">Nincs Family Fleet fiók</p>
            <p className="text-[12px] text-[#8fa0b5] mt-1 mb-4">Hozzon létre egy fiókot az első családi ügyfélhez</p>
            <Button variant="gold" size="sm" onClick={openNew}><Plus size={14} /> Első fiók létrehozása</Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {accounts.map(acc => {
            const isOpen = expanded.has(acc.id)
            const members = getMembers(acc.id)
            const accVehicles = memberVehicles[acc.id] || []
            const discPct = DISCOUNT_PCT[acc.discount_type] || 0

            return (
              <Card key={acc.id} className="overflow-hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[rgba(201,168,76,0.12)] rounded-xl flex items-center justify-center shrink-0">
                    <Users size={18} className="text-[#C9A84C]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[14px] text-[#0B1E3D]">{acc.name}</span>
                      {acc.vip && (
                        <span className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-[#C9A84C] text-[#0B1E3D] font-bold">
                          <Star size={9} /> VIP
                        </span>
                      )}
                      {discPct > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                          {discPct}% kedvezmény
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap mt-0.5">
                      <span className="text-[11px] text-[#5a6a80] flex items-center gap-1">
                        <Users size={10} /> {members.length} tag
                      </span>
                      <span className="text-[11px] text-[#5a6a80] flex items-center gap-1">
                        <Car size={10} /> {accVehicles.length} jármű
                      </span>
                      {acc.phone && (
                        <span className="text-[11px] text-[#5a6a80] flex items-center gap-1">
                          <Phone size={10} /> {acc.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(acc)} className="p-1.5 rounded-lg hover:bg-[#F4F5F7] text-[#5a6a80] transition-colors">
                      <Edit2 size={13} />
                    </button>
                    <button onClick={() => toggleExpand(acc.id)} className="p-1.5 rounded-lg hover:bg-[#F4F5F7] text-[#5a6a80] transition-colors">
                      {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-4 pt-4 border-t border-[rgba(11,30,61,0.08)] space-y-4">
                    {/* Members */}
                    <div>
                      <p className="text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider mb-2">Tagok</p>
                      {members.length === 0 ? (
                        <p className="text-[12px] text-[#8fa0b5]">Nincs tag hozzárendelve</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {members.map(m => (
                            <div key={m.id} className="flex items-center gap-2 p-2 bg-[#F4F5F7] rounded-lg">
                              <div className="w-6 h-6 rounded-full bg-[rgba(11,30,61,0.1)] flex items-center justify-center text-[10px] font-bold text-[#0B1E3D]">
                                {(m.full_name || '?')[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-medium text-[#0B1E3D] truncate">{m.full_name}</div>
                                <div className="text-[10px] text-[#8fa0b5] truncate">{m.phone}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Vehicles */}
                    <div>
                      <p className="text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider mb-2">Járművek</p>
                      {accVehicles.length === 0 ? (
                        <p className="text-[12px] text-[#8fa0b5]">Nincs jármű</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {accVehicles.map(v => (
                            <div key={v.id} className="flex items-center gap-2 p-2 bg-[#F4F5F7] rounded-lg">
                              <Car size={14} className="text-[#5a6a80] shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-medium text-[#0B1E3D]">{v.make} {v.model} {v.year}</div>
                                <div className="text-[10px] text-[#8fa0b5]">{v.license_plate}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {acc.notes && (
                      <div>
                        <p className="text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wider mb-1">Megjegyzés</p>
                        <p className="text-[12px] text-[#5a6a80]">{acc.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Family Fleet szerkesztése' : 'Új Family Fleet fiók'}
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>Mégse</Button>
            <Button variant="gold" size="sm" onClick={handleSave} disabled={!form.name}>Mentés</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <FormGroup>
            <FormLabel>Fiók neve *</FormLabel>
            <Input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="pl. Schmidt Família" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Fő kapcsolattartó</FormLabel>
            <Input value={form.contact_person || ''} onChange={e => setForm((f: any) => ({ ...f, contact_person: e.target.value }))} />
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup>
              <FormLabel>Telefon</FormLabel>
              <Input type="tel" value={form.phone || ''} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} />
            </FormGroup>
            <FormGroup>
              <FormLabel>E-mail</FormLabel>
              <Input type="email" value={form.email || ''} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
            </FormGroup>
          </div>
          <FormGroup>
            <FormLabel>Cím</FormLabel>
            <Input value={form.address || ''} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Kedvezmény típusa</FormLabel>
            <Select value={form.discount_type || 'none'} onChange={e => setForm((f: any) => ({ ...f, discount_type: e.target.value }))}>
              {DISCOUNT_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
          </FormGroup>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="vip" checked={form.vip || false} onChange={e => setForm((f: any) => ({ ...f, vip: e.target.checked }))} className="w-4 h-4 accent-[#C9A84C]" />
            <label htmlFor="vip" className="text-[13px] font-medium text-[#0B1E3D] flex items-center gap-1"><Star size={12} className="text-[#C9A84C]" /> VIP státusz</label>
          </div>
          <FormGroup>
            <FormLabel>Megjegyzés</FormLabel>
            <textarea value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} rows={3} className="w-full border border-[rgba(11,30,61,0.18)] rounded-lg p-2.5 text-[13px] outline-none focus:border-[#0B1E3D] resize-none" />
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
