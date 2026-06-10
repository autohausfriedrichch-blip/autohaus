'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Modal } from '@/components/ui/modal'
import {
  DollarSign, TrendingUp, TrendingDown, FileText, CreditCard,
  AlertCircle, Plus, Download, Check, Send, Clock, BarChart2,
  Calendar, RefreshCw, ChevronDown
} from 'lucide-react'
import type { Profile } from '@/lib/types'

interface Props {
  profile?: Profile | null
}

interface Invoice {
  id: string
  invoice_number: string
  work_order_id?: string
  customer_id: string
  issue_date: string
  due_date: string
  total_net: number
  total_vat: number
  total_gross: number
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'
  items: any[]
  payment_method?: string
  reminder_count?: number
  reminder_sent_at?: string
  customer?: { full_name: string; email: string; phone: string }
  work_order?: { order_number: string }
}

interface Payment {
  id: string
  invoice_id: string
  amount: number
  method: string
  paid_at: string
  notes?: string
  invoice?: { invoice_number: string }
}

interface Expense {
  id: string
  category: string
  description: string
  amount: number
  expense_date: string
  vendor?: string
}

type Tab = 'dashboard' | 'invoices' | 'payments' | 'receivables' | 'expenses' | 'reports'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Piszkozat', sent: 'Elküldve', paid: 'Fizetve', overdue: 'Lejárt', cancelled: 'Törölve',
}
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400',
}

const EXPENSE_CATEGORIES = [
  'Alkatrészek', 'Szerszámok', 'Bérleti díj', 'Közüzemi díjak',
  'Marketing', 'Biztosítás', 'Fizetések', 'Adminisztráció', 'Egyéb',
]

const PAYMENT_METHODS = ['cash', 'card', 'transfer', 'twint', 'invoice', 'other']
const METHOD_LABEL: Record<string, string> = {
  cash: 'Készpénz', card: 'Bankkártya', transfer: 'Átutalás', twint: 'TWINT', invoice: 'Számla', other: 'Egyéb',
}

