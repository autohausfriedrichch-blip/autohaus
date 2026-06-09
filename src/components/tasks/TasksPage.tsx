'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Plus, Check, Clock, User, FileText, Trash2, RefreshCw, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { formatDate } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

const TASK_TYPES: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  workorder:   { label: 'Munkalap',   icon: '🔧', color: 'text-blue-700',   bg: 'bg-blue-50'   },
  general:     { label: 'Általános',  icon: '📋', color: 'text-gray-700',   bg: 'bg-gray-50'   },
  daily:       { label: 'Napi rutin', icon: '☀️', color: 'text-amber-700',  bg: 'bg-amber-50'  },
  weekly:      { label: 'Heti',       icon: '📅', color: 'text-purple-700', bg: 'bg-purple-50' },
  monthly:     { label: 'Havi',       icon: '📆', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  procurement: { label: 'Beszerzés',  icon: '🛒', color: 'text-orange-700', bg: 'bg-orange-50' },
  qc:          { label: 'QC',         icon: '✅', color: 'text-green-700',  bg: 'bg-green-50'  },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; border: string; dot: string }> = {
  low:    { label: 'Alacsony', color: 'text-gray-500',  border: 'border-gray-300',  dot: 'bg-gray-400'   },
  normal: { label: 'Normál',   color: 'text-blue-600',  border: 'border-blue-300',  dot: 'bg-blue-500'   },
  high:   { label: 'Magas',    color: 'text-amber-600', border: 'border-amber-400', dot: 'bg-amber-500'  },
  urgent: { label: 'Sürgős',   color: 'text-red-600',   border: 'border-red-500',   dot: 'bg-red-500'    },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open:        { label: 'Nyitott',     color: 'bg-blue-100 text-blue-800'   },
  in_progress: { label: 'Folyamatban', color: 'bg-amber-100 text-amber-800' },
  waiting:     { label: 'Várakozik',   color: 'bg-gray-100 text-gray-700'   },
  problem:     { label: 'Probléma',    color: 'bg-red-100 text-red-700'     },
  done:        { label: 'Kész',        color: 'bg-green-100 text-green-800' },
  cancelled:   { label: 'Törölve',     color: 'bg-gray-100 text-gray-500'   },
  closed:      { label: 'Lezárva',     color: 'bg-gray-200 text-gray-600'   },
}

const RECURRENCE_LABELS: Record<string, string> = {
  none:     'Nincs (egyszeri)',
  daily:    'Naponta',
  weekdays: 'Hétköznaponta',
  weekly:   'Hetente',
  monthly:  'Havonta',
}

const WEEKDAYS = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V']
const WEEKDAY_FULL = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap']

// ─── Filter tabs ─────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'mine' | 'karl' | 'barbara' | 'open' | 'in_progress' | 'done' | 'overdue' |
  'workorder' | 'general' | 'daily' | 'weekly' | 'monthly' | 'procurement' | 'qc' | 'problem'

const FILTER_GROUPS = [
  {
    label: 'Státusz',
    filters: [
      { key: 'all',         label: 'Összes'       },
      { key: 'open',        label: 'Nyitott'      },
      { key: 'in_progress', label: 'Folyamatban'  },
      { key: 'waiting',     label: 'Várakozik'    },
      { key: 'problem',     label: 'Probléma'     },
      { key: 'done',        label: 'Kész'         },
      { key: 'overdue',     label: 'Lejárt'       },
    ],
  },
  {
    label: 'Típus',
    filters: [
      { key: 'workorder',   label: '🔧 Munkalap'   },
      { key: 'general',     label: '📋 Általános'  },
      { key: 'daily',       label: '☀️ Napi rutin' },
      { key: 'weekly',      label: '📅 Heti'       },
      { key: 'monthly',     label: '📆 Havi'       },
      { key: 'procurement', label: '🛒 Beszerzés'  },
      { key: 'qc',          label: '✅ QC'         },
    ],
  },
]

