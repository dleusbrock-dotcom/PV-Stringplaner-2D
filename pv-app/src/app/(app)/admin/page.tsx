import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { redirect } from 'next/navigation'
import { AdminView } from '@/features/admin/admin-view'

export const metadata = { title: 'Administration' }
export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  // Only admins
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { role: true },
  })
  if (user?.role?.name !== 'Admin') redirect('/projekte')

  const [users, stats] = await Promise.all([
    prisma.user.findMany({
      include: {
        role: { select: { name: true } },
        _count: { select: { createdProjects: true, photos: true } },
      },
      orderBy: { createdAt: 'asc' },
    }),
    Promise.all([
      prisma.project.count(),
      prisma.user.count(),
      prisma.photo.count(),
      prisma.defect.count(),
    ]).then(([totalProjects, totalUsers, totalPhotos, totalDefects]) => ({
      totalProjects, totalUsers, totalPhotos, totalDefects,
    })),
  ])

  return <AdminView users={users} stats={stats} />
}
