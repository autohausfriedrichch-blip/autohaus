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
  } else if (type === 'invoice') {
    y = addInvoiceContent(doc, data, y)
  } else if (type === 'fleet') {
    y = addFleetContent(doc, data, y)
  } else if (type === 'tire_hotel') {
    y = addTireHotelContent(doc, data, y)
  } else if (type === 'warranty') {
    y = addWarrantyContent(doc, data, y)
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

function addInvoiceContent(doc: jsPDF, data: any, y: number): number {
  // Invoice info block
  const invoiceNum = data.invoice_number || data.order_number || 'INV-00000'
  const invoiceDate = data.invoice_date ? new Date(data.invoice_date).toLocaleDateString('de-CH') : new Date().toLocaleDateString('de-CH')
  const dueDate = data.due_date ? new Date(data.due_date).toLocaleDateString('de-CH') : ''

  doc.setFillColor(...LIGHT)
  doc.roundedRect(111, y - 30, 85, 24, 2, 2, 'F')
  doc.setTextColor(...NAVY)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('SZÁMLA ADATOK', 115, y - 24)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(`Számlaszám: ${invoiceNum}`, 115, y - 18)
  doc.text(`Dátum: ${invoiceDate}`, 115, y - 13)
  if (dueDate) doc.text(`Fizetési határidő: ${dueDate}`, 115, y - 8)

  doc.setTextColor(...NAVY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('SZÁMLÁZOTT TÉTELEK', 14, y)
  y += 5

  const items: any[] = data.items || []
  const vatRate = data.vat_rate ?? 7.7
  const subtotal = data.subtotal ?? (data.total_amount ? data.total_amount / (1 + vatRate / 100) : 0)
  const vat = data.vat ?? (subtotal * vatRate / 100)
  const total = data.total_amount ?? (subtotal + vat)

  if (items.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['#', 'Megnevezés / Munkaleírás', 'Menny.', 'Egységár (CHF)', 'Összeg (CHF)']],
      body: items.map((item: any, i: number) => [
        i + 1,
        item.name || item.description || item.title || '',
        item.quantity ?? 1,
        Number(item.unit_price ?? item.price ?? 0).toFixed(2),
        (Number(item.quantity ?? 1) * Number(item.unit_price ?? item.price ?? 0)).toFixed(2),
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 8 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 85 }, 2: { cellWidth: 15, halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 4
  }

  // Totals block (right-aligned)
  const totalsX = 130
  autoTable(doc, {
    startY: y,
    body: [
      ['Nettó összeg:', `CHF ${subtotal.toFixed(2)}`],
      [`ÁFA (${vatRate}%):`, `CHF ${vat.toFixed(2)}`],
      ['BRUTTÓ ÖSSZEG:', `CHF ${total.toFixed(2)}`],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [255, 255, 255], textColor: GRAY, halign: 'right', cellWidth: 55 },
      1: { halign: 'right', cellWidth: 35 },
    },
    bodyStyles: { fillColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [255, 255, 255] },
    didParseCell: (hook: any) => {
      if (hook.row.index === 2) {
        hook.cell.styles.fillColor = NAVY
        hook.cell.styles.textColor = [255, 255, 255]
        hook.cell.styles.fontStyle = 'bold'
        hook.cell.styles.fontSize = 10
      }
    },
    margin: { left: totalsX, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 8

  // Payment info
  if (data.iban || data.bank_name) {
    doc.setFillColor(...LIGHT)
    doc.roundedRect(14, y, 182, 20, 2, 2, 'F')
    doc.setTextColor(...NAVY)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text('FIZETÉSI ADATOK', 18, y + 6)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRAY)
    if (data.bank_name) doc.text(`Bank: ${data.bank_name}`, 18, y + 12)
    if (data.iban) doc.text(`IBAN: ${data.iban}`, 18, y + 17)
    if (data.payment_method) doc.text(`Fizetési mód: ${data.payment_method}`, 100, y + 12)
    y += 26
  }

  // Payment status badge
  const pStatus = data.payment_status || 'pending'
  const pColors: Record<string, [number, number, number]> = { paid: [52, 168, 83], pending: [201, 168, 76], partial: [234, 150, 40] }
  const pLabels: Record<string, string> = { paid: 'FIZETVE', pending: 'FÜGGŐBEN', partial: 'RÉSZBEN FIZETVE' }
  doc.setFillColor(...(pColors[pStatus] || pColors.pending))
  doc.roundedRect(14, y, 50, 12, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(pLabels[pStatus] || pStatus.toUpperCase(), 39, y + 8, { align: 'center' })
  y += 20

  // Signature
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.3)
  doc.line(14, y + 14, 90, y + 14)
  doc.line(120, y + 14, 196, y + 14)
  doc.setTextColor(...GRAY)
  doc.setFontSize(7)
  doc.text('Ügyfél aláírása', 14, y + 19)
  doc.text('Autohaus Friedrich', 120, y + 19)

  return y
}

function addFleetContent(doc: jsPDF, data: any, y: number): number {
  const account = data.fleet_account || {}
  const vehicles: any[] = data.vehicles || []
  const period = data.period || new Date().toLocaleDateString('de-CH', { year: 'numeric', month: 'long' })

  // Fleet account header
  doc.setFillColor(...NAVY)
  doc.roundedRect(14, y - 2, 182, 18, 2, 2, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(account.company_name || account.name || 'Flotta partner', 18, y + 7)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GOLD)
  doc.text(`Riport időszak: ${period}`, 18, y + 13)
  if (account.discount_pct) doc.text(`Kedvezmény: ${account.discount_pct}%`, 160, y + 7, { align: 'right' })
  y += 24

  // Summary stats
  const totalCost = data.total_cost ?? vehicles.reduce((s: number, v: any) => s + Number(v.total_cost ?? 0), 0)
  const woCount = data.work_order_count ?? vehicles.reduce((s: number, v: any) => s + Number(v.work_order_count ?? 0), 0)
  const discount = account.discount_pct ? totalCost * account.discount_pct / 100 : 0
  const finalCost = totalCost - discount

  const summaryData = [
    ['Járművek száma', vehicles.length.toString()],
    ['Elvégzett munkák', woCount.toString()],
    ['Bruttó összeg', `CHF ${totalCost.toFixed(2)}`],
    ['Flotta kedvezmény', account.discount_pct ? `${account.discount_pct}% (−CHF ${discount.toFixed(2)})` : '—'],
    ['NETTÓ FIZETENDŐ', `CHF ${finalCost.toFixed(2)}`],
  ]

  autoTable(doc, {
    startY: y,
    body: summaryData,
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: LIGHT, cellWidth: 60 } },
    didParseCell: (hook: any) => {
      if (hook.row.index === 4) {
        hook.cell.styles.fillColor = NAVY
        hook.cell.styles.textColor = [255, 255, 255]
        hook.cell.styles.fontStyle = 'bold'
      }
    },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 8

  // Vehicles breakdown
  if (vehicles.length > 0) {
    doc.setTextColor(...NAVY)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('JÁRMŰVEK RÉSZLETEZÉSE', 14, y)
    y += 5

    autoTable(doc, {
      startY: y,
      head: [['Rendszám', 'Jármű', 'Sofőr', 'Munkák', 'KM', 'Összeg (CHF)']],
      body: vehicles.map((v: any) => [
        v.plate || v.license_plate || '—',
        `${v.make || ''} ${v.model || ''} ${v.year || ''}`.trim() || '—',
        v.driver_name || '—',
        v.work_order_count ?? '—',
        v.total_km ? `${v.total_km} km` : '—',
        Number(v.total_cost ?? 0).toFixed(2),
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255], fontSize: 8 },
      columnStyles: { 5: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // Work orders list
  const orders: any[] = data.work_orders || []
  if (orders.length > 0) {
    doc.setTextColor(...NAVY)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('MUNKALAPOK', 14, y)
    y += 5

    autoTable(doc, {
      startY: y,
      head: [['Munkalapszám', 'Dátum', 'Rendszám', 'Munkaleírás', 'Státusz', 'CHF']],
      body: orders.map((o: any) => [
        o.order_number || '—',
        o.scheduled_date || o.created_at?.slice(0, 10) || '—',
        o.plate || '—',
        (o.work_done || o.fault_description || '').slice(0, 35),
        o.status || '—',
        Number(o.total_amount ?? 0).toFixed(2),
      ]),
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: GRAY, textColor: [255, 255, 255], fontSize: 7 },
      columnStyles: { 5: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  return y
}

function addTireHotelContent(doc: jsPDF, data: any, y: number): number {
  const tires: any[] = data.tires || []
  const checkinDate = data.checkin_date ? new Date(data.checkin_date).toLocaleDateString('de-CH') : '—'
  const checkoutDate = data.checkout_date ? new Date(data.checkout_date).toLocaleDateString('de-CH') : 'Tárolt'
  const location = data.storage_location || data.location || '—'
  const fee = data.storage_fee ?? 0

  // Storage info
  doc.setFillColor(...LIGHT)
  doc.roundedRect(14, y, 182, 22, 2, 2, 'F')
  doc.setTextColor(...NAVY)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('GUMI HOTEL ADATOK', 18, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  doc.text(`Beérkezés: ${checkinDate}`, 18, y + 12)
  doc.text(`Kivétel: ${checkoutDate}`, 18, y + 17)
  doc.text(`Tárolóhely: ${location}`, 80, y + 12)
  doc.text(`Tárolási díj: CHF ${Number(fee).toFixed(2)} / hónap`, 80, y + 17)
  y += 28

  // Tire table
  doc.setTextColor(...NAVY)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text('TÁROLT GUMIABRONCSOK', 14, y)
  y += 5

  if (tires.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Pozíció', 'Márka / Típus', 'Méret', 'DOT', 'Profilmélység', 'Állapot']],
      body: tires.map((t: any) => [
        t.position || '—',
        `${t.brand || ''} ${t.model || ''}`.trim() || '—',
        t.size || '—',
        t.dot || '—',
        t.tread_depth ? `${t.tread_depth} mm` : '—',
        t.condition || 'Rendben',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  } else {
    doc.setTextColor(...GRAY)
    doc.setFontSize(9)
    doc.text('4 db gumi tárolva (részletes lista nem érhető el)', 14, y)
    y += 10
  }

  if (data.notes) {
    doc.setTextColor(...GRAY)
    doc.setFontSize(8)
    doc.text('Megjegyzés: ' + data.notes, 14, y)
    y += 8
  }

  // Handover signature
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.3)
  doc.line(14, y + 14, 90, y + 14)
  doc.line(120, y + 14, 196, y + 14)
  doc.setTextColor(...GRAY)
  doc.setFontSize(7)
  doc.text('Ügyfél aláírása – Átadás / Átvétel', 14, y + 19)
  doc.text('Autohaus Friedrich', 120, y + 19)

  return y
}

function addWarrantyContent(doc: jsPDF, data: any, y: number): number {
  const warrantyNum = data.warranty_number || `GAR-${Date.now().toString().slice(-6)}`
  const startDate = data.start_date ? new Date(data.start_date).toLocaleDateString('de-CH') : new Date().toLocaleDateString('de-CH')
  const endDate = data.end_date ? new Date(data.end_date).toLocaleDateString('de-CH') : '—'
  const months = data.warranty_months ?? 12
  const coverageKm = data.coverage_km ?? null

  // Warranty badge
  doc.setFillColor(...GOLD)
  doc.roundedRect(14, y - 2, 182, 20, 3, 3, 'F')
  doc.setTextColor(...NAVY)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('GARANCIA DOKUMENTUM', 105, y + 9, { align: 'center' })
  y += 26

  // Warranty details
  autoTable(doc, {
    startY: y,
    body: [
      ['Garancia száma', warrantyNum],
      ['Érvényesség kezdete', startDate],
      ['Érvényesség vége', endDate],
      ['Garancia időtartama', `${months} hónap`],
      ['KM határ', coverageKm ? `${coverageKm.toLocaleString()} km` : 'Nincs KM határ'],
      ['Munkaszám', data.order_number || '—'],
    ],
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: 'bold', fillColor: LIGHT, cellWidth: 60 } },
    margin: { left: 14, right: 14 },
  })
  y = (doc as any).lastAutoTable.finalY + 8

  // Covered work
  const works: any[] = data.covered_works || data.items || []
  if (works.length > 0) {
    doc.setTextColor(...NAVY)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.text('GARANCIÁVAL FEDEZETT MUNKÁK', 14, y)
    y += 5

    autoTable(doc, {
      startY: y,
      head: [['#', 'Munka megnevezése', 'Alkatrész / Anyag', 'Garancia típusa']],
      body: works.map((w: any, i: number) => [
        i + 1,
        w.name || w.title || w.description || '',
        w.part_name || w.part || '—',
        w.warranty_type || 'Alkatrész + munkadíj',
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: NAVY, textColor: [255, 255, 255] },
      margin: { left: 14, right: 14 },
    })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  // Exclusions / conditions
  const conditions = data.conditions || [
    'A garancia nem vonatkozik kopóalkatrészekre (fékbetét, gumi, szűrők).',
    'A garancia érvénytelen külső behatás, baleset vagy helytelen kezelés esetén.',
    'A garanciaigény érvényesítéséhez ez a dokumentum és a munkajegy szükséges.',
    'A garanciális javítást kizárólag az Autohaus Friedrich végezheti el.',
  ]

  doc.setFillColor(...LIGHT)
  doc.roundedRect(14, y, 182, conditions.length * 8 + 10, 2, 2, 'F')
  doc.setTextColor(...NAVY)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.text('GARANCIA FELTÉTELEK', 18, y + 6)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRAY)
  conditions.forEach((c: string, i: number) => {
    doc.text(`• ${c}`, 18, y + 12 + i * 7, { maxWidth: 174 })
  })
  y += conditions.length * 7 + 16

  // Signatures
  doc.setDrawColor(...NAVY)
  doc.setLineWidth(0.3)
  doc.line(14, y + 14, 90, y + 14)
  doc.line(120, y + 14, 196, y + 14)
  doc.setTextColor(...GRAY)
  doc.setFontSize(7)
  doc.text('Ügyfél aláírása', 14, y + 19)
  doc.text('Autohaus Friedrich', 120, y + 19)

  // Warranty stamp (top right area)
  doc.setDrawColor(...GOLD)
  doc.setLineWidth(1)
  doc.circle(175, 90, 16)
  doc.setTextColor(...GOLD)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.text('GARANCIA', 175, 87, { align: 'center' })
  doc.text(`${months} HÓNAP`, 175, 93, { align: 'center' })
  doc.text('ÉRVÉNYES', 175, 99, { align: 'center' })

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
