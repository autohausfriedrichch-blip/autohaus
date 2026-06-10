'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Zap, Copy, Check, RefreshCw, MessageCircle, Mail, Wrench, TrendingUp } from 'lucide-react'
import type { Profile } from '@/lib/types'

interface Props {
  profile?: Profile | null
  refreshKey?: number
  onRefresh?: () => void
  onNewQuote?: () => void
}

type Mode = 'compose' | 'technician' | 'followup' | 'free'

const MSG_TYPES = [
  { id: 'appointment_confirm', label: 'Időpont visszaigazolás' },
  { id: 'quote_sent', label: 'Árajánlat küldése' },
  { id: 'work_done', label: 'Munka elkészült' },
  { id: 'reminder', label: 'Szerviz emlékeztető' },
  { id: 'followup', label: 'Utókövetés' },
  { id: 'payment_reminder', label: 'Fizetési emlékeztető' },
]

const LANGUAGES = [
  { id: 'hu', label: 'Magyar' },
  { id: 'de', label: 'Deutsch' },
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'English' },
]

async function streamAI(
  mode: Mode,
  context: Record<string, string>,
  onChunk: (text: string) => void
): Promise<void> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, context }),
  })
  if (!res.ok) throw new Error((await res.json()).error || 'API hiba')
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onChunk(decoder.decode(value, { stream: true }))
  }
}

