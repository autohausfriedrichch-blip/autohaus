'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormGroup, FormLabel, Select } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import {
  MapPin, ChevronUp, ChevronDown, Settings, Navigation,
  Clock, TrendingUp, DollarSign, Download, RefreshCw, X,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stop {
  id: string
  source: 'work_order' | 'pickup_delivery'
  customer_name: string
  phone?: string
  address?: string
  city?: string
  service_type: string
  scheduled_time?: string
  distance_km: number
  duration_min: number
  is_vip?: boolean
  order_number?: string
}

interface TravelSettings {
  cost_per_km: number
  cost_per_minute: number
  minimum_fee: number
  multiplier_thun: number
  multiplier_bern: number
  multiplier_solothurn: number
}

const DEFAULT_SETTINGS: TravelSettings = {
  cost_per_km: 0.75,
  cost_per_minute: 0.50,
  minimum_fee: 25,
  multiplier_thun: 1.0,
  multiplier_bern: 1.2,
  multiplier_solothurn: 1.3,
}

const SERVICE_TYPE_LABELS: Record<string, string> = {
  mobile: 'Mobil',
  pickup: 'Abholung',
  delivery: 'Lieferung',
}

const SERVICE_TYPE_COLORS: Record<string, string> = {
  mobile: 'bg-blue-100 text-blue-800',
  pickup: 'bg-amber-100 text-amber-800',
  delivery: 'bg-emerald-100 text-emerald-800',
}

function getRegionMultiplier(city: string | undefined, settings: TravelSettings): number {
  if (!city) return 1.0
  const lower = city.toLowerCase()
  if (lower.includes('bern')) return settings.multiplier_bern
  if (lower.includes('solothurn')) return settings.multiplier_solothurn
  if (lower.includes('thun')) return settings.multiplier_thun
  return 1.0
}

