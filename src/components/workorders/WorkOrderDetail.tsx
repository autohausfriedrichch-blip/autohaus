'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { formatCurrency, formatDate, STATUS_LABELS } from '@/lib/utils'
import { X, Plus, Play, Pause, Check, Clock, Camera, ChevronDown, Download } from 'lucide-react'

type Tab = 'overview' | 'timeline' | 'tasks' | 'parts' | 'photos' | 'notes'

interface WOEvent {
  id: string
  work_order_id: string
  event_type: string
  title: string
  description?: string
  user_name?: string
  phase?: string
  metadata: Record<string, unknown>
  created_at: string
}

interface WOTask {
  id: string
  work_order_id: string
  title: string
  status: 'pending' | 'in_progress' | 'waiting' | 'done' | 'problem'
  assigned_name?: string
  timer_started_at?: string | null
  elapsed_seconds: number
  notes?: string
  notes_internal?: string
  notes_customer?: string
  notes_problem?: string
  notes_extra?: string
  sort_order: number
  task_number?: string
  completed_at?: string | null
  created_at: string
  service_id?: string
  pricing_type?: string
  price?: number
  estimated_minutes?: number
  checklist?: string[]
  checklist_done?: string[]
  requires_photo?: boolean
  priority?: string
}

interface WOPhoto {
  id: string
  work_order_id: string
  url: string
  category: string
  caption?: string
  uploaded_by: string
  created_at: string
}

interface WOPart {
  id: string
  work_order_id?: string
  name: string
  article_number?: string
  manufacturer?: string
  quantity: number
  purchase_price: number
  sale_price: number
  notes?: string
  created_at: string
}

interface WorkOrderFull {
  id: string
  order_number: string
  customer_id: string
  vehicle_id: string
  status: string
  health?: string
  sla_warning?: boolean
  last_activity_at?: string
  arrival_status?: string
  checkin_status?: string
  diagnostics_status?: string
  quote_status?: string
  parts_status?: string
  repair_status?: string
  quality_status?: string
  checkout_status?: string
  delivery_status?: string
  internal_notes?: string
  customer_notes?: string
  fault_description?: string
  work_to_do?: string
  parts_cost: number
  labor_cost: number
  total_amount: number
  payment_status: string
  scheduled_date?: string
  scheduled_time?: string
  mechanic_id?: string
  is_mobile?: boolean
  mobile_address?: string
  customer?: { full_name: string; phone?: string; email?: string }
  vehicle?: { make: string; model: string; license_plate: string; year?: number }
}

const PHASE_DEFS = [
  {
    key: 'arrival_status',
    label: 'Beérkezés',
    options: ['new', 'confirmed', 'on_the_way', 'arrived'],
    labels: { new: 'Új', confirmed: 'Megerősítve', on_the_way: 'Úton', arrived: 'Megérkezett' },
    doneValues: ['arrived'],
    inProgressValues: ['confirmed', 'on_the_way'],
  },
  {
    key: 'checkin_status',
    label: 'Check-In',
    options: ['pending', 'in_progress', 'done'],
    labels: { pending: 'Várakozik', in_progress: 'Folyamatban', done: 'Kész' },
    doneValues: ['done'],
    inProgressValues: ['in_progress'],
  },
  {
    key: 'diagnostics_status',
    label: 'Diagnosztika',
    options: ['not_needed', 'in_progress', 'done'],
    labels: { not_needed: 'Nem szükséges', in_progress: 'Folyamatban', done: 'Kész' },
    doneValues: ['done'],
    inProgressValues: ['in_progress'],
    notNeededValues: ['not_needed'],
  },
  {
    key: 'quote_status',
    label: 'Ajánlat',
    options: ['not_needed', 'preparing', 'sent', 'waiting_approval', 'accepted', 'rejected'],
    labels: { not_needed: 'Nem szükséges', preparing: 'Készítés alatt', sent: 'Elküldve', waiting_approval: 'Jóváhagyásra vár', accepted: 'Elfogadva', rejected: 'Elutasítva' },
    doneValues: ['accepted'],
    inProgressValues: ['preparing', 'sent', 'waiting_approval'],
    blockedValues: ['rejected'],
    notNeededValues: ['not_needed'],
  },
  {
    key: 'parts_status',
    label: 'Alkatrész',
    options: ['not_needed', 'searching', 'ordered', 'arrived'],
    labels: { not_needed: 'Nem szükséges', searching: 'Keresés', ordered: 'Megrendelve', arrived: 'Megérkezett' },
    doneValues: ['arrived'],
    inProgressValues: ['searching', 'ordered'],
    notNeededValues: ['not_needed'],
  },
  {
    key: 'repair_status',
    label: 'Javítás',
    options: ['not_started', 'in_progress', 'paused', 'done'],
    labels: { not_started: 'Nem kezdett', in_progress: 'Folyamatban', paused: 'Szünetel', done: 'Kész' },
    doneValues: ['done'],
    inProgressValues: ['in_progress'],
  },
  {
    key: 'quality_status',
    label: 'Minőség',
    options: ['pending', 'in_progress', 'done'],
    labels: { pending: 'Várakozik', in_progress: 'Folyamatban', done: 'Kész' },
    doneValues: ['done'],
    inProgressValues: ['in_progress'],
  },
  {
    key: 'checkout_status',
    label: 'Check-Out',
    options: ['pending', 'in_progress', 'done'],
    labels: { pending: 'Várakozik', in_progress: 'Folyamatban', done: 'Kész' },
    doneValues: ['done'],
    inProgressValues: ['in_progress'],
  },
  {
    key: 'delivery_status',
    label: 'Átadás',
    options: ['waiting', 'delivered'],
    labels: { waiting: 'Várakozik', delivered: 'Átadva' },
    doneValues: ['delivered'],
    inProgressValues: [],
  },
]

function phaseColor(phaseDef: typeof PHASE_DEFS[0], value: string) {
  if ((phaseDef.doneValues as string[] | undefined)?.includes(value)) return 'green'
  if ((phaseDef.blockedValues as string[] | undefined)?.includes(value)) return 'red'
  if ((phaseDef.inProgressValues as string[])?.includes(value)) return 'blue'
  if ((phaseDef.notNeededValues as string[] | undefined)?.includes(value)) return 'gray'
  return 'gray'
}

function calcHealth(wo: WorkOrderFull): 'green' | 'yellow' | 'red' {
  const now = Date.now()
  const lastActivity = wo.last_activity_at ? new Date(wo.last_activity_at).getTime() : now
  const diffHours = (now - lastActivity) / 3600000
  if (wo.quote_status === 'rejected') return 'red'
  if (diffHours > 4) return 'red'
  if (diffHours > 1) return 'yellow'
  return 'green'
}

