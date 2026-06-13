'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import {
  Upload, Search, FileText, Image, FolderOpen, Car, Wrench, FileCheck,
  Receipt, Package, HardDrive, X, Download, Eye, ChevronRight, Plus,
  AlertCircle, RefreshCw, Tag, Calendar, User, Hash
} from 'lucide-react'

// ─── Categories ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',        label: 'Összes',          icon: FolderOpen,  color: '#4a4a4a' },
  { id: 'workorder',  label: 'Munkalabok',       icon: Wrench,      color: '#0D0D0D' },
  { id: 'quote',      label: 'Árajánlatok',      icon: FileText,    color: '#2563eb' },
  { id: 'invoice',    label: 'Számlák',          icon: Receipt,     color: '#16a34a' },
  { id: 'checkin',    label: 'Átvételi jkv.',    icon: FileCheck,   color: '#7c3aed' },
  { id: 'checkout',   label: 'Kiadási jkv.',     icon: FileCheck,   color: '#db2777' },
  { id: 'photo',      label: 'Fotók',            icon: Image,       color: '#ea580c' },
  { id: 'vehicle',    label: 'Jármű dok.',       icon: Car,         color: '#0891b2' },
  { id: 'other',      label: 'Egyéb',            icon: Package,     color: '#888888' },
]

const FILENAME_HINTS: { pattern: RegExp; category: string }[] = [
  { pattern: /arbeitsauftrag|work.?order|munkalap/i,  category: 'workorder' },
  { pattern: /angebot|quote|quotation|árajánlat/i,    category: 'quote' },
  { pattern: /rechnung|invoice|számla/i,              category: 'invoice' },
  { pattern: /eingang|check.?in|átvétel/i,            category: 'checkin' },
  { pattern: /ausgang|check.?out|kiadás/i,            category: 'checkout' },
  { pattern: /foto|photo|kép|bild/i,                  category: 'photo' },
  { pattern: /fahrzeug|vehicle|jármű/i,               category: 'vehicle' },
]

function detectCategory(filename: string): string {
  for (const h of FILENAME_HINTS) {
    if (h.pattern.test(filename)) return h.category
  }
  return 'other'
}

