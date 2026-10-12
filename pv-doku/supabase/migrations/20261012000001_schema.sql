-- PV-Dokumentationstool – Grundschema (Lastenheft v1.0, Kap. 7 Datenmodell)
-- Mandantenfähig angelegt (NF-009), in v1.0 wird eine Standardfirma verwendet.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Aufzählungen
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'projektleiter', 'monteur', 'betrachter');

create type public.project_status as enum (
  'entwurf', 'in_bearbeitung', 'zur_pruefung', 'nacharbeit', 'abgeschlossen', 'archiviert'
);

-- ---------------------------------------------------------------------------
-- Firma / Mandant inkl. Berichtseinstellungen (F-019)
-- ---------------------------------------------------------------------------
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  logo_path text,
  report_header text not null default '',
  report_footer text not null default '',
  -- Mindestfotos je Kategorie für die Vollständigkeitsprüfung (Kap. 14: konfigurierbar)
  required_photo_categories text[] not null default array['gesamtansicht', 'wechselrichter', 'zaehlerschrank'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Benutzerprofile (F-001)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id),
  email text not null,
  full_name text not null default '',
  role public.app_role not null default 'betrachter',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.profiles (company_id);

-- ---------------------------------------------------------------------------
-- Projekt inkl. Bauherr und Standort (F-003, F-004, F-018)
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id),
  project_number text not null check (length(trim(project_number)) between 1 and 50),
  name text not null check (length(trim(name)) between 1 and 200),
  installation_date date,
  contractor text not null default '',
  installer_id uuid references public.profiles (id) on delete set null,
  installer_name text not null default '',
  status public.project_status not null default 'entwurf',
  version integer not null default 1 check (version >= 1),
  notes text not null default '',

  client_type text not null default 'person' check (client_type in ('person', 'firma')),
  client_first_name text not null default '',
  client_last_name text not null default '',
  client_company text not null default '',
  client_street text not null default '',
  client_house_no text not null default '',
  client_zip text not null default '',
  client_city text not null default '',
  client_country text not null default 'Deutschland',
  client_phone text not null default '',
  client_email text not null default '' check (client_email = '' or client_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),

  site_differs boolean not null default false,
  site_street text not null default '',
  site_house_no text not null default '',
  site_zip text not null default '',
  site_city text not null default '',
  site_country text not null default 'Deutschland',
  site_lat numeric(9, 6) check (site_lat between -90 and 90),
  site_lng numeric(9, 6) check (site_lng between -180 and 180),

  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, project_number)
);
create index on public.projects (company_id, status);
create index on public.projects (created_at desc);

