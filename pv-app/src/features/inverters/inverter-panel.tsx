'use client'

import { useState } from 'react'
import { Plus, Zap, AlertTriangle, Check, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AddInverterDialog } from './add-inverter-dialog'
import { AssignStringToMpptSelect } from './assign-string-select'

interface InverterPanelProps {
  projectId: string
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
        modules: Array<{ id: string }>
      }>
    }>
  }>
  strings: Array<{ id: string; name: string; color: string; modules: Array<{ id: string }> }>
  isLocked: boolean
}

export function InverterPanel({ projectId, inverters, strings, isLocked }: InverterPanelProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Calculate unassigned strings
  const assignedStringIds = new Set(
    inverters.flatMap((inv) =>
      inv.mpptInputs.flatMap((mppt) => mppt.stringPlans.map((s) => s.id))
    )
  )
  const unassignedStrings = strings.filter((s) => !assignedStringIds.has(s.id))

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
        <h3 className="font-bold text-sm text-[var(--ink)]">Wechselrichter</h3>
        {!isLocked && (
          <Button
            variant="primary"
            size="sm"
            className="compact"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Wechselrichter
          </Button>
        )}
      </div>

      {/* Unassigned warning */}
      {unassignedStrings.length > 0 && (
        <div className="mx-3 mt-3 flex items-start gap-2 p-3 rounded-lg bg-[var(--warning-soft)] border border-[var(--warning)]">
          <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-[var(--warning)]">
              {unassignedStrings.length} String{unassignedStrings.length > 1 ? 's' : ''} nicht zugeordnet
            </p>
            <div className="flex flex-wrap gap-1 mt-1">
              {unassignedStrings.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                  style={{ background: s.color }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inverter List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {inverters.length === 0 ? (
          <div className="text-center py-8">
            <Layers className="w-8 h-8 mx-auto mb-2 text-[var(--ink-faint)]" />
            <p className="text-sm text-[var(--ink-soft)]">Noch keine Wechselrichter</p>
            <p className="text-xs text-[var(--ink-faint)] mt-1">
              Legen Sie einen Wechselrichter an und ordnen Sie Strings zu.
            </p>
          </div>
        ) : (
          inverters.map((inv) => (
            <div
              key={inv.id}
              className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)]"
            >
              {/* Inverter header */}
              <div className="flex items-center gap-2 p-3 border-b border-[var(--line)]">
                <Zap className="w-4 h-4 text-[var(--sun)]" />
                <span className="font-semibold text-sm text-[var(--ink)]">{inv.label}</span>
                <Badge variant="default" className="ml-auto">
                  {inv.mpptInputs.length} MPPT
                </Badge>
              </div>

              {/* MPPT Inputs */}
              <div className="p-3 space-y-3">
                {inv.mpptInputs.map((mppt) => {
                  const assignedHere = mppt.stringPlans
                  const totalModules = assignedHere.reduce(
                    (sum, s) => sum + s.modules.length, 0
                  )

                  return (
                    <div key={mppt.id} className="bg-[var(--panel-2)] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-[var(--ink-soft)] uppercase">
                          MPPT {mppt.inputNumber}
                          {mppt.label ? ` – ${mppt.label}` : ''}
                        </span>
                        {totalModules > 0 && (
                          <span className="ml-auto text-xs text-[var(--ink-faint)]">
                            {totalModules} Module
                          </span>
                        )}
                      </div>

                      {/* Assigned strings */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {assignedHere.map((s) => (
                          <div
                            key={s.id}
                            className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold text-white"
                            style={{ background: s.color }}
                          >
                            <Check className="w-2.5 h-2.5" />
                            {s.name} ({s.modules.length})
                          </div>
                        ))}
                        {assignedHere.length === 0 && (
                          <span className="text-xs text-[var(--ink-faint)]">Kein String zugeordnet</span>
                        )}
                      </div>

                      {/* Assign string dropdown */}
                      {!isLocked && unassignedStrings.length > 0 && (
                        <AssignStringToMpptSelect
                          mpptId={mppt.id}
                          strings={unassignedStrings}
                          projectId={projectId}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {showAddDialog && (
        <AddInverterDialog
          projectId={projectId}
          onClose={() => setShowAddDialog(false)}
        />
      )}
    </div>
  )
}
