'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { CheckSquare, Circle, AlertCircle, CheckCircle, Save, ThumbsUp, ChevronDown, ChevronRight } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface Props {
  profile?: Profile | null
  refreshKey?: number
  onRefresh?: () => void
}

const QC_ITEMS = [
  { id: 'oil_level', label: 'Motorolaj szint', group: 'Motorterér' },
  { id: 'coolant', label: 'Hűtővíz szint', group: 'Motorterér' },
  { id: 'brake_fluid', label: 'Fékfolyadék szint', group: 'Motorterér' },
  { id: 'washer_fluid', label: 'Szélvédőmosó folyadék', group: 'Motorterér' },
  { id: 'brake_pads', label: 'Fékbetétek állapota', group: 'Fék & Gumi' },
  { id: 'brake_discs', label: 'Féktárcsák állapota', group: 'Fék & Gumi' },
  { id: 'tire_pressure', label: 'Gumiabroncs nyomás', group: 'Fék & Gumi' },
  { id: 'tire_tread', label: 'Gumiabroncs profil', group: 'Fék & Gumi' },
  { id: 'lights_front', label: 'Első lámpák', group: 'Elektromos' },
  { id: 'lights_rear', label: 'Hátsó lámpák', group: 'Elektromos' },
  { id: 'battery', label: 'Akkumulátor feszültség', group: 'Elektromos' },
  { id: 'wipers', label: 'Ablaktörlők', group: 'Elektromos' },
  { id: 'exterior', label: 'Karosszéria állapot', group: 'Esztétika' },
  { id: 'interior', label: 'Belső tér tisztasága', group: 'Esztétika' },
  { id: 'documents', label: 'Forgalmi engedély megvan', group: 'Adminisztráció' },
  { id: 'customer_items', label: 'Ügyfél holmija visszarakva', group: 'Adminisztráció' },
]

const GROUPS = [...new Set(QC_ITEMS.map(i => i.group))]

