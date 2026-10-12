"use client";

import { useCallback, useState } from "react";
import type { Project } from "@/lib/types";
import { NumberField, TextField } from "../Fields";
import { useProject } from "../ProjectContext";
import { SaveIndicator, useAutosave } from "../useAutosave";

export default function BauherrStep() {
  const { data, setData, editable, reload } = useProject();
  const onSaved = useCallback((p: Project) => setData((d) => ({ ...d, project: p })), [setData]);
  const { values: p, set, state, message, overwrite, discard } = useAutosave<Project>("projects", data.project, onSaved, {
    disabled: !editable,
  });
  const [geoMsg, setGeoMsg] = useState<string | null>(null);

  function locate() {
    if (!navigator.geolocation) return setGeoMsg("Standortbestimmung wird nicht unterstützt.");
    setGeoMsg("Standort wird ermittelt …");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set("site_lat", Math.round(pos.coords.latitude * 1e6) / 1e6);
        set("site_lng", Math.round(pos.coords.longitude * 1e6) / 1e6);
        setGeoMsg(`Genauigkeit ca. ${Math.round(pos.coords.accuracy)} m`);
      },
      () => setGeoMsg("Standort konnte nicht ermittelt werden."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <fieldset disabled={!editable} style={{ border: 0, padding: 0, margin: 0 }}>
      <div className="card">
        <div className="between">
          <h2 style={{ margin: 0 }}>Bauherr</h2>
          <SaveIndicator state={state} message={message} onOverwrite={overwrite} onDiscard={() => { discard(); void reload(); }} />
        </div>
        <div className="row" role="radiogroup" aria-label="Art des Bauherrn">
          <label className="check">
            <input type="radio" name="ct" checked={p.client_type === "person"} onChange={() => set("client_type", "person")} /> Privatperson
          </label>
          <label className="check">
            <input type="radio" name="ct" checked={p.client_type === "firma"} onChange={() => set("client_type", "firma")} /> Firma
          </label>
        </div>
        <div className="grid2">
          {p.client_type === "firma" ? (
            <TextField className="span2" label="Firma" required value={p.client_company} onValue={(v) => set("client_company", v)} />
          ) : (
            <>
              <TextField label="Vorname" value={p.client_first_name} onValue={(v) => set("client_first_name", v)} autoComplete="off" />
              <TextField label="Name" required value={p.client_last_name} onValue={(v) => set("client_last_name", v)} autoComplete="off" />
            </>
          )}
          {p.client_type === "firma" && (
            <TextField label="Ansprechpartner (optional)" value={p.client_last_name} onValue={(v) => set("client_last_name", v)} />
          )}
          <TextField label="Straße" required value={p.client_street} onValue={(v) => set("client_street", v)} />
          <TextField label="Hausnummer" value={p.client_house_no} onValue={(v) => set("client_house_no", v)} />
          <TextField label="Postleitzahl" required value={p.client_zip} onValue={(v) => set("client_zip", v)} inputMode="numeric" />
          <TextField label="Ort" required value={p.client_city} onValue={(v) => set("client_city", v)} />
          <TextField label="Land" value={p.client_country} onValue={(v) => set("client_country", v)} />
          <TextField label="Telefon" type="tel" value={p.client_phone} onValue={(v) => set("client_phone", v)} />
          <TextField label="E-Mail" type="email" value={p.client_email} onValue={(v) => set("client_email", v.trim())} />
        </div>
      </div>

      <div className="card">
        <h2>Anlagenstandort</h2>
        <label className="check">
          <input type="checkbox" checked={p.site_differs} onChange={(e) => set("site_differs", e.target.checked)} />
          Anlagenanschrift weicht von der Anschrift des Bauherrn ab
        </label>
        {p.site_differs && (
          <div className="grid2">
            <TextField label="Straße" required value={p.site_street} onValue={(v) => set("site_street", v)} />
            <TextField label="Hausnummer" value={p.site_house_no} onValue={(v) => set("site_house_no", v)} />
            <TextField label="Postleitzahl" required value={p.site_zip} onValue={(v) => set("site_zip", v)} inputMode="numeric" />
            <TextField label="Ort" required value={p.site_city} onValue={(v) => set("site_city", v)} />
            <TextField label="Land" value={p.site_country} onValue={(v) => set("site_country", v)} />
          </div>
        )}
        <h3>Geokoordinaten (optional)</h3>
        <div className="grid3">
          <NumberField label="Breitengrad" value={p.site_lat} onValue={(v) => set("site_lat", v)} step="0.000001" />
          <NumberField label="Längengrad" value={p.site_lng} onValue={(v) => set("site_lng", v)} step="0.000001" />
          <div style={{ alignSelf: "end" }}>
            <button type="button" className="btn" onClick={locate}>📍 Aktuellen Standort übernehmen</button>
          </div>
        </div>
        {geoMsg && <p className="muted small">{geoMsg}</p>}
      </div>
    </fieldset>
  );
}
