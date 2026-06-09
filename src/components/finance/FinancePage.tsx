'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, FormGroup, FormLabel, Textarea } from '@/components/ui/form'
import { generatePDF } from '@/lib/pdf/generatePDF'
import {
  DollarSign, TrendingUp, TrendingDown, AlertCircle, Clock, CheckCircle,
  FileText, CreditCard, BarChart2, Settings, Plus, Download, Send,
  MessageCircle, RefreshCw, ChevronRight, X, Building2, Users, Wrench,
  Search, Filter, Eye, Edit2, Trash2, Check
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type Tab = 'dashboard' | 'invoices' | 'payments' | 'receivables' | 'expenses' | 'revenue' | 'reports' | 'fleet_billing' | 'settings'

type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled'
type PaymentMethod = 'cash' | 'bank_transfer' | 'twint' | 'card' | 'qr_invoice' | 'fleet'
type ExpenseCategory = 'parts' | 'consumable' | 'fuel' | 'marketing' | 'tool' | 'insurance' | 'rent' | 'software' | 'other'

interface Invoice {
  id: string
  invoice_number: string
  work_order_id?: string
  customer_id: string
  vehicle_id?: string
  status: InvoiceStatus
  issue_date: string
  due_date?: string
  subtotal: number
  vat_rate: number
  vat_amount: number
  total_amount: number
  paid_amount: number
  balance_due: number
  payment_method?: string
  iban?: string
  notes?: string
  items: any[]
  fleet_account_id?: string
  reminder_count?: number
  reminder_sent_at?: string
  created_at: string
  customer?: any
  vehicle?: any
  work_order?: any
}

interface Payment {
  id: string
  invoice_id?: string
  work_order_id?: string
  customer_id?: string
  amount: number
  payment_method: PaymentMethod
  payment_date: string
  reference?: string
  notes?: string
  created_at: string
  customer?: any
  invoice?: any
}

interface Expense {
  id: string
  category: ExpenseCategory
  supplier?: string
  amount: number
  expense_date: string
  notes?: string
  receipt_url?: string
  work_order_id?: string
  created_at: string
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Tervezet',        color: 'text-gray-600',    bg: 'bg-gray-100' },
  sent:      { label: 'Kiküldve',        color: 'text-blue-600',    bg: 'bg-blue-50' },
  partial:   { label: 'Részben fizetve', color: 'text-amber-600',   bg: 'bg-amber-50' },
  paid:      { label: 'Fizetve',         color: 'text-emerald-600', bg: 'bg-emerald-50' },
  overdue:   { label: 'Lejárt',          color: 'text-red-600',     bg: 'bg-red-50' },
  cancelled: { label: 'Törölve',         color: 'text-gray-400',    bg: 'bg-gray-50' },
}

const PAYMENT_METHODS: Record<PaymentMethod, string> = {
  cash: 'Készpénz', bank_transfer: 'Banki átutalás', twint: 'TWINT',
  card: 'Bankkártya', qr_invoice: 'QR-számla', fleet: 'Flotta fizetés',
}

const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  parts: 'Alkatrész', consumable: 'Fogyóanyag', fuel: 'Üzemanyag',
  marketing: 'Marketing', tool: 'Szerszám', insurance: 'Biztosítás',
  rent: 'Bérleti díj', software: 'Szoftver', other: 'Egyéb',
}

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'dashboard',     label: 'Dashboard',        icon: DollarSign },
  { id: 'invoices',      label: 'Számlák',           icon: FileText },
  { id: 'payments',      label: 'Fizetések',         icon: CreditCard },
  { id: 'receivables',   label: 'Kintlévőségek',     icon: AlertCircle },
  { id: 'expenses',      label: 'Költségek',         icon: TrendingDown },
  { id: 'revenue',       label: 'Bevételek',         icon: TrendingUp },
  { id: 'reports',       label: 'Riportok',          icon: BarChart2 },
  { id: 'fleet_billing', label: 'Flotta számlázás',  icon: Building2 },
  { id: 'settings',      label: 'Beállítások',       icon: Settings },
]

const REMINDER_TEMPLATES = {
  first:  { subject: 'Számla emlékeztető – Autohaus Friedrich', body: (inv: Invoice) => `Tisztelt Ügyfelünk!\n\nEmlékeztetjük, hogy a ${inv.invoice_number} számú számlájának összege (CHF ${inv.balance_due.toFixed(2)}) még nem érkezett be.\nFizetési határidő: ${inv.due_date || '—'}\n\nKöszönjük!\nAutohaus Friedrich` },
  second: { subject: '2. emlékeztető – Autohaus Friedrich', body: (inv: Invoice) => `Tisztelt Ügyfelünk!\n\nMásodszor hívjuk fel figyelmét a ${inv.invoice_number} számú, CHF ${inv.balance_due.toFixed(2)} összegű lejárt számla rendezésére.\n\nKérjük, mielőbb intézkedjen!\nAutohaus Friedrich` },
  final:  { subject: 'Utolsó felszólítás – Autohaus Friedrich', body: (inv: Invoice) => `Tisztelt Ügyfelünk!\n\nUtolsó felszólítás a ${inv.invoice_number} számú, CHF ${inv.balance_due.toFixed(2)} összegű számla rendezésére.\nAmennyiben 5 munkanapon belül nem érkezik be a fizetés, jogi lépéseket vagyunk kénytelenek tenni.\n\nAutohaus Friedrich` },
}

