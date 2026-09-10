'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import { createDefect } from '@/features/defects/defect-actions'
import { use } from 'react'

interface PageProps { params: Promise<{ id: string }> }

export default function NeuenMangelPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [priority, setPriority] = useState<string>('MEDIUM')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set('projectId', id)
    formData.set('priority', priority)

    startTransition(async () => {
      try {
        const defect = await createDefect(formData)
        toast({ title: 'Mangel erfasst', variant: 'success' })
        router.push(`/projekte/${id}/maengel/${defect.id}`)
      } catch {
        toast({ title: 'Fehler beim Speichern', variant: 'error' })
      }
    })
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/projekte/${id}/maengel`}>
          <Button variant="secondary" size="icon" className="compact">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <h2 className="text-lg font-bold text-[var(--ink)]">Mangel erfassen</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="title" label="Bezeichnung" required />

        <div>
          <label className="block text-sm font-semibold text-[var(--ink)] mb-1.5">
            Priorität <span className="text-[var(--danger)]">*</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'LOW', label: 'Niedrig', color: 'var(--ink-soft)' },
              { id: 'MEDIUM', label: 'Mittel', color: 'var(--accent)' },
              { id: 'HIGH', label: 'Hoch', color: 'var(--warning)' },
              { id: 'CRITICAL', label: 'Kritisch', color: 'var(--danger)' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriority(p.id)}
                className={`py-2 px-3 rounded-[var(--radius)] border text-sm font-semibold transition-all ${
                  priority === p.id
                    ? 'border-current text-[var(--bg)]'
                    : 'border-[var(--line)] text-[var(--ink-soft)] hover:border-current'
                }`}
                style={priority === p.id ? { backgroundColor: p.color, borderColor: p.color } : { color: p.color }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[var(--ink)] mb-1.5">Beschreibung</label>
          <textarea
            name="description"
            rows={4}
            className="w-full px-3 py-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
            placeholder="Detaillierte Beschreibung des Mangels …"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input name="category" label="Kategorie" placeholder="z.B. Dach, DC, AC" />
          <Input name="location" label="Ort / Position" placeholder="z.B. Modul A3" />
        </div>

        <Button type="submit" variant="primary" className="w-full">
          Mangel speichern
        </Button>
      </form>
    </div>
  )
}
