'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/database/client'
import { getSession } from '@/lib/auth/session'
import { z } from 'zod'

const materialSchema = z.object({
  projectId: z.string(),
  name: z.string().min(1),
  unit: z.string().min(1),
  quantityPlanned: z.coerce.number().min(0),
  quantityActual: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
})

export async function addMaterialItem(formData: FormData) {
  await getSession()
  const data = materialSchema.parse(Object.fromEntries(formData))

  const item = await prisma.materialItem.create({
    data: {
      name: data.name,
      unit: data.unit,
    },
  })

  await prisma.projectMaterial.create({
    data: {
      projectId: data.projectId,
      materialItemId: item.id,
      plannedQty: data.quantityPlanned,
      actualQty: data.quantityActual ?? 0,
      notes: data.notes ?? null,
    },
  })

  revalidatePath(`/projekte/${data.projectId}/material`)
}

export async function updateMaterialActual(
  projectMaterialId: string,
  quantityActual: number,
  projectId: string
) {
  await getSession()

  await prisma.projectMaterial.update({
    where: { id: projectMaterialId },
    data: { actualQty: quantityActual },
  })

  revalidatePath(`/projekte/${projectId}/material`)
}
