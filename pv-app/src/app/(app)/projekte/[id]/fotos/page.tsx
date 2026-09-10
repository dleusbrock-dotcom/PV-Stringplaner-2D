import { notFound } from 'next/navigation'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { PhotoView } from '@/features/photos/photo-view'

export const metadata = { title: 'Fotos' }

interface PageProps { params: Promise<{ id: string }> }

export default async function FotosPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) notFound()

  const photos = await prisma.photo.findMany({
    where: { projectId: id },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return <PhotoView photos={photos} projectId={id} userId={session.user.id!} />
}
