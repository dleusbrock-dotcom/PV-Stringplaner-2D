import type { CellState, GridCell, PvString } from "./types";

// Reine Funktionen für das Modulraster (F-007, F-008, F-009, F-010).
// Zellen werden "dünn" gespeichert: nicht vorhandene Zellen sind leer.

export type CellMap = Map<string, GridCell>;
export type Rotation = 0 | 90 | 180 | 270;

export const cellKey = (row: number, col: number) => `${row}:${col}`;

export function toCellMap(cells: GridCell[]): CellMap {
  const map: CellMap = new Map();
  for (const c of cells) map.set(cellKey(c.row, c.col), { ...c });
  return map;
}

export function fromCellMap(map: CellMap): GridCell[] {
  return [...map.values()].sort((a, b) => a.row - b.row || a.col - b.col);
}

export function countModules(cells: Iterable<GridCell>): number {
  let n = 0;
  for (const c of cells) if (c.state === "modul") n++;
  return n;
}

/** Installierte Leistung in kWp. */
export function powerKwp(moduleCount: number, powerWp: number | null | undefined): number {
  if (!powerWp || powerWp <= 0 || moduleCount <= 0) return 0;
  return Math.round(moduleCount * powerWp) / 1000;
}

function emptyCell(row: number, col: number, state: CellState): GridCell {
  return { row, col, state, label: "", string_id: null, serial_no: "" };
}

/** Klick mit Werkzeug "Modul": setzt oder entfernt ein Modul. Hindernisse bleiben unangetastet. */
export function toggleModule(map: CellMap, row: number, col: number): CellMap {
  const next = new Map(map);
  const k = cellKey(row, col);
  const cur = next.get(k);
  if (cur?.state === "modul") next.delete(k);
  else if (!cur) next.set(k, emptyCell(row, col, "modul"));
  return next;
}

export type PaintAction =
  | { kind: "modul" }
  | { kind: "hindernis" }
  | { kind: "gesperrt" }
  | { kind: "leeren" }
  | { kind: "string"; stringId: string | null };

/** Wendet eine Aktion auf mehrere Positionen an (Ziehen bzw. Auswahl). */
export function applyAction(map: CellMap, positions: Iterable<[number, number]>, action: PaintAction): CellMap {
  const next = new Map(map);
  for (const [row, col] of positions) {
    const k = cellKey(row, col);
    const cur = next.get(k);
    switch (action.kind) {
      case "modul":
        if (cur?.state !== "modul") next.set(k, emptyCell(row, col, "modul"));
        break;
      case "hindernis":
      case "gesperrt":
        next.set(k, { ...emptyCell(row, col, action.kind), label: cur && cur.state !== "modul" ? cur.label : "" });
        break;
      case "leeren":
        next.delete(k);
        break;
      case "string":
        if (cur?.state === "modul") next.set(k, { ...cur, string_id: action.stringId });
        break;
    }
  }
  return next;
}

/** "Alle belegen": jede freie Position erhält ein Modul; Hindernisse und gesperrte Flächen bleiben. */
export function fillAll(map: CellMap, rows: number, cols: number): CellMap {
  const next = new Map(map);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) if (!next.has(cellKey(r, c))) next.set(cellKey(r, c), emptyCell(r, c, "modul"));
  return next;
}

/** Entfernt Zellen außerhalb des (verkleinerten) Rasters. */
export function trimToSize(map: CellMap, rows: number, cols: number): CellMap {
  const next: CellMap = new Map();
  for (const [k, c] of map) if (c.row < rows && c.col < cols) next.set(k, c);
  return next;
}

// ----------------------------------------------------------------- Drehung der Ansicht

export function displayDims(rows: number, cols: number, rotation: Rotation): { rows: number; cols: number } {
  return rotation === 90 || rotation === 270 ? { rows: cols, cols: rows } : { rows, cols };
}

/** Bildet eine Anzeigeposition (im Uhrzeigersinn gedreht) auf die gespeicherte Rasterposition ab. */
export function displayToLogical(i: number, j: number, rows: number, cols: number, rotation: Rotation): [number, number] {
  switch (rotation) {
    case 0:
      return [i, j];
    case 90:
      return [rows - 1 - j, i];
    case 180:
      return [rows - 1 - i, cols - 1 - j];
    case 270:
      return [j, cols - 1 - i];
  }
}

export function logicalToDisplay(row: number, col: number, rows: number, cols: number, rotation: Rotation): [number, number] {
  switch (rotation) {
    case 0:
      return [row, col];
    case 90:
      return [col, rows - 1 - row];
    case 180:
      return [rows - 1 - row, cols - 1 - col];
    case 270:
      return [cols - 1 - col, row];
  }
}

/** Alle gespeicherten Positionen im Rechteck zwischen zwei Anzeigepositionen. */
export function rectPositions(
  a: [number, number],
  b: [number, number],
  rows: number,
  cols: number,
  rotation: Rotation,
): [number, number][] {
  const out: [number, number][] = [];
  const [i0, i1] = [Math.min(a[0], b[0]), Math.max(a[0], b[0])];
  const [j0, j1] = [Math.min(a[1], b[1]), Math.max(a[1], b[1])];
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) out.push(displayToLogical(i, j, rows, cols, rotation));
  return out;
}

/** Reihenbezeichnung A, B, …, Z, AA, AB … */
export function rowLabel(index: number): string {
  let s = "";
  let n = index + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function positionLabel(row: number, col: number): string {
  return `${rowLabel(row)}${col + 1}`;
}

// ----------------------------------------------------------------- Strings

export interface StringStat {
  string: PvString;
  modules: number;
}

/** Module je String sowie nicht zugeordnete Module über alle Dachflächen. */
export function stringStats(allCells: GridCell[], strings: PvString[]): { perString: StringStat[]; unassigned: number; total: number } {
  const counts = new Map<string, number>();
  let unassigned = 0;
  let total = 0;
  const known = new Set(strings.map((s) => s.id));
  for (const c of allCells) {
    if (c.state !== "modul") continue;
    total++;
    if (c.string_id && known.has(c.string_id)) counts.set(c.string_id, (counts.get(c.string_id) ?? 0) + 1);
    else unassigned++;
  }
  return { perString: strings.map((s) => ({ string: s, modules: counts.get(s.id) ?? 0 })), unassigned, total };
}
