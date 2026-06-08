'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Camera, Upload, X, CheckCircle, Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react'

const PHOTO_CATEGORIES = [
  'check-in', 'sérülés', 'diagnosztika', 'javítás közben',
  'alkatrész', 'check-out', 'detailing előtte', 'detailing utána', 'egyéb'
]

interface UploadItem {
  file: File
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export function PhotosPage({ refreshKey, profile }: { refreshKey: number; onRefresh: () => void; profile?: any }) {
  const [photos, setPhotos] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [view, setView] = useState<'gallery' | 'upload'>('gallery')
  const [files, setFiles] = useState<UploadItem[]>([])
  const [workOrderId, setWorkOrderId] = useState('')
  const [category, setCategory] = useState('check-in')
  const [caption, setCaption] = useState('')
  const [visibleToCustomer, setVisibleToCustomer] = useState(true)
  const [filterWO, setFilterWO] = useState('')
  const { toast } = useToast()
  const supabase = createClient()
  const isMechanic = profile?.role === 'mechanic'

  const load = useCallback(async () => {
    setLoading(true)
    const woQuery = supabase.from('work_orders').select('id, order_number, customer:customers(full_name)').not('status', 'in', '(closed)').order('created_at', { ascending: false })
    const [{ data: p }, { data: wo }] = await Promise.all([
      supabase.from('work_order_photos')
        .select('*, work_order:work_orders(order_number, customer:customers(full_name))')
        .order('created_at', { ascending: false })
        .limit(100),
      woQuery,
    ])
    setPhotos(p || [])
    const woList = wo || []
    setWorkOrders(woList)
    if (woList.length === 1) setWorkOrderId(woList[0].id)
    setLoading(false)
  }, [refreshKey, isMechanic, profile?.id])

  useEffect(() => { load() }, [load])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected || selected.length === 0) return
    const items: UploadItem[] = Array.from(selected)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({
        file: f,
        status: 'pending' as const,
      }))
    setFiles(prev => [...prev, ...items])
    // Reset input so same files can be re-selected
    e.target.value = ''
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpload = async () => {
    if (!workOrderId) { toast('Kérlek válassz munkalapot a feltöltés előtt!', 'error'); return }
    if (files.length === 0) { toast('Nincs kiválasztott kép!', 'error'); return }
    setUploading(true)

    let successCount = 0
    const updated = [...files]

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'done') continue
      updated[i] = { ...updated[i], status: 'uploading' }
      setFiles([...updated])

      const file = updated[i].file
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `work-orders/${workOrderId}/${Date.now()}-${i}.${ext}`

      const { error: uploadError } = await supabase.storage.from('photos').upload(path, file)
      if (uploadError) {
        updated[i] = { ...updated[i], status: 'error', error: uploadError.message }
        setFiles([...updated])
        toast(`Hiba: ${uploadError.message}`, 'error')
        continue
      }

      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
      const { error: dbError } = await supabase.from('work_order_photos').insert({
        work_order_id: workOrderId,
        url: publicUrl,
        category,
        caption: caption || null,
        is_visible_to_customer: visibleToCustomer,
        uploaded_by: profile?.id || null,
        uploaded_by_name: profile?.full_name || null,
      })

      if (dbError) {
        updated[i] = { ...updated[i], status: 'error', error: dbError.message }
        toast(`DB hiba: ${dbError.message}`, 'error')
      } else {
        updated[i] = { ...updated[i], status: 'done' }
        successCount++
      }
      setFiles([...updated])
    }

    // Notify Barbara if Karl uploaded
    if (isMechanic && successCount > 0) {
      const wo = workOrders.find(w => w.id === workOrderId)
      await supabase.from('notifications').insert({
        type: 'photo_uploaded',
        title: `${successCount} új fotó feltöltve`,
        message: `${profile?.full_name} ${successCount} fotót töltött fel – ${wo?.order_number || ''} (${wo?.customer?.full_name || ''})`,
        work_order_id: workOrderId,
        created_by: profile?.id,
        is_read: false,
      })
    }

    setUploading(false)
    if (successCount > 0) {
      toast(`✅ ${successCount} fotó sikeresen feltöltve!`)
      await load()
      setTimeout(() => {
        setView('gallery')
        setFiles([])
        setCaption('')
      }, 1000)
    }
  }

  const filteredPhotos = filterWO ? photos.filter(p => p.work_order_id === filterWO) : photos
  const grouped = filteredPhotos.reduce((acc: Record<string, any[]>, p) => {
    const key = p.work_order?.order_number || 'Ismeretlen'
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

  const allDone = files.length > 0 && files.every(f => f.status === 'done')

  // ── UPLOAD VIEW ──────────────────────────────────────────────────────────────
  if (view === 'upload') {
    return (
      <div className="animate-fade-in space-y-4 pb-8">
        <button onClick={() => { setView('gallery'); setFiles([]) }} className="flex items-center gap-2 text-sm text-[#5a6a80] hover:text-[#0B1E3D]">
          <ArrowLeft size={16} /> Vissza a galériához
        </button>

        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="font-semibold text-[#0B1E3D] text-lg">Fotók feltöltése</h2>

          {/* Munkalap */}
          <div>
            <label className="block text-xs font-semibold text-[#5a6a80] uppercase tracking-wide mb-1.5">Munkalap *</label>
            <select
              value={workOrderId}
              onChange={e => setWorkOrderId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm text-[#0B1E3D] bg-white outline-none focus:border-[#0B1E3D]"
            >
              <option value="">Válassz munkalapot...</option>
              {workOrders.map(wo => (
                <option key={wo.id} value={wo.id}>{wo.order_number} – {wo.customer?.full_name}</option>
              ))}
            </select>
          </div>

          {/* Kategória */}
          <div>
            <label className="block text-xs font-semibold text-[#5a6a80] uppercase tracking-wide mb-1.5">Kategória</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm text-[#0B1E3D] bg-white outline-none focus:border-[#0B1E3D]"
            >
              {PHOTO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Láthatóság */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setVisibleToCustomer(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                visibleToCustomer
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              {visibleToCustomer ? <Eye size={15} /> : <EyeOff size={15} />}
              {visibleToCustomer ? 'Ügyfélnek látható' : 'Csak belső'}
            </button>
          </div>

          {/* Képek kiválasztása gomb */}
          <label className="block">
            <div className="flex items-center justify-center gap-3 w-full py-4 bg-[#0B1E3D] hover:bg-[#142a50] active:bg-[#0a1830] text-white rounded-xl font-semibold text-base cursor-pointer transition-colors select-none">
              <Camera size={20} />
              Képek kiválasztása
            </div>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {/* Előnézet */}
        {files.length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[#0B1E3D]">{files.length} kép kiválasztva</h3>
              {!uploading && !allDone && (
                <button onClick={() => setFiles([])} className="text-xs text-red-500 hover:underline">Összes törlése</button>
              )}
            </div>

            <div className="space-y-2">
              {files.map((item, idx) => (
                <div key={idx} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${
                  item.status === 'done' ? 'bg-green-50 border-green-200' :
                  item.status === 'error' ? 'bg-red-50 border-red-200' :
                  item.status === 'uploading' ? 'bg-blue-50 border-blue-200' :
                  'bg-gray-50 border-gray-200'
                }`}>
                  <Camera size={16} className="text-[#5a6a80] flex-shrink-0" />
                  <span className="flex-1 text-sm text-[#0B1E3D] truncate">{item.file.name}</span>
                  <span className="text-xs text-[#5a6a80] flex-shrink-0">{(item.file.size / 1024 / 1024).toFixed(1)} MB</span>
                  {item.status === 'uploading' && <Loader2 size={16} className="text-blue-500 animate-spin flex-shrink-0" />}
                  {item.status === 'done' && <CheckCircle size={16} className="text-green-500 flex-shrink-0" />}
                  {item.status === 'error' && <X size={16} className="text-red-500 flex-shrink-0" />}
                  {item.status === 'pending' && !uploading && (
                    <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* FELTÖLTÉS gomb */}
            {!allDone && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full py-4 bg-[#C9A84C] hover:bg-[#b8943f] active:bg-[#a07e35] disabled:opacity-50 text-[#0B1E3D] rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-colors"
              >
                {uploading
                  ? <><Loader2 size={18} className="animate-spin" /> Feltöltés folyamatban...</>
                  : <><Upload size={18} /> {files.length} fotó feltöltése</>
                }
              </button>
            )}

            {allDone && (
              <div className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-xl text-green-700 font-semibold">
                <CheckCircle size={18} /> Minden fotó feltöltve!
              </div>
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
        <select
          value={filterWO}
          onChange={e => setFilterWO(e.target.value)}
          className="flex-1 min-w-[180px] px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:border-[#0B1E3D]"
        >
          <option value="">Összes munkalap</option>
          {workOrders.map(wo => (
            <option key={wo.id} value={wo.id}>{wo.order_number} – {wo.customer?.full_name}</option>
          ))}
        </select>
        <button
          onClick={() => setView('upload')}
          className="flex items-center gap-2 px-4 py-2 bg-[#0B1E3D] text-white rounded-lg text-sm font-semibold hover:bg-[#142a50] transition-colors"
        >
          <Upload size={14} /> Fotó feltöltés
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div>
      ) : filteredPhotos.length === 0 ? (
        <div className="text-center py-16 text-[#8fa0b5]">
          <Camera size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Még nincsenek fotók</p>
          <button onClick={() => setView('upload')} className="mt-3 text-sm text-[#C9A84C] font-medium hover:underline">
            Első fotó feltöltése →
          </button>
        </div>
      ) : (
        Object.entries(grouped).map(([orderNum, groupPhotos]) => (
          <div key={orderNum} className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#0B1E3D] text-sm">{orderNum}</span>
                {groupPhotos[0]?.work_order?.customer?.full_name && (
                  <span className="text-xs text-[#5a6a80] ml-2">– {groupPhotos[0].work_order.customer.full_name}</span>
                )}
              </div>
              <span className="text-xs text-[#5a6a80]">{groupPhotos.length} fotó</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 p-3">
              {groupPhotos.map(p => (
                <div key={p.id} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    <img src={p.url} alt={p.caption || p.category} className="w-full h-28 object-cover" />
                  </a>
                  <div className="p-1.5">
                    <div className="text-[10px] font-semibold text-[#5a6a80] uppercase truncate">{p.category}</div>
                    {p.caption && <div className="text-[10px] text-[#8fa0b5] truncate">{p.caption}</div>}
                    <div className="flex items-center gap-1 mt-0.5">
                      {p.is_visible_to_customer ? <Eye size={9} className="text-emerald-500" /> : <EyeOff size={9} className="text-[#8fa0b5]" />}
                      {p.uploaded_by_name && <span className="text-[9px] text-[#8fa0b5]">{p.uploaded_by_name.split(' ')[0]}</span>}
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
