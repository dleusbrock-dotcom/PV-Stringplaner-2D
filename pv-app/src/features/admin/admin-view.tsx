'use client'

import { useState, useTransition } from 'react'
import { Users, Shield, Database, Activity, UserCheck, UserX, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { createUser, toggleUserActive, resetUserPassword } from './admin-actions'

interface AdminUser {
  id: string
  name: string | null
  email: string | null
  role: { name: string } | null
  _count: { createdProjects: number; photos: number }
  createdAt: Date
}

interface AdminStats {
  totalProjects: number
  totalUsers: number
  totalPhotos: number
  totalDefects: number
}

interface AdminViewProps {
  users: AdminUser[]
  stats: AdminStats
}

function NewUserDialog({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await createUser(fd)
        toast({ title: 'Nutzer erstellt', variant: 'success' })
        onClose()
      } catch (err) {
        toast({ title: String(err), variant: 'error' })
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-6 w-full max-w-sm shadow-xl">
        <h2 className="font-bold text-[var(--ink)] mb-4">Neuer Nutzer</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-[var(--ink-soft)] mb-1 block">Name</label>
            <input name="name" required placeholder="Max Mustermann"
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm" />
          </div>
          <div>
            <label className="text-xs text-[var(--ink-soft)] mb-1 block">E-Mail *</label>
            <input name="email" type="email" required placeholder="nutzer@firma.de"
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm" />
          </div>
          <div>
            <label className="text-xs text-[var(--ink-soft)] mb-1 block">Passwort *</label>
            <input name="password" type="password" required minLength={8} placeholder="Mindestens 8 Zeichen"
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm" />
          </div>
          <div>
            <label className="text-xs text-[var(--ink-soft)] mb-1 block">Rolle</label>
            <select name="role" className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm">
              <option value="Monteur">Monteur</option>
              <option value="Planer">Planer</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>
              {isPending ? 'Erstellen…' : 'Erstellen'}
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>Abbrechen</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function AdminView({ users, stats }: AdminViewProps) {
  const [isPending, startTransition] = useTransition()
  const [showNewUser, setShowNewUser] = useState(false)

  const handleToggle = (userId: string, active: boolean) => {
    startTransition(async () => {
      try {
        await toggleUserActive(userId, active)
        toast({ title: active ? 'Nutzer aktiviert' : 'Nutzer deaktiviert', variant: 'success' })
      } catch (err) {
        toast({ title: String(err), variant: 'error' })
      }
    })
  }

  const handleReset = (userId: string) => {
    const pw = prompt('Neues Passwort (min. 8 Zeichen):')
    if (!pw || pw.length < 8) return
    startTransition(async () => {
      try {
        await resetUserPassword(userId, pw)
        toast({ title: 'Passwort zurückgesetzt', variant: 'success' })
      } catch (err) {
        toast({ title: String(err), variant: 'error' })
      }
    })
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {showNewUser && <NewUserDialog onClose={() => setShowNewUser(false)} />}

      <h1 className="font-bold text-[var(--ink)] text-xl mb-6">Administration</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { icon: Database, label: 'Projekte', value: stats.totalProjects, color: 'var(--accent)' },
          { icon: Users, label: 'Nutzer', value: stats.totalUsers, color: 'var(--ok)' },
          { icon: Activity, label: 'Fotos', value: stats.totalPhotos, color: 'var(--sun)' },
          { icon: Shield, label: 'Mängel', value: stats.totalDefects, color: 'var(--danger)' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-4 text-center">
            <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
            <div className="text-2xl font-bold text-[var(--ink)]">{value}</div>
            <div className="text-xs text-[var(--ink-faint)]">{label}</div>
          </div>
        ))}
      </div>

      {/* Users */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="font-bold text-[var(--ink)]">Nutzerverwaltung</h2>
        <div className="flex-1" />
        <Button variant="primary" size="sm" onClick={() => setShowNewUser(true)}>
          <Plus className="w-4 h-4" /> Neuer Nutzer
        </Button>
      </div>

      <div className="space-y-2">
        {users.map((user) => (
          <div
            key={user.id}
            className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-3 flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold shrink-0">
              {(user.name ?? user.email ?? '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[var(--ink)] truncate">{user.name ?? user.email}</span>
                {user.role && (
                  <Badge variant={user.role.name === 'Admin' ? 'danger' : 'default'}>
                    {user.role.name}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-[var(--ink-faint)]">
                {user.email} · {user._count.createdProjects} Projekte · {user._count.photos} Fotos
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleReset(user.id)}
                disabled={isPending}
                className="p-1.5 rounded text-[10px] text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
                title="Passwort zurücksetzen"
              >
                <Shield className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
