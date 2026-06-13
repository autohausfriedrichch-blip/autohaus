'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { Modal } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
import {
  Bell,
  BellRing,
  Car,
  Calendar,
  Mail,
  MessageCircle,
  Smartphone,
  Check,
  CheckCircle,
  Plus,
  Trash2,
  Send,
  Filter,
  AlertCircle,
  Clock,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Reminder {
  id: string
  vehicle_id: string | null
  customer_id: string | null
  type: string
  title: string
  due_date: string | null
  due_mileage: number | null
  channel: string
  status: string
  notes: string | null
  created_at: string
  vehicle?: {
    make: string
    model: string
    license_plate: string
  } | null
  customer?: {
    full_name: string
    phone: string | null
    whatsapp: string | null
  } | null
}

interface Vehicle {
  id: string
  make: string
  model: string
  license_plate: string
  customer_id: string | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  oil_change: 'Olajcsere',
  annual_service: 'Éves szerviz',
  brakes: 'Fékellenőrzés',
  battery: 'Akkumulátor',
  climate: 'Klímaszerviz',
  mfk: 'MFK',
  tires_summer: 'Nyári gumi',
  tires_winter: 'Téli gumi',
  custom: 'Egyéni',
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Függőben', color: '#4a4a4a', bg: '#F4F5F7' },
  sent:     { label: 'Elküldve', color: '#2563eb', bg: '#dbeafe' },
  opened:   { label: 'Megnyitva', color: '#d97706', bg: '#fef3c7' },
  replied:  { label: 'Válaszolt', color: '#ea580c', bg: '#ffedd5' },
  booked:   { label: 'Lefoglalt', color: '#16a34a', bg: '#dcfce7' },
}

const FILTER_TABS = [
  { key: 'all', label: 'Összes' },
  { key: 'pending', label: 'Esedékes' },
  { key: 'sent', label: 'Elküldve' },
  { key: 'booked', label: 'Lefoglalt' },
]

const REMINDER_TYPES = [
  { value: 'oil_change', label: 'Olajcsere' },
  { value: 'annual_service', label: 'Éves szerviz' },
  { value: 'brakes', label: 'Fékellenőrzés' },
  { value: 'battery', label: 'Akkumulátor' },
  { value: 'climate', label: 'Klímaszerviz' },
  { value: 'mfk', label: 'MFK' },
  { value: 'tires_summer', label: 'Nyári gumi' },
  { value: 'tires_winter', label: 'Téli gumi' },
  { value: 'custom', label: 'Egyéni' },
]

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail size={13} />,
  whatsapp: <MessageCircle size={13} />,
  push: <Smartphone size={13} />,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function dueDateStyle(d: string | null): { color: string; label?: string } {
  if (!d) return { color: '#4a4a4a' }
  const diff = (new Date(d).getTime() - Date.now()) / 86400000
  if (diff < 0) return { color: '#C8102E', label: 'Lejárt' }
  if (diff <= 30) return { color: '#f59e0b', label: `${Math.ceil(diff)} nap` }
  return { color: '#4a4a4a' }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RemindersPage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const supabase = createClient()
  const { toast } = useToast()

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<string>('all')

  // Stats
  const [stats, setStats] = useState({ total: 0, pending: 0, sent: 0, booked: 0 })

  // New reminder modal
  const [newOpen, setNewOpen] = useState(false)
  const [newForm, setNewForm] = useState({
    vehicle_id: '',
    customer_id: '',
    type: 'oil_change',
    title: 'Olajcsere',
    due_date: '',
    due_mileage: '',
    channel: 'whatsapp',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  // Seasonal modal
  const [seasonalOpen, setSeasonalOpen] = useState(false)
  const [seasonalCreating, setSeasonalCreating] = useState(false)
  const currentMonth = new Date().getMonth() + 1 // 1-12
  const seasonalType = currentMonth >= 3 && currentMonth <= 5 ? 'tires_summer' : 'tires_winter'
  const seasonalLabel = TYPE_LABELS[seasonalType]

  // ── Load data ────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true)
    const [{ data: rData }, { data: vData }] = await Promise.all([
      supabase
        .from('maintenance_reminders')
        .select('*')
        .order('due_date'),
      supabase.from('vehicles').select('id,make,model,license_plate,customer_id').order('make'),
    ])

    const list = (rData || []) as Reminder[]
    setReminders(list)
    setVehicles((vData as Vehicle[]) || [])
    setStats({
      total: list.length,
      pending: list.filter(r => r.status === 'pending').length,
      sent: list.filter(r => r.status === 'sent').length,
      booked: list.filter(r => r.status === 'booked').length,
    })
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { loadData() }, [loadData])

  // ── Filter ───────────────────────────────────────────────────────────────────
  const filtered = reminders.filter(r => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return r.status === 'pending'
    if (activeTab === 'sent') return r.status === 'sent'
    if (activeTab === 'booked') return r.status === 'booked'
    return true
  })

  // ── Status updates ────────────────────────────────────────────────────────────
  const markSent = async (id: string) => {
    const { error } = await supabase.from('maintenance_reminders').update({ status: 'sent' }).eq('id', id)
    if (error) { toast('Hiba', 'error') } else { toast('Megjelölve: Elküldve'); loadData(); onRefresh() }
  }

  const markBooked = async (id: string) => {
    const { error } = await supabase.from('maintenance_reminders').update({ status: 'booked' }).eq('id', id)
    if (error) { toast('Hiba', 'error') } else { toast('Megjelölve: Lefoglalt'); loadData(); onRefresh() }
  }

  const deleteReminder = async (id: string) => {
    const { error } = await supabase.from('maintenance_reminders').delete().eq('id', id)
    if (error) { toast('Hiba a törlésnél', 'error') } else { toast('Emlékeztető törölve'); loadData(); onRefresh() }
  }

  // ── New reminder ──────────────────────────────────────────────────────────────
  const handleVehicleChange = (vehicleId: string) => {
    const v = vehicles.find(x => x.id === vehicleId)
    setNewForm(f => ({
      ...f,
      vehicle_id: vehicleId,
      customer_id: v?.customer_id || '',
    }))
  }

  const handleTypeChange = (type: string) => {
    setNewForm(f => ({
      ...f,
      type,
      title: TYPE_LABELS[type] || '',
    }))
  }

  const saveReminder = async () => {
    if (!newForm.vehicle_id || !newForm.title) { toast('Jármű és cím megadása kötelező', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('maintenance_reminders').insert({
      vehicle_id: newForm.vehicle_id,
      customer_id: newForm.customer_id || null,
      type: newForm.type,
      title: newForm.title,
      due_date: newForm.due_date || null,
      due_mileage: newForm.due_mileage ? parseInt(newForm.due_mileage) : null,
      channel: newForm.channel,
      notes: newForm.notes || null,
      status: 'pending',
    })
    setSaving(false)
    if (error) { toast('Hiba a mentésnél', 'error') }
    else {
      toast('Emlékeztető létrehozva')
      setNewOpen(false)
      setNewForm({ vehicle_id: '', customer_id: '', type: 'oil_change', title: 'Olajcsere', due_date: '', due_mileage: '', channel: 'whatsapp', notes: '' })
      loadData()
      onRefresh()
    }
  }

  // ── Bulk seasonal reminders ───────────────────────────────────────────────────
  const createSeasonalReminders = async () => {
    setSeasonalCreating(true)
    // Get active vehicles that don't already have a pending seasonal reminder of this type
    const { data: existingIds } = await supabase
      .from('maintenance_reminders')
      .select('vehicle_id')
      .eq('type', seasonalType)
      .eq('status', 'pending')

    const alreadySet = new Set((existingIds || []).map((r: any) => r.vehicle_id))
    const toCreate = vehicles.filter(v => !alreadySet.has(v.id))

    if (toCreate.length === 0) {
      toast('Nincs új jármű ehhez az emlékeztetőhöz', 'info')
      setSeasonalCreating(false)
      setSeasonalOpen(false)
      return
    }

    // Create reminder ~2 months in future
    const dueDate = new Date()
    dueDate.setMonth(dueDate.getMonth() + 2)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    const inserts = toCreate.map(v => ({
      vehicle_id: v.id,
      customer_id: v.customer_id || null,
      type: seasonalType,
      title: seasonalLabel,
      due_date: dueDateStr,
      channel: 'whatsapp',
      status: 'pending',
    }))

    const { error } = await supabase.from('maintenance_reminders').insert(inserts)
    setSeasonalCreating(false)
    if (error) { toast('Hiba a tömeges létrehozásnál', 'error') }
    else {
      toast(`${toCreate.length} emlékeztető létrehozva`)
      setSeasonalOpen(false)
      loadData()
      onRefresh()
    }
  }

  // ── Active vehicle count for seasonal dialog ──────────────────────────────────
  const [seasonalPreviewCount, setSeasonalPreviewCount] = useState<number | null>(null)
  const openSeasonalDialog = async () => {
    const { data: existingIds } = await supabase
      .from('maintenance_reminders')
      .select('vehicle_id')
      .eq('type', seasonalType)
      .eq('status', 'pending')
    const alreadySet = new Set((existingIds || []).map((r: any) => r.vehicle_id))
    const count = vehicles.filter(v => !alreadySet.has(v.id)).length
    setSeasonalPreviewCount(count)
    setSeasonalOpen(true)
  }

  return (
    <div className="animate-fade-in space-y-4">

      {/* ── Stats Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Összes', value: stats.total, icon: <Bell size={14} />, color: '#0D0D0D' },
          { label: 'Függőben', value: stats.pending, icon: <Clock size={14} />, color: '#f59e0b' },
          { label: 'Elküldve', value: stats.sent, icon: <Send size={14} />, color: '#2563eb' },
          { label: 'Lefoglalt', value: stats.booked, icon: <CheckCircle size={14} />, color: '#16a34a' },
        ].map(stat => (
          <Card key={stat.label} className="flex items-center gap-3 p-4">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${stat.color}18`, color: stat.color }}
            >
              {stat.icon}
            </div>
            <div>
              <div className="text-[11px] text-[#4a4a4a]">{stat.label}</div>
              <div className="text-[20px] font-bold text-[#0D0D0D] leading-tight">{stat.value}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 bg-[#F4F5F7] rounded-xl p-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-[#0D0D0D] shadow-sm'
                  : 'text-[#4a4a4a] hover:text-[#0D0D0D]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={openSeasonalDialog}>
            <BellRing size={13} /> Szezonális
          </Button>
          <Button variant="primary" size="sm" onClick={() => setNewOpen(true)}>
            <Plus size={13} /> Új emlékeztető
          </Button>
        </div>
      </div>

      {/* ── Reminders List ── */}
      <Card>
        <CardTitle icon={<Bell size={14} />}>
          Emlékeztetők {activeTab !== 'all' && `– ${FILTER_TABS.find(t => t.key === activeTab)?.label}`}
        </CardTitle>

        {loading ? (
          <div className="py-8 text-center text-[13px] text-[#4a4a4a]">Betöltés...</div>
        ) : filtered.length === 0 ? (
          <div className="py-10 text-center">
            <Bell size={28} className="mx-auto mb-2 text-[#888888]" />
            <p className="text-[13px] text-[#4a4a4a]">Nincs emlékeztető ebben a kategóriában.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(reminder => {
              const dateStyle = dueDateStyle(reminder.due_date)
              const statusStyle = STATUS_STYLES[reminder.status] || STATUS_STYLES.pending
              const channelIcon = CHANNEL_ICONS[reminder.channel] || <Bell size={13} />
              const isOverdue = reminder.due_date ? new Date(reminder.due_date) < new Date() : false

              return (
                <div
                  key={reminder.id}
                  className={`border rounded-xl p-4 transition-all hover:shadow-sm ${
                    isOverdue
                      ? 'border-[#C8102E]/20 bg-[#fff5f5]'
                      : 'border-[rgba(0,0,0,0.10)] bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Channel icon */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        backgroundColor: reminder.channel === 'email' ? '#dbeafe' : reminder.channel === 'whatsapp' ? '#dcfce7' : '#f3e8ff',
                        color: reminder.channel === 'email' ? '#2563eb' : reminder.channel === 'whatsapp' ? '#16a34a' : '#7c3aed',
                      }}
                    >
                      {channelIcon}
                    </div>

                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-[13px] font-semibold text-[#0D0D0D]">{reminder.title}</span>
                            <span
                              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ color: statusStyle.color, backgroundColor: statusStyle.bg }}
                            >
                              {statusStyle.label}
                            </span>
                            {TYPE_LABELS[reminder.type] && reminder.type !== 'custom' && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#F4F5F7] text-[#4a4a4a]">
                                {TYPE_LABELS[reminder.type]}
                              </span>
                            )}
                          </div>

                          {/* Customer + vehicle */}
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#4a4a4a]">
                            {reminder.customer?.full_name && (
                              <span className="font-medium text-[#0D0D0D]">{reminder.customer.full_name}</span>
                            )}
                            {reminder.vehicle && (
                              <span className="flex items-center gap-1">
                                <Car size={11} />
                                {reminder.vehicle.make} {reminder.vehicle.model} · {reminder.vehicle.license_plate}
                              </span>
                            )}
                          </div>

                          {/* Due date */}
                          {reminder.due_date && (
                            <div
                              className="flex items-center gap-1.5 mt-1 text-[12px] font-medium"
                              style={{ color: dateStyle.color }}
                            >
                              <Calendar size={11} />
                              {fmtDate(reminder.due_date)}
                              {dateStyle.label && (
                                <span
                                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                                  style={{
                                    color: dateStyle.color,
                                    backgroundColor: `${dateStyle.color}18`,
                                  }}
                                >
                                  {dateStyle.label}
                                </span>
                              )}
                            </div>
                          )}

                          {reminder.notes && (
                            <p className="text-[11px] text-[#4a4a4a] mt-1 italic line-clamp-1">{reminder.notes}</p>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {reminder.status === 'pending' && (
                            <button
                              onClick={() => markSent(reminder.id)}
                              title="Elküldve"
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#dbeafe] text-[#2563eb] hover:bg-[#bfdbfe] transition-colors"
                            >
                              <Send size={12} />
                            </button>
                          )}
                          {(reminder.status === 'pending' || reminder.status === 'sent' || reminder.status === 'opened' || reminder.status === 'replied') && (
                            <button
                              onClick={() => markBooked(reminder.id)}
                              title="Lefoglalt"
                              className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#dcfce7] text-[#16a34a] hover:bg-[#bbf7d0] transition-colors"
                            >
                              <Check size={12} />
                            </button>
                          )}
                          <button
                            onClick={() => deleteReminder(reminder.id)}
                            title="Törlés"
                            className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#fee2e2] text-[#C8102E] hover:bg-[#fecaca] transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ── New Reminder Modal ── */}
      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="Új emlékeztető"
        footer={
          <>
            <Button variant="secondary" onClick={() => setNewOpen(false)}>Mégse</Button>
            <Button variant="primary" onClick={saveReminder} disabled={saving}>
              {saving ? 'Mentés...' : 'Létrehozás'}
            </Button>
          </>
        }
      >
        <FormGroup>
          <FormLabel>Jármű *</FormLabel>
          <Select value={newForm.vehicle_id} onChange={e => handleVehicleChange(e.target.value)}>
            <option value="">— Válasszon járművet —</option>
            {vehicles.map(v => (
              <option key={v.id} value={v.id}>
                {v.make} {v.model} · {v.license_plate}
              </option>
            ))}
          </Select>
        </FormGroup>

        <div className="grid grid-cols-2 gap-3">
          <FormGroup>
            <FormLabel>Típus</FormLabel>
            <Select value={newForm.type} onChange={e => handleTypeChange(e.target.value)}>
              {REMINDER_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Csatorna</FormLabel>
            <Select value={newForm.channel} onChange={e => setNewForm(f => ({ ...f, channel: e.target.value }))}>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="push">Push</option>
            </Select>
          </FormGroup>
        </div>

        <FormGroup>
          <FormLabel>Cím *</FormLabel>
          <Input
            value={newForm.title}
            onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))}
            placeholder="pl. Olajcsere szükséges"
          />
        </FormGroup>

        <div className="grid grid-cols-2 gap-3">
          <FormGroup>
            <FormLabel>Határidő dátuma</FormLabel>
            <Input
              type="date"
              value={newForm.due_date}
              onChange={e => setNewForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </FormGroup>
          <FormGroup>
            <FormLabel>Határidő (km)</FormLabel>
            <Input
              type="number"
              value={newForm.due_mileage}
              onChange={e => setNewForm(f => ({ ...f, due_mileage: e.target.value }))}
              placeholder="pl. 120000"
            />
          </FormGroup>
        </div>

        <FormGroup>
          <FormLabel>Megjegyzés</FormLabel>
          <Textarea
            value={newForm.notes}
            onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))}
            placeholder="Opcionális megjegyzés..."
          />
        </FormGroup>
      </Modal>

      {/* ── Seasonal Reminder Modal ── */}
      <Modal
        open={seasonalOpen}
        onClose={() => setSeasonalOpen(false)}
        title="Szezonális emlékeztetők létrehozása"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSeasonalOpen(false)}>Mégse</Button>
            <Button
              variant="primary"
              onClick={createSeasonalReminders}
              disabled={seasonalCreating || seasonalPreviewCount === 0}
            >
              {seasonalCreating ? 'Létrehozás...' : `Létrehozás (${seasonalPreviewCount ?? '…'} jármű)`}
            </Button>
          </>
        }
      >
        <div className="space-y-4 py-1">
          <div className="flex items-start gap-3 p-4 bg-[#F4F5F7] rounded-xl">
            <BellRing size={18} className="text-[#C8102E] shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-[#0D0D0D] mb-1">
                {seasonalLabel} emlékeztetők
              </p>
              <p className="text-[12px] text-[#4a4a4a]">
                Az aktuális hónap alapján a rendszer <strong>{seasonalLabel}</strong> típusú emlékeztetőket hoz létre az összes olyan járműhöz, amelyhez még nincs ilyen függőben lévő emlékeztető.
              </p>
            </div>
          </div>

          {seasonalPreviewCount !== null && (
            <div className="flex items-center gap-2 text-[13px]">
              {seasonalPreviewCount === 0 ? (
                <>
                  <CheckCircle size={14} className="text-[#16a34a]" />
                  <span className="text-[#16a34a] font-medium">Minden járműhöz már létezik emlékeztető.</span>
                </>
              ) : (
                <>
                  <AlertCircle size={14} className="text-[#f59e0b]" />
                  <span className="text-[#0D0D0D]">
                    <strong>{seasonalPreviewCount}</strong> új emlékeztető lesz létrehozva.
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
