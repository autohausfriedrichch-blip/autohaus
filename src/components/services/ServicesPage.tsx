'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import {
  Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  AlertTriangle, Zap, Package, Clock, DollarSign,
  ChevronDown, ChevronUp, Info, Shield, Wrench
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type PricingType = 'fixed' | 'per_unit' | 'hourly' | 'custom'
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme'

export interface ServiceV2 {
  id: string
  name: string
  category: string
  pricing_type: PricingType
  base_price?: number | null
  unit_price?: number | null
  unit_label?: string | null
  unit_time_minutes?: number | null
  hourly_rate?: number | null
  duration_minutes?: number | null
  is_mobile?: boolean
  is_active?: boolean
  is_visible_to_customer?: boolean
  is_risky?: boolean
  risk_level?: RiskLevel
  risk_description?: string | null
  requires_customer_approval?: boolean
  default_quantity?: number
  sort_order?: number
  description?: string | null
  technician_task?: string
  technician_checklist?: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Motor', 'Fékrendszer', 'Futómű', 'Diagnosztika',
  'Gumiszerviz', 'Különleges munkák', 'Világítás', 'Klíma',
  'autószerviz', 'mobil gumiszerviz', 'mobil autótakarítás',
  'detailing', 'pickup & delivery', 'flotta',
]

const PRICING_TYPE_META: Record<PricingType, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  fixed:    { label: 'Fix ár',       color: 'text-blue-700',   bg: 'bg-blue-50',   icon: <DollarSign size={12} /> },
  per_unit: { label: 'Darab ár',     color: 'text-purple-700', bg: 'bg-purple-50', icon: <Package size={12} /> },
  hourly:   { label: 'Óradíjas',     color: 'text-amber-700',  bg: 'bg-amber-50',  icon: <Clock size={12} /> },
  custom:   { label: 'Egyedi ajánlat', color: 'text-gray-600', bg: 'bg-gray-100',  icon: <Zap size={12} /> },
}

const RISK_LEVEL_META: Record<RiskLevel, { label: string; color: string; bg: string; border: string }> = {
  low:     { label: 'Alacsony',  color: 'text-green-700',  bg: 'bg-green-50',  border: 'border-green-200' },
  medium:  { label: 'Közepes',   color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  high:    { label: 'Magas',     color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  extreme: { label: 'Extrém',    color: 'text-red-700',    bg: 'bg-red-50',    border: 'border-red-300' },
}

// ─── Pricing badge ────────────────────────────────────────────────────────────

function PricingBadge({ type }: { type: PricingType }) {
  const m = PRICING_TYPE_META[type]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.bg} ${m.color}`}>
      {m.icon} {m.label}
    </span>
  )
}

function RiskBadge({ level }: { level: RiskLevel }) {
  const m = RISK_LEVEL_META[level]
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${m.bg} ${m.color} ${m.border}`}>
      <AlertTriangle size={10} /> {m.label}
    </span>
  )
}

