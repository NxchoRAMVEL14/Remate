-- =====================================================================
-- REMATE · Esquema de base de datos para Supabase
-- Cómo usarlo: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- Es seguro correrlo más de una vez (no borra datos).
-- Recomendado: un proyecto de Supabase NUEVO, separado de otras apps,
-- porque aquí viven datos de menores de edad.
-- =====================================================================

-- ---------- Funciones auxiliares ----------

-- ¿La sesión actual es de un entrenador (con correo) y no de un jugador anónimo?
create or replace function public.is_coach() returns boolean
language sql stable as $$
  select auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

-- Código de 6 caracteres sin letras/dígitos confusos (sin 0, O, 1, I, L).
create or replace function public.gen_join_code() returns text
language plpgsql volatile as $$
declare
  chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  b bytea := uuid_send(gen_random_uuid());
  res text := '';
  i int;
begin
  for i in 0..5 loop
    res := res || substr(chars, 1 + (get_byte(b, i) % 31), 1);
  end loop;
  return res;
end $$;

-- ---------- Tablas ----------

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,   -- se llena cuando el jugador entra con su código
  name text not null check (char_length(name) between 1 and 40),
  branch text check (branch in ('F','M')),
  position text not null default 'sin_definir'
    check (position in ('sin_definir','colocador','opuesto','central','punta','libero')),
  hand text check (hand in ('der','izq')),
  height_cm smallint check (height_cm between 120 and 230),
  jersey smallint check (jersey between 0 and 99),
  level smallint not null default 1 check (level between 1 and 6),
  join_code text not null unique default public.gen_join_code(),
  active boolean not null default true,
  consent_at timestamptz,            -- autorización de madre/padre/tutor recibida
  joined_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.player_notes (            -- notas privadas del entrenador
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  session_date date not null,
  start_time time,
  minutes smallint not null default 90 check (minutes between 10 and 300),
  title text not null default '' check (char_length(title) <= 80),
  focus text[] not null default '{}',
  plan jsonb not null default '[]'::jsonb check (jsonb_typeof(plan) = 'array'),
  notes text not null default '' check (char_length(notes) <= 3000),
  status text not null default 'planeada' check (status in ('planeada','hecha','cancelada')),
  published boolean not null default false,       -- si el jugador puede ver el plan
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('presente','retardo','falta','justificada')),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (session_id, player_id)
);

create table if not exists public.ratings (                  -- cada evaluación queda en el historial
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  skill text not null check (skill in
    ('saque','recepcion','colocacion','remate','bloqueo','defensa','fisico','juego')),
  score smallint not null check (score between 1 and 4),
  note text not null default '' check (char_length(note) <= 300),
  rated_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.level_exams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  level smallint not null check (level between 2 and 6),     -- nivel al que aspira
  passed boolean not null,
  results jsonb not null default '{}'::jsonb,
  note text not null default '' check (char_length(note) <= 500),
  taken_at date not null default current_date,
  created_at timestamptz not null default now()
);

create table if not exists public.challenge_claims (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  challenge_id text not null check (char_length(challenge_id) between 1 and 40),
  status text not null default 'solicitada' check (status in ('solicitada','aprobada','rechazada')),
  note text not null default '' check (char_length(note) <= 300),
  claimed_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.custom_exercises (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.join_attempts (            -- freno contra adivinar códigos
  id bigint generated always as identity primary key,
  uid uuid not null,
  ok boolean not null,
  at timestamptz not null default now()
);

create index if not exists players_owner_idx on public.players(owner_id);
create index if not exists players_group_idx on public.players(group_id);
create index if not exists players_user_idx on public.players(user_id);
create index if not exists sessions_group_date_idx on public.sessions(group_id, session_date);
create index if not exists attendance_player_idx on public.attendance(player_id);
create index if not exists ratings_player_idx on public.ratings(player_id);
create index if not exists exams_player_idx on public.level_exams(player_id);
create index if not exists claims_player_idx on public.challenge_claims(player_id);
create index if not exists join_attempts_uid_idx on public.join_attempts(uid, at);

-- ---------- Ayudantes de permisos (evitan recursión entre políticas) ----------

create or replace function public.my_player_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.players where user_id = auth.uid() and active;
$$;
create or replace function public.my_group_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select group_id from public.players where user_id = auth.uid() and active;
$$;
create or replace function public.my_coach_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select owner_id from public.players where user_id = auth.uid() and active;
$$;
