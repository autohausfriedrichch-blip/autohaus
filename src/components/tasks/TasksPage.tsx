'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Plus, Check, AlertTriangle, Clock, User, FileText, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

const PRIORITY_CONFIG: Record<string, { label: string; color: string; border: string }> = {
  low:    { label: 'Alacsony', color: 'text-gray-500',  border: 'border-gray-300' },
  normal: { label: 'Normál',   color: 'text-blue-600',  border: 'border-blue-400' },
  high:   { label: 'Magas',    color: 'text-amber-600', border: 'border-amber-400' },
  urgent: { label: 'Sürgős',   color: 'text-red-600',   border: 'border-red-500' },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  open:        { label: 'Nyitott',     color: 'bg-blue-100 text-blue-800' },
  in_progress: { label: 'Folyamatban', color: 'bg-amber-100 text-amber-800' },
  done:        { label: 'Kész',        color: 'bg-green-100 text-green-800' },
  cancelled:   { label: 'Törölve',     color: 'bg-gray-100 text-gray-600' },
}

const FILTER_TABS = [
  { key: 'all', label: 'Összes' },
  { key: 'open', label: 'Nyitott' },
  { key: 'in_progress', label: 'Folyamatban' },
  { key: 'done', label: 'Kész' },
  { key: 'overdue', label: 'Lejárt' },
]

