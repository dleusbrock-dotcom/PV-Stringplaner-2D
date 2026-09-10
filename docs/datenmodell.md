# Datenmodell

## Überblick

Das Datenbankschema nutzt PostgreSQL 16 mit Prisma ORM 5. Alle Tabellen sind plural-snake_case benannt.

## Entity-Relationship-Diagramm (vereinfacht)

```
User ──────────────────────────────────────────────────────┐
 │ (1:n) createdProjects                                    │
 │ (n:m) managedProjects via ProjectMember                  │
 ▼                                                          │
Project ◄──── Customer ◄──── Contact                       │
 │                                                          │
 ├── Site                    (Standortdaten)                │
 ├── RoofArea[]              (Dachflächen)                  │
 │    ├── RoofObstacle[]     (Hindernisse)                  │
 │    └── ModulePlacement[]  (Modulpositionen)              │
 │         └── StringModuleAssignment (1:1)                 │
 │                                                          │
 ├── InverterInstance[]      (Wechselrichter-Instanzen)     │
 │    └── MPPTInput[]        (MPPT-Eingänge)                │
 │         └── StringPlan[]  (String-Planung)               │
 │              └── StringModuleAssignment[]                │
 │                                                          │
 ├── Checklist[]             (Checklisten)                  │
 │    ├── ChecklistTemplate  (Template-Referenz)            │
 │    └── ChecklistItem[]    (Einzelpositionen)             │
 │                                                          │
 ├── Photo[]                 (Fotodokumentation)            │
 ├── Defect[]                (Mängel)                       │
 │    └── DefectComment[]    (Kommentare)                   │
 │                                                          │
 ├── ProjectMaterial[]       (Material Soll/Ist)            │
 │    └── MaterialItem       (Materialkatalog)              │
 │                                                          │
 ├── ProjectComponent[]      (Verwendete Bauteile)          │
 │    ├── ComponentLibraryItem (Bibliotheksreferenz)        │
 │    └── SerialNumber[]      (Seriennummern)               │
 │                                                          │
 ├── Approval[] + Signature[] (Abnahme)                    │
 ├── ProjectDocument[]        (Dokumente/PDFs)              │
 ├── AuditLog[]               (Änderungsprotokoll)          │
 └── SyncOperation[]          (Offline-Sync-Queue)         │
                                                            │
ChecklistTemplate ──► ChecklistTemplateItem[]              │
ComponentLibraryItem ──► ComponentSnapshot[]              │
Role ──► RolePermission ──► Permission                    │
```

## Kernmodelle

### User
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | cuid | Primärschlüssel |
| email | String (unique) | Login-E-Mail |
| passwordHash | String? | bcryptjs-Hash |
| name | String? | Anzeigename |
| roleId | String? | FK → Role |

### Project
| Feld | Typ | Beschreibung |
|------|-----|--------------|
| id | cuid | Primärschlüssel |
| number | String (unique) | Projektnummer (PV-YYYYMM-XXXX) |
| name | String | Projektbezeichnung |
| status | ProjectStatus | DRAFT/PLANNING/CONSTRUCTION/INSPECTION/COMPLETED/ARCHIVED |
| qrCode | String? (unique) | QR-Code-Identifier |
| lockedAt | DateTime? | Sperrzeitpunkt |

### Enums

```typescript
enum ProjectStatus { DRAFT, PLANNING, CONSTRUCTION, INSPECTION, COMPLETED, ARCHIVED }
enum ChecklistItemStatus { OPEN, DONE, NOT_APPLICABLE, LOCKED }
enum DefectStatus { OPEN, IN_PROGRESS, RESOLVED, ACCEPTED }
enum DefectPriority { LOW, MEDIUM, HIGH, CRITICAL }
enum ComponentCategory { MODULE, INVERTER, BATTERY, OPTIMIZER, OTHER }
enum SyncStatus { PENDING, SYNCING, SYNCED, FAILED, CONFLICT }
```

## Besonderheiten

### Named Relations (Prisma)
Mehrfache Relationen zwischen denselben Modellen benötigen Named Relations:
- `Defect.createdBy` / `User.createdDefects` → `"DefectCreator"`
- `Defect.resolvedBy` / `User.resolvedDefects` → `"DefectResolver"`
- `Defect.photos` / `Photo.defect` → `"defect_photos"`
- `Project.createdBy` / `User.createdProjects` → `"ProjectCreator"`

### JSON-Felder
- `ComponentLibraryItem.dimensions` – `{width, height, depth}` in mm
- `Defect.position` – `{col, row}` Gitterposition
- `ProjectComponent.snapshotData` – Eingefrierter Bauteildatensatz
- `SyncOperation.payload` – Operationsnutzdaten

### Soft-Delete
Kein `deletedAt` auf Hauptentitäten außer `Customer`. Stattdessen:
- `ComponentLibraryItem.isActive = false` für Deaktivierung
- Projekte werden auf Status `ARCHIVED` gesetzt

### Cascade-Delete
Alle projektbezogenen Daten (RoofArea, Checklist, Photo, Defect, …) werden beim Löschen eines Projekts kaskadiert gelöscht.
