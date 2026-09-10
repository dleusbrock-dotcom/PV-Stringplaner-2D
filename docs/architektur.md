# Architektur

## Überblick

Die Anwendung folgt einer **Feature-Slice-Architektur** mit Next.js 16 App Router als Grundlage.

```
┌─────────────────────────────────────────────────────────┐
│                     Browser / PWA                        │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  App Shell   │  │  Feature     │  │  Service      │ │
│  │  (Nav, Auth) │  │  Components  │  │  Worker       │ │
│  └──────────────┘  └──────────────┘  └───────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────┐
│                   Next.js Server                         │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  App Router  │  │  Server      │  │  Auth.js      │ │
│  │  Pages       │  │  Actions     │  │  (JWT)        │ │
│  └──────────────┘  └──────────────┘  └───────────────┘ │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                    Prisma ORM                            │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│                   PostgreSQL 16                          │
└─────────────────────────────────────────────────────────┘
```

## Schichten

### Präsentation (React Server/Client Components)
- **Server Components** für Datenabruf und statische Inhalte
- **Client Components** (`'use client'`) für interaktive UI-Elemente
- Mobile-first Design mit CSS Custom Properties

### Business-Logik (Server Actions)
- Alle Datenmutationen als Server Actions (`'use server'`)
- Validierung mit Zod
- Optimistische Updates via `useTransition`

### Datenhaltung (Prisma + PostgreSQL)
- Type-safe Datenbankzugriff via Prisma Client
- Singleton-Pattern für DB-Verbindung in Entwicklung

### Auth (Auth.js / next-auth v5)
- JWT-Session-Strategie
- Credentials-Provider mit bcryptjs
- Proxy-Middleware für Route-Schutz

## Feature-Slices

Jedes Feature hat folgende Struktur:
```
src/features/<feature>/
├── <feature>-view.tsx    # Client-Komponente (interaktiv)
├── <feature>-actions.ts  # Server Actions
└── schemas.ts            # Zod-Schemata (optional)
```

## PWA / Offline

- `public/manifest.json` – Web App Manifest
- `public/sw.js` – Service Worker (Network-first, Cache-Fallback)
- Offline-Queue via Background Sync API
