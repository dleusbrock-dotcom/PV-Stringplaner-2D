"use client";

import { useCallback } from "react";
import { DEFECT_CATEGORIES, DEFECT_PRIORITY_LABELS, DEFECT_STATUS_LABELS } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import type { Defect } from "@/lib/types";
import { SelectField, TextArea, TextField } from "../Fields";
import { AttachedPhotos } from "../Photos";
import { useProject } from "../ProjectContext";
import { SaveIndicator, useAutosave } from "../useAutosave";
import { attempt, must, sb } from "../db";

export default function MaengelStep() {
  const { data, setData, editable } = useProject();
  const open = data.defects.filter((d) => d.status !== "erledigt");

  async function add() {
    const description = window.prompt("Kurzbeschreibung des Mangels bzw. der Restarbeit:");
    if (!description?.trim()) return;
    await attempt(async () => {
      const row = await must(
        sb().from("defects").insert({ project_id: data.project.id, description: description.trim() }).select().single<Defect>(),
      );
      setData((d) => ({ ...d, defects: [...d.defects, row] }));
    });
  }

  return (
    <>
      <div className="card">
        <div className="between">
          <h2 style={{ margin: 0 }}>Mängel und Restpunkte</h2>
          {editable && <button className="btn primary" onClick={() => void add()}>+ Mangel erfassen</button>}
        </div>
        {open.length > 0 ? (
          <div className="alert warn" style={{ marginTop: "0.75rem" }}>
            <strong>{open.length} offene(r) Punkt(e)</strong>
            {open.some((d) => d.priority === "hoch") && " – darunter mit hoher Priorität (blockiert den Abschluss)."}
          </div>
        ) : (
          <p className="muted">Keine offenen Mängel.</p>
        )}
      </div>
      {[...data.defects]
        .sort((a, b) => Number(a.status === "erledigt") - Number(b.status === "erledigt"))
        .map((d) => (
          <DefectCard key={d.id} defect={d} />
        ))}
    </>
  );
}

function DefectCard({ defect }: { defect: Defect }) {
  const { setData, editable, reload } = useProject();
  const onSaved = useCallback(
    (row: Defect) => setData((d) => ({ ...d, defects: d.defects.map((x) => (x.id === row.id ? row : x)) })),
    [setData],
  );
  const { values: m, set, state, message, overwrite, discard } = useAutosave<Defect & { updated_at?: string }>("defects", defect, onSaved, {
    disabled: !editable,
  });

  async function remove() {
    if (!window.confirm("Mangel löschen?")) return;
    await attempt(async () => {
      await must(sb().from("defects").delete().eq("id", m.id));
      setData((d) => ({ ...d, defects: d.defects.filter((x) => x.id !== m.id) }));
    });
  }

  return (
    <div className="card" style={m.status !== "erledigt" ? { borderLeft: `5px solid ${m.priority === "hoch" ? "var(--err)" : "#f59e0b"}` } : { opacity: 0.85 }}>
      <div className="between">
        <div className="row">
          <span className={`badge ${m.status === "erledigt" ? "ok" : m.priority === "hoch" ? "err" : "warn"}`}>
            {DEFECT_STATUS_LABELS[m.status]}
          </span>
          <span className="muted small">erfasst {fmtDate(defect.created_at)}</span>
        </div>
        <div className="row">
          <SaveIndicator state={state} message={message} onOverwrite={overwrite} onDiscard={() => { discard(); void reload(); }} />
          {editable && <button className="btn small danger" onClick={() => void remove()}>Löschen</button>}
        </div>
      </div>
      <fieldset disabled={!editable} style={{ border: 0, padding: 0, margin: "0.5rem 0" }}>
        <div className="grid3">
          <TextArea className="span2" label="Beschreibung" value={m.description} onValue={(v) => set("description", v)} rows={2} />
          <SelectField
            label="Kategorie"
            value={m.category}
            onValue={(v) => set("category", v ?? "sonstiges")}
            options={DEFECT_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <SelectField
            label="Priorität"
            value={m.priority}
            onValue={(v) => v && set("priority", v)}
            options={Object.entries(DEFECT_PRIORITY_LABELS).map(([value, label]) => ({ value: value as Defect["priority"], label }))}
          />
          <TextField label="Verantwortlich" value={m.responsible} onValue={(v) => set("responsible", v)} />
          <TextField label="Fällig bis" type="date" value={m.due_date} onValue={(v) => set("due_date", v || null)} />
          <SelectField
            label="Status"
            value={m.status}
            onValue={(v) => v && set("status", v)}
            options={Object.entries(DEFECT_STATUS_LABELS).map(([value, label]) => ({ value: value as Defect["status"], label }))}
          />
        </div>
      </fieldset>
      <AttachedPhotos filter={(f) => f.defect_id === m.id} meta={{ category: "mangel", defect_id: m.id, caption: m.description.slice(0, 80) }} />
    </div>
  );
}
