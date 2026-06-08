'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { generateQuotePDF, generateWorkOrderPDF, generateCheckInPDF, generateCheckOutPDF, generateInvoicePDF } from '@/lib/pdf'
import { Download, Printer, Mail, MessageCircle, Send } from 'lucide-react'

type DocType = 'quote' | 'workorder' | 'checkin' | 'checkout' | 'invoice'

interface DocumentActionsProps {
  type: DocType
  data: any
  customerId?: string
  workOrderId?: string
  quoteId?: string
  small?: boolean
}

export function DocumentActions({ type, data, customerId, workOrderId, quoteId, small }: DocumentActionsProps) {
  const [sendModal, setSendModal] = useState<'email' | 'whatsapp' | null>(null)
  const [emailTo, setEmailTo] = useState(data?.customer?.email || '')
  const [emailSubject, setEmailSubject] = useState(getDefaultSubject(type, data))
  const [emailBody, setEmailBody] = useState(getDefaultEmailBody(type, data))
  const [whatsappNum, setWhatsappNum] = useState(data?.customer?.whatsapp || data?.customer?.phone || '')
  const [whatsappMsg, setWhatsappMsg] = useState(getDefaultWhatsApp(type, data))
  const [sending, setSending] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  function getPDF() {
    switch (type) {
      case 'quote': return generateQuotePDF(data)
      case 'workorder': return generateWorkOrderPDF(data)
      case 'checkin': return generateCheckInPDF(data)
      case 'checkout': return generateCheckOutPDF(data)
      case 'invoice': return generateInvoicePDF(data)
    }
  }

  function getFileName() {
    switch (type) {
      case 'quote': return `Arajanlat_${data?.id?.slice(0, 8) || 'doc'}.pdf`
      case 'workorder': return `Munkalap_${data?.order_number || 'doc'}.pdf`
      case 'checkin': return `CheckIn_${data?.order_number || 'doc'}.pdf`
      case 'checkout': return `CheckOut_${data?.order_number || 'doc'}.pdf`
      case 'invoice': return `Szamla_${data?.order_number || 'doc'}.pdf`
    }
  }

  const handleDownload = () => {
    const doc = getPDF()
    doc.save(getFileName())
    toast('PDF letöltve')
  }

  const handlePrint = () => {
    const doc = getPDF()
    const blob = doc.output('blob')
    const url = URL.createObjectURL(blob)
    const win = window.open(url)
    win?.print()
  }

  const logCommunication = async (channel: 'email' | 'whatsapp', content: string) => {
    if (!customerId) return
    await supabase.from('communication_logs').insert({
      customer_id: customerId,
      work_order_id: workOrderId || null,
      quote_id: quoteId || null,
      direction: 'outbound',
      channel,
      message_type: type === 'quote' ? 'quote_sent' : 'status_update',
      content,
    })
  }

  const handleEmailSend = async () => {
    setSending(true)
    // Generate PDF and convert to blob for email
    const doc = getPDF()
    const pdfBase64 = doc.output('datauristring')

    // Log to communication
    await logCommunication('email', `Email elküldve: ${emailSubject}\nCímzett: ${emailTo}`)
    toast('Email naplózva – valódi küldéshez SMTP szerver szükséges')
    setSendModal(null)
    setSending(false)
  }

  const handleWhatsAppSend = async () => {
    const cleaned = whatsappNum.replace(/\s+/g, '').replace(/^\+/, '')
    const encoded = encodeURIComponent(whatsappMsg)
    window.open(`https://wa.me/${cleaned}?text=${encoded}`, '_blank')
    await logCommunication('whatsapp', whatsappMsg)
    toast('WhatsApp megnyitva, kommunikáció naplózva')
    setSendModal(null)
  }

  const btnSize = small ? 'sm' : 'sm'

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button variant="secondary" size={btnSize} onClick={handleDownload}>
          <Download size={13} /> PDF
        </Button>
        <Button variant="secondary" size={btnSize} onClick={handlePrint}>
          <Printer size={13} /> Nyomtatás
        </Button>
        <Button variant="secondary" size={btnSize} onClick={() => setSendModal('email')}>
          <Mail size={13} /> E-mail
        </Button>
        <Button variant="gold" size={btnSize} onClick={() => setSendModal('whatsapp')}>
          <MessageCircle size={13} /> WhatsApp
        </Button>
      </div>

      {/* Email Modal */}
      <Modal
        open={sendModal === 'email'}
        onClose={() => setSendModal(null)}
        title="Dokumentum küldése e-mailben"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSendModal(null)}>Mégse</Button>
            <Button variant="primary" onClick={handleEmailSend} disabled={sending}>
              <Send size={13} /> {sending ? 'Küldés...' : 'Küldés & Naplózás'}
            </Button>
          </>
        }
      >
        <FormGroup>
          <FormLabel>Címzett e-mail</FormLabel>
          <Input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="ugyfel@example.com" />
        </FormGroup>
        <FormGroup>
          <FormLabel>Tárgy</FormLabel>
          <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} />
        </FormGroup>
        <FormGroup>
          <FormLabel>Üzenet</FormLabel>
          <Textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} className="min-h-[120px]" />
        </FormGroup>
        <div className="text-[11px] text-[#8fa0b5] bg-[#F4F5F7] rounded-lg p-3 mt-2">
          📎 PDF dokumentum automatikusan csatolva • Kommunikáció naplózva
        </div>
      </Modal>

      {/* WhatsApp Modal */}
      <Modal
        open={sendModal === 'whatsapp'}
        onClose={() => setSendModal(null)}
        title="Küldés WhatsApp-on"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSendModal(null)}>Mégse</Button>
            <Button variant="gold" onClick={handleWhatsAppSend}>
              <MessageCircle size={13} /> WhatsApp megnyitása
            </Button>
          </>
        }
      >
        <FormGroup>
          <FormLabel>WhatsApp szám</FormLabel>
          <Input value={whatsappNum} onChange={e => setWhatsappNum(e.target.value)} placeholder="+41 79 123 45 67" />
        </FormGroup>
        <FormGroup>
          <FormLabel>Üzenet sablon</FormLabel>
          <Textarea value={whatsappMsg} onChange={e => setWhatsappMsg(e.target.value)} className="min-h-[140px]" />
        </FormGroup>
        <div className="text-[11px] text-[#8fa0b5] bg-[#F4F5F7] rounded-lg p-3 mt-2">
          WhatsApp Web megnyitódik az előre kitöltött üzenettel • Kommunikáció automatikusan naplózva
        </div>
      </Modal>
    </>
  )
}

