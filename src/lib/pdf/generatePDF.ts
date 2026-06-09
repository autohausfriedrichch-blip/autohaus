import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type DocType = 'quote' | 'work_order' | 'checkin' | 'checkout' | 'invoice' | 'vhr' | 'fleet' | 'tire_hotel' | 'warranty'

export const DOC_TYPES: Record<DocType, string> = {
  quote:       'Árajánlat',
  work_order:  'Munkalap',
  checkin:     'Check-In Riport',
  checkout:    'Check-Out Riport',
  invoice:     'Számla Előkészítő',
  vhr:         'Vehicle Health Report',
  fleet:       'Flotta Riport',
  tire_hotel:  'Gumi Hotel Riport',
  warranty:    'Garancia Dokumentum',
}

const NAVY = [11, 30, 61] as [number, number, number]
const GOLD = [201, 168, 76] as [number, number, number]
const GRAY = [90, 106, 128] as [number, number, number]
const LIGHT = [244, 245, 247] as [number, number, number]

function addHeader(doc: jsPDF, title: string, docNumber: string) {
  // Navy top bar
  doc.setFillColor(...NAVY)
  doc.rect(0, 0, 210, 28, 'F')

  // Gold accent
  doc.setFillColor(...GOLD)
  doc.rect(0, 26, 210, 2, 'F')

  // Company name
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.text('AUTOHAUS FRIEDRICH', 14, 12)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(200, 200, 200)
  doc.text('Swiss Operations · Zürich', 14, 18)
  doc.text('Tel: +41 44 000 00 00 · info@autohaus-friedrich.ch', 14, 23)

  // Doc type + number (right)
  doc.setTextColor(...GOLD)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(title, 196, 12, { align: 'right' })

  doc.setTextColor(200, 200, 200)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text(docNumber, 196, 18, { align: 'right' })

  const now = new Date()
  doc.text(now.toLocaleDateString('de-CH'), 196, 23, { align: 'right' })
}

function addCustomerVehicleBlock(doc: jsPDF, data: any, yStart = 38) {
  let y = yStart
  doc.setFillColor(...LIGHT)
  doc.roundedRect(14, y, 85, 28, 2, 2, 'F')
  doc.roundedRect(111, y, 85, 28, 2, 2, 'F')

  doc.setTextColor(...NAVY)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('ÜGYFÉL', 18, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const cust = data.customer
  if (cust) {
    doc.text(cust.full_name || '', 18, y + 13)
    doc.setTextColor(...GRAY)
    doc.setFontSize(8)
    doc.text(cust.phone || '', 18, y + 19)
    doc.text(cust.email || '', 18, y + 24)
  }

  doc.setTextColor(...NAVY)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('JÁRMŰ', 115, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const veh = data.vehicle
  if (veh) {
    doc.text(`${veh.make || ''} ${veh.model || ''} ${veh.year || ''}`, 115, y + 13)
    doc.setTextColor(...GRAY)
    doc.setFontSize(8)
    doc.text(`Rendszám: ${veh.license_plate || ''}`, 115, y + 19)
    if (veh.vin) doc.text(`VIN: ${veh.vin}`, 115, y + 24)
  }

  return y + 36
}

export async function generatePDF(type: DocType, data: any, docNumber: string): Promise<void> {
  const doc = new jsPDF()
  const title = DOC_TYPES[type]

  addHeader(doc, title, docNumber)
  let y = addCustomerVehicleBlock(doc, data)

  doc.setDrawColor(...GOLD)
  doc.setLineWidth(0.5)
  doc.line(14, y - 4, 196, y - 4)

  if (type === 'quote') {
    y = addQuoteContent(doc, data, y)
  } else if (type === 'work_order') {
    y = addWorkOrderContent(doc, data, y)
  } else if (type === 'checkin') {
    y = addCheckInContent(doc, data, y)
  } else if (type === 'checkout') {
    y = addCheckOutContent(doc, data, y)
  } else if (type === 'vhr') {
    y = addVHRContent(doc, data, y)
  } else {
    // Generic
    doc.setTextColor(...NAVY)
    doc.setFontSize(10)
    doc.text(data.description || data.notes || 'Tartalom hamarosan elérhető', 14, y + 6)
  }

  addFooter(doc)
  doc.save(`${docNumber}.pdf`)
}

function addQuoteContent(doc: jsPDF, data: any, y: number): number {
  doc.setTextColor(...NAVY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('TÉTELEK', 14, y)
  y += 4

  const items: any[] = data.items || []
  if (items.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Megnevezés', 'Mennyiség', 'Egységár', 'Összeg']],
      body: items.map((item: any, i: number) => [
        i + 1,
        item.name || item.description || '',
        item.quantity || 1,
        `CHF ${(item.unit_price || 0).toFixed(2)}`,
        `CHF ${((item.quantity || 1) * (item.unit_price || 0)).toFixed(2)}`,
      ]),
      foot: [[
        '', '', '', 'Nettó összeg:', `CHF ${(data.total_amount || 0).toFixed(2)}`
      ]],
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 8 },
      footStyles: { fillColor: LIGHT, textColor: NAVY, fontStyle: 'bold' },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  if (data.notes) {
    doc.setTextColor(...GRAY)
    doc.setFontSize(8)
    doc.text('Megjegyzés: ' + data.notes, 14, y)
    y += 8
  }

  // Signature block
  y += 4
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.3)
  doc.line(14, y + 16, 90, y + 16)
  doc.line(120, y + 16, 196, y + 16)
  doc.setTextColor(...GRAY)
  doc.setFontSize(7)
  doc.text('Ügyfél aláírása', 14, y + 21)
  doc.text('Autohaus Friedrich', 120, y + 21)

  return y
}

function addWorkOrderContent(doc: jsPDF, data: any, y: number): number {
  doc.setTextColor(...NAVY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('MUNKALAP RÉSZLETEI', 14, y)
  y += 6

  const rows = [
    ['Munkalapszám', data.order_number || ''],
    ['Státusz', data.status || ''],
    ['Ütemezve', data.scheduled_date || ''],
    ['KM állás', data.checkin_mileage ? `${data.checkin_mileage} km` : ''],
    ['Üzemanyag', data.checkin_fuel_level ? `${data.checkin_fuel_level}%` : ''],
    ['Leírás', data.description || ''],
  ]

  autoTable(doc, {
    startY: y,
    body: rows,
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: LIGHT, cellWidth: 45 } },
    margin: { left: 14, right: 14 },
  })

  return (doc as any).lastAutoTable.finalY + 8
}

function addCheckInContent(doc: jsPDF, data: any, y: number): number {
  doc.setTextColor(...NAVY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('CHECK-IN ADATOK', 14, y)
  y += 6

  autoTable(doc, {
    startY: y,
    body: [
      ['Beérkezés időpontja', data.checkin_at ? new Date(data.checkin_at).toLocaleString('de-CH') : ''],
      ['KM állás', data.checkin_mileage ? `${data.checkin_mileage} km` : ''],
      ['Üzemanyag szint', data.checkin_fuel_level ? `${data.checkin_fuel_level}%` : ''],
      ['Munkalapszám', data.order_number || ''],
    ],
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: LIGHT, cellWidth: 60 } },
    margin: { left: 14, right: 14 },
  })

  let newY = (doc as any).lastAutoTable.finalY + 16
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.3)
  doc.line(14, newY, 90, newY)
  doc.setTextColor(...GRAY)
  doc.setFontSize(7)
  doc.text('Ügyfél aláírása – Átvétel', 14, newY + 5)

  return newY
}

