-- Fachfunktionen: Raster speichern, Vollständigkeitsprüfung, Statuswechsel/Versionierung,
-- Projekt-Snapshot (Export/PDF), Ereignisprotokoll, Dateispeicher.

-- ---------------------------------------------------------------------------
-- Projekt-Snapshot: vollständige, strukturierte Projektdaten (F-018, F-019, F-020, NF-010)
-- ---------------------------------------------------------------------------
create or replace function public.project_snapshot(p_project uuid) returns jsonb
language plpgsql stable security invoker set search_path = public as $$
declare
  v jsonb;
begin
  if not public.can_read_project(p_project) then
    raise exception 'Kein Zugriff auf dieses Projekt' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'format', 'pv-doku-project',
    'format_version', 1,
    'exported_at', now(),
    'project', to_jsonb(p),
    'company', (select jsonb_build_object('name', c.name, 'address', c.address, 'logo_path', c.logo_path,
                                          'report_header', c.report_header, 'report_footer', c.report_footer)
                from public.companies c where c.id = p.company_id),
    'members', coalesce((select jsonb_agg(jsonb_build_object('user_id', pr.id, 'full_name', pr.full_name, 'email', pr.email, 'role', pr.role) order by pr.full_name)
                from public.project_members m join public.profiles pr on pr.id = m.user_id where m.project_id = p.id), '[]'::jsonb),
    'module_types', coalesce((select jsonb_agg(to_jsonb(mt) order by mt.created_at) from public.module_types mt where mt.project_id = p.id), '[]'::jsonb),
    'roofs', coalesce((select jsonb_agg(to_jsonb(r) || jsonb_build_object('cells',
                 coalesce((select jsonb_agg(jsonb_build_object('row', g.row_idx, 'col', g.col_idx, 'state', g.state, 'label', g.label,
                                                               'string_id', g.string_id, 'serial_no', g.serial_no) order by g.row_idx, g.col_idx)
                           from public.grid_cells g where g.roof_id = r.id), '[]'::jsonb))
               order by r.sort, r.created_at) from public.roof_surfaces r where r.project_id = p.id), '[]'::jsonb),
    'strings', coalesce((select jsonb_agg(to_jsonb(s) order by s.name) from public.strings s where s.project_id = p.id), '[]'::jsonb),
    'components', coalesce((select jsonb_agg(to_jsonb(c) order by c.category, c.created_at) from public.components c where c.project_id = p.id), '[]'::jsonb),
    'files', coalesce((select jsonb_agg(to_jsonb(f) order by f.category, f.created_at) from public.files f where f.project_id = p.id), '[]'::jsonb),
    'test_values', coalesce((select jsonb_agg(to_jsonb(t) order by t.sort, t.created_at) from public.test_values t where t.project_id = p.id), '[]'::jsonb),
    'checklist_items', coalesce((select jsonb_agg(to_jsonb(ci) order by ci.sort, ci.created_at) from public.checklist_items ci where ci.project_id = p.id), '[]'::jsonb),
    'defects', coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at) from public.defects d where d.project_id = p.id), '[]'::jsonb),
    'signatures', coalesce((select jsonb_agg(to_jsonb(sg) order by sg.signer_role) from public.signatures sg where sg.project_id = p.id and sg.version = p.version), '[]'::jsonb)
  ) into v
  from public.projects p where p.id = p_project;
  if v is null then
    raise exception 'Projekt nicht gefunden' using errcode = 'P0002';
  end if;
  return v;
end $$;

-- ---------------------------------------------------------------------------
-- Raster einer Dachfläche atomar speichern (F-007)
-- p_cells: [{"row":0,"col":0,"state":"modul","label":"","string_id":null,"serial_no":""}, ...]
-- ---------------------------------------------------------------------------
-- security definer, damit das zusammenfassende Protokoll geschrieben werden kann;
-- die Berechtigung wird explizit geprüft, Sperre und Plausibilität per Trigger.
create or replace function public.save_grid(p_roof uuid, p_cells jsonb) returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_project uuid;
  v_modules integer;
