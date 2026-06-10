import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Te az Autohaus Friedrich svájci autószerelő műhely AI asszisztense vagy.
Segítesz professzionális ügyfélkommunikációban: emailek, WhatsApp üzenetek, foglalás visszaigazolások.
Stílusod: udvarias, precíz, svájci professzionalizmus. Alapértelmezetten magyar nyelven válaszolsz,
de ha a kérésben más nyelv szerepel (DE/FR/EN), azon a nyelven.
Soha nem adsz ki belső műszaki vagy pénzügyi adatokat. Max 300 szó per üzenet.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode, context } = body

    let userPrompt = ''

    if (mode === 'compose') {
      const { messageType, language, customerName, vehiclePlate, details } = context
      userPrompt = `Írj egy ${messageType} típusú üzenetet ${language} nyelven.
Ügyfél: ${customerName || 'Tisztelt Ügyfelünk'}
Rendszám: ${vehiclePlate || '–'}
Részletek: ${details || 'Nincs megadva'}
Formátum: csak a kész üzenet szövege, bevezetés nélkül.`
    } else if (mode === 'technician') {
      const { technical } = context
      userPrompt = `Fordítsd le ezt a műszaki szöveget ügyfélbarát, közérthető magyar nyelvre:
"${technical}"
Ne használj szakkifejezéseket. Max 3 mondat.`
    } else if (mode === 'followup') {
      const { customerName, lastVisit, vehicle, services } = context
      userPrompt = `Írj egy barátságos utókövetési üzenetet WhatsApp-ra.
Ügyfél: ${customerName}
Utolsó látogatás: ${lastVisit}
Jármű: ${vehicle}
Elvégzett munkák: ${services}
Legyen személyes, max 5 sor.`
    } else {
      userPrompt = context?.prompt || 'Szia!'
    }

    const stream = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
      stream: true,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
