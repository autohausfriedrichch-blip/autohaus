'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Camera, Upload, X, CheckCircle, Loader2, Eye, EyeOff, ArrowLeft, Trash2, Key } from 'lucide-react'

const CATEGORIES = [
  'check-in', 'sérülés', 'diagnosztika', 'javítás közben',
  'alkatrész', 'check-out', 'detailing előtte', 'detailing utána', 'egyéb'
]

interface FileItem {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

const SK_KEY = 'ag_service_key'

export function PhotosPage({ refreshKey, profile }: { refreshKey: number; onRefresh: () => void; profile?: any }) {
  const [photos, setPhotos] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'gallery' | 'upload' | 'setup'>('gallery')
  const [files, setFiles] = useState<FileItem[]>([])
  const [workOrderId, setWorkOrderId] = useState('')
  const [category, setCategory] = useState('check-in')
  const [visibleToCustomer, setVisibleToCustomer] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [serviceKey, setServiceKey] = useState('')
  const [savedKey, setSavedKey] = useState('')
  const [filterWO, setFilterWO] = useState('')
  const { toast } = useToast()
  const supabase = createClient()
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin'

  useEffect(() => {
    const k = localStorage.getItem(SK_KEY) || ''
    setSavedKey(k)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: p }, { data: wo }] = await Promise.all([
      supabase.from('work_order_photos')
        .select('*, work_order:work_orders(order_number, customer:customers(full_name), vehicle:vehicles(license_plate))')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('work_orders')
        .select('id, order_number, customer:customers(full_name), vehicle:vehicles(license_plate)')
        .not('status', 'in', '(closed)')
        .order('created_at', { ascending: false }),
    ])
    setPhotos(p || [])
    const woList = wo || []
    setWorkOrders(woList)
    if (woList.length === 1 && !workOrderId) setWorkOrderId(woList[0].id)
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const saveKey = () => {
    if (!serviceKey.trim()) return
    localStorage.setItem(SK_KEY, serviceKey.trim())
    setSavedKey(serviceKey.trim())
    setServiceKey('')
    toast('Service key elmentve ✅')
    setView('upload')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const items: FileItem[] = Array.from(e.target.files)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({ file: f, status: 'pending' as const }))
    setFiles(prev => [...prev, ...items])
    e.target.value = ''
  }

  const handleUpload = async () => {
    const key = savedKey
    if (!key) { setView('setup'); return }
    if (!workOrderId) { toast('Válassz munkalapot!', 'error'); return }
    if (!files.length) { toast('Válassz képeket!', 'error'); return }

    setUploading(true)
    const wo = workOrders.find(w => w.id === workOrderId)
    let ok = 0
    const updated = [...files]

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'done') continue
      updated[i] = { ...updated[i], status: 'uploading' }
      setFiles([...updated])

      const fd = new FormData()
      fd.append('file', updated[i].file)
      fd.append('work_order_id', workOrderId)
      fd.append('category', category)
      fd.append('visible_to_customer', String(visibleToCustomer))
      fd.append('uploaded_by_name', profile?.full_name || '')
      fd.append('uploaded_by', profile?.id || '')
      fd.append('order_number', wo?.order_number || '')
      fd.append('customer_name', wo?.customer?.full_name || '')

