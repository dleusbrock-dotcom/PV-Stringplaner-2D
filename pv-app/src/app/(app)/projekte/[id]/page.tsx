import { notFound } from 'next/navigation'
import {
  MapPin, User, Calendar, Phone, Mail,
  Ruler, Sun, AlertTriangle, Camera, ClipboardCheck,
  Package, CheckSquare, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectOverviewPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) notFound()

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      customer: { include: { contacts: true } },
      site: true,
      roofAreas: { include: { _count: { select: { placements: true } } } },
      _count: {
        select: {
          photos: true,
          defects: true,
          checklists: true,
        },
      },
      defects: { where: { status: 'OPEN', priority: 'CRITICAL' }, take: 3 },
      auditLogs: { orderBy: { createdAt: 'desc' }, take: 5, include: { user: { select: { name: true, email: true } } } },
    },
  })

  if (!project) notFound()

  const totalModules = project.roofAreas.reduce(
    (sum, area) => sum + area._count.placements, 0
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Critical Defects Alert */}
      {project.defects.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-[var(--radius)] bg-[var(--danger-soft)] border border-[var(--danger)]">
          <AlertTriangle className="w-5 h-5 text-[var(--danger)] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-bold text-[var(--danger)]">
              {project.defects.length} kritische Mängel offen
            </p>
            <p className="text-xs text-[var(--danger)] mt-0.5">
              Projektabschluss gesperrt bis alle kritischen Mängel behoben sind.
            </p>
          </div>
          <Link
            href={`/projekte/${id}/maengel`}
            className="text-xs font-semibold text-[var(--danger)] hover:underline"
          >
            Anzeigen
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Customer Info */}
        <Card>
          <CardHeader>
            <User className="w-4 h-4 text-[var(--accent)]" />
            <CardTitle>Kunde</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-semibold text-[var(--ink)]">
              {project.customer?.companyName ?? project.customer?.name}
            </p>
            {project.customer?.companyName && (
              <p className="text-sm text-[var(--ink-soft)]">{project.customer.name}</p>
            )}
            {project.customer?.email && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
                <Mail className="w-3 h-3" />
                <a href={`mailto:${project.customer.email}`} className="hover:text-[var(--accent)]">
                  {project.customer.email}
                </a>
              </div>
            )}
            {project.customer?.phone && (
              <div className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
                <Phone className="w-3 h-3" />
                <a href={`tel:${project.customer.phone}`}>{project.customer.phone}</a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Site Info */}
        <Card>
          <CardHeader>
            <MapPin className="w-4 h-4 text-[var(--accent)]" />
            <CardTitle>Standort</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {project.site && (
              <>
                <p className="font-semibold text-[var(--ink)]">
                  {project.site.street} {project.site.houseNumber}
                </p>
                <p className="text-sm text-[var(--ink-soft)]">
                  {project.site.postalCode} {project.site.city}
                </p>
                <p className="text-xs text-[var(--ink-faint)]">{project.site.country}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Dachflächen', value: project.roofAreas.length, icon: Ruler, href: '/planung' },
          { label: 'Module (Plan)', value: totalModules, icon: Sun, href: '/planung' },
          { label: 'Fotos', value: project._count.photos, icon: Camera, href: '/fotos' },
          { label: 'Mängel', value: project._count.defects, icon: AlertTriangle, href: '/maengel', alert: project.defects.length > 0 },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={`/projekte/${id}${stat.href}`}
            className={`block bg-[var(--panel)] border rounded-[var(--radius)] p-3 hover:border-[var(--accent)] transition-colors ${
              stat.alert ? 'border-[var(--danger)]' : 'border-[var(--line)]'
            }`}
          >
            <stat.icon className={`w-4 h-4 mb-2 ${stat.alert ? 'text-[var(--danger)]' : 'text-[var(--accent)]'}`} />
            <div className={`text-xl font-bold ${stat.alert ? 'text-[var(--danger)]' : 'text-[var(--ink)]'}`}>
              {stat.value}
            </div>
            <div className="text-xs text-[var(--ink-soft)]">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Schnellzugriff</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: 'Dachplanung', href: '/planung', icon: Ruler },
              { label: 'Baustellenmodus', href: '/baustelle', icon: HardHatIcon },
              { label: 'Foto aufnehmen', href: '/fotos', icon: Camera },
              { label: 'Checklisten', href: '/pruefungen', icon: ClipboardCheck },
              { label: 'Material', href: '/material', icon: Package },
              { label: 'Abschluss', href: '/abschluss', icon: CheckSquare },
            ].map((a) => (
              <Link
                key={a.href}
                href={`/projekte/${id}${a.href}`}
                className="flex items-center gap-2 p-3 rounded-lg border border-[var(--line)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors text-sm"
              >
                <a.icon className="w-4 h-4 text-[var(--accent)] shrink-0" />
                <span className="font-medium text-[var(--ink)] text-xs">{a.label}</span>
                <ChevronRight className="w-3 h-3 text-[var(--ink-faint)] ml-auto" />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {project.auditLogs.length > 0 && (
        <Card>
          <CardHeader>
            <Calendar className="w-4 h-4 text-[var(--ink-faint)]" />
            <CardTitle>Letzte Aktivitäten</CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-[var(--line)]">
            {project.auditLogs.map((log) => (
              <div key={log.id} className="py-2 flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[var(--accent-soft)] flex items-center justify-center text-[10px] font-bold text-[var(--accent)] shrink-0">
                  {(log.user?.name ?? log.user?.email ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[var(--ink)]">
                    <span className="font-semibold">{log.action}</span>
                    {' – '}{log.entity}
                  </p>
                  <p className="text-[10px] text-[var(--ink-faint)]">
                    {log.user?.name ?? log.user?.email} · {formatDateTime(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Inline icon component to avoid import issues with "HardHat"
function HardHatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 18a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v2z"/>
      <path d="M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5"/>
      <path d="M4 15v-3a8 8 0 0 1 16 0v3"/>
    </svg>
  )
}
