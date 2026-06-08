'use client'

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Table,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CSVRow {
  make: string
  model: string
  year_from: string
  year_to: string
  body_type: string
  engine_code: string
  displacement_cc: string
  power_kw: string
  fuel_type: string
  transmission: string
  notes: string
  [key: string]: string
}

interface ValidationResult {
  valid: CSVRow[]
  errors: { row: number; reason: string }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  'make',
  'model',
  'year_from',
  'year_to',
  'body_type',
  'engine_code',
  'displacement_cc',
  'power_kw',
  'fuel_type',
  'transmission',
  'notes',
] as const

const SAMPLE_CSV = `make,model,year_from,year_to,body_type,engine_code,displacement_cc,power_kw,fuel_type,transmission,notes
BMW,3 Series,2012,2019,Sedan,N20B20,1998,135,benzin,Automatic,F30 sorozat
BMW,3 Series,2019,,Sedan,B48B20,1998,140,benzin,Automatic,G20 sorozat
Volkswagen,Golf,2013,2020,Hatchback,CZCA,1395,92,benzin,Manual,Mk7
Volkswagen,Golf,2020,,Hatchback,DPCA,1498,110,benzin,Manual,Mk8
Mercedes-Benz,C-Class,2014,2021,Sedan,M274,1991,135,benzin,Automatic,W205
Toyota,Corolla,2019,,Sedan,M20A-FKS,1987,103,hybrid,CVT,E210
`

const BATCH_SIZE = 50

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/"/g, ''))
    return Object.fromEntries(headers.map((h, i) => [h, values[i] || '']))
  })
}

// ─── Validation ──────────────────────────────────────────────────────────────

function validateRows(rows: Record<string, string>[]): ValidationResult {
  const valid: CSVRow[] = []
  const errors: { row: number; reason: string }[] = []

  rows.forEach((row, idx) => {
    const rowNum = idx + 2 // 1-indexed + header
    if (!row.make?.trim()) {
      errors.push({ row: rowNum, reason: `${rowNum}. sor: hiányzó márka (make)` })
      return
    }
    if (!row.model?.trim()) {
      errors.push({ row: rowNum, reason: `${rowNum}. sor: hiányzó modell (model)` })
      return
    }
    valid.push({
      make: row.make?.trim() ?? '',
      model: row.model?.trim() ?? '',
      year_from: row.year_from?.trim() ?? '',
      year_to: row.year_to?.trim() ?? '',
      body_type: row.body_type?.trim() ?? '',
      engine_code: row.engine_code?.trim() ?? '',
      displacement_cc: row.displacement_cc?.trim() ?? '',
      power_kw: row.power_kw?.trim() ?? '',
      fuel_type: row.fuel_type?.trim() ?? '',
      transmission: row.transmission?.trim() ?? '',
      notes: row.notes?.trim() ?? '',
    })
  })

  return { valid, errors }
}

// ─── Row → Supabase record ────────────────────────────────────────────────────

function rowToRecord(row: CSVRow) {
  return {
    make: row.make,
    model: row.model,
    year_from: row.year_from ? parseInt(row.year_from) : null,
    year_to: row.year_to ? parseInt(row.year_to) : null,
    body_type: row.body_type || null,
    engine_code: row.engine_code || null,
    displacement_cc: row.displacement_cc ? parseInt(row.displacement_cc) : null,
    power_kw: row.power_kw ? parseInt(row.power_kw) : null,
    fuel_type: row.fuel_type || null,
    transmission: row.transmission || null,
    notes: row.notes || null,
  }
}

// ─── Column display label ─────────────────────────────────────────────────────

const COL_LABELS: Record<string, string> = {
  make: 'Márka',
  model: 'Modell',
  year_from: 'Évtől',
  year_to: 'Évig',
  body_type: 'Karosszéria',
  engine_code: 'Motorkód',
  displacement_cc: 'Lökettérfogat',
  power_kw: 'Teljesítmény kW',
  fuel_type: 'Üzemanyag',
  transmission: 'Váltó',
  notes: 'Megjegyzés',
}

// ─── Main component ──────────────────────────────────────────────────────────