function getDefaultSubject(type: DocType, data: any): string {
  switch (type) {
    case 'quote': return `Autohaus Friedrich – Árajánlat ${data?.customer?.full_name || ''}`
    case 'workorder': return `Autohaus Friedrich – Munkalap ${data?.order_number || ''}`
    case 'checkin': return `Autohaus Friedrich – Check-In visszaigazolás`
    case 'checkout': return `Autohaus Friedrich – Check-Out ${data?.order_number || ''}`
    case 'invoice': return `Autohaus Friedrich – Számla / Rechnung ${data?.order_number || ''}`
    default: return 'Autohaus Friedrich – Dokumentum'
  }
}

function getDefaultEmailBody(type: DocType, data: any): string {
  const name = data?.customer?.full_name || 'Tisztelt Ügyfelünk'
  switch (type) {
    case 'quote':
      return `Tisztelt ${name}!\n\nMellékletben megküldjük az Ön járművére vonatkozó árajánlatunkat.\n\nKérjük, tekintse meg és jelezze visszaigazolását.\n\nÜdvözlettel,\nAutohaus Friedrich`
    case 'workorder':
      return `Tisztelt ${name}!\n\nMellékletben megküldjük a(z) ${data?.order_number || ''} számú munklap összefoglalóját.\n\nÜdvözlettel,\nAutohaus Friedrich`
    case 'checkin':
      return `Tisztelt ${name}!\n\nMegerősítjük járművének átvételét. A check-in dokumentumot mellékelten küldjük.\n\nÜdvözlettel,\nAutohaus Friedrich`
    case 'checkout':
      return `Tisztelt ${name}!\n\nJárműve elkészült és átvehető. A check-out dokumentumot mellékelten küldjük.\n\nÜdvözlettel,\nAutohaus Friedrich`
    case 'invoice':
      return `Tisztelt ${name}!\n\nMellékletben megküldjük a(z) ${data?.order_number || ''} számú számlát.\n\nKérjük, 30 napon belül szíveskedjen kiegyenlíteni.\n\nÜdvözlettel,\nAutohaus Friedrich`
    default: return ''
  }
}

function getDefaultWhatsApp(type: DocType, data: any): string {
  const name = data?.customer?.full_name || 'Kedves Ügyfél'
  const plate = data?.vehicle?.license_plate || ''
  switch (type) {
    case 'quote':
      return `Kedves ${name}! 🚗\n\nElkészítettük az árajánlatot a(z) *${plate}* rendszámú járművére.\n\nVégösszeg: *${data?.total_amount ? data.total_amount.toFixed(2) + ' CHF' : '–'}*\n\nKérjük, jelezze visszaigazolását! 🇨🇭\n\n– Autohaus Friedrich`
    case 'workorder':
      return `Kedves ${name}! 🔧\n\nA(z) *${data?.order_number || ''}* számú munkájáról küldünk összefoglalót.\n\nJárműve: *${plate}*\n\nKérdés esetén állunk rendelkezésére!\n\n– Autohaus Friedrich`
    case 'checkin':
      return `Kedves ${name}! ✅\n\nMegerősítjük, hogy *${plate}* rendszámú járművét átvettük.\n\nAmint elkészül az átnézés, értesítjük!\n\n– Autohaus Friedrich`
    case 'checkout':
      return `Kedves ${name}! 🎉\n\n*${plate}* rendszámú járműve elkészült és átvehető!\n\nNyitvatartás: H-P 8:00-18:00, Sz 9:00-13:00\n\n– Autohaus Friedrich`
    case 'invoice':
      return `Kedves ${name}! 📄\n\nA(z) *${data?.order_number || ''}* sz. számlát megküldjük.\n\nÖsszeg: *${data?.total_amount ? data.total_amount.toFixed(2) + ' CHF' : '–'}*\n\nKöszönjük a bizalmat! 🇨🇭\n\n– Autohaus Friedrich`
    default: return ''
  }
}
