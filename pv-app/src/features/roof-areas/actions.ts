'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/database/client'
import { getSession } from '@/lib/auth/session'
import { z } from 'zod'

const addRoofAreaSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1).max(50),
  orientation: z.number().min(0).max(360).optional(),
  tiltAngle: z.number().min(0).max(90).optional(),
  gridRows: z.number().min(1).max(50).default(10),
  gridCols: z.number().min(1).max(50).default(10),
})

export async function addRoofArea(input: z.infer<typeof addRoofAreaSchema>) {
  await getSession()
  const data = addRoofAreaSchema.parse(input)

  const maxSort = await prisma.roofArea.findFirst({
    where: { projectId: data.projectId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  })

  const roofArea = await prisma.roofArea.create({
    data: {
      projectId: data.projectId,
      name: data.name,
      orientation: data.orientation ?? null,
      tiltAngle: data.tiltAngle ?? null,
      gridRows: data.gridRows,
      gridCols: data.gridCols,
      sortOrder: (maxSort?.sortOrder ?? 0) + 1,
    },
  })

  await prisma.project.update({
    where: { id: data.projectId },
    data: { updatedAt: new Date() },
  })

  revalidatePath(`/projekte/${data.projectId}/planung`)
  return roofArea
}

export async function placeModule(roofAreaId: string, col: number, row: number) {
  await getSession()

  const existing = await prisma.modulePlacement.findUnique({
    where: {
      roofAreaId_col_row_isPlan: { roofAreaId, col, row, isPlan: true },
    },
  })
  if (existing) return existing

  const placement = await prisma.modulePlacement.create({
    data: { roofAreaId, col, row, isPlan: true },
  })

  // Update project updatedAt
  const roofArea = await prisma.roofArea.findUnique({ where: { id: roofAreaId } })
  if (roofArea) {
    await prisma.project.update({
      where: { id: roofArea.projectId },
      data: { updatedAt: new Date() },
    })
    revalidatePath(`/projekte/${roofArea.projectId}/planung`)
  }

  return placement
}

export async function removeModule(placementId: string) {
  await getSession()

  const placement = await prisma.modulePlacement.findUnique({
    where: { id: placementId },
    include: { roofArea: true },
  })
  if (!placement) return

  // Remove string assignment first
  await prisma.stringModuleAssignment.deleteMany({
    where: { modulePlacementId: placementId },
  })

  await prisma.modulePlacement.delete({ where: { id: placementId } })

  await prisma.project.update({
    where: { id: placement.roofArea.projectId },
    data: { updatedAt: new Date() },
  })

  revalidatePath(`/projekte/${placement.roofArea.projectId}/planung`)
}
