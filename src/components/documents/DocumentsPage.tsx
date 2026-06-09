'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/form'
import {
  FileText, Download, Mail, MessageCircle, Search,
  Filter, ChevronRight, Eye, Printer
} from 'lucide-react'
import { generatePDF, DOC_TYPES, type DocType } from '@/lib/pdf/generatePDF'
import { useToast } from '@/components/ui/toast'

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  quote:          { label: 'Árajánlat',          color: 'bg-blue-100 text-blue-700' },
  work_order:     { label: 'Munkalap',            color: 'bg-indigo-100 text-indigo-700' },
  checkin:        { label: 'Check-In riport',     color: 'bg-amber-100 text-amber-700' },
  checkout:       { label: 'Check-Out riport',    color: 'bg-emerald-100 text-emerald-700' },
  invoice:        { label: 'Számla előkészítő',   color: 'bg-purple-100 text-purple-700' },
  vhr:            { label: 'Vehicle Health Rep.', color: 'bg-orange-100 text-orange-700' },
  fleet:          { label: 'Flotta riport',       color: 'bg-cyan-100 text-cyan-700' },
  tire_hotel:     { label: 'Gumi hotel riport',   color: 'bg-gray-100 text-gray-700' },
  warranty:       { label: 'Garancia dok.',       color: 'bg-rose-100 text-rose-700' },
}

interface Doc {
  id: string
  type: DocType
  doc_number: string
  created_at: string
  customer_name: string
  vehicle_info: string
  work_order_id?: string
  customer_id?: string
  vehicle_id?: string
  data: any
}

export function DocumentsPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)

    // Load quotes as documents
    const [qRes, woRes] = await Promise.all([
      supabase.from('quotes').select('*, customer:customers(full_name), vehicle:vehicles(make,model,license_plate)').order('created_at', { ascending: false }).limit(50),
      supabase.from('work_orders').select('*, customer:customers(full_name), vehicle:vehicles(make,model,license_plate)').order('created_at', { ascending: false }).limit(50),
    ])

    const quoteDocs: Doc[] = (qRes.data || []).map((q: any) => ({
      id: q.id,
      type: 'quote' as DocType,
      doc_number: `AJ-${q.id.slice(0, 8).toUpperCase()}`,
      created_at: q.created_at,
      customer_name: q.customer?.full_name || 'N/A',
      vehicle_info: q.vehicle ? `${q.vehicle.make} ${q.vehicle.model} (${q.vehicle.license_plate})` : '',
      customer_id: q.customer_id,
      vehicle_id: q.vehicle_id,
      data: q,
    }))

    const woDocs: Doc[] = (woRes.data || []).flatMap((wo: any) => {
      const base = {
        customer_name: wo.customer?.full_name || 'N/A',
        vehicle_info: wo.vehicle ? `${wo.vehicle.make} ${wo.vehicle.model} (${wo.vehicle.license_plate})` : '',
        work_order_id: wo.id,
        customer_id: wo.customer_id,
        vehicle_id: wo.vehicle_id,
        data: wo,
      }
      const result: Doc[] = [
        { ...base, id: `wo-${wo.id}`, type: 'work_order', doc_number: wo.order_number || `ML-${wo.id.slice(0,6).toUpperCase()}`, created_at: wo.created_at },
      ]
      if (wo.checkin_at) result.push({ ...base, id: `ci-${wo.id}`, type: 'checkin', doc_number: `CI-${wo.id.slice(0,6).toUpperCase()}`, created_at: wo.checkin_at })
      if (wo.checkout_at) result.push({ ...base, id: `co-${wo.id}`, type: 'checkout', doc_number: `CO-${wo.id.slice(0,6).toUpperCase()}`, created_at: wo.checkout_at })
      return result
    })

    setDocs([...quoteDocs, ...woDocs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const filtered = docs.filter(d => {
    const s = search.toLowerCase()
    const matchSearch = !s || d.customer_name.toLowerCase().includes(s) || d.vehicle_info.toLowerCase().includes(s) || d.doc_number.toLowerCase().includes(s)
    const matchType = typeFilter === 'all' || d.type === typeFilter
    return matchSearch && matchType
  })

  const handleDownload = async (doc: Doc) => {
    try {
      await generatePDF(doc.type, doc.data, doc.doc_number)
      toast('PDF letöltve')
    } catch (e) {
      toast('PDF hiba', 'error')
    }
  }

  return (
    <div className="animate-fade-in space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa0b5]" />
          <Input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ügyfél, rendszám, dokumentumszám..."
            className="pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="border border-[rgba(11,30,61,0.18)] rounded-lg px-3 py-2 text-[12px] bg-white outline-none focus:border-[#0B1E3D]"
        >
          <option value="all">Minden típus</option>
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {['quote', 'work_order', 'checkin', 'checkout', 'invoice'].map(t => (
          <button
            key={t}
            onClick={() => setTypeFilter(t === typeFilter ? 'all' : t)}
            className={`rounded-xl p-3 text-center border transition-colors ${typeFilter === t ? 'bg-[#0B1E3D] text-white border-[#0B1E3D]' : 'bg-white border-[rgba(11,30,61,0.08)] hover:border-[rgba(11,30,61,0.2)]'}`}
          >
            <div className={`text-[16px] font-bold ${typeFilter === t ? 'text-white' : 'text-[#0B1E3D]'}`}>
              {docs.filter(d => d.type === t).length}
            </div>
            <div className={`text-[10px] ${typeFilter === t ? 'text-white/70' : 'text-[#5a6a80]'}`}>
              {TYPE_LABELS[t]?.label || t}
            </div>
          </button>
        ))}
      </div>

      {/* Document list */}
      <Card>
        <CardTitle icon={<FileText size={16} />}>
          Dokumentumok ({filtered.length})
        </CardTitle>
        {loading ? (
          <div className="text-[#5a6a80] text-sm py-6 text-center">Betöltés...</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(doc => (
              <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl border border-[rgba(11,30,61,0.08)] hover:border-[rgba(11,30,61,0.16)] transition-colors bg-white">
                <div className="w-9 h-9 bg-[#F4F5F7] rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-[#5a6a80]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12px] font-semibold text-[#0B1E3D]">{doc.doc_number}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TYPE_LABELS[doc.type]?.color || 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABELS[doc.type]?.label || doc.type}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#5a6a80] truncate">{doc.customer_name} · {doc.vehicle_info}</div>
                  <div className="text-[10px] text-[#8fa0b5]">{new Date(doc.created_at).toLocaleDateString('hu-HU')}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="p-1.5 rounded-lg hover:bg-[#F4F5F7] text-[#5a6a80] hover:text-[#0B1E3D] transition-colors"
                    title="PDF letöltés"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-[#F4F5F7] text-[#5a6a80] hover:text-[#0B1E3D] transition-colors"
                    title="E-mail küldés"
                  >
                    <Mail size={14} />
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-[#F4F5F7] text-[#5a6a80] hover:text-[#0B1E3D] transition-colors"
                    title="WhatsApp"
                  >
                    <MessageCircle size={14} />
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-[13px] text-[#8fa0b5] py-6">Nincs találat</p>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
