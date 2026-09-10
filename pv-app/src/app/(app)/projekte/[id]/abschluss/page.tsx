import { notFound } from 'next/navigation'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { CompletionView } from '@/features/projects/completion-view'

export const metadata = { title: 'Projektabschluss' }

interface PageProps { params: Promise<{ id: string }> }

export default async function AbschlussPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) notFound()

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      roofAreas: {
        include: {
          _count: { select: { placements: true } },
        },
      },
      checklists: {
        include: {
          template: true,
          items: { select: { status: true } },
        },
      },
      defects: {
        where: { status: { not: 'RESOLVED' }, priority: 'CRITICAL' },
      },
      signatures: {
        orderBy: { confirmedAt: 'desc' },
      },
      _count: {
        select: { photos: true, documents: true },
      },
    },
  })

  if (!project) notFound()

  return <CompletionView project={project} userId={session.user.id!} />
}
