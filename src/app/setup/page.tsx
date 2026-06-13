'use client'
import { useState } from 'react'

export default function SetupPage() {
  const [serviceKey, setServiceKey] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const run = async () => {
    setLoading(true)
    const res = await fetch('/api/setup-users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': serviceKey,
      },
    })
    setResult(await res.json())
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-lg">
        <h1 className="text-xl font-bold mb-4 text-[#0D0D0D]">Autohaus – User Setup</h1>
        <p className="text-sm text-gray-600 mb-4">
          Supabase Dashboard → Settings → API Keys → Legacy → service_role → Reveal
        </p>
        <textarea
          className="w-full border rounded-lg p-3 text-sm font-mono mb-4 h-24"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          value={serviceKey}
          onChange={e => setServiceKey(e.target.value)}
        />
        <button
          onClick={run}
          disabled={loading || !serviceKey}
          className="w-full bg-[#0D0D0D] text-white py-3 rounded-lg font-semibold disabled:opacity-50"
        >
          {loading ? 'Létrehozás...' : 'Felhasználók létrehozása'}
        </button>
        {result && (
          <pre className="mt-4 text-xs bg-gray-50 p-3 rounded-lg overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </div>
    </div>
  )
}
