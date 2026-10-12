import { strToU8, zipSync, type Zippable } from "fflate";
import { NextResponse, type NextRequest } from "next/server";
import { CSV_TABLES, snapshotToCsv, type CsvTable } from "@/lib/csv";
import { safeFileName } from "@/lib/format";
import { contentDisposition, downloadMany, isUuid, loadSnapshot } from "@/lib/server/project";
import { getProfile } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Datenexport (F-020, NF-010): JSON (strukturiert), CSV (tabellarisch), ZIP (Backup inkl. aller Dateien)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Ungültige Projekt-ID" }, { status: 400 });
  const auth = await getProfile();
  if (!auth) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { supabase } = auth;

  const loaded = await loadSnapshot(supabase, id);
  if (!loaded) return NextResponse.json({ error: "Projekt nicht gefunden" }, { status: 404 });
  const snap = loaded.snapshot;
  const base = `${safeFileName(snap.project.project_number)}_v${snap.project.version}`;
  const format = request.nextUrl.searchParams.get("format") ?? "json";
  const headers = { "Cache-Control": "private, no-store" };

  if (format === "csv") {
    const table = request.nextUrl.searchParams.get("table") as CsvTable | null;
    if (!table || !(table in CSV_TABLES)) return NextResponse.json({ error: "Unbekannte Tabelle" }, { status: 400 });
    await supabase.rpc("log_event", { p_project: id, p_action: "csv_export", p_details: { tabelle: table } });
    return new NextResponse(snapshotToCsv(snap, table), {
      headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": contentDisposition("attachment", `${base}_${table}.csv`) },
    });
  }

  if (format === "zip") {
    const buffers = await downloadMany(supabase, snap.files.map((f) => f.storage_path));
    const files: Zippable = { "project.json": strToU8(JSON.stringify(snap, null, 2)) };
    const missing: string[] = [];
    for (const f of snap.files) {
      const buf = buffers.get(f.storage_path);
      if (buf) files[`files/${f.id}-${safeFileName(f.file_name)}`] = new Uint8Array(buf);
      else missing.push(f.file_name);
    }
    for (const t of Object.keys(CSV_TABLES) as CsvTable[]) files[`csv/${t}.csv`] = strToU8(snapshotToCsv(snap, t));
    const zip = zipSync(files, { level: 0 });
    await supabase.rpc("log_event", { p_project: id, p_action: "backup_export", p_details: { dateien: snap.files.length - missing.length, fehlend: missing.length } });
    return new NextResponse(new Uint8Array(zip), {
      headers: { ...headers, "Content-Type": "application/zip", "Content-Disposition": contentDisposition("attachment", `${base}_backup.zip`) },
    });
  }

  await supabase.rpc("log_event", { p_project: id, p_action: "json_export", p_details: {} });
  return new NextResponse(JSON.stringify(snap, null, 2), {
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Content-Disposition": contentDisposition("attachment", `${base}.json`) },
  });
}
