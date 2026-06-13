'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Truck, MapPin, Phone } from 'lucide-react'
import { formatDate } from '@/lib/utils'

export function MobilePage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('work_orders')
      .select('*, customer:customers(full_name,phone,whatsapp), vehicle:vehicles(make,model,license_plate,year)')
      .eq('is_mobile', true)
      .not('status', 'in', '(delivered,closed)')
      .order('scheduled_date')
    setJobs(data || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  return (
    <div className="animate-fade-in">
      <div className="mb-4 p-4 bg-[#0D0D0D] rounded-[14px] text-white">
        <div className="flex items-center gap-2 mb-2">
          <Truck size={18} className="text-[#C8102E]" />
          <span className="font-semibold text-[14px]">Mobil Reifen & Detailing</span>
        </div>
        <p className="text-white/60 text-[12px]">{jobs.length} aktive mobile Einsätze</p>
      </div>

      {loading ? <div className="text-center py-12 text-[#4a4a4a] text-sm">Wird geladen...</div> : (
        jobs.length === 0 ? (
          <div className="text-center py-16 text-[#888888] text-sm">Nincs aktív mobil megrendelés</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {jobs.map(job => (
              <Card key={job.id}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold text-[#333333] bg-[#F0F0F0] px-2 py-0.5 rounded">{job.order_number}</span>
                  <StatusBadge status={job.status} />
                </div>
                <div className="font-semibold text-[14px] mb-1">{job.customer?.full_name}</div>
                <div className="mb-3">
                  <span className="bg-[#0D0D0D] text-white text-[11px] font-bold px-2 py-0.5 rounded mr-2">{job.vehicle?.license_plate}</span>
                  <span className="text-[12px] text-[#4a4a4a]">{job.vehicle?.make} {job.vehicle?.model}</span>
                </div>
                {job.mobile_address && (
                  <div className="flex items-start gap-1.5 text-[12px] text-[#4a4a4a] mb-2">
                    <MapPin size={13} className="mt-0.5 shrink-0 text-[#C8102E]" />
                    {job.mobile_address}
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[12px] text-[#4a4a4a] mb-2">
                  <Phone size={13} className="shrink-0 text-[#C8102E]" />
                  {job.customer?.phone}
                </div>
                {job.scheduled_date && (
                  <div className="text-[11px] text-[#888888] mt-2 pt-2 border-t border-[rgba(0,0,0,0.08)]">
                    Datum: {formatDate(job.scheduled_date)} {job.scheduled_time?.slice(0,5)}
                  </div>
                )}
                {job.service_type && (
                  <div className="text-[11px] text-[#C8102E] font-medium mt-1">{job.service_type}</div>
                )}
              </Card>
            ))}
          </div>
        )
      )}
    </div>
  )
}
