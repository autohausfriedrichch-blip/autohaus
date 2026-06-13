'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Wrench, Mail, Lock, LogIn } from 'lucide-react'

export default function PortalLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Hibás e-mail vagy jelszó')
      setLoading(false)
      return
    }
    router.replace('/portal/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D0D0D] to-[#1A1A1A] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-[#C8102E] rounded-xl flex items-center justify-center">
            <Wrench size={20} color="#0D0D0D" />
          </div>
          <div>
            <div className="font-bold text-[#0D0D0D] text-[15px]">Autohaus Friedrich</div>
            <div className="text-[11px] text-[#888888] tracking-wide uppercase">Ügyfélportál</div>
          </div>
        </div>

        <h2 className="text-[18px] font-semibold text-[#0D0D0D] mb-1">Belépés</h2>
        <p className="text-[13px] text-[#4a4a4a] mb-6">Lépjen be saját ügyfélfiókjába</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[12px] font-medium text-[#0D0D0D] mb-1 block">E-mail cím</label>
            <div className="relative">
              <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full pl-9 pr-3 py-2.5 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] outline-none focus:border-[#0D0D0D] bg-white"
                placeholder="nev@email.com"
              />
            </div>
          </div>
          <div>
            <label className="text-[12px] font-medium text-[#0D0D0D] mb-1 block">Jelszó</label>
            <div className="relative">
              <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888888]" />
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full pl-9 pr-3 py-2.5 border border-[rgba(0,0,0,0.18)] rounded-lg text-[13px] outline-none focus:border-[#0D0D0D] bg-white"
                placeholder="••••••••"
              />
            </div>
          </div>
          {error && <p className="text-[12px] text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#C8102E] hover:bg-[#b8963e] text-[#0D0D0D] font-semibold text-[13px] rounded-lg transition-colors disabled:opacity-60"
          >
            <LogIn size={15} /> {loading ? 'Belépés...' : 'Belépés'}
          </button>
        </form>

        <p className="text-[11px] text-[#888888] text-center mt-6">
          Nincs fiókja? Kérje szervizünket hogy regisztráljuk.
        </p>
      </div>
    </div>
  )
}
