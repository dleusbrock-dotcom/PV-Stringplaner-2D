import { NextResponse, type NextRequest } from "next/server";
import { importProject, parseBackup } from "@/lib/server/importProject";
import { canEditRole } from "@/lib/status";
import { getProfile } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 200 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await getProfile();
  if (!auth) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!canEditRole(auth.profile.role)) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Keine Datei übermittelt" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Datei ist zu groß (max. 200 MB)" }, { status: 413 });

  try {
    const { snapshot, files } = parseBackup(file.name, new Uint8Array(await file.arrayBuffer()));
    const result = await importProject(auth.supabase, snapshot, files);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 422 });
  }
}
