import { auth } from '@/lib/auth/config'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/database/client'
import { User, Building2, Shield } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Einstellungen' }

export default async function EinstellungenPage() {
  const session = await auth()
  if (!session?.user) notFound()

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  })

  if (!user) notFound()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold text-[var(--ink)]">Einstellungen</h2>
        <p className="text-sm text-[var(--ink-soft)]">Konto und Anwendungseinstellungen</p>
      </div>

      {/* Profile */}
      <section className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-[var(--line)]">
          <User className="w-4 h-4 text-[var(--accent)]" />
          <span className="font-semibold text-sm text-[var(--ink)]">Profil</span>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-xl font-bold shrink-0">
              {(user.name ?? user.email).charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-[var(--ink)]">{user.name ?? 'Kein Name'}</p>
              <p className="text-sm text-[var(--ink-soft)]">{user.email}</p>
              {user.role && (
                <div className="mt-1">
                  <Badge variant="primary">{user.role.name}</Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* App Info */}
      <section className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-[var(--line)]">
          <Building2 className="w-4 h-4 text-[var(--accent)]" />
          <span className="font-semibold text-sm text-[var(--ink)]">Anwendung</span>
        </div>
        <div className="p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--ink-soft)]">Version</span>
            <span className="text-[var(--ink)] font-mono">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--ink-soft)]">Umgebung</span>
            <span className="text-[var(--ink)] font-mono">{process.env.NODE_ENV}</span>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-[var(--line)]">
          <Shield className="w-4 h-4 text-[var(--accent)]" />
          <span className="font-semibold text-sm text-[var(--ink)]">Datenschutz & Sicherheit</span>
        </div>
        <div className="p-4 text-sm text-[var(--ink-soft)]">
          <p>Alle Daten werden verschlüsselt übertragen (TLS). Passwörter werden mit bcrypt gehasht.</p>
          <p className="mt-2">Zugriff nur für angemeldete Benutzer mit entsprechenden Rollen.</p>
        </div>
      </section>
    </div>
  )
}
