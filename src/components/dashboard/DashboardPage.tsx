'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { KpiCard } from './KpiCard'
import { StatusBadge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import {
  CalendarDays, ClipboardList, FileText, TrendingUp, Truck,
  AlertTriangle, Shield, ArrowRight, Plus, Clock
} from 'lucide-react'
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

  const now = new Date()
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 17 ? 'Good afternoon' : 'Good evening'
  const todayLabel = now.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

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
        supabase.from('work_orders').select('*, customer:customers(full_name), vehicle:vehicles(make,model,license_plate,year)').not('status', 'in', '(delivered,closed)').order('updated_at', { ascending: false }).limit(6),
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
    <div className="flex items-center justify-center h-64">
      <div className="text-[#888888] text-sm">Loading dashboard...</div>
    </div>
  )

  return (
    <div className="animate-fade-in space-y-5">

      {/* ── Welcome header ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#0D0D0D] tracking-tight">{greeting} 👋</h1>
          <p className="text-[13px] text-[#888888] mt-0.5">{todayLabel} · Swiss Garage Operations</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <SystemHealthWidget
            score={healthScore}
            checkedAt={healthCheckedAt}
            errorCount={healthErrors}
            warnCount={healthWarnings}
            onRunCheck={() => onNavigate('system_health')}
          />
          <button
            onClick={() => onNavigate('workorders')}
            className="flex items-center gap-2 bg-[#0D0D0D] hover:bg-[#111111] text-white px-3.5 py-2 rounded-xl text-[12.5px] font-semibold transition-colors shadow-sm"
          >
            <Plus size={14} className="text-[#C8102E]" />
            New Work Order
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          label="Today's Appointments"
          value={stats.todayBookings}
          accent="gold"
          icon={<CalendarDays size={18} />}
          onClick={() => onNavigate('bookings')}
        />
        <KpiCard
          label="Open Work Orders"
          value={stats.openWorkOrders}
          accent="navy"
          icon={<ClipboardList size={18} />}
          onClick={() => onNavigate('workorders')}
        />
        <KpiCard
          label="Pending Quotes"
          value={stats.pendingQuotes}
          accent="red"
          icon={<FileText size={18} />}
          onClick={() => onNavigate('quotes')}
        />
        <KpiCard
          label="Monthly Revenue"
          value={formatCurrency(stats.monthRevenue)}
          accent="green"
          icon={<TrendingUp size={18} />}
          onClick={() => onNavigate('finance')}
        />
        <KpiCard
          label="New Customers"
          value={stats.newCustomers}
          accent="navy"
          onClick={() => onNavigate('customers')}
        />
        <KpiCard
          label="Mobile Jobs"
          value={stats.mobileJobs}
          accent="gold"
          icon={<Truck size={18} />}
          onClick={() => onNavigate('mobile_service')}
        />
      </div>

      {/* ── Two-col section ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Today's schedule */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-[#C8102E]" />
              <span className="text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-[0.8px]">Today's Schedule</span>
            </div>
            <button
              onClick={() => onNavigate('bookings')}
              className="text-[11px] text-[#888888] hover:text-[#0D0D0D] flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={11} />
            </button>
          </div>

          {todayBookings.length === 0 ? (
            <div className="text-center py-8 text-[13px] text-[#888888]">No appointments today</div>
          ) : (
            <div className="space-y-0">
              {todayBookings.map((b: any) => (
                <div key={b.id} className="flex items-center gap-3 py-2.5 border-b border-[rgba(0,0,0,0.05)] last:border-0">
                  <div className="text-[11px] font-bold text-[#C8102E] min-w-[36px] font-mono">
                    {b.scheduled_time?.slice(0,5) || '--:--'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] text-[#0D0D0D] truncate">{b.customer?.full_name}</div>
                    <div className="text-[11px] text-[#888888] truncate">{b.service_type}</div>
                  </div>
                  {b.vehicle && (
                    <div className="bg-[#0D0D0D] text-white text-[10.5px] font-bold px-2 py-1 rounded-lg min-w-[64px] text-center shrink-0">
                      {b.vehicle.license_plate}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Urgent items */}
        <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-[#C8102E]" />
              <span className="text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-[0.8px]">Requires Attention</span>
            </div>
            <button
              onClick={() => onNavigate('workorders')}
              className="text-[11px] text-[#888888] hover:text-[#0D0D0D] flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={11} />
            </button>
          </div>

          {urgentTasks.length === 0 ? (
            <div className="text-center py-8 text-[13px] text-[#888888]">No urgent items</div>
          ) : (
            <div className="space-y-0">
              {urgentTasks.map((wo: any) => (
                <div
                  key={wo.id}
                  className="flex items-center gap-3 py-2.5 border-b border-[rgba(0,0,0,0.05)] last:border-0 cursor-pointer hover:bg-[#F8F9FB] -mx-5 px-5 transition-colors rounded-xl"
                  onClick={() => onNavigate('workorders', wo.id)}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${wo.status === 'waiting_approval' ? 'bg-[#C8102E]' : 'bg-[#C8102E]'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[13px] text-[#0D0D0D] truncate">{wo.customer?.full_name}</div>
                    <div className="text-[11px] text-[#888888]">{wo.vehicle?.license_plate} · {wo.order_number}</div>
                  </div>
                  <StatusBadge status={wo.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Active work orders ── */}
      <div className="bg-white border border-[rgba(0,0,0,0.08)] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={15} className="text-[#C8102E]" />
            <span className="text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-[0.8px]">Active Work Orders</span>
          </div>
          <button
            onClick={() => onNavigate('workorders')}
            className="text-[11px] text-[#888888] hover:text-[#0D0D0D] flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight size={11} />
          </button>
        </div>

        {activeWorkOrders.length === 0 ? (
          <div className="text-center py-8 text-[13px] text-[#888888]">No active work orders</div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <table className="premium-table w-full">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th className="hidden md:table-cell">Vehicle</th>
                  <th>Status</th>
                  <th className="text-right hidden sm:table-cell">Amount</th>
                </tr>
              </thead>
              <tbody>
                {activeWorkOrders.map((wo: any) => (
                  <tr key={wo.id} onClick={() => onNavigate('workorders', wo.id)}>
                    <td>
                      <span className="text-[11px] font-bold text-[#333333] bg-[#F0F0F0] px-2 py-1 rounded-lg">
                        {wo.order_number}
                      </span>
                    </td>
                    <td className="font-medium text-[#0D0D0D]">{wo.customer?.full_name}</td>
                    <td className="hidden md:table-cell text-[#4a4a4a] text-[12px]">
                      {wo.vehicle ? `${wo.vehicle.make} ${wo.vehicle.model} · ${wo.vehicle.license_plate}` : '–'}
                    </td>
                    <td><StatusBadge status={wo.status} /></td>
                    <td className="text-right hidden sm:table-cell font-semibold text-[#0D0D0D]">
                      {wo.total_amount ? formatCurrency(wo.total_amount) : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
