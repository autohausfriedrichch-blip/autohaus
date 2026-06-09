'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import {
  X, CheckSquare, Circle, Camera, Clock, Play, Pause, Square,
  CheckCircle, AlertTriangle, Package, Flag, Wrench, User,
  ChevronRight, Info, AlertCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WFWorkOrder {
  id: string
  status: string
  order_number?: string | null
  fault_description?: string | null
  work_to_do?: string | null
  internal_notes?: string | null
  pricing_mode?: string | null
  customer: { id: string; full_name: string; phone?: string } | null
  vehicle: { make: string; model: string; license_plate: string } | null
}

interface WOTask {
  id: string
  work_order_id: string
  title: string
  status: 'pending' | 'in_progress' | 'waiting' | 'done' | 'problem'
  pricing_type?: string | null
  checklist?: string[] | null
  checklist_done?: string[] | null
  notes?: string | null
  elapsed_seconds: number
  timer_started_at?: string | null
  sort_order: number
  task_number?: string | null
}

// ─── Phase definitions ────────────────────────────────────────────────────────

type PhaseKey = 'checkin' | 'diagnostics' | 'parts' | 'repair' | 'qc' | 'handback'

const PHASE_LIST: { key: PhaseKey; label: string; required: boolean; icon: string }[] = [
  { key: 'checkin',     label: 'Check-In',        required: true,  icon: '📋' },
  { key: 'diagnostics', label: 'Diagnosztika',     required: false, icon: '🔍' },
  { key: 'parts',       label: 'Alkatrész',        required: false, icon: '⚙️' },
  { key: 'repair',      label: 'Javítás',          required: true,  icon: '🔧' },
  { key: 'qc',          label: 'Min.-ellenőrzés',  required: true,  icon: '✅' },
  { key: 'handback',    label: 'Visszaadás',       required: true,  icon: '🏁' },
]

const CHECKIN_ITEMS: { key: string; label: string; photoCategory?: string; requiresPhoto: boolean }[] = [
  { key: 'plate',     label: 'Rendszám fotó',           photoCategory: 'checkin_plate',    requiresPhoto: true },
  { key: 'odometer',  label: 'Kilométeróra fotó',        photoCategory: 'checkin_odometer', requiresPhoto: true },
  { key: 'front',     label: 'Autó eleje fotó',          photoCategory: 'checkin_front',    requiresPhoto: true },
  { key: 'rear',      label: 'Autó hátulja fotó',        photoCategory: 'checkin_rear',     requiresPhoto: true },
  { key: 'left',      label: 'Bal oldal fotó',           photoCategory: 'checkin_left',     requiresPhoto: true },
  { key: 'right',     label: 'Jobb oldal fotó',          photoCategory: 'checkin_right',    requiresPhoto: true },
  { key: 'interior',  label: 'Belső fotó',               photoCategory: 'checkin_interior', requiresPhoto: true },
  { key: 'damage',    label: 'Sérülések fotózása (ha van)', photoCategory: 'checkin_damage', requiresPhoto: false },
  { key: 'key',       label: 'Kulcs átvétel rögzítése',  requiresPhoto: false },
  { key: 'comment',   label: 'Megjegyzés (ha szükséges)', requiresPhoto: false },
]

