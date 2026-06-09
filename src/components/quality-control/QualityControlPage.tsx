'use client'
import { useState, useEffect, useCallback } from 'react'
import { CheckCircle, Clock, AlertTriangle, XCircle, ClipboardList, LayoutDashboard, FileText, Settings, X, ChevronRight, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type QCStatus = 'pending' | 'in_progress' | 'needs_fix' | 'approved' | 'ready'

interface ChecklistItem {
  id: string
  label: string
  required: boolean
  type: 'check' | 'toggle'
}

interface WorkOrderQC {
  id: string
  order_number: string
  plate: string
  customer: string
  service_type: string
  status: QCStatus
  technician: string
  wo_status: string
  checkedItems: string[]
  toggleValues: Record<string, boolean>
  notes: string
  qc_id?: string
  approved_by?: string
  approved_at?: string
  updated_at?: string
}

const UNIVERSAL_CHECKLIST: ChecklistItem[] = [
  { id: 'work_verified',   label: 'Elvégzett munka ellenőrizve',           required: true,  type: 'check' },
  { id: 'torque',          label: 'Minden csavar / kerékcsavar nyomatékolva', required: true, type: 'check' },
  { id: 'fluids',          label: 'Folyadékszintek ellenőrizve',            required: true,  type: 'check' },
  { id: 'fault_codes',     label: 'Hibakódok ellenőrizve',                  required: true,  type: 'check' },
  { id: 'test_drive_needed', label: 'Próbaút szükséges?',                   required: false, type: 'toggle' },
  { id: 'test_drive_done', label: 'Próbaút elvégezve',                      required: false, type: 'check' },
  { id: 'photos_uploaded', label: 'Fotók feltöltve',                        required: true,  type: 'check' },
  { id: 'checkout_photos', label: 'Check-out fotók elkészültek',            required: true,  type: 'check' },
  { id: 'customer_note',   label: 'Ügyfélnek látható megjegyzés megírva',   required: true,  type: 'check' },
  { id: 'invoice_ok',      label: 'Számla / árajánlat rendben',             required: true,  type: 'check' },
  { id: 'payment_status',  label: 'Fizetési státusz ellenőrizve',           required: true,  type: 'check' },
  { id: 'next_service',    label: 'Következő ajánlott szerviz rögzítve',    required: true,  type: 'check' },
  { id: 'google_review',   label: 'Google review kérés előkészítve',        required: false, type: 'check' },
]

const STATUS_CONFIG: Record<QCStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending:     { label: 'Várakozik',          color: 'text-gray-600',    bg: 'bg-gray-100',    icon: <Clock className="w-3.5 h-3.5" /> },
  in_progress: { label: 'Folyamatban',        color: 'text-blue-600',    bg: 'bg-blue-50',     icon: <ClipboardList className="w-3.5 h-3.5" /> },
  needs_fix:   { label: 'Javítás szükséges',  color: 'text-[#C9384C]',   bg: 'bg-red-50',      icon: <XCircle className="w-3.5 h-3.5" /> },
  approved:    { label: 'Jóváhagyva',         color: 'text-emerald-600', bg: 'bg-emerald-50',  icon: <CheckCircle className="w-3.5 h-3.5" /> },
  ready:       { label: 'Átadásra kész',      color: 'text-[#C9A84C]',   bg: 'bg-amber-50',    icon: <AlertTriangle className="w-3.5 h-3.5" /> },
}

