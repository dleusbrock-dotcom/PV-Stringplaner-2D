# Statusbericht

**Stand:** September 2026  
**Branch:** `claude/pv-project-management-app-mwhg16`

## Implementiert ✅

### Infrastruktur
- [x] Next.js 16 App Router Grundstruktur
- [x] TypeScript Strict Mode (0 Fehler)
- [x] Prisma Schema (vollständiges Datenbankmodell)
- [x] Auth.js mit Credentials-Provider + bcryptjs
- [x] JWT-Sessions mit Rollen
- [x] Proxy-Middleware (Route-Schutz)
- [x] Docker Compose (PostgreSQL)
- [x] CSS Design System (CSS Custom Properties, Dark Mode)
- [x] PWA Manifest + Service Worker
- [x] **Rate-Limiting** auf Auth-Endpunkten (in-memory, 10/IP + 5/E-Mail pro 15 min)
- [x] **CI/CD Pipeline** (GitHub Actions: typecheck → lint → test → build)

### Seiten & Features
- [x] Login-Seite
- [x] Projekt-Liste mit Status-Filterung
- [x] Projekt-Anlegen (3-Schritt-Wizard)
- [x] Projekt-Übersicht (Statistiken, Audit-Log)
- [x] Planung (Canvas-Grid, Strings, Wechselrichter)
- [x] Baustelle (Checklisten-Übersicht, Quick Actions)
- [x] Fotos (Kamerazugriff, Kategorie-Ansicht, Grid-Ansicht, **echte Bilder**)
- [x] Prüfungen (Checklisten aus Templates, Status-Toggle)
- [x] Mängel (Liste, Neu, Detail, Kommentare, Status)
- [x] **Seriennummern** (Erfassen, Inline-Bearbeiten, Löschen, Suchen)
- [x] Material (Soll/Ist-Vergleich)
- [x] Dokumente (Dateiliste, **PDF-Abnahmeprotokoll**)
- [x] Abschluss (Unterschriften, Projektsperre)
- [x] Projektmitglieder (Team-Verwaltung, Rollen)
- [x] **Bauteilbibliothek** (CRUD, Kategorien, Spezifikationen)
- [x] **Admin-Bereich** (Nutzerverwaltung, Aktivierung/Deaktivierung, Passwort-Reset-Modal, Statistiken)
- [x] Einstellungen (Profil, Anwendungsinfo)
- [x] **QR-Code-Seite** (`/qr/[code]`) – öffentlich zugänglich

### APIs
- [x] **Foto-Serving** (`/api/photos/[...path]`) – echte Bilder mit Auth
- [x] **PDF-Generierung** (`/api/projekte/[id]/pdf`) – druckbares Abnahmeprotokoll
- [x] **Offline-Sync** (`/api/sync`) – Sync-Queue-Verarbeitung
- [x] Health-Check (`/api/health`)

### Offline / PWA
- [x] Service Worker (Network-First, Cache-Fallback)
- [x] **IndexedDB-Schema** (Dexie.js) – syncOps, pendingPhotos, projectCache
- [x] **Sync-Client** – Queue, Auto-Sync bei Online-Event, Retry-Logik

### UI-Komponenten
- [x] Button (Varianten: primary/secondary/ghost/danger/success)
- [x] Input (Label, Error, Hint)
- [x] Badge (Varianten: default/primary/success/danger/warning/sun)
- [x] Card
- [x] Toast (mit Varianten)
- [x] App Shell (Top-Nav mit Bibliothek + Admin, Projekt-Navigation mit 11 Tabs)

### Tests
- [x] Vitest-Konfiguration (jsdom, globals)
- [x] Unit-Tests: 34 Tests, alle grün ✅
  - `utils.test.ts` – 20 Tests
  - `errors.test.ts` – 14 Tests

### Daten
- [x] Prisma Seed (Demo-Nutzer, Demo-Projekt, Checklisten-Templates)

### Dokumentation
- [x] README.md
- [x] docs/architektur.md
- [x] docs/statusbericht.md
- [x] docs/datenmodell.md
- [x] docs/offline-und-synchronisationskonzept.md
- [x] docs/sicherheits-und-datenschutzkonzept.md
- [x] docs/teststrategie.md
- [x] docs/umsetzungsplan.md
- [x] docs/entscheidungen-und-annahmen.md

## Routen-Übersicht (27 Routen)

```
/ → Redirect zu /projekte
/login
/qr/[code]               ← öffentlich
/projekte
/projekte/neu
/projekte/[id]
/projekte/[id]/planung
/projekte/[id]/baustelle
/projekte/[id]/fotos
/projekte/[id]/pruefungen
/projekte/[id]/maengel
/projekte/[id]/maengel/neu
/projekte/[id]/maengel/[defectId]
/projekte/[id]/seriennummern
/projekte/[id]/material
/projekte/[id]/dokumente
/projekte/[id]/mitglieder
/projekte/[id]/abschluss
/bibliothek
/admin
/einstellungen
/api/auth/[...nextauth]
/api/health
/api/photos/[...path]
/api/projekte/[id]/pdf
/api/sync
```

## Offene Backlog-Punkte (niedrige Priorität)

- [ ] Bild-Komprimierung beim Upload (Sharp.js)
- [ ] E2E-Tests mit Playwright (kritische User Flows)
- [ ] CSV/Excel-Export für Materiallisten
- [ ] Push-Benachrichtigungen

## Bekannte Einschränkungen

1. **Rate-Limiting in-memory**: Funktioniert nur auf Einzelinstanz. Bei Horizontal Scaling: Redis-Backend erforderlich (`RateLimiterRedis` statt `RateLimiterMemory`)
2. **Kein aktives DB-Seeding**: Benötigt laufende PostgreSQL-Instanz
3. **Foto-Upload ohne Bildkomprimierung**: Max. 20 MB, keine automatische Komprimierung

## Technische Schulden

- `as never` / `as unknown as` Casts für Prisma JSON-Felder und react-hook-form Resolver-Typen
- Foto-Upload ohne Bildkomprimierung
