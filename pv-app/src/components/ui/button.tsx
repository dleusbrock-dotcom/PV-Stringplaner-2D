import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius)]',
    'text-sm font-semibold transition-all duration-75',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1',
    'active:scale-[0.97]',
    'min-h-[44px] px-4',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-[var(--accent)] text-white border border-[var(--accent)] hover:bg-[var(--accent-hover)]',
        secondary: 'bg-[var(--panel)] text-[var(--ink)] border border-[var(--line-strong)] hover:border-[var(--accent)]',
        ghost: 'bg-transparent text-[var(--ink-soft)] border border-transparent hover:bg-[var(--panel-2)] hover:text-[var(--ink)]',
        danger: 'text-[var(--danger)] border border-[var(--danger)] bg-[var(--panel)] hover:bg-[var(--danger-soft)]',
        success: 'bg-[var(--ok)] text-white border border-[var(--ok)]',
        'ghost-white': 'bg-transparent text-white border border-white/30 hover:border-white',
        link: 'bg-transparent text-[var(--accent)] border-0 underline-offset-2 hover:underline p-0 min-h-0',
      },
      size: {
        sm: 'text-xs px-3 min-h-[36px]',
        md: 'text-sm px-4 min-h-[44px]',
        lg: 'text-base px-5 min-h-[52px]',
        icon: 'w-11 h-11 p-0',
        'icon-sm': 'w-9 h-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="animate-spin h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