export function QualityControlPage({ profile }: Props) {
  const supabase = createClient()
  const { toast } = useToast()
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [selectedWO, setSelectedWO] = useState<any>(null)
  const [qcData, setQcData] = useState<Record<string, 'ok' | 'nok' | 'na'>>({})
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(GROUPS))
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadWorkOrders() }, [])

  async function loadWorkOrders() {
    const { data } = await supabase
      .from('work_orders')
      .select(`id, order_number, status, vehicle:vehicles(make, model, license_plate), mechanic:profiles!work_orders_mechanic_id_fkey(full_name)`)
      .in('status', ['in_progress', 'waiting_parts', 'ready'])
      .order('created_at', { ascending: false })
    setWorkOrders(data || [])
    setLoading(false)
  }

  async function selectWO(wo: any) {
    setSelectedWO(wo)
    const { data } = await supabase.from('qc_checks').select('*').eq('work_order_id', wo.id).single()
    if (data) {
      setQcData(data.toggle_values || {})
      setNotes(data.notes || '')
    } else {
      setQcData({})
      setNotes('')
    }
  }

  function setCheck(id: string, val: 'ok' | 'nok' | 'na') {
    setQcData(prev => ({ ...prev, [id]: val }))
  }

  async function save(approve = false) {
    if (!selectedWO) return
    setSaving(true)
    const checkedItems = Object.entries(qcData).filter(([, v]) => v === 'ok').map(([k]) => k)
    const payload: any = {
      work_order_id: selectedWO.id,
      toggle_values: qcData,
      checked_items: checkedItems,
      notes,
      status: approve ? 'approved' : 'in_progress',
      updated_at: new Date().toISOString(),
    }
    if (approve) {
      payload.approved_by = profile?.full_name || 'QC'
      payload.approved_at = new Date().toISOString()
    }

    const { error } = await supabase.from('qc_checks').upsert(payload, { onConflict: 'work_order_id' })
    if (error) { toast(`Hiba: ${error.message}`, 'error'); setSaving(false); return }

    if (approve) {
      await supabase.from('work_orders').update({ status: 'ready' }).eq('id', selectedWO.id)
      toast('QC jóváhagyva – státusz: Kész')
      loadWorkOrders()
    } else {
      toast('QC mentve')
    }
    setSaving(false)
  }

  const totalChecked = Object.keys(qcData).length
  const okCount = Object.values(qcData).filter(v => v === 'ok').length
  const nokCount = Object.values(qcData).filter(v => v === 'nok').length
  const progress = QC_ITEMS.length > 0 ? Math.round((totalChecked / QC_ITEMS.length) * 100) : 0

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <CheckSquare size={22} className="text-[#C9A84C]" />
        <div>
          <h1 className="text-xl font-semibold text-[#1a2942]">Minőségellenőrzés</h1>
          <p className="text-sm text-[#5a6a80]">QC ellenőrzés átadás előtt</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Work order list */}
        <div className="bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e8ecf0] bg-[#f8f9fb]">
            <h2 className="text-sm font-semibold text-[#1a2942]">Aktív munkalapok</h2>
          </div>
          {loading ? (
            <div className="p-4 text-sm text-[#9aabb8]">Betöltés...</div>
          ) : workOrders.length === 0 ? (
            <div className="p-4 text-sm text-[#9aabb8]">Nincs aktív munkalap</div>
          ) : (
            <div className="divide-y divide-[#f0f2f5]">
              {workOrders.map(wo => (
                <button key={wo.id} onClick={() => selectWO(wo)}
                  className={`w-full text-left px-4 py-3 hover:bg-[#f8f9fb] transition-colors ${selectedWO?.id === wo.id ? 'bg-[rgba(201,168,76,0.08)] border-l-2 border-l-[#C9A84C]' : ''}`}>
                  <div className="text-[13px] font-medium text-[#1a2942]">{wo.order_number}</div>
                  <div className="text-[11px] text-[#5a6a80] mt-0.5">
                    {wo.vehicle?.make} {wo.vehicle?.model} · {wo.vehicle?.license_plate}
                  </div>
                  <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    wo.status === 'ready' ? 'bg-green-100 text-green-700' :
                    wo.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>{wo.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* QC checklist */}
        <div className="lg:col-span-2">
          {!selectedWO ? (
            <div className="bg-white rounded-xl border border-[#e8ecf0] flex items-center justify-center h-64 text-[#9aabb8] text-sm">
              Válassz ki egy munkalapot a bal oldali listából
            </div>
          ) : (
            <div className="space-y-4">
              {/* Header */}
              <div className="bg-white rounded-xl border border-[#e8ecf0] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-[#1a2942]">{selectedWO.order_number}</h3>
                    <p className="text-sm text-[#5a6a80]">
                      {selectedWO.vehicle?.make} {selectedWO.vehicle?.model} – {selectedWO.vehicle?.license_plate}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-[22px] font-bold text-[#1a2942]">{progress}%</div>
                    <div className="text-[11px] text-[#5a6a80]">{okCount} OK / {nokCount} NOK</div>
                  </div>
                </div>
                <div className="mt-3 bg-[#f0f2f5] rounded-full h-2">
                  <div className="bg-[#C9A84C] h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Checklist by group */}
              {GROUPS.map(group => {
                const items = QC_ITEMS.filter(i => i.group === group)
                const isExpanded = expandedGroups.has(group)
                return (
                  <div key={group} className="bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
                    <button
                      onClick={() => setExpandedGroups(prev => {
                        const next = new Set(prev)
                        next.has(group) ? next.delete(group) : next.add(group)
                        return next
                      })}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[#f8f9fb] text-sm font-medium text-[#1a2942] hover:bg-[#f0f2f5]"
                    >
                      <span>{group}</span>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                    {isExpanded && (
                      <div className="divide-y divide-[#f0f2f5]">
                        {items.map(item => {
                          const val = qcData[item.id]
                          return (
                            <div key={item.id} className="flex items-center px-4 py-2.5 gap-3">
                              <span className="flex-1 text-[13px] text-[#1a2942]">{item.label}</span>
                              <div className="flex gap-1.5">
                                {(['ok', 'nok', 'na'] as const).map(v => (
                                  <button key={v} onClick={() => setCheck(item.id, v)}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                                      val === v
                                        ? v === 'ok' ? 'bg-green-500 text-white border-green-500'
                                          : v === 'nok' ? 'bg-red-500 text-white border-red-500'
                                          : 'bg-gray-400 text-white border-gray-400'
                                        : 'border-[#e0e4e8] text-[#9aabb8] hover:border-[#1a2942]'
                                    }`}>
                                    {v.toUpperCase()}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Notes */}
              <div className="bg-white rounded-xl border border-[#e8ecf0] p-4">
                <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-2 block">Megjegyzések</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="QC megjegyzések, javítandó dolgok..."
                  className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-[13px] text-[#1a2942] min-h-[80px] resize-none outline-none focus:border-[#C9A84C]" />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="secondary" onClick={() => save(false)} disabled={saving} className="flex-1">
                  <Save size={14} /> Mentés folytatásra
                </Button>
                <Button variant="primary" onClick={() => save(true)} disabled={saving || nokCount > 0} className="flex-1">
                  <ThumbsUp size={14} />
                  {nokCount > 0 ? `${nokCount} NOK van` : 'QC Jóváhagyás'}
                </Button>
              </div>
              {nokCount > 0 && (
                <p className="text-[11px] text-amber-600 text-center">
                  <AlertCircle size={12} className="inline mr-1" />
                  Jóváhagyáshoz javítsd ki a NOK tételeket, vagy állítsd N/A-ra
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