function formatElapsed(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h} óra ${m} perc`
  return `${m} perc`
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })
}

const EVENT_ICONS: Record<string, string> = {
  created: '🆕',
  status_change: '🔄',
  checkin: '✅',
  checkout: '🏁',
  diagnostic_start: '🔍',
  diagnostic_done: '✔️',
  quote_sent: '📄',
  quote_approved: '👍',
  quote_rejected: '👎',
  repair_start: '🔧',
  repair_done: '✅',
  part_added: '📦',
  photo_upload: '📷',
  note_added: '📝',
  time_start: '▶️',
  time_stop: '⏹️',
  delivery: '🚗',
  other: 'ℹ️',
  info: 'ℹ️',
}

interface Props {
  workOrderId: string
  profile: { id: string; full_name: string; role: string }
  onClose: () => void
}

export function WorkOrderDetail({ workOrderId, profile, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('overview')
  const [wo, setWo] = useState<WorkOrderFull | null>(null)
  const [events, setEvents] = useState<WOEvent[]>([])
  const [tasks, setTasks] = useState<WOTask[]>([])
  const [photos, setPhotos] = useState<WOPhoto[]>([])
  const [parts, setParts] = useState<WOPart[]>([])
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [editCustomers, setEditCustomers] = useState<any[]>([])
  const [editVehicles, setEditVehicles] = useState<any[]>([])
  const [editMechanics, setEditMechanics] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openPhaseDropdown, setOpenPhaseDropdown] = useState<string | null>(null)
  const [newEventForm, setNewEventForm] = useState({ open: false, title: '', description: '', event_type: 'note_added' })
  const [newTaskForm, setNewTaskForm] = useState({ open: false, title: '', assigned_name: '' })
  const [newPartForm, setNewPartForm] = useState({ open: false, name: '', article_number: '', manufacturer: '', purchase_price: '', sale_price: '', quantity: '1', notes: '' })
  const [notes, setNotes] = useState({ internal: '', customer: '' })
  const [notesSaving, setNotesSaving] = useState(false)
  const [taskTimers, setTaskTimers] = useState<Record<string, number>>({})
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [activeNoteTab, setActiveNoteTab] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: woData }, { data: evData }, { data: taskData }, { data: photoData }, { data: partsData }] = await Promise.all([
      supabase.from('work_orders').select('*, customer:customers(full_name,phone,email), vehicle:vehicles(make,model,license_plate,year)').eq('id', workOrderId).single(),
      supabase.from('work_order_events').select('*').eq('work_order_id', workOrderId).order('created_at', { ascending: true }),
      supabase.from('work_order_tasks').select('*').eq('work_order_id', workOrderId).order('sort_order', { ascending: true }),
      supabase.from('work_order_photos').select('*').eq('work_order_id', workOrderId).order('created_at', { ascending: false }),
      supabase.from('parts_inventory').select('*').eq('work_order_id', workOrderId),
    ])
    if (woData) {
      setWo(woData as WorkOrderFull)
      setNotes({ internal: (woData as WorkOrderFull).internal_notes || '', customer: (woData as WorkOrderFull).customer_notes || '' })
    }
    setEvents((evData || []) as WOEvent[])
    setTasks((taskData || []) as WOTask[])
    setPhotos((photoData || []) as WOPhoto[])
    setParts((partsData || []) as WOPart[])
    setLoading(false)
  }, [workOrderId])

  useEffect(() => { load() }, [load])

  // Silent background refresh — keeps both profiles in sync without resetting loading state
  const silentRefresh = useCallback(async () => {
    const [{ data: evData }, { data: taskData }, { data: woData }] = await Promise.all([
      supabase.from('work_order_events').select('*').eq('work_order_id', workOrderId).order('created_at', { ascending: true }),
      supabase.from('work_order_tasks').select('*').eq('work_order_id', workOrderId).order('sort_order', { ascending: true }),
      supabase.from('work_orders').select('*, customer:customers(full_name,phone,email), vehicle:vehicles(make,model,license_plate,year)').eq('id', workOrderId).single(),
    ])
    if (evData) setEvents(evData as WOEvent[])
    if (taskData) setTasks(taskData as WOTask[])
    if (woData) setWo(woData as WorkOrderFull)
  }, [workOrderId])

  useEffect(() => {
    const interval = setInterval(silentRefresh, 15000)
    return () => clearInterval(interval)
  }, [silentRefresh])

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now()
      const updates: Record<string, number> = {}
      tasks.forEach(t => {
        if (t.status === 'in_progress' && t.timer_started_at) {
          const started = new Date(t.timer_started_at).getTime()
          updates[t.id] = t.elapsed_seconds + Math.floor((now - started) / 1000)
        }
      })
      setTaskTimers(updates)
    }, 1000)
    return () => clearInterval(interval)
  }, [tasks])

  const logEvent = useCallback(async (eventType: string, title: string, description?: string, phase?: string) => {
    await supabase.from('work_order_events').insert({
      work_order_id: workOrderId,
      event_type: eventType,
      title,
      description,
      user_name: profile.full_name,
      phase,
    })
  }, [workOrderId, profile.full_name])

  const updatePhase = async (phaseKey: string, value: string, phaseLabel: string) => {
    const health = wo ? calcHealth({ ...wo, [phaseKey]: value } as WorkOrderFull) : 'green'
    await supabase.from('work_orders').update({
      [phaseKey]: value,
      health,
      last_activity_at: new Date().toISOString(),
    }).eq('id', workOrderId)
    await logEvent('status_change', `${phaseLabel}: ${value}`, undefined, phaseKey)
    setOpenPhaseDropdown(null)
    load()
    toast('Fázis frissítve')
    // Auto-switch to Tasks tab when repair starts
    if (phaseKey === 'repair_status' && value === 'in_progress') {
      setTab('tasks')
    }
  }

  const isAdmin = profile.role === 'super_admin' || profile.role === 'admin'

  const deleteWorkOrder = async () => {
    if (!confirm(`Biztosan törlöd a ${wo?.order_number} munkalapot? Ez nem visszavonható!`)) return
    await supabase.from('work_order_tasks').delete().eq('work_order_id', workOrderId)
    await supabase.from('work_order_events').delete().eq('work_order_id', workOrderId)
    await supabase.from('work_order_photos').delete().eq('work_order_id', workOrderId)
    await supabase.from('parts_inventory').delete().eq('work_order_id', workOrderId)
    const { error } = await supabase.from('work_orders').delete().eq('id', workOrderId)
    if (error) { toast(`Törlési hiba: ${error.message}`, 'error'); return }
    toast('Munkalap törölve')
    onClose()
  }

  const openEdit = async () => {
    if (!wo) return
    setEditForm({
      customer_id: wo.customer_id || '',
      vehicle_id: wo.vehicle_id || '',
      mechanic_id: wo.mechanic_id || '',
      status: wo.status,
      scheduled_date: wo.scheduled_date || '',
      scheduled_time: wo.scheduled_time || '',
      fault_description: wo.fault_description || '',
      work_to_do: wo.work_to_do || '',
      internal_notes: wo.internal_notes || '',
      customer_notes: wo.customer_notes || '',
      parts_cost: wo.parts_cost || 0,
      labor_cost: wo.labor_cost || 0,
      is_mobile: wo.is_mobile || false,
      mobile_address: wo.mobile_address || '',
    })
    const [{ data: c }, { data: v }, { data: m }] = await Promise.all([
      supabase.from('customers').select('id, full_name').order('full_name'),
      supabase.from('vehicles').select('id, make, model, license_plate, customer_id'),
      supabase.from('profiles').select('id, full_name').in('role', ['mechanic', 'admin', 'super_admin']),
    ])
    setEditCustomers(c || [])
    setEditVehicles(v || [])
    setEditMechanics(m || [])
    setEditModal(true)
  }

  const saveEdit = async () => {
    const total = (parseFloat(editForm.parts_cost) || 0) + (parseFloat(editForm.labor_cost) || 0)
    const { error } = await supabase.from('work_orders').update({
      customer_id: editForm.customer_id || null,
      vehicle_id: editForm.vehicle_id || null,
      mechanic_id: editForm.mechanic_id || null,
      status: editForm.status,
      scheduled_date: editForm.scheduled_date || null,
      scheduled_time: editForm.scheduled_time || null,
      fault_description: editForm.fault_description || null,
      work_to_do: editForm.work_to_do || null,
      internal_notes: editForm.internal_notes || null,
      customer_notes: editForm.customer_notes || null,
      parts_cost: parseFloat(editForm.parts_cost) || 0,
      labor_cost: parseFloat(editForm.labor_cost) || 0,
      total_amount: total,
      is_mobile: editForm.is_mobile || false,
      mobile_address: editForm.mobile_address || null,
    }).eq('id', workOrderId)
    if (error) { toast(`Hiba: ${error.message}`, 'error'); return }
    await logEvent('note_added', 'Munkalap adatok módosítva', undefined)
    setEditModal(false)
    load()
    toast('Munkalap mentve')
  }

  const addEvent = async () => {
    if (!newEventForm.title) return
    await supabase.from('work_order_events').insert({
      work_order_id: workOrderId,
      event_type: newEventForm.event_type,
      title: newEventForm.title,
      description: newEventForm.description || null,
      user_name: profile.full_name,
    })
    setNewEventForm({ open: false, title: '', description: '', event_type: 'note_added' })
    load()
    toast('Esemény hozzáadva')
  }

  const addTask = async () => {
    if (!newTaskForm.title) return
    await supabase.from('work_order_tasks').insert({
      work_order_id: workOrderId,
      title: newTaskForm.title,
      assigned_name: newTaskForm.assigned_name || null,
      sort_order: tasks.length,
    })
    await logEvent('note_added', `Feladat hozzáadva: ${newTaskForm.title}`)
    setNewTaskForm({ open: false, title: '', assigned_name: '' })
    load()
    toast('Feladat hozzáadva')
  }

  const startTask = async (task: WOTask) => {
    await supabase.from('work_order_tasks').update({ status: 'in_progress', timer_started_at: new Date().toISOString() }).eq('id', task.id)
    await logEvent('time_start', `Feladat indítva: ${task.title}`)
    load()
  }

  const pauseTask = async (task: WOTask) => {
    const now = Date.now()
    const started = task.timer_started_at ? new Date(task.timer_started_at).getTime() : now
    const added = Math.floor((now - started) / 1000)
    await supabase.from('work_order_tasks').update({
      status: 'paused',
      timer_started_at: null,
      elapsed_seconds: task.elapsed_seconds + added,
    }).eq('id', task.id)
    await logEvent('time_stop', `Feladat szüneteltetve: ${task.title}`)
    load()
  }

  const doneTask = async (task: WOTask) => {
    const now = Date.now()
    const started = task.timer_started_at ? new Date(task.timer_started_at).getTime() : now
    const added = task.timer_started_at ? Math.floor((now - started) / 1000) : 0
    await supabase.from('work_order_tasks').update({
      status: 'done',
      timer_started_at: null,
      elapsed_seconds: task.elapsed_seconds + added,
      completed_at: new Date().toISOString(),
    }).eq('id', task.id)
    await logEvent('note_added', `Feladat kész: ${task.title}`)
    load()
  }

  const updateTaskNotes = async (taskId: string, notes: string) => {
    await supabase.from('work_order_tasks').update({ notes }).eq('id', taskId)
    load()
  }

  const setTaskStatus = async (task: WOTask, newStatus: string) => {
    const updates: any = { status: newStatus }
    if (newStatus === 'in_progress' && !task.timer_started_at && task.pricing_type === 'hourly') {
      updates.timer_started_at = new Date().toISOString()
    }
    if (newStatus === 'done') {
      const now = Date.now()
      const started = task.timer_started_at ? new Date(task.timer_started_at).getTime() : now
      const added = task.timer_started_at ? Math.floor((now - started) / 1000) : 0
      updates.timer_started_at = null
      updates.elapsed_seconds = (task.elapsed_seconds || 0) + added
      updates.completed_at = new Date().toISOString()
    } else if (task.timer_started_at && newStatus !== 'in_progress') {
      const now = Date.now()
      const started = new Date(task.timer_started_at).getTime()
      updates.timer_started_at = null
      updates.elapsed_seconds = (task.elapsed_seconds || 0) + Math.floor((now - started) / 1000)
    }
    await supabase.from('work_order_tasks').update(updates).eq('id', task.id)
    await logEvent('note_added', `Feladat státusz: ${task.title} → ${newStatus}`)
    load()
  }

  const toggleChecklistItem = async (task: WOTask, item: string) => {
    const done = task.checklist_done || []
    const newDone = done.includes(item) ? done.filter((x: string) => x !== item) : [...done, item]
    await supabase.from('work_order_tasks').update({ checklist_done: newDone }).eq('id', task.id)
    load()
  }

  const updateTaskNoteField = async (taskId: string, field: string, value: string) => {
    await supabase.from('work_order_tasks').update({ [field]: value }).eq('id', taskId)
    load()
  }

  const addPart = async () => {
    if (!newPartForm.name) return
    await supabase.from('parts_inventory').insert({
      work_order_id: workOrderId,
      name: newPartForm.name,
      article_number: newPartForm.article_number || null,
      manufacturer: newPartForm.manufacturer || null,
      purchase_price: parseFloat(newPartForm.purchase_price) || 0,
      sale_price: parseFloat(newPartForm.sale_price) || 0,
      quantity: parseInt(newPartForm.quantity) || 1,
      notes: newPartForm.notes || null,
    })
    await logEvent('part_added', `Alkatrész hozzáadva: ${newPartForm.name}`)
    setNewPartForm({ open: false, name: '', article_number: '', manufacturer: '', purchase_price: '', sale_price: '', quantity: '1', notes: '' })
    load()
    toast('Alkatrész hozzáadva')
  }

  const saveNotes = async () => {
    setNotesSaving(true)
    await supabase.from('work_orders').update({ internal_notes: notes.internal, customer_notes: notes.customer }).eq('id', workOrderId)
    await logEvent('note_added', 'Megjegyzés frissítve')
    setNotesSaving(false)
    toast('Megjegyzés mentve')
  }

  const uploadPhoto = async (file: File) => {
    const ext = file.name.split('.').pop()
    const path = `work_orders/${workOrderId}/${Date.now()}.${ext}`
    const { error: upError } = await supabase.storage.from('photos').upload(path, file)
    if (upError) { toast('Feltöltési hiba', 'error'); return }
    const { data: urlData } = supabase.storage.from('photos').getPublicUrl(path)
    await supabase.from('work_order_photos').insert({
      work_order_id: workOrderId,
      url: urlData.publicUrl,
      category: 'general',
      uploaded_by: profile.full_name,
    })
    await logEvent('photo_upload', 'Fotó feltöltve')
    load()
    toast('Fotó feltöltve')
  }

  const healthDot = (h: string) => {
    if (h === 'red') return <span className="w-3 h-3 rounded-full bg-[#C9384C] inline-block" title="Piros" />
    if (h === 'yellow') return <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" title="Sárga" />
    return <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" title="Zöld" />
  }

  if (loading || !wo) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
        <div className="text-[#5a6a80] text-sm">Betöltés...</div>
      </div>
    )
  }

  const phaseValues: Record<string, string> = {
    arrival_status: wo.arrival_status || 'new',
    checkin_status: wo.checkin_status || 'pending',
    diagnostics_status: wo.diagnostics_status || 'not_needed',
    quote_status: wo.quote_status || 'not_needed',
    parts_status: wo.parts_status || 'not_needed',
    repair_status: wo.repair_status || 'not_started',
    quality_status: wo.quality_status || 'pending',
    checkout_status: wo.checkout_status || 'pending',
    delivery_status: wo.delivery_status || 'waiting',
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Áttekintés' },
    { id: 'timeline', label: 'Idővonal' },
    { id: 'tasks', label: 'Feladatok' },
    { id: 'parts', label: 'Alkatrészek' },
    { id: 'photos', label: 'Fotók' },
    { id: 'notes', label: 'Megjegyzések' },
  ]

  const totalPartsCost = parts.reduce((s, p) => s + p.purchase_price * p.quantity, 0)
  const totalSalePrice = parts.reduce((s, p) => s + p.sale_price * p.quantity, 0)
  const totalMargin = totalSalePrice - totalPartsCost
  const tasksDone = tasks.filter(t => t.status === 'done').length

  return (
    <div className="wo-detail-overlay" onClick={e => { if (openPhaseDropdown && !(e.target as HTMLElement).closest('[data-phase-dropdown]')) setOpenPhaseDropdown(null) }}>
    <div className="wo-detail-panel animate-slide-right">
      <div className="px-3 sm:px-5 pb-10">

        <div className="sticky top-0 bg-white border-b border-[rgba(11,30,61,0.10)] z-10 pt-3 sm:pt-4 pb-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap mb-2 sm:mb-3">
            <span className="text-[11px] font-bold text-[#185FA5] bg-[#E6F1FB] px-2 py-0.5 rounded">{wo.order_number}</span>
            {healthDot(wo.health || 'green')}
            <span className="font-bold text-[15px] text-[#0B1E3D]">{wo.customer?.full_name}</span>
            {wo.vehicle && (
              <>
                <span className="bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-1 rounded">{wo.vehicle.license_plate}</span>
                <span className="text-[13px] text-[#5a6a80]">{wo.vehicle.make} {wo.vehicle.model}</span>
              </>
            )}
            {wo.scheduled_date && <span className="text-[12px] text-[#5a6a80]">{formatDate(wo.scheduled_date)}</span>}
            <div className="ml-auto flex items-center gap-1">
              {isAdmin && (
                <>
                  <button onClick={openEdit}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C] hover:text-white rounded-lg transition-colors">
                    ✏️ Szerkesztés
                  </button>
                  <button onClick={deleteWorkOrder}
                    className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 border border-red-300 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                    🗑️ Törlés
                  </button>
                </>
              )}
              <button onClick={onClose} className="p-2 rounded-full hover:bg-[#F4F5F7] text-[#5a6a80] hover:text-[#0B1E3D]">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-4 py-2.5 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'border-[#C9A84C] text-[#0B1E3D]' : 'border-transparent text-[#5a6a80] hover:text-[#0B1E3D]'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6">

          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <div className="flex items-start gap-0 min-w-max">
                  {PHASE_DEFS.map((pd, idx) => {
                    const val = phaseValues[pd.key]
                    const color = phaseColor(pd, val)
                    const colorClasses = {
                      green: 'bg-emerald-500 text-white',
                      blue: 'bg-blue-500 text-white',
                      red: 'bg-[#C9384C] text-white',
                      gray: 'bg-[#dde3ec] text-[#5a6a80]',
                    }[color]
                    const labelMap = pd.labels as unknown as Record<string, string>
                    return (
                      <div key={pd.key} className="flex items-center">
                        <div className="relative flex flex-col items-center" data-phase-dropdown>
                          <button
                            onClick={() => setOpenPhaseDropdown(openPhaseDropdown === pd.key ? null : pd.key)}
                            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold whitespace-nowrap flex items-center gap-1 ${colorClasses}`}>
                            {pd.label}
                            <ChevronDown size={10} />
                          </button>
                          <span className="text-[10px] text-[#5a6a80] mt-1 whitespace-nowrap">{labelMap[val] || val}</span>
                          {openPhaseDropdown === pd.key && (
                            <div className="absolute top-full mt-1 bg-white border border-[rgba(11,30,61,0.15)] rounded-lg shadow-lg z-20 min-w-[140px]">
                              {pd.options.map(opt => (
                                <button key={opt} onClick={() => updatePhase(pd.key, opt, pd.label)}
                                  className={`block w-full text-left px-3 py-2 text-[12px] hover:bg-[#F4F5F7] ${val === opt ? 'font-semibold text-[#0B1E3D]' : 'text-[#5a6a80]'}`}>
                                  {labelMap[opt] || opt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        {idx < PHASE_DEFS.length - 1 && <div className="w-6 h-0.5 bg-[#dde3ec] mx-1 mt-[-10px]" />}
                      </div>
                    )
                  })}
                </div>
              </div>

              {wo.sla_warning && (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3 text-[13px] text-yellow-800 font-medium">
                  SLA figyelmeztetés: egy vagy több fázis késésben van.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {PHASE_DEFS.map(pd => {
                  const val = phaseValues[pd.key]
                  const color = phaseColor(pd, val)
                  const labelMap = pd.labels as unknown as Record<string, string>
                  const borderColor = { green: 'border-emerald-400', blue: 'border-blue-400', red: 'border-[#C9384C]', gray: 'border-[#dde3ec]' }[color]
                  return (
                    <div key={pd.key} className={`bg-white border-l-4 ${borderColor} rounded-lg px-4 py-3 shadow-sm`}>
                      <div className="text-[11px] text-[#5a6a80] font-semibold uppercase mb-1">{pd.label}</div>
                      <select value={val} onChange={e => updatePhase(pd.key, e.target.value, pd.label)}
                        className="w-full text-[12px] border border-[rgba(11,30,61,0.15)] rounded px-2 py-1.5 bg-white outline-none">
                        {pd.options.map(opt => <option key={opt} value={opt}>{labelMap[opt] || opt}</option>)}
                      </select>
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#F4F5F7] rounded-lg p-3 text-center">
                  <div className="text-[11px] text-[#5a6a80] mb-1">Feladatok</div>
                  <div className="text-[22px] font-bold text-[#0B1E3D]">{tasksDone}/{tasks.length}</div>
                </div>
                <div className="bg-[#F4F5F7] rounded-lg p-3 text-center">
                  <div className="text-[11px] text-[#5a6a80] mb-1">Alkatrészek</div>
                  <div className="text-[22px] font-bold text-[#0B1E3D]">{parts.length}</div>
                </div>
                <div className="bg-[#F4F5F7] rounded-lg p-3 text-center">
                  <div className="text-[11px] text-[#5a6a80] mb-1">Fotók</div>
                  <div className="text-[22px] font-bold text-[#0B1E3D]">{photos.length}</div>
                </div>
                <div className="bg-[#F4F5F7] rounded-lg p-3 text-center">
                  <div className="text-[11px] text-[#5a6a80] mb-1">Összeg</div>
                  <div className="text-[16px] font-bold text-[#0B1E3D]">{formatCurrency(wo.total_amount)}</div>
                </div>
              </div>

              {/* Inline timeline for admin/super_admin — always visible on overview */}
              {isAdmin && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-bold text-[#5a6a80] uppercase tracking-wider">Idővonal</h3>
                    <span className="text-[10px] text-[#8fa0b5]">automatikusan frissül</span>
                  </div>
                  <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                    {events.length === 0 && (
                      <div className="text-[12px] text-[#8fa0b5] py-3 text-center">Még nincs esemény</div>
                    )}
                    {[...events].reverse().map(ev => (
                      <div key={ev.id} className="flex gap-2.5 items-start">
                        <span className="text-[16px] flex-shrink-0 mt-0.5">{EVENT_ICONS[ev.event_type] || 'ℹ️'}</span>
                        <div className="flex-1 min-w-0 border-b border-[rgba(11,30,61,0.05)] pb-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[12px] font-semibold text-[#0B1E3D]">{ev.title}</span>
                            {ev.user_name && (
                              <span className="text-[9px] bg-[#E6F1FB] text-[#185FA5] px-1.5 py-0.5 rounded-full font-semibold">{ev.user_name}</span>
                            )}
                            <span className="text-[10px] text-[#8fa0b5] ml-auto">{formatTime(ev.created_at)}</span>
                          </div>
                          {ev.description && <p className="text-[11px] text-[#5a6a80] mt-0.5">{ev.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'timeline' && (
            <div className="space-y-4">
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-[#dde3ec]" />
                <div className="space-y-3">
                  {events.map(ev => (
                    <div key={ev.id} className="flex gap-3 relative">
                      <div className="w-10 h-10 rounded-full bg-[#F4F5F7] border-2 border-white flex items-center justify-center text-[16px] flex-shrink-0 relative z-10">
                        {EVENT_ICONS[ev.event_type] || 'ℹ️'}
                      </div>
                      <div className="flex-1 bg-white border border-[rgba(11,30,61,0.08)] rounded-lg px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[13px] text-[#0B1E3D]">{ev.title}</span>
                          <span className="text-[11px] text-[#8fa0b5]">{formatTime(ev.created_at)}</span>
                          {ev.user_name && (
                            <span className="ml-auto text-[10px] bg-[#E6F1FB] text-[#185FA5] px-2 py-0.5 rounded-full font-semibold">{ev.user_name}</span>
                          )}
                        </div>
                        {ev.description && <p className="text-[12px] text-[#5a6a80] mt-1">{ev.description}</p>}
                      </div>
                    </div>
                  ))}
                  {events.length === 0 && <div className="text-[#8fa0b5] text-sm py-4 text-center">Nincs esemény</div>}
                </div>
              </div>

              {!newEventForm.open ? (
                <button onClick={() => setNewEventForm(f => ({ ...f, open: true }))}
                  className="flex items-center gap-2 text-[13px] text-[#C9A84C] font-semibold hover:text-[#0B1E3D]">
                  <Plus size={16} /> Esemény hozzáadása
                </button>
              ) : (
                <div className="bg-[#F4F5F7] rounded-lg p-4 space-y-3">
                  <FormGroup>
                    <FormLabel>Típus</FormLabel>
                    <Select value={newEventForm.event_type} onChange={e => setNewEventForm(f => ({ ...f, event_type: e.target.value }))}>
                      {Object.keys(EVENT_ICONS).map(k => <option key={k} value={k}>{k}</option>)}
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Cím *</FormLabel>
                    <Input value={newEventForm.title} onChange={e => setNewEventForm(f => ({ ...f, title: e.target.value }))} placeholder="Esemény megnevezése..." />
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Leírás</FormLabel>
                    <Textarea value={newEventForm.description} onChange={e => setNewEventForm(f => ({ ...f, description: e.target.value }))} placeholder="Részletek..." />
                  </FormGroup>
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={addEvent}>Hozzáadás</Button>
                    <Button variant="secondary" onClick={() => setNewEventForm({ open: false, title: '', description: '', event_type: 'note_added' })}>Mégse</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'tasks' && (
            <div className="space-y-3">
              {(() => {
                const STATUS_CFG: Record<string, { label: string; color: string; dot: string }> = {
                  pending:    { label: 'Nem kezdődött el', color: 'bg-gray-100 text-gray-600',      dot: 'bg-gray-400' },
                  in_progress:{ label: 'Folyamatban',      color: 'bg-blue-100 text-blue-700',      dot: 'bg-blue-500' },
                  waiting:    { label: 'Várakozik',         color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-400' },
                  done:       { label: 'Kész',              color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
                  problem:    { label: 'Probléma',          color: 'bg-red-100 text-red-700',        dot: 'bg-red-500' },
                }
                const NOTE_TABS = [
                  { key: 'notes_internal', label: 'Belső' },
                  { key: 'notes_customer', label: 'Ügyfélnek' },
                  { key: 'notes_problem',  label: 'Probléma' },
                  { key: 'notes_extra',    label: 'Extra munka' },
                ]
                const doneTasks = tasks.filter(t => t.status === 'done').length
                return (
                  <>
                    {tasks.length > 0 && (() => {
                      const done = tasks.filter(t => t.status === 'done').length
                      const pct = Math.round((done / tasks.length) * 100)
                      return (
                        <div className="mb-4 bg-white border border-[rgba(11,30,61,0.08)] rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[12px] font-semibold text-[#0B1E3D]">Haladás</span>
                            <span className="text-[12px] font-bold text-[#C9A84C]">{done}/{tasks.length} kész ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-[#F4F5F7] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-[#C9A84C]' : 'bg-blue-400'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          {tasks.some(t => t.status === 'problem') && <span className="mt-2 block text-[12px] text-red-600 font-semibold">⚠️ Probléma!</span>}
                        </div>
                      )
                    })()}
                    {tasks.map(task => {
                      const elapsed = task.status === 'in_progress' ? (taskTimers[task.id] ?? task.elapsed_seconds) : (task.elapsed_seconds || 0)
                      const cfg = STATUS_CFG[task.status] || STATUS_CFG.pending
                      const isExpanded = expandedTaskId === task.id
                      const checklist = task.checklist || []
                      const checkDone = task.checklist_done || []
                      const noteTabKey = activeNoteTab[task.id] || 'notes_internal'
                      const isHourly = task.pricing_type === 'hourly'
                      return (
                        <div key={task.id} className={`bg-white border rounded-xl overflow-hidden ${
                          task.status === 'problem' ? 'border-red-300' : task.status === 'done' ? 'border-emerald-200' : 'border-[rgba(11,30,61,0.10)]'
                        }`}>
                          <div className="px-4 py-3 cursor-pointer" onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                              {task.task_number && <span className="text-[10px] font-bold text-[#5a6a80] bg-[#F4F5F7] px-1.5 py-0.5 rounded font-mono">{task.task_number}</span>}
                              <span className="font-semibold text-[14px] text-[#0B1E3D] flex-1">{task.title}</span>
                              {task.priority === 'urgent' && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">SÜRGŐS</span>}
                              {checklist.length > 0 && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${checkDone.length === checklist.length ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                  {checkDone.length}/{checklist.length}
                                </span>
                              )}
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                              <ChevronDown size={14} className={`text-[#8fa0b5] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                            {isHourly && (
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap" onClick={e => e.stopPropagation()}>
                                <Clock size={12} className="text-[#8fa0b5]" />
                                <span className="text-[11px] text-[#5a6a80]">{formatElapsed(elapsed)}</span>
                                {task.estimated_minutes ? <span className="text-[11px] text-[#8fa0b5]">/ {task.estimated_minutes}p</span> : null}
                                {task.status === 'in_progress' && <span className="text-[10px] text-blue-500 animate-pulse font-semibold">● Fut</span>}
                                <div className="flex gap-1 ml-auto">
                                  {task.status !== 'in_progress' && task.status !== 'done' && (
                                    <button onClick={() => startTask(task)} className="flex items-center gap-1 text-[11px] bg-blue-500 text-white px-2 py-1 rounded font-semibold">
                                      <Play size={10} /> Indít
                                    </button>
                                  )}
                                  {task.status === 'in_progress' && (
                                    <button onClick={() => pauseTask(task)} className="flex items-center gap-1 text-[11px] bg-yellow-500 text-white px-2 py-1 rounded font-semibold">
                                      <Pause size={10} /> Szünet
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          {isExpanded && (
                            <div className="border-t border-gray-100 px-4 py-3 space-y-4">
                              <div>
                                <div className="text-[10px] font-bold text-[#5a6a80] uppercase tracking-wide mb-2">Státusz</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {Object.entries(STATUS_CFG).map(([key, c]) => (
                                    <button key={key} onClick={() => setTaskStatus(task, key)}
                                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                                        task.status === key ? `${c.color} border-current` : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                                      }`}>
                                      {c.label}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              {checklist.length > 0 && (
                                <div>
                                  <div className="text-[10px] font-bold text-[#5a6a80] uppercase tracking-wide mb-2">Checklist — {checkDone.length}/{checklist.length}</div>
                                  <div className="space-y-1.5">
                                    {checklist.map((item: string) => {
                                      const done = checkDone.includes(item)
                                      return (
                                        <button key={item} onClick={() => toggleChecklistItem(task, item)}
                                          className={`flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg border transition-all ${done ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                                          <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                                            {done && <Check size={10} className="text-white" />}
                                          </span>
                                          <span className={`text-[12px] ${done ? 'text-emerald-700 line-through' : 'text-[#0B1E3D]'}`}>{item}</span>
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              )}
                              <div>
                                <div className="text-[10px] font-bold text-[#5a6a80] uppercase tracking-wide mb-2">Jegyzetek</div>
                                <div className="flex gap-1 mb-2">
                                  {NOTE_TABS.map(nt => (
                                    <button key={nt.key} onClick={() => setActiveNoteTab(prev => ({ ...prev, [task.id]: nt.key }))}
                                      className={`text-[10px] px-2 py-1 rounded-md font-semibold transition-colors ${noteTabKey === nt.key ? 'bg-[#0B1E3D] text-white' : 'bg-gray-100 text-[#5a6a80] hover:bg-gray-200'}`}>
                                      {nt.label}
                                    </button>
                                  ))}
                                </div>
                                <textarea
                                  key={`${task.id}-${noteTabKey}`}
                                  defaultValue={(task as any)[noteTabKey] || ''}
                                  onBlur={e => { if (e.target.value !== ((task as any)[noteTabKey] || '')) updateTaskNoteField(task.id, noteTabKey, e.target.value) }}
                                  placeholder={
                                    noteTabKey === 'notes_internal' ? 'Belső technikus megjegyzés...' :
                                    noteTabKey === 'notes_customer' ? 'Ügyfélnek látható szöveg...' :
                                    noteTabKey === 'notes_problem' ? 'Probléma / akadály...' : 'Extra munka javaslata...'
                                  }
                                  rows={3}
                                  className="w-full text-[12px] px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0B1E3D] resize-none"
                                />
                              </div>
                              {task.status !== 'done' && (
                                <button onClick={() => setTaskStatus(task, 'done')}
                                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors">
                                  <Check size={16} /> Feladat kész
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )
              })()}
              {tasks.length === 0 && <div className="text-[#8fa0b5] text-sm py-4 text-center">Nincs feladat</div>}
              {!newTaskForm.open ? (
                <button onClick={() => setNewTaskForm(f => ({ ...f, open: true }))}
                  className="flex items-center gap-2 text-[13px] text-[#C9A84C] font-semibold hover:text-[#0B1E3D]">
                  <Plus size={16} /> Feladat hozzáadása
                </button>
              ) : (
                <div className="bg-[#F4F5F7] rounded-lg p-4 space-y-3">
                  <FormGroup>
                    <FormLabel>Feladat neve *</FormLabel>
                    <Input value={newTaskForm.title} onChange={e => setNewTaskForm(f => ({ ...f, title: e.target.value }))} placeholder="Pl: Olajcsere..." />
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Hozzárendelt személy</FormLabel>
                    <Input value={newTaskForm.assigned_name} onChange={e => setNewTaskForm(f => ({ ...f, assigned_name: e.target.value }))} placeholder="Szerelő neve..." />
                  </FormGroup>
                  <div className="flex gap-2">
                    <Button variant="primary" onClick={addTask}>Hozzáadás</Button>
                    <Button variant="secondary" onClick={() => setNewTaskForm({ open: false, title: '', assigned_name: '' })}>Mégse</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'parts' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[rgba(11,30,61,0.08)]">
                      {['Név', 'Cikkszám', 'Gyártó', 'Menny.', 'Besz. ár', 'El. ár', 'Profit'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[11px] font-semibold text-[#5a6a80] uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map(p => (
                      <tr key={p.id} className="border-b border-[rgba(11,30,61,0.05)] hover:bg-[#F4F5F7]">
                        <td className="px-3 py-2 font-medium text-[#0B1E3D]">{p.name}</td>
                        <td className="px-3 py-2 text-[#5a6a80]">{p.article_number || '-'}</td>
                        <td className="px-3 py-2 text-[#5a6a80]">{p.manufacturer || '-'}</td>
                        <td className="px-3 py-2">{p.quantity}</td>
                        <td className="px-3 py-2">{formatCurrency(p.purchase_price)}</td>
                        <td className="px-3 py-2">{formatCurrency(p.sale_price)}</td>
                        <td className={`px-3 py-2 font-semibold ${(p.sale_price - p.purchase_price) >= 0 ? 'text-emerald-600' : 'text-[#C9384C]'}`}>
                          {formatCurrency((p.sale_price - p.purchase_price) * p.quantity)}
                        </td>
                      </tr>
                    ))}
                    {parts.length === 0 && (
                      <tr><td colSpan={7} className="text-center py-6 text-[#8fa0b5]">Nincs alkatrész</td></tr>
                    )}
                  </tbody>
                  {parts.length > 0 && (
                    <tfoot>
                      <tr className="border-t-2 border-[rgba(11,30,61,0.12)] font-bold">
                        <td colSpan={4} className="px-3 py-2 text-[#0B1E3D]">Összesen</td>
                        <td className="px-3 py-2">{formatCurrency(totalPartsCost)}</td>
                        <td className="px-3 py-2">{formatCurrency(totalSalePrice)}</td>
                        <td className={`px-3 py-2 ${totalMargin >= 0 ? 'text-emerald-600' : 'text-[#C9384C]'}`}>{formatCurrency(totalMargin)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {!newPartForm.open ? (
                <button onClick={() => setNewPartForm(f => ({ ...f, open: true }))}
                  className="flex items-center gap-2 text-[13px] text-[#C9A84C] font-semibold hover:text-[#0B1E3D]">
                  <Plus size={16} /> Alkatrész hozzáadása
                </button>
              ) : (
                <div className="bg-[#F4F5F7] rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormGroup>
                      <FormLabel>Név *</FormLabel>
                      <Input value={newPartForm.name} onChange={e => setNewPartForm(f => ({ ...f, name: e.target.value }))} placeholder="Alkatrész neve..." />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>Cikkszám</FormLabel>
                      <Input value={newPartForm.article_number} onChange={e => setNewPartForm(f => ({ ...f, article_number: e.target.value }))} />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>Gyártó</FormLabel>
                      <Input value={newPartForm.manufacturer} onChange={e => setNewPartForm(f => ({ ...f, manufacturer: e.target.value }))} />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>Mennyiség</FormLabel>
                      <Input type="number" value={newPartForm.quantity} onChange={e => setNewPartForm(f => ({ ...f, quantity: e.target.value }))} />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>Beszerzési ár (CHF)</FormLabel>
                      <Input type="number" step="0.01" value={newPartForm.purchase_price} onChange={e => setNewPartForm(f => ({ ...f, purchase_price: e.target.value }))} />
                    </FormGroup>
                    <FormGroup>
                      <FormLabel>Eladási ár (CHF)</FormLabel>
                      <Input type="number" step="0.01" value={newPartForm.sale_price} onChange={e => setNewPartForm(f => ({ ...f, sale_price: e.target.value }))} />
                    </FormGroup>
                    <FormGroup className="col-span-2">
                      <FormLabel>Megjegyzés</FormLabel>
                      <Input value={newPartForm.notes} onChange={e => setNewPartForm(f => ({ ...f, notes: e.target.value }))} />
                    </FormGroup>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button variant="primary" onClick={addPart}>Hozzáadás</Button>
                    <Button variant="secondary" onClick={() => setNewPartForm({ open: false, name: '', article_number: '', manufacturer: '', purchase_price: '', sale_price: '', quantity: '1', notes: '' })}>Mégse</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'photos' && (
            <div className="space-y-4">
              {photos.length > 0 && (profile.role === 'admin' || profile.role === 'super_admin') && (
                <div className="flex justify-end">
                  <button
                    onClick={() => photos.forEach((p, i) => {
                      setTimeout(() => {
                        const a = document.createElement('a')
                        a.href = p.url
                        a.download = `${wo?.order_number || 'foto'}_${p.category}_${new Date(p.created_at).toISOString().slice(0,10)}.jpg`
                        a.click()
                      }, i * 150)
                    })}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-[#C9A84C] text-[#C9A84C] text-[12px] font-semibold rounded-lg hover:bg-amber-50">
                    <Download size={13} /> Összes letöltése ({photos.length})
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {photos.map(photo => (
                  <div key={photo.id} className="rounded-lg overflow-hidden border border-[rgba(11,30,61,0.08)] bg-white group">
                    <div className="relative">
                      <img src={photo.url} alt={photo.caption || 'Photo'} className="w-full h-32 object-cover" />
                      {(profile.role === 'admin' || profile.role === 'super_admin') && (
                        <button
                          onClick={() => {
                            const a = document.createElement('a')
                            a.href = photo.url
                            a.download = `${wo?.order_number || 'foto'}_${photo.category}_${new Date(photo.created_at).toISOString().slice(0,10)}.jpg`
                            a.click()
                          }}
                          className="absolute bottom-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Letöltés">
                          <Download size={12} />
                        </button>
                      )}
                    </div>
                    <div className="px-2 py-1.5">
                      <span className="text-[10px] font-semibold text-[#5a6a80] uppercase">{photo.category}</span>
                      <div className="text-[10px] text-[#8fa0b5]">{photo.uploaded_by} · {formatTime(photo.created_at)}</div>
                    </div>
                  </div>
                ))}
                {photos.length === 0 && <div className="col-span-4 text-center py-10 text-[#8fa0b5] text-sm">Nincs fotó</div>}
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) uploadPhoto(file)
                }} />
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 text-[13px] text-[#C9A84C] font-semibold hover:text-[#0B1E3D]">
                  <Camera size={16} /> Fotó feltöltése
                </button>
              </div>
            </div>
          )}

          {tab === 'notes' && (
            <div className="space-y-5 max-w-2xl">
              <FormGroup>
                <FormLabel>Belső megjegyzés (csak Barbara/Karl látja)</FormLabel>
                <Textarea
                  value={notes.internal}
                  onChange={e => setNotes(n => ({ ...n, internal: e.target.value }))}
                  placeholder="Belső feljegyzések..."
                  className="min-h-[120px]"
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>Ügyfélnek látható megjegyzés</FormLabel>
                <Textarea
                  value={notes.customer}
                  onChange={e => setNotes(n => ({ ...n, customer: e.target.value }))}
                  placeholder="Ügyfélnek szóló megjegyzés..."
                  className="min-h-[120px]"
                />
              </FormGroup>
              <Button variant="primary" onClick={saveNotes} disabled={notesSaving}>
                {notesSaving ? 'Mentés...' : 'Mentés'}
              </Button>
            </div>
          )}

        </div>
      </div>

      {/* Edit modal */}
      {editModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center sm:p-4" onClick={() => setEditModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-[#0B1E3D] text-base">✏️ Munkalap szerkesztése – {wo?.order_number || ''}</h2>
              <button onClick={() => setEditModal(false)} className="p-1 text-[#5a6a80] hover:text-[#0B1E3D]"><X size={18} /></button>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormGroup>
                  <FormLabel>Ügyfél *</FormLabel>
                  <Select value={editForm.customer_id || ''} onChange={e => setEditForm((f: any) => ({ ...f, customer_id: e.target.value, vehicle_id: '' }))}>
                    <option value="">Válassz...</option>
                    {editCustomers.map((c: any) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </Select>
                </FormGroup>
                <FormGroup>
                  <FormLabel>Jármű *</FormLabel>
                  <Select value={editForm.vehicle_id || ''} onChange={e => setEditForm((f: any) => ({ ...f, vehicle_id: e.target.value }))}>
                    <option value="">Válassz...</option>
                    {editVehicles.filter((v: any) => !editForm.customer_id || v.customer_id === editForm.customer_id).map((v: any) => (
                      <option key={v.id} value={v.id}>{v.make} {v.model} – {v.license_plate}</option>
                    ))}
                  </Select>
                </FormGroup>
                <FormGroup>
                  <FormLabel>Státusz</FormLabel>
                  <Select value={editForm.status || ''} onChange={e => setEditForm((f: any) => ({ ...f, status: e.target.value }))}>
                    {['new_booking','confirmed','checked_in','diagnostics','waiting_quote','waiting_approval','waiting_parts','in_repair','quality_check','ready','checkout_ready','delivered','closed'].map(s => (
                      <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                    ))}
                  </Select>
                </FormGroup>
                <FormGroup>
                  <FormLabel>Szerelő</FormLabel>
                  <Select value={editForm.mechanic_id || ''} onChange={e => setEditForm((f: any) => ({ ...f, mechanic_id: e.target.value }))}>
                    <option value="">Nincs hozzárendelve</option>
                    {editMechanics.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </Select>
                </FormGroup>
                <FormGroup>
                  <FormLabel>Dátum</FormLabel>
                  <Input type="date" value={editForm.scheduled_date || ''} onChange={e => setEditForm((f: any) => ({ ...f, scheduled_date: e.target.value }))} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Időpont</FormLabel>
                  <Input type="time" value={editForm.scheduled_time || ''} onChange={e => setEditForm((f: any) => ({ ...f, scheduled_time: e.target.value }))} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Mobil szolgáltatás</FormLabel>
                  <Select value={editForm.is_mobile ? 'yes' : 'no'} onChange={e => setEditForm((f: any) => ({ ...f, is_mobile: e.target.value === 'yes' }))}>
                    <option value="no">Nem</option>
                    <option value="yes">Igen</option>
                  </Select>
                </FormGroup>
                {editForm.is_mobile && (
                  <FormGroup>
                    <FormLabel>Mobil cím</FormLabel>
                    <Input value={editForm.mobile_address || ''} onChange={e => setEditForm((f: any) => ({ ...f, mobile_address: e.target.value }))} placeholder="Ügyfél címe..." />
                  </FormGroup>
                )}
                <FormGroup className="col-span-2">
                  <FormLabel>Hibaleírás</FormLabel>
                  <Textarea value={editForm.fault_description || ''} onChange={e => setEditForm((f: any) => ({ ...f, fault_description: e.target.value }))} placeholder="Mit jelzett az ügyfél?" />
                </FormGroup>
                <FormGroup className="col-span-2">
                  <FormLabel>Elvégzendő munka</FormLabel>
                  <Textarea value={editForm.work_to_do || ''} onChange={e => setEditForm((f: any) => ({ ...f, work_to_do: e.target.value }))} placeholder="Tervezett munkák..." />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Alkatrész (CHF)</FormLabel>
                  <Input type="number" step="0.01" value={editForm.parts_cost || ''} onChange={e => setEditForm((f: any) => ({ ...f, parts_cost: e.target.value }))} placeholder="0.00" />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Munkadíj (CHF)</FormLabel>
                  <Input type="number" step="0.01" value={editForm.labor_cost || ''} onChange={e => setEditForm((f: any) => ({ ...f, labor_cost: e.target.value }))} placeholder="0.00" />
                </FormGroup>
                <FormGroup className="col-span-2">
                  <FormLabel>Belső megjegyzés</FormLabel>
                  <Textarea value={editForm.internal_notes || ''} onChange={e => setEditForm((f: any) => ({ ...f, internal_notes: e.target.value }))} />
                </FormGroup>
                <FormGroup className="col-span-2">
                  <FormLabel>Ügyfélnek látható megjegyzés</FormLabel>
                  <Textarea value={editForm.customer_notes || ''} onChange={e => setEditForm((f: any) => ({ ...f, customer_notes: e.target.value }))} />
                </FormGroup>
              </div>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <Button variant="secondary" onClick={() => setEditModal(false)} className="flex-1">Mégse</Button>
              <Button variant="primary" onClick={saveEdit} className="flex-1">Frissítés</Button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
