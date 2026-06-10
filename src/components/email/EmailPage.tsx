'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Mail, Send, FileText, Archive, AlertCircle, Plus, RefreshCw,
  Search, Paperclip, X, ChevronLeft, Star, Trash2, Reply,
  Loader2, CheckCircle, Clock, Eye, Wand2, User, Building2,
  Tag, Link2, Download
} from 'lucide-react'
import type { Profile } from '@/lib/types'

interface Props {
  profile?: Profile | null
  refreshKey?: number
  onRefresh?: () => void
}

interface EmailAccount {
  id: string
  email: string
  display_name: string
  is_active: boolean
  connected_at: string
}

interface Email {
  id: string
  direction: 'inbound' | 'outbound'
  status: string
  from_email: string
  from_name: string
  to_emails: string[]
  cc_emails?: string[]
  subject: string
  body_html?: string
  body_text?: string
  sent_at?: string
  received_at?: string
  customer_id?: string
  work_order_id?: string
  labels?: string[]
  attachments?: { filename: string; mimeType: string }[]
}

interface EmailTemplate {
  id: string
  name: string
  category: string
  subject: string
  body_html: string
}

interface Customer {
  id: string
  first_name: string
  last_name: string
  email: string
}

const FOLDERS = [
  { id: 'inbox',    label: 'Beérkező',    icon: Mail,         filter: (e: Email) => e.direction === 'inbound' },
  { id: 'sent',     label: 'Elküldött',   icon: Send,         filter: (e: Email) => e.direction === 'outbound' && e.status !== 'draft' },
  { id: 'drafts',   label: 'Piszkozatok', icon: FileText,     filter: (e: Email) => e.status === 'draft' },
  { id: 'archived', label: 'Archivált',   icon: Archive,      filter: (e: Email) => (e.labels || []).includes('archived') },
  { id: 'failed',   label: 'Sikertelen',  icon: AlertCircle,  filter: (e: Email) => e.status === 'failed' },
]

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Piszkozat', color: 'bg-gray-100 text-gray-600' },
  sent:      { label: 'Elküldve',  color: 'bg-blue-100 text-blue-700' },
  delivered: { label: 'Kézbesítve', color: 'bg-green-100 text-green-700' },
  opened:    { label: 'Megnyitva', color: 'bg-[#C9A84C]/10 text-[#C9A84C]' },
  failed:    { label: 'Sikertelen', color: 'bg-red-100 text-red-700' },
}

function formatDate(d?: string): string {
  if (!d) return ''
  const date = new Date(d)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120)
}

// ─── Compose Modal ────────────────────────────────────────────────────────────

interface ComposeProps {
  onClose: () => void
  onSent: () => void
  account: EmailAccount
  customers: Customer[]
  templates: EmailTemplate[]
  prefill?: {
    to?: string
    subject?: string
    body?: string
    customerId?: string
    workOrderId?: string
    attachments?: { filename: string; mimeType: string; data: string }[]
  }
}

