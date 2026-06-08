import { NextRequest, NextResponse } from 'next/server'

// Swiss Fahrzeugausweis field codes (EU registration doc format)
const SWISS_FIELD_PATTERNS = {
  license_plate: [/(?:Kennzeichen|Immatrikulationsnummer|A\s*[:\-])\s*([A-Z]{2}\s*\d{1,6})/i, /\b([A-Z]{2}\s+\d{3,4}\s+[A-Z]{0,3})\b/],
  vin: [/(?:FIN|VIN|Fahrzeugidentifikationsnummer|E\s*[:\-])\s*([A-HJ-NPR-Z0-9]{17})/i, /\b([A-HJ-NPR-Z0-9]{17})\b/],
  make: [/(?:Marke|Hersteller|D\.1\s*[:\-])\s*([A-ZÄÖÜa-zäöü\-\s]{2,30})/i],
  model: [/(?:Typ|Modell|Handelsname|D\.2\s*[:\-])\s*([A-ZÄÖÜa-zäöü0-9\-\s\.]{2,40})/i],
  first_registration: [/(?:Datum der Erstzulassung|Erstzulassung|B\s*[:\-])\s*(\d{2}[.\-/]\d{2}[.\-/]\d{4}|\d{4})/i],
  fuel_type: [/(?:Kraftstoff|Treibstoff|P\.3\s*[:\-])\s*(Benzin|Diesel|Elektro|Hybrid|Gas|LPG|CNG)/i],
  displacement: [/(?:Hubraum|Zylinderinhalt|P\.1\s*[:\-])\s*(\d{3,4})\s*(?:cm3|ccm|cc)?/i],
  power_kw: [/(?:Motorleistung|Leistung|P\.2\s*[:\-])\s*(\d{2,4})\s*(?:kW|KW)/i],
  color: [/(?:Farbe|Grundfarbe|R\s*[:\-])\s*([A-ZÄÖÜa-zäöü]{3,20})/i],
  seats: [/(?:Sitzplätze|Sitzplatz|S\.1\s*[:\-])\s*(\d{1,2})/i],
  tare_weight: [/(?:Eigengewicht|Leergewicht|G\s*[:\-])\s*(\d{3,5})\s*(?:kg)?/i],
  total_weight: [/(?:Gesamtgewicht|Zulässiges Gesamtgewicht|F\.1\s*[:\-])\s*(\d{3,5})\s*(?:kg)?/i],
  owner_name: [/(?:Name|Halter|C\.1\s*[:\-])\s*([A-ZÄÖÜa-zäöüß\-\s,]{3,50})/i],
  owner_address: [/(?:Strasse|Adresse|C\.1\.2\s*[:\-])\s*([A-ZÄÖÜa-zäöüß0-9\-\s\.]{5,60})/i],
  owner_postal_code: [/\b(\d{4,5})\b(?:\s+[A-ZÄÖÜa-zäöü])/],
  owner_city: [/(?:Ort|Gemeinde|C\.1\.3\s*[:\-])\s*([A-ZÄÖÜa-zäöü\-\s]{2,30})/i],
  document_number: [/(?:Dokumentennummer|Ausweisnummer|I\s*[:\-])\s*([A-Z0-9]{5,15})/i],
}

function extractFieldsFromText(text: string): { data: Record<string, string>; confidence: Record<string, number> } {
  const data: Record<string, string> = {}
  const confidence: Record<string, number> = {}

  for (const [field, patterns] of Object.entries(SWISS_FIELD_PATTERNS)) {
    for (let i = 0; i < patterns.length; i++) {
      const match = text.match(patterns[i])
      if (match && match[1]) {
        data[field] = match[1].trim()
        // First pattern = higher confidence
        confidence[field] = i === 0 ? 0.9 : 0.6
        break
      }
    }
    if (!data[field]) {
      confidence[field] = 0
    }
  }

  return { data, confidence }
}

async function callGoogleVision(base64Image: string, apiKey: string): Promise<string> {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: [{
          image: { content: base64Image },
          features: [
            { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
          ],
        }],
      }),
    }
  )
  const result = await response.json()
  return result.responses?.[0]?.fullTextAnnotation?.text || ''
}

export async function POST(request: NextRequest) {
  try {
    const { image_base64, side, document_id } = await request.json()

    if (!image_base64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    // Strip data URL prefix if present
    const base64 = image_base64.replace(/^data:image\/[a-z]+;base64,/, '')

    let rawText = ''
    const apiKey = process.env.GOOGLE_VISION_API_KEY || ''

    if (apiKey) {
      rawText = await callGoogleVision(base64, apiKey)
    } else {
      // Demo mode: return mock data for testing
      rawText = `Fahrzeugausweis
A: BE 123 456
E: WBA3A5C50CF256932
D.1: BMW
D.2: 320i
B: 15.03.2019
P.3: Benzin
P.1: 1998 cm3
P.2: 135 kW
R: Schwarz
S.1: 5
G: 1480 kg
F.1: 2100 kg
C.1: Mustermann Hans
C.1.2: Musterstrasse 12
C.1.3: 3600 Thun
I: CH-BE-2023-001234`
    }

    const { data, confidence } = extractFieldsFromText(rawText)

    return NextResponse.json({
      success: true,
      raw_text: rawText,
      extracted: data,
      confidence,
      demo_mode: !apiKey,
    })
  } catch (error: any) {
    console.error('OCR error:', error)
    return NextResponse.json({ error: error.message || 'OCR failed' }, { status: 500 })
  }
}
