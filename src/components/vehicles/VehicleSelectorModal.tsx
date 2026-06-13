'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, FormGroup, FormLabel, Select } from '@/components/ui/form'
import { Card } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { ChevronLeft, ChevronRight, Search, Clock, Zap, Gauge } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VehicleData {
  make: string
  model: string
  year: number | null
  fuel_type: string
  power_kw: number | null
  engine_cc: number | null
  body_type: string
}

interface VehicleVariant {
  id?: number
  make: string
  model: string
  year_from?: number | null
  year_to?: number | null
  body_type?: string | null
  engine_code?: string | null
  displacement_cc?: number | null
  power_kw?: number | null
  fuel_type?: string | null
  transmission?: string | null
}

interface VehicleSelectorProps {
  open: boolean
  onClose: () => void
  onSelect: (data: VehicleData) => void
}

type Step = 1 | 2 | 3 | 4

// ─── Brand colour map (initials fallback) ────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  BMW: '#0066B1',
  Mercedes: '#00ADEF',
  'Mercedes-Benz': '#00ADEF',
  Audi: '#BB0A30',
  Volkswagen: '#001E50',
  VW: '#001E50',
  Toyota: '#EB0A1E',
  Honda: '#CC0000',
  Ford: '#003478',
  Opel: '#FFED00',
  Renault: '#FFCD11',
  Peugeot: '#002B5C',
  Citroën: '#D11830',
  Seat: '#E2001A',
  Skoda: '#4BA82E',
  Volvo: '#003057',
  Hyundai: '#002C5F',
  Kia: '#05141F',
  Mazda: '#1A1A1A',
  Nissan: '#C3002F',
  Fiat: '#8C1728',
  Alfa: '#AE0B27',
  'Alfa Romeo': '#AE0B27',
  Porsche: '#D5001C',
  Ferrari: '#D40000',
  Lamborghini: '#D4A017',
  Tesla: '#CC0000',
  Subaru: '#003594',
  Mitsubishi: '#E60012',
  Suzuki: '#004B93',
  Dacia: '#002E6E',
  Lancia: '#003082',
  Jeep: '#374B00',
  Land: '#005A2B',
  'Land Rover': '#005A2B',
  Mini: '#000000',
  Smart: '#008FD4',
}

function brandColor(make: string): string {
  return BRAND_COLORS[make] || '#0D0D0D'
}

