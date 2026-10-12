-- Datenbanktests: Berechtigungen, Sperre, Statuswechsel, Vollständigkeit, Protokoll.
-- Ausschließlich synthetische Testdaten.
\set ON_ERROR_STOP 1

create or replace function pg_temp.expect_error(p_sql text, p_hint text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    return;
  end;
  raise exception 'Erwarteter Fehler blieb aus: %', p_hint;
end $$;

create or replace function pg_temp.assert(p_ok boolean, p_msg text) returns void
language plpgsql as $$
begin
  if not coalesce(p_ok, false) then
    raise exception 'Test fehlgeschlagen: %', p_msg;
  end if;
end $$;

grant execute on all functions in schema pg_temp to authenticated;

-- Benutzer anlegen (der erste wird Administrator)
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'admin@example.test');
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-00000000000b', 'pl@example.test', '{"role":"projektleiter"}'),
  ('00000000-0000-0000-0000-00000000000c', 'monteur@example.test', '{"role":"monteur"}'),
  ('00000000-0000-0000-0000-00000000000d', 'monteur2@example.test', '{"role":"monteur"}'),
  ('00000000-0000-0000-0000-00000000000e', 'viewer@example.test', '{"role":"betrachter"}');
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000f', 'fremd@example.test');

select pg_temp.assert((select role = 'admin' from profiles where email = 'admin@example.test'), 'erster Benutzer ist Admin');
select pg_temp.assert((select not active from profiles where email = 'fremd@example.test'), 'Selbstregistrierung ist gesperrt');

-- ---------------------------------------------------------------- Monteur legt Projekt an
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);

insert into projects (project_number, name) values ('TEST-0001', 'Testanlage Musterweg');
select pg_temp.assert((select count(*) = 1 from projects), 'Monteur sieht eigenes Projekt');
select pg_temp.assert((select status = 'entwurf' and version = 1 from projects), 'Neues Projekt ist Entwurf v1');
select pg_temp.assert((select count(*) = 7 from checklist_items), 'Checklisten-Vorlage kopiert');
select pg_temp.assert((select count(*) = 7 from test_values), 'Prüfwert-Vorlage kopiert');
select pg_temp.expect_error($$update projects set status = 'abgeschlossen'$$, 'Status nicht direkt änderbar');
select pg_temp.expect_error($$update profiles set role = 'admin' where id = auth.uid()$$, 'Rolle nicht selbst änderbar');
select pg_temp.expect_error($$insert into audit_log (action, object_type) values ('x', 'y')$$, 'Protokoll nicht direkt beschreibbar');
select pg_temp.expect_error($$insert into project_versions (project_id, version, status, snapshot) select id, 9, 'entwurf', '{}' from projects$$, 'Versionen nicht direkt beschreibbar');

-- ---------------------------------------------------------------- Andere Rollen
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000d', false);
select pg_temp.assert((select count(*) = 0 from projects), 'Fremder Monteur sieht Projekt nicht');
select pg_temp.assert((select count(*) = 0 from checklist_items), 'Fremder Monteur sieht Checkliste nicht');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000f', false);
select pg_temp.assert((select count(*) = 0 from projects), 'Gesperrter Benutzer sieht nichts');
select pg_temp.expect_error($$insert into projects (project_number, name) values ('X', 'X')$$, 'Gesperrter Benutzer darf nicht anlegen');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000e', false);
select pg_temp.assert((select count(*) = 1 from projects), 'Betrachter sieht Projekt');
update projects set name = 'Manipuliert';
select pg_temp.assert((select name = 'Testanlage Musterweg' from projects), 'Betrachter kann nicht ändern');
select pg_temp.expect_error($$insert into projects (project_number, name) values ('X', 'X')$$, 'Betrachter darf nicht anlegen');

reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select pg_temp.expect_error($$select count(*) from projects$$, 'Anonym kein Zugriff');
reset role;

-- ---------------------------------------------------------------- Monteur dokumentiert
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);

update projects set installation_date = '2026-10-01', contractor = 'Beispiel Solar GmbH', installer_name = 'Max Beispiel',
  client_last_name = 'Mustermann', client_street = 'Musterweg', client_house_no = '1', client_zip = '12345', client_city = 'Musterstadt';
insert into module_types (project_id, manufacturer, model, power_wp) select id, 'Beispiel', 'BX-450', 450 from projects;
insert into roof_surfaces (project_id, name, orientation, grid_rows, grid_cols, module_type_id)
  select p.id, 'Haus Süd', 'S', 5, 10, m.id from projects p, module_types m;
select pg_temp.expect_error($$select save_grid((select id from roof_surfaces), '[{"row":9,"col":0,"state":"modul"}]')$$, 'Zelle außerhalb des Rasters');
select pg_temp.assert(
  (select save_grid((select id from roof_surfaces),
    '[{"row":0,"col":0,"state":"modul"},{"row":0,"col":1,"state":"modul"},{"row":1,"col":0,"state":"hindernis","label":"Kamin"}]')) = 2,
  'Raster speichert 2 Module');
insert into components (project_id, category, manufacturer, model, serial_no) select id, 'wechselrichter', 'Beispiel', 'WR-10', 'SN1' from projects;

select pg_temp.assert(array_length(project_completeness_errors((select id from projects)), 1) > 0, 'Unvollständig wegen Fotos/Checkliste');

select set_project_status((select id from projects), 'zur_pruefung');
select pg_temp.expect_error($$select set_project_status((select id from projects), 'abgeschlossen')$$, 'Monteur darf nicht freigeben');