export function AIAssistantPage({ profile }: Props) {
  const [activeTab, setActiveTab] = useState<Mode>('compose')
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const [copied, setCopied] = useState(false)
  const [genError, setGenError] = useState('')

  // Compose form
  const [msgType, setMsgType] = useState('appointment_confirm')
  const [lang, setLang] = useState('hu')
  const [customerName, setCustomerName] = useState('')
  const [vehiclePlate, setVehiclePlate] = useState('')
  const [details, setDetails] = useState('')

  // Technician form
  const [techText, setTechText] = useState('')

  // Followup form
  const [followCustomer, setFollowCustomer] = useState('')
  const [followDate, setFollowDate] = useState('')
  const [followVehicle, setFollowVehicle] = useState('')
  const [followServices, setFollowServices] = useState('')

  // Free form
  const [freePrompt, setFreePrompt] = useState('')

  const { toast } = useToast()

  async function generate() {
    setLoading(true)
    setOutput('')
    setGenError('')
    try {
      let context: Record<string, string> = {}
      if (activeTab === 'compose') {
        context = { messageType: MSG_TYPES.find(m => m.id === msgType)?.label || msgType, language: lang, customerName, vehiclePlate, details }
      } else if (activeTab === 'technician') {
        context = { technical: techText }
      } else if (activeTab === 'followup') {
        context = { customerName: followCustomer, lastVisit: followDate, vehicle: followVehicle, services: followServices }
      } else {
        context = { prompt: freePrompt }
      }
      await streamAI(activeTab, context, chunk => setOutput(prev => prev + chunk))
    } catch (err: any) {
      setGenError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function copyOutput() {
    navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast('Vágólapra másolva')
  }

  const tabs: { id: Mode; label: string; icon: any }[] = [
    { id: 'compose', label: 'Üzenet szerkesztő', icon: Mail },
    { id: 'technician', label: 'Műszaki→Ügyfél', icon: Wrench },
    { id: 'followup', label: 'Utókövetés', icon: TrendingUp },
    { id: 'free', label: 'Szabad prompt', icon: MessageCircle },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C9A84C] to-[#e8c96d] flex items-center justify-center">
          <Zap size={20} className="text-[#0B1E3D]" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-[#1a2942]">AI Asszisztens</h1>
          <p className="text-sm text-[#5a6a80]">Professzionális ügyfélkommunikáció – Claude AI</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-[#f0f2f5] rounded-xl p-1">
        {tabs.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => { setActiveTab(t.id); setOutput(''); setGenError('') }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[12px] font-medium transition-all ${
                activeTab === t.id ? 'bg-white text-[#1a2942] shadow-sm' : 'text-[#5a6a80] hover:text-[#1a2942]'
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input panel */}
        <div className="bg-white rounded-xl border border-[#e8ecf0] p-5">
          <h2 className="text-sm font-semibold text-[#1a2942] mb-4">Adatok megadása</h2>

          {activeTab === 'compose' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Üzenet típusa</label>
                <select value={msgType} onChange={e => setMsgType(e.target.value)}
                  className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm text-[#1a2942] bg-white">
                  {MSG_TYPES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Nyelv</label>
                <div className="flex gap-2 flex-wrap">
                  {LANGUAGES.map(l => (
                    <button key={l.id} onClick={() => setLang(l.id)}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${lang === l.id ? 'bg-[#0B1E3D] text-white border-[#0B1E3D]' : 'border-[#e0e4e8] text-[#5a6a80] hover:border-[#0B1E3D]'}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Ügyfél neve</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="pl. Kovács János"
                  className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Rendszám</label>
                <input value={vehiclePlate} onChange={e => setVehiclePlate(e.target.value)} placeholder="pl. ZH 123 456"
                  className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">További részletek</label>
                <Textarea value={details} onChange={e => setDetails(e.target.value)} placeholder="Összeg, dátum, elvégzett munkák…" className="min-h-[80px] text-sm" />
              </div>
            </div>
          )}

          {activeTab === 'technician' && (
            <div>
              <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Műszaki szöveg</label>
              <Textarea value={techText} onChange={e => setTechText(e.target.value)}
                placeholder="pl. A bal első futómű gömbfeje elvásott, a lengéscsillapítón olajszivárgás észlelhető..."
                className="min-h-[180px] text-sm" />
            </div>
          )}

          {activeTab === 'followup' && (
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Ügyfél neve</label>
                <input value={followCustomer} onChange={e => setFollowCustomer(e.target.value)} placeholder="pl. Nagy Péter"
                  className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Utolsó látogatás</label>
                <input type="date" value={followDate} onChange={e => setFollowDate(e.target.value)}
                  className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Jármű</label>
                <input value={followVehicle} onChange={e => setFollowVehicle(e.target.value)} placeholder="pl. BMW 320d, ZH 456 789"
                  className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Elvégzett munkák</label>
                <Textarea value={followServices} onChange={e => setFollowServices(e.target.value)}
                  placeholder="pl. Olajcsere, fékbetét csere, gumirotáció" className="min-h-[80px] text-sm" />
              </div>
            </div>
          )}

          {activeTab === 'free' && (
            <div>
              <label className="text-[11px] font-medium text-[#5a6a80] uppercase tracking-wide mb-1 block">Szabad kérés</label>
              <Textarea value={freePrompt} onChange={e => setFreePrompt(e.target.value)}
                placeholder="Pl. Írj egy svájci ünnepi köszöntőt az ügyfeleinknek karácsonyra..."
                className="min-h-[180px] text-sm" />
            </div>
          )}

          <Button onClick={generate} disabled={loading} variant="primary" className="w-full mt-4">
            {loading ? (
              <><RefreshCw size={14} className="animate-spin" /> Generálás...</>
            ) : (
              <><Zap size={14} /> Generálás</>
            )}
          </Button>
        </div>

        {/* Output panel */}
        <div className="bg-white rounded-xl border border-[#e8ecf0] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-[#1a2942]">Generált szöveg</h2>
            {output && (
              <button onClick={copyOutput}
                className="flex items-center gap-1.5 text-[11px] text-[#5a6a80] hover:text-[#1a2942] transition-colors">
                {copied ? <><Check size={13} className="text-green-500" /> Másolva</> : <><Copy size={13} /> Másolás</>}
              </button>
            )}
          </div>

          {genError && (
            <div className="text-[12px] text-red-600 bg-red-50 rounded-lg p-3 mb-3">{genError}</div>
          )}

          {output ? (
            <div className="text-[13px] text-[#1a2942] leading-relaxed whitespace-pre-wrap bg-[#f8f9fb] rounded-lg p-4 min-h-[200px]">
              {output}
              {loading && <span className="inline-block w-1.5 h-4 bg-[#C9A84C] animate-pulse ml-0.5 rounded-sm" />}
            </div>
          ) : (
            <div className="text-[12px] text-[#9aabb8] flex flex-col items-center justify-center min-h-[200px] bg-[#f8f9fb] rounded-lg gap-2">
              <Zap size={28} className="opacity-30" />
              <span>Add meg az adatokat, majd nyomj Generálás-t</span>
            </div>
          )}

          {output && !loading && (
            <div className="flex gap-2 mt-3">
              <Button variant="secondary" size="sm" className="flex-1" onClick={() => { setOutput(''); }}>
                Törlés
              </Button>
              <Button variant="gold" size="sm" className="flex-1" onClick={copyOutput}>
                <Copy size={13} /> Másolás & Küldés
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
