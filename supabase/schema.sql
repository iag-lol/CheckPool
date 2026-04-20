-- CHECK-POOL Supabase schema
-- Ejecutar completo en Supabase SQL Editor.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.vehicles (
  id text primary key default gen_random_uuid()::text,
  ppu text not null,
  marca text not null,
  modelo text not null,
  anio integer,
  tipo text,
  combustible text,
  color text,
  km integer,
  terminal text not null,
  status text not null default 'disponible' check (status in ('disponible', 'en_uso', 'mantenimiento')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.drivers (
  id text primary key default gen_random_uuid()::text,
  nombre text not null,
  rut text not null,
  licencia text,
  vencimiento_licencia date,
  telefono text,
  terminal text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supervisors (
  id text primary key default gen_random_uuid()::text,
  nombre text not null,
  rut text,
  cargo text,
  telefono text,
  terminal text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.records (
  id text primary key default gen_random_uuid()::text,
  folio text not null unique,
  terminal text not null,
  vehicle_id text not null references public.vehicles(id) on update cascade on delete restrict,
  driver_id text not null references public.drivers(id) on update cascade on delete restrict,
  supervisor_id text not null references public.supervisors(id) on update cascade on delete restrict,
  fecha date not null,
  status text not null default 'PENDIENTE' check (status in ('PENDIENTE', 'CERRADO', 'TARDÍO', 'CON DAÑO', 'TARDÍO CON DAÑO')),
  delivery_data jsonb not null default '{}'::jsonb,
  reception_data jsonb not null default '{}'::jsonb,
  damages jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.damages (
  id text primary key default gen_random_uuid()::text,
  ticket text not null unique,
  vehicle_id text not null references public.vehicles(id) on update cascade on delete cascade,
  record_id text references public.records(id) on update cascade on delete set null,
  terminal text,
  source text not null default 'manual' check (source in ('manual', 'checklist')),
  checklist_item_id text,
  checklist_section text,
  checklist_section_label text,
  zona text not null,
  descripcion text not null,
  severidad text not null default 'leve' check (severidad in ('leve', 'moderado', 'grave')),
  fotos jsonb not null default '[]'::jsonb,
  resolved boolean not null default false,
  resolved_at timestamptz,
  last_stage text,
  last_record_id text references public.records(id) on update cascade on delete set null,
  last_observed_at timestamptz,
  history jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_docs (
  id text primary key default gen_random_uuid()::text,
  vehicle_id text not null references public.vehicles(id) on update cascade on delete cascade,
  padron_vencimiento date,
  permiso_circulacion_vencimiento date,
  soap_vencimiento date,
  cert_rt_vencimiento date,
  cert_gases_vencimiento date,
  tag_numero text,
  revision_tecnica date,
  observaciones text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists vehicles_ppu_active_uidx
  on public.vehicles (upper(ppu))
  where active = true;

create unique index if not exists drivers_rut_active_uidx
  on public.drivers (upper(rut))
  where active = true;

create unique index if not exists supervisors_rut_active_uidx
  on public.supervisors (upper(rut))
  where active = true and rut is not null;

create unique index if not exists vehicle_docs_vehicle_active_uidx
  on public.vehicle_docs (vehicle_id)
  where active = true;

create unique index if not exists damages_active_checklist_ticket_uidx
  on public.damages (vehicle_id, checklist_item_id)
  where active = true and resolved = false and source = 'checklist' and checklist_item_id is not null;

create index if not exists vehicles_terminal_status_idx on public.vehicles (terminal, status, active);
create index if not exists drivers_terminal_idx on public.drivers (terminal, active);
create index if not exists supervisors_terminal_idx on public.supervisors (terminal, active);
create index if not exists records_terminal_status_fecha_idx on public.records (terminal, status, fecha desc, active);
create index if not exists records_vehicle_idx on public.records (vehicle_id);
create index if not exists damages_vehicle_active_idx on public.damages (vehicle_id, active, resolved);
create index if not exists damages_record_idx on public.damages (record_id);
create index if not exists vehicle_docs_vehicle_idx on public.vehicle_docs (vehicle_id, active);

drop trigger if exists set_updated_at_vehicles on public.vehicles;
create trigger set_updated_at_vehicles
before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_drivers on public.drivers;
create trigger set_updated_at_drivers
before update on public.drivers
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_supervisors on public.supervisors;
create trigger set_updated_at_supervisors
before update on public.supervisors
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_records on public.records;
create trigger set_updated_at_records
before update on public.records
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_damages on public.damages;
create trigger set_updated_at_damages
before update on public.damages
for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_vehicle_docs on public.vehicle_docs;
create trigger set_updated_at_vehicle_docs
before update on public.vehicle_docs
for each row execute function public.set_updated_at();

alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;
alter table public.supervisors enable row level security;
alter table public.records enable row level security;
alter table public.damages enable row level security;
alter table public.vehicle_docs enable row level security;

drop policy if exists "check_pool_public_all_vehicles" on public.vehicles;
create policy "check_pool_public_all_vehicles"
on public.vehicles for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "check_pool_public_all_drivers" on public.drivers;
create policy "check_pool_public_all_drivers"
on public.drivers for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "check_pool_public_all_supervisors" on public.supervisors;
create policy "check_pool_public_all_supervisors"
on public.supervisors for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "check_pool_public_all_records" on public.records;
create policy "check_pool_public_all_records"
on public.records for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "check_pool_public_all_damages" on public.damages;
create policy "check_pool_public_all_damages"
on public.damages for all
to anon, authenticated
using (true)
with check (true);

drop policy if exists "check_pool_public_all_vehicle_docs" on public.vehicle_docs;
create policy "check_pool_public_all_vehicle_docs"
on public.vehicle_docs for all
to anon, authenticated
using (true)
with check (true);