begin
  select project_id into v_project from public.roof_surfaces where id = p_roof;
  if v_project is null or not public.can_edit_project(v_project) then
    raise exception 'Keine Berechtigung für diese Dachfläche' using errcode = '42501';
  end if;
  if jsonb_typeof(p_cells) <> 'array' then
    raise exception 'Ungültige Rasterdaten';
  end if;

  delete from public.grid_cells where roof_id = p_roof;
  insert into public.grid_cells (roof_id, row_idx, col_idx, state, label, string_id, serial_no)
  select p_roof, c.row, c.col, c.state, coalesce(c.label, ''), c.string_id, coalesce(c.serial_no, '')
  from jsonb_to_recordset(p_cells) as c(row integer, col integer, state text, label text, string_id uuid, serial_no text);

  select count(*) into v_modules from public.grid_cells where roof_id = p_roof and state = 'modul';
  perform public.write_audit(v_project, 'update', 'grid', p_roof::text,
    jsonb_build_object('module', v_modules, 'zellen', jsonb_array_length(p_cells)));
  return v_modules;
end $$;

-- ---------------------------------------------------------------------------
-- Vollständigkeitsprüfung (F-017) – serverseitige Durchsetzung der Fehlerregeln.
-- Die Anwendung zeigt zusätzlich Warnungen an (src/lib/completeness.ts, gleiche Regeln).
-- ---------------------------------------------------------------------------
create or replace function public.project_completeness_errors(p_project uuid) returns text[]
language plpgsql stable security definer set search_path = public as $$
declare
  p public.projects;
  r record;
  e text[] := '{}';
  v_cat text;
  v_required text[];
begin
  if not public.can_read_project(p_project) then
    raise exception 'Kein Zugriff auf dieses Projekt' using errcode = '42501';
  end if;
  select * into p from public.projects where id = p_project;
  if p.id is null then
    return array['Projekt nicht gefunden'];
  end if;

  -- Stammdaten
  if trim(p.project_number) = '' then e := e || text 'Projektnummer fehlt'; end if;
  if trim(p.name) = '' then e := e || text 'Projektname fehlt'; end if;
  if p.installation_date is null then e := e || text 'Installationsdatum fehlt'; end if;
  if trim(p.contractor) = '' then e := e || text 'Ausführendes Unternehmen fehlt'; end if;
  if trim(p.installer_name) = '' and p.installer_id is null then e := e || text 'Verantwortlicher Monteur fehlt'; end if;

  -- Bauherr und Standort
  if (p.client_type = 'person' and trim(p.client_last_name) = '') or (p.client_type = 'firma' and trim(p.client_company) = '') then
    e := e || text 'Name bzw. Firma des Bauherrn fehlt';
  end if;
  if trim(p.client_street) = '' or trim(p.client_zip) = '' or trim(p.client_city) = '' then
    e := e || text 'Anschrift des Bauherrn unvollständig';
  end if;
  if p.site_differs and (trim(p.site_street) = '' or trim(p.site_zip) = '' or trim(p.site_city) = '') then
    e := e || text 'Abweichende Anlagenanschrift unvollständig';
  end if;

  -- Dachflächen und Module
  if not exists (select 1 from public.roof_surfaces where project_id = p.id) then
    e := e || text 'Keine Dachfläche angelegt';
  end if;
  for r in
    select rs.name, rs.orientation, mt.id as mt_id, mt.power_wp, mt.manufacturer, mt.model,
           (select count(*) from public.grid_cells g where g.roof_id = rs.id and g.state = 'modul') as modules
    from public.roof_surfaces rs left join public.module_types mt on mt.id = rs.module_type_id
    where rs.project_id = p.id
  loop
    if r.orientation is null then e := e || format('Dachfläche „%s“: Himmelsrichtung fehlt', r.name); end if;
    if r.modules = 0 then e := e || format('Dachfläche „%s“: keine Module belegt', r.name); end if;
    if r.modules > 0 and (r.mt_id is null or r.power_wp <= 0) then
      e := e || format('Dachfläche „%s“: Modultyp mit Nennleistung fehlt', r.name);
    elsif r.modules > 0 and (trim(r.manufacturer) = '' or trim(r.model) = '') then
      e := e || format('Dachfläche „%s“: Hersteller/Typ des Moduls fehlt', r.name);
    end if;
  end loop;

  -- Komponenten
  if not exists (select 1 from public.components where project_id = p.id and category = 'wechselrichter') then
    e := e || text 'Kein Wechselrichter erfasst';
  end if;
  if exists (select 1 from public.components where project_id = p.id and (trim(manufacturer) = '' or trim(model) = '')) then
    e := e || text 'Komponente ohne Hersteller oder Modell';
  end if;

  -- Mindestfotos
  select required_photo_categories into v_required from public.companies where id = p.company_id;
  foreach v_cat in array coalesce(v_required, '{}') loop
    if not exists (select 1 from public.files where project_id = p.id and category = v_cat) then
      e := e || format('Pflichtfoto fehlt: %s', v_cat);
    end if;
  end loop;

  -- Prüfwerte
  if exists (select 1 from public.test_values where project_id = p.id and required and status is null) then
    e := e || text 'Pflichtprüfung nicht bearbeitet';
  end if;
  if exists (select 1 from public.test_values where project_id = p.id and required and status = 'geprueft'
             and unit <> '' and trim(value) = '') then
    e := e || text 'Messwert einer Pflichtprüfung fehlt';
  end if;

  -- Checkliste
  if exists (select 1 from public.checklist_items where project_id = p.id and required and status is null) then
    e := e || text 'Pflichtpunkt der Checkliste nicht bearbeitet';
  end if;
  if exists (select 1 from public.checklist_items where project_id = p.id and required and status = 'nicht_erledigt'
             and trim(comment) = '') then
    e := e || text 'Abweichung in der Checkliste ohne Begründung';
  end if;

  -- Mängel
  if exists (select 1 from public.defects where project_id = p.id and status <> 'erledigt' and priority = 'hoch') then
    e := e || text 'Offener Mangel mit hoher Priorität';
  end if;

  return e;
