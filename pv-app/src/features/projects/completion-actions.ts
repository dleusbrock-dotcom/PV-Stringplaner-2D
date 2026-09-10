'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/database/client'
import { getSession } from '@/lib/auth/session'

export async function completeProject(projectId: string) {
  const session = await getSession()

  // Check: no open critical defects
  const criticalDefects = await prisma.defect.count({
    where: {
      projectId,
      status: { notIn: ['RESOLVED', 'ACCEPTED'] },
      priority: 'CRITICAL',
    },
  })

  if (criticalDefects > 0) {
    throw new Error(`${criticalDefects} kritische Mängel sind noch offen.`)
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      lockedAt: new Date(),
      lockedById: session.user.id,
    },
  })

  await prisma.auditLog.create({
    data: {
      projectId,
      userId: session.user.id,
      entity: 'Project',
      entityId: projectId,
      action: 'complete',
      changes: { status: 'COMPLETED' },
    },
  })

  revalidatePath(`/projekte/${projectId}`)
  revalidatePath(`/projekte/${projectId}/abschluss`)
}

export async function addSignature(
  projectId: string,
  signerName: string,
  signerRole: string,
  userId: string
) {
  await getSession()

  await prisma.signature.create({
    data: {
      projectId,
      userId,
      signerName,
      signerRole,
      signatureData: `confirmed:${signerName}:${Date.now()}`,
    },
  })

  revalidatePath(`/projekte/${projectId}/abschluss`)
}
