'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { FormGroup, FormLabel, Select, Input, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { Upload, Camera, Eye, EyeOff } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

const PHOTO_CATEGORIES = [
  'check-in', 'sérülés', 'diagnosztika', 'javítás közben', 'alkatrész',
  'check-out', 'detailing előtte', 'detailing utána', 'egyéb'
]

export function PhotosPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [photos, setPhotos] = useState<any[]>([])
  const [workOrders, setWorkOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<any>({ category: 'check-in', is_visible_to_customer: true })
  const [file, setFile] = useState<File | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: p }, { data: wo }] = await Promise.all([
      supabase.from('work_order_photos').select('*, work_order:work_orders(order_number, customer:customers(full_name))').order('created_at', { ascending: false }).limit(50),
      supabase.from('work_orders').select('id, order_number').not('status', 'in', '(closed)'),
    ])
    setPhotos(p || [])
    setWorkOrders(wo || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const handleUpload = async () => {
    if (!form.work_order_id || !file) { toast('Auftrag und Datei sind Pflicht', 'error'); return }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `work-orders/${form.work_order_id}/${Date.now()}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage.from('photos').upload(path, file)
    if (uploadError) { toast('Upload-Fehler: ' + uploadError.message, 'error'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(path)
    const { error } = await supabase.from('work_order_photos').insert({ work_order_id: form.work_order_id, url: publicUrl, category: form.category, caption: form.caption, is_visible_to_customer: form.is_visible_to_customer })
    if (error) { toast('Fehler beim Speichern', 'error') } else { toast('Foto hochgeladen'); setModalOpen(false); load() }
    setUploading(false)
  }

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-4">
        <p className="text-[#5a6a80] text-sm">Alle Fotos der Arbeitsaufträge</p>
        <Button variant="primary" onClick={() => { setForm({ category: 'check-in', is_visible_to_customer: true }); setFile(null); setModalOpen(true) }}>
          <Upload size={14} /> Foto hochladen
        </Button>
      </div>

      {loading ? <div className="text-center py-12 text-[#5a6a80] text-sm">Wird geladen...</div> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {photos.map(p => (
            <div key={p.id} className="group relative bg-white rounded-lg border border-[rgba(11,30,61,0.10)] overflow-hidden">
              <a href={p.url} target="_blank" rel="noopener noreferrer">
                <img src={p.url} alt={p.caption || p.category} className="w-full h-36 object-cover" />
              </a>
              <div className="p-2">
                <div className="text-[10px] font-semibold text-[#5a6a80] uppercase">{p.category}</div>
                <div className="text-[11px] text-[#0B1E3D] truncate">{p.work_order?.order_number}</div>
                {p.caption && <div className="text-[11px] text-[#8fa0b5] truncate">{p.caption}</div>}
                <div className="flex items-center gap-1 mt-1">
                  {p.is_visible_to_customer
                    ? <Eye size={11} className="text-emerald-500" />
                    : <EyeOff size={11} className="text-[#8fa0b5]" />}
                  <span className="text-[10px] text-[#8fa0b5]">{p.is_visible_to_customer ? 'Sichtbar' : 'Intern'}</span>
                </div>
              </div>
            </div>
          ))}
          {photos.length === 0 && <div className="col-span-full text-center py-10 text-[#8fa0b5] text-sm">Keine Fotos vorhanden</div>}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Foto hochladen"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Abbrechen</Button><Button variant="primary" onClick={handleUpload} disabled={uploading}>{uploading ? 'Hochladen...' : 'Hochladen'}</Button></>}>
        <div className="space-y-3">
          <FormGroup>
            <FormLabel>Arbeitsauftrag *</FormLabel>
            <Select value={form.work_order_id || ''} onChange={e => setForm((f: any) => ({ ...f, work_order_id: e.target.value }))}>
              <option value="">Bitte wählen...</option>
              {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.order_number}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Kategorie</FormLabel>
            <Select value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
              {PHOTO_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
          </FormGroup>
          <FormGroup>
            <FormLabel>Datei *</FormLabel>
            <input type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full text-[13px] text-[#5a6a80] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[12px] file:bg-[#0B1E3D] file:text-white cursor-pointer" />
          </FormGroup>
          <FormGroup>
            <FormLabel>Beschriftung</FormLabel>
            <Input value={form.caption || ''} onChange={e => setForm((f: any) => ({ ...f, caption: e.target.value }))} placeholder="Optionale Beschriftung..." />
          </FormGroup>
          <FormGroup>
            <FormLabel>Sichtbarkeit</FormLabel>
            <Select value={form.is_visible_to_customer ? 'yes' : 'no'} onChange={e => setForm((f: any) => ({ ...f, is_visible_to_customer: e.target.value === 'yes' }))}>
              <option value="yes">Für Kunden sichtbar</option>
              <option value="no">Nur intern</option>
            </Select>
          </FormGroup>
        </div>
      </Modal>
    </div>
  )
}
