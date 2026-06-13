'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import {
  Package, Search, Plus, RefreshCw, Edit2, Trash2,
  ArrowRight, ShoppingCart, TrendingUp, AlertTriangle,
  CheckCircle, Clock, Archive, ChevronRight,
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

// ─── Types ──────────────────────────────────────────────────────────────────

type PartStatus = 'in_stock' | 'ordered' | 'arrived' | 'used' | 'low_stock'
type PartCategory = 'Gumi' | 'Fék' | 'Olaj' | 'Szűrő' | 'Motor' | 'Elektromos' | 'Karosszéria' | 'Egyéb'

interface Part {
  id: string
  name: string
  article_number: string | null
  manufacturer: string | null
  supplier: string | null
  purchase_price: number | null
  sale_price: number | null
  margin_percent: number | null
  stock_quantity: number
  category: PartCategory | null
  status: PartStatus
  work_order_id: string | null
  work_order: { order_number: string } | null
  expected_arrival: string | null
  notes: string | null
  created_at: string
}

interface WorkOrder {
  id: string
  order_number: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_META: Record<PartStatus, { label: string; color: string; icon: React.ReactNode }> = {
  in_stock:  { label: 'Készleten',   color: 'bg-green-100 text-green-700',  icon: <CheckCircle size={11} /> },
  ordered:   { label: 'Megrendelve', color: 'bg-blue-100 text-blue-700',    icon: <Clock size={11} /> },
  arrived:   { label: 'Megérkezett', color: 'bg-yellow-100 text-yellow-700',icon: <Package size={11} /> },
  used:      { label: 'Felhasználva', color: 'bg-gray-100 text-gray-600',   icon: <Archive size={11} /> },
  low_stock: { label: 'Alacsony',    color: 'bg-red-100 text-red-700',      icon: <AlertTriangle size={11} /> },
}

const STATUS_FLOW: Record<PartStatus, PartStatus | null> = {
  in_stock:  'ordered',
  ordered:   'arrived',
  arrived:   'used',
  used:      null,
  low_stock: 'ordered',
}

const CATEGORIES: PartCategory[] = ['Gumi', 'Fék', 'Olaj', 'Szűrő', 'Motor', 'Elektromos', 'Karosszéria', 'Egyéb']

const EMPTY_FORM = {
  name: '',
  article_number: '',
  manufacturer: '',
  supplier: '',
  purchase_price: '',
  sale_price: '',
  margin_percent: '',
  stock_quantity: '1',
  category: '' as PartCategory | '',
  status: 'in_stock' as PartStatus,
  work_order_id: '',
  expected_arrival: '',
  notes: '',
}

type FormState = typeof EMPTY_FORM

// ─── Component ───────────────────────────────────────────────────────────────

export function PartsInventoryPage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const [parts, setParts] = useState<Part[]>([])
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | PartStatus>('all')
  const [filterCategory, setFilterCategory] = useState<'all' | PartCategory>('all')
  const [activeView, setActiveView] = useState<'inventory' | 'purchase'>('inventory')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<Part | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // ── Data loading ────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: partsData }, { data: woData }] = await Promise.all([
      supabase
        .from('parts_inventory')
        .select('*, work_order:work_orders(order_number)')
        .order('created_at', { ascending: false }),
      supabase
        .from('work_orders')
        .select('id, order_number')
        .not('status', 'in', '(delivered,closed,cancelled)'),
    ])
    setParts((partsData as any) || [])
    setWorkOrders(woData || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  // ── Derived stats ────────────────────────────────────────────────────────────

  const totalParts    = parts.length
  const inStockCount  = parts.filter(p => p.status === 'in_stock').length
  const orderedCount  = parts.filter(p => p.status === 'ordered').length
  const arrivedCount  = parts.filter(p => p.status === 'arrived').length
  const lowStockCount = parts.filter(p => p.status === 'low_stock').length

  const totalMarginCHF = parts.reduce((sum, p) => {
    if (p.sale_price != null && p.purchase_price != null) {
      return sum + (p.sale_price - p.purchase_price) * (p.stock_quantity || 0)
    }
    return sum
  }, 0)

  // ── Filtering ────────────────────────────────────────────────────────────────

  const filtered = parts.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    if (filterCategory !== 'all' && p.category !== filterCategory) return false
    if (search) {
      const s = search.toLowerCase()
      return (
        (p.name || '').toLowerCase().includes(s) ||
        (p.article_number || '').toLowerCase().includes(s) ||
        (p.manufacturer || '').toLowerCase().includes(s) ||
        (p.supplier || '').toLowerCase().includes(s)
      )
    }
    return true
  })

  // ── Purchase list: ordered/arrived grouped by supplier ──────────────────────

  const purchaseParts = parts.filter(p => p.status === 'ordered' || p.status === 'arrived')
  const purchaseBySupplier: Record<string, { parts: Part[]; total: number }> = {}
  for (const p of purchaseParts) {
    const key = p.supplier || '– Ismeretlen szállító –'
    if (!purchaseBySupplier[key]) purchaseBySupplier[key] = { parts: [], total: 0 }
    purchaseBySupplier[key].parts.push(p)
    purchaseBySupplier[key].total += (p.purchase_price || 0) * (p.stock_quantity || 0)
  }

  // ── Form helpers ─────────────────────────────────────────────────────────────

  const recalcMargin = (purchase: string, sale: string) => {
    const pp = parseFloat(purchase)
    const sp = parseFloat(sale)
    if (!isNaN(pp) && !isNaN(sp) && sp > 0) {
      return (((sp - pp) / sp) * 100).toFixed(1)
    }
    return ''
  }

  const setField = (key: keyof FormState, value: string) => {
    setForm(prev => {
      const next = { ...prev, [key]: value }
      if (key === 'purchase_price' || key === 'sale_price') {
        const pp = key === 'purchase_price' ? value : prev.purchase_price
        const sp = key === 'sale_price'     ? value : prev.sale_price
        next.margin_percent = recalcMargin(pp, sp)
      }
      return next
    })
  }

  const openCreate = () => {
    setEditItem(null)
    setForm(EMPTY_FORM)
    setModalOpen(true)
  }

  const openEdit = (item: Part) => {
    setEditItem(item)
    setForm({
      name:             item.name || '',
      article_number:   item.article_number || '',
      manufacturer:     item.manufacturer || '',
      supplier:         item.supplier || '',
      purchase_price:   item.purchase_price != null ? String(item.purchase_price) : '',
      sale_price:       item.sale_price != null ? String(item.sale_price) : '',
      margin_percent:   item.margin_percent != null ? String(item.margin_percent) : '',
      stock_quantity:   String(item.stock_quantity ?? 1),
      category:         item.category || '',
      status:           item.status,
      work_order_id:    item.work_order_id || '',
      expected_arrival: item.expected_arrival || '',
      notes:            item.notes || '',
    })
    setModalOpen(true)
  }

  // ── Save ─────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.name.trim()) { toast('Az alkatrész neve kötelező', 'error'); return }
    setSaving(true)

    const payload: any = {
      name:             form.name.trim(),
      article_number:   form.article_number.trim() || null,
      manufacturer:     form.manufacturer.trim() || null,
      supplier:         form.supplier.trim() || null,
      purchase_price:   form.purchase_price !== '' ? parseFloat(form.purchase_price) : null,
      sale_price:       form.sale_price !== '' ? parseFloat(form.sale_price) : null,
      margin_percent:   form.margin_percent !== '' ? parseFloat(form.margin_percent) : null,
      stock_quantity:   parseInt(form.stock_quantity) || 0,
      category:         form.category || null,
      status:           form.status,
      work_order_id:    form.work_order_id || null,
      expected_arrival: form.expected_arrival || null,
      notes:            form.notes.trim() || null,
    }

    const { error } = editItem
      ? await supabase.from('parts_inventory').update(payload).eq('id', editItem.id)
      : await supabase.from('parts_inventory').insert(payload)

    if (error) {
      toast('Hiba: ' + error.message, 'error')
    } else {
      toast(editItem ? 'Alkatrész frissítve' : 'Alkatrész hozzáadva')
      setModalOpen(false)
      load()
      onRefresh()
    }
    setSaving(false)
  }

  // ── Quick status advance ──────────────────────────────────────────────────────

  const advanceStatus = async (p: Part) => {
    const next = STATUS_FLOW[p.status]
    if (!next) return
    const { error } = await supabase
      .from('parts_inventory')
      .update({ status: next })
      .eq('id', p.id)
    if (error) toast('Hiba: ' + error.message, 'error')
    else { toast(`Státusz: ${STATUS_META[next].label}`); load() }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Biztosan törlöd?')) return
    const { error } = await supabase.from('parts_inventory').delete().eq('id', id)
    if (error) toast('Hiba: ' + error.message, 'error')
    else { toast('Törölve'); load() }
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in space-y-4">

      {/* Stats bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Összes alkatrész', value: totalParts,    color: 'text-[#0D0D0D]', bg: 'bg-[#F4F5F7]' },
          { label: 'Készleten',        value: inStockCount,  color: 'text-green-700',  bg: 'bg-green-50' },
          { label: 'Megrendelve',      value: orderedCount,  color: 'text-blue-700',   bg: 'bg-blue-50' },
          { label: 'Megérkezett',      value: arrivedCount,  color: 'text-yellow-700', bg: 'bg-yellow-50' },
          { label: 'Alacsony készlet', value: lowStockCount, color: 'text-red-700',    bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
            <div className={`text-[22px] font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-[#4a4a4a]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Profit summary strip */}
      <div className="flex items-center gap-3 bg-white border border-[rgba(0,0,0,0.10)] rounded-xl px-4 py-3">
        <TrendingUp size={16} className="text-[#C8102E] shrink-0" />
        <span className="text-[12px] text-[#4a4a4a]">Teljes árrés (készleten lévő alkatrészek):</span>
        <span className="text-[14px] font-bold text-[#16a34a]">{formatCurrency(totalMarginCHF)}</span>
        <div className="ml-auto flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { load(); onRefresh() }}
          >
            <RefreshCw size={13} /> Frissítés
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <Plus size={13} /> Új alkatrész
          </Button>
        </div>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 border-b border-[rgba(0,0,0,0.10)]">
        {(['inventory', 'purchase'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveView(tab)}
            className={`px-4 py-2 text-[12px] font-semibold border-b-2 transition-colors ${
              activeView === tab
                ? 'border-[#C8102E] text-[#0D0D0D]'
                : 'border-transparent text-[#4a4a4a] hover:text-[#0D0D0D]'
            }`}
          >
            {tab === 'inventory' ? 'Készletlista' : 'Megrendelési lista'}
            {tab === 'purchase' && purchaseParts.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full font-bold">
                {purchaseParts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── INVENTORY VIEW ── */}
      {activeView === 'inventory' && (
        <>
          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Név, cikkszám, gyártó..."
                className="w-full pl-9 pr-3 py-2 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0D0D0D]"
              />
            </div>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0D0D0D]"
            >
              <option value="all">Minden státusz</option>
              {(Object.entries(STATUS_META) as [PartStatus, typeof STATUS_META[PartStatus]][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as any)}
              className="px-3 py-2 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0D0D0D]"
            >
              <option value="all">Minden kategória</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {loading ? (
            <div className="text-center py-12 text-[#4a4a4a] text-sm">Betöltés...</div>
          ) : (
            <Card className="p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="bg-[#F4F5F7] border-b border-[rgba(0,0,0,0.10)]">
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">Név</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase hidden lg:table-cell">Cikkszám</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase hidden lg:table-cell">Gyártó</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase hidden md:table-cell">Kategória</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase hidden md:table-cell">Bsz. ár</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase hidden md:table-cell">Elad. ár</th>
                      <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase hidden md:table-cell">Haszonkulcs%</th>
                      <th className="text-center px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">Készlet</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">Státusz</th>
                      <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase hidden lg:table-cell">Munkalap</th>
                      <th className="px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase text-right">Műveletek</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => {
                      const sm = STATUS_META[p.status]
                      const nextStatus = STATUS_FLOW[p.status]
                      return (
                        <tr key={p.id} className="border-b border-[rgba(0,0,0,0.06)] hover:bg-[#fafbfc]">
                          {/* Name */}
                          <td className="px-4 py-3">
                            <div className="font-medium text-[#0D0D0D]">{p.name}</div>
                            {p.manufacturer && (
                              <div className="text-[11px] text-[#888888]">{p.manufacturer}</div>
                            )}
                          </td>
                          {/* Article # */}
                          <td className="px-4 py-3 hidden lg:table-cell">
                            <span className="font-mono text-[12px] text-[#4a4a4a]">{p.article_number || '–'}</span>
                          </td>
                          {/* Manufacturer */}
                          <td className="px-4 py-3 hidden lg:table-cell text-[12px] text-[#4a4a4a]">
                            {p.manufacturer || '–'}
                          </td>
                          {/* Category */}
                          <td className="px-4 py-3 hidden md:table-cell">
                            {p.category ? (
                              <span className="text-[11px] px-2 py-0.5 bg-[#F4F5F7] text-[#4a4a4a] rounded-full font-medium">
                                {p.category}
                              </span>
                            ) : '–'}
                          </td>
                          {/* Purchase price */}
                          <td className="px-4 py-3 text-right hidden md:table-cell text-[12px] text-[#4a4a4a]">
                            {p.purchase_price != null ? formatCurrency(p.purchase_price) : '–'}
                          </td>
                          {/* Sale price */}
                          <td className="px-4 py-3 text-right hidden md:table-cell font-semibold text-[#0D0D0D]">
                            {p.sale_price != null ? formatCurrency(p.sale_price) : '–'}
                          </td>
                          {/* Margin */}
                          <td className="px-4 py-3 text-right hidden md:table-cell">
                            {p.margin_percent != null ? (
                              <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${
                                p.margin_percent >= 30 ? 'bg-green-100 text-green-700'
                                : p.margin_percent >= 10 ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                              }`}>
                                {p.margin_percent.toFixed(1)}%
                              </span>
                            ) : '–'}
                          </td>
                          {/* Stock qty */}
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold text-[14px] ${
                              p.stock_quantity === 0 ? 'text-[#C8102E]'
                              : p.stock_quantity <= 2 ? 'text-amber-600'
                              : 'text-[#0D0D0D]'
                            }`}>
                              {p.stock_quantity}
                            </span>
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sm.color}`}>
                              {sm.icon}
                              {sm.label}
                            </span>
                            {p.status === 'ordered' && p.expected_arrival && (
                              <div className="text-[10px] text-[#888888] mt-0.5">
                                Várható: {formatDate(p.expected_arrival)}
                              </div>
                            )}
                          </td>
                          {/* Work order */}
                          <td className="px-4 py-3 hidden lg:table-cell">
                            {p.work_order ? (
                              <span className="font-mono text-[12px] text-[#0D0D0D]">{p.work_order.order_number}</span>
                            ) : '–'}
                          </td>
                          {/* Actions */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              {nextStatus && (
                                <button
                                  onClick={() => advanceStatus(p)}
                                  title={`→ ${STATUS_META[nextStatus].label}`}
                                  className={`flex items-center gap-0.5 px-2 py-1 text-[10px] font-semibold rounded hover:opacity-80 transition-opacity ${STATUS_META[nextStatus].color}`}
                                >
                                  <ArrowRight size={10} />
                                  {STATUS_META[nextStatus].label}
                                </button>
                              )}
                              <button
                                onClick={() => openEdit(p)}
                                className="p-1.5 text-[#4a4a4a] hover:text-[#0D0D0D] transition-colors"
                                title="Szerkesztés"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(p.id)}
                                className="p-1.5 text-[#4a4a4a] hover:text-[#C8102E] transition-colors"
                                title="Törlés"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="text-center py-10 text-[#888888] text-sm">
                    {search || filterStatus !== 'all' || filterCategory !== 'all'
                      ? 'Nincs találat a szűrési feltételekre'
                      : 'Még nincs alkatrész a készletben'}
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── PURCHASE LIST VIEW ── */}
      {activeView === 'purchase' && (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-[#4a4a4a] text-sm">Betöltés...</div>
          ) : Object.keys(purchaseBySupplier).length === 0 ? (
            <Card>
              <div className="text-center py-10 text-[#888888] text-sm">
                Nincsenek megrendelés alatt álló alkatrészek
              </div>
            </Card>
          ) : (
            Object.entries(purchaseBySupplier).map(([supplier, group]) => (
              <Card key={supplier} className="p-0 overflow-hidden">
                {/* Supplier header */}
                <div className="flex items-center justify-between px-4 py-3 bg-[#F4F5F7] border-b border-[rgba(0,0,0,0.10)]">
                  <div className="flex items-center gap-2">
                    <ShoppingCart size={15} className="text-[#C8102E]" />
                    <span className="font-semibold text-[13px] text-[#0D0D0D]">{supplier}</span>
                    <span className="text-[11px] text-[#4a4a4a]">{group.parts.length} tétel</span>
                  </div>
                  <span className="font-bold text-[13px] text-[#0D0D0D]">
                    Összesen: {formatCurrency(group.total)}
                  </span>
                </div>
                {/* Parts rows */}
                <table className="w-full text-[13px]">
                  <tbody>
                    {group.parts.map(p => {
                      const sm = STATUS_META[p.status]
                      return (
                        <tr key={p.id} className="border-b border-[rgba(0,0,0,0.06)] last:border-0 hover:bg-[#fafbfc]">
                          <td className="px-4 py-3">
                            <div className="font-medium text-[#0D0D0D]">{p.name}</div>
                            {p.article_number && (
                              <div className="font-mono text-[11px] text-[#888888]">#{p.article_number}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {p.category && (
                              <span className="text-[11px] px-2 py-0.5 bg-[#F4F5F7] text-[#4a4a4a] rounded-full">
                                {p.category}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-[#0D0D0D]">{p.stock_quantity} db</span>
                          </td>
                          <td className="px-4 py-3 text-right hidden md:table-cell text-[12px] text-[#4a4a4a]">
                            {p.purchase_price != null ? formatCurrency(p.purchase_price) + ' / db' : '–'}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[#0D0D0D]">
                            {p.purchase_price != null
                              ? formatCurrency(p.purchase_price * (p.stock_quantity || 0))
                              : '–'}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sm.color}`}>
                              {sm.icon}
                              {sm.label}
                            </span>
                            {p.expected_arrival && (
                              <div className="text-[10px] text-[#888888] mt-0.5">
                                Várható: {formatDate(p.expected_arrival)}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {STATUS_FLOW[p.status] && (
                              <button
                                onClick={() => advanceStatus(p)}
                                className="flex items-center gap-1 ml-auto text-[11px] text-[#0D0D0D] hover:text-[#C8102E] font-semibold transition-colors"
                              >
                                <ChevronRight size={13} />
                                {STATUS_META[STATUS_FLOW[p.status]!].label}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Card>
            ))
          )}

          {/* Grand total */}
          {Object.keys(purchaseBySupplier).length > 0 && (
            <div className="flex items-center justify-end gap-3 px-2">
              <span className="text-[12px] text-[#4a4a4a] font-semibold uppercase tracking-wide">
                Teljes megrendelési értéke:
              </span>
              <span className="text-[16px] font-bold text-[#0D0D0D]">
                {formatCurrency(purchaseParts.reduce((s, p) => s + (p.purchase_price || 0) * (p.stock_quantity || 0), 0))}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── MODAL ── */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Alkatrész szerkesztése' : 'Új alkatrész'}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Mentés...' : 'Mentés'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-0">
          {/* Name */}
          <FormGroup className="col-span-2">
            <FormLabel>Alkatrész neve *</FormLabel>
            <Input
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="pl. Első fékbetét készlet"
            />
          </FormGroup>

          {/* Article + Manufacturer */}
          <FormGroup>
            <FormLabel>Cikkszám</FormLabel>
            <Input
              value={form.article_number}
              onChange={e => setField('article_number', e.target.value)}
              placeholder="OEM / gyári szám"
            />
          </FormGroup>
          <FormGroup>
            <FormLabel>Gyártó</FormLabel>
            <Input
              value={form.manufacturer}
              onChange={e => setField('manufacturer', e.target.value)}
              placeholder="pl. Bosch"
            />
          </FormGroup>

          {/* Supplier */}
          <FormGroup>
            <FormLabel>Szállító</FormLabel>
            <Input
              value={form.supplier}
              onChange={e => setField('supplier', e.target.value)}
              placeholder="pl. AutoTeile AG"
            />
          </FormGroup>

          {/* Category */}
          <FormGroup>
            <FormLabel>Kategória</FormLabel>
            <Select
              value={form.category}
              onChange={e => setField('category', e.target.value)}
            >
              <option value="">– Válasszon –</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormGroup>

          {/* Prices */}
          <FormGroup>
            <FormLabel>Bsz. ár (CHF)</FormLabel>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.purchase_price}
              onChange={e => setField('purchase_price', e.target.value)}
              placeholder="0.00"
            />
          </FormGroup>
          <FormGroup>
            <FormLabel>Eladási ár (CHF)</FormLabel>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.sale_price}
              onChange={e => setField('sale_price', e.target.value)}
              placeholder="0.00"
            />
          </FormGroup>

          {/* Margin (read-only display) */}
          {form.margin_percent !== '' && (
            <FormGroup className="col-span-2">
              <div className="flex items-center gap-2 text-[12px] text-[#4a4a4a]">
                <TrendingUp size={13} className="text-[#16a34a]" />
                Haszonkulcs:{' '}
                <span className={`font-bold ${parseFloat(form.margin_percent) >= 20 ? 'text-[#16a34a]' : 'text-amber-600'}`}>
                  {parseFloat(form.margin_percent).toFixed(1)}%
                </span>
              </div>
            </FormGroup>
          )}

          {/* Stock + Status */}
          <FormGroup>
            <FormLabel>Készlet (db)</FormLabel>
            <Input
              type="number"
              min="0"
              value={form.stock_quantity}
              onChange={e => setField('stock_quantity', e.target.value)}
            />
          </FormGroup>
          <FormGroup>
            <FormLabel>Státusz</FormLabel>
            <Select value={form.status} onChange={e => setField('status', e.target.value)}>
              {(Object.entries(STATUS_META) as [PartStatus, typeof STATUS_META[PartStatus]][]).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </Select>
          </FormGroup>

          {/* Expected arrival (only when ordered) */}
          {form.status === 'ordered' && (
            <FormGroup>
              <FormLabel>Várható érkezés</FormLabel>
              <Input
                type="date"
                value={form.expected_arrival}
                onChange={e => setField('expected_arrival', e.target.value)}
              />
            </FormGroup>
          )}

          {/* Work order */}
          <FormGroup className={form.status === 'ordered' ? '' : 'col-span-2'}>
            <FormLabel>Munkalap</FormLabel>
            <Select
              value={form.work_order_id}
              onChange={e => setField('work_order_id', e.target.value)}
            >
              <option value="">– Nincs kapcsolva –</option>
              {workOrders.map(wo => (
                <option key={wo.id} value={wo.id}>{wo.order_number}</option>
              ))}
            </Select>
          </FormGroup>

          {/* Notes */}
          <FormGroup className="col-span-2">
            <FormLabel>Megjegyzés</FormLabel>
            <Textarea
              value={form.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Egyéb megjegyzések..."
              className="min-h-[60px]"
            />
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
