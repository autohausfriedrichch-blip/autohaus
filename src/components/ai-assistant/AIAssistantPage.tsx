'use client'
import { useState, useCallback } from 'react'
import {
  Bot, MessageSquare, FileText, Clock, Send, Copy, Check,
  Sparkles, BarChart2, RefreshCw, Zap, AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const TABS = [
  { id: 'compose',    label: 'Üzenet írás',   icon: MessageSquare },
  { id: 'templates',  label: 'Sablonok',       icon: FileText },
  { id: 'followup',   label: 'Utánkövetés',    icon: Clock },
  { id: 'technician', label: 'Technikus AI',   icon: Zap },
  { id: 'stats',      label: 'Statisztika',    icon: BarChart2 },
]

const LANGUAGES = [
  { id: 'de', label: 'Deutsch' },
  { id: 'hu', label: 'Magyar' },
  { id: 'en', label: 'English' },
]

const MESSAGE_TYPES = [
  { id: 'whatsapp_reply',      label: 'WhatsApp válasz' },
  { id: 'email_reply',         label: 'E-mail válasz' },
  { id: 'appointment_confirm', label: 'Időpont visszaigazolás' },
  { id: 'quote_cover',         label: 'Árajánlat kísérő' },
  { id: 'status_update',       label: 'Státuszfrissítés' },
  { id: 'review_request',      label: 'Google Review kérés' },
  { id: 'complaint_reply',     label: 'Reklamáció válasz' },
  { id: 'followup',            label: 'Utánkövetés' },
]

const TEMPLATES = [
  {
    id: 'appointment_confirm', title: 'Időpont visszaigazolás',
    de: `Guten Tag,\n\nwir bestätigen Ihren Servicetermin bei Autohaus Friedrich:\n\n📅 Datum: {datum}\n🕐 Uhrzeit: {uhrzeit}\n📍 Adresse: Autohaus Friedrich, Schweiz\n\nBitte bringen Sie Ihren Fahrzeugschein mit.\n\nMit freundlichen Grüßen\nAutohaus Friedrich Team`,
    hu: `Tisztelt {nev},\n\nMegerősítjük a foglalását az Autohaus Friedrich-nél:\n\n📅 Dátum: {datum}\n🕐 Időpont: {ido}\n📍 Cím: Autohaus Friedrich, Svájc\n\nKérjük, hozza magával a forgalmi engedélyét.\n\nÜdvözlettel,\nAutohaus Friedrich csapata`,
  },
  {
    id: 'car_ready', title: 'Autó elkészült',
    de: `Guten Tag,\n\nIhr Fahrzeug ({kennzeichen}) ist fertig und kann abgeholt werden.\n\n✅ Alle Arbeiten wurden abgeschlossen\n✅ Qualitätskontrolle bestanden\n\nÖffnungszeiten: Mo–Fr 8:00–18:00\n\nMit freundlichen Grüßen\nAutohaus Friedrich`,
    hu: `Tisztelt {nev},\n\nJárműve ({rendszam}) elkészült és átvehető.\n\n✅ Minden munkálat elvégezve\n✅ Minőségellenőrzés elvégezve\n\nNyitvatartás: H–P 8:00–18:00\n\nÜdvözlettel,\nAutohaus Friedrich`,
  },
  {
    id: 'quote_approval', title: 'Árajánlat jóváhagyás',
    de: `Guten Tag,\n\nwir haben die Diagnose Ihres Fahrzeugs abgeschlossen und ein Angebot vorbereitet.\n\nGesamtbetrag: CHF {betrag}\nGeschätzte Dauer: {dauer}\n\nBitte teilen Sie uns mit, ob Sie mit den Arbeiten einverstanden sind.\n\nMit freundlichen Grüßen\nAutohaus Friedrich`,
    hu: `Tisztelt {nev},\n\nElkészítettük az árajánlatot járműve javítására.\n\nVégösszeg: CHF {osszeg}\nBecsült időtartam: {idotartam}\n\nKérjük, jelezze, hogy jóváhagyja-e a munkálatokat.\n\nÜdvözlettel,\nAutohaus Friedrich`,
  },
  {
    id: 'waiting_parts', title: 'Alkatrészre várunk',
    de: `Guten Tag,\n\nwir warten derzeit auf die bestellten Ersatzteile für Ihr Fahrzeug ({kennzeichen}).\n\nVoraussichtliche Lieferung: {lieferung}\n\nMit freundlichen Grüßen\nAutohaus Friedrich`,
    hu: `Tisztelt {nev},\n\nJárművéhez ({rendszam}) rendelt alkatrészekre várunk.\n\nVárható szállítás: {szallitas}\n\nAmint az alkatrészek megérkeztek, azonnal értesítjük.\n\nÜdvözlettel,\nAutohaus Friedrich`,
  },
  {
    id: 'review_request', title: 'Google Review kérés',
    de: `Guten Tag,\n\nwir hoffen, dass Sie mit unserem Service zufrieden sind!\n\nWir würden uns sehr freuen, wenn Sie uns eine Bewertung hinterlassen würden:\n🌟 Google Maps: [Link]\n\nVielen Dank!\nAutohaus Friedrich`,
    hu: `Tisztelt {nev},\n\nReméljük, elégedett volt szolgáltatásunkkal!\n\nNagyon örülnénk, ha értékelne minket:\n🌟 Google Maps: [Link]\n\nKöszönjük!\nAutohaus Friedrich`,
  },
  {
    id: 'complaint_reply', title: 'Reklamáció válasz',
    de: `Guten Tag,\n\nvielen Dank für Ihr Feedback. Es tut uns sehr leid zu hören, dass Sie mit unserem Service nicht zufrieden waren.\n\nWir nehmen Ihre Beschwerde sehr ernst. Bitte kontaktieren Sie uns direkt unter [Telefon].\n\nMit freundlichen Grüßen\nAutohaus Friedrich`,
    hu: `Tisztelt {nev},\n\nKöszönjük visszajelzését. Sajnáljuk, hogy nem volt elégedett.\n\nPanaszát komolyan vesszük. Kérjük, hívjon bennünket: [telefonszám]\n\nÜdvözlettel,\nAutohaus Friedrich`,
  },
]

const FOLLOWUP_ITEMS = [
  { type: 'callback', customer: 'Müller Péter', note: 'Ajánlat 5 napja elküldve, nincs visszajelzés', date: '2026-06-03', priority: 'high' },
  { type: 'review',   customer: 'Schmidt Anna',  note: 'Autó 3 napja elkészült, review kérés nem ment ki', date: '2026-06-05', priority: 'medium' },
  { type: 'service',  customer: 'Kovács László', note: 'Olajcsere esedékes (12 hónap eltelt)', date: '2026-05-15', priority: 'medium' },
  { type: 'tire',     customer: 'Weber Gábor',   note: 'Nyárigumi csere esedékes (tárolt gumik)', date: '2026-04-01', priority: 'high' },
  { type: 'callback', customer: 'Bauer Zsófia',  note: 'Flotta ajánlat kérés — nem válaszolt', date: '2026-06-01', priority: 'high' },
  { type: 'service',  customer: 'Horvát Endre',  note: 'Fék ellenőrzés javasolt (6 hónap)', date: '2026-05-20', priority: 'low' },
]

const TECH_EXAMPLES = [
  'első fék kopott, csere kell',
  'olaj fekete, csere szükséges',
  'gumiprofi kevés, csere ajánlott',
  'akkumulátor feszültsége alacsony',
  'kipufogó lyukas, zaj van',
]

async function streamAI(
  body: object,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok || !res.body) throw new Error(`API hiba: ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onChunk(decoder.decode(value, { stream: true }))
  }
}

export default function AIAssistantPage({ refreshKey, onRefresh }: { refreshKey: number; onRefresh: () => void }) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('compose')

  // Compose state
  const [msgType, setMsgType] = useState('whatsapp_reply')
  const [lang, setLang] = useState('de')
  const [context, setContext] = useState('')
  const [generated, setGenerated] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [genError, setGenError] = useState('')

  // Technician state
  const [techInput, setTechInput] = useState('')
  const [techOutput, setTechOutput] = useState('')
  const [techGenerating, setTechGenerating] = useState(false)
  const [techCopied, setTechCopied] = useState(false)

  // Templates
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  // Stats (from DB)
  const [stats, setStats] = useState({ generated: 0, accepted: 0, edited: 0, sent: 0 })

  const logUsage = useCallback(async (type: string, lang: string, accepted: boolean) => {
    await supabase.from('ai_usage_log').insert({ msg_type: type, lang, accepted }).then(() => {})
  }, [])

  const handleGenerate = async () => {
    if (generating) return
    setGenerating(true)
    setGenerated('')
    setGenError('')
    try {
      let result = ''
      await streamAI(
        { mode: 'compose', lang, msgType, context },
        chunk => { result += chunk; setGenerated(result) }
      )
      setStats(s => ({ ...s, generated: s.generated + 1 }))
    } catch (err: any) {
      setGenError(err.message || 'Ismeretlen hiba')
    } finally {
      setGenerating(false)
    }
  }

  const handleTechTransform = async () => {
    if (!techInput.trim() || techGenerating) return
    setTechGenerating(true)
    setTechOutput('')
    try {
      let result = ''
      await streamAI(
        { mode: 'technician', techInput },
        chunk => { result += chunk; setTechOutput(result) }
      )
    } catch (err: any) {
      setTechOutput(`[Hiba: ${err.message}]`)
    } finally {
      setTechGenerating(false)
    }
  }

  const handleFollowupGenerate = (item: typeof FOLLOWUP_ITEMS[0]) => {
    setMsgType('followup')
    setContext(item.note)
    setActiveTab('compose')
  }

  const handleCopy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text)
    setter(true)
    setTimeout(() => setter(false), 2000)
  }

  const acceptGenerated = () => {
    setStats(s => ({ ...s, accepted: s.accepted + 1, sent: s.sent + 1 }))
    logUsage(msgType, lang, true)
  }

  const priorityColor = (p: string) => p === 'high' ? 'text-red-600 bg-red-50' : p === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-100'
  const priorityLabel = (p: string) => p === 'high' ? 'Sürgős' : p === 'medium' ? 'Közepes' : 'Alacsony'
  const followupIcon = (t: string) => t === 'callback' ? '📞' : t === 'review' ? '⭐' : t === 'tire' ? '🔄' : '🔧'

  const acceptRate = stats.generated > 0 ? Math.round(stats.accepted / stats.generated * 100) : 0

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0B1E3D] to-[#1a3a6b] rounded-xl p-5 text-white flex items-center gap-4">
        <div className="w-12 h-12 bg-[#C9A84C] rounded-xl flex items-center justify-center shrink-0">
          <Bot size={24} className="text-[#0B1E3D]" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold">AI Asszisztens</h1>
          <p className="text-sm text-blue-200 mt-0.5">Claude AI · Valódi generálás · Svájci minőség</p>
        </div>
        <div className="hidden sm:flex gap-5 text-center shrink-0">
          <div>
            <div className="text-2xl font-bold text-[#C9A84C]">{stats.generated}</div>
            <div className="text-xs text-blue-200">Generált</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{stats.sent}</div>
            <div className="text-xs text-blue-200">Elküldve</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-[#0B1E3D] shadow-sm'
                  : 'text-gray-500 hover:text-[#0B1E3D]'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* ── Compose ── */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-[#0B1E3D]">Üzenet beállítások</h2>

            <div>
              <label className="block text-xs font-semibold text-[#5a6a80] uppercase tracking-wide mb-1.5">Üzenet típusa</label>
              <select
                value={msgType}
                onChange={e => setMsgType(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#0B1E3D] focus:outline-none focus:border-[#0B1E3D]"
              >
                {MESSAGE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5a6a80] uppercase tracking-wide mb-1.5">Nyelv</label>
              <div className="flex gap-2">
                {LANGUAGES.map(l => (
                  <button
                    key={l.id}
                    onClick={() => setLang(l.id)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      lang === l.id
                        ? 'bg-[#0B1E3D] text-white border-[#0B1E3D]'
                        : 'border-gray-200 text-gray-500 hover:border-[#0B1E3D]'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5a6a80] uppercase tracking-wide mb-1.5">
                Kontextus / részletek
              </label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="pl. Autó kész, összes munka elvégezve, CHF 420, Müller Péter, BMW 320d..."
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#0B1E3D] resize-none focus:outline-none focus:border-[#0B1E3D]"
              />
              <p className="text-xs text-[#8fa0b5] mt-1">Minél több részletet adsz meg, annál személyesebb lesz az üzenet.</p>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3 bg-[#C9A84C] text-[#0B1E3D] rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#b8943f] transition-colors disabled:opacity-60"
            >
              {generating
                ? <><RefreshCw size={16} className="animate-spin" /> Generálás...</>
                : <><Sparkles size={16} /> AI Generálás (Claude)</>
              }
            </button>

            {genError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle size={15} className="text-red-500 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{genError}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#0B1E3D]">Generált üzenet</h2>
              {generated && (
                <button
                  onClick={() => handleCopy(generated, setCopied)}
                  className="flex items-center gap-1.5 text-xs text-[#5a6a80] hover:text-[#0B1E3D] transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied ? 'Másolva!' : 'Másolás'}
                </button>
              )}
            </div>

            {generating && !generated && (
              <div className="flex flex-col items-center justify-center h-48 text-[#5a6a80] gap-3">
                <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Claude generálja az üzenetet...</p>
              </div>
            )}

            {generated ? (
              <>
                <textarea
                  value={generated}
                  onChange={e => setGenerated(e.target.value)}
                  rows={12}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#0B1E3D] resize-none focus:outline-none focus:border-[#0B1E3D] font-mono"
                />
                <div className="flex gap-2">
                  <button
                    onClick={acceptGenerated}
                    className="flex-1 py-2.5 bg-[#0B1E3D] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#142a50]"
                  >
                    <Send size={14} /> Jóváhagyás & Küldés
                  </button>
                  <button
                    onClick={handleGenerate}
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 hover:border-[#0B1E3D] hover:text-[#0B1E3D]"
                    title="Újragenerálás"
                  >
                    <RefreshCw size={14} />
                  </button>
                </div>
                <p className="text-xs text-[#5a6a80] text-center">Az üzenet elküldés előtt szerkeszthető.</p>
              </>
            ) : !generating ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#5a6a80]">
                <Bot size={40} className="text-gray-200 mb-3" />
                <p className="text-sm">Állítsd be a beállításokat és kattints a generálásra</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Templates ── */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {TEMPLATES.map(t => (
            <div key={t.id} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#0B1E3D]">{t.title}</h3>
                <button
                  onClick={() => setSelectedTemplate(selectedTemplate === t.id ? null : t.id)}
                  className="text-xs text-[#C9A84C] font-medium hover:underline"
                >
                  {selectedTemplate === t.id ? 'Bezárás' : 'Megtekintés'}
                </button>
              </div>
              {selectedTemplate === t.id ? (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-[#5a6a80] uppercase mb-1">Deutsch</div>
                    <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap font-sans">{t.de}</pre>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#5a6a80] uppercase mb-1">Magyar</div>
                    <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap font-sans">{t.hu}</pre>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setGenerated(t.de); setActiveTab('compose') }}
                      className="flex-1 py-2 bg-[#0B1E3D] text-white rounded-lg text-xs font-semibold"
                    >
                      DE szerkesztés
                    </button>
                    <button
                      onClick={() => { setGenerated(t.hu); setActiveTab('compose') }}
                      className="flex-1 py-2 bg-[#C9A84C] text-[#0B1E3D] rounded-lg text-xs font-semibold"
                    >
                      HU szerkesztés
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#5a6a80]">Elérhető: Deutsch • Magyar</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Followup ── */}
      {activeTab === 'followup' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-[#0B1E3D]">AI Utánkövetési javaslatok</h2>
            <p className="text-xs text-[#5a6a80] mt-1">Ügyfelek, akikkel érdemes felvenni a kapcsolatot — kattints az AI üzenet generáláshoz</p>
          </div>
          <div className="divide-y divide-gray-100">
            {FOLLOWUP_ITEMS.map((item, i) => (
              <div key={i} className="p-4 flex items-start gap-4 hover:bg-gray-50">
                <div className="text-2xl">{followupIcon(item.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-[#0B1E3D]">{item.customer}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(item.priority)}`}>
                      {priorityLabel(item.priority)}
                    </span>
                  </div>
                  <p className="text-sm text-[#5a6a80]">{item.note}</p>
                  <p className="text-xs text-gray-400 mt-1">{item.date}</p>
                </div>
                <button
                  onClick={() => handleFollowupGenerate(item)}
                  className="px-3 py-1.5 bg-[#C9A84C] text-[#0B1E3D] rounded-lg text-xs font-semibold whitespace-nowrap"
                >
                  AI üzenet
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Technician ── */}
      {activeTab === 'technician' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="font-semibold text-[#0B1E3D] mb-1">Technikus → Ügyfélbarát szöveg</h2>
              <p className="text-xs text-[#5a6a80]">Írd be a technikai problémát, a Claude AI átalakítja érthetővé</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#5a6a80] uppercase tracking-wide mb-1.5">Technikus megjegyzés</label>
              <textarea
                value={techInput}
                onChange={e => setTechInput(e.target.value)}
                placeholder="pl. első fék kopott, csere kell"
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#0B1E3D] resize-none focus:outline-none focus:border-[#0B1E3D]"
              />
            </div>

            <button
              onClick={handleTechTransform}
              disabled={techGenerating || !techInput.trim()}
              className="w-full py-3 bg-[#C9A84C] text-[#0B1E3D] rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#b8943f] disabled:opacity-60"
            >
              {techGenerating
                ? <><RefreshCw size={16} className="animate-spin" /> Átalakítás...</>
                : <><Zap size={16} /> Átalakítás ügyfélbarát szöveggé</>
              }
            </button>

            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
              <p className="text-xs font-semibold text-[#5a6a80] uppercase mb-2">Gyors példák</p>
              <div className="flex flex-wrap gap-2">
                {TECH_EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setTechInput(ex)}
                    className="text-xs text-[#C9A84C] bg-white border border-[rgba(201,168,76,0.3)] rounded-lg px-2 py-1 hover:border-[#C9A84C] transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-[#0B1E3D]">Ügyfélbarát szöveg</h2>

            {techGenerating && !techOutput && (
              <div className="flex flex-col items-center justify-center h-48 text-[#5a6a80] gap-3">
                <div className="w-8 h-8 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Claude átalakítja a szöveget...</p>
              </div>
            )}

            {techOutput ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 min-h-[120px]">
                  <p className="text-sm text-[#0B1E3D] leading-relaxed whitespace-pre-wrap">{techOutput}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(techOutput, setTechCopied)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 flex items-center justify-center gap-2 hover:border-[#0B1E3D]"
                  >
                    {techCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    {techCopied ? 'Másolva!' : 'Másolás'}
                  </button>
                  <button
                    onClick={() => { setGenerated(techOutput); setActiveTab('compose') }}
                    className="flex-1 py-2.5 bg-[#0B1E3D] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Send size={14} /> Üzenetbe
                  </button>
                </div>
              </>
            ) : !techGenerating ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#5a6a80]">
                <Zap size={40} className="text-gray-200 mb-3" />
                <p className="text-sm">Írd be a technikus megjegyzést és kattints az átalakításra</p>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Generált üzenetek', value: stats.generated, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Elfogadott',        value: stats.accepted,  color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Szerkesztett',      value: stats.edited,    color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Elküldött AI üzenet', value: stats.sent,   color: 'text-[#0B1E3D]', bg: 'bg-[#F4F5F7]' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm text-center">
              <div className={`text-3xl font-bold ${s.color} mb-1`}>{s.value}</div>
              <div className="text-xs text-[#5a6a80]">{s.label}</div>
            </div>
          ))}
          <div className="col-span-2 md:col-span-4 bg-white rounded-xl p-5 shadow-sm">
            <h3 className="font-semibold text-[#0B1E3D] mb-3">Elfogadási arány</h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-100 rounded-full h-3">
                <div className="bg-[#C9A84C] h-3 rounded-full transition-all" style={{ width: `${acceptRate}%` }} />
              </div>
              <span className="font-bold text-[#0B1E3D]">{acceptRate}%</span>
            </div>
            <p className="text-xs text-[#5a6a80] mt-2">
              {stats.generated === 0
                ? 'Még nem volt generálás ebben a munkamenetben.'
                : `Az AI által generált üzenetek ${acceptRate}%-át elfogadták szerkesztés nélkül.`
              }
            </p>
          </div>
          <div className="col-span-2 md:col-span-4 bg-gradient-to-r from-[#0B1E3D] to-[#1a3a6b] rounded-xl p-5 text-white flex items-center gap-4">
            <div className="w-10 h-10 bg-[#C9A84C] rounded-lg flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-[#0B1E3D]" />
            </div>
            <div>
              <div className="font-semibold text-sm">Claude AI · claude-haiku-4-5</div>
              <div className="text-xs text-blue-200 mt-0.5">Valódi AI generálás · Streaming · Többnyelvű</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
