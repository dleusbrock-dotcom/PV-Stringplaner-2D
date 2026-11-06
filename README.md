# PV-Stringplaner – 2D Photovoltaik GmbH

Clientseitige Web-Anwendung zur Planung der Modulanordnung und String-Verschaltung von PV-Anlagen
(umgesetzt nach Lastenheft v1.11).

## Nutzung
- `index.html` im Browser öffnen – keine Installation, kein Server nötig. Alle Daten bleiben im Browser.
- **Speichern:** „JSON exportieren“ (inkl. Fotos). **Laden:** „Öffnen“ und JSON-Datei wählen.
- **Dokumentation:** „Drucken / PDF“ – zeigt nur verschaltete Module, mit Briefkopf, Projektadresse,
  String-Tabelle, Wechselrichter-Belegung, Speicher, Fotos und Kennzahlen.

## Als App auf dem Smartphone (FA-8.6)
Den Ordner unter einer festen HTTPS-Adresse bereitstellen (z. B. GitHub Pages:
Settings → Pages → Branch wählen). Dann im Browser „Zum Home-Bildschirm“ wählen.
`manifest.webmanifest` und `sw.js` sorgen für Vollbild-Start und Offline-Betrieb nach dem ersten Laden.

## Dateien
| Datei | Zweck |
|---|---|
| `index.html` | Komplette Anwendung (HTML/CSS/JS, Logo eingebettet) |
| `manifest.webmanifest`, `icons/` | Homescreen-App |
| `sw.js` | Offline-Cache der Anwendungsdateien |
