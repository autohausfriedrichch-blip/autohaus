'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import {
  Plus, Minus, AlertTriangle, Shield, Clock, DollarSign,
  Trash2, ChevronDown, ChevronUp, Package, Zap, Info,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { ServiceV2, PricingType, RiskLevel } from './ServicesPage'

// ─── Types ────────────────────────────────────────────────────────────────────

export type DifficultyLevel = 'normal' | 'hard' | 'very_hard' | 'extreme'

export interface ServiceLineItem {
  id: string                    // local uuid
  service_id?: string
  service_name: string
  pricing_type: PricingType
  quantity: number
  unit_price?: number
  unit_label?: string
  fixed_price?: number
  hourly_rate?: number
  hours?: number
  difficulty: DifficultyLevel
  is_risky?: boolean
  risk_acknowledged?: boolean
  technician_note?: string
  extra_work?: string
  final_price: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_META: Record<DifficultyLevel, { label: string; multiplier: number; color: string; bg: string }> = {
  normal:    { label: 'Normál (1.0×)',      multiplier: 1.0, color: 'text-gray-600',   bg: 'bg-gray-100' },
  hard:      { label: 'Nehéz (1.25×)',      multiplier: 1.25, color: 'text-amber-700', bg: 'bg-amber-50' },
  very_hard: { label: 'Nagyon nehéz (1.5×)', multiplier: 1.5, color: 'text-orange-700', bg: 'bg-orange-50' },
  extreme:   { label: 'Extrém (2.0×)',      multiplier: 2.0, color: 'text-red-700',    bg: 'bg-red-50' },
}

const RISK_FLAGS = [
  { id: 'seized_plug',     label: 'Berohadt gyertya/porlasztó' },
  { id: 'broken_plug',     label: 'Eltört gyertya' },
  { id: 'damaged_thread',  label: 'Sérült menet' },
  { id: 'corroded_bolt',   label: 'Korrodált csavar' },
  { id: 'aluminium_thread', label: 'Alumínium menet' },
  { id: 'exhaust_bolt',    label: 'Kipufogó csavar' },
  { id: 'extra_time',      label: 'Extra munkaidő szükséges' },
]

const RISK_APPROVAL_TEXT = `Az alkatrész eltávolítása során előfordulhat, hogy a menetek, csavarok vagy az alkatrész sérül, vagy eltörik. Ebben az esetben a javítás időigénye és költsége megnő. Az ügyfél tudomásul veszi és elfogadja ezt a kockázatot.`

function calcLinePrice(item: Partial<ServiceLineItem>): number {
  const mult = DIFFICULTY_META[item.difficulty || 'normal'].multiplier
  if (item.pricing_type === 'fixed') return (item.fixed_price || 0) * mult
  if (item.pricing_type === 'per_unit') return (item.unit_price || 0) * (item.quantity || 1) * mult
  if (item.pricing_type === 'hourly') return (item.hourly_rate || 125) * (item.hours || 1) * mult
  return item.fixed_price || 0
}

// ─── RiskAcknowledgmentModal ──────────────────────────────────────────────────

function RiskAcknowledgmentModal({
  open,
  serviceName,
  riskText,
  onAccept,
  onDecline,
}: {
  open: boolean
  serviceName: string
  riskText: string
  onAccept: () => void
  onDecline: () => void
}) {
  return (
    <Modal open={open} onClose={onDecline} title="Kockázatos munka – ügyfél jóváhagyás">
      <div className="space-y-4">
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertTriangle size={20} className="text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-800 text-[13px]">{serviceName}</p>
            <p className="text-[12px] text-red-700 mt-1">{riskText}</p>
          </div>
        </div>
        <div className="bg-[#F4F5F7] rounded-xl p-4 border border-[rgba(0,0,0,0.10)]">
          <p className="text-[12px] text-[#0D0D0D] leading-relaxed font-medium">{RISK_APPROVAL_TEXT}</p>
        </div>
        <p className="text-[12px] text-[#4a4a4a]">
          A továbblépéshez az ügyfél szóbeli vagy írásos jóváhagyása szükséges.
        </p>
      </div>
      <div className="flex gap-3 mt-5">
        <Button variant="secondary" onClick={onDecline} className="flex-1">Nem fogadja el</Button>
        <Button variant="danger" onClick={onAccept} className="flex-1">
          <Shield size={14} /> Ügyfél jóváhagyja
        </Button>
      </div>
    </Modal>
  )
}

// ─── ServicePickerModal ───────────────────────────────────────────────────────

function ServicePickerModal({
  open,
  onClose,
  services,
  onPick,
}: {
  open: boolean
  onClose: () => void
  services: ServiceV2[]
  onPick: (s: ServiceV2) => void
}) {
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('all')

  const cats = ['all', ...Array.from(new Set(services.map(s => s.category)))]
  const filtered = services.filter(s => {
    if (!s.is_active) return false
    if (catFilter !== 'all' && s.category !== catFilter) return false
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const grouped = cats.filter(c => c !== 'all' && filtered.some(s => s.category === c))

  return (
    <Modal open={open} onClose={onClose} title="Szolgáltatás kiválasztása">
      <div className="space-y-3">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Keresés..."
          autoFocus
        />
        <div className="flex gap-1.5 flex-wrap">
          {cats.map(c => (
            <button
              key={c}
              onClick={() => setCatFilter(c)}
              className={`text-[11px] px-2.5 py-1 rounded-full border font-medium transition-colors ${
                catFilter === c ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]' : 'bg-white text-[#4a4a4a] border-[rgba(0,0,0,0.18)]'
              }`}
            >
              {c === 'all' ? 'Mind' : c}
            </button>
          ))}
        </div>

        <div className="max-h-[50vh] overflow-y-auto space-y-3 -mx-1 px-1">
          {(catFilter === 'all' ? grouped : [catFilter]).map(cat => {
            const items = filtered.filter(s => s.category === cat)
            if (!items.length) return null
            return (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-[#888888] uppercase tracking-wide mb-1.5">{cat}</p>
                <div className="space-y-1">
                  {items.map(s => (
                    <button
                      key={s.id}
                      onClick={() => { onPick(s); onClose() }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#F4F5F7] transition-colors text-left border border-transparent hover:border-[rgba(0,0,0,0.08)]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-medium text-[#0D0D0D]">{s.name}</span>
                          {s.is_risky && <AlertTriangle size={12} className="text-orange-500" />}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {s.pricing_type === 'fixed' && s.base_price && <span className="text-[12px] text-[#4a4a4a]">{formatCurrency(s.base_price)}</span>}
                          {s.pricing_type === 'per_unit' && s.unit_price && <span className="text-[12px] text-[#4a4a4a]">{formatCurrency(s.unit_price)} / {s.unit_label || 'db'}</span>}
                          {s.pricing_type === 'hourly' && <span className="text-[12px] text-[#4a4a4a]">{formatCurrency(s.hourly_rate || 125)} / óra</span>}
                          {s.pricing_type === 'custom' && <span className="text-[12px] text-[#4a4a4a]">Egyedi</span>}
                          {s.duration_minutes && <span className="text-[11px] text-[#888888]">{s.duration_minutes} p</span>}
                        </div>
                      </div>
                      {s.pricing_type === 'per_unit' && (
                        <Package size={14} className="text-purple-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}

// ─── ServiceLineItemRow ───────────────────────────────────────────────────────

function ServiceLineItemRow({
  item,
  onChange,
  onRemove,
}: {
  item: ServiceLineItem
  onChange: (updated: ServiceLineItem) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [riskModal, setRiskModal] = useState(false)

  const diff = DIFFICULTY_META[item.difficulty]

  const update = (patch: Partial<ServiceLineItem>) => {
    const updated = { ...item, ...patch }
    updated.final_price = calcLinePrice(updated)
    onChange(updated)
  }

  const needsRiskAck = item.is_risky && !item.risk_acknowledged

  return (
    <>
      <div className={`bg-white border rounded-xl p-3 transition-all ${
        needsRiskAck ? 'border-l-4 border-orange-400' : 'border-[rgba(0,0,0,0.08)]'
      }`}>
        {/* Header row */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-[13px] text-[#0D0D0D]">{item.service_name}</span>
              {item.is_risky && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-200">
                  <AlertTriangle size={10} /> Kockázatos
                </span>
              )}
              {item.risk_acknowledged && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full border border-green-200">
                  <Shield size={10} /> Jóváhagyva
                </span>
              )}
            </div>

            {/* Quick controls */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {/* Quantity (per_unit) */}
              {item.pricing_type === 'per_unit' && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => update({ quantity: Math.max(1, item.quantity - 1) })}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.15)] text-[#4a4a4a] hover:bg-[#F4F5F7]"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-[13px] font-semibold text-[#0D0D0D] min-w-[24px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => update({ quantity: item.quantity + 1 })}
                    className="w-7 h-7 flex items-center justify-center rounded-lg border border-[rgba(0,0,0,0.15)] text-[#4a4a4a] hover:bg-[#F4F5F7]"
                  >
                    <Plus size={12} />
                  </button>
                  <span className="text-[11px] text-[#888888]">{item.unit_label || 'db'}</span>
                </div>
              )}

              {/* Hours (hourly) */}
              {item.pricing_type === 'hourly' && (
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-[#4a4a4a]" />
                  <Input
                    type="number"
                    step="0.25"
                    min={0.25}
                    value={item.hours || 1}
                    onChange={e => update({ hours: parseFloat(e.target.value) || 1 })}
                    className="w-20 text-[12px] py-1"
                  />
                  <span className="text-[11px] text-[#888888]">óra</span>
                </div>
              )}

              {/* Difficulty */}
              <div className="flex items-center gap-1.5">
                <select
                  value={item.difficulty}
                  onChange={e => update({ difficulty: e.target.value as DifficultyLevel })}
                  className={`text-[11px] px-2 py-1 rounded-lg border font-semibold outline-none ${diff.bg} ${diff.color} border-current/20`}
                >
                  {Object.entries(DIFFICULTY_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => setExpanded(e => !e)}
                className="text-[#888888] hover:text-[#0D0D0D] transition-colors ml-auto flex items-center gap-1 text-[11px]"
              >
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          <div className="shrink-0 text-right">
            <div className="text-[15px] font-bold text-[#0D0D0D]">{formatCurrency(item.final_price)}</div>
            {item.difficulty !== 'normal' && (
              <div className="text-[10px] text-[#888888]">
                ×{diff.multiplier}
              </div>
            )}
            <button
              onClick={onRemove}
              className="mt-1 p-1 text-[#888888] hover:text-[#C8102E] transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Risk acknowledgment banner */}
        {needsRiskAck && (
          <div className="mt-2 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            <AlertTriangle size={14} className="text-orange-600 shrink-0" />
            <span className="text-[12px] text-orange-700 flex-1">Ügyfél jóváhagyás szükséges</span>
            <Button variant="secondary" size="sm" onClick={() => setRiskModal(true)}>
              <Shield size={12} /> Jóváhagyás
            </Button>
          </div>
        )}

        {/* Expanded extras */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[rgba(0,0,0,0.08)] space-y-2">
            <FormGroup className="mb-0">
              <FormLabel>Technikus megjegyzés</FormLabel>
              <Textarea
                value={item.technician_note || ''}
                onChange={e => update({ technician_note: e.target.value })}
                placeholder="pl. Bal első berohadt, extra idő kellett..."
                className="min-h-[56px] text-[12px]"
              />
            </FormGroup>
            <FormGroup className="mb-0">
              <FormLabel>Extra munka leírása</FormLabel>
              <Textarea
                value={item.extra_work || ''}
                onChange={e => update({ extra_work: e.target.value })}
                placeholder="pl. Eltört csavar eltávolítás, menet javítás..."
                className="min-h-[56px] text-[12px]"
              />
            </FormGroup>
          </div>
        )}
      </div>

      <RiskAcknowledgmentModal
        open={riskModal}
        serviceName={item.service_name}
        riskText={RISK_APPROVAL_TEXT}
        onAccept={() => { update({ risk_acknowledged: true }); setRiskModal(false) }}
        onDecline={() => setRiskModal(false)}
      />
    </>
  )
}

// ─── Main ServiceCalculator ───────────────────────────────────────────────────

interface ServiceCalculatorProps {
  items: ServiceLineItem[]
  onChange: (items: ServiceLineItem[]) => void
  hourlyRateDefault?: number
  showSummary?: boolean
  isTechnician?: boolean  // Karl's view
}

export function ServiceCalculator({
  items, onChange, hourlyRateDefault = 125, showSummary = true, isTechnician = false,
}: ServiceCalculatorProps) {
  const [services, setServices] = useState<ServiceV2[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    supabase.from('services').select('*').eq('is_active', true).order('category').order('sort_order').order('name')
      .then(({ data }) => setServices((data || []) as ServiceV2[]))
  }, [])

  const addFromService = (s: ServiceV2) => {
    const id = crypto.randomUUID()
    const base: ServiceLineItem = {
      id,
      service_id: s.id,
      service_name: s.name,
      pricing_type: s.pricing_type,
      quantity: s.default_quantity || 1,
      unit_price: s.unit_price || undefined,
      unit_label: s.unit_label || 'db',
      fixed_price: s.base_price || undefined,
      hourly_rate: s.hourly_rate || hourlyRateDefault,
      hours: s.duration_minutes ? s.duration_minutes / 60 : 1,
      difficulty: 'normal',
      is_risky: !!s.is_risky,
      risk_acknowledged: !s.requires_customer_approval,
      final_price: 0,
    }
    base.final_price = calcLinePrice(base)
    onChange([...items, base])
  }

  const addManual = () => {
    const id = crypto.randomUUID()
    const item: ServiceLineItem = {
      id,
      service_name: 'Egyedi tétel',
      pricing_type: 'fixed',
      quantity: 1,
      fixed_price: 0,
      difficulty: 'normal',
      final_price: 0,
    }
    onChange([...items, item])
  }

  const updateItem = (id: string, updated: ServiceLineItem) => {
    onChange(items.map(it => it.id === id ? updated : it))
  }

  const removeItem = (id: string) => {
    onChange(items.filter(it => it.id !== id))
  }

  // Summary calculations
  const subtotal = items.reduce((s, it) => s + it.final_price, 0)
  const vat = subtotal * 0.077
  const total = subtotal + vat
  const totalMinutes = items.reduce((s, it) => {
    if (it.pricing_type === 'hourly') return s + (it.hours || 1) * 60
    if (it.pricing_type === 'per_unit' && it.unit_price) return s + 20 * it.quantity
    return s
  }, 0)
  const riskyPending = items.filter(it => it.is_risky && !it.risk_acknowledged).length

  return (
    <div className="space-y-3">

      {/* Risk warning banner */}
      {riskyPending > 0 && (
        <div className="flex items-center gap-2 bg-orange-50 border border-orange-300 rounded-xl px-4 py-3">
          <AlertTriangle size={16} className="text-orange-600 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-orange-800">{riskyPending} kockázatos tétel jóváhagyásra vár</p>
            <p className="text-[12px] text-orange-700">Kötelező az ügyfél jóváhagyása a munkakezdés előtt.</p>
          </div>
        </div>
      )}

      {/* Line items */}
      <div className="space-y-2">
        {items.map(item => (
          <ServiceLineItemRow
            key={item.id}
            item={item}
            onChange={updated => updateItem(item.id, updated)}
            onRemove={() => removeItem(item.id)}
          />
        ))}
      </div>

      {/* Add buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" onClick={() => setPickerOpen(true)}>
          <Plus size={13} /> Szolgáltatás hozzáadása
        </Button>
        <Button variant="ghost" onClick={addManual}>
          <Plus size={13} /> Egyedi tétel
        </Button>
      </div>

      {/* Summary */}
      {showSummary && items.length > 0 && (
        <div className="bg-[#F4F5F7] rounded-xl p-4 border border-[rgba(0,0,0,0.08)] space-y-2">
          <div className="flex justify-between text-[12px] text-[#4a4a4a]">
            <span>Nettó összeg</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-[12px] text-[#4a4a4a]">
            <span>MWST 7.7%</span>
            <span>{formatCurrency(vat)}</span>
          </div>
          {totalMinutes > 0 && (
            <div className="flex justify-between text-[12px] text-[#4a4a4a]">
              <span className="flex items-center gap-1"><Clock size={11} /> Becsült munkaidő</span>
              <span>{Math.round(totalMinutes)} perc</span>
            </div>
          )}
          <div className="flex justify-between text-[15px] font-bold text-[#0D0D0D] pt-2 border-t border-[rgba(0,0,0,0.10)]">
            <span>ÖSSZESEN</span>
            <span>{formatCurrency(total)}</span>
          </div>
          {items.some(it => it.difficulty !== 'normal') && (
            <div className="text-[11px] text-amber-700 bg-amber-50 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <Info size={11} />
              Nehézségi szorzó alkalmazva a végösszegre
            </div>
          )}
        </div>
      )}

      {/* Service picker */}
      <ServicePickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        services={services}
        onPick={addFromService}
      />
    </div>
  )
}

// ─── Technician flag modal (Karl) ─────────────────────────────────────────────

export function TechnicianFlagModal({
  open,
  workOrderId,
  onClose,
  onSubmit,
}: {
  open: boolean
  workOrderId: string
  onClose: () => void
  onSubmit: (flag: { flag_type: string; description: string; extra_hours: number }) => void
}) {
  const [flagType, setFlagType] = useState('extra_time')
  const [description, setDescription] = useState('')
  const [extraHours, setExtraHours] = useState(0)

  const handleSubmit = () => {
    onSubmit({ flag_type: flagType, description, extra_hours: extraHours })
    setDescription('')
    setExtraHours(0)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title="Munka jelölése – Nehézség / Kockázat">
      <div className="space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
          <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-800">
            Barbara értesítést kap, és az árajánlat / számla automatikusan frissül.
          </p>
        </div>
        <FormGroup>
          <FormLabel>Probléma típusa</FormLabel>
          <Select value={flagType} onChange={e => setFlagType(e.target.value)}>
            {RISK_FLAGS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
            <option value="other">Egyéb</option>
          </Select>
        </FormGroup>
        <FormGroup>
          <FormLabel>Leírás</FormLabel>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Mit tapasztaltál? pl. Bal 2. gyertya eltört, extrakció szükséges..."
            className="min-h-[80px]"
          />
        </FormGroup>
        <FormGroup className="mb-0">
          <FormLabel>Extra munkaidő (óra)</FormLabel>
          <Input
            type="number"
            step="0.25"
            min={0}
            value={extraHours}
            onChange={e => setExtraHours(parseFloat(e.target.value) || 0)}
          />
        </FormGroup>
      </div>
      <div className="flex gap-3 mt-5">
        <Button variant="secondary" onClick={onClose} className="flex-1">Mégse</Button>
        <Button variant="gold" onClick={handleSubmit} className="flex-1">
          <AlertTriangle size={14} /> Jelölés elküldése
        </Button>
      </div>
    </Modal>
  )
}
