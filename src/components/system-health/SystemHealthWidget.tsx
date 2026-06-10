'use client'
import { Shield, CheckCircle2, AlertCircle, XCircle, RefreshCw } from 'lucide-react'

interface SystemHealthWidgetProps {
  score: number | null
  checkedAt: Date | null
  errorCount: number
  warnCount: number
  onRunCheck: () => void
}

export function SystemHealthWidget({ score, checkedAt, errorCount, warnCount, onRunCheck }: SystemHealthWidgetProps) {
  const statusColor = score === null ? 'bg-[#f0f2f5]' :
    score >= 90 ? 'bg-green-50 border-green-200' :
    score >= 70 ? 'bg-amber-50 border-amber-200' :
    'bg-red-50 border-red-200'

  const dotColor = score === null ? 'bg-[#d0d8e0]' :
    score >= 90 ? 'bg-green-500' :
    score >= 70 ? 'bg-amber-400' :
    'bg-red-500'

  const label = score === null ? 'Nem ellenőrzött' :
    score >= 90 ? '🟢 Kiváló' :
    score >= 70 ? '🟡 Figyelmet igényel' :
    '🔴 Kritikus hibák'

  return (
    <button
      onClick={onRunCheck}
      className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-sm ${statusColor} border border-[#e8ecf0]`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Shield size={15} className="text-[#5a6a80]" />
          <span className="text-[12px] font-semibold text-[#1a2942]">Rendszer állapota</span>
        </div>
        {score !== null && (
          <span className="text-[20px] font-black text-[#1a2942]">{score}%</span>
        )}
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor} ${score !== null && score < 90 ? 'animate-pulse' : ''}`} />
        <span className="text-[12px] font-medium text-[#1a2942]">{label}</span>
      </div>

      {score !== null && (errorCount > 0 || warnCount > 0) && (
        <div className="flex items-center gap-3 mb-2">
          {errorCount > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-red-600">
              <XCircle size={11} /> {errorCount} hiba
            </div>
          )}
          {warnCount > 0 && (
            <div className="flex items-center gap-1 text-[11px] text-amber-600">
              <AlertCircle size={11} /> {warnCount} figyelmeztetés
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#9aabb8]">
          {checkedAt
            ? `Utolsó: ${checkedAt.toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
            : 'Kattints az ellenőrzéshez'}
        </span>
        <div className="flex items-center gap-1 text-[11px] text-[#5a6a80] hover:text-[#0B1E3D]">
          <RefreshCw size={11} />
          <span>🔍 Ellenőrzés</span>
        </div>
      </div>
    </button>
  )
}
