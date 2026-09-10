# Umsetzungsplan

## Status: Vollständig implementiert ✅

Der PV-Stringplaner 2D ist als vollständige PWA implementiert und auf dem Branch `claude/pv-project-management-app-mwhg16` verfügbar.

## Phase 1: Infrastruktur ✅

- [x] Next.js 16 App Router mit TypeScript Strict Mode
- [x] Prisma Schema (vollständiges Datenbankmodell)
- [x] Auth.js Credentials-Provider + bcryptjs
- [x] JWT-Sessions mit Rollen
- [x] Proxy-Middleware (Route-Schutz)
- [x] Docker Compose (PostgreSQL 16)
- [x] CSS Design System (Custom Properties, Dark Mode)
- [x] PWA Manifest + Service Worker

## Phase 2: Core Features ✅

- [x] Login/Logout
- [x] Projekt-Liste mit Status-Filterung
- [x] Projekt-Anlegen (3-Schritt-Wizard)
- [x] Projekt-Übersicht (Statistiken, Audit-Log)
- [x] Planung (Canvas-Grid, Dachflächen, Module, Strings, Wechselrichter)

## Phase 3: Baustellen-Features ✅

- [x] Baustelle (Checklisten-Übersicht, Quick Actions)
- [x] Fotos (Kamerazugriff, Kategorie-Ansicht, Grid-Ansicht, tatsächliche Bilder)
- [x] Prüfungen (Checklisten aus Templates, Status-Toggle)
- [x] Mängel (Liste, Neu, Detail, Kommentare, Status-Workflow)
- [x] Seriennummern (Erfassen, Bearbeiten, Löschen)
- [x] Material (Soll/Ist-Vergleich, Fortschrittsbalken)

## Phase 4: Abschluss & Verwaltung ✅

- [x] Dokumente (Dateiliste + PDF-Generierung)
- [x] Abschluss (Unterschriften, Projektsperre)
- [x] Projektmitglieder (Team-Verwaltung)
- [x] Bauteilbibliothek (CRUD, Kategorien)
- [x] Admin-Bereich (Nutzerverwaltung, Statistiken)
- [x] Einstellungen (Profil, Anwendungsinfo)

## Phase 5: APIs & Integration ✅

- [x] Foto-Serving API (`/api/photos/[...path]`)
- [x] PDF-Generierung API (`/api/projekte/[id]/pdf`)
- [x] Offline-Sync API (`/api/sync`)
- [x] QR-Code-Seite (`/qr/[code]`)
- [x] Health-Check (`/api/health`)

## Phase 6: Offline & PWA ✅

- [x] Service Worker (Network-First Strategy)
- [x] IndexedDB Schema (Dexie)
- [x] Sync-Client (Queue, Auto-Sync bei Online-Event)

## Phase 7: Tests & Dokumentation ✅

- [x] Vitest-Konfiguration
- [x] Unit-Tests (34 Tests, alle grün)
- [x] Architekturdokumentation
- [x] Datenmodell-Dokumentation
- [x] Offline/Sync-Konzept
- [x] Sicherheits- und Datenschutzkonzept
- [x] Entscheidungen und Annahmen
- [x] Teststrategie
- [x] Statusbericht

## Offene Punkte (Backlog)

| Aufgabe | Priorität | Aufwand |
|---------|-----------|---------|
| Rate-Limiting auf Auth-Endpunkten | Hoch | 2h |
| Bild-Komprimierung (Sharp.js) | Mittel | 4h |
| E2E-Tests mit Playwright | Mittel | 8h |
| CSV/Excel-Export | Niedrig | 4h |
| Push-Benachrichtigungen | Niedrig | 6h |
| Argon2 statt bcryptjs | Niedrig | 1h |
| Admin: isActive-Feld auf User | Niedrig | 2h |

## Deployment

### Voraussetzungen

```bash
# Datenbank (Docker)
docker compose up -d postgres

# App
cd pv-app
npm install
npx prisma migrate deploy
npx prisma db seed
npm start
```

### Umgebungsvariablen

```bash
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=https://your-domain.com
STORAGE_LOCAL_PATH=/var/pv-storage  # Optional
```

### Docker-Compose (Produktion)

```yaml
version: '3.9'
services:
  app:
    build: ./pv-app
    environment:
      - DATABASE_URL
      - NEXTAUTH_SECRET
      - NEXTAUTH_URL
    volumes:
      - pv-storage:/var/pv-storage
    ports:
      - "3000:3000"
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: pv_planer
      POSTGRES_USER: pv
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
volumes:
  pv-storage:
  pgdata:
```
