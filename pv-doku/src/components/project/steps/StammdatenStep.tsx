"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { STORAGE_BUCKET } from "@/lib/constants";
import { ROLE_LABELS } from "@/lib/constants";
import type { Project } from "@/lib/types";
import { TextArea, TextField } from "../Fields";
import { useProject } from "../ProjectContext";
import { SaveIndicator, useAutosave } from "../useAutosave";
import { attempt, must, sb } from "../db";

export default function StammdatenStep() {
  const { data, setData, editable, role, reload } = useProject();
  const onSaved = useCallback((p: Project) => setData((d) => ({ ...d, project: p })), [setData]);
  const { values: p, set, state, message, overwrite, discard } = useAutosave<Project>("projects", data.project, onSaved, {
    disabled: !editable,
  });
  const installers = data.users.filter((u) => u.active && u.role !== "betrachter");
  const canManageMembers = editable && (role === "admin" || role === "projektleiter");
  const router = useRouter();

  /** Vollständige Löschung inkl. Dateien (Datenschutz: Löschfähigkeit, NF-003) – nur Administratoren. */
  async function deleteProject() {
    const typed = window.prompt(
      `Projekt endgültig löschen? Alle Daten, Fotos und Versionen werden entfernt.\nZur Bestätigung die Projektnummer „${p.project_number}“ eingeben:`,
    );
    if (typed !== p.project_number) return;
    await attempt(async () => {
      const paths = data.files.map((f) => f.storage_path);
      await must(sb().from("projects").delete().eq("id", p.id));
      for (let i = 0; i < paths.length; i += 100) await sb().storage.from(STORAGE_BUCKET).remove(paths.slice(i, i + 100));
      router.push("/");
    });
  }

  async function toggleMember(userId: string, on: boolean) {
    await attempt(async () => {
      if (on) await must(sb().from("project_members").insert({ project_id: p.id, user_id: userId }));
      else await must(sb().from("project_members").delete().eq("project_id", p.id).eq("user_id", userId));
      setData((d) => ({ ...d, members: on ? [...d.members, userId] : d.members.filter((m) => m !== userId) }));
    });
  }

  return (
    <>
      <div className="card">
        <div className="between">
          <h2 style={{ margin: 0 }}>Projektstammdaten</h2>
          <SaveIndicator state={state} message={message} onOverwrite={overwrite} onDiscard={() => { discard(); void reload(); }} />
        </div>
        <fieldset disabled={!editable} style={{ border: 0, padding: 0, margin: "0.75rem 0 0" }}>
          <div className="grid2">
            <TextField label="Projektnummer" required value={p.project_number} onValue={(v) => set("project_number", v)} maxLength={50} />
            <TextField label="Projektname" required value={p.name} onValue={(v) => set("name", v)} maxLength={200} />
            <TextField label="Installationsdatum" required type="date" value={p.installation_date} onValue={(v) => set("installation_date", v || null)} />
            <TextField label="Ausführendes Unternehmen" required value={p.contractor} onValue={(v) => set("contractor", v)} />
            <label className="field">
              <span>Verantwortlicher Monteur <span className="req" aria-hidden>*</span></span>
              <select
                value={p.installer_id ?? ""}
                onChange={(e) => {
                  const u = installers.find((x) => x.id === e.target.value);
                  set("installer_id", u ? u.id : null);
                  if (u) set("installer_name", u.full_name || u.email);
                }}
              >
                <option value="">– Benutzer wählen oder unten frei eintragen –</option>
                {installers.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                ))}
              </select>
            </label>
            <TextField
              label="Name des Monteurs (Freitext)"
              value={p.installer_name}
              onValue={(v) => set("installer_name", v)}
              aria-invalid={!p.installer_name && !p.installer_id ? true : undefined}
            />
            <TextArea className="span2" label="Notizen (optional)" value={p.notes} onValue={(v) => set("notes", v)} />
          </div>
        </fieldset>
      </div>

      <div className="card">
        <h2>Zugewiesene Personen</h2>
        <p className="muted">Monteure sehen und bearbeiten nur Projekte, denen sie zugewiesen sind.</p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {data.users
            .filter((u) => u.active && u.role === "monteur")
            .map((u) => (
              <li key={u.id}>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={data.members.includes(u.id)}
                    disabled={!canManageMembers}
                    onChange={(e) => void toggleMember(u.id, e.target.checked)}
                  />
                  {u.full_name || u.email} <span className="muted small">({ROLE_LABELS[u.role]})</span>
                </label>
              </li>
            ))}
          {data.users.filter((u) => u.active && u.role === "monteur").length === 0 && (
            <li className="muted">Keine Monteure angelegt.</li>
          )}
        </ul>
      </div>

      {role === "admin" && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Projekt löschen</h2>
          <p className="muted small">
            Entfernt das Projekt mit allen Inhalten, Fotos und freigegebenen Versionen unwiderruflich (z. B. bei Löschanspruch
            nach DSGVO). Vorher ggf. ein Backup exportieren.
          </p>
          <button className="btn danger" onClick={() => void deleteProject()}>Projekt endgültig löschen</button>
        </div>
      )}
    </>
  );
}
