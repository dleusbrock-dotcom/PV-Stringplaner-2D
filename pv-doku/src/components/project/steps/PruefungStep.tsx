"use client";

import { useState } from "react";
import { CHECK_STATUS_LABELS, TEST_STATUS_LABELS } from "@/lib/constants";
import type { ChecklistItem, TestValue } from "@/lib/types";
import { useProject } from "../ProjectContext";
import { attempt, must, sb } from "../db";

// Prüf-/Inbetriebnahmewerte (F-013) und Abschlusscheckliste (F-014)

export default function PruefungStep() {
  const { data } = useProject();
  const openTests = data.testValues.filter((t) => t.required && !t.status).length;
  const openChecks = data.checklist.filter((c) => c.required && !c.status).length;
  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Prüf- und Inbetriebnahmewerte</h2>
        <p className="muted small">
          Pflichtpunkte sind mit * gekennzeichnet. Offen: {openTests}. Die Prüfinhalte sind vor Produktivsetzung durch eine
          elektrotechnisch befähigte Person freizugeben (Verwaltung → Vorlagen).
        </p>
        {data.testValues.map((t) => <TestRow key={t.id} item={t} />)}
        <AddItem kind="test" />
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Abschlusscheckliste</h2>
        <p className="muted small">
          Offene Pflichtpunkte: {openChecks}. Bei „nicht erledigt“ ist eine Begründung erforderlich (begründete Abweichung).
        </p>
        {data.checklist.map((c) => <CheckRow key={c.id} item={c} />)}
        <AddItem kind="check" />
      </div>
    </>
  );
}

function useRowUpdate<T extends { id: string }>(table: "test_values" | "checklist_items", key: "testValues" | "checklist") {
  const { setData } = useProject();
  return async (id: string, patch: Partial<T>) => {
    await attempt(async () => {
      const row = await must(sb().from(table).update(patch as Record<string, unknown>).eq("id", id).select().single<T>());
      setData((d) => ({ ...d, [key]: (d[key] as unknown as T[]).map((x) => (x.id === id ? row : x)) }));
    });
  };
}

function StatusButtons<S extends string>({
  value,
  labels,
  onChange,
  disabled,
  name,
}: {
  value: S | null;
  labels: Record<S, string>;
  onChange: (v: S | null) => void;
  disabled: boolean;
  name: string;
}) {
  return (
    <div className="row" role="radiogroup" aria-label={name} style={{ gap: "0.35rem" }}>
      {(Object.keys(labels) as S[]).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          disabled={disabled}
          className={`btn small ${value === k ? "active" : ""}`}
          onClick={() => onChange(value === k ? null : k)}
        >
          {labels[k]}
        </button>
      ))}
    </div>
  );
}

function TestRow({ item }: { item: TestValue }) {
  const { editable, setData } = useProject();
  const update = useRowUpdate<TestValue>("test_values", "testValues");
  const [value, setValue] = useState(item.value);
  const [comment, setComment] = useState(item.comment);
  const missingValue = item.required && item.status === "geprueft" && item.unit && !item.value.trim();
  const missing = item.required && !item.status;

  async function remove() {
    if (!window.confirm("Prüfpunkt entfernen?")) return;
    await attempt(async () => {
      await must(sb().from("test_values").delete().eq("id", item.id));
      setData((d) => ({ ...d, testValues: d.testValues.filter((x) => x.id !== item.id) }));
    });
  }

  return (
    <div style={{ borderTop: "1px solid var(--line)", padding: "0.75rem 0" }} id={`test-${item.id}`}>
      <div className="between">
        <strong>
          {item.label} {item.required && <span className="req" style={{ color: "var(--err)" }}>*</span>}
        </strong>
        {missing && <span className="badge err">offen</span>}
        {missingValue && <span className="badge err">Messwert fehlt</span>}
      </div>
      <div className="row" style={{ marginTop: "0.4rem", alignItems: "flex-start" }}>
        <StatusButtons
          name={`Status ${item.label}`}
          value={item.status}
          labels={TEST_STATUS_LABELS}
          disabled={!editable}
          onChange={(v) => void update(item.id, { status: v })}
        />
        {item.unit !== "" && (
          <label className="row" style={{ gap: "0.35rem", flexWrap: "nowrap" }}>
            <input
              value={value}
              inputMode="decimal"
              aria-label={`Messwert ${item.label}`}
              aria-invalid={missingValue ? true : undefined}
              disabled={!editable}
              style={{ width: 130 }}
              onChange={(e) => setValue(e.target.value)}
              onBlur={() => value !== item.value && void update(item.id, { value })}
            />
            <span>{item.unit}</span>
          </label>
        )}
        <input
          value={comment}
          placeholder="Kommentar"
          aria-label={`Kommentar ${item.label}`}
          disabled={!editable}
          style={{ flex: "1 1 200px", width: "auto" }}
          onChange={(e) => setComment(e.target.value)}
          onBlur={() => comment !== item.comment && void update(item.id, { comment })}
        />
        {editable && !item.required && <button className="btn small danger" onClick={() => void remove()}>Entfernen</button>}
      </div>
    </div>
  );
}