function StatusBadge({ status }: { status: QCStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

const SERVICE_TEMPLATES: Record<string, string[]> = {
  'Mobil gumiszerviz': ['torque', 'photos_uploaded', 'checkout_photos', 'customer_note', 'next_service'],
  'Autószerviz':       ['work_verified', 'torque', 'fluids', 'fault_codes', 'photos_uploaded', 'customer_note', 'invoice_ok', 'next_service'],
  'Detailing':         ['photos_uploaded', 'checkout_photos', 'customer_note', 'invoice_ok'],
  'Pickup & Delivery': ['checkout_photos', 'customer_note', 'invoice_ok', 'payment_status'],
}

export function QualityControlPage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'overview' | 'checks' | 'templates' | 'settings'>('overview')
  const [orders, setOrders] = useState<WorkOrderQC[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderQC | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [settingsNotify, setSettingsNotify] = useState(true)
  const [settingsAutoReady, setSettingsAutoReady] = useState(false)
  const [settingsRequirePhoto, setSettingsRequirePhoto] = useState(true)

  const loadOrders = useCallback(async () => {
    setLoading(true)
    const { data: wos } = await supabase
      .from('work_orders')
      .select(`
        id, order_number, status, service_type,
        customers(full_name),
        vehicles(plate),
        profiles(full_name)
      `)
      .not('status', 'in', '(delivered,closed,new_booking)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (!wos) { setLoading(false); return }

    const ids = wos.map(w => w.id)
    const { data: qcs } = ids.length > 0
      ? await supabase.from('qc_checks').select('*').in('work_order_id', ids)
      : { data: [] }

    const qcMap: Record<string, any> = {}
    for (const q of (qcs || [])) qcMap[q.work_order_id] = q

    const mapped: WorkOrderQC[] = wos.map(w => {
      const qc = qcMap[w.id]
      return {
        id: w.id,
        order_number: w.order_number || w.id.slice(0, 8),
        plate: (w.vehicles as any)?.plate || '—',
        customer: (w.customers as any)?.full_name || '—',
        service_type: w.service_type || 'Autószerviz',
        wo_status: w.status,
        technician: (w.profiles as any)?.full_name || '—',
        status: qc?.status || 'pending',
        checkedItems: qc?.checked_items || [],
        toggleValues: qc?.toggle_values || {},
        notes: qc?.notes || '',
        qc_id: qc?.id,
        approved_by: qc?.approved_by,
        approved_at: qc?.approved_at,
        updated_at: qc?.updated_at,
      }
    })

    setOrders(mapped)
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { loadOrders() }, [loadOrders])

  const stats = {
    pending:     orders.filter(o => o.status === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    needs_fix:   orders.filter(o => o.status === 'needs_fix').length,
    approved:    orders.filter(o => o.status === 'approved' || o.status === 'ready').length,
  }
  const total = orders.length
  const passRate = total > 0 ? Math.round(stats.approved / total * 100) : 0

  const recentActivity = [...orders]
    .filter(o => o.updated_at && o.status !== 'pending')
    .sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
    .slice(0, 5)

  function openPanel(order: WorkOrderQC) {
    setSelectedOrder({ ...order })
    setPanelOpen(true)
  }

  function closePanel() {
    setPanelOpen(false)
    setSelectedOrder(null)
  }

  function toggleItem(itemId: string) {
    if (!selectedOrder) return
    const checked = selectedOrder.checkedItems.includes(itemId)
    setSelectedOrder({
      ...selectedOrder,
      checkedItems: checked
        ? selectedOrder.checkedItems.filter(i => i !== itemId)
        : [...selectedOrder.checkedItems, itemId],
      status: 'in_progress',
    })
  }

  function toggleSwitch(itemId: string) {
    if (!selectedOrder) return
    setSelectedOrder({
      ...selectedOrder,
      toggleValues: { ...selectedOrder.toggleValues, [itemId]: !selectedOrder.toggleValues[itemId] },
    })
  }

  async function saveQC(status: QCStatus) {
    if (!selectedOrder) return
    setSaving(true)

    const payload = {
      work_order_id: selectedOrder.id,
      status,
      checked_items: selectedOrder.checkedItems,
      toggle_values: selectedOrder.toggleValues,
      notes: selectedOrder.notes,
      approved_by: status === 'approved' || status === 'ready' ? 'Barbara' : null,
      approved_at: status === 'approved' || status === 'ready' ? new Date().toISOString() : null,
    }

    if (selectedOrder.qc_id) {
      await supabase.from('qc_checks').update(payload).eq('id', selectedOrder.qc_id)
    } else {
      await supabase.from('qc_checks').insert(payload)
    }

    // If approved, also update work_order status to quality_check or ready
    if (status === 'approved' || status === 'ready') {
      await supabase.from('work_orders').update({ status: 'ready' }).eq('id', selectedOrder.id)
    }

    setSaving(false)
    await loadOrders()
    if (status === 'approved' || status === 'needs_fix' || status === 'ready') closePanel()
    else {
      // Re-open with fresh data
      const fresh = orders.find(o => o.id === selectedOrder.id)
      if (fresh) setSelectedOrder({ ...fresh, status, checkedItems: selectedOrder.checkedItems, toggleValues: selectedOrder.toggleValues })
    }
  }

  const requiredItems = UNIVERSAL_CHECKLIST.filter(i => i.required)
  const checkedRequired = selectedOrder ? requiredItems.filter(i => selectedOrder.checkedItems.includes(i.id)).length : 0
  const totalChecked = selectedOrder ? selectedOrder.checkedItems.length : 0
  const allRequiredDone = checkedRequired === requiredItems.length
  const progress = Math.round(totalChecked / UNIVERSAL_CHECKLIST.length * 100)

  const tabs = [
    { id: 'overview',  label: 'Áttekintés',   icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'checks',    label: 'Ellenőrzések', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'templates', label: 'Sablonok',     icon: <FileText className="w-4 h-4" /> },
    { id: 'settings',  label: 'Beállítások',  icon: <Settings className="w-4 h-4" /> },
  ] as const

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#0B1E3D]">Minőségellenőrzés</h1>
          <p className="text-sm text-gray-500 mt-0.5">Munkák QC státuszának kezelése és jóváhagyása</p>
        </div>
        <button onClick={() => { loadOrders(); onRefresh() }} className="p-2 text-[#5a6a80] hover:text-[#0B1E3D] rounded-lg hover:bg-gray-100">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? 'bg-white text-[#0B1E3D] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* ── Overview ── */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Várakozik',          value: stats.pending,     color: 'text-gray-600',    icon: <Clock className="w-5 h-5 text-gray-400" /> },
              { label: 'Folyamatban',         value: stats.in_progress, color: 'text-blue-600',    icon: <ClipboardList className="w-5 h-5 text-blue-400" /> },
              { label: 'Javítás szükséges',   value: stats.needs_fix,   color: 'text-[#C9384C]',   icon: <XCircle className="w-5 h-5 text-[#C9384C]" /> },
              { label: 'Jóváhagyva / Kész',  value: stats.approved,    color: 'text-emerald-600', icon: <CheckCircle className="w-5 h-5 text-emerald-400" /> },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-gray-50">{s.icon}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-semibold text-[#0B1E3D] mb-4">QC Átmenési arány</h2>
              <div className="flex items-end gap-4">
                <span className="text-5xl font-bold text-[#C9A84C]">{passRate}%</span>
                <span className="text-sm text-gray-500 mb-2">az összes QC jóváhagyva / kész</span>
              </div>
              <div className="mt-4 bg-gray-100 rounded-full h-2.5">
                <div className="bg-[#C9A84C] h-2.5 rounded-full transition-all" style={{ width: `${passRate}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">{total} aktív munkalap összesen</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-semibold text-[#0B1E3D] mb-4">Legutóbbi aktivitás</h2>
              {loading ? (
                <div className="flex items-center justify-center h-24 text-gray-400 text-sm">Betöltés...</div>
              ) : recentActivity.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-gray-400 text-sm">Nincs aktivitás</div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-[#0B1E3D]">{item.plate}</span>
                        <span className="text-sm text-gray-400 ml-2">— {item.customer}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={item.status} />
                        {item.updated_at && (
                          <span className="text-xs text-gray-400">
                            {new Date(item.updated_at).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Checks ── */}
      {activeTab === 'checks' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0B1E3D]">Aktív ellenőrzések</h2>
            <span className="text-sm text-gray-400">{orders.length} munkamegrendelés</span>
          </div>
          {loading ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Betöltés...</div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-gray-400 gap-2">
              <CheckCircle className="w-8 h-8 text-gray-200" />
              <p className="text-sm">Nincs aktív QC ellenőrzés</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {orders.map(order => (
                <div key={order.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#0B1E3D] text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {order.plate.split(' ')[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#0B1E3D] text-sm">{order.plate}</span>
                        <span className="text-sm text-gray-400">— {order.customer}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{order.service_type}</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs text-gray-400">{order.technician}</span>
                        <span className="text-gray-200">·</span>
                        <span className="text-xs text-gray-400">{order.order_number}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <button
                      onClick={() => openPanel(order)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        order.status === 'approved' || order.status === 'ready'
                          ? 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                          : 'bg-[#C9A84C] hover:bg-[#b8963e] text-white'
                      }`}
                    >
                      {order.status === 'approved' || order.status === 'ready' ? 'Megtekintés' : 'QC indítása'}
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Templates ── */}
      {activeTab === 'templates' && (
        <div className="grid md:grid-cols-2 gap-5">
          {Object.entries(SERVICE_TEMPLATES).map(([service, items]) => (
            <div key={service} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-base font-semibold text-[#0B1E3D] mb-3">{service}</h3>
              <ul className="space-y-2">
                {items.map(item => {
                  const found = UNIVERSAL_CHECKLIST.find(c => c.id === item)
                  const label = found ? found.label : item.replace(/_/g, ' ')
                  return (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-[#C9A84C] shrink-0" />
                      {label}
                    </li>
                  )
                })}
              </ul>
              <div className="mt-4 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">{items.length} ellenőrzési pont</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Settings ── */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-lg space-y-6">
          <h2 className="text-base font-semibold text-[#0B1E3D]">QC Beállítások</h2>
          {[
            { label: 'QC értesítések küldése', sub: 'Értesítés küldése a szerelőnek QC indításakor', value: settingsNotify, set: setSettingsNotify },
            { label: 'Automatikus "Átadásra kész" státusz', sub: 'Minden elem jóváhagyása után automatikus státuszváltás', value: settingsAutoReady, set: setSettingsAutoReady },
            { label: 'Fotók kötelezők', sub: 'QC nem zárható le fotók feltöltése nélkül', value: settingsRequirePhoto, set: setSettingsRequirePhoto },
          ].map(({ label, sub, value, set }) => (
            <div key={label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#0B1E3D]">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </div>
              <button
                onClick={() => set(!value)}
                className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-[#C9A84C]' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Panel ── */}
      {panelOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closePanel} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#0B1E3D]">
              <div>
                <h2 className="text-base font-semibold text-white">{selectedOrder.plate}</h2>
                <p className="text-xs text-gray-300 mt-0.5">{selectedOrder.customer} — {selectedOrder.service_type}</p>
              </div>
              <button onClick={closePanel} className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-500">{totalChecked} / {UNIVERSAL_CHECKLIST.length} elvégezve</span>
                <span className="text-xs font-semibold text-[#0B1E3D]">{progress}%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div className="bg-[#C9A84C] h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={selectedOrder.status} />
                {selectedOrder.approved_by && (
                  <span className="text-xs text-gray-400">· {selectedOrder.approved_by}</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {UNIVERSAL_CHECKLIST.map(item => {
                const isChecked = selectedOrder.checkedItems.includes(item.id)
                const toggleVal = selectedOrder.toggleValues[item.id]
                if (item.type === 'toggle') {
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:border-[#C9A84C]/40">
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <button
                        onClick={() => toggleSwitch(item.id)}
                        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${toggleVal ? 'bg-[#C9A84C]' : 'bg-gray-200'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${toggleVal ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  )
                }
                return (
                  <label key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-white hover:border-[#C9A84C]/40'}`}>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleItem(item.id)} className="w-4 h-4 accent-[#C9A84C] rounded shrink-0" />
                    <span className={`text-sm flex-1 ${isChecked ? 'text-emerald-700 line-through' : 'text-gray-700'}`}>{item.label}</span>
                    {item.required && !isChecked && <span className="text-[10px] text-gray-300 font-medium uppercase tracking-wide">kötelező</span>}
                  </label>
                )
              })}

              <div className="pt-2">
                <label className="block text-xs font-semibold text-[#5a6a80] uppercase tracking-wide mb-1.5">Megjegyzés (opcionális)</label>
                <textarea
                  value={selectedOrder.notes}
                  onChange={e => setSelectedOrder({ ...selectedOrder, notes: e.target.value })}
                  placeholder="QC megjegyzés a munkalaphoz..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#0B1E3D] resize-none focus:outline-none focus:border-[#0B1E3D]"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => saveQC('approved')}
                  disabled={!allRequiredDone || saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Jóváhagyás
                </button>
                <button
                  onClick={() => saveQC('needs_fix')}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C9384C] hover:bg-[#b12f41] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
                >
                  <XCircle className="w-4 h-4" />
                  Javítás szükséges
                </button>
              </div>
              <button
                onClick={() => saveQC('in_progress')}
                disabled={saving}
                className="w-full py-2 border border-gray-200 rounded-lg text-sm text-gray-500 hover:border-[#0B1E3D] hover:text-[#0B1E3D] transition-colors disabled:opacity-50"
              >
                Mentés folytatásra
              </button>
              {!allRequiredDone && (
                <p className="text-xs text-center text-gray-400">
                  Jóváhagyáshoz {requiredItems.length - checkedRequired} kötelező elem hiányzik
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
