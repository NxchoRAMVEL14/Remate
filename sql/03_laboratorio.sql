-- =====================================================================
-- REMATE · Fase 2: laboratorio del entrenador, partidos y estadística
-- Va después de 01 y 02 (si usas instalar.sql ya viene incluido).
-- Es seguro correrlo más de una vez (no borra datos).
-- Privado del entrenador: salto, bitácora, autoevaluación, decisiones, perfil y registro de captura.
-- Visible para el jugador: solo los partidos de su grupo y sus propias estadísticas.
-- =====================================================================

-- ---------- Partidos (se crean primero: la bitácora puede apuntar a uno) ----------
create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  match_date date not null default current_date,
  rival text not null check (char_length(rival) between 1 and 60),
  venue text not null default '' check (char_length(venue) <= 80),
  kind text not null default 'amistoso' check (kind in ('amistoso','liga','torneo','entrenamiento')),
  best_of smallint not null default 3 check (best_of in (3, 5)),
  sets jsonb not null default '[]'::jsonb,                -- [{"us":25,"them":21}, ...]
  status text not null default 'en_juego' check (status in ('planeado','en_juego','terminado')),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists matches_group_idx on public.matches (group_id, match_date desc);

-- Registro de captura del partido (quién hizo qué, en qué set). Solo lo ve el entrenador.
create table if not exists public.match_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  match_id uuid not null unique references public.matches(id) on delete cascade,
  log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Estadística por jugador y partido (se calcula desde el registro). El jugador ve solo la suya.
create table if not exists public.match_stats (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  counts jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);
create index if not exists match_stats_player_idx on public.match_stats (player_id);

-- ---------- Laboratorio (solo entrenador) ----------
create table if not exists public.coach_profile (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,                -- alcance de pie, inicio del programa, notas de reporte...
  updated_at timestamptz not null default now()
);

create table if not exists public.jump_tests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  test_date date not null default current_date,
  kind text not null default 'cmj' check (kind in ('cmj','cmj_arms','sj','spike','block','drop')),
  method text not null default 'myjump' check (method in ('myjump','sargent','mat','otro')),
  height_cm numeric(5,1) not null check (height_cm between 5 and 150),
  attempts jsonb not null default '[]'::jsonb,
  touch_cm numeric(5,1) check (touch_cm between 100 and 450),
  contact_ms smallint check (contact_ms between 50 and 1500),
  drop_cm smallint check (drop_cm between 10 and 80),
  body_kg numeric(5,1) check (body_kg between 25 and 200),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists jump_tests_owner_idx on public.jump_tests (owner_id, test_date desc);

create table if not exists public.jump_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_date date not null default current_date,
  focus text not null default 'mixto' check (focus in ('fuerza','pliometria','aterrizaje','potencia','movilidad','mixto')),
  blocks jsonb not null default '[]'::jsonb,
  contacts smallint not null default 0 check (contacts between 0 and 1000),
  minutes smallint check (minutes between 5 and 240),
  rpe smallint check (rpe between 1 and 10),
  pain_zone text check (pain_zone in ('rodilla','tobillo','espalda','hombro','cadera','otra')),
  pain_level smallint check (pain_level between 0 and 10),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists jump_sessions_owner_idx on public.jump_sessions (owner_id, session_date desc);

create table if not exists public.coach_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  match_id uuid references public.matches(id) on delete set null,
  log_date date not null default current_date,
  kind text not null default 'entrenamiento' check (kind in ('entrenamiento','partido','general')),
  climate smallint check (climate between 1 and 5),
  worked text not null default '' check (char_length(worked) <= 1000),
  change text not null default '' check (char_length(change) <= 1000),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists coach_logs_owner_idx on public.coach_logs (owner_id, log_date desc);

create table if not exists public.coach_assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  assessed_on date not null default current_date,
  scores jsonb not null default '{}'::jsonb,
  goal text not null default '' check (char_length(goal) <= 300),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.decision_attempts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scenario_id text not null check (char_length(scenario_id) between 1 and 40),
  category text not null default '' check (char_length(category) <= 30),
  chosen text not null default '' check (char_length(chosen) <= 60),
  correct boolean not null,
  ms integer check (ms between 0 and 600000),
  created_at timestamptz not null default now()
);
create index if not exists decision_attempts_owner_idx on public.decision_attempts (owner_id, created_at desc);

-- ---------- Seguridad ----------
alter table public.matches            enable row level security;
alter table public.match_logs         enable row level security;
alter table public.match_stats        enable row level security;
alter table public.coach_profile      enable row level security;
alter table public.jump_tests         enable row level security;
alter table public.jump_sessions      enable row level security;
alter table public.coach_logs         enable row level security;
alter table public.coach_assessments  enable row level security;
alter table public.decision_attempts  enable row level security;

-- Entrenador: control total sobre lo suyo, y lo que crea debe colgar de cosas que también son suyas.
do $$
declare r record;
begin
  for r in
    select * from (values
      ('coach_profile',     'true'),
      ('jump_tests',        'true'),
      ('jump_sessions',     'true'),
      ('coach_assessments', 'true'),
      ('decision_attempts', 'true'),
      ('matches',           'group_id in (select id from public.groups where owner_id = auth.uid())'),
      ('match_logs',        'match_id in (select id from public.matches where owner_id = auth.uid())'),
      ('match_stats',       'match_id in (select id from public.matches where owner_id = auth.uid())
                             and player_id in (select id from public.players where owner_id = auth.uid())'),
      ('coach_logs',        '(session_id is null or session_id in (select id from public.sessions where owner_id = auth.uid()))
                             and (match_id is null or match_id in (select id from public.matches where owner_id = auth.uid()))')
    ) as v(tbl, chk)
  loop
    execute format('drop policy if exists %I on public.%I', r.tbl || '_coach', r.tbl);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (owner_id = auth.uid() and public.is_coach())
         with check (owner_id = auth.uid() and public.is_coach() and (%s))',
      r.tbl || '_coach', r.tbl, r.chk);
  end loop;
end $$;

-- Jugador: solo lectura de los partidos de su grupo y de sus propias estadísticas.
drop policy if exists matches_player_read on public.matches;
create policy matches_player_read on public.matches for select to authenticated
  using (group_id in (select public.my_group_ids()));

drop policy if exists match_stats_player_read on public.match_stats;
create policy match_stats_player_read on public.match_stats for select to authenticated
  using (player_id in (select public.my_player_ids()));

revoke all on all tables in schema public from anon;
grant select, insert, update, delete on
  public.matches, public.match_logs, public.match_stats, public.coach_profile, public.jump_tests,
  public.jump_sessions, public.coach_logs, public.coach_assessments, public.decision_attempts
  to authenticated;
