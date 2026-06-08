/**
 * AUTOHAUS FRIEDRICH – User Seed Script
 *
 * Requires service role key (NOT the anon key).
 * Run from project root:
 *
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxx node supabase/seed_users.mjs
 *
 * Or add SUPABASE_SERVICE_ROLE_KEY to .env.local (never commit it!) and run:
 *   node -r dotenv/config supabase/seed_users.mjs dotenv_config_path=.env.local
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zpsjlmtrhsnchndifejd.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('❌  SUPABASE_SERVICE_ROLE_KEY is not set.')
  console.error('    Get it from: Supabase Dashboard → Project Settings → API → service_role key')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

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

async function run() {
  console.log('🔧  Autohaus Friedrich – User Setup\n')

  for (const user of USERS) {
    process.stdout.write(`  Creating ${user.full_name} (${user.role})… `)

    // Check if user already exists
    const { data: existing } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('email', user.email)
      .maybeSingle()

    if (existing) {
      // Update role if needed
      if (existing.role !== user.role) {
        await supabase.from('profiles').update({ role: user.role, full_name: user.full_name }).eq('id', existing.id)
        console.log(`⚡ already exists – role updated to ${user.role}`)
      } else {
        console.log('✓ already exists, skipped')
      }
      continue
    }

    // Create via Admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { full_name: user.full_name },
    })

    if (error) {
      console.log(`❌ ${error.message}`)
      continue
    }

    // Upsert profile with correct role
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: data.user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    })

    if (profileError) {
      console.log(`⚠️  user created but profile failed: ${profileError.message}`)
    } else {
      console.log(`✅ created (id: ${data.user.id.slice(0, 8)}…)`)
    }
  }

  console.log('\n📋  Current users:')
  const { data: profiles } = await supabase
    .from('profiles')
    .select('email, full_name, role')
    .in('email', USERS.map(u => u.email))

  profiles?.forEach(p => {
    console.log(`   ${p.role.padEnd(12)} ${p.full_name.padEnd(22)} ${p.email}`)
  })

  console.log('\n✅  Done.\n')
}

run().catch(console.error)
