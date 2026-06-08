import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://zpsjlmtrhsnchndifejd.supabase.co'

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwc2psbXRyaHNuY2huZGlmZWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MDYwMTgsImV4cCI6MjA5NjM4MjAxOH0.Er_vfq8uvobMC1cpJWfxcz4Zsrhck-bTbX45Fn5jSIA'

let client: SupabaseClient | null = null

export function createClient() {
  if (!client) {
    client = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return client
}
