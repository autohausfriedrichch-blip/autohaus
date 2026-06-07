'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/toast'
import { Input, FormGroup, FormLabel } from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Play, Pause, Square, Plus, Clock, Edit2, Check } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

interface TimeSession {
  id: string
  label: string
  seconds: number
  startedAt?: number
  running: boolean
}

interface TimeTrackerProps {
  workOrderId: string
  hourlyRate?: number
  onTotalChange?: (total: number) => void
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}ó ${m.toString().padStart(2, '0')}p ${s.toString().padStart(2, '0')}mp`
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function secondsToHours(s: number): number {
  return Math.round((s / 3600) * 100) / 100
}

export function TimeTracker({ workOrderId, hourlyRate = 125, onTotalChange }: TimeTrackerProps) {
  const [sessions, setSessions] = useState<TimeSession[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [editingRate, setEditingRate] = useState(false)
  const [rate, setRate] = useState(hourlyRate)
  const [rateInput, setRateInput] = useState(hourlyRate.toString())
  const [manualMinutes, setManualMinutes] = useState('')
  const [manualLabel, setManualLabel] = useState('')
  const { toast } = useToast()

  // Tick running sessions
  useEffect(() => {
    const interval = setInterval(() => {
      setSessions(prev => prev.map(s => {
        if (!s.running || !s.startedAt) return s
        const elapsed = Math.floor((Date.now() - s.startedAt) / 1000)
        return { ...s, seconds: (s.seconds || 0) + elapsed - Math.floor((Date.now() - s.startedAt - 1000) / 1000) }
      }))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const totalSeconds = sessions.reduce((sum, s) => sum + (s.seconds || 0), 0)
  const totalHours = secondsToHours(totalSeconds)
  const totalCost = totalHours * rate

  useEffect(() => { onTotalChange?.(totalCost) }, [totalCost])

  const addSession = () => {
    if (!newLabel.trim()) { toast('Add meg a munkafázis nevét', 'error'); return }
    setSessions(prev => [...prev, {
      id: Math.random().toString(36),
      label: newLabel.trim(),
      seconds: 0,
      running: false,
    }])
    setNewLabel('')
  }

  const addManual = () => {
    const mins = parseInt(manualMinutes)
    if (!mins || mins <= 0) { toast('Adj meg érvényes percszámot', 'error'); return }
    setSessions(prev => [...prev, {
      id: Math.random().toString(36),
      label: manualLabel || 'Manuális idő',
      seconds: mins * 60,
      running: false,
    }])
    setManualMinutes('')
    setManualLabel('')
    toast(`${mins} perc hozzáadva`)
  }

  const toggleSession = (id: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s
      if (s.running) {
        // Pause: calculate elapsed and add to seconds
        const elapsed = s.startedAt ? Math.floor((Date.now() - s.startedAt) / 1000) : 0
        return { ...s, running: false, seconds: s.seconds + elapsed, startedAt: undefined }
      } else {
        // Start
        return { ...s, running: true, startedAt: Date.now() }
      }
    }))
  }

  const stopSession = (id: string) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s
      if (s.running && s.startedAt) {
        const elapsed = Math.floor((Date.now() - s.startedAt) / 1000)
        return { ...s, running: false, seconds: s.seconds + elapsed, startedAt: undefined }
      }
      return { ...s, running: false }
    }))
  }

  const removeSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  // Live seconds for running sessions
  const getLiveSeconds = (session: TimeSession): number => {
    if (!session.running || !session.startedAt) return session.seconds
    return session.seconds + Math.floor((Date.now() - session.startedAt) / 1000)
  }

  return (
    <div className="bg-[#0B1E3D] rounded-[14px] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-[#C9A84C]" />
          <span className="text-white font-semibold text-[13px]">Munkaidő Számoló</span>
        </div>
        <div className="flex items-center gap-2">
          {editingRate ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={rateInput}
                onChange={e => setRateInput(e.target.value)}
                className="w-16 px-2 py-1 rounded text-[12px] bg-white text-[#0B1E3D] outline-none"
              />
              <span className="text-white/60 text-[11px]">CHF/h</span>
              <button onClick={() => { setRate(parseFloat(rateInput) || 125); setEditingRate(false) }} className="text-[#C9A84C]">
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button onClick={() => setEditingRate(true)} className="flex items-center gap-1 text-[#C9A84C] text-[12px] hover:text-[#e8c96b]">
              <Edit2 size={11} /> {rate} CHF/h
            </button>
          )}
        </div>
      </div>

      {/* Sessions */}
      <div className="space-y-2 mb-4">
        {sessions.map(session => {
          const live = getLiveSeconds(session)
          return (
            <div key={session.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${session.running ? 'bg-[rgba(201,168,76,0.15)] border border-[rgba(201,168,76,0.3)]' : 'bg-white/5'}`}>
              <div className="flex-1 min-w-0">
                <div className="text-white text-[12px] font-medium truncate">{session.label}</div>
                <div className={`text-[13px] font-mono font-bold ${session.running ? 'text-[#C9A84C]' : 'text-white/60'}`}>
                  {formatTime(live)}
                  {session.running && <span className="ml-2 text-[10px] text-[#C9A84C] animate-pulse">● FUT</span>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => toggleSession(session.id)}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${session.running ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}
                >
                  {session.running ? <Pause size={13} /> : <Play size={13} />}
                </button>
                {session.running && (
                  <button onClick={() => stopSession(session.id)} className="w-8 h-8 rounded-lg bg-[#C9384C] text-white flex items-center justify-center">
                    <Square size={13} />
                  </button>
                )}
                <button onClick={() => removeSession(session.id)} className="text-white/30 hover:text-white/60 text-[11px] px-1">×</button>
              </div>
            </div>
          )
        })}
        {sessions.length === 0 && (
          <p className="text-white/30 text-[12px] text-center py-2">Még nincs munkafázis</p>
        )}
      </div>

      {/* Add session */}
      <div className="flex gap-2 mb-3">
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addSession()}
          placeholder="Munkafázis neve (pl. Diagnosztika)"
          className="flex-1 px-3 py-1.5 rounded-lg text-[12px] bg-white/10 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-[#C9A84C]"
        />
        <button onClick={addSession} className="px-3 py-1.5 bg-[#C9A84C] text-[#0B1E3D] rounded-lg text-[12px] font-semibold hover:bg-[#e8c96b] transition-colors">
          <Plus size={14} />
        </button>
      </div>

      {/* Manual time */}
      <div className="flex gap-2 mb-4">
        <input
          value={manualLabel}
          onChange={e => setManualLabel(e.target.value)}
          placeholder="Leírás"
          className="flex-1 px-3 py-1.5 rounded-lg text-[12px] bg-white/10 text-white placeholder:text-white/30 outline-none border border-white/10 focus:border-[#C9A84C]"
        />
        <input
          type="number"
          value={manualMinutes}
          onChange={e => setManualMinutes(e.target.value)}
          placeholder="perc"
          className="w-16 px-2 py-1.5 rounded-lg text-[12px] bg-white/10 text-white placeholder:text-white/30 outline-none border border-white/10 text-center focus:border-[#C9A84C]"
        />
        <button onClick={addManual} className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-[12px] hover:bg-white/20 border border-white/10">
          +min
        </button>
      </div>

      {/* Total */}
      <div className="border-t border-white/10 pt-3">
        <div className="flex justify-between text-[12px] text-white/60 mb-1">
          <span>Összes idő:</span>
          <span className="text-white font-mono">{formatTime(totalSeconds)} ({totalHours}h)</span>
        </div>
        <div className="flex justify-between text-[12px] text-white/60 mb-2">
          <span>Óradíj:</span>
          <span className="text-white">{rate} CHF/h</span>
        </div>
        <div className="flex justify-between items-center bg-[rgba(201,168,76,0.15)] rounded-lg px-3 py-2">
          <span className="text-[#C9A84C] font-semibold text-[13px]">Munkadíj:</span>
          <span className="text-[#C9A84C] font-bold text-[16px]">{formatCurrency(totalCost)}</span>
        </div>

        {sessions.length > 0 && (
          <div className="mt-2 space-y-1">
            {sessions.map(s => (
              <div key={s.id} className="flex justify-between text-[11px] text-white/40">
                <span>{s.label}</span>
                <span>{formatTime(getLiveSeconds(s))} = {formatCurrency(secondsToHours(getLiveSeconds(s)) * rate)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
