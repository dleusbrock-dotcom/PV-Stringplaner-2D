'use client'

import { useState } from 'react'
import { Plus, Zap, Trash2, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createString, deleteString } from './actions'
import { toast } from '@/components/ui/toaster'

const STRING_COLORS = [
  '#E63946', '#F4A261', '#2A9D8F', '#457B9D', '#6A0572',
  '#E9C46A', '#264653', '#A8DADC', '#F72585', '#7B2FBE',
]

interface StringPanelProps {
  projectId: string
  roofAreas: Array<{
    id: string
    name: string
    placements: Array<{
      id: string
      col: number
      row: number
      stringAssignment: {
        id: string
        sortOrder: number
        label: string
        stringPlan: { id: string; color: string; name: string }
      } | null
    }>
  }>
  strings: Array<{
    id: string
    name: string
    color: string
    modules: Array<{ id: string; sortOrder: number; label: string }>
  }>
  activeStringId: string | null
  onSelectString: (id: string | null) => void
  isLocked: boolean
}

export function StringPanel({
  projectId,
  strings,
  activeStringId,
  onSelectString,
  isLocked,
}: StringPanelProps) {
  const [isCreating, setIsCreating] = useState(false)

  const handleCreateString = async () => {
    if (isLocked) return
    setIsCreating(true)
    try {
      const color = STRING_COLORS[strings.length % STRING_COLORS.length]
      const name = `String ${strings.length + 1}`
      await createString(projectId, name, color)
      toast({ title: `${name} angelegt`, variant: 'success' })
    } catch {
      toast({ title: 'Fehler', description: 'String konnte nicht angelegt werden.', variant: 'error' })
    }
    setIsCreating(false)
  }

  const handleDeleteString = async (stringId: string, name: string) => {
    if (!confirm(`String "${name}" wirklich löschen? Alle Modulzuordnungen werden entfernt.`)) return
    try {
      await deleteString(stringId)
      if (activeStringId === stringId) onSelectString(null)
      toast({ title: `${name} gelöscht`, variant: 'success' })
    } catch {
      toast({ title: 'Fehler', description: 'String konnte nicht gelöscht werden.', variant: 'error' })
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)]">
        <h3 className="font-bold text-sm text-[var(--ink)]">Strings</h3>
        {!isLocked && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleCreateString}
            loading={isCreating}
            className="compact"
          >
            <Plus className="w-3.5 h-3.5" />
            String
          </Button>
        )}
      </div>

      {/* String List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {strings.length === 0 ? (
          <div className="text-center py-8">
            <Zap className="w-8 h-8 mx-auto mb-2 text-[var(--ink-faint)]" />
            <p className="text-sm text-[var(--ink-soft)]">Noch keine Strings</p>
            <p className="text-xs text-[var(--ink-faint)] mt-1">
              Legen Sie einen String an und wählen Sie Module auf dem Canvas.
            </p>
          </div>
        ) : (
          strings.map((s) => {
            const isActive = s.id === activeStringId
            return (
              <div
                key={s.id}
                className={cn(
                  'rounded-[var(--radius)] border transition-all',
                  isActive
                    ? 'border-2 shadow-sm'
                    : 'border-[var(--line)] hover:border-[var(--line-strong)]'
                )}
                style={isActive ? { borderColor: s.color } : {}}
              >
                <button
                  className="w-full flex items-center gap-3 p-3 text-left"
                  onClick={() => onSelectString(isActive ? null : s.id)}
                >
                  {/* Color swatch */}
                  <div
                    className="w-4 h-8 rounded shrink-0"
                    style={{ background: s.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-[var(--ink)]">{s.name}</p>
                    <p className="text-xs text-[var(--ink-faint)]">
                      {s.modules.length} Module
                    </p>
                  </div>
                  {isActive ? (
                    <ChevronDown className="w-4 h-4 text-[var(--ink-faint)] shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-[var(--ink-faint)] shrink-0" />
                  )}
                </button>

                {/* Expanded: Module List */}
                {isActive && s.modules.length > 0 && (
                  <div className="px-3 pb-3 border-t border-[var(--line)]">
                    <div className="pt-2 space-y-1">
                      {s.modules.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-2 text-xs py-0.5"
                        >
                          <span
                            className="font-mono font-bold w-14 shrink-0"
                            style={{ color: s.color }}
                          >
                            {m.label}
                          </span>
                          <span className="text-[var(--ink-faint)]">
                            Pos. {m.sortOrder + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delete button */}
                {!isLocked && isActive && (
                  <div className="px-3 pb-3">
                    <Button
                      variant="danger"
                      size="sm"
                      className="compact w-full"
                      onClick={() => handleDeleteString(s.id, s.name)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      String löschen
                    </Button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Info */}
      <div className="px-4 py-3 border-t border-[var(--line)] bg-[var(--panel-2)]">
        <p className="text-xs text-[var(--ink-faint)]">
          String auswählen, dann Module auf dem Canvas antippen.
        </p>
      </div>
    </div>
  )
}
