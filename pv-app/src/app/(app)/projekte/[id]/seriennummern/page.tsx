import { notFound } from 'next/navigation'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { SerialNumberView } from '@/features/serial-numbers/serial-number-view'

export const metadata = { title: 'Seriennummern' }

interface PageProps { params: Promise<{ id: string }> }

export default async function SeriennummernPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) notFound()

  const [entries, components] = await Promise.all([
    prisma.serialNumber.findMany({
      where: { projectId: id },
      include: {
        projectComponent: true,
      },
      orderBy: { recordedAt: 'desc' },
    }),
    prisma.projectComponent.findMany({
      where: { projectId: id },
      orderBy: { id: 'asc' },
    }),
  ])

  // Map to include a stub recordedBy (since schema lacks the User relation on SerialNumber)
  const entriesWithUser = entries.map((e) => ({ ...e, recordedBy: null }))

  return (
    <SerialNumberView
      projectId={id}
      entries={entriesWithUser}
      components={components}
    />
  )
}
