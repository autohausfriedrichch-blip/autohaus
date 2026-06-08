'use client'
import { useState } from 'react'
import {
  Bot, MessageSquare, FileText, Clock, Send, Copy, Check,
  ChevronDown, Sparkles, Languages, BarChart2, RefreshCw,
  User, Car, ClipboardList, Star, AlertCircle, Zap
} from 'lucide-react'

const TABS = [
  { id: 'compose', label: 'Üzenet írás', icon: MessageSquare },
  { id: 'templates', label: 'Sablonok', icon: FileText },
  { id: 'followup', label: 'Utánkövetés', icon: Clock },
  { id: 'technician', label: 'Technikus AI', icon: Zap },
  { id: 'stats', label: 'Statisztika', icon: BarChart2 },
]

const LANGUAGES = [
  { id: 'de', label: 'Deutsch' },
  { id: 'hu', label: 'Magyar' },
  { id: 'en', label: 'English' },
]

const MESSAGE_TYPES = [
  { id: 'whatsapp_reply', label: 'WhatsApp válasz' },
  { id: 'email_reply', label: 'E-mail válasz' },
  { id: 'appointment_confirm', label: 'Időpont visszaigazolás' },
  { id: 'quote_cover', label: 'Árajánlat kísérő' },
  { id: 'status_update', label: 'Státuszfrissítés' },
  { id: 'review_request', label: 'Google Review kérés' },
  { id: 'complaint_reply', label: 'Reklamáció válasz' },
  { id: 'followup', label: 'Utánkövetés' },
]

