# Anforderungsmatrix – PV-Stringplaner 2D

**Letzte Aktualisierung**: 2026-09-10  
**Quelle**: Aufgaben-Prompt (kein DOCX-Lastenheft vorhanden)

---

| ID | Bezeichnung | Beschreibung | Priorität | Rolle | Bereich | Baustein | Abnahmekriterium | Status |
|----|-------------|-------------|-----------|-------|---------|---------|-----------------|--------|
| A01 | Projekt anlegen | Neues PV-Projekt mit Name, Nummer, Kunde, Standort erstellen | Muss | Planer | Projektmanagement | Project-Feature | Projekt erscheint in Liste mit korrekten Daten | Offen |
| A02 | Projekt bearbeiten | Projektdaten nachträglich ändern | Muss | Planer | Projektmanagement | Project-Feature | Änderungen persistent gespeichert | Offen |
| A03 | Projekt duplizieren | Bestehende Projektstruktur kopieren | Soll | Planer | Projektmanagement | Project-Feature | Kopie mit neuem Namen angelegt | Offen |
| A04 | Projektstatus | Status-Workflow: Entwurf→Planung→Baustelle→Abnahme→Abgeschlossen | Muss | Planer | Projektmanagement | Project-Feature | Statusübergänge korrekt, mit Bedingungen | Offen |
| A05 | Projektarchivierung | Abgeschlossene Projekte archivieren | Soll | Admin | Projektmanagement | Project-Feature | Archivierte Projekte ausblendbar | Offen |
| B01 | QR-Code erstellen | Eindeutiger QR-Code je Projekt | Muss | Planer | QR-Code | QR-Feature | QR-Code generiert, als PNG downloadbar | Offen |
| B02 | QR-Code scannen | Baustellenmitarbeiter scannt QR und öffnet Projekt | Muss | Monteur | QR-Code | QR-Feature | Direkter Einstieg in mobile Ansicht | Offen |
| C01 | Dachfläche anlegen | Dachflächen mit Bezeichnung, Ausrichtung, Neigung erfassen | Muss | Planer | Dachflächen | RoofArea-Feature | Dachfläche gespeichert, im Plan sichtbar | Offen |
| C02 | Hintergrundfoto | Foto/Plan als Hintergrund der Dachfläche | Soll | Planer | Dachflächen | RoofArea-Feature | Foto hinterlegt, als Hintergrund angezeigt | Offen |
| C03 | Zoom und Pan | Canvas zoombar und verschiebbar | Muss | Planer | Dachflächen | Canvas | Zoom/Pan auf Touch und Maus | Offen |
| C04 | Deaktivierte Bereiche | Nicht belegbare Zellen markieren | Muss | Planer | Dachflächen | Canvas | Zellen deaktiviert, keine Modul-Platzierung | Offen |
| D01 | Hindernisse platzieren | Dachfenster, Schornstein etc. positionieren | Muss | Planer | Hindernisse | Obstacle-Feature | Hindernisse auf Canvas sichtbar | Offen |
| D02 | Hindernisbibliothek | Standardtypen + freie Bezeichnung | Muss | Planer | Hindernisse | Obstacle-Feature | Alle Standardtypen auswählbar | Offen |
| E01 | Module platzieren | Module per Touch/Klick auf Rasterzelle setzen | Muss | Planer | Module | Module-Feature | Modul erscheint auf Canvas, Daten gespeichert | Offen |
| E02 | Mehrfachauswahl | Mehrere Module gleichzeitig auswählen/bearbeiten | Muss | Planer | Module | Module-Feature | Mehrfachauswahl funktioniert | Offen |
| E03 | Modulanzahl/Leistung | Automatische Berechnung Modulanzahl und Gesamtleistung | Muss | Planer | Module | Module-Feature | Korrekte Berechnung angezeigt | Offen |
| F01 | String anlegen | Strings mit Farbe und Nummer anlegen | Muss | Planer | Stringplanung | String-Feature | String erscheint in Liste mit Farbe | Offen |
| F02 | Modulzuordnung | Module einem String zuordnen (Reihenfolge definiert) | Muss | Planer | Stringplanung | String-Feature | Module im String, Reihenfolge korrekt | Offen |
| F03 | Undo-Funktion | Letzte Zuordnung rückgängig machen | Muss | Planer | Stringplanung | String-Feature | Undo entfernt letzte Modulzuordnung | Offen |
| F04 | Verbindungslinien | Direkte oder orthogonale Verbindungslinien zwischen Modulen | Soll | Planer | Stringplanung | Canvas | Linien auf Canvas sichtbar | Offen |
| F05 | Modulkennzeichnung | Eindeutige Kennung (z.B. S1-M01) | Muss | Planer | Stringplanung | String-Feature | Jedes Modul eindeutig gekennzeichnet | Offen |
| G01 | Wechselrichter anlegen | WR aus Bibliothek oder manuell | Muss | Planer | Wechselrichter | Inverter-Feature | WR im Projekt gespeichert | Offen |
| G02 | MPPT-Zuordnung | Strings MPPT-Eingängen zuordnen | Muss | Planer | Wechselrichter | Inverter-Feature | Zuordnung persistent, fehlende erkannt | Offen |
| G03 | Plausibilitätswarnungen | Unplausible Stringlängen und Ausrichtungen melden | Muss | Planer | Wechselrichter | Validation | Warnungen verständlich angezeigt | Offen |
| H01 | Komponentenbibliothek | Suche und Filter für Module, WR, Speicher | Muss | Planer | Bibliothek | Library-Feature | Komponenten suchbar, filterbar | Offen |
| H02 | Snapshot einfrieren | Verwendete Komponentendaten im Projekt einfrieren | Muss | System | Bibliothek | Library-Feature | Snapshot unveränderlich im Projekt | Offen |
| I01 | Offline-Download | Projekt für Offline-Nutzung laden | Muss | Monteur | Baustellenmodus | Offline | Daten in IndexedDB, ohne Netz nutzbar | Offen |
| I02 | Synchronisationsstatus | Sichtbarer Status: offline/ausstehend/sync/Konflikt | Muss | Monteur | Baustellenmodus | Sync | Status jederzeit sichtbar | Offen |
| I03 | Plan-Ist-Abgleich | Plan und Ist vergleichbar | Muss | Monteur | Baustellenmodus | Comparison | Abweichungen sichtbar markiert | Offen |
| J01 | Checklisten | 8 Standardchecklisten mit Items | Muss | Monteur | Checklisten | Checklist-Feature | Alle Checklisten bearbeitbar | Offen |
| J02 | Checklisten-Status | offen/erledigt/nicht zutreffend/gesperrt | Muss | Monteur | Checklisten | Checklist-Feature | Status pro Item setzbar | Offen |
| K01 | Kamera-Integration | Direkt Kamera öffnen, Fotos aufnehmen | Muss | Monteur | Fotos | Photo-Feature | Kamera öffnet sich, Foto wird gespeichert | Offen |
| K02 | Offline-Fotospeicherung | Fotos offline in IndexedDB/Cache | Muss | Monteur | Fotos | Photo-Feature | Foto ohne Netz aufgenommen und gespeichert | Offen |
| K03 | Fotokategorien | Pflichtfotokategorien, fehlende anzeigen | Muss | Monteur | Fotos | Photo-Feature | Fehlende Pflichtfotos erkannt | Offen |
| L01 | Seriennummern | Manuelle Erfassung und Scan | Muss | Monteur | Seriennummern | Serial-Feature | Seriennummer zugeordnet | Offen |
| M01 | Materialübersicht | Soll/Ist-Vergleich, Stückliste | Muss | Monteur | Material | Material-Feature | Stückliste korrekt | Offen |
| N01 | Mangel anlegen | Titel, Beschreibung, Kategorie, Priorität, Foto | Muss | Monteur | Mängel | Defect-Feature | Mangel gespeichert | Offen |
| N02 | Mängelsperre | Kritische Mängel verhindern Projektabschluss | Muss | System | Mängel | Defect-Feature | Abschluss bei offenem kritischen Mangel verhindert | Offen |
| O01 | Unterschriften | Touchscreen-Unterschrift erfassen | Muss | Monteur/Bauleitung | Freigaben | Signature-Feature | Unterschrift gespeichert, Zeitpunkt korrekt | Offen |
| O02 | Freigabe-Invalidierung | Änderungen nach Freigabe invalidieren diese | Muss | System | Freigaben | Signature-Feature | Freigabe als ungültig markiert bei Änderung | Offen |
| P01 | Vollständigkeitsprüfung | Alle Pflichtangaben, -fotos, -checklisten prüfen | Muss | Planer/Bauleitung | Abschluss | Completion-Feature | Vollständigkeit korrekt berechnet | Offen |
| P02 | Projektsperre | Abgeschlossenes Projekt sperren | Muss | Admin | Abschluss | Completion-Feature | Gesperrtes Projekt nicht bearbeitbar | Offen |
| P03 | PDF-Dokumentation | Vollständige Anlagendokumentation als PDF | Muss | Admin | Dokumente | PDF-Feature | PDF generiert mit allen Pflichtinhalten | Offen |
| Q01 | Serviceansicht | Kompakte Anlagendaten für Service | Soll | Techniker | Service | Service-Feature | Alle relevanten Daten auf einer Seite | Offen |
| NF01 | Mobile First | Primäre Nutzung auf Smartphone | Muss | Alle | UI/UX | UI | Alle Kernfunktionen auf 375px nutzbar | Offen |
| NF02 | PWA-Installation | App auf Homescreen installierbar | Muss | Alle | PWA | PWA | Install-Prompt erscheint, App installierbar | Offen |
| NF03 | Autosave | Eingaben automatisch lokal speichern | Muss | Alle | Datenhaltung | Autosave | Eingaben nach Reload noch vorhanden | Offen |
| NF04 | Auditlog | Relevante Änderungen protokollieren | Muss | System | Audit | AuditLog | Änderungen mit User/Zeit gespeichert | Offen |
| NF05 | Rollenbasierte Rechte | Admin, Planer, Monteur, Bauleitung, Techniker | Muss | System | Auth | Auth | Unbefugter Zugriff verhindert | Offen |
| NF06 | Docker-Deployment | Lokal via Docker Compose startbar | Muss | DevOps | Deployment | Docker | `docker compose up` startet alle Services | Offen |