function ComposeModal({ onClose, onSent, account, customers, templates, prefill }: ComposeProps) {
  const [to, setTo] = useState(prefill?.to || '')
  const [cc, setCc] = useState('')
  const [subject, setSubject] = useState(prefill?.subject || '')
  const [body, setBody] = useState(prefill?.body || '')
  const [attachments, setAttachments] = useState<{ filename: string; mimeType: string; data: string }[]>(prefill?.attachments || [])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [sending, setSending] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [showCc, setShowCc] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const applyTemplate = (tid: string) => {
    const t = templates.find(t => t.id === tid)
    if (!t) return
    setSubject(t.subject)
    setBody(t.body_html)
    setSelectedTemplate(tid)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1]
        setAttachments(prev => [...prev, { filename: file.name, mimeType: file.type, data: base64 }])
      }
      reader.readAsDataURL(file)
    })
  }

  const generateAI = async () => {
    if (!subject && !to) return
    setAiLoading(true)
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'compose',
          details: `Tárgy: ${subject}. Címzett: ${to}. Garázs email, professzionális hangnem svájci autószerviztől.`,
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
      setBody(`<p>${text.replace(/\n/g, '</p><p>')}</p>`)
    } catch {
      // ignore
    }
    setAiLoading(false)
  }

  const send = async () => {
    if (!to || !subject || !body) { setError('Töltsd ki a Címzett, Tárgy és Szöveg mezőket!'); return }
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: to.split(',').map(s => s.trim()).filter(Boolean),
          cc: cc ? cc.split(',').map(s => s.trim()).filter(Boolean) : [],
          subject,
          bodyHtml: body,
          attachments,
          customerId: prefill?.customerId,
          workOrderId: prefill?.workOrderId,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Hiba történt'); setSending(false); return }
      onSent()
      onClose()
    } catch (e: any) {
      setError(e.message)
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#e0e4e8]">
          <span className="font-semibold text-[#0B1E3D] text-[14px]">Új email</span>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* From */}
          <div className="flex items-center gap-2 text-[12px]">
            <span className="text-[#5a6a80] w-14 shrink-0">Feladó:</span>
            <span className="text-[#0B1E3D] font-medium">{account.display_name} &lt;{account.email}&gt;</span>
          </div>

          {/* To */}
          <div className="flex items-center gap-2">
            <span className="text-[#5a6a80] text-[12px] w-14 shrink-0">Cím:</span>
            <input
              value={to}
              onChange={e => setTo(e.target.value)}
              placeholder="email@example.com, több cím vesszővel"
              className="flex-1 border border-[#e0e4e8] rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-[#C9A84C]"
              list="customer-emails"
            />
            <datalist id="customer-emails">
              {customers.map(c => <option key={c.id} value={c.email} label={`${c.first_name} ${c.last_name}`} />)}
            </datalist>
            <button onClick={() => setShowCc(!showCc)} className="text-[11px] text-[#5a6a80] hover:text-[#0B1E3D]">CC</button>
          </div>

          {showCc && (
            <div className="flex items-center gap-2">
              <span className="text-[#5a6a80] text-[12px] w-14 shrink-0">CC:</span>
              <input value={cc} onChange={e => setCc(e.target.value)} placeholder="másolat@example.com"
                className="flex-1 border border-[#e0e4e8] rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-[#C9A84C]" />
            </div>
          )}

          {/* Template */}
          <div className="flex items-center gap-2">
            <span className="text-[#5a6a80] text-[12px] w-14 shrink-0">Sablon:</span>
            <select value={selectedTemplate} onChange={e => applyTemplate(e.target.value)}
              className="flex-1 border border-[#e0e4e8] rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-[#C9A84C]">
              <option value="">— Válassz sablont —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          {/* Subject */}
          <div className="flex items-center gap-2">
            <span className="text-[#5a6a80] text-[12px] w-14 shrink-0">Tárgy:</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email tárgya"
              className="flex-1 border border-[#e0e4e8] rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-[#C9A84C]" />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[#5a6a80] text-[12px]">Szöveg:</span>
              <button onClick={generateAI} disabled={aiLoading}
                className="flex items-center gap-1 text-[11px] text-[#C9A84C] hover:text-[#a07d35]">
                {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
                AI segítség
              </button>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={8}
              placeholder="Email szövege (HTML is elfogadott)..."
              className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[#C9A84C] font-mono resize-none"
            />
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((a, i) => (
                <div key={i} className="flex items-center gap-1 bg-[#f0f4f8] rounded-lg px-2 py-1 text-[11px]">
                  <Paperclip size={10} />
                  <span>{a.filename}</span>
                  <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-[12px] text-red-600">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#e0e4e8]">
          <div className="flex items-center gap-2">
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1 text-[12px] text-[#5a6a80] hover:text-[#0B1E3D] border border-[#e0e4e8] rounded-lg px-2 py-1">
              <Paperclip size={12} /> Csatolmány
            </button>
            <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFile} />
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-[12px] border border-[#e0e4e8] rounded-lg hover:bg-gray-50">
              Mégse
            </button>
            <button onClick={send} disabled={sending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#0B1E3D] text-white text-[12px] rounded-lg hover:bg-[#162d5a] disabled:opacity-50">
              {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Küldés
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Template Manager ─────────────────────────────────────────────────────────

function TemplateManager({ templates, onRefresh }: { templates: EmailTemplate[]; onRefresh: () => void }) {
  const supabase = createClient()
  const [editing, setEditing] = useState<Partial<EmailTemplate> | null>(null)
  const [saving, setSaving] = useState(false)

  const categories = ['general', 'quote', 'invoice', 'workorder', 'review', 'reminder', 'followup', 'payment']
  const catLabels: Record<string, string> = {
    general: 'Általános', quote: 'Árajánlat', invoice: 'Számla', workorder: 'Munkalap',
    review: 'Review', reminder: 'Emlékeztető', followup: 'Utánkövetés', payment: 'Fizetés',
  }

  const save = async () => {
    if (!editing?.name || !editing.subject) return
    setSaving(true)
    if (editing.id) {
      await supabase.from('email_templates').update({
        name: editing.name, category: editing.category, subject: editing.subject, body_html: editing.body_html,
        updated_at: new Date().toISOString(),
      }).eq('id', editing.id)
    } else {
      await supabase.from('email_templates').insert({
        name: editing.name, category: editing.category || 'general',
        subject: editing.subject, body_html: editing.body_html || '',
      })
    }
    setSaving(false)
    setEditing(null)
    onRefresh()
  }

  const del = async (id: string) => {
    if (!confirm('Törlöd ezt a sablont?')) return
    await supabase.from('email_templates').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[#0B1E3D] text-[14px]">Email sablonok</h3>
        <button onClick={() => setEditing({ category: 'general' })}
          className="flex items-center gap-1 text-[12px] bg-[#0B1E3D] text-white px-3 py-1.5 rounded-lg">
          <Plus size={12} /> Új sablon
        </button>
      </div>

      {editing && (
        <div className="bg-[#f8fafc] border border-[#e0e4e8] rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#5a6a80] mb-1 block">Sablon neve</label>
              <input value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))}
                className="w-full border border-[#e0e4e8] rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-[#C9A84C]" />
            </div>
            <div>
              <label className="text-[11px] text-[#5a6a80] mb-1 block">Kategória</label>
              <select value={editing.category || 'general'} onChange={e => setEditing(p => ({ ...p, category: e.target.value }))}
                className="w-full border border-[#e0e4e8] rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-[#C9A84C]">
                {categories.map(c => <option key={c} value={c}>{catLabels[c]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#5a6a80] mb-1 block">Tárgy</label>
            <input value={editing.subject || ''} onChange={e => setEditing(p => ({ ...p, subject: e.target.value }))}
              placeholder="pl. Árajánlat – {{plate}} – Autohaus Friedrich"
              className="w-full border border-[#e0e4e8] rounded-lg px-3 py-1.5 text-[12px] outline-none focus:border-[#C9A84C]" />
          </div>
          <div>
            <label className="text-[11px] text-[#5a6a80] mb-1 block">Szöveg (HTML)</label>
            <textarea value={editing.body_html || ''} onChange={e => setEditing(p => ({ ...p, body_html: e.target.value }))}
              rows={5} placeholder="<p>Tisztelt {{customer_name}}!</p>"
              className="w-full border border-[#e0e4e8] rounded-lg px-3 py-2 text-[12px] outline-none focus:border-[#C9A84C] font-mono resize-none" />
          </div>
          <p className="text-[10px] text-[#5a6a80]">Változók: {'{{customer_name}}'} {'{{plate}}'} {'{{invoice_number}}'} {'{{amount}}'} {'{{due_date}}'}</p>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditing(null)} className="text-[12px] border border-[#e0e4e8] px-3 py-1.5 rounded-lg hover:bg-gray-50">Mégse</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1 text-[12px] bg-[#C9A84C] text-white px-3 py-1.5 rounded-lg hover:bg-[#a07d35]">
              {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />} Mentés
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {templates.map(t => (
          <div key={t.id} className="flex items-center justify-between bg-white border border-[#e0e4e8] rounded-xl px-4 py-3">
            <div>
              <p className="text-[13px] font-medium text-[#0B1E3D]">{t.name}</p>
              <p className="text-[11px] text-[#5a6a80]">{t.subject}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-[#f0f4f8] text-[#5a6a80] px-2 py-0.5 rounded-full">{t.category}</span>
              <button onClick={() => setEditing(t)} className="p-1.5 rounded-lg hover:bg-[#f0f4f8] text-[#5a6a80]">
                <FileText size={13} />
              </button>
              <button onClick={() => del(t.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main EmailPage ───────────────────────────────────────────────────────────

export function EmailPage({ profile, refreshKey }: Props) {
  const supabase = createClient()
  const [account, setAccount] = useState<EmailAccount | null>(null)
  const [emails, setEmails] = useState<Email[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [activeFolder, setActiveFolder] = useState('inbox')
  const [activeView, setActiveView] = useState<'list' | 'detail' | 'templates'>('list')
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: acc }, { data: em }, { data: tpl }, { data: cust }] = await Promise.all([
      supabase.from('email_accounts').select('*').eq('is_active', true).limit(1).single(),
      supabase.from('emails').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('email_templates').select('*').eq('is_active', true).order('name'),
      supabase.from('customers').select('id,first_name,last_name,email').not('email', 'is', null).limit(500),
    ])
    if (acc) setAccount(acc as EmailAccount)
    setEmails((em || []) as Email[])
    setTemplates((tpl || []) as EmailTemplate[])
    setCustomers((cust || []) as Customer[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, refreshKey])

  const syncInbox = async () => {
    if (!account) return
    setSyncing(true)
    try {
      await fetch('/api/email/sync', { method: 'POST' })
      await load()
    } catch {}
    setSyncing(false)
  }

  const folderEmails = FOLDERS.find(f => f.id === activeFolder)?.filter
    ? emails.filter(e => {
        const folder = FOLDERS.find(f => f.id === activeFolder)!
        const inFolder = folder.filter(e)
        if (!inFolder) return false
        if (!search) return true
        const s = search.toLowerCase()
        return (
          e.subject?.toLowerCase().includes(s) ||
          e.from_email?.toLowerCase().includes(s) ||
          e.from_name?.toLowerCase().includes(s) ||
          e.to_emails?.some(t => t.toLowerCase().includes(s))
        )
      })
    : []

  const folderCounts = FOLDERS.reduce((acc, f) => {
    acc[f.id] = emails.filter(f.filter).length
    return acc
  }, {} as Record<string, number>)

  const openEmail = (email: Email) => {
    setSelectedEmail(email)
    setActiveView('detail')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#C9A84C]" size={24} />
      </div>
    )
  }

  // No account connected
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
        <div className="w-16 h-16 bg-[#f0f4f8] rounded-2xl flex items-center justify-center">
          <Mail size={28} className="text-[#5a6a80]" />
        </div>
        <div>
          <p className="font-semibold text-[#0B1E3D] text-[15px]">Gmail nincs csatlakoztatva</p>
          <p className="text-[12px] text-[#5a6a80] mt-1">Csatlakoztasd Gmail fiókodat a Beállítások → Email menüpontban</p>
        </div>
        <a href="/admin?page=settings&tab=email"
          className="flex items-center gap-2 bg-[#0B1E3D] text-white text-[12px] px-4 py-2 rounded-xl hover:bg-[#162d5a]">
          <Building2 size={14} /> Beállítások megnyitása
        </a>
      </div>
    )
  }

  return (
    <div className="flex h-full gap-4">
      {/* Left: Folder sidebar */}
      <div className="w-48 shrink-0 hidden md:flex flex-col gap-1">
        <button onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 bg-[#C9A84C] text-white text-[12px] font-semibold px-3 py-2.5 rounded-xl hover:bg-[#a07d35] mb-2">
          <Plus size={14} /> Új email
        </button>

        {FOLDERS.map(f => (
          <button key={f.id}
            onClick={() => { setActiveFolder(f.id); setActiveView('list') }}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-[12px] transition-colors ${
              activeFolder === f.id && activeView !== 'templates'
                ? 'bg-[#0B1E3D] text-white' : 'text-[#5a6a80] hover:bg-[#f0f4f8]'
            }`}>
            <div className="flex items-center gap-2">
              <f.icon size={13} />
              {f.label}
            </div>
            {folderCounts[f.id] > 0 && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeFolder === f.id && activeView !== 'templates' ? 'bg-white/20' : 'bg-[#f0f4f8]'
              }`}>{folderCounts[f.id]}</span>
            )}
          </button>
        ))}

        <div className="h-px bg-[#e0e4e8] my-2" />

        <button onClick={() => setActiveView('templates')}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] transition-colors ${
            activeView === 'templates' ? 'bg-[#0B1E3D] text-white' : 'text-[#5a6a80] hover:bg-[#f0f4f8]'
          }`}>
          <FileText size={13} /> Sablonok
        </button>

        <div className="h-px bg-[#e0e4e8] my-2" />

        <div className="px-3 py-2 text-[10px] text-[#5a6a80]">
          <div className="flex items-center gap-1.5 mb-1">
            <div className="w-2 h-2 bg-green-500 rounded-full" />
            <span className="font-medium truncate">{account.email}</span>
          </div>
          <button onClick={syncInbox} disabled={syncing}
            className="flex items-center gap-1 hover:text-[#0B1E3D] mt-1">
            <RefreshCw size={10} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Szinkronizálás...' : 'Szinkronizálás'}
          </button>
        </div>
      </div>

      {/* Right: Email list or detail */}
      <div className="flex-1 min-w-0 bg-white rounded-2xl border border-[#e0e4e8] overflow-hidden flex flex-col">

        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-2 p-3 border-b border-[#e0e4e8]">
          {activeView === 'detail' && (
            <button onClick={() => setActiveView('list')} className="p-1.5 rounded-lg hover:bg-gray-100">
              <ChevronLeft size={16} />
            </button>
          )}
          <div className="flex gap-1 overflow-x-auto flex-1">
            {FOLDERS.map(f => (
              <button key={f.id}
                onClick={() => { setActiveFolder(f.id); setActiveView('list') }}
                className={`px-2 py-1 rounded-lg text-[11px] whitespace-nowrap ${
                  activeFolder === f.id && activeView !== 'templates' ? 'bg-[#0B1E3D] text-white' : 'text-[#5a6a80]'
                }`}>{f.label}</button>
            ))}
          </div>
          <button onClick={() => setShowCompose(true)} className="p-1.5 bg-[#C9A84C] text-white rounded-lg">
            <Plus size={14} />
          </button>
        </div>

        {activeView === 'templates' ? (
          <div className="flex-1 overflow-y-auto">
            <TemplateManager templates={templates} onRefresh={load} />
          </div>
        ) : activeView === 'detail' && selectedEmail ? (
          <div className="flex-1 overflow-y-auto">
            <EmailDetail
              email={selectedEmail}
              customers={customers}
              onBack={() => setActiveView('list')}
              onReply={(email) => {
                setShowCompose(true)
                // prefill is handled below
              }}
            />
          </div>
        ) : (
          <>
            {/* Search bar */}
            <div className="p-3 border-b border-[#e0e4e8]">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 bg-[#f8fafc] border border-[#e0e4e8] rounded-xl px-3 py-1.5">
                  <Search size={13} className="text-[#5a6a80]" />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Keresés..." className="flex-1 bg-transparent text-[12px] outline-none" />
                </div>
                <button onClick={syncInbox} disabled={syncing}
                  className="p-2 border border-[#e0e4e8] rounded-xl hover:bg-[#f0f4f8] text-[#5a6a80]">
                  <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Email list */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#f0f4f8]">
              {folderEmails.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-[#5a6a80]">
                  <Mail size={24} className="mb-2 opacity-40" />
                  <p className="text-[12px]">Nincs email ebben a mappában</p>
                </div>
              ) : (
                folderEmails.map(email => (
                  <button key={email.id} onClick={() => openEmail(email)}
                    className="w-full text-left px-4 py-3 hover:bg-[#f8fafc] transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#0B1E3D] flex items-center justify-center shrink-0 mt-0.5">
                        <span className="text-white text-[10px] font-bold">
                          {(email.from_name || email.from_email || '?')[0].toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-[12px] truncate ${
                            email.direction === 'inbound' && (email.labels || []).includes('UNREAD')
                              ? 'font-bold text-[#0B1E3D]' : 'font-medium text-[#0B1E3D]'
                          }`}>
                            {email.direction === 'inbound'
                              ? (email.from_name || email.from_email)
                              : `→ ${email.to_emails?.[0] || ''}`}
                          </span>
                          <span className="text-[10px] text-[#5a6a80] shrink-0">
                            {formatDate(email.sent_at || email.received_at)}
                          </span>
                        </div>
                        <p className={`text-[12px] truncate ${
                          email.direction === 'inbound' && (email.labels || []).includes('UNREAD')
                            ? 'font-semibold text-[#0B1E3D]' : 'text-[#3a4a5c]'
                        }`}>{email.subject}</p>
                        <p className="text-[11px] text-[#5a6a80] truncate">
                          {email.body_html ? stripHtml(email.body_html) : email.body_text?.slice(0, 120)}
                        </p>
                      </div>
                      {email.attachments && email.attachments.length > 0 && (
                        <Paperclip size={12} className="text-[#5a6a80] shrink-0" />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {showCompose && account && (
        <ComposeModal
          onClose={() => setShowCompose(false)}
          onSent={() => { setShowCompose(false); load() }}
          account={account}
          customers={customers}
          templates={templates}
        />
      )}
    </div>
  )
}

// ─── Email Detail ─────────────────────────────────────────────────────────────

function EmailDetail({
  email, customers, onBack, onReply
}: {
  email: Email
  customers: Customer[]
  onBack: () => void
  onReply: (email: Email) => void
}) {
  const customer = customers.find(c =>
    c.email === email.from_email || email.to_emails?.includes(c.email)
  )

  const statusBadge = STATUS_BADGE[email.status] || STATUS_BADGE.sent

  return (
    <div className="p-4 space-y-4">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] text-[#5a6a80] hover:text-[#0B1E3D]">
          <ChevronLeft size={14} /> Vissza
        </button>
        <div className="flex gap-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusBadge.color}`}>{statusBadge.label}</span>
          <button onClick={() => onReply(email)}
            className="flex items-center gap-1 text-[11px] border border-[#e0e4e8] px-2 py-1 rounded-lg hover:bg-[#f0f4f8]">
            <Reply size={11} /> Válasz
          </button>
        </div>
      </div>

      {/* Subject */}
      <h2 className="text-[16px] font-bold text-[#0B1E3D]">{email.subject}</h2>

      {/* Meta */}
      <div className="bg-[#f8fafc] rounded-xl p-3 space-y-1 text-[12px]">
        <div className="flex gap-2">
          <span className="text-[#5a6a80] w-16 shrink-0">Feladó:</span>
          <span className="text-[#0B1E3D]">{email.from_name} &lt;{email.from_email}&gt;</span>
        </div>
        <div className="flex gap-2">
          <span className="text-[#5a6a80] w-16 shrink-0">Cím:</span>
          <span className="text-[#0B1E3D]">{email.to_emails?.join(', ')}</span>
        </div>
        <div className="flex gap-2">
          <span className="text-[#5a6a80] w-16 shrink-0">Dátum:</span>
          <span className="text-[#0B1E3D]">
            {new Date(email.sent_at || email.received_at || '').toLocaleString('hu-HU')}
          </span>
        </div>
        {customer && (
          <div className="flex gap-2">
            <span className="text-[#5a6a80] w-16 shrink-0">Ügyfél:</span>
            <span className="flex items-center gap-1 text-[#C9A84C] font-medium">
              <User size={11} /> {customer.first_name} {customer.last_name}
            </span>
          </div>
        )}
        {email.work_order_id && (
          <div className="flex gap-2">
            <span className="text-[#5a6a80] w-16 shrink-0">Munkalap:</span>
            <span className="flex items-center gap-1 text-blue-600">
              <Link2 size={11} /> {email.work_order_id.slice(0, 8)}...
            </span>
          </div>
        )}
      </div>

      {/* Attachments */}
      {email.attachments && email.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {email.attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 bg-[#f0f4f8] border border-[#e0e4e8] rounded-lg px-2 py-1.5 text-[11px]">
              <Paperclip size={11} className="text-[#5a6a80]" />
              <span>{a.filename}</span>
            </div>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="border border-[#e0e4e8] rounded-xl p-4">
        {email.body_html ? (
          <div
            className="prose prose-sm max-w-none text-[13px]"
            dangerouslySetInnerHTML={{ __html: email.body_html }}
          />
        ) : (
          <pre className="text-[12px] whitespace-pre-wrap font-sans text-[#3a4a5c]">{email.body_text}</pre>
        )}
      </div>
    </div>
  )
}
