import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatCurrency, formatDate } from './utils'

const NAVY = [11, 30, 61] as [number, number, number]
const GOLD = [201, 168, 76] as [number, number, number]
const RED = [201, 56, 76] as [number, number, number]
const GRAY = [90, 106, 128] as [number, number, number]
const LIGHT = [244, 245, 247] as [number, number, number]

function addHeader(doc: jsPDF, title: string, docNumber: string, date: string) {
  const pageW = doc.internal.pageSize.width

  // Navy header bar
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, pageW, 40, 'F')

  // Gold accent line
  doc.setFillColor(...GOLD)
  doc.rect(0, 40, pageW, 2, 'F')

  // Company name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('AUTOHAUS FRIEDRICH', 15, 16)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GOLD)
  doc.text('SWISS AUTOMOTIVE SERVICE', 15, 23)

  // Swiss cross
  doc.setFillColor(...RED)
  doc.rect(15, 27, 8, 8, 'F')
  doc.setFillColor(255, 255, 255)
  doc.rect(17.5, 28.5, 3, 5, 'F')
  doc.rect(15.5, 30.5, 7, 1.5, 'F')

  // Document info (right side)
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text(title, pageW - 15, 16, { align: 'right' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GOLD)
  doc.text(`Nr. ${docNumber}`, pageW - 15, 24, { align: 'right' })
  doc.text(`Datum: ${date}`, pageW - 15, 31, { align: 'right' })

  return 52
}

function addFooter(doc: jsPDF) {
  const pageW = doc.internal.pageSize.width
  const pageH = doc.internal.pageSize.height

  doc.setFillColor(...NAVY)
  doc.rect(0, pageH - 18, pageW, 18, 'F')

  doc.setTextColor(...GOLD)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Autohaus Friedrich – Swiss Automotive Service', pageW / 2, pageH - 10, { align: 'center' })
  doc.text('autohaus-kappa.vercel.app', pageW / 2, pageH - 5, { align: 'center' })
}

