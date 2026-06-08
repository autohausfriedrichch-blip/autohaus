'use client'
import { useState } from 'react'
import { CheckCircle, Clock, AlertTriangle, XCircle, ClipboardList, LayoutDashboard, FileText, Settings, X, ChevronRight } from 'lucide-react'

type QCStatus = 'pending' | 'in_progress' | 'needs_fix' | 'approved' | 'ready'
type ServiceType = 'Mobil gumiszerviz' | 'Autószerviz' | 'Detailing' | 'Pickup & Delivery'

interface ChecklistItem {
  id: string
  label: string
  required: boolean
  type: 'check' | 'toggle'
  toggleValue?: boolean
}

interface WorkOrderQC {
  id: string
  plate: string
  customer: string
  service: ServiceType
  status: QCStatus
  technician: string
  checkedItems: string[]
  toggleValues: Record<string, boolean>
}

const UNIVERSAL_CHECKLIST: ChecklistItem[] = [
  { id: 'work_verified', label: 'Elvégzett munka ellenőrizve', required: true, type: 'check' },
  { id: 'torque', label: 'Minden csavar / kerékcsavar nyomatékolva', required: true, type: 'check' },
  { id: 'fluids', label: 'Folyadékszintek ellenőrizve', required: true, type: 'check' },
  { id: 'fault_codes', label: 'Hibakódok ellenőrizve', required: true, type: 'check' },
  { id: 'test_drive_needed', label: 'Próbaút szükséges?', required: false, type: 'toggle' },
  { id: 'test_drive_done', label: 'Próbaút elvégezve', required: false, type: 'check' },
  { id: 'photos_uploaded', label: 'Fotók feltöltve', required: true, type: 'check' },
  { id: 'checkout_photos', label: 'Check-out fotók elkészültek', required: true, type: 'check' },
  { id: 'customer_note', label: 'Ügyfélnek látható megjegyzés megírva', required: true, type: 'check' },
  { id: 'invoice_ok', label: 'Számla / árajánlat rendben', required: true, type: 'check' },
  { id: 'payment_status', label: 'Fizetési státusz ellenőrizve', required: true, type: 'check' },
  { id: 'next_service', label: 'Következő ajánlott szerviz rögzítve', required: true, type: 'check' },
  { id: 'google_review', label: 'Google review kérés előkészítve', required: false, type: 'check' },
]

const SERVICE_TEMPLATES: Record<ServiceType, string[]> = {
  'Mobil gumiszerviz': ['torque', 'tire_pressure', 'tread_depth', 'dot_check', 'photos_uploaded'],
  'Autószerviz': ['work_verified', 'test_drive_done', 'fluids', 'fault_codes'],
  'Detailing': ['before_after_photos', 'interior_check', 'exterior_check', 'extra_request'],
  'Pickup & Delivery': ['checkin_photos', 'checkout_photos', 'key_handover', 'location_time'],
}

const MOCK_ORDERS: WorkOrderQC[] = [
  { id: '1', plate: 'ZH 123 456', customer: 'Müller Peter', service: 'Autószerviz', status: 'pending', technician: 'Kovács András', checkedItems: [], toggleValues: {} },
  { id: '2', plate: 'BE 789 012', customer: 'Schmidt Anna', service: 'Mobil gumiszerviz', status: 'in_progress', technician: 'Nagy Béla', checkedItems: ['torque', 'fluids'], toggleValues: { test_drive_needed: true } },
  { id: '3', plate: 'ZG 345 678', customer: 'Weber Klaus', service: 'Detailing', status: 'needs_fix', technician: 'Tóth Csaba', checkedItems: ['photos_uploaded'], toggleValues: {} },
  { id: '4', plate: 'LU 901 234', customer: 'Fischer Maria', service: 'Pickup & Delivery', status: 'approved', technician: 'Kovács András', checkedItems: UNIVERSAL_CHECKLIST.map(i => i.id), toggleValues: {} },
  { id: '5', plate: 'ZH 567 890', customer: 'Braun Thomas', service: 'Autószerviz', status: 'ready', technician: 'Nagy Béla', checkedItems: UNIVERSAL_CHECKLIST.map(i => i.id), toggleValues: {} },
  { id: '6', plate: 'BS 234 567', customer: 'Keller Sandra', service: 'Mobil gumiszerviz', status: 'pending', technician: 'Tóth Csaba', checkedItems: [], toggleValues: {} },
]

