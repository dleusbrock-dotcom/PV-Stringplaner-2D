import { Suspense } from 'react'
import { Plus, Search, Filter } from 'lucide-react'
import Link from 'next/link'
import { auth } from '@/lib/auth/config'
import { prisma } from '@/lib/database/client'
import { Button, buttonVariants } from '@/components/ui/button'
import { ProjectCard } from '@/features/projects/project-card'
import { ProjectListSkeleton } from '@/features/projects/project-list-skeleton'

export const metadata = {
  title: 'Projekte',
}

async function ProjectList() {
  const session = await auth()
  if (!session?.user?.id) return null

  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { createdById: session.user.id },
        { members: { some: { userId: session.user.id } } },
      ],
      status: { not: 'ARCHIVED' },
    },
    include: {
      customer: true,
      site: true,
      _count: {
        select: {
          roofAreas: true,
          defects: { where: { status: 'OPEN', priority: 'CRITICAL' } },
          photos: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (projects.length === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="w-16 h-16 rounded-full bg-[var(--accent-soft)] flex items-center justify-center mx-auto mb-4">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9,22 9,12 15,12 15,22"/>
          </svg>
        </div>
        <h3 className="text-lg font-bold text-[var(--ink)] mb-2">Noch keine Projekte</h3>
        <p className="text-sm text-[var(--ink-soft)] mb-6 max-w-sm mx-auto">
          Legen Sie Ihr erstes PV-Projekt an, um mit der Planung und Dokumentation zu beginnen.
        </p>
        <Link href="/projekte/neu" className={buttonVariants({ variant: 'primary' })}>
          <Plus className="w-4 h-4" />
          Erstes Projekt anlegen
        </Link>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}

export default function ProjektePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[var(--ink)]">Projekte</h1>
          <p className="text-sm text-[var(--ink-soft)] mt-0.5">
            Alle Ihre PV-Projekte im Überblick
          </p>
        </div>
        <Link href="/projekte/neu" className={buttonVariants({ variant: 'primary' })}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:block">Neues Projekt</span>
          <span className="sm:hidden">Neu</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] text-xs font-semibold whitespace-nowrap">
          Alle
        </button>
        {['Entwurf', 'Planung', 'Baustelle', 'Abnahme', 'Abgeschlossen'].map((s) => (
          <button
            key={s}
            className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-[var(--line)] text-[var(--ink-soft)] text-xs font-medium whitespace-nowrap hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Project Grid */}
      <Suspense fallback={<ProjectListSkeleton />}>
        <ProjectList />
      </Suspense>
    </div>
  )
}