function CheckRow({ item }: { item: ChecklistItem }) {
  const { editable, setData } = useProject();
  const update = useRowUpdate<ChecklistItem>("checklist_items", "checklist");
  const [comment, setComment] = useState(item.comment);
  const needsReason = item.required && item.status === "nicht_erledigt" && !item.comment.trim();

  async function remove() {
    if (!window.confirm("Checklistenpunkt entfernen?")) return;
    await attempt(async () => {
      await must(sb().from("checklist_items").delete().eq("id", item.id));
      setData((d) => ({ ...d, checklist: d.checklist.filter((x) => x.id !== item.id) }));
    });
  }

  return (
    <div style={{ borderTop: "1px solid var(--line)", padding: "0.75rem 0" }}>
      <div className="between">
        <strong>
          {item.text} {item.required && <span style={{ color: "var(--err)" }}>*</span>}
        </strong>
        {item.required && !item.status && <span className="badge err">offen</span>}
      </div>
      <div className="row" style={{ marginTop: "0.4rem" }}>
        <StatusButtons
          name={`Status ${item.text}`}
          value={item.status}
          labels={CHECK_STATUS_LABELS}
          disabled={!editable}
          onChange={(v) => void update(item.id, { status: v })}
        />
        <input
          value={comment}
          placeholder={item.status === "nicht_erledigt" ? "Begründung der Abweichung (Pflicht)" : "Kommentar"}
          aria-label={`Kommentar ${item.text}`}
          aria-invalid={needsReason ? true : undefined}
          disabled={!editable}
          style={{ flex: "1 1 220px", width: "auto" }}
          onChange={(e) => setComment(e.target.value)}
          onBlur={() => comment !== item.comment && void update(item.id, { comment })}
        />
        {editable && !item.required && <button className="btn small danger" onClick={() => void remove()}>Entfernen</button>}
      </div>
    </div>
  );
}

function AddItem({ kind }: { kind: "test" | "check" }) {
  const { data, setData, editable } = useProject();
  const [text, setText] = useState("");
  const [unit, setUnit] = useState("");
  if (!editable) return null;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    await attempt(async () => {
      if (kind === "test") {
        const sort = Math.max(0, ...data.testValues.map((t) => t.sort)) + 10;
        const row = await must(
          sb().from("test_values").insert({ project_id: data.project.id, label: text.trim(), unit: unit.trim(), sort }).select().single<TestValue>(),
        );
        setData((d) => ({ ...d, testValues: [...d.testValues, row] }));
      } else {
        const sort = Math.max(0, ...data.checklist.map((t) => t.sort)) + 10;
        const row = await must(
          sb().from("checklist_items").insert({ project_id: data.project.id, text: text.trim(), sort }).select().single<ChecklistItem>(),
        );
        setData((d) => ({ ...d, checklist: [...d.checklist, row] }));
      }
      setText("");
      setUnit("");
    });
  }

  return (
    <form className="row" onSubmit={add} style={{ borderTop: "1px solid var(--line)", paddingTop: "0.75rem" }}>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={kind === "test" ? "Weiterer Prüfpunkt (optional)" : "Weiterer Checklistenpunkt (optional)"}
        aria-label={kind === "test" ? "Neuer Prüfpunkt" : "Neuer Checklistenpunkt"}
        style={{ flex: "1 1 240px", width: "auto" }}
      />
      {kind === "test" && (
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Einheit" aria-label="Einheit" style={{ width: 100 }} />
      )}
      <button className="btn small">Hinzufügen</button>
    </form>
  );
}