export function TasksPage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTab, setFilterTab] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>({ priority: 'normal', status: 'open' })
  const [saving, setSaving] = useState(false)
  const [tableExists, setTableExists] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: t, error }, { data: p }, { data: c }, { data: wo }] = await Promise.all([
      supabase.from('tasks').select('*, customer:customers(full_name), work_order:work_orders(order_number)').order('due_date', { ascending: true, nullsFirst: false }),
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
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const today = new Date().toISOString().split('T')[0]

  const filtered = tasks.filter(t => {
    if (filterTab === 'overdue') return t.due_date && t.due_date < today && t.status !== 'done'
    if (filterTab !== 'all') return t.status === filterTab
    return true
  })

  const stats = {
    open: tasks.filter(t => t.status === 'open').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done_today: tasks.filter(t => t.completed_at?.startsWith(today)).length,
    overdue: tasks.filter(t => t.due_date && t.due_date < today && t.status !== 'done').length,
  }

  const handleSave = async () => {
    if (!form.title?.trim()) { toast('A feladat neve kötelező', 'error'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload: any = { ...form, created_by: user?.id }
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
    toast('Feladat lezárva')
    load(); onRefresh()
  }

  const deleteTask = async (id: string) => {
    if (!confirm('Törlés?')) return
    await supabase.from('tasks').delete().eq('id', id)
    toast('Feladat törölve'); load()
  }

  const openCreate = () => { setEditItem(null); setForm({ priority: 'normal', status: 'open' }); setModalOpen(true) }
  const openEdit = (t: any) => {
    setEditItem(t)
    setForm({ title: t.title, description: t.description, priority: t.priority, status: t.status, due_date: t.due_date, assigned_to: t.assigned_to, customer_id: t.customer_id, work_order_id: t.work_order_id })
    setModalOpen(true)
  }

  if (!tableExists) return (
    <div className="animate-fade-in">
      <Card className="p-8 text-center">
        <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
        <h3 className="font-semibold text-[#0B1E3D] mb-2">Adatbázis frissítés szükséges</h3>
        <p className="text-[13px] text-[#5a6a80]">Futtasd le a <code className="bg-gray-100 px-1 rounded">supabase/schema_phase3.sql</code> fájlt.</p>
      </Card>
    </div>
  )

  const filteredWO = form.customer_id ? workOrders.filter(wo => wo.customer_id === form.customer_id) : workOrders

  return (
    <div className="animate-fade-in space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Nyitott', value: stats.open, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Folyamatban', value: stats.in_progress, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Ma kész', value: stats.done_today, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Lejárt', value: stats.overdue, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-[#5a6a80]">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-[#F4F5F7] p-1 rounded-lg flex-1 overflow-x-auto">
          {FILTER_TABS.map(ft => (
            <button key={ft.key} onClick={() => setFilterTab(ft.key)}
              className={`flex-1 min-w-fit px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors whitespace-nowrap ${filterTab === ft.key ? 'bg-white text-[#0B1E3D] shadow-sm' : 'text-[#5a6a80] hover:text-[#0B1E3D]'}`}>
              {ft.label}
              {ft.key === 'overdue' && stats.overdue > 0 && <span className="ml-1 bg-red-500 text-white text-[9px] px-1 rounded-full">{stats.overdue}</span>}
            </button>
          ))}
        </div>
        <Button variant="primary" onClick={openCreate}><Plus size={14} /> Új feladat</Button>
      </div>

      {loading ? <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div> : (
        <div className="space-y-2">
          {filtered.length === 0
            ? <Card className="p-8 text-center text-[#8fa0b5]">Nincs feladat ebben a nézetben</Card>
            : filtered.map(task => {
              const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal
              const st = STATUS_CONFIG[task.status] || STATUS_CONFIG.open
              const isOverdue = task.due_date && task.due_date < today && task.status !== 'done'
              return (
                <div key={task.id} className={`flex items-start gap-3 p-3 bg-white rounded-xl border-l-4 ${pri.border} shadow-sm`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-[13px] text-[#0B1E3D]">{task.title}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${pri.color}`}>{pri.label}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                    </div>
                    {task.description && <p className="text-[12px] text-[#5a6a80] line-clamp-2 mb-1">{task.description}</p>}
                    <div className="flex items-center gap-3 flex-wrap text-[11px] text-[#8fa0b5]">
                      {task.assignee && <span className="flex items-center gap-1"><User size={10} /> {task.assignee.full_name}</span>}
                      {task.due_date && <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}><Clock size={10} /> {formatDate(task.due_date)}{isOverdue ? ' ⚠️' : ''}</span>}
                      {task.customer && <span>{task.customer.full_name}</span>}
                      {task.work_order && <span className="flex items-center gap-1"><FileText size={10} /> {task.work_order.order_number}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {task.status !== 'done' && <button onClick={() => markDone(task.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded"><Check size={16} /></button>}
                    <button onClick={() => openEdit(task)} className="p-1.5 text-[#5a6a80] hover:text-[#0B1E3D] rounded"><FileText size={14} /></button>
                    <button onClick={() => deleteTask(task.id)} className="p-1.5 text-[#8fa0b5] hover:text-red-500 rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
              )
            })
          }
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? 'Feladat szerkesztése' : 'Új feladat'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</Button></>}>
        <div className="space-y-3">
          <FormGroup>
            <FormLabel>Feladat neve *</FormLabel>
            <Input value={form.title || ''} onChange={e => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="pl. Visszahívni az ügyfelet" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Leírás</FormLabel>
            <Textarea value={form.description || ''} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))} rows={2} />
          </FormGroup>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup>
              <FormLabel>Prioritás</FormLabel>
              <Select value={form.priority || 'normal'} onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value }))}>
                <option value="low">Alacsony</option><option value="normal">Normál</option><option value="high">Magas</option><option value="urgent">Sürgős</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <FormLabel>Státusz</FormLabel>
              <Select value={form.status || 'open'} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}>
                <option value="open">Nyitott</option><option value="in_progress">Folyamatban</option><option value="done">Kész</option><option value="cancelled">Törölve</option>
              </Select>
            </FormGroup>
            <FormGroup>
              <FormLabel>Felelős</FormLabel>
              <Select value={form.assigned_to || ''} onChange={e => setForm((f: any) => ({ ...f, assigned_to: e.target.value }))}>
                <option value="">– Válasszon –</option>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </Select>
            </FormGroup>
            <FormGroup>
              <FormLabel>Határidő</FormLabel>
              <Input type="date" value={form.due_date || ''} onChange={e => setForm((f: any) => ({ ...f, due_date: e.target.value }))} />
            </FormGroup>
            <FormGroup>
              <FormLabel>Kapcsolódó ügyfél</FormLabel>
              <Select value={form.customer_id || ''} onChange={e => setForm((f: any) => ({ ...f, customer_id: e.target.value, work_order_id: '' }))}>
                <option value="">– Opcionális –</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </Select>
            </FormGroup>
            <FormGroup>
              <FormLabel>Kapcsolódó munkalap</FormLabel>
              <Select value={form.work_order_id || ''} onChange={e => setForm((f: any) => ({ ...f, work_order_id: e.target.value }))}>
                <option value="">– Opcionális –</option>
                {filteredWO.map(wo => <option key={wo.id} value={wo.id}>{wo.order_number}</option>)}
              </Select>
            </FormGroup>
          </div>
        </div>
      </Modal>
    </div>
  )
}
