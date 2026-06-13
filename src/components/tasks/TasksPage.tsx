'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Plus, Check, Clock, User, FileText, Trash2, RefreshCw, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const TASK_TYPES: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  workorder:   { label: 'Munkalap',   icon: '🔧', color: 'text-blue-700',   bg: 'bg-blue-50'   },
  general:     { label: 'Általános',  icon: '📋', color: 'text-gray-700',   bg: 'bg-gray-50'   },
  daily:       { label: 'Napi rutin', icon: '☀️', color: 'text-amber-700',  bg: 'bg-amber-50'  },
  weekly:      { label: 'Heti',       icon: '📅', color: 'text-purple-700', bg: 'bg-purple-50' },
  monthly:     { label: 'Havi',       icon: '📆', color: 'text-indigo-700', bg: 'bg-indigo-50' },
  procurement: { label: 'Beszerzés',  icon: '🛒', color: 'text-orange-700', bg: 'bg-orange-50' },
  qc:          { label: 'QC',         icon: '✅', color: 'text-green-700',  bg: 'bg-green-50'  },
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  low:    { label: 'Alacsony', color: 'text-gray-500',  border: 'border-gray-300'  },
  normal: { label: 'Normál',   color: 'text-blue-600',  border: 'border-blue-300'  },
  high:   { label: 'Magas',    color: 'text-amber-600', border: 'border-amber-400' },
  urgent: { label: 'Sürgős',   color: 'text-red-600',   border: 'border-red-500'   },
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

const DEFAULT_FORM = {
  title: '', description: '', task_type: 'general', priority: 'normal',
  status: 'open', due_date: '', assigned_to: '', customer_id: '',
  work_order_id: '', recurrence_type: 'none', recurrence_days: [] as number[],
  waiting_reason: '',
}

