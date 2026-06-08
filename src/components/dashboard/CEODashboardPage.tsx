'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import {
  TrendingUp, TrendingDown, Users, Car, Star, Building2,
  FileText, Truck, MapPin, DollarSign, BarChart2, Crown,
  ArrowUpRight, ArrowDownRight, Zap, Target, Package
} from 'lucide-react'

interface KPI {
  label: string
  value: string
  sub?: string
  trend?: number
  color?: string
  icon: any
}

function KPICard({ kpi }: { kpi: KPI }) {
  const Icon = kpi.icon
  const up = (kpi.trend ?? 0) >= 0
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${kpi.color || 'bg-[#F4F5F7]'}`}>
          <Icon size={18} className={kpi.color ? 'text-white' : 'text-[#0B1E3D]'} />
        </div>
        {kpi.trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-[11px] font-semibold ${up ? 'text-emerald-600' : 'text-[#C9384C]'}`}>
            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(kpi.trend)}%
          </div>
        )}
      </div>
      <div className="text-[22px] font-bold text-[#0B1E3D] leading-tight">{kpi.value}</div>
      <div className="text-[11px] text-[#5a6a80] mt-0.5">{kpi.label}</div>
      {kpi.sub && <div className="text-[10px] text-[#8fa0b5] mt-0.5">{kpi.sub}</div>}
    </Card>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-6">
      <span className="text-[11px] font-bold text-[#5a6a80] uppercase tracking-[1.5px]">{children}</span>
      <div className="h-px flex-1 bg-[rgba(11,30,61,0.08)]" />
    </div>
  )
}

