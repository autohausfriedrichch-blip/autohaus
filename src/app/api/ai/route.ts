import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Te az Autohaus Friedrich svájci autószerviz AI asszisztense vagy.
A szerviz prémium svájci autószerviz, ahol kiváló minőségű ügyfélkommunikációt végzünk.

Feladataid:
- Professzionális ügyfélüzenetek írása (WhatsApp, email, SMS)
- Technikus megjegyzések átírása ügyfélbarát szöveggé
- Többnyelvű kommunikáció (de, hu, en)

Stílus:
- Svájci/német üzleti stílus: udvarias, precíz, rövid
- Magyar: formális, de barátságos
- Angol: professional, clean
- Mindig: "Autohaus Friedrich" aláírás
- Emojis csak WhatsApp esetén, mértékkel
- Soha ne találj ki adatokat (pl. CHF összegek, dátumok) — csak a megadott kontextust használd

Formátum: Csak magát az üzenetet add vissza, semmi más magyarázat.`

export async function POST(req: NextRequest) {
  const { mode, lang, msgType, context, techInput } = await req.json()

  let userPrompt = ''

  if (mode === 'compose') {
    const typeLabels: Record<string, string> = {
      whatsapp_reply: 'WhatsApp válasz',
      email_reply: 'formális email válasz',
      appointment_confirm: 'időpont visszaigazolás',
      quote_cover: 'árajánlat kísérő levél',
      status_update: 'státuszfrissítés',
      review_request: 'Google Review kérés',
      complaint_reply: 'reklamáció válasz',
      followup: 'utánkövetés',
    }
    const langLabels: Record<string, string> = { de: 'németül', hu: 'magyarul', en: 'angolul' }

    userPrompt = `Írj egy ${typeLabels[msgType] || msgType} üzenetet ${langLabels[lang] || lang}.
${context ? `\nKontextus / részletek:\n${context}` : '\nNincs extra kontextus, írj általánosan.'}

Az üzenet stílusa legyen professzionális, ${msgType === 'whatsapp_reply' ? 'közvetlen és barátságos (WhatsApp)' : 'formális'}.`
  } else if (mode === 'technician') {
    userPrompt = `Alakítsd át ezt a technikus megjegyzést ügyfélbarát, érthető szöveggé magyarul.
A szöveg legyen: rövid (2-3 mondat), érthető (nem szakmai), bizalomkeltő, és indokolja a szükséges munkát.

Technikus megjegyzés: "${techInput}"`
  } else if (mode === 'followup') {
    userPrompt = `Írj egy rövid, személyes utánkövetés üzenetet ${lang === 'de' ? 'németül' : lang === 'en' ? 'angolul' : 'magyarul'}.
Kontextus: ${context}
Stílus: barátságos, nem tolakodó, egy konkrét cselekvésre ösztönző.`
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userPrompt }],
          stream: true,
        })

        for await (const event of response) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err: any) {
        controller.enqueue(encoder.encode(`\n[Hiba: ${err.message}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
    },
  })
}
