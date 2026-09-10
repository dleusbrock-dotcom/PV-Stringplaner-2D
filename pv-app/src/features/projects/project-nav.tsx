'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Ruler, HardHat, Camera, ClipboardCheck,
  AlertTriangle, Package, FileText, CheckSquare, MapPin, Lock,
  QrCode, Users
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@prisma/client'

interface ProjectNavProps {
  project: {
    id: string
    number: string
    name: string
    status: ProjectStatus
    lockedAt: Date | null
    customer: { name: string; companyName?: string | null } | null
    site: { city: string } | null
    _count: { defects: number }
  }
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Entwurf',
  PLANNING: 'Planung',
  CONSTRUCTION: 'Baustelle',
  INSPECTION: 'Abnahme',
  COMPLETED: 'Abgeschlossen',
  ARCHIVED: 'Archiviert',
}

const STATUS_VARIANTS: Record<ProjectStatus, 'default' | 'primary' | 'success' | 'danger' | 'warning' | 'sun'> = {
  DRAFT: 'default',
  PLANNING: 'primary',
  CONSTRUCTION: 'sun',
  INSPECTION: 'warning',
  COMPLETED: 'success',
  ARCHIVED: 'default',
}

const navItems = [
  { href: '', label: 'Übersicht', icon: LayoutDashboard },
  { href: '/planung', label: 'Planung', icon: Ruler },
  { href: '/baustelle', label: 'Baustelle', icon: HardHat },
  { href: '/fotos', label: 'Fotos', icon: Camera },
  { href: '/pruefungen', label: 'Prüfungen', icon: ClipboardCheck },
  { href: '/maengel', label: 'Mängel', icon: AlertTriangle },
  { href: '/seriennummern', label: 'Seriennr.', icon: QrCode },
  { href: '/material', label: 'Material', icon: Package },
  { href: '/dokumente', label: 'Dokumente', icon: FileText },
  { href: '/mitglieder', label: 'Team', icon: Users },
  { href: '/abschluss', label: 'Abschluss', icon: CheckSquare },
]

export function ProjectNav({ project }: ProjectNavProps) {
  const pathname = usePathname()
  const base = `/projekte/${project.id}`

  return (
    <div className="bg-[var(--panel)] border-b border-[var(--line)]">
      {/* Project Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono text-[var(--ink-faint)]">{project.number}</span>
            <Badge variant={STATUS_VARIANTS[project.status]}>
              {STATUS_LABELS[project.status]}
            </Badge>
            {project.lockedAt && (
              <Badge variant="danger">
                <Lock className="w-2.5 h-2.5" />
                Gesperrt
              </Badge>
            )}
            {project._count.defects > 0 && (
              <Badge variant="danger">
                <AlertTriangle className="w-2.5 h-2.5" />
                {project._count.defects} krit.
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-[var(--ink)] text-sm truncate">{project.name}</h2>
            {project.site && (
              <span className="text-xs text-[var(--ink-faint)] flex items-center gap-0.5 shrink-0">
                <MapPin className="w-2.5 h-2.5" />
                {project.site.city}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="overflow-x-auto">
        <nav className="flex gap-0 px-2 pb-0 min-w-max">
          {navItems.map((item) => {
            const Icon = item.icon
            const href = `${base}${item.href}`
            const active = item.href === ''
              ? pathname === base || pathname === `${base}/`
              : pathname.startsWith(href)

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap',
                  active
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)] hover:border-[var(--line-strong)]'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
