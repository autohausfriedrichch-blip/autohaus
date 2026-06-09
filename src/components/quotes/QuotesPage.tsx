'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { DocumentActions } from '@/components/documents/DocumentActions'
import { ServiceCalculator, type ServiceLineItem } from '@/components/services/ServiceCalculator'
import { Plus, Search, Send, Check, X, Trash2, Tag, Clock, Layers, AlertTriangle, TrendingUp } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

type PricingMode = 'fixed' | 'time' | 'combined' | 'estimate'

const RISK_META: Record<string, { label: string; color: string; bg: string; desc: string }> = {
  low:     { label: 'Alacsony',  color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', desc: 'Rutin munka, várható időtartam könnyen megbecsülhető.' },
  medium:  { label: 'Közepes',   color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200',     desc: 'Némi kockázat a munkaidő megbecslésében, pl. szorosabb hozzáférés.' },
  high:    { label: 'Magas',     color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200',   desc: 'Korrózió, beragadás vagy nehéz hozzáférés valószínű.' },
  extreme: { label: 'Extrém',    color: 'text-red-700',     bg: 'bg-red-50 border-red-200',         desc: 'Törés, szakadás kockázata. Idő nagymértékben bizonytalan.' },
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800', rejected: 'bg-red-100 text-red-800', expired: 'bg-orange-100 text-orange-800',
}
const statusLabels: Record<string, string> = {
  draft: 'Vázlat', sent: 'Elküldve', approved: 'Jóváhagyva', rejected: 'Elutasítva', expired: 'Lejárt'
}

function generateEstimateText(
  serviceDesc: string, minPrice: number, maxPrice: number,
  risk: string, quantity: number, approvalLimit?: number
): string {
  const riskTexts: Record<string, string> = {
    low:     'a munkaidő pontosan megbecsülhető',
    medium:  'a munkaidő a hozzáférhetőségtől és az alkatrész állapotától függ',
    high:    'az alkatrész állapota, korrózió és hozzáférhetőség jelentősen befolyásolhatja a szükséges időt',
    extreme: 'korrózió, beragadás vagy törés veszélye miatt a munkaidő nehezen előre látható',
  }
  const qtyText = quantity > 1 ? ` (${quantity} db)` : ''
  let text = `Ez a munka – ${serviceDesc}${qtyText} – óradíjas elszámolású, mert ${riskTexts[risk] || 'a pontos időtartam előre nem meghatározható'}.`
  text += ` A várható költség jelenlegi becslés alapján kb. ${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)} között lehet.`
  text += ' A pontos végösszeg a tényleges munkaidő alapján kerül kiszámításra.'
  if (approvalLimit) {
    text += ` Az Ön által jóváhagyott keret: ${formatCurrency(approvalLimit)}. Ha a munka várhatóan meghaladja ezt, előzetesen tájékoztatjuk.`
  }
  return text
}

export function QuotesPage({ refreshKey, autoOpenNew, onAutoOpenConsumed }: {
  refreshKey: number; onRefresh: () => void
  autoOpenNew?: boolean; onAutoOpenConsumed?: () => void
}) {
  const [quotes, setQuotes] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [pricingMode, setPricingMode] = useState<PricingMode>('fixed')
  const [form, setForm] = useState<any>({
    status: 'draft', tax_rate: 7.7, items: [],
    hourly_rate: 125, time_minutes: 0, time_label: '',
    estimate_min_hours: '', estimate_max_hours: '', estimate_quantity: 1,
    estimate_hourly_rate: 125, estimate_risk_level: 'medium',
    estimate_customer_text: '', approval_limit: '',
  })
  const [serviceItems, setServiceItems] = useState<ServiceLineItem[]>([])
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: q }, { data: c }, { data: v }, { data: wo }, { data: svc }] = await Promise.all([
      supabase.from('quotes').select('*, customer:customers(id, full_name, email, phone, whatsapp), vehicle:vehicles(id, make,model,license_plate)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, full_name').order('full_name'),
      supabase.from('vehicles').select('id, make, model, license_plate, customer_id'),
      supabase.from('work_orders').select('id, order_number, customer_id').not('status', 'in', '(delivered,closed)'),
      supabase.from('services').select('id, name, base_price, category, pricing_type, hourly_rate, min_hours, max_hours, risk_level').eq('is_active', true).order('category'),
    ])
    setQuotes(q || [])
    setCustomers(c || [])
    setVehicles(v || [])
    setWorkOrders(wo || [])
    setServices(svc || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (autoOpenNew) { openModal(); onAutoOpenConsumed?.() }
  }, [autoOpenNew])

  const filtered = quotes.filter(q => {
    const s = search.toLowerCase()
    return !s || (q.customer?.full_name || '').toLowerCase().includes(s) || (q.vehicle?.license_plate || '').toLowerCase().includes(s)
  })

  const addItem = (prefill?: Partial<any>) => setForm((f: any) => ({
    ...f, items: [...(f.items || []), { description: '', quantity: 1, unit_price: 0, item_type: 'labor', ...prefill }]
  }))

  // Estimate calculations
  const estMinH = parseFloat(form.estimate_min_hours) || 0
  const estMaxH = parseFloat(form.estimate_max_hours) || 0
  const estQty  = parseInt(form.estimate_quantity) || 1
  const estRate = parseFloat(form.estimate_hourly_rate) || 125
  const estMinPrice = estMinH * estQty * estRate
  const estMaxPrice = estMaxH * estQty * estRate
  const approvalLimit = parseFloat(form.approval_limit) || 0
  const approvalWarning = approvalLimit > 0 && estMaxPrice > approvalLimit

  // Auto-generate customer text when key fields change
  const autoGenerateText = (desc: string, minP: number, maxP: number, risk: string, qty: number, limit: number) => {
    if (!desc || !minP || !maxP) return
    const text = generateEstimateText(desc, minP, maxP, risk, qty, limit || undefined)
    setForm((f: any) => ({ ...f, estimate_customer_text: text }))
  }

  const calcTotals = () => {
    if (pricingMode === 'estimate') {
      // For estimate mode, total_amount = midpoint estimate (for record-keeping)
      const mid = (estMinPrice + estMaxPrice) / 2
      return { parts: 0, labor: mid, subtotal: mid, total: mid * (1 + (form.tax_rate || 0) / 100) }
    }
    if (pricingMode === 'fixed' && serviceItems.length > 0) {
      const subtotal = serviceItems.reduce((s, it) => s + it.final_price, 0)
      return { parts: 0, labor: subtotal, subtotal, total: subtotal * (1 + (form.tax_rate || 0) / 100) }
    }
    const items = form.items || []
    const parts = items.filter((i: any) => i.item_type === 'part').reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0)
    let labor = items.filter((i: any) => i.item_type !== 'part').reduce((s: number, i: any) => s + (i.quantity * i.unit_price), 0)
    const timeCostVal = ((form.time_minutes || 0) / 60) * (form.hourly_rate || 125)
    if (pricingMode === 'time') labor = timeCostVal
    else if (pricingMode === 'combined') labor += timeCostVal
    const subtotal = parts + labor
    return { parts, labor, subtotal, total: subtotal * (1 + (form.tax_rate || 0) / 100) }
  }

  const handleSave = async () => {
    if (!form.customer_id) { toast('Az ügyfél megadása kötelező', 'error'); return }
    if (pricingMode === 'estimate' && (!estMinH || !estMaxH)) {
      toast('Adja meg a becsült minimum és maximum időt', 'error'); return
    }
    setSaving(true)
    const { parts, labor, total } = calcTotals()

    let items = (pricingMode === 'fixed' && serviceItems.length > 0)
      ? serviceItems.map(it => ({
          description: it.service_name + (it.difficulty !== 'normal' ? ` (×${it.difficulty === 'hard' ? 1.25 : it.difficulty === 'very_hard' ? 1.5 : 2})` : ''),
          quantity: it.quantity, unit_price: it.final_price / Math.max(it.quantity, 1),
          item_type: 'labor', risk_acknowledged: it.risk_acknowledged,
        }))
      : (form.items || [])

    if (pricingMode === 'time') {
      items = [{ description: form.time_label || 'Munkadíj', quantity: Math.round((form.time_minutes || 0) / 60 * 100) / 100, unit_price: form.hourly_rate || 125, item_type: 'labor' }]
    } else if (pricingMode === 'combined' && form.time_minutes > 0) {
      items = [...items, { description: form.time_label || 'Időalapú munkadíj', quantity: Math.round((form.time_minutes || 0) / 60 * 100) / 100, unit_price: form.hourly_rate || 125, item_type: 'labor' }]
    } else if (pricingMode === 'estimate') {
      items = [{ description: form.estimate_description || 'Óradíjas munka', quantity: estQty, unit_price: 0, item_type: 'labor',
        estimate_min: estMinPrice, estimate_max: estMaxPrice }]
    }

    const payload: any = {
      customer_id: form.customer_id, vehicle_id: form.vehicle_id || null,
      work_order_id: form.work_order_id || null, status: form.status,
      valid_until: form.valid_until, items, labor_cost: labor, parts_cost: parts,
      tax_rate: form.tax_rate || 7.7, total_amount: total, notes: form.notes,
      pricing_mode: pricingMode,
    }

    if (pricingMode === 'estimate') {
      payload.estimate_min_hours = estMinH
      payload.estimate_max_hours = estMaxH
      payload.estimate_quantity = estQty
      payload.estimate_hourly_rate = estRate
      payload.estimate_min_price = estMinPrice
      payload.estimate_max_price = estMaxPrice
      payload.estimate_risk_level = form.estimate_risk_level
      payload.estimate_customer_text = form.estimate_customer_text
      payload.approval_limit = approvalLimit || null
    }

    const { error } = await supabase.from('quotes').insert(payload)
    if (error) { toast('Hiba: ' + error.message, 'error') } else { toast('Árajánlat létrehozva'); setModalOpen(false); load() }
    setSaving(false)
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('quotes').update({ status }).eq('id', id)
    toast('Státusz frissítve'); load()
  }

  const openModal = () => {
    setForm({ status: 'draft', tax_rate: 7.7, items: [], hourly_rate: 125, time_minutes: 0, time_label: '',
      estimate_min_hours: '', estimate_max_hours: '', estimate_quantity: 1, estimate_hourly_rate: 125,
      estimate_risk_level: 'medium', estimate_customer_text: '', approval_limit: '' })
    setServiceItems([])
    setPricingMode('fixed')
    setModalOpen(true)
  }

  const { parts, labor, subtotal, total } = calcTotals()
  const filteredVehicles = form.customer_id ? vehicles.filter(v => v.customer_id === form.customer_id) : vehicles
  const timeCost = ((form.time_minutes || 0) / 60) * (form.hourly_rate || 125)
  const hourlyServices = services.filter(s => s.pricing_type === 'hourly' && (s.min_hours || s.max_hours))

  return (
    <div className="animate-fade-in">
      <div className="flex gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa0b5]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ügyfél, rendszám..."
            className="w-full pl-9 pr-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0B1E3D]" />
        </div>
        <Button variant="primary" onClick={openModal}><Plus size={14} /> Új árajánlat</Button>
      </div>

      {loading ? <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div> : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[560px]">
              <thead>
                <tr className="bg-[#F4F5F7] border-b border-[rgba(11,30,61,0.10)]">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Dátum</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Ügyfél</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase hidden md:table-cell">Jármű</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Összeg</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Státusz</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Műveletek</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id} className="border-b border-[rgba(11,30,61,0.06)] hover:bg-[#fafbfc]">
                    <td className="px-4 py-3 text-[12px] text-[#5a6a80]">{formatDate(q.created_at)}</td>
                    <td className="px-4 py-3 font-medium">
                      {q.customer?.full_name}
                      {q.pricing_mode === 'estimate' && (
                        <div className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5 mt-0.5">
                          <TrendingUp size={9} /> Becslés: {q.estimate_min_price ? `${formatCurrency(q.estimate_min_price)} – ${formatCurrency(q.estimate_max_price)}` : '–'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {q.vehicle && <span className="bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-0.5 rounded">{q.vehicle.license_plate}</span>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[#0B1E3D]">
                      {q.pricing_mode === 'estimate'
                        ? <span className="text-amber-700">{q.estimate_min_price ? `~${formatCurrency((q.estimate_min_price + q.estimate_max_price) / 2)}` : '–'}</span>
                        : formatCurrency(q.total_amount || 0)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusColors[q.status] || ''}`}>
                        {statusLabels[q.status] || q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        <DocumentActions type="quote" data={{ ...q, id: q.id }} customerId={q.customer?.id} quoteId={q.id} small />
                        {q.status === 'draft' && (
                          <button onClick={() => updateStatus(q.id, 'sent')} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Elküldve jelölés"><Send size={14} /></button>
                        )}
                        {q.status === 'sent' && <>
                          <button onClick={() => updateStatus(q.id, 'approved')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={14} /></button>
                          <button onClick={() => updateStatus(q.id, 'rejected')} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><X size={14} /></button>
                        </>}
                        <button onClick={async () => { if (confirm('Törlés?')) { await supabase.from('quotes').delete().eq('id', q.id); load() } }} className="p-1.5 text-[#5a6a80] hover:text-red-500">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="text-center py-10 text-[#8fa0b5] text-sm">Nem található árajánlat</div>}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Új árajánlat" className="max-w-2xl"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Létrehozás'}</Button></>}>

        {/* Pricing mode selector */}
        <div className="flex gap-1.5 mb-4 p-1 bg-[#F4F5F7] rounded-lg">
          {([
            { mode: 'fixed'    as PricingMode, icon: Tag,         label: 'Fix ár' },
            { mode: 'time'     as PricingMode, icon: Clock,       label: 'Időalapú' },
            { mode: 'combined' as PricingMode, icon: Layers,      label: 'Kombinált' },
            { mode: 'estimate' as PricingMode, icon: TrendingUp,  label: 'Becslés' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button key={mode} onClick={() => setPricingMode(mode)}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-[11px] font-semibold transition-colors ${pricingMode === mode ? 'bg-[#0B1E3D] text-white' : 'text-[#5a6a80] hover:text-[#0B1E3D]'}`}>
              <Icon size={12} /> {label}
            </button>
          ))}
        </div>

        {/* Common fields */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <FormGroup>
            <FormLabel>Ügyfél *</FormLabel>
            <Select value={form.customer_id || ''} onChange={e => setForm((f: any) => ({ ...f, customer_id: e.target.value }))}>
              <option value="">Válasszon...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Jármű</FormLabel>
            <Select value={form.vehicle_id || ''} onChange={e => setForm((f: any) => ({ ...f, vehicle_id: e.target.value }))}>
              <option value="">–</option>
              {filteredVehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} – {v.license_plate}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Munkalap</FormLabel>
            <Select value={form.work_order_id || ''} onChange={e => setForm((f: any) => ({ ...f, work_order_id: e.target.value }))}>
              <option value="">–</option>
              {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.order_number}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Érvényes eddig</FormLabel>
            <Input type="date" value={form.valid_until || ''} onChange={e => setForm((f: any) => ({ ...f, valid_until: e.target.value }))} />
          </FormGroup>
        </div>

        {/* ── ESTIMATE MODE ── */}
        {pricingMode === 'estimate' && (
          <div className="space-y-3">
            {/* Quick fill from service */}
            {hourlyServices.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#5a6a80] uppercase mb-1.5">Gyors kitöltés szolgáltatásból</p>
                <div className="flex flex-wrap gap-1.5">
                  {hourlyServices.map(s => (
                    <button key={s.id} onClick={() => {
                      const newMin = s.min_hours || ''
                      const newMax = s.max_hours || ''
                      const newRate = s.hourly_rate || 125
                      const newRisk = s.risk_level || 'medium'
                      const newDesc = s.name
                      setForm((f: any) => {
                        const minP = (parseFloat(newMin as any) || 0) * (parseInt(f.estimate_quantity) || 1) * newRate
                        const maxP = (parseFloat(newMax as any) || 0) * (parseInt(f.estimate_quantity) || 1) * newRate
                        const text = minP && maxP ? generateEstimateText(newDesc, minP, maxP, newRisk, parseInt(f.estimate_quantity) || 1, parseFloat(f.approval_limit) || undefined) : ''
                        return { ...f, estimate_min_hours: newMin, estimate_max_hours: newMax, estimate_hourly_rate: newRate, estimate_risk_level: newRisk, estimate_description: newDesc, estimate_customer_text: text }
                      })
                    }}
                      className="px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-800 text-[11px] font-medium hover:bg-amber-100">
                      {s.name} ({s.min_hours}–{s.max_hours} h)
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <FormGroup>
              <FormLabel>Munka megnevezése</FormLabel>
              <Input value={form.estimate_description || ''} onChange={e => {
                const desc = e.target.value
                setForm((f: any) => {
                  const minP = (parseFloat(f.estimate_min_hours) || 0) * (parseInt(f.estimate_quantity) || 1) * (parseFloat(f.estimate_hourly_rate) || 125)
                  const maxP = (parseFloat(f.estimate_max_hours) || 0) * (parseInt(f.estimate_quantity) || 1) * (parseFloat(f.estimate_hourly_rate) || 125)
                  const text = desc && minP && maxP ? generateEstimateText(desc, minP, maxP, f.estimate_risk_level, parseInt(f.estimate_quantity) || 1, parseFloat(f.approval_limit) || undefined) : f.estimate_customer_text
                  return { ...f, estimate_description: desc, estimate_customer_text: text }
                })
              }} placeholder="pl. Beragadt porlasztó kiszedés" />
            </FormGroup>

            {/* Szolgáltatások & Tételek */}
            <div>
              <div className="text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[0.5px] mb-2">Szolgáltatások & Tételek</div>
              <ServiceCalculator items={serviceItems} onChange={setServiceItems} hourlyRateDefault={form.hourly_rate || 125} showSummary={false} />
              {serviceItems.some(it => it.is_risky && !it.risk_acknowledged) && (
                <div className="mt-2 flex items-center gap-2 text-[12px] text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                  <AlertTriangle size={13} /> Kockázatos tételek jóváhagyása szükséges az ár mentése előtt
                </div>
              )}
            </div>

            {/* Time range + quantity + rate */}
            <div className="bg-[#0B1E3D] rounded-xl p-4 space-y-3">
              <p className="text-[11px] font-semibold text-[#C9A84C] uppercase flex items-center gap-1"><Clock size={11} /> Időbecslés</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <FormGroup className="mb-0">
                  <label className="block text-[10px] font-semibold text-white/60 uppercase tracking-wide mb-1">Min. óra / db</label>
                  <input type="number" step="0.5" min="0" value={form.estimate_min_hours}
                    onChange={e => setForm((f: any) => {
                      const minH = e.target.value
                      const minP = (parseFloat(minH) || 0) * (parseInt(f.estimate_quantity) || 1) * (parseFloat(f.estimate_hourly_rate) || 125)
                      const maxP = (parseFloat(f.estimate_max_hours) || 0) * (parseInt(f.estimate_quantity) || 1) * (parseFloat(f.estimate_hourly_rate) || 125)
                      const text = f.estimate_description && minP && maxP ? generateEstimateText(f.estimate_description, minP, maxP, f.estimate_risk_level, parseInt(f.estimate_quantity) || 1, parseFloat(f.approval_limit) || undefined) : f.estimate_customer_text
                      return { ...f, estimate_min_hours: minH, estimate_customer_text: text }
                    })}
                    placeholder="0.5"
                    className="w-full px-2.5 py-1.5 rounded-lg text-[12px] bg-white/10 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-[#C9A84C] text-center" />
                </FormGroup>
                <FormGroup className="mb-0">
                  <label className="block text-[10px] font-semibold text-white/60 uppercase tracking-wide mb-1">Max. óra / db</label>
                  <input type="number" step="0.5" min="0" value={form.estimate_max_hours}
                    onChange={e => setForm((f: any) => {
                      const maxH = e.target.value
                      const minP = (parseFloat(f.estimate_min_hours) || 0) * (parseInt(f.estimate_quantity) || 1) * (parseFloat(f.estimate_hourly_rate) || 125)
                      const maxP = (parseFloat(maxH) || 0) * (parseInt(f.estimate_quantity) || 1) * (parseFloat(f.estimate_hourly_rate) || 125)
                      const text = f.estimate_description && minP && maxP ? generateEstimateText(f.estimate_description, minP, maxP, f.estimate_risk_level, parseInt(f.estimate_quantity) || 1, parseFloat(f.approval_limit) || undefined) : f.estimate_customer_text
                      return { ...f, estimate_max_hours: maxH, estimate_customer_text: text }
                    })}
                    placeholder="5.0"
                    className="w-full px-2.5 py-1.5 rounded-lg text-[12px] bg-white/10 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-[#C9A84C] text-center" />
                </FormGroup>
                <FormGroup className="mb-0">
                  <label className="block text-[10px] font-semibold text-white/60 uppercase tracking-wide mb-1">Mennyiség (db)</label>
                  <input type="number" min="1" value={form.estimate_quantity}
                    onChange={e => setForm((f: any) => {
                      const qty = e.target.value
                      const minP = (parseFloat(f.estimate_min_hours) || 0) * (parseInt(qty) || 1) * (parseFloat(f.estimate_hourly_rate) || 125)
                      const maxP = (parseFloat(f.estimate_max_hours) || 0) * (parseInt(qty) || 1) * (parseFloat(f.estimate_hourly_rate) || 125)
                      const text = f.estimate_description && minP && maxP ? generateEstimateText(f.estimate_description, minP, maxP, f.estimate_risk_level, parseInt(qty) || 1, parseFloat(f.approval_limit) || undefined) : f.estimate_customer_text
                      return { ...f, estimate_quantity: qty, estimate_customer_text: text }
                    })}
                    className="w-full px-2.5 py-1.5 rounded-lg text-[12px] bg-white/10 text-white outline-none border border-white/10 focus:border-[#C9A84C] text-center" />
                </FormGroup>
                <FormGroup className="mb-0">
                  <label className="block text-[10px] font-semibold text-white/60 uppercase tracking-wide mb-1">Óradíj (CHF)</label>
                  <input type="number" step="5" value={form.estimate_hourly_rate}
                    onChange={e => setForm((f: any) => {
                      const rate = e.target.value
                      const minP = (parseFloat(f.estimate_min_hours) || 0) * (parseInt(f.estimate_quantity) || 1) * (parseFloat(rate) || 125)
                      const maxP = (parseFloat(f.estimate_max_hours) || 0) * (parseInt(f.estimate_quantity) || 1) * (parseFloat(rate) || 125)
                      const text = f.estimate_description && minP && maxP ? generateEstimateText(f.estimate_description, minP, maxP, f.estimate_risk_level, parseInt(f.estimate_quantity) || 1, parseFloat(f.approval_limit) || undefined) : f.estimate_customer_text
                      return { ...f, estimate_hourly_rate: rate, estimate_customer_text: text }
                    })}
                    className="w-full px-2.5 py-1.5 rounded-lg text-[12px] bg-white/10 text-white outline-none border border-white/10 focus:border-[#C9A84C] text-center" />
                </FormGroup>
              </div>

              {/* Live calculation result */}
              {estMinH > 0 && estMaxH > 0 && (
                <div className="bg-white/10 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-white/70 text-[12px]">
                    {estMinH}–{estMaxH} h/db × {estQty} db × {estRate} CHF/h
                  </div>
                  <div className="text-[#C9A84C] font-bold text-[15px]">
                    {formatCurrency(estMinPrice)} – {formatCurrency(estMaxPrice)}
                  </div>
                </div>
              )}
            </div>

            {/* Risk level */}
            <div>
              <p className="text-[11px] font-semibold text-[#5a6a80] uppercase mb-2">Kockázati szint</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(RISK_META).map(([key, meta]) => (
                  <button key={key} onClick={() => setForm((f: any) => {
                    const text = f.estimate_description && estMinPrice && estMaxPrice ? generateEstimateText(f.estimate_description, estMinPrice, estMaxPrice, key, estQty, parseFloat(f.approval_limit) || undefined) : f.estimate_customer_text
                    return { ...f, estimate_risk_level: key, estimate_customer_text: text }
                  })}
                    className={`px-3 py-2.5 rounded-xl border text-[12px] font-medium text-left transition-all ${form.estimate_risk_level === key ? `${meta.bg} border-current ${meta.color} ring-2 ring-current ring-offset-1` : 'bg-white border-gray-200 text-[#5a6a80] hover:border-gray-300'}`}>
                    <div className={`font-semibold ${form.estimate_risk_level === key ? meta.color : ''}`}>{meta.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-70 leading-snug">{meta.desc.slice(0, 40)}…</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Approval limit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormGroup>
                <FormLabel>Ügyfél jóváhagyási limit (CHF)</FormLabel>
                <Input type="number" step="50" value={form.approval_limit}
                  onChange={e => setForm((f: any) => {
                    const limit = e.target.value
                    const text = f.estimate_description && estMinPrice && estMaxPrice ? generateEstimateText(f.estimate_description, estMinPrice, estMaxPrice, f.estimate_risk_level, estQty, parseFloat(limit) || undefined) : f.estimate_customer_text
                    return { ...f, approval_limit: limit, estimate_customer_text: text }
                  })}
                  placeholder="500" />
                <p className="text-[10px] text-[#5a6a80] mt-1">Ha Karl munkája várhatóan meghaladja ezt, riasztás küldünk.</p>
              </FormGroup>
              {approvalWarning && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-[12px] text-red-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  <span>A becsült maximum ({formatCurrency(estMaxPrice)}) meghaladja a jóváhagyási limitet ({formatCurrency(approvalLimit)})!</span>
                </div>
              )}
            </div>

            {/* Customer text */}
            <FormGroup>
              <FormLabel>Ügyfélnek látható magyarázat</FormLabel>
              <Textarea
                value={form.estimate_customer_text}
                onChange={e => setForm((f: any) => ({ ...f, estimate_customer_text: e.target.value }))}
                rows={4}
                placeholder="Automatikusan generálva, vagy írj egyedi szöveget..."
              />
              <p className="text-[10px] text-[#5a6a80] mt-1">Ez jelenik meg az ügyfélnek küldött árajánlaton.</p>
            </FormGroup>
          </div>
        )}

        {/* ── TIME MODE ── */}
        {(pricingMode === 'time' || pricingMode === 'combined') && (
          <div className="bg-[#0B1E3D] rounded-lg p-3">
            <div className="text-[11px] font-semibold text-[#C9A84C] uppercase mb-2 flex items-center gap-1"><Clock size={11} /> Időalapú munkadíj</div>
            <div className="grid grid-cols-3 gap-2">
              <FormGroup>
                <FormLabel>Leírás</FormLabel>
                <input value={form.time_label || ''} onChange={e => setForm((f: any) => ({ ...f, time_label: e.target.value }))} placeholder="pl. Diagnosztika"
                  className="w-full px-2.5 py-1.5 rounded-lg text-[12px] bg-white/10 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-[#C9A84C]" />
              </FormGroup>
              <FormGroup>
                <FormLabel>Perc</FormLabel>
                <input type="number" value={form.time_minutes || ''} onChange={e => setForm((f: any) => ({ ...f, time_minutes: parseInt(e.target.value) || 0 }))} placeholder="90"
                  className="w-full px-2.5 py-1.5 rounded-lg text-[12px] bg-white/10 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-[#C9A84C] text-center" />
              </FormGroup>
              <FormGroup>
                <FormLabel>Óradíj (CHF)</FormLabel>
                <input type="number" value={form.hourly_rate || 125} onChange={e => setForm((f: any) => ({ ...f, hourly_rate: parseFloat(e.target.value) || 125 }))}
                  className="w-full px-2.5 py-1.5 rounded-lg text-[12px] bg-white/10 text-white outline-none border border-white/10 focus:border-[#C9A84C] text-center" />
              </FormGroup>
            </div>
            {form.time_minutes > 0 && (
              <div className="mt-2 text-right text-[#C9A84C] font-bold text-[13px]">
                {form.time_minutes} perc × {form.hourly_rate} CHF/h = {formatCurrency(timeCost)}
              </div>
            )}
          </div>
        )}

        {/* ── FIXED MODE ── */}
        {pricingMode === 'fixed' && (
          <div>
            <div className="text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[0.5px] mb-2">Szolgáltatások & Tételek</div>
            <ServiceCalculator items={serviceItems} onChange={setServiceItems} hourlyRateDefault={form.hourly_rate || 125} showSummary={false} />
            {serviceItems.some(it => it.is_risky && !it.risk_acknowledged) && (
              <div className="mt-2 flex items-center gap-2 text-[12px] text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                <AlertTriangle size={13} /> Kockázatos tételek jóváhagyása szükséges az ár mentése előtt
              </div>
            )}
          </div>
        )}

        {/* ── COMBINED MODE ── */}
        {pricingMode === 'combined' && (
          <div className="mt-4">
            <div className="text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[0.5px] mb-2">Fix tételek</div>
            <ServiceCalculator items={serviceItems} onChange={setServiceItems} hourlyRateDefault={form.hourly_rate || 125} showSummary={false} />
          </div>
        )}

        {/* Totals */}
        {pricingMode !== 'estimate' && (
          <div className="mt-4 bg-[#F4F5F7] rounded-lg p-3 text-[12px]">
            {pricingMode !== 'time' && (
              <div className="flex justify-between mb-1"><span className="text-[#5a6a80]">Alkatrészek:</span><span>{formatCurrency(parts)}</span></div>
            )}
            <div className="flex justify-between mb-1"><span className="text-[#5a6a80]">Munkadíj:</span><span>{formatCurrency(labor)}</span></div>
            <div className="flex justify-between mb-2 items-center">
              <span className="text-[#5a6a80]">ÁFA (%):</span>
              <Input type="number" step="0.1" value={form.tax_rate || 7.7} onChange={e => setForm((f: any) => ({ ...f, tax_rate: parseFloat(e.target.value) }))} className="w-20 text-right" />
            </div>
            <div className="flex justify-between font-bold text-[#0B1E3D] border-t border-[rgba(11,30,61,0.10)] pt-2">
              <span>Végösszeg:</span><span>{formatCurrency(total)}</span>
            </div>
          </div>
        )}

        {pricingMode === 'estimate' && estMinH > 0 && estMaxH > 0 && (
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-[12px]">
            <div className="flex justify-between mb-1">
              <span className="text-amber-700 font-semibold">Becsült minimum:</span>
              <span className="font-bold text-amber-900">{formatCurrency(estMinPrice)}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-amber-700 font-semibold">Becsült maximum:</span>
              <span className="font-bold text-amber-900">{formatCurrency(estMaxPrice)}</span>
            </div>
            {approvalLimit > 0 && (
              <div className={`flex justify-between pt-2 border-t ${approvalWarning ? 'border-red-200' : 'border-amber-200'}`}>
                <span className={approvalWarning ? 'text-red-700 font-semibold' : 'text-amber-700'}>Jóváhagyási limit:</span>
                <span className={`font-bold ${approvalWarning ? 'text-red-700' : 'text-amber-900'}`}>{formatCurrency(approvalLimit)}</span>
              </div>
            )}
            <div className="flex justify-between mb-2 items-center mt-2">
              <span className="text-[#5a6a80]">ÁFA (%):</span>
              <Input type="number" step="0.1" value={form.tax_rate || 7.7} onChange={e => setForm((f: any) => ({ ...f, tax_rate: parseFloat(e.target.value) }))} className="w-20 text-right" />
            </div>
          </div>
        )}

        <FormGroup className="mt-3">
          <FormLabel>Megjegyzés</FormLabel>
          <Textarea value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
        </FormGroup>
      </Modal>
    </div>
  )
}
