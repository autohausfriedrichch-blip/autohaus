'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Plus, Search, Edit2, Trash2, ChevronDown, ChevronUp, Database, AlertTriangle, Cpu, Car } from 'lucide-react'
import type { Vehicle } from '@/lib/types'
import { VehicleSelector, VehicleSelectionResult } from './VehicleSelector'
import { VINDecoder } from './VINDecoder'

const FUEL_LABELS: Record<string, string> = {
  petrol: 'Benzin', diesel: 'Dízel', electric: 'Elektromos',
  hybrid: 'Hibrid', phev: 'Plug-in Hibrid', lpg: 'LPG',
}

const DATA_SOURCE_BADGE: Record<string, { label: string; cls: string }> = {
  database:  { label: 'Adatbázisból',  cls: 'bg-emerald-100 text-emerald-700' },
  vin_api:   { label: 'VIN dekódolt',  cls: 'bg-blue-100 text-blue-700' },
  manual:    { label: 'Manuális',      cls: 'bg-amber-100 text-amber-700' },
  ocr:       { label: 'OCR kiolvasott',cls: 'bg-purple-100 text-purple-700' },
}

export function VehiclesPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null)
  const [form, setForm] = useState<Partial<Vehicle>>({})
  const [saving, setSaving] = useState(false)
  const [inputMode, setInputMode] = useState<'selector' | 'vin' | 'manual'>('selector')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [dupWarning, setDupWarning] = useState<string | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: v }, { data: c }] = await Promise.all([
      supabase.from('vehicles').select('*, customer:customers(full_name, phone)').order('created_at', { ascending: false }),
      supabase.from('customers').select('id, full_name').order('full_name'),
    ])
    setVehicles((v as any) || [])
    setCustomers(c || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const filtered = vehicles.filter(v =>
    (v.license_plate || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.make || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.model || '').toLowerCase().includes(search.toLowerCase()) ||
    (v.vin || '').toLowerCase().includes(search.toLowerCase()) ||
    ((v as any).customer?.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => {
    setEditVehicle(null)
    setForm({ fuel_type: 'petrol', data_source: 'manual' })
    setInputMode('selector')
    setShowAdvanced(false)
    setDupWarning(null)
    setModalOpen(true)
  }

  const openEdit = (v: Vehicle) => {
    setEditVehicle(v)
    setForm(v)
    setInputMode('manual')
    setShowAdvanced(true)
    setDupWarning(null)
    setModalOpen(true)
  }

  const applyVehicleSelection = (result: VehicleSelectionResult) => {
    setForm(f => ({
      ...f,
      make: result.make,
      model: result.model,
      year: result.year,
      fuel_type: result.fuel_type as any,
      power_kw: result.power_kw,
      power_hp: result.power_hp,
      displacement_cc: result.displacement_cc,
      body_type: result.body_type,
      transmission: result.transmission,
      drive_type: result.drive_type,
      doors: result.doors,
      tire_size: result.tire_size,
      oil_spec: result.oil_spec,
      engine_label: result.engine_label,
      data_source: result.data_source as any,
    }))
  }

  const checkDuplicate = async (plate?: string, vin?: string) => {
    if (!plate && !vin) { setDupWarning(null); return }
    const queries = []
    if (plate) queries.push(supabase.from('vehicles').select('id, license_plate, customer:customers(full_name)').ilike('license_plate', plate).neq('id', editVehicle?.id || '00000000-0000-0000-0000-000000000000').limit(1))
    if (vin) queries.push(supabase.from('vehicles').select('id, license_plate, customer:customers(full_name)').eq('vin', vin).neq('id', editVehicle?.id || '00000000-0000-0000-0000-000000000000').limit(1))
    const results = await Promise.all(queries)
    const found = results.find(r => r.data && r.data.length > 0)
    if (found?.data?.[0]) {
      const dup = found.data[0] as any
      setDupWarning(`Lehetséges duplikáció: ${dup.license_plate} – ${dup.customer?.full_name || 'ismeretlen'}`)
    } else {
      setDupWarning(null)
    }
  }

  const handleSave = async () => {
    if (!form.customer_id || !form.make || !form.license_plate) {
      toast('Tulajdonos, márka és rendszám kötelező', 'error'); return
    }
    setSaving(true)
    const payload: any = {
      customer_id: form.customer_id,
      make: form.make, model: form.model,
      year: form.year, license_plate: form.license_plate?.toUpperCase(),
      vin: form.vin || null, mileage: form.mileage,
      fuel_type: form.fuel_type, color: form.color, notes: form.notes,
      power_kw: form.power_kw, power_hp: form.power_hp,
      displacement_cc: form.displacement_cc, body_type: form.body_type,
      transmission: form.transmission, drive_type: form.drive_type,
      doors: form.doors, tire_size: form.tire_size,
      oil_spec: form.oil_spec, engine_label: form.engine_label,
      data_source: form.data_source || 'manual',
    }
    if (editVehicle) {
      const { error } = await supabase.from('vehicles').update(payload).eq('id', editVehicle.id)
      if (error) toast(`Hiba: ${error.message}`, 'error')
      else { toast('Jármű frissítve'); setModalOpen(false); load() }
    } else {
      const { error } = await supabase.from('vehicles').insert(payload)
      if (error) toast(`Hiba: ${error.message}`, 'error')
      else { toast('Jármű létrehozva'); setModalOpen(false); load() }
    }
    setSaving(false)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8fa0b5]" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rendszám, márka, VIN, tulajdonos..."
            className="w-full pl-9 pr-3 py-2 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0B1E3D]" />
        </div>
        <Button variant="primary" onClick={openNew}><Plus size={14} /> Jármű</Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a80] text-sm">Járművek betöltése...</div>
      ) : (
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] min-w-[560px]">
              <thead>
                <tr className="bg-[#F4F5F7] border-b border-[rgba(11,30,61,0.10)]">
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Rendszám</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase">Jármű</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase hidden md:table-cell">Tulajdonos</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase hidden lg:table-cell">Motor / Üzemanyag</th>
                  <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#5a6a80] uppercase hidden lg:table-cell">Km</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(v => {
                  const src = DATA_SOURCE_BADGE[v.data_source || 'manual']
                  return (
                    <tr key={v.id} className="border-b border-[rgba(11,30,61,0.06)] hover:bg-[#fafbfc] transition-colors">
                      <td className="px-4 py-3">
                        <span className="bg-[#0B1E3D] text-white text-[11px] font-bold px-2 py-1 rounded">{v.license_plate}</span>
                        {src && (
                          <div className="mt-1">
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${src.cls}`}>{src.label}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0B1E3D]">{v.make} {v.model}</div>
                        <div className="text-[11px] text-[#5a6a80]">
                          {v.year}{v.engine_label ? ` · ${v.engine_label}` : ''}{v.color ? ` · ${v.color}` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-[12px] text-[#5a6a80]">
                        {(v as any).customer?.full_name || '–'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-[12px] text-[#5a6a80]">
                        <div>{v.engine_label || '–'}</div>
                        <div className="text-[11px]">
                          {FUEL_LABELS[v.fuel_type] || v.fuel_type}
                          {v.power_hp ? ` · ${v.power_hp} LE` : ''}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-[12px] text-[#5a6a80]">
                        {v.mileage ? `${v.mileage.toLocaleString()} km` : '–'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => openEdit(v)} className="p-1.5 text-[#5a6a80] hover:text-[#0B1E3D]"><Edit2 size={14} /></button>
                          <button onClick={async () => {
                            if (confirm('Biztosan törlöd a járművet?')) { await supabase.from('vehicles').delete().eq('id', v.id); load() }
                          }} className="p-1.5 text-[#5a6a80] hover:text-[#C9384C]"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <div className="text-center py-10 text-[#8fa0b5] text-sm">Nem található jármű</div>}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editVehicle ? 'Jármű szerkesztése' : 'Új jármű rögzítése'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Mégse</Button>
            <Button variant="primary" onClick={handleSave} disabled={saving}>{saving ? 'Mentés...' : 'Mentés'}</Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Tulajdonos */}
          <FormGroup>
            <FormLabel>Tulajdonos *</FormLabel>
            <Select value={form.customer_id || ''} onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}>
              <option value="">Kérjük válasszon...</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </Select>
          </FormGroup>

          {/* Rendszám + VIN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormGroup>
              <FormLabel>Rendszám *</FormLabel>
              <Input
                value={form.license_plate || ''}
                onChange={e => setForm(f => ({ ...f, license_plate: e.target.value }))}
                onBlur={e => checkDuplicate(e.target.value, form.vin)}
                placeholder="ZH 123456"
              />
            </FormGroup>
            <FormGroup>
              <FormLabel>VIN</FormLabel>
              <Input
                value={form.vin || ''}
                onChange={e => setForm(f => ({ ...f, vin: e.target.value }))}
                onBlur={e => checkDuplicate(form.license_plate, e.target.value)}
                placeholder="17 jegyű VIN..."
                maxLength={17}
              />
            </FormGroup>
          </div>

          {dupWarning && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertTriangle size={15} />
              <span>{dupWarning}</span>
            </div>
          )}

          {/* Járműadat beviteli mód */}
          {!editVehicle && (
            <div>
              <div className="flex gap-2 mb-3">
                {[
                  { id: 'selector', label: 'Adatbázis', icon: Database },
                  { id: 'vin',      label: 'VIN dekód', icon: Cpu },
                  { id: 'manual',   label: 'Kézi',      icon: Car },
                ].map(m => (
                  <button key={m.id} onClick={() => setInputMode(m.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors ${
                      inputMode === m.id
                        ? 'bg-[#0B1E3D] text-white border-[#0B1E3D]'
                        : 'bg-white text-[#5a6a80] border-gray-200 hover:border-[#0B1E3D]'
                    }`}>
                    <m.icon size={13} /> {m.label}
                  </button>
                ))}
              </div>

              {inputMode === 'selector' && (
                <VehicleSelector
                  onSelect={applyVehicleSelection}
                  initialMake={form.make}
                  initialModel={form.model}
                  initialYear={form.year}
                />
              )}

              {inputMode === 'vin' && (
                <VINDecoder onResult={r => {
                  applyVehicleSelection({ ...r, data_source: 'database', make: r.make || '', model: r.model || '', year: r.year || 0, fuel_type: r.fuel_type || 'petrol' })
                  setInputMode('manual')
                  setShowAdvanced(true)
                }} />
              )}
            </div>
          )}

          {/* Ha van kiválasztott jármű vagy kézi mód */}
          {(inputMode === 'manual' || editVehicle || form.make) && (
            <div>
              {(form.make || editVehicle) && (
                <div className="bg-[#F4F5F7] rounded-xl p-3 mb-3">
                  <div className="font-semibold text-[#0B1E3D] text-sm">{form.make} {form.model} {form.year}</div>
                  <div className="text-[11px] text-[#5a6a80] mt-0.5 flex flex-wrap gap-2">
                    {form.engine_label && <span>{form.engine_label}</span>}
                    {form.fuel_type && <span>{FUEL_LABELS[form.fuel_type] || form.fuel_type}</span>}
                    {form.power_hp && <span>{form.power_hp} LE</span>}
                    {form.data_source && <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${DATA_SOURCE_BADGE[form.data_source]?.cls}`}>{DATA_SOURCE_BADGE[form.data_source]?.label}</span>}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormGroup>
                  <FormLabel>Márka *</FormLabel>
                  <Input value={form.make || ''} onChange={e => setForm(f => ({ ...f, make: e.target.value, data_source: 'manual' }))} placeholder="BMW" />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Modell</FormLabel>
                  <Input value={form.model || ''} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="320d" />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Évjárat</FormLabel>
                  <Input type="number" value={form.year || ''} onChange={e => setForm(f => ({ ...f, year: parseInt(e.target.value) }))} placeholder="2020" />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Üzemanyag</FormLabel>
                  <Select value={form.fuel_type || 'petrol'} onChange={e => setForm(f => ({ ...f, fuel_type: e.target.value as any }))}>
                    {Object.entries(FUEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </Select>
                </FormGroup>
                <FormGroup>
                  <FormLabel>Km-állás</FormLabel>
                  <Input type="number" value={form.mileage || ''} onChange={e => setForm(f => ({ ...f, mileage: parseInt(e.target.value) }))} placeholder="50000" />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Szín</FormLabel>
                  <Input value={form.color || ''} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="Fekete" />
                </FormGroup>
              </div>

              {/* Részletes adatok toggle */}
              <button onClick={() => setShowAdvanced(v => !v)}
                className="flex items-center gap-1.5 text-[12px] text-[#5a6a80] hover:text-[#0B1E3D] mt-2">
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showAdvanced ? 'Kevesebb adat' : 'Részletes járműadatok'}
              </button>

              {showAdvanced && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-100">
                  <FormGroup>
                    <FormLabel>Motor</FormLabel>
                    <Input value={form.engine_label || ''} onChange={e => setForm(f => ({ ...f, engine_label: e.target.value }))} placeholder="2.0 TDI" />
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Hengerűrtartalom (cc)</FormLabel>
                    <Input type="number" value={form.displacement_cc || ''} onChange={e => setForm(f => ({ ...f, displacement_cc: parseInt(e.target.value) }))} placeholder="1968" />
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Teljesítmény kW</FormLabel>
                    <Input type="number" value={form.power_kw || ''} onChange={e => setForm(f => ({ ...f, power_kw: parseInt(e.target.value) }))} placeholder="110" />
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Teljesítmény LE</FormLabel>
                    <Input type="number" value={form.power_hp || ''} onChange={e => setForm(f => ({ ...f, power_hp: parseInt(e.target.value) }))} placeholder="150" />
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Karosszéria</FormLabel>
                    <Select value={form.body_type || ''} onChange={e => setForm(f => ({ ...f, body_type: e.target.value }))}>
                      <option value="">– Válassz –</option>
                      <option value="sedan">Szedán</option>
                      <option value="hatchback">Ferdehátú</option>
                      <option value="estate">Kombi</option>
                      <option value="suv">SUV</option>
                      <option value="coupe">Kupé</option>
                      <option value="convertible">Kabrió</option>
                      <option value="van">Furgon</option>
                      <option value="pickup">Pickup</option>
                      <option value="minivan">Kisbusz</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Sebességváltó</FormLabel>
                    <Select value={form.transmission || ''} onChange={e => setForm(f => ({ ...f, transmission: e.target.value }))}>
                      <option value="">– Válassz –</option>
                      <option value="manual">Manuális</option>
                      <option value="automatic">Automata</option>
                      <option value="cvt">CVT</option>
                      <option value="dct">DSG/DCT</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Meghajtás</FormLabel>
                    <Select value={form.drive_type || ''} onChange={e => setForm(f => ({ ...f, drive_type: e.target.value }))}>
                      <option value="">– Válassz –</option>
                      <option value="fwd">Első kerékhajtás</option>
                      <option value="rwd">Hátsó kerékhajtás</option>
                      <option value="awd">Összkerékhajtás</option>
                      <option value="4wd">4x4</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Ajtók száma</FormLabel>
                    <Select value={form.doors?.toString() || ''} onChange={e => setForm(f => ({ ...f, doors: parseInt(e.target.value) }))}>
                      <option value="">–</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </Select>
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Gumiméret</FormLabel>
                    <Input value={form.tire_size || ''} onChange={e => setForm(f => ({ ...f, tire_size: e.target.value }))} placeholder="205/55 R16" />
                  </FormGroup>
                  <FormGroup>
                    <FormLabel>Olajspecifikáció</FormLabel>
                    <Input value={form.oil_spec || ''} onChange={e => setForm(f => ({ ...f, oil_spec: e.target.value }))} placeholder="5W-30 VW 507.00" />
                  </FormGroup>
                  <FormGroup className="col-span-2">
                    <FormLabel>Adatforrás</FormLabel>
                    <Select value={form.data_source || 'manual'} onChange={e => setForm(f => ({ ...f, data_source: e.target.value as any }))}>
                      <option value="database">Adatbázisból validált</option>
                      <option value="vin_api">VIN API alapján</option>
                      <option value="manual">Manuálisan rögzített</option>
                      <option value="ocr">OCR kiolvasott</option>
                    </Select>
                  </FormGroup>
                  <FormGroup className="col-span-2">
                    <FormLabel>Megjegyzés</FormLabel>
                    <Textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                  </FormGroup>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