const RECENT_ACTIVITY = [
  { id: '1', plate: 'LU 901 234', customer: 'Fischer Maria', action: 'Jóváhagyva', time: '14:32', status: 'approved' as QCStatus },
  { id: '2', plate: 'ZG 345 678', customer: 'Weber Klaus', action: 'Javítás szükséges', time: '13:15', status: 'needs_fix' as QCStatus },
  { id: '3', plate: 'ZH 567 890', customer: 'Braun Thomas', action: 'Átadásra kész', time: '12:48', status: 'ready' as QCStatus },
  { id: '4', plate: 'BE 789 012', customer: 'Schmidt Anna', action: 'Folyamatban', time: '11:20', status: 'in_progress' as QCStatus },
]

const STATUS_CONFIG: Record<QCStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: 'Nem kezdődött el', color: 'text-gray-600', bg: 'bg-gray-100', icon: <Clock className="w-3.5 h-3.5" /> },
  in_progress: { label: 'Folyamatban', color: 'text-blue-600', bg: 'bg-blue-50', icon: <ClipboardList className="w-3.5 h-3.5" /> },
  needs_fix: { label: 'Javítás szükséges', color: 'text-[#C9384C]', bg: 'bg-red-50', icon: <XCircle className="w-3.5 h-3.5" /> },
  approved: { label: 'Jóváhagyva', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  ready: { label: 'Átadásra kész', color: 'text-[#C9A84C]', bg: 'bg-amber-50', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
}

function StatusBadge({ status }: { status: QCStatus }) {
  const cfg = STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color} ${cfg.bg}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${color === 'text-[#0B1E3D]' ? 'bg-navy-50' : ''}`} style={{ background: 'rgba(11,30,61,0.06)' }}>
          {icon}
        </div>
      </div>
    </div>
  )
}

export function QualityControlPage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'checks' | 'templates' | 'settings'>('overview')
  const [orders, setOrders] = useState<WorkOrderQC[]>(MOCK_ORDERS)
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderQC | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [settingsNotify, setSettingsNotify] = useState(true)
  const [settingsAutoReady, setSettingsAutoReady] = useState(false)
  const [settingsRequirePhoto, setSettingsRequirePhoto] = useState(true)

  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    in_progress: orders.filter(o => o.status === 'in_progress').length,
    needs_fix: orders.filter(o => o.status === 'needs_fix').length,
    approved: orders.filter(o => o.status === 'approved').length + orders.filter(o => o.status === 'ready').length,
  }
  const total = orders.length
  const passRate = total > 0 ? Math.round(((stats.approved) / total) * 100) : 0

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
    const updated = checked
      ? { ...selectedOrder, checkedItems: selectedOrder.checkedItems.filter(i => i !== itemId) }
      : { ...selectedOrder, checkedItems: [...selectedOrder.checkedItems, itemId], status: 'in_progress' as QCStatus }
    setSelectedOrder(updated)
  }

  function toggleSwitch(itemId: string) {
    if (!selectedOrder) return
    setSelectedOrder({ ...selectedOrder, toggleValues: { ...selectedOrder.toggleValues, [itemId]: !selectedOrder.toggleValues[itemId] } })
  }

  function saveStatus(status: QCStatus) {
    if (!selectedOrder) return
    const updated = { ...selectedOrder, status }
    setOrders(prev => prev.map(o => o.id === updated.id ? updated : o))
    setSelectedOrder(updated)
    if (status === 'approved' || status === 'needs_fix') closePanel()
  }

  const requiredItems = UNIVERSAL_CHECKLIST.filter(i => i.required)
  const checkedRequired = selectedOrder ? requiredItems.filter(i => selectedOrder.checkedItems.includes(i.id)).length : 0
  const totalChecked = selectedOrder ? selectedOrder.checkedItems.length : 0
  const allRequiredDone = checkedRequired === requiredItems.length
  const progress = Math.round((totalChecked / UNIVERSAL_CHECKLIST.length) * 100)

  const tabs = [
    { id: 'overview', label: 'Áttekintés', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'checks', label: 'Ellenőrzések', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'templates', label: 'Sablonok', icon: <FileText className="w-4 h-4" /> },
    { id: 'settings', label: 'Beállítások', icon: <Settings className="w-4 h-4" /> },
  ] as const

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0B1E3D]">Minőségellenőrzés</h1>
        <p className="text-sm text-gray-500 mt-1">Munkák QC státuszának kezelése és jóváhagyása</p>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-[#0B1E3D] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Várakozik" value={stats.pending} color="text-gray-600" icon={<Clock className="w-5 h-5 text-gray-400" />} />
            <StatCard label="Folyamatban" value={stats.in_progress} color="text-blue-600" icon={<ClipboardList className="w-5 h-5 text-blue-400" />} />
            <StatCard label="Javítás szükséges" value={stats.needs_fix} color="text-[#C9384C]" icon={<XCircle className="w-5 h-5 text-[#C9384C]" />} />
            <StatCard label="Jóváhagyva / Kész" value={stats.approved} color="text-emerald-600" icon={<CheckCircle className="w-5 h-5 text-emerald-400" />} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-semibold text-[#0B1E3D] mb-4">QC Átmenési arány</h2>
              <div className="flex items-end gap-4">
                <span className="text-5xl font-bold text-[#C9A84C]">{passRate}%</span>
                <span className="text-sm text-gray-500 mb-2">az összes QC jóváhagyva / kész</span>
              </div>
              <div className="mt-4 bg-gray-100 rounded-full h-2.5">
                <div className="bg-[#C9A84C] h-2.5 rounded-full transition-all" style={{ width: `${passRate}%` }} />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h2 className="text-base font-semibold text-[#0B1E3D] mb-4">Legutóbbi aktivitás</h2>
              <div className="space-y-3">
                {RECENT_ACTIVITY.map(item => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-[#0B1E3D]">{item.plate}</span>
                      <span className="text-sm text-gray-400 ml-2">— {item.customer}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={item.status} />
                      <span className="text-xs text-gray-400">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'checks' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[#0B1E3D]">Aktív ellenőrzések</h2>
            <span className="text-sm text-gray-400">{orders.length} munkamegrendelés</span>
          </div>
          <div className="divide-y divide-gray-50">
            {orders.map(order => (
              <div key={order.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[#0B1E3D] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {order.plate.split(' ')[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#0B1E3D] text-sm">{order.plate}</span>
                      <span className="text-sm text-gray-400">— {order.customer}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400">{order.service}</span>
                      <span className="text-gray-200">·</span>
                      <span className="text-xs text-gray-400">{order.technician}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={order.status} />
                  {order.status !== 'approved' && order.status !== 'ready' && (
                    <button
                      onClick={() => openPanel(order)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A84C] hover:bg-[#b8963e] text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      QC indítása
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {(order.status === 'approved' || order.status === 'ready') && (
                    <button
                      onClick={() => openPanel(order)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold rounded-lg transition-colors"
                    >
                      Megtekintés
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid md:grid-cols-2 gap-6">
          {(Object.entries(SERVICE_TEMPLATES) as [ServiceType, string[]][]).map(([service, items]) => (
            <div key={service} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-base font-semibold text-[#0B1E3D] mb-3">{service}</h3>
              <ul className="space-y-2">
                {items.map(item => {
                  const found = UNIVERSAL_CHECKLIST.find(c => c.id === item)
                  const label = found ? found.label : item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                  return (
                    <li key={item} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
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

      {panelOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={closePanel} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#0B1E3D]">
              <div>
                <h2 className="text-base font-semibold text-white">{selectedOrder.plate}</h2>
                <p className="text-xs text-gray-300 mt-0.5">{selectedOrder.customer} — {selectedOrder.service}</p>
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
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {UNIVERSAL_CHECKLIST.map(item => {
                const isChecked = selectedOrder.checkedItems.includes(item.id)
                const toggleVal = selectedOrder.toggleValues[item.id]
                if (item.type === 'toggle') {
                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-white hover:border-[#C9A84C]/40 transition-colors">
                      <span className="text-sm text-gray-700">{item.label}</span>
                      <button
                        onClick={() => toggleSwitch(item.id)}
                        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${toggleVal ? 'bg-[#C9A84C]' : 'bg-gray-200'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${toggleVal ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  )
                }
                return (
                  <label key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-white hover:border-[#C9A84C]/40'}`}>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleItem(item.id)}
                      className="w-4 h-4 accent-[#C9A84C] rounded flex-shrink-0"
                    />
                    <span className={`text-sm ${isChecked ? 'text-emerald-700 line-through' : 'text-gray-700'}`}>{item.label}</span>
                    {item.required && !isChecked && <span className="ml-auto text-[10px] text-gray-300 font-medium uppercase tracking-wide">kötelező</span>}
                  </label>
                )
              })}
            </div>

            <div className="px-5 py-4 border-t border-gray-100 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => saveStatus('approved')}
                  disabled={!allRequiredDone}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Jóváhagyás
                </button>
                <button
                  onClick={() => saveStatus('needs_fix')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C9384C] hover:bg-[#b12f41] text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Javítás szükséges
                </button>
              </div>
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
