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
    <div
      className="fixed inset-0 bg-[rgba(0,0,0,0.4)] backdrop-blur-sm z-50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className={cn(
        'bg-white w-full shadow-[0_4px_24px_rgba(0,0,0,0.13)] overflow-y-auto',
        // Mobile: slide-up sheet from bottom, full width, rounded top corners
        'rounded-t-2xl sm:rounded-2xl',
        // Desktop: centered, max width
        'sm:max-w-lg',
        // Max height: on mobile use most of the screen, on desktop cap at 90vh
        'max-h-[92vh] sm:max-h-[90vh]',
        'animate-slide-up',
        className
      )}>
        {/* Handle bar on mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 bg-[rgba(0,0,0,0.15)] rounded-full" />
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 sm:px-6 sm:py-4 border-b border-[rgba(0,0,0,0.10)]">
          <h2 className="font-['Montserrat'] text-[17px] sm:text-[18px] text-[#0D0D0D]">{title}</h2>
          <button
            onClick={onClose}
            className="text-[#4a4a4a] hover:text-[#0D0D0D] transition-colors rounded-lg"
            style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 sm:px-6 sm:py-5">{children}</div>
        {footer && (
          <div
            className="px-5 py-4 sm:px-6 border-t border-[rgba(0,0,0,0.10)] flex flex-wrap justify-end gap-2"
            style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 16px))' }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
