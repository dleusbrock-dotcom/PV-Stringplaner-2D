import { describe, expect, it } from "vitest";
import { csvEscape, snapshotToCsv, toCsv } from "@/lib/csv";
import type { ProjectSnapshot } from "@/lib/types";
import { completeInput, project, roof } from "./fixtures";

describe("CSV-Export (F-020)", () => {
  it("escaped Trennzeichen, Anführungszeichen und Formeln", () => {
    expect(csvEscape('a;b')).toBe('"a;b"');
    expect(csvEscape('sagt "hallo"')).toBe('"sagt ""hallo"""');
    expect(csvEscape("=SUMME(A1)")).toBe("'=SUMME(A1)");
    expect(csvEscape(-3.5)).toBe("-3,5");
    expect(csvEscape(null)).toBe("");
  });

  it("beginnt mit BOM und nutzt CRLF", () => {
    const s = toCsv(["a", "b"], [[1, 2]]);
    expect(s.startsWith("﻿a;b\r\n1;2")).toBe(true);
  });

  it("Dachflächen-Export enthält Modulanzahl und Leistung", () => {
    const input = completeInput();
    const snap = {
      project: project(), roofs: [roof()], module_types: input.moduleTypes, strings: [], components: input.components,
      files: [], test_values: [], checklist_items: [], defects: [], signatures: [], members: [], company: null,
      format: "pv-doku-project", format_version: 1, exported_at: "",
    } as ProjectSnapshot;
    const lines = snapshotToCsv(snap, "dachflaechen").trim().split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain(";20;9;");
    expect(snapshotToCsv(snap, "raster").trim().split("\r\n")).toHaveLength(21);
  });
});
