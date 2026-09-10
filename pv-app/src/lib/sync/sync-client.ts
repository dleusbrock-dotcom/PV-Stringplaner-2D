/**
 * Client-seitiger Sync-Manager
 * Verwaltet die Offline-Queue und synchronisiert mit dem Server
 */
'use client'

import { getSyncDb, type LocalSyncOp } from './db'

export type SyncState = {
  pendingCount: number
  isSyncing: boolean
  lastError: string | null
}

type SyncStateListener = (state: SyncState) => void

class SyncClient {
  private isSyncing = false
  private listeners = new Set<SyncStateListener>()
  private state: SyncState = { pendingCount: 0, isSyncing: false, lastError: null }

  subscribe(listener: SyncStateListener) {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  private notify(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch }
    this.listeners.forEach((l) => l(this.state))
  }

  /** Fügt eine Operation zur lokalen Queue hinzu */
  async enqueue(op: Omit<LocalSyncOp, 'id' | 'status' | 'attempts' | 'createdAt'>) {
    const db = getSyncDb()
    const id = await db.syncOps.add({
      ...op,
      status: 'pending',
      attempts: 0,
      createdAt: Date.now(),
    })
    const count = await db.syncOps.where('status').equals('pending').count()
    this.notify({ pendingCount: count })
    return id
  }

  /** Enqueue + sofort synchronisieren (wenn online) */
  async enqueueAndSync(op: Omit<LocalSyncOp, 'id' | 'status' | 'attempts' | 'createdAt'>) {
    await this.enqueue(op)
    if (navigator.onLine) {
      void this.sync()
    }
  }

  /** Synchronisiert alle pending-Operationen mit dem Server */
  async sync() {
    if (this.isSyncing) return
    this.isSyncing = true
    this.notify({ isSyncing: true, lastError: null })

    const db = getSyncDb()

    try {
      const pending = await db.syncOps
        .where('status')
        .anyOf(['pending', 'failed'])
        .and((op) => (op.attempts ?? 0) < 5)
        .sortBy('createdAt')

      for (const op of pending) {
        await db.syncOps.update(op.id!, { status: 'syncing', attempts: (op.attempts ?? 0) + 1 })

        try {
          const response = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              operation: op.operation,
              entity: op.entity,
              entityId: op.entityId,
              projectId: op.projectId,
              payload: JSON.parse(op.payload),
            }),
          })

          if (response.ok) {
            const result = await response.json() as { id?: string }
            await db.syncOps.update(op.id!, {
              status: 'synced',
              remoteId: result.id,
              syncedAt: Date.now(),
            })
          } else {
            const errorText = await response.text()
            await db.syncOps.update(op.id!, {
              status: 'failed',
              lastError: `HTTP ${response.status}: ${errorText}`,
            })
          }
        } catch (err) {
          await db.syncOps.update(op.id!, {
            status: 'failed',
            lastError: String(err),
          })
        }
      }

      const remaining = await db.syncOps.where('status').equals('pending').count()
      this.notify({ pendingCount: remaining, lastError: null })
    } catch (err) {
      this.notify({ lastError: String(err) })
    } finally {
      this.isSyncing = false
      this.notify({ isSyncing: false })
    }
  }

  /** Löscht alle erfolgreich synchronisierten Operationen (älter als 7 Tage) */
  async cleanup() {
    const db = getSyncDb()
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
    await db.syncOps
      .where('status')
      .equals('synced')
      .and((op) => (op.syncedAt ?? 0) < cutoff)
      .delete()
  }

  /** Gibt die aktuelle Anzahl ausstehender Operationen zurück */
  async getPendingCount(): Promise<number> {
    const db = getSyncDb()
    return db.syncOps.where('status').anyOf(['pending', 'failed']).count()
  }
}

// Singleton
export const syncClient = typeof window !== 'undefined' ? new SyncClient() : null

/** Auto-Sync bei Online-Event */
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncClient?.sync()
  })
}
