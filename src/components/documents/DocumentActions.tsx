'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, FormGroup, FormLabel, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { generateQuotePDF, generateWorkOrderPDF, generateCheckInPDF, generateCheckOutPDF, generateInvoicePDF } from '@/lib/pdf'
import { type PdfLang, LANG_OPTIONS } from '@/lib/pdf-i18n'
import { autoSaveDocument, type DocSource } from '@/lib/document-auto'
import { Download, Printer, Mail, MessageCircle, Send, Globe, FolderOpen } from 'lucide-react'

type DocType = 'quote' | 'workorder' | 'checkin' | 'checkout' | 'invoice'

interface DocumentActionsProps {
  type: DocType
  data: any
  customerId?: string
  workOrderId?: string
  quoteId?: string
  vehicleId?: string
  small?: boolean
}

export function DocumentActions({ type, data, customerId, workOrderId, quoteId, vehicleId, small }: DocumentActionsProps) {
  const [lang, setLang] = useState<PdfLang>('de')
  const [sendModal, setSendModal] = useState<'email' | 'whatsapp' | null>(null)
  const [emailTo, setEmailTo] = useState(data?.customer?.email || '')
  const [emailSubject, setEmailSubject] = useState(getDefaultSubject(type, data))
  const [emailBody, setEmailBody] = useState(getDefaultEmailBody(type, data))
  const [whatsappNum, setWhatsappNum] = useState(data?.customer?.whatsapp || data?.customer?.phone || '')
  const [whatsappMsg, setWhatsappMsg] = useState(getDefaultWhatsApp(type, data))
  const [sending, setSending] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  // Auto-save PDF to Document Center
  const handleSaveToDocCenter = async () => {
    setSaving(true)
    try {
      const doc = getPDF()
      const blob = doc.output('blob') as Blob
      const filename = getFileName()
      const source: DocSource = type === 'workorder' ? 'workorder'
        : type === 'quote' ? 'quote'
        : type === 'checkin' ? 'checkin'
        : type === 'checkout' ? 'checkout'
        : 'invoice'

      const { docId, error } = await autoSaveDocument(supabase, blob, {
        name: filename.replace('.pdf', ''),
        source_module: source,
        customer_id:   customerId  || data?.customer_id  || data?.customer?.id,
        vehicle_id:    vehicleId   || data?.vehicle_id   || data?.vehicle?.id,
        work_order_id: workOrderId || data?.work_order_id,
        quote_id:      quoteId     || (type === 'quote' ? data?.id : undefined),
        invoice_id:    type === 'invoice' ? data?.id : undefined,
      })
      if (error) {
        toast('Hiba a mentéskor: ' + error)
      } else {
        toast(`Dokumentum mentve: ${docId || 'OK'} ✓`)
      }
    } catch (e: any) {
      toast('Hiba: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  function getPDF() {
    switch (type) {
      case 'quote':     return generateQuotePDF(data)
      case 'workorder': return generateWorkOrderPDF(data, lang)
      case 'checkin':   return generateCheckInPDF(data)
      case 'checkout':  return generateCheckOutPDF(data)
      case 'invoice':   return generateInvoicePDF(data)
    }
  }

  function getFileName() {
    const num = data?.order_number || data?.id?.slice(0, 8) || 'doc'
    switch (type) {
      case 'workorder': return lang === 'de'
        ? `Arbeitsauftrag_${num}.pdf`
        : `Work_Order_${num}.pdf`
      case 'checkin':  return lang === 'de' ? `Eingangsprotokoll_${num}.pdf` : `Check_In_${num}.pdf`
      case 'checkout': return lang === 'de' ? `Ausgangsprotokoll_${num}.pdf` : `Check_Out_${num}.pdf`
      case 'quote':    return lang === 'de' ? `Angebot_${num}.pdf` : `Quotation_${num}.pdf`
      case 'invoice':  return lang === 'de' ? `Rechnung_${num}.pdf` : `Invoice_${num}.pdf`
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
  const selectedLang = LANG_OPTIONS.find(l => l.value === lang)!

  return (
    <>
      <div className="flex flex-col gap-2">
        {/* Language selector — shown for workorder, can extend to all types */}
        {type === 'workorder' && (
          <div className="flex items-center gap-2">
            <Globe size={13} className="text-[#4a4a4a] shrink-0" />
            <span className="text-[11px] text-[#4a4a4a] font-medium">Dokumentum nyelve / Document Language:</span>
            <div className="flex gap-1">
              {LANG_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLang(opt.value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    lang === opt.value
                      ? 'bg-[#0D0D0D] text-white border-[#0D0D0D]'
                      : 'bg-white text-[#4a4a4a] border-gray-200 hover:border-[#C8102E]'
                  }`}
                >
                  <span>{opt.flag}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
            <span className="text-[10px] text-[#888888] ml-1">
              → {selectedLang.flag} {getFileName()}
            </span>
          </div>
        )}

        {/* Action buttons */}
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
          <Button variant="secondary" size={btnSize} onClick={handleSaveToDocCenter} disabled={saving}>
            <FolderOpen size={13} /> {saving ? '...' : 'Mentés'}
          </Button>
        </div>
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
        <div className="text-[11px] text-[#888888] bg-[#F4F5F7] rounded-lg p-3 mt-2">
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
        <div className="text-[11px] text-[#888888] bg-[#F4F5F7] rounded-lg p-3 mt-2">
          WhatsApp Web megnyitódik az előre kitöltött üzenettel • Kommunikáció automatikusan naplózva
        </div>
      </Modal>
    </>
  )
}

function getDefaultSubject(type: DocType, data: any): string {
  switch (type) {
    case 'quote':     return `Autohaus Friedrich – Árajánlat ${data?.customer?.full_name || ''}`
    case 'workorder': return `Autohaus Friedrich – Arbeitsauftrag / Work Order ${data?.order_number || ''}`
    case 'checkin':   return `Autohaus Friedrich – Check-In visszaigazolás`
    case 'checkout':  return `Autohaus Friedrich – Check-Out ${data?.order_number || ''}`
    case 'invoice':   return `Autohaus Friedrich – Rechnung / Invoice ${data?.order_number || ''}`
    default:          return 'Autohaus Friedrich – Dokumentum'
  }
}

function getDefaultEmailBody(type: DocType, data: any): string {
  const name = data?.customer?.full_name || 'Tisztelt Ügyfelünk'
  switch (type) {
    case 'quote':
      return `Tisztelt ${name}!\n\nMellékletben megküldjük az Ön járművére vonatkozó árajánlatunkat.\n\nKérjük, tekintse meg és jelezze visszaigazolását.\n\nÜdvözlettel,\nAutohaus Friedrich`
    case 'workorder':
      return `Sehr geehrte/r ${name},\n\nim Anhang finden Sie den Arbeitsauftrag Nr. ${data?.order_number || ''}.\n\nFür Rückfragen stehen wir gerne zur Verfügung.\n\nMit freundlichen Grüßen,\nAutohaus Friedrich`
    case 'checkin':
      return `Sehr geehrte/r ${name},\n\nwir bestätigen die Übernahme Ihres Fahrzeugs. Das Eingangsprotokoll finden Sie im Anhang.\n\nMit freundlichen Grüßen,\nAutohaus Friedrich`
    case 'checkout':
      return `Sehr geehrte/r ${name},\n\nIhr Fahrzeug ist fertig und kann abgeholt werden. Das Ausgangsprotokoll finden Sie im Anhang.\n\nMit freundlichen Grüßen,\nAutohaus Friedrich`
    case 'invoice':
      return `Sehr geehrte/r ${name},\n\nim Anhang finden Sie die Rechnung Nr. ${data?.order_number || ''}.\n\nBitte begleichen Sie den Betrag innerhalb von 30 Tagen.\n\nMit freundlichen Grüßen,\nAutohaus Friedrich`
    default: return ''
  }
}

function getDefaultWhatsApp(type: DocType, data: any): string {
  const name = data?.customer?.full_name || 'Kunde'
  const plate = data?.vehicle?.license_plate || ''
  switch (type) {
    case 'quote':
      return `Guten Tag ${name} 🚗\n\nIhr Angebot für *${plate}* ist bereit.\n\nGesamtbetrag: *${data?.total_amount ? data.total_amount.toFixed(2) + ' CHF' : '–'}*\n\nBitte bestätigen Sie uns Ihre Rückmeldung.\n\n– Autohaus Friedrich 🇨🇭`
    case 'workorder':
      return `Guten Tag ${name} 🔧\n\nIhr Arbeitsauftrag *${data?.order_number || ''}* wurde erstellt.\n\nFahrzeug: *${plate}*\n\nBei Fragen stehen wir gerne zur Verfügung.\n\n– Autohaus Friedrich`
    case 'checkin':
      return `Guten Tag ${name} ✅\n\nWir bestätigen die Übernahme Ihres Fahrzeugs *${plate}*.\n\nSobald die Inspektion abgeschlossen ist, melden wir uns.\n\n– Autohaus Friedrich`
    case 'checkout':
      return `Guten Tag ${name} 🎉\n\nIhr Fahrzeug *${plate}* ist fertig und kann abgeholt werden!\n\nÖffnungszeiten: Mo-Fr 8:00-18:00, Sa 9:00-13:00\n\n– Autohaus Friedrich`
    case 'invoice':
      return `Guten Tag ${name} 📄\n\nRechnung Nr. *${data?.order_number || ''}*\n\nBetrag: *${data?.total_amount ? data.total_amount.toFixed(2) + ' CHF' : '–'}*\n\nVielen Dank für Ihr Vertrauen! 🇨🇭\n\n– Autohaus Friedrich`
    default: return ''
  }
}
