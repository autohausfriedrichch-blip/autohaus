'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import {
  Wrench, Car, Clock, Play, Pause, Square, Camera, Package,
  CheckCircle, ChevronDown, ChevronUp, MapPin, User, AlertCircle,
  ListChecks, AlertTriangle, CheckSquare, Circle, RotateCcw,
  ChevronRight, Flag,
} from 'lucide-react'
import { TechnicianFlagModal } from '@/components/services/ServiceCalculator'
import { WorkflowModal, type WFWorkOrder } from './WorkflowModal'
import { uploadPhoto } from '@/lib/uploadPhoto'

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkOrder {
  id: string
  status: string
  scheduled_date: string
  scheduled_time: string | null
  fault_description: string | null
  checked_in_at: string | null
  mechanic_id: string | null
  customer_id: string
  vehicle_id: string
  order_number?: string | null
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

interface PickupDelivery {
  id: string
  status: string
  pickup_address: string | null
  scheduled_time: string | null
  driver_name: string | null
  customer: { full_name: string } | null
  vehicle: { make: string; model: string; license_plate: string } | null
}

interface Task {
  id: string
  title: string
  description: string | null
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'open' | 'in_progress' | 'done' | 'cancelled'
  due_date: string | null
  assigned_to: string | null
  customer?: { full_name: string } | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  new_booking:       { label: 'Új foglalás',     color: 'text-blue-700',   bg: 'bg-blue-100' },
  confirmed:         { label: 'Megerősítve',     color: 'text-cyan-700',   bg: 'bg-cyan-100' },
  checked_in:        { label: 'Check-in',        color: 'text-indigo-700', bg: 'bg-indigo-100' },
  diagnostics:       { label: 'Diagnosztika',    color: 'text-purple-700', bg: 'bg-purple-100' },
  waiting_quote:     { label: 'Árajánlat',       color: 'text-amber-700',  bg: 'bg-amber-100' },
  waiting_approval:  { label: 'Jóváhagyás',      color: 'text-amber-700',  bg: 'bg-amber-100' },
  waiting_parts:     { label: 'Alkatrész vár',   color: 'text-orange-700', bg: 'bg-orange-100' },
  in_repair:         { label: 'Javítás',         color: 'text-amber-700',  bg: 'bg-amber-100' },
  quality_check:     { label: 'Min.-ellenőrzés', color: 'text-teal-700',   bg: 'bg-teal-100' },
  ready:             { label: 'Kész',            color: 'text-green-700',  bg: 'bg-green-100' },
  checkout_ready:    { label: 'Átadásra vár',    color: 'text-[#C9A84C]',  bg: 'bg-yellow-50' },
  delivered:         { label: 'Kiadva',          color: 'text-gray-500',   bg: 'bg-gray-100' },
  closed:            { label: 'Lezárva',         color: 'text-gray-400',   bg: 'bg-gray-50' },
}

const PRIORITY_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  low:    { label: 'Alacsony', color: 'text-gray-600',  bg: 'bg-gray-100',   border: 'border-gray-300' },
  normal: { label: 'Normál',   color: 'text-blue-700',  bg: 'bg-blue-100',   border: 'border-blue-400' },
  high:   { label: 'Magas',    color: 'text-amber-700', bg: 'bg-amber-100',  border: 'border-amber-400' },
  urgent: { label: 'Sürgős',   color: 'text-red-700',   bg: 'bg-red-100',    border: 'border-red-500' },
}

const DELIVERY_STATUS_NEXT: Record<string, string> = {
  pending:    'picked_up',
  picked_up:  'delivered',
  delivered:  'delivered',
}

const DELIVERY_STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Függőben',   color: 'text-amber-700', bg: 'bg-amber-100' },
  picked_up: { label: 'Felvéve',    color: 'text-blue-700',  bg: 'bg-blue-100' },
  delivered: { label: 'Teljesítve', color: 'text-green-700', bg: 'bg-green-100' },
}

const ACTIVE_STATUSES = ['checked_in', 'diagnostics', 'in_repair', 'waiting_parts', 'quality_check']
const IN_GARAGE_STATUSES = ['new_booking', 'confirmed', 'checked_in', 'diagnostics', 'waiting_quote', 'waiting_approval', 'waiting_parts', 'in_repair', 'quality_check', 'ready', 'checkout_ready']

// Phase definitions for the progress bar
const PHASES = [
  { key: 'checkin',    label: 'Check-In',   statuses: ['checked_in'] },
  { key: 'diagnose',   label: 'Diagnózis',  statuses: ['diagnostics', 'waiting_quote', 'waiting_approval'] },
  { key: 'repair',     label: 'Javítás',    statuses: ['waiting_parts', 'in_repair'] },
  { key: 'qc',         label: 'Min.-ell.',  statuses: ['quality_check'] },
  { key: 'ready',      label: 'Átadás',     statuses: ['ready', 'checkout_ready', 'delivered', 'closed'] },
]

// Hardcoded check-in checklist
const CHECKIN_ITEMS = [
  'Rendszám fotó',
  'Kilométeróra fotó',
  'Külső körbefotózás',
  'Belső fotó',
  'Sérülések rögzítése',
  'Ügyfél megjegyzés ellenőrzése',
  'Kulcs átvétel rögzítése',
]

