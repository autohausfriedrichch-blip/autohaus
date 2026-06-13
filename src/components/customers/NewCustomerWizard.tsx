'use client'
import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import {
  X, ChevronRight, Car, ClipboardList, FileText,
  Clock, CheckSquare, Square, Check, User, Wrench, ArrowLeft
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

type WizardPath = 'quote' | 'workorder' | null
type WizardStep = 'decision' | 'vehicle' | 'services' | 'assign' | 'quote_review' | 'done'

interface Props {
  customerId: string
  customerName: string
  onClose: () => void
  onNavigate?: (page: string) => void
}

export function NewCustomerWizard({ customerId, customerName, onClose, onNavigate }: Props) {
  const supabase = createClient()
  const { toast } = useToast()

  const [step, setStep] = useState<WizardStep>('decision')
  const [path, setPath] = useState<WizardPath>(null)

  // Data
  const [vehicles, setVehicles] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [mechanics, setMechanics] = useState<any[]>([])

  // Selections
  const [vehicleId, setVehicleId] = useState('')
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([])
  const [mechanicId, setMechanicId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [faultDescription, setFaultDescription] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  // New vehicle form
  const [addingVehicle, setAddingVehicle] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({ make: '', model: '', year: new Date().getFullYear(), license_plate: '', fuel_type: 'petrol' })

  // Result
  const [createdId, setCreatedId] = useState<{ type: 'quote' | 'workorder'; id: string; number?: string } | null>(null)
  const [saving, setSaving] = useState(false)

  const loadData = useCallback(async () => {
    const [{ data: v }, { data: svc }, { data: m }] = await Promise.all([
      supabase.from('vehicles').select('id, make, model, license_plate, year').eq('customer_id', customerId),
      supabase.from('services').select('id, name, category, pricing_type, base_price, hourly_rate, duration_minutes, technician_task, technician_checklist, description').eq('is_active', true).order('category').order('sort_order', { ascending: true }),
      supabase.from('profiles').select('id, full_name').in('role', ['mechanic', 'admin', 'super_admin']),
    ])
    setVehicles(v || [])
    setServices(svc || [])
    const mechList = m || []
    setMechanics(mechList)
    if (mechList.length === 1) setMechanicId(mechList[0].id)
    if (v && v.length === 1) setVehicleId(v[0].id)
  }, [customerId])

  useEffect(() => { loadData() }, [loadData])

  const choosePath = (p: WizardPath) => {
    setPath(p)
    setStep('vehicle')
  }

  const saveVehicle = async () => {
    if (!vehicleForm.make || !vehicleForm.model || !vehicleForm.license_plate) {
      toast('Márka, modell és rendszám kötelező', 'error'); return
    }
    const { data, error } = await supabase.from('vehicles').insert({
      customer_id: customerId,
      make: vehicleForm.make,
      model: vehicleForm.model,
      year: vehicleForm.year,
      license_plate: vehicleForm.license_plate.toUpperCase(),
      fuel_type: vehicleForm.fuel_type,
    }).select('id').single()
    if (error) { toast('Hiba: ' + error.message, 'error'); return }
    setVehicleId(data.id)
    setVehicles(prev => [...prev, { ...vehicleForm, id: data.id, license_plate: vehicleForm.license_plate.toUpperCase() }])
    setAddingVehicle(false)
  }

  const toggleService = (id: string) => {
    setSelectedServiceIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id))

  const calcTotal = () => selectedServices.reduce((sum, s) => {
    const price = s.pricing_type === 'hourly' ? (s.hourly_rate || 0) : (s.base_price || 0)
    return sum + price
  }, 0)

  const createWorkOrder = async () => {
    if (!vehicleId) { toast('Válassz járművet', 'error'); return }
    if (selectedServiceIds.length === 0) { toast('Válassz legalább egy szolgáltatást', 'error'); return }
    if (!mechanicId) { toast('Válassz szerelőt', 'error'); return }
    setSaving(true)

    const serviceNames = selectedServices.map(s => s.name).join(', ')
    const mechanic = mechanics.find(m => m.id === mechanicId)
    const total = calcTotal()

    const { data: wo, error: woErr } = await supabase.from('work_orders').insert({
      customer_id: customerId,
      vehicle_id: vehicleId,
      service_type: serviceNames,
      status: 'new_booking',
      mechanic_id: mechanicId,
      scheduled_date: scheduledDate || null,
      scheduled_time: scheduledTime || null,
      fault_description: faultDescription || null,
      internal_notes: internalNotes || null,
      parts_cost: 0,
      labor_cost: total,
      total_amount: total,
      payment_status: 'pending',
    }).select('id, order_number').single()

    if (woErr) { toast('Hiba: ' + woErr.message, 'error'); setSaving(false); return }

    // Create tasks from services
    const taskInserts = selectedServices.map((svc, idx) => ({
      work_order_id: wo.id,
      title: svc.technician_task || svc.name,
      assigned_name: mechanic?.full_name || null,
      sort_order: idx,
      status: 'pending',
      service_id: svc.id,
      pricing_type: svc.pricing_type || 'fixed',
      price: svc.pricing_type === 'hourly' ? (svc.hourly_rate || 0) : (svc.base_price || 0),
      estimated_minutes: svc.duration_minutes || 0,
      checklist: Array.isArray(svc.technician_checklist) && svc.technician_checklist.length > 0
        ? svc.technician_checklist : [],
      checklist_done: [],
      requires_photo: false,
      priority: 'normal',
    }))
    await supabase.from('work_order_tasks').insert(taskInserts)

    // Log timeline event
    await supabase.from('work_order_events').insert({
      work_order_id: wo.id,
      event_type: 'created',
      title: 'Munkalap létrehozva',
      description: `${selectedServices.length} feladat generálva. Szerelő: ${mechanic?.full_name || '–'}`,
      user_name: 'Barbara',
      metadata: { source: 'wizard', services: selectedServices.map(s => s.name) },
    })

    setCreatedId({ type: 'workorder', id: wo.id, number: wo.order_number })
    setStep('done')
    setSaving(false)
  }

  const createQuote = async () => {
    if (!vehicleId) { toast('Válassz járművet', 'error'); return }
    if (selectedServiceIds.length === 0) { toast('Válassz legalább egy szolgáltatást', 'error'); return }
    setSaving(true)

    const items = selectedServices.map(s => ({
      description: s.name,
      quantity: 1,
      unit_price: s.pricing_type === 'hourly' ? (s.hourly_rate || 0) : (s.base_price || 0),
      item_type: 'labor',
    }))

    const subtotal = calcTotal()
    const total = subtotal * 1.077 // 7.7% tax

    const { data: quote, error: qErr } = await supabase.from('quotes').insert({
      customer_id: customerId,
      vehicle_id: vehicleId,
      status: 'draft',
      items,
      subtotal,
      total_amount: total,
      tax_rate: 7.7,
      notes: faultDescription || null,
      internal_notes: internalNotes || null,
      valid_until: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split('T')[0],
    }).select('id, quote_number').single()

    if (qErr) { toast('Hiba: ' + qErr.message, 'error'); setSaving(false); return }
    setCreatedId({ type: 'quote', id: quote.id, number: quote.quote_number })
    setStep('done')
    setSaving(false)
  }

  const vehicle = vehicles.find(v => v.id === vehicleId)
  const servicesByCategory = services.reduce((acc: Record<string, any[]>, s) => {
    const cat = s.category || 'Egyéb'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(s)
    return acc
  }, {})

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-[#0D0D0D] rounded-t-2xl">
          {step !== 'decision' && (
            <button onClick={() => setStep(step === 'vehicle' ? 'decision' : step === 'services' ? 'vehicle' : step === 'assign' || step === 'quote_review' ? 'services' : 'decision')}
              className="p-1.5 text-white/60 hover:text-white transition-colors">
              <ArrowLeft size={16} />
            </button>
          )}
          <div className="flex-1">
            <p className="text-[11px] text-white/50 font-medium">Új ügyfél folyamat</p>
            <h2 className="font-bold text-white text-[15px]">{customerName}</h2>
          </div>
          {/* Step indicator */}
          {step !== 'decision' && step !== 'done' && (
            <div className="flex items-center gap-1.5">
              {(['vehicle','services', path === 'quote' ? 'quote_review' : 'assign'] as WizardStep[]).map((s, i) => (
                <div key={s} className={`w-2 h-2 rounded-full transition-colors ${step === s ? 'bg-[#C8102E]' : 'bg-white/20'}`} />
              ))}
            </div>
          )}
          <button onClick={onClose} className="p-1.5 text-white/60 hover:text-white transition-colors ml-2">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── DECISION ── */}
          {step === 'decision' && (
            <div className="p-8">
              <h3 className="text-[18px] font-bold text-[#0D0D0D] mb-2">Következő lépés</h3>
              <p className="text-[13px] text-[#4a4a4a] mb-6">Mit szeretnél most csinálni?</p>
              <div className="space-y-3">
                <button onClick={() => choosePath('quote')}
                  className="w-full flex items-center gap-4 p-4 border-2 border-[rgba(0,0,0,0.12)] rounded-xl hover:border-[#C8102E] hover:bg-amber-50/50 transition-all text-left group">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                    <FileText size={18} className="text-amber-700" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[14px] text-[#0D0D0D]">Árajánlatot készítek</p>
                    <p className="text-[12px] text-[#4a4a4a]">Árajánlat → ügyfél elfogadja → automatikus munkalap</p>
                  </div>
                  <ChevronRight size={16} className="text-[#888888]" />
                </button>

                <button onClick={() => choosePath('workorder')}
                  className="w-full flex items-center gap-4 p-4 border-2 border-[rgba(0,0,0,0.12)] rounded-xl hover:border-[#333333] hover:bg-blue-50/50 transition-all text-left group">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                    <ClipboardList size={18} className="text-blue-700" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[14px] text-[#0D0D0D]">Munkalapot készítek árajánlat nélkül</p>
                    <p className="text-[12px] text-[#4a4a4a]">Közvetlen munkalap + Karl feladatai azonnal</p>
                  </div>
                  <ChevronRight size={16} className="text-[#888888]" />
                </button>

                <button onClick={onClose}
                  className="w-full flex items-center gap-4 p-4 border border-[rgba(0,0,0,0.08)] rounded-xl hover:bg-gray-50 transition-all text-left">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Clock size={18} className="text-gray-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[14px] text-[#0D0D0D]">Később folytatom</p>
                    <p className="text-[12px] text-[#4a4a4a]">Az ügyfél mentve, folytathatod bármikor</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* ── VEHICLE ── */}
          {step === 'vehicle' && (
            <div className="p-6">
              <h3 className="text-[16px] font-bold text-[#0D0D0D] mb-1">Jármű kiválasztása</h3>
              <p className="text-[12px] text-[#4a4a4a] mb-4">Válassz meglévő járművet vagy rögzíts újat</p>

              {vehicles.length > 0 && (
                <div className="space-y-2 mb-4">
                  {vehicles.map(v => (
                    <button key={v.id} onClick={() => { setVehicleId(v.id); setAddingVehicle(false) }}
                      className={`w-full flex items-center gap-3 p-3.5 border-2 rounded-xl transition-all text-left ${vehicleId === v.id ? 'border-[#0D0D0D] bg-[#0D0D0D]/5' : 'border-[rgba(0,0,0,0.10)] hover:border-[rgba(0,0,0,0.25)]'}`}>
                      <Car size={18} className={vehicleId === v.id ? 'text-[#0D0D0D]' : 'text-[#888888]'} />
                      <div className="flex-1">
                        <span className="font-semibold text-[13px] text-[#0D0D0D]">{v.make} {v.model} {v.year}</span>
                        <span className="ml-2 text-[11px] font-bold bg-[#0D0D0D] text-white px-1.5 py-0.5 rounded">{v.license_plate}</span>
                      </div>
                      {vehicleId === v.id && <Check size={16} className="text-[#0D0D0D]" />}
                    </button>
                  ))}
                </div>
              )}

              {!addingVehicle ? (
                <button onClick={() => setAddingVehicle(true)}
                  className="w-full flex items-center gap-3 p-3.5 border-2 border-dashed border-[rgba(0,0,0,0.15)] rounded-xl hover:border-[#C8102E] hover:bg-amber-50/30 transition-all text-[#4a4a4a] hover:text-[#C8102E]">
                  <Car size={16} />
                  <span className="text-[13px] font-medium">+ Új jármű rögzítése</span>
                </button>
              ) : (
                <div className="border border-[rgba(0,0,0,0.12)] rounded-xl p-4 bg-gray-50/50">
                  <p className="text-[12px] font-semibold text-[#0D0D0D] mb-3">Új jármű adatai</p>
                  <div className="grid grid-cols-2 gap-2">
                    <FormGroup className="mb-0">
                      <FormLabel>Márka *</FormLabel>
                      <Input value={vehicleForm.make} onChange={e => setVehicleForm(f => ({ ...f, make: e.target.value }))} placeholder="BMW" />
                    </FormGroup>
                    <FormGroup className="mb-0">
                      <FormLabel>Modell *</FormLabel>
                      <Input value={vehicleForm.model} onChange={e => setVehicleForm(f => ({ ...f, model: e.target.value }))} placeholder="320d" />
                    </FormGroup>
                    <FormGroup className="mb-0">
                      <FormLabel>Évjárat</FormLabel>
                      <Input type="number" value={vehicleForm.year} onChange={e => setVehicleForm(f => ({ ...f, year: parseInt(e.target.value) || f.year }))} />
                    </FormGroup>
                    <FormGroup className="mb-0">
                      <FormLabel>Rendszám *</FormLabel>
                      <Input value={vehicleForm.license_plate} onChange={e => setVehicleForm(f => ({ ...f, license_plate: e.target.value }))} placeholder="ZH 123456" />
                    </FormGroup>
                    <FormGroup className="mb-0 col-span-2">
                      <FormLabel>Üzemanyag</FormLabel>
                      <Select value={vehicleForm.fuel_type} onChange={e => setVehicleForm(f => ({ ...f, fuel_type: e.target.value }))}>
                        <option value="petrol">Benzin</option>
                        <option value="diesel">Dízel</option>
                        <option value="electric">Elektromos</option>
                        <option value="hybrid">Hibrid</option>
                        <option value="lpg">LPG</option>
                      </Select>
                    </FormGroup>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="secondary" size="sm" onClick={() => setAddingVehicle(false)}>Mégse</Button>
                    <Button variant="primary" size="sm" onClick={saveVehicle}>Jármű mentése</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── SERVICES ── */}
          {step === 'services' && (
            <div className="p-6">
              <h3 className="text-[16px] font-bold text-[#0D0D0D] mb-1">
                Szolgáltatások kiválasztása
                {selectedServiceIds.length > 0 && <span className="ml-2 text-[#C8102E]">{selectedServiceIds.length} kiválasztva</span>}
              </h3>
              <p className="text-[12px] text-[#4a4a4a] mb-4">
                {vehicle && <span className="font-medium text-[#0D0D0D]">{vehicle.make} {vehicle.model} – {vehicle.license_plate}</span>}
              </p>

              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100 mb-4 max-h-64 overflow-y-auto">
                {Object.entries(servicesByCategory).map(([cat, svcs]) => (
                  <div key={cat}>
                    <div className="px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-[#4a4a4a] uppercase tracking-wider">{cat}</div>
                    {(svcs as any[]).map(svc => {
                      const checked = selectedServiceIds.includes(svc.id)
                      const price = svc.pricing_type === 'hourly' ? svc.hourly_rate : svc.base_price
                      return (
                        <button key={svc.id} onClick={() => toggleService(svc.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left ${checked ? 'bg-blue-50/60' : ''}`}>
                          {checked ? <CheckSquare size={15} className="text-[#0D0D0D] flex-shrink-0" /> : <Square size={15} className="text-gray-300 flex-shrink-0" />}
                          <span className="flex-1 text-[13px] font-medium text-[#0D0D0D]">{svc.name}</span>
                          <span className="text-[11px] text-[#888888] shrink-0">
                            {price ? formatCurrency(price) : '–'}
                            {svc.pricing_type === 'hourly' ? '/h' : ''}
                            {svc.duration_minutes ? ` · ${svc.duration_minutes}p` : ''}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>

              {selectedServices.length > 0 && (
                <div className="bg-[#F4F5F7] rounded-xl p-3 mb-4">
                  <p className="text-[11px] font-semibold text-[#4a4a4a] mb-2">Kiválasztott szolgáltatások</p>
                  {selectedServices.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-[12px] py-0.5">
                      <span className="text-[#0D0D0D]">{s.name}</span>
                      <span className="font-semibold text-[#0D0D0D]">
                        {formatCurrency(s.pricing_type === 'hourly' ? s.hourly_rate : s.base_price || 0)}
                        {s.pricing_type === 'hourly' ? '/h' : ''}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between">
                    <span className="text-[12px] font-bold text-[#0D0D0D]">Összesen (nettó)</span>
                    <span className="text-[13px] font-bold text-[#C8102E]">{formatCurrency(calcTotal())}</span>
                  </div>
                </div>
              )}

              <FormGroup>
                <FormLabel>Hibaleírás / megjegyzés</FormLabel>
                <Textarea value={faultDescription} onChange={e => setFaultDescription(e.target.value)} placeholder="Mit jelzett az ügyfél?" className="min-h-[56px]" />
              </FormGroup>
            </div>
          )}

          {/* ── ASSIGN (direct workorder) ── */}
          {step === 'assign' && (
            <div className="p-6">
              <h3 className="text-[16px] font-bold text-[#0D0D0D] mb-1">Munkalap beállítások</h3>
              <p className="text-[12px] text-[#4a4a4a] mb-4">{selectedServices.length} szolgáltatás · {vehicle?.make} {vehicle?.model}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <FormGroup>
                  <FormLabel>Szerelő *</FormLabel>
                  <Select value={mechanicId} onChange={e => setMechanicId(e.target.value)}>
                    <option value="">Válassz szerelőt...</option>
                    {mechanics.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </Select>
                </FormGroup>
                <FormGroup>
                  <FormLabel>Időpont (opcionális)</FormLabel>
                  <Input type="date" value={scheduledDate} onChange={e => setScheduledDate(e.target.value)} />
                </FormGroup>
                <FormGroup className="col-span-2">
                  <FormLabel>Időpont (óra)</FormLabel>
                  <Input type="time" value={scheduledTime} onChange={e => setScheduledTime(e.target.value)} />
                </FormGroup>
                <FormGroup className="col-span-2">
                  <FormLabel>Belső megjegyzés</FormLabel>
                  <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Csak belső..." className="min-h-[56px]" />
                </FormGroup>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                <p className="text-[11px] font-semibold text-blue-800 mb-2 flex items-center gap-1.5"><Wrench size={12} /> Karl feladatai lesznek:</p>
                {selectedServices.map(s => (
                  <div key={s.id} className="text-[12px] text-blue-700 py-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    {s.technician_task || s.name}
                    {(s.technician_checklist?.length > 0) && <span className="text-[10px] text-blue-400">({s.technician_checklist.length} lépés)</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── QUOTE REVIEW ── */}
          {step === 'quote_review' && (
            <div className="p-6">
              <h3 className="text-[16px] font-bold text-[#0D0D0D] mb-1">Árajánlat összefoglalója</h3>
              <p className="text-[12px] text-[#4a4a4a] mb-4">{customerName} · {vehicle?.make} {vehicle?.model} {vehicle?.license_plate}</p>

              <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                <div className="bg-gray-50 px-4 py-2 text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-wide grid grid-cols-3">
                  <span>Szolgáltatás</span><span className="text-right">Árazás</span><span className="text-right">Ár</span>
                </div>
                {selectedServices.map(s => (
                  <div key={s.id} className="px-4 py-2.5 grid grid-cols-3 text-[13px] border-t border-gray-100">
                    <span className="font-medium text-[#0D0D0D]">{s.name}</span>
                    <span className="text-right text-[#4a4a4a] text-[11px]">
                      {s.pricing_type === 'fixed' ? 'Fix' : s.pricing_type === 'hourly' ? 'Óradíjas' : 'Egyedi'}
                    </span>
                    <span className="text-right font-semibold text-[#0D0D0D]">
                      {formatCurrency(s.pricing_type === 'hourly' ? s.hourly_rate || 0 : s.base_price || 0)}
                      {s.pricing_type === 'hourly' && <span className="text-[10px] text-[#4a4a4a]">/h</span>}
                    </span>
                  </div>
                ))}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-[12px] font-bold text-[#0D0D0D]">Nettó összesen</span>
                  <span className="text-[14px] font-bold text-[#C8102E]">{formatCurrency(calcTotal())}</span>
                </div>
                <div className="px-4 py-2 bg-gray-50 flex items-center justify-between border-t border-gray-100">
                  <span className="text-[11px] text-[#4a4a4a]">+ 7.7% MwSt</span>
                  <span className="text-[12px] font-semibold text-[#0D0D0D]">{formatCurrency(calcTotal() * 1.077)}</span>
                </div>
              </div>

              {faultDescription && (
                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-[12px] text-[#4a4a4a]">
                  <span className="font-medium text-[#0D0D0D]">Megjegyzés: </span>{faultDescription}
                </div>
              )}

              <FormGroup>
                <FormLabel>Belső megjegyzés (nem kerül az árajánlatba)</FormLabel>
                <Textarea value={internalNotes} onChange={e => setInternalNotes(e.target.value)} placeholder="Belső megjegyzések..." className="min-h-[56px]" />
              </FormGroup>
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && createdId && (
            <div className="p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-emerald-600" />
              </div>
              <h3 className="text-[18px] font-bold text-[#0D0D0D] mb-2">
                {createdId.type === 'quote' ? 'Árajánlat létrehozva!' : 'Munkalap létrehozva!'}
              </h3>
              {createdId.number && (
                <p className="text-[13px] text-[#4a4a4a] mb-6">{createdId.number}</p>
              )}

              {createdId.type === 'workorder' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-6 text-left">
                  <p className="text-[12px] font-semibold text-blue-800 mb-1.5">Karl feladatai létrehozva:</p>
                  {selectedServices.map(s => (
                    <div key={s.id} className="text-[12px] text-blue-700 flex items-center gap-1.5 py-0.5">
                      <Check size={11} className="text-emerald-500" />
                      {s.technician_task || s.name}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Button variant="primary" onClick={() => {
                  onNavigate?.(createdId.type === 'quote' ? 'quotes' : 'workorders')
                  onClose()
                }}>
                  {createdId.type === 'quote' ? 'Árajánlatok megnyitása' : 'Munkalapok megnyitása'}
                </Button>
                <Button variant="secondary" onClick={onClose}>Bezárás</Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step !== 'decision' && step !== 'done' && (
          <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
            <Button variant="secondary" onClick={() => setStep(
              step === 'vehicle' ? 'decision' :
              step === 'services' ? 'vehicle' :
              'services'
            )}>Vissza</Button>
            <Button variant="primary" className="flex-1" disabled={saving}
              onClick={() => {
                if (step === 'vehicle') {
                  if (!vehicleId) { toast('Válassz járművet vagy rögzíts újat', 'error'); return }
                  setStep('services')
                } else if (step === 'services') {
                  if (selectedServiceIds.length === 0) { toast('Válassz legalább egy szolgáltatást', 'error'); return }
                  setStep(path === 'quote' ? 'quote_review' : 'assign')
                } else if (step === 'assign') {
                  createWorkOrder()
                } else if (step === 'quote_review') {
                  createQuote()
                }
              }}
            >
              {saving ? 'Mentés...' :
               step === 'vehicle' ? 'Tovább → Szolgáltatások' :
               step === 'services' ? `Tovább → ${path === 'quote' ? 'Árajánlat áttekintés' : 'Beállítások'}` :
               step === 'assign' ? 'Munkalap létrehozása' :
               step === 'quote_review' ? 'Árajánlat létrehozása' : 'Tovább'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
