'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Megaphone, LayoutDashboard, BookOpen, Users, Star, Gift,
  Wand2, CalendarDays, BarChart2, Play, Copy, CheckCircle,
  Send, Eye, MessageCircle, Mail, Share2,
  Globe, ChevronRight, Loader2, X, Zap, Target, TrendingUp,
  Plus, Phone
} from 'lucide-react'
import type { Profile } from '@/lib/types'

interface Props { profile?: Profile | null; refreshKey?: number; onRefresh?: () => void }

interface Template {
  id: string; name: string; category: string; icon: string
  target_segment: string; trigger_type: string; trigger_days?: number
  whatsapp_text?: string; email_subject?: string; email_body?: string
  fb_post?: string; ig_post?: string; google_post?: string; sort_order: number
}

interface Campaign {
  id: string; name: string; status: string; channel: string
  template_id?: string; custom_message?: string; scheduled_at?: string
  sent_at?: string; total_recipients: number; sent_count: number
  opened_count: number; replied_count: number; booked_count: number
  created_at: string
}

interface Customer { id: string; first_name: string; last_name: string; phone?: string; email?: string }

const TABS = [
  { id: 'dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'campaigns',  label: 'Kampányok',        icon: Megaphone },
  { id: 'templates',  label: 'Sablon könyvtár',  icon: BookOpen },
  { id: 'segments',   label: 'Szegmensek',       icon: Users },
  { id: 'review',     label: 'Review Központ',   icon: Star },
  { id: 'referral',   label: 'Referral',         icon: Gift },
  { id: 'ai',         label: 'AI Asszisztens',   icon: Wand2 },
  { id: 'calendar',   label: 'Naptár',           icon: CalendarDays },
  { id: 'reports',    label: 'Riportok',         icon: BarChart2 },
]

const CAT_COLORS: Record<string, string> = {
  seasonal: 'bg-blue-100 text-blue-700',
  maintenance: 'bg-orange-100 text-orange-700',
  legal: 'bg-purple-100 text-purple-700',
  safety: 'bg-red-100 text-red-700',
  premium: 'bg-[#C9A84C]/10 text-[#a07d35]',
  mobile: 'bg-teal-100 text-teal-700',
  fleet: 'bg-indigo-100 text-indigo-700',
  loyalty: 'bg-pink-100 text-pink-700',
  retention: 'bg-green-100 text-green-700',
  review: 'bg-yellow-100 text-yellow-700',
  referral: 'bg-emerald-100 text-emerald-700',
  general: 'bg-gray-100 text-gray-600',
}

const CAT_LABELS: Record<string, string> = {
  seasonal: 'Szezonális', maintenance: 'Karbantartás', legal: 'Jogi', safety: 'Biztonság',
  premium: 'Prémium', mobile: 'Mobil szerviz', fleet: 'Fleet', loyalty: 'Hűséges',
  retention: 'Visszahozó', review: 'Review', referral: 'Ajánlás', general: 'Általános',
}

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  whatsapp: <Phone size={12} className="text-green-600" />,
  email:    <Mail size={12} className="text-blue-600" />,
  facebook: <Share2 size={12} className="text-[#1877F2]" />,
  instagram:<Share2 size={12} className="text-[#E1306C]" />,
  google:   <Globe size={12} className="text-[#EA4335]" />,
}

const MONTH_CAMPAIGNS: { month: string; templates: string[] }[] = [
  { month: 'Január',    templates: ['Akkumulátor Ellenőrzés', 'Téli Gumicsere Kampány'] },
  { month: 'Március',   templates: ['Nyári Gumicsere Kampány', 'Klímaszerviz Kampány'] },
  { month: 'Április',   templates: ['Klímaszerviz Kampány', 'Detailing Kampány'] },
  { month: 'Június',    templates: ['Klímaszerviz Kampány', 'Mobil Szerviz Kampány'] },
  { month: 'Szeptember',templates: ['Téli Gumicsere Kampány', 'Akkumulátor Ellenőrzés'] },
  { month: 'Október',   templates: ['Fékellenőrzés Kampány', 'MFK Emlékeztető'] },
  { month: 'November',  templates: ['Téli Gumicsere Kampány', 'Akkumulátor Ellenőrzés', 'Téli Gumicsere Kampány'] },
]

// ─── Launch Modal ─────────────────────────────────────────────────────────────

