import { notFound } from 'next/navigation'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { ConstructionView } from '@/features/projects/construction-view'

export const metadata = { title: 'Baustellenmodus' }

interface PageProps { params: Promise<{ id: string }> }

export default async function BaustellePage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) notFound()

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      roofAreas: {
        include: {
          placements: {
            include: { stringAssignment: { include: { stringPlan: true } } },
          },
        },
      },
      checklists: {
        include: {
          template: true,
          items: true,
        },
      },
      defects: {
        where: { status: { not: 'RESOLVED' } },
        orderBy: { priority: 'desc' },
      },
    },
  })

  if (!project) notFound()

  return <ConstructionView project={project} />
}
