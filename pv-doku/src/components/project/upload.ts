"use client";

import { STORAGE_BUCKET } from "@/lib/constants";
import { safeFileName } from "@/lib/format";
import type { FileRow, PhotoCategory } from "@/lib/types";
import { friendlyError, sb } from "./db";

// Foto-Upload mit clientseitiger Komprimierung (NF-002) und sicherem Speicherpfad (NF-004)

const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.82;
export const ACCEPTED = "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";

export async function compressImage(file: File): Promise<Blob> {
  if (file.type === "application/pdf") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(`„${file.name}“ kann nicht gelesen werden. Bitte als JPEG oder PNG aufnehmen bzw. auswählen.`);
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Bildverarbeitung nicht verfügbar.");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", JPEG_QUALITY));
  if (!blob) throw new Error("Bild konnte nicht komprimiert werden.");
  return blob;
}

export interface UploadMeta {
  category: PhotoCategory;
  caption?: string;
  roof_id?: string | null;
  component_id?: string | null;
  defect_id?: string | null;
}

export async function uploadProjectFile(
  project: { id: string; company_id: string },
  file: File,
  meta: UploadMeta,
): Promise<FileRow> {
  const blob = await compressImage(file);
  const isPdf = file.type === "application/pdf";
  const base = safeFileName(file.name.replace(/\.[^.]+$/, ""));
  const name = `${base}.${isPdf ? "pdf" : "jpg"}`;
  const path = `${project.company_id}/${project.id}/${crypto.randomUUID()}-${name}`;
  const contentType = isPdf ? "application/pdf" : "image/jpeg";

  const { error: upErr } = await sb().storage.from(STORAGE_BUCKET).upload(path, blob, { contentType, upsert: false });
  if (upErr) throw new Error(`Upload fehlgeschlagen: ${friendlyError(upErr.message)}`);

  const takenAt = file.lastModified ? new Date(file.lastModified).toISOString().slice(0, 10) : null;
  const { data, error } = await sb()
    .from("files")
    .insert({
      project_id: project.id,
      category: meta.category,
      storage_path: path,
      file_name: name,
      mime_type: contentType,
      size_bytes: blob.size,
      caption: meta.caption ?? "",
      taken_at: takenAt,
      roof_id: meta.roof_id ?? null,
      component_id: meta.component_id ?? null,
      defect_id: meta.defect_id ?? null,
    })
    .select()
    .single<FileRow>();
  if (error || !data) {
    await sb().storage.from(STORAGE_BUCKET).remove([path]);
    throw new Error(friendlyError(error?.message ?? "Speichern fehlgeschlagen"));
  }
  return data;
}

export async function deleteProjectFile(f: FileRow): Promise<void> {
  const { error } = await sb().from("files").delete().eq("id", f.id);
  if (error) throw new Error(friendlyError(error.message));
  await sb().storage.from(STORAGE_BUCKET).remove([f.storage_path]);
}
