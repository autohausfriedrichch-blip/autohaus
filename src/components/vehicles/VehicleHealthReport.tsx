'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import { generatePDF } from '@/lib/pdf/generatePDF'
import { Activity, Download, CheckCircle, AlertTriangle, XCircle, Minus, Plus } from 'lucide-react'

const CATEGORIES = [
  { id: 'engine',      label: 'Motor',           icon: '⚙️' },
  { id: 'brakes',      label: 'Fék',             icon: '🛑' },
  { id: 'suspension',  label: 'Futómű',          icon: '🔧' },
  { id: 'tires',       label: 'Gumik',           icon: '⭕' },
  { id: 'battery',     label: 'Akkumulátor',     icon: '🔋' },
  { id: 'lights',      label: 'Világítás',       icon: '💡' },
  { id: 'fluids',      label: 'Folyadékok',      icon: '💧' },
  { id: 'body',        label: 'Karosszéria',     icon: '🚗' },
  { id: 'interior',    label: 'Belső tér',       icon: '🪑' },
  { id: 'mfk',         label: 'MFK állapot',     icon: '📋' },
]

type Status = 'ok' | 'watch' | 'repair' | 'not_checked'

const STATUS_CFG: Record<Status, { label: string; icon: any; color: string; bg: string }> = {
  ok:          { label: 'Rendben',           icon: CheckCircle,    color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  watch:       { label: 'Figyelni kell',     icon: AlertTriangle,  color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
  repair:      { label: 'Javítás javasolt',  icon: XCircle,        color: 'text-red-600',     bg: 'bg-red-50 border-red-200' },
  not_checked: { label: 'Nem ellenőrzött',  icon: Minus,          color: 'text-gray-400',    bg: 'bg-gray-50 border-gray-200' },
}

interface VHREntry {
  status: Status
  note: string
  recommendation: string
  urgency: 'low' | 'medium' | 'high' | ''
}

interface Props {
  workOrderId: string
  workOrder: any
  onClose: () => void
}

export function VehicleHealthReport({ workOrderId, workOrder, onClose }: Props) {
  const [entries, setEntries] = useState<Record<string, VHREntry>>(
    Object.fromEntries(CATEGORIES.map(c => [c.id, { status: 'not_checked', note: '', recommendation: '', urgency: '' }]))
  )
  const [nextService, setNextService] = useState('')
  const [generalNotes, setGeneralNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  function setEntry(catId: string, field: keyof VHREntry, value: any) {
    setEntries(prev => ({ ...prev, [catId]: { ...prev[catId], [field]: value } }))
  }

  function calcHealthScore(): number {
    const scores: Record<Status, number> = { ok: 100, watch: 60, repair: 20, not_checked: 70 }
    const vals = Object.values(entries).map(e => scores[e.status])
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  }

  async function handleSave() {
    setSaving(true)
    const healthScore = calcHealthScore()
    const categoriesData = CATEGORIES.map(c => ({
      id: c.id, name: c.label, ...entries[c.id]
    }))

    const { data: vhr } = await supabase.from('vehicle_health_reports').insert({
      work_order_id: workOrderId,
      customer_id: workOrder.customer_id,
      vehicle_id: workOrder.vehicle_id,
      categories: categoriesData,
      health_score: healthScore,
      next_service_recommendation: nextService || null,
      general_notes: generalNotes || null,
    }).select().single()

    if (vhr) {
      await supabase.from('work_order_events').insert({
        work_order_id: workOrderId,
        event_type: 'document',
        title: `Vehicle Health Report elkészítve – Score: ${healthScore}/100`,
        user_name: 'System',
        phase: 'general',
        metadata: { vhr_id: vhr.id, health_score: healthScore },
      })
    }

    toast('Vehicle Health Report elmentve')
    setSaving(false)
    onClose()
  }

  async function handleDownload() {
    const healthScore = calcHealthScore()
    const categoriesData = CATEGORIES.map(c => ({ id: c.id, name: c.label, ...entries[c.id] }))
    await generatePDF('vhr', {
      ...workOrder,
      categories: categoriesData,
      health_score: healthScore,
      next_service_recommendation: nextService,
    }, `VHR-${workOrder.order_number || workOrderId.slice(0,6).toUpperCase()}`)
    toast('PDF letöltve')
  }

  const healthScore = calcHealthScore()
  const scoreColor = healthScore >= 80 ? 'text-emerald-600' : healthScore >= 50 ? 'text-amber-600' : 'text-red-600'
  const scoreBg = healthScore >= 80 ? 'bg-emerald-50' : healthScore >= 50 ? 'bg-amber-50' : 'bg-red-50'

  return (
    <Modal
      open={true}
      onClose={onClose}
      title="Vehicle Health Report"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>Mégse</Button>
          <Button variant="gold" size="sm" onClick={handleSave} disabled={saving}>
            <Activity size={13} /> {saving ? 'Mentés...' : 'VHR Mentése'}
          </Button>
        </div>
      }
    >
      {/* Score header */}
      <div className={`rounded-xl p-4 mb-4 flex items-center gap-4 ${scoreBg}`}>
        <div className="text-center">
          <div className={`text-[32px] font-bold ${scoreColor}`}>{healthScore}</div>
          <div className="text-[10px] text-[#4a4a4a] font-medium">/ 100</div>
        </div>
        <div className="flex-1">
          <div className="font-semibold text-[14px] text-[#0D0D0D]">Vehicle Health Score</div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-[#4a4a4a]">
            <span className="text-emerald-600">{Object.values(entries).filter(e => e.status === 'ok').length} rendben</span>
            <span className="text-amber-600">{Object.values(entries).filter(e => e.status === 'watch').length} figyelni</span>
            <span className="text-red-600">{Object.values(entries).filter(e => e.status === 'repair').length} javítás</span>
          </div>
        </div>
        <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border text-[12px] text-[#4a4a4a] hover:text-[#0D0D0D] transition-colors">
          <Download size={13} /> PDF
        </button>
      </div>

      {/* Categories */}
      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {CATEGORIES.map(cat => {
          const entry = entries[cat.id]
          const cfg = STATUS_CFG[entry.status]
          const isOpen = activeCategory === cat.id
          const Icon = cfg.icon

          return (
            <div key={cat.id} className={`rounded-xl border ${cfg.bg} overflow-hidden`}>
              <button
                onClick={() => setActiveCategory(isOpen ? null : cat.id)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <span className="text-[16px]">{cat.icon}</span>
                <span className="font-medium text-[13px] text-[#0D0D0D] flex-1">{cat.label}</span>
                <div className="flex items-center gap-3">
                  {/* Status selector (inline) */}
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {(Object.entries(STATUS_CFG) as [Status, typeof STATUS_CFG[Status]][]).map(([s, scfg]) => {
                      const SIcon = scfg.icon
                      return (
                        <button
                          key={s}
                          onClick={() => setEntry(cat.id, 'status', s)}
                          className={`p-1 rounded-lg transition-colors ${entry.status === s ? scfg.bg + ' ' + scfg.color : 'text-gray-300 hover:text-gray-500'}`}
                          title={scfg.label}
                        >
                          <SIcon size={14} />
                        </button>
                      )
                    })}
                  </div>
                  <Icon size={14} className={cfg.color} />
                </div>
              </button>

              {isOpen && (
                <div className="px-3 pb-3 space-y-2 border-t border-white/50">
                  <div>
                    <label className="text-[10px] font-semibold text-[#4a4a4a] uppercase tracking-wide">Megjegyzés</label>
                    <textarea
                      value={entry.note}
                      onChange={e => setEntry(cat.id, 'note', e.target.value)}
                      rows={2}
                      placeholder="Megfigyelések, részletek..."
                      className="w-full mt-1 border border-white rounded-lg p-2 text-[12px] bg-white/80 outline-none focus:border-[#0D0D0D] resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-[#4a4a4a] uppercase tracking-wide">Javasolt lépés</label>
                    <textarea
                      value={entry.recommendation}
                      onChange={e => setEntry(cat.id, 'recommendation', e.target.value)}
                      rows={2}
                      placeholder="Ajánlott javítás, csere..."
                      className="w-full mt-1 border border-white rounded-lg p-2 text-[12px] bg-white/80 outline-none focus:border-[#0D0D0D] resize-none"
                    />
                  </div>
                  {entry.status !== 'ok' && entry.status !== 'not_checked' && (
                    <div>
                      <label className="text-[10px] font-semibold text-[#4a4a4a] uppercase tracking-wide">Sürgősség</label>
                      <div className="flex gap-2 mt-1">
                        {['low', 'medium', 'high'].map(u => (
                          <button
                            key={u}
                            onClick={() => setEntry(cat.id, 'urgency', u)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-medium border transition-colors ${entry.urgency === u
                              ? u === 'high' ? 'bg-red-100 border-red-300 text-red-700' : u === 'medium' ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-blue-100 border-blue-300 text-blue-700'
                              : 'bg-white border-gray-200 text-gray-500'}`}
                          >
                            {u === 'low' ? 'Alacsony' : u === 'medium' ? 'Közepes' : 'Magas'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer fields */}
      <div className="mt-4 space-y-3">
        <div>
          <label className="text-[12px] font-medium text-[#0D0D0D] mb-1 block">Ajánlott következő szerviz</label>
          <input
            type="text" value={nextService} onChange={e => setNextService(e.target.value)}
            placeholder="pl. 2025. szeptember – olajcsere + éves szerviz"
            className="w-full border border-[rgba(0,0,0,0.18)] rounded-lg p-2.5 text-[12px] outline-none focus:border-[#0D0D0D]"
          />
        </div>
        <div>
          <label className="text-[12px] font-medium text-[#0D0D0D] mb-1 block">Ügyfélnek szóló összefoglaló</label>
          <textarea
            value={generalNotes} onChange={e => setGeneralNotes(e.target.value)}
            rows={3}
            placeholder="Rövid magyarázat az ügyfélnek az állapotról..."
            className="w-full border border-[rgba(0,0,0,0.18)] rounded-lg p-2.5 text-[12px] outline-none focus:border-[#0D0D0D] resize-none"
          />
        </div>
      </div>

    </Modal>
  )
}
