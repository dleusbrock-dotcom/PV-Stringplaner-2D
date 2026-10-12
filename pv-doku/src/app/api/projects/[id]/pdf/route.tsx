import { renderToBuffer } from "@react-pdf/renderer";
import { NextResponse, type NextRequest } from "next/server";
import { safeFileName } from "@/lib/format";
import { Report, type ReportImages } from "@/lib/pdf/Report";
import { contentDisposition, downloadMany, isUuid, loadSnapshot } from "@/lib/server/project";
import { getProfile } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PDF-Erzeugung serverseitig aus der versionierten Berichtsvorlage (F-019)
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "Ungültige Projekt-ID" }, { status: 400 });
  const auth = await getProfile();
  if (!auth) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { supabase, profile } = auth;

  const versionParam = request.nextUrl.searchParams.get("version");
  const version = versionParam ? Number(versionParam) : undefined;
  if (version != null && (!Number.isInteger(version) || version < 1)) {
    return NextResponse.json({ error: "Ungültige Version" }, { status: 400 });
  }
  const loaded = await loadSnapshot(supabase, id, version);
  if (!loaded) return NextResponse.json({ error: "Projekt bzw. Version nicht gefunden" }, { status: 404 });
  const { snapshot, fromVersion } = loaded;

  // Bilder laden (nur JPEG/PNG; PDFs werden im Bericht nicht eingebettet)
  const imageFiles = snapshot.files.filter((f) => f.mime_type === "image/jpeg" || f.mime_type === "image/png");
  const logoPath = snapshot.company?.logo_path ?? null;
  const buffers = await downloadMany(supabase, [...imageFiles.map((f) => f.storage_path), ...(logoPath ? [logoPath] : [])]);
  const images: ReportImages = { photos: {} };
  for (const f of imageFiles) {
    const data = buffers.get(f.storage_path);
    if (data) images.photos[f.id] = { data, format: f.mime_type === "image/png" ? "png" : "jpg" };
  }
  if (logoPath && buffers.get(logoPath)) {
    images.logo = { data: buffers.get(logoPath)!, format: logoPath.toLowerCase().endsWith(".png") ? "png" : "jpg" };
  }

  const draft = !fromVersion && snapshot.project.status !== "abgeschlossen" && snapshot.project.status !== "archiviert";
  const pdf = await renderToBuffer(
    <Report snap={snapshot} images={images} draft={draft} generatedAt={new Date()} generatedBy={profile.full_name || profile.email} />,
  );

  await supabase.rpc("log_event", {
    p_project: id,
    p_action: "pdf_export",
    p_details: { version: snapshot.project.version, entwurf: draft, freigegebene_version: fromVersion },
  });

  const name = `Anlagendokumentation_${safeFileName(snapshot.project.project_number)}_v${snapshot.project.version}${draft ? "_Entwurf" : ""}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": contentDisposition("inline", name),
      "Cache-Control": "private, no-store",
    },
  });
}
