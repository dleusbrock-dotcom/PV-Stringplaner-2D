-- Rollen, Berechtigungen (RLS), Projektsperre und Änderungsprotokoll
-- F-001, F-018, F-022, NF-004

-- ---------------------------------------------------------------------------
-- Hilfsfunktionen zum angemeldeten Benutzer
-- (security definer, damit sie innerhalb von RLS-Policies keine Rekursion auslösen)
-- ---------------------------------------------------------------------------
create or replace function public.auth_company_id() returns uuid
language sql stable security definer set search_path = public as $$
  select company_id from public.profiles where id = auth.uid() and active
$$;

create or replace function public.auth_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_project_member(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.project_members where project_id = p_project and user_id = auth.uid())
      or exists (select 1 from public.projects where id = p_project and (created_by = auth.uid() or installer_id = auth.uid()))
$$;

create or replace function public.can_read_project(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project
      and p.company_id = public.auth_company_id()
      and (public.auth_role() in ('admin', 'projektleiter', 'betrachter') or public.is_project_member(p.id))
  )
$$;

create or replace function public.can_edit_project(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project
      and p.company_id = public.auth_company_id()
      and (public.auth_role() in ('admin', 'projektleiter')
           or (public.auth_role() = 'monteur' and public.is_project_member(p.id)))
  )
$$;

-- ---------------------------------------------------------------------------
-- updated_at automatisch pflegen (auch Grundlage für Konflikterkennung, F-021)
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['companies', 'profiles', 'projects', 'module_types', 'roof_surfaces', 'components',
                           'strings', 'defects', 'files', 'test_values', 'checklist_items', 'templates', 'signatures']
  loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Neue Auth-Benutzer erhalten ein Profil.
-- Rolle/Firma kommen ausschließlich aus app_metadata (nur per Service-Role setzbar).
-- Der allererste Benutzer wird Administrator, alle anderen ohne Einladung bleiben gesperrt.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
  v_role public.app_role;
  v_active boolean := true;
  v_first boolean;
begin
  select not exists (select 1 from public.profiles) into v_first;

  v_company := nullif(new.raw_app_meta_data ->> 'company_id', '')::uuid;
  if v_company is null then
    select id into v_company from public.companies order by created_at limit 1;
  end if;
  if v_company is null then
    insert into public.companies (name) values ('Meine Firma') returning id into v_company;
  end if;

  if v_first then
    v_role := 'admin';
  elsif new.raw_app_meta_data ? 'role' then
    v_role := (new.raw_app_meta_data ->> 'role')::public.app_role;
  else
    v_role := 'betrachter';
    v_active := false; -- Selbstregistrierung ohne Einladung erhält keinen Zugriff
  end if;

  insert into public.profiles (id, company_id, email, full_name, role, active)
  values (new.id, v_company, coalesce(new.email, ''),
          coalesce(new.raw_user_meta_data ->> 'full_name', ''), v_role, v_active);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- Nur Administratoren dürfen Rolle, Firma und Aktiv-Status ändern.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.active is distinct from old.active
      or new.company_id is distinct from old.company_id or new.email is distinct from old.email)
     and coalesce(public.auth_role()::text, '') <> 'admin'
     and auth.uid() is not null then
    raise exception 'Nur Administratoren dürfen Rollen und Status ändern' using errcode = '42501';
  end if;
  if new.id = auth.uid() and old.role = 'admin' and (new.role <> 'admin' or not new.active) then
    raise exception 'Administratoren können sich nicht selbst herabstufen oder sperren' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger guard_profile_update before update on public.profiles
for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------------
-- Projektanlage: Firma setzen, Ersteller als Mitglied, Vorlagen kopieren
-- ---------------------------------------------------------------------------
create or replace function public.before_project_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.company_id := public.auth_company_id();
    new.created_by := auth.uid();
  end if;
  new.status := 'entwurf';
  new.version := 1;
  return new;
end $$;

create trigger before_project_insert before insert on public.projects
for each row execute function public.before_project_insert();

create or replace function public.after_project_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Vorlagenkopien bei der Anlage nicht einzeln protokollieren
  perform set_config('app.skip_audit', 'on', true);
  if new.created_by is not null then
    insert into public.project_members (project_id, user_id) values (new.id, new.created_by)
    on conflict do nothing;
  end if;
  insert into public.checklist_items (project_id, sort, text, required)
    select new.id, sort, text, required from public.templates
    where company_id = new.company_id and kind = 'checkliste' and active;
  insert into public.test_values (project_id, sort, label, unit, required)
    select new.id, sort, text, unit, required from public.templates
    where company_id = new.company_id and kind = 'pruefung' and active;
  perform set_config('app.skip_audit', 'off', true);
  return new;
