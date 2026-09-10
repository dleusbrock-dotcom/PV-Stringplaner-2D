'use client'

import { useState } from 'react'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, User, MapPin, ChevronRight, ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createProject } from './actions'
import { newProjectSchema, type NewProjectInput } from './schemas'
import { toast } from '@/components/ui/toaster'

const STEPS = [
  { id: 'project', label: 'Projekt', icon: Building2 },
  { id: 'customer', label: 'Kunde', icon: User },
  { id: 'site', label: 'Standort', icon: MapPin },
]

export function NewProjectForm() {
  const [step, setStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<NewProjectInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(newProjectSchema) as Resolver<NewProjectInput>,
    defaultValues: { country: 'DE' },
  })

  const stepFields: Record<number, (keyof NewProjectInput)[]> = {
    0: ['name'],
    1: ['customerName'],
    2: ['street', 'postalCode', 'city'],
  }

  const nextStep = async () => {
    const valid = await trigger(stepFields[step])
    if (valid) setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const prevStep = () => setStep((s) => Math.max(s - 1, 0))

  const onSubmit = async (data: NewProjectInput) => {
    setIsSubmitting(true)
    try {
      await createProject(data)
    } catch (error) {
      toast({
        title: 'Fehler beim Anlegen',
        description: 'Das Projekt konnte nicht erstellt werden.',
        variant: 'error',
      })
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* Step Indicator */}
      <div className="flex items-center gap-0 mb-6">
        {STEPS.map((s, i) => {
          const Icon = s.icon
          const isActive = i === step
          const isDone = i < step
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-[var(--accent)] text-white'
                    : isDone
                    ? 'bg-[var(--ok-soft)] text-[var(--ok)]'
                    : 'text-[var(--ink-faint)]'
                }`}
              >
                <Icon className="w-4 h-4" />
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${isDone ? 'bg-[var(--ok)]' : 'bg-[var(--line)]'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <form onSubmit={handleSubmit(onSubmit as any)}>
        {/* Step 0: Project */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <Building2 className="w-5 h-5 text-[var(--accent)]" />
              <CardTitle>Projektdaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Projektname"
                placeholder="z.B. Einfamilienhaus Musterstraße"
                required
                error={errors.name?.message}
                {...register('name')}
              />
              <div>
                <label className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide block mb-1">
                  Beschreibung
                </label>
                <textarea
                  className="w-full rounded-[var(--radius)] border border-[var(--line-strong)] px-3 py-2 text-sm bg-[var(--panel)] text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
                  rows={3}
                  placeholder="Optionale Projektbeschreibung..."
                  {...register('description')}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Customer */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <User className="w-5 h-5 text-[var(--accent)]" />
              <CardTitle>Kundendaten</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Kundenname"
                placeholder="Max Mustermann"
                required
                error={errors.customerName?.message}
                {...register('customerName')}
              />
              <Input
                label="Firma (optional)"
                placeholder="Muster GmbH"
                {...register('customerCompany')}
              />
              <Input
                label="E-Mail (optional)"
                type="email"
                placeholder="kunde@beispiel.de"
                error={errors.customerEmail?.message}
                {...register('customerEmail')}
              />
              <Input
                label="Telefon (optional)"
                type="tel"
                placeholder="+49 123 456789"
                {...register('customerPhone')}
              />
              <div className="border-t border-[var(--line)] pt-4">
                <p className="text-xs font-semibold text-[var(--ink-soft)] uppercase tracking-wide mb-3">
                  Ansprechpartner (optional)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Vorname"
                    {...register('contactFirstName')}
                  />
                  <Input
                    label="Nachname"
                    {...register('contactLastName')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Site */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <MapPin className="w-5 h-5 text-[var(--accent)]" />
              <CardTitle>Standortadresse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <Input
                    label="Straße"
                    required
                    error={errors.street?.message}
                    {...register('street')}
                  />
                </div>
                <Input
                  label="Nr."
                  placeholder="12a"
                  {...register('houseNumber')}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Input
                  label="PLZ"
                  required
                  error={errors.postalCode?.message}
                  {...register('postalCode')}
                />
                <div className="col-span-2">
                  <Input
                    label="Stadt"
                    required
                    error={errors.city?.message}
                    {...register('city')}
                  />
                </div>
              </div>
              <Input
                label="Land"
                defaultValue="DE"
                {...register('country')}
              />
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-4">
          {step > 0 ? (
            <Button type="button" variant="secondary" onClick={prevStep}>
              <ChevronLeft className="w-4 h-4" />
              Zurück
            </Button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <Button type="button" variant="primary" onClick={nextStep}>
              Weiter
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button type="submit" variant="primary" loading={isSubmitting}>
              Projekt anlegen
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