function toDateString(d: Date) {
  return d.toISOString().split('T')[0]
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}ó ${m}p ${s}mp`
  if (m > 0) return `${m}p ${s}mp`
  return `${s}mp`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, color: 'text-gray-600', bg: 'bg-gray-100' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.bg} ${meta.color}`}>
      {meta.label}
    </span>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const meta = PRIORITY_META[priority] ?? PRIORITY_META.normal
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${meta.bg} ${meta.color}`}>
      {meta.label}
    </span>
  )
}

function PlateBadge({ plate }: { plate: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 bg-[#0B1E3D] text-white rounded-md text-[12px] font-mono font-bold tracking-wider">
      {plate}
    </span>
  )
}

// ─── Phase Progress Bar ───────────────────────────────────────────────────────

function PhaseProgressBar({ status }: { status: string }) {
  const currentPhaseIdx = PHASES.findIndex(p => p.statuses.includes(status))
  return (
    <div className="flex items-center gap-0.5 mt-3">
      {PHASES.map((phase, idx) => {
        const isDone = idx < currentPhaseIdx
        const isActive = idx === currentPhaseIdx
        return (
          <div key={phase.key} className="flex-1 flex flex-col items-center gap-1">
            <div className={`h-1.5 w-full rounded-full ${isDone ? 'bg-emerald-500' : isActive ? 'bg-[#C9A84C]' : 'bg-[rgba(11,30,61,0.12)]'}`} />
            <span className={`text-[9px] font-semibold text-center leading-none ${isDone ? 'text-emerald-600' : isActive ? 'text-[#C9A84C]' : 'text-[rgba(11,30,61,0.3)]'}`}>
              {phase.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Check-In Checklist Panel ─────────────────────────────────────────────────

function CheckInChecklistPanel({
  orderId,
  onComplete,
  userId,
}: {
  orderId: string
  onComplete: () => void
  userId: string | null
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const [done, setDone] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const toggle = (item: string) => {
    setDone(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    )
  }

  const allDone = CHECKIN_ITEMS.every(i => done.includes(i))

  const handleComplete = async () => {
    if (!allDone) {
      toast('Kérlek jelöld be az összes Check-In lépést!', 'error')
      return
    }
    setSaving(true)
    // Log timeline event
    await supabase.from('work_order_timeline').insert({
      work_order_id: orderId,
      event_type: 'checkin_complete',
      title: 'Check-In befejezve',
      description: `Karl elvégezte a Check-In checklistet (${CHECKIN_ITEMS.length} lépés)`,
      user_name: 'Karl',
      phase: 'checkin',
      metadata: { checklist_done: done },
    })
    setSaving(false)
    toast('Check-In rögzítve!', 'success')
    onComplete()
  }

  return (
    <div className="bg-indigo-50 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ListChecks size={14} className="text-indigo-600" />
        <span className="text-[12px] font-bold text-indigo-800 uppercase tracking-wide">Check-In Checklist</span>
        <span className="ml-auto text-[11px] text-indigo-600 font-semibold">{done.length}/{CHECKIN_ITEMS.length}</span>
      </div>
      <div className="space-y-2">
        {CHECKIN_ITEMS.map(item => (
          <button
            key={item}
            className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${
              done.includes(item)
                ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                : 'bg-white border-[rgba(11,30,61,0.10)] text-[#0B1E3D]'
            }`}
            onClick={() => toggle(item)}
          >
            {done.includes(item) ? (
              <CheckSquare size={14} className="text-indigo-600 shrink-0" />
            ) : (
              <Circle size={14} className="text-[rgba(11,30,61,0.3)] shrink-0" />
            )}
            <span className="text-[12px] font-medium">{item}</span>
          </button>
        ))}
      </div>
      <button
        className={`w-full btn-mobile-action text-[13px] font-bold ${
          allDone
            ? 'bg-indigo-600 text-white'
            : 'bg-[rgba(11,30,61,0.08)] text-[rgba(11,30,61,0.4)]'
        }`}
        onClick={handleComplete}
        disabled={saving}
      >
        <CheckCircle size={15} />
        {saving ? 'Mentés...' : 'Check-In Kész'}
      </button>
    </div>
  )
}

// ─── Task Timer Widget ────────────────────────────────────────────────────────

