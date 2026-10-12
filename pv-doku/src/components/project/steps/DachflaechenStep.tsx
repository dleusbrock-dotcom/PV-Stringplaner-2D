"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { COMPONENT_LABELS, ORIENTATION_LABELS, ORIENTATIONS, STRING_COLORS } from "@/lib/constants";
import { fmtKwp } from "@/lib/format";
import { countModules, powerKwp, stringStats } from "@/lib/grid";
import type { GridCell, ModuleType, Orientation, PvString, RoofSurface, RoofWithCells } from "@/lib/types";
import { NumberField, TextArea, TextField } from "../Fields";
import GridEditor from "../GridEditor";
import { useProject } from "../ProjectContext";
import { SaveIndicator, useAutosave, type SaveState } from "../useAutosave";
import { attempt, friendlyError, must, sb } from "../db";

const ROOF_TYPES = ["Satteldach", "Pultdach", "Walmdach", "Krüppelwalmdach", "Zeltdach", "Mansarddach", "Flachdach", "Sonstige"];
const COVERINGS = ["Tonziegel", "Betondachstein", "Schiefer", "Trapezblech", "Stehfalz", "Faserzement", "Bitumen", "Folie", "Kies", "Sonstige"];
const MOUNTINGS = ["Aufdach", "Indach", "Flachdach aufgeständert (Süd)", "Flachdach Ost-West", "Fassade", "Freifläche", "Sonstige"];

const GRID_DRAFT = "pvdoku:grid:";

