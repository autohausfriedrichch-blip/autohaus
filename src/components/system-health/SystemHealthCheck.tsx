'use client'
export function SystemHealthCheck({ profile, onClose }: { profile?: any; onClose?: () => void }) {
  return <div className="flex flex-col items-center justify-center h-64 text-[#4a4a4a] gap-3">
    <p>Rendszer Ellenőrzés – hamarosan</p>
    <button onClick={onClose} className="text-sm text-[#C8102E]">Bezárás</button>
  </div>
}
