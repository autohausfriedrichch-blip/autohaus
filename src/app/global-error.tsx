'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0B1E3D] text-white p-8">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2">Váratlan hiba történt</h1>
          <p className="text-white/60 mb-6 text-center max-w-md">
            A rendszer hibát észlelt. A fejlesztő értesítést kapott. Kérjük próbáld újra.
          </p>
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#C9A84C] text-[#0B1E3D] font-bold rounded-xl hover:bg-[#b8943f]"
          >
            Újrapróbálkozás
          </button>
        </div>
      </body>
    </html>
  )
}
