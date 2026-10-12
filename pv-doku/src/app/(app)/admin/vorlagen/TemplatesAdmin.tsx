"use client";

import { useState } from "react";
import { friendlyError } from "@/components/project/db";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Template } from "@/lib/types";

export default function TemplatesAdmin({ initial, companyId }: { initial: Template[]; companyId: string }) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  async function patch(id: string, p: Partial<Template>) {
    const { data, error } = await supabaseBrowser().from("templates").update(p).eq("id", id).select().single<Template>();
    if (error || !data) return setError(friendlyError(error?.message ?? "Fehler"));
    setItems((xs) => xs.map((x) => (x.id === id ? data : x)));
  }

  async function add(kind: Template["kind"]) {
    const sort = Math.max(0, ...items.filter((x) => x.kind === kind).map((x) => x.sort)) + 10;
    const { data, error } = await supabaseBrowser()
      .from("templates")
      .insert({ company_id: companyId, kind, sort, text: kind === "pruefung" ? "Neuer Prüfpunkt" : "Neuer Checklistenpunkt" })
      .select()
      .single<Template>();
    if (error || !data) return setError(friendlyError(error?.message ?? "Fehler"));
    setItems((xs) => [...xs, data]);
  }

  async function remove(id: string) {
    if (!window.confirm("Vorlagenpunkt löschen? Bestehende Projekte bleiben unverändert.")) return;
    const { error } = await supabaseBrowser().from("templates").delete().eq("id", id);
    if (error) return setError(friendlyError(error.message));
    setItems((xs) => xs.filter((x) => x.id !== id));
  }

  const section = (kind: Template["kind"], title: string) => (
    <div className="card">
      <div className="between">
        <h2 style={{ margin: 0 }}>{title}</h2>
        <button className="btn small" onClick={() => void add(kind)}>+ Punkt</button>
      </div>
      <div className="table-wrap">
        <table className="list">
          <thead>
            <tr><th>Reihenfolge</th><th>Text</th>{kind === "pruefung" && <th>Einheit</th>}<th>Pflicht</th><th>Aktiv</th><th /></tr>
          </thead>
          <tbody>
            {items.filter((x) => x.kind === kind).sort((a, b) => a.sort - b.sort).map((x) => (
              <tr key={x.id}>
                <td><input type="number" defaultValue={x.sort} style={{ width: 80 }} aria-label="Reihenfolge" onBlur={(e) => Number(e.target.value) !== x.sort && void patch(x.id, { sort: Number(e.target.value) })} /></td>
                <td><input defaultValue={x.text} aria-label="Text" onBlur={(e) => e.target.value.trim() && e.target.value !== x.text && void patch(x.id, { text: e.target.value.trim() })} /></td>
                {kind === "pruefung" && (
                  <td><input defaultValue={x.unit} style={{ width: 90 }} aria-label="Einheit" onBlur={(e) => e.target.value !== x.unit && void patch(x.id, { unit: e.target.value })} /></td>
                )}
                <td><input type="checkbox" checked={x.required} aria-label="Pflicht" onChange={(e) => void patch(x.id, { required: e.target.checked })} /></td>
                <td><input type="checkbox" checked={x.active} aria-label="Aktiv" onChange={(e) => void patch(x.id, { active: e.target.checked })} /></td>
                <td><button className="btn small danger" onClick={() => void remove(x.id)}>Löschen</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <>
      <div className="alert warn">
        Die Prüf- und Messwertvorlagen sind Beispiele. Vor Produktivsetzung müssen sie durch eine elektrotechnisch befähigte
        Person geprüft und freigegeben werden (Lastenheft F-013). Änderungen wirken nur auf neu angelegte Projekte.
      </div>
      {error && <div className="alert err" role="alert">{error}</div>}
      {section("checkliste", "Abschlusscheckliste")}
      {section("pruefung", "Prüf- und Inbetriebnahmewerte")}
    </>
  );
}
