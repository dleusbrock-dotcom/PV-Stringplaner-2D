"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { friendlyError } from "@/components/project/db";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function NewProjectForm({ showImport }: { showImport: boolean }) {
  const router = useRouter();
  const [number, setNumber] = useState(`${new Date().getFullYear()}-`);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!number.trim() || !name.trim()) return setError("Projektnummer und Projektname sind Pflichtfelder.");
    setBusy(true);
    setError(null);
    const { data, error } = await supabaseBrowser()
      .from("projects")
      .insert({ project_number: number.trim(), name: name.trim() })
      .select("id")
      .single<{ id: string }>();
    setBusy(false);
    if (error || !data) return setError(friendlyError(error?.message ?? "Unbekannter Fehler"));
    router.push(`/projekte/${data.id}/stammdaten`);
  }

  async function importFile(file: File | undefined) {
    if (!file) return;
    setImportMsg("Import läuft …");
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/projects/import", { method: "POST", body });
    const json = await res.json();
    if (!res.ok) return setImportMsg(`Import fehlgeschlagen: ${json.error}`);
    setImportMsg(
      `Projekt ${json.projectNumber} importiert (${json.filesImported} Dateien${json.filesMissing ? `, ${json.filesMissing} ohne Dateiinhalt` : ""}).`,
    );
    router.push(`/projekte/${json.id}/stammdaten`);
  }

  return (
    <div className="narrow" style={{ maxWidth: 640 }}>
      <h1>Neues Projekt</h1>
      <form className="card" onSubmit={create}>
        <div className="grid2" style={{ gridTemplateColumns: "1fr" }}>
          <label className="field">
            <span>Projektnummer <span className="req">*</span></span>
            <input value={number} onChange={(e) => setNumber(e.target.value)} maxLength={50} required autoFocus />
          </label>
          <label className="field">
            <span>Projektname <span className="req">*</span></span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} required placeholder="z. B. PV-Anlage Musterweg 1" />
          </label>
        </div>
        <p className="muted small">Checkliste und Prüfpunkte werden aus den Firmenvorlagen übernommen. Alle weiteren Angaben folgen im Assistenten.</p>
        {error && <div className="alert err" role="alert">{error}</div>}
        <button className="btn primary" disabled={busy}>Projekt anlegen</button>
      </form>

      <div className="card" id="import">
        <h2 style={{ marginTop: 0 }}>Projekt importieren / wiederherstellen</h2>
        <p className="muted small">
          Backup (ZIP inkl. Fotos) oder JSON-Export auswählen. Es wird ein neues Projekt im Status „Entwurf“ angelegt; Unterschriften werden nicht übernommen.
        </p>
        <input type="file" accept=".zip,.json,application/zip,application/json" onChange={(e) => void importFile(e.target.files?.[0])} autoFocus={showImport} />
        {importMsg && <div className={`alert ${importMsg.startsWith("Import fehl") ? "err" : "info"}`}>{importMsg}</div>}
      </div>
    </div>
  );
}
