'use client'

import React, { useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import {
  Camera,
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  Search,
  UserPlus,
  Car,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  X,
  Check,
  Eye,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExtractedData {
  license_plate?: string
  vin?: string
  make?: string
  model?: string
  year?: string
  first_registration?: string
  fuel_type?: string
  displacement?: string
  power_kw?: string
  color?: string
  seats?: string
  tare_weight?: string
  total_weight?: string
  document_number?: string
  owner_name?: string
  owner_address?: string
  owner_postal_code?: string
  owner_city?: string
  owner_country?: string
  [key: string]: string | undefined
}

type SelectedAction = 'new_both' | 'existing_customer' | 'update_vehicle' | 'update_customer'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1600
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      resolve(canvas.toDataURL('image/jpeg', 0.88))
    }
    img.onerror = reject
    img.src = url
  })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface StepSidebarProps {
  currentStep: 1 | 2 | 3 | 4
}

const STEPS = [
  { label: 'Feltöltés', sublabel: 'Fénykép / PDF' },
  { label: 'Adatok ellenőrzése', sublabel: 'OCR eredmény' },
  { label: 'Egyezés keresés', sublabel: 'Duplikátum ellenőrzés' },
  { label: 'Mentés', sublabel: 'Megerősítés' },
]

function StepSidebar({ currentStep }: StepSidebarProps) {
  return (
    <div
      style={{
        width: 220,
        minWidth: 180,
        background: '#0B1E3D',
        borderRadius: 12,
        padding: '24px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        alignSelf: 'flex-start',
      }}
    >
      <div style={{ color: '#C9A84C', fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 12 }}>
        FELDOLGOZÁS LÉPÉSEI
      </div>
      {STEPS.map((s, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4
        const done = currentStep > n
        const active = currentStep === n
        return (
          <div
            key={n}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 12px',
              borderRadius: 8,
              background: active ? 'rgba(201,168,76,0.15)' : 'transparent',
              borderLeft: active ? '3px solid #C9A84C' : '3px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: done ? '#16a34a' : active ? '#C9A84C' : 'rgba(255,255,255,0.1)',
                color: done || active ? '#fff' : '#5a6a80',
                fontWeight: 700,
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              {done ? <Check size={14} /> : n}
            </div>
            <div>
              <div style={{ color: active ? '#C9A84C' : done ? '#fff' : '#5a6a80', fontWeight: active ? 600 : 400, fontSize: 14 }}>
                {s.label}
              </div>
              <div style={{ color: '#5a6a80', fontSize: 11 }}>{s.sublabel}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Upload Zone ─────────────────────────────────────────────────────────────

interface UploadZoneProps {
  label: string
  image: string | null
  onImage: (dataUrl: string) => void
  onClear: () => void
  required?: boolean
}

function UploadZone({ label, image, onImage, onClear, required }: UploadZoneProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file: File) => {
    const b64 = await fileToBase64(file)
    onImage(b64)
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files?.[0]
      if (file) handleFile(file)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: '#0B1E3D', marginBottom: 8 }}>
        {label}
        {required && <span style={{ color: '#C9384C', marginLeft: 4 }}>*</span>}
      </div>

      {image ? (
        <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: '2px solid #16a34a' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt={label} style={{ width: '100%', maxHeight: 200, objectFit: 'contain', background: '#000' }} />
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              display: 'flex',
              gap: 6,
            }}
          >
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                background: '#0B1E3D',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '4px 10px',
                fontSize: 12,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <RefreshCw size={12} /> Újrafotózás
            </button>
            <button
              onClick={onClear}
              style={{
                background: '#C9384C',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                width: 28,
                height: 28,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          style={{
            border: `2px dashed ${dragging ? '#C9A84C' : '#d1d5db'}`,
            borderRadius: 10,
            padding: 24,
            textAlign: 'center',
            background: dragging ? 'rgba(201,168,76,0.06)' : '#F4F5F7',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={28} color="#5a6a80" style={{ marginBottom: 8 }} />
          <div style={{ color: '#5a6a80', fontSize: 13, marginBottom: 12 }}>
            Húzd ide vagy kattints a feltöltéshez
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}
              style={{
                background: '#0B1E3D',
                color: '#fff',
                border: 'none',
                borderRadius: 7,
                padding: '8px 16px',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Upload size={14} /> Fájl kiválasztása
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); cameraRef.current?.click() }}
              style={{
                background: '#C9A84C',
                color: '#fff',
                border: 'none',
                borderRadius: 7,
                padding: '8px 16px',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Camera size={14} /> Fotózás
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) await handleFile(f)
          e.target.value = ''
        }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const f = e.target.files?.[0]
          if (f) await handleFile(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─── Field Row ────────────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string
  fieldKey: string
  value: string
  confidence?: number
  onChange: (key: string, value: string) => void
  type?: 'text' | 'number' | 'select'
  options?: { label: string; value: string }[]
}

function FieldRow({ label, fieldKey, value, confidence, onChange, type = 'text', options }: FieldRowProps) {
  const lowConf = confidence !== undefined && confidence < 0.7
  return (
    <FormGroup>
      <div className="flex items-center gap-1.5 mb-1">
        <FormLabel>{label}</FormLabel>
        {lowConf && (
          <span title={`Bizonytalanság: ${Math.round((confidence ?? 0) * 100)}%`}>
            <AlertTriangle size={13} color="#C9A84C" />
          </span>
        )}
      </div>
      {type === 'select' && options ? (
        <Select
          value={value}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(fieldKey, e.target.value)}
        >
          <option value="">– válassz –</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
      ) : (
        <Input
          type={type}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(fieldKey, e.target.value)}
          style={lowConf ? { borderColor: '#C9A84C', background: 'rgba(201,168,76,0.05)' } : undefined}
        />
      )}
    </FormGroup>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function RegistrationScanPage({
  refreshKey,
  onRefresh,
}: {
  refreshKey: number
  onRefresh: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()

  // Step state
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Images
  const [frontImage, setFrontImage] = useState<string | null>(null)
  const [backImage, setBackImage] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  // OCR results
  const [rawOcrText, setRawOcrText] = useState('')
  const [extractedData, setExtractedData] = useState<ExtractedData>({})
  const [confidenceScores, setConfidenceScores] = useState<Record<string, number>>({})
  const [isDemoMode, setIsDemoMode] = useState(false)

  // Step 3 duplicate check
  const [existingVehicles, setExistingVehicles] = useState<any[]>([])
  const [existingCustomers, setExistingCustomers] = useState<any[]>([])
  const [selectedAction, setSelectedAction] = useState<SelectedAction>('new_both')
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('')

  // Step 4
  const [saving, setSaving] = useState(false)
  const [savedResult, setSavedResult] = useState<any>(null)

  // ── OCR ────────────────────────────────────────────────────────────────────

  async function callOcr(imageBase64: string) {
    const res = await fetch('/api/ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: imageBase64 }),
    })
    if (!res.ok) throw new Error('OCR API error')
    return res.json() as Promise<{ extracted_data: ExtractedData; confidence_scores: Record<string, number>; raw_text: string }>
  }

  async function handleOcr() {
    if (!frontImage) return
    setProcessing(true)
    try {
      const frontResult = await callOcr(frontImage)
      let merged: ExtractedData = { ...frontResult.extracted_data }
      let mergedConf: Record<string, number> = { ...frontResult.confidence_scores }
      let rawText = frontResult.raw_text || ''

      if (backImage) {
        const backResult = await callOcr(backImage)
        merged = { ...merged, ...backResult.extracted_data }
        mergedConf = { ...mergedConf, ...backResult.confidence_scores }
        rawText += '\n' + (backResult.raw_text || '')
      }

      // Defaults
      if (!merged.owner_country) merged.owner_country = 'Schweiz'

      setExtractedData(merged)
      setConfidenceScores(mergedConf)
      setRawOcrText(rawText)
      setIsDemoMode(false)
      setStep(2)
    } catch (err) {
      console.error(err)
      toast('OCR feldolgozás sikertelen. Töltsd ki manuálisan!', 'error')
      // Fallback: advance to step 2 with empty data for manual entry
      setExtractedData({ owner_country: 'Schweiz' })
      setConfidenceScores({})
      setRawOcrText('')
      setIsDemoMode(true)
      setStep(2)
    } finally {
      setProcessing(false)
    }
  }

  // ── Field editing ──────────────────────────────────────────────────────────

  function handleFieldChange(key: string, value: string) {
    setExtractedData((prev) => ({ ...prev, [key]: value }))
  }

  // ── Confidence summary ────────────────────────────────────────────────────

  const lowConfCount = Object.entries(confidenceScores).filter(([, v]) => v < 0.7).length

  // ── Step 3: duplicate check ───────────────────────────────────────────────

  async function runDuplicateCheck() {
    const [r1, r2, r3] = await Promise.all([
      extractedData.license_plate
        ? supabase.from('vehicles').select('*, customer:customers(full_name,phone)').eq('license_plate', extractedData.license_plate)
        : Promise.resolve({ data: [] }),
      extractedData.vin
        ? supabase.from('vehicles').select('*, customer:customers(full_name,phone)').eq('vin', extractedData.vin)
        : Promise.resolve({ data: [] }),
      extractedData.owner_name
        ? supabase.from('customers').select('*').ilike('full_name', `%${extractedData.owner_name}%`)
        : Promise.resolve({ data: [] }),
    ])
    const results = [
      { type: 'vehicle_plate', data: r1.data || [] },
      { type: 'vehicle_vin',   data: r2.data || [] },
      { type: 'customer',      data: r3.data || [] },
    ]

    const vehicles: any[] = []
    const customers: any[] = []
    const seenV = new Set<string>()
    const seenC = new Set<string>()

    for (const r of results) {
      if (r.type === 'vehicle_plate' || r.type === 'vehicle_vin') {
        for (const v of r.data) {
          if (!seenV.has(v.id)) { seenV.add(v.id); vehicles.push(v) }
        }
      }
      if (r.type === 'customer') {
        for (const c of r.data) {
          if (!seenC.has(c.id)) { seenC.add(c.id); customers.push(c) }
        }
      }
    }

    setExistingVehicles(vehicles)
    setExistingCustomers(customers)

    // Default action
    if (vehicles.length > 0) {
      setSelectedAction('update_vehicle')
      setSelectedVehicleId(vehicles[0].id)
    } else if (customers.length > 0) {
      setSelectedAction('existing_customer')
      setSelectedCustomerId(customers[0].id)
    } else {
      setSelectedAction('new_both')
    }

    setStep(3)
  }

  // ── Step 4: Save ──────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true)
    try {
      let customerId: string | null = null
      let vehicleId: string | null = null

      const {
        owner_name, owner_address, owner_postal_code, owner_city, owner_country,
        license_plate, vin, make, model, year, fuel_type, displacement, power_kw,
        color, seats, first_registration, tare_weight, total_weight,
      } = extractedData

      // ── Resolve customer ───────────────────────────────────────────────────
      if (selectedAction === 'new_both') {
        const { data, error } = await supabase.from('customers').insert({
          full_name: owner_name || '',
          address: owner_address || '',
          postal_code: owner_postal_code || '',
          city: owner_city || '',
          country: owner_country || 'Schweiz',
          preferred_contact: 'phone',
          marketing_consent: false,
        }).select().single()
        if (error) throw error
        customerId = data.id
      } else if (selectedAction === 'existing_customer') {
        customerId = selectedCustomerId
      } else if (selectedAction === 'update_vehicle') {
        // Get customer from existing vehicle
        const vehicle = existingVehicles.find((v) => v.id === selectedVehicleId)
        customerId = vehicle?.customer_id || selectedCustomerId || null
        vehicleId = selectedVehicleId
      } else if (selectedAction === 'update_customer') {
        customerId = selectedCustomerId
        // Update customer
        await supabase.from('customers').update({
          full_name: owner_name || '',
          address: owner_address || '',
          postal_code: owner_postal_code || '',
          city: owner_city || '',
          country: owner_country || 'Schweiz',
        }).eq('id', customerId)
      }

      // ── Resolve vehicle ────────────────────────────────────────────────────
      if (selectedAction === 'update_vehicle') {
        await supabase.from('vehicles').update({
          make: make || '',
          model: model || '',
          year: year ? parseInt(year) : null,
          license_plate: license_plate || '',
          vin: vin || null,
          fuel_type: fuel_type || null,
          engine_cc: displacement ? parseInt(displacement) : null,
          power_kw: power_kw ? parseInt(power_kw) : null,
          color: color || null,
          seats: seats ? parseInt(seats) : null,
          first_registration: first_registration || null,
        }).eq('id', vehicleId)
      } else if (selectedAction !== 'update_customer') {
        // Create new vehicle for new_both and existing_customer
        const { data, error } = await supabase.from('vehicles').insert({
          customer_id: customerId,
          make: make || '',
          model: model || '',
          year: year ? parseInt(year) : null,
          license_plate: license_plate || '',
          vin: vin || null,
          fuel_type: fuel_type || null,
          engine_cc: displacement ? parseInt(displacement) : null,
          power_kw: power_kw ? parseInt(power_kw) : null,
          color: color || null,
          seats: seats ? parseInt(seats) : null,
          first_registration: first_registration || null,
          notes: `OCR import: ${new Date().toLocaleDateString('de-CH')}`,
        }).select().single()
        if (error) throw error
        vehicleId = data.id
      }

      // ── Save registration document ─────────────────────────────────────────
      const { data: docData, error: docError } = await supabase
        .from('registration_documents')
        .insert({
          customer_id: customerId,
          vehicle_id: vehicleId,
          image_front_base64: frontImage,
          image_back_base64: backImage,
          ocr_raw_text: rawOcrText,
          extracted_data: extractedData,
          confidence_scores: confidenceScores,
          ocr_status: 'done',
          approved: true,
          reviewed_at: new Date().toISOString(),
        })
        .select()
        .single()
      if (docError) throw docError

      // ── Log OCR action ─────────────────────────────────────────────────────
      await supabase.from('ocr_logs').insert({
        document_id: docData.id,
        action: 'approved',
        details: { action_taken: selectedAction },
      })

      setSavedResult({
        customerId,
        vehicleId,
        customerName: owner_name,
        vehicleInfo: `${make || ''} ${model || ''} – ${license_plate || ''}`.trim(),
      })
      setStep(4)
      onRefresh()
      toast('Sikeresen feldolgozva!', 'success')
    } catch (err: any) {
      console.error(err)
      toast(err?.message || 'Mentés sikertelen!', 'error')
    } finally {
      setSaving(false)
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function handleReset() {
    setStep(1)
    setFrontImage(null)
    setBackImage(null)
    setProcessing(false)
    setRawOcrText('')
    setExtractedData({})
    setConfidenceScores({})
    setIsDemoMode(false)
    setExistingVehicles([])
    setExistingCustomers([])
    setSelectedAction('new_both')
    setSelectedCustomerId('')
    setSelectedVehicleId('')
    setSaving(false)
    setSavedResult(null)
  }

  // ── Fuel types ────────────────────────────────────────────────────────────

  const fuelOptions = [
    { label: 'Benzin', value: 'petrol' },
    { label: 'Diesel', value: 'diesel' },
    { label: 'Elektro', value: 'electric' },
    { label: 'Hybrid', value: 'hybrid' },
    { label: 'Gas', value: 'gas' },
  ]

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        display: 'flex',
        gap: 24,
        alignItems: 'flex-start',
        padding: '24px 0',
        minHeight: '100%',
        fontFamily: 'inherit',
      }}
    >
      {/* Sidebar */}
      <StepSidebar currentStep={step} />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0 }}>

        {/* ── STEP 1: UPLOAD ─────────────────────────────────────────────── */}
        {step === 1 && (
          <Card className="p-8">
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ color: '#0B1E3D', fontWeight: 700, fontSize: 22, margin: 0 }}>
                Forgalmi engedély beolvasása
              </h2>
              <p style={{ color: '#5a6a80', fontSize: 14, marginTop: 6 }}>
                Töltsd fel a forgalmi engedély oldalait az automatikus adatkinyeréshez.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 28 }}>
              <UploadZone
                label="Forgalmi engedély – 1. oldal"
                image={frontImage}
                onImage={setFrontImage}
                onClear={() => setFrontImage(null)}
                required
              />
              <UploadZone
                label="Forgalmi engedély – 2. oldal"
                image={backImage}
                onImage={setBackImage}
                onClear={() => setBackImage(null)}
              />
            </div>

            {!frontImage && (
              <div
                style={{
                  background: 'rgba(201,168,76,0.1)',
                  border: '1px solid #C9A84C',
                  borderRadius: 8,
                  padding: '10px 16px',
                  color: '#7a5c00',
                  fontSize: 13,
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertTriangle size={15} color="#C9A84C" />
                Az első oldal feltöltése kötelező a feldolgozáshoz.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                onClick={handleOcr}
                disabled={!frontImage || processing}
                style={{
                  background: frontImage ? '#0B1E3D' : '#d1d5db',
                  color: '#fff',
                  padding: '10px 28px',
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: frontImage ? 'pointer' : 'not-allowed',
                }}
              >
                {processing ? (
                  <>
                    <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    OCR feldolgozás…
                  </>
                ) : (
                  <>
                    OCR Feldolgozás
                    <ChevronRight size={18} />
                  </>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* ── STEP 2: REVIEW ─────────────────────────────────────────────── */}
        {step === 2 && (
          <Card className="p-8">
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ color: '#0B1E3D', fontWeight: 700, fontSize: 22, margin: 0 }}>
                Kinyert adatok ellenőrzése
              </h2>
              {isDemoMode && (
                <div
                  style={{
                    background: 'rgba(201,56,76,0.08)',
                    border: '1px solid #C9384C',
                    borderRadius: 8,
                    padding: '8px 14px',
                    color: '#C9384C',
                    fontSize: 13,
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={14} /> OCR nem sikerült – töltsd ki manuálisan!
                </div>
              )}
              {lowConfCount > 0 && !isDemoMode && (
                <div
                  style={{
                    background: 'rgba(201,168,76,0.1)',
                    border: '1px solid #C9A84C',
                    borderRadius: 8,
                    padding: '8px 14px',
                    color: '#7a5c00',
                    fontSize: 13,
                    marginTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <AlertTriangle size={14} color="#C9A84C" />
                  {lowConfCount} mező bizonytalan – ellenőrizd!
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {/* Left: image preview */}
              <div style={{ width: '38%', minWidth: 220, flexShrink: 0 }}>
                {frontImage && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: '#5a6a80', marginBottom: 4 }}>1. oldal</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frontImage}
                      alt="Front"
                      style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                  </div>
                )}
                {backImage && (
                  <div>
                    <div style={{ fontSize: 12, color: '#5a6a80', marginBottom: 4 }}>2. oldal</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={backImage}
                      alt="Back"
                      style={{ width: '100%', borderRadius: 8, border: '1px solid #e5e7eb' }}
                    />
                  </div>
                )}
              </div>

              {/* Right: form */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 700,
                    color: '#0B1E3D',
                    fontSize: 14,
                    marginBottom: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Car size={16} color="#C9A84C" /> Jármű adatok
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <FieldRow label="Rendszám" fieldKey="license_plate" value={extractedData.license_plate || ''} confidence={confidenceScores.license_plate} onChange={handleFieldChange} />
                  <FieldRow label="Alvázszám / VIN" fieldKey="vin" value={extractedData.vin || ''} confidence={confidenceScores.vin} onChange={handleFieldChange} />
                  <FieldRow label="Márka" fieldKey="make" value={extractedData.make || ''} confidence={confidenceScores.make} onChange={handleFieldChange} />
                  <FieldRow label="Modell" fieldKey="model" value={extractedData.model || ''} confidence={confidenceScores.model} onChange={handleFieldChange} />
                  <FieldRow label="Évjárat" fieldKey="year" value={extractedData.year || ''} confidence={confidenceScores.year} onChange={handleFieldChange} type="number" />
                  <FieldRow label="Első forgalomba helyezés" fieldKey="first_registration" value={extractedData.first_registration || ''} confidence={confidenceScores.first_registration} onChange={handleFieldChange} />
                  <FieldRow label="Üzemanyag" fieldKey="fuel_type" value={extractedData.fuel_type || ''} confidence={confidenceScores.fuel_type} onChange={handleFieldChange} type="select" options={fuelOptions} />
                  <FieldRow label="Hengerűrtartalom cm³" fieldKey="displacement" value={extractedData.displacement || ''} confidence={confidenceScores.displacement} onChange={handleFieldChange} type="number" />
                  <FieldRow label="Teljesítmény kW" fieldKey="power_kw" value={extractedData.power_kw || ''} confidence={confidenceScores.power_kw} onChange={handleFieldChange} type="number" />
                  <FieldRow label="Szín" fieldKey="color" value={extractedData.color || ''} confidence={confidenceScores.color} onChange={handleFieldChange} />
                  <FieldRow label="Ülések száma" fieldKey="seats" value={extractedData.seats || ''} confidence={confidenceScores.seats} onChange={handleFieldChange} type="number" />
                  <FieldRow label="Saját tömeg kg" fieldKey="tare_weight" value={extractedData.tare_weight || ''} confidence={confidenceScores.tare_weight} onChange={handleFieldChange} type="number" />
                  <FieldRow label="Össztömeg kg" fieldKey="total_weight" value={extractedData.total_weight || ''} confidence={confidenceScores.total_weight} onChange={handleFieldChange} type="number" />
                  <FieldRow label="Dokumentum szám" fieldKey="document_number" value={extractedData.document_number || ''} confidence={confidenceScores.document_number} onChange={handleFieldChange} />
                </div>

                <div
                  style={{
                    fontWeight: 700,
                    color: '#0B1E3D',
                    fontSize: 14,
                    margin: '20px 0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <UserPlus size={16} color="#C9A84C" /> Tulajdonos adatok
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
                  <FieldRow label="Teljes név" fieldKey="owner_name" value={extractedData.owner_name || ''} confidence={confidenceScores.owner_name} onChange={handleFieldChange} />
                  <FieldRow label="Cím" fieldKey="owner_address" value={extractedData.owner_address || ''} confidence={confidenceScores.owner_address} onChange={handleFieldChange} />
                  <FieldRow label="Irányítószám" fieldKey="owner_postal_code" value={extractedData.owner_postal_code || ''} confidence={confidenceScores.owner_postal_code} onChange={handleFieldChange} />
                  <FieldRow label="Város" fieldKey="owner_city" value={extractedData.owner_city || ''} confidence={confidenceScores.owner_city} onChange={handleFieldChange} />
                  <FieldRow label="Ország" fieldKey="owner_country" value={extractedData.owner_country || 'Schweiz'} confidence={confidenceScores.owner_country} onChange={handleFieldChange} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
              <Button
                onClick={() => setStep(1)}
                style={{
                  background: '#F4F5F7',
                  color: '#0B1E3D',
                  border: '1px solid #d1d5db',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ChevronLeft size={16} /> Újrafotózás
              </Button>
              <Button
                onClick={runDuplicateCheck}
                style={{
                  background: '#0B1E3D',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                Adatok elfogadása <ChevronRight size={16} />
              </Button>
            </div>
          </Card>
        )}

        {/* ── STEP 3: DUPLICATE CHECK ─────────────────────────────────────── */}
        {step === 3 && (
          <Card className="p-8">
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ color: '#0B1E3D', fontWeight: 700, fontSize: 22, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Search size={22} color="#C9A84C" /> Egyezés keresés
              </h2>
              <p style={{ color: '#5a6a80', fontSize: 14, marginTop: 6 }}>
                Válassz, hogyan mentse a rendszer az adatokat.
              </p>
            </div>

            {/* Vehicle duplicate warning */}
            {existingVehicles.length > 0 && (
              <div
                style={{
                  background: 'rgba(201,168,76,0.1)',
                  border: '1px solid #C9A84C',
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginBottom: 20,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <AlertTriangle size={18} color="#C9A84C" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#7a5c00', fontSize: 14 }}>
                    ⚠ Rendszám már létezik a rendszerben:
                  </div>
                  {existingVehicles.map((v) => (
                    <div key={v.id} style={{ color: '#5a6a80', fontSize: 13, marginTop: 4 }}>
                      {v.make} {v.model} – {v.license_plate}
                      {v.customer && (
                        <span style={{ marginLeft: 8, color: '#0B1E3D' }}>
                          (Tulajdonos: {v.customer.full_name})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>

              {/* 1. New both */}
              <ActionCard
                id="new_both"
                selected={selectedAction === 'new_both'}
                onSelect={() => setSelectedAction('new_both')}
                icon={<UserPlus size={20} color="#16a34a" />}
                title="Új ügyfél + új jármű létrehozása"
                description="Mindkét rekordot létrehozza az adatbázisban."
                color="#16a34a"
              />

              {/* 2. Existing customer + new vehicle */}
              <ActionCard
                id="existing_customer"
                selected={selectedAction === 'existing_customer'}
                onSelect={() => setSelectedAction('existing_customer')}
                icon={<Car size={20} color="#0B1E3D" />}
                title="Meglévő ügyfélhez kapcsolás + új jármű"
                description="Válassz egy meglévő ügyfelet, és adj hozzá új járművet."
                color="#0B1E3D"
              >
                {selectedAction === 'existing_customer' && (
                  <div style={{ marginTop: 10 }}>
                    <Select
                      value={selectedCustomerId}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCustomerId(e.target.value)}
                    >
                      <option value="">– válassz ügyfelet –</option>
                      {existingCustomers.map((c) => (
                        <option key={c.id} value={c.id}>{c.full_name} – {c.city || ''}</option>
                      ))}
                    </Select>
                  </div>
                )}
              </ActionCard>

              {/* 3. Update vehicle (only if vehicle duplicate) */}
              {existingVehicles.length > 0 && (
                <ActionCard
                  id="update_vehicle"
                  selected={selectedAction === 'update_vehicle'}
                  onSelect={() => setSelectedAction('update_vehicle')}
                  icon={<RefreshCw size={20} color="#C9A84C" />}
                  title="Meglévő jármű frissítése"
                  description="Frissíti a meglévő jármű adatait az OCR eredménnyel."
                  color="#C9A84C"
                >
                  {selectedAction === 'update_vehicle' && (
                    <div style={{ marginTop: 10 }}>
                      <Select
                        value={selectedVehicleId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedVehicleId(e.target.value)}
                      >
                        <option value="">– válassz járművet –</option>
                        {existingVehicles.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.make} {v.model} – {v.license_plate}
                          </option>
                        ))}
                      </Select>
                    </div>
                  )}
                </ActionCard>
              )}

              {/* 4. Update customer only */}
              {existingCustomers.length > 0 && (
                <ActionCard
                  id="update_customer"
                  selected={selectedAction === 'update_customer'}
                  onSelect={() => setSelectedAction('update_customer')}
                  icon={<Eye size={20} color="#5a6a80" />}
                  title="Csak ügyfél frissítése"
                  description="Frissíti az ügyfél adatait, járművet nem érint."
                  color="#5a6a80"
                >
                  {selectedAction === 'update_customer' && (
                    <div style={{ marginTop: 10 }}>
                      <Select
                        value={selectedCustomerId}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCustomerId(e.target.value)}
                      >
                        <option value="">– válassz ügyfelet –</option>
                        {existingCustomers.map((c) => (
                          <option key={c.id} value={c.id}>{c.full_name} – {c.city || ''}</option>
                        ))}
                      </Select>
                    </div>
                  )}
                </ActionCard>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                onClick={() => setStep(2)}
                style={{
                  background: '#F4F5F7',
                  color: '#0B1E3D',
                  border: '1px solid #d1d5db',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <ChevronLeft size={16} /> Vissza
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: '#0B1E3D',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {saving ? (
                  <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Mentés…</>
                ) : (
                  <>Mentés <ChevronRight size={16} /></>
                )}
              </Button>
            </div>
          </Card>
        )}

        {/* ── STEP 4: SUCCESS ─────────────────────────────────────────────── */}
        {step === 4 && savedResult && (
          <Card className="p-12 text-center">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: '50%',
                  background: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle size={40} color="#fff" />
              </div>
              <h2 style={{ color: '#0B1E3D', fontWeight: 800, fontSize: 26, margin: 0 }}>
                Sikeresen feldolgozva!
              </h2>
              <div style={{ background: '#F4F5F7', borderRadius: 10, padding: '16px 32px', marginTop: 8 }}>
                <div style={{ fontWeight: 600, color: '#0B1E3D', fontSize: 16 }}>
                  {savedResult.customerName || '–'}
                </div>
                <div style={{ color: '#5a6a80', fontSize: 14, marginTop: 4 }}>
                  {savedResult.vehicleInfo || '–'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button
                  onClick={handleReset}
                  style={{
                    background: '#0B1E3D',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <RefreshCw size={15} /> Új beolvasás
                </Button>
                <Button
                  style={{
                    background: '#F4F5F7',
                    color: '#0B1E3D',
                    border: '1px solid #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onClick={() => {}}
                >
                  <UserPlus size={15} /> Ügyfél megtekintése
                </Button>
                <Button
                  style={{
                    background: '#F4F5F7',
                    color: '#0B1E3D',
                    border: '1px solid #d1d5db',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                  onClick={() => {}}
                >
                  <Car size={15} /> Jármű megtekintése
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Spin animation */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

// ─── Action Card ──────────────────────────────────────────────────────────────

interface ActionCardProps {
  id: SelectedAction
  selected: boolean
  onSelect: () => void
  icon: React.ReactNode
  title: string
  description: string
  color: string
  children?: React.ReactNode
}

function ActionCard({ id, selected, onSelect, icon, title, description, color, children }: ActionCardProps) {
  return (
    <div
      onClick={onSelect}
      style={{
        border: `2px solid ${selected ? color : '#e5e7eb'}`,
        borderRadius: 10,
        padding: '14px 18px',
        cursor: 'pointer',
        background: selected ? `${color}0d` : '#fff',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: selected ? color : '#F4F5F7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 0.15s',
          }}
        >
          {React.cloneElement(icon as React.ReactElement<{ color?: string }>, {
            color: selected ? '#fff' : color,
          })}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#0B1E3D', fontSize: 14 }}>{title}</div>
          <div style={{ color: '#5a6a80', fontSize: 12, marginTop: 2 }}>{description}</div>
        </div>
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: '50%',
            border: `2px solid ${selected ? color : '#d1d5db'}`,
            background: selected ? color : 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {selected && <Check size={11} color="#fff" />}
        </div>
      </div>
      {children}
    </div>
  )
}
