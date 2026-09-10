import { prisma } from '@/lib/database/client'
import Link from 'next/link'
import { Sun, MapPin, User, Calendar, ExternalLink } from 'lucide-react'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ code: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params
  const project = await prisma.project.findUnique({
    where: { qrCode: code },
    select: { name: true },
  })
  return { title: project ? `${project.name} – PV-Stringplaner` : 'Projekt nicht gefunden' }
}

export default async function QrPage({ params }: Props) {
  const { code } = await params

  const project = await prisma.project.findUnique({
    where: { qrCode: code },
    include: {
      customer: { select: { name: true, companyName: true } },
      site: { select: { street: true, houseNumber: true, postalCode: true, city: true } },
      createdBy: { select: { name: true } },
      _count: {
        select: {
          photos: true,
          defects: { where: { status: 'OPEN' } },
        },
      },
    },
  })

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg)]">
        <div className="text-center">
          <Sun className="w-12 h-12 text-[var(--ink-faint)] mx-auto mb-4" />
          <h1 className="text-xl font-bold text-[var(--ink)] mb-2">Projekt nicht gefunden</h1>
          <p className="text-[var(--ink-soft)] text-sm">
            Der QR-Code ist ungültig oder das Projekt wurde gelöscht.
          </p>
        </div>
      </div>
    )
  }

  const STATUS_LABELS: Record<string, string> = {
    DRAFT: 'Entwurf',
    PLANNING: 'Planung',
    CONSTRUCTION: 'Baustelle',
    INSPECTION: 'Abnahme',
    COMPLETED: 'Abgeschlossen',
    ARCHIVED: 'Archiviert',
  }

  const STATUS_COLORS: Record<string, string> = {
    DRAFT: 'var(--ink-faint)',
    PLANNING: 'var(--accent)',
    CONSTRUCTION: 'var(--sun)',
    INSPECTION: 'var(--warning)',
    COMPLETED: 'var(--ok)',
    ARCHIVED: 'var(--ink-faint)',
  }

  const siteAddress = project.site
    ? `${project.site.street} ${project.site.houseNumber ?? ''}, ${project.site.postalCode} ${project.site.city}`
    : null

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-start justify-center p-4 pt-12">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Sun className="w-6 h-6 text-[var(--sun)]" />
          <span className="font-bold text-[var(--ink)]">PV-Stringplaner 2D</span>
        </div>

        {/* Project Card */}
        <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] overflow-hidden shadow">
          {/* Status Banner */}
          <div
            className="px-4 py-2 text-white text-xs font-semibold uppercase tracking-wide text-center"
            style={{ background: STATUS_COLORS[project.status] ?? 'var(--accent)' }}
          >
            {STATUS_LABELS[project.status] ?? project.status}
          </div>

          <div className="p-5">
            {/* Project Number + Name */}
            <div className="mb-4">
              <div className="text-[10px] font-mono text-[var(--ink-faint)] mb-1">{project.number}</div>
              <h1 className="font-bold text-lg text-[var(--ink)] leading-tight">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-[var(--ink-soft)] mt-1">{project.description}</p>
              )}
            </div>

            {/* Details */}
            <dl className="space-y-2.5">
              {project.customer && (
                <div className="flex items-start gap-2.5 text-sm">
                  <User className="w-4 h-4 text-[var(--ink-faint)] mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-[10px] text-[var(--ink-faint)] uppercase tracking-wide">Kunde</dt>
                    <dd className="text-[var(--ink)]">
                      {project.customer.companyName ?? project.customer.name}
                    </dd>
                  </div>
                </div>
              )}
              {siteAddress && (
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin className="w-4 h-4 text-[var(--ink-faint)] mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-[10px] text-[var(--ink-faint)] uppercase tracking-wide">Standort</dt>
                    <dd className="text-[var(--ink)]">{siteAddress}</dd>
                  </div>
                </div>
              )}
              {project.createdBy && (
                <div className="flex items-start gap-2.5 text-sm">
                  <Calendar className="w-4 h-4 text-[var(--ink-faint)] mt-0.5 shrink-0" />
                  <div>
                    <dt className="text-[10px] text-[var(--ink-faint)] uppercase tracking-wide">Erstellt von</dt>
                    <dd className="text-[var(--ink)]">{project.createdBy.name}</dd>
                  </div>
                </div>
              )}
            </dl>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[var(--line)]">
              <div className="text-center">
                <div className="text-xl font-bold text-[var(--ink)]">{project._count.photos}</div>
                <div className="text-[10px] text-[var(--ink-faint)] uppercase tracking-wide">Fotos</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold" style={{ color: project._count.defects > 0 ? 'var(--danger)' : 'var(--ok)' }}>
                  {project._count.defects}
                </div>
                <div className="text-[10px] text-[var(--ink-faint)] uppercase tracking-wide">Offene Mängel</div>
              </div>
            </div>
          </div>

          {/* Login CTA */}
          {!project.lockedAt && (
            <div className="px-5 pb-5">
              <Link
                href={`/login?callbackUrl=/projekte/${project.id}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent)' }}
              >
                <ExternalLink className="w-4 h-4" />
                Zum Projekt
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-[var(--ink-faint)] mt-6">
          Gescannt via QR-Code · PV-Stringplaner 2D
        </p>
      </div>
    </div>
  )
}