function addCheckOutContent(doc: jsPDF, data: any, y: number): number {
  doc.setTextColor(...NAVY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('CHECK-OUT ADATOK', 14, y)
  y += 6

  autoTable(doc, {
    startY: y,
    body: [
      ['Átadás időpontja', data.checkout_at ? new Date(data.checkout_at).toLocaleString('de-CH') : ''],
      ['Elvégzett munkák', data.description || ''],
      ['Munkalapszám', data.order_number || ''],
    ],
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: LIGHT, cellWidth: 60 } },
    margin: { left: 14, right: 14 },
  })

  let newY = (doc as any).lastAutoTable.finalY + 16
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.3)
  doc.line(14, newY, 90, newY)
  doc.line(120, newY, 196, newY)
  doc.setTextColor(...GRAY)
  doc.setFontSize(7)
  doc.text('Ügyfél aláírása – Átvétel', 14, newY + 5)
  doc.text('Szerviztechnikus', 120, newY + 5)

  return newY
}

function addVHRContent(doc: jsPDF, data: any, y: number): number {
  doc.setTextColor(...NAVY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('VEHICLE HEALTH REPORT', 14, y)
  y += 6

  const categories = data.categories || []
  if (categories.length > 0) {
    const statusMap: Record<string, string> = { ok: 'Rendben ✓', watch: 'Figyelni kell ⚠', repair: 'Javítás javasolt ✗', not_checked: 'Nem ellenőrzött' }
    autoTable(doc, {
      startY: y,
      head: [['Kategória', 'Státusz', 'Megjegyzés']],
      body: categories.map((c: any) => [c.name, statusMap[c.status] || c.status, c.note || '']),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 6
  }

  if (data.health_score !== undefined) {
    doc.setFillColor(data.health_score >= 80 ? 52 : data.health_score >= 50 ? 200 : 201, data.health_score >= 80 ? 168 : data.health_score >= 50 ? 168 : 56, data.health_score >= 80 ? 76 : data.health_score >= 50 ? 0 : 76)
    doc.roundedRect(14, y, 60, 16, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text(`Health Score: ${data.health_score}/100`, 16, y + 10)
    y += 24
  }

  return y
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFillColor(...LIGHT)
    doc.rect(0, 284, 210, 13, 'F')
    doc.setTextColor(...GRAY)
    doc.setFontSize(7)
    doc.text('Autohaus Friedrich · Swiss Operations · info@autohaus-friedrich.ch · +41 44 000 00 00', 14, 290)
    doc.text(`Oldal ${i} / ${pageCount}`, 196, 290, { align: 'right' })
  }
}
