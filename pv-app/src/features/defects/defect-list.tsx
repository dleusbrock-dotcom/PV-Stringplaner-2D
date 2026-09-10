'use client'

import Link from 'next/link'
import { AlertTriangle, Clock, CheckCircle2, MessageSquare, Camera, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import type { DefectPriority, DefectStatus } from '@prisma/client'

const PRIORITY_LABEL: Record<DefectPriority, string> = {
  LOW: 'Niedrig',
  MEDIUM: 'Mittel',
  HIGH: 'Hoch',
  CRITICAL: 'Kritisch',
}

const PRIORITY_VARIANT: Record<DefectPriority, 'default' | 'warning' | 'danger' | 'primary'> = {
  LOW: 'default',
  MEDIUM: 'primary',
  HIGH: 'warning',
  CRITICAL: 'danger',
}

const STATUS_LABEL: Record<DefectStatus, string> = {
  OPEN: 'Offen',
  IN_PROGRESS: 'In Bearbeitung',
  RESOLVED: 'Behoben',
  ACCEPTED: 'Akzeptiert',
}

const STATUS_ICON: Record<DefectStatus, React.ComponentType<{ className?: string }>> = {
  OPEN: AlertTriangle,
  IN_PROGRESS: Clock,
  RESOLVED: CheckCircle2,
  ACCEPTED: CheckCircle2,
}

interface DefectListProps {
  defects: Array<{
    id: string
    title: string
    priority: DefectPriority
    status: DefectStatus
    category: string | null
    createdAt: Date
    createdBy: { name: string | null; email: string }
    _count: { photos: number; comments: number }
  }>
  projectId: string
}

export function DefectList({ defects, projectId }: DefectListProps) {
  if (defects.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-[var(--ok)]" />
        <p className="font-semibold text-[var(--ink)]">Keine Mängel erfasst</p>
        <p className="text-sm text-[var(--ink-soft)] mt-1">
          Alle in Ordnung – oder legen Sie einen neuen Mangel an.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {defects.map((defect) => {
        const StatusIcon = STATUS_ICON[defect.status]
        const isResolved = defect.status === 'RESOLVED' || defect.status === 'ACCEPTED'

        return (
          <Link
            key={defect.id}
            href={`/projekte/${projectId}/maengel/${defect.id}`}
            className="block bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-4 hover:border-[var(--accent)] transition-colors group"
          >
            <div className="flex items-start gap-3">
              <StatusIcon
                className={`w-5 h-5 mt-0.5 shrink-0 ${
                  defect.priority === 'CRITICAL' && !isResolved
                    ? 'text-[var(--danger)]'
                    : isResolved
                    ? 'text-[var(--ok)]'
                    : 'text-[var(--warning)]'
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold text-sm text-[var(--ink)] group-hover:text-[var(--accent)]">
                    {defect.title}
                  </span>
                  <Badge variant={PRIORITY_VARIANT[defect.priority]}>
                    {PRIORITY_LABEL[defect.priority]}
                  </Badge>
                  <Badge variant={isResolved ? 'success' : 'default'}>
                    {STATUS_LABEL[defect.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--ink-faint)]">
                  <span>{formatDate(defect.createdAt)}</span>
                  {defect.category && <span>· {defect.category}</span>}
                  {defect._count.photos > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Camera className="w-3 h-3" />
                      {defect._count.photos}
                    </span>
                  )}
                  {defect._count.comments > 0 && (
                    <span className="flex items-center gap-0.5">
                      <MessageSquare className="w-3 h-3" />
                      {defect._count.comments}
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--ink-faint)] shrink-0 group-hover:text-[var(--accent)]" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
