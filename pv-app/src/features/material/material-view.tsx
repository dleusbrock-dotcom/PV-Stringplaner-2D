'use client'

import { useState, useTransition } from 'react'
import { Package, Plus, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { addMaterialItem, updateMaterialActual } from './material-actions'
import { toast } from '@/components/ui/toaster'

interface ProjectMaterial {
  id: string
  plannedQty: number
  actualQty: number
  notes: string | null
  materialItem: {
    id: string
    name: string
    unit: string
  }
}

interface MaterialViewProps {
  materials: ProjectMaterial[]
  projectId: string
}

function MaterialRow({
  material,
  projectId,
}: {
  material: ProjectMaterial
  projectId: string
}) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(material.actualQty.toString())
  const [, startTransition] = useTransition()

  const diff = material.actualQty - material.plannedQty
  const isOk = diff >= 0
  const pct = material.plannedQty > 0
    ? Math.min(100, Math.round((material.actualQty / material.plannedQty) * 100))
    : 0

  const handleSave = () => {
    const qty = parseFloat(value) || 0
    startTransition(async () => {
      try {
        await updateMaterialActual(material.id, qty, projectId)
        setEditing(false)
        toast({ title: 'Menge aktualisiert', variant: 'success' })
      } catch {
        toast({ title: 'Fehler beim Speichern', variant: 'error' })
      }
    })
  }

  return (
    <div className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1">
          <p className="font-semibold text-sm text-[var(--ink)]">{material.materialItem.name}</p>
          {material.notes && (
            <p className="text-xs text-[var(--ink-faint)] mt-0.5">{material.notes}</p>
          )}
        </div>
        <Badge variant={isOk ? 'success' : pct >= 75 ? 'warning' : 'danger'}>
          {pct}%
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-sm mb-2">
        <div>
          <span className="text-xs text-[var(--ink-faint)]">Soll</span>
          <p className="font-mono font-semibold text-[var(--ink)]">
            {material.plannedQty} {material.materialItem.unit}
          </p>
        </div>
        <div>
          <span className="text-xs text-[var(--ink-faint)]">Ist</span>
          {editing ? (
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-20 px-2 py-1 text-sm border border-[var(--accent)] rounded bg-[var(--bg)] text-[var(--ink)] font-mono"
                autoFocus
              />
              <button onClick={handleSave} className="text-[var(--ok)]">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditing(false)} className="text-[var(--ink-faint)]">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p
              className={cn('font-mono font-semibold cursor-pointer hover:text-[var(--accent)]', isOk ? 'text-[var(--ok)]' : 'text-[var(--warning)]')}
              onClick={() => setEditing(true)}
            >
              {material.actualQty} {material.materialItem.unit}
            </p>
          )}
        </div>
        {!editing && (
          <div>
            <span className="text-xs text-[var(--ink-faint)]">Differenz</span>
            <p className={cn('font-mono font-semibold', isOk ? 'text-[var(--ok)]' : 'text-[var(--danger)]')}>
              {diff >= 0 ? '+' : ''}{diff} {material.materialItem.unit}
            </p>
          </div>
        )}
      </div>

      <div className="w-full bg-[var(--line)] rounded-full h-1.5">
        <div
          className="h-1.5 rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: isOk ? 'var(--ok)' : pct >= 75 ? 'var(--warning)' : 'var(--danger)',
          }}
        />
      </div>
    </div>
  )
}

export function MaterialView({ materials, projectId }: MaterialViewProps) {
  const [showForm, setShowForm] = useState(false)
  const [, startTransition] = useTransition()

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('projectId', projectId)

    startTransition(async () => {
      try {
        await addMaterialItem(formData)
        form.reset()
        setShowForm(false)
        toast({ title: 'Material hinzugefügt', variant: 'success' })
      } catch {
        toast({ title: 'Fehler beim Hinzufügen', variant: 'error' })
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--ink)]">Material</h2>
          <p className="text-sm text-[var(--ink-soft)]">{materials.length} Positionen</p>
        </div>
        <Button variant="primary" size="sm" className="compact" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" />
          Position
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-[var(--panel)] border border-[var(--accent)] rounded-[var(--radius)] p-4 space-y-3"
        >
          <p className="font-semibold text-sm text-[var(--ink)]">Neue Materialposition</p>
          <div className="grid grid-cols-2 gap-3">
            <Input name="name" label="Bezeichnung" required className="col-span-2" />
            <Input name="unit" label="Einheit" placeholder="Stk, m, kg …" required />
            <Input name="quantityPlanned" label="Soll-Menge" type="number" min="0" step="0.01" required />
          </div>
          <Input name="notes" label="Hinweis" />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>Abbrechen</Button>
            <Button type="submit" variant="primary" size="sm">Hinzufügen</Button>
          </div>
        </form>
      )}

      {materials.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto mb-3 text-[var(--ink-faint)]" />
          <p className="font-semibold text-[var(--ink)]">Keine Materialpositionen</p>
          <p className="text-sm text-[var(--ink-soft)] mt-1">Fügen Sie Positionen hinzu, um Soll und Ist zu vergleichen.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {materials.map((m) => (
            <MaterialRow key={m.id} material={m} projectId={projectId} />
          ))}
        </div>
      )}
    </div>
  )
}
