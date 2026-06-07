'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Ungültige E-Mail oder Passwort')
      setLoading(false)
    } else {
      router.replace('/admin')
    }
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center p-4">
      <div className="bg-white rounded-[20px] p-10 w-full max-w-sm shadow-[0_4px_24px_rgba(11,30,61,0.13)]">
        <div className="flex items-center gap-3 mb-7">
          <div className="w-11 h-11 bg-[#C9A84C] rounded-[10px] flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0B1E3D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="2"/><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <div>
            <div className="font-['DM_Serif_Display'] text-[20px] text-[#0B1E3D]">Autohaus Friedrich</div>
            <div className="text-[11px] text-[#5a6a80] tracking-[1px] uppercase">Operations System</div>
          </div>
        </div>

        {error && (
          <div className="bg-[#fdeaec] text-[#C9384C] text-[12px] px-3.5 py-2.5 rounded-lg mb-3.5">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[0.5px] mb-1.5">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="name@autohaus-friedrich.ch"
              autoComplete="email"
              required
              className="w-full px-3 py-2.5 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white text-[#0B1E3D] outline-none focus:border-[#0B1E3D] transition-colors"
            />
          </div>
          <div className="mb-3">
            <label className="block text-[11px] font-semibold text-[#5a6a80] uppercase tracking-[0.5px] mb-1.5">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full px-3 py-2.5 border border-[rgba(11,30,61,0.18)] rounded-lg text-[13px] bg-white text-[#0B1E3D] outline-none focus:border-[#0B1E3D] transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-[#0B1E3D] text-white rounded-[10px] text-[14px] font-semibold cursor-pointer hover:bg-[#142a50] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Anmeldung läuft...' : 'Anmelden'}
          </button>
        </form>

        <div className="mt-4 text-center text-[11px] text-[#5a6a80] flex items-center justify-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
          Supabase – gesichert & verschlüsselt
        </div>
      </div>
    </div>
  )
}
