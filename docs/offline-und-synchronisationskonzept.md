# Offline- und Synchronisationskonzept

## Ziel

Die Anwendung soll auch ohne Internetverbindung (z. B. auf einer Baustelle) nutzbar sein. Änderungen werden lokal gespeichert und bei nächster Gelegenheit synchronisiert.

## Schichten

### 1. Service Worker (Network-First)

`public/sw.js` implementiert eine **Network-First**-Strategie:

```
Anfrage → Netzwerk verfügbar? → Server-Antwort + Cache-Update
                ↓ Nein
          Cache vorhanden? → Cache-Antwort
                ↓ Nein
          Fallback / Fehler
```

Gecacht werden:
- Alle Next.js-Static-Assets (`/_next/static/`, `/icons/`, `/manifest.json`)
- API-Antworten werden **nicht** gecacht (immer aktuell)

### 2. IndexedDB (Dexie.js)

`src/lib/sync/db.ts` definiert drei Tabellen:

| Tabelle | Zweck |
|---------|-------|
| `syncOps` | Offline-Queue für Datenmutationen |
| `pendingPhotos` | Fotos die noch hochgeladen werden müssen |
| `projectCache` | Lesezugriff auf Projektdaten offline |

#### SyncOp-Lebenszyklus

```
enqueue() → status: "pending"
             ↓
sync() startet → status: "syncing"
             ↓
POST /api/sync → Erfolg → status: "synced", remoteId gesetzt
             ↓
            Fehler → status: "failed", attempts++
             ↓
         attempts < 5 → nächster sync()-Aufruf wiederholt
         attempts >= 5 → dauerhafter Fehler, manuelle Intervention
```

### 3. Sync-Client (`src/lib/sync/sync-client.ts`)

Singleton-Instanz `syncClient` im Browser:

```typescript
// Mutation offline einreihen + sofort syncen (wenn online)
await syncClient.enqueueAndSync({
  projectId, operation: 'update',
  entity: 'checklist_item', entityId,
  payload: JSON.stringify({ status: 'DONE' }),
})
```

Automatische Synchronisation bei:
- `window.online`-Event (Gerät wechselt zu Online)
- Explizitem `syncClient.sync()`-Aufruf

### 4. Sync-API (`/api/sync`)

Empfängt einzelne Operationen und leitet sie an die Datenbank weiter:

| Entity | Operation | Beschreibung |
|--------|-----------|--------------|
| `checklist_item` | `update` | Checklisten-Status ändern |
| `defect_comment` | `create` | Mängelkommentar anlegen |
| `defect` | `update` | Mängelstatus ändern |
| `serial_number` | `create` | Seriennummer erfassen |

## Konfliktbehandlung

Aktuell: **Last-Write-Wins** – der zuletzt synchronisierte Wert überschreibt frühere Werte. Für die meisten Use Cases (Checklisten-Status, Seriennummern) ist dies ausreichend.

Zukünftig: Optimistic Locking via `updatedAt`-Timestamp-Vergleich.

## Background Sync API

`public/sw.js` registriert einen Background-Sync-Handler für `'pv-sync-queue'`. Wenn das Gerät offline war und wieder online geht, feuert der Browser automatisch ein `sync`-Event, und der Service Worker sendet ausstehende Operationen.

## PWA-Anforderungen

- `public/manifest.json` – Web App Manifest (installierbar)
- `display: "standalone"` – läuft als native App ohne Browser-UI
- `orientation: "portrait"` – optimiert für Smartphones
- Icons in 192×192 und 512×512 px
