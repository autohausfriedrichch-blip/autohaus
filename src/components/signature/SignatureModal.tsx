'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SignaturePad } from './SignaturePad'
import { useToast } from '@/components/ui/toast'
import { PenLine } from 'lucide-react'

interface SignatureModalProps {
  type: 'checkin' | 'checkout' | 'quote_accept' | 'pickup' | 'delivery'
  workOrderId?: string
  quoteId?: string
  pickupId?: string
  customerName: string
  documentLabel: string
  onComplete: (signatureUrl: string) => void
  onSkip?: () => void
}

export function SignatureModal({ type, workOrderId, quoteId, pickupId, customerName, documentLabel, onComplete, onSkip }: SignatureModalProps) {
  const [open, setOpen] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedUrl, setSavedUrl] = useState('')
  const { toast } = useToast()
  const supabase = createClient()

  const handleSave = async (dataUrl: string) => {
    const now = new Date()
    const payload: any = {
      type,
      customer_name: customerName,
      signed_at: now.toISOString(),
      signature_data: dataUrl,
      document_label: documentLabel,
      work_order_id: workOrderId || null,
      quote_id: quoteId || null,
      pickup_delivery_id: pickupId || null,
    }

    const { data, error } = await supabase.from('signatures').insert(payload).select().single()
    if (error) {
      toast('Hiba az aláírás mentésekor', 'error')
      return
    }

    // Log to timeline
    if (workOrderId) {
      await supabase.from('work_order_events').insert({
        work_order_id: workOrderId,
        event_type: 'signed',
        title: `Aláírva: ${documentLabel}`,
        user_name: customerName,
        phase: type === 'checkin' ? 'intake' : type === 'checkout' ? 'delivery' : 'general',
        metadata: { signature_id: data?.id },
      })
    }

    setSavedUrl(dataUrl)
    setSaved(true)
    setOpen(false)
    toast('Aláírás elmentve')
    onComplete(dataUrl)
  }

  return (
    <>
      {!saved ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0D0D0D] text-white text-[12px] font-medium hover:bg-[#1A1A1A] transition-colors"
          style={{ minHeight: 36 }}
        >
          <PenLine size={13} /> Aláírás kérés
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[12px]">
            <PenLine size={12} /> Aláírva ✓
          </div>
          {savedUrl && (
            <img src={savedUrl} alt="signature" className="h-8 bg-white border rounded" />
          )}
        </div>
      )}

      {open && (
        <SignaturePad
          title={`Aláírás – ${documentLabel}`}
          subtitle={`Ügyfél: ${customerName}`}
          onSave={handleSave}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  )
}