export function CEODashboardPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month')
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const weekStart = new Date(now.getTime() - 7 * 86400000).toISOString()
    const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

    const periodStart = period === 'day' ? dayStart : period === 'week' ? weekStart : period === 'month' ? monthStart : yearStart

    const [
      { data: allWO },
      { data: periodWO },
      { data: customers },
      { data: openQuotes },
      { data: todayBookings },
      { data: reminders },
      { data: parts },
    ] = await Promise.all([
      supabase.from('work_orders').select('total_amount, real_cost, profit, status, service_type, is_mobile, created_at'),
      supabase.from('work_orders').select('total_amount, real_cost, profit, travel_cost, service_type').gte('created_at', periodStart).not('status', 'in', '(new_booking,cancelled)'),
      supabase.from('customers').select('id, is_vip, total_spent, visit_count, family_account_id'),
      supabase.from('quotes').select('total_amount, status').eq('status', 'sent'),
      supabase.from('bookings').select('id, status').eq('scheduled_date', todayStr),
      supabase.from('maintenance_reminders').select('id, status').eq('status', 'pending'),
      supabase.from('parts_inventory').select('id, status, purchase_price, sale_price').eq('status', 'ordered'),
    ])

    const revenue = (periodWO || []).reduce((s: number, w: any) => s + (w.total_amount || 0), 0)
    const cost = (periodWO || []).reduce((s: number, w: any) => s + (w.real_cost || 0), 0)
    const profit = revenue - cost
    const profitPct = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0'

    const mobileRevenue = (periodWO || []).filter((w: any) => w.service_type === 'mobile' || w.is_mobile).reduce((s: number, w: any) => s + (w.total_amount || 0), 0)
    const travelCost = (periodWO || []).reduce((s: number, w: any) => s + (w.travel_cost || 0), 0)
    const mobileCount = (periodWO || []).filter((w: any) => w.service_type === 'mobile' || w.is_mobile).length

    const openWO = (allWO || []).filter((w: any) => !['delivered', 'closed', 'new_booking'].includes(w.status)).length
    const vipCount = (customers || []).filter((c: any) => c.is_vip).length
    const familyCount = new Set((customers || []).filter((c: any) => c.family_account_id).map((c: any) => c.family_account_id)).size
    const openQuoteValue = (openQuotes || []).reduce((s: number, q: any) => s + (q.total_amount || 0), 0)
    const avgProfit = (periodWO || []).length > 0 ? profit / (periodWO || []).length : 0

    setData({
      revenue, cost, profit, profitPct,
      mobileRevenue, travelCost, mobileCount,
      openWO,
      totalCustomers: (customers || []).length,
      vipCount,
      familyCount,
      openQuoteValue,
      openQuoteCount: (openQuotes || []).length,
      todayBookings: (todayBookings || []).length,
      pendingReminders: (reminders || []).length,
      orderedParts: (parts || []).length,
      avgProfit,
      periodWOCount: (periodWO || []).length,
    })
    setLoading(false)
  }, [period, refreshKey])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => `CHF ${n.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

  const periodLabel = { day: 'Ma', week: 'Hét', month: 'Hónap', year: 'Év' }[period]

  return (
    <div className="animate-fade-in">
      {/* Period selector */}
      <div className="flex gap-1 mb-5 bg-[#F4F5F7] p-1 rounded-xl w-fit">
        {(['day', 'week', 'month', 'year'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${period === p ? 'bg-white text-[#0B1E3D] shadow-sm' : 'text-[#5a6a80] hover:text-[#0B1E3D]'}`}
          >
            {periodLabel === { day: 'Ma', week: 'Hét', month: 'Hónap', year: 'Év' }[p] ? { day: 'Ma', week: 'Hét', month: 'Hónap', year: 'Év' }[p] : { day: 'Ma', week: 'Hét', month: 'Hónap', year: 'Év' }[p]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-[#5a6a80] text-sm">Adatok betöltése...</div>
      ) : (
        <>
          <SectionTitle>Pénzügyi áttekintés – {periodLabel}</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
            <KPICard kpi={{ label: 'Árbevétel', value: fmt(data.revenue), sub: `${data.periodWOCount} lezárt munkalap`, icon: TrendingUp, color: 'bg-[#C9A84C]', trend: 8 }} />
            <KPICard kpi={{ label: 'Összes költség', value: fmt(data.cost), sub: 'Anyag + munka + út', icon: TrendingDown, color: 'bg-[#C9384C]' }} />
            <KPICard kpi={{ label: 'Nettó profit', value: fmt(data.profit), sub: `${data.profitPct}% profit margin`, icon: Target, color: 'bg-[#16a34a]', trend: 5 }} />
            <KPICard kpi={{ label: 'Átl. profit / munka', value: fmt(data.avgProfit), sub: 'Munkalapokra vetítve', icon: BarChart2, color: 'bg-[#0B1E3D]' }} />
          </div>

          <SectionTitle>Operatív mutatók</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
            <KPICard kpi={{ label: 'Nyitott munkalapok', value: data.openWO, sub: 'Aktív', icon: Zap, color: 'bg-[#2563eb]' }} />
            <KPICard kpi={{ label: 'Mai foglalások', value: data.todayBookings, icon: Car }} />
            <KPICard kpi={{ label: 'Nyitott ajánlatok', value: `${data.openQuoteCount} db`, sub: fmt(data.openQuoteValue), icon: FileText }} />
            <KPICard kpi={{ label: 'Esedékes emlékeztetők', value: data.pendingReminders, sub: 'Küldésre vár', icon: Package }} />
          </div>

          <SectionTitle>Ügyfélbázis</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-2">
            <KPICard kpi={{ label: 'Összes ügyfél', value: data.totalCustomers, icon: Users, color: 'bg-[#0B1E3D]', trend: 3 }} />
            <KPICard kpi={{ label: 'VIP ügyfelek', value: data.vipCount, sub: '5+ látogatás / 2500+ CHF', icon: Crown, color: 'bg-[#C9A84C]' }} />
            <KPICard kpi={{ label: 'Családi fiókok', value: data.familyCount, icon: Users }} />
            <KPICard kpi={{ label: 'Megrendelt alkatrész', value: data.orderedParts, sub: 'Várakozik', icon: Package }} />
          </div>

          <SectionTitle>Mobil & Kiszállás – {periodLabel}</SectionTitle>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-2">
            <KPICard kpi={{ label: 'Mobil bevétel', value: fmt(data.mobileRevenue), sub: `${data.mobileCount} kiszállás`, icon: Truck, color: 'bg-[#0891b2]' }} />
            <KPICard kpi={{ label: 'Útköltség összesen', value: fmt(data.travelCost), sub: 'Üzemanyag + jármű', icon: MapPin, color: 'bg-[#C9384C]' }} />
            <KPICard kpi={{ label: 'Mobil profit', value: fmt(data.mobileRevenue - data.travelCost), sub: 'Bevétel – útköltség', icon: DollarSign, color: 'bg-[#16a34a]' }} />
          </div>

          {/* Profit meter */}
          <SectionTitle>Profit arány</SectionTitle>
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[13px] font-semibold text-[#0B1E3D]">Árbevétel vs Profit – {periodLabel}</div>
              <div className="text-[13px] font-bold text-emerald-600">{data.profitPct}%</div>
            </div>
            <div className="relative h-5 bg-[#F4F5F7] rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-[#C9A84C] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, Number(data.profitPct))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-[#8fa0b5] mt-1.5">
              <span>0%</span>
              <span className="text-emerald-600 font-semibold">Cél: 35%</span>
              <span>100%</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[rgba(11,30,61,0.08)]">
              <div className="text-center">
                <div className="text-[18px] font-bold text-[#0B1E3D]">{fmt(data.revenue)}</div>
                <div className="text-[10px] text-[#5a6a80]">Bruttó bevétel</div>
              </div>
              <div className="text-center">
                <div className="text-[18px] font-bold text-[#C9384C]">{fmt(data.cost)}</div>
                <div className="text-[10px] text-[#5a6a80]">Összes költség</div>
              </div>
              <div className="text-center">
                <div className="text-[18px] font-bold text-emerald-600">{fmt(data.profit)}</div>
                <div className="text-[10px] text-[#5a6a80]">Nettó profit</div>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
