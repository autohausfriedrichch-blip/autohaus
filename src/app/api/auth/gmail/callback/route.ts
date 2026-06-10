import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const error = req.nextUrl.searchParams.get('error')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/admin?page=settings&tab=email&error=oauth_denied`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = `${appUrl}/api/auth/gmail/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/admin?page=settings&tab=email&error=no_credentials`)
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${appUrl}/admin?page=settings&tab=email&error=token_exchange`)
  }

  const tokens = await tokenRes.json()

  // Get user email
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const userInfo = await userRes.json()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`)
  }

  const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000)

  await supabase.from('email_accounts').upsert({
    user_id: user.id,
    email: userInfo.email,
    display_name: userInfo.name || userInfo.email,
    provider: 'gmail',
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: expiresAt.toISOString(),
    is_active: true,
    connected_at: new Date().toISOString(),
  }, { onConflict: 'email' })

  return NextResponse.redirect(`${appUrl}/admin?page=settings&tab=email&connected=1`)
}
