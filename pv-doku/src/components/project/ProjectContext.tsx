"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isLocked } from "@/lib/status";
import type {
  AppRole,
  ChecklistItem,
  Company,
  Component,
  Defect,
  FileRow,
  GridCell,
  ModuleType,
  Profile,
  Project,
  PvString,
  RoofWithCells,
  Signature,
  TestValue,
} from "@/lib/types";

export interface ProjectData {
  project: Project;
  company: Company | null;
  moduleTypes: ModuleType[];
  roofs: RoofWithCells[];
  strings: PvString[];
  components: Component[];
  files: FileRow[];
  testValues: TestValue[];
  checklist: ChecklistItem[];
  defects: Defect[];
  signatures: Signature[];
  members: string[];
  users: Pick<Profile, "id" | "full_name" | "email" | "role" | "active">[];
}

interface Ctx {
  data: ProjectData;
  setData: (fn: (d: ProjectData) => ProjectData) => void;
  reload: () => Promise<void>;
  /** Darf der Benutzer Inhalte ändern? (Rolle + nicht gesperrt) */
  editable: boolean;
  role: AppRole;
  userId: string;
}

const ProjectCtx = createContext<Ctx | null>(null);

export function useProject(): Ctx {
  const ctx = useContext(ProjectCtx);
  if (!ctx) throw new Error("useProject außerhalb von ProjectProvider");
  return ctx;
}

type DbCell = { roof_id: string; row_idx: number; col_idx: number; state: GridCell["state"]; label: string; string_id: string | null; serial_no: string };

export async function loadProjectData(id: string): Promise<ProjectData> {
  const sb = supabaseBrowser();
  const one = <T,>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>) =>
    Promise.resolve(p).then((r) => {
      if (r.error) throw new Error(r.error.message);
      return r.data as T;
    });

  const project = await one<Project>(sb.from("projects").select("*").eq("id", id).single());
  const [company, moduleTypes, roofs, strings, components, files, testValues, checklist, defects, signatures, members, users] =
    await Promise.all([
      one<Company>(sb.from("companies").select("*").eq("id", project.company_id).maybeSingle()),
      one<ModuleType[]>(sb.from("module_types").select("*").eq("project_id", id).order("created_at")),
      one<RoofWithCells[]>(sb.from("roof_surfaces").select("*").eq("project_id", id).order("sort").order("created_at")),
      one<PvString[]>(sb.from("strings").select("*").eq("project_id", id).order("name")),
      one<Component[]>(sb.from("components").select("*").eq("project_id", id).order("created_at")),
      one<FileRow[]>(sb.from("files").select("*").eq("project_id", id).order("created_at")),
      one<TestValue[]>(sb.from("test_values").select("*").eq("project_id", id).order("sort").order("created_at")),
      one<ChecklistItem[]>(sb.from("checklist_items").select("*").eq("project_id", id).order("sort").order("created_at")),
      one<Defect[]>(sb.from("defects").select("*").eq("project_id", id).order("created_at")),
      one<Signature[]>(sb.from("signatures").select("*").eq("project_id", id).eq("version", project.version)),
      one<{ user_id: string }[]>(sb.from("project_members").select("user_id").eq("project_id", id)),
      one<ProjectData["users"]>(sb.from("profiles").select("id, full_name, email, role, active").order("full_name")),
    ]);

  const roofIds = roofs.map((r) => r.id);
  const cells = roofIds.length
    ? await one<DbCell[]>(sb.from("grid_cells").select("*").in("roof_id", roofIds))
    : [];
  const byRoof = new Map<string, GridCell[]>();
  for (const c of cells) {
    const list = byRoof.get(c.roof_id) ?? [];
    list.push({ row: c.row_idx, col: c.col_idx, state: c.state, label: c.label, string_id: c.string_id, serial_no: c.serial_no });
    byRoof.set(c.roof_id, list);
  }

  return {
    project,
    company,
    moduleTypes,
    roofs: roofs.map((r) => ({ ...r, cells: byRoof.get(r.id) ?? [] })),
    strings,
    components,
    files,
    testValues,
    checklist,
    defects,
    signatures,
    members: members.map((m) => m.user_id),
    users,
  };
}

export function ProjectProvider({
  projectId,
  role,
  userId,
  children,
}: {
  projectId: string;
  role: AppRole;
  userId: string;
  children: React.ReactNode;
}) {
  const [data, setDataState] = useState<ProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setDataState(await loadProjectData(projectId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [projectId]);

  useEffect(() => {
    // Initiales Laden der Projektdaten
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, [reload]);

  const setData = useCallback((fn: (d: ProjectData) => ProjectData) => {
    setDataState((d) => (d ? fn(d) : d));
  }, []);

  const value = useMemo<Ctx | null>(() => {
    if (!data) return null;
    const roleCanEdit =
      role === "admin" || role === "projektleiter" || (role === "monteur" && (data.members.includes(userId) || data.project.created_by === userId || data.project.installer_id === userId));
    return { data, setData, reload, editable: roleCanEdit && !isLocked(data.project.status), role, userId };
  }, [data, setData, reload, role, userId]);

  if (error && !data)
    return (
      <div className="alert err" role="alert">
        Projekt konnte nicht geladen werden: {error}
        <div><button className="btn small" onClick={() => void reload()}>Erneut versuchen</button></div>
      </div>
    );
  if (!value) return <p className="muted">Projekt wird geladen …</p>;
  return <ProjectCtx.Provider value={value}>{children}</ProjectCtx.Provider>;
}
