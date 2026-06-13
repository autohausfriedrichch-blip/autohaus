// Centralized translation dictionary for PDF documents
// Add new languages by adding a new key to each section

export type PdfLang = 'de' | 'en'

export interface PdfTranslations {
  // Header titles
  workOrder: string
  quote: string
  checkIn: string
  checkOut: string
  invoice: string

  // Common labels
  customer: string
  vehicle: string
  licensePlate: string
  mileage: string
  fuel: string
  date: string
  status: string
  mechanic: string
  scheduledDate: string
  number: string

  // Work order sections
  faultDescription: string
  scopeOfWork: string
  workCompleted: string
  notes: string
  customerNotes: string
  internalNotes: string

  // Cost table
  item: string
  amount: string
  laborCost: string
  partsCost: string
  total: string

  // Signatures
  customerSignature: string
  mechanicSignature: string
  signature: string

  // Check-in/out
  checkInDocument: string
  checkOutDocument: string
  checklistPoint: string
  checklistStatus: string
  mileageRecorded: string
  fuelRecorded: string
  visualInspectionDone: string
  customerPresent: string
  keysHandedOver: string
  documentsChecked: string
  checkInNotes: string
  checkOutNotes: string
  workSummary: string
  customerComment: string

  // File names
  fileWorkOrder: string
  fileQuote: string
  fileCheckIn: string
  fileCheckOut: string
  fileInvoice: string

  // Contact / footer info
  contact: string
  phone: string
  email: string
  website: string
}

const de: PdfTranslations = {
  workOrder: 'ARBEITSAUFTRAG',
  quote: 'ANGEBOT',
  checkIn: 'EINGANGSPROTOKOLL',
  checkOut: 'AUSGANGSPROTOKOLL',
  invoice: 'RECHNUNG',

  customer: 'Kunde',
  vehicle: 'Fahrzeug',
  licensePlate: 'Kennzeichen',
  mileage: 'Kilometerstand',
  fuel: 'Kraftstoff',
  date: 'Datum',
  status: 'Status',
  mechanic: 'Mechaniker',
  scheduledDate: 'Termin',
  number: 'Nr.',

  faultDescription: 'Fehlerbeschreibung',
  scopeOfWork: 'Arbeitsumfang',
  workCompleted: 'Durchgeführte Arbeiten',
  notes: 'Notizen',
  customerNotes: 'Kundennotizen',
  internalNotes: 'Interne Notizen',

  item: 'Position',
  amount: 'Betrag',
  laborCost: 'Arbeitskosten',
  partsCost: 'Ersatzteile',
  total: 'GESAMTBETRAG',

  customerSignature: 'Unterschrift Kunde',
  mechanicSignature: 'Unterschrift Mechaniker',
  signature: 'Unterschrift',

  checkInDocument: 'EINGANGSPROTOKOLL',
  checkOutDocument: 'AUSGANGSPROTOKOLL',
  checklistPoint: 'Prüfpunkt',
  checklistStatus: 'Status',
  mileageRecorded: 'Kilometerstand erfasst',
  fuelRecorded: 'Kraftstoffstand erfasst',
  visualInspectionDone: 'Sichtprüfung durchgeführt',
  customerPresent: 'Kunde anwesend',
  keysHandedOver: 'Schlüssel übergeben',
  documentsChecked: 'Dokumente geprüft',
  checkInNotes: 'Eingangsnotizen',
  checkOutNotes: 'Ausgangsnotizen',
  workSummary: 'Arbeitszusammenfassung',
  customerComment: 'Kundenkommentar',

  fileWorkOrder: 'Arbeitsauftrag',
  fileQuote: 'Angebot',
  fileCheckIn: 'Eingangsprotokoll',
  fileCheckOut: 'Ausgangsprotokoll',
  fileInvoice: 'Rechnung',

  contact: 'Kontakt',
  phone: 'Tel.',
  email: 'E-Mail',
  website: 'Web',
}

const en: PdfTranslations = {
  workOrder: 'WORK ORDER',
  quote: 'QUOTATION',
  checkIn: 'CHECK-IN DOCUMENT',
  checkOut: 'CHECK-OUT DOCUMENT',
  invoice: 'INVOICE',

  customer: 'Customer',
  vehicle: 'Vehicle',
  licensePlate: 'License Plate',
  mileage: 'Mileage',
  fuel: 'Fuel Level',
  date: 'Date',
  status: 'Status',
  mechanic: 'Mechanic',
  scheduledDate: 'Scheduled Date',
  number: 'No.',

  faultDescription: 'Fault Description',
  scopeOfWork: 'Scope of Work',
  workCompleted: 'Work Completed',
  notes: 'Notes',
  customerNotes: 'Customer Notes',
  internalNotes: 'Internal Notes',

  item: 'Item',
  amount: 'Amount',
  laborCost: 'Labor Cost',
  partsCost: 'Parts & Materials',
  total: 'TOTAL AMOUNT',

  customerSignature: 'Customer Signature',
  mechanicSignature: 'Mechanic Signature',
  signature: 'Signature',

  checkInDocument: 'CHECK-IN DOCUMENT',
  checkOutDocument: 'CHECK-OUT DOCUMENT',
  checklistPoint: 'Checklist Item',
  checklistStatus: 'Status',
  mileageRecorded: 'Mileage recorded',
  fuelRecorded: 'Fuel level recorded',
  visualInspectionDone: 'Visual inspection done',
  customerPresent: 'Customer present',
  keysHandedOver: 'Keys handed over',
  documentsChecked: 'Documents checked',
  checkInNotes: 'Check-in notes',
  checkOutNotes: 'Check-out notes',
  workSummary: 'Work Summary',
  customerComment: 'Customer Comment',

  fileWorkOrder: 'Work_Order',
  fileQuote: 'Quotation',
  fileCheckIn: 'Check_In',
  fileCheckOut: 'Check_Out',
  fileInvoice: 'Invoice',

  contact: 'Contact',
  phone: 'Tel.',
  email: 'Email',
  website: 'Web',
}

// Future: add 'fr' | 'it' here
export const PDF_TRANSLATIONS: Record<PdfLang, PdfTranslations> = { de, en }

export function t(lang: PdfLang): PdfTranslations {
  return PDF_TRANSLATIONS[lang] ?? de
}

export const LANG_OPTIONS: { value: PdfLang; label: string; flag: string }[] = [
  { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { value: 'en', label: 'English', flag: '🇬🇧' },
]