end $$;

create trigger after_project_insert after insert on public.projects
for each row execute function public.after_project_insert();

-- ---------------------------------------------------------------------------
-- Projektsperre (F-018): abgeschlossene/archivierte Projekte sind unveränderlich.
-- Status und Version dürfen nur über set_project_status() geändert werden.
-- ---------------------------------------------------------------------------
create or replace function public.project_is_locked(p_project uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select status in ('abgeschlossen', 'archiviert') from public.projects where id = p_project), false)
$$;

create or replace function public.guard_project_update() returns trigger
language plpgsql as $$
declare
  v_status_change boolean := coalesce(current_setting('app.status_change', true), '') = 'on';
begin
  if not v_status_change then
    if new.status is distinct from old.status or new.version is distinct from old.version then
      raise exception 'Status und Version können nur über den Statuswechsel geändert werden' using errcode = '42501';
    end if;
    if old.status in ('abgeschlossen', 'archiviert') then
      raise exception 'Projekt ist abgeschlossen und gesperrt. Für Änderungen bitte eine neue Version eröffnen.' using errcode = '42501';
    end if;
  end if;
  if new.company_id is distinct from old.company_id or new.created_by is distinct from old.created_by then
    raise exception 'Firma und Ersteller sind unveränderlich' using errcode = '42501';
  end if;
  return new;
end $$;

create trigger guard_project_update before update on public.projects
for each row execute function public.guard_project_update();

create or replace function public.guard_child_locked() returns trigger
language plpgsql as $$
declare
  v_project uuid;
begin
  if tg_table_name = 'grid_cells' then
    select project_id into v_project from public.roof_surfaces
      where id = case when tg_op = 'DELETE' then old.roof_id else new.roof_id end;
  elsif tg_op = 'DELETE' then
    v_project := old.project_id;
  else
    v_project := new.project_id;
  end if;
  if v_project is not null and public.project_is_locked(v_project)
     and coalesce(current_setting('app.status_change', true), '') <> 'on' then
    raise exception 'Projekt ist abgeschlossen und gesperrt. Für Änderungen bitte eine neue Version eröffnen.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and tg_table_name <> 'grid_cells' then
    if new.project_id is distinct from old.project_id then
      raise exception 'Projektzuordnung ist unveränderlich' using errcode = '42501';
    end if;
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

do $$
declare t text;
begin
  foreach t in array array['module_types', 'roof_surfaces', 'components', 'strings', 'grid_cells', 'defects',
                           'files', 'test_values', 'checklist_items', 'project_members']
  loop
    execute format('create trigger guard_locked before insert or update or delete on public.%I for each row execute function public.guard_child_locked()', t);
  end loop;
end $$;

-- Unterschriften dürfen nur für die aktuelle Version und nur im Status "zur Prüfung" oder davor erfasst werden;
-- nach Abschluss sind sie gesperrt wie alle anderen Inhalte.
create or replace function public.guard_signature() returns trigger
language plpgsql as $$
declare
  v_project uuid := case when tg_op = 'DELETE' then old.project_id else new.project_id end;
begin
  if public.project_is_locked(v_project) and coalesce(current_setting('app.status_change', true), '') <> 'on' then
    raise exception 'Projekt ist abgeschlossen und gesperrt.' using errcode = '42501';
  end if;
  if tg_op <> 'DELETE' then
    new.version := (select version from public.projects where id = new.project_id);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;

create trigger guard_signature before insert or update or delete on public.signatures
for each row execute function public.guard_signature();

-- Fremdschlüssel innerhalb desselben Projekts erzwingen (keine Querverweise zwischen Projekten)
create or replace function public.guard_same_project() returns trigger
language plpgsql as $$
begin
  -- Verschachtelte IFs, da PL/pgSQL Feldzugriffe auf NEW erst bei Auswertung auflöst
  if tg_table_name = 'roof_surfaces' then
    if new.module_type_id is not null
       and not exists (select 1 from public.module_types where id = new.module_type_id and project_id = new.project_id) then
      raise exception 'Modultyp gehört nicht zum Projekt';
    end if;
  elsif tg_table_name = 'strings' then
    if new.inverter_id is not null
       and not exists (select 1 from public.components where id = new.inverter_id and project_id = new.project_id) then
      raise exception 'Wechselrichter gehört nicht zum Projekt';
    end if;
  elsif tg_table_name = 'files' then
    if (new.roof_id is not null and not exists (select 1 from public.roof_surfaces where id = new.roof_id and project_id = new.project_id))
       or (new.component_id is not null and not exists (select 1 from public.components where id = new.component_id and project_id = new.project_id))
       or (new.defect_id is not null and not exists (select 1 from public.defects where id = new.defect_id and project_id = new.project_id))
       or new.storage_path not like (select company_id::text from public.projects where id = new.project_id) || '/' || new.project_id::text || '/%' then
      raise exception 'Datei-Verknüpfung oder Speicherpfad gehört nicht zum Projekt';
    end if;
  end if;
  return new;
