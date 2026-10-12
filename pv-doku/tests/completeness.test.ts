import { describe, expect, it } from "vitest";
import { checkCompleteness, summarize } from "@/lib/completeness";
import { completeInput, project, roof } from "./fixtures";

const errors = (input: ReturnType<typeof completeInput>) =>
  checkCompleteness(input).filter((i) => i.level === "error").map((i) => i.message);

describe("Vollständigkeitsprüfung (F-017)", () => {
  it("vollständiges Projekt hat keine Fehler und keine Warnungen", () => {
    expect(checkCompleteness(completeInput())).toEqual([]);
  });

  it("meldet fehlende Pflichtfelder mit Verweis auf den Schritt", () => {
    const input = completeInput();
    input.project = project({ project_number: " ", installation_date: null, client_city: "" });
    const issues = checkCompleteness(input);
    expect(issues).toContainEqual({ level: "error", step: "stammdaten", message: "Projektnummer fehlt" });
    expect(issues).toContainEqual({ level: "error", step: "stammdaten", message: "Installationsdatum fehlt" });
    expect(issues).toContainEqual({ level: "error", step: "bauherr", message: "Anschrift des Bauherrn unvollständig" });
  });

  it("abweichende Anlagenanschrift muss vollständig sein", () => {
    const input = completeInput();
    input.project = project({ site_differs: true, site_street: "Feldweg" });
    expect(errors(input)).toContain("Abweichende Anlagenanschrift unvollständig");
  });

  it("Firma als Bauherr braucht Firmennamen", () => {
    const input = completeInput();
    input.project = project({ client_type: "firma", client_company: "" });
    expect(errors(input)).toContain("Name bzw. Firma des Bauherrn fehlt");
  });

  it("Dachflächen: ohne Module, ohne Richtung, ohne Modultyp", () => {
    const input = completeInput();
    input.roofs = [roof({ id: "r2", name: "Garage Ost", orientation: null, cells: [] }), roof({ module_type_id: null })];
    const e = errors(input);
    expect(e).toContain("Dachfläche „Garage Ost“: Himmelsrichtung fehlt");
    expect(e).toContain("Dachfläche „Garage Ost“: keine Module belegt");
    expect(e).toContain("Dachfläche „Haus Süd“: Modultyp mit Nennleistung fehlt");
  });

  it("kein Wechselrichter und fehlende Pflichtfotos", () => {
    const input = completeInput();
    input.components = [];
    input.files = input.files.filter((f) => f.category !== "zaehlerschrank");
    const e = errors(input);
    expect(e).toContain("Kein Wechselrichter erfasst");
    expect(e).toContain("Pflichtfoto fehlt: Zählerschrank");
  });

  it("Checkliste: Abweichung braucht Begründung, mit Begründung nur Warnung (F-014)", () => {
    const input = completeInput();
    input.checklist[0] = { ...input.checklist[0], status: "nicht_erledigt" };
    expect(errors(input)).toContain("Abweichung ohne Begründung: Beschriftung");
    input.checklist[0] = { ...input.checklist[0], comment: "Schild nachbestellt" };
    const issues = checkCompleteness(input);
    expect(summarize(issues).errors).toBe(0);
    expect(issues.some((i) => i.level === "warning" && i.message.startsWith("Begründete Abweichung"))).toBe(true);
  });

  it("Pflichtprüfung ohne Status bzw. ohne Messwert (F-013)", () => {
    const input = completeInput();
    input.testValues[0] = { ...input.testValues[0], status: null };
    expect(errors(input)).toContain("Pflichtprüfung nicht bearbeitet: Isolationswiderstand");
    input.testValues[0] = { ...input.testValues[0], status: "geprueft", value: "" };
    expect(errors(input)).toContain("Messwert fehlt: Isolationswiderstand");
  });

  it("offene Mängel: hoch = Fehler, sonst Warnung (F-015)", () => {
    const input = completeInput();
    const base = { id: "d", project_id: "p1", category: "Montage", responsible: "", due_date: null, created_at: "" };
    input.defects = [
      { ...base, id: "d1", description: "Kabel lose", priority: "hoch", status: "offen" },
      { ...base, id: "d2", description: "Restarbeit", priority: "niedrig", status: "in_arbeit" },
      { ...base, id: "d3", description: "Erledigt", priority: "hoch", status: "erledigt" },
    ];
    const issues = checkCompleteness(input);
    expect(issues.filter((i) => i.step === "maengel").map((i) => i.level)).toEqual(["error", "warning"]);
  });

  it("Strings: nicht zugeordnete Module und fehlender Wechselrichter als Warnung", () => {
    const input = completeInput();
    input.strings = [{ id: "s1", project_id: "p1", name: "S1", color: "#2563eb", inverter_id: null, mpp_tracker: "" }];
    const issues = checkCompleteness(input);
    expect(summarize(issues).errors).toBe(0);
    expect(issues.map((i) => i.message)).toContain("20 Modul(e) ohne String-Zuordnung");
    expect(issues.map((i) => i.message)).toContain("String „S1“ ohne Wechselrichter-Zuordnung");
  });
});