function formatBytes(b: number) {
  if (b < 1024) return b + ' B'
  if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
  return (b / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────
function UploadModal({ open, onClose, onSuccess }: {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const supabase = createClient()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [category, setCategory] = useState('other')
  const [description, setDescription] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [customerId, setCustomerId] = useState('')
  const [vehicleId, setVehicleId] = useState('')
  const [workOrderId, setWorkOrderId] = useState('')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!open) return
    supabase.from('customers').select('id,full_name').order('full_name').then(({ data }) => setCustomers(data || []))
    supabase.from('vehicles').select('id,license_plate,make,model').order('license_plate').then(({ data }) => setVehicles(data || []))
    supabase.from('work_orders').select('id,order_number').order('created_at', { ascending: false }).limit(50).then(({ data }) => setWorkOrders(data || []))
  }, [open])

  const handleFile = (f: File) => {
    setFile(f)
    setName(f.name.replace(/\.[^.]+$/, ''))
    setCategory(detectCategory(f.name))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const ext = file.name.split('.').pop()
      const path = `documents/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()
      const { error: insErr } = await supabase.from('documents').insert({
        name: name || file.name,
        category,
        doc_type: category,
        description: description || null,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        customer_id: customerId || null,
        vehicle_id: vehicleId || null,
        work_order_id: workOrderId || null,
        uploaded_by: user?.id,
        uploaded_by_name: profile?.full_name || user?.email || 'Ismeretlen',
        source_module: 'manual',
      })
      if (insErr) throw insErr
      toast('Dokumentum feltöltve!')
      setFile(null); setName(''); setCategory('other'); setDescription('')
      setCustomerId(''); setVehicleId(''); setWorkOrderId('')
      onSuccess()
      onClose()
    } catch (e: any) {
      toast('Hiba: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  if (!open) return null

  const CatBtn = ({ id, label, icon: Icon, color }: typeof CATEGORIES[0]) => (
    <button
      type="button"
      onClick={() => setCategory(id)}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
        category === id ? 'text-white border-transparent' : 'bg-white text-[#4a4a4a] border-gray-200 hover:border-[#C8102E]'
      }`}
      style={category === id ? { backgroundColor: color, borderColor: color } : {}}
    >
      <Icon size={12} />
      {label}
    </button>
  )

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0D0D0D]">Dokumentum feltöltése</h2>
          <button onClick={onClose} className="text-[#888888] hover:text-[#0D0D0D]"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#C8102E] transition-colors"
          >
            {file ? (
              <div className="flex items-center justify-center gap-2 text-[#0D0D0D]">
                <FileText size={20} className="text-[#C8102E]" />
                <span className="font-medium text-sm">{file.name}</span>
                <span className="text-xs text-[#888888]">({formatBytes(file.size)})</span>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto text-[#888888] mb-2" />
                <p className="text-sm text-[#4a4a4a]">Húzd ide a fájlt, vagy kattints a böngészéshez</p>
                <p className="text-xs text-[#888888] mt-1">PDF, JPG, PNG, DOCX — max. 50 MB</p>
              </>
            )}
            <input ref={fileRef} type="file" className="hidden" accept="*/*" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a4a] mb-1">Dokumentum neve</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="pl. Arbeitsauftrag_2025-06_BMW" />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a4a] mb-2">Kategória</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => <CatBtn key={cat.id} {...cat} />)}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#4a4a4a] mb-1">Megjegyzés (opcionális)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#0D0D0D] resize-none focus:outline-none focus:ring-2 focus:ring-[#C8102E]/40"
              rows={2}
              placeholder="Rövid leírás..."
            />
          </div>

          {/* Relations */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#4a4a4a] mb-1">Ügyfél</label>
              <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-[#0D0D0D] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/40">
                <option value="">–</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4a4a4a] mb-1">Jármű</label>
              <select value={vehicleId} onChange={e => setVehicleId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-[#0D0D0D] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/40">
                <option value="">–</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.license_plate} {v.make}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#4a4a4a] mb-1">Munkalap</label>
              <select value={workOrderId} onChange={e => setWorkOrderId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-[#0D0D0D] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/40">
                <option value="">–</option>
                {workOrders.map(w => <option key={w.id} value={w.id}>{w.order_number}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose}>Mégse</Button>
          <Button variant="primary" onClick={handleUpload} disabled={!file || uploading}>
            <Upload size={13} /> {uploading ? 'Feltöltés...' : 'Feltöltés'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Document Detail Drawer ───────────────────────────────────────────────────
function DocDetail({ doc, onClose, onDelete }: { doc: any; onClose: () => void; onDelete: () => void }) {
  const supabase = createClient()
  const { toast } = useToast()
  const [deleting, setDeleting] = useState(false)
  const cat = CATEGORIES.find(c => c.id === doc.category) || CATEGORIES[CATEGORIES.length - 1]
  const CatIcon = cat.icon
  const isImage = doc.file_type?.startsWith('image/')

  const handleDelete = async () => {
    if (!confirm('Biztosan törlöd ezt a dokumentumot?')) return
    setDeleting(true)
    await supabase.from('documents').delete().eq('id', doc.id)
    toast('Dokumentum törölve')
    onDelete()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex justify-end" onClick={onClose}>
      <div className="bg-white w-full max-w-sm shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CatIcon size={16} style={{ color: cat.color }} />
            <span className="font-bold text-[#0D0D0D] text-sm">{doc.name}</span>
          </div>
          <button onClick={onClose} className="text-[#888888] hover:text-[#0D0D0D]"><X size={16} /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* DOC-ID badge */}
          <div className="flex items-center gap-2">
            <span className="bg-[#0D0D0D] text-white text-xs font-mono px-2 py-0.5 rounded">{doc.doc_id}</span>
            <span className="text-xs text-[#888888]">{formatDate(doc.created_at)}</span>
          </div>

          {/* Preview */}
          {isImage && doc.file_url && (
            <img src={doc.file_url} alt={doc.name} className="w-full rounded-lg border border-gray-100 max-h-48 object-contain" />
          )}

          {/* Meta */}
          <div className="space-y-2 text-sm">
            {doc.description && (
              <p className="text-[#4a4a4a] text-xs bg-[#F4F5F7] rounded-lg p-2">{doc.description}</p>
            )}
            <MetaRow icon={Tag} label="Kategória" value={cat.label} />
            {doc.file_size && <MetaRow icon={HardDrive} label="Méret" value={formatBytes(doc.file_size)} />}
            {doc.uploaded_by_name && <MetaRow icon={User} label="Feltöltötte" value={doc.uploaded_by_name} />}
            {doc.customers?.full_name && <MetaRow icon={User} label="Ügyfél" value={doc.customers.full_name} />}
            {doc.vehicles?.license_plate && <MetaRow icon={Car} label="Jármű" value={`${doc.vehicles.license_plate} ${doc.vehicles.make || ''}`} />}
            {doc.work_orders?.order_number && <MetaRow icon={Wrench} label="Munkalap" value={doc.work_orders.order_number} />}
            {doc.version > 1 && <MetaRow icon={Hash} label="Verzió" value={`v${doc.version}`} />}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            {doc.file_url && (
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="primary" size="sm" className="w-full">
                  <Download size={13} /> Letöltés
                </Button>
              </a>
            )}
            {doc.file_url && (
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="secondary" size="sm" className="w-full">
                  <Eye size={13} /> Megtekintés
                </Button>
              </a>
            )}
          </div>
          <Button variant="secondary" size="sm" className="w-full text-red-500 hover:text-red-600" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Törlés...' : 'Dokumentum törlése'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function MetaRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={13} className="text-[#888888] shrink-0" />
      <span className="text-[#888888] text-xs w-20 shrink-0">{label}</span>
      <span className="text-[#0D0D0D] text-xs font-medium truncate">{value}</span>
    </div>
  )
}

// ─── Doc Card ─────────────────────────────────────────────────────────────────
function DocCard({ doc, onClick }: { doc: any; onClick: () => void }) {
  const cat = CATEGORIES.find(c => c.id === doc.category) || CATEGORIES[CATEGORIES.length - 1]
  const CatIcon = cat.icon
  const isImage = doc.file_type?.startsWith('image/')

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer hover:border-[#C8102E] hover:shadow-md transition-all group"
    >
      {/* Thumbnail or color header */}
      <div className="h-24 relative overflow-hidden" style={{ backgroundColor: cat.color + '18' }}>
        {isImage && doc.file_url ? (
          <img src={doc.file_url} alt={doc.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full">
            <CatIcon size={32} style={{ color: cat.color }} className="opacity-40" />
          </div>
        )}
        {doc.needs_review && (
          <div className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
            REVIEW
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-semibold text-[#0D0D0D] truncate group-hover:text-[#C8102E] transition-colors">{doc.name}</p>
        <p className="text-[10px] text-[#888888] mt-0.5 font-mono">{doc.doc_id}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-[#888888]">{formatDate(doc.created_at)}</span>
          {doc.file_size && <span className="text-[10px] text-[#888888]">{formatBytes(doc.file_size)}</span>}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function DocumentsPage({ refreshKey, onRefresh }: { refreshKey?: number; onRefresh?: () => void }) {
  const supabase = createClient()
  const { toast } = useToast()
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tableReady, setTableReady] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null)
  const [stats, setStats] = useState({ total: 0, today: 0, photos: 0, workorders: 0, quotes: 0, review: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('documents')
      .select(`
        *,
        customers(full_name),
        vehicles(license_plate, make, model),
        work_orders(order_number)
      `)
      .order('created_at', { ascending: false })

    if (activeCategory !== 'all') q = q.eq('category', activeCategory)
    if (search.trim()) {
      q = q.or(`name.ilike.%${search}%,doc_id.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data, error } = await q.limit(200)

    if (error) {
      if (error.code === '42P01') {
        setTableReady(false)
      } else {
        toast('Hiba a betöltéskor: ' + error.message)
      }
      setLoading(false)
      return
    }

    setTableReady(true)
    setDocs(data || [])

    // Stats
    const today = new Date().toISOString().slice(0, 10)
    const all = data || []
    setStats({
      total: all.length,
      today: all.filter((d: any) => d.created_at?.startsWith(today)).length,
      photos: all.filter((d: any) => d.category === 'photo').length,
      workorders: all.filter((d: any) => d.category === 'workorder').length,
      quotes: all.filter((d: any) => d.category === 'quote').length,
      review: all.filter((d: any) => d.needs_review).length,
    })
    setLoading(false)
  }, [activeCategory, search])

  useEffect(() => { load() }, [load, refreshKey])

  // ─── Table not ready ───────────────────────────────────────────────────────
  if (!tableReady) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <AlertCircle size={36} className="text-amber-400" />
        <div>
          <p className="font-semibold text-[#0D0D0D]">A documents tábla nem létezik</p>
          <p className="text-sm text-[#4a4a4a] mt-1">Futtasd le a <code className="bg-gray-100 px-1 rounded">supabase/documents.sql</code> fájlt a Supabase SQL Editorban.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw size={13} /> Újrapróbálás
        </Button>
      </div>
    )
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-48 shrink-0 border-r border-gray-100 bg-[#F8F9FB] py-4 gap-0.5 px-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          const isActive = activeCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left ${
                isActive ? 'bg-[#0D0D0D] text-white' : 'text-[#4a4a4a] hover:bg-white hover:text-[#0D0D0D]'
              }`}
            >
              <Icon size={14} style={{ color: isActive ? '#fff' : cat.color }} />
              {cat.label}
            </button>
          )
        })}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search size={15} className="text-[#888888] shrink-0" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Keresés név, DOC-ID, leírás alapján…"
              className="border-0 shadow-none px-0 focus:ring-0 text-sm"
            />
          </div>
          {/* Mobile category */}
          <select
            value={activeCategory}
            onChange={e => setActiveCategory(e.target.value)}
            className="lg:hidden border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-[#0D0D0D] focus:outline-none"
          >
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <Button variant="primary" size="sm" onClick={() => setUploadOpen(true)}>
            <Plus size={13} /> Feltöltés
          </Button>
          <button onClick={load} className="text-[#888888] hover:text-[#0D0D0D] transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Stats bar */}
        <div className="flex gap-4 px-4 py-2.5 border-b border-gray-50 bg-[#F8F9FB] shrink-0 overflow-x-auto text-xs text-[#4a4a4a]">
          <StatPill label="Összes" value={stats.total} />
          <StatPill label="Mai" value={stats.today} accent />
          <StatPill label="Fotó" value={stats.photos} />
          <StatPill label="Munkalap" value={stats.workorders} />
          <StatPill label="Árajánlat" value={stats.quotes} />
          {stats.review > 0 && <StatPill label="Ellenőrzendő" value={stats.review} warn />}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-[#888888] text-sm">Betöltés...</div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-[#888888]">
              <FolderOpen size={32} className="opacity-30" />
              <p className="text-sm">Nincsenek dokumentumok</p>
              <Button variant="secondary" size="sm" onClick={() => setUploadOpen(true)}>
                <Plus size={13} /> Első feltöltés
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {docs.map(doc => (
                <DocCard key={doc.id} doc={doc} onClick={() => setSelectedDoc(doc)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload modal */}
      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={load} />

      {/* Detail drawer */}
      {selectedDoc && (
        <DocDetail
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onDelete={() => { setSelectedDoc(null); load() }}
        />
      )}
    </div>
  )
}

function StatPill({ label, value, accent, warn }: { label: string; value: number; accent?: boolean; warn?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 whitespace-nowrap ${warn ? 'text-amber-500' : accent ? 'text-[#0D0D0D] font-semibold' : ''}`}>
      <span className={`text-base font-bold ${warn ? 'text-amber-500' : accent ? 'text-[#C8102E]' : 'text-[#0D0D0D]'}`}>{value}</span>
      {label}
    </div>
  )
}
