"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PROJECT_STEPS, STATUS_LABELS } from "@/lib/constants";
import { CSV_TABLES, type CsvTable } from "@/lib/csv";
import { fmtDateTime, clientName } from "@/lib/format";
import { allowedTransitions, isLocked, requiresComment } from "@/lib/status";
import type { ProjectStatus, ProjectVersion, Signature } from "@/lib/types";
import { useProject } from "../ProjectContext";
import SignaturePad from "../SignaturePad";
import { useCompleteness } from "../useCompleteness";
import { attempt, friendlyError, must, sb } from "../db";

const STEP_LABEL = Object.fromEntries(PROJECT_STEPS.map((s) => [s.slug, s.label]));

export default function AbschlussStep() {
  const { data, role, reload } = useProject();
  const issues = useCompleteness(data);
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");
  const p = data.project;
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const transitions = allowedTransitions(p.status, role);

  useEffect(() => {
    void sb()
      .from("project_versions")
      .select("id, project_id, version, status, comment, created_at")
      .eq("project_id", p.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setVersions((data ?? []) as ProjectVersion[]));
  }, [p.id, p.status]);

  async function changeStatus(to: ProjectStatus) {
    if (requiresComment(p.status, to) && !comment.trim()) {
      setServerError("Bitte eine Begründung für die Wiedereröffnung angeben.");
      return;
    }
    if (to === "abgeschlossen" && !window.confirm("Projekt abschließen? Die Version wird danach gegen Änderungen gesperrt.")) return;
    setBusy(true);
    setServerError(null);
    const { error } = await sb().rpc("set_project_status", { p_project: p.id, p_status: to, p_comment: comment.trim() });
    setBusy(false);
    if (error) return setServerError(friendlyError(error.message));
    setComment("");
    await reload();
  }

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Vollständigkeitsprüfung</h2>
        {errors.length === 0 ? (
          <div className="alert ok">Alle Pflichtangaben sind vollständig.</div>
        ) : (
          <div className="alert err">
            <strong>{errors.length} Fehler</strong> – das Projekt kann so nicht abgeschlossen werden.
          </div>
        )}
        {issues.length > 0 && (
          <ul className="issues">
            {[...errors, ...warnings].map((i, n) => (
              <li key={n}>
                <span className={`badge ${i.level === "error" ? "err" : "warn"}`}>{i.level === "error" ? "Fehler" : "Hinweis"}</span>
                <span style={{ flex: 1 }}>{i.message}</span>
                <Link href={`/projekte/${p.id}/${i.step}`} className="small">→ {STEP_LABEL[i.step]}</Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Signatures />

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Status und Freigabe</h2>
        <p>
          Aktueller Status: <span className={`badge s-${p.status}`}>{STATUS_LABELS[p.status]}</span> · Version {p.version}
        </p>
        {transitions.length > 0 ? (
          <>
            <label className="field">
              Kommentar zum Statuswechsel {p.status === "abgeschlossen" && "(Begründung erforderlich)"}
              <input value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} />
            </label>
            <div className="row" style={{ marginTop: "0.5rem" }}>
              {transitions.map((to) => (
                <button
                  key={to}
                  className={`btn ${to === "abgeschlossen" ? "primary" : ""}`}
                  disabled={busy || (to === "abgeschlossen" && errors.length > 0)}
                  onClick={() => void changeStatus(to)}
                  title={to === "abgeschlossen" && errors.length > 0 ? "Erst alle Fehler beheben" : undefined}
                >
                  {to === "nacharbeit" && p.status === "abgeschlossen"
                    ? "Neue Version eröffnen (Nacharbeit)"
                    : to === "abgeschlossen" && p.status === "zur_pruefung"
                      ? "Prüfen und abschließen"
                      : `→ ${STATUS_LABELS[to]}`}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">Für Ihre Rolle sind in diesem Status keine Statuswechsel möglich.</p>
        )}
        {serverError && <div className="alert err" role="alert">{serverError}</div>}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>PDF-Dokumentation und Export</h2>
        {!isLocked(p.status) && (
          <p className="muted small">Hinweis: Der Bericht wird als Entwurf gekennzeichnet, solange das Projekt nicht abgeschlossen ist.</p>
        )}
        <div className="row">
          <a className="btn primary" href={`/api/projects/${p.id}/pdf`} target="_blank" rel="noreferrer">📄 PDF-Bericht erzeugen</a>
          <a className="btn" href={`/api/projects/${p.id}/export?format=json`}>JSON (strukturiert)</a>
          <a className="btn" href={`/api/projects/${p.id}/export?format=zip`}>Backup inkl. Fotos (ZIP)</a>
        </div>
        <h3>Tabellen (CSV, für Excel)</h3>
        <div className="row">
          {(Object.keys(CSV_TABLES) as CsvTable[]).map((t) => (
            <a key={t} className="btn small" href={`/api/projects/${p.id}/export?format=csv&table=${t}`}>{CSV_TABLES[t]}</a>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Freigegebene Versionen</h2>
        {versions.length === 0 ? (
          <p className="muted">Noch keine abgeschlossene Version.</p>
        ) : (
          <table className="list">
            <thead><tr><th>Version</th><th>Abgeschlossen am</th><th>Kommentar</th><th /></tr></thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id}>
                  <td>v{v.version}</td>
                  <td>{fmtDateTime(v.created_at)}</td>
                  <td>{v.comment || "–"}</td>
                  <td><a href={`/api/projects/${p.id}/pdf?version=${v.version}`} target="_blank" rel="noreferrer">PDF</a></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Signatures() {
  const { data } = useProject();
  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Unterschriften und Übergabe</h2>
      <div className="grid2">
        <SignatureBox role="dokumentierender" title="Dokumentierender" defaultName={data.project.installer_name} />
        <SignatureBox role="bauherr" title="Bauherr / Empfänger" defaultName={clientName(data.project)} />
      </div>
    </div>
  );
}

function SignatureBox({ role, title, defaultName }: { role: Signature["signer_role"]; title: string; defaultName: string }) {
  const { data, setData, editable } = useProject();
  const existing = data.signatures.find((s) => s.signer_role === role);
  const [name, setName] = useState(defaultName);
  const [place, setPlace] = useState(data.project.site_differs ? data.project.site_city : data.project.client_city);
  const [comment, setComment] = useState("");
  const [image, setImage] = useState<string | null>(null);

  async function save() {
    if (!image || !name.trim()) return window.alert("Bitte Name eintragen und unterschreiben.");
    await attempt(async () => {
      const row = await must(
        sb()
          .from("signatures")
          .insert({
            project_id: data.project.id,
            version: data.project.version,
            signer_role: role,
            signer_name: name.trim(),
            place: place.trim(),
            comment: comment.trim(),
            image_data: image,
          })
          .select()
          .single<Signature>(),
      );
      setData((d) => ({ ...d, signatures: [...d.signatures, row] }));
    });
  }

  async function remove() {
    if (!existing || !window.confirm("Unterschrift entfernen?")) return;
    await attempt(async () => {
      await must(sb().from("signatures").delete().eq("id", existing.id));
      setData((d) => ({ ...d, signatures: d.signatures.filter((s) => s.id !== existing.id) }));
    });
  }

  return (
    <div>
      <h3>{title}</h3>
      {existing ? (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={existing.image_data} alt={`Unterschrift ${existing.signer_name}`} style={{ maxWidth: "100%", height: 110, objectFit: "contain", background: "#fff", border: "1px solid var(--line)", borderRadius: 8 }} />
          <p className="small">
            {existing.signer_name}{existing.place ? `, ${existing.place}` : ""} · {fmtDateTime(existing.signed_at)}
          </p>
          {existing.comment && <p className="small muted">„{existing.comment}“</p>}
          {editable && <button className="btn small danger" onClick={() => void remove()}>Entfernen</button>}
        </div>
      ) : editable ? (
        <div className="row" style={{ flexDirection: "column", alignItems: "stretch" }}>
          <label className="field">Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="field">Ort<input value={place} onChange={(e) => setPlace(e.target.value)} /></label>
          {role === "bauherr" && (
            <label className="field">Übergabekommentar (optional)<input value={comment} onChange={(e) => setComment(e.target.value)} /></label>
          )}
          <SignaturePad label={`Unterschriftenfeld ${title}`} onChange={setImage} />
          <button className="btn primary" disabled={!image} onClick={() => void save()}>Unterschrift speichern</button>
        </div>
      ) : (
        <p className="muted">Keine Unterschrift.</p>
      )}
    </div>
  );
}
