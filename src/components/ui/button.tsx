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
      primary: 'bg-[#0B1E3D] text-white border-[#0B1E3D] hover:bg-[#142a50]',
      secondary: 'bg-white text-[#0B1E3D] border-[rgba(11,30,61,0.18)] hover:bg-[#F4F5F7]',
      gold: 'bg-[#C9A84C] text-[#0B1E3D] border-[#C9A84C] hover:bg-[#e8c96b]',
      danger: 'bg-[#C9384C] text-white border-[#C9384C] hover:bg-red-700',
      ghost: 'bg-transparent text-[#5a6a80] border-transparent hover:bg-[#F4F5F7]',
    }
    const sizes = {
      sm: 'px-3 py-1.5 text-[11px] gap-1.5',
      md: 'px-3.5 py-2 text-[12px] gap-1.5',
      lg: 'px-5 py-2.5 text-[13px] gap-2',
    }
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center font-medium border rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
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
