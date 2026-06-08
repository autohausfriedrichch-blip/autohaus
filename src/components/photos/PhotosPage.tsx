'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import {
  Camera, Upload, X, CheckCircle, Loader2, Eye, EyeOff,
  ArrowLeft, Trash2, ShieldCheck, Clock, User, FileText,
  ZoomIn, Printer, MessageSquare, ChevronLeft, ChevronRight
} from 'lucide-react'

const CATEGORIES = [
  'check-in', 'sérülés', 'diagnosztika', 'javítás közben',
  'alkatrész', 'check-out', 'detailing előtte', 'detailing utána', 'egyéb'
]

interface FileItem {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

interface Photo {
  id: string
  work_order_id: string
  url: string
  category: string
  is_visible_to_customer: boolean
  confirmed: boolean
  uploaded_by_name: string
  notes: string
  created_at: string
  work_order?: { order_number: string; customer?: { full_name: string }; vehicle?: { license_plate: string } }
}

export function PhotosPage({ refreshKey, profile }: { refreshKey: number; onRefresh: () => void; profile?: any }) {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'gallery' | 'upload'>('gallery')
  const [files, setFiles] = useState<FileItem[]>([])
  const [workOrderId, setWorkOrderId] = useState('')
  const [category, setCategory] = useState('check-in')
  const [visibleToCustomer, setVisibleToCustomer] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [filterWO, setFilterWO] = useState('')
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set())
  const [lightbox, setLightbox] = useState<{ photos: Photo[]; idx: number } | null>(null)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [noteText, setNoteText] = useState('')
  const { toast } = useToast()
  const supabase = createClient()

