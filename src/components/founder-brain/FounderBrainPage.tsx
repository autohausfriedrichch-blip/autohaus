'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Brain, Plus, Search, Filter, Archive, Trash2, Edit2,
  CheckCircle2, ArrowRight, Tag, Calendar, Loader2, X,
  ChevronDown, Lightbulb, TrendingUp, Zap, Star, BarChart2
} from 'lucide-react'
import type { Profile } from '@/lib/types'

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Operations', 'AI fejlesztések', 'Marketing', 'Ügyfélélmény',
  'Mobil gumiszerviz', 'Detailing', 'Flotta szolgáltatások',
  'Alkalmazás fejlesztés', 'Automatizáció', 'Bevételnövelés', 'Egyéb',
]

const PRIORITIES = ['Alacsony', 'Közepes', 'Magas', 'Kritikus']

const STATUSES = [
  'Ötlet', 'Kutatás alatt', 'Tervezett', 'Fejlesztés alatt',
  'Tesztelés alatt', 'Megvalósítva', 'Elvetve',
]

const PRIORITY_COLORS: Record<string, string> = {
  Alacsony: 'bg-gray-100 text-gray-500',
  Közepes:  'bg-blue-100 text-blue-600',
  Magas:    'bg-orange-100 text-orange-600',
  Kritikus: 'bg-red-100 text-red-600',
}

const PRIORITY_DOTS: Record<string, string> = {
  Alacsony: 'bg-gray-400',
  Közepes:  'bg-blue-500',
  Magas:    'bg-orange-500',
  Kritikus: 'bg-red-500',
}

const STATUS_COLORS: Record<string, string> = {
  'Ötlet':            'bg-purple-50 text-purple-600 border-purple-200',
  'Kutatás alatt':    'bg-yellow-50 text-yellow-700 border-yellow-200',
  'Tervezett':        'bg-blue-50 text-blue-600 border-blue-200',
  'Fejlesztés alatt': 'bg-orange-50 text-orange-600 border-orange-200',
  'Tesztelés alatt':  'bg-cyan-50 text-cyan-600 border-cyan-200',
  'Megvalósítva':     'bg-green-50 text-green-600 border-green-200',
  'Elvetve':          'bg-gray-50 text-gray-500 border-gray-200',
}

const TASK_PRIORITY_MAP: Record<string, string> = {
  Alacsony: 'low',
  Közepes:  'normal',
  Magas:    'high',
  Kritikus: 'urgent',
}

