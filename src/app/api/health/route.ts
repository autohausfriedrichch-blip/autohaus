import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return NextResponse.json({
    url_set: !!url,
    url_value: url || 'MISSING',
    key_set: !!key,
    key_starts_with: key ? key.slice(0, 10) + '...' : 'MISSING',
    key_format: key?.startsWith('eyJ') ? 'JWT ✅' : key?.startsWith('sb_') ? 'sb_publishable ❌' : 'MISSING ❌',
  })
}
