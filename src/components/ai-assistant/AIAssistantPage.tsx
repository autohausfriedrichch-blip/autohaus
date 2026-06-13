'use client'
import { useState } from 'react'
import {
  Stethoscope, FileText, MessageSquare, Truck, Wand2,
  Copy, Check, Send, Loader2, ChevronDown
} from 'lucide-react'

interface Tab {
  id: string
  label: string
  icon: any
}

const TABS: Tab[] = [
  { id: 'status_update',    label: 'Státusz üzenet',     icon: MessageSquare },
  { id: 'quote_generator',  label: 'Árajánlat',          icon: FileText },
  { id: 'service_advisor',  label: 'Szerviz tanácsadó',  icon: Stethoscope },
  { id: 'pickup_delivery',  label: 'Hozom-Viszem',       icon: Truck },
  { id: 'message_rewriter', label: 'Átíró',              icon: Wand2 },
]

const STATUS_OPTIONS = [
  { value: 'received',       label: 'Beérkezett – Diagnózis függőben' },
  { value: 'diagnosing',     label: 'Diagnosztika folyamatban' },
  { value: 'waiting_parts',  label: 'Alkatrészre várunk' },
  { value: 'in_progress',    label: 'Javítás folyamatban' },
  { value: 'ready',          label: 'Kész – Átvehető' },
  { value: 'delivered',      label: 'Átadva / Lezárva' },
]

const PICKUP_TYPES = [
  { value: 'before_pickup',    label: 'Holnapi/mai átvétel előzetes értesítése' },
  { value: 'driver_en_route',  label: 'Sofőr úton van' },
  { value: 'arrived_workshop', label: 'Jármű megérkezett a műhelybe' },
  { value: 'return_delivery',  label: 'Visszaszállítás folyamatban' },
  { value: 'handover_complete', label: 'Átadás kész' },
]

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
      {copied ? 'Másolva' : 'Másolás'}
    </button>
  )
}

function ResultBox({ result, label }: { result: string; label?: string }) {
  if (!result) return null
  return (
    <div className="mt-4">
      {label && <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
        {result}
      </div>
      <div className="flex gap-2 mt-2">
        <CopyButton text={result} />
      </div>
    </div>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: any) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C] bg-white"
    />
  )
}

function Textarea({ value, onChange, placeholder, rows = 3 }: any) {
  return (
    <textarea
      value={value}
      onChange={(e: any) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C] bg-white resize-none"
    />
  )
}

function SelectField({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C9A84C]/30 focus:border-[#C9A84C] bg-white appearance-none pr-8"
      >
        <option value="">– Válassz –</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  )
}

function GenerateButton({ onClick, loading, label = 'Generálás' }: { onClick: () => void; loading: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#b8943f] disabled:opacity-60 transition-colors"
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
      {loading ? 'Generálás...' : label}
    </button>
  )
}

async function streamAI(mode: string, context: Record<string, any>, onChunk: (t: string) => void) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, context }),
  })
  if (!res.ok || !res.body) throw new Error('AI hiba')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onChunk(decoder.decode(value))
  }
}

// ─── Status Update Tab ────────────────────────────────────────────────────────

function StatusUpdateTab() {
  const [status, setStatus] = useState('')
  const [plate, setPlate] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [mechanicName, setMechanicName] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!status) return
    setLoading(true); setResult('')
    try {
      await streamAI('status_update', { status, plate, customerName, mechanicName, additionalInfo }, t => setResult(p => p + t))
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section label="Státusz *">
          <SelectField value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </Section>
        <Section label="Rendszám">
          <Input value={plate} onChange={setPlate} placeholder="ZH 123 456" />
        </Section>
        <Section label="Ügyfél neve">
          <Input value={customerName} onChange={setCustomerName} placeholder="Müller Peter" />
        </Section>
        <Section label="Szerelő neve">
          <Input value={mechanicName} onChange={setMechanicName} placeholder="Karl" />
        </Section>
      </div>
      <Section label="Kiegészítő info">
        <Textarea value={additionalInfo} onChange={setAdditionalInfo} placeholder="Pl. a jobb első kerék csapágyát cseréljük, várható elkészülés péntek délig." rows={2} />
      </Section>
      <GenerateButton onClick={generate} loading={loading} label="Üzenet generálása" />
      {(result || loading) && (
        <ResultBox result={result} label="Generált státuszüzenet (Deutsch)" />
      )}
    </div>
  )
}

// ─── Quote Generator Tab ──────────────────────────────────────────────────────

