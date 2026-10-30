-- Remate · instalación completa para Supabase (SQL Editor → pega todo → Run).
-- Incluye el núcleo, el laboratorio con partidos y estadística, y En casa con tu lista de mejoras.
-- Es seguro correrlo más de una vez: no borra datos.

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


-- =====================================================================
-- REMATE · Seguridad (RLS) y funciones de acceso
-- Va después de 01_esquema.sql (si usas instalar.sql ya viene incluido).
-- Regla de oro: cada entrenador solo ve lo suyo; cada jugador solo ve
-- su propia información y los entrenamientos publicados de su grupo.
-- =====================================================================

alter table public.groups            enable row level security;
alter table public.players           enable row level security;
alter table public.player_notes      enable row level security;
alter table public.sessions          enable row level security;
alter table public.attendance        enable row level security;
alter table public.ratings           enable row level security;
alter table public.level_exams       enable row level security;
alter table public.challenge_claims  enable row level security;
alter table public.custom_exercises  enable row level security;
alter table public.join_attempts     enable row level security;   -- sin políticas: solo la función de abajo la toca

-- ---------- Entrenador: control total sobre lo suyo ----------
-- Además, lo que crea debe colgar de cosas que también son suyas
-- (así nadie puede meter filas en el grupo o jugador de otro entrenador).
do $$
declare r record;
begin
  for r in
    select * from (values
      ('groups',           'true'),
      ('custom_exercises', 'true'),
      ('players',          'group_id in (select id from public.groups where owner_id = auth.uid())'),
      ('sessions',         'group_id in (select id from public.groups where owner_id = auth.uid())'),
      ('player_notes',     'player_id in (select id from public.players where owner_id = auth.uid())'),
      ('ratings',          'player_id in (select id from public.players where owner_id = auth.uid())'),
      ('level_exams',      'player_id in (select id from public.players where owner_id = auth.uid())'),
      ('challenge_claims', 'player_id in (select id from public.players where owner_id = auth.uid())'),
      ('attendance',       'session_id in (select id from public.sessions where owner_id = auth.uid())
                            and player_id in (select id from public.players where owner_id = auth.uid())')
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

-- ---------- Jugador: solo lectura de lo propio ----------
drop policy if exists groups_player_read on public.groups;
create policy groups_player_read on public.groups for select to authenticated
  using (id in (select public.my_group_ids()));

drop policy if exists players_self_read on public.players;
create policy players_self_read on public.players for select to authenticated
  using (user_id = auth.uid());

drop policy if exists sessions_player_read on public.sessions;
create policy sessions_player_read on public.sessions for select to authenticated
  using (published and group_id in (select public.my_group_ids()));

drop policy if exists attendance_player_read on public.attendance;
create policy attendance_player_read on public.attendance for select to authenticated
  using (player_id in (select public.my_player_ids()));

drop policy if exists ratings_player_read on public.ratings;
create policy ratings_player_read on public.ratings for select to authenticated
  using (player_id in (select public.my_player_ids()));

drop policy if exists exams_player_read on public.level_exams;
create policy exams_player_read on public.level_exams for select to authenticated
  using (player_id in (select public.my_player_ids()));

drop policy if exists custom_ex_player_read on public.custom_exercises;
create policy custom_ex_player_read on public.custom_exercises for select to authenticated
  using (owner_id in (select public.my_coach_ids()));

-- Retos: el jugador puede ver, pedir y cancelar (mientras siga "solicitada"). Aprobar es del entrenador.
drop policy if exists claims_player_read on public.challenge_claims;
create policy claims_player_read on public.challenge_claims for select to authenticated
  using (player_id in (select public.my_player_ids()));

drop policy if exists claims_player_insert on public.challenge_claims;
create policy claims_player_insert on public.challenge_claims for insert to authenticated
  with check (player_id in (select public.my_player_ids()) and status = 'solicitada');

drop policy if exists claims_player_delete on public.challenge_claims;
create policy claims_player_delete on public.challenge_claims for delete to authenticated
  using (player_id in (select public.my_player_ids()) and status = 'solicitada');

-- El reto siempre queda a nombre del entrenador dueño del jugador.
create or replace function public.claims_set_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select owner_id into new.owner_id from public.players where id = new.player_id;
  if new.owner_id is null then
    raise exception 'player_not_found' using errcode = 'P0002';
  end if;
  return new;
end $$;

drop trigger if exists claims_set_owner on public.challenge_claims;
create trigger claims_set_owner before insert on public.challenge_claims
  for each row execute function public.claims_set_owner();

-- ---------- Entrar con código (jugadores) ----------
-- Devuelve 1 fila si el código es válido y 0 filas si no. Vincula la sesión
-- anónima actual con el jugador. Un código nuevo en otro celular reemplaza al anterior.
create or replace function public.join_with_code(p_code text)
returns setof public.players
language plpgsql security definer set search_path = public as $$
declare
  v public.players;
  n int;
  c text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select count(*) into n from public.join_attempts
   where uid = auth.uid() and not ok and at > now() - interval '10 minutes';
  if n >= 8 then
    raise exception 'too_many_attempts' using errcode = '54000';
  end if;

  select * into v from public.players where join_code = c and active;
  if not found then
    insert into public.join_attempts(uid, ok) values (auth.uid(), false);
    return;
  end if;

  update public.players set user_id = null where user_id = auth.uid() and id <> v.id;
  update public.players set user_id = auth.uid(), joined_at = now()
   where id = v.id returning * into v;
  insert into public.join_attempts(uid, ok) values (auth.uid(), true);
  return next v;
end $$;

-- Código nuevo para un jugador (también cierra la sesión del celular anterior).
create or replace function public.new_join_code(p_player uuid)
returns text
language plpgsql security invoker set search_path = public as $$
declare
  c text;
  tries int := 0;
begin
  loop
    tries := tries + 1;
    begin
      update public.players set join_code = public.gen_join_code(), user_id = null
       where id = p_player returning join_code into c;
      if c is null then
        raise exception 'player_not_found' using errcode = 'P0002';
      end if;
      return c;
    exception when unique_violation then
      if tries > 5 then raise; end if;
    end;
  end loop;
end $$;

-- ---------- Permisos de ejecución y tablas ----------
revoke all on all tables in schema public from anon;
revoke all on function public.join_with_code(text) from public, anon;
revoke all on function public.new_join_code(uuid) from public, anon;
grant execute on function public.join_with_code(text) to authenticated;
grant execute on function public.new_join_code(uuid) to authenticated;
grant select, insert, update, delete on
  public.groups, public.players, public.player_notes, public.sessions, public.attendance,
  public.ratings, public.level_exams, public.challenge_claims, public.custom_exercises
  to authenticated;


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


