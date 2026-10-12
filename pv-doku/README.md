# PV-Doku – Dokumentationstool für PV-Anlagen

MVP nach **Lastenheft PV-Dokumentationstool v1.0** (Kap. 9.1). Mobile Web-App (PWA-fähig), mit der Monteure und
Projektverantwortliche eine installierte PV-Anlage vor Ort erfassen, auf Vollständigkeit prüfen, freigeben und als
PDF-Bericht ausgeben.

Die Zuordnung der Lastenheft-Anforderungen zu Code und Tests steht in [`docs/anforderungen.md`](docs/anforderungen.md).

## Architektur

| Baustein | Umsetzung |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, responsive / mobile-first, Web-App-Manifest |
| Backend | Supabase: PostgreSQL mit Row Level Security, Auth (E-Mail + Passwort), Storage (privater Bucket) |
| Serverseitige Logik | PostgreSQL-Funktionen und Trigger (Berechtigung, Sperre, Status, Protokoll) und Next.js Route Handler (PDF, Export, Import, Benutzer einladen) |
| PDF | Serverseitig mit `@react-pdf/renderer` aus der versionierten Berichtsvorlage `src/lib/pdf/Report.tsx` |
| Tests | Vitest (Fachlogik, PDF, Export/Import) und SQL-Tests gegen eine lokale PostgreSQL-Instanz (RLS, Sperre, Statuswechsel) |

Supabase wird nur als Standard-PostgreSQL + Auth + S3-kompatibler Speicher genutzt. Alle Fachregeln liegen in
SQL-Migrationen bzw. im Anwendungscode, damit ein Wechsel des Hosting-Anbieters möglich bleibt (NF-010).

```
pv-doku/
├── supabase/
│   ├── migrations/      Schema, RLS, Trigger, Funktionen, Standardvorlagen
│   └── tests/           SQL-Tests (inkl. Nachbildung von auth/storage)
├── src/
│   ├── app/             Seiten und API-Routen
│   │   ├── (app)/       Dashboard, Projektassistent, Verwaltung (nur angemeldet)
│   │   └── api/         PDF, Export, Import, Benutzer einladen
│   ├── components/project/  Projektassistent, Modulraster, Fotos, Autosave
│   ├── lib/             Fachlogik (Raster, Vollständigkeit, Status, CSV, PDF)
│   └── proxy.ts         Sitzungsprüfung, Umleitung zur Anmeldung
├── tests/               Vitest
└── scripts/test-db.sh   Datenbanktests
```

### Datenmodell (Kurzfassung)

`companies` (Mandant, Berichtseinstellungen) · `profiles` (Benutzer, Rolle) · `projects` (inkl. Bauherr/Standort, Status,
Version) · `project_members` · `module_types` · `roof_surfaces` · `grid_cells` (eine Zeile je belegter/markierter
Rasterposition) · `strings` · `components` · `files` · `test_values` · `checklist_items` · `defects` · `signatures` ·
`project_versions` (Snapshot je Abschluss) · `audit_log` · `templates`.

### Rollen (F-001)

| Rolle | Rechte |
|---|---|
| Administrator | alles, Benutzer einladen/sperren, Firma, Logo, Vorlagen, Projekte löschen |
| Projektverantwortlicher | alle Projekte der Firma lesen/bearbeiten, Monteure zuweisen, abschließen, neue Version eröffnen, archivieren |
| Monteur / Dokumentierender | Projekte anlegen; nur zugewiesene/eigene Projekte lesen und bearbeiten; zur Prüfung geben |
| Betrachter | alle Projekte der Firma lesen, PDF/Export herunterladen |

Die Rechte werden **in der Datenbank** (RLS + Trigger) durchgesetzt, nicht nur in der Oberfläche.

### Status, Sperre, Versionen (F-018)

`Entwurf → In Bearbeitung → Zur Prüfung → Abgeschlossen → Archiviert`, Rückweg über `Nacharbeit erforderlich`.
Der Abschluss ist nur möglich, wenn die serverseitige Vollständigkeitsprüfung keine Fehler meldet. Beim Abschluss wird
ein vollständiger Snapshot in `project_versions` gespeichert; alle Projektinhalte sind danach per Trigger gesperrt.
„Neue Version eröffnen“ (mit Pflichtbegründung) erhöht die Versionsnummer und gibt das Projekt wieder frei. PDFs
freigegebener Versionen können jederzeit aus dem Snapshot erneut erzeugt werden.

## Einrichtung

Voraussetzungen: Node.js 22, ein Supabase-Projekt (Cloud oder selbst gehostet) bzw. die Supabase-CLI für lokal.

1. **Abhängigkeiten:** `npm ci`
2. **Datenbank:** Migrationen aus `supabase/migrations` in Dateinamenreihenfolge einspielen
   - mit CLI: `supabase link --project-ref <ref>` und `supabase db push`
   - oder lokal: `supabase start` (benötigt Docker) – spielt die Migrationen automatisch ein
