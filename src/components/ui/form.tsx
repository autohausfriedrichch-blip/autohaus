import { cn } from '@/lib/utils'
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export function FormGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-3', className)}>{children}</div>
}

export function FormLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[11px] font-semibold text-[#4a4a4a] uppercase tracking-[0.5px] mb-1.5">
      {children}
    </label>
  )
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        // min-h-[44px] for iOS touch target compliance
        'w-full px-3 py-2.5 min-h-[44px] border border-[rgba(0,0,0,0.18)] rounded-lg bg-white text-[#0D0D0D] outline-none transition-colors focus:border-[#0D0D0D] placeholder:text-[#888888]',
        className
      )}
      {...props}
    />
  )
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full px-3 py-2.5 min-h-[44px] border border-[rgba(0,0,0,0.18)] rounded-lg bg-white text-[#0D0D0D] outline-none transition-colors focus:border-[#0D0D0D] appearance-none',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full px-3 py-2.5 border border-[rgba(0,0,0,0.18)] rounded-lg bg-white text-[#0D0D0D] outline-none transition-colors focus:border-[#0D0D0D] resize-vertical min-h-[80px]',
        className
      )}
      {...props}
    />
  )
}

export function FormRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-3', className)}>{children}</div>
}