function calcTravelCost(stop: Stop, settings: TravelSettings): number {
  const multiplier = getRegionMultiplier(stop.city, settings)
  const distCost = stop.distance_km * settings.cost_per_km * multiplier
  const timeCost = stop.duration_min * settings.cost_per_minute
  return Math.max(distCost + timeCost, settings.minimum_fee)
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RoutePlannerPage({
  refreshKey,
  onRefresh,
}: {
  refreshKey: number
  onRefresh: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()

  const todayStr = new Date().toISOString().split('T')[0]
  const [selectedDate, setSelectedDate] = useState(todayStr)
  const [stops, setStops] = useState<Stop[]>([])
  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<TravelSettings>(DEFAULT_SETTINGS)
  const [savingSettings, setSavingSettings] = useState(false)
  // per-stop VIP-zero billing override: stopId → boolean
  const [vipZero, setVipZero] = useState<Record<string, boolean>>({})

  // ── Load travel settings ───────────────────────────────────────────────────
  const loadSettings = useCallback(async () => {
    const keys: (keyof TravelSettings)[] = [
      'cost_per_km', 'cost_per_minute', 'minimum_fee',
      'multiplier_thun', 'multiplier_bern', 'multiplier_solothurn',
    ]
    const { data } = await supabase
      .from('system_settings')
      .select('key,value')
      .eq('category', 'travel')
      .in('key', keys)

    if (data && data.length > 0) {
      const merged = { ...DEFAULT_SETTINGS }
      for (const row of data) {
        const k = row.key as keyof TravelSettings
        const v = parseFloat(row.value)
        if (!isNaN(v)) merged[k] = v
      }
      setSettings(merged)
    }
  }, [])

  // ── Load stops ─────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [woRes, settingsLoaded] = await Promise.all([
        supabase
          .from('work_orders')
          .select(
            '*, customer:customers(full_name,phone,whatsapp,city,address,is_vip), vehicle:vehicles(make,model,license_plate)'
          )
          .eq('scheduled_date', selectedDate)
          .in('service_type', ['mobile', 'pickup', 'delivery'])
          .order('scheduled_time'),
        loadSettings(),
      ])

      const woStops: Stop[] = (woRes.data || []).map((wo: any) => ({
        id: wo.id,
        source: 'work_order',
        customer_name: wo.customer?.full_name ?? 'Ismeretlen',
        phone: wo.customer?.phone,
        address: wo.customer?.address ?? wo.mobile_address,
        city: wo.customer?.city,
        service_type: wo.service_type,
        scheduled_time: wo.scheduled_time?.slice(0, 5),
        distance_km: 0,
        duration_min: 30,
        is_vip: wo.customer?.is_vip ?? false,
        order_number: wo.order_number,
      }))

      let pdStops: Stop[] = []
      try {
        const { data: pdData } = await supabase
          .from('pickup_deliveries')
          .select(
            '*, customer:customers(full_name,phone,city,address,is_vip), vehicle:vehicles(make,model,license_plate)'
          )
          .eq('scheduled_date', selectedDate)

        if (pdData && pdData.length > 0) {
          pdStops = pdData.map((pd: any) => ({
            id: pd.id,
            source: 'pickup_delivery',
            customer_name: pd.customer?.full_name ?? 'Ismeretlen',
            phone: pd.customer?.phone,
            address: pd.customer?.address ?? pd.pickup_address,
            city: pd.customer?.city,
            service_type: pd.type ?? 'pickup',
            scheduled_time: pd.scheduled_time?.slice(0, 5),
            distance_km: 0,
            duration_min: 20,
            is_vip: pd.customer?.is_vip ?? false,
          }))
        }
      } catch (_) {
        // pickup_deliveries table may not exist
      }

      setStops([...woStops, ...pdStops])
    } finally {
      setLoading(false)
    }
  }, [selectedDate, refreshKey])

  useEffect(() => { load() }, [load])

  // ── Reorder helpers ────────────────────────────────────────────────────────
  const moveUp = (idx: number) => {
    if (idx === 0) return
    setStops(prev => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }
  const moveDown = (idx: number) => {
    setStops(prev => {
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  const updateStop = (id: string, field: 'distance_km' | 'duration_min', value: number) => {
    setStops(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  // ── Summary calculations ───────────────────────────────────────────────────
  const totalKm = stops.reduce((s, x) => s + x.distance_km, 0)
  const totalMin = stops.reduce((s, x) => s + x.duration_min, 0)
  const totalTravelCost = stops.reduce((s, x) => s + calcTravelCost(x, settings), 0)
  const totalBilled = stops.reduce((s, x) => {
    if (vipZero[x.id]) return s
    return s + calcTravelCost(x, settings)
  }, 0)
  const totalProfit = totalBilled - totalTravelCost

  // ── Save settings ──────────────────────────────────────────────────────────
  const saveSettings = async () => {
    setSavingSettings(true)
    const rows = (Object.entries(settings) as [keyof TravelSettings, number][]).map(
      ([key, value]) => ({
        category: 'travel',
        key,
        value: String(value),
      })
    )
    const { error } = await supabase
      .from('system_settings')
      .upsert(rows, { onConflict: 'category,key' })

    if (error) {
      toast('Hiba a mentés során: ' + error.message, 'error')
    } else {
      toast('Beállítások mentve')
    }
    setSavingSettings(false)
  }

  // ── Export route ───────────────────────────────────────────────────────────
  const exportRoute = () => {
    const lines: string[] = [
      `=== Napi útvonal – ${selectedDate} ===`,
      `Megállók: ${stops.length} | Km: ${totalKm.toFixed(1)} | Idő: ${totalMin} perc`,
      '',
    ]
    stops.forEach((s, i) => {
      lines.push(
        `${i + 1}. ${s.scheduled_time ? s.scheduled_time + '  ' : ''}${s.customer_name}` +
          (s.address ? ` – ${s.address}` : '') +
          (s.city ? `, ${s.city}` : '') +
          ` [${SERVICE_TYPE_LABELS[s.service_type] ?? s.service_type}]` +
          ` ${s.distance_km} km / ${s.duration_min} min` +
          ` → CHF ${calcTravelCost(s, settings).toFixed(2)}${vipZero[s.id] ? ' (VIP – 0)' : ''}`
      )
    })
    lines.push('', `Összesen: ${formatCurrency(totalBilled)}`)
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `route_${selectedDate}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white text-[#0B1E3D] outline-none focus:border-[#0B1E3D]"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <Button variant="secondary" size="sm" onClick={load}>
            <RefreshCw size={13} /> Frissítés
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(o => !o)}>
            <Settings size={13} /> Beállítások
          </Button>
          <Button variant="gold" size="sm" onClick={exportRoute} disabled={stops.length === 0}>
            <Download size={13} /> Export
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Mai megállók', value: stops.length, icon: <MapPin size={16} /> },
          { label: 'Összes km (becsült)', value: `${totalKm.toFixed(1)} km`, icon: <Navigation size={16} /> },
          {
            label: 'Becsült menetidő',
            value: `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`,
            icon: <Clock size={16} />,
          },
          { label: 'Napi bevétel', value: formatCurrency(totalBilled), icon: <TrendingUp size={16} /> },
        ].map(stat => (
          <Card key={stat.label} className="flex items-center gap-3">
            <span className="text-[#C9A84C]">{stat.icon}</span>
            <div>
              <div className="text-[11px] text-[#5a6a80] font-medium">{stat.label}</div>
              <div className="text-[16px] font-bold text-[#0B1E3D]">{stat.value}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Travel cost settings panel */}
      {settingsOpen && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <CardTitle icon={<Settings size={14} />}>Menetköltség beállítások</CardTitle>
            <button onClick={() => setSettingsOpen(false)} className="text-[#5a6a80] hover:text-[#0B1E3D]">
              <X size={15} />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(
              [
                ['cost_per_km', 'CHF / km'],
                ['cost_per_minute', 'CHF / perc'],
                ['minimum_fee', 'Minimum díj (CHF)'],
                ['multiplier_thun', 'Thun szorzó'],
                ['multiplier_bern', 'Bern szorzó'],
                ['multiplier_solothurn', 'Solothurn szorzó'],
              ] as [keyof TravelSettings, string][]
            ).map(([key, label]) => (
              <FormGroup key={key} className="mb-0">
                <FormLabel>{label}</FormLabel>
                <Input
                  type="number"
                  step="0.01"
                  value={settings[key]}
                  onChange={e =>
                    setSettings(s => ({ ...s, [key]: parseFloat(e.target.value) || 0 }))
                  }
                />
              </FormGroup>
            ))}
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="primary" size="sm" onClick={saveSettings} disabled={savingSettings}>
              {savingSettings ? 'Mentés...' : 'Mentés'}
            </Button>
          </div>
        </Card>
      )}

      {/* Stop list */}
      <Card>
        <CardTitle icon={<MapPin size={14} />}>Megállók</CardTitle>
        {loading ? (
          <div className="text-center py-10 text-[#5a6a80] text-sm">Betöltés...</div>
        ) : stops.length === 0 ? (
          <div className="text-center py-10 text-[#8fa0b5] text-sm">
            Nincs mai mobil / szállítási megbízás
          </div>
        ) : (
          <div className="space-y-3">
            {stops.map((stop, idx) => {
              const cost = calcTravelCost(stop, settings)
              const billed = vipZero[stop.id] ? 0 : cost
              return (
                <div
                  key={stop.id}
                  className="border border-[rgba(11,30,61,0.10)] rounded-xl p-3 bg-[#F4F5F7]"
                >
                  <div className="flex items-start gap-3">
                    {/* Sequence + reorder */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <div className="w-7 h-7 rounded-full bg-[#0B1E3D] text-white text-[12px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <button
                        onClick={() => moveUp(idx)}
                        disabled={idx === 0}
                        className="text-[#5a6a80] hover:text-[#0B1E3D] disabled:opacity-20"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        onClick={() => moveDown(idx)}
                        disabled={idx === stops.length - 1}
                        className="text-[#5a6a80] hover:text-[#0B1E3D] disabled:opacity-20"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold text-[14px] text-[#0B1E3D]">
                          {stop.customer_name}
                        </span>
                        {stop.is_vip && (
                          <span className="text-[10px] font-bold bg-[#C9A84C]/20 text-[#8a6a00] px-1.5 py-0.5 rounded-full">
                            ⭐ VIP
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            SERVICE_TYPE_COLORS[stop.service_type] ?? 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {SERVICE_TYPE_LABELS[stop.service_type] ?? stop.service_type}
                        </span>
                        {stop.scheduled_time && (
                          <span className="text-[11px] text-[#5a6a80]">
                            <Clock size={11} className="inline mr-0.5" />
                            {stop.scheduled_time}
                          </span>
                        )}
                      </div>
                      {(stop.address || stop.city) && (
                        <div className="text-[12px] text-[#5a6a80] mb-2">
                          <MapPin size={11} className="inline mr-1 text-[#C9A84C]" />
                          {[stop.address, stop.city].filter(Boolean).join(', ')}
                        </div>
                      )}

                      {/* Distance / duration inputs */}
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <FormGroup className="mb-0">
                          <FormLabel>Távolság (km)</FormLabel>
                          <Input
                            type="number"
                            min={0}
                            step={0.1}
                            value={stop.distance_km}
                            onChange={e =>
                              updateStop(stop.id, 'distance_km', parseFloat(e.target.value) || 0)
                            }
                          />
                        </FormGroup>
                        <FormGroup className="mb-0">
                          <FormLabel>Menetidő (perc)</FormLabel>
                          <Input
                            type="number"
                            min={0}
                            step={1}
                            value={stop.duration_min}
                            onChange={e =>
                              updateStop(stop.id, 'duration_min', parseInt(e.target.value) || 0)
                            }
                          />
                        </FormGroup>
                      </div>
                    </div>

                    {/* Cost summary */}
                    <div className="shrink-0 text-right">
                      <div className="text-[11px] text-[#5a6a80]">Menetköltség</div>
                      <div className="text-[15px] font-bold text-[#0B1E3D]">
                        {formatCurrency(cost)}
                      </div>
                      <div className="text-[11px] text-[#5a6a80] mt-1">Számlázva</div>
                      <div
                        className={`text-[14px] font-bold ${billed === 0 ? 'text-[#C9384C]' : 'text-[#16a34a]'}`}
                      >
                        {billed === 0 ? 'CHF 0.00' : formatCurrency(billed)}
                      </div>
                      {stop.is_vip && (
                        <label className="flex items-center gap-1 mt-1 cursor-pointer justify-end">
                          <input
                            type="checkbox"
                            checked={!!vipZero[stop.id]}
                            onChange={e =>
                              setVipZero(v => ({ ...v, [stop.id]: e.target.checked }))
                            }
                            className="accent-[#C9384C]"
                          />
                          <span className="text-[10px] text-[#5a6a80]">VIP = 0</span>
                        </label>
                      )}
                    </div>
                  </div>
                  {/* Navigate button – mobile primary action */}
                  {(stop.address || stop.city) && (
                    <div className="mt-3 pt-2 border-t border-[rgba(11,30,61,0.06)]">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([stop.address, stop.city].filter(Boolean).join(', '))}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-mobile-action bg-[#0B1E3D] text-white w-full text-[13px] no-underline"
                        style={{ display: 'flex' }}
                      >
                        <Navigation size={16} />
                        Navigáció indítása
                      </a>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Route summary */}
      {stops.length > 0 && (
        <Card>
          <CardTitle icon={<TrendingUp size={14} />}>Napi összesítő</CardTitle>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Összes km', value: `${totalKm.toFixed(1)} km` },
              { label: 'Összes menetidő', value: `${totalMin} perc` },
              { label: 'Valós menetköltség', value: formatCurrency(totalTravelCost) },
              { label: 'Számlázott', value: formatCurrency(totalBilled), highlight: 'gold' },
              {
                label: 'Nyereség',
                value: formatCurrency(totalProfit),
                highlight: totalProfit >= 0 ? 'green' : 'red',
              },
            ].map(item => (
              <div key={item.label} className="bg-[#F4F5F7] rounded-xl p-3 text-center">
                <div className="text-[11px] text-[#5a6a80] mb-1">{item.label}</div>
                <div
                  className={`text-[15px] font-bold ${
                    item.highlight === 'gold'
                      ? 'text-[#C9A84C]'
                      : item.highlight === 'green'
                      ? 'text-[#16a34a]'
                      : item.highlight === 'red'
                      ? 'text-[#C9384C]'
                      : 'text-[#0B1E3D]'
                  }`}
                >
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          {/* Per-stop billing table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[11px] text-[#5a6a80] uppercase tracking-[0.4px] border-b border-[rgba(11,30,61,0.08)]">
                  <th className="text-left pb-2">#</th>
                  <th className="text-left pb-2">Ügyfél</th>
                  <th className="text-right pb-2">Valós</th>
                  <th className="text-right pb-2">Számlázott</th>
                  <th className="text-right pb-2">Különbség</th>
                </tr>
              </thead>
              <tbody>
                {stops.map((s, i) => {
                  const real = calcTravelCost(s, settings)
                  const billed = vipZero[s.id] ? 0 : real
                  const diff = billed - real
                  return (
                    <tr key={s.id} className="border-b border-[rgba(11,30,61,0.05)]">
                      <td className="py-1.5 pr-2 text-[#5a6a80]">{i + 1}</td>
                      <td className="py-1.5 font-medium text-[#0B1E3D]">{s.customer_name}</td>
                      <td className="py-1.5 text-right text-[#5a6a80]">{formatCurrency(real)}</td>
                      <td className="py-1.5 text-right font-semibold">
                        {formatCurrency(billed)}
                      </td>
                      <td
                        className={`py-1.5 text-right font-semibold ${
                          diff < 0 ? 'text-[#C9384C]' : 'text-[#16a34a]'
                        }`}
                      >
                        {diff !== 0 ? formatCurrency(diff) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Map placeholder */}
      <Card className="border-dashed border-2 border-[rgba(11,30,61,0.15)]">
        <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
          <div className="w-14 h-14 rounded-full bg-[#F4F5F7] flex items-center justify-center">
            <MapPin size={28} className="text-[#C9A84C]" />
          </div>
          <div>
            <div className="font-semibold text-[15px] text-[#0B1E3D] mb-1">
              Google Maps / Mapbox integráció
            </div>
            <div className="text-[12px] text-[#5a6a80] max-w-xs">
              Add az API kulcsot a{' '}
              <span className="font-semibold text-[#C9A84C]">
                Beállítások → Kommunikáció
              </span>{' '}
              menüben az interaktív térkép engedélyezéséhez.
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
