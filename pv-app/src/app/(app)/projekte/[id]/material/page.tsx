import { notFound } from 'next/navigation'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { MaterialView } from '@/features/material/material-view'

export const metadata = { title: 'Material' }

interface PageProps { params: Promise<{ id: string }> }

export default async function MaterialPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) notFound()

  const materials = await prisma.projectMaterial.findMany({
    where: { projectId: id },
    include: { materialItem: true },
    orderBy: { materialItem: { name: 'asc' } },
  })

  return <MaterialView materials={materials} projectId={id} />
}
