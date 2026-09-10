'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/database/client'
import { getSession } from '@/lib/auth/session'

export async function createString(projectId: string, name: string, color: string) {
  await getSession()

  const maxSort = await prisma.stringPlan.findFirst({
    where: { projectId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })

  const stringPlan = await prisma.stringPlan.create({
    data: {
      projectId,
      name,
      color,
      sortOrder: (maxSort?.sortOrder ?? 0) + 1,
    },
  })

  revalidatePath(`/projekte/${projectId}/planung`)
  return stringPlan
}

export async function deleteString(stringPlanId: string) {
  await getSession()

  const sp = await prisma.stringPlan.findUnique({
    where: { id: stringPlanId },
    select: { projectId: true },
  })
  if (!sp) throw new Error('String nicht gefunden')

  await prisma.stringModuleAssignment.deleteMany({
    where: { stringPlanId },
  })

  await prisma.stringPlan.delete({ where: { id: stringPlanId } })

  revalidatePath(`/projekte/${sp.projectId}/planung`)
}

export async function assignModuleToString(
  stringPlanId: string,
  modulePlacementId: string
) {
  await getSession()

  // Remove existing assignment for this module
  await prisma.stringModuleAssignment.deleteMany({
    where: { modulePlacementId },
  })

  // Get next sort order
  const maxSort = await prisma.stringModuleAssignment.findFirst({
    where: { stringPlanId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })

  const sortOrder = (maxSort?.sortOrder ?? -1) + 1

  // Get string info for label
  const sp = await prisma.stringPlan.findUnique({
    where: { id: stringPlanId },
    select: { name: true, projectId: true },
  })
  if (!sp) throw new Error('String nicht gefunden')

  const label = `S${sp.name.replace(/\D/g, '')}-M${String(sortOrder + 1).padStart(2, '0')}`

  const assignment = await prisma.stringModuleAssignment.create({
    data: {
      stringPlanId,
      modulePlacementId,
      sortOrder,
      label,
    },
  })

  revalidatePath(`/projekte/${sp.projectId}/planung`)
  return assignment
}

export async function removeModuleFromString(modulePlacementId: string) {
  await getSession()

  const assignment = await prisma.stringModuleAssignment.findUnique({
    where: { modulePlacementId },
    include: {
      stringPlan: { select: { projectId: true } },
    },
  })
  if (!assignment) return

  await prisma.stringModuleAssignment.delete({ where: { modulePlacementId } })

  revalidatePath(`/projekte/${assignment.stringPlan.projectId}/planung`)
}
