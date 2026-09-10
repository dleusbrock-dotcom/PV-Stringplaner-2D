import { notFound } from 'next/navigation'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { ProjectNav } from '@/features/projects/project-nav'

interface ProjectLayoutProps {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) notFound()

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      customer: true,
      site: true,
      _count: {
        select: {
          defects: { where: { status: 'OPEN', priority: 'CRITICAL' } },
        },
      },
    },
  })

  if (!project) notFound()

  return (
    <div className="flex flex-col h-full">
      <ProjectNav project={project} />
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