  const isSuperAdmin = profile?.role === 'super_admin'
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin'
  const isMechanic = profile?.role === 'mechanic'

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: p }, { data: wo }] = await Promise.all([
      supabase.from('work_order_photos')
        .select('*, work_order:work_orders(order_number, customer:customers(full_name), vehicle:vehicles(license_plate))')
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('work_orders')
        .select('id, order_number, customer:customers(full_name), vehicle:vehicles(license_plate)')
        .not('status', 'in', '(closed)')
        .order('created_at', { ascending: false }),
    ])
    setPhotos((p || []) as Photo[])
    const woList = wo || []
    setWorkOrders(woList)
    if (woList.length === 1 && !workOrderId) setWorkOrderId(woList[0].id)
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const items: FileItem[] = Array.from(e.target.files)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({ file: f, status: 'pending' as const }))
    setFiles(prev => [...prev, ...items])
    e.target.value = ''
  }

  const handleUpload = async () => {
    if (!workOrderId) { toast('Válassz munkalapot!', 'error'); return }
    if (!files.length) { toast('Válassz képeket!', 'error'); return }

    setUploading(true)
    const wo = workOrders.find(w => w.id === workOrderId)
    const uploaderName = profile?.full_name || 'Ismeretlen'
    let ok = 0
    const updated = [...files]

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'done') continue
      updated[i] = { ...updated[i], status: 'uploading' }
      setFiles([...updated])

      try {
        const base64 = await toBase64(updated[i].file)
        const { error } = await supabase.from('work_order_photos').insert({
          work_order_id: workOrderId,
          url: base64,
          category,
          is_visible_to_customer: visibleToCustomer,
          confirmed: false,
          uploaded_by_name: uploaderName,
          notes: '',
        })
        if (error) {
          updated[i] = { ...updated[i], status: 'error', error: error.message }
          toast(`Hiba: ${error.message}`, 'error')
        } else {
          updated[i] = { ...updated[i], status: 'done' }
          ok++
        }
      } catch (e: any) {
        updated[i] = { ...updated[i], status: 'error', error: e.message }
        toast(`Hiba: ${e.message}`, 'error')
      }
      setFiles([...updated])
    }

    if (ok > 0) {
      const orderNum = wo?.order_number || ''
      const customerName = wo?.customer?.full_name || ''
      const plate = wo?.vehicle?.license_plate || ''
      const notifMsg = `${uploaderName} új ${category} fotót töltött fel a ${orderNum} munkalaphoz. Ügyfél: ${customerName}${plate ? ', rendszám: ' + plate : ''}.`

      await Promise.all([
        // Notification
        supabase.from('notifications').insert({
          type: 'photo_uploaded',
          title: `${uploaderName} ${ok} fotót töltött fel`,
          message: notifMsg,
          work_order_id: workOrderId,
          created_by: profile?.id || null,
          is_read: false,
        }),
        // Timeline event
        supabase.from('work_order_events').insert({
          work_order_id: workOrderId,
          event_type: 'photo_uploaded',
          title: `${uploaderName} feltöltött ${ok} db ${category} fotót`,
          description: `${ok} db fotó feltöltve – kategória: ${category}. ${visibleToCustomer ? 'Ügyfélnek látható.' : 'Csak belső.'} Rögzítés szükséges.`,
          user_name: uploaderName,
        }),
        // Task for Barbara
        supabase.from('tasks').insert({
          title: `Fotódokumentáció rögzítése – ${orderNum}`,
          description: `${uploaderName} ${ok} db ${category} fotót töltött fel.\nÜgyfél: ${customerName}${plate ? '\nRendszám: ' + plate : ''}\n\nJóváhagyás és rögzítés szükséges a Fotódokumentáció menüben.`,
          priority: 'normal',
          status: 'open',
          work_order_id: workOrderId,
          created_by: profile?.id || null,
        }),
      ])
    }

    setUploading(false)
    if (ok > 0) {
      toast(`✅ ${ok} fotó feltöltve! Értesítés és feladat létrehozva.`)
      load()
      setTimeout(() => { setView('gallery'); setFiles([]) }, 1200)
    }
  }

  const confirmPhoto = async (id: string) => {
    setConfirmingIds(prev => new Set(prev).add(id))
    await supabase.from('work_order_photos').update({ confirmed: true }).eq('id', id)
    await load()
    setConfirmingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    toast('Fotó rögzítve')
  }

  const confirmAllPending = async (woId: string) => {
    const pendingIds = photos.filter(p => p.work_order_id === woId && !p.confirmed).map(p => p.id)
    if (!pendingIds.length) return
    setConfirmingIds(prev => new Set([...prev, ...pendingIds]))
    await supabase.from('work_order_photos').update({ confirmed: true }).in('id', pendingIds)
    // Log timeline event
    const wo = workOrders.find(w => w.id === woId)
    await supabase.from('work_order_events').insert({
      work_order_id: woId,
      event_type: 'photo_confirmed',
      title: `${profile?.full_name || 'Admin'} rögzített ${pendingIds.length} fotót`,
      description: `${pendingIds.length} db fotó jóváhagyva és rögzítve.`,
      user_name: profile?.full_name || 'Admin',
    })
    toast(`✅ ${pendingIds.length} fotó rögzítve!`)
    await load()
    setConfirmingIds(new Set())
  }

  const toggleVisibility = async (id: string, cur: boolean) => {
    await supabase.from('work_order_photos').update({ is_visible_to_customer: !cur }).eq('id', id)
    load()
  }

  const deletePhoto = async (id: string) => {
    if (!confirm('Véglegesen törlöd ezt a fotót?')) return
    await supabase.from('work_order_photos').delete().eq('id', id)
    load()
  }

  const saveNote = async (id: string) => {
    await supabase.from('work_order_photos').update({ notes: noteText }).eq('id', id)
    setEditingNoteId(null)
    setNoteText('')
    load()
    toast('Megjegyzés mentve')
  }

  const printPhotos = (groupPhotos: Photo[]) => {
    const confirmed = groupPhotos.filter(p => p.confirmed)
    if (!confirmed.length) { toast('Nincs rögzített fotó a nyomtatáshoz', 'error'); return }
    const win = window.open('', '_blank')
    if (!win) return
    const wo = confirmed[0]?.work_order
    win.document.write(`<html><head><title>Fotódokumentáció – ${wo?.order_number || ''}</title>
      <style>body{font-family:sans-serif;margin:20px} h1{font-size:16px} .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px} img{width:100%;border:1px solid #ccc;border-radius:4px} .caption{font-size:10px;color:#555;margin-top:4px}</style>
    </head><body>
      <h1>Fotódokumentáció – ${wo?.order_number || ''} | ${wo?.customer?.full_name || ''} | ${wo?.vehicle?.license_plate || ''}</h1>
      <div class="grid">${confirmed.map(p => `<div><img src="${p.url}" /><div class="caption">${p.category} · ${p.uploaded_by_name} · ${new Date(p.created_at).toLocaleString('hu-HU')}${p.notes ? ' · ' + p.notes : ''}</div></div>`).join('')}</div>
    </body></html>`)
    win.document.close()
    win.print()
  }

  const allDone = files.length > 0 && files.every(f => f.status === 'done')
  const filtered = filterWO ? photos.filter(p => p.work_order_id === filterWO) : photos
  const grouped = filtered.reduce((acc: Record<string, Photo[]>, p) => {
    const k = p.work_order?.order_number || 'Ismeretlen'
    if (!acc[k]) acc[k] = []
    acc[k].push(p)
    return acc
  }, {})
  const pendingCount = photos.filter(p => !p.confirmed).length

  // ── LIGHTBOX ─────────────────────────────────────────────────────────────────
  if (lightbox) {
    const ph = lightbox.photos[lightbox.idx]
    return (
      <div className="fixed inset-0 z-50 bg-black/95 flex flex-col" onClick={() => setLightbox(null)}>
        <div className="flex items-center justify-between px-4 py-3" onClick={e => e.stopPropagation()}>
          <div className="text-white text-sm">
            <span className="font-bold">{ph.category}</span>
            <span className="text-white/60 ml-3">{ph.uploaded_by_name}</span>
            <span className="text-white/40 ml-2">{new Date(ph.created_at).toLocaleString('hu-HU')}</span>
            {!ph.confirmed && <span className="ml-3 text-amber-400 text-xs font-semibold">⏳ Függőben</span>}
          </div>
          <div className="flex items-center gap-2">
            {isSuperAdmin && !ph.confirmed && (
              <button onClick={() => confirmPhoto(ph.id)} className="px-3 py-1.5 bg-[#C9A84C] text-[#0B1E3D] text-xs font-bold rounded-lg">
                <ShieldCheck size={13} className="inline mr-1" />Rögzít
              </button>
            )}
            {isAdmin && (
              <button onClick={() => toggleVisibility(ph.id, ph.is_visible_to_customer)}
                className="px-3 py-1.5 bg-white/10 text-white text-xs rounded-lg hover:bg-white/20">
                {ph.is_visible_to_customer ? <><EyeOff size={12} className="inline mr-1" />Elrejt</> : <><Eye size={12} className="inline mr-1" />Látható</>}
              </button>
            )}
            {isSuperAdmin && (
              <button onClick={() => { deletePhoto(ph.id); setLightbox(null) }}
                className="px-3 py-1.5 bg-red-600/80 text-white text-xs rounded-lg hover:bg-red-600">
                <Trash2 size={12} className="inline mr-1" />Töröl
              </button>
            )}
            <button onClick={() => setLightbox(null)} className="text-white/60 hover:text-white p-2">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
          {lightbox.idx > 0 && (
            <button onClick={() => setLightbox(l => l ? { ...l, idx: l.idx - 1 } : null)}
              className="absolute left-2 z-10 text-white/70 hover:text-white p-3 bg-black/30 rounded-full">
              <ChevronLeft size={28} />
            </button>
          )}
          <img src={ph.url} alt={ph.category} className="max-h-full max-w-full object-contain" />
          {lightbox.idx < lightbox.photos.length - 1 && (
            <button onClick={() => setLightbox(l => l ? { ...l, idx: l.idx + 1 } : null)}
              className="absolute right-2 z-10 text-white/70 hover:text-white p-3 bg-black/30 rounded-full">
              <ChevronRight size={28} />
            </button>
          )}
        </div>

        <div className="px-4 py-3 flex items-center gap-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 text-white/50 text-xs">
            {ph.is_visible_to_customer ? <><Eye size={11} className="text-emerald-400" />Ügyfélnek látható</> : <><EyeOff size={11} />Csak belső</>}
          </div>
          {ph.notes && <p className="text-white/70 text-xs flex-1 italic">"{ph.notes}"</p>}
          <span className="text-white/30 text-xs ml-auto">{lightbox.idx + 1} / {lightbox.photos.length}</span>
        </div>
      </div>
    )
  }

  // ── UPLOAD VIEW ──────────────────────────────────────────────────────────────
  if (view === 'upload') {
    return (
      <div className="animate-fade-in max-w-lg mx-auto space-y-4 pb-8">
        <button onClick={() => { setView('gallery'); setFiles([]) }}
          className="flex items-center gap-2 text-sm text-[#5a6a80] hover:text-[#0B1E3D]">
          <ArrowLeft size={16} /> Vissza
        </button>

        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-bold text-[#0B1E3D] text-lg">📷 Fotók feltöltése</h2>

          <div>
            <label className="block text-xs font-semibold text-[#5a6a80] uppercase tracking-wide mb-1.5">Munkalap *</label>
            <select value={workOrderId} onChange={e => setWorkOrderId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white outline-none focus:border-[#0B1E3D]">
              <option value="">Válassz munkalapot...</option>
              {workOrders.map(wo => (
                <option key={wo.id} value={wo.id}>
                  {wo.order_number} – {wo.customer?.full_name}{wo.vehicle?.license_plate ? ` (${wo.vehicle.license_plate})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5a6a80] uppercase tracking-wide mb-1.5">Kategória</label>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-white outline-none focus:border-[#0B1E3D]">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button onClick={() => setVisibleToCustomer(v => !v)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
              visibleToCustomer ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
            {visibleToCustomer ? <Eye size={16} /> : <EyeOff size={16} />}
            {visibleToCustomer ? 'Ügyfélnek látható ✓' : 'Csak belső — ügyfél nem látja'}
          </button>

          <label className="block">
            <div className="flex items-center justify-center gap-3 w-full py-5 bg-[#0B1E3D] hover:bg-[#142a50] text-white rounded-xl font-bold text-base cursor-pointer transition-colors select-none">
              <Camera size={22} /> Képek kiválasztása / Kamera
            </div>
            <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        {files.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#0B1E3D]">{files.length} kép kiválasztva</h3>
              {!uploading && !allDone && (
                <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:underline">Összes törlése</button>
              )}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((item, idx) => (
                <div key={idx} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-sm ${
                  item.status === 'done' ? 'bg-green-50 border-green-200' :
                  item.status === 'error' ? 'bg-red-50 border-red-200' :
                  item.status === 'uploading' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <span className="flex-1 truncate text-[#0B1E3D]">{item.file.name}</span>
                  <span className="text-xs text-[#5a6a80] shrink-0">{(item.file.size/1024/1024).toFixed(1)}MB</span>
                  {item.status === 'uploading' && <Loader2 size={15} className="text-blue-500 animate-spin shrink-0" />}
                  {item.status === 'done' && <CheckCircle size={15} className="text-green-500 shrink-0" />}
                  {item.status === 'error' && <span className="text-xs text-red-500 shrink-0">{item.error}</span>}
                  {item.status === 'pending' && !uploading && (
                    <button onClick={() => setFiles(p => p.filter((_, i) => i !== idx))}><X size={15} className="text-gray-400" /></button>
                  )}
                </div>
              ))}
            </div>

            {!allDone ? (
              <button onClick={handleUpload} disabled={uploading}
                className="w-full py-4 bg-[#C9A84C] hover:bg-[#b8943f] disabled:opacity-50 text-[#0B1E3D] rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors">
                {uploading
                  ? <><Loader2 size={18} className="animate-spin" /> Feltöltés folyamatban...</>
                  : <><Upload size={18} /> {files.filter(f => f.status !== 'done').length} fotó feltöltése</>}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-xl text-green-700 font-semibold">
                <CheckCircle size={18} /> Minden fotó feltöltve! ✅
              </div>
            )}

            {!uploading && !allDone && (
              <label className="block">
                <div className="flex items-center justify-center gap-2 w-full py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-[#5a6a80] cursor-pointer hover:border-[#0B1E3D]">
                  <Camera size={14} /> További képek hozzáadása
                </div>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              </label>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── GALLERY VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in space-y-4">
      {/* Header bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={filterWO} onChange={e => setFilterWO(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-[#0B1E3D]">
          <option value="">Összes munkalap</option>
          {workOrders.map(wo => (
            <option key={wo.id} value={wo.id}>{wo.order_number} – {wo.customer?.full_name}</option>
          ))}
        </select>
        {isAdmin && pendingCount > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-semibold text-amber-700">
            <Clock size={12} /> {pendingCount} rögzítésre vár
          </span>
        )}
        <button onClick={() => setView('upload')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0B1E3D] text-white rounded-lg text-sm font-semibold hover:bg-[#142a50]">
          <Upload size={14} /> Fotó feltöltés
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-[#8fa0b5]">
          <Camera size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Még nincsenek fotók</p>
        </div>
      ) : (
        Object.entries(grouped).map(([orderNum, gPhotos]) => {
          const pendingInGroup = gPhotos.filter(p => !p.confirmed)
          const confirmedInGroup = gPhotos.filter(p => p.confirmed)
          const woId = gPhotos[0]?.work_order_id
          return (
            <div key={orderNum} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {/* Group header */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-[#0B1E3D] text-sm">{orderNum}</span>
                  {gPhotos[0]?.work_order?.customer?.full_name && (
                    <span className="text-xs text-[#5a6a80]">– {gPhotos[0].work_order.customer.full_name}</span>
                  )}
                  {gPhotos[0]?.work_order?.vehicle?.license_plate && (
                    <span className="text-xs font-bold bg-[#0B1E3D] text-white px-2 py-0.5 rounded">{gPhotos[0].work_order.vehicle.license_plate}</span>
                  )}
                  {pendingInGroup.length > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                      {pendingInGroup.length} függőben
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#5a6a80]">{gPhotos.length} fotó</span>
                  {isAdmin && confirmedInGroup.length > 0 && (
                    <button onClick={() => printPhotos(gPhotos)}
                      className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-[#5a6a80] text-xs rounded-lg hover:bg-gray-50">
                      <Printer size={12} /> PDF
                    </button>
                  )}
                  {isSuperAdmin && pendingInGroup.length > 0 && (
                    <button onClick={() => confirmAllPending(woId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B1E3D] hover:bg-[#142a50] text-white text-xs font-bold rounded-lg transition-colors">
                      <ShieldCheck size={13} /> Összes rögzítése ({pendingInGroup.length})
                    </button>
                  )}
                </div>
              </div>

              {/* Photo grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-3">
                {gPhotos.map((p, idx) => {
                  const isOwn = p.uploaded_by_name === profile?.full_name
                  return (
                    <div key={p.id} className={`rounded-xl overflow-hidden border flex flex-col ${
                      !p.confirmed ? 'border-amber-300 bg-amber-50/50' : 'border-gray-100 bg-white'
                    } shadow-sm`}>
                      {/* Thumbnail */}
                      <div className="relative group cursor-pointer" onClick={() => setLightbox({ photos: gPhotos, idx })}>
                        <img
                          src={p.url}
                          alt={p.category}
                          className={`w-full h-28 object-cover transition-opacity ${!p.confirmed ? 'opacity-70' : 'group-hover:opacity-90'}`}
                          loading="lazy"
                        />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                          <ZoomIn size={22} className="text-white drop-shadow" />
                        </div>
                        {!p.confirmed && (
                          <div className="absolute top-1 left-1 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <Clock size={7} /> Függőben
                          </div>
                        )}
                        {p.is_visible_to_customer && p.confirmed && (
                          <div className="absolute top-1 right-1 bg-emerald-500/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                            Ügyfél ✓
                          </div>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="p-2 flex-1 flex flex-col gap-1">
                        <div className="text-[10px] font-semibold text-[#0B1E3D] uppercase truncate">{p.category}</div>
                        <div className="flex items-center gap-1 text-[9px] text-[#8fa0b5]">
                          <User size={8} />
                          <span className="truncate">{p.uploaded_by_name || '–'}</span>
                        </div>
                        <div className="text-[9px] text-[#8fa0b5]">
                          {new Date(p.created_at).toLocaleString('hu-HU', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {p.notes && (
                          <div className="text-[9px] text-[#5a6a80] italic truncate">"{p.notes}"</div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-wrap mt-auto pt-1 border-t border-gray-100">
                          {/* Confirm – super admin only, pending only */}
                          {isSuperAdmin && !p.confirmed && (
                            <button onClick={() => confirmPhoto(p.id)} disabled={confirmingIds.has(p.id)}
                              className="flex items-center gap-0.5 text-[9px] bg-[#0B1E3D] text-white px-1.5 py-1 rounded font-bold hover:bg-[#142a50] disabled:opacity-50">
                              {confirmingIds.has(p.id) ? <Loader2 size={8} className="animate-spin" /> : <ShieldCheck size={8} />}
                              Rögzít
                            </button>
                          )}
                          {/* Visibility – admin only */}
                          {isAdmin && (
                            <button onClick={() => toggleVisibility(p.id, p.is_visible_to_customer)}
                              className={`flex items-center gap-0.5 text-[9px] px-1.5 py-1 rounded font-medium border transition-colors ${
                                p.is_visible_to_customer
                                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                              }`}>
                              {p.is_visible_to_customer ? <Eye size={8} /> : <EyeOff size={8} />}
                              {p.is_visible_to_customer ? 'Látható' : 'Belső'}
                            </button>
                          )}
                          {/* Note – own photos for mechanic, all for admin */}
                          {(isAdmin || isOwn) && (
                            editingNoteId === p.id ? (
                              <div className="flex gap-1 w-full mt-1" onClick={e => e.stopPropagation()}>
                                <input
                                  value={noteText}
                                  onChange={e => setNoteText(e.target.value)}
                                  placeholder="Megjegyzés..."
                                  className="flex-1 text-[10px] border border-gray-200 rounded px-1.5 py-1 outline-none focus:border-[#0B1E3D]"
                                  autoFocus
                                />
                                <button onClick={() => saveNote(p.id)} className="text-[9px] bg-[#C9A84C] text-[#0B1E3D] px-1.5 py-1 rounded font-bold">OK</button>
                                <button onClick={() => setEditingNoteId(null)} className="text-[9px] text-gray-400 px-1 py-1">✕</button>
                              </div>
                            ) : (
                              <button onClick={() => { setEditingNoteId(p.id); setNoteText(p.notes || '') }}
                                className="flex items-center gap-0.5 text-[9px] text-[#5a6a80] hover:text-[#0B1E3D] px-1 py-1 rounded">
                                <MessageSquare size={8} />
                                {p.notes ? 'Szerk.' : 'Megjegyzés'}
                              </button>
                            )
                          )}
                          {/* Delete – super admin only */}
                          {isSuperAdmin && (
                            <button onClick={() => deletePhoto(p.id)} className="ml-auto p-1 rounded hover:bg-red-50">
                              <Trash2 size={9} className="text-[#C9384C]" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
