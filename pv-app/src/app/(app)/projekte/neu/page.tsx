import { NewProjectForm } from '@/features/projects/new-project-form'

export const metadata = { title: 'Neues Projekt' }

export default function NeueProjektPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[var(--ink)]">Neues Projekt anlegen</h1>
        <p className="text-sm text-[var(--ink-soft)] mt-0.5">
          Geben Sie die Basisdaten des PV-Projekts ein.
        </p>
      </div>
      <NewProjectForm />
    </div>
  )
}