function chf(n: number) { return `CHF ${n.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function StatusBadge({ status }: { status: InvoiceStatus }) {
  const c = STATUS_CFG[status]
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.color} ${c.bg}`}>{c.label}</span>
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function FinancePage({ refreshKey, onRefresh, profile }: { refreshKey: number; onRefresh: () => void; profile?: any }) {
  const supabase = createClient()
  const { toast } = useToast()
  const isAdmin = !profile || profile.role !== 'mechanic'

  const [tab, setTab] = useState<Tab>('dashboard')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [fleetAccounts, setFleetAccounts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')

  // Modals
  const [newInvoiceModal, setNewInvoiceModal] = useState(false)
  const [newPaymentModal, setNewPaymentModal] = useState(false)
  const [newExpenseModal, setNewExpenseModal] = useState(false)
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null)
  const [reminderInvoice, setReminderInvoice] = useState<Invoice | null>(null)
  const [reminderType, setReminderType] = useState<'first' | 'second' | 'final'>('first')
  const [reportPeriod, setReportPeriod] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month')

  // Forms
  const [invForm, setInvForm] = useState({ customer_id: '', work_order_id: '', notes: '', due_date: '', payment_method: 'bank_transfer', iban: 'CH56 0483 5012 3456 7800 9' })
  const [payForm, setPayForm] = useState({ invoice_id: '', amount: '', payment_method: 'cash' as PaymentMethod, payment_date: new Date().toISOString().split('T')[0], reference: '', notes: '' })
  const [expForm, setExpForm] = useState({ category: 'parts' as ExpenseCategory, supplier: '', amount: '', expense_date: new Date().toISOString().split('T')[0], notes: '', work_order_id: '' })
  const [saving, setSaving] = useState(false)

  // Settings
  const [settings, setSettings] = useState({ iban: 'CH56 0483 5012 3456 7800 9', vat_rate: '7.7', payment_days: '30', company_name: 'Autohaus Friedrich', company_address: 'Zürich, Schweiz', mwst_nr: 'CHE-123.456.789 MWST' })

  const load = useCallback(async () => {
    setLoading(true)
    const [invRes, payRes, expRes, woRes, custRes, fleetRes] = await Promise.all([
      supabase.from('invoices').select('*, customers(full_name,phone,email), vehicles(make,model,plate), work_orders(order_number)').order('created_at', { ascending: false }),
      supabase.from('payments').select('*, customers(full_name), invoices(invoice_number)').order('payment_date', { ascending: false }).limit(100),
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }).limit(200),
      supabase.from('work_orders').select('id,order_number,total_amount,labor_cost,parts_cost,status,customers(full_name),vehicles(make,model,plate)').not('status','in','(new_booking,cancelled)').order('created_at',{ascending:false}).limit(100),
      supabase.from('customers').select('id,full_name,phone,email').order('full_name').limit(200),
      supabase.from('fleet_accounts').select('*').order('company_name'),
    ])
    setInvoices(invRes.data || [])
    setPayments(payRes.data || [])
    setExpenses(expRes.data || [])
    setWorkOrders(woRes.data || [])
    setCustomers(custRes.data || [])
    setFleetAccounts(fleetRes.data || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  // ─── Computed Stats ──────────────────────────────────────────────────────

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

  const paidPayments = payments.filter(p => p.payment_date >= monthStart)
  const monthRevenue = paidPayments.reduce((s, p) => s + p.amount, 0)
  const todayRevenue = payments.filter(p => p.payment_date === today).reduce((s, p) => s + p.amount, 0)
  const weekRevenue = payments.filter(p => p.payment_date >= weekAgo).reduce((s, p) => s + p.amount, 0)
  const monthExpenses = expenses.filter(e => e.expense_date >= monthStart).reduce((s, e) => s + e.amount, 0)
  const monthProfit = monthRevenue - monthExpenses
  const profitPct = monthRevenue > 0 ? (monthProfit / monthRevenue * 100) : 0
  const totalReceivables = invoices.filter(i => i.status === 'sent' || i.status === 'partial' || i.status === 'overdue').reduce((s, i) => s + i.balance_due, 0)
  const activeWOValue = workOrders.filter(w => !['delivered','closed','ready'].includes(w.status)).reduce((s, w) => s + (w.total_amount || 0), 0)

  // ─── Actions ─────────────────────────────────────────────────────────────

  const createInvoice = async () => {
    if (!invForm.customer_id) { toast('Válassz ügyfelet!', 'error'); return }
    setSaving(true)
    const wo = workOrders.find(w => w.id === invForm.work_order_id)
    const subtotal = wo ? (wo.labor_cost || 0) + (wo.parts_cost || 0) : 0
    const vatRate = parseFloat(settings.vat_rate) || 7.7
    const vatAmount = subtotal * vatRate / 100
    const total = subtotal + vatAmount
    const items = wo ? [
      ...(wo.labor_cost > 0 ? [{ name: 'Munkadíj', quantity: 1, unit_price: wo.labor_cost }] : []),
      ...(wo.parts_cost > 0 ? [{ name: 'Alkatrészek', quantity: 1, unit_price: wo.parts_cost }] : []),
    ] : []
    const dueDate = invForm.due_date || new Date(Date.now() + parseInt(settings.payment_days) * 86400000).toISOString().split('T')[0]
    const { error } = await supabase.from('invoices').insert({
      customer_id: invForm.customer_id,
      work_order_id: invForm.work_order_id || null,
      vehicle_id: wo?.vehicles?.id || null,
      subtotal, vat_rate: vatRate, vat_amount: vatAmount, total_amount: total, balance_due: total,
      due_date: dueDate,
      payment_method: invForm.payment_method,
      iban: invForm.iban || settings.iban,
      notes: invForm.notes,
      items,
    })
    if (error) { toast(`Hiba: ${error.message}`, 'error'); setSaving(false); return }
    toast('Számla létrehozva')
    setNewInvoiceModal(false)
    setInvForm({ customer_id: '', work_order_id: '', notes: '', due_date: '', payment_method: 'bank_transfer', iban: settings.iban })
    setSaving(false)
    load()
  }

  const recordPayment = async () => {
    if (!payForm.amount || parseFloat(payForm.amount) <= 0) { toast('Add meg az összeget!', 'error'); return }
    setSaving(true)
    const amount = parseFloat(payForm.amount)
    const inv = invoices.find(i => i.id === payForm.invoice_id)
    const { error } = await supabase.from('payments').insert({
      invoice_id: payForm.invoice_id || null,
      work_order_id: inv?.work_order_id || null,
      customer_id: inv?.customer_id || null,
      amount, payment_method: payForm.payment_method,
      payment_date: payForm.payment_date,
      reference: payForm.reference, notes: payForm.notes,
    })
    if (error) { toast(`Hiba: ${error.message}`, 'error'); setSaving(false); return }

    // Update invoice
    if (inv) {
      const newPaid = inv.paid_amount + amount
      const newBalance = Math.max(0, inv.total_amount - newPaid)
      const newStatus: InvoiceStatus = newBalance <= 0 ? 'paid' : 'partial'
      await supabase.from('invoices').update({ paid_amount: newPaid, balance_due: newBalance, status: newStatus, paid_at: newBalance <= 0 ? new Date().toISOString() : null }).eq('id', inv.id)
    }
    toast('Fizetés rögzítve')
    setNewPaymentModal(false)
    setPayInvoice(null)
    setPayForm({ invoice_id: '', amount: '', payment_method: 'cash', payment_date: new Date().toISOString().split('T')[0], reference: '', notes: '' })
    setSaving(false)
    load()
    onRefresh()
  }

  const addExpense = async () => {
    if (!expForm.amount || parseFloat(expForm.amount) <= 0) { toast('Add meg az összeget!', 'error'); return }
    setSaving(true)
    const { error } = await supabase.from('expenses').insert({
      category: expForm.category, supplier: expForm.supplier || null,
      amount: parseFloat(expForm.amount), expense_date: expForm.expense_date,
      notes: expForm.notes || null, work_order_id: expForm.work_order_id || null,
    })
    if (error) { toast(`Hiba: ${error.message}`, 'error'); setSaving(false); return }
    toast('Költség rögzítve')
    setNewExpenseModal(false)
    setExpForm({ category: 'parts', supplier: '', amount: '', expense_date: new Date().toISOString().split('T')[0], notes: '', work_order_id: '' })
    setSaving(false)
    load()
  }

  const markSent = async (inv: Invoice) => {
    await supabase.from('invoices').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', inv.id)
    toast('Számla kiküldve jelölve')
    load()
  }

  const sendReminder = async () => {
    if (!reminderInvoice) return
    const tmpl = REMINDER_TEMPLATES[reminderType]
    const wa = reminderInvoice.customer?.phone?.replace(/\s+/g,'').replace(/^\+/,'') || ''
    const msg = encodeURIComponent(tmpl.body(reminderInvoice))
    window.open(`https://wa.me/${wa}?text=${msg}`, '_blank')
    await supabase.from('invoices').update({ reminder_sent_at: new Date().toISOString(), reminder_count: (reminderInvoice.reminder_count || 0) + 1 }).eq('id', reminderInvoice.id)
    await supabase.from('notifications').insert({ title: 'Emlékeztető elküldve', message: `${reminderInvoice.invoice_number} – ${reminderInvoice.customer?.full_name}`, type: 'payment_reminder', priority: 'normal', action_type: 'open_invoice', action_id: reminderInvoice.id })
    toast('Emlékeztető elküldve, naplózva')
    setReminderInvoice(null)
    load()
  }

  const downloadInvoicePDF = (inv: Invoice) => {
    const data = {
      invoice_number: inv.invoice_number, order_number: inv.invoice_number,
      invoice_date: inv.issue_date, due_date: inv.due_date,
      payment_status: inv.status, iban: inv.iban || settings.iban,
      subtotal: inv.subtotal, vat_rate: inv.vat_rate, vat: inv.vat_amount, total_amount: inv.total_amount,
      items: inv.items,
      customer: inv.customer, vehicle: inv.vehicle,
    }
    generatePDF('invoice', data, inv.invoice_number)
  }

  const generateFleetInvoice = async (fleet: any) => {
    const fleetWOs = workOrders.filter(w => w.fleet_account_id === fleet.id && !invoices.find(i => i.work_order_id === w.id && i.status !== 'cancelled'))
    if (fleetWOs.length === 0) { toast('Nincs számlázatlan munkalap ehhez a flottához', 'error'); return }
    const subtotal = fleetWOs.reduce((s: number, w: any) => s + (w.total_amount || 0), 0)
    const discount = fleet.discount_pct ? subtotal * fleet.discount_pct / 100 : 0
    const net = subtotal - discount
    const vat = net * 0.077
    const total = net + vat
    // Find a customer for this fleet
    const { data: fleetCustomers } = await supabase.from('customers').select('id').eq('fleet_account_id', fleet.id).limit(1)
    if (!fleetCustomers || fleetCustomers.length === 0) { toast('Nincs ügyfél hozzárendelve ehhez a flottához', 'error'); return }
    const { error } = await supabase.from('invoices').insert({
      customer_id: fleetCustomers[0].id,
      fleet_account_id: fleet.id,
      subtotal: net, vat_rate: 7.7, vat_amount: vat, total_amount: total, balance_due: total,
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      notes: `Flotta havi összesítő: ${fleet.company_name}`,
      items: fleetWOs.map((w: any) => ({ name: w.order_number, quantity: 1, unit_price: w.total_amount })),
    })
    if (error) { toast(`Hiba: ${error.message}`, 'error'); return }
    toast(`Flotta számla létrehozva: ${fleetWOs.length} munkalap, ${chf(total)}`)
    load()
  }

  // ─── Filtered lists ──────────────────────────────────────────────────────

  const filteredInvoices = invoices.filter(i => {
    const matchSearch = !search || i.invoice_number.toLowerCase().includes(search.toLowerCase()) || i.customer?.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || i.status === statusFilter
    return matchSearch && matchStatus
  })

  const overdueInvoices = invoices.filter(i => {
    if (i.status === 'paid' || i.status === 'cancelled') return false
    if (!i.due_date) return false
    return i.due_date < today && i.balance_due > 0
  })

  // ─── Reports ─────────────────────────────────────────────────────────────

  const getReportData = () => {
    const now = new Date()
    let start: Date
    switch (reportPeriod) {
      case 'day': start = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break
      case 'week': start = new Date(now.getTime() - 7 * 86400000); break
      case 'month': start = new Date(now.getFullYear(), now.getMonth(), 1); break
      case 'quarter': start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1); break
      case 'year': start = new Date(now.getFullYear(), 0, 1); break
    }
    const startStr = start.toISOString().split('T')[0]
    const periodPay = payments.filter(p => p.payment_date >= startStr)
    const periodExp = expenses.filter(e => e.expense_date >= startStr)
    const revenue = periodPay.reduce((s, p) => s + p.amount, 0)
    const cost = periodExp.reduce((s, e) => s + e.amount, 0)
    const profit = revenue - cost
    const pct = revenue > 0 ? profit / revenue * 100 : 0
    const byMethod = Object.entries(PAYMENT_METHODS).map(([k, label]) => ({
      label, amount: periodPay.filter(p => p.payment_method === k).reduce((s, p) => s + p.amount, 0)
    })).filter(r => r.amount > 0)
    const byExpCat = Object.entries(EXPENSE_CATEGORIES).map(([k, label]) => ({
      label, amount: periodExp.filter(e => e.category === k).reduce((s, e) => s + e.amount, 0)
    })).filter(r => r.amount > 0)
    return { revenue, cost, profit, pct, txCount: periodPay.length, avgTx: periodPay.length ? revenue / periodPay.length : 0, byMethod, byExpCat }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[#5a6a80]">
        <DollarSign size={40} className="text-gray-200 mb-3" />
        <p className="font-medium">Nincs hozzáférésed a pénzügyi modulhoz</p>
      </div>
    )
  }

  const report = tab === 'reports' ? getReportData() : null

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0B1E3D] to-[#1a3a6b] rounded-xl p-5 text-white flex items-center gap-4">
        <div className="w-12 h-12 bg-[#C9A84C] rounded-xl flex items-center justify-center shrink-0">
          <DollarSign size={24} className="text-[#0B1E3D]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">Pénzügy & Számlázás</h1>
          <p className="text-sm text-blue-200 mt-0.5">Számlák · Fizetések · Kintlévőségek · Riportok</p>
        </div>
        <div className="hidden sm:flex gap-5 text-center shrink-0">
          <div><div className="text-xl font-bold text-[#C9A84C]">{chf(monthRevenue)}</div><div className="text-xs text-blue-200">Havi bevétel</div></div>
          <div><div className="text-xl font-bold text-green-400">{chf(monthProfit)}</div><div className="text-xs text-blue-200">Havi profit</div></div>
          {overdueInvoices.length > 0 && (
            <div><div className="text-xl font-bold text-red-400">{overdueInvoices.length}</div><div className="text-xs text-blue-200">Lejárt számla</div></div>
          )}
        </div>
        <button onClick={() => { load(); onRefresh() }} className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${tab === t.id ? 'bg-white text-[#0B1E3D] shadow-sm' : 'text-gray-500 hover:text-[#0B1E3D]'}`}
            >
              <Icon size={13} />{t.label}
            </button>
          )
        })}
      </div>

      {/* ── Dashboard ── */}
      {tab === 'dashboard' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Mai bevétel', value: chf(todayRevenue), color: 'text-blue-600', sub: 'ma' },
              { label: 'Heti bevétel', value: chf(weekRevenue), color: 'text-blue-600', sub: '7 nap' },
              { label: 'Havi bevétel', value: chf(monthRevenue), color: 'text-[#C9A84C]', sub: 'e hónap' },
              { label: 'Havi költség', value: chf(monthExpenses), color: 'text-red-500', sub: 'e hónap' },
              { label: 'Havi profit', value: chf(monthProfit), color: monthProfit >= 0 ? 'text-emerald-600' : 'text-red-600', sub: 'e hónap' },
              { label: 'Profit %', value: `${profitPct.toFixed(1)}%`, color: profitPct >= 30 ? 'text-emerald-600' : 'text-amber-600', sub: 'e hónap' },
              { label: 'Kintlévőségek', value: chf(totalReceivables), color: 'text-red-500', sub: `${invoices.filter(i => ['sent','partial','overdue'].includes(i.status)).length} számla` },
              { label: 'Aktív ML értéke', value: chf(activeWOValue), color: 'text-[#0B1E3D]', sub: 'folyamatban' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-gray-300 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* Overdue alert */}
          {overdueInvoices.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={16} className="text-red-500" />
                <span className="font-semibold text-red-700 text-sm">{overdueInvoices.length} lejárt számla – {chf(overdueInvoices.reduce((s, i) => s + i.balance_due, 0))}</span>
              </div>
              <div className="space-y-2">
                {overdueInvoices.slice(0, 3).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between text-xs">
                    <span className="text-red-700 font-medium">{inv.invoice_number}</span>
                    <span className="text-red-600">{inv.customer?.full_name}</span>
                    <span className="font-bold text-red-700">{chf(inv.balance_due)}</span>
                    <button onClick={() => { setReminderInvoice(inv); setReminderType('first') }} className="px-2 py-1 bg-red-500 text-white rounded text-[10px] font-semibold">Emlékeztető</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent activity */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-[#0B1E3D] text-sm mb-3">Legutóbbi fizetések</h3>
              {payments.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-[#0B1E3D]">{p.customer?.full_name || '—'}</p>
                    <p className="text-[10px] text-gray-400">{PAYMENT_METHODS[p.payment_method]} · {p.payment_date}</p>
                  </div>
                  <span className="font-semibold text-emerald-600 text-sm">{chf(p.amount)}</span>
                </div>
              ))}
              {payments.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nincs fizetés</p>}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="font-semibold text-[#0B1E3D] text-sm mb-3">Nyitott számlák</h3>
              {invoices.filter(i => ['sent','partial','overdue'].includes(i.status)).slice(0, 5).map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <p className="text-xs font-medium text-[#0B1E3D]">{inv.invoice_number}</p>
                    <p className="text-[10px] text-gray-400">{inv.customer?.full_name} · {inv.due_date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-amber-600 text-xs">{chf(inv.balance_due)}</p>
                    <StatusBadge status={inv.status} />
                  </div>
                </div>
              ))}
              {invoices.filter(i => ['sent','partial','overdue'].includes(i.status)).length === 0 && <p className="text-xs text-gray-400 text-center py-4">Nincs nyitott számla</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Invoices ── */}
      {tab === 'invoices' && (
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szám, ügyfél keresés..." className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#0B1E3D]" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              <option value="all">Minden státusz</option>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <Button variant="primary" size="sm" onClick={() => setNewInvoiceModal(true)}>
              <Plus size={14} /> Új számla
            </Button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-[#0B1E3D] text-sm">Számlák ({filteredInvoices.length})</span>
            </div>
            {loading ? <div className="flex items-center justify-center h-24 text-gray-400 text-sm">Betöltés...</div> : filteredInvoices.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 text-gray-400 gap-2"><FileText size={24} className="text-gray-200" /><p className="text-sm">Nincs számla</p></div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredInvoices.map(inv => (
                  <div key={inv.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#0B1E3D] text-sm">{inv.invoice_number}</span>
                        <StatusBadge status={inv.status} />
                        {inv.status === 'overdue' && <span className="text-[10px] text-red-500 font-semibold">LEJÁRT</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {inv.customer?.full_name} · {inv.issue_date} · határidő: {inv.due_date || '—'}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-[#0B1E3D] text-sm">{chf(inv.total_amount)}</p>
                        {inv.balance_due > 0 && inv.status !== 'paid' && <p className="text-[10px] text-red-500">Hátralék: {chf(inv.balance_due)}</p>}
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => downloadInvoicePDF(inv)} className="p-1.5 text-gray-400 hover:text-[#0B1E3D] rounded" title="PDF"><Download size={14} /></button>
                        {inv.status === 'draft' && <button onClick={() => markSent(inv)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="Kiküldve jelöl"><Send size={14} /></button>}
                        {['sent','partial','overdue'].includes(inv.status) && (
                          <>
                            <button onClick={() => { setPayInvoice(inv); setPayForm(f => ({ ...f, invoice_id: inv.id, amount: inv.balance_due.toFixed(2) })) }} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded" title="Fizetés rögzítése"><CreditCard size={14} /></button>
                            <button onClick={() => { setReminderInvoice(inv); setReminderType('first') }} className="p-1.5 text-gray-400 hover:text-amber-600 rounded" title="Emlékeztető"><MessageCircle size={14} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Payments ── */}
      {tab === 'payments' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-[#0B1E3D]">Fizetések</h2>
            <Button variant="primary" size="sm" onClick={() => setNewPaymentModal(true)}><Plus size={14} /> Fizetés rögzítése</Button>
          </div>

          {/* Daily cash register */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(PAYMENT_METHODS).map(([method, label]) => {
              const total = payments.filter(p => p.payment_date === today && p.payment_method === method).reduce((s, p) => s + p.amount, 0)
              return (
                <div key={method} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className={`text-base font-bold mt-1 ${total > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>{chf(total)}</p>
                  <p className="text-[10px] text-gray-300">ma</p>
                </div>
              )
            })}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-[#0B1E3D] text-sm">Összes fizetés ({payments.length})</span>
            </div>
            <div className="divide-y divide-gray-50">
              {payments.map(p => (
                <div key={p.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <CreditCard size={14} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0B1E3D]">{p.customer?.full_name || '—'}</p>
                    <p className="text-xs text-gray-400">{PAYMENT_METHODS[p.payment_method]} · {p.payment_date} {p.invoice?.invoice_number ? `· ${p.invoice.invoice_number}` : ''}</p>
                  </div>
                  <span className="font-bold text-emerald-600">{chf(p.amount)}</span>
                </div>
              ))}
              {payments.length === 0 && <div className="flex items-center justify-center h-20 text-gray-400 text-sm">Nincs fizetési adat</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Receivables ── */}
      {tab === 'receivables' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-[#0B1E3D]">Kintlévőségek</h2>
          <div className="grid grid-cols-3 gap-3 mb-2">
            {[
              { label: '0–7 nap', color: 'text-emerald-600', items: invoices.filter(i => i.balance_due > 0 && !['paid','cancelled'].includes(i.status) && i.due_date && Math.ceil((new Date(i.due_date).getTime() - Date.now()) / 86400000) >= 0 && Math.ceil((new Date(i.due_date).getTime() - Date.now()) / 86400000) <= 7) },
              { label: '8–30 nap lejárt', color: 'text-amber-600', items: invoices.filter(i => i.balance_due > 0 && !['paid','cancelled'].includes(i.status) && i.due_date && new Date(i.due_date) < new Date() && Math.ceil((Date.now() - new Date(i.due_date).getTime()) / 86400000) <= 30) },
              { label: '30+ nap lejárt', color: 'text-red-600', items: invoices.filter(i => i.balance_due > 0 && !['paid','cancelled'].includes(i.status) && i.due_date && Math.ceil((Date.now() - new Date(i.due_date).getTime()) / 86400000) > 30) },
            ].map(g => (
              <div key={g.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
                <p className="text-[10px] text-gray-400">{g.label}</p>
                <p className={`text-lg font-bold ${g.color}`}>{chf(g.items.reduce((s, i) => s + i.balance_due, 0))}</p>
                <p className="text-[10px] text-gray-300">{g.items.length} számla</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {invoices.filter(i => i.balance_due > 0 && !['paid','cancelled'].includes(i.status)).length === 0 ? (
                <div className="flex items-center justify-center h-20 text-gray-400 text-sm">Nincs kintlévőség 🎉</div>
              ) : invoices.filter(i => i.balance_due > 0 && !['paid','cancelled'].includes(i.status)).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || '')).map(inv => {
                const daysOverdue = inv.due_date ? Math.ceil((Date.now() - new Date(inv.due_date).getTime()) / 86400000) : 0
                const dotColor = daysOverdue > 30 ? 'bg-red-500' : daysOverdue > 0 ? 'bg-amber-500' : 'bg-emerald-500'
                return (
                  <div key={inv.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                    <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-[#0B1E3D]">{inv.invoice_number}</span>
                        <span className="text-xs text-gray-400">— {inv.customer?.full_name}</span>
                      </div>
                      <p className="text-xs text-gray-400">Határidő: {inv.due_date || '—'} {daysOverdue > 0 ? `· ${daysOverdue} napja lejárt` : ''}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-sm text-[#0B1E3D]">{chf(inv.balance_due)}</p>
                      {inv.reminder_count ? <p className="text-[10px] text-gray-400">{inv.reminder_count}x emlékeztető</p> : null}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setPayInvoice(inv); setPayForm(f => ({ ...f, invoice_id: inv.id, amount: inv.balance_due.toFixed(2) })) }} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded" title="Fizetés rögzítése"><CreditCard size={14} /></button>
                      <button onClick={() => { setReminderInvoice(inv); setReminderType(inv.reminder_count === 0 ? 'first' : inv.reminder_count === 1 ? 'second' : 'final') }} className="p-1.5 text-gray-400 hover:text-amber-600 rounded" title="Emlékeztető"><MessageCircle size={14} /></button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Expenses ── */}
      {tab === 'expenses' && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-[#0B1E3D]">Költségek</h2>
            <Button variant="primary" size="sm" onClick={() => setNewExpenseModal(true)}><Plus size={14} /> Új költség</Button>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {Object.entries(EXPENSE_CATEGORIES).map(([k, label]) => {
              const total = expenses.filter(e => e.category === k && e.expense_date >= monthStart).reduce((s, e) => s + e.amount, 0)
              return total > 0 ? (
                <div key={k} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
                  <p className="text-[10px] text-gray-400">{label}</p>
                  <p className="text-sm font-bold text-red-600">{chf(total)}</p>
                </div>
              ) : null
            })}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {expenses.length === 0 ? <div className="flex items-center justify-center h-20 text-gray-400 text-sm">Nincs rögzített költség</div>
              : expenses.map(e => (
                <div key={e.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0B1E3D]">{EXPENSE_CATEGORIES[e.category]}</p>
                    <p className="text-xs text-gray-400">{e.supplier || '—'} · {e.expense_date} {e.notes ? `· ${e.notes}` : ''}</p>
                  </div>
                  <span className="font-bold text-red-600 text-sm">{chf(e.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Revenue ── */}
      {tab === 'revenue' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-[#0B1E3D]">Bevételek</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-sm text-gray-400">Összes beérkezett fizetés ({payments.length} tétel)</span>
            </div>
            <div className="divide-y divide-gray-50">
              {payments.length === 0 ? <div className="flex items-center justify-center h-20 text-gray-400 text-sm">Nincs bevétel adat</div>
              : payments.map(p => (
                <div key={p.id} className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#0B1E3D]">{p.customer?.full_name || '—'}</p>
                    <p className="text-xs text-gray-400">{p.payment_date} · {PAYMENT_METHODS[p.payment_method]}{p.invoice?.invoice_number ? ` · ${p.invoice.invoice_number}` : ''}</p>
                  </div>
                  <span className="font-bold text-emerald-600">{chf(p.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Reports ── */}
      {tab === 'reports' && report && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['day','week','month','quarter','year'] as const).map(p => (
              <button key={p} onClick={() => setReportPeriod(p)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${reportPeriod === p ? 'bg-[#0B1E3D] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-[#0B1E3D]'}`}>
                {{ day: 'Napi', week: 'Heti', month: 'Havi', quarter: 'Negyedéves', year: 'Éves' }[p]}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Bevétel', value: chf(report.revenue), color: 'text-[#C9A84C]' },
              { label: 'Költség', value: chf(report.cost), color: 'text-red-600' },
              { label: 'Profit', value: chf(report.profit), color: report.profit >= 0 ? 'text-emerald-600' : 'text-red-600' },
              { label: 'Profit %', value: `${report.pct.toFixed(1)}%`, color: report.pct >= 30 ? 'text-emerald-600' : 'text-amber-600' },
              { label: 'Tranzakciók', value: report.txCount.toString(), color: 'text-blue-600' },
              { label: 'Átlag bevétel', value: chf(report.avgTx), color: 'text-blue-600' },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <p className="text-xs text-gray-400">{s.label}</p>
                <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {report.byMethod.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-semibold text-[#0B1E3D] text-sm mb-3">Fizetési módok</h3>
                <div className="space-y-2">
                  {report.byMethod.sort((a,b) => b.amount - a.amount).map(m => (
                    <div key={m.label} className="flex items-center gap-2">
                      <div className="flex-1 text-xs text-gray-600">{m.label}</div>
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div className="bg-[#C9A84C] h-2 rounded-full" style={{ width: `${report.revenue > 0 ? m.amount / report.revenue * 100 : 0}%` }} />
                      </div>
                      <div className="text-xs font-semibold text-[#0B1E3D] w-20 text-right">{chf(m.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {report.byExpCat.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <h3 className="font-semibold text-[#0B1E3D] text-sm mb-3">Költség kategóriák</h3>
                <div className="space-y-2">
                  {report.byExpCat.sort((a,b) => b.amount - a.amount).map(c => (
                    <div key={c.label} className="flex items-center gap-2">
                      <div className="flex-1 text-xs text-gray-600">{c.label}</div>
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div className="bg-red-400 h-2 rounded-full" style={{ width: `${report.cost > 0 ? c.amount / report.cost * 100 : 0}%` }} />
                      </div>
                      <div className="text-xs font-semibold text-red-600 w-20 text-right">{chf(c.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Fleet Billing ── */}
      {tab === 'fleet_billing' && (
        <div className="space-y-3">
          <h2 className="font-semibold text-[#0B1E3D]">Flotta számlázás</h2>
          {fleetAccounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
              <Building2 size={32} className="text-gray-200" />
              <p className="text-sm">Nincs flotta ügyfél</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {fleetAccounts.map(fleet => {
                const fleetInvoices = invoices.filter(i => i.fleet_account_id === fleet.id)
                const totalBilled = fleetInvoices.reduce((s, i) => s + i.total_amount, 0)
                const outstanding = fleetInvoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.balance_due, 0)
                return (
                  <div key={fleet.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-[#0B1E3D]">{fleet.company_name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{fleet.contact_name} · {fleet.discount_pct ? `${fleet.discount_pct}% kedvezmény` : 'Nincs kedvezmény'}</p>
                      </div>
                      <div className="w-10 h-10 rounded-lg bg-[rgba(11,30,61,0.06)] flex items-center justify-center">
                        <Building2 size={18} className="text-[#0B1E3D]" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-400">Összeszámlázva</p>
                        <p className="font-bold text-[#0B1E3D] text-sm">{chf(totalBilled)}</p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-400">Kintlévőség</p>
                        <p className="font-bold text-red-600 text-sm">{chf(outstanding)}</p>
                      </div>
                    </div>
                    <Button variant="primary" size="sm" className="w-full" onClick={() => generateFleetInvoice(fleet)}>
                      <Plus size={13} /> Havi flotta számla generálása
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Settings ── */}
      {tab === 'settings' && (
        <div className="max-w-lg bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-semibold text-[#0B1E3D]">Pénzügyi beállítások</h2>
          {[
            { label: 'Cégnév', key: 'company_name' as const },
            { label: 'Cím', key: 'company_address' as const },
            { label: 'MWST szám', key: 'mwst_nr' as const },
            { label: 'IBAN', key: 'iban' as const },
            { label: 'ÁFA kulcs (%)', key: 'vat_rate' as const },
            { label: 'Fizetési határidő (nap)', key: 'payment_days' as const },
          ].map(f => (
            <FormGroup key={f.key}>
              <FormLabel>{f.label}</FormLabel>
              <Input value={settings[f.key]} onChange={e => setSettings(s => ({ ...s, [f.key]: e.target.value }))} />
            </FormGroup>
          ))}
          <Button variant="primary" onClick={() => toast('Beállítások mentve')} className="w-full">Mentés</Button>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* New Invoice */}
      <Modal open={newInvoiceModal} onClose={() => setNewInvoiceModal(false)} title="Új számla létrehozása"
        footer={<><Button variant="secondary" onClick={() => setNewInvoiceModal(false)}>Mégse</Button><Button variant="primary" onClick={createInvoice} disabled={saving}>{saving ? 'Létrehozás...' : 'Számla létrehozása'}</Button></>}
      >
        <div className="space-y-3">
          <FormGroup><FormLabel>Ügyfél *</FormLabel>
            <select value={invForm.customer_id} onChange={e => setInvForm(f => ({ ...f, customer_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B1E3D]">
              <option value="">Válassz ügyfelet...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
          </FormGroup>
          <FormGroup><FormLabel>Munkalap (opcionális)</FormLabel>
            <select value={invForm.work_order_id} onChange={e => setInvForm(f => ({ ...f, work_order_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B1E3D]">
              <option value="">Nincs munkalap</option>
              {workOrders.map(w => <option key={w.id} value={w.id}>{w.order_number} – {w.customers?.full_name} ({chf(w.total_amount || 0)})</option>)}
            </select>
          </FormGroup>
          <FormGroup><FormLabel>Fizetési határidő</FormLabel>
            <Input type="date" value={invForm.due_date} onChange={e => setInvForm(f => ({ ...f, due_date: e.target.value }))} />
          </FormGroup>
          <FormGroup><FormLabel>Fizetési mód</FormLabel>
            <select value={invForm.payment_method} onChange={e => setInvForm(f => ({ ...f, payment_method: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B1E3D]">
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormGroup>
          <FormGroup><FormLabel>IBAN</FormLabel>
            <Input value={invForm.iban} onChange={e => setInvForm(f => ({ ...f, iban: e.target.value }))} />
          </FormGroup>
          <FormGroup><FormLabel>Megjegyzés</FormLabel>
            <Textarea value={invForm.notes} onChange={e => setInvForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </FormGroup>
        </div>
      </Modal>

      {/* Record Payment (standalone or from invoice) */}
      <Modal open={newPaymentModal || !!payInvoice} onClose={() => { setNewPaymentModal(false); setPayInvoice(null) }} title="Fizetés rögzítése"
        footer={<><Button variant="secondary" onClick={() => { setNewPaymentModal(false); setPayInvoice(null) }}>Mégse</Button><Button variant="primary" onClick={recordPayment} disabled={saving}>{saving ? 'Mentés...' : 'Fizetés rögzítése'}</Button></>}
      >
        <div className="space-y-3">
          {payInvoice && (
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700 mb-2">
              <strong>{payInvoice.invoice_number}</strong> · Hátralék: <strong>{chf(payInvoice.balance_due)}</strong>
            </div>
          )}
          <FormGroup><FormLabel>Számla (opcionális)</FormLabel>
            <select value={payForm.invoice_id} onChange={e => setPayForm(f => ({ ...f, invoice_id: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B1E3D]">
              <option value="">Nincs számla</option>
              {invoices.filter(i => ['sent','partial','overdue'].includes(i.status)).map(i => <option key={i.id} value={i.id}>{i.invoice_number} – {chf(i.balance_due)}</option>)}
            </select>
          </FormGroup>
          <FormGroup><FormLabel>Összeg (CHF) *</FormLabel>
            <Input type="number" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
          </FormGroup>
          <FormGroup><FormLabel>Fizetési mód</FormLabel>
            <select value={payForm.payment_method} onChange={e => setPayForm(f => ({ ...f, payment_method: e.target.value as PaymentMethod }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B1E3D]">
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormGroup>
          <FormGroup><FormLabel>Dátum</FormLabel>
            <Input type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
          </FormGroup>
          <FormGroup><FormLabel>Referencia / utalás azonosító</FormLabel>
            <Input value={payForm.reference} onChange={e => setPayForm(f => ({ ...f, reference: e.target.value }))} placeholder="pl. TWINT-xxx" />
          </FormGroup>
        </div>
      </Modal>

      {/* New Expense */}
      <Modal open={newExpenseModal} onClose={() => setNewExpenseModal(false)} title="Új költség rögzítése"
        footer={<><Button variant="secondary" onClick={() => setNewExpenseModal(false)}>Mégse</Button><Button variant="primary" onClick={addExpense} disabled={saving}>{saving ? 'Mentés...' : 'Költség rögzítése'}</Button></>}
      >
        <div className="space-y-3">
          <FormGroup><FormLabel>Kategória</FormLabel>
            <select value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value as ExpenseCategory }))} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#0B1E3D]">
              {Object.entries(EXPENSE_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </FormGroup>
          <FormGroup><FormLabel>Összeg (CHF) *</FormLabel>
            <Input type="number" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
          </FormGroup>
          <FormGroup><FormLabel>Beszállító</FormLabel>
            <Input value={expForm.supplier} onChange={e => setExpForm(f => ({ ...f, supplier: e.target.value }))} placeholder="pl. Bosch, Shell..." />
          </FormGroup>
          <FormGroup><FormLabel>Dátum</FormLabel>
            <Input type="date" value={expForm.expense_date} onChange={e => setExpForm(f => ({ ...f, expense_date: e.target.value }))} />
          </FormGroup>
          <FormGroup><FormLabel>Megjegyzés</FormLabel>
            <Textarea value={expForm.notes} onChange={e => setExpForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
          </FormGroup>
        </div>
      </Modal>

      {/* Reminder */}
      {reminderInvoice && (
        <Modal open={true} onClose={() => setReminderInvoice(null)} title="Fizetési emlékeztető küldése"
          footer={<><Button variant="secondary" onClick={() => setReminderInvoice(null)}>Mégse</Button><Button variant="gold" onClick={sendReminder}><MessageCircle size={13} /> WhatsApp küldés</Button></>}
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              {(['first','second','final'] as const).map(t => (
                <button key={t} onClick={() => setReminderType(t)} className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-all ${reminderType === t ? 'bg-[#0B1E3D] text-white border-[#0B1E3D]' : 'border-gray-200 text-gray-600'}`}>
                  {{ first: '1. Emlékeztető', second: '2. Emlékeztető', final: 'Utolsó felszólítás' }[t]}
                </button>
              ))}
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-[#5a6a80] uppercase mb-1">Üzenet előnézet</p>
              <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans">{REMINDER_TEMPLATES[reminderType].body(reminderInvoice)}</pre>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MessageCircle size={13} />
              <span>WhatsApp: {reminderInvoice.customer?.phone || 'Nincs szám'} · Kommunikáció naplózva</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