export function FinancePage({ profile }: Props) {
  const supabase = createClient()
  const { toast } = useToast()
  const isMechanic = profile?.role === 'mechanic'

  const [tab, setTab] = useState<Tab>('dashboard')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  // Modals
  const [payModal, setPayModal] = useState<Invoice | null>(null)
  const [expenseModal, setExpenseModal] = useState(false)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState('cash')
  const [expForm, setExpForm] = useState({ category: 'Alkatrészek', description: '', amount: '', vendor: '', date: new Date().toISOString().slice(0, 10) })

  useEffect(() => { if (!isMechanic) loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [invRes, payRes, expRes] = await Promise.all([
      supabase.from('invoices').select('*, customer:customers(full_name, email, phone), work_order:work_orders(order_number)').order('created_at', { ascending: false }).limit(100),
      supabase.from('payments').select('*, invoice:invoices(invoice_number)').order('paid_at', { ascending: false }).limit(100),
      supabase.from('expenses').select('*').order('expense_date', { ascending: false }).limit(100),
    ])
    setInvoices((invRes.data || []) as Invoice[])
    setPayments(payRes.data || [])
    setExpenses(expRes.data || [])
    setLoading(false)
  }

  if (isMechanic) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[#5a6a80]">
        <AlertCircle size={32} className="mb-3 text-[#d0d8e0]" />
        <p className="font-medium">Nincs hozzáférésed ehhez a modulhoz</p>
      </div>
    )
  }

  // Dashboard KPIs
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthInvoices = invoices.filter(i => i.issue_date >= monthStart)
  const monthRevenue = monthInvoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_gross, 0)
  const monthExpenses = expenses.filter(e => e.expense_date >= monthStart).reduce((s, e) => s + e.amount, 0)
  const monthProfit = monthRevenue - monthExpenses
  const totalReceivables = invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + i.total_gross, 0)
  const overdueCount = invoices.filter(i => i.status === 'overdue').length

  async function markPaid(invoice: Invoice) {
    setPayModal(invoice)
    setPayAmount(invoice.total_gross.toFixed(2))
  }

  async function submitPayment() {
    if (!payModal) return
    const { error: payErr } = await supabase.from('payments').insert({
      invoice_id: payModal.id,
      amount: parseFloat(payAmount),
      method: payMethod,
      paid_at: new Date().toISOString(),
    })
    if (payErr) { toast(`Hiba: ${payErr.message}`, 'error'); return }
    await supabase.from('invoices').update({ status: 'paid' }).eq('id', payModal.id)
    toast('Fizetés rögzítve')
    setPayModal(null)
    loadAll()
  }

  async function markSent(id: string) {
    await supabase.from('invoices').update({ status: 'sent' }).eq('id', id)
    toast('Számla elküldve')
    loadAll()
  }

  async function addExpense() {
    const { error } = await supabase.from('expenses').insert({
      category: expForm.category,
      description: expForm.description,
      amount: parseFloat(expForm.amount),
      vendor: expForm.vendor || null,
      expense_date: expForm.date,
    })
    if (error) { toast(`Hiba: ${error.message}`, 'error'); return }
    toast('Kiadás rögzítve')
    setExpenseModal(false)
    setExpForm({ category: 'Alkatrészek', description: '', amount: '', vendor: '', date: new Date().toISOString().slice(0, 10) })
    loadAll()
  }

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'dashboard', label: 'Áttekintés', icon: BarChart2 },
    { id: 'invoices', label: 'Számlák', icon: FileText },
    { id: 'payments', label: 'Befizetések', icon: CreditCard },
    { id: 'receivables', label: 'Kinnlevőségek', icon: AlertCircle },
    { id: 'expenses', label: 'Kiadások', icon: TrendingDown },
    { id: 'reports', label: 'Riportok', icon: TrendingUp },
  ]

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign size={22} className="text-[#C9A84C]" />
        <h1 className="text-xl font-semibold text-[#1a2942]">Pénzügy & Számlázás</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#f0f2f5] rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-medium whitespace-nowrap transition-all shrink-0 ${tab === t.id ? 'bg-white text-[#1a2942] shadow-sm' : 'text-[#5a6a80] hover:text-[#1a2942]'}`}>
              <Icon size={13} />
              {t.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-[#9aabb8]">
          <RefreshCw size={20} className="animate-spin mr-2" /> Betöltés...
        </div>
      ) : (
        <>
          {/* Dashboard */}
          {tab === 'dashboard' && (
            <div className="space-y-6">
              {overdueCount > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                  <AlertCircle size={18} className="text-red-500 shrink-0" />
                  <p className="text-[13px] text-red-700">{overdueCount} lejárt számla vár fizetésre – {totalReceivables.toFixed(0)} CHF összesen</p>
                </div>
              )}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Havi bevétel', value: `${monthRevenue.toFixed(0)} CHF`, icon: TrendingUp, color: 'text-green-600' },
                  { label: 'Havi kiadás', value: `${monthExpenses.toFixed(0)} CHF`, icon: TrendingDown, color: 'text-red-500' },
                  { label: 'Havi profit', value: `${monthProfit.toFixed(0)} CHF`, icon: DollarSign, color: monthProfit >= 0 ? 'text-green-600' : 'text-red-500' },
                  { label: 'Kinnlevőség', value: `${totalReceivables.toFixed(0)} CHF`, icon: AlertCircle, color: 'text-amber-500' },
                ].map(kpi => {
                  const Icon = kpi.icon
                  return (
                    <div key={kpi.label} className="bg-white rounded-xl border border-[#e8ecf0] p-4">
                      <div className={`mb-2 ${kpi.color}`}><Icon size={18} /></div>
                      <div className="text-[20px] font-bold text-[#1a2942]">{kpi.value}</div>
                      <div className="text-[11px] text-[#5a6a80] mt-0.5">{kpi.label}</div>
                    </div>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-[#e8ecf0] p-4">
                  <h3 className="text-sm font-semibold text-[#1a2942] mb-3">Legutóbbi számlák</h3>
                  <div className="space-y-2">
                    {invoices.slice(0, 5).map(inv => (
                      <div key={inv.id} className="flex items-center justify-between text-[12px]">
                        <span className="text-[#1a2942] font-medium">{inv.invoice_number}</span>
                        <span className="text-[#5a6a80]">{inv.customer?.full_name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLOR[inv.status]}`}>{STATUS_LABEL[inv.status]}</span>
                        <span className="font-semibold text-[#1a2942]">{inv.total_gross.toFixed(0)} CHF</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-[#e8ecf0] p-4">
                  <h3 className="text-sm font-semibold text-[#1a2942] mb-3">Legutóbbi kiadások</h3>
                  <div className="space-y-2">
                    {expenses.slice(0, 5).map(exp => (
                      <div key={exp.id} className="flex items-center justify-between text-[12px]">
                        <span className="text-[#5a6a80]">{exp.category}</span>
                        <span className="text-[#1a2942] truncate max-w-[150px]">{exp.description}</span>
                        <span className="font-semibold text-red-600">-{exp.amount.toFixed(0)} CHF</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoices */}
          {tab === 'invoices' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[#5a6a80]">{invoices.length} számla összesen</p>
              </div>
              <div className="bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#e8ecf0] bg-[#f8f9fb]">
                      <th className="text-left px-4 py-3 font-semibold text-[#5a6a80] text-[11px] uppercase">Szám</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#5a6a80] text-[11px] uppercase">Ügyfél</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#5a6a80] text-[11px] uppercase hidden md:table-cell">Dátum</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#5a6a80] text-[11px] uppercase">Státusz</th>
                      <th className="text-right px-4 py-3 font-semibold text-[#5a6a80] text-[11px] uppercase">Összeg</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f2f5]">
                    {invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-[#f8f9fb]">
                        <td className="px-4 py-3 font-medium text-[#1a2942]">{inv.invoice_number}</td>
                        <td className="px-4 py-3 text-[#5a6a80]">{inv.customer?.full_name || '–'}</td>
                        <td className="px-4 py-3 text-[#5a6a80] hidden md:table-cell">{new Date(inv.issue_date).toLocaleDateString('hu-HU')}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_COLOR[inv.status]}`}>{STATUS_LABEL[inv.status]}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-[#1a2942]">{inv.total_gross.toFixed(2)} CHF</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {inv.status === 'draft' && (
                              <button onClick={() => markSent(inv.id)}
                                className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1">
                                <Send size={11} /> Küld
                              </button>
                            )}
                            {['sent', 'overdue'].includes(inv.status) && (
                              <button onClick={() => markPaid(inv)}
                                className="text-[11px] text-green-600 hover:text-green-800 flex items-center gap-1">
                                <Check size={11} /> Fizet
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {invoices.length === 0 && (
                  <div className="p-8 text-center text-[#9aabb8] text-sm">Nincs számla</div>
                )}
              </div>
            </div>
          )}

          {/* Payments */}
          {tab === 'payments' && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {PAYMENT_METHODS.map(m => {
                  const total = payments.filter(p => p.method === m).reduce((s, p) => s + p.amount, 0)
                  return (
                    <div key={m} className="bg-white rounded-xl border border-[#e8ecf0] p-4">
                      <div className="text-[11px] text-[#5a6a80] uppercase tracking-wide mb-1">{METHOD_LABEL[m]}</div>
                      <div className="text-[18px] font-bold text-[#1a2942]">{total.toFixed(0)} CHF</div>
                    </div>
                  )
                })}
              </div>
              <div className="bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#e8ecf0] bg-[#f8f9fb]">
                      <th className="text-left px-4 py-3 font-semibold text-[#5a6a80] text-[11px] uppercase">Számla</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#5a6a80] text-[11px] uppercase">Módszer</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#5a6a80] text-[11px] uppercase hidden md:table-cell">Dátum</th>
                      <th className="text-right px-4 py-3 font-semibold text-[#5a6a80] text-[11px] uppercase">Összeg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f2f5]">
                    {payments.map(p => (
                      <tr key={p.id} className="hover:bg-[#f8f9fb]">
                        <td className="px-4 py-3 font-medium text-[#1a2942]">{p.invoice?.invoice_number || p.invoice_id.slice(0, 8)}</td>
                        <td className="px-4 py-3 text-[#5a6a80]">{METHOD_LABEL[p.method] || p.method}</td>
                        <td className="px-4 py-3 text-[#5a6a80] hidden md:table-cell">{new Date(p.paid_at).toLocaleDateString('hu-HU')}</td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">+{p.amount.toFixed(2)} CHF</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payments.length === 0 && (
                  <div className="p-8 text-center text-[#9aabb8] text-sm">Nincs befizetés</div>
                )}
              </div>
            </div>
          )}

          {/* Receivables */}
          {tab === 'receivables' && (
            <div className="space-y-4">
              {['0-7', '8-30', '30+'].map(bucket => {
                const bucketInvoices = invoices.filter(i => {
                  if (!['sent', 'overdue'].includes(i.status)) return false
                  const days = Math.floor((Date.now() - new Date(i.due_date).getTime()) / 86400000)
                  if (bucket === '0-7') return days <= 7
                  if (bucket === '8-30') return days > 7 && days <= 30
                  return days > 30
                })
                if (bucketInvoices.length === 0) return null
                const total = bucketInvoices.reduce((s, i) => s + i.total_gross, 0)
                const color = bucket === '0-7' ? 'border-green-200 bg-green-50' : bucket === '8-30' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'
                return (
                  <div key={bucket} className={`rounded-xl border p-4 ${color}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-[#1a2942]">
                        {bucket === '0-7' ? '0–7 nap' : bucket === '8-30' ? '8–30 nap' : '30+ nap'} lejárt
                      </h3>
                      <span className="font-bold text-[#1a2942]">{total.toFixed(0)} CHF</span>
                    </div>
                    {bucketInvoices.map(inv => (
                      <div key={inv.id} className="flex items-center justify-between bg-white rounded-lg p-3 mb-2 text-[12px]">
                        <span className="font-medium">{inv.invoice_number}</span>
                        <span className="text-[#5a6a80]">{inv.customer?.full_name}</span>
                        <span className="font-bold">{inv.total_gross.toFixed(2)} CHF</span>
                        <button onClick={() => markPaid(inv)}
                          className="text-green-600 hover:text-green-800 flex items-center gap-1">
                          <Check size={11} /> Fizet
                        </button>
                      </div>
                    ))}
                  </div>
                )
              })}
              {invoices.filter(i => ['sent', 'overdue'].includes(i.status)).length === 0 && (
                <div className="bg-white rounded-xl border border-[#e8ecf0] flex items-center justify-center h-32 text-[#9aabb8] text-sm">
                  Nincs kinnlevőség – minden rendben!
                </div>
              )}
            </div>
          )}

          {/* Expenses */}
          {tab === 'expenses' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-[#5a6a80]">{expenses.length} kiadás</p>
                <Button variant="primary" size="sm" onClick={() => setExpenseModal(true)}>
                  <Plus size={13} /> Új kiadás
                </Button>
              </div>
              <div className="bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#e8ecf0] bg-[#f8f9fb]">
                      <th className="text-left px-4 py-3 font-semibold text-[#5a6a80] text-[11px] uppercase">Kategória</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#5a6a80] text-[11px] uppercase">Leírás</th>
                      <th className="text-left px-4 py-3 font-semibold text-[#5a6a80] text-[11px] uppercase hidden md:table-cell">Dátum</th>
                      <th className="text-right px-4 py-3 font-semibold text-[#5a6a80] text-[11px] uppercase">Összeg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f2f5]">
                    {expenses.map(e => (
                      <tr key={e.id} className="hover:bg-[#f8f9fb]">
                        <td className="px-4 py-3"><span className="bg-[#f0f2f5] text-[#5a6a80] px-2 py-0.5 rounded-full text-[11px]">{e.category}</span></td>
                        <td className="px-4 py-3 text-[#1a2942]">{e.description}</td>
                        <td className="px-4 py-3 text-[#5a6a80] hidden md:table-cell">{new Date(e.expense_date).toLocaleDateString('hu-HU')}</td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">-{e.amount.toFixed(2)} CHF</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {expenses.length === 0 && (
                  <div className="p-8 text-center text-[#9aabb8] text-sm">Nincs kiadás rögzítve</div>
                )}
              </div>
            </div>
          )}

          {/* Reports */}
          {tab === 'reports' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-[#e8ecf0] p-5">
                <h3 className="text-sm font-semibold text-[#1a2942] mb-4">Fizetési módok megoszlása</h3>
                {PAYMENT_METHODS.map(m => {
                  const total = payments.filter(p => p.method === m).reduce((s, p) => s + p.amount, 0)
                  const grandTotal = payments.reduce((s, p) => s + p.amount, 0)
                  const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0
                  return (
                    <div key={m} className="mb-3">
                      <div className="flex justify-between text-[12px] text-[#5a6a80] mb-1">
                        <span>{METHOD_LABEL[m]}</span>
                        <span>{total.toFixed(0)} CHF ({pct}%)</span>
                      </div>
                      <div className="bg-[#f0f2f5] rounded-full h-2">
                        <div className="bg-[#C9A84C] h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="bg-white rounded-xl border border-[#e8ecf0] p-5">
                <h3 className="text-sm font-semibold text-[#1a2942] mb-4">Kiadások kategóriánként</h3>
                {EXPENSE_CATEGORIES.map(cat => {
                  const total = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0)
                  const grandTotal = expenses.reduce((s, e) => s + e.amount, 0)
                  const pct = grandTotal > 0 ? Math.round((total / grandTotal) * 100) : 0
                  if (total === 0) return null
                  return (
                    <div key={cat} className="mb-3">
                      <div className="flex justify-between text-[12px] text-[#5a6a80] mb-1">
                        <span>{cat}</span>
                        <span>{total.toFixed(0)} CHF ({pct}%)</span>
                      </div>
                      <div className="bg-[#f0f2f5] rounded-full h-2">
                        <div className="bg-red-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
                {expenses.length === 0 && <p className="text-[12px] text-[#9aabb8]">Nincs adat</p>}
              </div>
            </div>
          )}
        </>
      )}

      {/* Pay modal */}
      <Modal open={!!payModal} onClose={() => setPayModal(null)} title="Fizetés rögzítése"
        footer={<>
          <Button variant="secondary" onClick={() => setPayModal(null)}>Mégse</Button>
          <Button variant="primary" onClick={submitPayment}><Check size={13} /> Fizetés rögzítése</Button>
        </>}>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Összeg (CHF)</label>
            <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} step="0.01"
              className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Fizetési mód</label>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
              className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm bg-white">
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      {/* Expense modal */}
      <Modal open={expenseModal} onClose={() => setExpenseModal(false)} title="Új kiadás rögzítése"
        footer={<>
          <Button variant="secondary" onClick={() => setExpenseModal(false)}>Mégse</Button>
          <Button variant="primary" onClick={addExpense} disabled={!expForm.description || !expForm.amount}><Plus size={13} /> Mentés</Button>
        </>}>
        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Kategória</label>
            <select value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}
              className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm bg-white">
              {EXPENSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Leírás</label>
            <input value={expForm.description} onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))}
              placeholder="pl. Shell motorolaj 5W-30 20L"
              className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Összeg (CHF)</label>
            <input type="number" value={expForm.amount} onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))}
              step="0.01" placeholder="0.00"
              className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Szállító / forrás</label>
            <input value={expForm.vendor} onChange={e => setExpForm(f => ({ ...f, vendor: e.target.value }))}
              placeholder="pl. AutoParts AG"
              className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Dátum</label>
            <input type="date" value={expForm.date} onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