-- Zuweisung von Monteuren zu Projekten (Rolle Monteur: nur zugewiesene Projekte)
create table public.project_members (
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index on public.project_members (user_id);

-- ---------------------------------------------------------------------------
-- Modultypen (F-009)
-- ---------------------------------------------------------------------------
create table public.module_types (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  manufacturer text not null default '',
  model text not null default '',
  power_wp numeric(7, 1) not null default 0 check (power_wp >= 0 and power_wp <= 2000),
  width_mm integer check (width_mm between 100 and 5000),
  height_mm integer check (height_mm between 100 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.module_types (project_id);

-- ---------------------------------------------------------------------------
-- Dachflächen (F-005, F-006)
-- ---------------------------------------------------------------------------
create table public.roof_surfaces (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  sort integer not null default 0,
  name text not null check (length(trim(name)) between 1 and 100),
  orientation text check (orientation in ('N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW')),
  roof_type text not null default '',
  tilt_deg numeric(4, 1) check (tilt_deg between 0 and 90),
  covering text not null default '',
  width_m numeric(6, 2) check (width_m > 0),
  length_m numeric(6, 2) check (length_m > 0),
  mounting text not null default '',
  remark text not null default '',
  grid_rows integer not null default 5 check (grid_rows between 1 and 40),
  grid_cols integer not null default 10 check (grid_cols between 1 and 60),
  module_orientation text not null default 'hoch' check (module_orientation in ('hoch', 'quer')),
  view_rotation integer not null default 0 check (view_rotation in (0, 90, 180, 270)),
  module_type_id uuid references public.module_types (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.roof_surfaces (project_id);

-- ---------------------------------------------------------------------------
-- Komponenten (F-011)
-- ---------------------------------------------------------------------------
create table public.components (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  category text not null check (category in ('wechselrichter', 'speicher', 'datenlogger', 'smart_meter', 'wallbox', 'sonstiges')),
  manufacturer text not null default '',
  model text not null default '',
  serial_no text not null default '',
  location text not null default '',
  commissioning_date date,
  rated_power_kw numeric(8, 2) check (rated_power_kw >= 0),
  capacity_kwh numeric(8, 2) check (capacity_kwh >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.components (project_id);

-- ---------------------------------------------------------------------------
-- Strings (F-010)
-- ---------------------------------------------------------------------------
create table public.strings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 50),
  color text not null default '#2563eb' check (color ~ '^#[0-9a-fA-F]{6}$'),
  inverter_id uuid references public.components (id) on delete set null,
  mpp_tracker text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, name)
);
create index on public.strings (project_id);

-- ---------------------------------------------------------------------------
-- Rasterpositionen (F-007, F-008) – nur belegte/markierte Zellen werden gespeichert
-- ---------------------------------------------------------------------------
create table public.grid_cells (
  roof_id uuid not null references public.roof_surfaces (id) on delete cascade,
  row_idx integer not null check (row_idx >= 0),
  col_idx integer not null check (col_idx >= 0),
  state text not null check (state in ('modul', 'hindernis', 'gesperrt')),
  label text not null default '' check (length(label) <= 60),
  string_id uuid references public.strings (id) on delete set null,
  serial_no text not null default '' check (length(serial_no) <= 80),
  primary key (roof_id, row_idx, col_idx),
  check (state = 'modul' or (string_id is null and serial_no = ''))
);
create index on public.grid_cells (string_id);

-- ---------------------------------------------------------------------------
-- Mängel und Restpunkte (F-015)
-- ---------------------------------------------------------------------------
create table public.defects (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  description text not null check (length(trim(description)) >= 1),
  category text not null default 'sonstiges',
  priority text not null default 'mittel' check (priority in ('niedrig', 'mittel', 'hoch')),
  responsible text not null default '',
  due_date date,
  status text not null default 'offen' check (status in ('offen', 'in_arbeit', 'erledigt')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.defects (project_id);

-- ---------------------------------------------------------------------------
-- Fotos und Dateien (F-012)
-- ---------------------------------------------------------------------------
create table public.files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  category text not null check (category in (
    'gesamtansicht', 'dachflaeche', 'unterkonstruktion', 'module', 'wechselrichter', 'speicher',
    'zaehlerschrank', 'schutztechnik', 'beschriftung', 'mangel', 'sonstiges'
  )),
  storage_path text not null unique,
  file_name text not null default '',
  mime_type text not null default '' check (mime_type in ('', 'image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes integer not null default 0 check (size_bytes between 0 and 26214400),
  caption text not null default '',
  taken_at date,
  roof_id uuid references public.roof_surfaces (id) on delete set null,
  component_id uuid references public.components (id) on delete set null,
  defect_id uuid references public.defects (id) on delete set null,
  uploaded_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.files (project_id, category);

-- ---------------------------------------------------------------------------
-- Prüfwerte (F-013) und Checkliste (F-014)
-- ---------------------------------------------------------------------------
create table public.test_values (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  sort integer not null default 0,
  label text not null check (length(trim(label)) >= 1),
  unit text not null default '',
  required boolean not null default false,
  value text not null default '',
  status text check (status in ('geprueft', 'nicht_geprueft', 'nicht_zutreffend')),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.test_values (project_id);

create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  sort integer not null default 0,
  text text not null check (length(trim(text)) >= 1),
  required boolean not null default false,
  status text check (status in ('erledigt', 'nicht_erledigt', 'nicht_zutreffend')),
  comment text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.checklist_items (project_id);

-- Vorlagen für Prüfwerte/Checkliste je Firma (werden bei Projektanlage kopiert)
create table public.templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (kind in ('checkliste', 'pruefung')),
  sort integer not null default 0,
  text text not null check (length(trim(text)) >= 1),
  unit text not null default '',
  required boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.templates (company_id, kind);

-- ---------------------------------------------------------------------------
-- Unterschriften / Freigabe (F-016)
-- ---------------------------------------------------------------------------
create table public.signatures (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version integer not null,
  signer_role text not null check (signer_role in ('dokumentierender', 'bauherr')),
  signer_name text not null check (length(trim(signer_name)) >= 1),
  place text not null default '',
  signed_at timestamptz not null default now(),
  image_data text not null check (image_data like 'data:image/png;base64,%' and length(image_data) < 400000),
  comment text not null default '',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, version, signer_role)
);

-- ---------------------------------------------------------------------------
-- Versionen (F-018) und Änderungsprotokoll (F-022)
-- ---------------------------------------------------------------------------
create table public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version integer not null,
  status public.project_status not null,
  snapshot jsonb not null,
  comment text not null default '',
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.project_versions (project_id, version);

create table public.audit_log (
  id bigint generated always as identity primary key,
  company_id uuid references public.companies (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  user_id uuid,
  user_email text not null default '',
  at timestamptz not null default now(),
  action text not null,
  object_type text not null,
  object_id text,
  version integer,
  details jsonb not null default '{}'::jsonb
);
create index on public.audit_log (project_id, at desc);
create index on public.audit_log (company_id, at desc);
