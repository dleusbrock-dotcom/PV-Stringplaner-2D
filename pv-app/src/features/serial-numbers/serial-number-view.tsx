'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, QrCode, Search, Package, Edit2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { addSerialNumber, deleteSerialNumber, updateSerialNumber } from './serial-number-actions'

interface Component {
  id: string
  snapshotData: unknown
  quantity: number
  notes: string | null
}

interface SerialNumberEntry {
  id: string
  serialNumber: string
  position: string | null
  recordedAt: Date
  projectComponentId: string | null
  projectComponent: Component | null
  recordedBy: { name: string | null } | null
}

interface SerialNumberViewProps {
  projectId: string
  entries: SerialNumberEntry[]
  components: Component[]
}

function getComponentLabel(comp: Component): string {
  const data = comp.snapshotData as Record<string, unknown> | null
  if (data?.manufacturer && data?.model) {
    return `${data.manufacturer} ${data.model}`
  }
  return `Bauteil`
}

export function SerialNumberView({ projectId, entries, components }: SerialNumberViewProps) {
  const [isPending, startTransition] = useTransition()
  const [filter, setFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState('')
  const [serialInput, setSerialInput] = useState('')
  const [positionInput, setPositionInput] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editSerial, setEditSerial] = useState('')
  const [editPosition, setEditPosition] = useState('')

  const filtered = entries.filter((e) =>
    e.serialNumber.toLowerCase().includes(filter.toLowerCase()) ||
    (e.position ?? '').toLowerCase().includes(filter.toLowerCase())
  )

  const handleAdd = () => {
    if (!serialInput.trim()) return
    const fd = new FormData()
    fd.set('projectId', projectId)
    fd.set('serialNumber', serialInput)
    fd.set('position', positionInput)
    if (selectedComponent) fd.set('projectComponentId', selectedComponent)

    startTransition(async () => {
      try {
        await addSerialNumber(fd)
        setSerialInput('')
        setPositionInput('')
        setSelectedComponent('')
        setShowForm(false)
        toast({ title: 'Seriennummer gespeichert', variant: 'success' })
      } catch (e) {
        toast({ title: String(e), variant: 'error' })
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        await deleteSerialNumber(id, projectId)
        toast({ title: 'Gelöscht', variant: 'success' })
      } catch (e) {
        toast({ title: String(e), variant: 'error' })
      }
    })
  }

  const startEdit = (entry: SerialNumberEntry) => {
    setEditId(entry.id)
    setEditSerial(entry.serialNumber)
    setEditPosition(entry.position ?? '')
  }

  const handleEditSave = (id: string) => {
    startTransition(async () => {
      try {
        await updateSerialNumber(id, projectId, { serialNumber: editSerial, position: editPosition })
        setEditId(null)
        toast({ title: 'Aktualisiert', variant: 'success' })
      } catch (e) {
        toast({ title: String(e), variant: 'error' })
      }
    })
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <h1 className="font-bold text-[var(--ink)] text-lg">Seriennummern</h1>
          <p className="text-xs text-[var(--ink-soft)]">{entries.length} erfasst</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" />
          Hinzufügen
        </Button>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-[var(--panel)] border border-[var(--accent)] rounded-[var(--radius)] p-4 mb-4 space-y-3">
          <h3 className="font-semibold text-sm text-[var(--ink)]">Neue Seriennummer</h3>

          {components.length > 0 && (
            <div>
              <label className="text-xs text-[var(--ink-soft)] mb-1 block">Bauteil (optional)</label>
              <select
                value={selectedComponent}
                onChange={(e) => setSelectedComponent(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm"
              >
                <option value="">Kein Bauteil zugeordnet</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {getComponentLabel(c)} (×{c.quantity})
                  </option>
                ))}
              </select>
            </div>
          )}

          <Input
            label="Seriennummer *"
            value={serialInput}
            onChange={(e) => setSerialInput(e.target.value)}
            placeholder="z. B. DE123456789"
          />
          <Input
            label="Einbauort / Position"
            value={positionInput}
            onChange={(e) => setPositionInput(e.target.value)}
            placeholder="z. B. Dachfeld A, Reihe 3"
          />

          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={isPending || !serialInput.trim()}>
              Speichern
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
              Abbrechen
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      {entries.length > 5 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--ink-faint)]" />
          <input
            type="text"
            placeholder="Seriennummer oder Position suchen…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--line)] bg-[var(--panel)] text-sm text-[var(--ink)] placeholder-[var(--ink-faint)]"
          />
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[var(--ink-faint)]">
          <QrCode className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Noch keine Seriennummern</p>
          <p className="text-xs mt-1">Erfassen Sie Seriennummern der verbauten Komponenten</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-3"
            >
              {editId === entry.id ? (
                <div className="space-y-2">
                  <input
                    className="w-full px-2 py-1 rounded border border-[var(--accent)] text-sm bg-[var(--bg)] text-[var(--ink)] font-mono"
                    value={editSerial}
                    onChange={(e) => setEditSerial(e.target.value)}
                  />
                  <input
                    className="w-full px-2 py-1 rounded border border-[var(--line)] text-sm bg-[var(--bg)] text-[var(--ink)]"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    placeholder="Position"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSave(entry.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--ok)] text-white"
                    >
                      <Check className="w-3 h-3" /> Speichern
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--line)] text-[var(--ink)]"
                    >
                      <X className="w-3 h-3" /> Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {entry.projectComponent ? (
                    <Package className="w-5 h-5 text-[var(--accent)] shrink-0" />
                  ) : (
                    <QrCode className="w-5 h-5 text-[var(--ink-faint)] shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-sm font-semibold text-[var(--ink)]">
                      {entry.serialNumber}
                    </div>
                    {entry.position && (
                      <div className="text-xs text-[var(--ink-soft)]">{entry.position}</div>
                    )}
                    {entry.projectComponent && (
                      <div className="text-xs text-[var(--accent)] mt-0.5">
                        {getComponentLabel(entry.projectComponent)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(entry)}
                      className="p-1.5 rounded text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--line)] transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      disabled={isPending}
                      className="p-1.5 rounded text-[var(--ink-faint)] hover:text-[var(--danger)] hover:bg-[var(--line)] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