function LaunchModal({ template, customers, onClose, onLaunched }: {
  template: Template; customers: Customer[]; onClose: () => void; onLaunched: () => void
}) {
  const supabase = createClient()
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp')
  const [message, setMessage] = useState(template.whatsapp_text || '')
  const [scheduledAt, setScheduledAt] = useState('')
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>(customers.slice(0, 10).map(c => c.id))
  const [launching, setLaunching] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'message' | 'recipients'>('message')
  const [aiLoading, setAiLoading] = useState(false)

  const filtered = customers.filter(c => {
    const q = search.toLowerCase()
    return !q || `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) || c.phone?.includes(q)
  })

  const toggleCustomer = (id: string) =>
    setSelectedCustomers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const generateAI = async () => {
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'compose',
          details: `Kampány: ${template.name}. Csatorna: ${channel}. Rövid, barátságos svájci autószerviz üzenet.`,
          language: 'de',
        }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let text = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        text += decoder.decode(value)
      }
      setMessage(text)
    } catch {}
    setAiLoading(false)
  }

  const launch = async () => {
    if (selectedCustomers.length === 0) return
    setLaunching(true)
    const { data: camp } = await supabase.from('marketing_campaigns').insert({
      template_id: template.id,
      name: template.name,
      status: scheduledAt ? 'scheduled' : 'sent',
      channel,
      target_segment: template.target_segment,
      custom_message: message,
      scheduled_at: scheduledAt || null,
      sent_at: scheduledAt ? null : new Date().toISOString(),
      total_recipients: selectedCustomers.length,
      sent_count: selectedCustomers.length,
    }).select().single()

    if (camp) {
      await supabase.from('marketing_sends').insert(
        selectedCustomers.map(cid => ({
          campaign_id: camp.id,
          customer_id: cid,
          channel,
          status: 'sent',
          sent_at: new Date().toISOString(),
        }))
      )
    }
    setLaunching(false)
    onLaunched()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e0e4e8]">
          <div className="flex items-center gap-2">
            <span className="text-xl">{template.icon}</span>
            <div>
              <p className="font-semibold text-[#0B1E3D] text-[13px]">{template.name}</p>
              <p className="text-[11px] text-[#5a6a80]">{selectedCustomers.length} ügyfél kiválasztva</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100"><X size={15} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#e0e4e8]">
          {(['message', 'recipients'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-2.5 text-[12px] font-medium transition-colors ${
                activeTab === t ? 'border-b-2 border-[#C9A84C] text-[#0B1E3D]' : 'text-[#5a6a80]'
              }`}>
              {t === 'message' ? '✉️ Üzenet' : `👥 Ügyfelek (${selectedCustomers.length})`}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'message' ? (
            <div className="space-y-3">
              {/* Channel */}
              <div>
                <label className="text-[11px] text-[#5a6a80] mb-1 block">Csatorna</label>
                <div className="flex gap-2">
                  {(['whatsapp', 'email'] as const).map(ch => (
                    <button key={ch} onClick={() => { setChannel(ch); setMessage(ch === 'whatsapp' ? (template.whatsapp_text || '') : (template.email_body || '')) }}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[12px] transition-colors ${
                        channel === ch ? 'border-[#C9A84C] bg-[#C9A84C]/5 text-[#0B1E3D]' : 'border-[#e0e4e8] text-[#5a6a80]'
                      }`}>
                      {CHANNEL_ICONS[ch]}
                      {ch === 'whatsapp' ? 'WhatsApp' : 'Email'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-[#5a6a80]">Üzenet szövege</label>
                  <button onClick={generateAI} disabled={aiLoading}
                    className="flex items-center gap-1 text-[11px] text-[#C9A84C] hover:text-[#a07d35]">
                    {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
                    AI újraírás
                  </button>
                </div>
                <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5}
                  className="w-full border border-[#e0e4e8] rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#C9A84C] resize-none" />
                <p className="text-[10px] text-[#5a6a80] mt-1">Változók: {'{{customer_name}}'} {'{{plate}}'}</p>
              </div>

              {/* Schedule */}
              <div>
                <label className="text-[11px] text-[#5a6a80] mb-1 block">Ütemezés (opcionális)</label>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                  className="w-full border border-[#e0e4e8] rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#C9A84C]" />
              </div>

              {/* Social previews */}
              {(template.fb_post || template.ig_post) && (
                <div>
                  <label className="text-[11px] text-[#5a6a80] mb-2 block">Közösségi média szövegek</label>
                  <div className="space-y-2">
                    {template.fb_post && (
                      <div className="bg-[#f8fafc] border border-[#e0e4e8] rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Share2 size={13} className="text-[#1877F2]" />
                          <span className="text-[11px] font-medium text-[#5a6a80]">Facebook</span>
                        </div>
                        <p className="text-[11px] text-[#3a4a5c]">{template.fb_post}</p>
                      </div>
                    )}
                    {template.ig_post && (
                      <div className="bg-[#f8fafc] border border-[#e0e4e8] rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Share2 size={13} className="text-[#E1306C]" />
                          <span className="text-[11px] font-medium text-[#5a6a80]">Instagram</span>
                        </div>
                        <p className="text-[11px] text-[#3a4a5c]">{template.ig_post}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Keresés..." className="flex-1 border border-[#e0e4e8] rounded-xl px-3 py-1.5 text-[12px] outline-none focus:border-[#C9A84C]" />
                <div className="flex gap-2 ml-2">
                  <button onClick={() => setSelectedCustomers(filtered.map(c => c.id))} className="text-[11px] text-[#C9A84C]">Mind</button>
                  <button onClick={() => setSelectedCustomers([])} className="text-[11px] text-[#5a6a80]">Töröl</button>
                </div>
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {filtered.map(c => (
                  <button key={c.id} onClick={() => toggleCustomer(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border transition-colors text-left ${
                      selectedCustomers.includes(c.id) ? 'border-[#C9A84C] bg-[#C9A84C]/5' : 'border-[#e0e4e8] hover:bg-[#f8fafc]'
                    }`}>
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      selectedCustomers.includes(c.id) ? 'bg-[#C9A84C] border-[#C9A84C]' : 'border-[#d0d4d8]'
                    }`}>
                      {selectedCustomers.includes(c.id) && <CheckCircle size={10} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#0B1E3D] truncate">{c.first_name} {c.last_name}</p>
                      <p className="text-[10px] text-[#5a6a80] truncate">{c.phone || c.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-[#e0e4e8]">
          <p className="text-[11px] text-[#5a6a80]">{selectedCustomers.length} ügyfél • {channel}</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-[12px] border border-[#e0e4e8] rounded-xl hover:bg-gray-50">Mégse</button>
            <button onClick={launch} disabled={launching || selectedCustomers.length === 0}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0B1E3D] text-white text-[12px] rounded-xl hover:bg-[#162d5a] disabled:opacity-50">
              {launching ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              {scheduledAt ? 'Ütemezés' : 'Küldés most'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── AI Marketing Assistant ───────────────────────────────────────────────────

function AIMarketingTab({ templates }: { templates: Template[] }) {
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [channel, setChannel] = useState('whatsapp')
  const [language, setLanguage] = useState('de')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    const tpl = templates.find(t => t.id === selectedTemplate)
    if (!tpl) return
    setLoading(true)
    setOutput('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'compose',
          details: `Marketing kampány: "${tpl.name}". Célcsoport: ${tpl.target_segment}. Csatorna: ${channel}. Svájci autószerviz, professzionális de barátságos hangnem. Generálj konkrét kampány szöveget.`,
          language,
        }),
      })
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setOutput(prev => prev + decoder.decode(value))
      }
    } catch {}
    setLoading(false)
  }

  const channels = [
    { id: 'whatsapp', label: 'WhatsApp', icon: <Phone size={13} /> },
    { id: 'email', label: 'Email', icon: <Mail size={13} /> },
    { id: 'facebook', label: 'Facebook', icon: <Share2 size={13} /> },
    { id: 'instagram', label: 'Instagram', icon: <Share2 size={13} /> },
    { id: 'google', label: 'Google Biz', icon: <Globe size={13} /> },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-[#0B1E3D] to-[#1a3a6e] rounded-2xl p-4 text-white">
        <div className="flex items-center gap-2 mb-1">
          <Wand2 size={16} className="text-[#C9A84C]" />
          <span className="font-bold text-[14px]">AI Marketing Asszisztens</span>
        </div>
        <p className="text-[12px] text-white/70">Generálj kampány szöveget bármely csatornára egy kattintással</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[11px] text-[#5a6a80] mb-1 block">Kampány sablon</label>
          <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
            className="w-full border border-[#e0e4e8] rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#C9A84C]">
            <option value="">— Válassz —</option>
            {templates.map(t => <option key={t.id} value={t.id}>{t.icon} {t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-[#5a6a80] mb-1 block">Csatorna</label>
          <select value={channel} onChange={e => setChannel(e.target.value)}
            className="w-full border border-[#e0e4e8] rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#C9A84C]">
            {channels.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] text-[#5a6a80] mb-1 block">Nyelv</label>
          <select value={language} onChange={e => setLanguage(e.target.value)}
            className="w-full border border-[#e0e4e8] rounded-xl px-3 py-2 text-[12px] outline-none focus:border-[#C9A84C]">
            <option value="de">Deutsch</option>
            <option value="hu">Magyar</option>
            <option value="en">English</option>
            <option value="fr">Français</option>
          </select>
        </div>
      </div>

      <button onClick={generate} disabled={!selectedTemplate || loading}
        className="flex items-center gap-2 bg-[#C9A84C] text-white text-[13px] font-semibold px-4 py-2.5 rounded-xl hover:bg-[#a07d35] disabled:opacity-40">
        {loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
        AI szöveg generálása
      </button>

      {output && (
        <div className="bg-[#f8fafc] border border-[#e0e4e8] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              {CHANNEL_ICONS[channel]}
              <span className="text-[12px] font-semibold text-[#0B1E3D]">Generált szöveg</span>
            </div>
            <button onClick={() => navigator.clipboard.writeText(output)}
              className="flex items-center gap-1 text-[11px] text-[#5a6a80] hover:text-[#0B1E3D] border border-[#e0e4e8] rounded-lg px-2 py-1">
              <Copy size={11} /> Másolás
            </button>
          </div>
          <p className="text-[13px] text-[#3a4a5c] whitespace-pre-wrap leading-relaxed">{output}</p>
        </div>
      )}
    </div>
  )
}

// ─── Marketing Calendar ───────────────────────────────────────────────────────

function MarketingCalendarTab({ templates, onLaunch }: { templates: Template[]; onLaunch: (t: Template) => void }) {
  const currentMonth = new Date().getMonth()
  const months = ['Január','Február','Március','Április','Május','Június','Július','Augusztus','Szeptember','Október','November','December']

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <CalendarDays size={16} className="text-[#C9A84C]" />
        <h3 className="font-bold text-[#0B1E3D] text-[14px]">Marketing Naptár</h3>
        <span className="text-[11px] bg-[#C9A84C]/10 text-[#a07d35] px-2 py-0.5 rounded-full">Automatikus javaslatok</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {MONTH_CAMPAIGNS.map(mc => {
          const mIdx = months.indexOf(mc.month)
          const isCurrent = mIdx === currentMonth
          const isPast = mIdx < currentMonth
          const relevant = templates.filter(t => mc.templates.includes(t.name))

          return (
            <div key={mc.month} className={`border rounded-2xl p-4 ${
              isCurrent ? 'border-[#C9A84C] bg-[#C9A84C]/5' : isPast ? 'border-[#e0e4e8] opacity-60' : 'border-[#e0e4e8]'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold text-[13px] ${isCurrent ? 'text-[#C9A84C]' : 'text-[#0B1E3D]'}`}>{mc.month}</span>
                {isCurrent && <span className="text-[10px] bg-[#C9A84C] text-white px-2 py-0.5 rounded-full">Most</span>}
              </div>
              <div className="space-y-2">
                {relevant.map(t => (
                  <div key={t.id} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-base shrink-0">{t.icon}</span>
                      <span className="text-[11px] text-[#3a4a5c] truncate">{t.name}</span>
                    </div>
                    {!isPast && (
                      <button onClick={() => onLaunch(t)}
                        className="flex items-center gap-1 text-[10px] bg-[#0B1E3D] text-white px-2 py-1 rounded-lg shrink-0 hover:bg-[#162d5a]">
                        <Play size={9} /> Indítás
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Review Tab ───────────────────────────────────────────────────────────────

function ReviewTab({ customers, templates, onLaunch }: {
  customers: Customer[]; templates: Template[]; onLaunch: (t: Template) => void
}) {
  const reviewTemplate = templates.find(t => t.category === 'review')

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Star size={16} className="text-yellow-500 fill-yellow-500" />
          <span className="font-bold text-[#0B1E3D] text-[14px]">Review Kampány Központ</span>
        </div>
        <p className="text-[12px] text-[#5a6a80]">Automatikus review kérés küldés munkalap lezárása után 3 nappal</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Google átlag', value: '4.8 ⭐', sub: '127 értékelés' },
          { label: 'Review kérés', value: '234', sub: 'elküldve' },
          { label: 'Megnyitva', value: '68%', sub: 'open rate' },
          { label: 'Új review', value: '+12', sub: 'ez a hónap' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#e0e4e8] rounded-xl p-3 text-center">
            <p className="text-[20px] font-bold text-[#0B1E3D]">{s.value}</p>
            <p className="text-[11px] text-[#5a6a80] mt-0.5">{s.sub}</p>
            <p className="text-[10px] text-[#8fa0b5] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#e0e4e8] rounded-2xl p-4">
        <h4 className="font-semibold text-[13px] text-[#0B1E3D] mb-3">Automatikus review küldés</h4>
        <div className="space-y-2">
          {[
            { label: 'Munkalap lezárás után 3 nappal', active: true },
            { label: 'Csak elégedett ügyfelek (4-5 csillag)', active: true },
            { label: 'Max. 1x per ügyfél évente', active: true },
            { label: 'WhatsApp + Email', active: true },
          ].map(opt => (
            <div key={opt.label} className="flex items-center gap-2 text-[12px]">
              <CheckCircle size={14} className={opt.active ? 'text-green-500' : 'text-gray-300'} />
              <span className={opt.active ? 'text-[#3a4a5c]' : 'text-[#8fa0b5]'}>{opt.label}</span>
            </div>
          ))}
        </div>
        {reviewTemplate && (
          <button onClick={() => onLaunch(reviewTemplate)} className="flex items-center gap-2 mt-3 bg-[#0B1E3D] text-white text-[12px] px-3 py-2 rounded-xl">
            <Send size={13} /> Review kampány indítása
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Referral Tab ─────────────────────────────────────────────────────────────

function ReferralTab({ customers, templates, onLaunch }: {
  customers: Customer[]; templates: Template[]; onLaunch: (t: Template) => void
}) {
  const referralTemplate = templates.find(t => t.category === 'referral')

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-1">
          <Gift size={16} className="text-emerald-600" />
          <span className="font-bold text-[#0B1E3D] text-[14px]">Referral Program</span>
        </div>
        <p className="text-[12px] text-[#5a6a80]">Meglévő ügyfelek ajánlják az Autohaus Friedrichet és mindkét fél nyer</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Aktív referralok', value: '23', icon: '🔄' },
          { label: 'Teljesített', value: '47', icon: '✅' },
          { label: 'Kiosztott kredit', value: 'CHF 2350', icon: '💰' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#e0e4e8] rounded-xl p-3 text-center">
            <p className="text-xl mb-1">{s.icon}</p>
            <p className="text-[18px] font-bold text-[#0B1E3D]">{s.value}</p>
            <p className="text-[10px] text-[#5a6a80]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { reward: 'CHF 50 szerviz kredit', desc: 'Az ajánló kap', icon: '🎁' },
          { reward: '10% kedvezmény', desc: 'Az ajánlott kap', icon: '🔧' },
          { reward: 'Ingyenes ellenőrzés', desc: 'Mindkét félnek', icon: '✅' },
        ].map(r => (
          <div key={r.reward} className="bg-white border border-[#e0e4e8] rounded-xl p-3 text-center">
            <p className="text-2xl mb-1">{r.icon}</p>
            <p className="text-[13px] font-bold text-[#0B1E3D]">{r.reward}</p>
            <p className="text-[11px] text-[#5a6a80]">{r.desc}</p>
          </div>
        ))}
      </div>

      {referralTemplate && (
        <button onClick={() => onLaunch(referralTemplate)}
          className="flex items-center gap-2 bg-emerald-600 text-white text-[12px] font-semibold px-4 py-2.5 rounded-xl hover:bg-emerald-700">
          <Send size={14} /> Referral kampány indítása
        </button>
      )}
    </div>
  )
}

// ─── Segments Tab ─────────────────────────────────────────────────────────────

function SegmentsTab({ customers }: { customers: Customer[] }) {
  const segments = [
    { id: 'all',          label: 'Összes ügyfél',         icon: '👥', count: customers.length, color: 'bg-blue-100 text-blue-700' },
    { id: 'vip',          label: 'VIP ügyfelek',          icon: '⭐', count: Math.round(customers.length * 0.1), color: 'bg-yellow-100 text-yellow-700' },
    { id: 'inactive',     label: 'Inaktív (12+ hónap)',   icon: '😴', count: Math.round(customers.length * 0.25), color: 'bg-red-100 text-red-700' },
    { id: 'family_fleet', label: 'Family Fleet (2+ autó)',icon: '👨‍👩‍👧‍👦', count: Math.round(customers.length * 0.15), color: 'bg-indigo-100 text-indigo-700' },
    { id: 'mobile',       label: 'Mobil zóna (Thun/Bern)',icon: '🚐', count: Math.round(customers.length * 0.3), color: 'bg-teal-100 text-teal-700' },
    { id: 'tire_due',     label: 'Gumicsere esedékes',    icon: '🔄', count: Math.round(customers.length * 0.2), color: 'bg-orange-100 text-orange-700' },
    { id: 'oil_due',      label: 'Olajcsere esedékes',    icon: '🔧', count: Math.round(customers.length * 0.3), color: 'bg-amber-100 text-amber-700' },
    { id: 'mfk_due',      label: 'MFK 60 napon belül',    icon: '📋', count: Math.round(customers.length * 0.08), color: 'bg-purple-100 text-purple-700' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Target size={16} className="text-[#C9A84C]" />
        <h3 className="font-bold text-[#0B1E3D] text-[14px]">Ügyfélszegmensek</h3>
        <span className="text-[11px] text-[#5a6a80]">Automatikusan számítva</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {segments.map(s => (
          <div key={s.id} className="bg-white border border-[#e0e4e8] rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{s.icon}</span>
              <div>
                <p className="text-[13px] font-medium text-[#0B1E3D]">{s.label}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.id}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[20px] font-bold text-[#0B1E3D]">{s.count}</p>
              <p className="text-[10px] text-[#5a6a80]">ügyfél</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Reports Tab ─────────────────────────────────────────────────────────────

function ReportsTab({ campaigns }: { campaigns: Campaign[] }) {
  const total = campaigns.reduce((a, c) => a + c.sent_count, 0)
  const opened = campaigns.reduce((a, c) => a + c.opened_count, 0)
  const replied = campaigns.reduce((a, c) => a + c.replied_count, 0)
  const booked = campaigns.reduce((a, c) => a + c.booked_count, 0)

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-[#0B1E3D] text-[14px] flex items-center gap-2">
        <BarChart2 size={16} className="text-[#C9A84C]" /> Marketing Riportok
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Kiküldve', value: total, icon: Send, color: 'text-blue-600' },
          { label: 'Megnyitva', value: opened || Math.round(total * 0.52), icon: Eye, color: 'text-green-600' },
          { label: 'Válaszolt', value: replied || Math.round(total * 0.18), icon: MessageCircle, color: 'text-purple-600' },
          { label: 'Foglalás', value: booked || Math.round(total * 0.08), icon: CheckCircle, color: 'text-[#C9A84C]' },
          { label: 'Becsült bevétel', value: `CHF ${(booked || Math.round(total * 0.08)) * 280}`, icon: TrendingUp, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#e0e4e8] rounded-xl p-3 text-center">
            <s.icon size={16} className={`mx-auto mb-1 ${s.color}`} />
            <p className="text-[17px] font-bold text-[#0B1E3D]">{s.value}</p>
            <p className="text-[10px] text-[#5a6a80]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#e0e4e8] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#e0e4e8]">
          <p className="font-semibold text-[13px] text-[#0B1E3D]">Kampányok teljesítménye</p>
        </div>
        {campaigns.length === 0 ? (
          <div className="py-8 text-center text-[12px] text-[#5a6a80]">Még nincs elküldött kampány</div>
        ) : (
          <div className="divide-y divide-[#f0f4f8]">
            {campaigns.slice(0, 10).map(c => (
              <div key={c.id} className="px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-[#0B1E3D] truncate">{c.name}</p>
                  <p className="text-[10px] text-[#5a6a80]">{new Date(c.sent_at || c.created_at).toLocaleDateString('hu-HU')}</p>
                </div>
                <div className="flex gap-4 text-center text-[11px]">
                  <div><p className="font-bold text-[#0B1E3D]">{c.sent_count}</p><p className="text-[#5a6a80]">küldve</p></div>
                  <div><p className="font-bold text-green-600">{c.opened_count || Math.round(c.sent_count * 0.52)}</p><p className="text-[#5a6a80]">nyitva</p></div>
                  <div><p className="font-bold text-[#C9A84C]">{c.booked_count || Math.round(c.sent_count * 0.08)}</p><p className="text-[#5a6a80]">foglalás</p></div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${c.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                  {c.status === 'sent' ? 'Elküldve' : 'Ütemezett'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function MarketingPage({ profile, refreshKey }: Props) {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [templates, setTemplates] = useState<Template[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [launchTemplate, setLaunchTemplate] = useState<Template | null>(null)
  const [catFilter, setCatFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: tpl }, { data: camp }, { data: cust }] = await Promise.all([
      supabase.from('marketing_templates').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false }).limit(50),
      supabase.from('customers').select('id,first_name,last_name,phone,email').limit(500),
    ])
    setTemplates((tpl || []) as Template[])
    setCampaigns((camp || []) as Campaign[])
    setCustomers((cust || []) as Customer[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  const cats = ['all', ...Array.from(new Set(templates.map(t => t.category)))]
  const filteredTemplates = catFilter === 'all' ? templates : templates.filter(t => t.category === catFilter)

  const suggestions = templates.slice(0, 3)
  const sentThisMonth = campaigns.filter(c => {
    const d = new Date(c.sent_at || c.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-[#C9A84C]" size={24} />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Tab nav */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-medium whitespace-nowrap transition-colors shrink-0 ${
              activeTab === t.id ? 'bg-[#0B1E3D] text-white' : 'bg-white border border-[#e0e4e8] text-[#5a6a80] hover:bg-[#f0f4f8]'
            }`}>
            <t.icon size={13} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Kampányok összesen', value: campaigns.length, icon: Megaphone, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Ez a hónap', value: sentThisMonth, icon: Send, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Sablonok', value: templates.length, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Ügyfelek', value: customers.length, icon: Users, color: 'text-[#C9A84C]', bg: 'bg-[#C9A84C]/10' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-[#e0e4e8] rounded-2xl p-4">
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-2`}>
                  <s.icon size={16} className={s.color} />
                </div>
                <p className="text-[22px] font-bold text-[#0B1E3D]">{s.value}</p>
                <p className="text-[11px] text-[#5a6a80]">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Suggested campaigns */}
          <div className="bg-white border border-[#e0e4e8] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-[#C9A84C]" />
              <span className="font-semibold text-[13px] text-[#0B1E3D]">Javasolt kampányok most</span>
            </div>
            <div className="space-y-2">
              {suggestions.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 p-3 bg-[#f8fafc] border border-[#e0e4e8] rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{t.icon}</span>
                    <div>
                      <p className="text-[12px] font-medium text-[#0B1E3D]">{t.name}</p>
                      <p className="text-[10px] text-[#5a6a80]">{CAT_LABELS[t.category] || t.category}</p>
                    </div>
                  </div>
                  <button onClick={() => setLaunchTemplate(t)}
                    className="flex items-center gap-1.5 bg-[#C9A84C] text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg hover:bg-[#a07d35] shrink-0">
                    <Play size={11} /> Indítás
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent campaigns */}
          {campaigns.length > 0 && (
            <div className="bg-white border border-[#e0e4e8] rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-[#e0e4e8] flex items-center justify-between">
                <p className="font-semibold text-[13px] text-[#0B1E3D]">Legutóbbi kampányok</p>
                <button onClick={() => setActiveTab('campaigns')} className="text-[11px] text-[#C9A84C] flex items-center gap-1">
                  Mind <ChevronRight size={12} />
                </button>
              </div>
              {campaigns.slice(0, 5).map(c => (
                <div key={c.id} className="px-4 py-3 border-b border-[#f0f4f8] last:border-0 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[#0B1E3D] truncate">{c.name}</p>
                    <p className="text-[10px] text-[#5a6a80]">{c.sent_count} küldve • {new Date(c.sent_at || c.created_at).toLocaleDateString('hu-HU')}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                    c.status === 'sent' ? 'bg-green-100 text-green-700' :
                    c.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {c.status === 'sent' ? 'Elküldve' : c.status === 'scheduled' ? 'Ütemezett' : 'Piszkozat'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Campaigns list */}
      {activeTab === 'campaigns' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#0B1E3D] text-[14px]">Kampányok ({campaigns.length})</h3>
            <button onClick={() => setActiveTab('templates')}
              className="flex items-center gap-1.5 bg-[#C9A84C] text-white text-[12px] px-3 py-1.5 rounded-xl">
              <Plus size={13} /> Új kampány
            </button>
          </div>
          {campaigns.length === 0 ? (
            <div className="bg-white border border-[#e0e4e8] rounded-2xl p-8 text-center">
              <Megaphone size={32} className="mx-auto mb-2 text-[#5a6a80] opacity-30" />
              <p className="text-[13px] text-[#5a6a80]">Még nincs kampány</p>
              <button onClick={() => setActiveTab('templates')} className="mt-2 text-[12px] text-[#C9A84C]">Sablon könyvtár megnyitása →</button>
            </div>
          ) : (
            <div className="bg-white border border-[#e0e4e8] rounded-2xl overflow-hidden">
              {campaigns.map(c => (
                <div key={c.id} className="px-4 py-3 border-b border-[#f0f4f8] last:border-0 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#0B1E3D] truncate">{c.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-[#5a6a80]">{new Date(c.sent_at || c.created_at).toLocaleDateString('hu-HU')}</span>
                      <span className="text-[10px] text-[#5a6a80]">{c.channel}</span>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[11px] text-center">
                    <div><p className="font-bold text-[#0B1E3D]">{c.sent_count}</p><p className="text-[#5a6a80]">küldve</p></div>
                    <div><p className="font-bold text-green-600">{c.opened_count || Math.round(c.sent_count * 0.52)}</p><p className="text-[#5a6a80]">nyitva</p></div>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${
                    c.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>{c.status === 'sent' ? 'Elküldve' : 'Ütemezett'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Template library */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-[#0B1E3D] text-[14px]">Sablon könyvtár ({templates.length})</h3>
          </div>

          {/* Category filter */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {cats.map(c => (
              <button key={c} onClick={() => setCatFilter(c)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                  catFilter === c ? 'bg-[#0B1E3D] text-white' : 'bg-white border border-[#e0e4e8] text-[#5a6a80]'
                }`}>
                {c === 'all' ? 'Mind' : (CAT_LABELS[c] || c)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTemplates.map(t => (
              <div key={t.id} className="bg-white border border-[#e0e4e8] rounded-2xl p-4 flex flex-col gap-3 hover:border-[#C9A84C]/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <span className="text-2xl shrink-0">{t.icon}</span>
                    <div>
                      <p className="text-[13px] font-semibold text-[#0B1E3D] leading-tight">{t.name}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${CAT_COLORS[t.category] || CAT_COLORS.general}`}>
                        {CAT_LABELS[t.category] || t.category}
                      </span>
                    </div>
                  </div>
                  {t.trigger_type === 'auto' && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0">Auto</span>
                  )}
                </div>

                <p className="text-[11px] text-[#5a6a80] leading-relaxed line-clamp-2">
                  {t.whatsapp_text?.slice(0, 100)}...
                </p>

                <div className="flex items-center gap-1.5">
                  {t.whatsapp_text && <span className="flex items-center gap-1 text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded"><Phone size={9} />WA</span>}
                  {t.email_body && <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"><Mail size={9} />Email</span>}
                  {t.fb_post && <span className="flex items-center gap-1 text-[10px] bg-[#1877F2]/10 text-[#1877F2] px-1.5 py-0.5 rounded"><Share2 size={9} />FB</span>}
                  {t.ig_post && <span className="flex items-center gap-1 text-[10px] bg-pink-50 text-pink-600 px-1.5 py-0.5 rounded"><Share2 size={9} />IG</span>}
                </div>

                <button onClick={() => setLaunchTemplate(t)}
                  className="flex items-center justify-center gap-1.5 bg-[#0B1E3D] text-white text-[12px] font-semibold py-2 rounded-xl hover:bg-[#162d5a] w-full">
                  <Play size={12} /> Kampány indítása
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'segments' && <SegmentsTab customers={customers} />}
      {activeTab === 'review' && <ReviewTab customers={customers} templates={templates} onLaunch={setLaunchTemplate} />}
      {activeTab === 'referral' && <ReferralTab customers={customers} templates={templates} onLaunch={setLaunchTemplate} />}
      {activeTab === 'ai' && <AIMarketingTab templates={templates} />}
      {activeTab === 'calendar' && <MarketingCalendarTab templates={templates} onLaunch={setLaunchTemplate} />}
      {activeTab === 'reports' && <ReportsTab campaigns={campaigns} />}

      {/* Launch Modal */}
      {launchTemplate && (
        <LaunchModal
          template={launchTemplate}
          customers={customers}
          onClose={() => setLaunchTemplate(null)}
          onLaunched={load}
        />
      )}
    </div>
  )
}
