import type { CompletenessInput } from "@/lib/completeness";
import type { GridCell, Project, RoofWithCells } from "@/lib/types";

// Synthetische Beispieldaten (keine Echtdaten)
export function project(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1", company_id: "c1", project_number: "TEST-0001", name: "Testanlage", installation_date: "2026-10-01",
    contractor: "Beispiel Solar GmbH", installer_id: null, installer_name: "Max Beispiel", status: "in_bearbeitung", version: 1,
    notes: "", client_type: "person", client_first_name: "Erika", client_last_name: "Mustermann", client_company: "",
    client_street: "Musterweg", client_house_no: "1", client_zip: "12345", client_city: "Musterstadt", client_country: "Deutschland",
    client_phone: "0000 000000", client_email: "", site_differs: false, site_street: "", site_house_no: "", site_zip: "",
    site_city: "", site_country: "Deutschland", site_lat: null, site_lng: null, created_by: null,
    created_at: "2026-10-01T08:00:00Z", updated_at: "2026-10-01T08:00:00Z",
    ...overrides,
  };
}

export function modules(n: number, cols = 10, stringId: string | null = null): GridCell[] {
  return Array.from({ length: n }, (_, i) => ({
    row: Math.floor(i / cols), col: i % cols, state: "modul" as const, label: "", string_id: stringId, serial_no: "",
  }));
}

export function roof(overrides: Partial<RoofWithCells> = {}): RoofWithCells {
  return {
    id: "r1", project_id: "p1", sort: 0, name: "Haus Süd", orientation: "S", roof_type: "Satteldach", tilt_deg: 35,
    covering: "Ziegel", width_m: null, length_m: null, mounting: "Aufdach", remark: "", grid_rows: 5, grid_cols: 10,
    module_orientation: "hoch", view_rotation: 0, module_type_id: "m1", cells: modules(20),
    ...overrides,
  };
}

export function completeInput(): CompletenessInput {
  return {
    project: project(),
    roofs: [roof()],
    moduleTypes: [{ id: "m1", project_id: "p1", manufacturer: "Beispiel", model: "BX-450", power_wp: 450, width_mm: null, height_mm: null }],
    strings: [],
    components: [{
      id: "k1", project_id: "p1", category: "wechselrichter", manufacturer: "Beispiel", model: "WR-10", serial_no: "SN1",
      location: "Keller", commissioning_date: "2026-10-01", rated_power_kw: 10, capacity_kwh: null, notes: "",
    }],
    files: [
      { category: "gesamtansicht", component_id: null },
      { category: "wechselrichter", component_id: "k1" },
      { category: "zaehlerschrank", component_id: null },
      { category: "module", component_id: null },
    ],
    testValues: [{ id: "t1", project_id: "p1", sort: 1, label: "Isolationswiderstand", unit: "MΩ", required: true, value: "20", status: "geprueft", comment: "" }],
    checklist: [{ id: "c1", project_id: "p1", sort: 1, text: "Beschriftung", required: true, status: "erledigt", comment: "" }],
    defects: [],
    signatures: [{ signer_role: "dokumentierender" }, { signer_role: "bauherr" }],
    requiredPhotoCategories: ["gesamtansicht", "wechselrichter", "zaehlerschrank"],
  };
}
