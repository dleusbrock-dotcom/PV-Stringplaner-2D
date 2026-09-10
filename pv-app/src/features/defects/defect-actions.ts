'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/database/client'
import { getSession } from '@/lib/auth/session'
import { z } from 'zod'
import type { DefectPriority, DefectStatus } from '@prisma/client'

const createDefectSchema = z.object({
  projectId: z.string(),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  category: z.string().optional(),
  location: z.string().optional(),
})

export async function createDefect(formData: FormData) {
  const session = await getSession()
  const data = createDefectSchema.parse(Object.fromEntries(formData))

  const defect = await prisma.defect.create({
    data: {
      projectId: data.projectId,
      createdById: session.user.id,
      title: data.title,
      description: data.description ?? null,
      priority: data.priority as DefectPriority,
      status: 'OPEN',
      category: data.category ?? null,
      location: data.location ?? null,
    },
  })

  await prisma.auditLog.create({
    data: {
      projectId: data.projectId,
      userId: session.user.id,
      entity: 'Defect',
      entityId: defect.id,
      action: 'create',
      changes: { title: data.title, priority: data.priority },
    },
  })

  revalidatePath(`/projekte/${data.projectId}/maengel`)
  return defect
}

export async function updateDefectStatus(
  defectId: string,
  status: DefectStatus,
  projectId: string
) {
  const session = await getSession()

  await prisma.defect.update({
    where: { id: defectId },
    data: {
      status,
      resolvedAt: status === 'RESOLVED' || status === 'ACCEPTED' ? new Date() : null,
      resolvedById: status === 'RESOLVED' || status === 'ACCEPTED' ? session.user.id : null,
    },
  })

  revalidatePath(`/projekte/${projectId}/maengel`)
  revalidatePath(`/projekte/${projectId}/maengel/${defectId}`)
}

export async function addDefectComment(defectId: string, text: string, projectId: string) {
  const session = await getSession()

  await prisma.defectComment.create({
    data: { defectId, userId: session.user.id, text },
  })

  revalidatePath(`/projekte/${projectId}/maengel/${defectId}`)
}
