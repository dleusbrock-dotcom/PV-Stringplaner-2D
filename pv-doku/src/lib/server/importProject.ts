import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { strFromU8, unzipSync } from "fflate";
import { z } from "zod";
import { STORAGE_BUCKET } from "../constants";
import { safeFileName } from "../format";
import type { ProjectSnapshot } from "../types";

// Wiederherstellung/Import eines exportierten Projekts (F-020) als NEUES Projekt im Status Entwurf.
// Alle IDs werden neu vergeben; Unterschriften werden nicht übernommen (sie gehören zu einer freigegebenen Version).

const snapshotSchema = z.object({
  format: z.literal("pv-doku-project"),
  format_version: z.number().int().min(1).max(1),
  project: z.object({ project_number: z.string().min(1), name: z.string().min(1) }).passthrough(),
  module_types: z.array(z.object({ id: z.string() }).passthrough()),
  roofs: z.array(z.object({ id: z.string(), cells: z.array(z.object({}).passthrough()) }).passthrough()),
  strings: z.array(z.object({ id: z.string() }).passthrough()),
  components: z.array(z.object({ id: z.string() }).passthrough()),
  files: z.array(z.object({ id: z.string(), storage_path: z.string() }).passthrough()),
  test_values: z.array(z.object({}).passthrough()),
  checklist_items: z.array(z.object({}).passthrough()),
  defects: z.array(z.object({ id: z.string() }).passthrough()),
});

const PROJECT_FIELDS = [
  "name", "installation_date", "contractor", "installer_name", "notes", "client_type", "client_first_name", "client_last_name",
  "client_company", "client_street", "client_house_no", "client_zip", "client_city", "client_country", "client_phone",
  "client_email", "site_differs", "site_street", "site_house_no", "site_zip", "site_city", "site_country", "site_lat", "site_lng",
] as const;

function pick<T extends object>(o: T, keys: readonly string[]): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  for (const k of keys) if (k in o) r[k] = (o as Record<string, unknown>)[k];
  return r;
}

function omit(o: object, keys: string[]): Record<string, unknown> {
  const r: Record<string, unknown> = { ...(o as Record<string, unknown>) };
  for (const k of keys) delete r[k];
  return r;
}

const SYSTEM = ["id", "project_id", "created_at", "updated_at", "created_by", "uploaded_by"];

export function parseBackup(name: string, bytes: Uint8Array): { snapshot: ProjectSnapshot; files: Map<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>();
  let json: string;
  if (name.toLowerCase().endsWith(".zip") || (bytes[0] === 0x50 && bytes[1] === 0x4b)) {
    const entries = unzipSync(bytes);
    if (!entries["project.json"]) throw new Error("Das ZIP enthält keine project.json.");
    json = strFromU8(entries["project.json"]);
    for (const [path, data] of Object.entries(entries)) {
      const m = /^files\/([0-9a-f-]{36})-/.exec(path);
      if (m) files.set(m[1], data);
    }
  } else {
    json = strFromU8(bytes);
  }
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    throw new Error("Die Datei enthält kein gültiges JSON.");
  }
  const parsed = snapshotSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Die Datei ist kein gültiger PV-Doku-Projektexport.");
  return { snapshot: raw as ProjectSnapshot, files };
}

