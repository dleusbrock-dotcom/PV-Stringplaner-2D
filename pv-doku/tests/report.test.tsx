import { renderToBuffer } from "@react-pdf/renderer";
import { strToU8, zipSync } from "fflate";
import { describe, expect, it, vi } from "vitest";
import { Report } from "@/lib/pdf/Report";
import { pdfText } from "@/lib/pdf/text";
import type { ProjectSnapshot } from "@/lib/types";
import { completeInput, modules, project, roof } from "./fixtures";

vi.mock("server-only", () => ({}));

function snapshot(): ProjectSnapshot {
  const input = completeInput();
  return {
    format: "pv-doku-project",
    format_version: 1,
    exported_at: "2026-10-12T10:00:00Z",
    project: project({ status: "abgeschlossen", notes: "Messwert 20 MΩ ≥ Grenzwert" }),
    company: { name: "Beispiel Solar GmbH", address: "", logo_path: null, report_header: "", report_footer: "Musterfußzeile" },
    members: [],
    module_types: input.moduleTypes,
    roofs: [
      roof({ cells: [...modules(18, 10, "s1"), { row: 4, col: 9, state: "hindernis", label: "Kamin", string_id: null, serial_no: "" }] }),
      roof({ id: "r2", name: "Garage Ost", orientation: "O", grid_rows: 3, grid_cols: 40, view_rotation: 90, module_orientation: "quer", cells: modules(60, 40) }),
    ],
    strings: [{ id: "s1", project_id: "p1", name: "S1", color: "#dc2626", inverter_id: "k1", mpp_tracker: "A" }],
    components: input.components,
    files: [],
    test_values: input.testValues,
    checklist_items: input.checklist,
    defects: [{ id: "d1", project_id: "p1", description: "Abdeckung fehlt", category: "Montage", priority: "mittel", responsible: "", due_date: null, status: "offen", created_at: "" }],
    signatures: [],
  };
}

describe("PDF-Bericht (F-019)", () => {
  it("erzeugt ein gültiges mehrseitiges PDF", async () => {
    const buf = await renderToBuffer(
      <Report snap={snapshot()} images={{ photos: {} }} draft={false} generatedAt={new Date("2026-10-12T10:00:00Z")} generatedBy="Test" />,
    );
    const head = buf.subarray(0, 5).toString("latin1");
    expect(head).toBe("%PDF-");
    const pages = (buf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;
    expect(pages).toBeGreaterThanOrEqual(5);
  }, 30000);

  it("ersetzt nicht darstellbare Zeichen", () => {
    expect(pdfText("20 MΩ ≥ 1 → ok")).toBe("20 MOhm >= 1 -> ok");
    expect(pdfText("Größe – „Süd“ €")).toBe("Größe – „Süd“ €");
    expect(pdfText("日本")).toBe("??");
  });

  it("Backup-ZIP ist wieder einlesbar (F-020)", async () => {
    const { parseBackup } = await import("@/lib/server/importProject");
    const snap = snapshot();
    snap.files = [{ id: "11111111-1111-1111-1111-111111111111", project_id: "p1", category: "module", storage_path: "c/p/x.jpg", file_name: "x.jpg",
      mime_type: "image/jpeg", size_bytes: 3, caption: "", taken_at: null, roof_id: null, component_id: null, defect_id: null, created_at: "" }];
    const zip = zipSync({
      "project.json": strToU8(JSON.stringify(snap)),
      "files/11111111-1111-1111-1111-111111111111-x.jpg": new Uint8Array([1, 2, 3]),
    });
    const parsed = parseBackup("backup.zip", zip);
    expect(parsed.snapshot.project.project_number).toBe("TEST-0001");
    expect(parsed.files.get("11111111-1111-1111-1111-111111111111")).toEqual(new Uint8Array([1, 2, 3]));
    expect(() => parseBackup("x.json", strToU8('{"format":"anders"}'))).toThrow(/kein gültiger/);
  });
});
