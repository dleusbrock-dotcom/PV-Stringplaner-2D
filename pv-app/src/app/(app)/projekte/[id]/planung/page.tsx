import { notFound } from 'next/navigation'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { PlanningView } from '@/features/roof-areas/planning-view'

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata = { title: 'Planung' }

export default async function PlanningPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) notFound()

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      roofAreas: {
        include: {
          obstacles: true,
          placements: {
            include: {
              stringAssignment: {
                include: { stringPlan: true },
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
      inverters: {
        include: {
          mpptInputs: {
            include: {
              stringPlans: {
                include: {
                  modules: {
                    include: {
                      modulePlacement: {
                        include: { roofArea: true },
                      },
                    },
                    orderBy: { sortOrder: 'asc' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!project) notFound()

  return <PlanningView project={project} />
}
