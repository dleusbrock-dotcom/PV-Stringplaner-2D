# PV-Stringplaner 2D

**Photovoltaik Projektmanagement** – Mobile-first, offline-fähige PWA für die vollständige Projektdokumentation von PV-Anlagen.

## Überblick

PV-Stringplaner 2D unterstützt Monteure und Bauleiter beim gesamten PV-Projektlebenszyklus:

- **Planung**: Interaktive Dachflächenerfassung, Modulplatzierung, String-Planung, Wechselrichter-Management
- **Baustelle**: Checklisten, Fotodokumentation (mit Direktkamerazugriff), Mängelerfassung
- **Abschluss**: Prüfungen, Unterschriften, PDF-Generierung, Projektsperre

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Sprache | TypeScript 5 (Strict Mode, 0 Fehler) |
| Datenbank | PostgreSQL 16 + Prisma ORM 5 |
| Auth | Auth.js (next-auth v5 beta) + Rate-Limiting |
| UI | Tailwind CSS v4 + CSS Custom Properties |
| PWA | Service Worker + Web App Manifest |
| Tests | Vitest (34 Unit-Tests, alle grün) |
| CI | GitHub Actions (typecheck → lint → test → build) |

## Quick Start

### Voraussetzungen

- Node.js ≥ 20
- Docker & Docker Compose

### 1. Umgebungsvariablen anlegen

```bash
cd pv-app
cp .env.example .env.local
```

Öffnen Sie `.env.local` und setzen Sie:

```bash
DATABASE_URL="postgresql://pv:pv@localhost:5432/pv_planer"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"   # mind. 32 Zeichen
NEXTAUTH_URL="http://localhost:3000"
```

### 2. Datenbank starten

```bash
# Im Root-Verzeichnis des Repos:
docker compose up -d postgres
```

Warten Sie ~5 Sekunden bis PostgreSQL bereit ist.

### 3. App starten

```bash
cd pv-app
npm install
npx prisma migrate deploy   # Schema anlegen
npx prisma db seed          # Demo-Daten einspielen
npm run dev                 # Entwicklungsserver
```

App läuft dann auf **http://localhost:3000**

### Demo-Zugangsdaten

| E-Mail | Passwort | Rolle |
|--------|----------|-------|
| admin@pv-planer.de | demo1234 | Admin |
| planer@pv-planer.de | demo1234 | Planer |
| monteur@pv-planer.de | demo1234 | Monteur |

## Produktionsdeployment

```bash
cd pv-app
npm run build
npm start
```

Oder mit Docker Compose (Datenbank + App):

```bash
docker compose up -d
```

## Projektstruktur

```
pv-app/
├── prisma/              # Schema, Migrationen, Seed
│   └── migrations/      # SQL-Migrationen
├── public/              # Statische Assets, PWA Manifest, Service Worker
└── src/
    ├── app/             # Next.js App Router Pages & API Routes
    ├── components/      # Generische UI-Komponenten (Button, Input, Badge, …)
    ├── features/        # Feature-Slices (projects, photos, defects, …)
    └── lib/             # Shared Utilities (auth, db, errors, rate-limit, sync)
```

## Entwicklungs-Befehle

```bash
npm run dev          # Entwicklungsserver (Turbopack)
npm run build        # Produktionsbuild
npm run lint         # ESLint (0 Warnings konfiguriert)
npx tsc --noEmit     # TypeScript-Prüfung (0 Fehler)
npx vitest run       # Unit-Tests (34 Tests)
npx vitest --ui      # Tests im Browser
```

## Features im Überblick

| Bereich | Feature |
|---------|---------|
| Projekte | Liste, Anlegen (3-Schritt-Wizard), Übersicht, Status-Filter |
| Planung | Canvas-Grid, Dachflächen, Modulplatzierung, Strings, Wechselrichter |
| Baustelle | Checklisten, Quick Actions, Online/Offline-Status |
| Fotos | Direktkamera, Kategorie-Ansicht, Grid-Ansicht, echte Bilder |
| Prüfungen | Checklisten aus Templates, Status DONE/NOT_APPLICABLE/OPEN |
| Mängel | Liste, Anlegen, Detail, Kommentare, Status-Workflow |
| Seriennummern | Erfassen, Inline-Bearbeiten, Löschen, Suchen |
| Material | Soll/Ist-Vergleich mit Fortschrittsbalken |
| Dokumente | Dateiliste, druckbares PDF-Abnahmeprotokoll |
| Abschluss | Unterschriften, Projektsperre |
| Team | Mitglieder einladen, Rollen vergeben |
| Bibliothek | Bauteilbibliothek (Module, Wechselrichter, Batterien, …) |
| Admin | Nutzerverwaltung, Aktivierung/Deaktivierung, Passwort-Reset |
| QR-Code | Öffentliche Projektseite via `/qr/[code]` |
| PWA | Installierbar, Service Worker, Offline-Queue (IndexedDB) |

## Sicherheit

- Keine Secrets im Repository
- Rate-Limiting auf Login-Endpunkten (10/IP + 5/E-Mail pro 15 min)
- `isActive`-Flag auf Nutzern (deaktivierte Accounts können sich nicht einloggen)
- Route-Schutz via Proxy-Middleware
- Pfad-Traversal-Schutz auf Foto-API
- Audit-Log für alle kritischen Aktionen

---

*Entwickelt mit Claude Code – Anthropic*
