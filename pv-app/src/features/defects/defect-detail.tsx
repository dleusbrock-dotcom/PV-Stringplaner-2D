'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock, AlertTriangle, MessageSquare, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import { updateDefectStatus, addDefectComment } from './defect-actions'
import { toast } from '@/components/ui/toaster'
import type { DefectPriority, DefectStatus } from '@prisma/client'

const PRIORITY_LABEL: Record<DefectPriority, string> = {
  LOW: 'Niedrig', MEDIUM: 'Mittel', HIGH: 'Hoch', CRITICAL: 'Kritisch',
}
const PRIORITY_VARIANT: Record<DefectPriority, 'default' | 'warning' | 'danger' | 'primary'> = {
  LOW: 'default', MEDIUM: 'primary', HIGH: 'warning', CRITICAL: 'danger',
}
const STATUS_LABEL: Record<DefectStatus, string> = {
  OPEN: 'Offen', IN_PROGRESS: 'In Bearbeitung', RESOLVED: 'Behoben', ACCEPTED: 'Akzeptiert',
}

interface DefectDetailProps {
  defect: {
    id: string
    title: string
    description: string | null
    priority: DefectPriority
    status: DefectStatus
    category: string | null
    location: string | null
    createdAt: Date
    resolvedAt: Date | null
    createdBy: { name: string | null; email: string }
    resolvedBy: { name: string | null } | null
    comments: Array<{
      id: string
      text: string
      createdAt: Date
      user: { name: string | null }
    }>
    _count: { photos: number }
  }
  projectId: string
}

export function DefectDetail({ defect, projectId }: DefectDetailProps) {
  const [comment, setComment] = useState('')
  const [, startTransition] = useTransition()

  const isResolved = defect.status === 'RESOLVED' || defect.status === 'ACCEPTED'

  const handleStatus = (status: DefectStatus) => {
    startTransition(async () => {
      try {
        await updateDefectStatus(defect.id, status, projectId)
        toast({ title: 'Status aktualisiert', variant: 'success' })
      } catch {
        toast({ title: 'Fehler', variant: 'error' })
      }
    })
  }

  const handleComment = () => {
    if (!comment.trim()) return
    const text = comment
    setComment('')
    startTransition(async () => {
      try {
        await addDefectComment(defect.id, text, projectId)
      } catch {
        toast({ title: 'Fehler beim Kommentar', variant: 'error' })
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Back */}
      <div className="flex items-center gap-3">
        <Link href={`/projekte/${projectId}/maengel`}>
          <Button variant="secondary" size="icon" className="compact">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h2 className="text-lg font-bold text-[var(--ink)] flex-1 truncate">{defect.title}</h2>
      </div>

      {/* Meta */}
      <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-4 space-y-3">
        <div className="flex gap-2 flex-wrap">
          <Badge variant={PRIORITY_VARIANT[defect.priority]}>{PRIORITY_LABEL[defect.priority]}</Badge>
          <Badge variant={isResolved ? 'success' : 'warning'}>{STATUS_LABEL[defect.status]}</Badge>
          {defect.category && <Badge variant="default">{defect.category}</Badge>}
        </div>

        {defect.description && (
          <p className="text-sm text-[var(--ink-soft)] whitespace-pre-wrap">{defect.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3 text-xs">
          {defect.location && (
            <div>
              <span className="text-[var(--ink-faint)]">Ort</span>
              <p className="font-semibold text-[var(--ink)]">{defect.location}</p>
            </div>
          )}
          <div>
            <span className="text-[var(--ink-faint)]">Erfasst</span>
            <p className="font-semibold text-[var(--ink)]">{formatDateTime(defect.createdAt)}</p>
          </div>
          <div>
            <span className="text-[var(--ink-faint)]">Von</span>
            <p className="font-semibold text-[var(--ink)]">{defect.createdBy.name ?? defect.createdBy.email}</p>
          </div>
          {defect.resolvedAt && defect.resolvedBy && (
            <div>
              <span className="text-[var(--ink-faint)]">Behoben</span>
              <p className="font-semibold text-[var(--ok)]">{defect.resolvedBy.name} · {formatDateTime(defect.resolvedAt)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Actions */}
      {!isResolved && (
        <div className="flex gap-2">
          {defect.status === 'OPEN' && (
            <Button variant="secondary" size="sm" onClick={() => handleStatus('IN_PROGRESS')}>
              <Clock className="w-4 h-4" />
              In Bearbeitung
            </Button>
          )}
          <Button variant="success" size="sm" onClick={() => handleStatus('RESOLVED')}>
            <CheckCircle2 className="w-4 h-4" />
            Als behoben markieren
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleStatus('ACCEPTED')}>
            Akzeptiert
          </Button>
        </div>
      )}

      {isResolved && (
        <Button variant="secondary" size="sm" onClick={() => handleStatus('OPEN')}>
          <AlertTriangle className="w-4 h-4" />
          Wieder öffnen
        </Button>
      )}

      {/* Comments */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-[var(--ink)] flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Kommentare ({defect.comments.length})
        </h3>

        {defect.comments.map((c) => (
          <div key={c.id} className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-[var(--ink)]">{c.user.name ?? 'Unbekannt'}</span>
              <span className="text-xs text-[var(--ink-faint)]">{formatDateTime(c.createdAt)}</span>
            </div>
            <p className="text-sm text-[var(--ink-soft)]">{c.text}</p>
          </div>
        ))}

        <div className="flex gap-2">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Kommentar hinzufügen …"
            className="flex-1 px-3 py-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
          />
          <Button variant="primary" size="icon" onClick={handleComment} disabled={!comment.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
