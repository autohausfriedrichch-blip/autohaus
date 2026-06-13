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
      setError('Hibás e-mail cím vagy jelszó.')
      setLoading(false)
    } else {
      router.replace('/admin')
    }
  }

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4"
         style={{ fontFamily: "'Poppins', sans-serif" }}>

      {/* Background subtle pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
           style={{ backgroundImage: 'repeating-linear-gradient(0deg, #fff, #fff 1px, transparent 1px, transparent 60px), repeating-linear-gradient(90deg, #fff, #fff 1px, transparent 1px, transparent 60px)' }} />

      <div className="relative w-full max-w-sm">

        {/* Logo block */}
        <div className="text-center mb-10">
          {/* AF monogram */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-5 relative"
               style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #242424 100%)', border: '1px solid rgba(200,16,46,0.3)' }}>
            <span className="text-[32px] font-['Montserrat'] font-black tracking-tight"
                  style={{ background: 'linear-gradient(135deg, #E6E6E6 30%, #B8B8B8 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              AF
            </span>
            {/* Red accent line */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-full bg-[#C8102E]" />
          </div>

          <div className="font-['Montserrat'] text-[22px] font-bold text-white tracking-[2px] uppercase mb-1">
            Autohaus Friedrich
          </div>
          <div className="text-[10px] text-[#888888] tracking-[3px] uppercase flex items-center justify-center gap-2">
            <div className="w-8 h-px bg-[#333]" />
            Swiss Automotive Service
            <div className="w-8 h-px bg-[#333]" />
          </div>

          {/* Swiss flag */}
          <div className="flex justify-center mt-3">
            <span className="text-lg">🇨🇭</span>
          </div>
        </div>

        {/* Login card */}
        <div className="rounded-2xl p-8"
             style={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.08)' }}>

          <div className="mb-6">
            <h2 className="text-[15px] font-semibold text-white mb-1">Bejelentkezés</h2>
            <p className="text-[12px] text-[#888]">Adja meg hozzáférési adatait</p>
          </div>

          {error && (
            <div className="bg-[#C8102E]/15 border border-[#C8102E]/30 text-[#ff6b7a] text-[12px] px-4 py-3 rounded-xl mb-5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#C8102E] shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10.5px] font-semibold text-[#888] uppercase tracking-[1px] mb-2">
                E-mail cím
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nev@autohaus-friedrich.ch"
                autoComplete="email"
                required
                className="w-full px-4 py-3 rounded-xl text-[13px] text-white placeholder-[#555] outline-none transition-all"
                style={{
                  background: '#242424',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                onFocus={e => e.target.style.border = '1px solid rgba(200,16,46,0.6)'}
                onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.08)'}
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-semibold text-[#888] uppercase tracking-[1px] mb-2">
                Jelszó
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 rounded-xl text-[13px] text-white placeholder-[#555] outline-none transition-all"
                style={{
                  background: '#242424',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
                onFocus={e => e.target.style.border = '1px solid rgba(200,16,46,0.6)'}
                onBlur={e => e.target.style.border = '1px solid rgba(255,255,255,0.08)'}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-2 text-white font-semibold text-[14px] rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              style={{ background: loading ? '#333' : 'linear-gradient(135deg, #C8102E 0%, #a50d24 100%)' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                  Bejelentkezés...
                </span>
              ) : 'Bejelentkezés'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-[11px] text-[#555]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Biztonságos kapcsolat · Titkosítva
          </div>
          <div className="text-[10px] text-[#3a3a3a] tracking-[1px]">
            AUTOHAUS FRIEDRICH © {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </div>
  )
}