const TEMPLATES = [
  {
    id: 'appointment_confirm',
    title: 'Időpont visszaigazolás',
    de: `Guten Tag,\n\nwir bestätigen Ihren Servicetermin bei Autohaus Friedrich:\n\n📅 Datum: {datum}\n🕐 Uhrzeit: {uhrzeit}\n📍 Adresse: Autohaus Friedrich, Schweiz\n\nBitte bringen Sie Ihren Fahrzeugschein mit.\n\nBei Fragen stehen wir gerne zur Verfügung.\n\nMit freundlichen Grüßen\nAutohaus Friedrich Team`,
    hu: `Tisztelt {nev},\n\nMegerősítjük a foglalását az Autohaus Friedrich-nél:\n\n📅 Dátum: {datum}\n🕐 Időpont: {ido}\n📍 Cím: Autohaus Friedrich, Svájc\n\nKérjük, hozza magával a forgalmi engedélyét.\n\nKérdés esetén állunk rendelkezésére.\n\nÜdvözlettel,\nAutohaus Friedrich csapata`,
  },
  {
    id: 'car_arrived',
    title: 'Autó megérkezett',
    de: `Guten Tag,\n\nIhr Fahrzeug ({kennzeichen}) ist bei uns eingetroffen und wird nun bearbeitet.\n\nWir melden uns, sobald wir mehr Informationen haben.\n\nMit freundlichen Grüßen\nAutohaus Friedrich`,
    hu: `Tisztelt {nev},\n\nJárműve ({rendszam}) megérkezett hozzánk, és hamarosan megkezdjük a munkálatokat.\n\nAmint több információ áll rendelkezésre, felvesszük Önnel a kapcsolatot.\n\nÜdvözlettel,\nAutohaus Friedrich`,
  },
  {
    id: 'diagnosis_ready',
    title: 'Diagnosztika kész',
    de: `Guten Tag,\n\ndie Diagnose Ihres Fahrzeugs ({kennzeichen}) ist abgeschlossen.\n\nErgebnis: {ergebnis}\n\nWir haben ein Angebot vorbereitet und werden uns in Kürze bei Ihnen melden.\n\nMit freundlichen Grüßen\nAutohaus Friedrich`,
    hu: `Tisztelt {nev},\n\nJárműve ({rendszam}) diagnosztikája elkészült.\n\nEredmény: {eredmeny}\n\nÁrajánlatot készítettünk, hamarosan felvesszük Önnel a kapcsolatot.\n\nÜdvözlettel,\nAutohaus Friedrich`,
  },
  {
    id: 'quote_approval',
    title: 'Árajánlat jóváhagyás kérés',
    de: `Guten Tag,\n\nwir haben die Diagnose Ihres Fahrzeugs abgeschlossen und ein Angebot vorbereitet.\n\nGesamtbetrag: CHF {betrag}\nGeschätzte Dauer: {dauer}\n\nBitte teilen Sie uns mit, ob Sie mit den Arbeiten einverstanden sind.\n\nMit freundlichen Grüßen\nAutohaus Friedrich`,
    hu: `Tisztelt {nev},\n\nElkészítettük az árajánlatot járműve javítására.\n\nVégösszeg: CHF {osszeg}\nBecsült időtartam: {idotartam}\n\nKérjük, jelezze, hogy jóváhagyja-e a munkálatokat.\n\nÜdvözlettel,\nAutohaus Friedrich`,
  },
  {
    id: 'waiting_parts',
    title: 'Alkatrészre várunk',
    de: `Guten Tag,\n\nwir warten derzeit auf die bestellten Ersatzteile für Ihr Fahrzeug ({kennzeichen}).\n\nVoraussichtliche Lieferung: {lieferung}\n\nWir informieren Sie sofort, sobald die Teile eingetroffen sind.\n\nMit freundlichen Grüßen\nAutohaus Friedrich`,
    hu: `Tisztelt {nev},\n\nJárművéhez ({rendszam}) rendelt alkatrészekre várunk.\n\nVárható szállítás: {szallitas}\n\nAmint az alkatrészek megérkeztek, azonnal értesítjük.\n\nÜdvözlettel,\nAutohaus Friedrich`,
  },
  {
    id: 'car_ready',
    title: 'Autó elkészült',
    de: `Guten Tag,\n\nIhr Fahrzeug ({kennzeichen}) ist fertig und kann abgeholt werden.\n\n✅ Alle Arbeiten wurden abgeschlossen\n✅ Qualitätskontrolle bestanden\n\nÖffnungszeiten: Mo–Fr 8:00–18:00\n\nMit freundlichen Grüßen\nAutohaus Friedrich`,
    hu: `Tisztelt {nev},\n\nJárműve ({rendszam}) elkészült és átvehető.\n\n✅ Minden munkálat elvégezve\n✅ Minőségellenőrzés elvégezve\n\nNyitvatartás: H–P 8:00–18:00\n\nÜdvözlettel,\nAutohaus Friedrich`,
  },
  {
    id: 'review_request',
    title: 'Google Review kérés',
    de: `Guten Tag,\n\nwir hoffen, dass Sie mit unserem Service zufrieden sind!\n\nWir würden uns sehr freuen, wenn Sie uns eine Bewertung hinterlassen würden:\n🌟 Google Maps: [Link]\n\nIhre Meinung ist uns sehr wichtig.\n\nVielen Dank und bis zum nächsten Mal!\nAutohaus Friedrich`,
    hu: `Tisztelt {nev},\n\nReméljük, elégedett volt szolgáltatásunkkal!\n\nNagyon örülnénk, ha értékelne minket:\n🌟 Google Maps: [Link]\n\nVéleménye nagyon fontos számunkra.\n\nKöszönjük és viszontlátásra!\nAutohaus Friedrich`,
  },
  {
    id: 'complaint_reply',
    title: 'Reklamáció válasz',
    de: `Guten Tag,\n\nvielen Dank für Ihr Feedback. Es tut uns sehr leid zu hören, dass Sie mit unserem Service nicht zufrieden waren.\n\nWir nehmen Ihre Beschwerde sehr ernst und möchten die Situation umgehend klären.\n\nBitte kontaktieren Sie uns direkt unter [Telefon], damit wir gemeinsam eine Lösung finden können.\n\nMit freundlichen Grüßen\nAutohaus Friedrich`,
    hu: `Tisztelt {nev},\n\nKöszönjük visszajelzését. Sajnáljuk, hogy nem volt elégedett szolgáltatásunkkal.\n\nPanaszát komolyan vesszük, és mielőbb szeretnénk rendezni a helyzetet.\n\nKérjük, hívjon bennünket közvetlenül a [telefonszám] számon, hogy közösen megtaláljuk a megoldást.\n\nÜdvözlettel,\nAutohaus Friedrich`,
  },
]

