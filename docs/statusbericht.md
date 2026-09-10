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

### Seiten & Features
- [x] Login-Seite
- [x] Projekt-Liste mit Status-Filterung
- [x] Projekt-Anlegen (3-Schritt-Wizard)
- [x] Projekt-Übersicht (Statistiken, Audit-Log)
- [x] Planung (Canvas-Grid, Strings, Wechselrichter)
- [x] Baustelle (Checklisten-Übersicht, Quick Actions)
- [x] Fotos (Kamerazugriff, Kategorie-Ansicht, Grid-Ansicht)
- [x] Prüfungen (Checklisten aus Templates, Status-Toggle)
- [x] Mängel (Liste, Neu, Detail, Kommentare, Status)
- [x] Material (Soll/Ist-Vergleich)
- [x] Dokumente (Dateiliste)
- [x] Abschluss (Unterschriften, Projektsperre)
- [x] Einstellungen (Profil, Anwendungsinfo)

### UI-Komponenten
- [x] Button (Varianten: primary/secondary/ghost/danger/success)
- [x] Input (Label, Error, Hint)
- [x] Badge (Varianten: default/primary/success/danger/warning/sun)
- [x] Card
- [x] Toast (mit Varianten)
- [x] App Shell (Top-Nav, Projekt-Navigation)

### Daten
- [x] Prisma Seed (Demo-Nutzer, Demo-Projekt, Checklisten-Templates)

## Ausstehend / Geplant

### Hohe Priorität
- [ ] Seriennummern-Feature
- [ ] QR-Code-Seite (`/qr/[code]`)
- [ ] PDF-Generierung (Abnahmeprotokoll)
- [ ] Foto-Thumbnails (tatsächliche Bilder anzeigen)
- [ ] Offline-Sync mit IndexedDB/Dexie.js

### Mittlere Priorität
- [ ] Bauteilbibliothek-Verwaltung
- [ ] Projektmitglieder-Verwaltung
- [ ] E2E-Tests mit Playwright
- [ ] Unit-Tests mit Vitest

### Niedrige Priorität
- [ ] Admin-Bereich (Nutzer, Rollen)
- [ ] Push-Benachrichtigungen
- [ ] CSV/Excel-Export

## Bekannte Einschränkungen

1. **Foto-Thumbnails**: Die Thumbnails zeigen aktuell einen Platzhalter statt echter Bilder (fehlende Bild-Optimierungs-Pipeline)
2. **PDF-Generierung**: Noch nicht implementiert (Playwright-Integration ausstehend)
3. **Offline-Sync**: Service Worker vorhanden, aber IndexedDB-Queue noch nicht implementiert
4. **Kein aktives DB-Seeding**: Benötigt laufende PostgreSQL-Instanz

## Technische Schulden

- `@ts-ignore`/`as any` Casts für react-hook-form Resolver-Typen (bekanntes v7 Issue mit Zod v4)
- Foto-Upload ohne Bildkomprimierung (max. 20 MB)
- Kein Rate-Limiting auf Auth-Endpunkten
