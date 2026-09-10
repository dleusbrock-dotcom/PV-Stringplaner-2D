import { notFound } from 'next/navigation'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { DocumentView } from '@/features/documents/document-view'

export const metadata = { title: 'Dokumente' }

interface PageProps { params: Promise<{ id: string }> }

export default async function DokumentePage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) notFound()

  const documents = await prisma.projectDocument.findMany({
    where: { projectId: id },
    orderBy: { generatedAt: 'desc' },
  })

  return <DocumentView documents={documents} projectId={id} />
}