export function VehicleCSVImportModal({
  open,
  onClose,
  onImported,
}: {
  open: boolean
  onClose: () => void
  onImported: () => void
}) {
  const { toast } = useToast()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])
  const [validation, setValidation] = useState<ValidationResult | null>(null)

  // Import progress
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importTotal, setImportTotal] = useState(0)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [importDone, setImportDone] = useState(false)
  const [importedCount, setImportedCount] = useState(0)

  // ─ Reset ──────────────────────────────────────────────────────────────────

  function reset() {
    setFileName(null)
    setParsedRows([])
    setValidation(null)
    setImporting(false)
    setImportProgress(0)
    setImportTotal(0)
    setImportErrors([])
    setImportDone(false)
    setImportedCount(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose() {
    if (importDone) onImported()
    reset()
    onClose()
  }

  // ─ File handling ──────────────────────────────────────────────────────────

  function processFile(file: File) {
    if (!file.name.match(/\.(csv|txt)$/i)) {
      toast('Csak .csv vagy .txt fájl fogadható el', 'error')
      return
    }
    setFileName(file.name)
    setImportDone(false)
    setImportErrors([])
    setImportProgress(0)

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const rows = parseCSV(text)
      setParsedRows(rows)
      setValidation(validateRows(rows))
    }
    reader.readAsText(file, 'UTF-8')
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─ Sample download ────────────────────────────────────────────────────────

  function downloadSample() {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'vehicle_models_sample.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ─ Import ─────────────────────────────────────────────────────────────────

  async function handleImport() {
    if (!validation || validation.valid.length === 0) return

    setImporting(true)
    setImportDone(false)
    setImportErrors([])
    setImportedCount(0)

    const rows = validation.valid
    setImportTotal(rows.length)

    let successCount = 0
    const batchErrors: string[] = []

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map(rowToRecord)
      const { error } = await supabase
        .from('vehicle_models')
        .insert(batch)
        .select()
        // Supabase does not support onConflict on plain insert without upsert,
        // so we use upsert with ignoreDuplicates instead:
        // Re-do as upsert to safely skip existing:
      if (error) {
        batchErrors.push(
          `${i + 1}–${Math.min(i + BATCH_SIZE, rows.length)}. sorok: ${error.message}`
        )
      } else {
        successCount += batch.length
      }
      setImportProgress(Math.min(i + BATCH_SIZE, rows.length))
      setImportedCount(successCount)
    }

    // Retry errors with upsert ignoreDuplicates in case of unique constraint issues
    if (batchErrors.length > 0) {
      setImportErrors(batchErrors)
    }

    setImporting(false)
    setImportDone(true)
    toast(
      successCount > 0
        ? `${successCount} jármű modell sikeresen importálva`
        : 'Importálás befejezve — ellenőrizd a hibákat',
      successCount > 0 ? 'success' : 'error'
    )
  }

  // Retry with upsert
  async function handleImportUpsert() {
    if (!validation || validation.valid.length === 0) return

    setImporting(true)
    setImportDone(false)
    setImportErrors([])
    setImportedCount(0)

    const rows = validation.valid
    setImportTotal(rows.length)
    let successCount = 0
    const batchErrors: string[] = []

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE).map(rowToRecord)
      const { error } = await supabase
        .from('vehicle_models')
        .upsert(batch, { ignoreDuplicates: true })
      if (error) {
        batchErrors.push(
          `${i + 1}–${Math.min(i + BATCH_SIZE, rows.length)}. sorok: ${error.message}`
        )
      } else {
        successCount += batch.length
      }
      setImportProgress(Math.min(i + BATCH_SIZE, rows.length))
      setImportedCount(successCount)
    }

    if (batchErrors.length > 0) setImportErrors(batchErrors)
    setImporting(false)
    setImportDone(true)
    toast(
      successCount > 0
        ? `${successCount} jármű modell sikeresen importálva`
        : 'Importálás befejezve — ellenőrizd a hibákat',
      successCount > 0 ? 'success' : 'error'
    )
  }

  // ─ Derived ────────────────────────────────────────────────────────────────

  const previewRows = parsedRows.slice(0, 10)
  const previewCols = parsedRows.length > 0 ? Object.keys(parsedRows[0]) : []
  const hasFile = !!fileName && parsedRows.length > 0
  const canImport =
    hasFile && validation && validation.valid.length > 0 && !importing && !importDone

  // ─ Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Jármű modellek CSV importálása"
      className="max-w-3xl"
    >
      {/* ── Instructions + Sample download ───────────────────────────────── */}
      <div className="mb-5 p-4 rounded-xl bg-[#F4F5F7] border border-[rgba(11,30,61,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-[11px] font-bold text-[#5a6a80] uppercase tracking-[0.8px] mb-2">
              Elvárt CSV formátum
            </p>
            <div className="overflow-x-auto rounded-lg border border-[rgba(11,30,61,0.10)] bg-white">
              <table className="text-[10px] text-[#5a6a80] whitespace-nowrap">
                <thead>
                  <tr className="bg-[#0B1E3D]">
                    {CSV_COLUMNS.map((col) => (
                      <th
                        key={col}
                        className="px-2 py-1.5 text-white font-semibold text-left tracking-[0.3px]"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-[rgba(11,30,61,0.08)]">
                    {CSV_COLUMNS.map((col) => {
                      const examples: Record<string, string> = {
                        make: 'BMW',
                        model: '3 Series',
                        year_from: '2019',
                        year_to: '2023',
                        body_type: 'Sedan',
                        engine_code: 'B48B20',
                        displacement_cc: '1998',
                        power_kw: '140',
                        fuel_type: 'benzin',
                        transmission: 'Automatic',
                        notes: 'G20',
                      }
                      return (
                        <td key={col} className="px-2 py-1 text-[#8fa0b5] italic">
                          {examples[col]}
                        </td>
                      )
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[#8fa0b5] mt-2">
              Kötelező mezők: <span className="font-semibold text-[#C9384C]">make</span>,{' '}
              <span className="font-semibold text-[#C9384C]">model</span>. Többi mező opcionális.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={downloadSample} className="shrink-0">
            <Download size={13} />
            Minta letöltése
          </Button>
        </div>
      </div>

      {/* ── Drop zone ─────────────────────────────────────────────────────── */}
      {!hasFile && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all mb-4 ${
            isDragging
              ? 'border-[#C9A84C] bg-[#FFFBF0] scale-[1.01]'
              : 'border-[rgba(11,30,61,0.18)] bg-[#F4F5F7] hover:border-[#C9A84C] hover:bg-[#FFFBF0]'
          }`}
        >
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isDragging ? 'bg-[#C9A84C]' : 'bg-[rgba(11,30,61,0.08)]'
            }`}
          >
            <Upload size={20} className={isDragging ? 'text-[#0B1E3D]' : 'text-[#5a6a80]'} />
          </div>
          <div className="text-center">
            <p className="text-[13px] font-semibold text-[#0B1E3D]">
              Húzd ide a CSV fájlt, vagy kattints a feltöltéshez
            </p>
            <p className="text-[11px] text-[#8fa0b5] mt-0.5">.csv vagy .txt formátum</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* ── File info bar ─────────────────────────────────────────────────── */}
      {hasFile && (
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[rgba(11,30,61,0.05)] border border-[rgba(11,30,61,0.10)] mb-4">
          <FileText size={16} className="text-[#C9A84C] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-[#0B1E3D] truncate">{fileName}</p>
            <p className="text-[11px] text-[#5a6a80]">
              {parsedRows.length} sor beolvasva
            </p>
          </div>
          <button
            onClick={reset}
            className="text-[#5a6a80] hover:text-[#C9384C] transition-colors p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Validation summary ────────────────────────────────────────────── */}
      {validation && (
        <div className="flex gap-3 mb-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(11,30,61,0.05)] border border-[rgba(11,30,61,0.10)] flex-1">
            <CheckCircle size={14} className="text-[#C9A84C] shrink-0" />
            <span className="text-[12px] font-semibold text-[#0B1E3D]">
              {validation.valid.length} érvényes sor
            </span>
          </div>
          {validation.errors.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(201,56,76,0.07)] border border-[rgba(201,56,76,0.2)] flex-1">
              <AlertCircle size={14} className="text-[#C9384C] shrink-0" />
              <span className="text-[12px] font-semibold text-[#C9384C]">
                {validation.errors.length} hiba
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Validation errors list ────────────────────────────────────────── */}
      {validation && validation.errors.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-[rgba(201,56,76,0.05)] border border-[rgba(201,56,76,0.15)] max-h-[120px] overflow-y-auto">
          <p className="text-[10px] font-bold text-[#C9384C] uppercase tracking-[0.5px] mb-2">
            Hibás sorok
          </p>
          {validation.errors.map((e, i) => (
            <p key={i} className="text-[11px] text-[#C9384C] leading-relaxed">
              {e.reason}
            </p>
          ))}
        </div>
      )}

      {/* ── Preview table ─────────────────────────────────────────────────── */}
      {previewRows.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Table size={13} className="text-[#5a6a80]" />
            <span className="text-[11px] font-bold text-[#5a6a80] uppercase tracking-[0.5px]">
              Előnézet (első {previewRows.length} sor)
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-[rgba(11,30,61,0.10)]">
            <table className="w-full text-[11px] min-w-[700px]">
              <thead>
                <tr className="bg-[#0B1E3D]">
                  {previewCols.map((col) => (
                    <th
                      key={col}
                      className="px-3 py-2 text-white font-semibold text-left tracking-[0.3px] whitespace-nowrap"
                    >
                      {COL_LABELS[col] ?? col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => {
                  const isMakeEmpty = !row.make?.trim()
                  const isModelEmpty = !row.model?.trim()
                  const hasError = isMakeEmpty || isModelEmpty
                  return (
                    <tr
                      key={i}
                      className={`border-t border-[rgba(11,30,61,0.07)] ${
                        hasError ? 'bg-[rgba(201,56,76,0.05)]' : i % 2 === 0 ? 'bg-white' : 'bg-[#F4F5F7]'
                      }`}
                    >
                      {previewCols.map((col) => (
                        <td
                          key={col}
                          className={`px-3 py-1.5 whitespace-nowrap ${
                            (col === 'make' && isMakeEmpty) || (col === 'model' && isModelEmpty)
                              ? 'text-[#C9384C] font-semibold'
                              : 'text-[#0B1E3D]'
                          }`}
                        >
                          {row[col] || (
                            <span className="text-[#8fa0b5] italic text-[10px]">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {parsedRows.length > 10 && (
            <p className="text-[11px] text-[#8fa0b5] mt-1.5 text-right">
              + {parsedRows.length - 10} további sor nem látható
            </p>
          )}
        </div>
      )}

      {/* ── Progress bar ──────────────────────────────────────────────────── */}
      {(importing || importDone) && importTotal > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-semibold text-[#0B1E3D]">
              {importDone ? 'Importálás befejezve' : 'Importálás folyamatban…'}
            </span>
            <span className="text-[12px] text-[#5a6a80]">
              {importProgress} / {importTotal} importálva
            </span>
          </div>
          <div className="h-2 w-full bg-[rgba(11,30,61,0.1)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-[#C9A84C] transition-all duration-300"
              style={{ width: `${(importProgress / importTotal) * 100}%` }}
            />
          </div>
          {importDone && (
            <div className="mt-2 flex items-center gap-2">
              {importErrors.length === 0 ? (
                <div className="flex items-center gap-1.5 text-[12px] text-[#0B1E3D]">
                  <CheckCircle size={14} className="text-[#C9A84C]" />
                  {importedCount} modell sikeresen importálva
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[12px] text-[#C9384C]">
                  <AlertCircle size={14} />
                  {importedCount} importálva, {importErrors.length} batch hiba
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Import batch errors ───────────────────────────────────────────── */}
      {importErrors.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-[rgba(201,56,76,0.05)] border border-[rgba(201,56,76,0.15)] max-h-[100px] overflow-y-auto">
          <p className="text-[10px] font-bold text-[#C9384C] uppercase tracking-[0.5px] mb-1.5">
            Import hibák
          </p>
          {importErrors.map((e, i) => (
            <p key={i} className="text-[11px] text-[#C9384C]">
              {e}
            </p>
          ))}
        </div>
      )}

      {/* ── Footer actions ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-[rgba(11,30,61,0.08)]">
        <div className="flex gap-2">
          {!hasFile && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={13} />
              Fájl kiválasztása
            </Button>
          )}
          {hasFile && !importDone && (
            <Button variant="secondary" size="sm" onClick={reset}>
              <X size={13} />
              Törlés
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleClose}>
            {importDone ? 'Bezárás' : 'Mégse'}
          </Button>
          {canImport && (
            <Button
              variant="gold"
              size="sm"
              onClick={handleImportUpsert}
              disabled={importing}
            >
              <Upload size={13} />
              {validation && validation.valid.length} sor importálása
            </Button>
          )}
          {importDone && !importing && (
            <Button variant="primary" size="sm" onClick={handleClose}>
              <CheckCircle size={13} />
              Kész
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
