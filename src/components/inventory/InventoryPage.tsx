'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Plus, Edit2, Search, Package, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PartCatalog {
  id: string; name: string; article_number?: string; manufacturer?: string
  category: string; purchase_price: number; sale_price: number
  stock_qty: number; min_stock_qty: number; unit: string; is_active: boolean
  description?: string; location?: string; notes?: string; barcode?: string
  vat_rate?: number; reorder_qty?: number; supplier_id?: string
}
interface StockMovement {
  id: string; part_id: string; movement_type: string; quantity: number
  notes?: string; created_at: string; user_name?: string
  part?: { name: string }
}
interface Supplier {
  id: string; company_name: string; contact_name?: string; phone?: string
  email?: string; website?: string; category: string; address?: string
  notes?: string; is_active: boolean; last_order_at?: string; orders_count?: number
}
interface ServiceTemplate {
  id: string; name: string; category: string; description?: string
  estimated_minutes: number; is_active: boolean; is_mobile: boolean; sort_order: number
  items?: ServiceTemplateItem[]
}
interface ServiceTemplateItem {
  id: string; template_id: string; item_type: string; name: string
  quantity: number; unit_price: number; notes?: string; sort_order: number
}
interface TireEntry {
  id: string; customer_id?: string; vehicle_id?: string; season: string
  tire_size?: string; dot?: string; storage_location?: string; storage_shelf?: string; storage_row?: string
  tread_depth_fl?: number; tread_depth_fr?: number; tread_depth_rl?: number; tread_depth_rr?: number
  pressure_fl?: number; pressure_fr?: number; pressure_rl?: number; pressure_rr?: number
  status: string; notes?: string; stored_at?: string
  customer?: { full_name: string }
  vehicle?: { make: string; model: string; license_plate: string }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PART_CATS = ['Motorolaj','Szűrő','Fékrendszer','Futómű','Gumi','Csavar/Tömítés','Elektromosság','Fogyóanyag','Egyéb']
const SVC_CATS  = ['Mobil Gumiszerviz','Mobil Autótakarítás','Detailing','Pickup & Delivery','Diagnosztika','Szerviz','Motor','Fék','Futómű','Elektromosság','Flotta','Egyéb']
const SUP_CATS  = ['Alkatrész','Gumi','Olaj','Detailing','Szerszám','Egyéb']
const MOV_LABELS: Record<string,string> = { in:'Beérkezés', out:'Felhasználás', adjustment:'Korrekció', scrap:'Selejtezés' }
const MOV_COLORS: Record<string,string> = { in:'text-green-700 bg-green-50', out:'text-red-700 bg-red-50', adjustment:'text-yellow-700 bg-yellow-50', scrap:'text-gray-600 bg-gray-100' }
const TIRE_STATUS_COLORS: Record<string,string> = { stored:'bg-green-100 text-green-800', issued:'bg-yellow-100 text-yellow-800', mounted:'bg-blue-100 text-blue-800', scrapped:'bg-gray-100 text-gray-600' }
const TIRE_STATUS_LABELS: Record<string,string> = { stored:'Tárolva', issued:'Kiadva', mounted:'Felszerelve', scrapped:'Selejtezve' }
const SEASON_LABELS: Record<string,string> = { winter:'Téli', summer:'Nyári', allseason:'Négyévszakos' }
const SEASON_COLORS: Record<string,string> = { winter:'bg-blue-100 text-blue-800', summer:'bg-orange-100 text-orange-800', allseason:'bg-green-100 text-green-800' }

// ─── Pill Tab ─────────────────────────────────────────────────────────────────

function Tab({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-colors whitespace-nowrap ${
        active ? 'bg-[#0B1E3D] text-white' : 'text-[#5a6a80] hover:bg-[#F4F5F7]'
      }`}
    >
      {label}
    </button>
  )
}

function KpiCard({ label, value, sub, color = 'text-[#0B1E3D]' }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div className="bg-white border border-[rgba(11,30,61,0.08)] rounded-xl p-4">
      <p className="text-[11px] text-[#5a6a80] mb-1">{label}</p>
      <p className={`text-[26px] font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-[#8fa0b5] mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function InventoryPage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const [tab, setTab] = useState('dashboard')
  const { toast } = useToast()
  const supabase = createClient()

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard' },
    { id: 'services',  label: '🛠️ Szolgáltatások' },
    { id: 'templates', label: '📋 Sablonok' },
    { id: 'parts',     label: '🔩 Alkatrészek' },
    { id: 'stock',     label: '📦 Készlet' },
    { id: 'suppliers', label: '🏭 Beszállítók' },
    { id: 'tirehotel', label: '🏷️ Gumi Hotel' },
    { id: 'profit',    label: '💰 Profit Kalkuláció' },
  ]

  return (
    <div className="animate-fade-in space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap bg-white border border-[rgba(11,30,61,0.08)] rounded-2xl p-1.5">
        {tabs.map(t => <Tab key={t.id} id={t.id} label={t.label} active={tab === t.id} onClick={() => setTab(t.id)} />)}
      </div>

      {tab === 'dashboard'  && <DashboardTab refreshKey={refreshKey} supabase={supabase} />}
      {tab === 'services'   && <ServicesTab  refreshKey={refreshKey} supabase={supabase} toast={toast} />}
      {tab === 'templates'  && <TemplatesTab refreshKey={refreshKey} supabase={supabase} toast={toast} />}
      {tab === 'parts'      && <PartsTab     refreshKey={refreshKey} supabase={supabase} toast={toast} />}
      {tab === 'stock'      && <StockTab     refreshKey={refreshKey} supabase={supabase} toast={toast} />}
      {tab === 'suppliers'  && <SuppliersTab refreshKey={refreshKey} supabase={supabase} toast={toast} />}
      {tab === 'tirehotel'  && <TireHotelTab refreshKey={refreshKey} supabase={supabase} toast={toast} />}
      {tab === 'profit'     && <ProfitTab    supabase={supabase} />}
    </div>
  )
}

// ─── Tab 1: Dashboard ─────────────────────────────────────────────────────────

function DashboardTab({ refreshKey, supabase }: { refreshKey: number; supabase: any }) {
  const [data, setData] = useState<any>({ svcCount: 0, partCount: 0, lowStock: [], tireStored: 0, tireStatus: {}, topSvcs: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [svc, parts, tire, tireAll, topWo] = await Promise.all([
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('parts_catalog').select('id,name,stock_qty,min_stock_qty').eq('is_active', true),
        supabase.from('tire_hotel').select('id', { count: 'exact', head: true }).eq('status', 'stored'),
        supabase.from('tire_hotel').select('status'),
        supabase.from('work_orders').select('service_type').not('service_type', 'is', null).limit(200),
      ])
      const partsData: PartCatalog[] = parts.data || []
      const lowStock = partsData.filter(p => p.stock_qty <= p.min_stock_qty)
      const tireStatus: Record<string,number> = {}
      for (const t of (tireAll.data || [])) tireStatus[t.status] = (tireStatus[t.status] || 0) + 1
      const svcCounts: Record<string,number> = {}
      for (const w of (topWo.data || [])) svcCounts[w.service_type] = (svcCounts[w.service_type] || 0) + 1
      const topSvcs = Object.entries(svcCounts).sort((a,b) => b[1]-a[1]).slice(0,5)
      setData({ svcCount: svc.count || 0, partCount: partsData.length, lowStock, tireStored: tire.count || 0, tireStatus, topSvcs })
      setLoading(false)
    })()
  }, [refreshKey])

