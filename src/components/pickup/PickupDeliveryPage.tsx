'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { Card } from '@/components/ui/card'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Plus,
  MessageCircle,
  ChevronRight,
  Clock,
  Car,
  MapPin,
  User,
  Search,
  AlertTriangle,
  Zap,
  Minus,
} from 'lucide-react'

interface PickupDelivery {
  id: string
  customer_id: string
  vehicle_id: string
  pickup_address: string | null
  delivery_address: string | null
  pickup_datetime: string | null
  delivery_datetime: string | null
  key_handover_method: string | null
  parking_info: string | null
  gate_code: string | null
  contact_person: string | null
  urgency: 'normal' | 'urgent' | 'express'
  status: string
  notes: string | null
  driver_name: string | null
  pickup_km: number | null
  pricing_type: 'fixed' | 'distance' | 'zone' | 'free' | null
  price: number | null
  created_at: string
  customer: { full_name: string; phone: string | null } | null
  vehicle: { make: string; model: string; license_plate: string } | null
}

interface Customer {
  id: string
  full_name: string
}

interface Vehicle {
  id: string
  make: string
  model: string
  license_plate: string
  customer_id: string
}

type TabKey = 'active' | 'today' | 'all' | 'new'

const STATUS_SEQUENCE: string[] = [
  'scheduling',
  'confirmed',
  'driver_en_route',
  'picked_up',
  'checked_in',
  'in_garage',
  'in_service',
  'service_done',
  'returning',
  'delivered',
  'closed',
]

const STATUS_HU: Record<string, string> = {
  scheduling: 'Időpont egyeztetés',
  confirmed: 'Visszaigazolva',
  driver_en_route: 'Úton az autóért',
  picked_up: 'Autó átvéve',
  checked_in: 'Check-in kész',
  in_garage: 'Garázsban',
  in_service: 'Szerviz folyamatban',
  service_done: 'Szerviz kész',
  returning: 'Visszaszállítás alatt',
  delivered: 'Autó átadva',
  closed: 'Lezárva',
}

const STATUS_COLORS: Record<string, string> = {
  scheduling: 'bg-gray-100 text-gray-600 border-gray-200',
  confirmed: 'bg-blue-100 text-blue-700 border-blue-200',
  driver_en_route: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  picked_up: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  checked_in: 'bg-purple-100 text-purple-700 border-purple-200',
  in_garage: 'bg-amber-100 text-amber-700 border-amber-200',
  in_service: 'bg-orange-100 text-orange-700 border-orange-200',
  service_done: 'bg-green-100 text-green-700 border-green-200',
  returning: 'bg-teal-100 text-teal-700 border-teal-200',
  delivered: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
}

const URGENCY_CONFIG = {
  normal: { label: 'Normal', color: 'bg-gray-100 text-gray-600', icon: null },
  urgent: { label: 'Sürgős', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  express: { label: 'Express', color: 'bg-red-100 text-red-700', icon: Zap },
}

const PRICING_LABELS: Record<string, string> = {
  fixed: 'Fix',
  distance: 'Távolság',
  zone: 'Zóna',
  free: 'Ingyenes',
}

const ACTIVE_STATUSES = ['scheduling', 'confirmed', 'driver_en_route', 'picked_up', 'checked_in', 'in_garage', 'in_service', 'service_done', 'returning']

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
      {STATUS_HU[status] || status}
    </span>
  )
}