-- Storage: eigener Projektordner erlaubt, fremder Pfad nicht
insert into storage.objects (bucket_id, name)
  select 'project-files', company_id || '/' || id || '/foto.jpg' from projects;
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) values ('project-files', 'x/y/z.jpg')$$, 'Fremder Speicherpfad');

insert into files (project_id, category, storage_path)
  select id, c, company_id || '/' || id || '/' || c || '.jpg' from projects, unnest(array['gesamtansicht', 'wechselrichter', 'zaehlerschrank']) c;
select pg_temp.expect_error($$insert into files (project_id, category, storage_path) select id, 'module', 'falsch/pfad.jpg' from projects$$, 'Dateipfad muss zum Projekt passen');

-- ---------------------------------------------------------------- Projektleiter prüft und gibt frei
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
select pg_temp.expect_error($$select set_project_status((select id from projects), 'abgeschlossen')$$, 'Unvollständiges Projekt nicht abschließbar');

update checklist_items set status = 'erledigt' where required;
update checklist_items set status = 'nicht_erledigt' where sort = 50;
select pg_temp.expect_error($$select set_project_status((select id from projects), 'abgeschlossen')$$, 'Abweichung ohne Begründung');
update checklist_items set comment = 'Kunde richtet Zugang selbst ein' where sort = 50;
update test_values set status = 'geprueft' where required;
select pg_temp.expect_error($$select set_project_status((select id from projects), 'abgeschlossen')$$, 'Messwert fehlt');
update test_values set value = '650' where unit = 'V';
update test_values set value = '20' where unit = 'MΩ';
insert into defects (project_id, description, priority) select id, 'Kabelbinder fehlt', 'hoch' from projects;
select pg_temp.expect_error($$select set_project_status((select id from projects), 'abgeschlossen')$$, 'Offener Mangel hoch');
update defects set status = 'erledigt';

select pg_temp.assert(coalesce(array_length(project_completeness_errors((select id from projects)), 1), 0) = 0, 'Projekt vollständig');
select set_project_status((select id from projects), 'abgeschlossen', 'Abnahme ok');
select pg_temp.assert((select status = 'abgeschlossen' from projects), 'Projekt abgeschlossen');
select pg_temp.assert((select count(*) = 1 from project_versions), 'Version gespeichert');
select pg_temp.assert((select jsonb_array_length(snapshot -> 'roofs' -> 0 -> 'cells') = 3 from project_versions), 'Snapshot enthält Raster');

-- ---------------------------------------------------------------- Sperre
select pg_temp.expect_error($$update projects set name = 'Neu'$$, 'Abgeschlossenes Projekt gesperrt');
select pg_temp.expect_error($$insert into roof_surfaces (project_id, name) select id, 'Garage' from projects$$, 'Keine neuen Dachflächen');
select pg_temp.expect_error($$select save_grid((select id from roof_surfaces), '[]')$$, 'Raster gesperrt');
select pg_temp.expect_error($$delete from files$$, 'Dateien gesperrt');
select pg_temp.expect_error($$insert into storage.objects (bucket_id, name) select 'project-files', company_id || '/' || id || '/neu.jpg' from projects$$, 'Upload gesperrt');
select pg_temp.expect_error($$select set_project_status((select id from projects), 'nacharbeit')$$, 'Wiedereröffnung braucht Begründung');

-- ---------------------------------------------------------------- Neue Version
select set_project_status((select id from projects), 'nacharbeit', 'Seriennummer korrigieren');
select pg_temp.assert((select status = 'nacharbeit' and version = 2 from projects), 'Neue Version 2');
update components set serial_no = 'SN1-korr';
select pg_temp.assert((select count(*) >= 10 from audit_log), 'Änderungen protokolliert');
select pg_temp.assert((select count(*) = 2 from audit_log where action = 'status' and version is not null and details ->> 'nach' in ('abgeschlossen', 'nacharbeit')), 'Statuswechsel protokolliert');
select log_event((select id from projects), 'pdf_export', '{}');
select pg_temp.assert((select count(*) = 1 from audit_log where action = 'pdf_export'), 'Export protokolliert');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
delete from projects;
select pg_temp.assert((select count(*) = 1 from projects), 'Projekt nicht gelöscht');

-- ---------------------------------------------------------------- Admin löscht Projekt
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
delete from projects;
reset role;
select pg_temp.assert((select count(*) = 0 from projects), 'Admin hat gelöscht');
select pg_temp.assert((select count(*) = 1 from audit_log where action = 'delete' and object_type = 'projects'), 'Löschung protokolliert');

-- Admin darf Dateien der eigenen Firma auch nach Projektlöschung entfernen, fremde Firma nicht
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select pg_temp.assert(public.storage_access((select id::text from companies limit 1) || '/00000000-0000-0000-0000-000000000099/x.jpg', true), 'Admin darf Firmendateien löschen');
select pg_temp.assert(not public.storage_access('ffffffff-ffff-ffff-ffff-ffffffffffff/00000000-0000-0000-0000-000000000099/x.jpg', true), 'Fremde Firma gesperrt');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000c', false);
select pg_temp.assert(not public.storage_access((select id::text from companies limit 1) || '/00000000-0000-0000-0000-000000000099/x.jpg', true), 'Monteur darf fremde Pfade nicht schreiben');
reset role;

-- Anonyme Aufrufe von Funktionen sind nicht erlaubt
set role anon;
select pg_temp.expect_error($$select public.project_completeness_errors('00000000-0000-0000-0000-000000000099')$$, 'anon: Vollständigkeit');
select pg_temp.expect_error($$select public.set_project_status('00000000-0000-0000-0000-000000000099', 'entwurf')$$, 'anon: Status');
reset role;