export default function DachflaechenStep() {
  const { data, setData, editable } = useProject();
  const [activeId, setActiveId] = useState<string | null>(data.roofs[0]?.id ?? null);
  const active = data.roofs.find((r) => r.id === activeId) ?? data.roofs[0] ?? null;
  const gridSave = useGridSaver();

  const mt = new Map(data.moduleTypes.map((m) => [m.id, m]));
  const totalModules = data.roofs.reduce((s, r) => s + countModules(r.cells), 0);
  const totalKwp = data.roofs.reduce(
    (s, r) => s + powerKwp(countModules(r.cells), r.module_type_id ? mt.get(r.module_type_id)?.power_wp : 0),
    0,
  );

  async function addRoof() {
    const name = window.prompt("Bezeichnung der Dachfläche (z. B. Haus Süd, Garage Ost):", `Dachfläche ${data.roofs.length + 1}`);
    if (!name?.trim()) return;
    await attempt(async () => {
      const row = await must(
        sb()
          .from("roof_surfaces")
          .insert({
            project_id: data.project.id,
            name: name.trim(),
            sort: data.roofs.length,
            module_type_id: data.moduleTypes[0]?.id ?? null,
          })
          .select()
          .single<RoofSurface>(),
      );
      setData((d) => ({ ...d, roofs: [...d.roofs, { ...row, cells: [] }] }));
      setActiveId(row.id);
    });
  }

  async function duplicateRoof(r: RoofWithCells) {
    await attempt(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, cells, updated_at, ...rest } = r;
      const row = await must(
        sb()
          .from("roof_surfaces")
          .insert({ ...rest, name: `${r.name} (Kopie)`.slice(0, 100), sort: data.roofs.length })
          .select()
          .single<RoofSurface>(),
      );
      // Kopie ohne String-Zuordnungen und Seriennummern
      const copied = cells.map((c) => ({ ...c, string_id: null, serial_no: "" }));
      await must(sb().rpc("save_grid", { p_roof: row.id, p_cells: copied }));
      setData((d) => ({ ...d, roofs: [...d.roofs, { ...row, cells: copied }] }));
      setActiveId(row.id);
    });
  }

  async function deleteRoof(r: RoofWithCells) {
    if (!window.confirm(`Dachfläche „${r.name}“ mit ${countModules(r.cells)} Modulen wirklich löschen?`)) return;
    await attempt(async () => {
      await must(sb().from("roof_surfaces").delete().eq("id", r.id));
      setData((d) => ({ ...d, roofs: d.roofs.filter((x) => x.id !== r.id) }));
      setActiveId(null);
    });
  }

  function patchRoofLocal(id: string, patch: Partial<RoofWithCells>) {
    setData((d) => ({ ...d, roofs: d.roofs.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  }

  function onCellsChange(roofId: string, cells: GridCell[]) {
    patchRoofLocal(roofId, { cells });
    gridSave.schedule(roofId, cells);
  }

  return (
    <>
      <div className="card">
        <div className="between">
          <h2 style={{ margin: 0 }}>Dachflächen</h2>
          <div className="kpis">
            <div className="kpi"><b>{totalModules}</b><span>Module gesamt</span></div>
            <div className="kpi"><b>{fmtKwp(totalKwp)}</b><span>installierte Leistung</span></div>
          </div>
        </div>
        <div className="tabs" role="tablist" aria-label="Dachflächen" style={{ marginTop: "0.75rem" }}>
          {data.roofs.map((r) => (
            <button
              key={r.id}
              role="tab"
              aria-selected={active?.id === r.id}
              className={`btn small ${active?.id === r.id ? "active" : ""}`}
              onClick={() => setActiveId(r.id)}
            >
              {r.name} {r.orientation ? `(${r.orientation})` : ""} · {countModules(r.cells)}
            </button>
          ))}
          {editable && <button className="btn small primary" onClick={() => void addRoof()}>+ Dachfläche</button>}
        </div>
        {data.roofs.length === 0 && <p className="muted">Noch keine Dachfläche angelegt.</p>}
        <SaveIndicator state={gridSave.state} message={gridSave.message} />
      </div>

      {active && (
        <RoofPanel
          key={active.id}
          roof={active}
          onLocalPatch={(patch) => patchRoofLocal(active.id, patch)}
          onCellsChange={(cells) => onCellsChange(active.id, cells)}
          onDuplicate={() => void duplicateRoof(active)}
          onDelete={() => void deleteRoof(active)}
        />
      )}

      <ModuleTypes />
      <Strings />
    </>
  );
}

/** Speichert Raster verzögert per RPC; hält bis zum Erfolg eine lokale Kopie (F-021). */
function useGridSaver() {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const latest = useRef(new Map<string, GridCell[]>());
  const [state, setState] = useState<SaveState>("saved");
  const [message, setMessage] = useState<string | null>(null);

  const save = useCallback(async (roofId: string) => {
    const cells = latest.current.get(roofId);
    if (!cells) return;
    setState("saving");
    const { error } = await sb().rpc("save_grid", { p_roof: roofId, p_cells: cells });
    if (error) {
      const offline = !navigator.onLine || /fetch|network/i.test(error.message);
      setState(offline ? "offline" : "error");
      setMessage(offline ? "Keine Verbindung – das Raster ist lokal gesichert und wird automatisch nachgesendet." : friendlyError(error.message));
      return;
    }
    if (latest.current.get(roofId) === cells) {
      latest.current.delete(roofId);
      try {
        localStorage.removeItem(GRID_DRAFT + roofId);
      } catch {}
    }
    if (latest.current.size === 0) {
      setState("saved");
      setMessage(null);
    }
  }, []);

  const schedule = useCallback(
    (roofId: string, cells: GridCell[]) => {
      latest.current.set(roofId, cells);
      try {
        localStorage.setItem(GRID_DRAFT + roofId, JSON.stringify(cells));
      } catch {}
      setState("dirty");
      const t = timers.current.get(roofId);
      if (t) clearTimeout(t);
      timers.current.set(roofId, setTimeout(() => void save(roofId), 600));
    },
    [save],
  );

  useEffect(() => {
    const timersMap = timers.current;
    const flushAll = () => {
      for (const id of latest.current.keys()) void save(id);
    };
    window.addEventListener("online", flushAll);
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (latest.current.size > 0) e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("online", flushAll);
      window.removeEventListener("beforeunload", beforeUnload);
      // Beim Verlassen des Schritts ausstehende Änderungen sofort senden
      for (const t of timersMap.values()) clearTimeout(t);
      flushAll();
    };
  }, [save]);

  return { schedule, state, message };
}

function RoofPanel({
  roof,
  onLocalPatch,
  onCellsChange,
  onDuplicate,
  onDelete,
}: {
  roof: RoofWithCells;
  onLocalPatch: (patch: Partial<RoofWithCells>) => void;
  onCellsChange: (cells: GridCell[]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { data, editable, reload } = useProject();
  const onSaved = useCallback(
    // Rasterzellen nicht überschreiben – sie werden separat gespeichert
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (r: RoofSurface & { cells?: unknown }) => { const { cells, ...rest } = r; onLocalPatch(rest); },
    [onLocalPatch],
  );
  const { values: r, set, state, message, overwrite, discard, flush } = useAutosave<RoofSurface>("roof_surfaces", roof, onSaved, {
    disabled: !editable,
  });
  const restored = useRef(false);

  // Lokal gesichertes, noch nicht gespeichertes Raster wiederherstellen
  useEffect(() => {
    if (restored.current || !editable) return;
    restored.current = true;
    try {
      const raw = localStorage.getItem(GRID_DRAFT + roof.id);
      if (raw) onCellsChange(JSON.parse(raw) as GridCell[]);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roof.id]);

  const moduleType = data.moduleTypes.find((m) => m.id === r.module_type_id);
  const n = countModules(roof.cells);

  function resize(key: "grid_rows" | "grid_cols", value: number | null) {
    if (value == null || value < 1) return;
    const max = key === "grid_rows" ? 40 : 60;
    const v = Math.min(Math.round(value), max);
    const rows = key === "grid_rows" ? v : r.grid_rows;
    const cols = key === "grid_cols" ? v : r.grid_cols;
    const lost = roof.cells.filter((c) => c.row >= rows || c.col >= cols).length;
    if (lost > 0 && !window.confirm(`Beim Verkleinern werden ${lost} belegte/markierte Positionen entfernt. Fortfahren?`)) return;
    set(key, v);
    // Rastergröße sofort speichern, damit nachfolgende Rasteränderungen gültig sind
    void flush();
    if (lost > 0) onCellsChange(roof.cells.filter((c) => c.row < rows && c.col < cols));
  }

  return (
    <div className="card">
      <div className="between">
        <h2 style={{ margin: 0 }}>{r.name}</h2>
        <div className="row">
          <SaveIndicator state={state} message={message} onOverwrite={overwrite} onDiscard={() => { discard(); void reload(); }} />
          {editable && (
            <>
              <button className="btn small" onClick={onDuplicate}>Duplizieren</button>
              <button className="btn small danger" onClick={onDelete}>Löschen</button>
            </>
          )}
        </div>
      </div>

      <fieldset disabled={!editable} style={{ border: 0, padding: 0, margin: "0.75rem 0 0" }}>
        <div className="grid3">
          <TextField label="Bezeichnung" required value={r.name} onValue={(v) => set("name", v)} maxLength={100} />
          <label className="field">
            <span>Dachform</span>
            <input list="roof-types" value={r.roof_type} onChange={(e) => set("roof_type", e.target.value)} />
          </label>
          <NumberField label="Dachneigung (°)" value={r.tilt_deg} min={0} max={90} onValue={(v) => set("tilt_deg", v)} />
          <label className="field">
            <span>Eindeckung</span>
            <input list="coverings" value={r.covering} onChange={(e) => set("covering", e.target.value)} />
          </label>
          <label className="field">
            <span>Montageart</span>
            <input list="mountings" value={r.mounting} onChange={(e) => set("mounting", e.target.value)} />
          </label>
          <div className="row">
            <NumberField label="Breite (m, optional)" value={r.width_m} min={0} onValue={(v) => set("width_m", v)} />
            <NumberField label="Länge (m, optional)" value={r.length_m} min={0} onValue={(v) => set("length_m", v)} />
          </div>
        </div>

        <div className="field" style={{ marginTop: "0.75rem" }}>
          <span className="muted" style={{ fontWeight: 600, fontSize: "0.9rem" }}>
            Himmelsrichtung <span className="req" aria-hidden>*</span>
          </span>
          <div className="row" role="radiogroup" aria-label="Himmelsrichtung">
            {ORIENTATIONS.map((o) => (
              <button
                key={o}
                type="button"
                role="radio"
                aria-checked={r.orientation === o}
                className={`btn small ${r.orientation === o ? "active" : ""}`}
                style={{ minWidth: 52 }}
                title={ORIENTATION_LABELS[o]}
                onClick={() => set("orientation", o as Orientation)}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div className="grid3" style={{ marginTop: "0.75rem" }}>
          <NumberField label="Reihen" value={r.grid_rows} min={1} max={40} onValue={(v) => resize("grid_rows", v)} />
          <NumberField label="Spalten" value={r.grid_cols} min={1} max={60} onValue={(v) => resize("grid_cols", v)} />
          <label className="field">
            <span>Modultyp <span className="req" aria-hidden>*</span></span>
            <select value={r.module_type_id ?? ""} onChange={(e) => set("module_type_id", e.target.value || null)}>
              <option value="">– Modultyp wählen (unten anlegen) –</option>
              {data.moduleTypes.map((m) => (
                <option key={m.id} value={m.id}>
                  {[m.manufacturer, m.model].filter(Boolean).join(" ") || "ohne Bezeichnung"} · {m.power_wp} Wp
                </option>
              ))}
            </select>
          </label>
        </div>
        <TextArea label="Bemerkung" value={r.remark} onValue={(v) => set("remark", v)} rows={2} />
      </fieldset>

      <datalist id="roof-types">{ROOF_TYPES.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="coverings">{COVERINGS.map((x) => <option key={x} value={x} />)}</datalist>
      <datalist id="mountings">{MOUNTINGS.map((x) => <option key={x} value={x} />)}</datalist>

      <h3>Modulbelegung</h3>
      <p className="muted small">
        Tippen/Klicken setzt oder entfernt ein Modul, Ziehen bearbeitet mehrere Positionen.
        {moduleType ? ` Leistung dieser Fläche: ${n} × ${moduleType.power_wp} Wp = ${fmtKwp(powerKwp(n, moduleType.power_wp))}.` : ""}
      </p>
      <GridEditor
        roof={r}
        cells={roof.cells}
        strings={data.strings}
        editable={editable}
        onChange={onCellsChange}
        onRoofPatch={(patch) => {
          for (const [k, v] of Object.entries(patch)) set(k as keyof RoofSurface, v as never);
        }}
      />
    </div>
  );
}

function ModuleTypes() {
  const { data, setData, editable } = useProject();

  async function add() {
    await attempt(async () => {
      const row = await must(
        sb().from("module_types").insert({ project_id: data.project.id }).select().single<ModuleType>(),
      );
      setData((d) => ({ ...d, moduleTypes: [...d.moduleTypes, row] }));
    });
  }

  return (
    <div className="card">
      <div className="between">
        <h2 style={{ margin: 0 }}>Modultypen</h2>
        {editable && <button className="btn small" onClick={() => void add()}>+ Modultyp</button>}
      </div>
      {data.moduleTypes.length === 0 && <p className="muted">Noch kein Modultyp angelegt.</p>}
      {data.moduleTypes.map((m) => (
        <ModuleTypeRow key={m.id} mt={m} />
      ))}
    </div>
  );
}

function ModuleTypeRow({ mt }: { mt: ModuleType }) {
  const { data, setData, editable } = useProject();
  const onSaved = useCallback(
    (row: ModuleType) => setData((d) => ({ ...d, moduleTypes: d.moduleTypes.map((x) => (x.id === row.id ? row : x)) })),
    [setData],
  );
  const { values: m, set, state, message } = useAutosave<ModuleType & { updated_at?: string }>("module_types", mt, onSaved, {
    disabled: !editable,
  });
  const used = data.roofs.filter((r) => r.module_type_id === mt.id);
  const count = used.reduce((s, r) => s + countModules(r.cells), 0);

  async function remove() {
    if (used.length > 0) return window.alert("Der Modultyp wird noch auf einer Dachfläche verwendet.");
    await attempt(async () => {
      await must(sb().from("module_types").delete().eq("id", mt.id));
      setData((d) => ({ ...d, moduleTypes: d.moduleTypes.filter((x) => x.id !== mt.id) }));
    });
  }

  return (
    <fieldset disabled={!editable} style={{ border: 0, borderTop: "1px solid var(--line)", padding: "0.75rem 0 0", margin: "0.75rem 0 0" }}>
      <div className="grid3">
        <TextField label="Hersteller" required value={m.manufacturer} onValue={(v) => set("manufacturer", v)} />
        <TextField label="Typ / Modell" required value={m.model} onValue={(v) => set("model", v)} />
        <NumberField label="Nennleistung (Wp)" required value={m.power_wp || null} min={0} max={2000} onValue={(v) => set("power_wp", v ?? 0)} />
        <NumberField label="Breite (mm, optional)" value={m.width_mm} onValue={(v) => set("width_mm", v == null ? null : Math.round(v))} />
        <NumberField label="Höhe (mm, optional)" value={m.height_mm} onValue={(v) => set("height_mm", v == null ? null : Math.round(v))} />
        <div className="between" style={{ alignSelf: "end" }}>
          <span className="muted small">{count} Module · {fmtKwp(powerKwp(count, m.power_wp))}</span>
          <SaveIndicator state={state} message={message} />
          {editable && <button type="button" className="btn small danger" onClick={() => void remove()}>Entfernen</button>}
        </div>
      </div>
    </fieldset>
  );
}

function Strings() {
  const { data, setData, editable } = useProject();
  const stats = stringStats(data.roofs.flatMap((r) => r.cells), data.strings);
  const inverters = data.components.filter((c) => c.category === "wechselrichter");

  async function add() {
    await attempt(async () => {
      const used = new Set(data.strings.map((s) => s.name));
      let n = data.strings.length + 1;
      while (used.has(`S${n}`)) n++;
      const row = await must(
        sb()
          .from("strings")
          .insert({
            project_id: data.project.id,
            name: `S${n}`,
            color: STRING_COLORS[(n - 1) % STRING_COLORS.length],
            inverter_id: inverters.length === 1 ? inverters[0].id : null,
          })
          .select()
          .single<PvString>(),
      );
      setData((d) => ({ ...d, strings: [...d.strings, row] }));
    });
  }

  async function update(id: string, patch: Partial<PvString>) {
    await attempt(async () => {
      const row = await must(sb().from("strings").update(patch).eq("id", id).select().single<PvString>());
      setData((d) => ({ ...d, strings: d.strings.map((s) => (s.id === id ? row : s)) }));
    });
  }

  async function remove(s: PvString) {
    if (!window.confirm(`String ${s.name} löschen? Die Zuordnung der Module wird aufgehoben.`)) return;
    await attempt(async () => {
      await must(sb().from("strings").delete().eq("id", s.id));
      setData((d) => ({
        ...d,
        strings: d.strings.filter((x) => x.id !== s.id),
        roofs: d.roofs.map((r) => ({ ...r, cells: r.cells.map((c) => (c.string_id === s.id ? { ...c, string_id: null } : c)) })),
      }));
    });
  }

  return (
    <div className="card">
      <div className="between">
        <h2 style={{ margin: 0 }}>Strings und Wechselrichter-Zuordnung</h2>
        {editable && <button className="btn small" onClick={() => void add()}>+ String</button>}
      </div>
      <p className="muted small">
        Optional: Module im Raster mit dem Werkzeug „String“ zuordnen. Zugeordnet {stats.total - stats.unassigned} von {stats.total} Modulen.
      </p>
      {inverters.length === 0 && data.strings.length > 0 && (
        <div className="alert warn small">Für die Zuordnung bitte zuerst einen Wechselrichter unter „Komponenten“ erfassen.</div>
      )}
      <div className="table-wrap">
        <table className="list">
          <thead>
            <tr><th>String</th><th>Farbe</th><th>Wechselrichter</th><th>MPP-Tracker</th><th>Module</th><th /></tr>
          </thead>
          <tbody>
            {stats.perString.map(({ string: s, modules }) => (
              <tr key={s.id}>
                <td>
                  <input
                    defaultValue={s.name}
                    disabled={!editable}
                    maxLength={50}
                    aria-label="Stringbezeichnung"
                    style={{ maxWidth: 120 }}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== s.name && void update(s.id, { name: e.target.value.trim() })}
                  />
                </td>
                <td>
                  <input
                    type="color"
                    value={s.color}
                    disabled={!editable}
                    aria-label="Stringfarbe"
                    style={{ width: 52, padding: 2 }}
                    onChange={(e) => void update(s.id, { color: e.target.value })}
                  />
                </td>
                <td>
                  <select
                    value={s.inverter_id ?? ""}
                    disabled={!editable}
                    aria-label="Wechselrichter"
                    onChange={(e) => void update(s.id, { inverter_id: e.target.value || null })}
                  >
                    <option value="">– keiner –</option>
                    {inverters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {COMPONENT_LABELS[c.category]} {c.manufacturer} {c.model} {c.serial_no ? `(${c.serial_no})` : ""}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    defaultValue={s.mpp_tracker}
                    disabled={!editable}
                    aria-label="MPP-Tracker"
                    placeholder="z. B. A"
                    style={{ maxWidth: 90 }}
                    onBlur={(e) => e.target.value !== s.mpp_tracker && void update(s.id, { mpp_tracker: e.target.value })}
                  />
                </td>
                <td>{modules}</td>
                <td>{editable && <button className="btn small danger" onClick={() => void remove(s)}>Löschen</button>}</td>
              </tr>
            ))}
            {data.strings.length === 0 && (
              <tr><td colSpan={6} className="muted">Keine Strings angelegt.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
