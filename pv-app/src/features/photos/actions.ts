'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/database/client'
import { getSession } from '@/lib/auth/session'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const STORAGE_DIR = process.env.STORAGE_LOCAL_PATH ?? join(process.cwd(), 'storage')

export async function uploadPhoto(formData: FormData) {
  const session = await getSession()

  const file = formData.get('file') as File
  const projectId = formData.get('projectId') as string
  const category = formData.get('category') as string
  const caption = formData.get('caption') as string | null

  if (!file || !projectId) throw new Error('Fehlende Parameter')

  // Validate file type
  if (!file.type.startsWith('image/')) throw new Error('Nur Bilder erlaubt')
  if (file.size > 20 * 1024 * 1024) throw new Error('Datei zu groß (max. 20 MB)')

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Save locally
  const dir = join(STORAGE_DIR, 'photos', projectId)
  await mkdir(dir, { recursive: true })

  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const storagePath = join(dir, filename)
  await writeFile(storagePath, buffer)

  const photo = await prisma.photo.create({
    data: {
      projectId,
      userId: session.user.id,
      filename: file.name,
      storagePath: `/storage/photos/${projectId}/${filename}`,
      mimeType: file.type,
      sizeBytes: file.size,
      category: category ?? 'other',
      caption: caption ?? null,
    },
  })

  revalidatePath(`/projekte/${projectId}/fotos`)
  return photo
}
