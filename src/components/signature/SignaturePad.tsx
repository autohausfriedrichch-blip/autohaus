'use client'
import { useRef, useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { RotateCcw, Check } from 'lucide-react'

interface SignaturePadProps {
  onSave: (dataUrl: string) => void
  onCancel: () => void
  title?: string
  subtitle?: string
}

export function SignaturePad({ onSave, onCancel, title = 'Aláírás', subtitle }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasStrokes, setHasStrokes] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    ctx.strokeStyle = '#0D0D0D'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      const t = e.touches[0]
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY }
    }
    return { x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, y: ((e as React.MouseEvent).clientY - rect.top) * scaleY }
  }

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const canvas = canvasRef.current!
    setDrawing(true)
    lastPos.current = getPos(e, canvas)
  }, [])

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e, canvas)
    if (lastPos.current) {
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      setHasStrokes(true)
    }
    lastPos.current = pos
  }, [drawing])

  const stopDraw = useCallback(() => {
    setDrawing(false)
    lastPos.current = null
  }, [])

  const clear = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasStrokes(false)
  }

  const save = () => {
    if (!hasStrokes) return
    const canvas = canvasRef.current!
    onSave(canvas.toDataURL('image/png'))
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-[rgba(0,0,0,0.08)]">
          <h3 className="text-[15px] font-semibold text-[#0D0D0D]">{title}</h3>
          {subtitle && <p className="text-[12px] text-[#4a4a4a] mt-0.5">{subtitle}</p>}
        </div>
        <div className="p-4">
          <div className="border-2 border-dashed border-[rgba(0,0,0,0.18)] rounded-xl overflow-hidden bg-[#fafbfc]">
            <canvas
              ref={canvasRef}
              width={600}
              height={220}
              className="w-full touch-none cursor-crosshair"
              style={{ display: 'block' }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
          </div>
          <p className="text-[11px] text-[#888888] text-center mt-2">Aláírja a fenti mezőben</p>
        </div>
        <div className="p-4 pt-0 flex gap-2">
          <button onClick={clear} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[rgba(0,0,0,0.15)] text-[#4a4a4a] text-[12px] hover:bg-gray-50 transition-colors">
            <RotateCcw size={13} /> Törlés
          </button>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" onClick={onCancel}>Mégse</Button>
          <Button variant="gold" size="sm" onClick={save} disabled={!hasStrokes}>
            <Check size={14} /> Mentés
          </Button>
        </div>
      </div>
    </div>
  )
}