function QuoteGeneratorTab() {
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [plate, setPlate] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [service, setService] = useState('')
  const [partsCost, setPartsCost] = useState('')
  const [laborHours, setLaborHours] = useState('')
  const [hourlyRate, setHourlyRate] = useState('150')
  const [extras, setExtras] = useState('0')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const labor = parseFloat(laborHours || '0') * parseFloat(hourlyRate || '150')
  const subtotal = labor + parseFloat(partsCost || '0') + parseFloat(extras || '0')
  const total = subtotal * 1.081

  const generate = async () => {
    if (!service) return
    setLoading(true); setResult('')
    try {
      await streamAI('quote_generator', { brand, model, year, plate, customerName, service, partsCost, laborHours, hourlyRate, extras }, t => setResult(p => p + t))
    } finally { setLoading(false) }
  }

  const sections = result ? result.split('---').filter(s => s.trim()) : []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Section label="Márka"><Input value={brand} onChange={setBrand} placeholder="BMW" /></Section>
        <Section label="Modell"><Input value={model} onChange={setModel} placeholder="320d" /></Section>
        <Section label="Év"><Input value={year} onChange={setYear} placeholder="2019" /></Section>
        <Section label="Rendszám"><Input value={plate} onChange={setPlate} placeholder="ZH 123" /></Section>
      </div>
      <Section label="Ügyfél neve">
        <Input value={customerName} onChange={setCustomerName} placeholder="Müller Peter" />
      </Section>
      <Section label="Elvégzendő munka *">
        <Textarea value={service} onChange={setService} placeholder="Pl. Fékbetét és tárcsa csere (első tengely), olajcsere, szűrőcsere" rows={2} />
      </Section>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Section label="Alkatrész CHF"><Input value={partsCost} onChange={setPartsCost} placeholder="320" type="number" /></Section>
        <Section label="Munkaóra"><Input value={laborHours} onChange={setLaborHours} placeholder="2.5" type="number" /></Section>
        <Section label="Óradíj CHF"><Input value={hourlyRate} onChange={setHourlyRate} placeholder="150" type="number" /></Section>
        <Section label="Egyéb CHF"><Input value={extras} onChange={setExtras} placeholder="0" type="number" /></Section>
      </div>
      {(partsCost || laborHours) && (
        <div className="bg-[#faf8f2] border border-[#C9A84C]/20 rounded-xl p-3 text-sm">
          <div className="flex justify-between text-gray-600"><span>Munkadíj</span><span>CHF {labor.toFixed(2)}</span></div>
          <div className="flex justify-between text-gray-600"><span>Alkatrészek</span><span>CHF {parseFloat(partsCost||'0').toFixed(2)}</span></div>
          {parseFloat(extras||'0') > 0 && <div className="flex justify-between text-gray-600"><span>Egyéb</span><span>CHF {parseFloat(extras).toFixed(2)}</span></div>}
          <div className="border-t border-[#C9A84C]/20 mt-2 pt-2 flex justify-between font-bold text-[#0B1E3D]">
            <span>Összesen (áfával 8.1%)</span><span>CHF {total.toFixed(2)}</span>
          </div>
        </div>
      )}
      <GenerateButton onClick={generate} loading={loading} label="Árajánlat generálása (4 verzió)" />
      {loading && !result && <div className="text-sm text-gray-400 animate-pulse">Generálás folyamatban...</div>}
      {sections.length > 0 && (
        <div className="space-y-3 mt-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Generált ajánlat (4 verzió)</div>
          {sections.map((section, i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{section.trim()}</div>
              <div className="mt-2"><CopyButton text={section.trim()} /></div>
            </div>
          ))}
        </div>
      )}
      {result && sections.length === 0 && <ResultBox result={result} />}
    </div>
  )
}

// ─── Service Advisor Tab ──────────────────────────────────────────────────────

function ServiceAdvisorTab() {
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [mileage, setMileage] = useState('')
  const [problem, setProblem] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!problem) return
    setLoading(true); setResult('')
    try {
      await streamAI('service_advisor', { brand, model, year, mileage, problem }, t => setResult(p => p + t))
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
        <strong>Fontos:</strong> Ez az eszköz soha nem ad biztos diagnózist. Az AI kérdéseket tesz fel és lehetséges okokat vázol — a pontos megállapítás a műhelyi vizsgálat feladata.
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Section label="Márka"><Input value={brand} onChange={setBrand} placeholder="VW" /></Section>
        <Section label="Modell"><Input value={model} onChange={setModel} placeholder="Golf" /></Section>
        <Section label="Évjárat"><Input value={year} onChange={setYear} placeholder="2018" /></Section>
        <Section label="Km óra"><Input value={mileage} onChange={setMileage} placeholder="95000" type="number" /></Section>
      </div>
      <Section label="Probléma leírása *">
        <Textarea value={problem} onChange={setProblem} placeholder="Pl. Hideg indítás után 10-15 percig erős remegés, aztán elmúlik. Főleg reggel tapasztalható." rows={4} />
      </Section>
      <GenerateButton onClick={generate} loading={loading} label="Elemzés indítása" />
      {(result || loading) && (
        <ResultBox result={result} label="AI elemzés – Rückfragen & mögliche Ursachen (Deutsch)" />
      )}
    </div>
  )
}

