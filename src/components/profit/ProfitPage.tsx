'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormGroup, FormLabel } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import {
  TrendingUp, TrendingDown, DollarSign, Percent,
  ChevronDown, ChevronUp, RefreshCw, Edit2, Check, X,
  Wrench, Car, Fuel, Package, MapPin
} from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

type Period = 'Ma' | 'Hét' | 'Hónap' | 'Év'

const PERIOD_LABELS: Period[] = ['Ma', 'Hét', 'Hónap', 'Év']

function getPeriodStart(period: Period): string {
  const now = new Date()
  switch (period) {
    case 'Ma': {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d.toISOString()
    }
    case 'Hét': {
      const d = new Date(now); d.setDate(d.getDate() - 7); d.setHours(0, 0, 0, 0); return d.toISOString()
    }
    case 'Hónap': {
      const d = new Date(now.getFullYear(), now.getMonth(), 1); return d.toISOString()
    }
    case 'Év': {
      const d = new Date(now.getFullYear(), 0, 1); return d.toISOString()
    }
  }
}

interface WorkOrder {
  id: string
  order_number: string
  service_type: string
  total_amount: number
  real_cost: number | null
  profit: number | null
  profit_percent: number | null
  labor_cost: number
  parts_cost: number
  travel_cost: number | null
  technician_hours: number | null
  fuel_cost: number | null
  created_at: string
  customer: { full_name: string } | null
  vehicle: { make: string; model: string; license_plate: string } | null
}

interface CostEditorState {
  technician_hours: string
  fuel_cost: string
  travel_cost: string
}

