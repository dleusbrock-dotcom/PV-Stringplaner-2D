import { prisma } from '@/lib/database/client'
import { LibraryView } from '@/features/library/library-view'

export const metadata = { title: 'Bauteilbibliothek' }
export const dynamic = 'force-dynamic'

export default async function BibliothekPage() {
  const items = await prisma.componentLibraryItem.findMany({
    orderBy: [{ category: 'asc' }, { manufacturer: 'asc' }, { model: 'asc' }],
  })

  return <LibraryView items={items} />
}
