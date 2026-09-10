'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/database/client'
import { getSession } from '@/lib/auth/session'
import type { ChecklistItemStatus } from '@prisma/client'

export async function initChecklistsForProject(projectId: string) {
  const session = await getSession()

  const templates = await prisma.checklistTemplate.findMany({
    include: { items: { orderBy: { sortOrder: 'asc' } } },
    orderBy: { sortOrder: 'asc' },
  })

  for (const template of templates) {
    const existing = await prisma.checklist.findFirst({
      where: { projectId, templateId: template.id },
    })
    if (existing) continue

    await prisma.checklist.create({
      data: {
        projectId,
        templateId: template.id,
        items: {
          create: template.items.map((item) => ({
            templateItemId: item.id,
            text: item.text,
            status: 'OPEN' as ChecklistItemStatus,
          })),
        },
      },
    })
  }

  await prisma.auditLog.create({
    data: {
      projectId,
      userId: session.user.id,
      entity: 'Checklist',
      entityId: projectId,
      action: 'init',
      changes: { templatesCount: templates.length },
    },
  })

  revalidatePath(`/projekte/${projectId}/pruefungen`)
}

export async function updateChecklistItemStatus(
  itemId: string,
  status: ChecklistItemStatus,
  projectId: string
) {
  const session = await getSession()

  await prisma.checklistItem.update({
    where: { id: itemId },
    data: {
      status,
      completedById: status === 'DONE' ? session.user.id : null,
      completedAt: status === 'DONE' ? new Date() : null,
    },
  })

  revalidatePath(`/projekte/${projectId}/pruefungen`)
}
