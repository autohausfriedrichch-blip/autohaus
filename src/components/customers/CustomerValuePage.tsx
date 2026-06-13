'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import {
  Star, Crown, Users, Car, TrendingUp, Award,
  ChevronRight, Edit2, Plus, Search, X, CheckCircle,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CustomerRow {
  id: string
  full_name: string
  phone?: string
  email?: string
  address?: string
  city?: string
  is_vip?: boolean
  notes?: string
  family_account_id?: string | null
  created_at: string
  vehicles: { id: string }[]
  work_orders: { id: string; total_amount: number | null; status: string }[]
  quotes: { id: string; status: string }[]
}

interface CustomerMetrics {
  id: string
  full_name: string
  phone?: string
  is_vip: boolean
  family_account_id?: string | null
  vehicle_count: number
  visit_count: number
  total_spent: number
  avg_order: number
  quote_acceptance: number
  notes?: string
  created_at: string
}

interface FamilyAccount {
  id: string
  name: string
  notes?: string
  members: { id: string; full_name: string; total_spent: number }[]
  total_spending: number
}

interface WorkOrderDetail {
  id: string
  order_number?: string
  scheduled_date?: string
  description?: string
  total_amount?: number | null
  status: string
}

interface Vehicle {
  id: string
  make?: string
  model?: string
  license_plate?: string
  health_score?: number | null
}

