import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// One-time setup endpoint – protected by SETUP_SECRET env var
// Call once: POST /api/setup-users  with header X-Setup-Secret: <your-secret>
// After use, set SETUP_SECRET to empty string in Vercel to disable.

const USERS = [
  {
    email: 'adminfriedrichautohaus@gmail.com',
    password: 'AdminFA2026@',
    full_name: 'Barbara Friedrich',
    role: 'super_admin',
  },
  {
    email: 'autohausfriedrich.ch@gmail.com',
    password: 'Puntigamer1989@',
    full_name: 'Karl Friedrich',
    role: 'mechanic',
  },
]

export async function POST(req: NextRequest) {
  // Guard: require secret header
  const secret = process.env.SETUP_SECRET
  if (!secret || secret.trim() === '') {
    return NextResponse.json({ error: 'Setup endpoint is disabled (SETUP_SECRET not set)' }, { status: 403 })
  }
  const provided = req.headers.get('x-setup-secret')
  if (provided !== secret) {
    return NextResponse.json({ error: 'Invalid setup secret' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const results: any[] = []

  for (const user of USERS) {
    // Check if profile already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', user.email)
      .maybeSingle()

    if (existing) {
      // Ensure role is correct
      await supabase.from('profiles')
        .update({ role: user.role, full_name: user.full_name })
        .eq('id', existing.id)
      results.push({ email: user.email, status: 'already_exists_role_updated' })
      continue
    }

    // Create user via Admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.full_name },
    })

    if (error) {
      results.push({ email: user.email, status: 'error', message: error.message })
      continue
    }

    // Create profile with correct role
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    })

    results.push({
      email: user.email,
      status: profileError ? 'user_created_profile_failed' : 'created',
      id: data.user.id,
      profileError: profileError?.message,
    })
  }

  return NextResponse.json({ success: true, results })
}
