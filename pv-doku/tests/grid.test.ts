import { describe, expect, it } from "vitest";
import {
  applyAction, cellKey, countModules, displayDims, displayToLogical, fillAll, fromCellMap, logicalToDisplay,
  positionLabel, powerKwp, rectPositions, rowLabel, stringStats, toCellMap, toggleModule, trimToSize, type Rotation,
} from "@/lib/grid";

describe("Modulraster 5 × 10 (Abnahmekriterium F-007)", () => {
  it("jede der 50 Positionen kann einzeln belegt und geleert werden; Anzahl stimmt jederzeit", () => {
    let map = toCellMap([]);
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 10; c++) {
        map = toggleModule(map, r, c);
        expect(countModules(map.values())).toBe(r * 10 + c + 1);
      }
    expect(countModules(map.values())).toBe(50);
    map = toggleModule(map, 2, 3);
    expect(countModules(map.values())).toBe(49);
    expect(map.has(cellKey(2, 3))).toBe(false);
  });

  it("Klick auf Hindernis setzt kein Modul", () => {
    let map = applyAction(toCellMap([]), [[0, 0]], { kind: "hindernis" });
    map = toggleModule(map, 0, 0);
    expect(map.get(cellKey(0, 0))?.state).toBe("hindernis");
  });

  it("alle belegen lässt Hindernisse und gesperrte Flächen frei", () => {
    let map = applyAction(toCellMap([]), [[0, 0]], { kind: "hindernis" });
    map = applyAction(map, [[1, 1]], { kind: "gesperrt" });
    map = fillAll(map, 5, 10);
    expect(countModules(map.values())).toBe(48);
  });

  it("String-Zuordnung nur auf Module, Leeren entfernt Zellen", () => {
    let map = applyAction(toCellMap([]), [[0, 0], [0, 1]], { kind: "modul" });
    map = applyAction(map, [[0, 1]], { kind: "hindernis" });
    map = applyAction(map, [[0, 0], [0, 1]], { kind: "string", stringId: "s1" });
    expect(map.get(cellKey(0, 0))?.string_id).toBe("s1");
    expect(map.get(cellKey(0, 1))?.string_id).toBeNull();
    map = applyAction(map, [[0, 0], [0, 1]], { kind: "leeren" });
    expect(map.size).toBe(0);
  });

  it("verkleinern entfernt überzählige Zellen; Sortierung beim Speichern", () => {
    const map = fillAll(toCellMap([]), 5, 10);
    const trimmed = trimToSize(map, 2, 3);
    expect(countModules(trimmed.values())).toBe(6);
    const cells = fromCellMap(trimmed);
    expect(cells[0]).toMatchObject({ row: 0, col: 0 });
    expect(cells.at(-1)).toMatchObject({ row: 1, col: 2 });
  });
});

describe("Leistung (F-009)", () => {
  it("berechnet kWp aus Anzahl und Nennleistung", () => {
    expect(powerKwp(50, 450)).toBe(22.5);
    expect(powerKwp(17, 435.5)).toBe(7.404); // auf volle Wp gerundet
    expect(powerKwp(10, 0)).toBe(0);
    expect(powerKwp(0, 450)).toBe(0);
  });
});

describe("Drehung der Rasteransicht (F-008)", () => {
  const rotations: Rotation[] = [0, 90, 180, 270];
  it.each(rotations)("Hin- und Rückabbildung ist bijektiv bei %i°", (rot) => {
    const rows = 3, cols = 5;
    const dims = displayDims(rows, cols, rot);
    const seen = new Set<string>();
    for (let i = 0; i < dims.rows; i++)
      for (let j = 0; j < dims.cols; j++) {
        const [r, c] = displayToLogical(i, j, rows, cols, rot);
        expect(r).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThan(cols);
        expect(logicalToDisplay(r, c, rows, cols, rot)).toEqual([i, j]);
        seen.add(`${r}:${c}`);
      }
    expect(seen.size).toBe(rows * cols);
  });

  it("90° im Uhrzeigersinn: oben links wandert nach oben rechts", () => {
    expect(logicalToDisplay(0, 0, 3, 5, 90)).toEqual([0, 2]);
  });

  it("Rechteckauswahl liefert gespeicherte Positionen", () => {
    expect(rectPositions([0, 0], [1, 1], 5, 10, 0)).toHaveLength(4);
    expect(rectPositions([1, 1], [0, 0], 5, 10, 180)).toContainEqual([4, 9]);
  });
});

describe("Bezeichnungen und Strings", () => {
  it("Reihenbuchstaben", () => {
    expect(rowLabel(0)).toBe("A");
    expect(rowLabel(25)).toBe("Z");
    expect(rowLabel(26)).toBe("AA");
    expect(positionLabel(1, 4)).toBe("B5");
  });

  it("zählt Module je String und nicht zugeordnete", () => {
    const strings = [{ id: "s1", project_id: "p", name: "S1", color: "#000000", inverter_id: null, mpp_tracker: "" }];
    const res = stringStats(
      [
        { row: 0, col: 0, state: "modul", label: "", string_id: "s1", serial_no: "" },
        { row: 0, col: 1, state: "modul", label: "", string_id: null, serial_no: "" },
        { row: 0, col: 2, state: "modul", label: "", string_id: "gelöscht", serial_no: "" },
        { row: 0, col: 3, state: "hindernis", label: "", string_id: null, serial_no: "" },
      ],
      strings,
    );
    expect(res.perString[0].modules).toBe(1);
    expect(res.unassigned).toBe(2);
    expect(res.total).toBe(3);
  });
});