3. **Auth-Einstellungen im Supabase-Dashboard**
   - *Authentication → Sign In / Providers → Email*: „Allow new users to sign up“ **deaktivieren**
   - *Authentication → URL Configuration*: Site URL = App-URL, Redirect-URL `https://<app>/auth/confirm` eintragen
   - *E-Mail-Vorlagen* „Invite user“ und „Reset password“: Link auf
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite` bzw. `…&type=recovery` umstellen
4. **Umgebungsvariablen:** `.env.example` nach `.env.local` kopieren und ausfüllen

   | Variable | Zweck |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | API-URL des Supabase-Projekts |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | öffentlicher (anon/publishable) Schlüssel |
   | `SUPABASE_SERVICE_ROLE_KEY` | **nur serverseitig**, ausschließlich für „Benutzer einladen“ |
   | `NEXT_PUBLIC_SITE_URL` | öffentliche URL der App (für Einladungslinks) |

5. **Ersten Administrator anlegen:** Im Supabase-Dashboard unter *Authentication → Users → Add user* einen Benutzer
   mit Passwort anlegen. **Der erste Benutzer wird automatisch Administrator.** Weitere Benutzer lädt der Administrator
   in der App unter *Verwaltung* ein.
6. **Start:** `npm run dev` (Entwicklung) bzw. `npm run build && npm start` (Produktion)
7. **Vor Produktivbetrieb:** Firma, Logo, Kopf-/Fußzeile und Mindestfotos unter *Verwaltung* einstellen und den
   Prüf-/Messwertkatalog unter *Verwaltung → Vorlagen* durch eine elektrotechnisch befähigte Person freigeben lassen.

### Umgebungen (NF-006)

Für Entwicklung, Test und Produktion jeweils ein eigenes Supabase-Projekt (oder Supabase-Branching) und eigene
`.env`-Dateien verwenden. Migrationen werden identisch in alle Umgebungen eingespielt.

## Qualitätssicherung

```bash
npm run lint        # ESLint (Next.js core-web-vitals + TypeScript)
npm run typecheck   # tsc --noEmit
npm test            # Vitest: Raster, Leistung, Vollständigkeit, Status, CSV, PDF, Backup-Import
npm run test:db     # Migrationen + SQL-Tests gegen temporäre lokale PostgreSQL (initdb/pg_ctl erforderlich)
npm run build
```

Die GitHub-Action `.github/workflows/pv-doku-ci.yml` führt alle Schritte bei jedem Push aus.
Für Tests werden ausschließlich synthetische Daten verwendet.

## Betrieb

### Deployment

Die App ist eine Standard-Next.js-Anwendung (Node-Runtime). Möglich sind z. B. Vercel, ein eigener Server mit
`npm run build && npm start` hinter einem TLS-Reverse-Proxy oder ein Container. Voraussetzung ist HTTPS (NF-004).
Hosting-Standort und Auftragsverarbeitung sind vor Produktivbetrieb zu klären (NF-003, Lastenheft Kap. 14).

### Backup und Wiederherstellung (NF-005, F-020)

- **Plattform:** Supabase erstellt tägliche Datenbank-Backups (Point-in-Time-Recovery je nach Tarif). Die Dateien im
  Storage sind darin **nicht** enthalten und müssen separat gesichert werden (z. B. regelmäßiger Export per S3-API).
- **Je Projekt:** *Abschluss → Backup inkl. Fotos (ZIP)* erzeugt ein vollständiges Archiv (`project.json`, alle Dateien,
  CSV-Tabellen). *Neues Projekt → Projekt importieren* stellt daraus ein neues Projekt (Status Entwurf) wieder her.
- **Komplett:** `pg_dump` der Datenbank plus Kopie des Buckets `project-files`.
- Die Wiederherstellung ist mindestens jährlich zu testen und zu dokumentieren.

### Datenschutz (NF-003) – Hinweise

- Personenbezogene Daten: Bauherr (Name, Anschrift, Telefon, E-Mail), Benutzer, Unterschriften, ggf. Fotos.
- **Auskunft:** JSON-Export des Projekts. **Löschung:** Administratoren können Projekte unter *Stammdaten* vollständig
  löschen (Datenbank-Kaskade und zugehörige Dateien; der Löschvorgang wird ohne Inhaltsdaten protokolliert).
  Hinweis: Plattform-Backups enthalten gelöschte Daten bis zum Ablauf ihrer Aufbewahrungsfrist.
- Lösch- und Aufbewahrungsfristen, Rechtsgrundlage und AV-Vertrag sind fachlich festzulegen (Lastenheft Kap. 14).

### Sicherheit (NF-004)

Passwörter verwaltet Supabase Auth (bcrypt). Alle Tabellen haben RLS; anonyme Zugriffe sind entzogen; Status/Version
sind nur über `set_project_status()` änderbar; Dateipfade und Querverweise werden serverseitig auf das Projekt geprüft;
Uploads sind auf JPEG/PNG/WebP/PDF bis 25 MB begrenzt; CSV-Exporte sind gegen Formel-Injektion geschützt; der
Service-Role-Schlüssel wird nur im Route Handler zum Einladen verwendet.

## Abgrenzung / bekannte Grenzen des MVP

- **Offline:** Formulare und Raster werden lokal zwischengespeichert und bei wiederhergestellter Verbindung
  nachgesendet; Konflikte werden angezeigt statt überschrieben. Eine vollständige Offline-Nutzung (Service Worker,
  Foto-Warteschlange) ist Ausbaustufe (Kap. 9.2).
- Seriennummern-Scan per Kamera, Mandantenverwaltung in der Oberfläche, Schnittstellen und Geodaten-Import: Ausbaustufe.
- XLSX wird über CSV (Excel-kompatibel, `;`-getrennt, UTF-8-BOM) abgedeckt.
- Der Bericht ersetzt keine normative Prüfung (z. B. Prüfprotokolle nach einschlägigen Normen).