end $$;

create trigger guard_same_project before insert or update on public.roof_surfaces
for each row execute function public.guard_same_project();
create trigger guard_same_project before insert or update on public.strings
for each row execute function public.guard_same_project();
create trigger guard_same_project before insert or update on public.files
for each row execute function public.guard_same_project();

create or replace function public.guard_grid_cell() returns trigger
language plpgsql as $$
declare v_roof public.roof_surfaces;
begin
  select * into v_roof from public.roof_surfaces where id = new.roof_id;
  if new.row_idx >= v_roof.grid_rows or new.col_idx >= v_roof.grid_cols then
    raise exception 'Rasterposition außerhalb des Rasters';
  end if;
  if new.string_id is not null
     and not exists (select 1 from public.strings where id = new.string_id and project_id = v_roof.project_id) then
    raise exception 'String gehört nicht zum Projekt';
  end if;
  return new;
end $$;

create trigger guard_grid_cell before insert or update on public.grid_cells
for each row execute function public.guard_grid_cell();

-- Beim Verkleinern des Rasters überzählige Zellen entfernen
create or replace function public.trim_grid_cells() returns trigger
language plpgsql as $$
begin
  if new.grid_rows < old.grid_rows or new.grid_cols < old.grid_cols then
    delete from public.grid_cells where roof_id = new.id and (row_idx >= new.grid_rows or col_idx >= new.grid_cols);
  end if;
  return new;
end $$;

create trigger trim_grid_cells after update of grid_rows, grid_cols on public.roof_surfaces
for each row execute function public.trim_grid_cells();

-- ---------------------------------------------------------------------------
-- Änderungsprotokoll (F-022)
-- ---------------------------------------------------------------------------
create or replace function public.write_audit(
  p_project uuid, p_action text, p_object_type text, p_object_id text, p_details jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_company uuid;
  v_version integer;
begin
  select company_id, version into v_company, v_version from public.projects where id = p_project;
  insert into public.audit_log (company_id, project_id, user_id, user_email, action, object_type, object_id, version, details)
  values (coalesce(v_company, public.auth_company_id()), p_project, auth.uid(),
          coalesce((select email from public.profiles where id = auth.uid()), ''),
          p_action, p_object_type, p_object_id, v_version, coalesce(p_details, '{}'::jsonb));
end $$;

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_old jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) else null end;
  v_new jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) else null end;
  v_row jsonb := coalesce(v_new, v_old);
  v_project uuid;
  v_changes jsonb := '{}'::jsonb;
  k text;