function initials(make: string): string {
  return make
    .split(/[\s-]/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ─── Fuel labels ─────────────────────────────────────────────────────────────

const FUEL_LABELS: Record<string, string> = {
  benzin: 'Benzin',
  diesel: 'Dízel',
  hybrid: 'Hibrid',
  elektromos: 'Elektromos',
  lpg: 'LPG',
  cng: 'CNG',
  phev: 'PHEV',
  '': '—',
}

function fuelLabel(f: string | null | undefined): string {
  if (!f) return '—'
  return FUEL_LABELS[f.toLowerCase()] ?? f
}

// ─── Step indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: Step }) {
  const steps = [
    { n: 1, label: 'Márka' },
    { n: 2, label: 'Modell' },
    { n: 3, label: 'Motor' },
    { n: 4, label: 'Összesítő' },
  ]
  return (
    <div className="flex items-center gap-0 mb-5">
      {steps.map(({ n, label }, idx) => (
        <div key={n} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all ${
                n < current
                  ? 'bg-[#C8102E] border-[#C8102E] text-[#0D0D0D]'
                  : n === current
                  ? 'bg-[#0D0D0D] border-[#0D0D0D] text-white'
                  : 'bg-white border-[rgba(0,0,0,0.2)] text-[#4a4a4a]'
              }`}
            >
              {n < current ? '✓' : n}
            </div>
            <span
              className={`text-[9px] mt-1 font-semibold uppercase tracking-[0.5px] ${
                n === current ? 'text-[#0D0D0D]' : 'text-[#4a4a4a]'
              }`}
            >
              {label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`h-[2px] flex-1 mx-1 mb-3 rounded-full ${
                n < current ? 'bg-[#C8102E]' : 'bg-[rgba(0,0,0,0.12)]'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function VehicleSelectorModal({ open, onClose, onSelect }: VehicleSelectorProps) {
  const { toast } = useToast()
  const supabase = createClient()

  // Navigation state
  const [step, setStep] = useState<Step>(1)
  const [selectedMake, setSelectedMake] = useState('')
  const [selectedModel, setSelectedModel] = useState('')

  // Step 1
  const [makes, setMakes] = useState<string[]>([])
  const [makesLoading, setMakesLoading] = useState(false)
  const [makeSearch, setMakeSearch] = useState('')

  // Step 2
  const [models, setModels] = useState<string[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelSearch, setModelSearch] = useState('')

  // Step 3
  const [variants, setVariants] = useState<VehicleVariant[]>([])
  const [variantsLoading, setVariantsLoading] = useState(false)
  const [manualEntry, setManualEntry] = useState(false)
  const [manualYear, setManualYear] = useState('')
  const [manualFuel, setManualFuel] = useState('')

  // Step 4 — editable summary
  const [formData, setFormData] = useState<VehicleData>({
    make: '',
    model: '',
    year: null,
    fuel_type: '',
    power_kw: null,
    engine_cc: null,
    body_type: '',
  })

  // ─ Reset on open/close ────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setStep(1)
    setSelectedMake('')
    setSelectedModel('')
    setMakeSearch('')
    setModelSearch('')
    setManualEntry(false)
    setManualYear('')
    setManualFuel('')
  }, [open])

  // ─ Load makes ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open || step !== 1 || makes.length) return
    setMakesLoading(true)
    supabase
      .from('vehicle_models')
      .select('make')
      .order('make')
      .then(({ data, error }) => {
        if (error) {
          toast('Márkák betöltése sikertelen', 'error')
        } else {
          const unique = [...new Set((data ?? []).map((r: { make: string }) => r.make).filter(Boolean))]
          setMakes(unique)
        }
        setMakesLoading(false)
      })
  }, [open, step]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─ Load models ────────────────────────────────────────────────────────────
  const loadModels = useCallback(
    async (make: string) => {
      setModelsLoading(true)
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('model')
        .eq('make', make)
        .order('model')
      if (error) {
        toast('Modellek betöltése sikertelen', 'error')
      } else {
        const unique = [...new Set((data ?? []).map((r: { model: string }) => r.model).filter(Boolean))]
        setModels(unique)
      }
      setModelsLoading(false)
    },
    [supabase, toast]
  )

  // ─ Load variants ──────────────────────────────────────────────────────────
  const loadVariants = useCallback(
    async (make: string, model: string) => {
      setVariantsLoading(true)
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('*')
        .eq('make', make)
        .eq('model', model)
        .order('year_from')
      if (error) {
        toast('Motorváltozatok betöltése sikertelen', 'error')
      } else {
        setVariants((data ?? []) as VehicleVariant[])
      }
      setVariantsLoading(false)
    },
    [supabase, toast]
  )

  // ─ Handlers ───────────────────────────────────────────────────────────────

  function handleMakeSelect(make: string) {
    setSelectedMake(make)
    setModels([])
    setModelSearch('')
    setStep(2)
    loadModels(make)
  }

  function handleModelSelect(model: string) {
    setSelectedModel(model)
    setVariants([])
    setManualEntry(false)
    setStep(3)
    loadVariants(selectedMake, model)
  }

  function handleVariantSelect(v: VehicleVariant) {
    setFormData({
      make: v.make,
      model: v.model,
      year: v.year_from ?? null,
      fuel_type: v.fuel_type ?? '',
      power_kw: v.power_kw ?? null,
      engine_cc: v.displacement_cc ?? null,
      body_type: v.body_type ?? '',
    })
    setStep(4)
  }

  function handleManualProceed() {
    setFormData({
      make: selectedMake,
      model: selectedModel,
      year: manualYear ? parseInt(manualYear) : null,
      fuel_type: manualFuel,
      power_kw: null,
      engine_cc: null,
      body_type: '',
    })
    setStep(4)
  }

  function handleConfirm() {
    if (!formData.make || !formData.model) {
      toast('Márka és modell megadása kötelező', 'error')
      return
    }
    onSelect(formData)
    onClose()
    toast(`${formData.make} ${formData.model} kiválasztva`, 'success')
  }

  function updateForm(field: keyof VehicleData, value: string | number | null) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // ─ Filtered lists ─────────────────────────────────────────────────────────

  const filteredMakes = makes.filter((m) =>
    m.toLowerCase().includes(makeSearch.toLowerCase())
  )

  const filteredModels = models.filter((m) =>
    m.toLowerCase().includes(modelSearch.toLowerCase())
  )

  // ─ Render steps ───────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div>
        <div className="mb-4 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a4a4a]" />
          <input
            type="text"
            placeholder="Márka keresése…"
            value={makeSearch}
            onChange={(e) => setMakeSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] bg-[#F4F5F7] text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#888888]"
          />
        </div>
        {makesLoading ? (
          <div className="flex justify-center py-10 text-[#4a4a4a] text-[13px]">Betöltés…</div>
        ) : filteredMakes.length === 0 ? (
          <div className="text-center py-10 text-[#4a4a4a] text-[13px]">Nincs találat</div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
            {filteredMakes.map((make) => {
              const color = brandColor(make)
              const init = initials(make)
              return (
                <button
                  key={make}
                  onClick={() => handleMakeSelect(make)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-[rgba(0,0,0,0.10)] bg-white hover:border-[#C8102E] hover:shadow-md transition-all group"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {init}
                  </div>
                  <span className="text-[11px] font-semibold text-[#0D0D0D] text-center leading-tight group-hover:text-[#C8102E] transition-colors">
                    {make}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  function renderStep2() {
    return (
      <div>
        <button
          onClick={() => setStep(1)}
          className="flex items-center gap-1.5 text-[12px] text-[#4a4a4a] hover:text-[#0D0D0D] mb-4 transition-colors"
        >
          <ChevronLeft size={14} />
          Vissza
        </button>
        <div className="mb-4 px-3 py-2 bg-[#F4F5F7] rounded-lg text-[12px] text-[#0D0D0D] font-semibold">
          Márka:{' '}
          <span
            className="inline-block px-2 py-0.5 rounded-full text-white text-[11px] ml-1"
            style={{ backgroundColor: brandColor(selectedMake) }}
          >
            {selectedMake}
          </span>
        </div>
        <div className="mb-4 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4a4a4a]" />
          <input
            type="text"
            placeholder="Modell keresése…"
            value={modelSearch}
            onChange={(e) => setModelSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] bg-[#F4F5F7] text-[#0D0D0D] outline-none focus:border-[#0D0D0D] placeholder:text-[#888888]"
          />
        </div>
        {modelsLoading ? (
          <div className="flex justify-center py-10 text-[#4a4a4a] text-[13px]">Betöltés…</div>
        ) : filteredModels.length === 0 ? (
          <div className="text-center py-10 text-[#4a4a4a] text-[13px]">Nincs találat</div>
        ) : (
          <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredModels.map((model) => (
              <button
                key={model}
                onClick={() => handleModelSelect(model)}
                className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-[rgba(0,0,0,0.10)] bg-white hover:border-[#C8102E] hover:bg-[#FFFBF0] transition-all text-[13px] font-medium text-[#0D0D0D] text-left group"
              >
                {model}
                <ChevronRight size={14} className="text-[#4a4a4a] group-hover:text-[#C8102E] transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  function renderStep3() {
    return (
      <div>
        <button
          onClick={() => setStep(2)}
          className="flex items-center gap-1.5 text-[12px] text-[#4a4a4a] hover:text-[#0D0D0D] mb-4 transition-colors"
        >
          <ChevronLeft size={14} />
          Vissza
        </button>

        <div className="mb-4 px-3 py-2 bg-[#F4F5F7] rounded-lg text-[12px] text-[#0D0D0D] font-semibold flex gap-2 flex-wrap">
          <span>
            Márka:{' '}
            <span
              className="inline-block px-2 py-0.5 rounded-full text-white text-[11px]"
              style={{ backgroundColor: brandColor(selectedMake) }}
            >
              {selectedMake}
            </span>
          </span>
          <span className="text-[#4a4a4a]">|</span>
          <span>
            Modell: <span className="text-[#C8102E]">{selectedModel}</span>
          </span>
        </div>

        {variantsLoading ? (
          <div className="flex justify-center py-10 text-[#4a4a4a] text-[13px]">Betöltés…</div>
        ) : (
          <>
            {variants.length > 0 && !manualEntry && (
              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1 mb-3">
                {variants.map((v, idx) => (
                  <button
                    key={v.id ?? idx}
                    onClick={() => handleVariantSelect(v)}
                    className="flex items-start gap-3 p-3 rounded-xl border border-[rgba(0,0,0,0.10)] bg-white hover:border-[#C8102E] hover:bg-[#FFFBF0] transition-all text-left group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {(v.year_from || v.year_to) && (
                          <span className="flex items-center gap-1 text-[11px] text-[#4a4a4a]">
                            <Clock size={11} />
                            {v.year_from ?? '?'}
                            {v.year_to ? `–${v.year_to}` : '+'}
                          </span>
                        )}
                        {v.fuel_type && (
                          <span className="px-2 py-0.5 rounded-full bg-[#F4F5F7] text-[10px] font-semibold text-[#0D0D0D] uppercase tracking-[0.3px]">
                            {fuelLabel(v.fuel_type)}
                          </span>
                        )}
                        {v.body_type && (
                          <span className="px-2 py-0.5 rounded-full bg-[rgba(201,168,76,0.12)] text-[10px] font-semibold text-[#8a6a20] uppercase tracking-[0.3px]">
                            {v.body_type}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[12px] text-[#4a4a4a]">
                        {v.power_kw && (
                          <span className="flex items-center gap-1">
                            <Zap size={11} className="text-[#C8102E]" />
                            {v.power_kw} kW
                          </span>
                        )}
                        {v.displacement_cc && (
                          <span className="flex items-center gap-1">
                            <Gauge size={11} className="text-[#C8102E]" />
                            {v.displacement_cc} cc
                          </span>
                        )}
                        {v.engine_code && (
                          <span className="font-mono text-[10px] text-[#888888]">{v.engine_code}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight
                      size={14}
                      className="text-[#4a4a4a] group-hover:text-[#C8102E] transition-colors mt-1 shrink-0"
                    />
                  </button>
                ))}
              </div>
            )}

            {variants.length === 0 && !manualEntry && (
              <div className="text-center py-6 text-[#4a4a4a] text-[13px] mb-3">
                Nem találtunk rögzített motorváltozatot ehhez a modellhez.
              </div>
            )}

            {/* Manual entry toggle / form */}
            {!manualEntry ? (
              <button
                onClick={() => setManualEntry(true)}
                className="w-full py-2.5 border border-dashed border-[rgba(0,0,0,0.25)] rounded-xl text-[12px] text-[#4a4a4a] hover:border-[#C8102E] hover:text-[#C8102E] transition-all"
              >
                + Egyéni adatok megadása
              </button>
            ) : (
              <div className="p-4 rounded-xl border border-[rgba(201,168,76,0.4)] bg-[#FFFBF0]">
                <p className="text-[11px] font-semibold text-[#8a6a20] uppercase tracking-[0.5px] mb-3">
                  Egyéni adatok
                </p>
                <FormGroup>
                  <FormLabel>Évjárat</FormLabel>
                  <input
                    type="number"
                    placeholder="pl. 2019"
                    value={manualYear}
                    onChange={(e) => setManualYear(e.target.value)}
                    className="w-full px-3 py-2 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] bg-white text-[#0D0D0D] outline-none focus:border-[#0D0D0D]"
                  />
                </FormGroup>
                <FormGroup className="mb-3">
                  <FormLabel>Üzemanyag</FormLabel>
                  <select
                    value={manualFuel}
                    onChange={(e) => setManualFuel(e.target.value)}
                    className="w-full px-3 py-2 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] bg-white text-[#0D0D0D] outline-none focus:border-[#0D0D0D]"
                  >
                    <option value="">Válassz…</option>
                    <option value="benzin">Benzin</option>
                    <option value="diesel">Dízel</option>
                    <option value="hybrid">Hibrid</option>
                    <option value="elektromos">Elektromos</option>
                    <option value="lpg">LPG</option>
                    <option value="cng">CNG</option>
                    <option value="phev">PHEV</option>
                  </select>
                </FormGroup>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setManualEntry(false)}>
                    Mégse
                  </Button>
                  <Button variant="gold" size="sm" onClick={handleManualProceed}>
                    Tovább →
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  function renderStep4() {
    const bodyTypes = ['Sedan', 'Hatchback', 'Kombi', 'SUV', 'Coupe', 'Cabriolet', 'Van', 'Pickup']
    const fuelTypes = [
      { value: 'benzin', label: 'Benzin' },
      { value: 'diesel', label: 'Dízel' },
      { value: 'hybrid', label: 'Hibrid' },
      { value: 'elektromos', label: 'Elektromos' },
      { value: 'lpg', label: 'LPG' },
      { value: 'cng', label: 'CNG' },
      { value: 'phev', label: 'PHEV' },
    ]

    return (
      <div>
        <button
          onClick={() => setStep(3)}
          className="flex items-center gap-1.5 text-[12px] text-[#4a4a4a] hover:text-[#0D0D0D] mb-4 transition-colors"
        >
          <ChevronLeft size={14} />
          Módosítás
        </button>

        <Card className="mb-4 bg-[#F4F5F7] border-[rgba(0,0,0,0.08)]">
          <p className="text-[10px] font-bold text-[#4a4a4a] uppercase tracking-[0.8px] mb-3">
            Kiválasztott jármű — ellenőrzés
          </p>
          <div className="grid grid-cols-2 gap-3">
            <FormGroup className="mb-0">
              <FormLabel>Márka</FormLabel>
              <Input
                value={formData.make}
                onChange={(e) => updateForm('make', e.target.value)}
                placeholder="Márka"
              />
            </FormGroup>
            <FormGroup className="mb-0">
              <FormLabel>Modell</FormLabel>
              <Input
                value={formData.model}
                onChange={(e) => updateForm('model', e.target.value)}
                placeholder="Modell"
              />
            </FormGroup>
            <FormGroup className="mb-0">
              <FormLabel>Évjárat</FormLabel>
              <Input
                type="number"
                value={formData.year ?? ''}
                onChange={(e) =>
                  updateForm('year', e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="pl. 2019"
              />
            </FormGroup>
            <FormGroup className="mb-0">
              <FormLabel>Üzemanyag</FormLabel>
              <Select
                value={formData.fuel_type}
                onChange={(e) => updateForm('fuel_type', e.target.value)}
              >
                <option value="">Válassz…</option>
                {fuelTypes.map((ft) => (
                  <option key={ft.value} value={ft.value}>
                    {ft.label}
                  </option>
                ))}
              </Select>
            </FormGroup>
            <FormGroup className="mb-0">
              <FormLabel>Teljesítmény (kW)</FormLabel>
              <Input
                type="number"
                value={formData.power_kw ?? ''}
                onChange={(e) =>
                  updateForm('power_kw', e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="pl. 110"
              />
            </FormGroup>
            <FormGroup className="mb-0">
              <FormLabel>Motor (cc)</FormLabel>
              <Input
                type="number"
                value={formData.engine_cc ?? ''}
                onChange={(e) =>
                  updateForm('engine_cc', e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="pl. 1998"
              />
            </FormGroup>
            <FormGroup className="col-span-2 mb-0">
              <FormLabel>Karosszéria</FormLabel>
              <Select
                value={formData.body_type}
                onChange={(e) => updateForm('body_type', e.target.value)}
              >
                <option value="">Válassz…</option>
                {bodyTypes.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </Select>
            </FormGroup>
          </div>
        </Card>

        {/* VIN decoder — coming soon */}
        <div className="rounded-xl border border-dashed border-[rgba(0,0,0,0.18)] p-4 bg-[#F4F5F7]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-[0.5px]">
              VIN azonosítás
            </span>
            <span className="px-2 py-0.5 rounded-full bg-[rgba(201,168,76,0.18)] text-[#8a6a20] text-[10px] font-bold uppercase tracking-[0.5px]">
              Hamarosan
            </span>
          </div>
          <input
            disabled
            placeholder="VIN szám alapú felismerés (hamarosan)"
            className="w-full px-3 py-2 border border-[rgba(0,0,0,0.12)] rounded-lg text-[12px] bg-white/60 text-[#888888] cursor-not-allowed mb-2"
          />
          <p className="text-[11px] text-[#888888]">
            VIN API integrációval automatikusan kitölthetők az adatok
          </p>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="secondary" onClick={() => setStep(3)}>
            ← Módosítás
          </Button>
          <Button variant="gold" onClick={handleConfirm}>
            Kiválasztás →
          </Button>
        </div>
      </div>
    )
  }

  // ─ Step title map ─────────────────────────────────────────────────────────

  const titles: Record<Step, string> = {
    1: 'Jármű kiválasztása — Márka',
    2: 'Jármű kiválasztása — Modell',
    3: 'Jármű kiválasztása — Évjárat & Motor',
    4: 'Jármű kiválasztása — Megerősítés',
  }

  return (
    <Modal open={open} onClose={onClose} title={titles[step]} className="max-w-xl">
      <StepIndicator current={step} />
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
    </Modal>
  )
}
