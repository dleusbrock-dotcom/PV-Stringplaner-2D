'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { assignStringToMppt } from './actions'
import { toast } from '@/components/ui/toaster'

interface AssignStringToMpptSelectProps {
  mpptId: string
  strings: Array<{ id: string; name: string; color: string }>
  projectId: string
}

export function AssignStringToMpptSelect({ mpptId, strings, projectId }: AssignStringToMpptSelectProps) {
  const [isAssigning, setIsAssigning] = useState(false)
  const [selectedId, setSelectedId] = useState('')

  const handleAssign = async () => {
    if (!selectedId) return
    setIsAssigning(true)
    try {
      await assignStringToMppt(mpptId, selectedId, projectId)
      setSelectedId('')
      toast({ title: 'String zugeordnet', variant: 'success' })
    } catch {
      toast({ title: 'Fehler', description: 'Zuordnung fehlgeschlagen', variant: 'error' })
    }
    setIsAssigning(false)
  }

  return (
    <div className="flex gap-1">
      <select
        value={selectedId}
        onChange={(e) => setSelectedId(e.target.value)}
        className="flex-1 h-8 text-xs px-2 rounded border border-[var(--line)] bg-[var(--panel)] text-[var(--ink)]"
      >
        <option value="">String auswählen…</option>
        {strings.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button
        onClick={handleAssign}
        disabled={!selectedId || isAssigning}
        className="h-8 w-8 flex items-center justify-center rounded border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent-soft)] disabled:opacity-40 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
