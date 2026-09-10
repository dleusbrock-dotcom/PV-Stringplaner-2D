'use client'

import Link from 'next/link'
import {
  MapPin, User, Calendar, AlertCircle, Camera,
  ChevronRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { ProjectStatus } from '@prisma/client'

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

interface ProjectCardProps {
  project: {
    id: string
    number: string
    name: string
    status: ProjectStatus
    updatedAt: Date
    customer: { name: string; companyName?: string | null } | null
    site: { street: string; city: string } | null
    _count: {
      roofAreas: number
      defects: number
      photos: number
    }
  }
}

export function ProjectCard({ project }: ProjectCardProps) {
  const criticalDefects = project._count.defects

  return (
    <Link
      href={`/projekte/${project.id}`}
      className="block group bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] hover:border-[var(--accent)] hover:shadow-md transition-all duration-150 overflow-hidden"
    >
      {/* Status Bar */}
      <div
        className="h-1"
        style={{
          background:
            project.status === 'CONSTRUCTION'
              ? 'var(--sun)'
              : project.status === 'COMPLETED'
              ? 'var(--ok)'
              : project.status === 'PLANNING'
              ? 'var(--accent)'
              : 'var(--line)',
        }}
      />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono text-[var(--ink-faint)]">{project.number}</span>
              <Badge variant={STATUS_VARIANTS[project.status]}>
                {STATUS_LABELS[project.status]}
              </Badge>
            </div>
            <h3 className="font-bold text-[var(--ink)] text-sm leading-tight truncate group-hover:text-[var(--accent)]">
              {project.name}
            </h3>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--ink-faint)] shrink-0 group-hover:text-[var(--accent)] transition-colors" />
        </div>

        {/* Customer & Location */}
        <div className="space-y-1.5 mb-3">
          {project.customer && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
              <User className="w-3.5 h-3.5 shrink-0 text-[var(--ink-faint)]" />
              <span className="truncate">
                {project.customer.companyName ?? project.customer.name}
              </span>
            </div>
          )}
          {project.site && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-[var(--ink-faint)]" />
              <span className="truncate">{project.site.street}, {project.site.city}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-[var(--ink-faint)]">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Geändert: {formatDate(project.updatedAt)}</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 pt-3 border-t border-[var(--line)]">
          <div className="flex items-center gap-1 text-xs text-[var(--ink-faint)]">
            <span className="font-semibold text-[var(--ink)]">{project._count.roofAreas}</span>
            <span>Dachfl.</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[var(--ink-faint)]">
            <Camera className="w-3 h-3" />
            <span className="font-semibold text-[var(--ink)]">{project._count.photos}</span>
          </div>
          {criticalDefects > 0 && (
            <div className="flex items-center gap-1 text-xs text-[var(--danger)] ml-auto">
              <AlertCircle className="w-3 h-3" />
              <span className="font-semibold">{criticalDefects} krit. Mängel</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
