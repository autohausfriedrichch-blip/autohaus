'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { formatCurrency } from '@/lib/utils'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { TrendingUp, Users, Car, FileText } from 'lucide-react'

export function ReportsPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [stats, setStats] = useState<any>({})
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([])
  const [serviceBreakdown, setServiceBreakdown] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const yearStart = new Date(now.getFullYear(), 0, 1).toISOString()

      const [
        { count: totalCustomers },
        { count: totalVehicles },
        { count: monthOrders },
        { data: revenueData },
        { count: quotesSent },
        { count: quotesApproved },
        { count: mobileJobs },
      ] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('vehicles').select('*', { count: 'exact', head: true }),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
        supabase.from('work_orders').select('total_amount, created_at').gte('created_at', yearStart).eq('payment_status', 'paid'),
        supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'sent'),
        supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('work_orders').select('*', { count: 'exact', head: true }).eq('is_mobile', true),
      ])

      setStats({ totalCustomers, totalVehicles, monthOrders, quotesSent, quotesApproved, mobileJobs })

      // Monthly revenue breakdown
      const monthlyMap: Record<string, number> = {}
      const monthNames = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez']
      revenueData?.forEach(r => {
        const m = new Date(r.created_at).getMonth()
        monthlyMap[monthNames[m]] = (monthlyMap[monthNames[m]] || 0) + (r.total_amount || 0)
      })
      setMonthlyRevenue(monthNames.map(m => ({ month: m, umsatz: monthlyMap[m] || 0 })))
      setLoading(false)
    }
    load()
  }, [refreshKey])

  return (
    <div className="animate-fade-in">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <KpiCard label="Gesamtkunden" value={stats.totalCustomers || 0} accent="navy" />
        <KpiCard label="Fahrzeuge" value={stats.totalVehicles || 0} accent="navy" />
        <KpiCard label="Aufträge (Monat)" value={stats.monthOrders || 0} accent="gold" />
        <KpiCard label="Offene Angebote" value={stats.quotesSent || 0} accent="red" />
        <KpiCard label="Angebote genehmigt" value={stats.quotesApproved || 0} accent="green" />
        <KpiCard label="Mobile Jobs (gesamt)" value={stats.mobileJobs || 0} accent="gold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardTitle icon={<TrendingUp size={16} />}>Monatsumsatz {new Date().getFullYear()}</CardTitle>
          {loading ? <div className="h-48 flex items-center justify-center text-[#4a4a4a] text-sm">Wird geladen...</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyRevenue} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#4a4a4a' }} />
                <YAxis tick={{ fontSize: 11, fill: '#4a4a4a' }} tickFormatter={v => `CHF ${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: any) => [formatCurrency(v), 'Umsatz']} labelStyle={{ color: '#0D0D0D', fontWeight: 600 }} />
                <Bar dataKey="umsatz" fill="#C8102E" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card>
          <CardTitle icon={<FileText size={16} />}>Angebots-Konversion</CardTitle>
          <div className="space-y-4 mt-2">
            <div>
              <div className="flex justify-between text-[12px] mb-1">
                <span className="text-[#4a4a4a]">Genehmigungsrate</span>
                <span className="font-semibold text-[#0D0D0D]">
                  {stats.quotesSent || stats.quotesApproved
                    ? `${Math.round((stats.quotesApproved / ((stats.quotesSent || 0) + (stats.quotesApproved || 0))) * 100)}%`
                    : '–'
                  }
                </span>
              </div>
              <div className="h-2 bg-[#ECEEF2] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#C8102E] to-[#e8314e] transition-all"
                  style={{ width: stats.quotesSent || stats.quotesApproved ? `${Math.round((stats.quotesApproved / ((stats.quotesSent || 0) + (stats.quotesApproved || 0))) * 100)}%` : '0%' }}
                />
              </div>
            </div>

            <div className="border-t border-[rgba(0,0,0,0.08)] pt-4">
              <div className="text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-wider mb-3">Auftragsstatus Übersicht</div>
              {[
                { label: 'Neue Aufträge', count: stats.monthOrders || 0, color: 'bg-blue-400' },
                { label: 'Mobile Jobs', count: stats.mobileJobs || 0, color: 'bg-purple-400' },
                { label: 'Angebote gesendet', count: stats.quotesSent || 0, color: 'bg-[#C8102E]' },
                { label: 'Angebote genehmigt', count: stats.quotesApproved || 0, color: 'bg-emerald-400' },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b border-[rgba(0,0,0,0.05)] last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                    <span className="text-[13px]">{item.label}</span>
                  </div>
                  <span className="font-semibold text-[#0D0D0D]">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
