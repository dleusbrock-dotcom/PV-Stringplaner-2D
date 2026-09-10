'use client'

import * as React from 'react'
import * as ToastPrimitives from '@radix-ui/react-toast'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const ToastProvider = ToastPrimitives.Provider
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed bottom-0 right-0 z-[100] flex max-h-screen flex-col-reverse gap-2 p-4 sm:bottom-4 sm:right-4 w-full sm:max-w-sm',
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = 'ToastViewport'

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & {
    variant?: 'default' | 'success' | 'error' | 'warning'
  }
>(({ className, variant = 'default', ...props }, ref) => {
  const variantClasses = {
    default: 'bg-[var(--panel)] border-[var(--line-strong)]',
    success: 'bg-[var(--ok-soft)] border-[var(--ok)] text-[var(--ok)]',
    error: 'bg-[var(--danger-soft)] border-[var(--danger)] text-[var(--danger)]',
    warning: 'bg-[var(--warning-soft)] border-[var(--warning)] text-[var(--warning)]',
  }
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(
        'group pointer-events-auto relative flex w-full items-center justify-between rounded-[var(--radius)]',
        'border p-4 shadow-lg transition-all',
        'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
        'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-80 data-[state=open]:slide-in-from-bottom-4',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
})
Toast.displayName = 'Toast'

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn('ml-auto shrink-0 rounded-md p-1 opacity-70 hover:opacity-100', className)}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = 'ToastClose'

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-sm font-semibold', className)}
    {...props}
  />
))
ToastTitle.displayName = 'ToastTitle'

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-xs mt-1 text-[var(--ink-soft)]', className)}
    {...props}
  />
))
ToastDescription.displayName = 'ToastDescription'

type ToasterToast = {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning'
}

// Simple toast store
let toasts: ToasterToast[] = []
let listeners: ((toasts: ToasterToast[]) => void)[] = []

function notify(listeners: ((toasts: ToasterToast[]) => void)[], toasts: ToasterToast[]) {
  listeners.forEach((l) => l([...toasts]))
}

export function toast(options: Omit<ToasterToast, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  toasts = [...toasts, { ...options, id }]
  notify(listeners, toasts)
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id)
    notify(listeners, toasts)
  }, 4000)
}

export function Toaster() {
  const [toastList, setToastList] = React.useState<ToasterToast[]>([])

  React.useEffect(() => {
    listeners.push(setToastList)
    return () => {
      listeners = listeners.filter((l) => l !== setToastList)
    }
  }, [])

  return (
    <ToastProvider>
      {toastList.map((t) => (
        <Toast key={t.id} variant={t.variant}>
          <div>
            {t.title && <ToastTitle>{t.title}</ToastTitle>}
            {t.description && <ToastDescription>{t.description}</ToastDescription>}
          </div>
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
