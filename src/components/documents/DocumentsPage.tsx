'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { autoSaveDocument, detectCategory, needsReview } from '@/lib/document-auto'
import {
  Upload, Search, FileText, Image, FolderOpen, Car, Wrench, FileCheck,
  Receipt, Package, HardDrive, X, Download, Eye, Plus, AlertCircle,
  RefreshCw, Tag, Calendar, User, Hash, ChevronRight, ChevronDown,
  Layers, FolderTree, LayoutGrid
} from 'lucide-react'

// ─── Categories ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'all',        label: 'Összes',         icon: FolderOpen,  color: '#4a4a4a' },
  { id: 'workorder',  label: 'Munkalabok',      icon: Wrench,      color: '#0D0D0D' },
  { id: 'quote',      label: 'Árajánlatok',     icon: FileText,    color: '#2563eb' },
  { id: 'invoice',    label: 'Számlák',         icon: Receipt,     color: '#16a34a' },
  { id: 'checkin',    label: 'Átvételi jkv.',   icon: FileCheck,   color: '#7c3aed' },
  { id: 'checkout',   label: 'Kiadási jkv.',    icon: FileCheck,   color: '#db2777' },
  { id: 'photo',      label: 'Fotók',           icon: Image,       color: '#ea580c' },
  { id: 'vehicle',    label: 'Jármű dok.',      icon: Car,         color: '#0891b2' },
  { id: 'other',      label: 'Egyéb',           icon: Package,     color: '#888888' },
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