const QC_ITEMS: { key: string; label: string }[] = [
  { key: 'work_done',       label: 'Elvégzett munka ellenőrizve' },
  { key: 'tasks_done',      label: 'Minden feladat készre jelölve' },
  { key: 'photos_done',     label: 'Szükséges fotók feltöltve' },
  { key: 'torque',          label: 'Csavarok / kerékcsavarok nyomatékolva (ha releváns)' },
  { key: 'fluids',          label: 'Folyadékszintek ellenőrizve (ha releváns)' },
  { key: 'error_codes',     label: 'Hibakód ellenőrizve (ha releváns)' },
  { key: 'test_drive_need', label: 'Próbaút szükséges? (igen/nem)' },
  { key: 'test_drive_done', label: 'Próbaút elvégezve (ha szükséges)' },
  { key: 'customer_summary',label: 'Ügyfélnek látható összefoglaló megírva' },
  { key: 'checkout_photos', label: 'Check-out fotók elkészítve' },
]

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}ó ${m}p ${s}mp`
  if (m > 0) return `${m}p ${s}mp`
  return `${s}mp`
}

// ─── Photo Upload Button ──────────────────────────────────────────────────────

function PhotoBtn({
  label,
  category,
  orderId,
  userId,
  onUploaded,
}: {
  label: string
  category: string
  orderId: string
  userId: string | null
  onUploaded: (category: string) => void
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File) => {
    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (e) => {
      const base64 = e.target?.result as string
      const { error } = await supabase.from('work_order_photos').insert({
        work_order_id: orderId,
        url: base64,
        category,
        uploaded_by: userId ?? 'karl',
      })
      setUploading(false)
      if (error) {
        toast('Fotó feltöltési hiba', 'error')
      } else {
        toast(`${label} feltöltve ✓`, 'success')
        onUploaded(category)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex gap-1.5">
      <button
        className="flex-1 flex items-center justify-center gap-1.5 bg-[#0B1E3D] text-white text-[11px] font-semibold py-2 px-3 rounded-lg"
        onClick={() => camRef.current?.click()}
        disabled={uploading}
      >
        <Camera size={12} /> {uploading ? '...' : 'Kamera'}
      </button>
      <button
        className="flex-1 flex items-center justify-center gap-1.5 bg-[rgba(11,30,61,0.08)] text-[#0B1E3D] text-[11px] font-semibold py-2 px-3 rounded-lg border border-[rgba(11,30,61,0.12)]"
        onClick={() => galRef.current?.click()}
        disabled={uploading}
      >
        <Camera size={12} /> Galéria
      </button>
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
      <input ref={galRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }} />
    </div>
  )
}

// ─── Task Timer ───────────────────────────────────────────────────────────────

function TaskTimer({ task, onUpdate }: { task: WOTask; onUpdate: (id: string, u: Partial<WOTask>) => void }) {
  const supabase = createClient()
  const { toast } = useToast()
  const [ticking, setTicking] = useState(!!task.timer_started_at)
  const [elapsed, setElapsed] = useState(() => {
    let base = task.elapsed_seconds || 0
    if (task.timer_started_at) base += Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000)
    return base
  })
  const ref = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (ticking) {
      ref.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (ref.current) clearInterval(ref.current)
    }
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [ticking])

  const start = async () => {
    const now = new Date().toISOString()
    setTicking(true)
    await supabase.from('work_order_tasks').update({ timer_started_at: now, status: 'in_progress' }).eq('id', task.id)
    await supabase.from('work_order_timeline').insert({ work_order_id: task.work_order_id, event_type: 'timer_start', title: `Időzítő elindítva: ${task.title}`, user_name: 'Karl', phase: 'repair', metadata: { task_id: task.id } })
    onUpdate(task.id, { timer_started_at: now, status: 'in_progress' })
  }

  const pause = async () => {
    const extra = task.timer_started_at ? Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000) : 0
    const newE = (task.elapsed_seconds || 0) + extra
    setTicking(false)
    await supabase.from('work_order_tasks').update({ timer_started_at: null, elapsed_seconds: newE }).eq('id', task.id)
    onUpdate(task.id, { timer_started_at: null, elapsed_seconds: newE })
  }

  const stop = async () => {
    const extra = task.timer_started_at ? Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000) : 0
    const newE = (task.elapsed_seconds || 0) + extra
    setTicking(false)
    await supabase.from('work_order_tasks').update({ timer_started_at: null, elapsed_seconds: newE }).eq('id', task.id)
    await supabase.from('work_order_timeline').insert({ work_order_id: task.work_order_id, event_type: 'timer_stop', title: `Időzítő leállítva: ${task.title}`, description: `Rögzített idő: ${formatElapsed(newE)}`, user_name: 'Karl', phase: 'repair', metadata: { task_id: task.id, elapsed_seconds: newE } })
    onUpdate(task.id, { timer_started_at: null, elapsed_seconds: newE })
    toast(`Idő rögzítve: ${formatElapsed(newE)}`, 'success')
  }

  return (
    <div className="bg-[#0B1E3D] rounded-xl p-3 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <Clock size={13} className={ticking ? 'text-[#C9A84C] animate-pulse' : 'text-white/40'} />
        <span className="font-mono text-[16px] font-bold text-white flex-1">{formatElapsed(elapsed)}</span>
        {ticking && <span className="text-[9px] text-[#C9A84C] font-bold">AKTÍV</span>}
      </div>
      <div className="flex gap-1.5">
        {!ticking ? (
          <button className="flex-1 flex items-center justify-center gap-1 bg-[#C9A84C] text-[#0B1E3D] font-bold text-[11px] py-2 rounded-lg" onClick={start}>
            <Play size={12} /> Indítás
          </button>
        ) : (
          <>
            <button className="flex-1 flex items-center justify-center gap-1 bg-white/10 text-white text-[11px] py-2 rounded-lg" onClick={pause}>
              <Pause size={12} /> Szünet
            </button>
            <button className="flex-1 flex items-center justify-center gap-1 bg-red-500 text-white text-[11px] py-2 rounded-lg" onClick={stop}>
              <Square size={12} /> Stop
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Repair Task Card ─────────────────────────────────────────────────────────

function RepairTaskCard({
  task,
  showTimer,
  onUpdate,
}: {
  task: WOTask
  showTimer: boolean
  onUpdate: (id: string, u: Partial<WOTask>) => void
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(task.notes || '')

  const checklist = task.checklist || []
  const checkDone = task.checklist_done || []
  const isDone = task.status === 'done'
  const isProblem = task.status === 'problem'

  const toggleCheck = async (item: string) => {
    const newDone = checkDone.includes(item) ? checkDone.filter(i => i !== item) : [...checkDone, item]
    await supabase.from('work_order_tasks').update({ checklist_done: newDone }).eq('id', task.id)
    onUpdate(task.id, { checklist_done: newDone })
  }

  const markDone = async () => {
    await supabase.from('work_order_tasks').update({ status: 'done', completed_at: new Date().toISOString(), timer_started_at: null }).eq('id', task.id)
    await supabase.from('work_order_timeline').insert({ work_order_id: task.work_order_id, event_type: 'task_done', title: `Feladat kész: ${task.title}`, user_name: 'Karl', phase: 'repair', metadata: { task_id: task.id } })
    onUpdate(task.id, { status: 'done' })
    toast('Feladat kész!', 'success')
  }

  const markProblem = async () => {
    await supabase.from('work_order_tasks').update({ status: 'problem' }).eq('id', task.id)
    await supabase.from('work_order_timeline').insert({ work_order_id: task.work_order_id, event_type: 'task_problem', title: `Probléma: ${task.title}`, user_name: 'Karl', phase: 'repair', metadata: { task_id: task.id } })
    onUpdate(task.id, { status: 'problem' })
    toast('Probléma jelölve', 'info')
  }

  const saveNotes = async () => {
    await supabase.from('work_order_tasks').update({ notes }).eq('id', task.id)
    onUpdate(task.id, { notes })
    toast('Megjegyzés mentve', 'success')
  }

  const borderColor = isDone ? 'border-emerald-400' : isProblem ? 'border-red-400' : task.status === 'in_progress' ? 'border-[#C9A84C]' : 'border-[rgba(11,30,61,0.12)]'
  const bg = isDone ? 'bg-emerald-50' : isProblem ? 'bg-red-50' : 'bg-white'

  return (
    <div className={`border rounded-xl overflow-hidden ${borderColor} ${bg}`}>
      <button className="w-full flex items-center gap-3 px-3 py-3 text-left" onClick={() => setOpen(o => !o)}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isDone ? <CheckCircle size={14} className="text-emerald-600 shrink-0" /> :
             isProblem ? <AlertTriangle size={14} className="text-red-500 shrink-0" /> :
             <Circle size={14} className="text-[rgba(11,30,61,0.3)] shrink-0" />}
            <span className={`text-[13px] font-semibold ${isDone ? 'line-through text-[#5a6a80]' : 'text-[#0B1E3D]'}`}>{task.title}</span>
          </div>
          <div className="flex items-center gap-2 mt-1 ml-5 flex-wrap">
            {task.task_number && <span className="text-[9px] font-mono text-[#5a6a80] bg-[rgba(11,30,61,0.06)] px-1.5 py-0.5 rounded">{task.task_number}</span>}
            {checklist.length > 0 && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${checkDone.length === checklist.length ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{checkDone.length}/{checklist.length}</span>}
            {showTimer && task.elapsed_seconds > 0 && <span className="text-[10px] text-[#5a6a80] flex items-center gap-0.5"><Clock size={9} />{formatElapsed(task.elapsed_seconds)}</span>}
          </div>
        </div>
        <span className="text-[#5a6a80] text-[11px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && !isDone && (
        <div className="border-t border-[rgba(11,30,61,0.08)] px-3 pb-3 pt-2.5 space-y-3">
          {checklist.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-[#5a6a80] uppercase tracking-wide">Lépések — {checkDone.length}/{checklist.length}</div>
              {checklist.map((item: string) => (
                <button key={item} onClick={() => toggleCheck(item)}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left ${checkDone.includes(item) ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-white border-[rgba(11,30,61,0.10)] text-[#0B1E3D]'}`}>
                  {checkDone.includes(item) ? <CheckSquare size={12} className="text-emerald-600 shrink-0" /> : <Circle size={12} className="text-[rgba(11,30,61,0.3)] shrink-0" />}
                  <span className={`text-[12px] ${checkDone.includes(item) ? 'line-through' : ''}`}>{item}</span>
                </button>
              ))}
            </div>
          )}

          {showTimer && <TaskTimer task={task} onUpdate={onUpdate} />}

          <div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Megjegyzés a feladathoz..." rows={2}
              className="w-full text-[12px] p-2.5 rounded-lg border border-[rgba(11,30,61,0.12)] resize-none focus:outline-none focus:border-[#0B1E3D]" />
            {notes !== (task.notes || '') && (
              <button onClick={saveNotes} className="mt-1 text-[11px] text-[#0B1E3D] font-semibold underline">Mentés</button>
            )}
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 text-white font-bold text-[12px] py-2.5 rounded-xl" onClick={markDone}>
              <CheckCircle size={14} /> Kész!
            </button>
            <button className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-700 border border-red-200 text-[12px] py-2.5 rounded-xl" onClick={markProblem}>
              <Flag size={14} /> Probléma
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main WorkflowModal ───────────────────────────────────────────────────────

