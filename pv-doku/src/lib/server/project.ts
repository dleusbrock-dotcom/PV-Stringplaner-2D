import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { STORAGE_BUCKET } from "../constants";
import type { ProjectSnapshot } from "../types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: string): boolean {
  return UUID.test(v);
}

/** Aktuellen Projektstand (oder eine freigegebene Version) mit den Rechten des Benutzers laden. */
export async function loadSnapshot(
  supabase: SupabaseClient,
  projectId: string,
  version?: number,
): Promise<{ snapshot: ProjectSnapshot; fromVersion: boolean } | null> {
  if (version != null) {
    const { data } = await supabase
      .from("project_versions")
      .select("snapshot")
      .eq("project_id", projectId)
      .eq("version", version)
      .eq("status", "abgeschlossen")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ snapshot: ProjectSnapshot }>();
    return data ? { snapshot: data.snapshot, fromVersion: true } : null;
  }
  const { data, error } = await supabase.rpc("project_snapshot", { p_project: projectId });
  if (error || !data) return null;
  return { snapshot: data as ProjectSnapshot, fromVersion: false };
}

export async function downloadFile(supabase: SupabaseClient, path: string): Promise<Buffer | null> {
  const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(path);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/** Lädt Dateien mit begrenzter Parallelität. */
export async function downloadMany(
  supabase: SupabaseClient,
  paths: string[],
  concurrency = 6,
): Promise<Map<string, Buffer>> {
  const out = new Map<string, Buffer>();
  let i = 0;
  async function worker() {
    while (i < paths.length) {
      const p = paths[i++];
      const buf = await downloadFile(supabase, p);
      if (buf) out.set(p, buf);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, paths.length) }, worker));
  return out;
}

export function contentDisposition(kind: "inline" | "attachment", filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
