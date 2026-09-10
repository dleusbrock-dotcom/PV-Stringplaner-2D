# Sicherheits- und Datenschutzkonzept

## Grundprinzipien

1. **Defense in Depth** – mehrere Sicherheitsschichten
2. **Keine Secrets im Repository** – alle geheimen Werte über Umgebungsvariablen
3. **Least Privilege** – Nutzer erhalten nur die Berechtigungen die sie benötigen
4. **Audit Trail** – alle kritischen Aktionen werden protokolliert

## Authentifizierung

### Auth.js (next-auth v5)

- **Credentials-Provider** mit bcryptjs (Kostenfaktor 12)
- **JWT-Sessions** – keine Server-seitige Session-Speicherung erforderlich
- `NEXTAUTH_SECRET` – mindestens 32 Zeichen, zufällig generiert
- Session-Dauer: 30 Tage (konfigurierbar)

### Passwort-Anforderungen

- Minimum 8 Zeichen (Konvention, keine technische Erzwingung aktuell)
- Hash mit bcrypt, Kostenfaktor 12 (~200ms Rechenzeit)

### Route-Schutz

`src/proxy.ts` schützt alle Routen außer:
- `/login` – öffentlich
- `/api/auth/*` – Auth.js-Endpunkte
- `/` – Root-Redirect
- `/qr/*` – QR-Code-Seite (bewusst öffentlich für Baustellen-Scanning)

## Autorisierung

### Rollenbasiertes Zugangssystem (RBAC)

| Rolle | Beschreibung |
|-------|--------------|
| Admin | Vollzugriff, Nutzerverwaltung |
| Planer | Projekte anlegen und planen |
| Monteur | Baustellen-Dokumentation |

Admin-Seite (`/admin`) prüft zusätzlich zur Session die Rolle des eingeloggten Nutzers.

### Server Actions

Jede Server Action ruft `getSession()` auf:
```typescript
export async function someAction() {
  const session = await getSession() // wirft UnauthorizedError wenn keine Session
  // ...
}
```

## Datenspeicherung

### Passwörter

- Nie im Klartext gespeichert
- Nur bcryptjs-Hash in `users.password_hash`

### Fotos

- Gespeichert auf dem Server im `STORAGE_LOCAL_PATH`-Verzeichnis (Standard: `./storage/`)
- Zugriff nur über `/api/photos/[...path]` mit Auth-Prüfung
- Pfad-Traversal-Schutz: `..` in Pfaden wird abgelehnt

### Umgebungsvariablen (Pflichtfelder)

```bash
DATABASE_URL=postgresql://...  # DB-Connection-String
NEXTAUTH_SECRET=...            # JWT-Signing-Key (≥ 32 Zeichen)
NEXTAUTH_URL=https://...       # Öffentliche URL
```

## Bekannte Schwachstellen / Technische Schulden

| Schwachstelle | Risiko | Maßnahme |
|---------------|--------|----------|
| Kein Rate-Limiting auf `/api/auth` | Brute-Force-Angriffe möglich | rate-limiter-flexible oder nginx-Limit |
| Keine CSRF-Tokens bei Form-Submissions | Niedrig (SameSite-Cookies) | Explizite CSRF-Middleware |
| Foto-Upload ohne Virenscan | Malicious Files | ClamAV-Integration |
| Keine Bild-Komprimierung | Hoher Speicherbedarf | Sharp.js-Pipeline |
| `as never` / `as unknown` Casts | TypeScript-Sicherheit umgangen | Prisma v6 Migration |
| Admin-Login via `prompt()` für Passwort-Reset | UX + XSS-Risiko | Dediziertes Formular |

## Datenschutz (DSGVO)

### Personenbezogene Daten

- `User.email`, `User.name` – Nutzerdaten
- `Customer.*` – Kundendaten
- `Photo.*` – können Personen zeigen
- `AuditLog.ipAddress` – IP-Adressen

### Datenlöschung

Cascade-Delete bei Projekt-Löschung entfernt alle zugehörigen Daten. Nutzer-Accounts müssen manuell gelöscht werden (Admin-Bereich).

### Übertragungssicherheit

- Produktionsumgebung: HTTPS erzwingen (via Reverse-Proxy / Hosting-Provider)
- `NEXTAUTH_URL` muss `https://` verwenden

## Audit-Log

`AuditLog`-Tabelle protokolliert:
- Welcher Nutzer (`userId`)
- Welche Aktion (`action`)
- An welcher Entität (`entity`, `entityId`)
- Wann (`createdAt`)
- Von wo (`ipAddress`, `userAgent`)
- Was geändert wurde (`changes` JSON)
