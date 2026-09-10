import { notFound } from 'next/navigation'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { MemberView } from '@/features/members/member-view'

export const metadata = { title: 'Projektmitglieder' }

interface PageProps { params: Promise<{ id: string }> }

export default async function MitgliederPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) notFound()

  const [members, allUsers] = await Promise.all([
    prisma.projectMember.findMany({
      where: { projectId: id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { role: 'asc' },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <MemberView
      projectId={id}
      members={members}
      availableUsers={allUsers}
      currentUserId={session.user.id}
    />
  )
}
