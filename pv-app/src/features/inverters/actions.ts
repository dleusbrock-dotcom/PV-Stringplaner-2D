'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/database/client'
import { getSession } from '@/lib/auth/session'

export async function addInverter(projectId: string, label: string, mpptCount: number) {
  await getSession()

  const inverter = await prisma.inverterInstance.create({
    data: {
      projectId,
      label,
      mpptInputs: {
        create: Array.from({ length: mpptCount }, (_, i) => ({
          inputNumber: i + 1,
          label: `MPPT ${i + 1}`,
        })),
      },
    },
    include: { mpptInputs: true },
  })

  revalidatePath(`/projekte/${projectId}/planung`)
  return inverter
}

export async function assignStringToMppt(
  mpptInputId: string,
  stringPlanId: string,
  projectId: string
) {
  await getSession()

  await prisma.stringPlan.update({
    where: { id: stringPlanId },
    data: { mpptInputId },
  })

  revalidatePath(`/projekte/${projectId}/planung`)
}
