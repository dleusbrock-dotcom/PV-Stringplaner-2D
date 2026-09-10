# Teststrategie

## Übersicht

| Ebene | Tool | Abdeckung |
|-------|------|-----------|
| Unit-Tests | Vitest + Testing Library | Utilities, Error-Klassen, Pure Functions |
| Integrationstests | Vitest + MSW (geplant) | Server Actions, API-Routes |
| E2E-Tests | Playwright (geplant) | Kritische User Flows |

## Unit-Tests (Vitest)

### Konfiguration

`vitest.config.ts` – jsdom-Umgebung, globals aktiviert, `@testing-library/jest-dom`-Matcher.

```bash
npx vitest run          # Einmalig ausführen
npx vitest              # Watch-Modus
npx vitest --coverage   # Mit Coverage-Report
```

### Aktuell getestete Module

| Datei | Tests | Beschreibung |
|-------|-------|--------------|
| `src/lib/utils.test.ts` | 20 | cn, formatDate, formatDateTime, formatPower, generateProjectNumber, truncate |
| `src/lib/errors/errors.test.ts` | 14 | AppError, UnauthorizedError, NotFoundError, ValidationError, handleError |

**Gesamt: 34 Tests, alle grün ✅**

### Test-Konventionen

```typescript
describe('Funktionsname', () => {
  it('verhält sich korrekt bei Normalfall', () => {
    // arrange
    // act
    // assert
    expect(result).toBe(expected)
  })

  it('behandelt Edge Cases', () => {
    expect(fn(null)).toBe('–')
    expect(fn(undefined)).toBe('–')
  })
})
```

## Geplante E2E-Tests (Playwright)

### Kritische Flows

1. **Login-Flow**
   - Korrekte Zugangsdaten → Dashboard
   - Falsche Zugangsdaten → Fehlermeldung
   - Abmelden → Login-Seite

2. **Projekt anlegen**
   - 3-Schritt-Wizard vollständig durchlaufen
   - Validierungsfehler anzeigen

3. **Foto hochladen**
   - Kameradialog öffnen
   - Datei auswählen
   - Thumbnail erscheint

4. **Checkliste abarbeiten**
   - Item auf DONE setzen
   - Item auf NOT_APPLICABLE setzen
   - Fortschrittsanzeige aktualisiert sich

5. **Mangel anlegen**
   - Formular ausfüllen
   - Priorität setzen
   - Mangel erscheint in Liste

### Playwright-Konfiguration (geplant)

```typescript
// playwright.config.ts
export default {
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    baseURL: 'http://localhost:3000',
    // Use pre-installed Chromium
    channel: 'chromium',
  },
}
```

## CI-Pipeline (geplant)

```yaml
# .github/workflows/test.yml
- name: TypeScript
  run: npx tsc --noEmit
- name: Lint
  run: npm run lint
- name: Unit Tests
  run: npx vitest run
- name: Build
  run: npm run build
```

## Coverage-Ziele

| Bereich | Ziel |
|---------|------|
| `src/lib/` | ≥ 80% |
| `src/features/*/actions.ts` | ≥ 60% |
| `src/features/*/view.tsx` | E2E |
| Gesamt | ≥ 50% |
