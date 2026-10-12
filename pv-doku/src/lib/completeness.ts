import { COMPONENT_LABELS, PHOTO_LABELS, type ProjectStep } from "./constants";
import { countModules } from "./grid";
import type {
  ChecklistItem,
  Component,
  Defect,
  FileRow,
  ModuleType,
  PhotoCategory,
  Project,
  PvString,
  RoofWithCells,
  Signature,
  TestValue,
} from "./types";

// Vollständigkeitsprüfung (F-017). Fehler entsprechen public.project_completeness_errors() und
// verhindern den Abschluss; Warnungen werden angezeigt, blockieren aber nicht.

export interface Issue {
  level: "error" | "warning";
  step: ProjectStep;
  message: string;
}

export interface CompletenessInput {
  project: Project;
  roofs: RoofWithCells[];
  moduleTypes: ModuleType[];
  strings: PvString[];
  components: Component[];
  files: Pick<FileRow, "category" | "component_id">[];
  testValues: TestValue[];
  checklist: ChecklistItem[];
  defects: Defect[];
  signatures: Pick<Signature, "signer_role">[];
  requiredPhotoCategories: PhotoCategory[];
}

const blank = (v: string | null | undefined) => !v || v.trim() === "";

export function checkCompleteness(d: CompletenessInput): Issue[] {
  const issues: Issue[] = [];
  const err = (step: ProjectStep, message: string) => issues.push({ level: "error", step, message });
  const warn = (step: ProjectStep, message: string) => issues.push({ level: "warning", step, message });
  const p = d.project;

  // Stammdaten
  if (blank(p.project_number)) err("stammdaten", "Projektnummer fehlt");
  if (blank(p.name)) err("stammdaten", "Projektname fehlt");
  if (!p.installation_date) err("stammdaten", "Installationsdatum fehlt");
  if (blank(p.contractor)) err("stammdaten", "Ausführendes Unternehmen fehlt");
  if (blank(p.installer_name) && !p.installer_id) err("stammdaten", "Verantwortlicher Monteur fehlt");

  // Bauherr und Standort
  if ((p.client_type === "person" && blank(p.client_last_name)) || (p.client_type === "firma" && blank(p.client_company)))
    err("bauherr", "Name bzw. Firma des Bauherrn fehlt");
  if (blank(p.client_street) || blank(p.client_zip) || blank(p.client_city)) err("bauherr", "Anschrift des Bauherrn unvollständig");
  if (blank(p.client_phone) && blank(p.client_email)) warn("bauherr", "Keine Kontaktmöglichkeit (Telefon/E-Mail) zum Bauherrn");
  if (p.site_differs && (blank(p.site_street) || blank(p.site_zip) || blank(p.site_city)))
    err("bauherr", "Abweichende Anlagenanschrift unvollständig");

  // Dachflächen und Module
  if (d.roofs.length === 0) err("dachflaechen", "Keine Dachfläche angelegt");
  const moduleTypes = new Map(d.moduleTypes.map((m) => [m.id, m]));
  for (const r of d.roofs) {
    const n = countModules(r.cells);
    const mt = r.module_type_id ? moduleTypes.get(r.module_type_id) : undefined;
    if (!r.orientation) err("dachflaechen", `Dachfläche „${r.name}“: Himmelsrichtung fehlt`);
    if (n === 0) err("dachflaechen", `Dachfläche „${r.name}“: keine Module belegt`);
    if (n > 0 && (!mt || !(mt.power_wp > 0))) err("dachflaechen", `Dachfläche „${r.name}“: Modultyp mit Nennleistung fehlt`);
    else if (n > 0 && mt && (blank(mt.manufacturer) || blank(mt.model)))
      err("dachflaechen", `Dachfläche „${r.name}“: Hersteller/Typ des Moduls fehlt`);
    if (r.tilt_deg == null) warn("dachflaechen", `Dachfläche „${r.name}“: Dachneigung fehlt`);
    if (blank(r.roof_type) || blank(r.covering)) warn("dachflaechen", `Dachfläche „${r.name}“: Dachform/Eindeckung fehlt`);
  }

  // Strings (SOLL)
  if (d.strings.length > 0) {
    const unassigned = d.roofs.reduce(
      (s, r) => s + r.cells.filter((c) => c.state === "modul" && !c.string_id).length,
      0,
    );
    if (unassigned > 0) warn("dachflaechen", `${unassigned} Modul(e) ohne String-Zuordnung`);
    for (const s of d.strings) if (!s.inverter_id) warn("dachflaechen", `String „${s.name}“ ohne Wechselrichter-Zuordnung`);
  }

  // Komponenten
  if (!d.components.some((c) => c.category === "wechselrichter")) err("komponenten", "Kein Wechselrichter erfasst");
  for (const c of d.components) {
    const label = `${COMPONENT_LABELS[c.category]}${c.model ? ` „${c.model}“` : ""}`;
    if (blank(c.manufacturer) || blank(c.model)) err("komponenten", `${label}: Hersteller oder Modell fehlt`);
    if (blank(c.serial_no)) warn("komponenten", `${label}: Seriennummer fehlt`);
    if (!d.files.some((f) => f.component_id === c.id)) warn("komponenten", `${label}: kein Foto hinterlegt`);
  }

  // Fotos
  for (const cat of d.requiredPhotoCategories)
    if (!d.files.some((f) => f.category === cat)) err("fotos", `Pflichtfoto fehlt: ${PHOTO_LABELS[cat] ?? cat}`);
  if (d.files.length > 0 && !d.files.some((f) => f.category === "module")) warn("fotos", "Kein Foto der Module");

  // Prüfwerte
  for (const t of d.testValues) {
    if (t.required && !t.status) err("pruefung", `Pflichtprüfung nicht bearbeitet: ${t.label}`);
    else if (t.required && t.status === "geprueft" && t.unit && blank(t.value))
      err("pruefung", `Messwert fehlt: ${t.label}`);
    else if (t.status === "nicht_geprueft") warn("pruefung", `Nicht geprüft: ${t.label}`);
  }

  // Checkliste
  for (const c of d.checklist) {
    if (c.required && !c.status) err("pruefung", `Checkliste nicht bearbeitet: ${c.text}`);
    else if (c.required && c.status === "nicht_erledigt" && blank(c.comment))
      err("pruefung", `Abweichung ohne Begründung: ${c.text}`);
    else if (c.status === "nicht_erledigt") warn("pruefung", `Begründete Abweichung: ${c.text}`);
  }

  // Mängel
  for (const m of d.defects) {
    if (m.status === "erledigt") continue;
    if (m.priority === "hoch") err("maengel", `Offener Mangel (hoch): ${m.description}`);
    else warn("maengel", `Offener Mangel: ${m.description}`);
  }

  // Unterschriften (SOLL)
  for (const role of ["dokumentierender", "bauherr"] as const)
    if (!d.signatures.some((s) => s.signer_role === role))
      warn("abschluss", `Unterschrift ${role === "bauherr" ? "Bauherr/Empfänger" : "Dokumentierender"} fehlt`);

  return issues;
}

export function summarize(issues: Issue[]) {
  return {
    errors: issues.filter((i) => i.level === "error").length,
    warnings: issues.filter((i) => i.level === "warning").length,
  };
}
