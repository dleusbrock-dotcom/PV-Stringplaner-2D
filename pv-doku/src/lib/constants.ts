import type {
  AppRole,
  ComponentCategory,
  Orientation,
  PhotoCategory,
  ProjectStatus,
} from "./types";

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  entwurf: "Entwurf",
  in_bearbeitung: "In Bearbeitung",
  zur_pruefung: "Zur Prüfung",
  nacharbeit: "Nacharbeit erforderlich",
  abgeschlossen: "Abgeschlossen",
  archiviert: "Archiviert",
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Administrator",
  projektleiter: "Projektverantwortlicher",
  monteur: "Monteur / Dokumentierender",
  betrachter: "Betrachter",
};

export const ORIENTATIONS: Orientation[] = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"];

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  N: "Nord",
  NO: "Nordost",
  O: "Ost",
  SO: "Südost",
  S: "Süd",
  SW: "Südwest",
  W: "West",
  NW: "Nordwest",
};

export const COMPONENT_LABELS: Record<ComponentCategory, string> = {
  wechselrichter: "Wechselrichter",
  speicher: "Speicher",
  datenlogger: "Datenlogger",
  smart_meter: "Smart Meter",
  wallbox: "Wallbox",
  sonstiges: "Sonstige Komponente",
};

export const PHOTO_LABELS: Record<PhotoCategory, string> = {
  gesamtansicht: "Gesamtansicht",
  dachflaeche: "Dachfläche",
  unterkonstruktion: "Unterkonstruktion",
  module: "Module",
  wechselrichter: "Wechselrichter",
  speicher: "Speicher",
  zaehlerschrank: "Zählerschrank",
  schutztechnik: "Schutztechnik",
  beschriftung: "Beschriftung",
  mangel: "Mangel",
  sonstiges: "Sonstiges",
};

export const PHOTO_CATEGORIES = Object.keys(PHOTO_LABELS) as PhotoCategory[];

export const COMPONENT_PHOTO_CATEGORY: Record<ComponentCategory, PhotoCategory> = {
  wechselrichter: "wechselrichter",
  speicher: "speicher",
  datenlogger: "sonstiges",
  smart_meter: "zaehlerschrank",
  wallbox: "sonstiges",
  sonstiges: "sonstiges",
};

export const TEST_STATUS_LABELS = {
  geprueft: "geprüft",
  nicht_geprueft: "nicht geprüft",
  nicht_zutreffend: "nicht zutreffend",
} as const;

export const CHECK_STATUS_LABELS = {
  erledigt: "erledigt",
  nicht_erledigt: "nicht erledigt",
  nicht_zutreffend: "nicht zutreffend",
} as const;

export const DEFECT_PRIORITY_LABELS = { niedrig: "niedrig", mittel: "mittel", hoch: "hoch" } as const;
export const DEFECT_STATUS_LABELS = { offen: "offen", in_arbeit: "in Arbeit", erledigt: "erledigt" } as const;
export const DEFECT_CATEGORIES = ["Montage", "Elektrik", "Dach", "Dokumentation", "Restarbeit", "sonstiges"];

/** Gut unterscheidbare String-Farben (auch im Druck). */
export const STRING_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2", "#db2777", "#4d7c0f", "#9a3412", "#475569",
];

/** Schritte des Projektassistenten (Lastenheft Kap. 8). */
export const PROJECT_STEPS = [
  { slug: "stammdaten", label: "Stammdaten" },
  { slug: "bauherr", label: "Bauherr" },
  { slug: "dachflaechen", label: "Dachflächen" },
  { slug: "komponenten", label: "Komponenten" },
  { slug: "fotos", label: "Fotos" },
  { slug: "pruefung", label: "Prüfung" },
  { slug: "maengel", label: "Mängel" },
  { slug: "abschluss", label: "Abschluss" },
  { slug: "protokoll", label: "Protokoll" },
] as const;

export type ProjectStep = (typeof PROJECT_STEPS)[number]["slug"];

export const STORAGE_BUCKET = "project-files";