function UrgencyBadge({ urgency }: { urgency: 'normal' | 'urgent' | 'express' }) {
  const cfg = URGENCY_CONFIG[urgency]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.color}`}>
      {Icon && <Icon size={10} />}
      {cfg.label}
    </span>
  )
}

function nextStatus(current: string): string | null {
  const idx = STATUS_SEQUENCE.indexOf(current)
  if (idx < 0 || idx >= STATUS_SEQUENCE.length - 1) return null
  return STATUS_SEQUENCE[idx + 1]
}

function formatDateTimeShort(dt: string | null): string {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getWhatsAppTemplate(item: PickupDelivery): string {
  const name = item.customer?.full_name || ''
  const plate = item.vehicle?.license_plate || ''
  switch (item.status) {
    case 'confirmed':
      return `Tisztelt ${name}!\n\nVisszaigazoljuk az átvételt ${item.pickup_datetime ? formatDateTimeShort(item.pickup_datetime) : '[dátum]'}-ra.\nJármű: ${plate}\n\nÜdvözlettel,\nAutohaus Friedrich`
    case 'driver_en_route':
      return `Tisztelt ${name}!\n\nKarl elindult az Ön ${plate} rendszámú járművéért.\nVárható érkezés: hamarosan.\n\nÜdvözlettel,\nAutohaus Friedrich`
    case 'picked_up':
      return `Tisztelt ${name}!\n\nJárművét (${plate}) átvettük. Check-in folyamatban.\n\nÜdvözlettel,\nAutohaus Friedrich`
    case 'service_done':
      return `Tisztelt ${name}!\n\nJárműve (${plate}) elkészült! Visszaszállítás: ${item.delivery_datetime ? formatDateTimeShort(item.delivery_datetime) : '[idő]'}.\n\nÜdvözlettel,\nAutohaus Friedrich`
    case 'delivered':
      return `Tisztelt ${name}!\n\nÁtadás megtörtént. Köszönjük a bizalmat!\nJármű: ${plate}\n\nÜdvözlettel,\nAutohaus Friedrich`
    default:
      return `Tisztelt ${name}!\n\nTájékoztatjuk járműve (${plate}) aktuális státuszáról: ${STATUS_HU[item.status] || item.status}\n\nÜdvözlettel,\nAutohaus Friedrich`
  }
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

export default function PickupDeliveryPage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const supabase = createClient()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<TabKey>('active')
  const [items, setItems] = useState<PickupDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [tableError, setTableError] = useState(false)
  const [search, setSearch] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false)
  const [whatsAppItem, setWhatsAppItem] = useState<PickupDelivery | null>(null)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [filteredVehicles, setFilteredVehicles] = useState<Vehicle[]>([])

  const emptyForm = {
    customer_id: '',
    vehicle_id: '',
    pickup_address: '',
    delivery_address: '',
    pickup_datetime: '',
    delivery_datetime: '',
    key_handover_method: '',
    parking_info: '',
    gate_code: '',
    contact_person: '',
    urgency: 'normal' as 'normal' | 'urgent' | 'express',
    pricing_type: 'fixed' as 'fixed' | 'distance' | 'zone' | 'free',
    price: '',
    driver_name: '',
    notes: '',
  }
  const [newForm, setNewForm] = useState(emptyForm)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pickup_deliveries')
      .select('*, customer:customers(full_name,phone), vehicle:vehicles(make,model,license_plate)')
      .order('pickup_datetime', { ascending: false })
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        setTableError(true)
      } else {
        toast('Hiba a hozom-viszem adatok betöltésekor', 'error')
      }
    } else {
      setTableError(false)
      setItems((data as PickupDelivery[]) || [])
    }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFormData = useCallback(async () => {
    const [{ data: custs }, { data: vehs }] = await Promise.all([
      supabase.from('customers').select('id, full_name').order('full_name'),
      supabase.from('vehicles').select('id, make, model, license_plate, customer_id').order('license_plate'),
    ])
    setCustomers(custs || [])
    setVehicles(vehs || [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchItems()
  }, [fetchItems, refreshKey])

  useEffect(() => {
    if (activeTab === 'new') fetchFormData()
  }, [activeTab, fetchFormData])

  useEffect(() => {
    if (newForm.customer_id) {
      setFilteredVehicles(vehicles.filter(v => v.customer_id === newForm.customer_id))
    } else {
      setFilteredVehicles(vehicles)
    }
  }, [newForm.customer_id, vehicles])

  async function handleAdvanceStatus(item: PickupDelivery) {
    const next = nextStatus(item.status)
    if (!next) return
    const { error } = await supabase.from('pickup_deliveries').update({ status: next }).eq('id', item.id)
    if (error) {
      toast('Hiba a státusz frissítésekor', 'error')
    } else {
      toast(`Státusz: ${STATUS_HU[next]}`, 'success')
      fetchItems()
      onRefresh()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!newForm.customer_id || !newForm.vehicle_id) {
      toast('Ügyfél és jármű kötelező', 'error')
      return
    }
    setSubmitting(true)
    const payload = {
      customer_id: newForm.customer_id,
      vehicle_id: newForm.vehicle_id,
      pickup_address: newForm.pickup_address || null,
      delivery_address: newForm.delivery_address || null,
      pickup_datetime: newForm.pickup_datetime || null,
      delivery_datetime: newForm.delivery_datetime || null,
      key_handover_method: newForm.key_handover_method || null,
      parking_info: newForm.parking_info || null,
      gate_code: newForm.gate_code || null,
      contact_person: newForm.contact_person || null,
      urgency: newForm.urgency,
      pricing_type: newForm.pricing_type,
      price: newForm.price ? parseFloat(newForm.price) : null,
      driver_name: newForm.driver_name || null,
      notes: newForm.notes || null,
      status: 'scheduling',
    }
    const { error } = await supabase.from('pickup_deliveries').insert(payload)
    setSubmitting(false)
    if (error) {
      toast('Hiba a feladat létrehozásakor', 'error')
    } else {
      toast('Feladat létrehozva', 'success')
      setNewForm(emptyForm)
      setActiveTab('active')
      fetchItems()
      onRefresh()
    }
  }

  function openWhatsApp(item: PickupDelivery) {
    setWhatsAppItem(item)
    setShowWhatsAppModal(true)
  }

  function sendWhatsApp(item: PickupDelivery) {
    const msg = getWhatsAppTemplate(item)
    const phone = item.customer?.phone?.replace(/\D/g, '') || ''
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    setShowWhatsAppModal(false)
  }

  const todayStr = toDateString(new Date())
  const activeItems = items.filter(i => ACTIVE_STATUSES.includes(i.status))
  const todayPickups = items.filter(i => i.pickup_datetime?.startsWith(todayStr))
  const todayDeliveries = items.filter(i => i.delivery_datetime?.startsWith(todayStr))

  const filteredAll = items.filter(i => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      i.customer?.full_name.toLowerCase().includes(q) ||
      i.vehicle?.license_plate.toLowerCase().includes(q) ||
      (i.pickup_address || '').toLowerCase().includes(q) ||
      (i.driver_name || '').toLowerCase().includes(q)
    )
  })

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'active', label: 'Aktív' },
    { key: 'today', label: 'Mai feladatok' },
    { key: 'all', label: 'Összes' },
    { key: 'new', label: '+ Új' },
  ]

  if (tableError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
          <AlertTriangle size={24} className="text-amber-600" />
        </div>
        <h3 className="text-[16px] font-bold text-[#0B1E3D] mb-2">Adatbázis beállítás szükséges</h3>
        <p className="text-[13px] text-[#5a6a80] max-w-sm">
          A <code className="bg-gray-100 px-1 rounded">pickup_deliveries</code> tábla nem található az adatbázisban. Kérjük, hozza létre a táblát a Supabase irányítópulton.
        </p>
      </div>
    )
  }

  return (
    <div className="relative min-h-[60vh]">
      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-[rgba(11,30,61,0.10)] mb-6 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors ${
              activeTab === t.key
                ? 'border-[#C9A84C] text-[#0B1E3D]'
                : 'border-transparent text-[#5a6a80] hover:text-[#0B1E3D]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* AKTÍV – Kanban */}
      {activeTab === 'active' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[15px] font-bold text-[#0B1E3D]">Aktív feladatok</h2>
            <span className="text-[12px] text-[#5a6a80]">{activeItems.length} feladat</span>
          </div>
          {loading ? (
            <div className="text-center py-12 text-[#5a6a80]">Betöltés...</div>
          ) : activeItems.length === 0 ? (
            <div className="text-center py-12 text-[#5a6a80]">
              <Car size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-[14px]">Nincs aktív feladat</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {activeItems.map(item => {
                const next = nextStatus(item.status)
                return (
                  <div key={item.id} className="bg-white border border-[rgba(11,30,61,0.08)] rounded-xl p-4 flex flex-col gap-3 hover:border-[rgba(11,30,61,0.18)] transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="inline-block bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-0.5 rounded-lg font-mono">
                          {item.vehicle?.license_plate || '—'}
                        </span>
                        <div className="text-[13px] font-semibold text-[#0B1E3D] mt-1">{item.customer?.full_name || '—'}</div>
                      </div>
                      <UrgencyBadge urgency={item.urgency || 'normal'} />
                    </div>

                    {item.pickup_address && (
                      <div className="flex items-start gap-1.5 text-[12px] text-[#5a6a80]">
                        <MapPin size={12} className="mt-0.5 flex-shrink-0" />
                        <span className="truncate">{item.pickup_address}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 flex-wrap">
                      {item.pickup_datetime && (
                        <div className="flex items-center gap-1 text-[11px] text-[#5a6a80]">
                          <Clock size={11} />
                          {formatDateTimeShort(item.pickup_datetime)}
                        </div>
                      )}
                      {item.driver_name && (
                        <div className="flex items-center gap-1 text-[11px] text-[#5a6a80]">
                          <User size={11} />
                          {item.driver_name}
                        </div>
                      )}
                    </div>

                    <StatusBadge status={item.status} />

                    <div className="flex items-center gap-1.5 mt-auto">
                      <Button size="sm" variant="secondary" onClick={() => openWhatsApp(item)}>
                        <MessageCircle size={12} />
                      </Button>
                      {next && (
                        <Button size="sm" variant="gold" className="flex-1" onClick={() => handleAdvanceStatus(item)}>
                          <ChevronRight size={12} />
                          Következő lépés
                        </Button>
                      )}
                      {!next && (
                        <span className="flex-1 text-center text-[11px] text-[#5a6a80]">Lezárva</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* MAI FELADATOK */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* Mai átvételek */}
          <div>
            <h3 className="text-[13px] font-bold text-[#0B1E3D] mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#C9A84C]" />
              Mai átvételek
              <span className="text-[11px] font-normal text-[#5a6a80]">({todayPickups.length})</span>
            </h3>
            {loading ? (
              <div className="text-[13px] text-[#5a6a80] py-4">Betöltés...</div>
            ) : todayPickups.length === 0 ? (
              <div className="text-[13px] text-[#5a6a80] py-4 pl-4 border-l-2 border-[rgba(11,30,61,0.08)]">Nincs mai átvétel</div>
            ) : (
              <div className="space-y-2">
                {todayPickups.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-white border border-[rgba(11,30,61,0.08)] rounded-xl">
                    <div className="flex-shrink-0 text-[12px] font-bold text-[#0B1E3D] w-12 text-center">
                      {item.pickup_datetime ? new Date(item.pickup_datetime).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#0B1E3D]">{item.customer?.full_name || '—'}</div>
                      <div className="text-[11px] text-[#5a6a80] truncate">{item.pickup_address || '—'}</div>
                    </div>
                    <StatusBadge status={item.status} />
                    <Button size="sm" variant="secondary" onClick={() => openWhatsApp(item)}>
                      <MessageCircle size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Mai visszaszállítások */}
          <div>
            <h3 className="text-[13px] font-bold text-[#0B1E3D] mb-3 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#0B1E3D]" />
              Mai visszaszállítások
              <span className="text-[11px] font-normal text-[#5a6a80]">({todayDeliveries.length})</span>
            </h3>
            {loading ? (
              <div className="text-[13px] text-[#5a6a80] py-4">Betöltés...</div>
            ) : todayDeliveries.length === 0 ? (
              <div className="text-[13px] text-[#5a6a80] py-4 pl-4 border-l-2 border-[rgba(11,30,61,0.08)]">Nincs mai visszaszállítás</div>
            ) : (
              <div className="space-y-2">
                {todayDeliveries.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 bg-white border border-[rgba(11,30,61,0.08)] rounded-xl">
                    <div className="flex-shrink-0 text-[12px] font-bold text-[#0B1E3D] w-12 text-center">
                      {item.delivery_datetime ? new Date(item.delivery_datetime).toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#0B1E3D]">{item.customer?.full_name || '—'}</div>
                      <div className="text-[11px] text-[#5a6a80] truncate">{item.delivery_address || item.pickup_address || '—'}</div>
                    </div>
                    <StatusBadge status={item.status} />
                    <Button size="sm" variant="secondary" onClick={() => openWhatsApp(item)}>
                      <MessageCircle size={12} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ÖSSZES */}
      {activeTab === 'all' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5a6a80]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Keresés..."
                className="w-full pl-8 pr-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white text-[#0B1E3D] outline-none focus:border-[#0B1E3D] placeholder:text-[#8fa0b5]"
              />
            </div>
            <span className="text-[12px] text-[#5a6a80]">{filteredAll.length} rekord</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-[#5a6a80]">Betöltés...</div>
          ) : filteredAll.length === 0 ? (
            <div className="text-center py-12 text-[#5a6a80]">
              <Search size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-[14px]">Nincs találat</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[rgba(11,30,61,0.08)]">
                    {['Dátum', 'Ügyfél', 'Jármű', 'Átvétel helye', 'Státusz', 'Ár', 'Műveletek'].map(h => (
                      <th key={h} className="text-left py-2 px-3 text-[11px] font-semibold text-[#5a6a80] uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAll.map(item => (
                    <tr key={item.id} className="border-b border-[rgba(11,30,61,0.05)] hover:bg-[#F4F5F7]/50">
                      <td className="py-2.5 px-3 text-[#5a6a80]">{item.pickup_datetime ? formatDate(item.pickup_datetime) : '—'}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#0B1E3D]">{item.customer?.full_name || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-block bg-[#0B1E3D] text-white text-[10px] font-bold px-1.5 py-0.5 rounded font-mono">
                          {item.vehicle?.license_plate || '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#5a6a80] max-w-[160px] truncate">{item.pickup_address || '—'}</td>
                      <td className="py-2.5 px-3"><StatusBadge status={item.status} /></td>
                      <td className="py-2.5 px-3">
                        {item.price != null ? (
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-[#0B1E3D]">{formatCurrency(item.price)}</span>
                            {item.pricing_type && (
                              <span className="text-[10px] text-[#5a6a80] bg-gray-100 px-1 rounded">
                                {PRICING_LABELS[item.pricing_type]}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#5a6a80]">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        <Button size="sm" variant="secondary" onClick={() => openWhatsApp(item)}>
                          <MessageCircle size={12} />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ÚJ FELADAT */}
      {activeTab === 'new' && (
        <div className="max-w-2xl">
          <h2 className="text-[15px] font-bold text-[#0B1E3D] mb-5">Új Hozom-Viszem feladat</h2>
          <form onSubmit={handleSubmit} className="space-y-1">
            <div className="grid grid-cols-2 gap-3">
              <FormGroup>
                <FormLabel>Ügyfél *</FormLabel>
                <Select
                  value={newForm.customer_id}
                  onChange={e => setNewForm(f => ({ ...f, customer_id: e.target.value, vehicle_id: '' }))}
                  required
                >
                  <option value="">Válassz ügyfelet...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                </Select>
              </FormGroup>
              <FormGroup>
                <FormLabel>Jármű *</FormLabel>
                <Select
                  value={newForm.vehicle_id}
                  onChange={e => setNewForm(f => ({ ...f, vehicle_id: e.target.value }))}
                  required
                >
                  <option value="">Válassz járművet...</option>
                  {filteredVehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.license_plate} – {v.make} {v.model}</option>
                  ))}
                </Select>
              </FormGroup>
            </div>

            <FormGroup>
              <FormLabel>Átvétel helye</FormLabel>
              <Input
                value={newForm.pickup_address}
                onChange={e => setNewForm(f => ({ ...f, pickup_address: e.target.value }))}
                placeholder="Cím, ahol az autót átveszik..."
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Visszaszállítás helye</FormLabel>
              <Input
                value={newForm.delivery_address}
                onChange={e => setNewForm(f => ({ ...f, delivery_address: e.target.value }))}
                placeholder="Cím, ahova visszaszállítják..."
              />
            </FormGroup>

            <div className="grid grid-cols-2 gap-3">
              <FormGroup>
                <FormLabel>Átvétel időpontja</FormLabel>
                <Input
                  type="datetime-local"
                  value={newForm.pickup_datetime}
                  onChange={e => setNewForm(f => ({ ...f, pickup_datetime: e.target.value }))}
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>Visszaszállítás időpontja</FormLabel>
                <Input
                  type="datetime-local"
                  value={newForm.delivery_datetime}
                  onChange={e => setNewForm(f => ({ ...f, delivery_datetime: e.target.value }))}
                />
              </FormGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormGroup>
                <FormLabel>Kulcsátadás módja</FormLabel>
                <Input
                  value={newForm.key_handover_method}
                  onChange={e => setNewForm(f => ({ ...f, key_handover_method: e.target.value }))}
                  placeholder="pl. személyesen, postafiók..."
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>Kapcsolattartó személy</FormLabel>
                <Input
                  value={newForm.contact_person}
                  onChange={e => setNewForm(f => ({ ...f, contact_person: e.target.value }))}
                  placeholder="Név, telefonszám..."
                />
              </FormGroup>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormGroup>
                <FormLabel>Parkolási info</FormLabel>
                <Input
                  value={newForm.parking_info}
                  onChange={e => setNewForm(f => ({ ...f, parking_info: e.target.value }))}
                  placeholder="Parkoló helye, típusa..."
                />
              </FormGroup>
              <FormGroup>
                <FormLabel>Kapukód</FormLabel>
                <Input
                  value={newForm.gate_code}
                  onChange={e => setNewForm(f => ({ ...f, gate_code: e.target.value }))}
                  placeholder="pl. #1234"
                />
              </FormGroup>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormGroup>
                <FormLabel>Sürgősség</FormLabel>
                <Select
                  value={newForm.urgency}
                  onChange={e => setNewForm(f => ({ ...f, urgency: e.target.value as 'normal' | 'urgent' | 'express' }))}
                >
                  <option value="normal">Normal</option>
                  <option value="urgent">Sürgős</option>
                  <option value="express">Express</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <FormLabel>Árazás típusa</FormLabel>
                <Select
                  value={newForm.pricing_type}
                  onChange={e => setNewForm(f => ({ ...f, pricing_type: e.target.value as 'fixed' | 'distance' | 'zone' | 'free' }))}
                >
                  <option value="fixed">Fix</option>
                  <option value="distance">Távolság</option>
                  <option value="zone">Zóna</option>
                  <option value="free">Ingyenes</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <FormLabel>Ár (CHF)</FormLabel>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newForm.price}
                  onChange={e => setNewForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0.00"
                />
              </FormGroup>
            </div>

            <FormGroup>
              <FormLabel>Sofőr neve</FormLabel>
              <Input
                value={newForm.driver_name}
                onChange={e => setNewForm(f => ({ ...f, driver_name: e.target.value }))}
                placeholder="pl. Karl Müller"
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>Megjegyzések</FormLabel>
              <Textarea
                value={newForm.notes}
                onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                placeholder="Egyéb megjegyzések, különleges kérések..."
              />
            </FormGroup>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => { setNewForm(emptyForm); setActiveTab('active') }}
              >
                Mégse
              </Button>
              <Button type="submit" variant="gold" disabled={submitting}>
                {submitting ? 'Mentés...' : 'Feladat létrehozása'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* WhatsApp Modal */}
      <Modal open={showWhatsAppModal} onClose={() => setShowWhatsAppModal(false)} title="WhatsApp üzenet">
        {whatsAppItem && (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-0.5 rounded font-mono">
                {whatsAppItem.vehicle?.license_plate || '—'}
              </span>
              <span className="text-[13px] font-semibold text-[#0B1E3D]">{whatsAppItem.customer?.full_name}</span>
              <StatusBadge status={whatsAppItem.status} />
            </div>
            <div className="bg-[#dcf8c6] rounded-xl p-4 mb-4 text-[13px] text-gray-800 whitespace-pre-wrap font-mono">
              {getWhatsAppTemplate(whatsAppItem)}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowWhatsAppModal(false)}>Mégse</Button>
              <Button variant="gold" onClick={() => sendWhatsApp(whatsAppItem)}>
                <MessageCircle size={14} />
                Küldés WhatsApp-on
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
