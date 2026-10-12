"use client";

import { useEffect, useState } from "react";
import { fmtDateTime } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";
import { useProject } from "../ProjectContext";
import { sb } from "../db";

const ACTIONS: Record<string, string> = {
  insert: "angelegt",
  update: "geändert",
  delete: "gelöscht",
  status: "Statuswechsel",
  pdf_export: "PDF erzeugt",
  json_export: "JSON exportiert",
  csv_export: "CSV exportiert",
  backup_export: "Backup exportiert",
  import: "importiert",
};

const OBJECTS: Record<string, string> = {
  projects: "Projekt",
  project_members: "Zuweisung",
  module_types: "Modultyp",
  roof_surfaces: "Dachfläche",
  grid: "Modulraster",
  components: "Komponente",
  strings: "String",
  defects: "Mangel",
  files: "Foto/Datei",
  test_values: "Prüfwert",
  checklist_items: "Checkliste",
  signatures: "Unterschrift",
};

function summary(e: AuditEntry): string {
  const d = e.details ?? {};
  if (e.action === "status") return `${d.von ?? ""} → ${d.nach ?? ""}${d.comment ? ` („${d.comment}“)` : ""}`;
  if (e.action === "update" && e.object_type === "grid") return `${d.module ?? 0} Module`;
  if (e.action === "update") {
    return Object.entries(d)
      .map(([k, v]) => {
        const nv = (v as { neu?: unknown })?.neu;
        const s = nv == null ? "–" : typeof nv === "object" ? JSON.stringify(nv) : String(nv);
        return `${k}: ${s.length > 40 ? `${s.slice(0, 40)}…` : s}`;
      })
      .join(", ");
  }
  const label = (d.name ?? d.label ?? d.text ?? d.description ?? d.file_name ?? d.model ?? "") as string;
  return String(label).slice(0, 80);
}

export default function ProtokollStep() {
  const { data } = useProject();
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);

  useEffect(() => {
    void sb()
      .from("audit_log")
      .select("*")
      .eq("project_id", data.project.id)
      .order("at", { ascending: false })
      .limit(500)
      .then(({ data }) => setEntries((data ?? []) as AuditEntry[]));
  }, [data.project.id, data.project.updated_at]);

  return (
    <div className="card">
      <h2 style={{ marginTop: 0 }}>Änderungsprotokoll</h2>
      <p className="muted small">Wesentliche Änderungen, Statuswechsel, Freigaben und Exporte mit Benutzer und Zeitpunkt (neueste zuerst, max. 500).</p>
      {!entries ? (
        <p className="muted">Wird geladen …</p>
      ) : (
        <div className="table-wrap">
          <table className="list">
            <thead><tr><th>Zeitpunkt</th><th>Benutzer</th><th>Vorgang</th><th>Objekt</th><th>Version</th><th>Details</th></tr></thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(e.at)}</td>
                  <td>{e.user_email || "System"}</td>
                  <td>{ACTIONS[e.action] ?? e.action}</td>
                  <td>{OBJECTS[e.object_type] ?? e.object_type}</td>
                  <td>{e.version ? `v${e.version}` : ""}</td>
                  <td className="small">{summary(e)}</td>
                </tr>
              ))}
              {entries.length === 0 && <tr><td colSpan={6} className="muted">Keine Einträge.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
