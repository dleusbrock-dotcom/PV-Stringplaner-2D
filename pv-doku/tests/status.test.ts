import { describe, expect, it } from "vitest";
import { allowedTransitions, isLocked, requiresComment } from "@/lib/status";

describe("Status und Freigabe (F-018)", () => {
  it("Monteur kann zur Prüfung geben, aber nicht abschließen", () => {
    expect(allowedTransitions("in_bearbeitung", "monteur")).toEqual(["entwurf", "zur_pruefung"]);
    expect(allowedTransitions("zur_pruefung", "monteur")).toEqual(["in_bearbeitung"]);
  });
  it("Projektleiter kann abschließen und wiedereröffnen", () => {
    expect(allowedTransitions("zur_pruefung", "projektleiter")).toContain("abgeschlossen");
    expect(allowedTransitions("abgeschlossen", "projektleiter")).toEqual(["nacharbeit", "archiviert"]);
    expect(requiresComment("abgeschlossen", "nacharbeit")).toBe(true);
  });
  it("Archivierung aufheben nur Admin, Betrachter nie", () => {
    expect(allowedTransitions("archiviert", "projektleiter")).toEqual([]);
    expect(allowedTransitions("archiviert", "admin")).toEqual(["abgeschlossen"]);
    expect(allowedTransitions("entwurf", "betrachter")).toEqual([]);
  });
  it("Sperre", () => {
    expect(isLocked("abgeschlossen")).toBe(true);
    expect(isLocked("archiviert")).toBe(true);
    expect(isLocked("nacharbeit")).toBe(false);
  });
});
