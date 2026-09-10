'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/database/client'
import { getSession } from '@/lib/auth/session'

export async function addProjectMember(projectId: string, userId: string, role: string) {
  await getSession()

  await prisma.projectMember.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, role },
    update: { role },
  })

  revalidatePath(`/projekte/${projectId}/mitglieder`)
}

export async function removeProjectMember(projectId: string, userId: string) {
  await getSession()

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId } },
  })

  revalidatePath(`/projekte/${projectId}/mitglieder`)
}

export async function updateMemberRole(projectId: string, userId: string, role: string) {
  await getSession()

  await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId } },
    data: { role },
  })

  revalidatePath(`/projekte/${projectId}/mitglieder`)
}