end $$;

-- ---------------------------------------------------------------------------
-- Statuswechsel, Freigabe und Versionierung (F-018)
-- ---------------------------------------------------------------------------
create or replace function public.allowed_status_transitions(p_from public.project_status) returns public.project_status[]
language sql immutable as $$
  select case p_from
    when 'entwurf' then array['in_bearbeitung', 'zur_pruefung']::public.project_status[]
    when 'in_bearbeitung' then array['entwurf', 'zur_pruefung']::public.project_status[]
    when 'zur_pruefung' then array['in_bearbeitung', 'nacharbeit', 'abgeschlossen']::public.project_status[]
    when 'nacharbeit' then array['in_bearbeitung', 'zur_pruefung']::public.project_status[]
    when 'abgeschlossen' then array['nacharbeit', 'archiviert']::public.project_status[]
    when 'archiviert' then array['abgeschlossen']::public.project_status[]
  end
$$;

create or replace function public.set_project_status(
  p_project uuid, p_status public.project_status, p_comment text default ''
) returns public.projects
language plpgsql security definer set search_path = public as $$
declare
  p public.projects;
  v_role public.app_role := public.auth_role();
  v_errors text[];
  v_new_version integer;
  v_old_status public.project_status;
begin
  select * into p from public.projects where id = p_project for update;
  v_old_status := p.status;
  if p.id is null or not public.can_edit_project(p_project) then
    raise exception 'Keine Berechtigung für dieses Projekt' using errcode = '42501';
  end if;
  if p.status = p_status then
    return p;
  end if;
  if not (p_status = any (public.allowed_status_transitions(p.status))) then
    raise exception 'Statuswechsel von % nach % ist nicht zulässig', p.status, p_status using errcode = '22023';
  end if;

  -- Freigabe, Wiedereröffnung und Archivierung nur durch Projektverantwortliche/Administratoren
  if (p_status in ('abgeschlossen', 'archiviert', 'nacharbeit') or p.status in ('abgeschlossen', 'archiviert'))
     and v_role not in ('admin', 'projektleiter') then
    raise exception 'Diese Freigabe ist Projektverantwortlichen vorbehalten' using errcode = '42501';
  end if;
  if p.status = 'archiviert' and v_role <> 'admin' then
    raise exception 'Nur Administratoren können die Archivierung aufheben' using errcode = '42501';
  end if;
  if p_status = 'nacharbeit' and p.status = 'abgeschlossen' and trim(coalesce(p_comment, '')) = '' then
    raise exception 'Für die Wiedereröffnung ist eine Begründung erforderlich' using errcode = '22023';
  end if;

  if p_status = 'abgeschlossen' and p.status = 'zur_pruefung' then
    v_errors := public.project_completeness_errors(p_project);
    if array_length(v_errors, 1) > 0 then
      raise exception 'Projekt ist unvollständig: %', array_to_string(v_errors, '; ') using errcode = '23514';
    end if;
  end if;

  v_new_version := case when p.status = 'abgeschlossen' and p_status = 'nacharbeit' then p.version + 1 else p.version end;

  perform set_config('app.status_change', 'on', true);
  update public.projects set status = p_status, version = v_new_version where id = p_project returning * into p;
  perform set_config('app.status_change', 'off', true);

  if p_status = 'abgeschlossen' and v_old_status = 'zur_pruefung' then
    insert into public.project_versions (project_id, version, status, snapshot, comment)
    values (p_project, p.version, p_status, public.project_snapshot(p_project), coalesce(p_comment, ''));
  end if;

  perform public.write_audit(p_project, 'status', 'projects', p_project::text,
    jsonb_build_object('von', v_old_status, 'nach', p_status, 'comment', coalesce(p_comment, ''), 'version', v_new_version));
  return p;
