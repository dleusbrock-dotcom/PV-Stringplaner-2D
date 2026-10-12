import type { Metadata } from "next";
import Link from "next/link";
import { STATUS_LABELS } from "@/lib/constants";
import { clientName, fmtDate } from "@/lib/format";
import { canEditRole } from "@/lib/status";
import { requireProfile } from "@/lib/supabase/server";
import type { Project, ProjectStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Projekte" };

type Search = { q?: string; status?: string; ort?: string; von?: string; bis?: string };

export default async function Dashboard({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireProfile();

  let query = supabase
    .from("projects")
    .select("id, project_number, name, status, version, installation_date, created_at, client_type, client_first_name, client_last_name, client_company, client_city, site_differs, site_city")
    .order("created_at", { ascending: false })
    .limit(200);

  // Suche über Projektnummer, Projektname und Bauherr bzw. Ort (PostgREST-Sonderzeichen entfernen)
  const clean = (v?: string) => (v ?? "").replace(/[,()*%\\"]/g, " ").trim();
  const q = clean(sp.q);
  const ort = clean(sp.ort);
  const textFilter = q
    ? `or(project_number.ilike.%${q}%,name.ilike.%${q}%,client_last_name.ilike.%${q}%,client_first_name.ilike.%${q}%,client_company.ilike.%${q}%)`
    : "";
  const ortFilter = ort ? `or(client_city.ilike.%${ort}%,site_city.ilike.%${ort}%)` : "";
  if (textFilter && ortFilter) query = query.or(`and(${textFilter},${ortFilter})`);
  else if (textFilter || ortFilter) query = query.or((textFilter || ortFilter).slice(3, -1));
  if (sp.status && sp.status in STATUS_LABELS) query = query.eq("status", sp.status);
  else if (!sp.status) query = query.neq("status", "archiviert");
  if (sp.von) query = query.gte("created_at", sp.von);
  if (sp.bis) query = query.lte("created_at", `${sp.bis}T23:59:59`);

  const { data, error } = await query;
  const projects = (data ?? []) as (Pick<Project, "id" | "project_number" | "name" | "status" | "version" | "installation_date" | "created_at" | "client_type" | "client_first_name" | "client_last_name" | "client_company" | "client_city" | "site_differs" | "site_city">)[];

  const counts = projects.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }), {});

  return (
    <>
      <div className="between">
        <h1>Projekte</h1>
        <div className="row">
          {canEditRole(profile.role) && (
            <>
              <Link className="btn" href="/projekte/neu?import=1">Import</Link>
              <Link className="btn primary" href="/projekte/neu">+ Neues Projekt</Link>
            </>
          )}
        </div>
      </div>

      <form className="card grid3" method="get" role="search" aria-label="Projekte filtern">
        <label className="field">
          Suche (Nr., Name, Bauherr)
          <input name="q" defaultValue={sp.q ?? ""} placeholder="z. B. 2026-014" />
        </label>
        <label className="field">
          Ort
          <input name="ort" defaultValue={sp.ort ?? ""} />
        </label>
        <label className="field">
          Status
          <select name="status" defaultValue={sp.status ?? ""}>
            <option value="">Alle außer archiviert</option>
            {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Erstellt ab
          <input type="date" name="von" defaultValue={sp.von ?? ""} />
        </label>
        <label className="field">
          Erstellt bis
          <input type="date" name="bis" defaultValue={sp.bis ?? ""} />
        </label>
        <div className="row" style={{ alignSelf: "end" }}>
          <button className="btn primary">Filtern</button>
          <Link className="btn" href="/">Zurücksetzen</Link>
        </div>
      </form>

      <div className="row" style={{ marginBottom: "0.75rem" }}>
        {(Object.keys(STATUS_LABELS) as ProjectStatus[]).filter((s) => counts[s]).map((s) => (
          <span key={s} className={`badge s-${s}`}>{STATUS_LABELS[s]}: {counts[s]}</span>
        ))}
      </div>

      {error && <div className="alert err">Projekte konnten nicht geladen werden: {error.message}</div>}

      <div className="card table-wrap" style={{ padding: 0 }}>
        <table className="list">
          <thead>
            <tr>
              <th>Projektnr.</th>
              <th>Projekt / Bauherr</th>
              <th>Ort</th>
              <th>Installation</th>
              <th>Erstellt</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr><td colSpan={6} className="muted">Keine Projekte gefunden.</td></tr>
            )}
            {projects.map((p) => (
              <tr key={p.id}>
                <td className="mono"><Link href={`/projekte/${p.id}/stammdaten`}>{p.project_number}</Link></td>
                <td>
                  <Link href={`/projekte/${p.id}/stammdaten`}>{p.name}</Link>
                  <div className="muted">{clientName(p) || "–"}</div>
                </td>
                <td>{(p.site_differs && p.site_city) || p.client_city || "–"}</td>
                <td>{fmtDate(p.installation_date)}</td>
                <td>{fmtDate(p.created_at)}</td>
                <td>
                  <span className={`badge s-${p.status}`}>{STATUS_LABELS[p.status]}</span>
                  {p.version > 1 && <span className="muted small"> v{p.version}</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
