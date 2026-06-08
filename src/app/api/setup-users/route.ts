import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL = 'https://zpsjlmtrhsnchndifejd.supabase.co'

const USERS = [
  {
    email: 'adminfriedrichautohaus@gmail.com',
    password: 'Puntigamer1989@',
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
  // Accept service key from header or env
  const serviceKey = req.headers.get('x-service-key')
    || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceKey) {
    return NextResponse.json({ error: 'Service key required (x-service-key header)' }, { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const results: any[] = []

  for (const user of USERS) {
    // Try to delete existing first (clean slate)
    const { data: existing } = await supabase.auth.admin.listUsers()
    const found = existing?.users?.find(u => u.email === user.email)
    if (found) {
      await supabase.auth.admin.deleteUser(found.id)
    }

    // Create fresh
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

    // Create profile
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    })

    results.push({ email: user.email, status: '✅ created', role: user.role })
  }

  return NextResponse.json({ success: true, results })
}
