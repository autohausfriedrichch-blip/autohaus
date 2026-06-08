'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormGroup, FormLabel, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import {
  Building2, Palette, Users, Package, CreditCard, Truck, Calendar,
  FileText, MessageCircle, Bell, Shield, Database, Zap, Check,
  Plus, Trash2, Upload, Clock, Globe, Phone, Mail, Hash
} from 'lucide-react'

const TABS = [
  { id: 'company',       label: 'Cégadatok',        icon: Building2 },
  { id: 'pricing',       label: 'Árképzés',          icon: CreditCard },
  { id: 'users',         label: 'Felhasználók',      icon: Users },
  { id: 'services',      label: 'Szolgáltatások',    icon: Package },
  { id: 'booking',       label: 'Foglalás',          icon: Calendar },
  { id: 'documents',     label: 'Dokumentumok',      icon: FileText },
  { id: 'communication', label: 'Kommunikáció',      icon: MessageCircle },
  { id: 'checkin',       label: 'Check-In/Out',      icon: Check },
  { id: 'notifications', label: 'Értesítések',       icon: Bell },
  { id: 'mobile',        label: 'Mobil & Pickup',    icon: Truck },
  { id: 'review',        label: 'Google Review',     icon: Globe },
  { id: 'security',      label: 'Biztonság',         icon: Shield },
  { id: 'backup',        label: 'Backup & Export',   icon: Database },
  { id: 'future',        label: 'Jövőbeni modulok',  icon: Zap },
]

const DAYS = [
  { key: 'monday', label: 'Hétfő' },
  { key: 'tuesday', label: 'Kedd' },
  { key: 'wednesday', label: 'Szerda' },
  { key: 'thursday', label: 'Csütörtök' },
  { key: 'friday', label: 'Péntek' },
  { key: 'saturday', label: 'Szombat' },
  { key: 'sunday', label: 'Vasárnap' },
]

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[#C9A84C]' : 'bg-gray-200'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
      {label && <span className="text-[12px] text-[#5a6a80]">{label}</span>}
    </label>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4 mt-6 first:mt-0">
      <div className="h-px flex-1 bg-[rgba(11,30,61,0.08)]" />
      <span className="text-[10px] font-bold text-[#5a6a80] uppercase tracking-[2px] px-2">{children}</span>
      <div className="h-px flex-1 bg-[rgba(11,30,61,0.08)]" />
    </div>
  )
}