function guessCategory(filename: string): string {
  for (const h of FILENAME_HINTS) if (h.pattern.test(filename)) return h.category
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
function UploadModal({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
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
    const detected = guessCategory(f.name)
    setCategory(detected)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const ext = file.name.split('.').pop()
      const path = `documents/manual/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage.from('documents').upload(path, file)
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path)
      const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user!.id).single()

      // Version check
      let version = 1
      const checkName = name || file.name
      let vq = supabase.from('documents').select('version').eq('name', checkName)
      if (workOrderId) vq = vq.eq('work_order_id', workOrderId)
      else if (customerId) vq = vq.eq('customer_id', customerId)
      const { data: existing } = await vq.order('version', { ascending: false }).limit(1)
      if (existing?.length) version = (existing[0].version || 1) + 1

      const finalName = version > 1 ? `${checkName} v${version}` : checkName
      const finalCategory = detectCategory(finalName, 'manual')
      const review = needsReview(finalName, 'manual') && !customerId && !workOrderId

      const { error: insErr } = await supabase.from('documents').insert({
        name: finalName,
        category: category || finalCategory,
        doc_type: category || finalCategory,
        description: description || null,
        file_url: publicUrl,
        file_type: file.type,
        file_size: file.size,
        version,
        customer_id: customerId || null,
        vehicle_id: vehicleId || null,
        work_order_id: workOrderId || null,
        uploaded_by: user?.id,
        uploaded_by_name: profile?.full_name || user?.email || 'Ismeretlen',
        source_module: 'manual',
        needs_review: review,
      })
      if (insErr) throw insErr
      toast(version > 1 ? `Dokumentum mentve (v${version})` : 'Dokumentum feltöltve!')
      setFile(null); setName(''); setCategory('other'); setDescription('')
      setCustomerId(''); setVehicleId(''); setWorkOrderId('')
      onSuccess(); onClose()
    } catch (e: any) {
      toast('Hiba: ' + e.message)
    } finally {
      setUploading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-bold text-[#0D0D0D]">Dokumentum feltöltése</h2>
          <button onClick={onClose} className="text-[#888] hover:text-[#0D0D0D]"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Drop zone */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]) }}
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#C8102E] transition-colors"
          >
            {file ? (
              <div className="flex items-center justify-center gap-2 text-[#0D0D0D]">
                <FileText size={20} className="text-[#C8102E]" />
                <span className="font-medium text-sm">{file.name}</span>
                <span className="text-xs text-[#888]">({formatBytes(file.size)})</span>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto text-[#888] mb-2" />
                <p className="text-sm text-[#4a4a4a]">Húzd ide a fájlt, vagy kattints a böngészéshez</p>
                <p className="text-xs text-[#888] mt-1">PDF, JPG, PNG, DOCX — max. 50 MB</p>
              </>
            )}
            <input ref={fileRef} type="file" className="hidden" accept="*/*" onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />
          </div>

          {/* Auto-detected category notice */}
          {file && (
            <div className="bg-[#F5F5F5] rounded-xl px-3 py-2 text-xs text-[#4a4a4a] flex items-center gap-2">
              <Tag size={12} className="text-[#C8102E]" />
              Automatikusan felismert kategória: <strong>{CATEGORIES.find(c => c.id === category)?.label || category}</strong>
              {guessCategory(file.name) !== 'other' && ' · forrás: fájlnév alapján'}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#888] uppercase tracking-[1px] mb-1.5">Dokumentum neve</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="pl. Arbeitsauftrag_BMW_2026" />
          </div>

          {/* Category selector */}
          <div>
            <label className="block text-xs font-semibold text-[#888] uppercase tracking-[1px] mb-2">Kategória</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => {
                const Icon = cat.icon
                const isActive = category === cat.id
                return (
                  <button key={cat.id} type="button" onClick={() => setCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      isActive ? 'text-white border-transparent' : 'bg-white text-[#4a4a4a] border-gray-200 hover:border-[#C8102E]'
                    }`}
                    style={isActive ? { backgroundColor: cat.color } : {}}>
                    <Icon size={12} /> {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#888] uppercase tracking-[1px] mb-1.5">Megjegyzés</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-[#0D0D0D] resize-none focus:outline-none focus:ring-2 focus:ring-[#C8102E]/30"
              rows={2} placeholder="Rövid leírás..." />
          </div>

          {/* Relations */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Ügyfél', val: customerId, setVal: setCustomerId, opts: customers, disp: (c: any) => c.full_name },
              { label: 'Jármű',  val: vehicleId,  setVal: setVehicleId,  opts: vehicles, disp: (v: any) => `${v.license_plate} ${v.make}` },
              { label: 'Munkalap', val: workOrderId, setVal: setWorkOrderId, opts: workOrders, disp: (w: any) => w.order_number },
            ].map(({ label, val, setVal, opts, disp }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-[#888] mb-1">{label}</label>
                <select value={val} onChange={e => setVal(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-2 py-1.5 text-xs text-[#0D0D0D] focus:outline-none focus:ring-2 focus:ring-[#C8102E]/30">
                  <option value="">–</option>
                  {opts.map((o: any) => <option key={o.id} value={o.id}>{disp(o)}</option>)}
                </select>
              </div>
            ))}
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
            <CatIcon size={15} style={{ color: cat.color }} />
            <span className="font-bold text-[#0D0D0D] text-sm truncate max-w-[200px]">{doc.name}</span>
          </div>
          <button onClick={onClose} className="text-[#888] hover:text-[#0D0D0D]"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4">

          {/* DOC-ID */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-[#0D0D0D] text-white text-xs font-mono px-2.5 py-1 rounded-lg">{doc.doc_id}</span>
            {doc.version > 1 && <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded">v{doc.version}</span>}
            {doc.needs_review && <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded">ELLENŐRZÉS</span>}
            <span className="text-xs text-[#888]">{formatDate(doc.created_at)}</span>
          </div>

          {/* Logical path */}
          <div className="bg-[#F5F5F5] rounded-xl px-3 py-2 text-[11px] text-[#4a4a4a] font-mono">
            {doc.customers?.full_name && <span>{doc.customers.full_name}</span>}
            {doc.vehicles?.license_plate && <span> / {doc.vehicles.license_plate} {doc.vehicles.make}</span>}
            {doc.work_orders?.order_number && <span> / {doc.work_orders.order_number}</span>}
            {!doc.customers?.full_name && !doc.work_orders?.order_number && <span className="text-[#888]">Nincs kapcsolat</span>}
          </div>

          {/* Image preview */}
          {isImage && doc.file_url && (
            <img src={doc.file_url} alt={doc.name} className="w-full rounded-xl border border-gray-100 max-h-48 object-contain" />
          )}

          {doc.description && <p className="text-[#4a4a4a] text-xs bg-[#F5F5F5] rounded-xl p-3">{doc.description}</p>}

          {/* Meta rows */}
          <div className="space-y-2">
            <MetaRow icon={Tag}      label="Kategória"  value={cat.label} />
            {doc.file_size    && <MetaRow icon={HardDrive} label="Méret"      value={formatBytes(doc.file_size)} />}
            {doc.source_module && <MetaRow icon={Layers}   label="Forrás"     value={doc.source_module} />}
            {doc.uploaded_by_name && <MetaRow icon={User} label="Feltöltötte" value={doc.uploaded_by_name} />}
            {doc.customers?.full_name && <MetaRow icon={User} label="Ügyfél" value={doc.customers.full_name} />}
            {doc.vehicles?.license_plate && <MetaRow icon={Car} label="Jármű" value={`${doc.vehicles.license_plate} ${doc.vehicles.make || ''}`} />}
            {doc.work_orders?.order_number && <MetaRow icon={Wrench} label="Munkalap" value={doc.work_orders.order_number} />}
          </div>

          {/* IDs section */}
          <div className="space-y-1 border-t border-gray-100 pt-3">
            <p className="text-[10px] font-semibold text-[#888] uppercase tracking-[1px] mb-2">Azonosítók</p>
            {[
              { label: 'DOC', val: doc.doc_id },
              { label: 'Ügyfél ID', val: doc.customer_id },
              { label: 'Jármű ID', val: doc.vehicle_id },
              { label: 'Munkalap ID', val: doc.work_order_id },
              { label: 'Ajánlat ID', val: doc.quote_id },
              { label: 'Számla ID', val: doc.invoice_id },
            ].filter(r => r.val).map(r => (
              <div key={r.label} className="flex items-center gap-2">
                <span className="text-[10px] text-[#888] w-20 shrink-0">{r.label}</span>
                <span className="text-[10px] font-mono text-[#0D0D0D] truncate">{r.val}</span>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {doc.file_url && (
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="primary" size="sm" className="w-full"><Download size={13} /> Letöltés</Button>
              </a>
            )}
            {doc.file_url && (
              <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button variant="secondary" size="sm" className="w-full"><Eye size={13} /> Megtekintés</Button>
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
      <Icon size={12} className="text-[#888] shrink-0" />
      <span className="text-[#888] text-xs w-20 shrink-0">{label}</span>
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
    <div onClick={onClick}
      className="bg-white rounded-xl border border-gray-100 overflow-hidden cursor-pointer hover:border-[#C8102E] hover:shadow-md transition-all group">
      <div className="h-20 relative overflow-hidden" style={{ backgroundColor: cat.color + '18' }}>
        {isImage && doc.file_url
          ? <img src={doc.file_url} alt={doc.name} className="w-full h-full object-cover" />
          : <div className="flex items-center justify-center h-full">
              <CatIcon size={28} style={{ color: cat.color }} className="opacity-35" />
            </div>}
        {doc.needs_review && (
          <div className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">!</div>
        )}
        {doc.version > 1 && (
          <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">v{doc.version}</div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs font-semibold text-[#0D0D0D] truncate group-hover:text-[#C8102E] transition-colors">{doc.name}</p>
        <p className="text-[10px] text-[#888] mt-0.5 font-mono">{doc.doc_id}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-[#888]">{formatDate(doc.created_at)}</span>
          {doc.file_size && <span className="text-[10px] text-[#888]">{formatBytes(doc.file_size)}</span>}
        </div>
        {/* Relation breadcrumb */}
        {(doc.customers?.full_name || doc.work_orders?.order_number) && (
          <div className="text-[9px] text-[#888] mt-1 truncate">
            {[doc.customers?.full_name, doc.vehicles?.license_plate, doc.work_orders?.order_number].filter(Boolean).join(' › ')}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Hierarchical tree view ───────────────────────────────────────────────────
function TreeView({ docs, onSelect }: { docs: any[]; onSelect: (doc: any) => void }) {
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set())
  const [expandedVehicles, setExpandedVehicles] = useState<Set<string>>(new Set())
  const [expandedWOs, setExpandedWOs] = useState<Set<string>>(new Set())

  const toggleSet = (set: Set<string>, key: string, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    setter(next)
  }

  // Group: customer → vehicle → work_order → docs
  const tree: Record<string, { customer: any; vehicles: Record<string, { vehicle: any; workOrders: Record<string, { wo: any; docs: any[] }>; loose: any[] }> }> = {}
  const noCustomer: any[] = []

  docs.forEach(doc => {
    const custId = doc.customer_id || '_none'
    if (custId === '_none') { noCustomer.push(doc); return }
    if (!tree[custId]) tree[custId] = { customer: doc.customers, vehicles: {} }
    const vId = doc.vehicle_id || '_none'
    if (!tree[custId].vehicles[vId]) tree[custId].vehicles[vId] = { vehicle: doc.vehicles, workOrders: {}, loose: [] }
    const woId = doc.work_order_id || '_none'
    if (woId !== '_none') {
      if (!tree[custId].vehicles[vId].workOrders[woId]) tree[custId].vehicles[vId].workOrders[woId] = { wo: doc.work_orders, docs: [] }
      tree[custId].vehicles[vId].workOrders[woId].docs.push(doc)
    } else {
      tree[custId].vehicles[vId].loose.push(doc)
    }
  })

  return (
    <div className="space-y-1 text-[13px]">
      {Object.entries(tree).map(([custId, { customer, vehicles }]) => {
        const custOpen = expandedCustomers.has(custId)
        const custName = customer?.full_name || custId
        const custDocCount = Object.values(vehicles).reduce((s, v) => s + v.loose.length + Object.values(v.workOrders).reduce((s2, w) => s2 + w.docs.length, 0), 0)
        return (
          <div key={custId}>
            <button
              onClick={() => toggleSet(expandedCustomers, custId, setExpandedCustomers)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors text-left"
            >
              {custOpen ? <ChevronDown size={14} className="text-[#888] shrink-0" /> : <ChevronRight size={14} className="text-[#888] shrink-0" />}
              <User size={14} className="text-[#888] shrink-0" />
              <span className="font-semibold text-[#0D0D0D] flex-1">{custName}</span>
              <span className="text-[11px] text-[#888] bg-gray-100 px-2 py-0.5 rounded-full">{custDocCount}</span>
            </button>

            {custOpen && Object.entries(vehicles).map(([vId, { vehicle, workOrders, loose }]) => {
              const vOpen = expandedVehicles.has(vId)
              const vName = vehicle ? `${vehicle.license_plate} ${vehicle.make || ''} ${vehicle.model || ''}`.trim() : 'Ismeretlen jármű'
              return (
                <div key={vId} className="ml-6">
                  <button
                    onClick={() => toggleSet(expandedVehicles, vId, setExpandedVehicles)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                  >
                    {vOpen ? <ChevronDown size={13} className="text-[#888] shrink-0" /> : <ChevronRight size={13} className="text-[#888] shrink-0" />}
                    <Car size={13} className="text-[#888] shrink-0" />
                    <span className="text-[#4a4a4a] flex-1">{vName}</span>
                  </button>

                  {vOpen && (
                    <div className="ml-6">
                      {/* Work order groups */}
                      {Object.entries(workOrders).map(([woId, { wo, docs: woDocs }]) => {
                        const woOpen = expandedWOs.has(woId)
                        return (
                          <div key={woId}>
                            <button
                              onClick={() => toggleSet(expandedWOs, woId, setExpandedWOs)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                            >
                              {woOpen ? <ChevronDown size={12} className="text-[#888] shrink-0" /> : <ChevronRight size={12} className="text-[#888] shrink-0" />}
                              <Wrench size={12} className="text-[#888] shrink-0" />
                              <span className="text-[#4a4a4a] text-[12px] flex-1">{wo?.order_number || woId.slice(0, 8)}</span>
                              <span className="text-[10px] text-[#888]">{woDocs.length} dok.</span>
                            </button>
                            {woOpen && woDocs.map(doc => <TreeDocRow key={doc.id} doc={doc} onSelect={onSelect} />)}
                          </div>
                        )
                      })}
                      {/* Loose (no WO) */}
                      {loose.map(doc => <TreeDocRow key={doc.id} doc={doc} onSelect={onSelect} />)}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {noCustomer.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 text-[#888]">
            <FolderOpen size={14} className="shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-[0.8px]">Nem rendezett ({noCustomer.length})</span>
          </div>
          {noCustomer.map(doc => <TreeDocRow key={doc.id} doc={doc} onSelect={onSelect} />)}
        </div>
      )}
    </div>
  )
}

function TreeDocRow({ doc, onSelect }: { doc: any; onSelect: (doc: any) => void }) {
  const cat = CATEGORIES.find(c => c.id === doc.category) || CATEGORIES[CATEGORIES.length - 1]
  const Icon = cat.icon
  return (
    <button
      onClick={() => onSelect(doc)}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#FFF5F5] hover:text-[#C8102E] transition-colors text-left ml-4"
    >
      <Icon size={12} style={{ color: cat.color }} className="shrink-0" />
      <span className="flex-1 text-[12px] text-[#0D0D0D] truncate">{doc.name}</span>
      <span className="text-[10px] font-mono text-[#888] shrink-0">{doc.doc_id}</span>
      {doc.needs_review && <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 rounded font-bold">!</span>}
      {doc.version > 1 && <span className="text-[9px] bg-gray-100 text-gray-600 px-1.5 rounded font-bold">v{doc.version}</span>}
    </button>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type ViewMode = 'grid' | 'tree'

export function DocumentsPage({ refreshKey, onRefresh }: { refreshKey?: number; onRefresh?: () => void }) {
  const supabase = createClient()
  const { toast } = useToast()
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tableReady, setTableReady] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null)
  const [stats, setStats] = useState({ total: 0, today: 0, photos: 0, workorders: 0, quotes: 0, review: 0 })

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('documents')
      .select('*, customers(full_name), vehicles(license_plate,make,model), work_orders(order_number)')
      .order('created_at', { ascending: false })

    if (activeCategory !== 'all') q = q.eq('category', activeCategory)

    // Extended search: name, doc_id, description, customer/vehicle/WO IDs as text
    if (search.trim()) {
      q = q.or([
        `name.ilike.%${search}%`,
        `doc_id.ilike.%${search}%`,
        `description.ilike.%${search}%`,
        `customer_id.eq.${search}`,
        `vehicle_id.eq.${search}`,
        `work_order_id.eq.${search}`,
        `quote_id.eq.${search}`,
        `invoice_id.eq.${search}`,
      ].join(','))
    }

    const { data, error } = await q.limit(300)

    if (error) {
      if (error.code === '42P01') {
        setTableReady(false)
      } else {
        toast('Hiba: ' + error.message)
      }
      setLoading(false)
      return
    }

    setTableReady(true)
    setDocs(data || [])
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

  if (!tableReady) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
      <AlertCircle size={36} className="text-amber-400" />
      <div>
        <p className="font-semibold text-[#0D0D0D]">A documents tábla nem létezik</p>
        <p className="text-sm text-[#4a4a4a] mt-1">Futtasd le a <code className="bg-gray-100 px-1 rounded">supabase/documents.sql</code> fájlt a Supabase SQL Editorban.</p>
      </div>
      <Button variant="secondary" size="sm" onClick={load}><RefreshCw size={13} /> Újrapróbálás</Button>
    </div>
  )

  return (
    <div className="flex h-full min-h-0">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-48 shrink-0 border-r border-gray-100 bg-[#F8F8F8] py-3 gap-0.5 px-2">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon
          const isActive = activeCategory === cat.id
          const count = cat.id === 'all' ? stats.total : docs.filter(d => d.category === cat.id).length
          return (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left ${
                isActive ? 'bg-[#0D0D0D] text-white' : 'text-[#4a4a4a] hover:bg-white hover:text-[#0D0D0D]'
              }`}>
              <Icon size={13} style={{ color: isActive ? '#fff' : cat.color }} />
              <span className="flex-1">{cat.label}</span>
              {count > 0 && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-[#888]'}`}>{count}</span>}
            </button>
          )
        })}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white shrink-0 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] border border-gray-200 rounded-xl px-3">
            <Search size={14} className="text-[#888] shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Keresés: név, DOC-ID, ügyfél, rendszám, munkalap ID..."
              className="flex-1 py-2 text-[13px] bg-transparent outline-none text-[#0D0D0D] placeholder-[#aaa]" />
            {search && <button onClick={() => setSearch('')} className="text-[#888] hover:text-[#0D0D0D]"><X size={13} /></button>}
          </div>

          {/* Mobile category */}
          <select value={activeCategory} onChange={e => setActiveCategory(e.target.value)}
            className="lg:hidden border border-gray-200 rounded-xl px-2 py-2 text-xs text-[#0D0D0D] focus:outline-none">
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          {/* View toggle */}
          <div className="flex border border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-xs transition-colors ${viewMode === 'grid' ? 'bg-[#0D0D0D] text-white' : 'text-[#888] hover:bg-gray-50'}`}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => setViewMode('tree')}
              className={`px-3 py-2 text-xs transition-colors ${viewMode === 'tree' ? 'bg-[#0D0D0D] text-white' : 'text-[#888] hover:bg-gray-50'}`}>
              <FolderTree size={14} />
            </button>
          </div>

          <Button variant="primary" size="sm" onClick={() => setUploadOpen(true)}><Plus size={13} /> Feltöltés</Button>
          <button onClick={load} className="text-[#888] hover:text-[#0D0D0D] transition-colors p-2 rounded-xl hover:bg-gray-50"><RefreshCw size={14} /></button>
        </div>

        {/* Stats bar */}
        <div className="flex gap-5 px-4 py-2.5 border-b border-gray-50 bg-[#F8F8F8] shrink-0 overflow-x-auto text-xs text-[#888]">
          <StatPill label="Összes"  value={stats.total} />
          <StatPill label="Mai"     value={stats.today} accent />
          <StatPill label="Fotó"    value={stats.photos} />
          <StatPill label="Munkalap" value={stats.workorders} />
          <StatPill label="Árajánlat" value={stats.quotes} />
          {stats.review > 0 && <StatPill label="Ellenőrzendő" value={stats.review} warn />}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-[#888] text-sm">Betöltés...</div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-[#888]">
              <FolderOpen size={32} className="opacity-30" />
              <p className="text-sm">Nincs dokumentum</p>
              <Button variant="secondary" size="sm" onClick={() => setUploadOpen(true)}><Plus size={13} /> Első feltöltés</Button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
              {docs.map(doc => <DocCard key={doc.id} doc={doc} onClick={() => setSelectedDoc(doc)} />)}
            </div>
          ) : (
            <TreeView docs={docs} onSelect={setSelectedDoc} />
          )}
        </div>
      </div>

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} onSuccess={load} />
      {selectedDoc && <DocDetail doc={selectedDoc} onClose={() => setSelectedDoc(null)} onDelete={() => { setSelectedDoc(null); load() }} />}
    </div>
  )
}

function StatPill({ label, value, accent, warn }: { label: string; value: number; accent?: boolean; warn?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 whitespace-nowrap ${warn ? 'text-amber-500' : accent ? 'text-[#0D0D0D] font-semibold' : ''}`}>
      <span className={`text-sm font-bold ${warn ? 'text-amber-500' : accent ? 'text-[#C8102E]' : 'text-[#0D0D0D]'}`}>{value}</span>
      {label}
    </div>
  )
}
