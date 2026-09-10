'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { addInverter } from './actions'
import { toast } from '@/components/ui/toaster'

const schema = z.object({
  label: z.string().min(1, 'Bezeichnung erforderlich').max(50),
  mpptCount: z.coerce.number().min(1).max(20).default(2),
})

type FormData = z.infer<typeof schema>

export function AddInverterDialog({
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
    defaultValues: { mpptCount: 2 },
  })

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      await addInverter(projectId, data.label, data.mpptCount)
      toast({ title: 'Wechselrichter angelegt', variant: 'success' })
      onClose()
    } catch {
      toast({ title: 'Fehler', description: 'Wechselrichter konnte nicht angelegt werden.', variant: 'error' })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm bg-[var(--panel)] rounded-[var(--radius)] shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-[var(--line)]">
          <h2 className="font-bold text-[var(--ink)]">Wechselrichter anlegen</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-[var(--panel-2)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <form onSubmit={handleSubmit(onSubmit as any)} className="p-4 space-y-4">
          <Input
            label="Bezeichnung"
            placeholder="z.B. WR-1 oder SolarEdge SE10K"
            required
            error={errors.label?.message}
            {...register('label')}
          />
          <Input
            label="Anzahl MPPT-Eingänge"
            type="number"
            required
            error={errors.mpptCount?.message}
            {...register('mpptCount')}
          />
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Abbrechen</Button>
            <Button type="submit" variant="primary" loading={isSubmitting} className="flex-1">Anlegen</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