  if (loading) return <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div>

  return (
    <div className="space-y-4">
      <div className="bg-[#0B1E3D] rounded-2xl p-5 text-white">
        <h2 className="text-lg font-semibold">📦 Készlet & Árlista – Áttekintés</h2>
        <p className="text-white/50 text-[12px] mt-1">Raktárkészlet, árlista és gumi hotel összefoglaló</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Aktív szolgáltatások" value={data.svcCount} />
        <KpiCard label="Alkatrészek (katalógus)" value={data.partCount} />
        <KpiCard label="Alacsony készlet" value={data.lowStock.length} color={data.lowStock.length > 0 ? 'text-red-600' : 'text-[#0B1E3D]'} />
        <KpiCard label="Gumi Hotel (tárolt)" value={data.tireStored} color="text-blue-700" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top services */}
        <div className="bg-white border border-[rgba(11,30,61,0.08)] rounded-xl p-4">
          <h3 className="text-[13px] font-semibold text-[#0B1E3D] mb-3">Top szolgáltatások</h3>
          {data.topSvcs.length === 0 ? <p className="text-[12px] text-[#8fa0b5]">Nincs adat</p> : (
            <div className="space-y-2">
              {data.topSvcs.map(([name, count]: [string, number]) => (
                <div key={name} className="flex justify-between items-center">
                  <span className="text-[12px] text-[#0B1E3D] truncate flex-1">{name}</span>
                  <span className="text-[11px] font-semibold text-[#C9A84C] ml-2">{count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Low stock */}
        <div className="bg-white border border-[rgba(11,30,61,0.08)] rounded-xl p-4">
          <h3 className="text-[13px] font-semibold text-[#0B1E3D] mb-3">Alacsony készlet</h3>
          {data.lowStock.length === 0 ? <p className="text-[12px] text-emerald-600">✓ Minden készlet rendben</p> : (
            <div className="space-y-2">
              {data.lowStock.slice(0,6).map((p: PartCatalog) => (
                <div key={p.id} className="flex justify-between items-center">
                  <span className="text-[12px] text-[#0B1E3D] truncate flex-1">{p.name}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 ml-2">{p.stock_qty}/{p.min_stock_qty}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Tire hotel status */}
        <div className="bg-white border border-[rgba(11,30,61,0.08)] rounded-xl p-4">
          <h3 className="text-[13px] font-semibold text-[#0B1E3D] mb-3">Gumi Hotel státusz</h3>
          {Object.keys(data.tireStatus).length === 0 ? <p className="text-[12px] text-[#8fa0b5]">Nincs adat</p> : (
            <div className="space-y-2">
              {Object.entries(data.tireStatus).map(([st, cnt]) => (
                <div key={st} className="flex justify-between items-center">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIRE_STATUS_COLORS[st] || 'bg-gray-100 text-gray-600'}`}>{TIRE_STATUS_LABELS[st] || st}</span>
                  <span className="text-[13px] font-bold text-[#0B1E3D]">{cnt as number}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab 2: Szolgáltatások ────────────────────────────────────────────────────

function ServicesTab({ refreshKey, supabase, toast }: any) {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('services').select('*').order('category').order('name')
    setServices(data || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const openNew = () => { setEditItem(null); setForm({ is_active: true, is_mobile: false, pricing_type: 'fixed', category: 'Motor' }); setModalOpen(true) }
  const openEdit = (s: any) => { setEditItem(s); setForm({ ...s }); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.name?.trim()) { toast('Név kötelező', 'error'); return }
    setSaving(true)
    const { error } = editItem
      ? await supabase.from('services').update(form).eq('id', editItem.id)
      : await supabase.from('services').insert(form)
    error ? toast('Hiba: ' + error.message, 'error') : (toast(editItem ? 'Frissítve' : 'Létrehozva'), setModalOpen(false), load())
    setSaving(false)
  }

  const toggleActive = async (s: any) => {
    await supabase.from('services').update({ is_active: !s.is_active }).eq('id', s.id)
    load()
  }

  const filtered = filterCat === 'all' ? services : services.filter(s => s.category === filterCat)

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant="primary" onClick={openNew}><Plus size={14} /> Új szolgáltatás</Button>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="ml-auto px-3 py-1.5 border border-[rgba(11,30,61,0.18)] rounded-lg text-[12px] bg-white outline-none">
          <option value="all">Mind</option>
          {SVC_CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {loading ? <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(s => (
            <div key={s.id} className={`bg-white border border-[rgba(11,30,61,0.08)] rounded-xl p-4 ${!s.is_active ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[13px] text-[#0B1E3D] truncate">{s.name}</p>
                  <span className="text-[10px] bg-[#F4F5F7] text-[#5a6a80] px-2 py-0.5 rounded-full">{s.category}</span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="p-1 text-[#5a6a80] hover:text-[#0B1E3D]"><Edit2 size={13} /></button>
                  <button onClick={() => toggleActive(s)} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${s.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.is_active ? 'Aktív' : 'Inaktív'}
                  </button>
                </div>
              </div>
              <div className="text-[12px] text-[#5a6a80]">
                {s.pricing_type === 'fixed' && s.base_price && <span className="font-semibold text-[#0B1E3D]">{formatCurrency(s.base_price)}</span>}
                {s.pricing_type === 'hourly' && s.hourly_rate && <span>{formatCurrency(s.hourly_rate)}/óra</span>}
                {s.pricing_type === 'per_unit' && s.unit_price && <span>{formatCurrency(s.unit_price)}/{s.unit_label || 'db'}</span>}
                {s.pricing_type === 'custom' && <span>Egyedi</span>}
                {s.duration_minutes && <span className="ml-2 text-[11px]">⏱ {s.duration_minutes} p</span>}
                {s.is_mobile && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full">Mobil</span>}
              </div>
              {s.description && <p className="text-[11px] text-[#8fa0b5] mt-1 truncate">{s.description}</p>}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-[#8fa0b5] text-sm col-span-3 text-center py-8">Nincs találat</p>}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Szolgáltatás szerkesztése' : 'Új szolgáltatás'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup className="col-span-2"><FormLabel>Név *</FormLabel><Input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} /></FormGroup>
          <FormGroup><FormLabel>Kategória</FormLabel>
            <Select value={form.category || ''} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
              {SVC_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormGroup>
          <FormGroup><FormLabel>Árazás típusa</FormLabel>
            <Select value={form.pricing_type || 'fixed'} onChange={e => setForm((f: any) => ({ ...f, pricing_type: e.target.value }))}>
              <option value="fixed">Fix ár</option><option value="per_unit">Darabár</option>
              <option value="hourly">Óradíj</option><option value="custom">Egyedi</option>
            </Select>
          </FormGroup>
          {form.pricing_type === 'fixed' && <FormGroup><FormLabel>Ár CHF</FormLabel><Input type="number" step="0.01" value={form.base_price || ''} onChange={e => setForm((f: any) => ({ ...f, base_price: parseFloat(e.target.value) || null }))} /></FormGroup>}
          {form.pricing_type === 'hourly' && <FormGroup><FormLabel>Óradíj CHF</FormLabel><Input type="number" step="0.01" value={form.hourly_rate || ''} onChange={e => setForm((f: any) => ({ ...f, hourly_rate: parseFloat(e.target.value) || null }))} /></FormGroup>}
          {form.pricing_type === 'per_unit' && <FormGroup><FormLabel>Egységár CHF</FormLabel><Input type="number" step="0.01" value={form.unit_price || ''} onChange={e => setForm((f: any) => ({ ...f, unit_price: parseFloat(e.target.value) || null }))} /></FormGroup>}
          <FormGroup><FormLabel>Időtartam (perc)</FormLabel><Input type="number" value={form.duration_minutes || ''} onChange={e => setForm((f: any) => ({ ...f, duration_minutes: parseInt(e.target.value) || null }))} /></FormGroup>
          <FormGroup><FormLabel>Mobil</FormLabel>
            <Select value={form.is_mobile ? 'yes' : 'no'} onChange={e => setForm((f: any) => ({ ...f, is_mobile: e.target.value === 'yes' }))}>
              <option value="no">Nem</option><option value="yes">Igen</option>
            </Select>
          </FormGroup>
          <FormGroup><FormLabel>Státusz</FormLabel>
            <Select value={form.is_active ? 'yes' : 'no'} onChange={e => setForm((f: any) => ({ ...f, is_active: e.target.value === 'yes' }))}>
              <option value="yes">Aktív</option><option value="no">Inaktív</option>
            </Select>
          </FormGroup>
          <FormGroup className="col-span-2"><FormLabel>Leírás</FormLabel><Textarea value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} className="min-h-[56px]" /></FormGroup>
        </div>
      </Modal>
    </div>
  )
}

// ─── Tab 3: Sablonok ──────────────────────────────────────────────────────────

function TemplatesTab({ refreshKey, supabase, toast }: any) {
  const [templates, setTemplates] = useState<ServiceTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('service_templates').select('*, items:service_template_items(*)').order('sort_order').order('name')
    const tpls = (data || []) as ServiceTemplate[]
    if (tpls.length === 0) {
      // Pre-create starter templates
      const starters = [
        { name: 'Olajcsere', category: 'Motor', description: 'Motorolaj és olajszűrő csere', estimated_minutes: 45 },
        { name: 'Első fékcsere', category: 'Fék', description: 'Első fékbetétek és tárcsák cseréje', estimated_minutes: 90 },
        { name: 'Mobil gumicsere', category: 'Mobil Gumiszerviz', description: 'Helyszíni gumicsere 4 kerékre', estimated_minutes: 60, is_mobile: true },
        { name: 'Detailing Full', category: 'Detailing', description: 'Teljes karosszéria és belső takarítás', estimated_minutes: 240 },
      ]
      await supabase.from('service_templates').insert(starters)
      const { data: d2 } = await supabase.from('service_templates').select('*, items:service_template_items(*)').order('name')
      setTemplates((d2 || []) as ServiceTemplate[])
    } else {
      setTemplates(tpls)
    }
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    if (!form.name?.trim()) { toast('Név kötelező', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('service_templates').insert({ ...form, is_active: true })
    error ? toast('Hiba: ' + error.message, 'error') : (toast('Sablon létrehozva'), setModalOpen(false), load())
    setSaving(false)
  }

  const toggleExpand = (id: string) => setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => { setForm({ category: 'Motor', estimated_minutes: 60, is_mobile: false }); setModalOpen(true) }}>
          <Plus size={14} /> Új sablon
        </Button>
      </div>
      {loading ? <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div> : (
        <div className="space-y-3">
          {templates.map(t => (
            <div key={t.id} className="bg-white border border-[rgba(11,30,61,0.08)] rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[13px] text-[#0B1E3D]">{t.name}</span>
                    <span className="text-[10px] bg-[#F4F5F7] text-[#5a6a80] px-2 py-0.5 rounded-full">{t.category}</span>
                    {t.is_mobile && <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Mobil</span>}
                  </div>
                  {t.description && <p className="text-[12px] text-[#5a6a80] mt-0.5">{t.description}</p>}
                  <p className="text-[11px] text-[#8fa0b5] mt-1">⏱ {t.estimated_minutes} perc · {(t.items || []).length} elem</p>
                </div>
                <div className="flex gap-2 items-center shrink-0">
                  <button onClick={() => toast('Sablon alkalmazva munkalapra (hamarosan)', 'success')}
                    className="text-[11px] px-3 py-1 bg-[#0B1E3D] text-white rounded-lg hover:bg-[#1a3260]">
                    Alkalmazás
                  </button>
                  <button onClick={() => toggleExpand(t.id)} className="p-1.5 text-[#5a6a80] hover:text-[#0B1E3D]">
                    {expanded.has(t.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
              {expanded.has(t.id) && (
                <div className="border-t border-[rgba(11,30,61,0.06)] bg-[#F4F5F7] p-3">
                  {(t.items || []).length === 0 ? (
                    <p className="text-[12px] text-[#8fa0b5] text-center py-2">Nincsenek elemek</p>
                  ) : (
                    <div className="space-y-1">
                      {(t.items || []).map((item: ServiceTemplateItem) => (
                        <div key={item.id} className="flex justify-between text-[12px]">
                          <span className="text-[#0B1E3D]">{item.name}</span>
                          <span className="text-[#5a6a80]">{item.quantity} × {formatCurrency(item.unit_price)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Új sablon"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup className="col-span-2"><FormLabel>Név *</FormLabel><Input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} /></FormGroup>
          <FormGroup><FormLabel>Kategória</FormLabel>
            <Select value={form.category || 'Motor'} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
              {SVC_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormGroup>
          <FormGroup><FormLabel>Becsült idő (perc)</FormLabel><Input type="number" value={form.estimated_minutes || 60} onChange={e => setForm((f: any) => ({ ...f, estimated_minutes: parseInt(e.target.value) || 60 }))} /></FormGroup>
          <FormGroup><FormLabel>Mobil</FormLabel>
            <Select value={form.is_mobile ? 'yes' : 'no'} onChange={e => setForm((f: any) => ({ ...f, is_mobile: e.target.value === 'yes' }))}>
              <option value="no">Nem</option><option value="yes">Igen</option>
            </Select>
          </FormGroup>
          <FormGroup className="col-span-2"><FormLabel>Leírás</FormLabel><Textarea value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} className="min-h-[56px]" /></FormGroup>
        </div>
      </Modal>
    </div>
  )
}

// ─── Tab 4: Alkatrészek ───────────────────────────────────────────────────────

function PartsTab({ refreshKey, supabase, toast }: any) {
  const [parts, setParts] = useState<PartCatalog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('parts_catalog').select('*').order('category').order('name')
    setParts((data || []) as PartCatalog[])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    let r = parts
    if (filterCat !== 'all') r = r.filter(p => p.category === filterCat)
    if (search) { const s = search.toLowerCase(); r = r.filter(p => p.name.toLowerCase().includes(s) || (p.article_number || '').toLowerCase().includes(s)) }
    return r
  }, [parts, filterCat, search])

  const openNew = () => { setEditItem(null); setForm({ is_active: true, category: 'Szűrő', unit: 'db', purchase_price: 0, sale_price: 0, stock_qty: 0, min_stock_qty: 0, vat_rate: 7.7 }); setModalOpen(true) }
  const openEdit = (p: PartCatalog) => { setEditItem(p); setForm({ ...p }); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.name?.trim()) { toast('Név kötelező', 'error'); return }
    setSaving(true)
    const { error } = editItem
      ? await supabase.from('parts_catalog').update(form).eq('id', editItem.id)
      : await supabase.from('parts_catalog').insert(form)
    error ? toast('Hiba: ' + error.message, 'error') : (toast(editItem ? 'Frissítve' : 'Létrehozva'), setModalOpen(false), load())
    setSaving(false)
  }

  const profitPct = (p: PartCatalog) => p.purchase_price > 0 ? ((p.sale_price - p.purchase_price) / p.purchase_price * 100) : 0
  const profitColor = (pct: number) => pct > 30 ? 'text-green-700' : pct >= 10 ? 'text-yellow-700' : 'text-red-700'

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa0b5]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Keresés..."
            className="w-full pl-9 pr-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white outline-none" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="px-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[12px] bg-white outline-none">
          <option value="all">Mind</option>{PART_CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button variant="primary" onClick={openNew}><Plus size={14} /> Új alkatrész</Button>
      </div>
      {loading ? <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div> : (
        <div className="bg-white border border-[rgba(11,30,61,0.08)] rounded-xl overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#F4F5F7] border-b border-[rgba(11,30,61,0.10)]">
                {['Cikkszám','Név','Gyártó','Kategória','Készlet','Min','Besz.ár','Elad.ár','Profit%',''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold text-[#5a6a80] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isLow = p.stock_qty <= p.min_stock_qty
                const pct = profitPct(p)
                return (
                  <tr key={p.id} className={`border-b border-[rgba(11,30,61,0.06)] hover:bg-[#fafbfc] ${isLow ? 'bg-red-50/40' : ''}`}>
                    <td className="px-3 py-2 font-mono text-[11px]">{p.article_number || '–'}</td>
                    <td className="px-3 py-2 font-medium text-[#0B1E3D] max-w-[160px] truncate">{p.name}</td>
                    <td className="px-3 py-2 text-[#5a6a80]">{p.manufacturer || '–'}</td>
                    <td className="px-3 py-2"><span className="text-[10px] bg-[#F4F5F7] text-[#5a6a80] px-1.5 py-0.5 rounded-full">{p.category}</span></td>
                    <td className={`px-3 py-2 font-semibold ${isLow ? 'text-red-700' : ''}`}>{p.stock_qty} {p.unit}</td>
                    <td className="px-3 py-2 text-[#5a6a80]">{p.min_stock_qty}</td>
                    <td className="px-3 py-2">{formatCurrency(p.purchase_price)}</td>
                    <td className="px-3 py-2 font-semibold">{formatCurrency(p.sale_price)}</td>
                    <td className={`px-3 py-2 font-semibold ${profitColor(pct)}`}>{pct.toFixed(0)}%</td>
                    <td className="px-3 py-2"><button onClick={() => openEdit(p)} className="p-1 text-[#5a6a80] hover:text-[#0B1E3D]"><Edit2 size={13} /></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-10 text-[#8fa0b5] text-sm">Nincs találat</div>}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Alkatrész szerkesztése' : 'Új alkatrész'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup className="col-span-2"><FormLabel>Név *</FormLabel><Input value={form.name || ''} onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} /></FormGroup>
          <FormGroup><FormLabel>Cikkszám</FormLabel><Input value={form.article_number || ''} onChange={e => setForm((f: any) => ({ ...f, article_number: e.target.value }))} /></FormGroup>
          <FormGroup><FormLabel>Gyártó</FormLabel><Input value={form.manufacturer || ''} onChange={e => setForm((f: any) => ({ ...f, manufacturer: e.target.value }))} /></FormGroup>
          <FormGroup><FormLabel>Kategória</FormLabel>
            <Select value={form.category || 'Szűrő'} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
              {PART_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormGroup>
          <FormGroup><FormLabel>Egység</FormLabel><Input value={form.unit || 'db'} onChange={e => setForm((f: any) => ({ ...f, unit: e.target.value }))} placeholder="db" /></FormGroup>
          <FormGroup><FormLabel>Besz. ár CHF</FormLabel><Input type="number" step="0.01" value={form.purchase_price || ''} onChange={e => setForm((f: any) => ({ ...f, purchase_price: parseFloat(e.target.value) || 0 }))} /></FormGroup>
          <FormGroup><FormLabel>Elad. ár CHF</FormLabel><Input type="number" step="0.01" value={form.sale_price || ''} onChange={e => setForm((f: any) => ({ ...f, sale_price: parseFloat(e.target.value) || 0 }))} /></FormGroup>
          <FormGroup><FormLabel>Készlet (db)</FormLabel><Input type="number" value={form.stock_qty || 0} onChange={e => setForm((f: any) => ({ ...f, stock_qty: parseInt(e.target.value) || 0 }))} /></FormGroup>
          <FormGroup><FormLabel>Min készlet</FormLabel><Input type="number" value={form.min_stock_qty || 0} onChange={e => setForm((f: any) => ({ ...f, min_stock_qty: parseInt(e.target.value) || 0 }))} /></FormGroup>
          <FormGroup><FormLabel>Helyszín</FormLabel><Input value={form.location || ''} onChange={e => setForm((f: any) => ({ ...f, location: e.target.value }))} placeholder="pl. A-3 polc" /></FormGroup>
          <FormGroup><FormLabel>ÁFA %</FormLabel><Input type="number" step="0.01" value={form.vat_rate || 7.7} onChange={e => setForm((f: any) => ({ ...f, vat_rate: parseFloat(e.target.value) || 7.7 }))} /></FormGroup>
          <FormGroup className="col-span-2"><FormLabel>Megjegyzés</FormLabel><Textarea value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="min-h-[56px]" /></FormGroup>
        </div>
      </Modal>
    </div>
  )
}

// ─── Tab 5: Készlet mozgások ──────────────────────────────────────────────────

function StockTab({ refreshKey, supabase, toast }: any) {
  const [parts, setParts] = useState<PartCatalog[]>([])
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<any>({ movement_type: 'in', quantity: 1 })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [p, m] = await Promise.all([
      supabase.from('parts_catalog').select('id,name,stock_qty,unit').eq('is_active', true).order('name'),
      supabase.from('stock_movements').select('*, part:parts_catalog(name)').order('created_at', { ascending: false }).limit(20),
    ])
    setParts(p.data || [])
    setMovements(m.data || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const handleSubmit = async () => {
    if (!form.part_id) { toast('Válassz alkatrészt', 'error'); return }
    if (!form.quantity || form.quantity < 1) { toast('Mennyiség szükséges', 'error'); return }
    setSaving(true)
    const { error: e1 } = await supabase.from('stock_movements').insert({
      part_id: form.part_id, movement_type: form.movement_type,
      quantity: form.quantity, notes: form.notes || null,
    })
    if (!e1) {
      const delta = ['in','adjustment'].includes(form.movement_type) ? form.quantity : -form.quantity
      await supabase.rpc ? null : null // fallback: update manually
      const part = parts.find(p => p.id === form.part_id)
      if (part) {
        await supabase.from('parts_catalog').update({ stock_qty: Math.max(0, part.stock_qty + delta) }).eq('id', form.part_id)
      }
      toast('Mozgás rögzítve')
      setForm({ movement_type: 'in', quantity: 1 })
      load()
    } else {
      toast('Hiba: ' + e1.message, 'error')
    }
    setSaving(false)
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Form */}
      <div className="bg-white border border-[rgba(11,30,61,0.08)] rounded-xl p-4">
        <h3 className="font-semibold text-[13px] text-[#0B1E3D] mb-4">Készletmozgás rögzítése</h3>
        <div className="space-y-3">
          <FormGroup><FormLabel>Alkatrész *</FormLabel>
            <Select value={form.part_id || ''} onChange={e => setForm((f: any) => ({ ...f, part_id: e.target.value }))}>
              <option value="">– Válasszon –</option>
              {parts.map(p => <option key={p.id} value={p.id}>{p.name} (készlet: {p.stock_qty})</option>)}
            </Select>
          </FormGroup>
          <FormGroup><FormLabel>Típus</FormLabel>
            <Select value={form.movement_type} onChange={e => setForm((f: any) => ({ ...f, movement_type: e.target.value }))}>
              {Object.entries(MOV_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </FormGroup>
          <FormGroup><FormLabel>Mennyiség</FormLabel>
            <Input type="number" min={1} value={form.quantity || 1} onChange={e => setForm((f: any) => ({ ...f, quantity: parseInt(e.target.value) || 1 }))} />
          </FormGroup>
          <FormGroup><FormLabel>Megjegyzés</FormLabel>
            <Input value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} placeholder="Opcionális" />
          </FormGroup>
          <Button variant="primary" onClick={handleSubmit} disabled={saving} className="w-full">{saving ? 'Mentés...' : 'Mozgás rögzítése'}</Button>
        </div>
      </div>
      {/* Movements */}
      <div className="bg-white border border-[rgba(11,30,61,0.08)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[rgba(11,30,61,0.06)]">
          <h3 className="font-semibold text-[13px] text-[#0B1E3D]">Legutóbbi mozgások</h3>
        </div>
        {loading ? <div className="text-center py-8 text-[#5a6a80] text-sm">Betöltés...</div> : (
          <div className="divide-y divide-[rgba(11,30,61,0.06)]">
            {movements.map(m => (
              <div key={m.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${MOV_COLORS[m.movement_type] || ''}`}>
                  {MOV_LABELS[m.movement_type] || m.movement_type}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#0B1E3D] truncate">{(m as any).part?.name || '–'}</p>
                  {m.notes && <p className="text-[11px] text-[#8fa0b5] truncate">{m.notes}</p>}
                </div>
                <span className="text-[13px] font-bold text-[#0B1E3D] shrink-0">{m.quantity}</span>
              </div>
            ))}
            {movements.length === 0 && <div className="text-center py-8 text-[#8fa0b5] text-sm">Nincs mozgás</div>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tab 6: Beszállítók ───────────────────────────────────────────────────────

function SuppliersTab({ refreshKey, supabase, toast }: any) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCat, setFilterCat] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('suppliers').select('*').order('company_name')
    setSuppliers((data || []) as Supplier[])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const openNew = () => { setEditItem(null); setForm({ is_active: true, category: 'Alkatrész' }); setModalOpen(true) }
  const openEdit = (s: Supplier) => { setEditItem(s); setForm({ ...s }); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.company_name?.trim()) { toast('Cégnév kötelező', 'error'); return }
    setSaving(true)
    const { error } = editItem
      ? await supabase.from('suppliers').update(form).eq('id', editItem.id)
      : await supabase.from('suppliers').insert(form)
    error ? toast('Hiba: ' + error.message, 'error') : (toast(editItem ? 'Frissítve' : 'Létrehozva'), setModalOpen(false), load())
    setSaving(false)
  }

  const filtered = filterCat === 'all' ? suppliers : suppliers.filter(s => s.category === filterCat)

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="primary" onClick={openNew}><Plus size={14} /> Új beszállító</Button>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="ml-auto px-3 py-1.5 border border-[rgba(11,30,61,0.18)] rounded-lg text-[12px] bg-white outline-none">
          <option value="all">Mind</option>{SUP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      {loading ? <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(s => (
            <div key={s.id} className={`bg-white border border-[rgba(11,30,61,0.08)] rounded-xl p-4 ${!s.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-semibold text-[13px] text-[#0B1E3D]">{s.company_name}</p>
                  <span className="text-[10px] bg-[#F4F5F7] text-[#5a6a80] px-2 py-0.5 rounded-full">{s.category}</span>
                </div>
                <button onClick={() => openEdit(s)} className="p-1 text-[#5a6a80] hover:text-[#0B1E3D]"><Edit2 size={13} /></button>
              </div>
              {s.contact_name && <p className="text-[12px] text-[#5a6a80]">👤 {s.contact_name}</p>}
              {s.phone && <p className="text-[12px] text-[#5a6a80]">📞 {s.phone}</p>}
              {s.email && <p className="text-[12px] text-[#5a6a80]">✉️ {s.email}</p>}
              {s.last_order_at && <p className="text-[11px] text-[#8fa0b5] mt-1">Utolsó rendelés: {new Date(s.last_order_at).toLocaleDateString('hu-HU')}</p>}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-[#8fa0b5] text-sm col-span-3 text-center py-8">Nincs találat</p>}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Beszállító szerkesztése' : 'Új beszállító'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup className="col-span-2"><FormLabel>Cégnév *</FormLabel><Input value={form.company_name || ''} onChange={e => setForm((f: any) => ({ ...f, company_name: e.target.value }))} /></FormGroup>
          <FormGroup><FormLabel>Kapcsolattartó</FormLabel><Input value={form.contact_name || ''} onChange={e => setForm((f: any) => ({ ...f, contact_name: e.target.value }))} /></FormGroup>
          <FormGroup><FormLabel>Kategória</FormLabel>
            <Select value={form.category || 'Alkatrész'} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
              {SUP_CATS.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormGroup>
          <FormGroup><FormLabel>Telefon</FormLabel><Input value={form.phone || ''} onChange={e => setForm((f: any) => ({ ...f, phone: e.target.value }))} /></FormGroup>
          <FormGroup><FormLabel>Email</FormLabel><Input type="email" value={form.email || ''} onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} /></FormGroup>
          <FormGroup><FormLabel>Weboldal</FormLabel><Input value={form.website || ''} onChange={e => setForm((f: any) => ({ ...f, website: e.target.value }))} /></FormGroup>
          <FormGroup><FormLabel>Státusz</FormLabel>
            <Select value={form.is_active ? 'yes' : 'no'} onChange={e => setForm((f: any) => ({ ...f, is_active: e.target.value === 'yes' }))}>
              <option value="yes">Aktív</option><option value="no">Inaktív</option>
            </Select>
          </FormGroup>
          <FormGroup className="col-span-2"><FormLabel>Cím</FormLabel><Input value={form.address || ''} onChange={e => setForm((f: any) => ({ ...f, address: e.target.value }))} /></FormGroup>
          <FormGroup className="col-span-2"><FormLabel>Megjegyzés</FormLabel><Textarea value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="min-h-[56px]" /></FormGroup>
        </div>
      </Modal>
    </div>
  )
}

// ─── Tab 7: Gumi Hotel ────────────────────────────────────────────────────────

function TireHotelTab({ refreshKey, supabase, toast }: any) {
  const [tires, setTires] = useState<TireEntry[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [t, c, v] = await Promise.all([
      supabase.from('tire_hotel').select('*, customer:customers(full_name), vehicle:vehicles(make,model,license_plate)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id,full_name').order('full_name').limit(200),
      supabase.from('vehicles').select('id,make,model,license_plate').order('license_plate').limit(200),
    ])
    setTires((t.data || []) as TireEntry[])
    setCustomers(c.data || [])
    setVehicles(v.data || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const openNew = () => { setForm({ season: 'winter', status: 'stored' }); setModalOpen(true) }

  const handleSave = async () => {
    if (!form.season) { toast('Szezon kötelező', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('tire_hotel').insert(form)
    error ? toast('Hiba: ' + error.message, 'error') : (toast('Gumiszett rögzítve'), setModalOpen(false), load())
    setSaving(false)
  }

  const updateStatus = async (id: string, status: string) => {
    const update: any = { status }
    if (status === 'issued') update.issued_at = new Date().toISOString()
    await supabase.from('tire_hotel').update(update).eq('id', id)
    toast('Státusz frissítve')
    load()
  }

  const filtered = filterStatus === 'all' ? tires : tires.filter(t => t.status === filterStatus)
  const minTread = (t: TireEntry) => Math.min(t.tread_depth_fl || 99, t.tread_depth_fr || 99, t.tread_depth_rl || 99, t.tread_depth_rr || 99)

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button variant="primary" onClick={openNew}><Plus size={14} /> Új gumiszett</Button>
        <div className="flex gap-1 ml-auto">
          {['all','stored','issued','mounted'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${filterStatus === s ? 'bg-[#0B1E3D] text-white' : 'text-[#5a6a80] hover:bg-[#F4F5F7]'}`}>
              {s === 'all' ? 'Mind' : TIRE_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>
      {loading ? <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div> : (
        <div className="bg-white border border-[rgba(11,30,61,0.08)] rounded-xl overflow-hidden">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#F4F5F7] border-b border-[rgba(11,30,61,0.10)]">
                {['Ügyfél','Rendszám','Szezon','Méret','DOT','Profil (min)','Státusz',''].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold text-[#5a6a80] uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const mt = minTread(t)
                return (
                  <tr key={t.id} className="border-b border-[rgba(11,30,61,0.06)] hover:bg-[#fafbfc]">
                    <td className="px-3 py-2.5 font-medium text-[#0B1E3D]">{(t as any).customer?.full_name || '–'}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">{(t as any).vehicle?.license_plate || '–'}</td>
                    <td className="px-3 py-2.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${SEASON_COLORS[t.season] || 'bg-gray-100 text-gray-600'}`}>{SEASON_LABELS[t.season] || t.season}</span></td>
                    <td className="px-3 py-2.5">{t.tire_size || '–'}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">{t.dot || '–'}</td>
                    <td className="px-3 py-2.5">{mt < 99 ? <span className={`font-semibold ${mt < 3 ? 'text-red-700' : mt < 4 ? 'text-yellow-700' : 'text-green-700'}`}>{mt} mm</span> : '–'}</td>
                    <td className="px-3 py-2.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TIRE_STATUS_COLORS[t.status] || ''}`}>{TIRE_STATUS_LABELS[t.status] || t.status}</span></td>
                    <td className="px-3 py-2.5">
                      <select value={t.status} onChange={e => updateStatus(t.id, e.target.value)}
                        className="text-[11px] px-2 py-1 border border-[rgba(11,30,61,0.15)] rounded-lg bg-white outline-none">
                        {Object.entries(TIRE_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-10 text-[#8fa0b5] text-sm">Nincs találat</div>}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Új gumiszett"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup><FormLabel>Ügyfél</FormLabel>
            <Select value={form.customer_id || ''} onChange={e => setForm((f: any) => ({ ...f, customer_id: e.target.value || null }))}>
              <option value="">– Válasszon –</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup><FormLabel>Jármű</FormLabel>
            <Select value={form.vehicle_id || ''} onChange={e => setForm((f: any) => ({ ...f, vehicle_id: e.target.value || null }))}>
              <option value="">– Válasszon –</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.license_plate} – {v.make} {v.model}</option>)}
            </Select>
          </FormGroup>
          <FormGroup><FormLabel>Szezon *</FormLabel>
            <Select value={form.season || 'winter'} onChange={e => setForm((f: any) => ({ ...f, season: e.target.value }))}>
              <option value="winter">Téli</option><option value="summer">Nyári</option><option value="allseason">Négyévszakos</option>
            </Select>
          </FormGroup>
          <FormGroup><FormLabel>Méret</FormLabel><Input value={form.tire_size || ''} onChange={e => setForm((f: any) => ({ ...f, tire_size: e.target.value }))} placeholder="205/55 R16" /></FormGroup>
          <FormGroup><FormLabel>DOT</FormLabel><Input value={form.dot || ''} onChange={e => setForm((f: any) => ({ ...f, dot: e.target.value }))} placeholder="2223" /></FormGroup>
          <FormGroup><FormLabel>Tároló helye</FormLabel><Input value={form.storage_location || ''} onChange={e => setForm((f: any) => ({ ...f, storage_location: e.target.value }))} /></FormGroup>
          <FormGroup><FormLabel>Polc</FormLabel><Input value={form.storage_shelf || ''} onChange={e => setForm((f: any) => ({ ...f, storage_shelf: e.target.value }))} /></FormGroup>
          <FormGroup><FormLabel>Sor</FormLabel><Input value={form.storage_row || ''} onChange={e => setForm((f: any) => ({ ...f, storage_row: e.target.value }))} /></FormGroup>
          <p className="col-span-2 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wide">Profilmélység (mm)</p>
          {[['tread_depth_fl','BJ'],['tread_depth_fr','JJ'],['tread_depth_rl','BH'],['tread_depth_rr','JH']].map(([field, label]) => (
            <FormGroup key={field}><FormLabel>{label}</FormLabel><Input type="number" step="0.1" value={(form as any)[field] || ''} onChange={e => setForm((f: any) => ({ ...f, [field]: parseFloat(e.target.value) || null }))} /></FormGroup>
          ))}
          <p className="col-span-2 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wide">Nyomás (bar)</p>
          {[['pressure_fl','BJ'],['pressure_fr','JJ'],['pressure_rl','BH'],['pressure_rr','JH']].map(([field, label]) => (
            <FormGroup key={field}><FormLabel>{label}</FormLabel><Input type="number" step="0.1" value={(form as any)[field] || ''} onChange={e => setForm((f: any) => ({ ...f, [field]: parseFloat(e.target.value) || null }))} /></FormGroup>
          ))}
          <FormGroup className="col-span-2"><FormLabel>Megjegyzés</FormLabel><Textarea value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} className="min-h-[56px]" /></FormGroup>
        </div>
      </Modal>
    </div>
  )
}

// ─── Tab 8: Profit Kalkuláció ─────────────────────────────────────────────────

function ProfitTab({ supabase }: any) {
  const [services, setServices] = useState<any[]>([])
  const [topSvcs, setTopSvcs] = useState<any[]>([])
  const [calc, setCalc] = useState({ service_id: '', labor_hours: 2, parts_cost: 0, travel_km: 0 })

  useEffect(() => {
    (async () => {
      const [svcRes, woRes] = await Promise.all([
        supabase.from('services').select('id,name,base_price,hourly_rate').eq('is_active', true).order('name'),
        supabase.from('work_orders').select('service_type,total_amount').not('total_amount', 'is', null).limit(500),
      ])
      setServices(svcRes.data || [])
      // Aggregate top services by avg revenue
      const agg: Record<string, { total: number; count: number }> = {}
      for (const w of (woRes.data || [])) {
        if (!w.service_type) continue
        if (!agg[w.service_type]) agg[w.service_type] = { total: 0, count: 0 }
        agg[w.service_type].total += w.total_amount || 0
        agg[w.service_type].count++
      }
      const sorted = Object.entries(agg).map(([name, { total, count }]) => ({ name, avg: total / count, count }))
        .sort((a, b) => b.avg - a.avg).slice(0, 8)
      setTopSvcs(sorted)
    })()
  }, [])

  const labor     = calc.labor_hours * 125
  const travel    = calc.travel_km * 0.90
  const partsRev  = calc.parts_cost
  const revenue   = labor + travel + partsRev
  const partsCost = calc.parts_cost / 1.3
  const techCost  = calc.labor_hours * 65
  const travelCost = calc.travel_km * 0.30
  const totalCost  = partsCost + techCost + travelCost
  const profit     = revenue - totalCost
  const profitPct  = revenue > 0 ? (profit / revenue * 100) : 0
  const profitColor = profitPct > 30 ? 'text-green-600' : profitPct >= 10 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Inputs */}
        <div className="bg-white border border-[rgba(11,30,61,0.08)] rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-[13px] text-[#0B1E3D]">Kalkulátor</h3>
          <FormGroup><FormLabel>Szolgáltatás</FormLabel>
            <Select value={calc.service_id} onChange={e => setCalc(c => ({ ...c, service_id: e.target.value }))}>
              <option value="">– Válasszon –</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup><FormLabel>Munkaidő (óra)</FormLabel>
            <Input type="number" step="0.5" min="0" value={calc.labor_hours} onChange={e => setCalc(c => ({ ...c, labor_hours: parseFloat(e.target.value) || 0 }))} />
          </FormGroup>
          <FormGroup><FormLabel>Alkatrész eladási ár (CHF)</FormLabel>
            <Input type="number" step="1" min="0" value={calc.parts_cost} onChange={e => setCalc(c => ({ ...c, parts_cost: parseFloat(e.target.value) || 0 }))} />
          </FormGroup>
          <FormGroup><FormLabel>Kiszállás (km)</FormLabel>
            <Input type="number" step="1" min="0" value={calc.travel_km} onChange={e => setCalc(c => ({ ...c, travel_km: parseFloat(e.target.value) || 0 }))} />
          </FormGroup>
        </div>

        {/* Results */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Revenue column */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h4 className="text-[11px] font-semibold text-green-700 uppercase tracking-wide mb-3">Bevétel</h4>
              <div className="space-y-2">
                {[
                  ['Munkadíj', formatCurrency(labor)],
                  ['Kiszállási díj', formatCurrency(travel)],
                  ['Alkatrész', formatCurrency(partsRev)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-[12px]">
                    <span className="text-green-800">{l}</span><span className="font-semibold text-green-900">{v}</span>
                  </div>
                ))}
                <div className="pt-1 border-t border-green-200 flex justify-between text-[13px]">
                  <span className="font-semibold text-green-800">Összesen</span>
                  <span className="font-bold text-green-900">{formatCurrency(revenue)}</span>
                </div>
              </div>
            </div>
            {/* Cost column */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h4 className="text-[11px] font-semibold text-red-700 uppercase tracking-wide mb-3">Költség</h4>
              <div className="space-y-2">
                {[
                  ['Alkatrész bsz.', formatCurrency(partsCost)],
                  ['Technikus', formatCurrency(techCost)],
                  ['Kiszállás', formatCurrency(travelCost)],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between text-[12px]">
                    <span className="text-red-800">{l}</span><span className="font-semibold text-red-900">{v}</span>
                  </div>
                ))}
                <div className="pt-1 border-t border-red-200 flex justify-between text-[13px]">
                  <span className="font-semibold text-red-800">Összesen</span>
                  <span className="font-bold text-red-900">{formatCurrency(totalCost)}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Profit card */}
          <div className="bg-[#0B1E3D] rounded-xl p-4 text-center">
            <p className="text-white/50 text-[11px] uppercase tracking-wide mb-1">Profit</p>
            <p className={`text-[36px] font-bold ${profit >= 0 ? 'text-[#C9A84C]' : 'text-[#C9384C]'}`}>{formatCurrency(profit)}</p>
            <p className={`text-[16px] font-semibold mt-1 ${profitColor}`}>{profitPct.toFixed(1)}%</p>
            <p className="text-white/30 text-[11px] mt-1">125 CHF/h munkadíj · 65 CHF/h technikus ktg.</p>
          </div>
        </div>
      </div>

      {/* Top profit services */}
      {topSvcs.length > 0 && (
        <div className="bg-white border border-[rgba(11,30,61,0.08)] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[rgba(11,30,61,0.06)]">
            <h3 className="font-semibold text-[13px] text-[#0B1E3D] flex items-center gap-2"><TrendingUp size={15} /> Top profitot termelő szolgáltatások</h3>
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-[#F4F5F7] border-b border-[rgba(11,30,61,0.08)]">
                <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-[#5a6a80] uppercase">Szolgáltatás</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-[#5a6a80] uppercase">Átl. bevétel</th>
                <th className="text-right px-4 py-2.5 text-[10px] font-semibold text-[#5a6a80] uppercase">Darab</th>
              </tr>
            </thead>
            <tbody>
              {topSvcs.map(s => (
                <tr key={s.name} className="border-b border-[rgba(11,30,61,0.06)] hover:bg-[#fafbfc]">
                  <td className="px-4 py-2.5 font-medium text-[#0B1E3D]">{s.name}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#C9A84C]">{formatCurrency(s.avg)}</td>
                  <td className="px-4 py-2.5 text-right text-[#5a6a80]">{s.count}×</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
