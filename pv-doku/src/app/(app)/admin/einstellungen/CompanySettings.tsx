"use client";

import { useEffect, useState } from "react";
import { friendlyError } from "@/components/project/db";
import { PHOTO_CATEGORIES, PHOTO_LABELS, STORAGE_BUCKET } from "@/lib/constants";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Company, PhotoCategory } from "@/lib/types";

export default function CompanySettings({ initial }: { initial: Company }) {
  const [c, setC] = useState(initial);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!c.logo_path) return;
    void supabaseBrowser().storage.from(STORAGE_BUCKET).createSignedUrl(c.logo_path, 600).then(({ data }) => setLogoUrl(data?.signedUrl ?? null));
  }, [c.logo_path]);

  async function save(patch: Partial<Company>) {
    const { data, error } = await supabaseBrowser().from("companies").update(patch).eq("id", c.id).select().single<Company>();
    if (error || !data) return setMsg({ kind: "err", text: friendlyError(error?.message ?? "Fehler") });
    setC(data);
    setMsg({ kind: "ok", text: "Gespeichert." });
  }

  async function uploadLogo(file: File | undefined) {
    if (!file) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) return setMsg({ kind: "err", text: "Bitte ein PNG- oder JPEG-Logo wählen." });
    if (file.size > 2 * 1024 * 1024) return setMsg({ kind: "err", text: "Das Logo darf höchstens 2 MB groß sein." });
    const ext = file.type === "image/png" ? "png" : "jpg";
    const path = `${c.id}/_company/logo-${Date.now()}.${ext}`;
    const { error } = await supabaseBrowser().storage.from(STORAGE_BUCKET).upload(path, file, { contentType: file.type });
    if (error) return setMsg({ kind: "err", text: friendlyError(error.message) });
    const old = c.logo_path;
    await save({ logo_path: path });
    if (old) await supabaseBrowser().storage.from(STORAGE_BUCKET).remove([old]);
  }

  function toggleCategory(cat: PhotoCategory, on: boolean) {
    const next = on ? [...c.required_photo_categories, cat] : c.required_photo_categories.filter((x) => x !== cat);
    void save({ required_photo_categories: next });
  }

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Firmendaten</h2>
        <div className="grid2">
          <label className="field">Firmenname<input defaultValue={c.name} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && void save({ name: e.target.value.trim() })} /></label>
          <label className="field">Anschrift<input defaultValue={c.address} onBlur={(e) => e.target.value !== c.address && void save({ address: e.target.value })} /></label>
        </div>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>PDF-Bericht</h2>
        <div className="grid2">
          <label className="field">Kopfzeile<input defaultValue={c.report_header} placeholder="Standard: Firmenname" onBlur={(e) => e.target.value !== c.report_header && void save({ report_header: e.target.value })} /></label>
          <label className="field">Fußzeile<input defaultValue={c.report_footer} onBlur={(e) => e.target.value !== c.report_footer && void save({ report_footer: e.target.value })} /></label>
        </div>
        <h3>Firmenlogo</h3>
        <div className="row">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {logoUrl && <img src={logoUrl} alt="Firmenlogo" style={{ height: 56, background: "#fff", border: "1px solid var(--line)", borderRadius: 6, padding: 4 }} />}
          <input type="file" accept="image/png,image/jpeg" onChange={(e) => void uploadLogo(e.target.files?.[0])} style={{ maxWidth: 320 }} />
          {c.logo_path && <button className="btn small danger" onClick={() => void save({ logo_path: null })}>Logo entfernen</button>}
        </div>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Mindestfotos (Vollständigkeitsprüfung)</h2>
        <p className="muted small">Ohne mindestens ein Foto in diesen Kategorien kann ein Projekt nicht abgeschlossen werden.</p>
        <div className="row">
          {PHOTO_CATEGORIES.map((cat) => (
            <label key={cat} className="check">
              <input type="checkbox" checked={c.required_photo_categories.includes(cat)} onChange={(e) => toggleCategory(cat, e.target.checked)} />
              {PHOTO_LABELS[cat]}
            </label>
          ))}
        </div>
      </div>
      {msg && <div className={`alert ${msg.kind}`} role="status">{msg.text}</div>}
    </>
  );
}