// ─── Default form ─────────────────────────────────────────────────────────────

const DEFAULT_FORM = {
  title: '', description: '', task_type: 'general', priority: 'normal',
  status: 'open', due_date: '', assigned_to: '', customer_id: '',
  work_order_id: '', recurrence_type: 'none', recurrence_days: [] as number[],
  waiting_reason: '',
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TasksPage({ refreshKey, onRefresh, profile }: {
  refreshKey: number; onRefresh: () => void; profile?: any
}) {
  const [tasks, setTasks] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterKey, setFilterKey] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [tableExists, setTableExists] = useState(true)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const today = new Date().toISOString().split('T')[0]

  // ─── Load ───────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: t, error }, { data: p }, { data: c }, { data: wo }] = await Promise.all([
      supabase.from('tasks')
        .select('*, assignee:profiles!tasks_assigned_to_fkey(id,full_name,role), customer:customers(full_name), work_order:work_orders(order_number,customer_id)')
        .eq('is_template', false)
        .order('priority', { ascending: false })
        .order('due_date', { ascending: true, nullsFirst: false }),
      supabase.from('profiles').select('id,full_name,role').order('full_name'),
      supabase.from('customers').select('id,full_name').order('full_name'),
      supabase.from('work_orders').select('id,order_number,customer_id').not('status','in','(delivered,closed)'),
    ])
    if (error?.code === '42P01') { setTableExists(false); setLoading(false); return }
    setTasks(t || [])
    setProfiles(p || [])
    setCustomers(c || [])
    setWorkOrders(wo || [])
    setLoading(false)

    // Spawn any due recurring tasks
    if (t) spawnRecurring(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  // ─── Recurring task spawning ─────────────────────────────────────────────

  const spawnRecurring = async (allTasks: any[]) => {
    const templates = allTasks.filter(t => t.recurrence_type && t.recurrence_type !== 'none')
    const todayDate = new Date()
    const dow = (todayDate.getDay() + 6) % 7 // 0=Mon..6=Sun
    const dom = todayDate.getDate()

    for (const tmpl of templates) {
      if (tmpl.last_generated_date === today) continue
      let shouldGenerate = false
      if (tmpl.recurrence_type === 'daily') shouldGenerate = true
      if (tmpl.recurrence_type === 'weekdays') shouldGenerate = dow <= 4
      if (tmpl.recurrence_type === 'weekly') {
        const days: number[] = tmpl.recurrence_days || []
        shouldGenerate = days.includes(dow)
      }
      if (tmpl.recurrence_type === 'monthly') {
        const days: number[] = tmpl.recurrence_days || []
        shouldGenerate = days.includes(dom)
      }

      if (!shouldGenerate) continue

      // Check if already spawned today
      const { count } = await supabase.from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('parent_task_id', tmpl.id)
        .eq('due_date', today)
      if ((count || 0) > 0) continue

      // Spawn
      await supabase.from('tasks').insert({
        title: tmpl.title,
        description: tmpl.description,
        task_type: tmpl.task_type,
        priority: tmpl.priority,
        status: 'open',
        due_date: today,
        assigned_to: tmpl.assigned_to || null,
        parent_task_id: tmpl.id,
        recurrence_type: 'none',
      })
      await supabase.from('tasks').update({ last_generated_date: today }).eq('id', tmpl.id)
    }
  }

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const activeTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.status !== 'closed')

  const stats = {
    today:      tasks.filter(t => t.due_date === today && t.status !== 'done').length,
    urgent:     activeTasks.filter(t => t.priority === 'urgent').length,
    overdue:    tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done').length,
    workorder:  activeTasks.filter(t => t.task_type === 'workorder').length,
    general:    activeTasks.filter(t => t.task_type === 'general').length,
    problem:    activeTasks.filter(t => t.status === 'problem').length,
    open:       activeTasks.filter(t => t.status === 'open').length,
    in_progress: activeTasks.filter(t => t.status === 'in_progress').length,
    done_today: tasks.filter(t => t.completed_at?.startsWith(today)).length,
  }

  // ─── Filter ──────────────────────────────────────────────────────────────────

  const filtered = tasks.filter(t => {
    if (t.is_template) return false
    const s = search.toLowerCase()
    if (s && !(t.title || '').toLowerCase().includes(s) &&
        !(t.customer?.full_name || '').toLowerCase().includes(s) &&
        !(t.work_order?.order_number || '').toLowerCase().includes(s)) return false

    switch (filterKey) {
      case 'all': return true
      case 'overdue': return t.due_date && t.due_date < today && t.status !== 'done'
      case 'mine': return t.assigned_to === profile?.id
      case 'problem': return t.status === 'problem'
      case 'done': return t.status === 'done'
      case 'open': return t.status === 'open'
      case 'in_progress': return t.status === 'in_progress'
      case 'waiting': return t.status === 'waiting'
      case 'workorder':
      case 'general':
      case 'daily':
      case 'weekly':
      case 'monthly':
      case 'procurement':
      case 'qc':
        return t.task_type === filterKey
      default: {
        // person filter: match by name
        const assigneeName = (t.assignee?.full_name || '').toLowerCase()
        return assigneeName.includes(filterKey.toLowerCase())
      }
    }
  })

  // ─── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title?.trim()) { toast('A feladat neve kötelező', 'error'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = {
      title: form.title.trim(),
      description: form.description || null,
      task_type: form.task_type || 'general',
      priority: form.priority || 'normal',
      status: form.status || 'open',
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
      customer_id: form.customer_id || null,
      work_order_id: form.work_order_id || null,
      recurrence_type: form.recurrence_type || 'none',
      recurrence_days: form.recurrence_days?.length ? form.recurrence_days : null,
      waiting_reason: form.waiting_reason || null,
      created_by: user?.id,
      is_template: false,
    }
    if (form.status === 'done' && editItem?.status !== 'done') {
      payload.completed_at = new Date().toISOString()
    }
    const { error } = editItem
      ? await supabase.from('tasks').update(payload).eq('id', editItem.id)
      : await supabase.from('tasks').insert(payload)
    if (error) { toast('Hiba: ' + error.message, 'error') }
    else { toast(editItem ? 'Feladat frissítve' : 'Feladat létrehozva'); setModalOpen(false); load(); onRefresh() }
    setSaving(false)
  }

  const markDone = async (id: string) => {
    await supabase.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id)
    toast('Feladat lezárva ✓')
    load(); onRefresh()
  }

  const markStatus = async (id: string, status: string) => {
    await supabase.from('tasks').update({ status }).eq('id', id)
    load()
  }

  const deleteTask = async (id: string) => {
    if (!confirm('Törlés?')) return
    await supabase.from('tasks').delete().eq('id', id)
    toast('Feladat törölve'); load()
  }

  const openCreate = (defaults?: Partial<typeof DEFAULT_FORM>) => {
    setEditItem(null)
    setForm({ ...DEFAULT_FORM, ...defaults })
    setModalOpen(true)
  }

  const openEdit = (t: any) => {
    setEditItem(t)
    setForm({
      title: t.title, description: t.description || '', task_type: t.task_type || 'general',
      priority: t.priority, status: t.status, due_date: t.due_date || '',
      assigned_to: t.assigned_to || '', customer_id: t.customer_id || '',
      work_order_id: t.work_order_id || '', recurrence_type: t.recurrence_type || 'none',
      recurrence_days: t.recurrence_days || [], waiting_reason: t.waiting_reason || '',
    })
    setModalOpen(true)
  }

  const toggleRecDay = (day: number) => {
    setForm((f: any) => ({
      ...f,
      recurrence_days: f.recurrence_days?.includes(day)
        ? f.recurrence_days.filter((d: number) => d !== day)
        : [...(f.recurrence_days || []), day],
    }))
  }

  if (!tableExists) return (
    <div className="animate-fade-in">
      <div className="p-8 text-center bg-white rounded-xl shadow-sm">
        <p className="text-[13px] text-[#5a6a80]">Futtasd le a <code className="bg-gray-100 px-1 rounded">supabase/schema_phase3.sql</code> fájlt a Supabase SQL Editorban.</p>
      </div>
    </div>
  )

  // ─── Render ──────────────────────────────────────────────────────────────────

  const filteredWO = form.customer_id ? workOrders.filter(wo => wo.customer_id === form.customer_id) : workOrders

  const PERSON_FILTERS = profiles
    .filter(p => p.role === 'mechanic' || p.role === 'admin' || p.role === 'super_admin')
    .map(p => ({ key: p.full_name.split(' ')[0].toLowerCase(), label: p.full_name.split(' ')[0] }))

  return (
    <div className="animate-fade-in space-y-4">

      {/* ── Stats dashboard ── */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {[
          { label: 'Mai feladat',   value: stats.today,       color: 'text-[#185FA5]', bg: 'bg-blue-50',   filter: 'all'         },
          { label: 'Sürgős',        value: stats.urgent,      color: 'text-red-600',   bg: 'bg-red-50',    filter: 'open'        },
          { label: 'Lejárt',        value: stats.overdue,     color: 'text-red-600',   bg: 'bg-red-50',    filter: 'overdue'     },
          { label: 'Probléma',      value: stats.problem,     color: 'text-red-600',   bg: 'bg-red-50',    filter: 'problem'     },
          { label: 'Ma kész',       value: stats.done_today,  color: 'text-green-600', bg: 'bg-green-50',  filter: 'done'        },
        ].map(s => (
          <button key={s.label} onClick={() => setFilterKey(s.filter)}
            className={`${s.bg} rounded-xl p-3 text-left hover:opacity-80 transition-opacity`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-[#5a6a80]">{s.label}</div>
          </button>
        ))}
      </div>

      {/* ── Type quick links ── */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {Object.entries(TASK_TYPES).map(([key, cfg]) => {
          const count = activeTasks.filter(t => t.task_type === key).length
          return (
            <button key={key} onClick={() => setFilterKey(key)}
              className={`${filterKey === key ? 'ring-2 ring-[#185FA5]' : ''} ${cfg.bg} rounded-lg p-2 text-center hover:opacity-80 transition-all`}>
              <div className="text-lg">{cfg.icon}</div>
              <div className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</div>
              {count > 0 && <div className="text-[11px] font-bold text-[#0B1E3D]">{count}</div>}
            </button>
          )
        })}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Keresés…"
            className="w-full text-[13px] border border-[rgba(11,30,61,0.15)] rounded-lg px-3 py-2 outline-none pl-8" />
          <span className="absolute left-2.5 top-2.5 text-[#8fa0b5] text-[12px]">🔍</span>
        </div>

        <button onClick={() => setShowFilterPanel(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-medium transition-colors ${showFilterPanel ? 'bg-[#185FA5] text-white border-[#185FA5]' : 'border-[rgba(11,30,61,0.15)] text-[#5a6a80] hover:border-[#185FA5]'}`}>
          <Filter size={13} /> Szűrők
        </button>

        <Button variant="primary" onClick={() => openCreate()}>
          <Plus size={14} /> Új feladat
        </Button>
      </div>

      {/* ── Filter panel ── */}
      {showFilterPanel && (
        <div className="bg-white border border-[rgba(11,30,61,0.1)] rounded-xl p-3 space-y-2">
          {FILTER_GROUPS.map(grp => (
            <div key={grp.label}>
              <div className="text-[10px] font-bold text-[#8fa0b5] uppercase mb-1.5">{grp.label}</div>
              <div className="flex flex-wrap gap-1.5">
                {grp.filters.map(f => (
                  <button key={f.key} onClick={() => setFilterKey(f.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${filterKey === f.key ? 'bg-[#185FA5] text-white border-[#185FA5]' : 'border-[rgba(11,30,61,0.15)] text-[#5a6a80] hover:border-[#185FA5]'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {PERSON_FILTERS.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#8fa0b5] uppercase mb-1.5">Felelős</div>
              <div className="flex flex-wrap gap-1.5">
                {PERSON_FILTERS.map(f => (
                  <button key={f.key} onClick={() => setFilterKey(f.key)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${filterKey === f.key ? 'bg-[#185FA5] text-white border-[#185FA5]' : 'border-[rgba(11,30,61,0.15)] text-[#5a6a80] hover:border-[#185FA5]'}`}>
                    👤 {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Active filter label ── */}
      {filterKey !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#5a6a80]">Szűrő: <strong>{filterKey}</strong></span>
          <button onClick={() => setFilterKey('all')} className="text-[11px] text-[#185FA5] hover:underline">× Törlés</button>
          <span className="text-[12px] text-[#8fa0b5]">({filtered.length} feladat)</span>
        </div>
      )}

      {/* ── Task list ── */}
      {loading ? (
        <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-[#8fa0b5] shadow-sm">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-[13px]">Nincs feladat ebben a nézetben</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal
            const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.open
            const tt = TASK_TYPES[task.task_type] || TASK_TYPES.general
            const isOverdue = task.due_date && task.due_date < today && task.status !== 'done'
            const expanded = expandedId === task.id

            return (
              <div key={task.id} className={`bg-white rounded-xl border-l-4 ${pri.border} shadow-sm overflow-hidden`}>
                {/* Main row */}
                <div className="flex items-start gap-3 p-3">
                  {/* Status toggle */}
                  <button
                    onClick={() => task.status === 'done' ? markStatus(task.id, 'open') : markDone(task.id)}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-500'}`}>
                    {task.status === 'done' && <Check size={10} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    {/* Title row */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className={`font-semibold text-[13px] ${task.status === 'done' ? 'text-[#8fa0b5] line-through' : 'text-[#0B1E3D]'}`}>
                        {tt.icon} {task.title}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tt.bg} ${tt.color}`}>{tt.label}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${pri.color}`}>{pri.label}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      {task.recurrence_type && task.recurrence_type !== 'none' && (
                        <span className="text-[9px] text-purple-600 flex items-center gap-0.5"><RefreshCw size={8} /> {RECURRENCE_LABELS[task.recurrence_type]}</span>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-[#8fa0b5]">
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <User size={10} />
                          <span className="font-medium text-[#5a6a80]">{task.assignee.full_name}</span>
                        </span>
                      )}
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                          <Clock size={10} /> {formatDate(task.due_date)}{isOverdue ? ' ⚠️' : ''}
                        </span>
                      )}
                      {task.customer && <span className="text-[#5a6a80]">👤 {task.customer.full_name}</span>}
                      {task.work_order && (
                        <span className="flex items-center gap-1 text-[#185FA5]">
                          <FileText size={10} /> {task.work_order.order_number}
                        </span>
                      )}
                      {task.waiting_reason && task.status === 'waiting' && (
                        <span className="text-amber-600 italic">⏳ {task.waiting_reason}</span>
                      )}
                    </div>

                    {/* Description preview */}
                    {task.description && !expanded && (
                      <p className="text-[11px] text-[#8fa0b5] mt-0.5 line-clamp-1">{task.description}</p>
                    )}
                    {task.description && expanded && (
                      <p className="text-[12px] text-[#5a6a80] mt-1 whitespace-pre-line">{task.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {task.status !== 'done' && task.status !== 'in_progress' && (
                      <button onClick={() => markStatus(task.id, 'in_progress')}
                        title="Folyamatban"
                        className="p-1.5 text-amber-500 hover:bg-amber-50 rounded text-[10px] font-bold">▶</button>
                    )}
                    {task.status === 'in_progress' && (
                      <button onClick={() => markStatus(task.id, 'waiting')}
                        title="Várakozik"
                        className="p-1.5 text-gray-500 hover:bg-gray-50 rounded text-[10px] font-bold">⏸</button>
                    )}
                    <button onClick={() => setExpandedId(expanded ? null : task.id)}
                      className="p-1.5 text-[#8fa0b5] hover:text-[#0B1E3D] rounded">
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button onClick={() => openEdit(task)} className="p-1.5 text-[#8fa0b5] hover:text-[#185FA5] rounded">
                      <FileText size={13} />
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="p-1.5 text-[#8fa0b5] hover:text-red-500 rounded">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded quick-status bar */}
                {expanded && (
                  <div className="border-t border-[rgba(11,30,61,0.06)] px-3 py-2 bg-[#F8F9FB] flex gap-2 flex-wrap">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <button key={key} onClick={() => markStatus(task.id, key)}
                        className={`text-[10px] px-2 py-1 rounded-full font-medium border transition-colors ${task.status === key ? 'border-[#185FA5] text-[#185FA5] bg-blue-50' : 'border-transparent text-[#5a6a80] hover:border-[rgba(11,30,61,0.2)]'}`}>
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Recurring templates section ── */}
      <RecurringTemplates
        supabase={supabase}
        profiles={profiles}
        onOpenCreate={(tmpl) => openCreate({ ...tmpl, recurrence_type: tmpl.recurrence_type || 'daily' })}
      />

      {/* ── Create / Edit modal ── */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? 'Feladat szerkesztése' : 'Új feladat'}
        className="max-w-lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Mentés...' : editItem ? 'Frissítés' : 'Létrehozás'}
            </Button>
          </>
        }>
        <div className="space-y-3">
          {/* Type selector */}
          <div>
            <FormLabel>Feladat típusa</FormLabel>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {Object.entries(TASK_TYPES).map(([key, cfg]) => (
                <button key={key} type="button"
                  onClick={() => setForm((f: any) => ({ ...f, task_type: key }))}
                  className={`flex flex-col items-center p-2 rounded-lg border text-center transition-colors ${form.task_type === key ? 'border-[#185FA5] bg-blue-50' : 'border-[rgba(11,30,61,0.12)] hover:border-[#185FA5]'}`}>
                  <span className="text-base">{cfg.icon}</span>
                  <span className={`text-[9px] font-semibold mt-0.5 ${cfg.color}`}>{cfg.label}</span>
                </button>
              ))}
            </div>
          </div>

          <FormGroup>
            <FormLabel>Feladat neve *</FormLabel>
            <Input value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="pl. Motorolaj csere" />
          </FormGroup>

          <FormGroup>
            <FormLabel>Leírás</FormLabel>
            <Textarea value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} />
          </FormGroup>

          <div className="grid grid-cols-2 gap-3">
            <FormGroup>
              <FormLabel>Prioritás</FormLabel>
              <Select value={form.priority} onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value }))}>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </FormGroup>
            <FormGroup>
              <FormLabel>Státusz</FormLabel>
              <Select value={form.status} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </Select>
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormGroup>
              <FormLabel>Határidő</FormLabel>
              <Input type="date" value={form.due_date} onChange={e => setForm((f: any) => ({ ...f, due_date: e.target.value }))} />
            </FormGroup>
            <FormGroup>
              <FormLabel>Felelős</FormLabel>
              <Select value={form.assigned_to} onChange={e => setForm((f: any) => ({ ...f, assigned_to: e.target.value }))}>
                <option value="">– Nincs –</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </Select>
            </FormGroup>
          </div>

          {/* Recurrence */}
          <div>
            <FormLabel>Ismétlődés</FormLabel>
            <Select value={form.recurrence_type} onChange={e => setForm((f: any) => ({ ...f, recurrence_type: e.target.value, recurrence_days: [] }))} className="mt-1">
              {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>

          {(form.recurrence_type === 'weekly') && (
            <div>
              <FormLabel>Melyik napokon?</FormLabel>
              <div className="flex gap-1.5 mt-1">
                {WEEKDAYS.map((d, i) => (
                  <button key={i} type="button"
                    onClick={() => toggleRecDay(i)}
                    className={`w-8 h-8 rounded-full text-[11px] font-semibold border transition-colors ${form.recurrence_days?.includes(i) ? 'bg-[#185FA5] text-white border-[#185FA5]' : 'border-gray-300 text-[#5a6a80] hover:border-[#185FA5]'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.recurrence_type === 'monthly' && (
            <FormGroup>
              <FormLabel>A hónap hányadik napján? (pl. 1)</FormLabel>
              <Input type="number" min={1} max={31}
                value={form.recurrence_days?.[0] || ''}
                onChange={e => setForm((f: any) => ({ ...f, recurrence_days: [parseInt(e.target.value)] }))} />
            </FormGroup>
          )}

          {/* Optional links */}
          {form.task_type !== 'workorder' && (
            <div className="grid grid-cols-2 gap-3">
              <FormGroup>
                <FormLabel>Ügyfél (opcionális)</FormLabel>
                <Select value={form.customer_id} onChange={e => setForm((f: any) => ({ ...f, customer_id: e.target.value, work_order_id: '' }))}>
                  <option value="">– Nincs –</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </Select>
              </FormGroup>
              <FormGroup>
                <FormLabel>Munkalap (opcionális)</FormLabel>
                <Select value={form.work_order_id} onChange={e => setForm((f: any) => ({ ...f, work_order_id: e.target.value }))}>
                  <option value="">– Nincs –</option>
                  {filteredWO.map(w => <option key={w.id} value={w.id}>{w.order_number}</option>)}
                </Select>
              </FormGroup>
            </div>
          )}

          {form.status === 'waiting' && (
            <FormGroup>
              <FormLabel>Várakozás oka</FormLabel>
              <Input value={form.waiting_reason} onChange={e => setForm((f: any) => ({ ...f, waiting_reason: e.target.value }))} placeholder="pl. Alkatrész rendelés alatt" />
            </FormGroup>
          )}
        </div>
      </Modal>
    </div>
  )
}

// ─── Recurring templates sub-component ───────────────────────────────────────

function RecurringTemplates({ supabase, profiles, onOpenCreate }: {
  supabase: any; profiles: any[]; onOpenCreate: (defaults: any) => void
}) {
  const [templates, setTemplates] = useState<any[]>([])
  const [open, setOpen] = useState(false)

  useEffect(() => {
    supabase.from('tasks').select('*').eq('is_template', true).order('task_type').then(({ data }: any) => {
      if (data) setTemplates(data)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (templates.length === 0) return null

  return (
    <div className="border border-[rgba(11,30,61,0.1)] rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F8F9FB] hover:bg-[#F0F2F5] transition-colors">
        <span className="text-[12px] font-semibold text-[#5a6a80]">🔄 Ismétlődő sablonok ({templates.length})</span>
        {open ? <ChevronUp size={14} className="text-[#8fa0b5]" /> : <ChevronDown size={14} className="text-[#8fa0b5]" />}
      </button>
      {open && (
        <div className="divide-y divide-[rgba(11,30,61,0.06)]">
          {templates.map(tmpl => {
            const tt = TASK_TYPES[tmpl.task_type] || TASK_TYPES.general
            return (
              <div key={tmpl.id} className="flex items-center gap-3 px-4 py-2.5 bg-white">
                <span className="text-base">{tt.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-medium text-[#0B1E3D]">{tmpl.title}</div>
                  <div className="text-[10px] text-[#8fa0b5]">{RECURRENCE_LABELS[tmpl.recurrence_type] || '–'}</div>
                </div>
                <button onClick={() => onOpenCreate({ title: tmpl.title, description: tmpl.description, task_type: tmpl.task_type, priority: tmpl.priority, recurrence_type: tmpl.recurrence_type, recurrence_days: tmpl.recurrence_days })}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-[rgba(11,30,61,0.15)] text-[#5a6a80] hover:border-[#185FA5] hover:text-[#185FA5] transition-colors">
                  Használat
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
