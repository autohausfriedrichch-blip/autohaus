import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Te az Autohaus Friedrich svájci autószerelő műhely AI asszisztense vagy.
Segítesz professzionális ügyfélkommunikációban: emailek, WhatsApp üzenetek, foglalás visszaigazolások.
Stílusod: udvarias, precíz, svájci professzionalizmus. Alapértelmezetten magyar nyelven válaszolsz,
de ha a kérésben más nyelv szerepel (DE/FR/EN), azon a nyelven.
Soha nem adsz ki belső műszaki vagy pénzügyi adatokat. Max 300 szó per üzenet.`

const SWISS_GERMAN_SYSTEM = `Du bist der KI-Assistent von Autohaus Friedrich, einer Premium-Autowerkstatt in der Schweiz.
Deine Kommunikation ist stets: kurz, präzise, höflich, vertrauenserweckend und im Schweizer Premium-Ton.
Schreibe immer auf Deutsch (Hochdeutsch, leicht schweizerisch gefärbt).
Verwende CHF für Preise. Stelle nie eine sichere Diagnose – formuliere immer als Möglichkeit.
Satz "Nach der Prüfung erhalten Sie eine genaue Einschätzung." verwenden wenn nötig.`

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mode, context } = body

    let userPrompt = ''
    let systemPrompt = SYSTEM_PROMPT
    let maxTokens = 600

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

    } else if (mode === 'service_advisor') {
      systemPrompt = SWISS_GERMAN_SYSTEM
      maxTokens = 800
      const { problem, brand, model, year, mileage } = context
      userPrompt = `Ein Kunde schildert folgendes Problem:
Fahrzeug: ${year || ''} ${brand || ''} ${model || ''} (${mileage ? mileage + ' km' : 'km unbekannt'})
Problem: ${problem}

Deine Aufgabe:
1. Stelle 3–5 gezielte Rückfragen, um das Problem besser einzugrenzen (nummeriert)
2. Nenne 2–4 mögliche Fehlerursachen (als Möglichkeiten, NICHT als sichere Diagnose)
3. Empfehle einen Werkstatttermin mit dem Hinweis: "Nach der Prüfung erhalten Sie eine genaue Einschätzung."

Format:
## Rückfragen
1. ...
2. ...

## Mögliche Ursachen
- ...

## Empfehlung
...`

    } else if (mode === 'quote_generator') {
      systemPrompt = SWISS_GERMAN_SYSTEM
      maxTokens = 1200
      const { brand, model, year, service, partsCost, laborHours, hourlyRate, extras, customerName, plate } = context
      const labor = (parseFloat(laborHours || '0') * parseFloat(hourlyRate || '150')).toFixed(2)
      const parts = parseFloat(partsCost || '0').toFixed(2)
      const extrasAmt = parseFloat(extras || '0').toFixed(2)
      const subtotal = (parseFloat(labor) + parseFloat(parts) + parseFloat(extrasAmt)).toFixed(2)
      const vat = (parseFloat(subtotal) * 0.081).toFixed(2)
      const total = (parseFloat(subtotal) + parseFloat(vat)).toFixed(2)

      userPrompt = `Erstelle ein professionelles Angebot für:
Kunde: ${customerName || 'Kunde'}
Fahrzeug: ${year || ''} ${brand || ''} ${model || ''} ${plate ? '(' + plate + ')' : ''}
Leistung: ${service}
Arbeitszeit: ${laborHours} Std. à CHF ${hourlyRate}/h = CHF ${labor}
Ersatzteile: CHF ${parts}
Sonstiges: CHF ${extrasAmt}
Zwischensumme: CHF ${subtotal}
MwSt. 8.1%: CHF ${vat}
Gesamtbetrag: CHF ${total}

Erstelle VIER Versionen (trenne sie mit ---):

## 1. Formelles Angebot (Deutsch)
(Professioneller Brief/Email-Text, vollständig mit Anrede und Abschluss)

---

## 2. WhatsApp-Nachricht
(Kurz, freundlich, max 5 Zeilen, mit Preisübersicht)

---

## 3. Email-Version
(Etwas ausführlicher als WhatsApp, professionell aber warm)

---

## 4. Interne Werkstattnotiz (Englisch)
(Technische Kurzinfo für das Team, auf Englisch)`

    } else if (mode === 'status_update') {
      systemPrompt = SWISS_GERMAN_SYSTEM
      maxTokens = 500
      const { status, plate, customerName, additionalInfo, mechanicName } = context
      const statusLabels: Record<string, string> = {
        received: 'Fahrzeug eingegangen / Diagnose ausstehend',
        diagnosing: 'Diagnose läuft',
        waiting_parts: 'Warten auf Ersatzteile',
        in_progress: 'Reparatur in Arbeit',
        ready: 'Fahrzeug fertig / abholbereit',
        delivered: 'Fahrzeug abgeholt / abgeschlossen',
      }
      userPrompt = `Schreibe eine höfliche Statusmitteilung an den Kunden.
Status: ${statusLabels[status] || status}
Kunde: ${customerName || 'Kunde'}
Fahrzeug/Kennzeichen: ${plate || '–'}
${mechanicName ? 'Zuständiger Mechaniker: ' + mechanicName : ''}
${additionalInfo ? 'Zusatzinfo: ' + additionalInfo : ''}

Ton: kurz, präzise, vertrauenserweckend, Schweizer Premium.
Schreibe NUR die Nachricht (ohne Betreff, ohne Erklärungen).
2–4 Sätze. Persönliche Anrede mit Kundenname.`

    } else if (mode === 'pickup_delivery') {
      systemPrompt = SWISS_GERMAN_SYSTEM
      maxTokens = 400
      const { type, plate, customerName, driverName, address, time } = context
      const typeLabels: Record<string, string> = {
        before_pickup: 'Abholankündigung (morgen/heute wird das Fahrzeug abgeholt)',
        driver_en_route: 'Fahrer ist unterwegs zur Abholung',
        arrived_workshop: 'Fahrzeug ist in der Werkstatt angekommen',
        return_delivery: 'Fahrzeug wird zurückgebracht',
        handover_complete: 'Übergabe abgeschlossen',
      }
      userPrompt = `Schreibe eine kurze WhatsApp/SMS-Nachricht für folgenden Anlass:
Anlass: ${typeLabels[type] || type}
Kunde: ${customerName || 'Kunde'}
Fahrer: ${driverName || 'unser Fahrer'}
Adresse: ${address || '–'}
${time ? 'Uhrzeit: ' + time : ''}
Kennzeichen: ${plate || '–'}

Ton: freundlich, professionell, kurz (max 4 Sätze). Nur die Nachricht.`

    } else if (mode === 'message_rewriter') {
      systemPrompt = SWISS_GERMAN_SYSTEM
      maxTokens = 600
      const { text, targetChannel } = context
      const channelNote = targetChannel === 'whatsapp' ? 'WhatsApp (informell, kurz, mit Emoji wenn passend)' :
        targetChannel === 'email' ? 'Email (formell, vollständig)' :
        targetChannel === 'sms' ? 'SMS (sehr kurz, max 160 Zeichen)' : 'allgemein'
      userPrompt = `Schreibe folgenden Text in einem professionellen Schweizer Premium-Ton um.
Zielkanal: ${channelNote}
Originaltext: "${text}"

Schreibe NUR den umgeschriebenen Text. Keine Erklärungen.`

    } else {
      userPrompt = context?.prompt || 'Szia!'
    }

    const stream = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: systemPrompt,
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
