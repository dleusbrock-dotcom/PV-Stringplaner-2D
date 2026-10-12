# Anforderungsabdeckung (Lastenheft v1.0)

Status: ✅ umgesetzt · 🟡 teilweise / mit Einschränkung · ⏭ Ausbaustufe bzw. organisatorisch

## Funktionale Anforderungen

| ID | Prio | Anforderung | Status | Umsetzung | Nachweis |
|---|---|---|---|---|---|
| F-001 | MUSS | Anmeldung, Benutzerverwaltung | ✅ | E-Mail/Passwort (Supabase Auth), `proxy.ts`, Rollen in `profiles`, RLS in `…_security.sql`, Einladung `api/admin/users`, Verwaltung `/admin` | `db_test.sql` (Rollen, gesperrte Selbstregistrierung, anonym kein Zugriff) |
| F-002 | MUSS | Projektübersicht mit Suche/Filter | ✅ | Dashboard `(app)/page.tsx`: Suche Nr./Name/Bauherr, Ort, Status, Erstellungsdatum von–bis | manuell |
| F-003 | MUSS | Projektstammdaten | ✅ | Schritt *Stammdaten*, Pflichtfelder im Formular markiert, DB-Constraints, Autosave | `completeness.test.ts` |
| F-004 | MUSS | Bauherr und Standort | ✅ | Schritt *Bauherr*: Person/Firma, Adresse, Kontakt, abweichende Anlagenanschrift, Geokoordinaten | `completeness.test.ts`, PDF |
| F-005 | MUSS | Mehrere Dachflächen | ✅ | Registerkarten, anlegen/benennen/bearbeiten/duplizieren/löschen | manuell |
| F-006 | MUSS | Dachflächendaten | ✅ | Bezeichnung, Himmelsrichtung (8), Dachform, Neigung, Eindeckung, Maße, Montageart, Bemerkung | PDF-Test |
| F-007 | MUSS | Interaktives Modulraster | ✅ | `GridEditor.tsx`: Klick setzt/entfernt, Ziehen, Auswahl, „Alle belegen“, „Auswahl löschen“, „Raster zurücksetzen“; Speicherung `save_grid()` | `grid.test.ts` (5 × 10, 50 Positionen, Zählung), Browser-Test |
| F-008 | MUSS | Darstellung der Belegung | ✅ | Modul/frei/Hindernis/gesperrt unterscheidbar, Beschriftung, Hoch-/Querformat, Drehung 0/90/180/270°, Legende, PDF | `grid.test.ts` (Drehung) |
| F-009 | MUSS | Moduldaten | ✅ | Modultypen (Hersteller, Typ, Wp, Maße), Anzahl aus Raster, kWp je Fläche/gesamt, optionale Seriennummer je Modul | `grid.test.ts` (Leistung), `csv.test.ts` |
| F-010 | SOLL | String-/WR-Zuordnung | ✅ | Strings mit Farbe, WR und MPP-Tracker; Zuordnung per Werkzeug/Auswahl; Plausibilität als Warnung | `grid.test.ts`, `completeness.test.ts` |
| F-011 | MUSS | Komponentendokumentation | ✅ | WR, Speicher, Datenlogger, Smart Meter, Wallbox, Sonstige; mehrfach; Foto je Komponente | PDF |
| F-012 | MUSS | Foto- und Dateidokumentation | ✅ | Kamera/Dateiauswahl, 11 Kategorien, Bildunterschrift, Aufnahmedatum, Komprimierung, Galerie mit Kategorie-Vollständigkeit | PDF |
| F-013 | MUSS | Prüf-/Inbetriebnahmedaten | 🟡 | Konfigurierbare Vorlagen, Status geprüft/nicht geprüft/nicht zutreffend, Messwert + Einheit; **Katalog ist Platzhalter und fachlich freizugeben** | `db_test.sql`, `completeness.test.ts` |
| F-014 | MUSS | Checkliste | ✅ | Konfigurierbar, erledigt/nicht erledigt/n. z., Kommentar; Abweichung braucht Begründung | `db_test.sql` |
| F-015 | MUSS | Mängel und Restpunkte | ✅ | Beschreibung, Kategorie, Priorität, Foto, Verantwortlicher, Fälligkeit, Status; offen im Projekt und PDF hervorgehoben | `completeness.test.ts` |
| F-016 | SOLL | Unterschriften und Übergabe | ✅ | Unterschriftenfeld (Finger/Stift), Name, Ort, Zeitpunkt, Übergabekommentar; je Version | PDF |
| F-017 | MUSS | Vollständigkeitsprüfung | ✅ | Client (`completeness.ts`, Fehler + Warnungen mit Links) und Server (`project_completeness_errors()`, blockiert Abschluss) | `completeness.test.ts`, `db_test.sql` |
| F-018 | MUSS | Status und Freigabe | ✅ | 6 Status, `set_project_status()`, Rollenprüfung, Snapshot bei Abschluss, Sperre per Trigger, neue Version bei Wiedereröffnung | `db_test.sql`, `status.test.ts` |
| F-019 | MUSS | PDF-Dokumentation | ✅ | Deckblatt, Projekt/Bauherr, Übersicht, Dachflächen + Raster, Komponenten, Prüfwerte/Checkliste, Mängel, Fotos, Unterschriften, Datum; Logo/Kopf-/Fußzeile konfigurierbar; Entwurfs-Wasserzeichen; PDF je freigegebener Version | `report.test.tsx` |
| F-020 | SOLL | Export und Import | ✅ | JSON, CSV je Tabelle (Excel-kompatibel), ZIP-Backup inkl. Fotos; Import/Wiederherstellung | `csv.test.ts`, `report.test.tsx` |
| F-021 | SOLL | Autosave und Offline | 🟡 | Autosave, lokale Entwürfe, Nachsenden bei Verbindung, Konflikterkennung über `updated_at`; vollständige Offline-PWA ist Ausbaustufe | manuell |
| F-022 | MUSS | Änderungsprotokoll | ✅ | Trigger auf allen Tabellen, Statuswechsel, Exporte/PDF (`log_event`); Ansicht *Protokoll* | `db_test.sql` |

