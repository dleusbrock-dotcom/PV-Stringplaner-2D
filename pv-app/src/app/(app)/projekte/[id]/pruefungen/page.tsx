import { notFound } from 'next/navigation'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { ChecklistView } from '@/features/checklists/checklist-view'

export const metadata = { title: 'Prüfungen' }

interface PageProps { params: Promise<{ id: string }> }

export default async function PruefungenPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) notFound()

  const checklists = await prisma.checklist.findMany({
    where: { projectId: id },
    include: {
      template: true,
      items: {
        include: { completedBy: { select: { name: true } } },
        orderBy: { templateItemId: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  return <ChecklistView checklists={checklists} projectId={id} />
}
