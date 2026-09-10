'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sun, FolderOpen, Settings, LogOut,
  LayoutDashboard, ChevronDown
} from 'lucide-react'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface AppShellProps {
  children: React.ReactNode
  user?: {
    name?: string | null
    email?: string | null
    role?: string
  }
}

const navItems = [
  { href: '/projekte', label: 'Projekte', icon: FolderOpen },
  { href: '/bibliothek', label: 'Bibliothek', icon: LayoutDashboard },
  { href: '/admin', label: 'Admin', icon: Settings },
  { href: '/einstellungen', label: 'Einstellungen', icon: Settings },
]

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)]">
      {/* Top Header */}
      <header
        className="sticky top-0 z-50 flex items-center gap-4 px-4 py-3 bg-[var(--ink)] text-white"
        style={{ minHeight: '56px' }}
      >
        {/* Brand */}
        <Link href="/projekte" className="flex items-center gap-2 font-bold text-base tracking-tight">
          <Sun className="w-5 h-5 text-[var(--sun)]" />
          <span>PV-Stringplaner</span>
          <span
            className="w-2 h-2 rounded-sm"
            style={{ background: 'var(--sun)' }}
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors',
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex-1" />

        {/* User Menu */}
        {user && (
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center text-xs font-bold uppercase">
                {user.name?.[0] ?? user.email?.[0] ?? 'U'}
              </div>
              <span className="hidden sm:block max-w-[120px] truncate">
                {user.name ?? user.email}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>
            <Button
              variant="ghost-white"
              size="icon-sm"
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Abmelden"
              className="compact"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden sticky bottom-0 z-40 bg-[var(--panel)] border-t border-[var(--line)] safe-bottom">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-4 pt-2 pb-1 text-[10px] transition-colors',
                  active ? 'text-[var(--accent)]' : 'text-[var(--ink-faint)]'
                )}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