function infoBox(doc: jsPDF, x: number, y: number, w: number, title: string, lines: string[]) {
  doc.setFillColor(...LIGHT)
  doc.roundedRect(x, y, w, 8 + lines.length * 5.5, 2, 2, 'F')
  doc.setFillColor(...GOLD)
  doc.roundedRect(x, y, w, 7, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text(title.toUpperCase(), x + 4, y + 4.5)
  doc.setTextColor(...NAVY)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  lines.forEach((l, i) => doc.text(l, x + 4, y + 12 + i * 5.5))
  return y + 8 + lines.length * 5.5 + 4
}

// =================== QUOTE PDF ===================
export function generateQuotePDF(quote: any): jsPDF {
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.width

  let y = addHeader(doc, 'ÁRAJÁNLAT', quote.id?.slice(0, 8).toUpperCase() || 'AJ-0001', formatDate(quote.created_at || new Date()))

  // Customer & Vehicle info boxes
  const customer = quote.customer || {}
  const vehicle = quote.vehicle || {}
  infoBox(doc, 15, y, 85, 'Ügyfél adatai', [
    customer.full_name || '–',
    customer.phone || '',
    customer.email || '',
  ])
  infoBox(doc, 110, y, 85, 'Jármű adatai', [
    `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || '–',
    vehicle.license_plate ? `Rendszám: ${vehicle.license_plate}` : '',
    vehicle.year ? `Évjárat: ${vehicle.year}` : '',
  ])

  y += 40

  // Valid until
  if (quote.valid_until) {
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(`Érvényesség: ${formatDate(quote.valid_until)}`, 15, y)
    y += 8
  }

  // Items table
  const items = quote.items || []
  const tableData = items.map((item: any) => [
    item.description || '',
    item.item_type === 'labor' ? 'Munkadíj' : item.item_type === 'part' ? 'Alkatrész' : 'Egyéb',
    item.quantity?.toString() || '1',
    formatCurrency(item.unit_price || 0),
    formatCurrency((item.quantity || 1) * (item.unit_price || 0)),
  ])

  autoTable(doc, {
    startY: y,
    head: [['Leírás', 'Típus', 'Mennyiség', 'Egységár', 'Összeg']],
    body: tableData,
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: NAVY },
    alternateRowStyles: { fillColor: LIGHT },
    columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
    margin: { left: 15, right: 15 },
    theme: 'plain',
  })

  y = (doc as any).lastAutoTable.finalY + 8

  // Totals
  const totalsX = pageW - 85
  const subtotal = (quote.parts_cost || 0) + (quote.labor_cost || 0)
  const tax = subtotal * ((quote.tax_rate || 7.7) / 100)

  doc.setDrawColor(...LIGHT)
  doc.line(totalsX, y, pageW - 15, y)
  y += 6

  const addTotalRow = (label: string, value: string, bold = false) => {
    doc.setFontSize(bold ? 10 : 8)
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    const color = bold ? NAVY : GRAY
    doc.setTextColor(...color)
    doc.text(label, totalsX, y)
    doc.text(value, pageW - 15, y, { align: 'right' })
    y += bold ? 8 : 6
  }

  addTotalRow('Munkadíj:', formatCurrency(quote.labor_cost || 0))
  addTotalRow('Alkatrészek:', formatCurrency(quote.parts_cost || 0))
  addTotalRow(`ÁFA (${quote.tax_rate || 7.7}%):`, formatCurrency(tax))

  doc.setFillColor(...NAVY)
  doc.roundedRect(totalsX - 4, y - 2, pageW - 15 - totalsX + 19, 10, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('VÉGÖSSZEG:', totalsX, y + 5.5)
  doc.setTextColor(...GOLD)
  doc.text(formatCurrency(quote.total_amount || 0), pageW - 15, y + 5.5, { align: 'right' })
  y += 18

  if (quote.notes) {
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.setFont('helvetica', 'normal')
    doc.text('Megjegyzés:', 15, y)
    doc.text(quote.notes, 15, y + 6, { maxWidth: pageW - 30 })
  }

  addFooter(doc)
  return doc
}

// =================== WORK ORDER PDF ===================
export function generateWorkOrderPDF(wo: any): jsPDF {
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.width

  let y = addHeader(doc, 'MUNKALAP', wo.order_number || 'WO-0001', formatDate(wo.created_at || new Date()))

  const customer = wo.customer || {}
  const vehicle = wo.vehicle || {}

  infoBox(doc, 15, y, 55, 'Ügyfél', [customer.full_name || '–', customer.phone || ''])
  infoBox(doc, 75, y, 65, 'Jármű', [
    `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || '–',
    vehicle.license_plate || '',
    wo.checkin_mileage ? `KM: ${wo.checkin_mileage.toLocaleString()}` : '',
  ])
  infoBox(doc, 145, y, 50, 'Státusz / Szerelő', [
    wo.status || '',
    wo.mechanic?.full_name || '–',
    wo.scheduled_date ? formatDate(wo.scheduled_date) : '',
  ])

  y += 42

  // Details
  const sections = [
    { title: 'Hibaleírás', content: wo.fault_description },
    { title: 'Elvégzendő munka', content: wo.work_to_do },
    { title: 'Elvégzett munka', content: wo.work_done },
  ]

  sections.forEach(s => {
    if (s.content) {
      doc.setFillColor(...LIGHT)
      doc.rect(15, y, pageW - 30, 5, 'F')
      doc.setFillColor(...GOLD)
      doc.rect(15, y, 3, 5, 'F')
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...NAVY)
      doc.text(s.title, 21, y + 3.5)
      y += 8
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      const lines = doc.splitTextToSize(s.content, pageW - 34)
      doc.text(lines, 18, y)
      y += lines.length * 5 + 4
    }
  })

  // Costs table
  autoTable(doc, {
    startY: y,
    head: [['Tétel', 'Összeg']],
    body: [
      ['Munkadíj', formatCurrency(wo.labor_cost || 0)],
      ['Alkatrészek', formatCurrency(wo.parts_cost || 0)],
      ['VÉGÖSSZEG', formatCurrency(wo.total_amount || 0)],
    ],
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 9, textColor: NAVY },
    columnStyles: { 1: { halign: 'right' } },
    foot: [],
    margin: { left: 15, right: 15 },
    theme: 'plain',
    didParseCell: (data) => {
      if (data.row.index === 2) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.fillColor = LIGHT
      }
    },
  })

  // Signature box
  const sigY = (doc as any).lastAutoTable.finalY + 15
  doc.setDrawColor(...GRAY)
  doc.line(15, sigY + 15, 90, sigY + 15)
  doc.line(120, sigY + 15, pageW - 15, sigY + 15)
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Ügyfél aláírása', 15, sigY + 19)
  doc.text('Szerelő aláírása', 120, sigY + 19)

  if (wo.customer_notes) {
    doc.setFontSize(7)
    doc.setTextColor(...GRAY)
    doc.text(`Megjegyzés: ${wo.customer_notes}`, 15, sigY + 28)
  }

  addFooter(doc)
  return doc
}

