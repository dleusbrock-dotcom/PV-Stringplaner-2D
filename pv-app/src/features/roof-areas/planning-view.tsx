'use client'

import { useState } from 'react'
import { Plus, Grid3x3, Zap, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RoofCanvas } from './roof-canvas'
import { StringPanel } from '../strings/string-panel'
import { InverterPanel } from '../inverters/inverter-panel'
import { AddRoofAreaDialog } from './add-roof-area-dialog'
import { cn } from '@/lib/utils'

interface PlanningViewProps {
  project: {
    id: string
    lockedAt: Date | null
    roofAreas: Array<{
      id: string
      name: string
      gridRows: number
      gridCols: number
      cellWidth: number
      cellHeight: number
      orientation: number | null
      tiltAngle: number | null
      obstacles: Array<{
        id: string
        type: string
        label: string | null
        col: number
        row: number
        width: number
        height: number
      }>
      placements: Array<{
        id: string
        col: number
        row: number
        isPlan: boolean
        isEnabled: boolean
        stringAssignment: {
          id: string
          sortOrder: number
          label: string
          stringPlan: { id: string; color: string; name: string }
        } | null
      }>
    }>
    inverters: Array<{
      id: string
      label: string
      mpptInputs: Array<{
        id: string
        inputNumber: number
        label: string | null
        stringPlans: Array<{
          id: string
          name: string
          color: string
          modules: Array<{
            id: string
            sortOrder: number
            label: string
          }>
        }>
      }>
    }>
  }
}

type ActivePanel = 'canvas' | 'strings' | 'inverters'

export function PlanningView({ project }: PlanningViewProps) {
  const [activeRoofAreaId, setActiveRoofAreaId] = useState<string>(
    project.roofAreas[0]?.id ?? ''
  )
  const [activeStringId, setActiveStringId] = useState<string | null>(null)
  const [showAddRoofDialog, setShowAddRoofDialog] = useState(false)
  const [activePanel, setActivePanel] = useState<ActivePanel>('canvas')

  const activeRoofArea = project.roofAreas.find((r) => r.id === activeRoofAreaId)
  const isLocked = !!project.lockedAt

  // Gather all string plans across all inverters
  const allStrings = project.inverters.flatMap((inv) =>
    inv.mpptInputs.flatMap((mppt) => mppt.stringPlans)
  )

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-2 bg-[var(--panel-2)] border-b border-[var(--line)] flex items-center gap-2 flex-wrap">
        {/* Roof Area Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          {project.roofAreas.map((area) => (
            <button
              key={area.id}
              onClick={() => setActiveRoofAreaId(area.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors',
                area.id === activeRoofAreaId
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--panel)] border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
              )}
            >
              {area.name}
            </button>
          ))}
          {!isLocked && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAddRoofDialog(true)}
              className="compact"
            >
              <Plus className="w-3 h-3" />
              Dachfläche
            </Button>
          )}
        </div>

        <div className="flex-1" />

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-[var(--panel)] border border-[var(--line)] rounded-lg p-0.5">
          {(
            [
              { id: 'canvas', icon: Grid3x3, label: 'Dach' },
              { id: 'strings', icon: Zap, label: 'Strings' },
              { id: 'inverters', icon: Layers, label: 'Wechselrichter' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActivePanel(tab.id)}
              className={cn(
                'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                activePanel === tab.id
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
              )}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span className="hidden sm:block">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex">
        {activePanel === 'canvas' && activeRoofArea && (
          <RoofCanvas
            roofArea={activeRoofArea}
            projectId={project.id}
            activeStringId={activeStringId}
            strings={allStrings}
            isLocked={isLocked}
          />
        )}
        {activePanel === 'canvas' && !activeRoofArea && (
          <div className="flex-1 flex items-center justify-center text-[var(--ink-soft)]">
            <div className="text-center">
              <Grid3x3 className="w-12 h-12 mx-auto mb-3 text-[var(--ink-faint)]" />
              <p className="font-semibold">Keine Dachfläche ausgewählt</p>
              <p className="text-sm text-[var(--ink-faint)] mt-1">
                Legen Sie zuerst eine Dachfläche an.
              </p>
              <Button
                variant="primary"
                className="mt-4"
                onClick={() => setShowAddRoofDialog(true)}
              >
                <Plus className="w-4 h-4" />
                Dachfläche anlegen
              </Button>
            </div>
          </div>
        )}

        {activePanel === 'strings' && (
          <StringPanel
            projectId={project.id}
            roofAreas={project.roofAreas}
            strings={allStrings}
            activeStringId={activeStringId}
            onSelectString={setActiveStringId}
            isLocked={isLocked}
          />
        )}

        {activePanel === 'inverters' && (
          <InverterPanel
            projectId={project.id}
            inverters={project.inverters}
            strings={allStrings}
            isLocked={isLocked}
          />
        )}
      </div>

      {/* Add Roof Area Dialog */}
      {showAddRoofDialog && (
        <AddRoofAreaDialog
          projectId={project.id}
          onClose={() => setShowAddRoofDialog(false)}
        />
      )}
    </div>
  )
}
