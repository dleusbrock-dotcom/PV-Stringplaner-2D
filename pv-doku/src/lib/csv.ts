import { COMPONENT_LABELS, PHOTO_LABELS } from "./constants";
import { countModules, positionLabel, powerKwp } from "./grid";
import type { ProjectSnapshot } from "./types";

// Tabellarischer Export (F-020). Semikolon + UTF-8-BOM, damit Excel (de-DE) die Datei direkt öffnet.

export const CSV_TABLES = {
  dachflaechen: "Dachflächen",
  raster: "Rasterpositionen",
  komponenten: "Komponenten",
  strings: "Strings",
  fotos: "Fotos",
  pruefwerte: "Prüfwerte",
  checkliste: "Checkliste",
  maengel: "Mängel",
} as const;

export type CsvTable = keyof typeof CSV_TABLES;

export function csvEscape(v: unknown): string {
  if (v == null) return "";
  let s = typeof v === "number" ? String(v).replace(".", ",") : String(v);
  // Formel-Injektion in Tabellenkalkulationen verhindern
  if (/^[=+\-@\t\r]/.test(s) && typeof v !== "number") s = `'${s}`;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return "﻿" + [header, ...rows].map((r) => r.map(csvEscape).join(";")).join("\r\n") + "\r\n";
}

export function snapshotToCsv(s: ProjectSnapshot, table: CsvTable): string {
  const pn = s.project.project_number;
  const mt = new Map(s.module_types.map((m) => [m.id, m]));
  const strings = new Map(s.strings.map((x) => [x.id, x]));
  const comps = new Map(s.components.map((c) => [c.id, c]));
  const roofs = new Map(s.roofs.map((r) => [r.id, r]));

  switch (table) {
    case "dachflaechen":
      return toCsv(
        ["Projektnummer", "Dachfläche", "Himmelsrichtung", "Dachform", "Neigung (°)", "Eindeckung", "Breite (m)", "Länge (m)",
          "Montageart", "Reihen", "Spalten", "Modulformat", "Modulhersteller", "Modultyp", "Nennleistung (Wp)", "Anzahl Module",
          "Leistung (kWp)", "Bemerkung"],
        s.roofs.map((r) => {
          const m = r.module_type_id ? mt.get(r.module_type_id) : undefined;
          const n = countModules(r.cells);
          return [pn, r.name, r.orientation, r.roof_type, r.tilt_deg, r.covering, r.width_m, r.length_m, r.mounting,
            r.grid_rows, r.grid_cols, r.module_orientation, m?.manufacturer, m?.model, m?.power_wp, n,
            powerKwp(n, m?.power_wp), r.remark];
        }),
      );
    case "raster":
      return toCsv(
        ["Projektnummer", "Dachfläche", "Position", "Reihe", "Spalte", "Belegung", "Beschriftung", "String", "Seriennummer"],
        s.roofs.flatMap((r) =>
          r.cells.map((c) => [pn, r.name, positionLabel(c.row, c.col), c.row + 1, c.col + 1, c.state, c.label,
            c.string_id ? strings.get(c.string_id)?.name : "", c.serial_no]),
        ),
      );
    case "komponenten":
      return toCsv(
        ["Projektnummer", "Kategorie", "Hersteller", "Modell", "Seriennummer", "Einbauort", "Inbetriebnahme", "Leistung (kW)",
          "Kapazität (kWh)", "Bemerkung"],
        s.components.map((c) => [pn, COMPONENT_LABELS[c.category], c.manufacturer, c.model, c.serial_no, c.location,
          c.commissioning_date, c.rated_power_kw, c.capacity_kwh, c.notes]),
      );
    case "strings": {
      const counts = new Map<string, number>();
      for (const r of s.roofs) for (const c of r.cells) if (c.string_id) counts.set(c.string_id, (counts.get(c.string_id) ?? 0) + 1);
      return toCsv(
        ["Projektnummer", "String", "Farbe", "Wechselrichter", "MPP-Tracker", "Anzahl Module"],
        s.strings.map((x) => {
          const inv = x.inverter_id ? comps.get(x.inverter_id) : undefined;
          return [pn, x.name, x.color, inv ? `${inv.manufacturer} ${inv.model}`.trim() : "", x.mpp_tracker, counts.get(x.id) ?? 0];
        }),
      );
    }
    case "fotos":
      return toCsv(
        ["Projektnummer", "Kategorie", "Dateiname", "Bildunterschrift", "Aufnahmedatum", "Dachfläche", "Komponente", "Speicherpfad"],
        s.files.map((f) => [pn, PHOTO_LABELS[f.category], f.file_name, f.caption, f.taken_at,
          f.roof_id ? roofs.get(f.roof_id)?.name : "", f.component_id ? comps.get(f.component_id)?.model : "", f.storage_path]),
      );
    case "pruefwerte":
      return toCsv(
        ["Projektnummer", "Prüfpunkt", "Pflicht", "Wert", "Einheit", "Status", "Kommentar"],
        s.test_values.map((t) => [pn, t.label, t.required ? "ja" : "nein", t.value, t.unit, t.status ?? "offen", t.comment]),
      );
    case "checkliste":
      return toCsv(
        ["Projektnummer", "Punkt", "Pflicht", "Status", "Kommentar"],
        s.checklist_items.map((c) => [pn, c.text, c.required ? "ja" : "nein", c.status ?? "offen", c.comment]),
      );
    case "maengel":
      return toCsv(
        ["Projektnummer", "Beschreibung", "Kategorie", "Priorität", "Verantwortlich", "Fällig", "Status"],
        s.defects.map((d) => [pn, d.description, d.category, d.priority, d.responsible, d.due_date, d.status]),
      );
  }
}