export function ProfitPage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const [period, setPeriod] = useState<Period>('Hónap')
  const [orders, setOrders] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [hourlyRate, setHourlyRate] = useState(85)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingCost, setEditingCost] = useState<Record<string, CostEditorState>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'services'>('overview')
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const periodStart = getPeriodStart(period)

    const [{ data: wo }, { data: settings }] = await Promise.all([
      supabase
        .from('work_orders')
        .select('*, customer:customers(full_name), vehicle:vehicles(make,model,license_plate)')
        .not('status', 'in', '(new_booking,cancelled)')
        .gte('created_at', periodStart)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('system_settings')
        .select('value')
        .eq('category', 'pricing')
        .eq('key', 'hourly_rate')
        .single(),
    ])

    setOrders((wo as any) || [])
    if (settings?.value) setHourlyRate(parseFloat(settings.value) || 85)
    setLoading(false)
  }, [period, refreshKey])

  useEffect(() => { load() }, [load])

  // KPI calculations
  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0)
  const totalCost = orders.reduce((s, o) => s + (o.real_cost || 0), 0)
  const totalProfit = totalRevenue - totalCost
  const profitPercent = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  // Revenue breakdown
  const laborRevenue = orders.reduce((s, o) => s + (o.labor_cost || 0), 0)
  const partsRevenue = orders.reduce((s, o) => s + (o.parts_cost || 0), 0)
  const travelRevenue = orders.reduce((s, o) => s + (o.travel_cost || 0), 0)
  const mobileCount = orders.filter(o => o.service_type === 'mobile').length
  const pickupCount = orders.filter(o => o.service_type === 'pickup').length

  // Service type breakdown
  const serviceGroups: Record<string, { revenue: number; cost: number; count: number }> = {}
  for (const o of orders) {
    const key = o.service_type || 'Egyéb'
    if (!serviceGroups[key]) serviceGroups[key] = { revenue: 0, cost: 0, count: 0 }
    serviceGroups[key].revenue += o.total_amount || 0
    serviceGroups[key].cost += o.real_cost || 0
    serviceGroups[key].count++
  }

  const startCostEdit = (o: WorkOrder) => {
    setEditingCost(prev => ({
      ...prev,
      [o.id]: {
        technician_hours: String(o.technician_hours ?? ''),
        fuel_cost: String(o.fuel_cost ?? ''),
        travel_cost: String(o.travel_cost ?? ''),
      }
    }))
    setExpandedId(o.id)
  }

  const cancelCostEdit = (id: string) => {
    setEditingCost(prev => { const n = { ...prev }; delete n[id]; return n })
    setExpandedId(null)
  }

  const saveCost = async (o: WorkOrder) => {
    const ed = editingCost[o.id]
    if (!ed) return
    setSavingId(o.id)

    const techHours = parseFloat(ed.technician_hours) || 0
    const fuelCost = parseFloat(ed.fuel_cost) || 0
    const travelCost = parseFloat(ed.travel_cost) || 0
    const partsCost = o.parts_cost || 0

    const real_cost = techHours * hourlyRate + fuelCost + travelCost + partsCost
    const profit = (o.total_amount || 0) - real_cost
    const profit_percent = (o.total_amount || 0) > 0 ? (profit / (o.total_amount || 0)) * 100 : 0

    const { error } = await supabase
      .from('work_orders')
      .update({
        real_cost,
        profit,
        profit_percent,
        technician_hours: techHours,
        fuel_cost: fuelCost,
        travel_cost: travelCost,
      })
      .eq('id', o.id)

    if (error) {
      toast('Hiba: ' + error.message, 'error')
    } else {
      toast('Önköltség mentve')
      cancelCostEdit(o.id)
      load()
    }
    setSavingId(null)
  }

  const updateInlineRealCost = async (o: WorkOrder, value: string) => {
    const real_cost = parseFloat(value)
    if (isNaN(real_cost)) return
    const profit = (o.total_amount || 0) - real_cost
    const profit_percent = (o.total_amount || 0) > 0 ? (profit / (o.total_amount || 0)) * 100 : 0
    const { error } = await supabase
      .from('work_orders')
      .update({ real_cost, profit, profit_percent })
      .eq('id', o.id)
    if (error) toast('Hiba: ' + error.message, 'error')
    else { toast('Mentve'); load() }
  }

  const kpis = [
    {
      label: 'Bruttó bevétel',
      value: formatCurrency(totalRevenue),
      icon: <DollarSign size={18} />,
      color: '#C8102E',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
    },
    {
      label: 'Összes költség',
      value: formatCurrency(totalCost),
      icon: <TrendingDown size={18} />,
      color: '#C8102E',
      bg: 'bg-red-50',
      text: 'text-red-700',
    },
    {
      label: 'Nettó profit',
      value: formatCurrency(totalProfit),
      icon: <TrendingUp size={18} />,
      color: '#16a34a',
      bg: 'bg-green-50',
      text: 'text-green-700',
    },
    {
      label: 'Profit %',
      value: profitPercent.toFixed(1) + '%',
      icon: <Percent size={18} />,
      color: '#0D0D0D',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
  ]

  return (
    <div className="animate-fade-in space-y-4">
      {/* Period tabs + refresh */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-white border border-[rgba(0,0,0,0.10)] rounded-xl p-1">
          {PERIOD_LABELS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                period === p
                  ? 'bg-[#0D0D0D] text-white'
                  : 'text-[#4a4a4a] hover:bg-[#F4F5F7]'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => { load(); onRefresh() }}>
          <RefreshCw size={13} /> Frissítés
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className={`${kpi.bg} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-wide">{kpi.label}</span>
              <span style={{ color: kpi.color }}>{kpi.icon}</span>
            </div>
            <div className={`text-[22px] font-bold ${kpi.text} leading-tight`}>{kpi.value}</div>
            <div className="text-[11px] text-[#4a4a4a] mt-0.5">{orders.length} munkalap</div>
          </div>
        ))}
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-1 border-b border-[rgba(0,0,0,0.10)]">
        {(['overview', 'orders', 'services'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-[12px] font-semibold border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-[#C8102E] text-[#0D0D0D]'
                : 'border-transparent text-[#4a4a4a] hover:text-[#0D0D0D]'
            }`}
          >
            {tab === 'overview' ? 'Áttekintés' : tab === 'orders' ? 'Munkalapok' : 'Szolgáltatások'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#4a4a4a] text-sm">Betöltés...</div>
      ) : (
        <>
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Revenue breakdown */}
              <Card>
                <CardTitle icon={<DollarSign size={14} />}>Bevétel bontás</CardTitle>
                <div className="space-y-2">
                  {[
                    { label: 'Munkadíj', value: laborRevenue, icon: <Wrench size={13} /> },
                    { label: 'Alkatrész árrés', value: partsRevenue, icon: <Package size={13} /> },
                    { label: 'Útköltség / Pickup díj', value: travelRevenue, icon: <MapPin size={13} /> },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.06)] last:border-0">
                      <div className="flex items-center gap-2 text-[13px] text-[#0D0D0D]">
                        <span className="text-[#C8102E]">{row.icon}</span>
                        {row.label}
                      </div>
                      <span className="font-semibold text-[13px] text-[#0D0D0D]">{formatCurrency(row.value)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[12px] font-bold text-[#0D0D0D] uppercase tracking-wide">Összesen</span>
                    <span className="font-bold text-[#C8102E]">{formatCurrency(totalRevenue)}</span>
                  </div>
                </div>
              </Card>

              {/* Cost breakdown */}
              <Card>
                <CardTitle icon={<TrendingDown size={14} />}>Költség bontás</CardTitle>
                <div className="space-y-2">
                  {[
                    { label: 'Alkatrész beszerzés', value: partsRevenue * 0.7, icon: <Package size={13} /> },
                    { label: 'Technikus munkaidő', value: orders.reduce((s, o) => s + (o.technician_hours || 0) * hourlyRate, 0), icon: <Wrench size={13} /> },
                    { label: 'Üzemanyag', value: orders.reduce((s, o) => s + (o.fuel_cost || 0), 0), icon: <Fuel size={13} /> },
                    { label: 'Útköltség', value: orders.reduce((s, o) => s + (o.travel_cost || 0), 0), icon: <MapPin size={13} /> },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.06)] last:border-0">
                      <div className="flex items-center gap-2 text-[13px] text-[#0D0D0D]">
                        <span className="text-[#C8102E]">{row.icon}</span>
                        {row.label}
                      </div>
                      <span className="font-semibold text-[13px] text-[#C8102E]">{formatCurrency(row.value)}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-[12px] font-bold text-[#0D0D0D] uppercase tracking-wide">Összesen</span>
                    <span className="font-bold text-[#C8102E]">{formatCurrency(totalCost)}</span>
                  </div>
                </div>
              </Card>

              {/* Profit summary */}
              <Card className="md:col-span-2">
                <CardTitle icon={<TrendingUp size={14} />}>Profit összefoglaló</CardTitle>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-amber-50 rounded-xl">
                    <div className="text-[11px] text-[#4a4a4a] uppercase font-semibold mb-1">Bevétel</div>
                    <div className="text-[20px] font-bold text-amber-700">{formatCurrency(totalRevenue)}</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-xl">
                    <div className="text-[11px] text-[#4a4a4a] uppercase font-semibold mb-1">Költség</div>
                    <div className="text-[20px] font-bold text-red-700">{formatCurrency(totalCost)}</div>
                  </div>
                  <div className={`text-center p-4 rounded-xl ${totalProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="text-[11px] text-[#4a4a4a] uppercase font-semibold mb-1">Nettó profit</div>
                    <div className={`text-[20px] font-bold ${totalProfit >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatCurrency(totalProfit)}
                    </div>
                    <div className={`text-[12px] font-semibold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitPercent.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* ORDERS TAB */}
          {activeTab === 'orders' && (
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F4F5F7] border-b border-[rgba(0,0,0,0.10)]">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">Munkalap</th>
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase hidden md:table-cell">Ügyfél / Jármű</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">Bevétel</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">Önköltség</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">Profit</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">%</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map(o => {
                    const profit = (o.total_amount || 0) - (o.real_cost || 0)
                    const pct = (o.total_amount || 0) > 0 ? (profit / (o.total_amount || 0)) * 100 : 0
                    const isExpanded = expandedId === o.id
                    const isEditing = !!editingCost[o.id]

                    return (
                      <>
                        <tr
                          key={o.id}
                          className={`border-b border-[rgba(0,0,0,0.06)] hover:bg-[#fafbfc] ${isExpanded ? 'bg-[#fafbfc]' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="font-mono font-semibold text-[#0D0D0D] text-[12px]">{o.order_number}</div>
                            <div className="text-[11px] text-[#888888]">{formatDate(o.created_at)}</div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            <div className="text-[13px] text-[#0D0D0D]">{o.customer?.full_name || '–'}</div>
                            <div className="text-[11px] text-[#888888]">
                              {o.vehicle ? `${o.vehicle.make} ${o.vehicle.model} · ${o.vehicle.license_plate}` : '–'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-[#0D0D0D]">
                            {formatCurrency(o.total_amount || 0)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {isEditing ? (
                              <span className="text-[11px] text-[#4a4a4a] italic">szerkesztés alatt</span>
                            ) : (
                              <button
                                onClick={() => startCostEdit(o)}
                                className="group flex items-center gap-1 ml-auto text-[13px] text-[#4a4a4a] hover:text-[#0D0D0D]"
                                title="Szerkesztés"
                              >
                                <span>{o.real_cost != null ? formatCurrency(o.real_cost) : '–'}</span>
                                <Edit2 size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${profit >= 0 ? 'text-[#16a34a]' : 'text-[#C8102E]'}`}>
                            {o.real_cost != null ? formatCurrency(profit) : '–'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {o.real_cost != null ? (
                              <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${
                                pct >= 30 ? 'bg-green-100 text-green-700'
                                : pct >= 10 ? 'bg-amber-100 text-amber-700'
                                : 'bg-red-100 text-red-700'
                              }`}>
                                {pct.toFixed(1)}%
                              </span>
                            ) : '–'}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setExpandedId(isExpanded && !isEditing ? null : o.id)}
                              className="text-[#4a4a4a] hover:text-[#0D0D0D] p-1"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                          </td>
                        </tr>

                        {/* Inline cost editor */}
                        {isExpanded && (
                          <tr key={`${o.id}-edit`} className="border-b border-[rgba(0,0,0,0.06)] bg-[#F4F5F7]">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="max-w-2xl">
                                <div className="text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-wide mb-3">
                                  Önköltség szerkesztés · Óradíj: {formatCurrency(hourlyRate)}/óra
                                </div>
                                {isEditing ? (
                                  <div className="grid grid-cols-3 gap-3">
                                    <FormGroup className="mb-0">
                                      <FormLabel>Technikus óra</FormLabel>
                                      <Input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        value={editingCost[o.id]?.technician_hours ?? ''}
                                        onChange={e => setEditingCost(prev => ({
                                          ...prev,
                                          [o.id]: { ...prev[o.id], technician_hours: e.target.value }
                                        }))}
                                        placeholder="0"
                                      />
                                      {editingCost[o.id]?.technician_hours && (
                                        <div className="text-[11px] text-[#4a4a4a] mt-1">
                                          = {formatCurrency(parseFloat(editingCost[o.id].technician_hours || '0') * hourlyRate)}
                                        </div>
                                      )}
                                    </FormGroup>
                                    <FormGroup className="mb-0">
                                      <FormLabel>Üzemanyag (CHF)</FormLabel>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editingCost[o.id]?.fuel_cost ?? ''}
                                        onChange={e => setEditingCost(prev => ({
                                          ...prev,
                                          [o.id]: { ...prev[o.id], fuel_cost: e.target.value }
                                        }))}
                                        placeholder="0.00"
                                      />
                                    </FormGroup>
                                    <FormGroup className="mb-0">
                                      <FormLabel>Útköltség (CHF)</FormLabel>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={editingCost[o.id]?.travel_cost ?? ''}
                                        onChange={e => setEditingCost(prev => ({
                                          ...prev,
                                          [o.id]: { ...prev[o.id], travel_cost: e.target.value }
                                        }))}
                                        placeholder="0.00"
                                      />
                                    </FormGroup>
                                    <div className="col-span-3 flex items-center justify-between pt-2 border-t border-[rgba(0,0,0,0.10)]">
                                      <div className="text-[12px] text-[#4a4a4a]">
                                        Kalkulált önköltség:{' '}
                                        <strong className="text-[#C8102E]">
                                          {formatCurrency(
                                            (parseFloat(editingCost[o.id]?.technician_hours || '0') * hourlyRate) +
                                            parseFloat(editingCost[o.id]?.fuel_cost || '0') +
                                            parseFloat(editingCost[o.id]?.travel_cost || '0') +
                                            (o.parts_cost || 0)
                                          )}
                                        </strong>
                                        {' '}(+ alkatrész: {formatCurrency(o.parts_cost || 0)})
                                      </div>
                                      <div className="flex gap-2">
                                        <Button variant="secondary" size="sm" onClick={() => cancelCostEdit(o.id)}>
                                          <X size={12} /> Mégse
                                        </Button>
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          onClick={() => saveCost(o)}
                                          disabled={savingId === o.id}
                                        >
                                          <Check size={12} /> {savingId === o.id ? 'Mentés...' : 'Mentés'}
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-4 gap-3 text-[13px]">
                                    {[
                                      { label: 'Technikus óra', value: o.technician_hours ? `${o.technician_hours} h` : '–' },
                                      { label: 'Üzemanyag', value: o.fuel_cost != null ? formatCurrency(o.fuel_cost) : '–' },
                                      { label: 'Útköltség', value: o.travel_cost != null ? formatCurrency(o.travel_cost) : '–' },
                                      { label: 'Alkatrész', value: formatCurrency(o.parts_cost || 0) },
                                    ].map(item => (
                                      <div key={item.label} className="bg-white rounded-lg p-3 border border-[rgba(0,0,0,0.08)]">
                                        <div className="text-[10px] text-[#4a4a4a] uppercase font-semibold mb-1">{item.label}</div>
                                        <div className="font-semibold text-[#0D0D0D]">{item.value}</div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
              {orders.length === 0 && (
                <div className="text-center py-10 text-[#888888] text-sm">
                  Nincs adat a kiválasztott időszakra
                </div>
              )}
            </Card>
          )}

          {/* SERVICES TAB */}
          {activeTab === 'services' && (
            <Card className="p-0 overflow-hidden">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F4F5F7] border-b border-[rgba(0,0,0,0.10)]">
                    <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">Szolgáltatás típus</th>
                    <th className="text-center px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">Db</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">Bevétel</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">Költség</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">Profit</th>
                    <th className="text-right px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase">Margin%</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(serviceGroups).map(([type, data]) => {
                    const profit = data.revenue - data.cost
                    const margin = data.revenue > 0 ? (profit / data.revenue) * 100 : 0
                    return (
                      <tr key={type} className="border-b border-[rgba(0,0,0,0.06)] hover:bg-[#fafbfc]">
                        <td className="px-4 py-3">
                          <span className="font-medium text-[#0D0D0D] capitalize">{type}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-[#4a4a4a]">{data.count}</td>
                        <td className="px-4 py-3 text-right font-semibold text-[#0D0D0D]">{formatCurrency(data.revenue)}</td>
                        <td className="px-4 py-3 text-right text-[#C8102E]">{formatCurrency(data.cost)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${profit >= 0 ? 'text-[#16a34a]' : 'text-[#C8102E]'}`}>
                          {formatCurrency(profit)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${
                            margin >= 30 ? 'bg-green-100 text-green-700'
                            : margin >= 10 ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                          }`}>
                            {margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {Object.keys(serviceGroups).length === 0 && (
                <div className="text-center py-10 text-[#888888] text-sm">Nincs adat</div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  )
}
