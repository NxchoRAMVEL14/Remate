-- =====================================================================
-- REMATE · Fase 3: entrenamiento en casa y lista de mejoras del entrenador
-- Va después de 01, 02 y 03 (si usas instalar.sql ya viene incluido).
-- Es seguro correrlo más de una vez (no borra datos).
-- =====================================================================

-- Lista de mejoras para la app: solo la ve el entrenador.
create table if not exists public.app_ideas (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 2000),
  area text not null default 'otra' check (char_length(area) <= 30),
  priority text not null default 'media' check (priority in ('alta','media','baja')),
  status text not null default 'idea' check (status in ('idea','lista','hecha','descartada')),
  created_at timestamptz not null default now(),
  done_at timestamptz
);
create index if not exists app_ideas_owner_idx on public.app_ideas (owner_id, created_at desc);

-- Lo que el jugador hizo en casa (lo registra él mismo, es opcional).
create table if not exists public.home_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,   -- siempre el entrenador
  player_id uuid not null references public.players(id) on delete cascade,
  done_on date not null default current_date,
  kind text not null default 'rutina' check (kind in ('rutina','ejercicio')),
  ref text not null check (char_length(ref) between 1 and 40),
  minutes smallint check (minutes between 1 and 180),
  feeling smallint check (feeling between 1 and 5),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists home_logs_player_idx on public.home_logs (player_id, done_on desc);

alter table public.app_ideas enable row level security;
alter table public.home_logs enable row level security;

-- Entrenador: lo suyo, y los registros en casa solo de sus jugadores.
drop policy if exists app_ideas_coach on public.app_ideas;
create policy app_ideas_coach on public.app_ideas for all to authenticated
  using (owner_id = auth.uid() and public.is_coach())
  with check (owner_id = auth.uid() and public.is_coach());

drop policy if exists home_logs_coach on public.home_logs;
create policy home_logs_coach on public.home_logs for all to authenticated
  using (owner_id = auth.uid() and public.is_coach())
  with check (owner_id = auth.uid() and public.is_coach()
              and player_id in (select id from public.players where owner_id = auth.uid()));

-- Jugador: ve, agrega y borra solo lo suyo. No puede cambiar un registro: si se equivoca, lo borra.
drop policy if exists home_logs_player_read on public.home_logs;
create policy home_logs_player_read on public.home_logs for select to authenticated
  using (player_id in (select public.my_player_ids()));

drop policy if exists home_logs_player_insert on public.home_logs;
create policy home_logs_player_insert on public.home_logs for insert to authenticated
  with check (player_id in (select public.my_player_ids()) and done_on between current_date - 7 and current_date + 1);

drop policy if exists home_logs_player_delete on public.home_logs;
create policy home_logs_player_delete on public.home_logs for delete to authenticated
  using (player_id in (select public.my_player_ids()));

-- El dueño del registro siempre es el entrenador del jugador (igual que en los retos).
create or replace function public.home_logs_set_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select owner_id into new.owner_id from public.players where id = new.player_id;
  if new.owner_id is null then raise exception 'Jugador no encontrado'; end if;
  return new;
end $$;
drop trigger if exists home_logs_set_owner on public.home_logs;
create trigger home_logs_set_owner before insert on public.home_logs
  for each row execute function public.home_logs_set_owner();

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on public.app_ideas, public.home_logs to authenticated;