// ─── Pickup & Delivery Tab ────────────────────────────────────────────────────

function PickupDeliveryTab() {
  const [type, setType] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [plate, setPlate] = useState('')
  const [driverName, setDriverName] = useState('')
  const [address, setAddress] = useState('')
  const [time, setTime] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!type) return
    setLoading(true); setResult('')
    try {
      await streamAI('pickup_delivery', { type, customerName, plate, driverName, address, time }, t => setResult(p => p + t))
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Section label="Üzenet típusa *">
          <SelectField value={type} onChange={setType} options={PICKUP_TYPES} />
        </Section>
        <Section label="Ügyfél neve">
          <Input value={customerName} onChange={setCustomerName} placeholder="Müller Peter" />
        </Section>
        <Section label="Rendszám">
          <Input value={plate} onChange={setPlate} placeholder="ZH 123 456" />
        </Section>
        <Section label="Sofőr neve">
          <Input value={driverName} onChange={setDriverName} placeholder="Karl" />
        </Section>
        <Section label="Cím">
          <Input value={address} onChange={setAddress} placeholder="Bahnhofstrasse 12, Zürich" />
        </Section>
        <Section label="Időpont">
          <Input value={time} onChange={setTime} placeholder="14:30" />
        </Section>
      </div>
      <GenerateButton onClick={generate} loading={loading} label="WhatsApp üzenet generálása" />
      {(result || loading) && (
        <ResultBox result={result} label="Generált üzenet (Deutsch)" />
      )}
    </div>
  )
}

// ─── Message Rewriter Tab ─────────────────────────────────────────────────────

function MessageRewriterTab() {
  const [text, setText] = useState('')
  const [targetChannel, setTargetChannel] = useState('whatsapp')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    if (!text.trim()) return
    setLoading(true); setResult('')
    try {
      await streamAI('message_rewriter', { text, targetChannel }, t => setResult(p => p + t))
    } finally { setLoading(false) }
  }

  const channelOptions = [
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'email', label: 'Email' },
    { value: 'sms', label: 'SMS' },
    { value: 'general', label: 'Általános' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Section label="Eredeti szöveg *">
            <Textarea value={text} onChange={setText} placeholder="Pl. Szia, a kocsi kész. Gyere érte amikor tudsz." rows={4} />
          </Section>
        </div>
        <Section label="Célcsatorna">
          <SelectField value={targetChannel} onChange={setTargetChannel} options={channelOptions} />
        </Section>
      </div>
      <GenerateButton onClick={generate} loading={loading} label="Átírás svájci prémium stílusban" />
      {(result || loading) && (
        <ResultBox result={result} label="Átírt szöveg (Deutsch, Schweizer Premium)" />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function AIAssistantPage({ refreshKey, onRefresh }: { refreshKey?: number; onRefresh?: () => void }) {
  const [activeTab, setActiveTab] = useState('status_update')

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="bg-gradient-to-r from-[#0B1E3D] to-[#1a3060] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#C9A84C] rounded-xl flex items-center justify-center">
            <Wand2 size={20} className="text-[#0B1E3D]" />
          </div>
          <div>
            <h1 className="text-lg font-bold">AI Asszisztens</h1>
            <p className="text-xs text-white/60">Svájci prémium kommunikáció – Deutsch, professionell</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px ${
                  isActive
                    ? 'text-[#C9A84C] border-[#C9A84C] bg-[#faf8f2]'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="p-5">
          {activeTab === 'status_update'    && <StatusUpdateTab />}
          {activeTab === 'quote_generator'  && <QuoteGeneratorTab />}
          {activeTab === 'service_advisor'  && <ServiceAdvisorTab />}
          {activeTab === 'pickup_delivery'  && <PickupDeliveryTab />}
          {activeTab === 'message_rewriter' && <MessageRewriterTab />}
        </div>
      </div>

      <p className="text-center text-xs text-gray-400">
        Powered by Claude AI · Autohaus Friedrich · Generált szövegek ellenőrzése ajánlott küldés előtt
      </p>
    </div>
  )
}
