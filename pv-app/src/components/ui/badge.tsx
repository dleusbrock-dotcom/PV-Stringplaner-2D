import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold',
  {
    variants: {
      variant: {
        default: 'bg-[var(--line)] text-[var(--ink-soft)]',
        primary: 'bg-[var(--accent-soft)] text-[var(--accent)]',
        success: 'bg-[var(--ok-soft)] text-[var(--ok)]',
        danger: 'bg-[var(--danger-soft)] text-[var(--danger)]',
        warning: 'bg-[var(--warning-soft)] text-[var(--warning)]',
        sun: 'bg-[var(--sun-soft)] text-[var(--sun)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
