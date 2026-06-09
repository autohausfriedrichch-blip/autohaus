'use client'

import { useState, useEffect, useRef } from 'react'
import { MAKES, getModels, getYears, getVariants, VehicleVariant } from '@/lib/vehicleData'
import { Search, ChevronRight, ChevronDown, CheckCircle2 } from 'lucide-react'

export interface VehicleSelectionResult {
  make: string
  model: string
  year: number
  fuel_type: string
  power_kw?: number
  power_hp?: number
  displacement_cc?: number
  body_type?: string
  transmission?: string
  drive_type?: string
  doors?: number
  tire_size?: string
  oil_spec?: string
  engine_label?: string
  data_source: 'database' | 'manual'
}

interface VehicleSelectorProps {
  onSelect: (result: VehicleSelectionResult) => void
  initialMake?: string
  initialModel?: string
  initialYear?: number
}

const FUEL_LABELS: Record<string, string> = {
  petrol: 'Benzin',
  diesel: 'Dízel',
  electric: 'Elektromos',
  hybrid: 'Hibrid',
  phev: 'Plug-in Hibrid',
  lpg: 'LPG',
}

const TRANSMISSION_LABELS: Record<string, string> = {
  manual: 'Manuális',
  automatic: 'Automata',
  cvt: 'CVT',
  dct: 'DSG/DCT',
}

const BODY_LABELS: Record<string, string> = {
  sedan: 'Szedán',
  hatchback: 'Ferdehátú',
  estate: 'Kombi',
  suv: 'SUV',
  coupe: 'Kupé',
  convertible: 'Kabrió',
  van: 'Furgon',
  pickup: 'Pickup',
  minivan: 'Kisbusz',
}

const DRIVE_LABELS: Record<string, string> = {
  fwd: 'Első kerék',
  rwd: 'Hátsó kerék',
  awd: 'Összkerék',
  '4wd': '4x4',
}

function variantChipLabel(v: VehicleVariant): string {
  const parts: string[] = []
  const eng = (v as any).engine || (v as any).engine_label
  const fuel = (v as any).fuel || (v as any).fuel_type
  if (eng) parts.push(eng)
  if (v.power_hp) parts.push(`${v.power_hp} LE`)
  if (fuel) parts.push(FUEL_LABELS[fuel] ?? fuel)
  return parts.join(' ') || 'Ismeretlen változat'
}

