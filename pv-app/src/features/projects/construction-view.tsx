'use client'

import { useState, useEffect } from 'react'
import {
  Wifi, WifiOff, Download, Clock, AlertTriangle,
  CheckCircle2, Camera, ClipboardCheck, Package, Zap
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'
import type { ProjectStatus } from '@prisma/client'

interface ConstructionViewProps {
  project: {
    id: string
    name: string
    number: string
    status: ProjectStatus
    roofAreas: Array<{
      id: string
      name: string
      placements: Array<{ id: string; isPlan: boolean; isInstalled: boolean }>
    }>
    checklists: Array<{
      id: string
      template: { name: string }
      items: Array<{ status: string }>
    }>
    defects: Array<{
      id: string
      title: string
      priority: string
      status: string
    }>
  }
}

export function ConstructionView({ project }: ConstructionViewProps) {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const totalPlan = project.roofAreas.reduce(
    (s, a) => s + a.placements.filter((p) => p.isPlan).length, 0
  )
  const totalInstalled = project.roofAreas.reduce(
    (s, a) => s + a.placements.filter((p) => p.isInstalled).length, 0
  )
  const installProgress = totalPlan > 0 ? Math.round((totalInstalled / totalPlan) * 100) : 0

  const checklistsDone = project.checklists.filter((c) =>
    c.items.length > 0 && c.items.every((i) => i.status === 'DONE' || i.status === 'NOT_APPLICABLE')
  ).length

  const criticalDefects = project.defects.filter((d) => d.priority === 'CRITICAL').length

  const handleDownloadOffline = async () => {
    setIsDownloading(true)
    // TODO: Download project data to IndexedDB
    await new Promise((r) => setTimeout(r, 1500))
    setLastSync(new Date())
    setIsDownloading(false)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Online Status Banner */}
      <div
        className={`flex items-center gap-3 p-3 rounded-[var(--radius)] border ${
          isOnline
            ? 'bg-[var(--ok-soft)] border-[var(--ok)]'
            : 'bg-[var(--danger-soft)] border-[var(--danger)]'
        }`}
      >
        {isOnline ? (
          <Wifi className="w-5 h-5 text-[var(--ok)]" />
        ) : (
          <WifiOff className="w-5 h-5 text-[var(--danger)]" />
        )}
        <div className="flex-1">
          <p className={`text-sm font-semibold ${isOnline ? 'text-[var(--ok)]' : 'text-[var(--danger)]'}`}>
            {isOnline ? 'Online – Synchronisierung aktiv' : 'Offline – Lokale Daten werden verwendet'}
          </p>
          {lastSync && (
            <p className="text-xs text-[var(--ink-faint)]">
              Zuletzt synchronisiert: {formatDateTime(lastSync)}
            </p>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="compact"
          onClick={handleDownloadOffline}
          loading={isDownloading}
        >
          <Download className="w-3.5 h-3.5" />
          Offline laden
        </Button>
      </div>

      {/* Critical Defects */}
      {criticalDefects > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-[var(--radius)] bg-[var(--danger-soft)] border border-[var(--danger)]">
          <AlertTriangle className="w-5 h-5 text-[var(--danger)]" />
          <div className="flex-1">
            <p className="text-sm font-bold text-[var(--danger)]">
              {criticalDefects} kritische Mängel offen
            </p>
          </div>
          <Link
            href={`/projekte/${project.id}/maengel`}
            className="text-xs font-semibold text-[var(--danger)] hover:underline"
          >
            Bearbeiten
          </Link>
        </div>
      )}

      {/* Installation Progress */}
      <Card>
        <CardHeader>
          <Zap className="w-4 h-4 text-[var(--sun)]" />
          <CardTitle>Montagefortschritt</CardTitle>
          <span className="ml-auto text-sm font-bold text-[var(--ink)]">
            {totalInstalled}/{totalPlan}
          </span>
        </CardHeader>
        <CardContent>
          <div className="h-3 bg-[var(--line)] rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-[var(--ok)] rounded-full transition-all duration-500"
              style={{ width: `${installProgress}%` }}
            />
          </div>
          <p className="text-xs text-[var(--ink-soft)]">
            {installProgress}% der geplanten Module installiert
          </p>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            href: `/projekte/${project.id}/fotos`,
            icon: Camera,
            label: 'Foto aufnehmen',
            color: 'var(--accent)',
          },
          {
            href: `/projekte/${project.id}/pruefungen`,
            icon: ClipboardCheck,
            label: 'Checkliste',
            color: 'var(--ok)',
            badge: `${checklistsDone}/${project.checklists.length}`,
          },
          {
            href: `/projekte/${project.id}/maengel`,
            icon: AlertTriangle,
            label: 'Mangel melden',
            color: criticalDefects > 0 ? 'var(--danger)' : 'var(--warning)',
          },
          {
            href: `/projekte/${project.id}/material`,
            icon: Package,
            label: 'Material',
            color: 'var(--ink-soft)',
          },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2 p-4 bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
          >
            <action.icon className="w-8 h-8" style={{ color: action.color }} />
            <span className="text-xs font-semibold text-[var(--ink)] text-center">{action.label}</span>
            {action.badge && (
              <Badge variant="default">{action.badge}</Badge>
            )}
          </Link>
        ))}
      </div>

      {/* Checklists Overview */}
      <Card>
        <CardHeader>
          <ClipboardCheck className="w-4 h-4 text-[var(--accent)]" />
          <CardTitle>Checklisten</CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-[var(--line)]">
          {project.checklists.length === 0 ? (
            <p className="text-sm text-[var(--ink-faint)] py-2">
              Noch keine Checklisten. Gehen Sie zu &#8222;Prüfungen&#8220;.
            </p>
          ) : (
            project.checklists.map((cl) => {
              const done = cl.items.filter(
                (i) => i.status === 'DONE' || i.status === 'NOT_APPLICABLE'
              ).length
              const total = cl.items.length
              const isComplete = total > 0 && done === total

              return (
                <div key={cl.id} className="flex items-center gap-3 py-2">
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--ok)] shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-[var(--ink-faint)] shrink-0" />
                  )}
                  <span className="text-sm text-[var(--ink)] flex-1">{cl.template.name}</span>
                  <span className="text-xs text-[var(--ink-faint)]">
                    {done}/{total}
                  </span>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
