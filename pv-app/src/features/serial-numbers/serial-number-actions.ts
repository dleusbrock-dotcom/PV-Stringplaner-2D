'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/database/client'
import { getSession } from '@/lib/auth/session'

export async function addSerialNumber(formData: FormData) {
  const session = await getSession()
  const projectId = formData.get('projectId') as string
  const projectComponentId = formData.get('projectComponentId') as string | null
  const serialNumber = formData.get('serialNumber') as string
  const position = formData.get('position') as string | null

  if (!projectId || !serialNumber?.trim()) throw new Error('Seriennummer erforderlich')

  await prisma.serialNumber.create({
    data: {
      projectId,
      projectComponentId: projectComponentId || null,
      serialNumber: serialNumber.trim(),
      position: position?.trim() || null,
      recordedById: session.user.id,
    },
  })

  revalidatePath(`/projekte/${projectId}/seriennummern`)
}

export async function deleteSerialNumber(id: string, projectId: string) {
  await getSession()

  await prisma.serialNumber.delete({ where: { id } })
  revalidatePath(`/projekte/${projectId}/seriennummern`)
}

export async function updateSerialNumber(
  id: string,
  projectId: string,
  data: { serialNumber?: string; position?: string }
) {
  await getSession()

  await prisma.serialNumber.update({
    where: { id },
    data: {
      serialNumber: data.serialNumber?.trim(),
      position: data.position?.trim() || null,
    },
  })

  revalidatePath(`/projekte/${projectId}/seriennummern`)
}