function PriceDisplay({ s }: { s: ServiceV2 }) {
  if (s.pricing_type === 'fixed' && s.base_price) return <span className="font-semibold">{formatCurrency(s.base_price)}</span>
  if (s.pricing_type === 'per_unit' && s.unit_price) return (
    <span className="font-semibold">{formatCurrency(s.unit_price)} / {s.unit_label || 'db'}</span>
  )
  if (s.pricing_type === 'hourly' && s.hourly_rate) return (
    <span className="font-semibold">{formatCurrency(s.hourly_rate)} / óra</span>
  )
  if (s.pricing_type === 'custom') return <span className="text-[#5a6a80] text-[12px]">Egyedi</span>
  return <span className="text-[#8fa0b5]">–</span>
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ServicesPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [services, setServices] = useState<ServiceV2[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editService, setEditService] = useState<ServiceV2 | null>(null)
  const [form, setForm] = useState<Partial<ServiceV2>>({})
  const [saving, setSaving] = useState(false)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(CATEGORIES.slice(0, 4)))
  const [filterRisky, setFilterRisky] = useState(false)
  const [filterType, setFilterType] = useState<PricingType | 'all'>('all')
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('services').select('*').order('category').order('sort_order').order('name')
    setServices((data || []) as ServiceV2[])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditService(null)
    setForm({
      is_active: true, is_mobile: false, is_visible_to_customer: true,
      category: 'Motor', pricing_type: 'fixed', is_risky: false, risk_level: 'low',
      requires_customer_approval: false, default_quantity: 1,
    })
    setModalOpen(true)
  }

  const openEdit = (s: ServiceV2) => { setEditService(s); setForm({ ...s }); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.name?.trim() || !form.category) { toast('Név és kategória kötelező', 'error'); return }
    setSaving(true)
    const payload = { ...form }
    // Clean up irrelevant price fields based on pricing_type
    if (payload.pricing_type !== 'fixed')    { payload.base_price = null }
    if (payload.pricing_type !== 'per_unit') { payload.unit_price = null; payload.unit_time_minutes = null }
    if (payload.pricing_type !== 'hourly')   { payload.hourly_rate = null }

    if (editService) {
      const { error } = await supabase.from('services').update(payload).eq('id', editService.id)
      error ? toast('Hiba mentéskor', 'error') : (toast('Szolgáltatás frissítve'), setModalOpen(false), load())
    } else {
      const { error } = await supabase.from('services').insert(payload)
      error ? toast('Hiba mentéskor', 'error') : (toast('Szolgáltatás létrehozva'), setModalOpen(false), load())
    }
    setSaving(false)
  }

  const toggleActive = async (s: ServiceV2) => {
    await supabase.from('services').update({ is_active: !s.is_active }).eq('id', s.id)
    load()
  }

  const deleteService = async (s: ServiceV2) => {
    if (!confirm(`"${s.name}" törlése?`)) return
    await supabase.from('services').delete().eq('id', s.id)
    load()
  }

  // Apply filters
  let filtered = services
  if (filterRisky) filtered = filtered.filter(s => s.is_risky)
  if (filterType !== 'all') filtered = filtered.filter(s => s.pricing_type === filterType)

  const groupedCats = CATEGORIES.filter(cat => filtered.some(s => s.category === cat))

  const toggleCat = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev)
      next.has(cat) ? next.delete(cat) : next.add(cat)
      return next
    })
  }

  const riskyCount = services.filter(s => s.is_risky).length
  const perUnitCount = services.filter(s => s.pricing_type === 'per_unit').length

  return (
    <div className="animate-fade-in">

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Összes szolgáltatás', value: services.length, color: 'text-[#0B1E3D]' },
          { label: 'Kockázatos munkák', value: riskyCount, color: 'text-orange-600', icon: <AlertTriangle size={14} className="text-orange-500" /> },
          { label: 'Darab áras', value: perUnitCount, color: 'text-purple-600', icon: <Package size={14} className="text-purple-500" /> },
          { label: 'Aktív', value: services.filter(s => s.is_active).length, color: 'text-emerald-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border border-[rgba(11,30,61,0.08)] rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">{stat.icon}<p className="text-[11px] text-[#5a6a80]">{stat.label}</p></div>
            <p className={`text-[22px] font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <Button variant="primary" onClick={openNew}><Plus size={14} /> Új szolgáltatás</Button>
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <button
            onClick={() => setFilterRisky(f => !f)}
            className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border font-medium transition-colors ${filterRisky ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-white border-[rgba(11,30,61,0.18)] text-[#5a6a80]'}`}
          >
            <AlertTriangle size={13} /> Csak kockázatosak
          </button>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
            className="text-[12px] px-3 py-1.5 rounded-lg border border-[rgba(11,30,61,0.18)] bg-white text-[#0B1E3D] outline-none"
          >
            <option value="all">Mind (típus)</option>
            <option value="fixed">Fix ár</option>
            <option value="per_unit">Darab ár</option>
            <option value="hourly">Óradíjas</option>
            <option value="custom">Egyedi</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div>
      ) : groupedCats.length === 0 ? (
        <div className="text-center py-12 text-[#8fa0b5] text-sm">Nincs találat</div>
      ) : (
        groupedCats.map(cat => {
          const items = filtered.filter(s => s.category === cat)
          const isExpanded = expandedCats.has(cat)
          const riskyInCat = items.filter(s => s.is_risky).length
          return (
            <div key={cat} className="mb-4">
              <button
                onClick={() => toggleCat(cat)}
                className="w-full flex items-center gap-2 text-left mb-2 group"
              >
                <span className="flex-1 h-px bg-[rgba(11,30,61,0.08)]" />
                <span className="text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[1px] px-2 group-hover:text-[#0B1E3D] transition-colors">
                  {cat}
                </span>
                <span className="text-[10px] text-[#8fa0b5] font-medium">{items.length} db</span>
                {riskyInCat > 0 && (
                  <span className="text-[10px] font-bold text-orange-600 flex items-center gap-0.5">
                    <AlertTriangle size={10} />{riskyInCat}
                  </span>
                )}
                {isExpanded ? <ChevronUp size={14} className="text-[#8fa0b5]" /> : <ChevronDown size={14} className="text-[#8fa0b5]" />}
                <span className="flex-1 h-px bg-[rgba(11,30,61,0.08)]" />
              </button>

              {isExpanded && (
                <div className="space-y-2">
                  {items.map(s => (
                    <div
                      key={s.id}
                      className={`bg-white border rounded-xl p-3.5 transition-all ${
                        s.is_risky ? `border-l-4 ${RISK_LEVEL_META[s.risk_level || 'low'].border}` : 'border-[rgba(11,30,61,0.08)]'
                      } ${!s.is_active ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-[13px] text-[#0B1E3D]">{s.name}</span>
                            {s.technician_checklist && s.technician_checklist.length > 0 && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-semibold">{s.technician_checklist.length} lépés</span>}
                            <PricingBadge type={s.pricing_type} />
                            {s.is_risky && s.risk_level && <RiskBadge level={s.risk_level} />}
                            {s.requires_customer_approval && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                                <Shield size={10} /> Ügyfél jóváhagyás
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 flex-wrap">
                            <PriceDisplay s={s} />
                            {s.duration_minutes && (
                              <span className="text-[12px] text-[#5a6a80] flex items-center gap-1">
                                <Clock size={11} /> {s.duration_minutes} perc
                              </span>
                            )}
                            {s.pricing_type === 'per_unit' && s.unit_time_minutes && (
                              <span className="text-[12px] text-[#5a6a80] flex items-center gap-1">
                                <Clock size={11} /> {s.unit_time_minutes} p / {s.unit_label || 'db'}
                              </span>
                            )}
                            {s.is_mobile && (
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Mobil</span>
                            )}
                          </div>

                          {s.is_risky && s.risk_description && (
                            <div className="mt-2 flex items-start gap-1.5 text-[11px] text-orange-700 bg-orange-50 rounded-lg px-2.5 py-1.5 border border-orange-200">
                              <AlertTriangle size={11} className="shrink-0 mt-0.5" />
                              <span>{s.risk_description}</span>
                            </div>
                          )}
                          {s.description && !s.risk_description && (
                            <p className="text-[11px] text-[#8fa0b5] mt-1">{s.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => toggleActive(s)}
                            className={s.is_active ? 'text-emerald-500' : 'text-[#8fa0b5]'}
                            title={s.is_active ? 'Aktív (kattints a kikapcsoláshoz)' : 'Inaktív'}
                          >
                            {s.is_active ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                          </button>
                          <button onClick={() => openEdit(s)} className="p-1.5 text-[#5a6a80] hover:text-[#0B1E3D] transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => deleteService(s)} className="p-1.5 text-[#5a6a80] hover:text-[#C9384C] transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* ── Service Edit/Create Modal ─────────────────────────────────────── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editService ? 'Szolgáltatás szerkesztése' : 'Új szolgáltatás'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Mentés...' : 'Mentés'}
            </Button>
          </>
        }
      >
        <div className="space-y-0">

          {/* Name + Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormGroup className="sm:col-span-2">
              <FormLabel>Szolgáltatás neve *</FormLabel>
              <Input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="pl. Gyújtógyertya csere" />
            </FormGroup>
            <FormGroup>
              <FormLabel>Kategória *</FormLabel>
              <Select value={form.category || ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormGroup>
            <FormGroup>
              <FormLabel>Árazás típusa *</FormLabel>
              <Select value={form.pricing_type || 'fixed'} onChange={e => setForm(f => ({ ...f, pricing_type: e.target.value as PricingType }))}>
                <option value="fixed">Fix ár (egységár)</option>
                <option value="per_unit">Darab ár (db alapú)</option>
                <option value="hourly">Óradíjas</option>
                <option value="custom">Egyedi ajánlat</option>
              </Select>
            </FormGroup>
          </div>

          {/* Pricing fields – conditional on type */}
          <div className="bg-[#F4F5F7] rounded-xl p-3 mb-3 space-y-2">
            <p className="text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[0.5px] mb-2 flex items-center gap-1.5">
              <DollarSign size={12} /> Árazás
            </p>

            {form.pricing_type === 'fixed' && (
              <div className="grid grid-cols-2 gap-3">
                <FormGroup className="mb-0">
                  <FormLabel>Fix ár (CHF)</FormLabel>
                  <Input type="number" step="0.01" value={form.base_price || ''} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || null }))} placeholder="0.00" />
                </FormGroup>
                <FormGroup className="mb-0">
                  <FormLabel>Becsült idő (perc)</FormLabel>
                  <Input type="number" value={form.duration_minutes || ''} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || null }))} placeholder="60" />
                </FormGroup>
              </div>
            )}

            {form.pricing_type === 'per_unit' && (
              <div className="grid grid-cols-2 gap-3">
                <FormGroup className="mb-0">
                  <FormLabel>Ár / egység (CHF)</FormLabel>
                  <Input type="number" step="0.01" value={form.unit_price || ''} onChange={e => setForm(f => ({ ...f, unit_price: parseFloat(e.target.value) || null }))} placeholder="25.00" />
                </FormGroup>
                <FormGroup className="mb-0">
                  <FormLabel>Egység neve</FormLabel>
                  <Input value={form.unit_label || ''} onChange={e => setForm(f => ({ ...f, unit_label: e.target.value }))} placeholder="db" />
                </FormGroup>
                <FormGroup className="mb-0">
                  <FormLabel>Idő / egység (perc)</FormLabel>
                  <Input type="number" value={form.unit_time_minutes || ''} onChange={e => setForm(f => ({ ...f, unit_time_minutes: parseInt(e.target.value) || null }))} placeholder="15" />
                </FormGroup>
                <FormGroup className="mb-0">
                  <FormLabel>Alapértelmezett mennyiség</FormLabel>
                  <Input type="number" min={1} value={form.default_quantity || 1} onChange={e => setForm(f => ({ ...f, default_quantity: parseInt(e.target.value) || 1 }))} />
                </FormGroup>
              </div>
            )}

            {form.pricing_type === 'hourly' && (
              <div className="grid grid-cols-2 gap-3">
                <FormGroup className="mb-0">
                  <FormLabel>Óradíj (CHF)</FormLabel>
                  <Input type="number" step="0.01" value={form.hourly_rate || ''} onChange={e => setForm(f => ({ ...f, hourly_rate: parseFloat(e.target.value) || null }))} placeholder="125.00" />
                </FormGroup>
                <FormGroup className="mb-0">
                  <FormLabel>Becsült idő (perc)</FormLabel>
                  <Input type="number" value={form.duration_minutes || ''} onChange={e => setForm(f => ({ ...f, duration_minutes: parseInt(e.target.value) || null }))} placeholder="60" />
                </FormGroup>
              </div>
            )}

            {form.pricing_type === 'custom' && (
              <p className="text-[12px] text-[#5a6a80]">Egyedi ajánlat – az ár az ajánlatban kerül meghatározásra.</p>
            )}
          </div>

          {/* Risk section */}
          <div className="bg-[#F4F5F7] rounded-xl p-3 mb-3 space-y-2">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[0.5px] flex items-center gap-1.5">
                <AlertTriangle size={12} /> Kockázat
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <span className="text-[12px] text-[#5a6a80]">Kockázatos munka</span>
                <input
                  type="checkbox"
                  checked={!!form.is_risky}
                  onChange={e => setForm(f => ({ ...f, is_risky: e.target.checked }))}
                  className="w-4 h-4 accent-[#C9A84C]"
                />
              </label>
            </div>

            {form.is_risky && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <FormGroup className="mb-0">
                    <FormLabel>Kockázat szintje</FormLabel>
                    <Select value={form.risk_level || 'low'} onChange={e => setForm(f => ({ ...f, risk_level: e.target.value as RiskLevel }))}>
                      <option value="low">Alacsony</option>
                      <option value="medium">Közepes</option>
                      <option value="high">Magas</option>
                      <option value="extreme">Extrém</option>
                    </Select>
                  </FormGroup>
                  <FormGroup className="mb-0">
                    <FormLabel>Ügyfél jóváhagyás</FormLabel>
                    <Select
                      value={form.requires_customer_approval ? 'yes' : 'no'}
                      onChange={e => setForm(f => ({ ...f, requires_customer_approval: e.target.value === 'yes' }))}
                    >
                      <option value="no">Nem kötelező</option>
                      <option value="yes">Kötelező</option>
                    </Select>
                  </FormGroup>
                </div>
                <FormGroup className="mb-0">
                  <FormLabel>Kockázat leírása (ügyfélnek)</FormLabel>
                  <Textarea
                    value={form.risk_description || ''}
                    onChange={e => setForm(f => ({ ...f, risk_description: e.target.value }))}
                    placeholder="pl. A gyújtógyertya kiszerelésekor berohadt csavar eltörhet..."
                    className="min-h-[64px]"
                  />
                </FormGroup>
              </div>
            )}
          </div>

          {/* Technician task template section */}
          <div className="bg-[#F4F5F7] rounded-xl p-3 mb-3 space-y-2">
            <p className="text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[0.5px] mb-2 flex items-center gap-1.5">
              <Wrench size={12} /> Technikusi feladat sablon
            </p>
            <FormGroup className="mb-0">
              <FormLabel>Feladat neve (Karl látja)</FormLabel>
              <Input
                value={form.technician_task || ''}
                onChange={e => setForm(f => ({ ...f, technician_task: e.target.value }))}
                placeholder={`pl. ${form.name ? form.name + ' elvégzése' : 'Motorolaj és olajszűrő cseréje'}`}
              />
            </FormGroup>
            <FormGroup className="mb-0">
              <FormLabel>Technikusi checklist (soronként 1 tétel)</FormLabel>
              <Textarea
                value={(form.technician_checklist || []).join('\n')}
                onChange={e => setForm(f => ({ ...f, technician_checklist: e.target.value.split('\n').filter(l => l.trim()) }))}
                placeholder={"Olaj leengedve\nOlajszűrő cserélve\nÚj olaj betöltve\nOlajszint ellenőrizve"}
                className="min-h-[80px] font-mono text-[12px]"
              />
            </FormGroup>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            <FormGroup className="mb-0">
              <FormLabel>Mobil szolgáltatás</FormLabel>
              <Select value={form.is_mobile ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, is_mobile: e.target.value === 'yes' }))}>
                <option value="no">Nem</option>
                <option value="yes">Igen</option>
              </Select>
            </FormGroup>
            <FormGroup className="mb-0">
              <FormLabel>Aktív</FormLabel>
              <Select value={form.is_active ? 'yes' : 'no'} onChange={e => setForm(f => ({ ...f, is_active: e.target.value === 'yes' }))}>
                <option value="yes">Aktív</option>
                <option value="no">Inaktív</option>
              </Select>
            </FormGroup>
          </div>

          <FormGroup className="mb-0 mt-3">
            <FormLabel>Leírás (belső)</FormLabel>
            <Textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="min-h-[56px]" />
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
