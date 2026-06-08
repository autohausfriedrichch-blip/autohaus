'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { FormGroup, FormLabel, Select, Input } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Upload, Camera, Eye, EyeOff, X, CheckCircle, ImageIcon, Loader2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const PHOTO_CATEGORIES = [
  'check-in', 'sérülés', 'diagnosztika', 'javítás közben',
  'alkatrész', 'check-out', 'detailing előtte', 'detailing utána', 'egyéb'
]

interface UploadItem {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

export function PhotosPage({ refreshKey, profile }: { refreshKey: number; onRefresh: () => void; profile?: any }) {
  const [photos, setPhotos] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState<any>({ category: 'check-in', is_visible_to_customer: true })
  const [files, setFiles] = useState<UploadItem[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [filterWO, setFilterWO] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()
  const supabase = createClient()
  const isMechanic = profile?.role === 'mechanic'

  const load = useCallback(async () => {
    setLoading(true)
    const woQuery = isMechanic && profile?.id
      ? supabase.from('work_orders').select('id, order_number, customer:customers(full_name)').eq('mechanic_id', profile.id).not('status', 'in', '(closed)')
      : supabase.from('work_orders').select('id, order_number, customer:customers(full_name)').not('status', 'in', '(closed)')
    const [{ data: p }, { data: wo }] = await Promise.all([
      supabase.from('work_order_photos')
        .select('*, work_order:work_orders(order_number, mechanic_id, customer:customers(full_name))')
        .order('created_at', { ascending: false })
        .limit(100),
      woQuery,
    ])
    setPhotos(p || [])
    setWorkOrders(wo || [])
    setLoading(false)
  }, [refreshKey, isMechanic, profile?.id])

  useEffect(() => { load() }, [load])

  const addFiles = (incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter(f => f.type.startsWith('image/'))
    const items: UploadItem[] = arr.map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      status: 'pending',
    }))
    setFiles(prev => [...prev, ...items])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    addFiles(e.dataTransfer.files)
  }

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpload = async () => {
    if (!form.work_order_id) { toast('Válassz munkalapot!', 'error'); return }
    if (files.length === 0) { toast('Adj hozzá legalább egy képet!', 'error'); return }
    setUploading(true)

    let successCount = 0
    const updated = [...files]

    for (let i = 0; i < updated.length; i++) {
      if (updated[i].status === 'done') continue
      updated[i] = { ...updated[i], status: 'uploading' }
      setFiles([...updated])

      const file = updated[i].file
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `work-orders/${form.work_order_id}/${Date.now()}-${i}.${ext}`

      const { error: uploadError } = await supabase.storage.from('photos').upload(path, file)
      if (uploadError) {
        updated[i] = { ...updated[i], status: 'error', error: uploadError.message }
        setFiles([...updated])
        continue
      }

      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
      const { error: dbError } = await supabase.from('work_order_photos').insert({
        work_order_id: form.work_order_id,
        url: publicUrl,
        category: form.category,
        caption: form.caption || null,
        is_visible_to_customer: form.is_visible_to_customer,
        uploaded_by: profile?.id || null,
        uploaded_by_name: profile?.full_name || null,
      })

      if (dbError) {
        updated[i] = { ...updated[i], status: 'error', error: dbError.message }
      } else {
        updated[i] = { ...updated[i], status: 'done' }
        successCount++
      }
      setFiles([...updated])
    }

    // Send notification to Barbara if Karl uploaded
    if (isMechanic && successCount > 0) {
      const wo = workOrders.find(w => w.id === form.work_order_id)
      await supabase.from('notifications').insert({
        type: 'photo_uploaded',
        title: `${successCount} új fotó feltöltve`,
        message: `${profile?.full_name} ${successCount} fotót töltött fel a ${wo?.order_number || 'munkalapra'} (${wo?.customer?.full_name || ''})`,
        work_order_id: form.work_order_id,
        created_by: profile?.id,
        is_read: false,
      })
    }

    if (successCount > 0) {
      toast(`${successCount} fotó sikeresen feltöltve! ✅`)
      load()
    }
    if (successCount === files.length) {
      setTimeout(() => { setModalOpen(false); setFiles([]) }, 1200)
    }
    setUploading(false)
  }

  const filteredPhotos = filterWO
    ? photos.filter(p => p.work_order_id === filterWO)
    : photos

  const grouped = filteredPhotos.reduce((acc: Record<string, any[]>, p) => {
    const key = p.work_order?.order_number || p.work_order_id || 'Ismeretlen'
    if (!acc[key]) acc[key] = []
    acc[key].push(p)
    return acc
  }, {})

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
        <Button variant="primary" onClick={() => { setForm({ category: 'check-in', is_visible_to_customer: true }); setFiles([]); setModalOpen(true) }}>
          <Upload size={14} /> Fotó feltöltés
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-[#5a6a80] text-sm">Betöltés...</div>
      ) : filteredPhotos.length === 0 ? (
        <div className="text-center py-16 text-[#8fa0b5]">
          <Camera size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Még nincsenek fotók</p>
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
                <div key={p.id} className="group relative bg-gray-50 rounded-lg overflow-hidden border border-gray-100">
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    <img src={p.url} alt={p.caption || p.category} className="w-full h-28 object-cover hover:opacity-90 transition-opacity" />
                  </a>
                  <div className="p-1.5">
                    <div className="text-[10px] font-semibold text-[#5a6a80] uppercase truncate">{p.category}</div>
                    {p.caption && <div className="text-[10px] text-[#8fa0b5] truncate">{p.caption}</div>}
                    <div className="flex items-center gap-1 mt-0.5">
                      {p.is_visible_to_customer
                        ? <Eye size={9} className="text-emerald-500" />
                        : <EyeOff size={9} className="text-[#8fa0b5]" />}
                      {p.uploaded_by_name && (
                        <span className="text-[9px] text-[#8fa0b5] truncate">{p.uploaded_by_name.split(' ')[0]}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setFiles([]) }}
        title="Fotók feltöltése"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setModalOpen(false); setFiles([]) }}>Mégse</Button>
            <Button variant="primary" onClick={handleUpload} disabled={uploading || files.length === 0}>
              {uploading ? <><Loader2 size={14} className="animate-spin" /> Feltöltés...</> : <><Upload size={14} /> {files.length > 0 ? `${files.length} fotó feltöltése` : 'Feltöltés'}</>}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormGroup>
              <FormLabel>Munkalap *</FormLabel>
              <Select value={form.work_order_id || ''} onChange={e => setForm((f: any) => ({ ...f, work_order_id: e.target.value }))}>
                <option value="">Válassz...</option>
                {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.order_number} – {wo.customer?.full_name}</option>)}
              </Select>
            </FormGroup>
            <FormGroup>
              <FormLabel>Kategória</FormLabel>
              <Select value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
                {PHOTO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <FormGroup>
              <FormLabel>Felirat</FormLabel>
              <Input value={form.caption || ''} onChange={e => setForm((f: any) => ({ ...f, caption: e.target.value }))} placeholder="Opcionális..." />
            </FormGroup>
            <FormGroup>
              <FormLabel>Láthatóság</FormLabel>
              <Select value={form.is_visible_to_customer ? 'yes' : 'no'} onChange={e => setForm((f: any) => ({ ...f, is_visible_to_customer: e.target.value === 'yes' }))}>
                <option value="yes">Ügyfélnek látható</option>
                <option value="no">Csak belső</option>
              </Select>
            </FormGroup>
          </div>

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragOver ? 'border-[#C9A84C] bg-amber-50' : 'border-gray-200 hover:border-[#0B1E3D] hover:bg-gray-50'
            }`}
          >
            <ImageIcon size={28} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium text-[#0B1E3D]">Húzd ide a képeket vagy kattints</p>
            <p className="text-xs text-[#5a6a80] mt-1">Több kép egyszerre is feltölthető</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {/* File preview grid */}
          {files.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
              {files.map((item, idx) => (
                <div key={idx} className="relative group">
                  <img src={item.preview} alt="" className="w-full h-20 object-cover rounded-lg" />
                  <div className={`absolute inset-0 rounded-lg flex items-center justify-center transition-all ${
                    item.status === 'uploading' ? 'bg-black/40' :
                    item.status === 'done' ? 'bg-green-500/30' :
                    item.status === 'error' ? 'bg-red-500/40' : 'bg-transparent'
                  }`}>
                    {item.status === 'uploading' && <Loader2 size={18} className="text-white animate-spin" />}
                    {item.status === 'done' && <CheckCircle size={18} className="text-white" />}
                    {item.status === 'error' && <X size={18} className="text-white" />}
                  </div>
                  {item.status === 'pending' && (
                    <button
                      onClick={e => { e.stopPropagation(); removeFile(idx) }}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  )}
                  <p className="text-[9px] text-[#5a6a80] truncate mt-0.5">{item.file.name}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
