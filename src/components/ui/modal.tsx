'use client'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, footer, className }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-[rgba(11,30,61,0.4)] backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-0" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={cn('bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_4px_24px_rgba(11,30,61,0.13)]', className)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(11,30,61,0.10)]">
          <h2 className="font-['DM_Serif_Display'] text-[18px] text-[#0B1E3D]">{title}</h2>
          <button onClick={onClose} className="text-[#5a6a80] hover:text-[#0B1E3D] transition-colors p-1">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-[rgba(11,30,61,0.10)] flex justify-end gap-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
