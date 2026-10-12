"use client";

import { useMemo, useRef, useState } from "react";
import {
  applyAction,
  cellKey,
  countModules,
  displayDims,
  displayToLogical,
  fillAll,
  fromCellMap,
  positionLabel,
  rectPositions,
  rowLabel,
  toCellMap,
  type CellMap,
  type PaintAction,
  type Rotation,
} from "@/lib/grid";
import type { GridCell, PvString, RoofSurface } from "@/lib/types";

// Interaktives Modulraster (F-007, F-008, F-010)
// - Klick/Tippen setzt oder entfernt ein Modul, Ziehen bearbeitet mehrere Positionen.
// - Werkzeuge für Hindernisse, gesperrte Flächen, String-Zuordnung und Mehrfachauswahl.
// - Tastaturbedienung: Tab auf eine Zelle, Enter/Leertaste wendet das Werkzeug an.

type Tool = "modul" | "hindernis" | "gesperrt" | "leeren" | "string" | "auswahl";

const TOOLS: { id: Tool; label: string; title: string }[] = [
  { id: "modul", label: "▦ Modul", title: "Modul setzen/entfernen" },
  { id: "hindernis", label: "▨ Hindernis", title: "Hindernis oder Freifläche markieren (z. B. Kamin, Dachfenster)" },
  { id: "gesperrt", label: "✕ Gesperrt", title: "Position sperren (nicht belegbar)" },
  { id: "leeren", label: "⌫ Leeren", title: "Position leeren" },
  { id: "string", label: "〰 String", title: "Module dem aktiven String zuordnen" },
  { id: "auswahl", label: "⬚ Auswahl", title: "Mehrere Positionen per Ziehen auswählen" },
];

