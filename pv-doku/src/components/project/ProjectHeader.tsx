"use client";

import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { PROJECT_STEPS, STATUS_LABELS } from "@/lib/constants";
import { fmtKwp } from "@/lib/format";
import { countModules, powerKwp } from "@/lib/grid";
import { isLocked } from "@/lib/status";
import { useProject } from "./ProjectContext";
import { useCompleteness } from "./useCompleteness";

export default function ProjectHeader() {
  const { data, editable } = useProject();
  const segment = useSelectedLayoutSegment();
  const issues = useCompleteness(data);
  const p = data.project;
  const mt = new Map(data.moduleTypes.map((m) => [m.id, m]));
  const modules = data.roofs.reduce((s, r) => s + countModules(r.cells), 0);
  const kwp = data.roofs.reduce(
    (s, r) => s + powerKwp(countModules(r.cells), r.module_type_id ? mt.get(r.module_type_id)?.power_wp : 0),
    0,
  );

  return (
    <>
      <div className="project-head">
        <h1>
          <span className="mono">{p.project_number}</span> · {p.name}
        </h1>
        <span className={`badge s-${p.status}`}>{STATUS_LABELS[p.status]}</span>
        <span className="badge">Version {p.version}</span>
        <span className="muted">{modules} Module · {fmtKwp(kwp)}</span>
      </div>
      {isLocked(p.status) && (
        <div className="alert info small">
          Dieses Projekt ist {STATUS_LABELS[p.status].toLowerCase()} und gegen Änderungen gesperrt.
          Änderungen sind nur über „Neue Version eröffnen“ im Schritt Abschluss möglich.
        </div>
      )}
      {!editable && !isLocked(p.status) && <div className="alert info small">Sie haben für dieses Projekt nur Lesezugriff.</div>}
      <nav className="steps" aria-label="Projektschritte">
        {PROJECT_STEPS.map((s) => {
          const stepIssues = issues.filter((i) => i.step === s.slug);
          const lvl = stepIssues.some((i) => i.level === "error")
            ? "err"
            : stepIssues.some((i) => i.level === "warning")
              ? "warn"
              : s.slug === "protokoll"
                ? null
                : "ok";
          return (
            <Link key={s.slug} href={`/projekte/${p.id}/${s.slug}`} aria-current={segment === s.slug ? "page" : undefined}>
              {lvl && <span className={`dot ${lvl}`} aria-hidden />}
              {s.label}
              {lvl === "err" && <span className="sr-only"> (unvollständig)</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
