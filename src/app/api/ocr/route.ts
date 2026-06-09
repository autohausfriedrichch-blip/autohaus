import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const PROMPT = `Du analysierst ein Bild eines schweizer Fahrzeugausweises (Zulassungsdokument).
Extrahiere alle sichtbaren Felder und gib das Ergebnis als JSON zurück.

Antworte NUR mit einem JSON-Objekt, keine Erklärungen, kein Markdown. Format:
{
  "license_plate": "BE 123 456",
  "vin": "WBA3A5C50CF256932",
  "make": "BMW",
  "model": "320i",
  "year": "2019",
  "first_registration": "15.03.2019",
  "fuel_type": "Benzin",
  "displacement": "1998",
  "power_kw": "135",
  "color": "Schwarz",
  "seats": "5",
  "tare_weight": "1480",
  "total_weight": "2100",
  "document_number": "CH-BE-2023-001234",
  "owner_name": "Mustermann Hans",
  "owner_address": "Musterstrasse 12",
  "owner_postal_code": "3600",
  "owner_city": "Thun",
  "owner_country": "Schweiz"
}

Felder die nicht sichtbar/lesbar sind: weglassen oder leer lassen.
Feldcodes: A=Kennzeichen, B=Erstzulassung, D.1=Marke, D.2=Typ, E=FIN/VIN,
P.1=Hubraum(cc), P.2=Leistung(kW), P.3=Kraftstoff, R=Farbe, S.1=Sitzplätze,
G=Eigengewicht, F.1=Gesamtgewicht, C.1=Halter.`

export async function POST(request: NextRequest) {
  try {
    const { image_base64 } = await request.json()

    if (!image_base64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
    }

    // Strip data URL prefix
    const base64 = image_base64.replace(/^data:image\/[a-z]+;base64,/, '')
    const mediaType = image_base64.startsWith('data:image/png') ? 'image/png' : 'image/jpeg'

    const client = new Anthropic({ apiKey })

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: base64 },
            },
            { type: 'text', text: PROMPT },
          ],
        },
      ],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text : ''

    // Parse JSON from response
    let data: Record<string, string> = {}
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) data = JSON.parse(jsonMatch[0])
    } catch {
      // If JSON parse fails, return empty with raw text
    }

    // Build confidence scores (1.0 for all Claude-extracted fields)
    const confidence: Record<string, number> = {}
    for (const key of Object.keys(data)) {
      confidence[key] = data[key] ? 0.95 : 0
    }

    return NextResponse.json({
      success: true,
      raw_text: raw,
      extracted: data,
      extracted_data: data,
      confidence,
      confidence_scores: confidence,
      demo_mode: false,
    })
  } catch (error: any) {
    console.error('OCR error:', error)
    return NextResponse.json({ error: error.message || 'OCR failed' }, { status: 500 })
  }
}
