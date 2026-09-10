# Architekturentscheidungen und Annahmen

## ADR-001: Next.js 16 App Router

**Entscheidung:** Next.js 16 mit App Router statt Pages Router oder anderem Framework.

**Begründung:**
- Server Components reduzieren JavaScript-Bundle-Größe (kritisch für mobile Verbindungen)
- Server Actions eliminieren separate API-Endpunkte für Mutationen
- Beste-in-Klasse TypeScript-Integration
- Turbopack für schnelle Entwicklungsserver-Starts

**Auswirkung:** `proxy.ts` statt `middleware.ts` (Next.js 16 Breaking Change). `params` sind nun Promises (`await params`).

---

## ADR-002: Prisma v5 statt v8 RC

**Entscheidung:** Downgrade von `prisma@8.0.0-rc.13` auf `prisma@5.22.0`.

**Begründung:** Prisma v8 RC ist eine neue CLI-Plattform ohne `generate`-Kommando. Die stabile v5 API ist ausgereifter, hat bessere Ecosystem-Unterstützung und bekannte Migration-Pfade.

**Annahme:** Prisma v5 ist ausreichend für alle Anforderungen und hat keine Breaking Changes bis mindestens Ende 2026.

---

## ADR-003: JWT statt Database Sessions

**Entscheidung:** Auth.js mit JWT-Session-Strategie, nicht Database Sessions.

**Begründung:**
- Keine zusätzliche DB-Last für jede Anfrage
- Funktioniert auch wenn DB kurz nicht erreichbar
- Ausreichend für die Projektgröße

**Kompromiss:** Token-Invalidierung ist komplexer (kein Logout-Forcing). Akzeptiertes Risiko.

---

## ADR-004: Lokales Foto-Storage statt Cloud

**Entscheidung:** Fotos werden im Dateisystem gespeichert (`STORAGE_LOCAL_PATH`), nicht in S3/CloudFlare.

**Begründung:**
- Keine externe Service-Abhängigkeit in Entwicklung
- Einfachere Implementierung für Prototyp
- Leicht auf Cloud-Storage migrierbar (Abstraktionsschicht über `storagePath`)

**Annahme:** Die App läuft auf einem einzelnen Server. Horizontal Scaling würde shared Storage (NFS/S3) erfordern.

---

## ADR-005: IndexedDB (Dexie) für Offline-Queue

**Entscheidung:** Dexie.js über native IndexedDB API.

**Begründung:**
- Promise-basierte API statt Callbacks
- Automatic versioning
- Transaktionale Schreibvorgänge
- Bewährte Bibliothek mit aktiver Maintenance

---

## ADR-006: CSS Custom Properties statt reines Tailwind

**Entscheidung:** Design-System mit CSS Custom Properties (`--accent`, `--ink`, `--ok`, …), Tailwind als Utility-Ergänzung.

**Begründung:**
- Dark-Mode via `prefers-color-scheme` ohne JavaScript
- Konsistente Theme-Tokens über alle Komponenten
- Einfachere Anpassung durch Kunden (eine Stelle pro Token)

---

## ADR-007: bcryptjs statt argon2

**Entscheidung:** `bcryptjs` (Pure JavaScript) statt `argon2` (Native Addon).

**Begründung:**
- Keine nativen Binaries → keine Kompilier-Abhängigkeiten
- Einfacheres Deployment (Docker ohne Build-Tools)
- Kostenfaktor 12 ist ausreichend sicher

---

## Annahmen

| Nr. | Annahme | Risiko wenn falsch |
|-----|---------|-------------------|
| A1 | Max. 100 gleichzeitige Nutzer | Performance-Degradation |
| A2 | Fotos max. 20 MB | Speicherbedarf steigt |
| A3 | Projekte haben max. 50 Dachflächen | Canvas-Performance |
| A4 | Einzelne Server-Instanz | Datei-Sync-Probleme |
| A5 | Internet verfügbar beim Erststart | PWA-Installation schlägt fehl |
| A6 | Modern Browser (Chrome 90+, Safari 15+) | Kompatibilitätsprobleme |
| A7 | Deutsch als einzige Sprache | Keine i18n-Anforderung |
