# Lastenheft – PV-Stringplaner 2D (Extrahiert)

**Status**: Kein DOCX-Lastenheft im Repository gefunden. Anforderungen aus dem Aufgaben-Prompt extrahiert. Vorhandene HTML-Prototypen (`index.html`, `PV Stringplaner.html`) als UX-Referenz verwendet.

**Datum**: 2026-09-10  
**Quelle**: Aufgaben-Prompt + HTML-Prototyp-Analyse

---

## 1. Ziel der Anwendung

Mobile, offlinefähige Webanwendung für Photovoltaikprojekte – Planung, Baustellendokumentation und Abschluss.

### Kernprozesse

1. Projekt anlegen
2. Kunden- und Standortdaten erfassen
3. Dachflächen erfassen
4. Hindernisse dokumentieren
5. Module platzieren
6. Strings planen
7. Strings Wechselrichtern und MPPT-Eingängen zuordnen
8. Projekt per QR-Code auf der Baustelle öffnen
9. Projekt offline auf dem Smartphone bearbeiten
10. Plan- und Ist-Zustand vergleichen
11. Fotos und Typenschilder aufnehmen
12. Checklisten bearbeiten
13. Seriennummern erfassen
14. Materialverbrauch dokumentieren
15. Abweichungen und Mängel erfassen
16. Mängel bearbeiten und abschließen
17. Digitale Freigaben und Unterschriften erfassen
18. Projekt auf Vollständigkeit prüfen
19. Vollständige PDF-Anlagendokumentation erzeugen
20. Projekt abschließen und revisionssicher sperren
21. Projektdaten für spätere Serviceeinsätze bereitstellen

---

## 2. Produktprinzipien

1. **Mobile First** – Smartphone ist primärer Anwendungsfall
2. **Offline First** – Kernfunktionen ohne Internet nutzbar
3. **Progressive Web App** – Installierbar, app-ähnlich
4. **Autosave** – Automatische lokale Zwischenspeicherung
5. **Geführte Bedienung** – Klarer Arbeitsfluss, Fortschrittsanzeige
6. **Plan und Ist getrennt** – Kein unkontrolliertes Überschreiben
7. **Daten nur einmal erfassen** – Wiederverwendung in allen Phasen
8. **Nachvollziehbarkeit** – Änderungshistorie mit Benutzer/Zeit
9. **Kein stiller Datenverlust** – Fehler immer anzeigen
10. **Fachliche Unterstützung** – Elektrische Prüfungen als Hilfe, nicht als Ersatz

---

## 3. Technischer Stack

### Frontend
- Next.js 14 mit App Router
- React 18
- TypeScript Strict Mode
- Tailwind CSS
- shadcn/ui
- Lucide Icons
- React Hook Form + Zod
- Zustand
- TanStack Query

### Backend
- Next.js Server Actions / Route Handler
- PostgreSQL
- Prisma ORM

### Authentifizierung
- Auth.js (NextAuth)
- Rollenbasierte Zugriffskontrolle
- Serverseitige Berechtigungsprüfung

### Offline
- PWA + Service Worker
- IndexedDB + Dexie.js
- Synchronisationswarteschlange

### Dateien/Bilder
- Abstrahierter File-Storage (lokal + S3-kompatibel)
- Clientseitige Bildkomprimierung
- Offline-Zwischenspeicherung

### PDF
- Serverseitige Erzeugung mit Playwright
- HTML/CSS-basiertes Layout

### Tests
- Vitest + React Testing Library
- Playwright (E2E)

---

## 4. Fachliche Module

### A. Projektmanagement
- Anlegen, Bearbeiten, Duplizieren, Archivieren
- Status, Projektnummer, Kunde, Standort, Ansprechpartner, Verantwortliche

### B. QR-Code-Projektzugriff
- Eindeutiger QR-Code je Projekt
- Direkter Einstieg in mobile Projektansicht

### C. Dachflächen
- Mehrere pro Projekt, Ausrichtung, Neigung, Raster
- Hintergrundfoto, Zoom, Verschieben
- Plan- und Ist-Ansicht

### D. Hindernisbibliothek
- Dachfenster, Schornstein, Entlüfter, Lichtkuppel, Antenne, Blitzschutz
- Freie Bezeichnung, Position, Größe

### E. Modulanordnung
- Touch-Platzierung, Mehrfachauswahl, Reihenbearbeitung
- Gesamtleistung, eindeutige Position

### F. Stringplanung
- Mehrere Strings, Farben, aktive Auswahl
- Reihenfolge, Undo, Polarität, Verbindungslinien
- Modulkennzeichnung (S1-M01), dachflächenübergreifend

### G. Wechselrichter und MPPT
- Aus Bibliothek oder manuell
- String-zu-MPPT-Zuordnung
- Plausibilitätswarnungen

### H. Komponentenbibliothek
- Module, Wechselrichter, Speicher, Optimierer
- Versionierte Komponenten, eingefrorene Snapshots

### I. Baustellenmodus
- Offline-Download, Status, geführte Schritte
- Plan-Ist-Abgleich, Autosave

### J. Checklisten
- Unterkonstruktion, Module, DC-Verkabelung, WR, Speicher, Beschriftung, Inbetriebnahme, Einweisung
- Status: offen/erledigt/nicht zutreffend/gesperrt

### K. Fotodokumentation
- Kamera, Offline, Komprimierung, Kategorien
- Pflichtfotos, fehlende Kategorien anzeigen

### L. Seriennummern
- Manuell + Scan, Typenschildfoto

### M. Material
- Soll/Ist, Mehrverbrauch, Stückliste

### N. Mängel und Abweichungen
- Titel, Beschreibung, Kategorie, Priorität, Status, Fotos
- Kritische Mängel verhindern Abschluss

### O. Freigaben und Unterschriften
- Touchscreen-Unterschrift, Änderungen invalidieren Freigabe

### P. Projektabschluss
- Vollständigkeitsprüfung, Abschlussversion, Sperre

### Q. Serviceansicht
- Kompakte Anlagendaten, Stringplan, Mängel-Historie

---

## 5. Datenmodell (Kernentitäten)

User, Role, Permission, Project, Customer, Contact, Site, RoofArea, RoofObstacle, ModulePlacement, PVModuleModel, InverterModel, InverterInstance, MPPTInput, BatteryModel, BatteryInstance, OptimizerModel, StringPlan, StringModuleAssignment, ProjectComponent, ChecklistTemplate, Checklist, ChecklistItem, Photo, PhotoCategory, SerialNumber, MaterialItem, ProjectMaterial, Defect, DefectComment, Approval, Signature, ProjectDocument, SyncOperation, AuditLog, ProjectVersion

---

## 6. Nicht-funktionale Anforderungen

- Offline-Kernfunktionen
- Responsiv: Smartphone, Tablet, Desktop
- Datenschutz (DSGVO-konform)
- Sichere Authentifizierung und Autorisierung
- Strukturierte Fehlerbehandlung und Logs
- Reproduzierbare PDF-Generierung
- Dockerisiertes Deployment