export async function importProject(
  supabase: SupabaseClient,
  snap: ProjectSnapshot,
  fileData: Map<string, Uint8Array>,
): Promise<{ id: string; projectNumber: string; filesImported: number; filesMissing: number }> {
  const must = async <T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>, what: string): Promise<T> => {
    const { data, error } = await p;
    if (error) throw new Error(`${what}: ${error.message}`);
    return data as T;
  };

  // Projekt anlegen – bei vergebener Nummer mit Suffix
  let projectNumber = snap.project.project_number;
  let project: { id: string; company_id: string } | null = null;
  for (let attempt = 0; attempt < 20 && !project; attempt++) {
    const candidate = attempt === 0 ? projectNumber : `${snap.project.project_number}-import${attempt > 1 ? `-${attempt}` : ""}`.slice(0, 50);
    const { data, error } = await supabase
      .from("projects")
      .insert({ ...pick(snap.project, PROJECT_FIELDS), project_number: candidate })
      .select("id, company_id")
      .single<{ id: string; company_id: string }>();
    if (!error && data) {
      project = data;
      projectNumber = candidate;
    } else if (!error?.message.includes("duplicate key")) {
      throw new Error(`Projekt: ${error?.message}`);
    }
  }
  if (!project) throw new Error("Es konnte keine freie Projektnummer gefunden werden.");
  const pid = project.id;

  try {
    // Automatisch kopierte Vorlagen durch importierte Inhalte ersetzen
    await must(supabase.from("test_values").delete().eq("project_id", pid), "Prüfwerte");
    await must(supabase.from("checklist_items").delete().eq("project_id", pid), "Checkliste");

    const idMap = new Map<string, string>();
    const insertMapped = async (table: string, rows: { id: string }[], transform: (r: Record<string, unknown>) => Record<string, unknown>) => {
      for (const r of rows) {
        const row = await must(
          supabase.from(table).insert({ ...transform(omit(r, SYSTEM)), project_id: pid }).select("id").single<{ id: string }>(),
          table,
        );
        idMap.set(r.id, row.id);
      }
    };
    const mapId = (v: unknown) => (typeof v === "string" ? idMap.get(v) ?? null : null);

    await insertMapped("module_types", snap.module_types, (r) => r);
    await insertMapped("components", snap.components, (r) => r);
    await insertMapped("strings", snap.strings, (r) => ({ ...r, inverter_id: mapId(r.inverter_id) }));
    await insertMapped("roof_surfaces", snap.roofs, (r) => ({ ...omit(r, ["cells"]), module_type_id: mapId(r.module_type_id) }));
    for (const roof of snap.roofs) {
      const cells = roof.cells.map((c) => ({ ...c, string_id: c.string_id ? mapId(c.string_id) : null }));
      await must(supabase.rpc("save_grid", { p_roof: idMap.get(roof.id), p_cells: cells }), "Raster");
    }
    await insertMapped("defects", snap.defects, (r) => r);
    if (snap.test_values.length)
      await must(supabase.from("test_values").insert(snap.test_values.map((r) => ({ ...omit(r, SYSTEM), project_id: pid }))), "Prüfwerte");
    if (snap.checklist_items.length)
      await must(supabase.from("checklist_items").insert(snap.checklist_items.map((r) => ({ ...omit(r, SYSTEM), project_id: pid }))), "Checkliste");

    let filesImported = 0;
    let filesMissing = 0;
    for (const f of snap.files) {
      const data = fileData.get(f.id);
      if (!data) {
        filesMissing++;
        continue;
      }
      const path = `${project.company_id}/${pid}/${crypto.randomUUID()}-${safeFileName(f.file_name)}`;
      const up = await supabase.storage.from(STORAGE_BUCKET).upload(path, data, { contentType: f.mime_type || "image/jpeg" });
      if (up.error) throw new Error(`Datei ${f.file_name}: ${up.error.message}`);
      await must(
        supabase.from("files").insert({
          ...omit(f, [...SYSTEM, "storage_path", "roof_id", "component_id", "defect_id"]),
          project_id: pid,
          storage_path: path,
          roof_id: mapId(f.roof_id),
          component_id: mapId(f.component_id),
          defect_id: mapId(f.defect_id),
        }),
        "Dateien",
      );
      filesImported++;
    }

    await supabase.rpc("log_event", {
      p_project: pid,
      p_action: "import",
      p_details: { quelle: snap.project.project_number, version: snap.project.version, dateien: filesImported, fehlend: filesMissing },
    });
    return { id: pid, projectNumber, filesImported, filesMissing };
  } catch (e) {
    // Halb importiertes Projekt nicht zurücklassen (nur möglich mit Löschrecht, sonst bleibt es als Entwurf erhalten)
    await supabase.from("projects").delete().eq("id", pid);
    throw e;
  }
}
