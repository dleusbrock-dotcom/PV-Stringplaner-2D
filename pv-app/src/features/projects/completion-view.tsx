'use client'

import { useState } from 'react'
import {
  CheckCircle2, AlertTriangle, Lock, Pen, X, Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDateTime } from '@/lib/utils'
import { completeProject, addSignature } from '@/features/projects/completion-actions'
import { toast } from '@/components/ui/toaster'
import type { ProjectStatus } from '@prisma/client'

interface CompletionViewProps {
  project: {
    id: string
    name: string
    status: ProjectStatus
    lockedAt: Date | null
    roofAreas: Array<{ id: string; name: string; _count: { placements: number } }>
    checklists: Array<{
      id: string
      template: { name: string }
      items: Array<{ status: string }>
    }>
    defects: Array<{ id: string; title: string; priority: string }>
    signatures: Array<{
      id: string
      signerName: string
      signerRole: string
      confirmedAt: Date
    }>
    _count: { photos: number; documents: number }
  }
  userId: string
}

interface CheckItem {
  label: string
  ok: boolean
  warning?: string
}

export function CompletionView({ project, userId }: CompletionViewProps) {
  const [isCompleting, setIsCompleting] = useState(false)
  const [showSignature, setShowSignature] = useState(false)
  const [signerName, setSignerName] = useState('')
  const [signerRole, setSignerRole] = useState('Monteur')

  const totalModules = project.roofAreas.reduce((s, a) => s + a._count.placements, 0)
  const checklistsDone = project.checklists.filter((c) =>
    c.items.length > 0 && c.items.every((i) => i.status === 'DONE' || i.status === 'NOT_APPLICABLE')
  ).length
  const criticalDefects = project.defects.length

  const checks: CheckItem[] = [
    {
      label: 'Module geplant',
      ok: totalModules > 0,
      warning: totalModules === 0 ? 'Keine Module geplant' : undefined,
    },
    {
      label: 'Fotos aufgenommen',
      ok: project._count.photos >= 3,
      warning: project._count.photos < 3 ? `Nur ${project._count.photos} Fotos (mind. 3)` : undefined,
    },
    {
      label: 'Checklisten abgeschlossen',
      ok: project.checklists.length > 0 && checklistsDone === project.checklists.length,
      warning: project.checklists.length === 0 ? 'Keine Checklisten' : `${checklistsDone}/${project.checklists.length} abgeschlossen`,
    },
    {
      label: 'Keine kritischen Mängel',
      ok: criticalDefects === 0,
      warning: criticalDefects > 0 ? `${criticalDefects} kritische Mängel offen` : undefined,
    },
    {
      label: 'Unterschrift erfasst',
      ok: project.signatures.length > 0,
      warning: project.signatures.length === 0 ? 'Noch keine Unterschrift' : undefined,
    },
  ]

  const mustItemsOk = checks.filter((c, i) => [0, 3].includes(i)).every((c) => c.ok)
  const isLocked = !!project.lockedAt
  const isCompleted = project.status === 'COMPLETED'

  const handleComplete = async () => {
    if (!mustItemsOk) {
      toast({
        title: 'Abschluss nicht möglich',
        description: 'Bitte beheben Sie alle kritischen Mängel.',
        variant: 'error',
      })
      return
    }
    setIsCompleting(true)
    try {
      await completeProject(project.id)
      toast({ title: 'Projekt abgeschlossen', variant: 'success' })
    } catch (e) {
      toast({ title: 'Fehler', description: String(e), variant: 'error' })
      setIsCompleting(false)
    }
  }

  const handleAddSignature = async () => {
    if (!signerName.trim()) {
      toast({ title: 'Name erforderlich', variant: 'error' })
      return
    }
    try {
      await addSignature(project.id, signerName.trim(), signerRole, userId)
      toast({ title: 'Unterschrift gespeichert', variant: 'success' })
      setShowSignature(false)
      setSignerName('')
    } catch {
      toast({ title: 'Fehler beim Speichern', variant: 'error' })
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[var(--ink)]">Projektabschluss</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          Vollständigkeitsprüfung und Projektsperre
        </p>
      </div>

      {/* Completion Checklist */}
      <Card>
        <CardHeader>
          <CheckCircle2 className="w-4 h-4 text-[var(--accent)]" />
          <CardTitle>Vollständigkeitsprüfung</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--line)]">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              {c.ok ? (
                <Check className="w-4 h-4 text-[var(--ok)] shrink-0" />
              ) : (
                <X className="w-4 h-4 text-[var(--danger)] shrink-0" />
              )}
              <span className={`text-sm flex-1 ${c.ok ? 'text-[var(--ink)]' : 'text-[var(--danger)]'}`}>
                {c.label}
              </span>
              {c.warning && !c.ok && (
                <span className="text-xs text-[var(--danger)]">{c.warning}</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Signatures */}
      <Card>
        <CardHeader>
          <Pen className="w-4 h-4 text-[var(--accent)]" />
          <CardTitle>Freigaben & Unterschriften</CardTitle>
          {!isLocked && (
            <Button
              variant="primary"
              size="sm"
              className="compact ml-auto"
              onClick={() => setShowSignature(!showSignature)}
            >
              + Unterschrift
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {showSignature && (
            <div className="mb-4 p-3 bg-[var(--panel-2)] rounded-lg space-y-3">
              <div>
                <label className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide block mb-1">
                  Name
                </label>
                <input
                  className="w-full h-11 rounded border border-[var(--line-strong)] px-3 text-sm bg-[var(--panel)]"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Vor- und Nachname"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide block mb-1">
                  Rolle
                </label>
                <select
                  className="w-full h-11 rounded border border-[var(--line-strong)] px-3 text-sm bg-[var(--panel)]"
                  value={signerRole}
                  onChange={(e) => setSignerRole(e.target.value)}
                >
                  <option>Monteur</option>
                  <option>Bauleitung</option>
                  <option>Kunde</option>
                  <option>Elektriker</option>
                </select>
              </div>
              <p className="text-xs text-[var(--ink-faint)]">
                Mit dem Speichern bestätige ich den aktuellen Dokumentenstand.
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" className="flex-1" onClick={() => setShowSignature(false)}>
                  Abbrechen
                </Button>
                <Button variant="primary" size="sm" className="flex-1" onClick={handleAddSignature}>
                  Bestätigen
                </Button>
              </div>
            </div>
          )}

          {project.signatures.length === 0 ? (
            <p className="text-sm text-[var(--ink-faint)]">Noch keine Unterschriften</p>
          ) : (
            <div className="space-y-2">
              {project.signatures.map((sig) => (
                <div key={sig.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--ok-soft)] flex items-center justify-center text-[var(--ok)]">
                    <Check className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{sig.signerName}</p>
                    <p className="text-xs text-[var(--ink-faint)]">
                      {sig.signerRole} · {formatDateTime(sig.confirmedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completion Actions */}
      {!isCompleted && !isLocked && (
        <div className="space-y-3">
          {!mustItemsOk && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-[var(--danger-soft)] border border-[var(--danger)]">
              <AlertTriangle className="w-4 h-4 text-[var(--danger)] shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--danger)]">
                Alle kritischen Mängel müssen behoben sein, bevor das Projekt abgeschlossen werden kann.
              </p>
            </div>
          )}
          <Button
            variant="success"
            className="w-full"
            loading={isCompleting}
            disabled={!mustItemsOk}
            onClick={handleComplete}
          >
            <Lock className="w-4 h-4" />
            Projekt abschließen und sperren
          </Button>
        </div>
      )}

      {isCompleted && (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius)] bg-[var(--ok-soft)] border border-[var(--ok)]">
          <CheckCircle2 className="w-6 h-6 text-[var(--ok)]" />
          <div>
            <p className="font-bold text-[var(--ok)]">Projekt abgeschlossen</p>
            <p className="text-xs text-[var(--ok)]">
              {isLocked ? `Gesperrt ${formatDateTime(project.lockedAt)}` : 'Abgeschlossen'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
