'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addRoofArea } from './actions'
import { toast } from '@/components/ui/toaster'

const schema = z.object({
  name: z.string().min(1, 'Name erforderlich').max(50),
  orientation: z.coerce.number().min(0).max(360).optional(),
  tiltAngle: z.coerce.number().min(0).max(90).optional(),
  gridRows: z.coerce.number().min(1).max(50).default(8),
  gridCols: z.coerce.number().min(1).max(50).default(12),
})

type FormData = z.infer<typeof schema>

export function AddRoofAreaDialog({
  projectId,
  onClose,
}: {
  projectId: string
  onClose: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as Resolver<FormData>,
    defaultValues: { gridRows: 8, gridCols: 12 },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      await addRoofArea({ ...data, projectId })
      toast({ title: 'Dachfläche angelegt', variant: 'success' })
      onClose()
    } catch {
      toast({ title: 'Fehler', description: 'Dachfläche konnte nicht angelegt werden.', variant: 'error' })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md bg-[var(--panel)] rounded-[var(--radius)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--line)]">
          <h2 className="font-bold text-[var(--ink)]">Neue Dachfläche</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--panel-2)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="p-4 space-y-4">
          <Input
            label="Bezeichnung"
            placeholder="z.B. Süddach, Westseite"
            required
            error={errors.name?.message}
            {...register('name')}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Ausrichtung (°)"
              type="number"
              placeholder="180 = Süd"
              hint="0=N, 90=O, 180=S, 270=W"
              error={errors.orientation?.message}
              {...register('orientation')}
            />
            <Input
              label="Neigung (°)"
              type="number"
              placeholder="30"
              hint="0–90 Grad"
              error={errors.tiltAngle?.message}
              {...register('tiltAngle')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Rasterzeilen"
              type="number"
              required
              error={errors.gridRows?.message}
              {...register('gridRows')}
            />
            <Input
              label="Rasterspalten"
              type="number"
              required
              error={errors.gridCols?.message}
              {...register('gridCols')}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Abbrechen
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting} className="flex-1">
              Anlegen
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