function TaskTimerWidget({
  task,
  onUpdate,
}: {
  task: WOTask
  onUpdate: (taskId: string, updates: Partial<WOTask>) => void
}) {
  const [ticking, setTicking] = useState(false)
  const [localElapsed, setLocalElapsed] = useState(task.elapsed_seconds || 0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()
  const { toast } = useToast()

  // Resume ticking if timer was running when component mounts
  useEffect(() => {
    if (task.timer_started_at) {
      const extra = Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000)
      setLocalElapsed((task.elapsed_seconds || 0) + extra)
      setTicking(true)
    }
  }, [])

  useEffect(() => {
    if (ticking) {
      intervalRef.current = setInterval(() => {
        setLocalElapsed(e => e + 1)
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [ticking])

  const start = async () => {
    const now = new Date().toISOString()
    setTicking(true)
    await supabase.from('work_order_tasks').update({
      timer_started_at: now,
      status: 'in_progress',
    }).eq('id', task.id)
    onUpdate(task.id, { timer_started_at: now, status: 'in_progress' })
    // Log timeline
    await supabase.from('work_order_timeline').insert({
      work_order_id: task.work_order_id,
      event_type: 'timer_start',
      title: `Időzítő elindítva: ${task.title}`,
      user_name: 'Karl',
      phase: 'repair',
      metadata: { task_id: task.id },
    })
  }

  const pause = async () => {
    const extra = task.timer_started_at
      ? Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000)
      : 0
    const newElapsed = (task.elapsed_seconds || 0) + extra
    setTicking(false)
    await supabase.from('work_order_tasks').update({
      timer_started_at: null,
      elapsed_seconds: newElapsed,
    }).eq('id', task.id)
    onUpdate(task.id, { timer_started_at: null, elapsed_seconds: newElapsed })
  }

  const stop = async () => {
    const extra = task.timer_started_at
      ? Math.floor((Date.now() - new Date(task.timer_started_at).getTime()) / 1000)
      : 0
    const newElapsed = (task.elapsed_seconds || 0) + extra
    setTicking(false)
    await supabase.from('work_order_tasks').update({
      timer_started_at: null,
      elapsed_seconds: newElapsed,
    }).eq('id', task.id)
    onUpdate(task.id, { timer_started_at: null, elapsed_seconds: newElapsed })
    // Log timeline
    await supabase.from('work_order_timeline').insert({
      work_order_id: task.work_order_id,
      event_type: 'timer_stop',
      title: `Időzítő leállítva: ${task.title}`,
      description: `Rögzített idő: ${formatElapsed(newElapsed)}`,
      user_name: 'Karl',
      phase: 'repair',
      metadata: { task_id: task.id, elapsed_seconds: newElapsed },
    })
    toast(`Idő rögzítve: ${formatElapsed(newElapsed)}`, 'success')
  }

  return (
    <div className="bg-[#0B1E3D] rounded-xl p-3">
      <div className="flex items-center gap-3 mb-2.5">
        <Clock size={14} className={ticking ? 'text-[#C9A84C] animate-pulse' : 'text-white/40'} />
        <span className="font-mono text-[18px] font-bold text-white flex-1">
          {formatElapsed(localElapsed)}
        </span>
        {ticking && <span className="text-[10px] text-[#C9A84C] font-bold">AKTÍV</span>}
      </div>
      <div className="flex gap-2">
        {!ticking ? (
          <button className="btn-mobile-action bg-[#C9A84C] text-[#0B1E3D] font-bold flex-1 text-[12px]" onClick={start}>
            <Play size={14} /> Indítás
          </button>
        ) : (
          <>
            <button className="btn-mobile-action bg-white/10 text-white flex-1 text-[12px]" onClick={pause}>
              <Pause size={14} /> Szünet
            </button>
            <button className="btn-mobile-action bg-red-500 text-white flex-1 text-[12px]" onClick={stop}>
              <Square size={14} /> Stop
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Work Order Task Card ─────────────────────────────────────────────────────

function WOTaskCard({
  task,
  workOrderPricingMode,
  onUpdate,
}: {
  task: WOTask
  workOrderPricingMode?: string | null
  onUpdate: (taskId: string, updates: Partial<WOTask>) => void
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(task.notes || '')
  const [savingNotes, setSavingNotes] = useState(false)

  const checklist = task.checklist || []
  const checkDone = task.checklist_done || []
  const isDone = task.status === 'done'
  const isProblem = task.status === 'problem'

  // Show timer if: task pricing_type is hourly OR work order pricing_mode is hourly/combined
  const showTimer = task.pricing_type === 'hourly'
    || workOrderPricingMode === 'hourly'
    || (workOrderPricingMode === 'combined' && task.pricing_type !== 'fixed')

  const toggleChecklist = async (item: string) => {
    const newDone = checkDone.includes(item)
      ? checkDone.filter(i => i !== item)
      : [...checkDone, item]
    await supabase.from('work_order_tasks').update({ checklist_done: newDone }).eq('id', task.id)
    onUpdate(task.id, { checklist_done: newDone })
  }

  const markDone = async () => {
    await supabase.from('work_order_tasks').update({
      status: 'done',
      completed_at: new Date().toISOString(),
      timer_started_at: null,
    }).eq('id', task.id)
    // Log timeline
    await supabase.from('work_order_timeline').insert({
      work_order_id: task.work_order_id,
      event_type: 'task_done',
      title: `Feladat kész: ${task.title}`,
      user_name: 'Karl',
      phase: 'repair',
      metadata: { task_id: task.id },
    })
    onUpdate(task.id, { status: 'done' })
    toast('Feladat kész!', 'success')
  }

  const markProblem = async () => {
    await supabase.from('work_order_tasks').update({ status: 'problem' }).eq('id', task.id)
    await supabase.from('work_order_timeline').insert({
      work_order_id: task.work_order_id,
      event_type: 'task_problem',
      title: `Probléma jelölve: ${task.title}`,
      user_name: 'Karl',
      phase: 'repair',
      metadata: { task_id: task.id },
    })
    onUpdate(task.id, { status: 'problem' })
    toast('Probléma jelölve', 'info')
  }

  const saveNotes = async () => {
    setSavingNotes(true)
    await supabase.from('work_order_tasks').update({ notes }).eq('id', task.id)
    setSavingNotes(false)
    onUpdate(task.id, { notes })
    toast('Megjegyzés mentve', 'success')
  }

  const taskStatusColor = isDone
    ? 'border-emerald-400 bg-emerald-50'
    : isProblem
    ? 'border-red-400 bg-red-50'
    : task.status === 'in_progress'
    ? 'border-[#C9A84C] bg-amber-50'
    : 'border-[rgba(11,30,61,0.12)] bg-white'

  return (
    <div className={`border rounded-xl overflow-hidden transition-colors ${taskStatusColor}`}>
      {/* Task header */}
      <div
        className="flex items-center gap-3 px-3 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[13px] font-semibold ${isDone ? 'line-through text-[#5a6a80]' : 'text-[#0B1E3D]'}`}>
              {task.title}
            </span>
            {task.task_number && (
              <span className="text-[10px] font-mono text-[#5a6a80] bg-[rgba(11,30,61,0.06)] px-1.5 py-0.5 rounded">
                {task.task_number}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {isDone && <span className="text-[10px] text-emerald-600 font-semibold">✓ Kész</span>}
            {isProblem && <span className="text-[10px] text-red-600 font-semibold">⚠ Probléma</span>}
            {task.status === 'in_progress' && <span className="text-[10px] text-amber-700 font-semibold">▶ Folyamatban</span>}
            {checklist.length > 0 && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                checkDone.length === checklist.length ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {checkDone.length}/{checklist.length} lépés
              </span>
            )}
            {showTimer && task.elapsed_seconds > 0 && (
              <span className="text-[10px] text-[#5a6a80] flex items-center gap-0.5">
                <Clock size={9} /> {formatElapsed(task.elapsed_seconds)}
              </span>
            )}
          </div>
        </div>
        <button className="text-[#5a6a80] shrink-0">
          {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
      </div>

      {/* Expanded content */}
      {expanded && !isDone && (
        <div className="px-3 pb-3 space-y-3 border-t border-[rgba(11,30,61,0.08)] pt-3">
          {/* Checklist */}
          {checklist.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-[#5a6a80] uppercase tracking-wide">
                Lépések — {checkDone.length}/{checklist.length}
              </div>
              {checklist.map((item: string) => (
                <button
                  key={item}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg border text-left transition-colors ${
                    checkDone.includes(item)
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-white border-[rgba(11,30,61,0.10)] text-[#0B1E3D]'
                  }`}
                  onClick={() => toggleChecklist(item)}
                >
                  {checkDone.includes(item) ? (
                    <CheckSquare size={13} className="text-emerald-600 shrink-0" />
                  ) : (
                    <Circle size={13} className="text-[rgba(11,30,61,0.3)] shrink-0" />
                  )}
                  <span className={`text-[12px] ${checkDone.includes(item) ? 'line-through' : ''}`}>{item}</span>
                </button>
              ))}
            </div>
          )}

          {/* Timer (only for hourly tasks) */}
          {showTimer && (
            <TaskTimerWidget task={task} onUpdate={onUpdate} />
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-[#5a6a80] uppercase tracking-wide">Megjegyzés</div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Megjegyzés a feladathoz..."
              className="w-full text-[12px] p-2.5 rounded-lg border border-[rgba(11,30,61,0.12)] min-h-[60px] resize-none focus:outline-none focus:border-[#0B1E3D]"
            />
            {notes !== (task.notes || '') && (
              <button
                className="btn-mobile-action bg-[#0B1E3D] text-white text-[12px]"
                onClick={saveNotes}
                disabled={savingNotes}
              >
                {savingNotes ? 'Mentés...' : 'Megjegyzés mentése'}
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn-mobile-action bg-emerald-600 text-white text-[12px] font-bold"
              onClick={markDone}
            >
              <CheckCircle size={14} /> Kész!
            </button>
            <button
              className="btn-mobile-action bg-red-50 text-red-700 border border-red-200 text-[12px]"
              onClick={markProblem}
            >
              <Flag size={14} /> Probléma
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Time Tracker Widget (for work order level) ───────────────────────────────

interface TimerState {
  running: boolean
  elapsed: number
  startedAt: number | null
}

function TimeTrackerWidget({
  orderId,
  onWorkLogged,
}: {
  orderId: string
  onWorkLogged: (orderId: string, notes: string) => Promise<void>
}) {
  const [timer, setTimer] = useState<TimerState>({ running: false, elapsed: 0, startedAt: null })
  const [showLogInput, setShowLogInput] = useState(false)
  const [logNotes, setLogNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (timer.running && timer.startedAt !== null) {
      intervalRef.current = setInterval(() => {
        setTimer(prev => ({ ...prev, elapsed: prev.elapsed + 1 }))
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [timer.running])

  const start = () => {
    setTimer(prev => ({ ...prev, running: true, startedAt: Date.now() }))
    setShowLogInput(false)
  }

  const pause = () => {
    setTimer(prev => ({ ...prev, running: false, startedAt: null }))
  }

  const stop = () => {
    setTimer(prev => ({ ...prev, running: false, startedAt: null }))
    setShowLogInput(true)
  }

  const handleLog = async () => {
    setSaving(true)
    await onWorkLogged(orderId, logNotes)
    setSaving(false)
    setLogNotes('')
    setShowLogInput(false)
    setTimer({ running: false, elapsed: 0, startedAt: null })
  }

  return (
    <div className="mt-3 pt-3 border-t border-[rgba(11,30,61,0.08)]">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-2 bg-[#0B1E3D] rounded-xl px-4 py-2.5 flex-1">
          <Clock size={16} className={timer.running ? 'text-[#C9A84C] animate-pulse' : 'text-white/40'} />
          <span className="font-mono text-[18px] font-bold text-white min-w-[80px]">
            {formatElapsed(timer.elapsed)}
          </span>
          {timer.running && (
            <span className="text-[10px] text-[#C9A84C] font-semibold ml-auto">AKTÍV</span>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        {!timer.running ? (
          <button className="btn-mobile-action bg-[#0B1E3D] text-white flex-1 text-[13px]" onClick={start}>
            <Play size={16} />
            Időzítő indítása
          </button>
        ) : (
          <>
            <button className="btn-mobile-action bg-[#F4F5F7] text-[#0B1E3D] border border-[rgba(11,30,61,0.12)] flex-1 text-[13px]" onClick={pause}>
              <Pause size={16} />
              Szünet
            </button>
            <button className="btn-mobile-action bg-[#C9384C] text-white flex-1 text-[13px]" onClick={stop}>
              <Square size={16} />
              Stop & Rögzít
            </button>
          </>
        )}
      </div>

      {showLogInput && (
        <div className="mt-3 space-y-2">
          <Textarea
            value={logNotes}
            onChange={e => setLogNotes(e.target.value)}
            placeholder="Mit végeztél? Pl.: Fékbetét csere, bal első..."
            className="min-h-[64px] text-[12px]"
          />
          <div className="flex gap-2">
            <Button variant="gold" size="sm" onClick={handleLog} disabled={saving}>
              {saving ? 'Mentés...' : 'Munka rögzítése'}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowLogInput(false)}>
              Mégsem
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TechnicianPage({
  refreshKey,
  onRefresh,
  profile,
  onOpenWorkOrder,
}: {
  refreshKey: number
  onRefresh: () => void
  profile?: any
  onOpenWorkOrder?: (id: string) => void
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Data
  const [todayOrders, setTodayOrders] = useState<WorkOrder[]>([])
  const [activeOrders, setActiveOrders] = useState<WorkOrder[]>([])
  const [garageOrders, setGarageOrders] = useState<WorkOrder[]>([])
  const [allMyOrders, setAllMyOrders] = useState<WorkOrder[]>([])
  const [deliveries, setDeliveries] = useState<PickupDelivery[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [tasksError, setTasksError] = useState(false)

  // Work order tasks cache: { [orderId]: WOTask[] }
  const [orderTasks, setOrderTasks] = useState<Record<string, WOTask[]>>({})
  const [loadingTasks, setLoadingTasks] = useState<string | null>(null)

  // UI state
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [workflowOrder, setWorkflowOrder] = useState<WFWorkOrder | null>(null)
  const [statusChanging, setStatusChanging] = useState<string | null>(null)
  const [deliveryChanging, setDeliveryChanging] = useState<string | null>(null)

  // Parts request modal
  const [showPartsModal, setShowPartsModal] = useState(false)
  const [partsForm, setPartsForm] = useState({
    work_order_id: '',
    part_name: '',
    quantity: '1',
    urgency: 'normal',
    notes: '',
  })
  const [savingParts, setSavingParts] = useState(false)

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null)
    })
  }, [])

  // ── Fetch work order tasks ─────────────────────────────────────────────────

  const loadOrderTasks = useCallback(async (orderId: string) => {
    setLoadingTasks(orderId)
    const { data } = await supabase
      .from('work_order_tasks')
      .select('*')
      .eq('work_order_id', orderId)
      .order('sort_order', { ascending: true })
    setOrderTasks(prev => ({ ...prev, [orderId]: (data as WOTask[]) ?? [] }))
    setLoadingTasks(null)
  }, [supabase])

  const updateTaskLocal = useCallback((orderId: string, taskId: string, updates: Partial<WOTask>) => {
    setOrderTasks(prev => ({
      ...prev,
      [orderId]: (prev[orderId] || []).map(t => t.id === taskId ? { ...t, ...updates } : t),
    }))
  }, [])

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const today = toDateString(new Date())

    const [todayRes, activeRes, garageRes, deliveryRes, allMyRes, taskRes] = await Promise.all([
      supabase
        .from('work_orders')
        .select('*, customer:customers(id,full_name,phone), vehicle:vehicles(make,model,license_plate)')
        .eq('mechanic_id', userId)
        .eq('scheduled_date', today)
        .order('scheduled_time', { ascending: true }),

      supabase
        .from('work_orders')
        .select('*, customer:customers(id,full_name,phone), vehicle:vehicles(make,model,license_plate)')
        .eq('mechanic_id', userId)
        .in('status', ACTIVE_STATUSES)
        .order('checked_in_at', { ascending: true }),

      supabase
        .from('work_orders')
        .select('*, customer:customers(id,full_name), vehicle:vehicles(make,model,license_plate)')
        .eq('mechanic_id', userId)
        .in('status', IN_GARAGE_STATUSES)
        .order('scheduled_date', { ascending: true }),

      (async () => {
        const mechanicName = profile?.full_name ?? ''
        let q = supabase
          .from('pickup_deliveries')
          .select('*, customer:customers(full_name), vehicle:vehicles(make,model,license_plate)')
          .not('status', 'eq', 'delivered')
          .order('scheduled_time', { ascending: true })
        if (mechanicName) {
          q = q.ilike('driver_name', `%${mechanicName.split(' ')[0]}%`)
        }
        return q
      })(),

      supabase
        .from('work_orders')
        .select('id, status')
        .eq('mechanic_id', userId)
        .not('status', 'in', '(delivered,closed)'),

      supabase
        .from('tasks')
        .select('*, customer:customers(full_name)')
        .eq('assigned_to', userId)
        .not('status', 'in', '("done","cancelled")')
        .order('due_date', { ascending: true }),
    ])

    setTodayOrders((todayRes.data as WorkOrder[]) ?? [])
    setActiveOrders((activeRes.data as WorkOrder[]) ?? [])
    setGarageOrders((garageRes.data as WorkOrder[]) ?? [])
    setAllMyOrders((allMyRes.data as WorkOrder[]) ?? [])
    setDeliveries((deliveryRes.data as PickupDelivery[]) ?? [])

    if (taskRes.error?.code === '42P01') {
      setTasksError(true)
    } else {
      setTasksError(false)
      setTasks((taskRes.data as Task[]) ?? [])
    }

    setLoading(false)
  }, [userId, profile, supabase])

  useEffect(() => {
    if (userId) fetchAll()
  }, [fetchAll, refreshKey, userId])

  // ── Realtime subscriptions ─────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('technician-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_orders' },
        () => { fetchAll() }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'work_order_tasks' },
        (payload: any) => {
          const orderId = payload.new?.work_order_id || payload.old?.work_order_id
          if (orderId && orderTasks[orderId]) {
            loadOrderTasks(orderId)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, supabase, fetchAll, loadOrderTasks, orderTasks])

  // ── Expand order: load its tasks ──────────────────────────────────────────

  const toggleExpand = useCallback((orderId: string) => {
    setExpandedOrder(prev => {
      if (prev === orderId) return null
      // Load tasks when expanding
      loadOrderTasks(orderId)
      return orderId
    })
  }, [loadOrderTasks])

  // ── Actions ───────────────────────────────────────────────────────────────

  const changeOrderStatus = async (id: string, newStatus: string, phaseName?: string) => {
    setStatusChanging(id)
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'quality_check') updates.completed_at = new Date().toISOString()
    if (newStatus === 'checked_in') updates.checked_in_at = new Date().toISOString()
    const { error } = await supabase.from('work_orders').update(updates).eq('id', id)
    if (error) {
      toast('Állapot frissítési hiba', 'error')
    } else {
      const statusLabel = STATUS_META[newStatus]?.label ?? newStatus
      toast(`Állapot: ${statusLabel}`, 'success')
      // Log timeline
      await supabase.from('work_order_timeline').insert({
        work_order_id: id,
        event_type: 'status_change',
        title: `Státusz változás: ${statusLabel}`,
        user_name: profile?.full_name ?? 'Karl',
        phase: phaseName ?? newStatus,
        metadata: { new_status: newStatus },
      })
      fetchAll()
      onRefresh()
    }
    setStatusChanging(null)
  }

  const handleWorkLogged = async (orderId: string, notes: string) => {
    if (!notes.trim()) {
      toast('Add meg, mit végeztél!', 'error')
      return
    }
    const { error } = await supabase
      .from('work_orders')
      .update({ work_log: notes, updated_at: new Date().toISOString() })
      .eq('id', orderId)
    if (error) {
      toast('Munka feljegyezve (helyi)', 'info')
    } else {
      toast('Munka rögzítve', 'success')
    }
  }

  const handlePhotoUpload = async (orderId: string, file: File, phase?: string) => {
    try {
      await uploadPhoto({
        file,
        workOrderId: orderId,
        category: phase ?? 'general',
        userId,
        uploaderName: profile?.full_name ?? 'Karl',
      })
      toast('Fotó feltöltve', 'success')
      await supabase.from('work_order_timeline').insert({
        work_order_id: orderId,
        event_type: 'photo_upload',
        title: `Fotó feltöltve (${phase ?? 'általános'})`,
        user_name: profile?.full_name ?? 'Karl',
        phase: phase ?? 'general',
        metadata: { category: phase ?? 'general' },
      })
      onRefresh()
    } catch (err: any) {
      toast(`Feltöltési hiba: ${err.message}`, 'error')
    }
  }

  const advanceDeliveryStatus = async (id: string, currentStatus: string) => {
    const next = DELIVERY_STATUS_NEXT[currentStatus]
    if (!next || next === currentStatus) return
    setDeliveryChanging(id)
    const { error } = await supabase
      .from('pickup_deliveries')
      .update({ status: next })
      .eq('id', id)
    if (error) {
      toast('Frissítési hiba', 'error')
    } else {
      toast('Állapot frissítve', 'success')
      fetchAll()
      onRefresh()
    }
    setDeliveryChanging(null)
  }

  const markTaskDone = async (id: string) => {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'done', completed_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      toast('Hiba a feladat zárásánál', 'error')
    } else {
      toast('Feladat kész!', 'success')
      fetchAll()
      onRefresh()
    }
  }

  const submitPartsRequest = async () => {
    if (!partsForm.part_name.trim()) {
      toast('Add meg az alkatrész nevét', 'error')
      return
    }
    setSavingParts(true)
    const { error } = await supabase.from('parts_requests').insert({
      work_order_id: partsForm.work_order_id || null,
      part_name: partsForm.part_name,
      quantity: parseInt(partsForm.quantity) || 1,
      urgency: partsForm.urgency,
      notes: partsForm.notes || null,
      requested_by: userId,
      status: 'pending',
    })
    setSavingParts(false)
    if (error?.code === '42P01') {
      toast('Az alkatrész tábla még nem létezik', 'error')
    } else if (error) {
      toast('Hiba az igénylés beküldésekor', 'error')
    } else {
      toast('Alkatrész igénylés elküldve', 'success')
      setShowPartsModal(false)
      setPartsForm({ work_order_id: '', part_name: '', quantity: '1', urgency: 'normal', notes: '' })
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const todayStr = new Date().toLocaleDateString('hu-HU', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  })

  const mechanicFirstName = profile?.full_name?.split(' ')[0] ?? 'Karl'

  if (loading && !userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F4F5F7]">
        <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7]">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="bg-[#0B1E3D] px-5 pt-6 pb-7">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-['DM_Serif_Display'] text-[26px] text-white leading-tight">
              Szia, {mechanicFirstName}! 👋
            </h1>
            <p className="text-[13px] text-white/55 mt-1 capitalize">{todayStr}</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <Wrench size={22} className="text-[#C9A84C]" />
          </div>
        </div>

        {/* Quick stat pills */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            <span className="text-[#C9A84C] font-bold text-[13px]">{allMyOrders.length}</span>
            <span className="text-white/70 text-[11px]">összes munkalap</span>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${garageOrders.length > 0 ? 'bg-[#C9A84C]/20' : 'bg-white/10'}`}>
            <span className="font-bold text-[13px] text-[#C9A84C]">{garageOrders.length}</span>
            <span className="text-white/70 text-[11px]">garázsban</span>
          </div>
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 ${activeOrders.length > 0 ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
            <span className={`font-bold text-[13px] ${activeOrders.length > 0 ? 'text-emerald-300' : 'text-[#C9A84C]'}`}>{activeOrders.length}</span>
            <span className="text-white/70 text-[11px]">aktív javítás</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
            <span className="text-[#C9A84C] font-bold text-[13px]">{todayOrders.length}</span>
            <span className="text-white/70 text-[11px]">mai feladat</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5 max-w-2xl mx-auto">

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>

            {/* ── Section 1: Mai munkáim ──────────────────────────────────── */}
            <section>
              <SectionHeader icon={<Clock size={14} />} title="Mai munkáim" count={todayOrders.length} />
              {todayOrders.length === 0 ? (
                <EmptyState icon={<Clock size={28} />} message="Ma nincs hozzád rendelt munkalap" />
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                  {todayOrders.map(order => (
                    <div
                      key={order.id}
                      className="flex-shrink-0 w-[200px] bg-white border border-[rgba(11,30,61,0.10)] rounded-[14px] p-4 cursor-pointer hover:border-[#C9A84C] transition-colors"
                      onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    >
                      <PlateBadge plate={order.vehicle?.license_plate ?? '—'} />
                      <div className="mt-2 text-[13px] font-semibold text-[#0B1E3D] truncate">
                        {order.customer?.full_name?.split(' ')[0] ?? '—'}
                      </div>
                      <div className="text-[11px] text-[#5a6a80] mt-0.5 truncate">
                        {order.vehicle?.make} {order.vehicle?.model}
                      </div>
                      {order.scheduled_time && (
                        <div className="text-[11px] text-[#C9A84C] font-semibold mt-1.5 flex items-center gap-1">
                          <Clock size={10} />
                          {order.scheduled_time.slice(0, 5)}
                        </div>
                      )}
                      <div className="mt-2">
                        <StatusBadge status={order.status} />
                      </div>
                      {expandedOrder === order.id && (
                        <div className="mt-3 pt-3 border-t border-[rgba(11,30,61,0.08)] space-y-2">
                          {order.fault_description && (
                            <p className="text-[11px] text-[#5a6a80] leading-relaxed">{order.fault_description}</p>
                          )}
                          {onOpenWorkOrder && (
                            <button
                              onClick={e => { e.stopPropagation(); onOpenWorkOrder(order.id) }}
                              className="w-full btn-mobile-action bg-[#0B1E3D] text-white text-[12px] py-2"
                            >
                              <Wrench size={13} /> Feladatok megnyitása
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Section 2: Aktív munkalapok ─────────────────────────────── */}
            <section>
              <SectionHeader icon={<Wrench size={14} />} title="Aktív munkalapok" count={activeOrders.length} />
              {activeOrders.length === 0 ? (
                <EmptyState icon={<Wrench size={28} />} message="Nincs aktív munkalapod" />
              ) : (
                <div className="space-y-3">
                  {activeOrders.map(order => (
                    <ActiveWorkOrderCard
                      key={order.id}
                      order={order}
                      expanded={expandedOrder === order.id}
                      onToggle={() => toggleExpand(order.id)}
                      orderTasks={orderTasks[order.id] ?? null}
                      loadingTasks={loadingTasks === order.id}
                      statusChanging={statusChanging}
                      onStatusChange={changeOrderStatus}
                      onWorkLogged={handleWorkLogged}
                      onPhotoUpload={handlePhotoUpload}
                      onOpenDetail={onOpenWorkOrder ? () => onOpenWorkOrder(order.id) : undefined}
                      onOpenWorkflow={() => setWorkflowOrder(order as WFWorkOrder)}
                      onTaskUpdate={(taskId, updates) => updateTaskLocal(order.id, taskId, updates)}
                      userId={userId}
                      profile={profile}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ── Section 3: Garázsban lévő autók ────────────────────────── */}
            <section>
              <SectionHeader icon={<Car size={14} />} title="Garázsban lévő autók" count={garageOrders.length} />
              {garageOrders.length === 0 ? (
                <EmptyState icon={<Car size={28} />} message="Nincs autó a garázsban" />
              ) : (
                <div className="space-y-2">
                  {garageOrders.map(order => {
                    const isActive = ACTIVE_STATUSES.includes(order.status)
                    const canStart = !['in_repair', 'quality_check', 'ready', 'checkout_ready', 'delivered', 'closed'].includes(order.status)
                    return (
                      <Card key={order.id} className="p-0 overflow-hidden">
                        <div className="flex items-center gap-3 px-4 py-3">
                          <PlateBadge plate={order.vehicle?.license_plate ?? '—'} />
                          <div className="flex-1 min-w-0">
                            <div className="text-[13px] font-semibold text-[#0B1E3D] truncate">
                              {order.vehicle?.make} {order.vehicle?.model}
                            </div>
                            <div className="text-[11px] text-[#5a6a80] truncate">
                              {order.customer?.full_name}
                            </div>
                          </div>
                          <StatusBadge status={order.status} />
                        </div>
                        <div className="flex gap-2 px-4 pb-3">
                          <button
                            className="btn-mobile-action bg-[#0B1E3D] text-white flex-1 text-[12px]"
                            onClick={() => setWorkflowOrder(order as WFWorkOrder)}
                          >
                            <Wrench size={14} />
                            {canStart ? 'Munka kezdése' : 'Munkalap megnyitása'}
                          </button>
                          {onOpenWorkOrder && (
                            <button
                              className="btn-mobile-action bg-[#F4F5F7] text-[#0B1E3D] border border-[rgba(11,30,61,0.12)] text-[12px] px-3"
                              onClick={() => onOpenWorkOrder(order.id)}
                            >
                              <ListChecks size={14} />
                            </button>
                          )}
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ── Section 4: Hozom-viszem ─────────────────────────────────── */}
            <section>
              <SectionHeader icon={<MapPin size={14} />} title="Hozom-viszem feladatok" count={deliveries.length} />
              {deliveries.length === 0 ? (
                <EmptyState icon={<MapPin size={28} />} message="Nincs aktív szállítási feladatod" />
              ) : (
                <div className="space-y-3">
                  {deliveries.map(d => {
                    const statusMeta = DELIVERY_STATUS_LABEL[d.status] ?? { label: d.status, color: 'text-gray-600', bg: 'bg-gray-100' }
                    const nextStatus = DELIVERY_STATUS_NEXT[d.status]
                    return (
                      <Card key={d.id}>
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 bg-[#F4F5F7] rounded-full flex items-center justify-center mt-0.5">
                            <MapPin size={14} className="text-[#0B1E3D]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusMeta.bg} ${statusMeta.color}`}>
                                {statusMeta.label}
                              </span>
                              {d.vehicle && <PlateBadge plate={d.vehicle.license_plate} />}
                            </div>
                            <div className="text-[13px] font-semibold text-[#0B1E3D] mt-1.5">
                              {d.customer?.full_name ?? '—'}
                            </div>
                            {d.pickup_address && (
                              <div className="text-[12px] text-[#5a6a80] mt-0.5 flex items-center gap-1">
                                <MapPin size={11} className="shrink-0" />
                                {d.pickup_address}
                              </div>
                            )}
                            {d.scheduled_time && (
                              <div className="text-[11px] text-[#C9A84C] font-semibold mt-1 flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(d.scheduled_time).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                            {d.vehicle && (
                              <div className="text-[11px] text-[#5a6a80] mt-0.5">
                                {d.vehicle.make} {d.vehicle.model}
                              </div>
                            )}
                          </div>
                        </div>
                        {nextStatus && nextStatus !== d.status && (
                          <div className="mt-3 pt-3 border-t border-[rgba(11,30,61,0.08)]">
                            <button
                              className="btn-mobile-action bg-[#0B1E3D] text-white w-full text-[13px]"
                              disabled={deliveryChanging === d.id}
                              onClick={() => advanceDeliveryStatus(d.id, d.status)}
                            >
                              → {DELIVERY_STATUS_LABEL[nextStatus]?.label ?? nextStatus}
                            </button>
                          </div>
                        )}
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>

            {/* ── Section 5: Alkatrész igénylés ───────────────────────────── */}
            <section>
              <SectionHeader icon={<Package size={14} />} title="Alkatrész igénylés" />
              <Card>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[13px] text-[#5a6a80]">
                      Alkatrész igénylést küldhet a raktárnak vagy Barbarának.
                    </p>
                  </div>
                  <Button variant="gold" size="sm" onClick={() => setShowPartsModal(true)}>
                    <Package size={13} />
                    Igénylés
                  </Button>
                </div>
              </Card>
            </section>

            {/* ── Section 6: Feladataim ────────────────────────────────────── */}
            <section>
              <SectionHeader icon={<ListChecks size={14} />} title="Feladataim" count={tasks.length} />
              {tasksError ? (
                <Card className="text-center py-6">
                  <AlertCircle size={24} className="mx-auto text-[#5a6a80] mb-2" />
                  <p className="text-[13px] text-[#5a6a80]">A feladatok tábla még nem elérhető</p>
                </Card>
              ) : tasks.length === 0 ? (
                <EmptyState icon={<ListChecks size={28} />} message="Nincs nyitott feladatod" />
              ) : (
                <div className="space-y-2">
                  {tasks.map(task => {
                    const pm = PRIORITY_META[task.priority] ?? PRIORITY_META.normal
                    const isOverdue = task.due_date && task.due_date < toDateString(new Date())
                    return (
                      <Card key={task.id} className={`border-l-4 ${pm.border} pl-4`}>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[13px] font-semibold text-[#0B1E3D]">{task.title}</span>
                              <PriorityBadge priority={task.priority} />
                            </div>
                            {task.description && (
                              <p className="text-[12px] text-[#5a6a80] mt-0.5 line-clamp-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                              {task.due_date && (
                                <span className={`text-[11px] font-semibold flex items-center gap-1 ${isOverdue ? 'text-[#C9384C]' : 'text-[#5a6a80]'}`}>
                                  <Clock size={10} />
                                  {formatDate(task.due_date)}
                                  {isOverdue && ' (Lejárt)'}
                                </span>
                              )}
                              {task.customer && (
                                <span className="text-[11px] text-[#5a6a80] flex items-center gap-1">
                                  <User size={10} />
                                  {(task.customer as any).full_name}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markTaskDone(task.id)}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50 shrink-0"
                          >
                            <CheckCircle size={14} />
                            Kész
                          </Button>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </section>

          </>
        )}
      </div>

      {/* ── Parts Request Modal ─────────────────────────────────────────────── */}
      <Modal
        open={showPartsModal}
        onClose={() => setShowPartsModal(false)}
        title="Alkatrész igénylés"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPartsModal(false)}>Mégsem</Button>
            <Button variant="gold" onClick={submitPartsRequest} disabled={savingParts}>
              {savingParts ? 'Küldés...' : 'Igénylés elküldése'}
            </Button>
          </>
        }
      >
        <div className="space-y-1">
          <FormGroup>
            <FormLabel>Munkalap (opcionális)</FormLabel>
            <Select
              value={partsForm.work_order_id}
              onChange={e => setPartsForm(p => ({ ...p, work_order_id: e.target.value }))}
            >
              <option value="">— Munkalap kiválasztása —</option>
              {activeOrders.map(o => (
                <option key={o.id} value={o.id}>
                  {o.vehicle?.license_plate} — {o.customer?.full_name}
                </option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Alkatrész neve *</FormLabel>
            <Input
              value={partsForm.part_name}
              onChange={e => setPartsForm(p => ({ ...p, part_name: e.target.value }))}
              placeholder="Pl.: Fékbetét, olajszűrő..."
            />
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup>
              <FormLabel>Mennyiség</FormLabel>
              <Input
                type="number"
                min="1"
                value={partsForm.quantity}
                onChange={e => setPartsForm(p => ({ ...p, quantity: e.target.value }))}
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Sürgősség</FormLabel>
              <Select
                value={partsForm.urgency}
                onChange={e => setPartsForm(p => ({ ...p, urgency: e.target.value }))}
              >
                <option value="normal">Normál</option>
                <option value="urgent">Sürgős</option>
              </Select>
            </FormGroup>
          </div>
          <FormGroup>
            <FormLabel>Megjegyzés</FormLabel>
            <Textarea
              value={partsForm.notes}
              onChange={e => setPartsForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Egyéb info, cikkszám, forrás..."
            />
          </FormGroup>
        </div>
      </Modal>

      {/* ── Workflow Modal ──────────────────────────────────────────────────── */}
      {workflowOrder && (
        <WorkflowModal
          order={workflowOrder}
          onClose={() => { setWorkflowOrder(null); fetchAll(); onRefresh() }}
          onRefresh={() => { fetchAll(); onRefresh() }}
          userId={userId}
          profile={profile}
        />
      )}

    </div>
  )
}

// ─── Helper sub-components ────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  count,
}: {
  icon: React.ReactNode
  title: string
  count?: number
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[#C9A84C]">{icon}</span>
      <h2 className="text-[12px] font-semibold text-[#5a6a80] uppercase tracking-[0.7px]">{title}</h2>
      {count !== undefined && (
        <span className="ml-auto bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
    </div>
  )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <Card className="py-8 text-center">
      <div className="flex justify-center text-[rgba(11,30,61,0.2)] mb-2">{icon}</div>
      <p className="text-[13px] text-[#5a6a80]">{message}</p>
    </Card>
  )
}

// ─── Active Work Order Card ───────────────────────────────────────────────────

function ActiveWorkOrderCard({
  order,
  expanded,
  onToggle,
  orderTasks,
  loadingTasks,
  statusChanging,
  onStatusChange,
  onWorkLogged,
  onPhotoUpload,
  onOpenDetail,
  onOpenWorkflow,
  onTaskUpdate,
  userId,
  profile,
}: {
  order: WorkOrder
  expanded: boolean
  onToggle: () => void
  orderTasks: WOTask[] | null
  loadingTasks: boolean
  statusChanging: string | null
  onStatusChange: (id: string, status: string, phase?: string) => Promise<void>
  onWorkLogged: (orderId: string, notes: string) => Promise<void>
  onPhotoUpload: (orderId: string, file: File, phase?: string) => void
  onOpenDetail?: () => void
  onOpenWorkflow?: () => void
  onTaskUpdate: (taskId: string, updates: Partial<WOTask>) => void
  userId: string | null
  profile?: any
}) {
  const [flagOpen, setFlagOpen] = useState(false)
  const [activePhase, setActivePhase] = useState<string>('tasks')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const isCheckin = order.status === 'checked_in'
  const isDiagnostics = order.status === 'diagnostics'
  const isRepair = ['in_repair', 'waiting_parts'].includes(order.status)
  const isQC = order.status === 'quality_check'

  const submitFlag = async (flag: { flag_type: string; description: string; extra_hours: number }) => {
    await supabase.from('technician_flags').insert({
      work_order_id: order.id,
      flag_type: flag.flag_type,
      description: flag.description,
      extra_hours: flag.extra_hours,
      created_by: userId,
    })
  }

  const doneTasks = (orderTasks ?? []).filter(t => t.status === 'done').length
  const totalTasks = (orderTasks ?? []).length
  const problemTasks = (orderTasks ?? []).filter(t => t.status === 'problem').length

  return (
    <Card className="card-touchable p-0 overflow-hidden">
      {/* Card header */}
      <div
        className="flex items-start gap-3 cursor-pointer px-4 pt-4 pb-3"
        onClick={onToggle}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <PlateBadge plate={order.vehicle?.license_plate ?? '—'} />
            <span className="text-[13px] font-semibold text-[#0B1E3D]">
              {order.vehicle?.make} {order.vehicle?.model}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-[12px] text-[#5a6a80] flex items-center gap-1">
              <User size={11} />
              {order.customer?.full_name}
            </span>
            <StatusBadge status={order.status} />
            {order.order_number && (
              <span className="text-[10px] font-mono text-[#5a6a80]">{order.order_number}</span>
            )}
          </div>
          {order.fault_description && (
            <p className="text-[12px] text-[#5a6a80] mt-1.5 line-clamp-2">{order.fault_description}</p>
          )}
          {/* Phase progress bar */}
          <PhaseProgressBar status={order.status} />
          {/* Task progress summary */}
          {totalTasks > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 bg-[rgba(11,30,61,0.08)] rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${doneTasks === totalTasks ? 'bg-emerald-500' : 'bg-[#C9A84C]'}`}
                  style={{ width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%` }}
                />
              </div>
              <span className="text-[10px] text-[#5a6a80] font-semibold shrink-0">
                {doneTasks}/{totalTasks} feladat
                {problemTasks > 0 && <span className="text-red-500 ml-1">⚠ {problemTasks}</span>}
              </span>
            </div>
          )}
        </div>
        <button className="text-[#5a6a80] hover:text-[#0B1E3D] transition-colors mt-0.5 shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      <TechnicianFlagModal
        open={flagOpen}
        workOrderId={order.id}
        onClose={() => setFlagOpen(false)}
        onSubmit={submitFlag}
      />

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[rgba(11,30,61,0.08)] px-4 pb-4 pt-3 space-y-3">

          {/* Phase tabs */}
          <div className="flex gap-1 bg-[rgba(11,30,61,0.05)] rounded-xl p-1">
            {[
              { key: 'tasks', label: 'Feladatok', show: true },
              { key: 'checkin', label: 'Check-In', show: isCheckin },
              { key: 'timer', label: 'Időzítő', show: isRepair && order.pricing_mode !== 'fixed' },
              { key: 'photos', label: 'Fotók', show: true },
            ].filter(t => t.show).map(tab => (
              <button
                key={tab.key}
                className={`flex-1 text-[11px] font-semibold py-1.5 rounded-lg transition-colors ${
                  activePhase === tab.key
                    ? 'bg-white text-[#0B1E3D] shadow-sm'
                    : 'text-[#5a6a80]'
                }`}
                onClick={() => setActivePhase(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Check-In Checklist */}
          {activePhase === 'checkin' && isCheckin && (
            <CheckInChecklistPanel
              orderId={order.id}
              userId={userId}
              onComplete={() => onStatusChange(order.id, 'diagnostics', 'checkin')}
            />
          )}

          {/* Tab: Feladatok (work order tasks from DB) */}
          {activePhase === 'tasks' && (
            <div className="space-y-2">
              {loadingTasks ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (orderTasks ?? []).length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-[12px] text-[#5a6a80]">Nincs feladat ehhez a munkalaphoz</p>
                  <p className="text-[11px] text-[#5a6a80] mt-1 opacity-70">
                    Barbara által kiválasztott szolgáltatásokból generálódnak a feladatok
                  </p>
                </div>
              ) : (
                (orderTasks ?? []).map(task => (
                  <WOTaskCard
                    key={task.id}
                    task={task}
                    workOrderPricingMode={order.pricing_mode}
                    onUpdate={(taskId, updates) => onTaskUpdate(taskId, updates)}
                  />
                ))
              )}

              {/* Status actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {isCheckin && (
                  <button
                    className="btn-mobile-action bg-indigo-600 text-white text-[12px] col-span-2"
                    onClick={() => setActivePhase('checkin')}
                  >
                    <ListChecks size={14} /> Check-In Checklist megnyitása
                  </button>
                )}
                {order.status === 'waiting_parts' && (
                  <button
                    className="btn-mobile-action bg-blue-50 text-blue-700 border border-blue-200 text-[12px] col-span-1"
                    disabled={statusChanging === order.id}
                    onClick={() => onStatusChange(order.id, 'in_repair', 'repair')}
                  >
                    <Play size={14} /> Folytatás
                  </button>
                )}
                {order.status === 'in_repair' && (
                  <button
                    className="btn-mobile-action bg-[#F4F5F7] text-[#0B1E3D] border border-[rgba(11,30,61,0.12)] text-[12px] col-span-1"
                    disabled={statusChanging === order.id}
                    onClick={() => onStatusChange(order.id, 'waiting_parts', 'waiting_parts')}
                  >
                    <Package size={14} /> Alkatrész kell
                  </button>
                )}
                {(isRepair || isDiagnostics) && (
                  <button
                    className="btn-mobile-action bg-[#C9A84C] text-[#0B1E3D] text-[12px] font-bold col-span-1"
                    disabled={statusChanging === order.id}
                    onClick={() => onStatusChange(order.id, 'quality_check', 'qc')}
                  >
                    <CheckCircle size={14} /> Munka kész!
                  </button>
                )}
                {isQC && (
                  <button
                    className="btn-mobile-action bg-emerald-600 text-white text-[12px] font-bold col-span-2"
                    disabled={statusChanging === order.id}
                    onClick={() => onStatusChange(order.id, 'ready', 'ready')}
                  >
                    <CheckCircle size={14} /> Min.-ellenőrzés kész → Átadásra kész
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Tab: Időzítő */}
          {activePhase === 'timer' && (
            <TimeTrackerWidget orderId={order.id} onWorkLogged={onWorkLogged} />
          )}

          {/* Tab: Fotók */}
          {activePhase === 'photos' && (
            <div className="space-y-2">
              <p className="text-[11px] text-[#5a6a80]">
                Fotók feltöltése a munkalaphoz ({STATUS_META[order.status]?.label ?? order.status} fázis)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="btn-mobile-action bg-[#0B1E3D] text-white text-[13px]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera size={16} /> Kamera
                </button>
                <button
                  className="btn-mobile-action bg-[#F4F5F7] text-[#0B1E3D] border border-[rgba(11,30,61,0.12)] text-[13px]"
                  onClick={() => galleryInputRef.current?.click()}
                >
                  <Camera size={16} /> Galéria
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) onPhotoUpload(order.id, file, order.status)
                  e.target.value = ''
                }}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => {
                  const files = Array.from(e.target.files || [])
                  files.forEach(f => onPhotoUpload(order.id, f, order.status))
                  e.target.value = ''
                }}
              />
            </div>
          )}

          {/* Open workflow */}
          {onOpenWorkflow && (
            <button
              className="btn-mobile-action bg-[#C9A84C] text-[#0B1E3D] font-bold w-full text-[13px]"
              onClick={onOpenWorkflow}
            >
              <Wrench size={16} />
              Munkafolyamat megnyitása
            </button>
          )}

          {/* Open full detail */}
          {onOpenDetail && (
            <button
              className="btn-mobile-action bg-[#185FA5] text-white w-full text-[13px]"
              onClick={onOpenDetail}
            >
              <ListChecks size={16} />
              Teljes Munkalap megnyitása
            </button>
          )}

          {/* Flag difficult work */}
          <button
            className="btn-mobile-action bg-amber-50 text-amber-800 border border-amber-300 w-full text-[13px]"
            onClick={() => setFlagOpen(true)}
          >
            <AlertTriangle size={16} />
            Nehézség / Kockázat jelölése
          </button>

        </div>
      )}
    </Card>
  )
}