const FOLLOWUP_ITEMS = [
  { type: 'callback', customer: 'Müller Péter', note: 'Ajánlat 5 napja elküldve, nincs visszajelzés', date: '2026-06-03', priority: 'high' },
  { type: 'review', customer: 'Schmidt Anna', note: 'Autó 3 napja elkészült, review kérés nem ment ki', date: '2026-06-05', priority: 'medium' },
  { type: 'service', customer: 'Kovács László', note: 'Olajcsere esedékes (12 hónap eltelt)', date: '2026-05-15', priority: 'medium' },
  { type: 'tire', customer: 'Weber Gábor', note: 'Nyárigumi csere esedékes (tárolt gumik)',  date: '2026-04-01', priority: 'high' },
  { type: 'callback', customer: 'Bauer Zsófia', note: 'Flotta ajánlat kérés — nem válaszolt', date: '2026-06-01', priority: 'high' },
  { type: 'service', customer: 'Horvát Endre', note: 'Fék ellenőrzés javasolt (6 hónap)', date: '2026-05-20', priority: 'low' },
]

const TECH_TRANSFORMS = [
  { input: 'első fék kopott, csere kell', output: 'A jármű első fékbetétei elérték a kopáshatárt. A biztonságos közlekedés érdekében fékbetét-cserét javaslunk.' },
  { input: 'olaj fekete, csere szükséges', output: 'A motorolaj sötét elszíneződése és viszkozitásvesztése miatt olajcserét javaslunk a motor védelme érdekében.' },
  { input: 'gumiprofi kevés, csere ajánlott', output: 'A gumik profilmélysége elérte a minimális határértéket. Biztonságos közlekedés érdekében gumicsere szükséges.' },
]

function generateMessage(type: string, lang: string, context: string): string {
  const templates: Record<string, Record<string, string>> = {
    whatsapp_reply: {
      de: `Guten Tag!\n\nVielen Dank für Ihre Nachricht. ${context ? `Bezüglich: "${context}" –` : ''} Wir melden uns so schnell wie möglich bei Ihnen.\n\nMit freundlichen Grüßen\nAutohaus Friedrich 🔧`,
      hu: `Jó napot!\n\nKöszönjük üzenetét. ${context ? `„${context}" – ügyében` : ''} Mielőbb felvesszük Önnel a kapcsolatot.\n\nÜdvözlettel,\nAutohaus Friedrich 🔧`,
      en: `Hello!\n\nThank you for your message. ${context ? `Regarding: "${context}" –` : ''} We will get back to you as soon as possible.\n\nBest regards,\nAutohaus Friedrich 🔧`,
    },
    review_request: {
      de: `Guten Tag!\n\nWir hoffen, Sie waren mit unserem Service zufrieden! ⭐\n\nWir würden uns sehr über eine kurze Google-Bewertung freuen:\n👉 [Google Maps Link]\n\nVielen Dank!\nAutohaus Friedrich`,
      hu: `Jó napot!\n\nReméljük, elégedett volt szolgáltatásunkkal! ⭐\n\nNagyon örülnénk egy rövid Google értékelésnek:\n👉 [Google Maps Link]\n\nKöszönjük!\nAutohaus Friedrich`,
      en: `Hello!\n\nWe hope you were satisfied with our service! ⭐\n\nWe'd love a quick Google review:\n👉 [Google Maps Link]\n\nThank you!\nAutohaus Friedrich`,
    },
    status_update: {
      de: `Guten Tag!\n\nKurzes Update zu Ihrem Fahrzeug:\n\n${context || 'Die Arbeiten sind im Gange und verlaufen planmäßig.'}\n\nBei Fragen stehen wir gerne zur Verfügung.\n\nMit freundlichen Grüßen\nAutohaus Friedrich`,
      hu: `Jó napot!\n\nRövid frissítés járművéről:\n\n${context || 'A munkálatok folyamatban vannak és tervszerűen haladnak.'}\n\nKérdés esetén állunk rendelkezésére.\n\nÜdvözlettel,\nAutohaus Friedrich`,
      en: `Hello!\n\nQuick update on your vehicle:\n\n${context || 'Work is in progress and on schedule.'}\n\nFeel free to reach out with any questions.\n\nBest regards,\nAutohaus Friedrich`,
    },
  }
  const t = templates[type]?.[lang]
  if (t) return t
  return `[AI üzenet – ${type} – ${lang}]\n\n${context || 'Kérjük adjon meg kontextust a generáláshoz.'}\n\nAutohaus Friedrich`
}

