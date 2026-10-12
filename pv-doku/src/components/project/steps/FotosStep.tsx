"use client";

import { useState } from "react";
import { PHOTO_CATEGORIES, PHOTO_LABELS } from "@/lib/constants";
import type { PhotoCategory } from "@/lib/types";
import { PhotoTile, PhotoUploader, useSignedUrls } from "../Photos";
import { useProject } from "../ProjectContext";

export default function FotosStep() {
  const { data } = useProject();
  const [category, setCategory] = useState<PhotoCategory>("gesamtansicht");
  const [filter, setFilter] = useState<PhotoCategory | "alle">("alle");
  const required = new Set(data.company?.required_photo_categories ?? []);
  const counts = new Map<PhotoCategory, number>();
  for (const f of data.files) counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
  const shown = data.files.filter((f) => filter === "alle" || f.category === filter);
  const urls = useSignedUrls(shown.map((f) => f.storage_path));
  const fulfilled = [...required].filter((c) => (counts.get(c) ?? 0) > 0).length;

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Fotos und Nachweise</h2>
        <p className="muted">
          Pflichtkategorien erfüllt: <strong>{fulfilled} / {required.size}</strong>. Fotos werden vor dem Upload automatisch verkleinert.
        </p>
        <div className="cat-chips" aria-label="Vollständigkeit je Kategorie (zum Filtern antippen)">
          {PHOTO_CATEGORIES.map((c) => {
            const n = counts.get(c) ?? 0;
            const cls = required.has(c) ? (n > 0 ? "ok" : "err") : "";
            return (
              <button
                key={c}
                className={`badge ${cls}`}
                style={{ border: filter === c ? "2px solid var(--brand)" : "2px solid transparent", cursor: "pointer" }}
                onClick={() => setFilter(filter === c ? "alle" : c)}
                aria-pressed={filter === c}
              >
                {PHOTO_LABELS[c]}{required.has(c) ? " *" : ""}: {n}
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ alignItems: "end" }}>
          <label className="field" style={{ maxWidth: 280 }}>
            Kategorie für neue Fotos
            <select value={category} onChange={(e) => setCategory(e.target.value as PhotoCategory)}>
              {PHOTO_CATEGORIES.map((c) => (
                <option key={c} value={c}>{PHOTO_LABELS[c]}</option>
              ))}
            </select>
          </label>
          <PhotoUploader meta={{ category }} />
        </div>
      </div>

      <div className="between" style={{ marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>{filter === "alle" ? "Alle Fotos" : PHOTO_LABELS[filter]} ({shown.length})</h2>
        {filter !== "alle" && <button className="btn small" onClick={() => setFilter("alle")}>Alle anzeigen</button>}
      </div>
      {shown.length === 0 ? (
        <p className="muted">Keine Fotos vorhanden.</p>
      ) : (
        <div className="photo-grid">
          {shown.map((f) => (
            <PhotoTile key={f.id} file={f} url={urls[f.storage_path]} />
          ))}
        </div>
      )}
    </>
  );
}
