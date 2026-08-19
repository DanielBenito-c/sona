import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
}

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-gradient-brand text-white hover:opacity-90 active:opacity-80 shadow-lg shadow-accent/20',
  secondary: 'bg-surface-hover text-foreground hover:bg-border',
  ghost: 'text-foreground hover:bg-surface-hover',
  outline: 'border border-border text-foreground hover:bg-surface-hover',
  danger: 'bg-red-500/15 text-red-400 hover:bg-red-500/25',
}

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 text-sm rounded-lg gap-1.5',
  md: 'h-11 px-5 text-sm rounded-xl gap-2',
  lg: 'h-12 px-7 text-base rounded-xl gap-2',
  icon: 'h-10 w-10 rounded-full',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors select-none',
        'disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'