begin
  if coalesce(current_setting('app.skip_audit', true), '') = 'on' then
    return null;
  end if;
  v_project := case when tg_table_name = 'projects' then (v_row ->> 'id')::uuid else (v_row ->> 'project_id')::uuid end;
  if tg_op = 'UPDATE' then
    for k in select jsonb_object_keys(v_new) loop
      if k not in ('updated_at', 'image_data') and v_new -> k is distinct from v_old -> k then
        v_changes := v_changes || jsonb_build_object(k, jsonb_build_object('alt', v_old -> k, 'neu', v_new -> k));
      end if;
    end loop;
    if v_changes = '{}'::jsonb then
      return null;
    end if;
  elsif tg_op = 'INSERT' then
    v_changes := v_new - 'image_data' - 'created_at' - 'updated_at';
  else
    v_changes := v_old - 'image_data';
  end if;
  -- Beim Löschen des Projekts selbst keinen Eintrag mit Fremdschlüssel auf das gelöschte Projekt schreiben
  if tg_table_name = 'projects' and tg_op = 'DELETE' then
    insert into public.audit_log (company_id, project_id, user_id, user_email, action, object_type, object_id, details)
    values ((v_old ->> 'company_id')::uuid, null, auth.uid(),
            coalesce((select email from public.profiles where id = auth.uid()), ''),
            'delete', 'projects', v_old ->> 'id',
            jsonb_build_object('project_number', v_old ->> 'project_number', 'name', v_old ->> 'name'));
    return null;
  end if;
  if tg_op = 'DELETE' and not exists (select 1 from public.projects where id = v_project) then
    return null; -- Kaskadenlöschung eines Projekts
  end if;
  perform public.write_audit(v_project, lower(tg_op), tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'user_id'), v_changes);
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['projects', 'project_members', 'module_types', 'roof_surfaces', 'components', 'strings',
                           'defects', 'files', 'test_values', 'checklist_items', 'signatures',
                           'profiles', 'companies', 'templates']
  loop
    execute format('create trigger audit after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.module_types enable row level security;
alter table public.roof_surfaces enable row level security;
alter table public.components enable row level security;
alter table public.strings enable row level security;
alter table public.grid_cells enable row level security;
alter table public.defects enable row level security;
alter table public.files enable row level security;
alter table public.test_values enable row level security;
alter table public.checklist_items enable row level security;
alter table public.templates enable row level security;
alter table public.signatures enable row level security;
alter table public.project_versions enable row level security;
alter table public.audit_log enable row level security;

-- Firma
create policy companies_read on public.companies for select to authenticated
  using (id = public.auth_company_id());
create policy companies_admin_update on public.companies for update to authenticated
  using (id = public.auth_company_id() and public.auth_role() = 'admin')
  with check (id = public.auth_company_id());

-- Profile
create policy profiles_read on public.profiles for select to authenticated
  using (company_id = public.auth_company_id() or id = auth.uid());
create policy profiles_update_self_or_admin on public.profiles for update to authenticated
  using (id = auth.uid() or (company_id = public.auth_company_id() and public.auth_role() = 'admin'))
  with check (company_id = public.auth_company_id() or id = auth.uid());

-- Projekte
create policy projects_read on public.projects for select to authenticated
  using (public.can_read_project(id));
create policy projects_insert on public.projects for insert to authenticated
  with check (public.auth_role() in ('admin', 'projektleiter', 'monteur'));
create policy projects_update on public.projects for update to authenticated
  using (public.can_edit_project(id)) with check (public.can_edit_project(id));
create policy projects_delete on public.projects for delete to authenticated
  using (public.auth_role() = 'admin' and company_id = public.auth_company_id());

-- Projektmitglieder: lesen wer das Projekt lesen darf, verwalten nur Admin/Projektleiter
create policy members_read on public.project_members for select to authenticated
  using (public.can_read_project(project_id));
create policy members_manage on public.project_members for all to authenticated
  using (public.auth_role() in ('admin', 'projektleiter') and public.can_edit_project(project_id))
  with check (public.auth_role() in ('admin', 'projektleiter') and public.can_edit_project(project_id)
              and exists (select 1 from public.profiles where id = user_id and company_id = public.auth_company_id()));

-- Projektbezogene Tabellen: lesen = can_read_project, schreiben = can_edit_project
do $$
declare t text;
begin
  foreach t in array array['module_types', 'roof_surfaces', 'components', 'strings', 'defects', 'files',
                           'test_values', 'checklist_items', 'signatures']
  loop
    execute format('create policy %1$s_read on public.%1$I for select to authenticated using (public.can_read_project(project_id))', t);
    execute format('create policy %1$s_insert on public.%1$I for insert to authenticated with check (public.can_edit_project(project_id))', t);
    execute format('create policy %1$s_update on public.%1$I for update to authenticated using (public.can_edit_project(project_id)) with check (public.can_edit_project(project_id))', t);
    execute format('create policy %1$s_delete on public.%1$I for delete to authenticated using (public.can_edit_project(project_id))', t);
  end loop;
end $$;

create policy grid_cells_read on public.grid_cells for select to authenticated
  using (exists (select 1 from public.roof_surfaces r where r.id = roof_id and public.can_read_project(r.project_id)));
create policy grid_cells_write on public.grid_cells for all to authenticated
  using (exists (select 1 from public.roof_surfaces r where r.id = roof_id and public.can_edit_project(r.project_id)))
  with check (exists (select 1 from public.roof_surfaces r where r.id = roof_id and public.can_edit_project(r.project_id)));

-- Vorlagen
create policy templates_read on public.templates for select to authenticated
  using (company_id = public.auth_company_id());
create policy templates_admin on public.templates for all to authenticated
  using (company_id = public.auth_company_id() and public.auth_role() = 'admin')
  with check (company_id = public.auth_company_id() and public.auth_role() = 'admin');

-- Versionen und Protokoll: nur lesen; geschrieben wird ausschließlich über security-definer-Funktionen
create policy versions_read on public.project_versions for select to authenticated
  using (public.can_read_project(project_id));
create policy audit_read on public.audit_log for select to authenticated
  using ((project_id is not null and public.can_read_project(project_id))
         or (company_id = public.auth_company_id() and public.auth_role() = 'admin'));

-- Anonyme Benutzer erhalten keinerlei Rechte auf Tabellen
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon;
revoke all on public.project_versions, public.audit_log from authenticated;
grant select on public.project_versions, public.audit_log to authenticated;