// =================== CHECK-IN PDF ===================
export function generateCheckInPDF(wo: any): jsPDF {
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.width

  let y = addHeader(doc, 'CHECK-IN DOKUMENTUM', wo.order_number || 'CI-0001', formatDate(wo.checkin_at || new Date()))

  const customer = wo.customer || {}
  const vehicle = wo.vehicle || {}

  infoBox(doc, 15, y, 85, 'Ügyfél adatai', [customer.full_name || '–', customer.phone || ''])
  infoBox(doc, 110, y, 85, 'Jármű adatai', [
    `${vehicle.make || ''} ${vehicle.model || ''}`.trim() || '–',
    `Rendszám: ${vehicle.license_plate || '–'}`,
    `KM-állás: ${wo.checkin_mileage ? wo.checkin_mileage.toLocaleString() + ' km' : '–'}`,
    `Üzemanyag: ${wo.checkin_fuel_level ? wo.checkin_fuel_level + '%' : '–'}`,
  ])

  y += 50

  // Checklist
  autoTable(doc, {
    startY: y,
    head: [['Ellenőrzési pont', 'Állapot']],
    body: [
      ['Kilométeróra rögzítve', wo.checkin_mileage ? '✓' : '–'],
      ['Üzemanyag szint rögzítve', wo.checkin_fuel_level ? '✓' : '–'],
      ['Kulcs átvéve', '✓'],
      ['Fotódokumentáció elkészült', '–'],
      ['Ügyfél értesítve', '–'],
    ],
    headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 9, textColor: NAVY },
    columnStyles: { 1: { halign: 'center', cellWidth: 30 } },
    margin: { left: 15, right: 15 },
    theme: 'plain',
    alternateRowStyles: { fillColor: LIGHT },
  })

  y = (doc as any).lastAutoTable.finalY + 20

  // Signatures
  doc.setDrawColor(...GRAY)
  doc.line(15, y, 90, y)
  doc.line(120, y, pageW - 15, y)
  doc.setFontSize(7)
  doc.setTextColor(...GRAY)
  doc.text('Ügyfél aláírása / Dátum', 15, y + 5)
  doc.text('Átvevő aláírása / Dátum', 120, y + 5)

  addFooter(doc)
  return doc
}

export function generateCheckOutPDF(order: any, settings?: any): jsPDF {
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.width
  const companyName = settings?.company?.name || 'Autohaus Friedrich'
  const date = new Date().toLocaleDateString('de-CH')

  addHeader(doc, 'CHECK-OUT DOKUMENTUM', order.order_number || '', date)

  let y = 55
  // Customer info
  infoBox(doc, 15, y, 85, 'ÜGYFÉL', [
    (order.customer?.full_name || order.customer_name || '–'),
    (order.customer?.phone || ''),
  ])
  // Vehicle info
  infoBox(doc, 110, y, 85, 'JÁRMŰ', [
    `${order.vehicle?.make || ''} ${order.vehicle?.model || ''}`.trim() || '–',
    `Rendszám: ${order.vehicle?.license_plate || '–'}`,
    `Km-állás be: ${order.checkin_mileage || '–'}`,
  ])

  y += 38
  // Work summary
  doc.setFontSize(10); doc.setTextColor(...NAVY); doc.setFont('helvetica', 'bold')
  doc.text('Elvégzett munkák:', 15, y)
  doc.setFont('helvetica', 'normal')
  y += 7
  const workText = doc.splitTextToSize(order.work_done || order.fault_description || '–', pageW - 30)
  doc.setFontSize(10); doc.setTextColor(...GRAY)
  doc.text(workText, 15, y)
  y += workText.length * 5 + 8

  // Cost table
  autoTable(doc, {
    startY: y,
    head: [['Tétel', 'Összeg (CHF)']],
    body: [
      ['Munkadíj', formatCurrency(order.labor_cost || 0)],
      ['Alkatrész', formatCurrency(order.parts_cost || 0)],
      ['ÁFA (7.7%)', formatCurrency((order.total_amount || 0) * 0.077 / 1.077)],
      ['ÖSSZESEN', formatCurrency(order.total_amount || 0)],
    ],
    headStyles: { fillColor: NAVY, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.row.index === 3) {
        data.cell.styles.fillColor = [244,245,247]
        data.cell.styles.fontStyle = 'bold'
      }
    },
    margin: { left: 15, right: 15 },
  })

  y = (doc as any).lastAutoTable.finalY + 12
  // Payment status
  const paid = order.payment_status === 'paid'
  doc.setFillColor(...(paid ? [220,252,231] as [number,number,number] : [254,242,242] as [number,number,number]))
  doc.roundedRect(15, y, pageW - 30, 10, 2, 2, 'F')
  doc.setFontSize(10); doc.setTextColor(...(paid ? [22,163,74] as [number,number,number] : RED))
  doc.text(paid ? '✓ FIZETVE' : '○ FIZETÉS FOLYAMATBAN', pageW / 2, y + 6.5, { align: 'center' })
  y += 18

  // Signatures
  doc.setDrawColor(...GRAY)
  doc.line(15, y, 90, y); doc.line(120, y, pageW - 15, y)
  doc.setFontSize(7); doc.setTextColor(...GRAY)
  doc.text('Ügyfél átvételi aláírása / Dátum', 15, y + 5)
  doc.text('Átadó aláírása / Dátum', 120, y + 5)

  addFooter(doc)
  return doc
}

