// Datentypen entsprechend dem Datenbankschema (supabase/migrations)

export type AppRole = "admin" | "projektleiter" | "monteur" | "betrachter";

export type ProjectStatus =
  | "entwurf"
  | "in_bearbeitung"
  | "zur_pruefung"
  | "nacharbeit"
  | "abgeschlossen"
  | "archiviert";

export type Orientation = "N" | "NO" | "O" | "SO" | "S" | "SW" | "W" | "NW";

export type ComponentCategory = "wechselrichter" | "speicher" | "datenlogger" | "smart_meter" | "wallbox" | "sonstiges";

export type PhotoCategory =
  | "gesamtansicht"
  | "dachflaeche"
  | "unterkonstruktion"
  | "module"
  | "wechselrichter"
  | "speicher"
  | "zaehlerschrank"
  | "schutztechnik"
  | "beschriftung"
  | "mangel"
  | "sonstiges";

export interface Company {
  id: string;
  name: string;
  address: string;
  logo_path: string | null;
  report_header: string;
  report_footer: string;
  required_photo_categories: PhotoCategory[];
  updated_at: string;
}

export interface Profile {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  role: AppRole;
  active: boolean;
}

export interface Project {
  id: string;
  company_id: string;
  project_number: string;
  name: string;
  installation_date: string | null;
  contractor: string;
  installer_id: string | null;
  installer_name: string;
  status: ProjectStatus;
  version: number;
  notes: string;
  client_type: "person" | "firma";
  client_first_name: string;
  client_last_name: string;
  client_company: string;
  client_street: string;
  client_house_no: string;
  client_zip: string;
  client_city: string;
  client_country: string;
  client_phone: string;
  client_email: string;
  site_differs: boolean;
  site_street: string;
  site_house_no: string;
  site_zip: string;
  site_city: string;
  site_country: string;
  site_lat: number | null;
  site_lng: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleType {
  id: string;
  project_id: string;
  manufacturer: string;
  model: string;
  power_wp: number;
  width_mm: number | null;
  height_mm: number | null;
  updated_at?: string;
}

export interface RoofSurface {
  id: string;
  project_id: string;
  sort: number;
  name: string;
  orientation: Orientation | null;
  roof_type: string;
  tilt_deg: number | null;
  covering: string;
  width_m: number | null;
  length_m: number | null;
  mounting: string;
  remark: string;
  grid_rows: number;
  grid_cols: number;
  module_orientation: "hoch" | "quer";
  view_rotation: 0 | 90 | 180 | 270;
  module_type_id: string | null;
  updated_at?: string;
}

export type CellState = "modul" | "hindernis" | "gesperrt";

export interface GridCell {
  row: number;
  col: number;
  state: CellState;
  label: string;
  string_id: string | null;
  serial_no: string;
}

export interface PvString {
  id: string;
  project_id: string;
  name: string;
  color: string;
  inverter_id: string | null;
  mpp_tracker: string;
}

export interface Component {
  id: string;
  project_id: string;
  category: ComponentCategory;
  manufacturer: string;
  model: string;
  serial_no: string;
  location: string;
  commissioning_date: string | null;
  rated_power_kw: number | null;
  capacity_kwh: number | null;
  notes: string;
  updated_at?: string;
}

export interface FileRow {
  id: string;
  project_id: string;
  category: PhotoCategory;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  caption: string;
  taken_at: string | null;
  roof_id: string | null;
  component_id: string | null;
  defect_id: string | null;
  created_at: string;
}

export interface TestValue {
  id: string;
  project_id: string;
  sort: number;
  label: string;
  unit: string;
  required: boolean;
  value: string;
  status: "geprueft" | "nicht_geprueft" | "nicht_zutreffend" | null;
  comment: string;
}

export interface ChecklistItem {
  id: string;
  project_id: string;
  sort: number;
  text: string;
  required: boolean;
  status: "erledigt" | "nicht_erledigt" | "nicht_zutreffend" | null;
  comment: string;
}

export interface Defect {
  id: string;
  project_id: string;
  description: string;
  category: string;
  priority: "niedrig" | "mittel" | "hoch";
  responsible: string;
  due_date: string | null;
  status: "offen" | "in_arbeit" | "erledigt";
  created_at: string;
}

export interface Signature {
  id: string;
  project_id: string;
  version: number;
  signer_role: "dokumentierender" | "bauherr";
  signer_name: string;
  place: string;
  signed_at: string;
  image_data: string;
  comment: string;
}

export interface Template {
  id: string;
  company_id: string;
  kind: "checkliste" | "pruefung";
  sort: number;
  text: string;
  unit: string;
  required: boolean;
  active: boolean;
}

export interface AuditEntry {
  id: number;
  project_id: string | null;
  user_email: string;
  at: string;
  action: string;
  object_type: string;
  object_id: string | null;
  version: number | null;
  details: Record<string, unknown>;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version: number;
  status: ProjectStatus;
  comment: string;
  created_at: string;
}

/** Dachfläche inklusive Rasterzellen, wie im Snapshot und im Editor verwendet. */
export interface RoofWithCells extends RoofSurface {
  cells: GridCell[];
}

/** Vollständige Projektdaten (entspricht public.project_snapshot()). */
export interface ProjectSnapshot {
  format: "pv-doku-project";
  format_version: number;
  exported_at: string;
  project: Project;
  company: Pick<Company, "name" | "address" | "logo_path" | "report_header" | "report_footer"> | null;
  members: { user_id: string; full_name: string; email: string; role: AppRole }[];
  module_types: ModuleType[];
  roofs: RoofWithCells[];
  strings: PvString[];
  components: Component[];
  files: FileRow[];
  test_values: TestValue[];
  checklist_items: ChecklistItem[];
  defects: Defect[];
  signatures: Signature[];
}
