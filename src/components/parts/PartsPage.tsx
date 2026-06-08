'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Cog, Search, Plus, Check, Package, AlertTriangle, Clock, X } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  searching: 'Keresés alatt',
  ordered: 'Megrendelve',
  arrived: 'Megérkezett',
  installed: 'Beépítve',
  cancelled: 'Törölve',
}

const STATUS_COLORS: Record<string, string> = {
  searching: 'bg-amber-100 text-amber-800',
  ordered: 'bg-blue-100 text-blue-800',
  arrived: 'bg-green-100 text-green-800',
  installed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-800',
}

const URGENCY_COLORS: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-600',
  urgent: 'bg-red-100 text-red-800',
}

export function PartsPage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const [parts, setParts] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<any>(null)
  const [form, setForm] = useState<any>({ quantity: 1, urgency: 'normal', status: 'searching' })
  const [saving, setSaving] = useState(false)
  const [tableExists, setTableExists] = useState(true)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('parts_requests')
      .select('*, work_order:work_orders(order_number)')
      .order('created_at', { ascending: false })

    if (error?.code === '42P01') { setTableExists(false); setLoading(false); return }
    setParts(data || [])

    const { data: wo } = await supabase.from('work_orders').select('id, order_number').not('status', 'in', '(delivered,closed)')
    setWorkOrders(wo || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const filtered = parts.filter(p => {
    if (filterStatus !== 'all' && p.status !== filterStatus) return false
    if (search) {
      const s = search.toLowerCase()
      return (p.part_name || '').toLowerCase().includes(s) ||
        (p.work_order?.order_number || '').toLowerCase().includes(s) ||
        (p.work_order?.customer?.full_name || '').toLowerCase().includes(s)
    }
    return true
  })

  const handleSave = async () => {
    if (!form.part_name?.trim()) { toast('Az alkatrész neve kötelező', 'error'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const payload = { ...form, requested_by: user?.id }
    const { error } = editItem
      ? await supabase.from('parts_requests').update(payload).eq('id', editItem.id)
      : await supabase.from('parts_requests').insert(payload)
    if (error) { toast('Hiba: ' + error.message, 'error') }
    else { toast(editItem ? 'Frissítve' : 'Igénylés rögzítve'); setModalOpen(false); load() }
    setSaving(false)
  }

  const updateStatus = async (id: string, status: string) => {
    const update: any = { status }
    if (status === 'arrived') update.arrived_at = new Date().toISOString()
    if (status === 'ordered') update.ordered_at = new Date().toISOString()
    await supabase.from('parts_requests').update(update).eq('id', id)
    toast('Státusz frissítve')
    load()
  }

  const openEdit = (item: any) => {
    setEditItem(item)
    setForm({
      work_order_id: item.work_order_id,
      part_name: item.part_name,
      part_number: item.part_number,
      quantity: item.quantity,
      urgency: item.urgency,
      status: item.status,
      supplier: item.supplier,
      estimated_price: item.estimated_price,
      actual_price: item.actual_price,
      notes: item.notes,
    })
    setModalOpen(true)
  }

  const openCreate = () => {
    setEditItem(null)
    setForm({ quantity: 1, urgency: 'normal', status: 'searching' })
    setModalOpen(true)
  }

  if (!tableExists) {
    return (
      <div className="animate-fade-in">
        <Card className="p-6 text-center">
          <AlertTriangle size={32} className="mx-auto mb-3 text-amber-500" />
          <h3 className="font-semibold text-[#0B1E3D] mb-2">Adatbázis frissítés szükséges</h3>
          <p className="text-[13px] text-[#5a6a80] mb-4">Futtasd le a <code>supabase/schema_phase3.sql</code> fájlt a Supabase SQL Editor-ban.</p>
        </Card>
      </div>
    )
  }

  const pendingCount = parts.filter(p => p.status === 'searching').length
  const orderedCount = parts.filter(p => p.status === 'ordered').length
  const arrivedCount = parts.filter(p => p.status === 'arrived').length
  const urgentCount = parts.filter(p => p.urgency === 'urgent' && !['installed','cancelled'].includes(p.status)).length

  return (
    <div className="animate-fade-in space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Keresés alatt', value: pendingCount, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Megrendelve', value: orderedCount, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Megérkezett', value: arrivedCount, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Sürgős', value: urgentCount, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[11px] text-[#5a6a80]">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa0b5]" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Alkatrész, munkalap..."
            className="w-full pl-9 pr-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0B1E3D]" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white outline-none">
          <option value="all">Minden státusz</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <Button variant="primary" onClick={openCreate}><Plus size={14} /> Új igénylés</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#F4F5F7] border-b border-[rgba(11,30,61,0.10)]">
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Alkatrész</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase hidden md:table-cell">Munkalap</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase hidden md:table-cell">Igénylő</th>
                <th className="text-center px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Db</th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Státusz</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} className="border-b border-[rgba(11,30,61,0.06)] hover:bg-[#fafbfc]">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#0B1E3D]">{p.part_name}</div>
                    {p.part_number && <div className="text-[11px] text-[#8fa0b5]">#{p.part_number}</div>}
                    {p.urgency === 'urgent' && (
                      <span className="text-[10px] font-semibold text-red-600 flex items-center gap-0.5 mt-0.5">
                        <AlertTriangle size={10} /> Sürgős
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="text-[12px] font-mono text-[#0B1E3D]">{p.work_order?.order_number || '–'}</div>
                    <div className="text-[11px] text-[#8fa0b5]">{p.work_order?.customer?.full_name}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-[12px] text-[#5a6a80]">
                    {p.requested_by?.full_name || '–'}
                  </td>
                  <td className="px-4 py-3 text-center font-semibold">{p.quantity}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[p.status] || p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {p.status === 'searching' && (
                        <button onClick={() => updateStatus(p.id, 'ordered')}
                          className="px-2 py-1 text-[11px] bg-blue-50 text-blue-700 rounded hover:bg-blue-100">
                          Megrendelve
                        </button>
                      )}
                      {p.status === 'ordered' && (
                        <button onClick={() => updateStatus(p.id, 'arrived')}
                          className="px-2 py-1 text-[11px] bg-green-50 text-green-700 rounded hover:bg-green-100">
                          Megérkezett
                        </button>
                      )}
                      {p.status === 'arrived' && (
                        <button onClick={() => updateStatus(p.id, 'installed')}
                          className="px-2 py-1 text-[11px] bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                          Beépítve
                        </button>
                      )}
                      <button onClick={() => openEdit(p)} className="p-1.5 text-[#5a6a80] hover:text-[#0B1E3D]">
                        <Cog size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-[#8fa0b5] text-sm">
              {search || filterStatus !== 'all' ? 'Nincs találat' : 'Még nincs alkatrész igénylés'}
            </div>
          )}
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editItem ? 'Alkatrész szerkesztése' : 'Új alkatrész igénylés'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <FormGroup className="col-span-2">
            <FormLabel>Munkalap</FormLabel>
            <Select value={form.work_order_id || ''} onChange={e => setForm((f: any) => ({ ...f, work_order_id: e.target.value }))}>
              <option value="">– Válasszon –</option>
              {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.order_number}</option>)}
            </Select>
          </FormGroup>
          <FormGroup className="col-span-2">
            <FormLabel>Alkatrész neve *</FormLabel>
            <Input value={form.part_name || ''} onChange={e => setForm((f: any) => ({ ...f, part_name: e.target.value }))} placeholder="pl. Fékbetét készlet" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Cikkszám</FormLabel>
            <Input value={form.part_number || ''} onChange={e => setForm((f: any) => ({ ...f, part_number: e.target.value }))} placeholder="OEM szám" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Darabszám</FormLabel>
            <Input type="number" value={form.quantity || 1} onChange={e => setForm((f: any) => ({ ...f, quantity: parseInt(e.target.value) }))} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Sürgősség</FormLabel>
            <Select value={form.urgency || 'normal'} onChange={e => setForm((f: any) => ({ ...f, urgency: e.target.value }))}>
              <option value="normal">Normál</option>
              <option value="urgent">Sürgős</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Státusz</FormLabel>
            <Select value={form.status || 'searching'} onChange={e => setForm((f: any) => ({ ...f, status: e.target.value }))}>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Becsült ár (CHF)</FormLabel>
            <Input type="number" step="0.01" value={form.estimated_price || ''} onChange={e => setForm((f: any) => ({ ...f, estimated_price: parseFloat(e.target.value) }))} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Tényleges ár (CHF)</FormLabel>
            <Input type="number" step="0.01" value={form.actual_price || ''} onChange={e => setForm((f: any) => ({ ...f, actual_price: parseFloat(e.target.value) }))} />
          </FormGroup>
          <FormGroup>
            <FormLabel>Szállító</FormLabel>
            <Input value={form.supplier || ''} onChange={e => setForm((f: any) => ({ ...f, supplier: e.target.value }))} placeholder="pl. AutoTeile AG" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Megjegyzés</FormLabel>
            <Input value={form.notes || ''} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))} />
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