end $$;

-- ---------------------------------------------------------------------------
-- Protokollierung von Exporten/Importen durch die Anwendung (F-022)
-- ---------------------------------------------------------------------------
create or replace function public.log_event(p_project uuid, p_action text, p_details jsonb default '{}'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_action not in ('pdf_export', 'json_export', 'csv_export', 'backup_export', 'import') then
    raise exception 'Unbekannte Aktion';
  end if;
  if not public.can_read_project(p_project) then
    raise exception 'Kein Zugriff auf dieses Projekt' using errcode = '42501';
  end if;
  perform public.write_audit(p_project, p_action, 'projects', p_project::text, p_details);
end $$;

-- Funktionen nur für angemeldete Benutzer; interne Funktionen gar nicht per API aufrufbar
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
revoke execute on function public.write_audit(uuid, text, text, text, jsonb) from public, authenticated;
revoke execute on function public.audit_trigger() from public, authenticated;
revoke execute on function public.handle_new_user() from public, authenticated;

-- ---------------------------------------------------------------------------
-- Dateispeicher (privat): <company_id>/<project_id>/<datei>  bzw.  <company_id>/_company/<datei>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-files', 'project-files', false, 26214400,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

create or replace function public.storage_access(p_name text, p_write boolean) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  v_parts text[] := string_to_array(p_name, '/');
  v_project uuid;
begin
  if array_length(v_parts, 1) < 3 or v_parts[1] <> coalesce(public.auth_company_id()::text, '-') then
    return false;
  end if;
  if v_parts[2] = '_company' then
    return not p_write or public.auth_role() = 'admin';
  end if;
  -- Administratoren dürfen Dateien der eigenen Firma immer verwalten (z. B. Löschung eines Projekts nach DSGVO)
  if p_write and public.auth_role() = 'admin' then
    return true;
  end if;
  begin
    v_project := v_parts[2]::uuid;
  exception when others then
    return false;
  end;
  if p_write then
    return public.can_edit_project(v_project) and not public.project_is_locked(v_project);
  end if;
  return public.can_read_project(v_project);
end $$;

create policy project_files_read on storage.objects for select to authenticated
  using (bucket_id = 'project-files' and public.storage_access(name, false));
create policy project_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'project-files' and public.storage_access(name, true));
create policy project_files_update on storage.objects for update to authenticated
  using (bucket_id = 'project-files' and public.storage_access(name, true))
  with check (bucket_id = 'project-files' and public.storage_access(name, true));
create policy project_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'project-files' and public.storage_access(name, true));
