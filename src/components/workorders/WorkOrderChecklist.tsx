'use client'
import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import {
  CheckCircle2, XCircle, AlertTriangle, Lock, Unlock,
  ChevronDown, ChevronUp, ClipboardCheck, User, Car,
  Wrench, Camera, FileText, Clock, Package, Shield, PenLine
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface CheckItem {
  id: string
  label: string
  passed: boolean
  optional?: boolean
  skipReason?: string
}

interface CheckSection {
  id: string
  label: string
  icon: any
  items: CheckItem[]
  weight: number // how many total points this section represents
}

interface Props {
  wo: any
  tasks: any[]
  photos: any[]
  parts: any[]
  events: any[]
  notes: { internal: string; customer: string }
  profile: { id: string; full_name: string; role: string }
  onClose: (workOrderId: string) => void
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkOrderChecklist({ wo, tasks, photos, parts, events, notes, profile, onClose }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['tasks', 'photos']))
  const [closing, setClosing] = useState(false)
  const [showFinalConfirm, setShowFinalConfirm] = useState(false)
  const [noPartsSkipped, setNoPartsSkipped] = useState(false)
  const [vinSkipped, setVinSkipped] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()
  const isAdmin = profile.role === 'super_admin' || profile.role === 'admin'
  const isMechanic = profile.role === 'mechanic'

  // ─── Compute check sections ─────────────────────────────────────────────

  const sections: CheckSection[] = useMemo(() => {
    const checkinPhotos = photos.filter(p => p.category === 'checkin' || p.category === 'intake')
    const repairPhotos  = photos.filter(p => p.category === 'repair' || p.category === 'general')
    const checkoutPhotos = photos.filter(p => p.category === 'checkout' || p.category === 'delivery')

    const openTasks     = tasks.filter(t => t.status === 'pending')
    const activeTasks   = tasks.filter(t => t.status === 'in_progress')
    const problemTasks  = tasks.filter(t => t.status === 'problem')
    const doneTasks     = tasks.filter(t => t.status === 'done')
    const allTasksDone  = tasks.length === 0 || (openTasks.length === 0 && activeTasks.length === 0 && problemTasks.length === 0)

    const isHourly = wo.pricing_type === 'hourly' || wo.pricing_type === 'combined'
    const hasOpenTimer = tasks.some(t => t.timer_started_at && t.status === 'in_progress')

    const hasCheckinSig  = events.some(e => e.event_type === 'signed' && e.phase === 'intake')
    const hasCheckoutSig = events.some(e => e.event_type === 'signed' && e.phase === 'delivery')
    const hasQCSig       = events.some(e => e.event_type === 'signed' && e.phase === 'quality')

    const checkinDone   = wo.checkin_status  === 'done'
    const repairDone    = wo.repair_status   === 'done'
    const qualityDone   = wo.quality_status  === 'approved'

    const hasVehicle    = !!wo.vehicle_id
    const hasCustomer   = !!wo.customer_id
    const hasPhone      = !!wo.customer?.phone
    const hasPlate      = !!wo.vehicle?.license_plate
    const hasMileage    = !!wo.checkin_mileage
    const hasVIN        = vinSkipped || !!(wo.vehicle as any)?.vin

    const hasInternalNote  = !!(notes.internal?.trim())
    const hasCustomerNote  = !!(notes.customer?.trim())

    const partsOk = noPartsSkipped || parts.length > 0

    const hasLinkedQuote = !!wo.quote_id || events.some(e => e.event_type === 'quote_linked')

    return [
      {
        id: 'customer',
        label: 'Ügyfél',
        icon: User,
        weight: 10,
        items: [
          { id: 'cust_assigned',  label: 'Ügyfél hozzárendelve',   passed: hasCustomer },
          { id: 'cust_phone',     label: 'Telefonszám rögzítve',   passed: hasPhone },
          { id: 'veh_assigned',   label: 'Jármű hozzárendelve',    passed: hasVehicle },
        ],
      },
      {
        id: 'vehicle',
        label: 'Jármű',
        icon: Car,
        weight: 10,
        items: [
          { id: 'veh_plate',      label: 'Rendszám rögzítve',      passed: hasPlate },
          { id: 'veh_mileage',    label: 'Futásteljesítmény rögzítve', passed: hasMileage },
          { id: 'veh_vin',        label: 'VIN megadva',            passed: hasVIN, optional: true, skipReason: vinSkipped ? 'Kihagyva' : undefined },
        ],
      },
      {
        id: 'tasks',
        label: 'Feladatok',
        icon: Wrench,
        weight: 25,
        items: tasks.length === 0
          ? [{ id: 'tasks_none', label: 'Nincs generált feladat (rendben)', passed: true }]
          : [
            { id: 'tasks_done',      label: `Minden feladat kész (${doneTasks.length}/${tasks.length})`, passed: allTasksDone },
            { id: 'tasks_open',      label: `Nincs nyitott feladat (${openTasks.length} db)`, passed: openTasks.length === 0 },
            { id: 'tasks_active',    label: `Nincs folyamatban lévő feladat (${activeTasks.length} db)`, passed: activeTasks.length === 0 },
            { id: 'tasks_problem',   label: `Nincs problémás feladat (${problemTasks.length} db)`, passed: problemTasks.length === 0 },
          ],
      },
      {
        id: 'checklists',
        label: 'Checklisták',
        icon: ClipboardCheck,
        weight: 15,
        items: [
          { id: 'cl_checkin',   label: 'Check-In kész',        passed: checkinDone },
          { id: 'cl_repair',    label: 'Javítás kész',         passed: repairDone },
          { id: 'cl_quality',   label: 'QC jóváhagyva',        passed: qualityDone },
        ],
      },
      {
        id: 'photos',
        label: 'Fotódokumentáció',
        icon: Camera,
        weight: 15,
        items: [
          { id: 'ph_checkin',  label: `Check-In fotók (${checkinPhotos.length} db)`,    passed: checkinPhotos.length >= 1 },
          { id: 'ph_repair',   label: `Javítási fotók (${repairPhotos.length} db)`,     passed: repairPhotos.length >= 1, optional: true },
          { id: 'ph_checkout', label: `Check-Out fotók (${checkoutPhotos.length} db)`,  passed: checkoutPhotos.length >= 1 },
        ],
      },
      {
        id: 'notes',
        label: 'Megjegyzések',
        icon: FileText,
        weight: 10,
        items: [
          { id: 'note_internal', label: 'Technikusi megjegyzés kitöltve', passed: hasInternalNote },
          { id: 'note_customer', label: 'Ügyfélnek látható összefoglaló', passed: hasCustomerNote },
        ],
      },
      {
        id: 'parts',
        label: 'Alkatrészek',
        icon: Package,
        weight: 5,
        items: [
          { id: 'parts_recorded', label: noPartsSkipped ? 'Alkatrész nem szükséges ✓' : `Alkatrészek rögzítve (${parts.length} tétel)`, passed: partsOk },
        ],
      },
      {
        id: 'time',
        label: 'Időrögzítés',
        icon: Clock,
        weight: 5,
        items: isHourly
          ? [
            { id: 'timer_closed', label: 'Időzítő lezárva', passed: !hasOpenTimer },
            { id: 'time_recorded', label: 'Munkaidő rögzítve', passed: tasks.some(t => t.elapsed_seconds > 0) },
          ]
          : [{ id: 'time_fixed', label: 'Fix áras munka – automatikusan teljesített', passed: true }],
      },
      {
        id: 'signatures',
        label: 'Digitális aláírások',
        icon: PenLine,
        weight: 5,
        items: [
          { id: 'sig_checkin',  label: 'Check-In aláírás',  passed: hasCheckinSig,  optional: true },
          { id: 'sig_checkout', label: 'Check-Out aláírás', passed: hasCheckoutSig, optional: true },
        ],
      },
    ]
  }, [wo, tasks, photos, parts, events, notes, vinSkipped, noPartsSkipped])

  // ─── Compute score ────────────────────────────────────────────────────────

  const { score, totalRequired, totalPassed, missingItems } = useMemo(() => {
    let totalRequired = 0
    let totalPassed = 0
    const missing: { section: string; label: string }[] = []

    for (const section of sections) {
      for (const item of section.items) {
        if (item.optional) continue
        totalRequired++
        if (item.passed) {
          totalPassed++
        } else {
          missing.push({ section: section.label, label: item.label })
        }
      }
    }

    const score = totalRequired > 0 ? Math.round((totalPassed / totalRequired) * 100) : 100
    return { score, totalRequired, totalPassed, missingItems: missing }
  }, [sections])

  const canClose = score === 100

  // ─── Close handler ────────────────────────────────────────────────────────

  const handleClose = async () => {
    if (!canClose) return
    setClosing(true)

    await supabase.from('work_orders').update({
      status: 'closed',
      checkout_status: 'delivered',
      last_activity_at: new Date().toISOString(),
    }).eq('id', wo.id)

    await supabase.from('work_order_events').insert({
      work_order_id: wo.id,
      event_type: 'closed',
      title: `Munkalap lezárva – ${score}% teljesítés`,
      user_name: profile.full_name,
      phase: 'general',
      metadata: {
        closed_by: profile.id,
        closed_at: new Date().toISOString(),
        checklist_score: score,
        total_required: totalRequired,
        total_passed: totalPassed,
        missing_items: missingItems,
      },
    })

    toast('Munkalap sikeresen lezárva')
    setShowFinalConfirm(false)
    setClosing(false)
    onClose(wo.id)
  }

  // ─── Toggle section ───────────────────────────────────────────────────────

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ─── Score color ──────────────────────────────────────────────────────────

  const scoreColor = score === 100 ? 'text-emerald-600' : score >= 75 ? 'text-amber-500' : 'text-red-600'
  const scoreBg    = score === 100 ? 'bg-emerald-50 border-emerald-200' : score >= 75 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
  const scoreBar   = score === 100 ? 'bg-emerald-500' : score >= 75 ? 'bg-amber-400' : 'bg-red-500'

  return (
    <div className="space-y-4 pb-6">

      {/* ── Score header ─────────────────────────────────────────────── */}
      <div className={`rounded-2xl border p-4 ${scoreBg}`}>
        <div className="flex items-center gap-4">
          <div className="text-center shrink-0">
            <div className={`text-[36px] font-bold leading-none ${scoreColor}`}>{score}%</div>
            <div className="text-[10px] text-[#5a6a80] mt-0.5 font-medium uppercase tracking-wider">teljesítés</div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12px] font-semibold text-[#0B1E3D]">Lezárási állapot</span>
              {canClose
                ? <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600"><Unlock size={12}/> Lezárható</span>
                : <span className="flex items-center gap-1 text-[11px] font-semibold text-red-600"><Lock size={12}/> Nem lezárható</span>
              }
            </div>
            <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${scoreBar}`} style={{ width: `${score}%` }} />
            </div>
            <div className="text-[11px] text-[#5a6a80] mt-1.5">
              {totalPassed}/{totalRequired} kötelező elem teljesítve
              {missingItems.length > 0 && <span className="text-red-600 ml-2">· {missingItems.length} hiányzik</span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Missing items summary ─────────────────────────────────────── */}
      {missingItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1.5">
          <p className="text-[11px] font-semibold text-red-700 uppercase tracking-wider mb-2">Hiányzó elemek</p>
          {missingItems.map((m, i) => (
            <div key={i} className="flex items-start gap-2">
              <XCircle size={13} className="text-red-500 shrink-0 mt-0.5" />
              <span className="text-[12px] text-red-700">
                <span className="text-red-400">{m.section}:</span> {m.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Check sections ────────────────────────────────────────────── */}
      <div className="space-y-2">
        {sections.map(section => {
          const sectionPassed = section.items.filter(i => !i.optional && i.passed).length
          const sectionRequired = section.items.filter(i => !i.optional).length
          const allOk = sectionPassed === sectionRequired
          const isOpen = expanded.has(section.id)
          const Icon = section.icon

          return (
            <div key={section.id} className={`rounded-xl border overflow-hidden ${allOk ? 'border-emerald-200 bg-emerald-50/40' : 'border-red-200 bg-red-50/30'}`}>
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left"
              >
                <Icon size={15} className={allOk ? 'text-emerald-600' : 'text-red-500'} />
                <span className="flex-1 text-[13px] font-medium text-[#0B1E3D]">{section.label}</span>
                <span className={`text-[11px] font-semibold mr-2 ${allOk ? 'text-emerald-600' : 'text-red-600'}`}>
                  {sectionPassed}/{sectionRequired}
                </span>
                {allOk
                  ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                  : <XCircle size={16} className="text-red-400 shrink-0" />
                }
                {isOpen ? <ChevronUp size={13} className="text-[#8fa0b5] shrink-0 ml-1" /> : <ChevronDown size={13} className="text-[#8fa0b5] shrink-0 ml-1" />}
              </button>

              {isOpen && (
                <div className="px-4 pb-3 space-y-1.5 border-t border-white/60">
                  {section.items.map(item => (
                    <div key={item.id} className="flex items-start gap-2 py-1">
                      {item.passed
                        ? <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        : item.optional
                          ? <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                          : <XCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
                      }
                      <span className={`text-[12px] flex-1 ${item.passed ? 'text-emerald-700' : item.optional ? 'text-amber-600' : 'text-red-600'}`}>
                        {item.label}
                        {item.optional && !item.passed && <span className="text-[10px] text-amber-400 ml-1">(opcionális)</span>}
                        {item.skipReason && <span className="text-[10px] text-[#8fa0b5] ml-1">– {item.skipReason}</span>}
                      </span>
                    </div>
                  ))}

                  {/* Skip options */}
                  {section.id === 'vehicle' && (
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input type="checkbox" checked={vinSkipped} onChange={e => setVinSkipped(e.target.checked)} className="w-3.5 h-3.5 accent-[#C9A84C]" />
                      <span className="text-[11px] text-[#5a6a80]">VIN nem elérhető / kihagyás indokolva</span>
                    </label>
                  )}
                  {section.id === 'parts' && (
                    <label className="flex items-center gap-2 mt-2 cursor-pointer">
                      <input type="checkbox" checked={noPartsSkipped} onChange={e => setNoPartsSkipped(e.target.checked)} className="w-3.5 h-3.5 accent-[#C9A84C]" />
                      <span className="text-[11px] text-[#5a6a80]">Alkatrész nem volt szükséges (megerősítés)</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Final confirm / Close button ─────────────────────────────── */}
      {isAdmin && (
        <div className="sticky bottom-0 bg-white border-t border-[rgba(11,30,61,0.10)] pt-4 pb-2 -mx-1 px-1">
          {!showFinalConfirm ? (
            <button
              onClick={() => canClose ? setShowFinalConfirm(true) : undefined}
              disabled={!canClose}
              className={`w-full py-3.5 rounded-xl text-[14px] font-bold transition-all ${
                canClose
                  ? 'bg-[#0B1E3D] text-white hover:bg-[#142a50] active:scale-98 shadow-lg'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {canClose
                ? <span className="flex items-center justify-center gap-2"><Unlock size={16}/> Munkalap lezárása</span>
                : <span className="flex items-center justify-center gap-2"><Lock size={16}/> Lezárás ({missingItems.length} elem hiányzik)</span>
              }
            </button>
          ) : (
            <div className="bg-[#0B1E3D] rounded-xl p-4 space-y-3">
              <p className="text-white text-[13px] font-semibold text-center">Végső megerősítés</p>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {sections.slice(0, 6).map(s => {
                  const sOk = s.items.filter(i => !i.optional).every(i => i.passed)
                  return (
                    <div key={s.id} className="flex items-center gap-1.5">
                      {sOk
                        ? <CheckCircle2 size={12} className="text-emerald-400" />
                        : <XCircle size={12} className="text-red-400" />
                      }
                      <span className={sOk ? 'text-white/70' : 'text-red-400'}>{s.label}</span>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowFinalConfirm(false)}
                  className="flex-1 py-2.5 bg-white/10 text-white/70 rounded-lg text-[12px] hover:bg-white/20 transition-colors"
                >
                  Vissza
                </button>
                <button
                  onClick={handleClose}
                  disabled={closing}
                  className="flex-1 py-2.5 bg-[#C9A84C] text-[#0B1E3D] rounded-lg text-[13px] font-bold hover:bg-[#b8963e] transition-colors disabled:opacity-60"
                >
                  {closing ? 'Lezárás...' : '✓ Végleges lezárás'}
                </button>
              </div>
            </div>
          )}

          {/* Karl view: only show missing items, no close button */}
        </div>
      )}

      {isMechanic && missingItems.length > 0 && (
        <div className="bg-[#0B1E3D] rounded-xl p-4">
          <p className="text-[12px] font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-[#C9A84C]" /> Hiányzó elemek (az Ön feladatai)
          </p>
          <div className="space-y-2">
            {missingItems.filter(m =>
              ['Feladatok', 'Fotódokumentáció', 'Megjegyzések', 'Checklisták'].includes(m.section)
            ).map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                <XCircle size={12} className="text-red-400 shrink-0 mt-0.5" />
                <span className="text-[12px] text-white/70">{m.label}</span>
              </div>
            ))}
            {missingItems.filter(m =>
              ['Feladatok', 'Fotódokumentáció', 'Megjegyzések', 'Checklisták'].includes(m.section)
            ).length === 0 && (
              <p className="text-[12px] text-white/50">Az Ön részéről minden rendben.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