const BLANK_FORM = {
  title: '', short_desc: '', description: '',
  category: 'Egyéb', priority: 'Közepes', status: 'Ötlet',
  tags: '', archived: false,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(d: string) {
  return new Date(d).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ label, cls }: { label: string; cls: string }) {
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>{label}</span>
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 shadow-sm`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-2xl font-bold text-[#0D0D0D]">{value}</div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  )
}

// ─── Idea Modal ───────────────────────────────────────────────────────────────

function IdeaModal({
  idea, onClose, onSave, saving
}: {
  idea: any; onClose: () => void; onSave: (data: any) => void; saving: boolean
}) {
  const [form, setForm] = useState({
    title:       idea?.title       || '',
    short_desc:  idea?.short_desc  || '',
    description: idea?.description || '',
    category:    idea?.category    || 'Egyéb',
    priority:    idea?.priority    || 'Közepes',
    status:      idea?.status      || 'Ötlet',
    tags:        (idea?.tags || []).join(', '),
    archived:    idea?.archived    || false,
  })

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-[#0D0D0D]">{idea?.id ? 'Ötlet szerkesztése' : 'Új ötlet'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="label">Cím *</label>
            <input value={form.title} onChange={set('title')} placeholder="Ötlet megnevezése" className="input" />
          </div>
          <div>
            <label className="label">Rövid leírás</label>
            <input value={form.short_desc} onChange={set('short_desc')} placeholder="1-2 mondatos összefoglaló" className="input" />
          </div>
          <div>
            <label className="label">Részletes leírás</label>
            <textarea value={form.description} onChange={set('description')} rows={4} placeholder="Részletek, ötletek, hivatkozások..." className="input resize-none" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Kategória</label>
              <div className="relative">
                <select value={form.category} onChange={set('category')} className="input appearance-none pr-8">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="label">Prioritás</label>
              <div className="relative">
                <select value={form.priority} onChange={set('priority')} className="input appearance-none pr-8">
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Státusz</label>
            <div className="relative">
              <select value={form.status} onChange={set('status')} className="input appearance-none pr-8">
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="label">Címkék (vesszővel elválasztva)</label>
            <input value={form.tags} onChange={set('tags')} placeholder="pl. AI, automatizáció, ügyfél" className="input" />
          </div>
        </div>

        <div className="flex gap-2 p-5 pt-0">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Mégsem
          </button>
          <button
            onClick={() => onSave({ ...form, tags: form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) })}
            disabled={!form.title.trim() || saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C8102E] text-white rounded-xl text-sm font-semibold hover:bg-[#b8943f] disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Mentés
          </button>
        </div>
      </div>
      <style jsx>{`
        .label { display:block; font-size:0.7rem; font-weight:600; color:#6b7280; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:4px; }
        .input { width:100%; padding:8px 12px; font-size:0.875rem; border:1px solid #e5e7eb; border-radius:8px; outline:none; background:white; }
        .input:focus { border-color:#C8102E; box-shadow:0 0 0 2px rgba(201,168,76,0.2); }
      `}</style>
    </div>
  )
}

// ─── Idea Detail Drawer ───────────────────────────────────────────────────────

function IdeaDetail({
  idea, onClose, onEdit, onDelete, onArchive, onConvertToTask, converting
}: {
  idea: any; onClose: () => void; onEdit: () => void
  onDelete: () => void; onArchive: () => void
  onConvertToTask: () => void; converting: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${PRIORITY_DOTS[idea.priority]}`} />
            <span className="font-bold text-[#0D0D0D] text-sm">{idea.title}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge label={idea.category} cls="bg-gray-50 text-gray-600 border-gray-200" />
            <Badge label={idea.priority} cls={PRIORITY_COLORS[idea.priority]} />
            <Badge label={idea.status} cls={STATUS_COLORS[idea.status] || 'bg-gray-50 text-gray-500 border-gray-200'} />
          </div>

          {idea.short_desc && (
            <p className="text-sm text-gray-700 font-medium">{idea.short_desc}</p>
          )}

          {idea.description && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {idea.description}
            </div>
          )}

          {idea.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {idea.tags.map((t: string) => (
                <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#faf8f2] text-[#C8102E] text-xs rounded-full border border-[#C8102E]/20">
                  <Tag size={9} />{t}
                </span>
              ))}
            </div>
          )}

          {idea.task_id && (
            <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <CheckCircle2 size={13} /> Feladat már létrehozva
            </div>
          )}

          <div className="text-xs text-gray-400 flex gap-3">
            <span>Létrehozva: {fmt(idea.created_at)}</span>
            {idea.updated_at !== idea.created_at && <span>Módosítva: {fmt(idea.updated_at)}</span>}
          </div>
        </div>

        <div className="p-5 pt-0 space-y-2">
          {!idea.task_id && idea.status !== 'Elvetve' && (
            <button
              onClick={onConvertToTask}
              disabled={converting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#0D0D0D] text-white rounded-xl text-sm font-semibold hover:bg-[#1a3060] disabled:opacity-60"
            >
              {converting ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              Feladattá alakítás
            </button>
          )}
          <div className="flex gap-2">
            <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Edit2 size={13} /> Szerkesztés
            </button>
            <button onClick={onArchive} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              <Archive size={13} /> {idea.archived ? 'Visszaállítás' : 'Archiválás'}
            </button>
            <button onClick={onDelete} className="flex items-center justify-center px-3 py-2 border border-red-200 rounded-xl text-sm text-red-500 hover:bg-red-50">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Idea Card ────────────────────────────────────────────────────────────────

function IdeaCard({ idea, onClick }: { idea: any; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-[#C8102E]/30 transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-2 h-2 rounded-full shrink-0 ${PRIORITY_DOTS[idea.priority]}`} />
          <span className="font-semibold text-sm text-[#0D0D0D] truncate group-hover:text-[#C8102E] transition-colors">
            {idea.title}
          </span>
        </div>
        {idea.task_id && <CheckCircle2 size={14} className="text-green-500 shrink-0" />}
      </div>

      {idea.short_desc && (
        <p className="text-xs text-gray-500 mb-2.5 line-clamp-2">{idea.short_desc}</p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full border border-gray-100">{idea.category}</span>
        <Badge label={idea.status} cls={`text-[10px] ${STATUS_COLORS[idea.status] || 'bg-gray-50 text-gray-500 border-gray-200'}`} />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {idea.tags?.slice(0, 3).map((t: string) => (
            <span key={t} className="text-[9px] px-1.5 py-0.5 bg-[#faf8f2] text-[#C8102E] rounded-full">{t}</span>
          ))}
        </div>
        <span className="text-[10px] text-gray-400">{fmt(idea.created_at)}</span>
      </div>
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

interface Props {
  profile: Profile | null
  refreshKey?: number
  onRefresh?: () => void
}

export function FounderBrainPage({ profile, refreshKey, onRefresh }: Props) {
  const supabase = createClient()
  const [ideas, setIdeas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [sortBy, setSortBy] = useState<'date' | 'priority'>('date')
  const [quickTitle, setQuickTitle] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)
  const [modalIdea, setModalIdea] = useState<any | null>(null)  // null=closed, {}=new, idea=edit
  const [detailIdea, setDetailIdea] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [converting, setConverting] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    if (!profile?.id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('founder_ideas')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    if (error) {
      showToast('Hiba: ' + error.message)
    }
    setIdeas(data || [])
    setLoading(false)
  }, [profile?.id])

  useEffect(() => { load() }, [load, refreshKey])

  const reload = async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('founder_ideas')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    setIdeas(data || [])
  }

  const visible = ideas.filter(i => {
    if (i.archived !== showArchived) return false
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) && !(i.short_desc || '').toLowerCase().includes(search.toLowerCase())) return false
    if (filterCat && i.category !== filterCat) return false
    if (filterStatus && i.status !== filterStatus) return false
    if (filterPriority && i.priority !== filterPriority) return false
    return true
  }).sort((a, b) => {
    if (sortBy === 'priority') {
      return PRIORITIES.indexOf(b.priority) - PRIORITIES.indexOf(a.priority)
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const stats = {
    total:     ideas.filter(i => !i.archived).length,
    active:    ideas.filter(i => !i.archived && !['Megvalósítva','Elvetve'].includes(i.status)).length,
    planned:   ideas.filter(i => !i.archived && i.status === 'Tervezett').length,
    indev:     ideas.filter(i => !i.archived && i.status === 'Fejlesztés alatt').length,
    done:      ideas.filter(i => i.status === 'Megvalósítva').length,
  }

  const quickSave = async () => {
    if (!quickTitle.trim() || !profile?.id) return
    setQuickSaving(true)
    const { error } = await supabase.from('founder_ideas').insert({
      user_id: profile.id, title: quickTitle.trim(),
      category: 'Egyéb', priority: 'Közepes', status: 'Ötlet',
    })
    if (error) {
      showToast('Hiba: ' + error.message)
      setQuickSaving(false)
      return
    }
    setQuickTitle('')
    await reload()
    showToast('Ötlet rögzítve!')
    setQuickSaving(false)
  }

  const saveIdea = async (form: any) => {
    if (!profile?.id) return
    setSaving(true)
    let error: any
    if (modalIdea?.id) {
      ;({ error } = await supabase.from('founder_ideas').update(form).eq('id', modalIdea.id))
    } else {
      ;({ error } = await supabase.from('founder_ideas').insert({ ...form, user_id: profile.id }))
    }
    setSaving(false)
    if (error) { showToast('Hiba: ' + error.message); return }
    setModalIdea(null)
    await reload()
    showToast(modalIdea?.id ? 'Ötlet frissítve' : 'Ötlet mentve!')
  }

  const deleteIdea = async (id: string) => {
    if (!confirm('Biztosan törlöd ezt az ötletet?')) return
    await supabase.from('founder_ideas').delete().eq('id', id)
    setDetailIdea(null)
    await reload()
    showToast('Ötlet törölve')
  }

  const archiveIdea = async (idea: any) => {
    await supabase.from('founder_ideas').update({ archived: !idea.archived }).eq('id', idea.id)
    setDetailIdea(null)
    await reload()
    showToast(idea.archived ? 'Visszaállítva' : 'Archiválva')
  }

  const convertToTask = async (idea: any) => {
    if (!profile?.id) return
    setConverting(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('tasks').insert({
      title: idea.title,
      description: idea.description || idea.short_desc || null,
      priority: TASK_PRIORITY_MAP[idea.priority] || 'normal',
      status: 'open',
      task_type: 'general',
      created_by: user?.id || null,
      is_template: false,
    }).select('id').single()

    if (error) {
      showToast('Hiba a feladat létrehozásakor: ' + error.message)
    } else if (data) {
      await supabase.from('founder_ideas').update({
        task_id: data.id,
        status: idea.status === 'Ötlet' ? 'Tervezett' : idea.status,
      }).eq('id', idea.id)
      await reload()
      setDetailIdea({ ...idea, task_id: data.id })
      showToast('Feladat sikeresen létrehozva!')
    }
    setConverting(false)
  }

  if (profile?.role !== 'super_admin') {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <p>Ez a modul csak az alapítónak elérhető.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4">

      {/* Header */}
      <div className="bg-gradient-to-br from-[#0D0D0D] to-[#1a3060] rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-[#C8102E] rounded-xl flex items-center justify-center">
            <Brain size={20} className="text-[#0D0D0D]" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Founder Brain</h1>
            <p className="text-xs text-white/60">Személyes ötlet- és üzletépítési központ</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Összes ötlet"    value={stats.total}   icon={Lightbulb}  color="bg-purple-100 text-purple-600" />
        <StatCard label="Aktív"           value={stats.active}  icon={Zap}        color="bg-blue-100 text-blue-600" />
        <StatCard label="Tervezett"       value={stats.planned} icon={Star}        color="bg-yellow-100 text-yellow-600" />
        <StatCard label="Fejlesztés alatt" value={stats.indev}  icon={TrendingUp} color="bg-orange-100 text-orange-600" />
        <StatCard label="Megvalósítva"    value={stats.done}    icon={CheckCircle2} color="bg-green-100 text-green-600" />
      </div>

      {/* Quick add */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 mb-2">💡 Mi jutott eszedbe?</p>
        <div className="flex gap-2">
          <input
            value={quickTitle}
            onChange={e => setQuickTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && quickSave()}
            placeholder="Ötlet gyors rögzítése..."
            className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C8102E]/30 focus:border-[#C8102E]"
          />
          <button
            onClick={quickSave}
            disabled={!quickTitle.trim() || quickSaving}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#C8102E] text-white rounded-xl text-sm font-semibold hover:bg-[#b8943f] disabled:opacity-60 whitespace-nowrap"
          >
            {quickSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Mentés
          </button>
          <button
            onClick={() => setModalIdea({})}
            className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 whitespace-nowrap"
          >
            <Edit2 size={13} /> Részletes
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Keresés..."
              className="w-full pl-7 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C8102E]/30 focus:border-[#C8102E]"
            />
          </div>
          {[
            { value: filterCat, onChange: setFilterCat, options: CATEGORIES, placeholder: 'Kategória' },
            { value: filterStatus, onChange: setFilterStatus, options: STATUSES, placeholder: 'Státusz' },
            { value: filterPriority, onChange: setFilterPriority, options: PRIORITIES, placeholder: 'Prioritás' },
          ].map((f, i) => (
            <div key={i} className="relative">
              <select
                value={f.value}
                onChange={e => f.onChange(e.target.value)}
                className="pl-3 pr-7 py-2 text-sm border border-gray-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-[#C8102E]/30 focus:border-[#C8102E] bg-white"
              >
                <option value="">{f.placeholder}</option>
                {f.options.map(o => <option key={o}>{o}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          ))}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="pl-3 pr-7 py-2 text-sm border border-gray-200 rounded-lg appearance-none focus:outline-none bg-white"
          >
            <option value="date">↓ Dátum</option>
            <option value="priority">↓ Prioritás</option>
          </select>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${showArchived ? 'bg-[#faf8f2] border-[#C8102E]/30 text-[#C8102E]' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            <Archive size={13} /> Archív
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-[#C8102E]" /></div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Brain size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">{ideas.length === 0 ? 'Még nincs ötlet. Rögzítsd az elsőt!' : 'Nincs találat a szűrőkre.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map(idea => (
            <IdeaCard key={idea.id} idea={idea} onClick={() => setDetailIdea(idea)} />
          ))}
        </div>
      )}

      {/* Modals */}
      {modalIdea !== null && (
        <IdeaModal
          idea={modalIdea?.id ? modalIdea : null}
          onClose={() => setModalIdea(null)}
          onSave={saveIdea}
          saving={saving}
        />
      )}

      {detailIdea && (
        <IdeaDetail
          idea={detailIdea}
          onClose={() => setDetailIdea(null)}
          onEdit={() => { setModalIdea(detailIdea); setDetailIdea(null) }}
          onDelete={() => deleteIdea(detailIdea.id)}
          onArchive={() => archiveIdea(detailIdea)}
          onConvertToTask={() => convertToTask(detailIdea)}
          converting={converting}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#0D0D0D] text-white text-sm px-5 py-2.5 rounded-full shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
