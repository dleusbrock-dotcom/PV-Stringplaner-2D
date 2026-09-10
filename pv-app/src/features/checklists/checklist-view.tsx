'use client'

import { useState, useTransition } from 'react'
import { ClipboardCheck, CheckCircle2, Circle, MinusCircle, ChevronDown, ChevronRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { updateChecklistItemStatus, initChecklistsForProject } from './checklist-actions'
import { toast } from '@/components/ui/toaster'
import type { ChecklistItemStatus } from '@prisma/client'

const STATUS_CONFIG: Record<ChecklistItemStatus, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  OPEN: { label: 'Offen', icon: Circle },
  DONE: { label: 'Erledigt', icon: CheckCircle2 },
  NOT_APPLICABLE: { label: 'Entfällt', icon: MinusCircle },
  LOCKED: { label: 'Gesperrt', icon: CheckCircle2 },
}

interface ChecklistItem {
  id: string
  text: string
  completedAt: Date | null
  status: ChecklistItemStatus
  completedBy: { name: string | null } | null
}

interface ChecklistWithTemplate {
  id: string
  template: { name: string }
  items: ChecklistItem[]
}

interface ChecklistViewProps {
  checklists: ChecklistWithTemplate[]
  projectId: string
}

function ChecklistSection({ checklist, projectId }: { checklist: ChecklistWithTemplate; projectId: string }) {
  const [expanded, setExpanded] = useState(true)
  const [, startTransition] = useTransition()

  const total = checklist.items.length
  const done = checklist.items.filter((i) => i.status !== 'OPEN').length
  const progress = total > 0 ? Math.round((done / total) * 100) : 0

  const toggle = (item: ChecklistItem) => {
    const next: ChecklistItemStatus =
      item.status === 'OPEN' ? 'DONE' : item.status === 'DONE' ? 'NOT_APPLICABLE' : 'OPEN'

    startTransition(async () => {
      try {
        await updateChecklistItemStatus(item.id, next, projectId)
      } catch {
        toast({ title: 'Fehler beim Aktualisieren', variant: 'error' })
      }
    })
  }

  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] overflow-hidden">
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <ClipboardCheck className="w-5 h-5 text-[var(--accent)] shrink-0" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm text-[var(--ink)]">{checklist.template.name}</span>
            <Badge variant={progress === 100 ? 'success' : 'default'}>{done}/{total}</Badge>
          </div>
          <div className="w-full bg-[var(--line)] rounded-full h-1.5">
            <div
              className="h-1.5 rounded-full transition-all"
              style={{
                width: `${progress}%`,
                backgroundColor: progress === 100 ? 'var(--ok)' : 'var(--accent)',
              }}
            />
          </div>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-[var(--ink-faint)] shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-[var(--ink-faint)] shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-[var(--line)] divide-y divide-[var(--line)]">
          {checklist.items.map((item) => {
            const StatusIcon = STATUS_CONFIG[item.status].icon
            const isDone = item.status === 'DONE' || item.status === 'LOCKED'
            const isNA = item.status === 'NOT_APPLICABLE'

            return (
              <button
                key={item.id}
                className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[var(--panel-2)] transition-colors"
                onClick={() => toggle(item)}
                disabled={item.status === 'LOCKED'}
              >
                <StatusIcon
                  className={cn(
                    'w-5 h-5 mt-0.5 shrink-0',
                    isDone ? 'text-[var(--ok)]' : isNA ? 'text-[var(--ink-faint)]' : 'text-[var(--line-strong)]'
                  )}
                />
                <div className="flex-1">
                  <span
                    className={cn(
                      'text-sm font-medium',
                      isDone || isNA ? 'text-[var(--ink-soft)] line-through' : 'text-[var(--ink)]'
                    )}
                  >
                    {item.text}
                  </span>
                  {item.completedBy && item.completedAt && (
                    <p className="text-xs text-[var(--ok)] mt-0.5">
                      {item.completedBy.name} · {new Date(item.completedAt).toLocaleDateString('de-DE')}
                    </p>
                  )}
                </div>
                <Badge variant={isDone ? 'success' : isNA ? 'default' : 'warning'} className="shrink-0 mt-0.5">
                  {STATUS_CONFIG[item.status].label}
                </Badge>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function ChecklistView({ checklists, projectId }: ChecklistViewProps) {
  const [isPending, startTransition] = useTransition()

  const handleInit = () => {
    startTransition(async () => {
      try {
        await initChecklistsForProject(projectId)
        toast({ title: 'Prüflisten initialisiert', variant: 'success' })
      } catch {
        toast({ title: 'Fehler beim Initialisieren', variant: 'error' })
      }
    })
  }

  const totalItems = checklists.reduce((s, c) => s + c.items.length, 0)
  const doneItems = checklists.reduce(
    (s, c) => s + c.items.filter((i) => i.status !== 'OPEN').length,
    0
  )

  if (checklists.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <ClipboardCheck className="w-12 h-12 mx-auto mb-4 text-[var(--ink-faint)]" />
        <h2 className="text-lg font-bold text-[var(--ink)] mb-2">Keine Prüflisten vorhanden</h2>
        <p className="text-sm text-[var(--ink-soft)] mb-6">
          Initialisieren Sie die Prüflisten aus den Vorlagen, um mit der Dokumentation zu beginnen.
        </p>
        <Button variant="primary" onClick={handleInit} loading={isPending}>
          <Play className="w-4 h-4" />
          Prüflisten initialisieren
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--ink)]">Prüfungen</h2>
          <p className="text-sm text-[var(--ink-soft)]">
            {doneItems} von {totalItems} Punkten erledigt
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {checklists.map((checklist) => (
          <ChecklistSection key={checklist.id} checklist={checklist} projectId={projectId} />
        ))}
      </div>

      <p className="text-xs text-[var(--ink-faint)] text-center">
        Tippen Sie auf einen Punkt: Offen → Erledigt → Entfällt → Offen
      </p>
    </div>
  )
}