export function generateInvoicePDF(order: any, settings?: any): jsPDF {
  const doc = new jsPDF()
  const pageW = doc.internal.pageSize.width
  const companyName = settings?.company?.name || 'Autohaus Friedrich'
  const companyAddress = `${settings?.company?.address || ''}, ${settings?.company?.postal_code || ''} ${settings?.company?.city || ''}`
  const iban = settings?.company?.iban || 'CH56 0483 5012 3456 7800 9'
  const mwst = settings?.company?.mwst || 'CHE-123.456.789 MWST'
  const invoiceDate = new Date().toLocaleDateString('de-CH')
  const dueDate = new Date(Date.now() + 30 * 86400000).toLocaleDateString('de-CH')

  addHeader(doc, 'RECHNUNG / SZÁMLA', `RE-${order.order_number || ''}`, invoiceDate)

  let y = 55
  // Biller info (left)
  doc.setFontSize(8); doc.setTextColor(...GRAY)
  doc.text([companyName, companyAddress, settings?.company?.phone || '', settings?.company?.email || ''], 15, y)

  // Customer/recipient (right)
  infoBox(doc, 120, y, 75, 'SZÁMLÁZVA ERRE', [
    order.customer?.full_name || '–',
    order.customer?.address || '',
    `${order.customer?.postal_code || ''} ${order.customer?.city || ''}`.trim(),
  ])

  y += 30
  // Invoice meta
  autoTable(doc, {
    startY: y,
    head: [['Számla száma', 'Munkalap', 'Dátum', 'Fizetési határidő']],
    body: [[
      `RE-${order.order_number}`, order.order_number || '–', invoiceDate, dueDate
    ]],
    headStyles: { fillColor: LIGHT, textColor: NAVY, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 9 },
    margin: { left: 15, right: 15 },
  })

  y = (doc as any).lastAutoTable.finalY + 10
  // Services table
  const subTotal = (order.labor_cost || 0) + (order.parts_cost || 0)
  const vatAmt = subTotal * 0.077
  const total = subTotal + vatAmt

  const rows: any[] = []
  if (order.labor_cost > 0) rows.push(['Munkadíj / Arbeitskosten', '1', formatCurrency(order.labor_cost), formatCurrency(order.labor_cost)])
  if (order.parts_cost > 0) rows.push(['Alkatrész / Ersatzteile', '1', formatCurrency(order.parts_cost), formatCurrency(order.parts_cost)])
  if (order.travel_cost > 0) rows.push(['Kiszállási díj / Fahrtkosten', '1', formatCurrency(order.travel_cost), formatCurrency(order.travel_cost)])
  rows.push(['', '', 'Nettó összeg:', formatCurrency(subTotal)])
  rows.push(['', '', 'MWST 7.7%:', formatCurrency(vatAmt)])
  rows.push(['', '', 'ÖSSZESEN / TOTAL:', formatCurrency(total)])

  autoTable(doc, {
    startY: y,
    head: [['Leírás', 'Menny.', 'Egységár', 'Összeg (CHF)']],
    body: rows,
    headStyles: { fillColor: NAVY, textColor: [255,255,255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: (data) => {
      if (data.row.index >= rows.length - 3 && data.section === 'body') {
        data.cell.styles.fillColor = LIGHT
      }
      if (data.row.index === rows.length - 1 && data.section === 'body') {
        data.cell.styles.fontSize = 11
        data.cell.styles.fillColor = NAVY
        data.cell.styles.textColor = [255, 255, 255]
      }
    },
    margin: { left: 15, right: 15 },
  })

  y = (doc as any).lastAutoTable.finalY + 14
  // Payment info box
  doc.setFillColor(...LIGHT)
  doc.roundedRect(15, y, pageW - 30, 24, 3, 3, 'F')
  doc.setFontSize(8); doc.setTextColor(...GRAY)
  doc.text('Bankverbindung / Bankszámla:', 20, y + 6)
  doc.setTextColor(...NAVY)
  doc.setFontSize(9)
  doc.text(`IBAN: ${iban}`, 20, y + 12)
  doc.text(`MWST-Nr: ${mwst}`, 20, y + 18)
  doc.text(`Zahlungsfrist: ${dueDate}`, 120, y + 12)

  addFooter(doc)
  return doc
}
