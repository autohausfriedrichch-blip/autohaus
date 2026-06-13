'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, FormGroup, FormLabel, Select } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { CheckSquare, LogIn, LogOut, Search, FileText } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { DocumentActions } from '@/components/documents/DocumentActions'
import { SignatureModal } from '@/components/signature/SignatureModal'

export function CheckInPage({ refreshKey }: { refreshKey: number; onRefresh: () => void }) {
  const [orders, setOrders] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [checkInForm, setCheckInForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [checkInSigned, setCheckInSigned] = useState(false)
  const [checkoutOrder, setCheckoutOrder] = useState<any>(null)
  const { toast } = useToast()
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('work_orders')
      .select('*, customer:customers(full_name,phone), vehicle:vehicles(make,model,license_plate,year)')
      .in('status', ['confirmed', 'checked_in', 'diagnostics', 'in_repair', 'quality_check', 'ready', 'checkout_ready'])
      .order('scheduled_date')
    setOrders(data || [])
    setLoading(false)
  }, [refreshKey])

  useEffect(() => { load() }, [load])

  const filtered = orders.filter(o => {
    const s = search.toLowerCase()
    return !s || (o.customer?.full_name || '').toLowerCase().includes(s) || (o.vehicle?.license_plate || '').toLowerCase().includes(s) || (o.order_number || '').toLowerCase().includes(s)
  })

  const handleCheckIn = async () => {
    if (!selectedOrder) return
    setSaving(true)
    await supabase.from('work_orders').update({
      status: 'checked_in',
      checkin_mileage: checkInForm.mileage,
      checkin_fuel_level: checkInForm.fuel_level,
      checkin_at: new Date().toISOString(),
    }).eq('id', selectedOrder.id)
    toast('Check-In abgeschlossen')
    setSelectedOrder(null)
    load()
    setSaving(false)
  }

  const handleCheckOut = async (orderId: string) => {
    await supabase.from('work_orders').update({ status: 'delivered', checkout_at: new Date().toISOString() }).eq('id', orderId)
    toast('Check-Out abgeschlossen')
    load()
  }

  return (
    <div className="animate-fade-in">
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Ügyfél, rendszám, munkalapszám..."
          className="w-full pl-9 pr-3 py-2 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] bg-white outline-none focus:border-[#0D0D0D]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Check-In pending */}
        <Card>
          <CardTitle icon={<LogIn size={16} />}>Check-In ausstehend</CardTitle>
          {loading ? <div className="text-[#4a4a4a] text-sm py-4">Wird geladen...</div> : (
            filtered.filter(o => o.status === 'confirmed').map(o => (
              <div key={o.id} className="border border-[rgba(0,0,0,0.10)] rounded-[10px] p-3 mb-2.5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[11px] font-bold text-[#333333] bg-[#F0F0F0] px-2 py-0.5 rounded mr-2">{o.order_number}</span>
                    <span className="font-semibold text-[13px]">{o.customer?.full_name}</span>
                  </div>
                  <span className="bg-[#0D0D0D] text-white text-[11px] font-bold px-2 py-0.5 rounded">{o.vehicle?.license_plate}</span>
                </div>
                <div className="text-[12px] text-[#4a4a4a] mb-2">{o.vehicle?.make} {o.vehicle?.model} {o.vehicle?.year}</div>
                {selectedOrder?.id === o.id ? (
                  <div className="space-y-2 mt-3 pt-3 border-t border-[rgba(0,0,0,0.08)]">
                    <div className="grid grid-cols-2 gap-2">
                      <FormGroup>
                        <FormLabel>KM-Stand</FormLabel>
                        <Input type="number" placeholder="km" value={checkInForm.mileage || ''} onChange={e => setCheckInForm((f: any) => ({ ...f, mileage: parseInt(e.target.value) }))} />
                      </FormGroup>
                      <FormGroup>
                        <FormLabel>Üzemanyag %</FormLabel>
                        <Select value={checkInForm.fuel_level || ''} onChange={e => setCheckInForm((f: any) => ({ ...f, fuel_level: parseInt(e.target.value) }))}>
                          <option value="">–</option>
                          {[100, 75, 50, 25, 10].map(v => <option key={v} value={v}>{v}%</option>)}
                        </Select>
                      </FormGroup>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center mt-2">
                      <SignatureModal
                        type="checkin"
                        workOrderId={selectedOrder.id}
                        customerName={selectedOrder.customer?.full_name || ''}
                        documentLabel={`Check-In – ${selectedOrder.order_number}`}
                        onComplete={() => setCheckInSigned(true)}
                      />
                      <button
                        className="btn-mobile-action bg-[#0D0D0D] text-white flex-1"
                        onClick={handleCheckIn}
                        disabled={saving}
                      >
                        <LogIn size={16} /> Check-In bestätigen
                      </button>
                      <Button variant="secondary" size="sm" onClick={() => { setSelectedOrder(null); setCheckInSigned(false) }}>Mégse</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="gold" size="sm" onClick={() => { setSelectedOrder(o); setCheckInForm({}) }}>
                    <LogIn size={13} /> Check-In starten
                  </Button>
                )}
              </div>
            ))
          )}
          {!loading && filtered.filter(o => o.status === 'confirmed').length === 0 && (
            <p className="text-[12px] text-[#888888] py-4 text-center">Nincs függő Check-In</p>
          )}
        </Card>

        {/* Check-Out ready */}
        <Card>
          <CardTitle icon={<LogOut size={16} />}>Check-Out bereit</CardTitle>
          {loading ? <div className="text-[#4a4a4a] text-sm py-4">Wird geladen...</div> : (
            filtered.filter(o => ['ready', 'checkout_ready'].includes(o.status)).map(o => (
              <div key={o.id} className="border border-emerald-200 bg-emerald-50 rounded-[10px] p-3 mb-2.5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-[11px] font-bold text-[#333333] bg-[#F0F0F0] px-2 py-0.5 rounded mr-2">{o.order_number}</span>
                    <span className="font-semibold text-[13px]">{o.customer?.full_name}</span>
                  </div>
                  <span className="bg-[#0D0D0D] text-white text-[11px] font-bold px-2 py-0.5 rounded">{o.vehicle?.license_plate}</span>
                </div>
                <div className="text-[12px] text-[#4a4a4a] mb-2">
                  {o.vehicle?.make} {o.vehicle?.model}
                  {o.checkin_at && <span className="ml-2 text-[#888888]">Check-In: {formatDateTime(o.checkin_at)}</span>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <SignatureModal
                    type="checkout"
                    workOrderId={o.id}
                    customerName={o.customer?.full_name || ''}
                    documentLabel={`Check-Out – ${o.order_number}`}
                    onComplete={() => handleCheckOut(o.id)}
                  />
                  <DocumentActions type="checkout" data={o} small />
                  <DocumentActions type="invoice" data={o} small />
                </div>
              </div>
            ))
          )}
          {!loading && filtered.filter(o => ['ready', 'checkout_ready'].includes(o.status)).length === 0 && (
            <p className="text-[12px] text-[#888888] py-4 text-center">Nincs Check-Out-ra váró</p>
          )}
        </Card>
      </div>

      {/* Currently in shop */}
      <Card className="mt-4">
        <CardTitle icon={<CheckSquare size={16} />}>Fahrzeuge im Betrieb</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-[rgba(0,0,0,0.10)]">
                <th className="text-left py-2 text-[#4a4a4a] font-semibold">Munkalap</th>
                <th className="text-left py-2 text-[#4a4a4a] font-semibold">Ügyfél</th>
                <th className="text-left py-2 text-[#4a4a4a] font-semibold hidden md:table-cell">Jármű</th>
                <th className="text-left py-2 text-[#4a4a4a] font-semibold">Státusz</th>
                <th className="text-left py-2 text-[#4a4a4a] font-semibold hidden sm:table-cell">Check-In</th>
              </tr>
            </thead>
            <tbody>
              {filtered.filter(o => ['checked_in','diagnostics','waiting_quote','waiting_approval','waiting_parts','in_repair','quality_check'].includes(o.status)).map(o => (
                <tr key={o.id} className="border-b border-[rgba(0,0,0,0.05)]">
                  <td className="py-2"><span className="text-[11px] font-bold text-[#333333] bg-[#F0F0F0] px-2 py-0.5 rounded">{o.order_number}</span></td>
                  <td className="py-2 font-medium">{o.customer?.full_name}</td>
                  <td className="py-2 hidden md:table-cell text-[#4a4a4a]">{o.vehicle?.license_plate}</td>
                  <td className="py-2 text-[#4a4a4a]">{o.status}</td>
                  <td className="py-2 hidden sm:table-cell text-[#888888]">{o.checkin_at ? formatDateTime(o.checkin_at) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