export default function AIAssistantPage({ refreshKey, onRefresh }: { refreshKey: number, onRefresh: () => void }) {
  const [activeTab, setActiveTab] = useState('compose')
  const [msgType, setMsgType] = useState('whatsapp_reply')
  const [lang, setLang] = useState('de')
  const [context, setContext] = useState('')
  const [generated, setGenerated] = useState('')
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [techInput, setTechInput] = useState('')
  const [techOutput, setTechOutput] = useState('')
  const [techGenerating, setTechGenerating] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [stats] = useState({ generated: 47, accepted: 38, edited: 6, sent: 41 })

  const handleGenerate = async () => {
    setGenerating(true)
    setGenerated('')
    await new Promise(r => setTimeout(r, 900))
    setGenerated(generateMessage(msgType, lang, context))
    setGenerating(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generated)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleTechTransform = async () => {
    setTechGenerating(true)
    setTechOutput('')
    await new Promise(r => setTimeout(r, 800))
    const match = TECH_TRANSFORMS.find(t =>
      techInput.toLowerCase().includes(t.input.split(' ')[0]) ||
      techInput.toLowerCase().includes(t.input.split(' ')[1])
    )
    if (match) {
      setTechOutput(match.output)
    } else {
      setTechOutput(`Az Ön által megadott technikai megjegyzés alapján: „${techInput}" – A jármű vizsgálata során megállapítást nyert, hogy a leírt komponens figyelmet igényel. A biztonságos és megbízható üzemeltetés érdekében a szükséges beavatkozást javasoljuk.`)
    }
    setTechGenerating(false)
  }

  const priorityColor = (p: string) => p === 'high' ? 'text-red-600 bg-red-50' : p === 'medium' ? 'text-amber-600 bg-amber-50' : 'text-gray-500 bg-gray-100'
  const priorityLabel = (p: string) => p === 'high' ? 'Sürgős' : p === 'medium' ? 'Közepes' : 'Alacsony'
  const followupIcon = (t: string) => t === 'callback' ? '📞' : t === 'review' ? '⭐' : t === 'tire' ? '🔄' : '🔧'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0B1E3D] to-[#1a3a6b] rounded-xl p-5 text-white flex items-center gap-4">
        <div className="w-12 h-12 bg-[#C9A84C] rounded-xl flex items-center justify-center">
          <Bot size={24} className="text-[#0B1E3D]" />
        </div>
        <div>
          <h1 className="text-xl font-bold">AI Asszisztens</h1>
          <p className="text-sm text-blue-200 mt-0.5">Prémium ügyfélkommunikáció – gyorsan, egységesen, svájci minőségben</p>
        </div>
        <div className="ml-auto flex gap-4 text-center hidden sm:flex">
          <div><div className="text-2xl font-bold text-[#C9A84C]">{stats.generated}</div><div className="text-xs text-blue-200">Generált</div></div>
          <div><div className="text-2xl font-bold text-green-400">{stats.sent}</div><div className="text-xs text-blue-200">Elküldve</div></div>
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

      {/* Compose tab */}
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
              <label className="block text-xs font-semibold text-[#5a6a80] uppercase tracking-wide mb-1.5">Kontextus / Megjegyzés</label>
              <textarea
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="pl. Autó kész, összes munka elvégezve, CHF 420..."
                rows={4}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#0B1E3D] resize-none focus:outline-none focus:border-[#0B1E3D]"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full py-3 bg-[#C9A84C] text-[#0B1E3D] rounded-lg font-semibold flex items-center justify-center gap-2 hover:bg-[#b8943f] transition-colors disabled:opacity-60"
            >
              {generating ? <RefreshCw size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {generating ? 'Generálás...' : 'AI Generálás'}
            </button>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#0B1E3D]">Generált üzenet</h2>
              {generated && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-[#5a6a80] hover:text-[#0B1E3D] transition-colors"
                >
                  {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                  {copied ? 'Másolva!' : 'Másolás'}
                </button>
              )}
            </div>

            {generated ? (
              <>
                <textarea
                  value={generated}
                  onChange={e => setGenerated(e.target.value)}
                  rows={12}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-[#0B1E3D] resize-none focus:outline-none focus:border-[#0B1E3D] font-mono"
                />
                <div className="flex gap-2">
                  <button className="flex-1 py-2.5 bg-[#0B1E3D] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 hover:bg-[#142a50]">
                    <Send size={14} /> Jóváhagyás & Küldés
                  </button>
                  <button onClick={handleGenerate} className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-500 hover:border-[#0B1E3D] hover:text-[#0B1E3D]">
                    <RefreshCw size={14} />
                  </button>
                </div>
                <p className="text-xs text-[#5a6a80] text-center">Az üzenet elküldés előtt szerkeszthető. Küldés után naplózódik a kommunikációs előzményekbe.</p>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-[#5a6a80]">
                <Bot size={40} className="text-gray-200 mb-3" />
                <p className="text-sm">Állítsd be az üzenet típusát és kattints a generálásra</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Templates tab */}
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
              {selectedTemplate === t.id && (
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
              )}
              {selectedTemplate !== t.id && (
                <p className="text-xs text-[#5a6a80]">Elérhető: Deutsch • Magyar</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Followup tab */}
      {activeTab === 'followup' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-[#0B1E3D]">AI Utánkövetési javaslatok</h2>
            <p className="text-xs text-[#5a6a80] mt-1">Az AI azonosította az alábbi ügyfeleket, akikkel érdemes felvenni a kapcsolatot</p>
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
                  onClick={() => { setMsgType('whatsapp_reply'); setContext(item.note); setActiveTab('compose') }}
                  className="px-3 py-1.5 bg-[#C9A84C] text-[#0B1E3D] rounded-lg text-xs font-semibold whitespace-nowrap"
                >
                  Üzenet írás
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technician tab */}
      {activeTab === 'technician' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            <div>
              <h2 className="font-semibold text-[#0B1E3D] mb-1">Technikus → Ügyfélbarát szöveg</h2>
              <p className="text-xs text-[#5a6a80]">Karl írja be röviden a technikai problémát, az AI átalakítja ügyfélbarát szöveggé</p>
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
              {techGenerating ? <RefreshCw size={16} className="animate-spin" /> : <Zap size={16} />}
              {techGenerating ? 'Átalakítás...' : 'Átalakítás ügyfélbarát szöveggé'}
            </button>

            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
              <p className="text-xs font-semibold text-[#5a6a80] uppercase mb-2">Példák</p>
              {TECH_TRANSFORMS.map((ex, i) => (
                <div key={i} className="mb-2">
                  <button
                    onClick={() => setTechInput(ex.input)}
                    className="text-xs text-[#C9A84C] hover:underline text-left"
                  >
                    „{ex.input}"
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-[#0B1E3D]">Ügyfélbarát szöveg</h2>
            {techOutput ? (
              <>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm text-[#0B1E3D] leading-relaxed">{techOutput}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(techOutput); }}
                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 flex items-center justify-center gap-2 hover:border-[#0B1E3D]"
                  >
                    <Copy size={14} /> Másolás
                  </button>
                  <button
                    onClick={() => { setGenerated(techOutput); setActiveTab('compose') }}
                    className="flex-1 py-2.5 bg-[#0B1E3D] text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                  >
                    <Send size={14} /> Üzenetbe
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-[#5a6a80]">
                <Zap size={40} className="text-gray-200 mb-3" />
                <p className="text-sm">Írd be a technikus megjegyzést és kattints az átalakításra</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats tab */}
      {activeTab === 'stats' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Generált üzenetek', value: stats.generated, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Elfogadott', value: stats.accepted, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Szerkesztett', value: stats.edited, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Elküldött AI üzenet', value: stats.sent, color: 'text-[#0B1E3D]', bg: 'bg-[#F4F5F7]' },
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
                <div className="bg-[#C9A84C] h-3 rounded-full" style={{ width: `${Math.round(stats.accepted/stats.generated*100)}%` }} />
              </div>
              <span className="font-bold text-[#0B1E3D]">{Math.round(stats.accepted/stats.generated*100)}%</span>
            </div>
            <p className="text-xs text-[#5a6a80] mt-2">Az AI által generált üzenetek {Math.round(stats.accepted/stats.generated*100)}%-át elfogadták szerkesztés nélkül</p>
          </div>
        </div>
      )}
    </div>
  )
}
