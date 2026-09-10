/**
 * Sync API – empfängt Offline-Queue-Operationen vom Client
 */
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/client'
import { auth } from '@/lib/auth/config'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    operation: string
    entity: string
    entityId: string
    projectId: string
    payload: Record<string, unknown>
  }

  try {
    body = await request.json() as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { operation, entity, entityId, projectId, payload } = body

  // Log sync operation for audit
  await prisma.syncOperation.create({
    data: {
      projectId,
      userId: session.user.id,
      operation,
      entity,
      entityId,
      payload: payload as never,
      status: 'SYNCED',
      syncedAt: new Date(),
    },
  }).catch(() => {/* non-critical, continue */})

  // Route to correct handler
  try {
    const result = await handleSyncOperation(operation, entity, entityId, payload, projectId, session.user.id)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

async function handleSyncOperation(
  operation: string,
  entity: string,
  entityId: string,
  payload: Record<string, unknown>,
  projectId: string,
  userId: string
): Promise<{ id: string }> {
  switch (`${entity}:${operation}`) {
    case 'checklist_item:update': {
      const item = await prisma.checklistItem.update({
        where: { id: entityId },
        data: {
          status: payload.status as never,
          comment: payload.comment as string | null,
          completedAt: payload.status === 'DONE' ? new Date() : null,
          completedById: payload.status === 'DONE' ? userId : null,
        },
      })
      return { id: item.id }
    }

    case 'defect_comment:create': {
      const comment = await prisma.defectComment.create({
        data: {
          defectId: payload.defectId as string,
          userId,
          text: payload.text as string,
        },
      })
      return { id: comment.id }
    }

    case 'defect:update': {
      const defect = await prisma.defect.update({
        where: { id: entityId },
        data: {
          status: payload.status as never,
          updatedAt: new Date(),
        },
      })
      return { id: defect.id }
    }

    case 'serial_number:create': {
      const sn = await prisma.serialNumber.create({
        data: {
          projectId,
          serialNumber: payload.serialNumber as string,
          position: payload.position as string | null,
          recordedById: userId,
        },
      })
      return { id: sn.id }
    }

    default:
      throw new Error(`Unknown sync operation: ${entity}:${operation}`)
  }
}
