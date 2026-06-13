'use client'
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, variant = 'secondary', size = 'md', className, ...props }, ref) => {
    const variants = {
      primary:   'bg-[#C8102E] text-white border-[#C8102E] hover:bg-[#a50d24] active:bg-[#a50d24]',
      secondary: 'bg-white text-[#0D0D0D] border-[rgba(0,0,0,0.15)] hover:bg-[#F5F5F5] active:bg-[#EBEBEB]',
      gold:      'bg-[#0D0D0D] text-white border-[#0D0D0D] hover:bg-[#1A1A1A] active:bg-[#1A1A1A]',
      danger:    'bg-[#C8102E] text-white border-[#C8102E] hover:bg-[#a50d24] active:bg-[#a50d24]',
      ghost:     'bg-transparent text-[#4a4a4a] border-transparent hover:bg-[#F5F5F5] active:bg-[#EBEBEB]',
    }
    const sizes = {
      sm: 'px-3 py-1.5 text-[11px] gap-1.5 min-h-[36px] rounded-lg',
      md: 'px-3.5 py-2 text-[12px] gap-1.5 min-h-[40px] rounded-xl',
      lg: 'px-5 py-2.5 text-[13px] gap-2 min-h-[44px] rounded-xl',
    }
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-semibold border transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