export function WorkflowModal({
  order: initialOrder,
  onClose,
  onRefresh,
  userId,
  profile,
}: {
  order: WFWorkOrder
  onClose: () => void
  onRefresh: () => void
  userId: string | null
  profile?: any
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [order, setOrder] = useState(initialOrder)
  const [activePhase, setActivePhase] = useState<PhaseKey>('checkin')
  const [saving, setSaving] = useState(false)

  // Check-in state
  const [checkinDone, setCheckinDone] = useState<string[]>([])
  const [uploadedCategories, setUploadedCategories] = useState<string[]>([])
  const [checkinNotes, setCheckinNotes] = useState('')

  // Diagnostics state
  const [diagNeeded, setDiagNeeded] = useState<boolean | null>(null)
  const [diagNotes, setDiagNotes] = useState('')
  const [diagDone, setDiagDone] = useState(false)

  // Parts state
  const [partsNeeded, setPartsNeeded] = useState<boolean | null>(null)
  const [partsForm, setPartsForm] = useState({ name: '', qty: '1', urgency: 'normal', notes: '' })
  const [partsSaved, setPartsSaved] = useState(false)

  // Repair state
  const [tasks, setTasks] = useState<WOTask[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)

  // QC state
  const [qcDone, setQcDone] = useState<string[]>([])

  // Computed
  const mechanicName = profile?.full_name ?? 'Karl'
  const showTimer = order.pricing_mode === 'hourly' || order.pricing_mode === 'combined'

  // ── Load tasks ──────────────────────────────────────────────────────────────

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true)
    const { data } = await supabase.from('work_order_tasks').select('*').eq('work_order_id', order.id).order('sort_order', { ascending: true })
    setTasks((data as WOTask[]) ?? [])
    setLoadingTasks(false)
  }, [order.id, supabase])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // ── Auto-check photo categories ─────────────────────────────────────────────

  const handlePhotoUploaded = (category: string) => {
    setUploadedCategories(prev => [...prev, category])
    // Auto-check the corresponding checkin item
    const item = CHECKIN_ITEMS.find(i => i.photoCategory === category)
    if (item) {
      setCheckinDone(prev => prev.includes(item.key) ? prev : [...prev, item.key])
    }
  }

  const toggleCheckin = (key: string) => {
    const item = CHECKIN_ITEMS.find(i => i.key === key)
    // Photo-required items can only be checked via photo upload
    if (item?.requiresPhoto && !uploadedCategories.includes(item.photoCategory ?? '')) {
      toast('Először töltsd fel a fotót!', 'error')
      return
    }
    setCheckinDone(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  const checkinRequiredDone = CHECKIN_ITEMS.filter(i => i.requiresPhoto).every(i => checkinDone.includes(i.key))

  // ── Complete Check-In ───────────────────────────────────────────────────────

  const completeCheckin = async () => {
    if (!checkinRequiredDone) {
      toast('Töltsd fel az összes kötelező fotót!', 'error')
      return
    }
    setSaving(true)
    await supabase.from('work_orders').update({ status: 'checked_in', checked_in_at: new Date().toISOString() }).eq('id', order.id)
    await supabase.from('work_order_timeline').insert({
      work_order_id: order.id,
      event_type: 'checkin_complete',
      title: 'Check-In befejezve',
      description: `Checklist kész (${checkinDone.length}/${CHECKIN_ITEMS.length}). Megjegyzés: ${checkinNotes || '—'}`,
      user_name: mechanicName,
      phase: 'checkin',
      metadata: { checklist_done: checkinDone, notes: checkinNotes },
    })
    setOrder(o => ({ ...o, status: 'checked_in' }))
    setSaving(false)
    toast('Check-In kész!', 'success')
    onRefresh()
    setActivePhase('diagnostics')
  }

  // ── Complete Diagnostics ────────────────────────────────────────────────────

  const completeDiagnostics = async (needed: boolean) => {
    setSaving(true)
    const newStatus = needed ? 'diagnostics' : 'waiting_parts'
    await supabase.from('work_orders').update({ status: newStatus }).eq('id', order.id)
    await supabase.from('work_order_timeline').insert({
      work_order_id: order.id,
      event_type: 'diagnostics_done',
      title: needed ? 'Diagnosztika elvégezve' : 'Diagnosztika nem szükséges',
      description: diagNotes || undefined,
      user_name: mechanicName,
      phase: 'diagnostics',
      metadata: { needed, notes: diagNotes },
    })
    setOrder(o => ({ ...o, status: newStatus }))
    setDiagDone(true)
    setSaving(false)
    toast(needed ? 'Diagnosztika rögzítve' : 'Diagnosztika kihagyva', 'success')
    onRefresh()
    setActivePhase('parts')
  }

  // ── Complete Parts ──────────────────────────────────────────────────────────

  const completeParts = async (needed: boolean) => {
    setSaving(true)
    if (needed) {
      if (!partsForm.name.trim()) { toast('Add meg az alkatrész nevét!', 'error'); setSaving(false); return }
      await supabase.from('parts_requests').insert({
        work_order_id: order.id,
        part_name: partsForm.name,
        quantity: parseInt(partsForm.qty) || 1,
        urgency: partsForm.urgency,
        notes: partsForm.notes || null,
        requested_by: userId,
        status: 'pending',
      })
      await supabase.from('work_orders').update({ status: 'waiting_parts' }).eq('id', order.id)
      await supabase.from('work_order_timeline').insert({
        work_order_id: order.id,
        event_type: 'parts_requested',
        title: `Alkatrész igénylés: ${partsForm.name}`,
        description: `Mennyiség: ${partsForm.qty}, Sürgősség: ${partsForm.urgency}`,
        user_name: mechanicName,
        phase: 'parts',
        metadata: { ...partsForm },
      })
      setOrder(o => ({ ...o, status: 'waiting_parts' }))
      toast('Alkatrész igénylés elküldve Barbarának', 'success')
    } else {
      await supabase.from('work_order_timeline').insert({
        work_order_id: order.id,
        event_type: 'parts_skipped',
        title: 'Alkatrész fázis kihagyva',
        user_name: mechanicName,
        phase: 'parts',
        metadata: {},
      })
      toast('Alkatrész fázis kihagyva', 'info')
    }
    setPartsSaved(true)
    setSaving(false)
    onRefresh()
    setActivePhase('repair')
  }

  // ── Start Repair ────────────────────────────────────────────────────────────

  const startRepair = async () => {
    setSaving(true)
    await supabase.from('work_orders').update({ status: 'in_repair' }).eq('id', order.id)
    await supabase.from('work_order_timeline').insert({
      work_order_id: order.id,
      event_type: 'repair_started',
      title: 'Javítás elindítva',
      user_name: mechanicName,
      phase: 'repair',
      metadata: {},
    })
    setOrder(o => ({ ...o, status: 'in_repair' }))
    setSaving(false)
    onRefresh()
    toast('Javítás elindítva', 'success')
  }

  // ── Complete QC ─────────────────────────────────────────────────────────────

  const qcAllDone = QC_ITEMS.every(i => qcDone.includes(i.key))

  const completeQC = async () => {
    if (!qcAllDone) { toast('Kérlek jelöld be az összes QC lépést!', 'error'); return }
    setSaving(true)
    await supabase.from('work_orders').update({ status: 'quality_check' }).eq('id', order.id)
    await supabase.from('work_order_timeline').insert({
      work_order_id: order.id,
      event_type: 'qc_done',
      title: 'Minőségellenőrzés kész',
      description: `${qcDone.length}/${QC_ITEMS.length} pont teljesítve`,
      user_name: mechanicName,
      phase: 'qc',
      metadata: { qc_done: qcDone },
    })
    setOrder(o => ({ ...o, status: 'quality_check' }))
    setSaving(false)
    onRefresh()
    toast('QC kész!', 'success')
    setActivePhase('handback')
  }

  // ── Handback to Barbara ─────────────────────────────────────────────────────

  const handback = async () => {
    setSaving(true)
    await supabase.from('work_orders').update({ status: 'checkout_ready' }).eq('id', order.id)
    await supabase.from('work_order_timeline').insert({
      work_order_id: order.id,
      event_type: 'handback',
      title: 'Karl visszaadta a munkalapot Barbarának',
      description: 'A munkalap Barbara ellenőrzésére vár.',
      user_name: mechanicName,
      phase: 'handback',
      metadata: {},
    })
    setOrder(o => ({ ...o, status: 'checkout_ready' }))
    setSaving(false)
    onRefresh()
    toast('Munkalap visszaadva Barbarának! ✓', 'success')
    setTimeout(onClose, 1200)
  }

  const updateTask = (taskId: string, updates: Partial<WOTask>) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t))
  }

  // ── Phase status indicators ─────────────────────────────────────────────────

  const phaseStatus: Record<PhaseKey, 'done' | 'active' | 'locked'> = {
    checkin:     checkinDone.length >= 7 ? 'done' : activePhase === 'checkin' ? 'active' : 'locked',
    diagnostics: diagDone ? 'done' : activePhase === 'diagnostics' ? 'active' : 'locked',
    parts:       partsSaved ? 'done' : activePhase === 'parts' ? 'active' : 'locked',
    repair:      tasks.some(t => t.status !== 'done') ? (activePhase === 'repair' ? 'active' : 'locked') : (tasks.length > 0 && tasks.every(t => t.status === 'done') ? 'done' : (activePhase === 'repair' ? 'active' : 'locked')),
    qc:          qcAllDone ? 'done' : activePhase === 'qc' ? 'active' : 'locked',
    handback:    order.status === 'checkout_ready' ? 'done' : activePhase === 'handback' ? 'active' : 'locked',
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-[#F4F5F7] flex flex-col overflow-hidden">

      {/* Header */}
      <div className="bg-[#0B1E3D] px-4 pt-5 pb-4 shrink-0">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-white font-mono text-[13px] font-bold bg-white/10 px-2 py-0.5 rounded">
                {order.vehicle?.license_plate ?? '—'}
              </span>
              <span className="text-white/80 text-[13px]">
                {order.vehicle?.make} {order.vehicle?.model}
              </span>
            </div>
            <div className="text-white/60 text-[12px] mt-0.5 flex items-center gap-1.5">
              <User size={11} />
              {order.customer?.full_name}
              {order.order_number && <span className="font-mono">{order.order_number}</span>}
            </div>
            {order.pricing_mode && order.pricing_mode !== 'fixed' && (
              <div className="mt-1 inline-flex items-center gap-1 bg-[#C9A84C]/20 text-[#C9A84C] text-[10px] font-bold px-2 py-0.5 rounded-full">
                <Clock size={9} />
                {order.pricing_mode === 'hourly' ? 'Óradíjas' : 'Kombinált'} — időzítő aktív
              </div>
            )}
          </div>
          <button onClick={onClose} className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center shrink-0">
            <X size={16} className="text-white" />
          </button>
        </div>

        {/* Phase progress */}
        <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
          {PHASE_LIST.map(phase => {
            const st = phaseStatus[phase.key]
            const isActive = activePhase === phase.key
            return (
              <button
                key={phase.key}
                onClick={() => setActivePhase(phase.key)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-colors ${
                  isActive ? 'bg-[#C9A84C] text-[#0B1E3D]' :
                  st === 'done' ? 'bg-emerald-600/30 text-emerald-300' :
                  'bg-white/8 text-white/50'
                }`}
              >
                <span className="text-[13px] leading-none">{phase.icon}</span>
                <span className="text-[9px] font-semibold leading-none whitespace-nowrap">{phase.label}</span>
                {st === 'done' && !isActive && <span className="text-[8px] text-emerald-300">✓</span>}
                {phase.required && !isActive && st !== 'done' && <span className="text-[7px] text-white/30">köt.</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

        {/* ── Check-In Phase ─────────────────────────────────────────────── */}
        {activePhase === 'checkin' && (
          <div className="space-y-4">
            <PhaseHeader icon="📋" title="Check-In" subtitle={`${checkinDone.length}/${CHECKIN_ITEMS.length} lépés kész`} required />

            <div className="space-y-2">
              {CHECKIN_ITEMS.map(item => {
                const done = checkinDone.includes(item.key)
                const photoDone = item.photoCategory ? uploadedCategories.includes(item.photoCategory) : false
                return (
                  <div key={item.key} className={`border rounded-xl overflow-hidden ${done ? 'border-emerald-400 bg-emerald-50' : 'border-[rgba(11,30,61,0.10)] bg-white'}`}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      {done
                        ? <CheckSquare size={14} className="text-emerald-600 shrink-0" />
                        : <Circle size={14} className="text-[rgba(11,30,61,0.25)] shrink-0" />}
                      <span className={`text-[12px] font-medium flex-1 ${done ? 'line-through text-[#5a6a80]' : 'text-[#0B1E3D]'}`}>
                        {item.label}
                      </span>
                      {item.requiresPhoto && !done && (
                        <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded">Fotó köt.</span>
                      )}
                      {!item.requiresPhoto && !done && (
                        <button onClick={() => toggleCheckin(item.key)}
                          className="text-[10px] text-[#5a6a80] underline shrink-0">Kész</button>
                      )}
                    </div>
                    {item.requiresPhoto && !photoDone && (
                      <div className="px-3 pb-3">
                        <PhotoBtn
                          label={item.label}
                          category={item.photoCategory!}
                          orderId={order.id}
                          userId={userId}
                          onUploaded={handlePhotoUploaded}
                        />
                      </div>
                    )}
                    {photoDone && !done && (
                      <div className="px-3 pb-2 text-[11px] text-emerald-600 font-semibold">✓ Fotó feltöltve</div>
                    )}
                  </div>
                )
              })}
            </div>

            <div>
              <label className="text-[11px] font-bold text-[#5a6a80] uppercase tracking-wide mb-1 block">Megjegyzés (opcionális)</label>
              <textarea value={checkinNotes} onChange={e => setCheckinNotes(e.target.value)}
                placeholder="Ügyfél megjegyzése, extra infó..." rows={2}
                className="w-full text-[12px] p-2.5 rounded-xl border border-[rgba(11,30,61,0.12)] resize-none focus:outline-none focus:border-[#0B1E3D]" />
            </div>

            <ActionButton
              label="Check-In befejezése"
              color="indigo"
              disabled={!checkinRequiredDone || saving}
              loading={saving}
              hint={!checkinRequiredDone ? 'Töltsd fel az összes kötelező fotót' : undefined}
              onClick={completeCheckin}
            />
          </div>
        )}

        {/* ── Diagnostics Phase ──────────────────────────────────────────── */}
        {activePhase === 'diagnostics' && (
          <div className="space-y-4">
            <PhaseHeader icon="🔍" title="Diagnosztika" subtitle="Opcionális fázis" />

            {diagDone ? (
              <DoneCard label={diagNeeded ? 'Diagnosztika elvégezve ✓' : 'Diagnosztika kihagyva ✓'} />
            ) : (
              <>
                <InfoBox>Szükséges diagnosztika ennél a munkánál?</InfoBox>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setDiagNeeded(true)}
                    className={`p-3 rounded-xl border-2 text-center transition-colors ${diagNeeded === true ? 'border-[#0B1E3D] bg-[#0B1E3D] text-white' : 'border-[rgba(11,30,61,0.12)] text-[#0B1E3D]'}`}
                  >
                    <div className="text-[18px]">🔍</div>
                    <div className="text-[12px] font-semibold mt-1">Igen, szükséges</div>
                  </button>
                  <button
                    onClick={() => setDiagNeeded(false)}
                    className={`p-3 rounded-xl border-2 text-center transition-colors ${diagNeeded === false ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-[rgba(11,30,61,0.12)] text-[#0B1E3D]'}`}
                  >
                    <div className="text-[18px]">⏭</div>
                    <div className="text-[12px] font-semibold mt-1">Nem szükséges</div>
                  </button>
                </div>

                {diagNeeded === true && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-[#5a6a80] uppercase tracking-wide mb-1 block">Diagnosztika eredménye</label>
                      <textarea value={diagNotes} onChange={e => setDiagNotes(e.target.value)}
                        placeholder="Megállapítások, hibakódok, megfigyelések..." rows={3}
                        className="w-full text-[12px] p-2.5 rounded-xl border border-[rgba(11,30,61,0.12)] resize-none focus:outline-none focus:border-[#0B1E3D]" />
                    </div>
                    <PhotoBtn label="Diagnosztika fotó" category="diagnostics" orderId={order.id} userId={userId}
                      onUploaded={() => toast('Diagnosztika fotó feltöltve', 'success')} />
                  </div>
                )}

                {diagNeeded !== null && (
                  <ActionButton
                    label={diagNeeded ? 'Diagnosztika rögzítése' : 'Diagnosztika kihagyása'}
                    color={diagNeeded ? 'dark' : 'secondary'}
                    loading={saving}
                    onClick={() => completeDiagnostics(diagNeeded)}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* ── Parts Phase ────────────────────────────────────────────────── */}
        {activePhase === 'parts' && (
          <div className="space-y-4">
            <PhaseHeader icon="⚙️" title="Alkatrész" subtitle="Opcionális fázis" />

            {partsSaved ? (
              <DoneCard label={partsNeeded ? 'Alkatrész igénylés elküldve Barbarának ✓' : 'Alkatrész fázis kihagyva ✓'} />
            ) : (
              <>
                <InfoBox>Szükséges alkatrész ehhez a munkához?</InfoBox>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPartsNeeded(true)}
                    className={`p-3 rounded-xl border-2 text-center transition-colors ${partsNeeded === true ? 'border-[#0B1E3D] bg-[#0B1E3D] text-white' : 'border-[rgba(11,30,61,0.12)] text-[#0B1E3D]'}`}
                  >
                    <div className="text-[18px]">⚙️</div>
                    <div className="text-[12px] font-semibold mt-1">Igen, szükséges</div>
                  </button>
                  <button
                    onClick={() => setPartsNeeded(false)}
                    className={`p-3 rounded-xl border-2 text-center transition-colors ${partsNeeded === false ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-[rgba(11,30,61,0.12)] text-[#0B1E3D]'}`}
                  >
                    <div className="text-[18px]">⏭</div>
                    <div className="text-[12px] font-semibold mt-1">Nem szükséges</div>
                  </button>
                </div>

                {partsNeeded === true && (
                  <div className="space-y-2 bg-white rounded-xl border border-[rgba(11,30,61,0.10)] p-3">
                    <div>
                      <label className="text-[10px] font-bold text-[#5a6a80] uppercase tracking-wide">Alkatrész neve *</label>
                      <input value={partsForm.name} onChange={e => setPartsForm(p => ({ ...p, name: e.target.value }))}
                        placeholder="Pl.: Fékbetét, olajszűrő..."
                        className="w-full text-[13px] p-2.5 rounded-lg border border-[rgba(11,30,61,0.12)] mt-1 focus:outline-none focus:border-[#0B1E3D]" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-[#5a6a80] uppercase tracking-wide">Mennyiség</label>
                        <input type="number" min="1" value={partsForm.qty} onChange={e => setPartsForm(p => ({ ...p, qty: e.target.value }))}
                          className="w-full text-[13px] p-2.5 rounded-lg border border-[rgba(11,30,61,0.12)] mt-1 focus:outline-none focus:border-[#0B1E3D]" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#5a6a80] uppercase tracking-wide">Sürgősség</label>
                        <select value={partsForm.urgency} onChange={e => setPartsForm(p => ({ ...p, urgency: e.target.value }))}
                          className="w-full text-[13px] p-2.5 rounded-lg border border-[rgba(11,30,61,0.12)] mt-1 focus:outline-none bg-white">
                          <option value="normal">Normál</option>
                          <option value="urgent">Sürgős</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-[#5a6a80] uppercase tracking-wide">Megjegyzés</label>
                      <textarea value={partsForm.notes} onChange={e => setPartsForm(p => ({ ...p, notes: e.target.value }))}
                        placeholder="Cikkszám, forrás, extra infó..." rows={2}
                        className="w-full text-[12px] p-2.5 rounded-lg border border-[rgba(11,30,61,0.12)] mt-1 resize-none focus:outline-none focus:border-[#0B1E3D]" />
                    </div>
                  </div>
                )}

                {partsNeeded !== null && (
                  <ActionButton
                    label={partsNeeded ? 'Alkatrész igénylés küldése Barbarának' : 'Alkatrész fázis kihagyása'}
                    color={partsNeeded ? 'dark' : 'secondary'}
                    loading={saving}
                    onClick={() => completeParts(partsNeeded)}
                  />
                )}
              </>
            )}
          </div>
        )}

        {/* ── Repair Phase ───────────────────────────────────────────────── */}
        {activePhase === 'repair' && (
          <div className="space-y-4">
            <PhaseHeader icon="🔧" title="Javítás" subtitle="Kötelező fázis" required />

            {/* Summary box */}
            <div className="bg-white rounded-xl border border-[rgba(11,30,61,0.10)] p-3 space-y-2">
              <div className="text-[10px] font-bold text-[#5a6a80] uppercase tracking-wide">Mit kell elvégezni?</div>
              {order.fault_description && (
                <div className="flex gap-2">
                  <span className="text-[10px] font-semibold text-[#5a6a80] shrink-0 w-20">Panasz:</span>
                  <span className="text-[12px] text-[#0B1E3D]">{order.fault_description}</span>
                </div>
              )}
              {order.work_to_do && (
                <div className="flex gap-2">
                  <span className="text-[10px] font-semibold text-[#5a6a80] shrink-0 w-20">Elvégzendő:</span>
                  <span className="text-[12px] text-[#0B1E3D]">{order.work_to_do}</span>
                </div>
              )}
              <div className="flex gap-2">
                <span className="text-[10px] font-semibold text-[#5a6a80] shrink-0 w-20">Árazás:</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  order.pricing_mode === 'hourly' ? 'bg-amber-100 text-amber-700' :
                  order.pricing_mode === 'combined' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {order.pricing_mode === 'hourly' ? 'Óradíjas' : order.pricing_mode === 'combined' ? 'Kombinált' : 'Fix áras'}
                </span>
              </div>
            </div>

            {/* Start repair button */}
            {order.status !== 'in_repair' && order.status !== 'quality_check' && order.status !== 'checkout_ready' && (
              <ActionButton label="Javítás elindítása" color="dark" loading={saving} onClick={startRepair} />
            )}

            {/* Tasks */}
            {loadingTasks ? (
              <div className="flex justify-center py-6">
                <div className="w-6 h-6 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tasks.length === 0 ? (
              <InfoBox>Nincs feladat ehhez a munkalaphoz. Barbara még nem rendelt hozzá szolgáltatásokat.</InfoBox>
            ) : (
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-[#5a6a80] uppercase tracking-wide flex items-center gap-2">
                  <Wrench size={11} />
                  Feladatok — {tasks.filter(t => t.status === 'done').length}/{tasks.length} kész
                </div>
                {tasks.map(task => (
                  <RepairTaskCard
                    key={task.id}
                    task={task}
                    showTimer={showTimer || task.pricing_type === 'hourly'}
                    onUpdate={updateTask}
                  />
                ))}
              </div>
            )}

            {(order.status === 'in_repair' || tasks.every(t => t.status === 'done')) && tasks.length > 0 && (
              <ActionButton
                label="Javítás kész → Minőségellenőrzés"
                color="gold"
                loading={saving}
                disabled={tasks.some(t => t.status !== 'done' && t.status !== 'problem') && saving}
                onClick={() => { setActivePhase('qc') }}
              />
            )}
          </div>
        )}

        {/* ── QC Phase ───────────────────────────────────────────────────── */}
        {activePhase === 'qc' && (
          <div className="space-y-4">
            <PhaseHeader icon="✅" title="Minőségellenőrzés" subtitle={`${qcDone.length}/${QC_ITEMS.length} pont`} required />
            <InfoBox>Minden pontot ellenőrizz és pipáld ki, mielőtt átadod Barbarának.</InfoBox>

            <div className="space-y-2">
              {QC_ITEMS.map(item => {
                const done = qcDone.includes(item.key)
                return (
                  <button key={item.key} onClick={() => setQcDone(prev => done ? prev.filter(k => k !== item.key) : [...prev, item.key])}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border text-left transition-colors ${done ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-white border-[rgba(11,30,61,0.10)] text-[#0B1E3D]'}`}>
                    {done ? <CheckSquare size={14} className="text-emerald-600 shrink-0" /> : <Circle size={14} className="text-[rgba(11,30,61,0.25)] shrink-0" />}
                    <span className={`text-[12px] font-medium ${done ? 'line-through' : ''}`}>{item.label}</span>
                  </button>
                )
              })}
            </div>

            <ActionButton
              label="Minőségellenőrzés kész"
              color="emerald"
              disabled={!qcAllDone || saving}
              loading={saving}
              hint={!qcAllDone ? 'Jelöld ki az összes QC pontot' : undefined}
              onClick={completeQC}
            />
          </div>
        )}

        {/* ── Handback Phase ─────────────────────────────────────────────── */}
        {activePhase === 'handback' && (
          <div className="space-y-4">
            <PhaseHeader icon="🏁" title="Visszaadás Barbarának" subtitle="Utolsó lépés" required />

            {order.status === 'checkout_ready' ? (
              <DoneCard label="Munkalap visszaadva Barbarának ✓" />
            ) : (
              <>
                <InfoBox>
                  Ha minden kész — Check-In, Javítás, Minőségellenőrzés — add vissza a munkalapot Barbarának.
                  Ezután Barbara ellenőrzi és értesíti az ügyfelet.
                </InfoBox>

                <div className="bg-white rounded-xl border border-[rgba(11,30,61,0.10)] p-3 space-y-1.5">
                  <CheckItem done={checkinDone.length >= 7} label="Check-In kész" />
                  <CheckItem done={diagDone} label="Diagnosztika rendben" />
                  <CheckItem done={partsSaved} label="Alkatrész fázis rendben" />
                  <CheckItem done={tasks.length > 0 && tasks.every(t => t.status === 'done' || t.status === 'problem')} label="Javítás feladatok lezárva" />
                  <CheckItem done={qcAllDone} label="Minőségellenőrzés kész" />
                </div>

                <ActionButton
                  label="Visszaadás Barbarának"
                  color="gold"
                  loading={saving}
                  onClick={handback}
                />
              </>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Helper components ────────────────────────────────────────────────────────

function PhaseHeader({ icon, title, subtitle, required }: { icon: string; title: string; subtitle?: string; required?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 bg-[#0B1E3D] rounded-xl flex items-center justify-center text-[20px] shrink-0">{icon}</div>
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] font-bold text-[#0B1E3D]">{title}</h2>
          {required && <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded uppercase">Kötelező</span>}
        </div>
        {subtitle && <p className="text-[11px] text-[#5a6a80]">{subtitle}</p>}
      </div>
    </div>
  )
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5">
      <Info size={13} className="text-blue-600 shrink-0 mt-0.5" />
      <p className="text-[12px] text-blue-800">{children}</p>
    </div>
  )
}

function DoneCard({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-300 rounded-xl px-4 py-3">
      <CheckCircle size={20} className="text-emerald-600 shrink-0" />
      <span className="text-[13px] font-semibold text-emerald-800">{label}</span>
    </div>
  )
}

function CheckItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2.5 py-1 ${done ? 'text-emerald-700' : 'text-[#5a6a80]'}`}>
      {done ? <CheckCircle size={13} className="text-emerald-600 shrink-0" /> : <Circle size={13} className="text-[rgba(11,30,61,0.25)] shrink-0" />}
      <span className="text-[12px] font-medium">{label}</span>
    </div>
  )
}

type ActionColor = 'dark' | 'gold' | 'emerald' | 'indigo' | 'secondary'

function ActionButton({
  label, color, onClick, disabled, loading, hint,
}: {
  label: string
  color: ActionColor
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  hint?: string
}) {
  const colorMap: Record<ActionColor, string> = {
    dark:      'bg-[#0B1E3D] text-white',
    gold:      'bg-[#C9A84C] text-[#0B1E3D] font-bold',
    emerald:   'bg-emerald-600 text-white',
    indigo:    'bg-indigo-600 text-white',
    secondary: 'bg-[rgba(11,30,61,0.08)] text-[#0B1E3D] border border-[rgba(11,30,61,0.12)]',
  }
  return (
    <div className="space-y-1.5">
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-[14px] font-semibold transition-opacity ${colorMap[color]} ${(disabled || loading) ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          <ChevronRight size={16} />
        )}
        {loading ? 'Mentés...' : label}
      </button>
      {hint && <p className="text-[11px] text-center text-[#5a6a80]">{hint}</p>}
    </div>
  )
}