export function SettingsPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [activeTab, setActiveTab] = useState('company')
  const [settings, setSettings] = useState<Record<string, Record<string, any>>>({})
  const [users, setUsers] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newRegion, setNewRegion] = useState('')
  const [newUser, setNewUser] = useState({ email: '', full_name: '', role: 'mechanic' })
  const [creatingUser, setCreatingUser] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: s }, { data: u }, { data: svc }] = await Promise.all([
      supabase.from('system_settings').select('*'),
      supabase.from('profiles').select('id,full_name,email,role').order('full_name'),
      supabase.from('services').select('*').order('category,name'),
    ])

    // Group settings by category
    const grouped: Record<string, Record<string, any>> = {}
    for (const row of (s || [])) {
      if (!grouped[row.category]) grouped[row.category] = {}
      grouped[row.category][row.key] = row.value
    }
    setSettings(grouped)
    setUsers(u || [])
    setServices(svc || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const get = (cat: string, key: string, def: any = '') => {
    const v = settings[cat]?.[key]
    if (v === undefined || v === null) return def
    if (typeof v === 'string') return v
    return v
  }

  const set = (cat: string, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [cat]: { ...(prev[cat] || {}), [key]: value }
    }))
  }

  const saveSetting = async (cat: string, key: string, value: any) => {
    await supabase.from('system_settings').upsert(
      { category: cat, key, value: JSON.stringify(value), updated_at: new Date().toISOString() },
      { onConflict: 'category,key' }
    )
  }

  const saveAll = async (category: string) => {
    setSaving(true)
    const cat = settings[category] || {}
    await Promise.all(
      Object.entries(cat).map(([key, value]) => saveSetting(category, key, value))
    )
    toast('Beállítások mentve')
    setSaving(false)
  }

  const updateRole = async (userId: string, role: string) => {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    toast('Szerepkör frissítve')
    load()
  }

  const createUser = async () => {
    if (!newUser.email) { toast('E-mail kötelező', 'error'); return }
    setCreatingUser(true)
    // Insert profile - auth user must be created in Supabase dashboard
    toast('Felhasználó Supabase Dashboard-ban hozható létre: Authentication → Users → Add user', 'error')
    setCreatingUser(false)
  }

  const updateService = async (id: string, field: string, value: any) => {
    await supabase.from('services').update({ [field]: value }).eq('id', id)
    setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const addRegion = () => {
    if (!newRegion.trim()) return
    const regions = get('mobile', 'regions', []) as string[]
    const updated = [...regions, newRegion.trim()]
    set('mobile', 'regions', updated)
    setNewRegion('')
  }

  const removeRegion = (r: string) => {
    const regions = get('mobile', 'regions', []) as string[]
    set('mobile', 'regions', regions.filter(x => x !== r))
  }

  const openingHours = get('booking', 'opening_hours', {
    monday: { open: '08:00', close: '18:00', active: true },
    tuesday: { open: '08:00', close: '18:00', active: true },
    wednesday: { open: '08:00', close: '18:00', active: true },
    thursday: { open: '08:00', close: '18:00', active: true },
    friday: { open: '08:00', close: '17:00', active: true },
    saturday: { open: '09:00', close: '13:00', active: true },
    sunday: { open: '00:00', close: '00:00', active: false },
  })

  const setHours = (day: string, field: string, value: any) => {
    set('booking', 'opening_hours', { ...openingHours, [day]: { ...openingHours[day], [field]: value } })
  }

  const SaveButton = ({ category }: { category: string }) => (
    <div className="flex justify-end mt-6 pt-4 border-t border-[rgba(11,30,61,0.08)]">
      <Button variant="primary" onClick={() => saveAll(category)} disabled={saving}>
        <Check size={14} /> {saving ? 'Mentés...' : 'Beállítások mentése'}
      </Button>
    </div>
  )

  if (loading) return <div className="text-center py-12 text-[#5a6a80]">Betöltés...</div>

  return (
    <div className="animate-fade-in flex gap-5 min-h-0">
      {/* Sidebar tabs */}
      <div className="w-48 shrink-0">
        <Card className="p-2">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] transition-colors text-left ${
                  activeTab === tab.id
                    ? 'bg-[#0B1E3D] text-white'
                    : 'text-[#5a6a80] hover:bg-[#F4F5F7] hover:text-[#0B1E3D]'
                }`}
              >
                <Icon size={14} className="shrink-0" />
                <span className="truncate">{tab.label}</span>
              </button>
            )
          })}
        </Card>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <Card className="p-5">

          {/* ── COMPANY ── */}
          {activeTab === 'company' && (
            <div>
              <SectionTitle>Alapadatok</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <FormGroup className="col-span-2">
                  <FormLabel>Cégnév</FormLabel>
                  <Input value={get('company','name')} onChange={e => set('company','name', e.target.value)} />
                </FormGroup>
                <FormGroup className="col-span-2">
                  <FormLabel>Szlogen</FormLabel>
                  <Input value={get('company','slogan')} onChange={e => set('company','slogan', e.target.value)} />
                </FormGroup>
                <FormGroup className="col-span-2">
                  <FormLabel>Cím</FormLabel>
                  <Input value={get('company','address')} onChange={e => set('company','address', e.target.value)} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Irányítószám</FormLabel>
                  <Input value={get('company','postal_code')} onChange={e => set('company','postal_code', e.target.value)} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Város</FormLabel>
                  <Input value={get('company','city')} onChange={e => set('company','city', e.target.value)} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Telefon</FormLabel>
                  <Input value={get('company','phone')} onChange={e => set('company','phone', e.target.value)} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>WhatsApp</FormLabel>
                  <Input value={get('company','whatsapp')} onChange={e => set('company','whatsapp', e.target.value)} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>E-mail</FormLabel>
                  <Input value={get('company','email')} onChange={e => set('company','email', e.target.value)} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Weboldal</FormLabel>
                  <Input value={get('company','website')} onChange={e => set('company','website', e.target.value)} />
                </FormGroup>
              </div>

              <SectionTitle>Adózási adatok</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <FormGroup>
                  <FormLabel>UID szám</FormLabel>
                  <Input value={get('company','uid')} onChange={e => set('company','uid', e.target.value)} placeholder="CHE-123.456.789" />
                </FormGroup>
                <FormGroup>
                  <FormLabel>MWST / VAT szám</FormLabel>
                  <Input value={get('company','mwst')} onChange={e => set('company','mwst', e.target.value)} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Bank neve</FormLabel>
                  <Input value={get('company','bank_name')} onChange={e => set('company','bank_name', e.target.value)} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>BIC / SWIFT</FormLabel>
                  <Input value={get('company','bic')} onChange={e => set('company','bic', e.target.value)} />
                </FormGroup>
                <FormGroup className="col-span-2">
                  <FormLabel>IBAN</FormLabel>
                  <Input value={get('company','iban')} onChange={e => set('company','iban', e.target.value)} placeholder="CH56 0483 5012 3456 7800 9" />
                </FormGroup>
              </div>
              <SaveButton category="company" />
            </div>
          )}

          {/* ── PRICING ── */}
          {activeTab === 'pricing' && (
            <div>
              <SectionTitle>Óradíjak</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <FormGroup>
                  <FormLabel>Normál óradíj (CHF/h)</FormLabel>
                  <Input type="number" value={get('pricing','hourly_rate',125)} onChange={e => set('pricing','hourly_rate', parseFloat(e.target.value))} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Mobil óradíj (CHF/h)</FormLabel>
                  <Input type="number" value={get('pricing','mobile_hourly_rate',145)} onChange={e => set('pricing','mobile_hourly_rate', parseFloat(e.target.value))} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Sürgősségi óradíj (CHF/h)</FormLabel>
                  <Input type="number" value={get('pricing','urgent_hourly_rate',175)} onChange={e => set('pricing','urgent_hourly_rate', parseFloat(e.target.value))} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>ÁFA (%)</FormLabel>
                  <Input type="number" step="0.1" value={get('pricing','tax_rate',7.7)} onChange={e => set('pricing','tax_rate', parseFloat(e.target.value))} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Pénznem</FormLabel>
                  <Select value={get('pricing','currency','CHF')} onChange={e => set('pricing','currency', e.target.value)}>
                    <option value="CHF">CHF – Svájci frank</option>
                    <option value="EUR">EUR – Euro</option>
                  </Select>
                </FormGroup>
              </div>
              <SaveButton category="pricing" />
            </div>
          )}

          {/* ── USERS ── */}
          {activeTab === 'users' && (
            <div>
              <SectionTitle>Felhasználók</SectionTitle>
              <div className="space-y-2 mb-6">
                {users.map(u => (
                  <div key={u.id} className="flex items-center gap-3 p-3 bg-[#F4F5F7] rounded-lg">
                    <div className="w-8 h-8 rounded-full bg-[#0B1E3D] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {(u.full_name || u.email || '?').slice(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold text-[#0B1E3D] truncate">{u.full_name || u.email}</div>
                      <div className="text-[11px] text-[#8fa0b5]">{u.email}</div>
                    </div>
                    <Select
                      value={u.role || 'admin'}
                      onChange={e => updateRole(u.id, e.target.value)}
                      className="w-36"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="admin">Admin (Barbara)</option>
                      <option value="mechanic">Technikus (Karl)</option>
                      <option value="customer">Ügyfél</option>
                    </Select>
                  </div>
                ))}
              </div>

              <SectionTitle>Szerepkörök</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { role: 'super_admin', label: 'Super Admin', desc: 'Teljes hozzáférés minden modulhoz', color: 'bg-red-50 border-red-200' },
                  { role: 'admin', label: 'Admin – Barbara', desc: 'Ügyfelek, munkalapok, foglalások, árajánlatok, kommunikáció, riportok', color: 'bg-blue-50 border-blue-200' },
                  { role: 'mechanic', label: 'Technikus – Karl', desc: 'Saját munkák, fotók, státuszok, check-in/out, időzítő', color: 'bg-amber-50 border-amber-200' },
                  { role: 'customer', label: 'Ügyfél', desc: 'Saját autók, dokumentumok, kommunikáció', color: 'bg-green-50 border-green-200' },
                ].map(r => (
                  <div key={r.role} className={`p-3 rounded-lg border ${r.color}`}>
                    <div className="font-semibold text-[12px] text-[#0B1E3D] mb-1">{r.label}</div>
                    <div className="text-[11px] text-[#5a6a80]">{r.desc}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-800">
                💡 Új felhasználó létrehozásához: <strong>Supabase Dashboard → Authentication → Users → Add user</strong>, majd itt állítsd be a szerepkört.
              </div>
            </div>
          )}

          {/* ── SERVICES ── */}
          {activeTab === 'services' && (
            <div>
              <SectionTitle>Szolgáltatások</SectionTitle>
              <div className="space-y-1">
                <div className="grid grid-cols-12 gap-2 px-2 py-1 text-[10px] font-semibold text-[#8fa0b5] uppercase">
                  <div className="col-span-4">Név</div>
                  <div className="col-span-2">Kategória</div>
                  <div className="col-span-2 text-right">Ár (CHF)</div>
                  <div className="col-span-1 text-center">Aktív</div>
                  <div className="col-span-1 text-center">Web</div>
                  <div className="col-span-1 text-center">Mobil</div>
                  <div className="col-span-1 text-center">Perc</div>
                </div>
                {services.map(svc => (
                  <div key={svc.id} className="grid grid-cols-12 gap-2 items-center px-2 py-1.5 hover:bg-[#fafbfc] rounded-lg">
                    <div className="col-span-4 text-[12px] font-medium text-[#0B1E3D]">{svc.name}</div>
                    <div className="col-span-2 text-[11px] text-[#8fa0b5]">{svc.category}</div>
                    <div className="col-span-2">
                      <input type="number" defaultValue={svc.base_price || 0} onBlur={e => updateService(svc.id, 'base_price', parseFloat(e.target.value))}
                        className="w-full text-right text-[12px] px-2 py-1 border border-transparent hover:border-[rgba(11,30,61,0.15)] rounded outline-none focus:border-[#C9A84C]" />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Toggle checked={svc.is_active} onChange={v => updateService(svc.id, 'is_active', v)} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Toggle checked={svc.visible_online || false} onChange={v => updateService(svc.id, 'visible_online', v)} />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Toggle checked={svc.is_mobile || false} onChange={v => updateService(svc.id, 'is_mobile', v)} />
                    </div>
                    <div className="col-span-1">
                      <input type="number" defaultValue={svc.duration_minutes || 60} onBlur={e => updateService(svc.id, 'duration_minutes', parseInt(e.target.value))}
                        className="w-full text-center text-[12px] px-1 py-1 border border-transparent hover:border-[rgba(11,30,61,0.15)] rounded outline-none focus:border-[#C9A84C]" />
                    </div>
                  </div>
                ))}
                {services.length === 0 && (
                  <div className="text-center py-8 text-[#8fa0b5] text-sm">Még nincs szolgáltatás</div>
                )}
              </div>
            </div>
          )}

          {/* ── BOOKING ── */}
          {activeTab === 'booking' && (
            <div>
              <SectionTitle>Alapbeállítások</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <FormGroup>
                  <FormLabel>Max. napi foglalás</FormLabel>
                  <Input type="number" value={get('booking','max_daily_bookings',8)} onChange={e => set('booking','max_daily_bookings', parseInt(e.target.value))} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Időrés hossza (perc)</FormLabel>
                  <Select value={get('booking','slot_duration',60)} onChange={e => set('booking','slot_duration', parseInt(e.target.value))}>
                    <option value={30}>30 perc</option>
                    <option value={60}>60 perc</option>
                    <option value={90}>90 perc</option>
                    <option value={120}>120 perc</option>
                  </Select>
                </FormGroup>
              </div>

              <SectionTitle>Nyitvatartás</SectionTitle>
              <div className="space-y-2">
                {DAYS.map(day => (
                  <div key={day.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#fafbfc]">
                    <Toggle
                      checked={openingHours[day.key]?.active ?? false}
                      onChange={v => setHours(day.key, 'active', v)}
                    />
                    <span className="w-24 text-[12px] font-medium text-[#0B1E3D]">{day.label}</span>
                    <input type="time" value={openingHours[day.key]?.open || '08:00'}
                      onChange={e => setHours(day.key, 'open', e.target.value)}
                      disabled={!openingHours[day.key]?.active}
                      className="px-2 py-1 border border-[rgba(11,30,61,0.15)] rounded text-[12px] outline-none focus:border-[#C9A84C] disabled:opacity-40" />
                    <span className="text-[11px] text-[#8fa0b5]">–</span>
                    <input type="time" value={openingHours[day.key]?.close || '18:00'}
                      onChange={e => setHours(day.key, 'close', e.target.value)}
                      disabled={!openingHours[day.key]?.active}
                      className="px-2 py-1 border border-[rgba(11,30,61,0.15)] rounded text-[12px] outline-none focus:border-[#C9A84C] disabled:opacity-40" />
                    {!openingHours[day.key]?.active && <span className="text-[11px] text-[#C9384C]">Zárva</span>}
                  </div>
                ))}
              </div>
              <SaveButton category="booking" />
            </div>
          )}

          {/* ── DOCUMENTS ── */}
          {activeTab === 'documents' && (
            <div>
              <SectionTitle>Dokumentum számozás</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'quote_prefix', label: 'Árajánlat előtag', example: 'SG-Q → SG-Q-2026-0001' },
                  { key: 'workorder_prefix', label: 'Munkalap előtag', example: 'SG-WO → SG-WO-2026-0001' },
                  { key: 'checkin_prefix', label: 'Check-In előtag', example: 'SG-CI → SG-CI-2026-0001' },
                  { key: 'checkout_prefix', label: 'Check-Out előtag', example: 'SG-CO → SG-CO-2026-0001' },
                ].map(f => (
                  <FormGroup key={f.key}>
                    <FormLabel>{f.label}</FormLabel>
                    <Input value={get('documents', f.key)} onChange={e => set('documents', f.key, e.target.value)} />
                    <div className="text-[10px] text-[#8fa0b5] mt-1">{f.example}</div>
                  </FormGroup>
                ))}
                <FormGroup>
                  <FormLabel>Év a számban</FormLabel>
                  <Toggle checked={get('documents','year_in_number',true)} onChange={v => set('documents','year_in_number', v)} label="pl. SG-WO-2026-0001" />
                </FormGroup>
              </div>

              <SectionTitle>PDF lábléc</SectionTitle>
              <div className="bg-[#F4F5F7] rounded-lg p-3 text-[11px] text-[#5a6a80]">
                A PDF-eken automatikusan megjelenik: <strong>{get('company','name','Autohaus Friedrich')}</strong> · {get('company','address','')} · {get('company','phone','')} · {get('company','email','')} · UID: {get('company','uid','')} · IBAN: {get('company','iban','')}
                <div className="mt-2 text-[10px]">A tartalom a Cégadatok menüpontban szerkeszthető.</div>
              </div>
              <SaveButton category="documents" />
            </div>
          )}

          {/* ── COMMUNICATION ── */}
          {activeTab === 'communication' && (
            <div>
              <SectionTitle>E-mail (SMTP)</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <FormGroup className="col-span-2">
                  <FormLabel>SMTP szerver</FormLabel>
                  <Input value={get('communication','smtp_host')} onChange={e => set('communication','smtp_host', e.target.value)} placeholder="smtp.gmail.com" />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Port</FormLabel>
                  <Input type="number" value={get('communication','smtp_port',587)} onChange={e => set('communication','smtp_port', parseInt(e.target.value))} />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Felhasználónév</FormLabel>
                  <Input value={get('communication','smtp_user')} onChange={e => set('communication','smtp_user', e.target.value)} placeholder="info@autohaus-friedrich.ch" />
                </FormGroup>
                <FormGroup className="col-span-2">
                  <FormLabel>E-mail aláírás</FormLabel>
                  <Textarea value={get('communication','email_signature')} onChange={e => set('communication','email_signature', e.target.value)} rows={3} />
                </FormGroup>
              </div>

              <SectionTitle>WhatsApp</SectionTitle>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-[12px] text-green-800">
                A WhatsApp küldés jelenleg wa.me link alapján működik. WhatsApp Business API integráció jövőbeni fejlesztés.
              </div>
              <SaveButton category="communication" />
            </div>
          )}

          {/* ── CHECKIN ── */}
          {activeTab === 'checkin' && (
            <div>
              <SectionTitle>Check-In kötelező mezők</SectionTitle>
              <div className="space-y-3">
                {[
                  { key: 'require_mileage', label: 'Kilométeróra állás rögzítése' },
                  { key: 'require_plate_photo', label: 'Rendszám fotó' },
                  { key: 'require_damage_photo', label: 'Sérülések fotói' },
                ].map(f => (
                  <div key={f.key} className="flex items-center justify-between p-3 bg-[#F4F5F7] rounded-lg">
                    <span className="text-[13px] text-[#0B1E3D]">{f.label}</span>
                    <Toggle checked={get('checkin', f.key, true)} onChange={v => set('checkin', f.key, v)} />
                  </div>
                ))}
              </div>

              <SectionTitle>Check-Out kötelező mezők</SectionTitle>
              <div className="space-y-3">
                {[
                  { key: 'require_photos', label: 'Elkészült fotók' },
                  { key: 'require_signature', label: 'Ügyfél aláírása' },
                  { key: 'send_review_request', label: 'Google review kérés küldése' },
                ].map(f => (
                  <div key={f.key} className="flex items-center justify-between p-3 bg-[#F4F5F7] rounded-lg">
                    <span className="text-[13px] text-[#0B1E3D]">{f.label}</span>
                    <Toggle checked={get('checkout', f.key, true)} onChange={v => set('checkout', f.key, v)} />
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-6 pt-4 border-t border-[rgba(11,30,61,0.08)] gap-2">
                <Button variant="primary" onClick={async () => { await saveAll('checkin'); await saveAll('checkout') }} disabled={saving}>
                  <Check size={14} /> {saving ? 'Mentés...' : 'Beállítások mentése'}
                </Button>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && (
            <div>
              <SectionTitle>Push / E-mail értesítések</SectionTitle>
              <div className="space-y-3">
                {[
                  { key: 'new_booking', label: 'Új foglalás érkezett' },
                  { key: 'quote_accepted', label: 'Árajánlat elfogadva' },
                  { key: 'whatsapp_received', label: 'Új WhatsApp üzenet' },
                  { key: 'parts_arrived', label: 'Alkatrész megérkezett' },
                  { key: 'pickup_started', label: 'Pickup feladat indul' },
                  { key: 'car_ready', label: 'Autó elkészült' },
                ].map(f => (
                  <div key={f.key} className="flex items-center justify-between p-3 bg-[#F4F5F7] rounded-lg">
                    <span className="text-[13px] text-[#0B1E3D]">{f.label}</span>
                    <Toggle checked={get('notifications', f.key, true)} onChange={v => set('notifications', f.key, v)} />
                  </div>
                ))}
              </div>
              <SaveButton category="notifications" />
            </div>
          )}

          {/* ── MOBILE ── */}
          {activeTab === 'mobile' && (
            <div>
              <SectionTitle>Mobil szerviz</SectionTitle>
              <div className="flex items-center justify-between p-3 bg-[#F4F5F7] rounded-lg mb-4">
                <span className="text-[13px] font-medium text-[#0B1E3D]">Mobil szerviz engedélyezve</span>
                <Toggle checked={get('mobile','enabled',true)} onChange={v => set('mobile','enabled',v)} />
              </div>
              <div className="flex items-center justify-between p-3 bg-[#F4F5F7] rounded-lg mb-4">
                <span className="text-[13px] font-medium text-[#0B1E3D]">Hozom-Viszem engedélyezve</span>
                <Toggle checked={get('pickup','enabled',true)} onChange={v => set('pickup','enabled',v)} />
              </div>

              <SectionTitle>Régiók</SectionTitle>
              <div className="space-y-2 mb-3">
                {(get('mobile','regions',[]) as string[]).map(r => (
                  <div key={r} className="flex items-center justify-between p-2.5 bg-[#F4F5F7] rounded-lg">
                    <span className="text-[13px] text-[#0B1E3D]">{r}</span>
                    <button onClick={() => removeRegion(r)} className="text-[#8fa0b5] hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={newRegion} onChange={e => setNewRegion(e.target.value)} onKeyDown={e => e.key === 'Enter' && addRegion()} placeholder="Új régió neve..." />
                <Button variant="secondary" onClick={addRegion}><Plus size={14} /> Hozzáad</Button>
              </div>
              <div className="flex justify-end mt-6 pt-4 border-t border-[rgba(11,30,61,0.08)] gap-2">
                <Button variant="primary" onClick={async () => { await saveAll('mobile'); await saveAll('pickup') }} disabled={saving}>
                  <Check size={14} /> Mentés
                </Button>
              </div>
            </div>
          )}

          {/* ── REVIEW ── */}
          {activeTab === 'review' && (
            <div>
              <SectionTitle>Google Review</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <FormGroup className="col-span-2">
                  <FormLabel>Google Review link</FormLabel>
                  <Input value={get('review','google_link')} onChange={e => set('review','google_link', e.target.value)} placeholder="https://g.page/r/..." />
                </FormGroup>
                <FormGroup>
                  <FormLabel>Automatikus küldés (óra átadás után)</FormLabel>
                  <Select value={get('review','auto_send_hours',24)} onChange={e => set('review','auto_send_hours', parseInt(e.target.value))}>
                    <option value={0}>Kikapcsolva</option>
                    <option value={24}>24 óra</option>
                    <option value={48}>48 óra</option>
                    <option value={72}>72 óra</option>
                  </Select>
                </FormGroup>
              </div>
              <SaveButton category="review" />
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'security' && (
            <div>
              <SectionTitle>Biztonság</SectionTitle>
              <div className="space-y-3 mb-4">
                <div className="p-3 bg-[#F4F5F7] rounded-lg">
                  <div className="text-[13px] font-semibold text-[#0B1E3D] mb-1">Jelszó reset</div>
                  <div className="text-[12px] text-[#5a6a80] mb-2">Felhasználó jelszavát a Supabase Dashboard-on lehet resetelni: Authentication → Users → ⋯ → Send password reset</div>
                </div>
                <div className="p-3 bg-[#F4F5F7] rounded-lg">
                  <div className="text-[13px] font-semibold text-[#0B1E3D] mb-1">2FA</div>
                  <div className="text-[12px] text-[#5a6a80]">Kétfaktoros hitelesítés Supabase Auth beállításaiban engedélyezhető.</div>
                </div>
              </div>

              <SectionTitle>Tevékenység napló</SectionTitle>
              <ActivityLog supabase={supabase} />
            </div>
          )}

          {/* ── BACKUP ── */}
          {activeTab === 'backup' && (
            <div>
              <SectionTitle>Adatok exportálása</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Ügyfelek', table: 'customers' },
                  { label: 'Járművek', table: 'vehicles' },
                  { label: 'Munkalapok', table: 'work_orders' },
                  { label: 'Árajánlatok', table: 'quotes' },
                  { label: 'Foglalások', table: 'bookings' },
                  { label: 'Kommunikáció', table: 'communication_logs' },
                ].map(e => (
                  <ExportButton key={e.table} label={e.label} table={e.table} supabase={supabase} toast={toast} />
                ))}
              </div>

              <SectionTitle>Backup</SectionTitle>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[12px] text-blue-800">
                Automatikus napi backup: Supabase Dashboard → Settings → Database → Backups. Ingyenes tier: 1 nap, Pro tier: 7 nap, Team: 30 nap.
              </div>
            </div>
          )}

          {/* ── FUTURE ── */}
          {activeTab === 'future' && (
            <div>
              <SectionTitle>Jövőbeni modulok</SectionTitle>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Flotta szerződések', status: 'Tervezett' },
                  { label: 'Előfizetések & Membership', status: 'Tervezett' },
                  { label: 'AI Asszisztens', status: 'Tervezett' },
                  { label: 'AI Ügyfélszolgálat', status: 'Tervezett' },
                  { label: 'AI Ajánlatkészítés', status: 'Tervezett' },
                  { label: 'AI Marketing', status: 'Tervezett' },
                  { label: 'Készletkezelés', status: 'Tervezett' },
                  { label: 'Számlázó integráció', status: 'Tervezett' },
                  { label: 'Stripe fizetés', status: 'Tervezett' },
                  { label: 'TWINT fizetés', status: 'Tervezett' },
                  { label: 'QR kód fizetés', status: 'Tervezett' },
                  { label: 'Több telephely', status: 'Tervezett' },
                ].map(m => (
                  <div key={m.label} className="flex items-center justify-between p-3 bg-[#F4F5F7] rounded-lg">
                    <span className="text-[12px] text-[#0B1E3D]">{m.label}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-500">{m.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </Card>
      </div>
    </div>
  )
}

function ActivityLog({ supabase }: { supabase: any }) {
  const [logs, setLogs] = useState<any[]>([])
  useEffect(() => {
    supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(20)
      .then(({ data }: any) => setLogs(data || []))
  }, [])
  if (logs.length === 0) return <div className="text-[12px] text-[#8fa0b5] p-3">Még nincs naplózott tevékenység.</div>
  return (
    <div className="space-y-1">
      {logs.map(l => (
        <div key={l.id} className="flex items-center gap-3 p-2 text-[11px] border-b border-[rgba(11,30,61,0.06)]">
          <span className="text-[#8fa0b5] w-32 shrink-0">{new Date(l.created_at).toLocaleString('hu-HU')}</span>
          <span className="font-medium text-[#0B1E3D]">{l.user_name || '–'}</span>
          <span className="text-[#5a6a80] flex-1">{l.action}</span>
        </div>
      ))}
    </div>
  )
}

function ExportButton({ label, table, supabase, toast }: { label: string; table: string; supabase: any; toast: any }) {
  const [loading, setLoading] = useState(false)
  const handleExport = async () => {
    setLoading(true)
    const { data } = await supabase.from(table).select('*')
    if (!data || data.length === 0) { toast('Nincs exportálható adat', 'error'); setLoading(false); return }
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map((row: any) => Object.values(row).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${table}_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    toast(`${label} exportálva (${data.length} sor)`)
    setLoading(false)
  }
  return (
    <button onClick={handleExport} disabled={loading}
      className="flex items-center gap-2 p-3 bg-[#F4F5F7] hover:bg-[#0B1E3D] hover:text-white rounded-lg text-[12px] text-[#0B1E3D] transition-colors disabled:opacity-50">
      <Database size={14} />
      {loading ? 'Exportálás...' : `${label} (CSV)`}
    </button>
  )
}
