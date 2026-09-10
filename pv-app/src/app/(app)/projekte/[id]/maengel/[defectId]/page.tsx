import { notFound } from 'next/navigation'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { DefectDetail } from '@/features/defects/defect-detail'

interface PageProps { params: Promise<{ id: string; defectId: string }> }

export default async function DefectDetailPage({ params }: PageProps) {
  const { id, defectId } = await params
  const session = await auth()
  if (!session?.user) notFound()

  const defect = await prisma.defect.findFirst({
    where: { id: defectId, projectId: id },
    include: {
      createdBy: { select: { name: true, email: true } },
      resolvedBy: { select: { name: true } },
      comments: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      _count: { select: { photos: true } },
    },
  })

  if (!defect) notFound()

  return <DefectDetail defect={defect} projectId={id} />
}