      try {
        const res = await fetch('/api/photos/upload', {
          method: 'POST',
          headers: { 'x-service-key': key },
          body: fd,
        })
        const json = await res.json()
        if (json.error) {
          updated[i] = { ...updated[i], status: 'error', error: json.error }
          toast(`Hiba: ${json.error}`, 'error')
          if (json.error.includes('Service key')) {
            localStorage.removeItem(SK_KEY)
            setSavedKey('')
            setView('setup')
            break
          }
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

    setUploading(false)
    if (ok > 0) {
      toast(`✅ ${ok} fotó feltöltve!`)
      load()
      setTimeout(() => { setView('gallery'); setFiles([]) }, 1500)
    }
  }

  const toggleVisibility = async (id: string, cur: boolean) => {
    await supabase.from('work_order_photos').update({ is_visible_to_customer: !cur }).eq('id', id)
    load()
  }

  const deletePhoto = async (id: string) => {
    if (!confirm('Törlöd ezt a fotót?')) return
    await supabase.from('work_order_photos').delete().eq('id', id)
    load()
  }

  const allDone = files.length > 0 && files.every(f => f.status === 'done')
  const filtered = filterWO ? photos.filter(p => p.work_order_id === filterWO) : photos
  const grouped = filtered.reduce((acc: Record<string, any[]>, p) => {
    const k = p.work_order?.order_number || 'Ismeretlen'
    if (!acc[k]) acc[k] = []
    acc[k].push(p)
    return acc
  }, {})

  // ── SERVICE KEY SETUP ────────────────────────────────────────────────────────
  if (view === 'setup') {
    return (
      <div className="animate-fade-in max-w-md mx-auto space-y-4 pt-4">
        <button onClick={() => setView('gallery')} className="flex items-center gap-2 text-sm text-[#5a6a80] hover:text-[#0B1E3D]">
          <ArrowLeft size={16} /> Vissza
        </button>
        <div className="bg-white rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C9A84C] rounded-xl flex items-center justify-center">
              <Key size={18} className="text-[#0B1E3D]" />
            </div>
            <div>
              <h2 className="font-bold text-[#0B1E3D]">Egyszer szükséges beállítás</h2>
              <p className="text-xs text-[#5a6a80]">Supabase service_role kulcs megadása</p>
            </div>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-800 space-y-1">
            <p className="font-semibold">Hol találod:</p>
            <p>1. Supabase Dashboard → Settings → API</p>
            <p>2. "Project API keys" szekció</p>
            <p>3. <strong>service_role</strong> → Reveal gomb</p>
            <p>4. Az <code className="bg-blue-100 px-1 rounded">eyJhbGci...</code> kezdetű kulcsot másold be</p>
          </div>
          <textarea
            value={serviceKey}
            onChange={e => setServiceKey(e.target.value)}
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            rows={4}
            className="w-full border border-gray-200 rounded-lg p-3 text-xs font-mono outline-none focus:border-[#0B1E3D] resize-none"
          />
          <button
            onClick={saveKey}
            disabled={!serviceKey.trim()}
            className="w-full py-3 bg-[#0B1E3D] text-white rounded-xl font-semibold disabled:opacity-50"
          >
            Mentés és folytatás
          </button>
        </div>
      </div>
    )
  }

  // ── UPLOAD VIEW ──────────────────────────────────────────────────────────────
  if (view === 'upload') {
    return (
      <div className="animate-fade-in max-w-lg mx-auto space-y-4 pb-8">
        <div className="flex items-center justify-between">
          <button onClick={() => { setView('gallery'); setFiles([]) }}
            className="flex items-center gap-2 text-sm text-[#5a6a80] hover:text-[#0B1E3D]">
            <ArrowLeft size={16} /> Vissza
          </button>
          <button onClick={() => setView('setup')}
            className="flex items-center gap-2 text-xs text-[#5a6a80] hover:text-[#C9A84C]">
            <Key size={12} /> Kulcs beállítása
          </button>
        </div>

        {!savedKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            ⚠️ Service key nincs beállítva.{' '}
            <button onClick={() => setView('setup')} className="font-semibold underline">Beállítás most →</button>
          </div>
        )}

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
                  {item.status === 'error' && <span className="text-xs text-red-500 shrink-0 max-w-[100px] truncate">{item.error}</span>}
                  {item.status === 'pending' && !uploading && (
                    <button onClick={() => setFiles(p => p.filter((_, i) => i !== idx))}><X size={15} className="text-gray-400" /></button>
                  )}
                </div>
              ))}
            </div>

            {!allDone ? (
              <button onClick={handleUpload} disabled={uploading || !savedKey}
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
                <div className="flex items-center justify-center gap-2 w-full py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-[#5a6a80] cursor-pointer hover:border-[#0B1E3D] hover:text-[#0B1E3D] transition-colors">
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
      <div className="flex flex-wrap gap-2 items-center">
        <select value={filterWO} onChange={e => setFilterWO(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-[#0B1E3D]">
          <option value="">Összes munkalap</option>
          {workOrders.map(wo => (
            <option key={wo.id} value={wo.id}>{wo.order_number} – {wo.customer?.full_name}</option>
          ))}
        </select>
        <button onClick={() => savedKey ? setView('upload') : setView('setup')}
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
        Object.entries(grouped).map(([orderNum, gPhotos]) => (
          <div key={orderNum} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-[#0B1E3D] text-sm">{orderNum}</span>
                {gPhotos[0]?.work_order?.customer?.full_name && (
                  <span className="text-xs text-[#5a6a80]">– {gPhotos[0].work_order.customer.full_name}</span>
                )}
                {gPhotos[0]?.work_order?.vehicle?.license_plate && (
                  <span className="text-xs font-bold bg-[#0B1E3D] text-white px-2 py-0.5 rounded">{gPhotos[0].work_order.vehicle.license_plate}</span>
                )}
              </div>
              <span className="text-xs text-[#5a6a80] shrink-0">{gPhotos.length} fotó</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 p-3">
              {gPhotos.map(p => (
                <div key={p.id} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    <img src={p.url} alt={p.category} className="w-full h-28 object-cover" loading="lazy" />
                  </a>
                  <div className="p-1.5">
                    <div className="text-[10px] font-semibold text-[#5a6a80] uppercase truncate">{p.category}</div>
                    <div className="flex items-center justify-between mt-0.5">
                      <div className="flex items-center gap-1">
                        {p.is_visible_to_customer ? <Eye size={9} className="text-emerald-500" /> : <EyeOff size={9} className="text-gray-400" />}
                        <span className="text-[9px] text-[#8fa0b5]">{p.is_visible_to_customer ? 'Látható' : 'Belső'}</span>
                      </div>
                      {isAdmin && (
                        <div className="flex gap-1 items-center">
                          <button onClick={() => toggleVisibility(p.id, p.is_visible_to_customer)}
                            className="text-[9px] text-blue-500 hover:underline">
                            {p.is_visible_to_customer ? 'Elrejt' : 'Látható'}
                          </button>
                          <button onClick={() => deletePhoto(p.id)}>
                            <Trash2 size={9} className="text-[#C9384C]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