export default function GridEditor({
  roof,
  cells,
  strings,
  editable,
  onChange,
  onRoofPatch,
}: {
  roof: RoofSurface;
  cells: GridCell[];
  strings: PvString[];
  editable: boolean;
  onChange: (cells: GridCell[]) => void;
  onRoofPatch: (patch: Partial<RoofSurface>) => void;
}) {
  const [tool, setTool] = useState<Tool>("modul");
  const [activeString, setActiveString] = useState<string | null>(strings[0]?.id ?? null);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<Set<string> | null>(null);
  const drag = useRef<{
    start: [number, number];
    action: PaintAction | null;
    startState?: GridCell["state"];
    visited: Set<string>;
    map: CellMap;
  } | null>(null);

  const rows = roof.grid_rows;
  const cols = roof.grid_cols;
  const rotation = roof.view_rotation as Rotation;
  const map = useMemo(() => toCellMap(cells), [cells]);
  const stringById = useMemo(() => new Map(strings.map((s) => [s.id, s])), [strings]);
  const effectiveActiveString = activeString && stringById.has(activeString) ? activeString : (strings[0]?.id ?? null);
  const dims = displayDims(rows, cols, rotation);
  const quer = roof.module_orientation === "quer";
  const swapped = rotation === 90 || rotation === 270;
  const landscape = quer !== swapped;
  const cellW = landscape ? 46 : 30;
  const cellH = landscape ? 30 : 46;
  const moduleCount = countModules(cells);

  function commit(next: CellMap) {
    onChange(fromCellMap(next));
  }

  /** Bestimmt anhand der Startzelle, ob beim Ziehen gesetzt oder entfernt wird. */
  function actionFor(r: number, c: number): PaintAction | null {
    const cur = map.get(cellKey(r, c));
    switch (tool) {
      case "modul":
        if (cur && cur.state !== "modul") return null;
        return cur?.state === "modul" ? { kind: "leeren" } : { kind: "modul" };
      case "hindernis":
        return cur?.state === "hindernis" ? { kind: "leeren" } : { kind: "hindernis" };
      case "gesperrt":
        return cur?.state === "gesperrt" ? { kind: "leeren" } : { kind: "gesperrt" };
      case "leeren":
        return { kind: "leeren" };
      case "string":
        if (cur?.state !== "modul") return null;
        return { kind: "string", stringId: cur.string_id === effectiveActiveString ? null : effectiveActiveString };
      default:
        return null;
    }
  }

  /** Beim Ziehen mit dem Modul-Werkzeug werden Hindernisse und gesperrte Positionen übersprungen. */
  function applyTo(m: CellMap, r: number, c: number, action: PaintAction, startState: GridCell["state"] | undefined): CellMap {
    const cur = m.get(cellKey(r, c));
    if (tool === "modul" && cur && cur.state !== "modul") return m;
    if (tool === "modul" && action.kind === "leeren" && cur?.state !== "modul") return m;
    if ((tool === "hindernis" || tool === "gesperrt") && action.kind === "leeren" && cur?.state !== startState) return m;
    return applyAction(m, [[r, c]], action);
  }

  function cellFromPoint(x: number, y: number): [number, number] | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const btn = el?.closest<HTMLElement>("[data-di]");
    if (!btn || btn.dataset.roof !== roof.id) return null;
    return [Number(btn.dataset.di), Number(btn.dataset.dj)];
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!editable || e.button > 0) return;
    const pos = cellFromPoint(e.clientX, e.clientY);
    if (!pos) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const [r, c] = displayToLogical(pos[0], pos[1], rows, cols, rotation);
    if (tool === "auswahl") {
      drag.current = { start: pos, action: null, visited: new Set(), map };
      setPreview(new Set([cellKey(r, c)]));
      return;
    }
    const action = actionFor(r, c);
    if (!action) return;
    const startState = map.get(cellKey(r, c))?.state;
    const next = applyTo(map, r, c, action, startState);
    drag.current = { start: pos, action, startState, visited: new Set([cellKey(r, c)]), map: next };
    commit(next);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const pos = cellFromPoint(e.clientX, e.clientY);
    if (!pos) return;
    if (tool === "auswahl") {
      setPreview(new Set(rectPositions(d.start, pos, rows, cols, rotation).map(([r, c]) => cellKey(r, c))));
      return;
    }
    const [r, c] = displayToLogical(pos[0], pos[1], rows, cols, rotation);
    const k = cellKey(r, c);
    if (d.visited.has(k) || !d.action) return;
    d.visited.add(k);
    d.map = applyTo(d.map, r, c, d.action, d.startState);
    commit(d.map);
  }

  function onPointerUp() {
    if (drag.current && tool === "auswahl" && preview) setSelection(preview);
    drag.current = null;
    setPreview(null);
  }

  /** Tastaturbedienung (Klick ohne Zeiger, z. B. Enter/Leertaste). */
  function onKeyboardClick(e: React.MouseEvent, di: number, dj: number) {
    if (!editable || e.detail !== 0) return;
    const [r, c] = displayToLogical(di, dj, rows, cols, rotation);
    const k = cellKey(r, c);
    if (tool === "auswahl") {
      setSelection((s) => {
        const n = new Set(s);
        if (n.has(k)) n.delete(k);
        else n.add(k);
        return n;
      });
      return;
    }
    const action = actionFor(r, c);
    if (action) commit(applyTo(map, r, c, action, map.get(k)?.state));
  }

  const selectedPositions = (): [number, number][] =>
    [...selection].map((k) => k.split(":").map(Number) as [number, number]);

  function applySelection(action: PaintAction) {
    commit(applyAction(map, selectedPositions(), action));
  }

  function labelSelection() {
    const label = window.prompt("Beschriftung für die ausgewählten Hindernisse/Freiflächen (z. B. Kamin, Dachfenster):", "");
    if (label == null) return;
    const next = new Map(map);
    for (const [r, c] of selectedPositions()) {
      const cur = next.get(cellKey(r, c));
      if (cur && cur.state !== "modul") next.set(cellKey(r, c), { ...cur, label: label.slice(0, 60) });
      if (!cur) next.set(cellKey(r, c), { row: r, col: c, state: "hindernis", label: label.slice(0, 60), string_id: null, serial_no: "" });
    }
    commit(next);
  }

  const singleModule = (() => {
    if (selection.size !== 1) return null;
    const cell = map.get([...selection][0]);
    return cell?.state === "modul" ? cell : null;
  })();

  // Achsenbeschriftung in Anzeigerichtung (Reihen = Buchstaben, Spalten = Zahlen der gespeicherten Lage)
  const rowAxis = (i: number) => {
    const [r, c] = displayToLogical(i, 0, rows, cols, rotation);
    return swapped ? String(c + 1) : rowLabel(r);
  };
  const colAxis = (j: number) => {
    const [r, c] = displayToLogical(0, j, rows, cols, rotation);
    return swapped ? rowLabel(r) : String(c + 1);
  };

  return (
    <div>
      {editable && (
        <>
          <div className="grid-toolbar" role="toolbar" aria-label="Rasterwerkzeuge">
            {TOOLS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`btn small ${tool === t.id ? "active" : ""}`}
                aria-pressed={tool === t.id}
                title={t.title}
                onClick={() => setTool(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          {tool === "string" && (
            <div className="row" style={{ marginBottom: "0.5rem" }}>
              {strings.length === 0 ? (
                <span className="muted small">Bitte zuerst unten einen String anlegen.</span>
              ) : (
                <>
                  <span className="small">Aktiver String:</span>
                  {strings.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`btn small ${effectiveActiveString === s.id ? "active" : ""}`}
                      aria-pressed={effectiveActiveString === s.id}
                      onClick={() => setActiveString(s.id)}
                    >
                      <span className="swatch" style={{ background: s.color, width: 14, height: 14 }} /> {s.name}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
          <div className="grid-toolbar">
            <button type="button" className="btn small" onClick={() => commit(fillAll(map, rows, cols))}>Alle belegen</button>
            <button
              type="button"
              className="btn small danger"
              onClick={() => {
                if (window.confirm("Raster zurücksetzen? Alle Module, Hindernisse und Zuordnungen dieser Dachfläche werden entfernt.")) {
                  commit(new Map());
                  setSelection(new Set());
                }
              }}
            >
              Raster zurücksetzen
            </button>
            <span className="spacer" style={{ flex: 1 }} />
            <button
              type="button"
              className="btn small"
              title="Ansicht um 90° drehen"
              onClick={() => onRoofPatch({ view_rotation: ((rotation + 90) % 360) as Rotation })}
            >
              ⟳ Ansicht drehen ({rotation}°)
            </button>
            <button
              type="button"
              className="btn small"
              onClick={() => onRoofPatch({ module_orientation: quer ? "hoch" : "quer" })}
            >
              Format: {quer ? "Querformat" : "Hochformat"}
            </button>
          </div>
        </>
      )}

      <div className="kpis" style={{ margin: "0.5rem 0" }}>
        <div className="kpi" aria-live="polite"><b>{moduleCount}</b><span>Module auf dieser Fläche</span></div>
        <div className="kpi"><b>{rows} × {cols}</b><span>Raster (Reihen × Spalten)</span></div>
      </div>

      <div className="grid-scroll">
        <div
          className="pv-grid"
          style={{ gridTemplateColumns: `24px repeat(${dims.cols}, ${cellW}px)`, gridAutoRows: `${cellH}px` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          role="grid"
          aria-label={`Modulraster ${roof.name}`}
        >
          <div style={{ height: 18 }} />
          {Array.from({ length: dims.cols }, (_, j) => (
            <div key={`h${j}`} className="axis" style={{ height: 18, alignSelf: "end" }}>{colAxis(j)}</div>
          ))}
          {Array.from({ length: dims.rows }, (_, i) => (
            <Row key={i} i={i}>
              <div className="axis">{rowAxis(i)}</div>
              {Array.from({ length: dims.cols }, (_, j) => {
                const [r, c] = displayToLogical(i, j, rows, cols, rotation);
                const k = cellKey(r, c);
                const cell = map.get(k);
                const s = cell?.string_id ? stringById.get(cell.string_id) : undefined;
                const selected = (preview ?? selection).has(k);
                const title = [
                  positionLabel(r, c),
                  cell?.state === "modul" ? "Modul" : cell?.state === "hindernis" ? "Hindernis" : cell?.state === "gesperrt" ? "gesperrt" : "frei",
                  s ? `String ${s.name}` : "",
                  cell?.label,
                  cell?.serial_no ? `SN ${cell.serial_no}` : "",
                ].filter(Boolean).join(" · ");
                return (
                  <button
                    key={k}
                    type="button"
                    role="gridcell"
                    data-di={i}
                    data-dj={j}
                    data-roof={roof.id}
                    className={`pv-cell ${cell?.state ?? ""} ${selected ? "selected" : ""}`}
                    style={s ? { background: s.color, borderColor: "rgba(0,0,0,0.45)" } : undefined}
                    title={title}
                    aria-label={title}
                    aria-selected={selected || undefined}
                    onClick={(e) => onKeyboardClick(e, i, j)}
                  >
                    {cell?.state === "modul" && s && <span className="lbl">{s.name}</span>}
                    {cell && cell.state !== "modul" && <span className="lbl">{cell.label || (cell.state === "gesperrt" ? "✕" : "")}</span>}
                  </button>
                );
              })}
            </Row>
          ))}
        </div>
      </div>

      <div className="legend" aria-label="Legende">
        <span><i style={{ background: "var(--module)" }} /> Modul</span>
        <span><i style={{ border: "1.5px dashed #b6c2ce", background: "#fff" }} /> frei</span>
        <span><i style={{ background: "repeating-linear-gradient(45deg,#d1d5db,#d1d5db 3px,#e5e7eb 3px,#e5e7eb 6px)" }} /> Hindernis/Freifläche</span>
        <span><i style={{ background: "repeating-linear-gradient(-45deg,#fee2e2,#fee2e2 3px,#fff 3px,#fff 6px)", border: "1px solid #ef4444" }} /> gesperrt</span>
        {strings.map((s) => (
          <span key={s.id}><i style={{ background: s.color }} /> {s.name}</span>
        ))}
      </div>

      {editable && selection.size > 0 && (
        <div className="card" style={{ marginTop: "0.75rem", background: "#fffbeb" }}>
          <div className="between">
            <strong>{selection.size} Position(en) ausgewählt</strong>
            <button type="button" className="btn small" onClick={() => setSelection(new Set())}>Auswahl aufheben</button>
          </div>
          <div className="grid-toolbar">
            <button type="button" className="btn small" onClick={() => applySelection({ kind: "modul" })}>Auswahl belegen</button>
            <button type="button" className="btn small" onClick={() => applySelection({ kind: "hindernis" })}>Als Hindernis</button>
            <button type="button" className="btn small" onClick={() => applySelection({ kind: "gesperrt" })}>Sperren</button>
            <button type="button" className="btn small" onClick={labelSelection}>Beschriften …</button>
            <button type="button" className="btn small danger" onClick={() => applySelection({ kind: "leeren" })}>Auswahl löschen</button>
            {strings.length > 0 && (
              <select
                aria-label="Ausgewählte Module einem String zuordnen"
                value=""
                style={{ width: "auto", minHeight: 36 }}
                onChange={(e) => applySelection({ kind: "string", stringId: e.target.value === "-" ? null : e.target.value })}
              >
                <option value="">String zuordnen …</option>
                <option value="-">– keinem String –</option>
                {strings.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>
          {singleModule && (
            <label className="field" style={{ maxWidth: 360 }}>
              Seriennummer Modul {positionLabel(singleModule.row, singleModule.col)} (optional)
              <input
                value={singleModule.serial_no}
                maxLength={80}
                onChange={(e) => {
                  const next = new Map(map);
                  next.set(cellKey(singleModule.row, singleModule.col), { ...singleModule, serial_no: e.target.value });
                  commit(next);
                }}
              />
            </label>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ children }: { i: number; children: React.ReactNode }) {
  // display: contents hält die Zellen im CSS-Grid und liefert trotzdem eine Zeile für Screenreader
  return <div role="row" style={{ display: "contents" }}>{children}</div>;
}
