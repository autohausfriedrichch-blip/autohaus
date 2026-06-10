import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.access_token || null
}

function buildMimeMessage(opts: {
  from: string
  to: string[]
  cc?: string[]
  subject: string
  bodyHtml: string
  attachments?: { filename: string; mimeType: string; data: string }[]
}): string {
  const boundary = `boundary_${Date.now()}`
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to.join(', ')}`,
    opts.cc?.length ? `Cc: ${opts.cc.join(', ')}` : '',
    `Subject: =?UTF-8?B?${Buffer.from(opts.subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ].filter(Boolean).join('\r\n')

  const htmlPart = [
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(opts.bodyHtml).toString('base64'),
  ].join('\r\n')

  const attachmentParts = (opts.attachments || []).map(att => [
    `--${boundary}`,
    `Content-Type: ${att.mimeType}; name="${att.filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${att.filename}"`,
    '',
    att.data,
  ].join('\r\n')).join('\r\n')

  return `${headers}\r\n\r\n${htmlPart}\r\n${attachmentParts}\r\n--${boundary}--`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { to, cc, subject, bodyHtml, attachments, customerId, vehicleId, workOrderId } = body

    if (!to || !subject || !bodyHtml) {
      return NextResponse.json({ error: 'Hiányzó mezők: to, subject, bodyHtml' }, { status: 400 })
    }

    // Get email account
    const { data: account } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!account) {
      return NextResponse.json({ error: 'Gmail fiók nincs csatlakoztatva' }, { status: 400 })
    }

    // Refresh token if needed
    let accessToken = account.access_token
    const expiresAt = account.token_expires_at ? new Date(account.token_expires_at) : new Date(0)
    if (expiresAt <= new Date()) {
      accessToken = await refreshAccessToken(account.refresh_token)
      if (!accessToken) {
        return NextResponse.json({ error: 'Token frissítése sikertelen – csatlakozz újra' }, { status: 401 })
      }
      await supabase.from('email_accounts')
        .update({ access_token: accessToken, token_expires_at: new Date(Date.now() + 3600000).toISOString() })
        .eq('id', account.id)
    }

    const toList = Array.isArray(to) ? to : [to]
    const mime = buildMimeMessage({
      from: `${account.display_name} <${account.email}>`,
      to: toList,
      cc: cc || [],
      subject,
      bodyHtml,
      attachments: attachments || [],
    })

    const encoded = Buffer.from(mime).toString('base64url')

    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encoded }),
    })

    if (!gmailRes.ok) {
      const err = await gmailRes.text()
      return NextResponse.json({ error: `Gmail API hiba: ${err}` }, { status: 500 })
    }

    const gmailData = await gmailRes.json()

    // Try to match customer by email
    let resolvedCustomerId = customerId
    if (!resolvedCustomerId && toList[0]) {
      const { data: cust } = await supabase.from('customers').select('id').eq('email', toList[0]).single()
      resolvedCustomerId = cust?.id || null
    }

    // Save to DB
    await supabase.from('emails').insert({
      account_id: account.id,
      gmail_message_id: gmailData.id,
      gmail_thread_id: gmailData.threadId,
      direction: 'outbound',
      status: 'sent',
      from_email: account.email,
      from_name: account.display_name,
      to_emails: toList,
      cc_emails: cc || [],
      subject,
      body_html: bodyHtml,
      attachments: attachments ? attachments.map((a: any) => ({ filename: a.filename, mimeType: a.mimeType })) : [],
      customer_id: resolvedCustomerId,
      vehicle_id: vehicleId || null,
      work_order_id: workOrderId || null,
      sent_at: new Date().toISOString(),
    })

    return NextResponse.json({ success: true, messageId: gmailData.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