export function TasksPage({ refreshKey, onRefresh, profile }: {
  refreshKey: number; onRefresh: () => void; profile?: any
}) {
  const [tasks, setTasks] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterKey, setFilterKey] = useState('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>(DEFAULT_FORM)
  const [saving, setSaving] = useState(false)
  const [tableExists, setTableExists] = useState(true)
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [woTasks, setWoTasks] = useState<any[]>([])
  const { toast } = useToast()
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    setLoading(true)
    const isMechanic = profile?.role === 'mechanic'
    let woTaskQuery = supabase
      .from('work_order_tasks')
      .select('*, work_order:work_orders(id,order_number,customer_id,mechanic_id,customer:customers(full_name),vehicle:vehicles(make,model,license_plate))')
      .not('status', 'in', '(done,cancelled)')
      .order('sort_order', { ascending: true })
    if (isMechanic && profile?.id) {
      woTaskQuery = woTaskQuery.eq('work_order.mechanic_id', profile.id)
    }
    const [{ data: t, error }, { data: p }, { data: c }, { data: wo }, { data: wot }] = await Promise.all([
      supabase.from('tasks')
        .select('*, customer:customers(full_name), work_order:work_orders(order_number,customer_id)')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name,role').order('full_name'),
      supabase.from('customers').select('id,full_name').order('full_name'),
      supabase.from('work_orders').select('id,order_number,customer_id').not('status','in','(delivered,closed)'),
      woTaskQuery,
    ])
    if (error?.code === '42P01') { setTableExists(false); setLoading(false); return }
    const nonTemplates = (t || []).filter((task: any) => !task.is_template)
    setTasks(nonTemplates)
    setWoTasks((wot || []).filter((t: any) => t.work_order !== null))
    setProfiles(p || [])
    setCustomers(c || [])
    setWorkOrders(wo || [])
    setLoading(false)
  }, [refreshKey, profile?.id, profile?.role])

  useEffect(() => { load() }, [load])

  // Resolve assigned_to UUID to profile name
  const getAssigneeName = (task: any) => {
    if (!task.assigned_to) return null
    const p = profiles.find(p => p.id === task.assigned_to)
    return p?.full_name || null
  }

  const isMechanic = profile?.role === 'mechanic'
  const visibleTasks = isMechanic ? tasks.filter(t => t.assigned_to === profile?.id) : tasks
  const activeTasks = visibleTasks.filter(t => t.status !== 'done' && t.status !== 'cancelled' && t.status !== 'closed')

  const stats = {
    today:       visibleTasks.filter(t => t.due_date === today && t.status !== 'done').length,
    urgent:      activeTasks.filter(t => t.priority === 'urgent').length,
    overdue:     visibleTasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done').length,
    problem:     activeTasks.filter(t => t.status === 'problem').length,
    done_today:  visibleTasks.filter(t => t.completed_at?.startsWith(today)).length,
  }

  const filtered = visibleTasks.filter(t => {
    const s = search.toLowerCase()
    if (s && !(t.title || '').toLowerCase().includes(s) &&
        !(t.customer?.full_name || '').toLowerCase().includes(s)) return false
    switch (filterKey) {
      case 'all': return true
      case 'overdue': return t.due_date && t.due_date < today && t.status !== 'done'
      case 'done': return t.status === 'done'
      case 'open': return t.status === 'open'
      case 'in_progress': return t.status === 'in_progress'
      case 'waiting': return t.status === 'waiting'
      case 'problem': return t.status === 'problem'
      case 'workorder':
      case 'general':
      case 'daily':
      case 'weekly':
      case 'monthly':
      case 'procurement':
      case 'qc':
        return (t.task_type || 'general') === filterKey
      default: {
        const p = profiles.find(p => p.id === t.assigned_to)
        return (p?.full_name || '').toLowerCase().includes(filterKey)
      }
    }
  })

  const handleSave = async () => {
    if (!form.title?.trim()) { toast('A feladat neve kötelező', 'error'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = {
      title: form.title.trim(),
      description: form.description || null,
      priority: form.priority || 'normal',
      status: form.status || 'open',
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
      customer_id: form.customer_id || null,
      work_order_id: form.work_order_id || null,
    }
    // Only set optional columns if schema_tasks_v2 was run
    try {
      if (form.waiting_reason) payload.waiting_reason = form.waiting_reason
      if (form.recurrence_type && form.recurrence_type !== 'none') {
        payload.recurrence_type = form.recurrence_type
        payload.recurrence_days = form.recurrence_days?.length ? form.recurrence_days : null
      }
    } catch {}
    if (form.status === 'done' && editItem?.status !== 'done') payload.completed_at = new Date().toISOString()
    const { error } = editItem
      ? await supabase.from('tasks').update(payload).eq('id', editItem.id)
      : await supabase.from('tasks').insert(payload)
    if (error) { toast('Hiba: ' + error.message, 'error') }
    else { toast(editItem ? 'Feladat frissítve' : 'Feladat létrehozva'); setModalOpen(false); load(); onRefresh() }
    setSaving(false)
  }

  const markDone = async (id: string) => {
    await supabase.from('tasks').update({ status: 'done', completed_at: new Date().toISOString() }).eq('id', id)
    toast('Feladat lezárva ✓'); load(); onRefresh()
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

  const openCreate = (defaults?: any) => {
    setEditItem(null); setForm({ ...DEFAULT_FORM, ...defaults }); setModalOpen(true)
  }

  const openEdit = (t: any) => {
    setEditItem(t)
    setForm({
      title: t.title, description: t.description || '', task_type: t.task_type || 'general',
      priority: t.priority || 'normal', status: t.status, due_date: t.due_date || '',
      assigned_to: t.assigned_to || '', customer_id: t.customer_id || '',
      work_order_id: t.work_order_id || '', recurrence_type: t.recurrence_type || 'none',
      recurrence_days: t.recurrence_days || [], waiting_reason: t.waiting_reason || '',
    })
    setModalOpen(true)
  }

  const toggleRecDay = (day: number) => {
    setForm((f: any) => ({
      ...f,
      recurrence_days: (f.recurrence_days || []).includes(day)
        ? f.recurrence_days.filter((d: number) => d !== day)
        : [...(f.recurrence_days || []), day],
    }))
  }

  if (!tableExists) return (
    <div className="p-8 text-center bg-white rounded-xl shadow-sm">
      <p className="text-[13px] text-[#4a4a4a]">Futtasd le a <code className="bg-gray-100 px-1 rounded">supabase/schema_phase3.sql</code> fájlt.</p>
    </div>
  )

  const filteredWO = form.customer_id ? workOrders.filter(wo => wo.customer_id === form.customer_id) : workOrders
  const personFilters = profiles.filter(p => ['mechanic','admin','super_admin'].includes(p.role))

  return (
    <div className="animate-fade-in space-y-4">

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {[
          { label: 'Mai feladat',  value: stats.today,      color: 'text-[#333333]', bg: 'bg-blue-50',  filter: 'all'     },
          { label: 'Sürgős',       value: stats.urgent,     color: 'text-red-600',   bg: 'bg-red-50',   filter: 'open'    },
          { label: 'Lejárt',       value: stats.overdue,    color: 'text-red-600',   bg: 'bg-red-50',   filter: 'overdue' },
          { label: 'Probléma',     value: stats.problem,    color: 'text-red-600',   bg: 'bg-red-50',   filter: 'problem' },
          { label: 'Ma kész',      value: stats.done_today, color: 'text-green-600', bg: 'bg-green-50', filter: 'done'    },
        ].map(s => (
          <button key={s.label} onClick={() => setFilterKey(s.filter)}
            className={`${s.bg} rounded-xl p-3 text-left hover:opacity-80 transition-opacity`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-[#4a4a4a]">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Type quick links */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {Object.entries(TASK_TYPES).map(([key, cfg]) => {
          const count = activeTasks.filter(t => (t.task_type || 'general') === key).length
          return (
            <button key={key} onClick={() => setFilterKey(key)}
              className={`${filterKey === key ? 'ring-2 ring-[#333333]' : ''} ${cfg.bg} rounded-lg p-2 text-center hover:opacity-80 transition-all`}>
              <div className="text-lg">{cfg.icon}</div>
              <div className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</div>
              {count > 0 && <div className="text-[11px] font-bold text-[#0D0D0D]">{count}</div>}
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Keresés…"
            className="w-full text-[13px] border border-[rgba(0,0,0,0.15)] rounded-lg px-3 py-2 outline-none pl-8" />
          <span className="absolute left-2.5 top-2.5 text-[#888888] text-[12px]">🔍</span>
        </div>
        <button onClick={() => setShowFilterPanel(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-medium transition-colors ${showFilterPanel ? 'bg-[#333333] text-white border-[#333333]' : 'border-[rgba(0,0,0,0.15)] text-[#4a4a4a]'}`}>
          <Filter size={13} /> Szűrők
        </button>
        <Button variant="primary" onClick={() => openCreate()}><Plus size={14} /> Új feladat</Button>
      </div>

      {/* Filter panel */}
      {showFilterPanel && (
        <div className="bg-white border border-[rgba(0,0,0,0.1)] rounded-xl p-3 space-y-3">
          <div>
            <div className="text-[10px] font-bold text-[#888888] uppercase mb-1.5">Státusz</div>
            <div className="flex flex-wrap gap-1.5">
              {['all','open','in_progress','waiting','problem','done','overdue'].map(k => (
                <button key={k} onClick={() => setFilterKey(k)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${filterKey === k ? 'bg-[#333333] text-white border-[#333333]' : 'border-[rgba(0,0,0,0.15)] text-[#4a4a4a]'}`}>
                  {k === 'all' ? 'Összes' : k === 'overdue' ? 'Lejárt' : STATUS_CONFIG[k]?.label || k}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-[#888888] uppercase mb-1.5">Típus</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(TASK_TYPES).map(([k, v]) => (
                <button key={k} onClick={() => setFilterKey(k)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${filterKey === k ? 'bg-[#333333] text-white border-[#333333]' : 'border-[rgba(0,0,0,0.15)] text-[#4a4a4a]'}`}>
                  {v.icon} {v.label}
                </button>
              ))}
            </div>
          </div>
          {personFilters.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-[#888888] uppercase mb-1.5">Felelős</div>
              <div className="flex flex-wrap gap-1.5">
                {personFilters.map(p => (
                  <button key={p.id} onClick={() => setFilterKey(p.full_name.split(' ')[0].toLowerCase())}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${filterKey === p.full_name.split(' ')[0].toLowerCase() ? 'bg-[#333333] text-white border-[#333333]' : 'border-[rgba(0,0,0,0.15)] text-[#4a4a4a]'}`}>
                    👤 {p.full_name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {filterKey !== 'all' && (
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#4a4a4a]">Szűrő aktív: <strong>{filterKey}</strong> ({filtered.length})</span>
          <button onClick={() => setFilterKey('all')} className="text-[11px] text-[#333333] hover:underline">× Törlés</button>
        </div>
      )}

      {/* Task list */}
      {loading ? (
        <div className="text-center py-12 text-[#4a4a4a] text-sm">Betöltés...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-[#888888] shadow-sm">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-[13px]">Nincs feladat ebben a nézetben</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(task => {
            const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal
            const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.open
            const tt = TASK_TYPES[task.task_type || 'general'] || TASK_TYPES.general
            const isOverdue = task.due_date && task.due_date < today && task.status !== 'done'
            const expanded = expandedId === task.id
            const assigneeName = getAssigneeName(task)

            return (
              <div key={task.id} className={`bg-white rounded-xl border-l-4 ${pri.border} shadow-sm overflow-hidden`}>
                <div className="flex items-start gap-3 p-3">
                  {/* Done toggle */}
                  <button
                    onClick={() => task.status === 'done' ? markStatus(task.id, 'open') : markDone(task.id)}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${task.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-500'}`}>
                    {task.status === 'done' && <Check size={10} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className={`font-semibold text-[13px] ${task.status === 'done' ? 'text-[#888888] line-through' : 'text-[#0D0D0D]'}`}>
                        {tt.icon} {task.title}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tt.bg} ${tt.color}`}>{tt.label}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${pri.color}`}>{pri.label}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                      {task.recurrence_type && task.recurrence_type !== 'none' && (
                        <span className="text-[9px] text-purple-600 flex items-center gap-0.5"><RefreshCw size={8} /> {RECURRENCE_LABELS[task.recurrence_type]}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-[#888888]">
                      {assigneeName && <span className="flex items-center gap-1"><User size={10} /><span className="font-medium text-[#4a4a4a]">{assigneeName}</span></span>}
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
                          <Clock size={10} /> {formatDate(task.due_date)}{isOverdue ? ' ⚠️' : ''}
                        </span>
                      )}
                      {task.customer && <span>👤 {task.customer.full_name}</span>}
                      {task.work_order && <span className="flex items-center gap-1 text-[#333333]"><FileText size={10} /> {task.work_order.order_number}</span>}
                      {task.waiting_reason && task.status === 'waiting' && <span className="text-amber-600 italic">⏳ {task.waiting_reason}</span>}
                    </div>
                    {task.description && (
                      <p className={`text-[11px] text-[#888888] mt-0.5 ${expanded ? 'whitespace-pre-line' : 'line-clamp-1'}`}>{task.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {task.status !== 'done' && task.status !== 'in_progress' && (
                      <button onClick={() => markStatus(task.id, 'in_progress')} title="Folyamatban"
                        className="p-1.5 text-amber-500 hover:bg-amber-50 rounded text-[11px] font-bold">▶</button>
                    )}
                    {task.status === 'in_progress' && (
                      <button onClick={() => markStatus(task.id, 'waiting')} title="Várakozik"
                        className="p-1.5 text-gray-500 hover:bg-gray-50 rounded text-[11px]">⏸</button>
                    )}
                    <button onClick={() => setExpandedId(expanded ? null : task.id)}
                      className="p-1.5 text-[#888888] hover:text-[#0D0D0D] rounded">
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button onClick={() => openEdit(task)} className="p-1.5 text-[#888888] hover:text-[#333333] rounded"><FileText size={13} /></button>
                    <button onClick={() => deleteTask(task.id)} className="p-1.5 text-[#888888] hover:text-red-500 rounded"><Trash2 size={13} /></button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-[rgba(0,0,0,0.06)] px-3 py-2 bg-[#F8F9FB] flex gap-2 flex-wrap">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <button key={key} onClick={() => markStatus(task.id, key)}
                        className={`text-[10px] px-2 py-1 rounded-full font-medium border transition-colors ${task.status === key ? 'border-[#333333] text-[#333333] bg-blue-50' : 'border-transparent text-[#4a4a4a] hover:border-[rgba(0,0,0,0.2)]'}`}>
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

      {/* Work order tasks section */}
      {woTasks.length > 0 && (filterKey === 'all' || filterKey === 'workorder') && (
        <div className="border border-[rgba(0,0,0,0.1)] rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 border-b border-blue-100">
            <span className="text-base">🔧</span>
            <span className="text-[12px] font-bold text-blue-800">Munkalap feladatok ({woTasks.length} nyitott)</span>
          </div>
          {/* Group by work order */}
          {Array.from(new Set(woTasks.map((t: any) => t.work_order_id))).map(woId => {
            const woGroup = woTasks.filter((t: any) => t.work_order_id === woId)
            const wo = woGroup[0]?.work_order
            if (!wo) return null
            const doneCnt = woGroup.filter((t: any) => t.status === 'done').length
            return (
              <div key={woId as string} className="border-b border-[rgba(0,0,0,0.06)] last:border-0">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-white">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-[#333333]">📋 {wo.order_number}</span>
                      {wo.vehicle && <span className="text-[11px] text-[#4a4a4a]">{wo.vehicle.make} {wo.vehicle.model} · {wo.vehicle.license_plate}</span>}
                      {wo.customer && <span className="text-[11px] text-[#888888]">– {wo.customer.full_name}</span>}
                    </div>
                    <div className="text-[10px] text-[#888888] mt-0.5">{doneCnt}/{woGroup.length} feladat kész</div>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-20 bg-gray-200 rounded-full h-1.5">
                      <div className="bg-[#333333] h-1.5 rounded-full transition-all" style={{ width: `${woGroup.length ? (doneCnt / woGroup.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                </div>
                <div className="divide-y divide-[rgba(0,0,0,0.04)]">
                  {woGroup.map((task: any) => {
                    const ST: Record<string, string> = { pending: 'Várakozik', in_progress: 'Folyamatban', waiting: 'Várakozik', done: 'Kész', problem: '⚠️ Probléma' }
                    const SC: Record<string, string> = { pending: 'bg-gray-100 text-gray-600', in_progress: 'bg-amber-100 text-amber-800', done: 'bg-green-100 text-green-800', problem: 'bg-red-100 text-red-700', waiting: 'bg-gray-100 text-gray-600' }
                    const checklist = task.checklist || []
                    const done = task.checklist_done || []
                    return (
                      <div key={task.id} className="flex items-center gap-3 px-4 py-2 bg-white hover:bg-[#F8F9FB]">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${task.status === 'done' ? 'bg-green-500' : task.status === 'problem' ? 'bg-red-500' : task.status === 'in_progress' ? 'bg-amber-500' : 'bg-gray-300'}`} />
                        <div className="flex-1 min-w-0">
                          <span className={`text-[12px] font-medium ${task.status === 'done' ? 'text-[#888888] line-through' : 'text-[#0D0D0D]'}`}>{task.title}</span>
                          {checklist.length > 0 && (
                            <span className="ml-2 text-[10px] text-[#888888]">☑ {done.length}/{checklist.length}</span>
                          )}
                        </div>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${SC[task.status] || SC.pending}`}>{ST[task.status] || task.status}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editItem ? 'Feladat szerkesztése' : 'Új feladat'} className="max-w-lg"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : editItem ? 'Frissítés' : 'Létrehozás'}</Button></>}>
        <div className="space-y-3">
          <div>
            <FormLabel>Feladat típusa</FormLabel>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {Object.entries(TASK_TYPES).map(([key, cfg]) => (
                <button key={key} type="button"
                  onClick={() => setForm((f: any) => ({ ...f, task_type: key }))}
                  className={`flex flex-col items-center p-2 rounded-lg border text-center transition-colors ${form.task_type === key ? 'border-[#333333] bg-blue-50' : 'border-[rgba(0,0,0,0.12)] hover:border-[#333333]'}`}>
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

          <div>
            <FormLabel>Ismétlődés</FormLabel>
            <Select value={form.recurrence_type} onChange={e => setForm((f: any) => ({ ...f, recurrence_type: e.target.value, recurrence_days: [] }))} className="mt-1">
              {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </div>

          {form.recurrence_type === 'weekly' && (
            <div>
              <FormLabel>Melyik napokon?</FormLabel>
              <div className="flex gap-1.5 mt-1">
                {WEEKDAYS.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleRecDay(i)}
                    className={`w-8 h-8 rounded-full text-[11px] font-semibold border transition-colors ${(form.recurrence_days || []).includes(i) ? 'bg-[#333333] text-white border-[#333333]' : 'border-gray-300 text-[#4a4a4a]'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {form.recurrence_type === 'monthly' && (
            <FormGroup>
              <FormLabel>A hónap hányadik napján?</FormLabel>
              <Input type="number" min={1} max={31}
                value={(form.recurrence_days || [])[0] || ''}
                onChange={e => setForm((f: any) => ({ ...f, recurrence_days: [parseInt(e.target.value)] }))} />
            </FormGroup>
          )}

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
