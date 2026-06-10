'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KpiCard } from './KpiCard'
import { Card, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Calendar, ClipboardList, Users, TrendingUp, Truck, FileText, AlertTriangle, Clock, Shield } from 'lucide-react'
import { SystemHealthWidget } from '@/components/system-health/SystemHealthWidget'
import type { WorkOrder, Booking } from '@/lib/types'

interface DashboardPageProps {
  refreshKey: number
  onNavigate: (page: string, id?: string) => void
}

export function DashboardPage({ refreshKey, onNavigate }: DashboardPageProps) {
  const [healthScore, setHealthScore] = useState<number | null>(null)
  const [healthCheckedAt, setHealthCheckedAt] = useState<Date | null>(null)
  const [healthErrors, setHealthErrors] = useState(0)
  const [healthWarnings, setHealthWarnings] = useState(0)

  const [stats, setStats] = useState({
    todayBookings: 0,
    openWorkOrders: 0,
    pendingQuotes: 0,
    monthRevenue: 0,
    newCustomers: 0,
    mobileJobs: 0,
  })
  const [todayBookings, setTodayBookings] = useState<Booking[]>([])
  const [activeWorkOrders, setActiveWorkOrders] = useState<WorkOrder[]>([])
  const [urgentTasks, setUrgentTasks] = useState<WorkOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

    async function load() {
      setLoading(true)
      const [
        { count: todayCount },
        { count: openCount },
        { count: quotesCount },
        { data: revenueData },
        { count: newCustCount },
        { count: mobileCount },
        { data: bookingsData },
        { data: workordersData },
        { data: urgentData },
      ] = await Promise.all([
        supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('scheduled_date', today),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }).not('status', 'in', '(delivered,closed)'),
        supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
        supabase.from('work_orders').select('total_amount').gte('created_at', monthStart).eq('payment_status', 'paid'),
        supabase.from('customers').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('is_mobile', true).not('status', 'in', '(delivered,closed)'),
        supabase.from('bookings').select('*, customer:customers(full_name,phone), vehicle:vehicles(make,model,license_plate)').eq('scheduled_date', today).order('scheduled_time').limit(8),
        supabase.from('work_orders').select('*, customer:customers(full_name), vehicle:vehicles(make,model,license_plate,year)').not('status', 'in', '(delivered,closed)').order('updated_at', { ascending: false }).limit(5),
        supabase.from('work_orders').select('*, customer:customers(full_name), vehicle:vehicles(make,model,license_plate)').in('status', ['waiting_approval', 'waiting_parts']).order('created_at').limit(5),
      ])

      const revenue = revenueData?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0
      setStats({
        todayBookings: todayCount || 0,
        openWorkOrders: openCount || 0,
        pendingQuotes: quotesCount || 0,
        monthRevenue: revenue,
        newCustomers: newCustCount || 0,
        mobileJobs: mobileCount || 0,
      })
      setTodayBookings((bookingsData as any) || [])
      setActiveWorkOrders((workordersData as any) || [])
      setUrgentTasks((urgentData as any) || [])
      setLoading(false)
    }
    load()
  }, [refreshKey])

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="text-[#5a6a80] text-sm">Dashboard betöltése...</div>
    </div>
  )

  return (
    <div className="animate-fade-in">
      {/* System Health + Quick Actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <SystemHealthWidget
            score={healthScore}
            checkedAt={healthCheckedAt}
            errorCount={healthErrors}
            warnCount={healthWarnings}
            onRunCheck={() => onNavigate('system_health')}
          />
        </div>
        <button
          onClick={() => onNavigate('system_health')}
          className="flex items-center gap-2 bg-[#0B1E3D] hover:bg-[#0d2347] text-white px-4 py-3 rounded-xl text-[13px] font-semibold transition-colors shrink-0 shadow-sm"
        >
          <Shield size={16} className="text-[#C9A84C]" />
          🔍 Rendszer Ellenőrzés
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <KpiCard label="Mai időpontok" value={stats.todayBookings} accent="gold" />
        <KpiCard label="Nyitott munkalapok" value={stats.openWorkOrders} accent="navy" />
        <KpiCard label="Függő árajánlatok" value={stats.pendingQuotes} accent="red" />
        <KpiCard label="Havi bevétel" value={formatCurrency(stats.monthRevenue)} accent="green" />
        <KpiCard label="Új ügyfelek" value={stats.newCustomers} accent="navy" />
        <KpiCard label="Mobil munkák" value={stats.mobileJobs} accent="gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Today's bookings */}
        <Card>
          <div className="flex items-center justify-between mb-3.5">
            <CardTitle icon={<Calendar size={16} />}>Mai időpontok</CardTitle>
            <button onClick={() => onNavigate('bookings')} className="text-[11px] text-[#5a6a80] hover:text-[#0B1E3D]">Mind →</button>
          </div>
          {todayBookings.length === 0 ? (
            <p className="text-[12px] text-[#8fa0b5] py-4 text-center">Ma nincs időpont</p>
          ) : (
            <div>
              {todayBookings.map((b: any) => (
                <div key={b.id} className="flex items-center gap-2.5 py-2.5 border-b border-[rgba(11,30,61,0.07)] last:border-0">
                  <div className="text-[11px] font-semibold text-[#0B1E3D] min-w-[38px]">{b.scheduled_time?.slice(0,5)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] truncate">{b.customer?.full_name}</div>
                    <div className="text-[11px] text-[#5a6a80]">{b.service_type}</div>
                  </div>
                  {b.vehicle && (
                    <div className="bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-1 rounded min-w-[70px] text-center">
                      {b.vehicle.license_plate}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Urgent tasks */}
        <Card>
          <CardTitle icon={<AlertTriangle size={16} />}>Sürgős feladatok</CardTitle>
          {urgentTasks.length === 0 ? (
            <p className="text-[12px] text-[#8fa0b5] py-4 text-center">Nincs sürgős feladat</p>
          ) : (
            <div>
              {urgentTasks.map((wo: any) => (
                <div key={wo.id} className="flex items-center gap-2.5 py-2.5 border-b border-[rgba(11,30,61,0.07)] last:border-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${wo.status === 'waiting_approval' ? 'bg-[#C9384C]' : 'bg-[#C9A84C]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] truncate">{wo.customer?.full_name}</div>
                    <div className="text-[11px] text-[#5a6a80]">{wo.vehicle?.license_plate} – {wo.order_number}</div>
                  </div>
                  <StatusBadge status={wo.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Active work orders */}
      <Card>
        <div className="flex items-center justify-between mb-3.5">
          <CardTitle icon={<ClipboardList size={16} />}>Aktív munkalapok</CardTitle>
          <button onClick={() => onNavigate('workorders')} className="text-[11px] text-[#5a6a80] hover:text-[#0B1E3D]">Mind →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[rgba(11,30,61,0.10)]">
                <th className="text-left py-2 text-[#5a6a80] font-semibold">Szám</th>
                <th className="text-left py-2 text-[#5a6a80] font-semibold">Ügyfél</th>
                <th className="text-left py-2 text-[#5a6a80] font-semibold hidden md:table-cell">Jármű</th>
                <th className="text-left py-2 text-[#5a6a80] font-semibold">Státusz</th>
                <th className="text-right py-2 text-[#5a6a80] font-semibold hidden sm:table-cell">Összeg</th>
              </tr>
            </thead>
            <tbody>
              {activeWorkOrders.map((wo: any) => (
                <tr key={wo.id} onClick={() => onNavigate('workorders', wo.id)} className="border-b border-[rgba(11,30,61,0.05)] hover:bg-[#F4F5F7] cursor-pointer active:bg-[#eef2f7]">
                  <td className="py-2.5">
                    <span className="text-[11px] font-bold text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded">{wo.order_number}</span>
                  </td>
                  <td className="py-2.5 font-medium">{wo.customer?.full_name}</td>
                  <td className="py-2.5 hidden md:table-cell text-[#5a6a80]">
                    {wo.vehicle ? `${wo.vehicle.make} ${wo.vehicle.model} (${wo.vehicle.license_plate})` : '–'}
                  </td>
                  <td className="py-2.5"><StatusBadge status={wo.status} /></td>
                  <td className="py-2.5 text-right hidden sm:table-cell font-semibold text-[#0B1E3D]">
                    {wo.total_amount ? formatCurrency(wo.total_amount) : '–'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeWorkOrders.length === 0 && (
            <p className="text-[12px] text-[#8fa0b5] py-6 text-center">Nincs aktív munkalap</p>
          )}
        </div>
      </Card>
    </div>
  )
}
