"use client";

import { useEffect, useRef, useState } from "react";
import { PHOTO_CATEGORIES, PHOTO_LABELS, STORAGE_BUCKET } from "@/lib/constants";
import { fmtBytes } from "@/lib/format";
import type { FileRow, PhotoCategory } from "@/lib/types";
import { useProject } from "./ProjectContext";
import { attempt, must, sb } from "./db";
import { ACCEPTED, deleteProjectFile, uploadProjectFile, type UploadMeta } from "./upload";

const urlCache = new Map<string, { url: string; exp: number }>();

/** Signierte, zeitlich begrenzte URLs für private Dateien (gebündelt geladen). */
export function useSignedUrls(paths: string[]): Record<string, string> {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const key = paths.join("|");
  useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    const missing = paths.filter((p) => (urlCache.get(p)?.exp ?? 0) <= now);
    const fromCache = () =>
      Object.fromEntries(paths.map((p) => [p, urlCache.get(p)?.url ?? ""]).filter(([, u]) => u)) as Record<string, string>;
    if (missing.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUrls(fromCache());
      return;
    }
    void sb()
      .storage.from(STORAGE_BUCKET)
      .createSignedUrls(missing, 3600)
      .then(({ data }) => {
        for (const d of data ?? []) if (d.signedUrl && d.path) urlCache.set(d.path, { url: d.signedUrl, exp: now + 50 * 60 * 1000 });
        if (!cancelled) setUrls(fromCache());
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}

/** Upload-Schaltflächen (Kamera / Datei) mit Fortschrittsanzeige. */
export function PhotoUploader({ meta, label = "Foto hinzufügen", compact }: { meta: UploadMeta; label?: string; compact?: boolean }) {
  const { data, setData, editable } = useProject();
  const [progress, setProgress] = useState<string | null>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handle(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = [...files];
    const errors: string[] = [];
    for (let i = 0; i < list.length; i++) {
      setProgress(`Lade ${i + 1} von ${list.length} hoch (${fmtBytes(list[i].size)}) …`);
      try {
        const row = await uploadProjectFile(data.project, list[i], meta);
        setData((d) => ({ ...d, files: [...d.files, row] }));
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
    setProgress(errors.length ? errors.join("\n") : null);
    if (camRef.current) camRef.current.value = "";
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!editable) return null;
  return (
    <div>
      <div className="row">
        <button type="button" className={`btn ${compact ? "small" : "primary"}`} onClick={() => camRef.current?.click()}>
          📷 {compact ? "Foto" : label}
        </button>
        <button type="button" className={`btn ${compact ? "small" : ""}`} onClick={() => fileRef.current?.click()}>
          📁 {compact ? "Datei" : "Aus Dateien wählen"}
        </button>
        <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void handle(e.target.files)} />
        <input ref={fileRef} type="file" accept={ACCEPTED} multiple hidden onChange={(e) => void handle(e.target.files)} />
      </div>
      {progress && (
        <div className={`alert ${progress.startsWith("Lade") ? "info" : "err"} small`} role="status" style={{ whiteSpace: "pre-line" }}>
          {progress}
        </div>
      )}
    </div>
  );
}

/** Kachel mit Vorschau, Bildunterschrift, Datum, Kategorie. */
export function PhotoTile({ file, url, showCategory = true }: { file: FileRow; url?: string; showCategory?: boolean }) {
  const { setData, editable } = useProject();
  const [caption, setCaption] = useState(file.caption);

  async function patch(p: Partial<FileRow>) {
    await attempt(async () => {
      const row = await must(sb().from("files").update(p).eq("id", file.id).select().single<FileRow>());
      setData((d) => ({ ...d, files: d.files.map((f) => (f.id === row.id ? row : f)) }));
    });
  }

  async function remove() {
    if (!window.confirm("Datei wirklich löschen?")) return;
    await attempt(async () => {
      await deleteProjectFile(file);
      setData((d) => ({ ...d, files: d.files.filter((f) => f.id !== file.id) }));
    });
  }

  const isPdf = file.mime_type === "application/pdf";
  return (
    <figure className="photo" style={{ margin: 0 }}>
      <a href={url} target="_blank" rel="noreferrer" aria-label={`${file.file_name} öffnen`}>
        {isPdf ? (
          <div style={{ aspectRatio: "4/3", display: "grid", placeItems: "center", background: "var(--surface-2)", fontWeight: 700 }}>PDF</div>
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={file.caption || file.file_name} loading="lazy" />
        ) : (
          <div style={{ aspectRatio: "4/3", background: "var(--surface-2)" }} />
        )}
      </a>
      <figcaption className="meta">
        <input
          value={caption}
          placeholder="Bildunterschrift"
          aria-label="Bildunterschrift"
          disabled={!editable}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => caption !== file.caption && void patch({ caption })}
        />
        <input
          type="date"
          aria-label="Aufnahmedatum"
          value={file.taken_at ?? ""}
          disabled={!editable}
          onChange={(e) => void patch({ taken_at: e.target.value || null })}
        />
        {showCategory && (
          <select
            aria-label="Kategorie"
            value={file.category}
            disabled={!editable}
            onChange={(e) => void patch({ category: e.target.value as PhotoCategory })}
          >
            {PHOTO_CATEGORIES.map((c) => (
              <option key={c} value={c}>{PHOTO_LABELS[c]}</option>
            ))}
          </select>
        )}
        {editable && <button type="button" className="btn small danger" onClick={() => void remove()}>Löschen</button>}
      </figcaption>
    </figure>
  );
}

/** Fotos, die an ein Objekt (Komponente, Mangel, Dachfläche) gebunden sind. */
export function AttachedPhotos({ filter, meta }: { filter: (f: FileRow) => boolean; meta: UploadMeta }) {
  const { data } = useProject();
  const files = data.files.filter(filter);
  const urls = useSignedUrls(files.map((f) => f.storage_path));
  return (
    <div>
      {files.length > 0 && (
        <div className="photo-grid" style={{ marginBottom: "0.5rem" }}>
          {files.map((f) => (
            <PhotoTile key={f.id} file={f} url={urls[f.storage_path]} showCategory={false} />
          ))}
        </div>
      )}
      <PhotoUploader meta={meta} compact />
    </div>
  );
}
