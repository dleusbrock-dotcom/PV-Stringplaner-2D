"use client";

import { useCallback } from "react";
import { COMPONENT_LABELS, COMPONENT_PHOTO_CATEGORY } from "@/lib/constants";
import type { Component, ComponentCategory } from "@/lib/types";
import { NumberField, SelectField, TextArea, TextField } from "../Fields";
import { AttachedPhotos } from "../Photos";
import { useProject } from "../ProjectContext";
import { SaveIndicator, useAutosave } from "../useAutosave";
import { attempt, must, sb } from "../db";

const CATEGORIES = Object.keys(COMPONENT_LABELS) as ComponentCategory[];

export default function KomponentenStep() {
  const { data, setData, editable } = useProject();

  async function add(category: ComponentCategory) {
    await attempt(async () => {
      const row = await must(
        sb()
          .from("components")
          .insert({ project_id: data.project.id, category, commissioning_date: data.project.installation_date })
          .select()
          .single<Component>(),
      );
      setData((d) => ({ ...d, components: [...d.components, row] }));
    });
  }

  return (
    <>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Komponenten</h2>
        <p className="muted">Wechselrichter, Speicher, Datenlogger, Smart Meter, Wallbox und weitere Komponenten – je Komponente mit Seriennummer und Foto des Typenschilds.</p>
        {editable && (
          <div className="row">
            {CATEGORIES.map((c) => (
              <button key={c} className="btn small" onClick={() => void add(c)}>+ {COMPONENT_LABELS[c]}</button>
            ))}
          </div>
        )}
      </div>
      {data.components.length === 0 && <p className="muted">Noch keine Komponenten erfasst.</p>}
      {data.components.map((c) => (
        <ComponentCard key={c.id} component={c} />
      ))}
    </>
  );
}

function ComponentCard({ component }: { component: Component }) {
  const { data, setData, editable, reload } = useProject();
  const onSaved = useCallback(
    (row: Component) => setData((d) => ({ ...d, components: d.components.map((x) => (x.id === row.id ? row : x)) })),
    [setData],
  );
  const { values: c, set, state, message, overwrite, discard } = useAutosave<Component>("components", component, onSaved, {
    disabled: !editable,
  });
  const strings = data.strings.filter((s) => s.inverter_id === c.id);

  async function remove() {
    if (!window.confirm(`${COMPONENT_LABELS[c.category]} wirklich löschen?`)) return;
    await attempt(async () => {
      await must(sb().from("components").delete().eq("id", c.id));
      setData((d) => ({
        ...d,
        components: d.components.filter((x) => x.id !== c.id),
        strings: d.strings.map((s) => (s.inverter_id === c.id ? { ...s, inverter_id: null } : s)),
      }));
    });
  }

  return (
    <div className="card">
      <div className="between">
        <h3 style={{ margin: 0 }}>
          {COMPONENT_LABELS[c.category]} {c.manufacturer || c.model ? `· ${c.manufacturer} ${c.model}` : ""}
        </h3>
        <div className="row">
          <SaveIndicator state={state} message={message} onOverwrite={overwrite} onDiscard={() => { discard(); void reload(); }} />
          {editable && <button className="btn small danger" onClick={() => void remove()}>Löschen</button>}
        </div>
      </div>
      <fieldset disabled={!editable} style={{ border: 0, padding: 0, margin: "0.75rem 0" }}>
        <div className="grid3">
          <SelectField
            label="Kategorie"
            required
            value={c.category}
            onValue={(v) => v && set("category", v)}
            options={CATEGORIES.map((k) => ({ value: k, label: COMPONENT_LABELS[k] }))}
          />
          <TextField label="Hersteller" required value={c.manufacturer} onValue={(v) => set("manufacturer", v)} />
          <TextField label="Modell" required value={c.model} onValue={(v) => set("model", v)} />
          <TextField label="Seriennummer" value={c.serial_no} onValue={(v) => set("serial_no", v)} autoCapitalize="characters" />
          <TextField label="Einbauort" value={c.location} onValue={(v) => set("location", v)} placeholder="z. B. Keller, Technikraum" />
          <TextField label="Inbetriebnahmedatum" type="date" value={c.commissioning_date} onValue={(v) => set("commissioning_date", v || null)} />
          {(c.category === "wechselrichter" || c.category === "wallbox") && (
            <NumberField label="Nennleistung (kW)" value={c.rated_power_kw} min={0} onValue={(v) => set("rated_power_kw", v)} />
          )}
          {c.category === "speicher" && (
            <NumberField label="Kapazität (kWh)" value={c.capacity_kwh} min={0} onValue={(v) => set("capacity_kwh", v)} />
          )}
          <TextArea className="span2" label="Bemerkung" value={c.notes} onValue={(v) => set("notes", v)} rows={2} />
        </div>
      </fieldset>
      {c.category === "wechselrichter" && strings.length > 0 && (
        <p className="small muted">Zugeordnete Strings: {strings.map((s) => `${s.name}${s.mpp_tracker ? ` (MPP ${s.mpp_tracker})` : ""}`).join(", ")}</p>
      )}
      <h3>Fotos (Typenschild / Einbausituation)</h3>
      <AttachedPhotos
        filter={(f) => f.component_id === c.id}
        meta={{ category: COMPONENT_PHOTO_CATEGORY[c.category], component_id: c.id, caption: `${COMPONENT_LABELS[c.category]} ${c.model}`.trim() }}
      />
    </div>
  );
}
