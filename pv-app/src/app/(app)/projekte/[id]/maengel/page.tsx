import { notFound } from 'next/navigation'
import { Plus } from 'lucide-react'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'
import { DefectList } from '@/features/defects/defect-list'
import { buttonVariants } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = { title: 'Mängel' }

interface PageProps { params: Promise<{ id: string }> }

export default async function MaengelPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) notFound()

  const defects = await prisma.defect.findMany({
    where: { projectId: id },
    include: {
      createdBy: { select: { name: true, email: true } },
      _count: { select: { photos: true, comments: true } },
    },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
  })

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-[var(--ink)]">Mängel & Abweichungen</h2>
          <p className="text-sm text-[var(--ink-soft)]">
            {defects.filter((d) => d.status === 'OPEN').length} offen,{' '}
            {defects.filter((d) => d.priority === 'CRITICAL' && d.status === 'OPEN').length} kritisch
          </p>
        </div>
        <Link href={`/projekte/${id}/maengel/neu`} className={buttonVariants({ variant: 'primary' })}>
          <Plus className="w-4 h-4" />
          Mangel
        </Link>
      </div>

      <DefectList defects={defects} projectId={id} />
    </div>
  )
}
