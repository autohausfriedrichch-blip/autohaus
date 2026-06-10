import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function refreshAccessToken(account: any): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token || null
}

function decodeBase64(str: string): string {
  try {
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
  } catch {
    return ''
  }
}

function extractBody(payload: any): { html: string; text: string } {
  let html = ''
  let text = ''

  function walk(part: any) {
    if (!part) return
    if (part.mimeType === 'text/html' && part.body?.data) html = decodeBase64(part.body.data)
    if (part.mimeType === 'text/plain' && part.body?.data) text = decodeBase64(part.body.data)
    if (part.parts) part.parts.forEach(walk)
  }

  walk(payload)
  return { html, text }
}

function getHeader(headers: any[], name: string): string {
  return headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: account } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!account) return NextResponse.json({ error: 'Nincs Gmail fiók' }, { status: 400 })

    let accessToken = account.access_token
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : new Date(0)
    if (expiresAt <= new Date()) {
      accessToken = await refreshAccessToken(account)
      if (!accessToken) return NextResponse.json({ error: 'Token lejárt' }, { status: 401 })
      await supabase.from('email_accounts')
        .update({ access_token: accessToken, token_expires_at: new Date(Date.now() + 3600000).toISOString() })
        .eq('id', account.id)
    }

    // List recent inbox messages (last 50)
    const listRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=in:inbox newer_than:30d',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!listRes.ok) return NextResponse.json({ error: 'Gmail lista hiba' }, { status: 500 })
    const listData = await listRes.json()
    const messages = listData.messages || []

    // Get existing message IDs to avoid duplicates
    const { data: existing } = await supabase
      .from('emails')
      .select('gmail_message_id')
      .not('gmail_message_id', 'is', null)
    const existingIds = new Set((existing || []).map((e: any) => e.gmail_message_id))

    const newMessages = messages.filter((m: any) => !existingIds.has(m.id))
    let synced = 0

    for (const msg of newMessages.slice(0, 20)) {
      const msgRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      if (!msgRes.ok) continue
      const msgData = await msgRes.json()
      const headers = msgData.payload?.headers || []
      const { html, text } = extractBody(msgData.payload)

      const fromRaw = getHeader(headers, 'from')
      const fromMatch = fromRaw.match(/^(.*?)\s*<(.+?)>$/)
      const fromName = fromMatch ? fromMatch[1].trim().replace(/"/g, '') : fromRaw
      const fromEmail = fromMatch ? fromMatch[2] : fromRaw

      const toRaw = getHeader(headers, 'to')
      const toEmails = toRaw ? toRaw.split(',').map((e: string) => e.trim()) : []
      const subject = getHeader(headers, 'subject')
      const dateStr = getHeader(headers, 'date')
      const receivedAt = dateStr ? new Date(dateStr).toISOString() : new Date().toISOString()

      // Try customer match
      let customerId = null
      if (fromEmail) {
        const { data: cust } = await supabase.from('customers').select('id').eq('email', fromEmail).single()
        customerId = cust?.id || null
      }

      const labels = msgData.labelIds || []

      await supabase.from('emails').upsert({
        account_id: account.id,
        gmail_message_id: msg.id,
        gmail_thread_id: msgData.threadId,
        direction: 'inbound',
        status: labels.includes('UNREAD') ? 'sent' : 'delivered',
        from_email: fromEmail,
        from_name: fromName,
        to_emails: toEmails,
        subject,
        body_html: html,
        body_text: text,
        attachments: [],
        customer_id: customerId,
        received_at: receivedAt,
        labels,
      }, { onConflict: 'gmail_message_id' })

      synced++
    }

    return NextResponse.json({ success: true, synced, total: messages.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
