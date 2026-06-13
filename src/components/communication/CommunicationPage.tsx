'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Plus, Search, MessageCircle, Phone, Mail, ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const MESSAGE_TYPES = [
  { value: 'inquiry', label: 'Érdeklődés' },
  { value: 'appointment', label: 'Időpont egyeztetés' },
  { value: 'quote_sent', label: 'Ajánlat küldés' },
  { value: 'approval_request', label: 'Jóváhagyás kérés' },
  { value: 'status_update', label: 'Státuszfrissítés' },
  { value: 'car_ready', label: 'Autó kész' },
  { value: 'payment', label: 'Fizetés' },
  { value: 'complaint', label: 'Reklamáció' },
  { value: 'review_request', label: 'Google review kérés' },
]

const channelIcons: Record<string, React.ReactNode> = {
  whatsapp: <MessageCircle size={14} className="text-emerald-500" />,
  phone: <Phone size={14} className="text-blue-500" />,
  email: <Mail size={14} className="text-[#4a4a4a]" />,
  in_person: <span className="text-[10px] font-bold text-[#C8102E]">FP</span>,
}

export function CommunicationPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [logs, setLogs] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<any>({ direction: 'inbound', channel: 'whatsapp', message_type: 'inquiry' })
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: l }, { data: c }, { data: wo }] = await Promise.all([
      supabase.from('communication_logs').select('*, customer:customers(full_name,phone)').order('created_at', { ascending: false }).limit(100),
      supabase.from('customers').select('id, full_name').order('full_name'),
      supabase.from('work_orders').select('id, order_number').not('status', 'in', '(delivered,closed)'),
    ])
    setLogs(l || [])
    setCustomers(c || [])
    setWorkOrders(wo || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const filtered = logs.filter(l => {
    const s = search.toLowerCase()
    return !s || (l.customer?.full_name || '').toLowerCase().includes(s) || (l.content || '').toLowerCase().includes(s)
  })

  const handleSave = async () => {
    if (!form.customer_id) { toast('Kunde ist Pflichtfeld', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('communication_logs').insert(form)
    if (error) { toast('Fehler', 'error') } else { toast('Nachricht gespeichert'); setModalOpen(false); load() }
    setSaving(false)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ügyfél, üzenet tartalma..."
            className="w-full pl-9 pr-3 py-2 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0D0D0D]" />
        </div>
        <Button variant="primary" onClick={() => { setForm({ direction: 'inbound', channel: 'whatsapp', message_type: 'inquiry' }); setModalOpen(true) }}>
          <Plus size={14} /> Eintrag
        </Button>
      </div>

      {loading ? <div className="text-center py-12 text-[#4a4a4a] text-sm">Wird geladen...</div> : (
        <Card>
          {filtered.map((log, idx) => (
            <div key={log.id} className={`flex items-start gap-3 py-3 ${idx < filtered.length - 1 ? 'border-b border-[rgba(0,0,0,0.07)]' : ''}`}>
              <div className="mt-0.5 shrink-0">
                {log.direction === 'inbound'
                  ? <ArrowDownLeft size={16} className="text-emerald-500" />
                  : <ArrowUpRight size={16} className="text-blue-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[13px]">{log.customer?.full_name}</span>
                  <span className="flex items-center gap-1">{channelIcons[log.channel]}</span>
                  <span className="text-[10px] bg-[#F4F5F7] text-[#4a4a4a] px-2 py-0.5 rounded-full">
                    {MESSAGE_TYPES.find(t => t.value === log.message_type)?.label || log.message_type}
                  </span>
                </div>
                {log.content && <p className="text-[12px] text-[#4a4a4a] mt-1">{log.content}</p>}
              </div>
              <div className="text-[11px] text-[#888888] shrink-0">{formatDateTime(log.created_at)}</div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-10 text-[#888888] text-sm">Nincs bejegyzés</div>}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Kommunikation erfassen"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button><Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup className="col-span-2">
            <FormLabel>Kunde *</FormLabel>
            <Select value={form.customer_id || ''} onChange={e => setForm((f: any) => ({ ...f, customer_id: e.target.value }))}>
              <option value="">Bitte wählen...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Richtung</FormLabel>
            <Select value={form.direction} onChange={e => setForm((f: any) => ({ ...f, direction: e.target.value }))}>
              <option value="inbound">Eingehend</option>
              <option value="outbound">Ausgehend</option>
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Kanal</FormLabel>
            <Select value={form.channel} onChange={e => setForm((f: any) => ({ ...f, channel: e.target.value }))}>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone">Telefon</option>
              <option value="email">E-Mail</option>
              <option value="in_person">Persönlich</option>
            </Select>
          </FormGroup>
          <FormGroup className="col-span-2">
            <FormLabel>Nachrichtentyp</FormLabel>
            <Select value={form.message_type} onChange={e => setForm((f: any) => ({ ...f, message_type: e.target.value }))}>
              {MESSAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Auftrag</FormLabel>
            <Select value={form.work_order_id || ''} onChange={e => setForm((f: any) => ({ ...f, work_order_id: e.target.value || null }))}>
              <option value="">–</option>
              {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.order_number}</option>)}
            </Select>
          </FormGroup>
          <FormGroup className="col-span-2">
            <FormLabel>Inhalt</FormLabel>
            <Textarea value={form.content || ''} onChange={e => setForm((f: any) => ({ ...f, content: e.target.value }))} placeholder="Nachrichteninhalt..." />
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