## Nichtfunktionale Anforderungen

| ID | Status | Umsetzung |
|---|---|---|
| NF-001 Bedienbarkeit | ✅ | Mobile-first, Bedienelemente ≥ 44 px, Schrittführung, verständliche Fehlermeldungen (`friendlyError`) |
| NF-002 Performance | ✅ | Bilder clientseitig auf max. 2000 px / JPEG 82 % komprimiert, Upload-Fortschritt, gebündelte signierte URLs |
| NF-003 Datenschutz | 🟡 | Löschung, Export (Auskunft), Datensparsamkeit; Fristen/AVV/Rechtsgrundlage organisatorisch offen |
| NF-004 Sicherheit | ✅ | HTTPS, Supabase Auth, RLS, serverseitige Validierung (Constraints/Trigger), sichere Uploads, Sicherheits-Header, Protokoll |
| NF-005 Verfügbarkeit/Backup | 🟡 | Plattform-Backups + Projekt-Backup/Restore; Wiederherstellungstest organisatorisch |
| NF-006 Wartbarkeit | ✅ | Modularer TS-Code, Migrationen, Tests, CI, getrennte Umgebungen per `.env` |
| NF-007 Browser | ✅ | Aktuelle Chrome/Edge/Safari, responsive ab 360 px |
| NF-008 Barrierearmut | ✅ | Tastaturbedienung (auch Raster), Fokusrahmen, ARIA-Rollen, Beschriftungen |
| NF-009 Skalierbarkeit | ✅ | `company_id` in allen Kernobjekten, RLS je Firma; Mandantenverwaltung in der UI ist Ausbaustufe |
| NF-010 Datenhoheit | ✅ | Vollständiger Export inkl. Dateien; Standard-PostgreSQL/S3, keine KI-Abhängigkeit |

## Abnahmekriterien des Gesamtprodukts (Kap. 10)

| Kriterium | Nachweis |
|---|---|
| Projekt inkl. Bauherr und abweichendem Standort anlegen | Schritte Stammdaten/Bauherr, `completeness.test.ts` |
| ≥ 3 Dachflächen mit unterschiedlichen Himmelsrichtungen | Dachflächen-Registerkarten (unbegrenzt) |
| 5 × 10-Raster, jede Position einzeln, Anzahl korrekt | `grid.test.ts`, Browser-Test |
| Leistung = Anzahl × Nennleistung | `grid.test.ts`, `csv.test.ts` |
| ≥ 2 Wechselrichter/Komponenten und mehrere Bilder | Komponenten/Fotos ohne Begrenzung |
| Fehlende Pflichtdaten verständlich angezeigt | Abschluss-Schritt, Punkte in der Schrittleiste |
| PDF enthält alle Inhalte inkl. grafischer Belegung | `report.test.tsx` |
| Abgeschlossene Projekte versioniert und gesperrt | `db_test.sql` |
| Berechtigungen verhindern unzulässige Zugriffe | `db_test.sql` |
| Kein Datenverlust bei Navigation/kurzem Verbindungsabbruch | Autosave mit lokalem Entwurf, Nachsenden bei `online` |

## Offene fachliche Festlegungen (Kap. 14)

Pflichtfelder/Mindestfotos je Projekttyp (Mindestfotos aktuell firmenweit konfigurierbar), Prüf- und Messwertkatalog,
Corporate Design des Berichts, Lösch-/Aufbewahrungsfristen, Hosting/AVV/Backup-Ziele, Verbindlichkeit der
String-Zuordnung, rechtliche Form der Unterschriften.
