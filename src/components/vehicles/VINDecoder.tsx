'use client'

import { useState } from 'react'
import { decodeVIN, VinDecodeResult as VINDecodeResult } from '@/lib/vinDecoder'
import { VehicleSelectionResult } from './VehicleSelector'
import { CheckCircle2, AlertTriangle, Loader2, Search } from 'lucide-react'

interface VINDecoderProps {
  onResult: (data: Partial<VehicleSelectionResult>) => void
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

function DecodeRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div>
      <span className="block text-[10px] text-[#888888] uppercase tracking-[0.4px] font-semibold mb-0.5">
        {label}
      </span>
      <span className="text-[12px] font-semibold text-[#0D0D0D]">{value}</span>
    </div>
  )
}

export function VINDecoder({ onResult }: VINDecoderProps) {
  const [vin, setVin] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VINDecodeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleDecode() {
    if (vin.trim().length !== 17) {
      setError('A VIN számnak pontosan 17 karakterből kell állnia.')
      setResult(null)
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await decodeVIN(vin.trim().toUpperCase())
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ismeretlen hiba történt.')
    } finally {
      setLoading(false)
    }
  }

  function handleTransfer() {
    if (!result) return
    onResult({
      make: result.make,
      model: result.model,
      year: result.year,
      fuel_type: result.fuel_type ?? '',
      engine_label: result.engine_label,
      power_kw: result.power_kw,
      power_hp: result.power_hp,
      displacement_cc: result.displacement_cc,
      transmission: result.transmission,
      body_type: result.body_type,
      data_source: 'database',
    })
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={vin}
            onChange={(e) => {
              setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, ''))
              setError(null)
              setResult(null)
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleDecode()}
            maxLength={17}
            placeholder="Írja be a VIN számot (17 karakter)"
            className="w-full px-3 py-2.5 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] text-[#0D0D0D] placeholder:text-[#888888] outline-none focus:border-[#0D0D0D] font-mono tracking-widest transition-colors bg-white"
          />
          <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono ${vin.length === 17 ? 'text-emerald-600' : 'text-[#888888]'}`}>
            {vin.length}/17
          </span>
        </div>
        <button
          type="button"
          onClick={handleDecode}
          disabled={loading || vin.length !== 17}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0D0D0D] text-white rounded-lg text-[13px] font-semibold hover:bg-[#162d5a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          Lekérdezés
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-amber-800 font-medium">{error}</p>
        </div>
      )}

      {result && (
        <div className="p-4 rounded-xl border border-[rgba(0,0,0,0.10)] bg-[#F8F9FB]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-[#0D0D0D] uppercase tracking-[0.6px]">
              VIN dekódolás eredménye
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[rgba(16,185,129,0.12)] text-emerald-700 text-[10px] font-bold uppercase tracking-[0.4px]">
              <CheckCircle2 size={11} />
              Sikeres
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 mb-4">
            <DecodeRow label="Márka" value={result.make} />
            <DecodeRow label="Modell" value={result.model} />
            <DecodeRow label="Évjárat" value={result.year?.toString()} />
            <DecodeRow label="Motor" value={result.engine_label} />
            {(result.power_kw || result.power_hp) && (
              <DecodeRow
                label="Teljesítmény"
                value={[
                  result.power_kw ? `${result.power_kw} kW` : null,
                  result.power_hp ? `${result.power_hp} hp` : null,
                ]
                  .filter(Boolean)
                  .join(' / ')}
              />
            )}
            <DecodeRow
              label="Üzemanyag"
              value={result.fuel_type ? (FUEL_LABELS[result.fuel_type] ?? result.fuel_type) : undefined}
            />
            <DecodeRow
              label="Váltó"
              value={result.transmission ? (TRANSMISSION_LABELS[result.transmission] ?? result.transmission) : undefined}
            />
            <DecodeRow
              label="Karosszéria"
              value={result.body_type ? (BODY_LABELS[result.body_type] ?? result.body_type) : undefined}
            />
          </div>

          <button
            type="button"
            onClick={handleTransfer}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C8102E] hover:bg-[#b8932e] text-white rounded-lg text-[13px] font-semibold transition-colors"
          >
            <CheckCircle2 size={14} />
            Jármű adatok átvétele
          </button>
        </div>
      )}
    </div>
  )
}
