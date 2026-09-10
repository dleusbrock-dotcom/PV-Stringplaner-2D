/**
 * Offline-fähige lokale Datenbank mit Dexie (IndexedDB)
 * Speichert Sync-Operationen für spätere Synchronisation
 */
import Dexie, { type EntityTable } from 'dexie'

export type SyncOpStatus = 'pending' | 'syncing' | 'synced' | 'failed'

export interface LocalSyncOp {
  id?: number          // auto-increment
  remoteId?: string    // server-assigned id after sync
  projectId: string
  operation: 'create' | 'update' | 'delete'
  entity: string       // e.g. "checklist_item", "defect_comment"
  entityId: string     // client-side temp id or server id
  payload: string      // JSON
  status: SyncOpStatus
  attempts: number
  lastError?: string
  createdAt: number    // timestamp ms
  syncedAt?: number
}

export interface LocalPhoto {
  id?: number
  tempId: string
  projectId: string
  category: string
  caption: string
  blob: Blob
  mimeType: string
  filename: string
  status: 'pending' | 'uploading' | 'uploaded' | 'failed'
  createdAt: number
}

export interface CachedProject {
  id: string
  number: string
  name: string
  status: string
  updatedAt: number
  data: string  // JSON snapshot
}

class PvSyncDb extends Dexie {
  syncOps!: EntityTable<LocalSyncOp, 'id'>
  pendingPhotos!: EntityTable<LocalPhoto, 'id'>
  projectCache!: EntityTable<CachedProject, 'id'>

  constructor() {
    super('pv-stringplaner-sync')

    this.version(1).stores({
      syncOps: '++id, projectId, status, createdAt',
      pendingPhotos: '++id, tempId, projectId, status',
      projectCache: 'id, updatedAt',
    })
  }
}

// Singleton – wird nur im Browser instantiiert
let _db: PvSyncDb | null = null

export function getSyncDb(): PvSyncDb {
  if (typeof window === 'undefined') {
    throw new Error('getSyncDb() darf nur im Browser aufgerufen werden')
  }
  if (!_db) {
    _db = new PvSyncDb()
  }
  return _db
}
