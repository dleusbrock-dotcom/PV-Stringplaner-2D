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
| Sprache | TypeScript 5 (Strict Mode) |
| Datenbank | PostgreSQL 16 + Prisma ORM 5 |
| Auth | Auth.js (next-auth v5 beta) |
| UI | Tailwind CSS v4 + CSS Custom Properties |
| PWA | Service Worker + Web App Manifest |

## Quick Start

### Voraussetzungen

- Node.js ≥ 20
- Docker & Docker Compose
- (Optional) pnpm

### Entwicklung

```bash
# Datenbank starten
docker compose up -d postgres

# Abhängigkeiten installieren
cd pv-app && npm install

# Datenbank migrieren + Seed
npx prisma migrate dev --name init
npx prisma db seed

# Entwicklungsserver starten
npm run dev
```

App läuft dann auf http://localhost:3000

### Demo-Zugangsdaten

| E-Mail | Passwort | Rolle |
|--------|----------|-------|
| admin@pv-planer.de | demo1234 | Admin |
| planer@pv-planer.de | demo1234 | Planer |
| monteur@pv-planer.de | demo1234 | Monteur |

## Umgebungsvariablen

Kopieren Sie `.env.example` nach `.env.local`:

```bash
cp pv-app/.env.example pv-app/.env.local
```

Pflichtfelder:
- `DATABASE_URL` – PostgreSQL Connection String
- `NEXTAUTH_SECRET` – Zufälliger String ≥ 32 Zeichen (z.B. `openssl rand -base64 32`)
- `NEXTAUTH_URL` – Öffentliche URL der Anwendung

## Projektstruktur

```
pv-app/
├── prisma/           # Datenbankschema + Seed
├── public/           # Statische Assets, PWA Manifest, Service Worker
└── src/
    ├── app/          # Next.js App Router Pages
    ├── components/   # Generische UI-Komponenten
    ├── features/     # Feature-Slices (Projekte, Fotos, Mängel, ...)
    └── lib/          # Shared Utilities (auth, db, errors, utils)
```

## Entwicklung

```bash
npm run dev     # Entwicklungsserver
npm run build   # Produktionsbuild
npm run lint    # ESLint
npx tsc --noEmit  # TypeScript-Prüfung
```

## Sicherheitshinweis

Keine Secrets im Repository. Alle geheimen Werte werden über Umgebungsvariablen übergeben.

---

*Entwickelt mit Claude Code – Anthropic*