function SearchableSelect({
  value,
  options,
  placeholder,
  searchPlaceholder,
  disabled,
  onChange,
}: {
  value: string
  options: string[]
  placeholder: string
  searchPlaceholder: string
  disabled?: boolean
  onChange: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()))

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen((o) => !o); setQuery('') }}
        className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-lg text-[13px] transition-all ${
          disabled
            ? 'bg-[#F4F5F7] border-[rgba(11,30,61,0.10)] text-[#8fa0b5] cursor-not-allowed'
            : 'bg-white border-[rgba(11,30,61,0.18)] text-[#0B1E3D] hover:border-[#0B1E3D] cursor-pointer'
        } ${open ? 'border-[#0B1E3D]' : ''}`}
      >
        <span className={value ? 'text-[#0B1E3D] font-medium' : 'text-[#8fa0b5]'}>
          {value || placeholder}
        </span>
        <ChevronDown size={14} className={`text-[#5a6a80] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-[rgba(11,30,61,0.15)] rounded-xl shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[rgba(11,30,61,0.08)]">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8fa0b5]" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-7 pr-3 py-1.5 bg-[#F4F5F7] rounded-lg text-[12px] text-[#0B1E3D] outline-none placeholder:text-[#8fa0b5]"
              />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-[12px] text-[#8fa0b5] text-center">Nincs találat</div>
            ) : (
              filtered.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false) }}
                  className={`w-full text-left px-3 py-2 text-[13px] hover:bg-[#F4F5F7] transition-colors flex items-center justify-between group ${
                    opt === value ? 'text-[#0B1E3D] font-semibold bg-[rgba(201,168,76,0.08)]' : 'text-[#0B1E3D]'
                  }`}
                >
                  {opt}
                  {opt === value && <CheckCircle2 size={13} className="text-[#C9A84C]" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function VehicleSelector({ onSelect, initialMake, initialModel, initialYear }: VehicleSelectorProps) {
  const [makes, setMakes] = useState<string[]>([])
  const [models, setModels] = useState<string[]>([])
  const [years, setYears] = useState<number[]>([])
  const [variants, setVariants] = useState<VehicleVariant[]>([])

  const [selectedMake, setSelectedMake] = useState(initialMake ?? '')
  const [selectedModel, setSelectedModel] = useState(initialModel ?? '')
  const [selectedYear, setSelectedYear] = useState<number | null>(initialYear ?? null)
  const [selectedVariant, setSelectedVariant] = useState<VehicleVariant | null>(null)

  const [makesLoading, setMakesLoading] = useState(true)
  const [modelsLoading, setModelsLoading] = useState(false)
  const [yearsLoading, setYearsLoading] = useState(false)
  const [variantsLoading, setVariantsLoading] = useState(false)

  useEffect(() => {
    const data = Array.isArray(MAKES) ? MAKES : []
    setMakes(data)
    setMakesLoading(false)
  }, [])

  useEffect(() => {
    if (!selectedMake) { setModels([]); setSelectedModel(''); return }
    const data = getModels(selectedMake)
    setModels(data)
    setSelectedModel('')
    setSelectedYear(null)
    setSelectedVariant(null)
    setYears([])
    setVariants([])
  }, [selectedMake])

  useEffect(() => {
    if (!selectedMake || !selectedModel) { setYears([]); setSelectedYear(null); return }
    const data = getYears(selectedMake, selectedModel)
    setYears(data)
    setSelectedYear(null)
    setSelectedVariant(null)
    setVariants([])
  }, [selectedMake, selectedModel])

  useEffect(() => {
    if (!selectedMake || !selectedModel) { setVariants([]); return }
    const data = getVariants(selectedMake, selectedModel)
    setVariants(data)
    setSelectedVariant(null)
  }, [selectedMake, selectedModel])

  const filteredVariants = selectedYear
    ? variants.filter((v) => {
        const from = v.year_from ?? 0
        const to = v.year_to ?? 9999
        return selectedYear >= from && selectedYear <= to
      })
    : []

  function handleVariantClick(v: VehicleVariant) {
    setSelectedVariant(v)
    if (!selectedYear) return
    const vv = v as any
    onSelect({
      make: selectedMake,
      model: selectedModel,
      year: selectedYear,
      fuel_type: vv.fuel || vv.fuel_type || '',
      power_kw: v.power_kw ?? undefined,
      power_hp: v.power_hp ?? undefined,
      displacement_cc: v.displacement_cc ?? undefined,
      body_type: vv.body || vv.body_type || undefined,
      transmission: v.transmission ?? undefined,
      drive_type: vv.drive || vv.drive_type || undefined,
      doors: v.doors ?? undefined,
      tire_size: v.tire_size ?? undefined,
      oil_spec: v.oil_spec ?? undefined,
      engine_label: vv.engine || vv.engine_label || undefined,
      data_source: 'database',
    })
  }

  function handleManualEntry() {
    onSelect({
      make: selectedMake,
      model: selectedModel,
      year: selectedYear ?? 0,
      fuel_type: '',
      data_source: 'manual',
    })
  }

  const yearOptions = years.map((y) => y.toString())

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[0.5px] mb-1.5">
            Márka
          </label>
          {makesLoading ? (
            <div className="h-10 bg-[#F4F5F7] rounded-lg animate-pulse" />
          ) : (
            <SearchableSelect
              value={selectedMake}
              options={makes}
              placeholder="Márka kiválasztása"
              searchPlaceholder="Márka keresése…"
              onChange={setSelectedMake}
            />
          )}
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[0.5px] mb-1.5">
            Modell
          </label>
          {modelsLoading ? (
            <div className="h-10 bg-[#F4F5F7] rounded-lg animate-pulse" />
          ) : (
            <SearchableSelect
              value={selectedModel}
              options={models}
              placeholder="Modell kiválasztása"
              searchPlaceholder="Modell keresése…"
              disabled={!selectedMake}
              onChange={setSelectedModel}
            />
          )}
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[0.5px] mb-1.5">
            Évjárat
          </label>
          {yearsLoading ? (
            <div className="h-10 bg-[#F4F5F7] rounded-lg animate-pulse" />
          ) : (
            <SearchableSelect
              value={selectedYear?.toString() ?? ''}
              options={yearOptions}
              placeholder="Év kiválasztása"
              searchPlaceholder="Év keresése…"
              disabled={!selectedModel}
              onChange={(v) => { setSelectedYear(parseInt(v)); setSelectedVariant(null) }}
            />
          )}
        </div>
      </div>

      {selectedYear && selectedModel && (
        <div className="pt-1">
          <p className="text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[0.5px] mb-2">
            Motorváltozat
          </p>
          {variantsLoading ? (
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 w-28 bg-[#F4F5F7] rounded-full animate-pulse" />
              ))}
            </div>
          ) : filteredVariants.length === 0 ? (
            <p className="text-[12px] text-[#8fa0b5] py-2">
              Nincs elérhető változat ehhez az évjárathoz.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {filteredVariants.map((v, idx) => {
                const isSelected = selectedVariant === v
                return (
                  <button
                    key={(v as any).id ?? idx}
                    type="button"
                    onClick={() => handleVariantClick(v)}
                    className={`px-3 py-1.5 rounded-full border text-[12px] font-medium transition-all ${
                      isSelected
                        ? 'bg-[#0B1E3D] border-[#0B1E3D] text-white shadow-sm'
                        : 'bg-white border-[rgba(11,30,61,0.18)] text-[#0B1E3D] hover:border-[#C9A84C] hover:bg-[#FFFBF0] hover:text-[#8a6a20]'
                    }`}
                  >
                    {variantChipLabel(v)}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {selectedVariant && selectedYear && (
        <div className="mt-3 p-4 rounded-xl border border-[rgba(11,30,61,0.10)] bg-[#F8F9FB]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[#0B1E3D] uppercase tracking-[0.6px]">
              Jármű összesítő
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[rgba(16,185,129,0.12)] text-emerald-700 text-[10px] font-bold uppercase tracking-[0.4px]">
              <CheckCircle2 size={11} />
              Adatbázisból validált ✓
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
            <SummaryRow label="Márka" value={selectedMake} />
            <SummaryRow label="Modell" value={selectedModel} />
            <SummaryRow label="Évjárat" value={selectedYear.toString()} />
            {((selectedVariant as any).engine || (selectedVariant as any).engine_label) && (
              <SummaryRow label="Motor" value={(selectedVariant as any).engine || (selectedVariant as any).engine_label} />
            )}
            {(selectedVariant.power_kw || selectedVariant.power_hp) && (
              <SummaryRow
                label="Teljesítmény"
                value={[
                  selectedVariant.power_kw ? `${selectedVariant.power_kw} kW` : null,
                  selectedVariant.power_hp ? `${selectedVariant.power_hp} LE` : null,
                ].filter(Boolean).join(' / ')}
              />
            )}
            {((selectedVariant as any).fuel || (selectedVariant as any).fuel_type) && (
              <SummaryRow
                label="Üzemanyag"
                value={FUEL_LABELS[(selectedVariant as any).fuel || (selectedVariant as any).fuel_type] ?? (selectedVariant as any).fuel}
              />
            )}
            {selectedVariant.transmission && (
              <SummaryRow
                label="Váltó"
                value={TRANSMISSION_LABELS[selectedVariant.transmission] ?? selectedVariant.transmission}
              />
            )}
            {((selectedVariant as any).body || (selectedVariant as any).body_type) && (
              <SummaryRow
                label="Karosszéria"
                value={BODY_LABELS[(selectedVariant as any).body || (selectedVariant as any).body_type] ?? (selectedVariant as any).body}
              />
            )}
            {((selectedVariant as any).drive || (selectedVariant as any).drive_type) && (
              <SummaryRow
                label="Hajtás"
                value={DRIVE_LABELS[(selectedVariant as any).drive || (selectedVariant as any).drive_type] ?? (selectedVariant as any).drive}
              />
            )}
            {selectedVariant.tire_size && (
              <SummaryRow label="Gumiméret" value={selectedVariant.tire_size} />
            )}
            {selectedVariant.oil_spec && (
              <SummaryRow label="Olaj" value={selectedVariant.oil_spec} />
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleManualEntry}
          className="text-[12px] text-[#5a6a80] hover:text-[#0B1E3D] underline underline-offset-2 transition-colors"
        >
          Kézi bevitel
        </button>
      </div>
    </div>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block text-[10px] text-[#8fa0b5] uppercase tracking-[0.4px] font-semibold mb-0.5">
        {label}
      </span>
      <span className="text-[12px] font-semibold text-[#0B1E3D]">{value}</span>
    </div>
  )
}
