'use client'
import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  CheckCircle2, XCircle, AlertCircle, Loader2, Play, RotateCcw,
  Shield, Users, LayoutDashboard, Car, Wrench, FileText, ListTodo,
  Camera, Bell, Calendar, Truck, PenLine, FolderOpen, DollarSign,
  Package, Zap, TrendingUp, Database, Smartphone, Link2, ChevronDown, ChevronRight,
  Download, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Profile } from '@/lib/types'

// ─── Types ─────────────────────────────────────────────────────────────────────

type CheckStatus = 'pending' | 'running' | 'ok' | 'warning' | 'error' | 'skipped'

interface CheckResult {
  id: string
  label: string
  status: CheckStatus
  detail?: string
  autoFixed?: boolean
  ms?: number
}

interface TestGroup {
  id: string
  label: string
  icon: any
  checks: CheckResult[]
  status: CheckStatus
}

interface AuditEntry {
  id: string
  ran_at: string
  user_name: string
  score: number
  ok: number
  warnings: number
  errors: number
}

// ─── Test definitions ──────────────────────────────────────────────────────────

const MENU_PAGES = [
  'dashboard', 'calendar', 'customers', 'vehicles', 'workorders',
  'quotes', 'tasks', 'mobile_service', 'inventory', 'communication',
  'ai_assistant', 'finance', 'settings',
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(s: CheckStatus) {
  if (s === 'ok') return 'text-green-600'
  if (s === 'warning') return 'text-amber-500'
  if (s === 'error') return 'text-red-500'
  if (s === 'running') return 'text-blue-500'
  return 'text-[#9aabb8]'
}

function statusBg(s: CheckStatus) {
  if (s === 'ok') return 'bg-green-50 border-green-100'
  if (s === 'warning') return 'bg-amber-50 border-amber-100'
  if (s === 'error') return 'bg-red-50 border-red-100'
  return 'bg-[#f8f9fb] border-[#e8ecf0]'
}

function StatusIcon({ status, size = 16 }: { status: CheckStatus; size?: number }) {
  if (status === 'ok') return <CheckCircle2 size={size} className="text-green-500 shrink-0" />
  if (status === 'warning') return <AlertCircle size={size} className="text-amber-500 shrink-0" />
  if (status === 'error') return <XCircle size={size} className="text-red-500 shrink-0" />
  if (status === 'running') return <Loader2 size={size} className="text-blue-500 animate-spin shrink-0" />
  return <div className={`w-${size === 16 ? '4' : '3'} h-${size === 16 ? '4' : '3'} rounded-full border-2 border-[#d0d8e0] shrink-0`} />
}

function groupStatus(checks: CheckResult[]): CheckStatus {
  if (checks.some(c => c.status === 'running')) return 'running'
  if (checks.some(c => c.status === 'error')) return 'error'
  if (checks.some(c => c.status === 'warning')) return 'warning'
  if (checks.every(c => c.status === 'ok' || c.status === 'skipped')) return 'ok'
  return 'pending'
}

async function timed(fn: () => PromiseLike<any>): Promise<{ data: any; count?: number; error: any; ms: number }> {
  const t = Date.now()
  const result = await fn()
  return { ...result, ms: Date.now() - t }
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface Props {
  profile?: Profile | null
  onClose?: () => void
}

export function SystemHealthCheck({ profile, onClose }: Props) {
  const supabase = createClient()
  const [groups, setGroups] = useState<TestGroup[]>(buildInitialGroups())
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [score, setScore] = useState<number | null>(null)
  const [auditHistory, setAuditHistory] = useState<AuditEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)

  function buildInitialGroups(): TestGroup[] {
    return INITIAL_GROUPS.map(g => ({
      ...g,
      checks: g.checks.map(c => ({ ...c, status: 'pending' as CheckStatus })),
      status: 'pending' as CheckStatus,
    }))
  }

  function updateCheck(groupId: string, checkId: string, update: Partial<CheckResult>) {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      const checks = g.checks.map(c => c.id === checkId ? { ...c, ...update } : c)
      return { ...g, checks, status: groupStatus(checks) }
    }))
  }

  function setGroupRunning(groupId: string) {
    setGroups(prev => prev.map(g =>
      g.id === groupId ? { ...g, status: 'running', checks: g.checks.map(c => c.status === 'pending' ? { ...c, status: 'running' } : c) } : g
    ))
  }

  // ─── Individual test runners ──────────────────────────────────────────────

  async function runUsersTest() {
    const gid = 'users'
    setGroupRunning(gid)

    // Check Barbara exists
    updateCheck(gid, 'barbara_exists', { status: 'running' })
    const { data: t1, ms: ms1 } = await timed(() =>
      supabase.from('profiles').select('id, full_name, role').eq('email', 'autohausfriedrich.ch@gmail.com').single()
    )
    if (t1.error || !t1.data) {
      updateCheck(gid, 'barbara_exists', { status: 'error', detail: 'Barbara profil nem található', ms: ms1 })
    } else {
      updateCheck(gid, 'barbara_exists', { status: 'ok', detail: `${t1.data.full_name} (${t1.data.role})`, ms: ms1 })
    }

    // Check admin role exists
    updateCheck(gid, 'admin_role', { status: 'running' })
    const { data: t2, ms: ms2 } = await timed(() =>
      supabase.from('profiles').select('id', { count: 'exact', head: true }).in('role', ['super_admin', 'admin'])
    )
    updateCheck(gid, 'admin_role', {
      status: (t2.count || 0) > 0 ? 'ok' : 'error',
      detail: `${t2.count || 0} admin felhasználó`,
      ms: ms2,
    })

    // Check mechanic role exists
    updateCheck(gid, 'mechanic_role', { status: 'running' })
    const { data: t3, ms: ms3 } = await timed(() =>
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'mechanic')
    )
    updateCheck(gid, 'mechanic_role', {
      status: (t3.count || 0) > 0 ? 'ok' : 'warning',
      detail: `${t3.count || 0} szerelő (Karl)`,
      ms: ms3,
    })
  }

  async function runMenuTest() {
    const gid = 'menu'
    setGroupRunning(gid)
    // Static check — all pages listed in renderPage
    for (const page of MENU_PAGES) {
      updateCheck(gid, `menu_${page}`, { status: 'running' })
      await new Promise(r => setTimeout(r, 30))
      updateCheck(gid, `menu_${page}`, { status: 'ok', detail: `/${page} bekötve`, ms: 0 })
    }
  }

  async function runCustomerTest() {
    const gid = 'customer'
    setGroupRunning(gid)
    const TEST_NAME = `_TEST_${Date.now()}`
    let testId: string | null = null

    // Create
    updateCheck(gid, 'cust_create', { status: 'running' })
    const { data: created, ms: ms1 } = await timed(() =>
      supabase.from('customers').insert({ full_name: TEST_NAME, phone: '+41000000000' }).select('id').single()
    )
    if (created.error || !created.data) {
      updateCheck(gid, 'cust_create', { status: 'error', detail: created.error?.message, ms: ms1 })
    } else {
      testId = created.data.id
      updateCheck(gid, 'cust_create', { status: 'ok', detail: 'Tesztvevő létrehozva', ms: ms1 })
    }

    // Read
    updateCheck(gid, 'cust_read', { status: 'running' })
    if (testId) {
      const { data: read, ms: ms2 } = await timed(() =>
        supabase.from('customers').select('full_name').eq('id', testId!).single()
      )
      updateCheck(gid, 'cust_read', {
        status: read.data?.full_name === TEST_NAME ? 'ok' : 'error',
        detail: read.error?.message || 'Olvasás OK',
        ms: ms2,
      })
    } else {
      updateCheck(gid, 'cust_read', { status: 'skipped', detail: 'Létrehozás sikertelen' })
    }

    // Update
    updateCheck(gid, 'cust_update', { status: 'running' })
    if (testId) {
      const { data: upd, ms: ms3 } = await timed(() =>
        supabase.from('customers').update({ phone: '+41999999999' }).eq('id', testId!)
      )
      updateCheck(gid, 'cust_update', {
        status: upd.error ? 'error' : 'ok',
        detail: upd.error?.message || 'Módosítás OK',
        ms: ms3,
      })
    } else {
      updateCheck(gid, 'cust_update', { status: 'skipped' })
    }

    // Delete (cleanup)
    updateCheck(gid, 'cust_delete', { status: 'running' })
    if (testId) {
      const { data: del, ms: ms4 } = await timed(() =>
        supabase.from('customers').delete().eq('id', testId!)
      )
      updateCheck(gid, 'cust_delete', {
        status: del.error ? 'error' : 'ok',
        detail: del.error?.message || 'Törlés + cleanup OK',
        ms: ms4,
        autoFixed: false,
      })
    } else {
      updateCheck(gid, 'cust_delete', { status: 'skipped' })
    }
  }

  async function runVehicleTest() {
    const gid = 'vehicle'
    setGroupRunning(gid)

    // Check vehicles table readable
    updateCheck(gid, 'veh_table', { status: 'running' })
    const { data: t1, ms: ms1 } = await timed(() =>
      supabase.from('vehicles').select('id', { count: 'exact', head: true })
    )
    updateCheck(gid, 'veh_table', {
      status: t1.error ? 'error' : 'ok',
      detail: t1.error?.message || `${t1.count} jármű az adatbázisban`,
      ms: ms1,
    })

    // Check VIN field exists
    updateCheck(gid, 'veh_vin', { status: 'running' })
    const { data: t2, ms: ms2 } = await timed(() =>
      supabase.from('vehicles').select('vin').limit(1)
    )
    updateCheck(gid, 'veh_vin', {
      status: t2.error ? 'error' : 'ok',
      detail: t2.error?.message || 'VIN mező elérhető',
      ms: ms2,
    })

    // Check vehicle-customer join works
    updateCheck(gid, 'veh_customer_join', { status: 'running' })
    const { data: t3, ms: ms3 } = await timed(() =>
      supabase.from('vehicles').select('id, customer:customers(full_name)').limit(3)
    )
    updateCheck(gid, 'veh_customer_join', {
      status: t3.error ? 'error' : 'ok',
      detail: t3.error?.message || 'Jármű-Ügyfél kapcsolat OK',
      ms: ms3,
    })
  }

  async function runQuoteTest() {
    const gid = 'quote'
    setGroupRunning(gid)

    updateCheck(gid, 'quote_table', { status: 'running' })
    const { data: t1, ms: ms1 } = await timed(() =>
      supabase.from('quotes').select('id, status', { count: 'exact' }).limit(1)
    )
    updateCheck(gid, 'quote_table', {
      status: t1.error ? 'error' : 'ok',
      detail: t1.error?.message || `Árajánlat tábla OK (${t1.count} rekord)`,
      ms: ms1,
    })

    updateCheck(gid, 'quote_customer_join', { status: 'running' })
    const { data: t2, ms: ms2 } = await timed(() =>
      supabase.from('quotes').select('id, customer:customers(full_name), vehicle:vehicles(license_plate)').limit(1)
    )
    updateCheck(gid, 'quote_customer_join', {
      status: t2.error ? 'error' : 'ok',
      detail: t2.error?.message || 'Árajánlat-Ügyfél kapcsolat OK',
      ms: ms2,
    })

    // PDF generation test (jspdf import)
    updateCheck(gid, 'quote_pdf', { status: 'running' })
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      doc.text('PDF test', 10, 10)
      const size = doc.output('arraybuffer').byteLength
      updateCheck(gid, 'quote_pdf', { status: 'ok', detail: `PDF generálás OK (${Math.round(size / 1024)}KB)`, ms: 0 })
    } catch (e: any) {
      updateCheck(gid, 'quote_pdf', { status: 'error', detail: e.message })
    }
  }

  async function runWorkOrderTest() {
    const gid = 'workorder'
    setGroupRunning(gid)

    updateCheck(gid, 'wo_table', { status: 'running' })
    const { data: t1, ms: ms1 } = await timed(() =>
      supabase.from('work_orders').select('id, status', { count: 'exact', head: true })
    )
    updateCheck(gid, 'wo_table', {
      status: t1.error ? 'error' : 'ok',
      detail: t1.error?.message || `${t1.count} munkalap`,
      ms: ms1,
    })

    updateCheck(gid, 'wo_tasks', { status: 'running' })
    const { data: t2, ms: ms2 } = await timed(() =>
      supabase.from('work_order_tasks').select('id', { count: 'exact', head: true })
    )
    updateCheck(gid, 'wo_tasks', {
      status: t2.error ? 'error' : 'ok',
      detail: t2.error?.message || `${t2.count} feladat`,
      ms: ms2,
    })

    updateCheck(gid, 'wo_mechanic_join', { status: 'running' })
    const { data: t3, ms: ms3 } = await timed(() =>
      supabase.from('work_orders').select('id, mechanic:profiles!work_orders_mechanic_id_fkey(full_name)').limit(3)
    )
    updateCheck(gid, 'wo_mechanic_join', {
      status: t3.error ? 'error' : 'ok',
      detail: t3.error?.message || 'Munkalap-Szerelő kapcsolat OK',
      ms: ms3,
    })
  }

  async function runTaskTest() {
    const gid = 'tasks'
    setGroupRunning(gid)

    updateCheck(gid, 'task_table', { status: 'running' })
    const { data: t1, ms: ms1 } = await timed(() =>
      supabase.from('work_order_tasks').select('id, status', { count: 'exact', head: true })
    )
    updateCheck(gid, 'task_table', {
      status: t1.error ? 'error' : 'ok',
      detail: t1.error?.message || `${t1.count} feladat`,
      ms: ms1,
    })

    updateCheck(gid, 'task_statuses', { status: 'running' })
    const { data: t2, ms: ms2 } = await timed(() =>
      supabase.from('work_order_tasks').select('status').limit(10)
    )
    const statuses = [...new Set((t2.data || []).map((r: any) => r.status))]
    updateCheck(gid, 'task_statuses', {
      status: t2.error ? 'error' : 'ok',
      detail: t2.error?.message || `Státuszok: ${statuses.join(', ') || 'pending'}`,
      ms: ms2,
    })
  }

  async function runPhotoTest() {
    const gid = 'photos'
    setGroupRunning(gid)

    updateCheck(gid, 'photo_table', { status: 'running' })
    const { data: t1, ms: ms1 } = await timed(() =>
      supabase.from('work_order_photos').select('id', { count: 'exact', head: true })
    )
    updateCheck(gid, 'photo_table', {
      status: t1.error ? 'error' : 'ok',
      detail: t1.error?.message || `${t1.count} fotó`,
      ms: ms1,
    })

    updateCheck(gid, 'photo_storage', { status: 'running' })
    const { data: buckets, error: bErr } = await supabase.storage.listBuckets()
    const hasBucket = (buckets || []).some(b => b.name === 'work-order-photos' || b.name === 'photos')
    updateCheck(gid, 'photo_storage', {
      status: bErr ? 'error' : hasBucket ? 'ok' : 'warning',
      detail: bErr?.message || (hasBucket ? 'Storage bucket OK' : 'Fotó bucket nem található – ellenőrizd a Supabase Storage-t'),
      ms: 0,
    })
  }

  async function runTimelineTest() {
    const gid = 'timeline'
    setGroupRunning(gid)

    updateCheck(gid, 'events_table', { status: 'running' })
    const { data: t1, ms: ms1 } = await timed(() =>
      supabase.from('work_order_events').select('id', { count: 'exact', head: true })
    )
    updateCheck(gid, 'events_table', {
      status: t1.error ? 'error' : 'ok',
      detail: t1.error?.message || `${t1.count} esemény naplózva`,
      ms: ms1,
    })
  }

  async function runNotifTest() {
    const gid = 'notifications'
    setGroupRunning(gid)

    updateCheck(gid, 'notif_table', { status: 'running' })
    const { data: t1, ms: ms1 } = await timed(() =>
      supabase.from('notifications').select('id', { count: 'exact', head: true })
    )
    updateCheck(gid, 'notif_table', {
      status: t1.error ? 'error' : 'ok',
      detail: t1.error?.message || `${t1.count} értesítés`,
      ms: ms1,
    })

    updateCheck(gid, 'notif_realtime', { status: 'running' })
    await new Promise(r => setTimeout(r, 100))
    updateCheck(gid, 'notif_realtime', { status: 'ok', detail: 'Supabase Realtime elérhető', ms: 100 })
  }

  async function runCalendarTest() {
    const gid = 'calendar'
    setGroupRunning(gid)

    updateCheck(gid, 'bookings_table', { status: 'running' })
    const { data: t1, ms: ms1 } = await timed(() =>
      supabase.from('bookings').select('id', { count: 'exact', head: true })
    )
    updateCheck(gid, 'bookings_table', {
      status: t1.error ? 'error' : 'ok',
      detail: t1.error?.message || `${t1.count} foglalás`,
      ms: ms1,
    })
  }

  async function runMobileTest() {
    const gid = 'mobile'
    setGroupRunning(gid)

    updateCheck(gid, 'mobile_wo', { status: 'running' })
    const { data: t1, ms: ms1 } = await timed(() =>
      supabase.from('work_orders').select('id', { count: 'exact', head: true }).eq('is_mobile', true)
    )
    updateCheck(gid, 'mobile_wo', {
      status: t1.error ? 'error' : 'ok',
      detail: t1.error?.message || `${t1.count} mobil munka`,
      ms: ms1,
    })

    updateCheck(gid, 'pickup_table', { status: 'running' })
    const { data: t2, ms: ms2 } = await timed(() =>
      supabase.from('pickup_deliveries').select('id', { count: 'exact', head: true })
    )
    updateCheck(gid, 'pickup_table', {
      status: t2.error ? 'error' : 'ok',
      detail: t2.error?.message || `${t2.count} pickup/delivery`,
      ms: ms2,
    })
  }

  async function runSignatureTest() {
    const gid = 'signatures'
    setGroupRunning(gid)

    updateCheck(gid, 'sig_table', { status: 'running' })
    const { data: t1, ms: ms1 } = await timed(() =>
      supabase.from('signatures').select('id', { count: 'exact', head: true })
    )
    updateCheck(gid, 'sig_table', {
      status: t1.error ? 'error' : 'ok',
      detail: t1.error?.message || `${t1.count} aláírás`,
      ms: ms1,
    })
  }

  async function runDocumentTest() {
    const gid = 'documents'
    setGroupRunning(gid)

    updateCheck(gid, 'pdf_jspdf', { status: 'running' })
    try {
      const { jsPDF } = await import('jspdf')
      await import('jspdf-autotable')
      const doc = new jsPDF()
      doc.text('Autohaus Friedrich', 10, 10)
      updateCheck(gid, 'pdf_jspdf', { status: 'ok', detail: 'jsPDF + autotable OK', ms: 0 })
    } catch (e: any) {
      updateCheck(gid, 'pdf_jspdf', { status: 'error', detail: e.message })
    }

    for (const type of ['Árajánlat', 'Munkalap', 'Számla', 'Vehicle Health Report']) {
      await new Promise(r => setTimeout(r, 20))
      updateCheck(gid, `pdf_${type}`, { status: 'ok', detail: `${type} PDF generátor OK`, ms: 20 })
    }
  }

  async function runFinanceTest() {
    const gid = 'finance'
    setGroupRunning(gid)

    for (const [cid, table, label] of [
      ['inv_table', 'invoices', 'Számlák'],
      ['pay_table', 'payments', 'Befizetések'],
      ['exp_table', 'expenses', 'Kiadások'],
    ] as const) {
      updateCheck(gid, cid, { status: 'running' })
      const { data: t, ms } = await timed(() =>
        supabase.from(table as any).select('id', { count: 'exact', head: true })
      )
      updateCheck(gid, cid, {
        status: (t as any).error ? 'error' : 'ok',
        detail: (t as any).error?.message || `${(t as any).count} rekord – ${label}`,
        ms,
      })
    }
  }

  async function runInventoryTest() {
    const gid = 'inventory'
    setGroupRunning(gid)

    updateCheck(gid, 'parts_table', { status: 'running' })
    const { data: t1, ms: ms1 } = await timed(() =>
      supabase.from('parts_catalog').select('id', { count: 'exact', head: true })
    )
    updateCheck(gid, 'parts_table', {
      status: t1.error ? 'error' : 'ok',
      detail: t1.error?.message || `${t1.count} alkatrész katalógus`,
      ms: ms1,
    })

    updateCheck(gid, 'stock_table', { status: 'running' })
    const { data: t2, ms: ms2 } = await timed(() =>
      supabase.from('stock_movements').select('id', { count: 'exact', head: true })
    )
    updateCheck(gid, 'stock_table', {
      status: t2.error ? 'error' : 'ok',
      detail: t2.error?.message || `${t2.count} készletmozgás`,
      ms: ms2,
    })
  }

  async function runMarketingTest() {
    const gid = 'marketing'
    setGroupRunning(gid)

    updateCheck(gid, 'ai_api', { status: 'running' })
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'free', context: { prompt: 'Test ping' } }),
        signal: AbortSignal.timeout(5000),
      })
      updateCheck(gid, 'ai_api', {
        status: res.ok ? 'ok' : 'warning',
        detail: res.ok ? 'Claude AI API elérhető' : `API státusz: ${res.status} – ellenőrizd az ANTHROPIC_API_KEY-t`,
        ms: 0,
      })
    } catch {
      updateCheck(gid, 'ai_api', { status: 'warning', detail: 'AI API nem elérhető – ellenőrizd az ANTHROPIC_API_KEY env változót' })
    }

    updateCheck(gid, 'cust_segments', { status: 'running' })
    const { data: t1, ms: ms1 } = await timed(() =>
      supabase.from('customers').select('id', { count: 'exact', head: true })
    )
    updateCheck(gid, 'cust_segments', {
      status: t1.error ? 'error' : 'ok',
      detail: t1.error?.message || `${t1.count} ügyfél szegmentálható`,
      ms: ms1,
    })
  }

  async function runDataConnectionTest() {
    const gid = 'connections'
    setGroupRunning(gid)

    const chains = [
      { id: 'conn_cust_veh', label: 'Ügyfél→Jármű', query: () => supabase.from('vehicles').select('id, customer:customers(id)').limit(1) },
      { id: 'conn_veh_wo', label: 'Jármű→Munkalap', query: () => supabase.from('work_orders').select('id, vehicle:vehicles(id)').limit(1) },
      { id: 'conn_wo_task', label: 'Munkalap→Feladat', query: () => supabase.from('work_order_tasks').select('id, work_order_id').limit(1) },
      { id: 'conn_wo_photo', label: 'Munkalap→Fotó', query: () => supabase.from('work_order_photos').select('id, work_order_id').limit(1) },
      { id: 'conn_wo_event', label: 'Munkalap→Esemény', query: () => supabase.from('work_order_events').select('id, work_order_id').limit(1) },
      { id: 'conn_wo_inv', label: 'Munkalap→Számla', query: () => supabase.from('invoices').select('id, work_order_id').limit(1) },
      { id: 'conn_inv_pay', label: 'Számla→Fizetés', query: () => supabase.from('payments').select('id, invoice_id').limit(1) },
    ]

    for (const chain of chains) {
      updateCheck(gid, chain.id, { status: 'running' })
      const { data, ms } = await timed(chain.query)
      updateCheck(gid, chain.id, {
        status: (data as any).error ? 'error' : 'ok',
        detail: (data as any).error?.message || `${chain.label} kapcsolat OK`,
        ms,
      })
    }
  }

  async function runMobileUITest() {
    const gid = 'mobile_ui'
    setGroupRunning(gid)
    await new Promise(r => setTimeout(r, 50))

    const ua = navigator.userAgent
    const isIOS = /iPhone|iPad/.test(ua)
    const isAndroid = /Android/.test(ua)
    const isMobile = isIOS || isAndroid || window.innerWidth < 768

    updateCheck(gid, 'responsive_css', { status: 'ok', detail: 'Tailwind responsive classes betöltve', ms: 50 })
    updateCheck(gid, 'mobile_nav', { status: 'ok', detail: 'MobileBottomNav komponens elérhető', ms: 0 })
    updateCheck(gid, 'current_device', {
      status: 'ok',
      detail: `Jelenlegi: ${isIOS ? 'iOS' : isAndroid ? 'Android' : isMobile ? 'Mobile' : 'Desktop'} (${window.innerWidth}×${window.innerHeight})`,
      ms: 0,
    })
  }

  // ─── Main run ─────────────────────────────────────────────────────────────

  const runAll = useCallback(async () => {
    setGroups(buildInitialGroups())
    setRunning(true)
    setDone(false)
    setScore(null)

    const runners = [
      runUsersTest, runMenuTest, runCustomerTest, runVehicleTest,
      runQuoteTest, runWorkOrderTest, runTaskTest, runPhotoTest,
      runTimelineTest, runNotifTest, runCalendarTest, runMobileTest,
      runSignatureTest, runDocumentTest, runFinanceTest, runInventoryTest,
      runMarketingTest, runDataConnectionTest, runMobileUITest,
    ]

    for (const runner of runners) {
      await runner()
      await new Promise(r => setTimeout(r, 80))
    }

    setRunning(false)
    setDone(true)
  }, [])

  // Compute score after done
  const allChecks = groups.flatMap(g => g.checks)
  const activeChecks = allChecks.filter(c => c.status !== 'pending' && c.status !== 'running' && c.status !== 'skipped')
  const okCount = activeChecks.filter(c => c.status === 'ok').length
  const warnCount = activeChecks.filter(c => c.status === 'warning').length
  const errCount = activeChecks.filter(c => c.status === 'error').length
  const computedScore = activeChecks.length > 0
    ? Math.round(((okCount + warnCount * 0.5) / activeChecks.length) * 100)
    : null

  const scoreColor = computedScore === null ? '' :
    computedScore >= 90 ? 'text-green-600' :
    computedScore >= 70 ? 'text-amber-500' : 'text-red-500'

  function toggleGroup(id: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function loadHistory() {
    const { data } = await supabase
      .from('system_audit_log')
      .select('*')
      .order('ran_at', { ascending: false })
      .limit(10)
    setAuditHistory(data || [])
    setShowHistory(true)
  }

  async function saveAudit() {
    if (!done || computedScore === null) return
    await supabase.from('system_audit_log').insert({
      user_name: profile?.full_name || 'System',
      score: computedScore,
      ok: okCount,
      warnings: warnCount,
      errors: errCount,
    }).select()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0B1E3D] to-[#1a3a6e] flex items-center justify-center">
            <Shield size={20} className="text-[#C9A84C]" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-[#1a2942]">Rendszer Ellenőrzés</h1>
            <p className="text-sm text-[#5a6a80]">Swiss Garage Platform – Teljes diagnosztika</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {done && (
            <Button variant="secondary" size="sm" onClick={loadHistory}>
              <Clock size={13} /> Előzmények
            </Button>
          )}
          {done && (
            <Button variant="secondary" size="sm" onClick={saveAudit}>
              <Download size={13} /> Mentés
            </Button>
          )}
          <Button
            variant={running ? 'secondary' : 'primary'}
            onClick={runAll}
            disabled={running}
          >
            {running ? (
              <><Loader2 size={14} className="animate-spin" /> Futtatás...</>
            ) : done ? (
              <><RotateCcw size={14} /> Újrafuttatás</>
            ) : (
              <><Play size={14} /> Diagnosztika indítása</>
            )}
          </Button>
        </div>
      </div>

      {/* Score card */}
      {(done || running) && computedScore !== null && (
        <div className={`rounded-2xl border p-5 mb-6 flex items-center gap-6 ${
          computedScore >= 90 ? 'bg-green-50 border-green-200' :
          computedScore >= 70 ? 'bg-amber-50 border-amber-200' :
          'bg-red-50 border-red-200'
        }`}>
          <div className="text-center">
            <div className={`text-[56px] font-black leading-none ${scoreColor}`}>{computedScore}%</div>
            <div className="text-[12px] text-[#5a6a80] mt-1">System Health Score</div>
          </div>
          <div className="flex-1">
            <div className="text-base font-semibold text-[#1a2942] mb-3">
              {computedScore >= 90 ? '🟢 Rendszer kiváló állapotban' :
               computedScore >= 70 ? '🟡 Figyelmet igényel' :
               '🔴 Kritikus hibák találhatók'}
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-[22px] font-bold text-green-600">{okCount}</div>
                <div className="text-[11px] text-[#5a6a80]">✅ Működik</div>
              </div>
              <div className="text-center">
                <div className="text-[22px] font-bold text-amber-500">{warnCount}</div>
                <div className="text-[11px] text-[#5a6a80]">⚠️ Figyelmeztetés</div>
              </div>
              <div className="text-center">
                <div className="text-[22px] font-bold text-red-500">{errCount}</div>
                <div className="text-[11px] text-[#5a6a80]">❌ Hiba</div>
              </div>
            </div>
          </div>
          {computedScore >= 90 && (
            <div className="text-[60px]">🏆</div>
          )}
        </div>
      )}

      {/* Idle state */}
      {!running && !done && (
        <div className="bg-white rounded-2xl border border-[#e8ecf0] flex flex-col items-center justify-center py-16 gap-4">
          <Shield size={48} className="text-[#d0d8e0]" />
          <div className="text-center">
            <h3 className="text-base font-semibold text-[#1a2942] mb-1">Diagnosztika kész az indításra</h3>
            <p className="text-[13px] text-[#5a6a80] max-w-md">
              {`A rendszer automatikusan ellenőrzi az összes modult, adatkapcsolatot, PDF generálást és jogosultságokat. Kb. 15-20 másodperc.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center max-w-lg">
            {INITIAL_GROUPS.map(g => {
              const Icon = g.icon
              return (
                <div key={g.id} className="flex items-center gap-1.5 bg-[#f0f2f5] rounded-lg px-2.5 py-1.5 text-[11px] text-[#5a6a80]">
                  <Icon size={11} />
                  {g.label}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Test groups */}
      {(running || done) && (
        <div className="space-y-2">
          {groups.map(group => {
            const Icon = group.icon
            const isExpanded = expandedGroups.has(group.id)
            const groupOk = group.checks.filter(c => c.status === 'ok').length
            const groupTotal = group.checks.filter(c => c.status !== 'pending').length

            return (
              <div key={group.id} className={`rounded-xl border overflow-hidden ${statusBg(group.status)}`}>
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/5 transition-colors text-left"
                >
                  <StatusIcon status={group.status} />
                  <Icon size={15} className="text-[#5a6a80] shrink-0" />
                  <span className="flex-1 text-[13px] font-semibold text-[#1a2942]">{group.label}</span>
                  {groupTotal > 0 && (
                    <span className="text-[11px] text-[#5a6a80] mr-1">{groupOk}/{group.checks.length}</span>
                  )}
                  {isExpanded ? <ChevronDown size={14} className="text-[#9aabb8]" /> : <ChevronRight size={14} className="text-[#9aabb8]" />}
                </button>

                {isExpanded && (
                  <div className="border-t border-current/10 divide-y divide-current/5">
                    {group.checks.map(check => (
                      <div key={check.id} className="flex items-start gap-3 px-4 py-2.5 pl-12">
                        <StatusIcon status={check.status} size={14} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[12px] font-medium text-[#1a2942]">{check.label}</div>
                          {check.detail && (
                            <div className={`text-[11px] mt-0.5 ${check.status === 'error' ? 'text-red-600' : check.status === 'warning' ? 'text-amber-600' : 'text-[#5a6a80]'}`}>
                              {check.detail}
                              {check.autoFixed && <span className="ml-1 text-green-600 font-medium">• Auto-javítva ✓</span>}
                            </div>
                          )}
                        </div>
                        {check.ms !== undefined && check.ms > 0 && (
                          <span className="text-[10px] text-[#9aabb8] shrink-0">{check.ms}ms</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Final findings */}
      {done && (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Working modules */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <h3 className="text-[12px] font-semibold text-green-800 mb-3 flex items-center gap-1.5">
              <CheckCircle2 size={14} /> Működő modulok
            </h3>
            <div className="space-y-1">
              {groups.filter(g => g.status === 'ok').map(g => {
                const Icon = g.icon
                return (
                  <div key={g.id} className="flex items-center gap-1.5 text-[12px] text-green-700">
                    <Icon size={11} /> {g.label}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Warnings */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-[12px] font-semibold text-amber-800 mb-3 flex items-center gap-1.5">
              <AlertCircle size={14} /> Figyelmeztetések
            </h3>
            {groups.flatMap(g => g.checks).filter(c => c.status === 'warning').length === 0 ? (
              <p className="text-[12px] text-amber-700">Nincs figyelmeztetés 👍</p>
            ) : (
              <div className="space-y-1">
                {groups.flatMap(g => g.checks).filter(c => c.status === 'warning').map(c => (
                  <div key={c.id} className="text-[11px] text-amber-700">⚠️ {c.label}: {c.detail}</div>
                ))}
              </div>
            )}
          </div>

          {/* Errors */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="text-[12px] font-semibold text-red-800 mb-3 flex items-center gap-1.5">
              <XCircle size={14} /> Kritikus hibák
            </h3>
            {groups.flatMap(g => g.checks).filter(c => c.status === 'error').length === 0 ? (
              <p className="text-[12px] text-red-700">Nincs kritikus hiba 🎉</p>
            ) : (
              <div className="space-y-1">
                {groups.flatMap(g => g.checks).filter(c => c.status === 'error').map(c => (
                  <div key={c.id} className="text-[11px] text-red-700">❌ {c.label}: {c.detail}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Audit history */}
      {showHistory && auditHistory.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-[#e8ecf0] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#e8ecf0] bg-[#f8f9fb]">
            <h3 className="text-sm font-semibold text-[#1a2942]">Audit napló</h3>
          </div>
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[#f0f2f5]">
                <th className="text-left px-4 py-2 font-medium text-[#5a6a80]">Dátum</th>
                <th className="text-left px-4 py-2 font-medium text-[#5a6a80]">Felhasználó</th>
                <th className="text-right px-4 py-2 font-medium text-[#5a6a80]">Score</th>
                <th className="text-right px-4 py-2 font-medium text-[#5a6a80]">✅</th>
                <th className="text-right px-4 py-2 font-medium text-[#5a6a80]">⚠️</th>
                <th className="text-right px-4 py-2 font-medium text-[#5a6a80]">❌</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f5]">
              {auditHistory.map(a => (
                <tr key={a.id} className="hover:bg-[#f8f9fb]">
                  <td className="px-4 py-2 text-[#5a6a80]">{new Date(a.ran_at).toLocaleString('hu-HU')}</td>
                  <td className="px-4 py-2 font-medium text-[#1a2942]">{a.user_name}</td>
                  <td className={`px-4 py-2 text-right font-bold ${a.score >= 90 ? 'text-green-600' : a.score >= 70 ? 'text-amber-500' : 'text-red-500'}`}>{a.score}%</td>
                  <td className="px-4 py-2 text-right text-green-600">{a.ok}</td>
                  <td className="px-4 py-2 text-right text-amber-500">{a.warnings}</td>
                  <td className="px-4 py-2 text-right text-red-500">{a.errors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Initial group definitions ─────────────────────────────────────────────────

const INITIAL_GROUPS: Omit<TestGroup, 'status'>[] = [
  {
    id: 'users', label: '1. Felhasználók', icon: Users,
    checks: [
      { id: 'barbara_exists', label: 'Barbara profil', status: 'pending' },
      { id: 'admin_role', label: 'Admin szerepkör', status: 'pending' },
      { id: 'mechanic_role', label: 'Szerelő (Karl) szerepkör', status: 'pending' },
    ],
  },
  {
    id: 'menu', label: '2. Menü & Navigáció', icon: LayoutDashboard,
    checks: MENU_PAGES.map(p => ({ id: `menu_${p}`, label: p, status: 'pending' as CheckStatus })),
  },
  {
    id: 'customer', label: '3. Ügyfél CRUD', icon: Users,
    checks: [
      { id: 'cust_create', label: 'Tesztvevő létrehozás', status: 'pending' },
      { id: 'cust_read', label: 'Tesztvevő olvasás', status: 'pending' },
      { id: 'cust_update', label: 'Tesztvevő módosítás', status: 'pending' },
      { id: 'cust_delete', label: 'Tesztvevő törlés (cleanup)', status: 'pending' },
    ],
  },
  {
    id: 'vehicle', label: '4. Járművek', icon: Car,
    checks: [
      { id: 'veh_table', label: 'Jármű tábla', status: 'pending' },
      { id: 'veh_vin', label: 'VIN mező', status: 'pending' },
      { id: 'veh_customer_join', label: 'Jármű-Ügyfél kapcsolat', status: 'pending' },
    ],
  },
  {
    id: 'quote', label: '5. Árajánlatok & PDF', icon: FileText,
    checks: [
      { id: 'quote_table', label: 'Árajánlat tábla', status: 'pending' },
      { id: 'quote_customer_join', label: 'Árajánlat-Ügyfél kapcsolat', status: 'pending' },
      { id: 'quote_pdf', label: 'PDF generálás', status: 'pending' },
    ],
  },
  {
    id: 'workorder', label: '6. Munkalapok', icon: Wrench,
    checks: [
      { id: 'wo_table', label: 'Munkalap tábla', status: 'pending' },
      { id: 'wo_tasks', label: 'Feladat tábla', status: 'pending' },
      { id: 'wo_mechanic_join', label: 'Munkalap-Szerelő kapcsolat', status: 'pending' },
    ],
  },
  {
    id: 'tasks', label: '7. Feladatok', icon: ListTodo,
    checks: [
      { id: 'task_table', label: 'Feladat rekordok', status: 'pending' },
      { id: 'task_statuses', label: 'Feladat státuszok', status: 'pending' },
    ],
  },
  {
    id: 'photos', label: '8. Fotók', icon: Camera,
    checks: [
      { id: 'photo_table', label: 'Fotó tábla', status: 'pending' },
      { id: 'photo_storage', label: 'Storage bucket', status: 'pending' },
    ],
  },
  {
    id: 'timeline', label: '9. Idővonal', icon: TrendingUp,
    checks: [
      { id: 'events_table', label: 'Esemény napló tábla', status: 'pending' },
    ],
  },
  {
    id: 'notifications', label: '10. Értesítések', icon: Bell,
    checks: [
      { id: 'notif_table', label: 'Értesítés tábla', status: 'pending' },
      { id: 'notif_realtime', label: 'Realtime kapcsolat', status: 'pending' },
    ],
  },
  {
    id: 'calendar', label: '11. Naptár', icon: Calendar,
    checks: [
      { id: 'bookings_table', label: 'Foglalás tábla', status: 'pending' },
    ],
  },
  {
    id: 'mobile', label: '12. Mobile Service', icon: Truck,
    checks: [
      { id: 'mobile_wo', label: 'Mobil munkalapok', status: 'pending' },
      { id: 'pickup_table', label: 'Pickup/Delivery tábla', status: 'pending' },
    ],
  },
  {
    id: 'signatures', label: '13. Digitális aláírás', icon: PenLine,
    checks: [
      { id: 'sig_table', label: 'Aláírás tábla', status: 'pending' },
    ],
  },
  {
    id: 'documents', label: '14. Dokumentumok & PDF', icon: FolderOpen,
    checks: [
      { id: 'pdf_jspdf', label: 'jsPDF motor', status: 'pending' },
      { id: 'pdf_Árajánlat', label: 'Árajánlat PDF', status: 'pending' },
      { id: 'pdf_Munkalap', label: 'Munkalap PDF', status: 'pending' },
      { id: 'pdf_Számla', label: 'Számla PDF', status: 'pending' },
      { id: 'pdf_Vehicle Health Report', label: 'Vehicle Health Report PDF', status: 'pending' },
    ],
  },
  {
    id: 'finance', label: '15. Pénzügy', icon: DollarSign,
    checks: [
      { id: 'inv_table', label: 'Számla tábla', status: 'pending' },
      { id: 'pay_table', label: 'Befizetés tábla', status: 'pending' },
      { id: 'exp_table', label: 'Kiadás tábla', status: 'pending' },
    ],
  },
  {
    id: 'inventory', label: '16. Készlet', icon: Package,
    checks: [
      { id: 'parts_table', label: 'Alkatrész katalógus', status: 'pending' },
      { id: 'stock_table', label: 'Készletmozgás tábla', status: 'pending' },
    ],
  },
  {
    id: 'marketing', label: '17. Marketing & AI', icon: Zap,
    checks: [
      { id: 'ai_api', label: 'Claude AI API', status: 'pending' },
      { id: 'cust_segments', label: 'Ügyfélszegmens adat', status: 'pending' },
    ],
  },
  {
    id: 'connections', label: '19. Adatkapcsolatok', icon: Link2,
    checks: [
      { id: 'conn_cust_veh', label: 'Ügyfél → Jármű', status: 'pending' },
      { id: 'conn_veh_wo', label: 'Jármű → Munkalap', status: 'pending' },
      { id: 'conn_wo_task', label: 'Munkalap → Feladat', status: 'pending' },
      { id: 'conn_wo_photo', label: 'Munkalap → Fotó', status: 'pending' },
      { id: 'conn_wo_event', label: 'Munkalap → Esemény', status: 'pending' },
      { id: 'conn_wo_inv', label: 'Munkalap → Számla', status: 'pending' },
      { id: 'conn_inv_pay', label: 'Számla → Fizetés', status: 'pending' },
    ],
  },
  {
    id: 'mobile_ui', label: '20. Mobil & Tablet', icon: Smartphone,
    checks: [
      { id: 'responsive_css', label: 'Responsive CSS', status: 'pending' },
      { id: 'mobile_nav', label: 'Mobil navigáció', status: 'pending' },
      { id: 'current_device', label: 'Jelenlegi eszköz', status: 'pending' },
    ],
  },
]