interface Reminder {
  id: string
  reminder_type?: string
  due_date?: string
  notes?: string
  status?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const NON_VISIT_STATUSES = ['new_booking', 'cancelled']

function deriveMetrics(c: CustomerRow): CustomerMetrics {
  const visits = c.work_orders.filter(wo => !NON_VISIT_STATUSES.includes(wo.status))
  const visit_count = visits.length
  const total_spent = visits.reduce((s, wo) => s + (wo.total_amount ?? 0), 0)
  const avg_order = visit_count > 0 ? total_spent / visit_count : 0
  const total_quotes = c.quotes.length
  const accepted_quotes = c.quotes.filter(q => q.status === 'accepted').length
  const quote_acceptance = total_quotes > 0 ? (accepted_quotes / total_quotes) * 100 : 0

  return {
    id: c.id,
    full_name: c.full_name,
    phone: c.phone,
    is_vip: c.is_vip ?? false,
    family_account_id: c.family_account_id,
    vehicle_count: c.vehicles.length,
    visit_count,
    total_spent,
    avg_order,
    quote_acceptance,
    notes: c.notes,
    created_at: c.created_at,
  }
}

function autoVipEligible(m: CustomerMetrics): boolean {
  return m.visit_count >= 5 || m.total_spent >= 2500
}

// ─── Customer Detail Modal ────────────────────────────────────────────────────

interface DetailModalProps {
  customerId: string
  onClose: () => void
  onUpdated: () => void
  allCustomers: CustomerMetrics[]
  familyAccounts: FamilyAccount[]
}

function CustomerDetailModal({
  customerId,
  onClose,
  onUpdated,
  allCustomers,
  familyAccounts,
}: DetailModalProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [customer, setCustomer] = useState<any>(null)
  const [recentOrders, setRecentOrders] = useState<WorkOrderDetail[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [selectedFamily, setSelectedFamily] = useState<string>('')
  const [savingFamily, setSavingFamily] = useState(false)

  const load = useCallback(async () => {
    const [{ data: cust }, { data: orders }, { data: veh }, { data: rem }] = await Promise.all([
      supabase.from('customers').select('*').eq('id', customerId).single(),
      supabase.from('work_orders').select('id,order_number,scheduled_date,description,total_amount,status')
        .eq('customer_id', customerId).order('scheduled_date', { ascending: false }).limit(5),
      supabase.from('vehicles').select('id,make,model,license_plate,health_score').eq('customer_id', customerId),
      supabase.from('maintenance_reminders').select('id,reminder_type,due_date,notes,status').eq('customer_id', customerId).limit(5),
    ])
    setCustomer(cust)
    setNotes(cust?.notes || '')
    setSelectedFamily(cust?.family_account_id || '')
    setRecentOrders((orders as WorkOrderDetail[]) || [])
    setVehicles((veh as Vehicle[]) || [])
    setReminders((rem as Reminder[]) || [])
  }, [customerId])

  useEffect(() => { load() }, [load])

  const saveNotes = async () => {
    setSavingNotes(true)
    const { error } = await supabase.from('customers').update({ notes }).eq('id', customerId)
    if (error) toast('Hiba a mentés során', 'error')
    else { toast('Megjegyzések mentve'); onUpdated() }
    setSavingNotes(false)
  }

  const saveFamily = async () => {
    setSavingFamily(true)
    const { error } = await supabase.from('customers').update({
      family_account_id: selectedFamily || null,
    }).eq('id', customerId)
    if (error) toast('Hiba a mentés során', 'error')
    else { toast('Családi fiók frissítve'); onUpdated() }
    setSavingFamily(false)
  }

  if (!customer) {
    return (
      <Modal open onClose={onClose} title="Ügyfél részletei">
        <div className="py-10 text-center text-[#4a4a4a]">Betöltés...</div>
      </Modal>
    )
  }

  const metrics = allCustomers.find(m => m.id === customerId)
  const profit = (metrics?.total_spent ?? 0) * 0.35

  return (
    <Modal open onClose={onClose} title={customer.full_name} className="max-w-2xl">
      <div className="space-y-5">
        {/* Personal info */}
        <div className="grid grid-cols-2 gap-3 text-[13px]">
          <div>
            <div className="text-[11px] text-[#4a4a4a] font-semibold uppercase tracking-wide mb-1">Elérhetőség</div>
            <div className="text-[#0D0D0D]">{customer.phone || '–'}</div>
            {customer.email && <div className="text-[#4a4a4a]">{customer.email}</div>}
            {customer.city && <div className="text-[#4a4a4a]">{customer.city}</div>}
          </div>
          <div>
            <div className="text-[11px] text-[#4a4a4a] font-semibold uppercase tracking-wide mb-1">Státusz</div>
            <div className="flex flex-wrap gap-1.5">
              {customer.is_vip && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-[#C8102E]/15 text-[#8a6a00] font-bold px-2 py-0.5 rounded-full">
                  <Star size={10} /> VIP
                </span>
              )}
              {customer.family_account_id && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                  <Users size={10} /> Családi fiók
                </span>
              )}
              {autoVipEligible(metrics!) && !customer.is_vip && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">
                  <Award size={10} /> VIP-jogosult
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Összes költés', value: formatCurrency(metrics?.total_spent ?? 0), color: 'text-[#0D0D0D]' },
            { label: 'Átl. munkalap', value: formatCurrency(metrics?.avg_order ?? 0), color: 'text-[#0D0D0D]' },
            { label: 'Nyereség (35%)', value: formatCurrency(profit), color: 'text-[#16a34a]' },
          ].map(item => (
            <div key={item.label} className="bg-[#F4F5F7] rounded-xl p-3 text-center">
              <div className="text-[10px] text-[#4a4a4a] mb-0.5">{item.label}</div>
              <div className={`text-[14px] font-bold ${item.color}`}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* Recent work orders */}
        <div>
          <div className="text-[11px] text-[#4a4a4a] font-semibold uppercase tracking-wide mb-2">Utóbbi munkák</div>
          {recentOrders.length === 0 ? (
            <div className="text-[12px] text-[#888888] py-2">Nincs rögzített munka</div>
          ) : (
            <div className="space-y-1.5">
              {recentOrders.map(wo => (
                <div key={wo.id} className="flex items-center justify-between py-1.5 border-b border-[rgba(0,0,0,0.06)] text-[12px]">
                  <div>
                    <span className="font-medium text-[#0D0D0D]">{wo.order_number || wo.id.slice(0, 8)}</span>
                    {wo.scheduled_date && (
                      <span className="text-[#4a4a4a] ml-2">{formatDate(wo.scheduled_date)}</span>
                    )}
                    {wo.description && (
                      <div className="text-[11px] text-[#888888] truncate max-w-[200px]">{wo.description}</div>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="font-semibold text-[#0D0D0D]">{formatCurrency(wo.total_amount ?? 0)}</div>
                    <div className={`text-[10px] font-semibold ${wo.status === 'completed' ? 'text-[#16a34a]' : 'text-[#4a4a4a]'}`}>
                      {wo.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vehicles */}
        <div>
          <div className="text-[11px] text-[#4a4a4a] font-semibold uppercase tracking-wide mb-2">Járművek</div>
          {vehicles.length === 0 ? (
            <div className="text-[12px] text-[#888888] py-2">Nincs rögzített jármű</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {vehicles.map(v => (
                <div key={v.id} className="flex items-center gap-2 bg-[#F4F5F7] rounded-lg px-3 py-1.5 text-[12px]">
                  <Car size={12} className="text-[#C8102E]" />
                  <span className="font-medium text-[#0D0D0D]">{[v.make, v.model].filter(Boolean).join(' ') || 'Ismeretlen'}</span>
                  {v.license_plate && <span className="text-[#4a4a4a]">{v.license_plate}</span>}
                  {v.health_score != null && (
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${v.health_score >= 70 ? 'bg-green-100 text-green-700' : v.health_score >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {v.health_score}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reminders */}
        {reminders.length > 0 && (
          <div>
            <div className="text-[11px] text-[#4a4a4a] font-semibold uppercase tracking-wide mb-2">Következő emlékeztetők</div>
            <div className="space-y-1.5">
              {reminders.map(r => (
                <div key={r.id} className="flex items-center gap-2 text-[12px]">
                  <CheckCircle size={12} className="text-[#C8102E] shrink-0" />
                  <span className="text-[#0D0D0D] font-medium">{r.reminder_type || 'Emlékeztető'}</span>
                  {r.due_date && <span className="text-[#4a4a4a]">{formatDate(r.due_date)}</span>}
                  {r.notes && <span className="text-[#888888] truncate">{r.notes}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] text-[#4a4a4a] font-semibold uppercase tracking-wide">Megjegyzések</div>
            <Button variant="secondary" size="sm" onClick={saveNotes} disabled={savingNotes}>
              <Edit2 size={11} /> {savingNotes ? 'Mentés...' : 'Mentés'}
            </Button>
          </div>
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Belső megjegyzések az ügyfélről..."
          />
        </div>

        {/* Family account selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-[11px] text-[#4a4a4a] font-semibold uppercase tracking-wide">Családi fiók</div>
            <Button variant="secondary" size="sm" onClick={saveFamily} disabled={savingFamily}>
              <Users size={11} /> {savingFamily ? 'Mentés...' : 'Hozzárendelés'}
            </Button>
          </div>
          <Select value={selectedFamily} onChange={e => setSelectedFamily(e.target.value)}>
            <option value="">– Nincs családi fiók –</option>
            {familyAccounts.map(fa => (
              <option key={fa.id} value={fa.id}>{fa.name}</option>
            ))}
          </Select>
        </div>
      </div>
    </Modal>
  )
}

// ─── Family Accounts Section ──────────────────────────────────────────────────

interface FamilySectionProps {
  familyAccounts: FamilyAccount[]
  allCustomers: CustomerMetrics[]
  onRefreshFamilies: () => void
}

function FamilyAccountsSection({ familyAccounts, allCustomers, onRefreshFamilies }: FamilySectionProps) {
  const supabase = createClient()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const createFamily = async () => {
    if (!newName.trim()) { toast('Adj meg egy nevet', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('family_accounts').insert({ name: newName.trim(), notes: newNotes || null })
    if (error) toast('Hiba: ' + error.message, 'error')
    else { toast('Családi fiók létrehozva'); setCreateOpen(false); setNewName(''); setNewNotes(''); onRefreshFamilies() }
    setSaving(false)
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <CardTitle icon={<Users size={14} />}>Családi fiókok</CardTitle>
        <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus size={13} /> Új fiók
        </Button>
      </div>

      {familyAccounts.length === 0 ? (
        <div className="text-center py-8 text-[#888888] text-[13px]">Nincs még családi fiók</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {familyAccounts.map(fa => (
            <div key={fa.id} className="border border-[rgba(0,0,0,0.10)] rounded-xl p-3 bg-[#F4F5F7]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-[#C8102E]" />
                  <span className="font-semibold text-[13px] text-[#0D0D0D]">{fa.name}</span>
                </div>
                <span className="text-[12px] font-bold text-[#C8102E]">{formatCurrency(fa.total_spending)}</span>
              </div>
              <div className="space-y-1">
                {fa.members.map(m => (
                  <div key={m.id} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#4a4a4a]">{m.full_name}</span>
                    <span className="text-[#0D0D0D] font-medium">{formatCurrency(m.total_spent)}</span>
                  </div>
                ))}
                {fa.members.length === 0 && (
                  <div className="text-[11px] text-[#888888]">Nincs tag hozzárendelve</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <Modal open onClose={() => setCreateOpen(false)} title="Új családi fiók"
          footer={
            <>
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>Mégse</Button>
              <Button variant="primary" onClick={createFamily} disabled={saving}>{saving ? 'Mentés...' : 'Létrehozás'}</Button>
            </>
          }
        >
          <div className="space-y-3">
            <FormGroup className="mb-0">
              <FormLabel>Fiók neve *</FormLabel>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="pl. Kovács família" />
            </FormGroup>
            <FormGroup className="mb-0">
              <FormLabel>Megjegyzés</FormLabel>
              <Textarea value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Opcionális megjegyzés..." />
            </FormGroup>
          </div>
        </Modal>
      )}
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CustomerValuePage({
  refreshKey,
  onRefresh,
}: {
  refreshKey: number
  onRefresh: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const [rawCustomers, setRawCustomers] = useState<CustomerRow[]>([])
  const [metrics, setMetrics] = useState<CustomerMetrics[]>([])
  const [familyAccounts, setFamilyAccounts] = useState<FamilyAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [vipOnly, setVipOnly] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [updatingVip, setUpdatingVip] = useState<string | null>(null)

  // ── Load customers ─────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('customers')
      .select('*, vehicles:vehicles(id), work_orders:work_orders(id,total_amount,status), quotes:quotes(id,status)')
      .order('full_name')

    const rows = (data as CustomerRow[]) || []
    setRawCustomers(rows)
    setMetrics(rows.map(deriveMetrics))
    setLoading(false)
  }, [refreshKey])

  // ── Load family accounts ───────────────────────────────────────────────────
  const loadFamilies = useCallback(async () => {
    try {
      const { data: faData } = await supabase.from('family_accounts').select('id,name,notes')
      if (!faData) return

      const { data: custData } = await supabase
        .from('customers')
        .select('id,full_name,family_account_id,work_orders:work_orders(total_amount,status)')
        .not('family_account_id', 'is', null)

      const families: FamilyAccount[] = faData.map((fa: any) => {
        const members = (custData || [])
          .filter((c: any) => c.family_account_id === fa.id)
          .map((c: any) => {
            const spent = (c.work_orders || [])
              .filter((wo: any) => !NON_VISIT_STATUSES.includes(wo.status))
              .reduce((s: number, wo: any) => s + (wo.total_amount ?? 0), 0)
            return { id: c.id, full_name: c.full_name, total_spent: spent }
          })
        const total_spending = members.reduce((s, m) => s + m.total_spent, 0)
        return { id: fa.id, name: fa.name, notes: fa.notes, members, total_spending }
      })
      setFamilyAccounts(families)
    } catch (_) {
      // family_accounts table may not exist yet
    }
  }, [refreshKey])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadFamilies() }, [loadFamilies])

  // ── VIP toggle ─────────────────────────────────────────────────────────────
  const toggleVip = async (id: string, current: boolean) => {
    setUpdatingVip(id)
    const { error } = await supabase.from('customers').update({ is_vip: !current }).eq('id', id)
    if (error) {
      toast('Hiba a VIP frissítésekor', 'error')
    } else {
      toast(current ? 'VIP státusz eltávolítva' : 'VIP státusz hozzáadva')
      setMetrics(prev => prev.map(m => m.id === id ? { ...m, is_vip: !current } : m))
    }
    setUpdatingVip(null)
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  const filtered = metrics.filter(m => {
    if (vipOnly && !m.is_vip) return false
    if (search) {
      const q = search.toLowerCase()
      return m.full_name.toLowerCase().includes(q) || (m.phone || '').includes(q)
    }
    return true
  })

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in space-y-4">
      {/* Auto-VIP rule banner */}
      <div className="flex items-center gap-2.5 bg-[#C8102E]/10 border border-[#C8102E]/30 rounded-xl px-4 py-2.5">
        <Award size={15} className="text-[#C8102E] shrink-0" />
        <span className="text-[12px] text-[#7a5c00] font-medium">
          <strong>VIP szabály:</strong> 5+ látogatás VAGY 2 500 CHF+ költés esetén automatikus VIP jelölés
        </span>
      </div>

      {/* Search + VIP filter */}
      <div className="flex flex-wrap gap-2.5 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Keresés név, telefon alapján..."
            className="w-full pl-9 pr-3 py-2 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0D0D0D]"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#888888] hover:text-[#0D0D0D]">
              <X size={13} />
            </button>
          )}
        </div>
        <button
          onClick={() => setVipOnly(v => !v)}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[12px] font-semibold transition-colors ${
            vipOnly
              ? 'bg-[#C8102E] text-[#0D0D0D] border-[#C8102E]'
              : 'bg-white text-[#4a4a4a] border-[rgba(0,0,0,0.18)] hover:bg-[#F4F5F7]'
          }`}
        >
          <Star size={13} /> Csak VIP
        </button>
      </div>

      {/* Customer value table */}
      {loading ? (
        <Card>
          <div className="text-center py-12 text-[#4a4a4a] text-sm">Betöltés...</div>
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-[#F4F5F7] border-b border-[rgba(0,0,0,0.10)]">
                  {[
                    'Ügyfél neve', 'Járművek', 'Látogatások', 'Összes költés',
                    'Átl. munkalap', 'Ajánlat %', 'VIP', 'Műveletek',
                  ].map(col => (
                    <th key={col} className="text-left px-4 py-3 text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const isFleet = !!(rawCustomers.find(c => c.id === m.id) as any)?.fleet_id
                  const eligible = autoVipEligible(m)
                  return (
                    <tr
                      key={m.id}
                      className="border-b border-[rgba(0,0,0,0.06)] hover:bg-[#fafbfc] transition-colors cursor-pointer"
                      onClick={() => setDetailId(m.id)}
                    >
                      {/* Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-[#0D0D0D]">{m.full_name}</span>
                          {m.is_vip && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-[#C8102E]/15 text-[#8a6a00] font-bold px-1.5 py-0.5 rounded-full">
                              <Star size={9} fill="currentColor" /> VIP
                            </span>
                          )}
                          {isFleet && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded-full">
                              <Crown size={9} /> Flotta
                            </span>
                          )}
                          {eligible && !m.is_vip && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-100 text-amber-700 font-semibold px-1.5 py-0.5 rounded-full">
                              <Award size={9} /> Jogosult
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Vehicles */}
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[#0D0D0D]">
                          <Car size={12} className="text-[#C8102E]" /> {m.vehicle_count}
                        </span>
                      </td>

                      {/* Visits */}
                      <td className="px-4 py-3">
                        <span className="font-medium text-[#0D0D0D]">{m.visit_count}</span>
                      </td>

                      {/* Total spent */}
                      <td className="px-4 py-3">
                        <span className={`font-bold ${m.total_spent >= 2500 ? 'text-[#C8102E]' : 'text-[#0D0D0D]'}`}>
                          {formatCurrency(m.total_spent)}
                        </span>
                      </td>

                      {/* Avg order */}
                      <td className="px-4 py-3 text-[#4a4a4a]">
                        {m.visit_count > 0 ? formatCurrency(m.avg_order) : '–'}
                      </td>

                      {/* Quote acceptance */}
                      <td className="px-4 py-3">
                        {m.quote_acceptance > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 h-1.5 bg-[rgba(0,0,0,0.10)] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#16a34a]"
                                style={{ width: `${Math.min(m.quote_acceptance, 100)}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-semibold text-[#0D0D0D]">
                              {m.quote_acceptance.toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-[#888888]">–</span>
                        )}
                      </td>

                      {/* VIP toggle */}
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => toggleVip(m.id, m.is_vip)}
                          disabled={updatingVip === m.id}
                          title={m.is_vip ? 'VIP eltávolítása' : 'VIP hozzáadása'}
                          className={`w-8 h-5 rounded-full transition-colors relative ${
                            m.is_vip ? 'bg-[#C8102E]' : 'bg-[rgba(0,0,0,0.15)]'
                          } disabled:opacity-50`}
                        >
                          <span
                            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                              m.is_vip ? 'translate-x-3.5' : 'translate-x-0.5'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailId(m.id)}
                          className="p-1.5 text-[#4a4a4a] hover:text-[#0D0D0D] transition-colors"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="text-center py-10 text-[#888888] text-[13px]">
                {search || vipOnly ? 'Nincs találat' : 'Nincsenek ügyfelek'}
              </div>
            )}
          </div>

          {/* Table footer */}
          {filtered.length > 0 && (
            <div className="flex items-center gap-4 px-4 py-3 border-t border-[rgba(0,0,0,0.08)] bg-[#F4F5F7] text-[11px] text-[#4a4a4a]">
              <span><strong className="text-[#0D0D0D]">{filtered.length}</strong> ügyfél</span>
              <span>
                Összes forgalom:{' '}
                <strong className="text-[#C8102E]">
                  {formatCurrency(filtered.reduce((s, m) => s + m.total_spent, 0))}
                </strong>
              </span>
              <span>
                VIP ügyfelek: <strong className="text-[#0D0D0D]">{filtered.filter(m => m.is_vip).length}</strong>
              </span>
            </div>
          )}
        </Card>
      )}

      {/* Family accounts section */}
      <FamilyAccountsSection
        familyAccounts={familyAccounts}
        allCustomers={metrics}
        onRefreshFamilies={loadFamilies}
      />

      {/* Detail modal */}
      {detailId && (
        <CustomerDetailModal
          customerId={detailId}
          onClose={() => setDetailId(null)}
          onUpdated={() => { load(); loadFamilies(); }}
          allCustomers={metrics}
          familyAccounts={familyAccounts}
        />
      )}
    </div>
  )
}
