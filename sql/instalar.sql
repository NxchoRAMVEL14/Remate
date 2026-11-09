-- Remate · instalación completa para Supabase (SQL Editor → pega todo → Run).
-- Incluye: núcleo, laboratorio y partidos, En casa y mejoras, equipo de apoyo (ayudantes, convocatoria, pruebas, avisos),
-- torneos con su convocatoria y la prueba de 10 m (v3.3), el calendario del equipo (v3.4)
-- varios equipos por grupo, torneos de eliminación directa y jugadores comodín (v3.5)
-- Gym con rutinas y registro de cargas, más jugadores en varios equipos (v3.6)
-- la lista de asistencia con QR más el método «Video en Remate» del laboratorio (v3.7)
-- hasta 3 celulares por jugador más la lista con QR abierta por ayudantes (v3.8)
-- y carga semanal, videos de técnica, captura con dos celulares y recordatorios automáticos (v3.9).
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

-- =====================================================================
-- REMATE · Fase 4: equipo de apoyo, convocatorias, pruebas físicas, avisos y más
-- Va después de 01 a 04 (si usas instalar.sql ya viene incluido).
-- Es seguro correrlo más de una vez (no borra datos).
--
-- Ayudantes (pueden pasar lista y capturar partidos; nunca ven notas, evaluaciones, laboratorio ni reportes):
--   · Capitán o mánager: un jugador que el entrenador marca como capitán. Entra con su mismo código.
--   · Asistente adulto: alguien con su propia cuenta de correo que entra con un código de invitación.
-- =====================================================================

-- ---------- Columnas nuevas ----------
alter table public.players add column if not exists captain boolean not null default false;
alter table public.players add column if not exists home_plan jsonb not null default '{}'::jsonb;   -- tarea de casa: { items: [{ ref, times }], note }
alter table public.matches add column if not exists lineups jsonb not null default '[]'::jsonb;     -- alineación y rotación por set
alter table public.matches add column if not exists video jsonb not null default '{}'::jsonb;       -- enlace y marcas de tiempo

-- ---------- Asistentes adultos ----------
create table if not exists public.staff (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique default public.gen_join_code(),
  user_id uuid references auth.users(id) on delete set null,
  active boolean not null default true,
  joined_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists staff_user_idx on public.staff (user_id);

-- ---------- Ayudantes de permisos (security definer: evitan recursión entre políticas) ----------
create or replace function public.my_staff_group_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select group_id from public.staff where user_id = auth.uid() and active
  union
  select group_id from public.players where user_id = auth.uid() and active and captain;
$$;
create or replace function public.staff_player_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.players where group_id in (select public.my_staff_group_ids());
$$;
create or replace function public.staff_session_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.sessions where group_id in (select public.my_staff_group_ids());
$$;
create or replace function public.staff_match_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.matches where group_id in (select public.my_staff_group_ids());
$$;

-- Lista del equipo para ayudantes: sin códigos de acceso ni datos de cuenta.
create or replace function public.staff_roster()
returns table (id uuid, group_id uuid, name text, jersey smallint, "position" text, level smallint, branch text, active boolean, captain boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.group_id, p.name, p.jersey, p.position, p.level, p.branch, p.active, p.captain
    from public.players p
   where p.group_id in (select public.my_staff_group_ids()) and p.active;
$$;

-- El asistente adulto escribe el código que le dio el entrenador.
create or replace function public.join_staff(p_code text)
returns setof public.staff
language plpgsql security definer set search_path = public as $$
declare
  v public.staff;
  n int;
  c text := upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'));
begin
  if auth.uid() is null or not public.is_coach() then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select count(*) into n from public.join_attempts
   where uid = auth.uid() and not ok and at > now() - interval '10 minutes';
  if n >= 8 then
    raise exception 'too_many_attempts' using errcode = '54000';
  end if;
  select * into v from public.staff where invite_code = c and active and (user_id is null or user_id = auth.uid());
  if not found or v.owner_id = auth.uid() then
    insert into public.join_attempts(uid, ok) values (auth.uid(), false);
    return;
  end if;
  update public.staff set user_id = auth.uid(), joined_at = now() where id = v.id returning * into v;
  insert into public.join_attempts(uid, ok) values (auth.uid(), true);
  return next v;
end $$;

-- ---------- Convocatoria: ¿vas al partido? ----------
create table if not exists public.match_rsvps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('voy','no','duda')),
  note text not null default '' check (char_length(note) <= 200),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (match_id, player_id)
);

-- ---------- Pruebas físicas de los jugadores ----------
create table if not exists public.player_tests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  test_date date not null default current_date,
  kind text not null check (kind in ('cmj','alcance','agilidad','plancha','estatura')),
  value numeric(6,2) not null check (value > 0 and value < 1000),
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists player_tests_player_idx on public.player_tests (player_id, test_date);

-- ---------- Avisos al equipo ----------
create table if not exists public.notices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 80),
  body text not null default '' check (char_length(body) <= 500),
  url text not null default '' check (char_length(url) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists notices_group_idx on public.notices (group_id, created_at desc);

-- ---------- Notificaciones en el celular ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  endpoint text not null check (char_length(endpoint) <= 1000),
  keys jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
-- Llaves del servidor de notificaciones: solo las lee la función "avisos" (nadie más tiene permiso).
create table if not exists public.push_config (
  id smallint primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  created_at timestamptz not null default now()
);

-- ---------- Dueño automático: todo queda a nombre del entrenador del grupo ----------
-- Así lo que capture un ayudante sigue siendo del entrenador, y nadie puede cambiar el dueño de una fila.
create or replace function public.set_owner_from_parent() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  if tg_op = 'UPDATE' then new.owner_id := old.owner_id; return new; end if;
  if tg_table_name = 'attendance' then select owner_id into o from public.sessions where id = new.session_id;
  elsif tg_table_name = 'matches' then select owner_id into o from public.groups where id = new.group_id;
  elsif tg_table_name in ('match_logs', 'match_stats', 'match_rsvps') then select owner_id into o from public.matches where id = new.match_id;
  end if;
  if o is null then raise exception 'parent_not_found' using errcode = 'P0002'; end if;
  new.owner_id := o;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['attendance', 'matches', 'match_logs', 'match_stats', 'match_rsvps'] loop
    execute format('drop trigger if exists set_owner on public.%I', t);
    execute format('create trigger set_owner before insert or update on public.%I for each row execute function public.set_owner_from_parent()', t);
  end loop;
end $$;

-- Al pasar lista, el entrenamiento queda hecho y visible (aunque la lista la pase un ayudante).
create or replace function public.attendance_marks_session() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.sessions
     set status = case when status = 'planeada' then 'hecha' else status end, published = true
   where id = new.session_id and (status = 'planeada' or not published);
  return null;
end $$;
drop trigger if exists attendance_marks_session on public.attendance;
create trigger attendance_marks_session after insert on public.attendance
  for each row execute function public.attendance_marks_session();

-- ---------- Seguridad ----------
alter table public.staff               enable row level security;
alter table public.match_rsvps         enable row level security;
alter table public.player_tests        enable row level security;
alter table public.notices             enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.push_config         enable row level security;   -- sin políticas: nadie la lee desde la app

-- Entrenador: control total sobre lo suyo.
do $$
declare r record;
begin
  for r in
    select * from (values
      ('staff',        'group_id in (select id from public.groups where owner_id = auth.uid())'),
      ('match_rsvps',  'match_id in (select id from public.matches where owner_id = auth.uid())
                        and player_id in (select id from public.players where owner_id = auth.uid())'),
      ('player_tests', 'player_id in (select id from public.players where owner_id = auth.uid())'),
      ('notices',      'group_id in (select id from public.groups where owner_id = auth.uid())')
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

-- El asistente ve su propia invitación (así la app sabe que es asistente).
drop policy if exists staff_self_read on public.staff;
create policy staff_self_read on public.staff for select to authenticated using (user_id = auth.uid());

-- Ayudantes (asistente adulto o capitán): ven el grupo, los entrenamientos y la asistencia; pasan lista.
drop policy if exists groups_staff_read on public.groups;
create policy groups_staff_read on public.groups for select to authenticated
  using (id in (select public.my_staff_group_ids()));
drop policy if exists sessions_staff_read on public.sessions;
create policy sessions_staff_read on public.sessions for select to authenticated
  using (group_id in (select public.my_staff_group_ids()));
drop policy if exists attendance_staff on public.attendance;
create policy attendance_staff on public.attendance for all to authenticated
  using (session_id in (select public.staff_session_ids()))
  with check (session_id in (select public.staff_session_ids()) and player_id in (select public.staff_player_ids()));

-- Ayudantes: crean y capturan partidos de su grupo (no los borran).
drop policy if exists matches_staff_read on public.matches;
create policy matches_staff_read on public.matches for select to authenticated
  using (group_id in (select public.my_staff_group_ids()));
drop policy if exists matches_staff_insert on public.matches;
create policy matches_staff_insert on public.matches for insert to authenticated
  with check (group_id in (select public.my_staff_group_ids()));
drop policy if exists matches_staff_update on public.matches;
create policy matches_staff_update on public.matches for update to authenticated
  using (group_id in (select public.my_staff_group_ids()))
  with check (group_id in (select public.my_staff_group_ids()));

-- Registro y estadística del partido: leer, crear y corregir (sin borrar).
do $$
declare t text; op text;
begin
  foreach t in array array['match_logs', 'match_stats'] loop
    execute format('drop policy if exists %I on public.%I', t || '_staff', t);   -- versión anterior
    foreach op in array array['select', 'insert', 'update'] loop
      execute format('drop policy if exists %I on public.%I', t || '_staff_' || op, t);
    end loop;
    execute format('create policy %I on public.%I for select to authenticated using (match_id in (select public.staff_match_ids()))', t || '_staff_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (match_id in (select public.staff_match_ids())%s)',
      t || '_staff_insert', t, case when t = 'match_stats' then ' and player_id in (select public.staff_player_ids())' else '' end);
    execute format('create policy %I on public.%I for update to authenticated using (match_id in (select public.staff_match_ids())) with check (match_id in (select public.staff_match_ids())%s)',
      t || '_staff_update', t, case when t = 'match_stats' then ' and player_id in (select public.staff_player_ids())' else '' end);
  end loop;
end $$;
drop policy if exists match_rsvps_staff_read on public.match_rsvps;
create policy match_rsvps_staff_read on public.match_rsvps for select to authenticated
  using (match_id in (select public.staff_match_ids()));

-- Jugador: su convocatoria (la ve, la contesta y la cambia), sus pruebas y los avisos de su grupo.
drop policy if exists match_rsvps_player on public.match_rsvps;
create policy match_rsvps_player on public.match_rsvps for all to authenticated
  using (player_id in (select public.my_player_ids()))
  with check (player_id in (select public.my_player_ids())
              and match_id in (select id from public.matches where group_id in (select public.my_group_ids())));
drop policy if exists player_tests_player_read on public.player_tests;
create policy player_tests_player_read on public.player_tests for select to authenticated
  using (player_id in (select public.my_player_ids()));
drop policy if exists notices_member_read on public.notices;
create policy notices_member_read on public.notices for select to authenticated
  using (group_id in (select public.my_group_ids()) or group_id in (select public.my_staff_group_ids()));

-- Notificaciones: cada quien guarda y borra solo las suyas, para un grupo al que pertenece.
drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and (
    group_id in (select public.my_group_ids())
    or group_id in (select public.my_staff_group_ids())
    or group_id in (select id from public.groups where owner_id = auth.uid())));

-- ---------- Permisos ----------
revoke all on all tables in schema public from anon;
revoke all on public.push_config from authenticated;
revoke all on function public.join_staff(text) from public, anon;
revoke all on function public.staff_roster() from public, anon;
grant execute on function public.join_staff(text) to authenticated;
grant execute on function public.staff_roster() to authenticated;
grant select, insert, update, delete on
  public.staff, public.match_rsvps, public.player_tests, public.notices, public.push_subscriptions
  to authenticated;

-- =====================================================================
-- REMATE · v3.3: torneos (con convocatoria) y prueba de velocidad de 10 m
-- Va después de 01 a 05 (si usas instalar.sql ya viene incluido).
-- Es seguro correrlo más de una vez. Solo agrega: no borra datos.
--
-- Torneos: agrupan partidos, con sede, fechas, rama, convocados, tabla de posiciones y resultado final.
--   · El entrenador los crea y edita.
--   · Los ayudantes (asistente o capitán) los ven y pueden capturar sus partidos.
--   · Los jugadores ven los torneos de su grupo; si están convocados, confirman si van.
-- =====================================================================

-- ---------- Torneos ----------
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  venue text not null default '' check (char_length(venue) <= 120),
  start_date date not null default current_date,
  end_date date,
  branch text not null default 'X' check (branch in ('F', 'M', 'X')),      -- femenil, varonil o mixto
  roster jsonb not null default '[]'::jsonb,                                -- ids de los jugadores convocados
  standings jsonb not null default '[]'::jsonb,                             -- tabla: [{ team, pj, pg, pp, sf, sc, pts, us }]
  place smallint check (place between 1 and 64),                            -- lugar final (1 = campeón)
  result text not null default '' check (char_length(result) <= 120),
  note text not null default '' check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  constraint tournaments_dates_check check (end_date is null or end_date >= start_date)
);
create index if not exists tournaments_group_idx on public.tournaments (group_id, start_date desc);

-- Un partido puede pertenecer a un torneo (si se borra el torneo, el partido se queda sin torneo).
alter table public.matches add column if not exists tournament_id uuid references public.tournaments(id) on delete set null;
create index if not exists matches_tournament_idx on public.matches (tournament_id);

-- Convocatoria del torneo: el jugador convocado contesta si va.
create table if not exists public.tournament_rsvps (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  status text not null check (status in ('voy', 'no', 'duda')),
  note text not null default '' check (char_length(note) <= 200),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tournament_id, player_id)
);

-- ---------- Prueba física nueva: velocidad de 10 m (vel10) ----------
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.player_tests'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%kind%'
  loop
    execute format('alter table public.player_tests drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.player_tests add constraint player_tests_kind_check
  check (kind in ('cmj', 'alcance', 'agilidad', 'plancha', 'estatura', 'vel10'));

-- ---------- Dueño automático (se agrega la convocatoria del torneo) ----------
create or replace function public.set_owner_from_parent() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  if tg_op = 'UPDATE' then new.owner_id := old.owner_id; return new; end if;
  if tg_table_name = 'attendance' then select owner_id into o from public.sessions where id = new.session_id;
  elsif tg_table_name = 'matches' then select owner_id into o from public.groups where id = new.group_id;
  elsif tg_table_name in ('match_logs', 'match_stats', 'match_rsvps') then select owner_id into o from public.matches where id = new.match_id;
  elsif tg_table_name = 'tournament_rsvps' then select owner_id into o from public.tournaments where id = new.tournament_id;
  end if;
  if o is null then raise exception 'parent_not_found' using errcode = 'P0002'; end if;
  new.owner_id := o;
  return new;
end $$;
drop trigger if exists set_owner on public.tournament_rsvps;
create trigger set_owner before insert or update on public.tournament_rsvps for each row execute function public.set_owner_from_parent();

-- ---------- Seguridad ----------
alter table public.tournaments      enable row level security;
alter table public.tournament_rsvps enable row level security;

-- Entrenador: control total sobre lo suyo.
do $$
declare r record;
begin
  for r in
    select * from (values
      ('tournaments',      'group_id in (select id from public.groups where owner_id = auth.uid())'),
      ('tournament_rsvps', 'tournament_id in (select id from public.tournaments where owner_id = auth.uid())
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

-- Jugador: ve los torneos de su grupo y contesta su propia convocatoria (solo si está convocado).
drop policy if exists tournaments_player_read on public.tournaments;
create policy tournaments_player_read on public.tournaments for select to authenticated
  using (group_id in (select public.my_group_ids()));
drop policy if exists tournament_rsvps_player on public.tournament_rsvps;
create policy tournament_rsvps_player on public.tournament_rsvps for all to authenticated
  using (player_id in (select public.my_player_ids()))
  with check (player_id in (select public.my_player_ids())
              and exists (select 1 from public.tournaments t
                           where t.id = tournament_id
                             and t.group_id in (select public.my_group_ids())
                             and t.roster ? player_id::text));

-- Ayudantes (asistente o capitán): ven los torneos de su grupo y quién confirmó.
drop policy if exists tournaments_staff_read on public.tournaments;
create policy tournaments_staff_read on public.tournaments for select to authenticated
  using (group_id in (select public.my_staff_group_ids()));
drop policy if exists tournament_rsvps_staff_read on public.tournament_rsvps;
create policy tournament_rsvps_staff_read on public.tournament_rsvps for select to authenticated
  using (tournament_id in (select id from public.tournaments where group_id in (select public.my_staff_group_ids())));

-- ---------- Permisos ----------
revoke all on public.tournaments, public.tournament_rsvps from anon;
grant select, insert, update, delete on public.tournaments, public.tournament_rsvps to authenticated;

-- =====================================================================
-- REMATE · v3.4: calendario del equipo para el celular (suscripción)
-- Va después de 01 a 06 (si usas instalar.sql ya viene incluido).
-- Es seguro correrlo más de una vez. Solo agrega: no borra datos.
--
-- Cada equipo tiene un enlace secreto de calendario. La función "calendario" de Supabase lo usa para
-- entregar los entrenamientos publicados, los partidos y los torneos en formato de calendario (.ics),
-- sin nombres de jugadores. El entrenador puede cambiar el enlace cuando quiera (el anterior deja de servir).
-- =====================================================================

create table if not exists public.calendar_feeds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  group_id uuid not null unique references public.groups(id) on delete cascade,
  token text not null unique default replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
        check (char_length(token) between 32 and 80),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.calendar_feeds enable row level security;

-- Entrenador: control total sobre el de su grupo.
drop policy if exists calendar_feeds_coach on public.calendar_feeds;
create policy calendar_feeds_coach on public.calendar_feeds for all to authenticated
  using (owner_id = auth.uid() and public.is_coach())
  with check (owner_id = auth.uid() and public.is_coach()
              and group_id in (select id from public.groups where owner_id = auth.uid()));

-- Jugadores y ayudantes: leen el enlace activo de su grupo (para suscribirse). No lo pueden cambiar.
drop policy if exists calendar_feeds_member_read on public.calendar_feeds;
create policy calendar_feeds_member_read on public.calendar_feeds for select to authenticated
  using (active and (group_id in (select public.my_group_ids()) or group_id in (select public.my_staff_group_ids())));

revoke all on public.calendar_feeds from anon;
grant select, insert, update, delete on public.calendar_feeds to authenticated;

-- =====================================================================
-- REMATE · v3.5: varios equipos del mismo grupo (por ejemplo «CETAC A» y «CETAC B»), torneos de eliminación directa
-- y jugadores comodín (que juegan bien varias posiciones)
-- Va después de 01 a 07 (si usas instalar.sql ya viene incluido).
-- Es seguro correrlo más de una vez. Solo agrega columnas: no crea tablas, no cambia permisos y no borra datos.
--
-- Los equipos se dan de alta en Ajustes (se guardan en la configuración del grupo). Aquí solo se guarda
-- a qué equipo pertenece cada jugador y cada partido, las otras posiciones de cada jugador, y el formato y el cuadro de cada torneo.
-- =====================================================================

alter table public.players     add column if not exists team text not null default '' check (char_length(team) <= 40);
alter table public.matches     add column if not exists team text not null default '' check (char_length(team) <= 40);
alter table public.tournaments add column if not exists format text not null default 'tabla' check (format in ('tabla', 'eliminacion'));
alter table public.tournaments add column if not exists bracket jsonb not null default '[]'::jsonb;   -- cuadro: [{ id, round, label, time, a, b, bye, winner, score, match_id }]
alter table public.tournaments add column if not exists teams jsonb not null default '[]'::jsonb;     -- ids de tus equipos que juegan el torneo
-- Jugadores comodín: otras posiciones que juega bien, además de la principal (lista de hasta 5).
alter table public.players     add column if not exists positions jsonb not null default '[]'::jsonb
  check (case when jsonb_typeof(positions) = 'array' then jsonb_array_length(positions) <= 5 else false end);

-- =====================================================================
-- REMATE · v3.6: Físico en el gym (registro de sesiones y rutina asignada) y jugadores en varios equipos
-- Va después de 01 a 08 (si usas instalar.sql ya viene incluido).
-- Es seguro correrlo más de una vez. Agrega 1 tabla y 2 columnas: no cambia lo que ya tienes ni borra datos.
--
-- Gym: cada jugador registra sus sesiones (pesos y repeticiones). Las ven él y su entrenador; nadie más.
-- La rutina que el entrenador le asigna se guarda en su ficha (gym_plan). La que arma él mismo vive en su celular.
-- Varios equipos: además de su equipo principal (team), un jugador puede jugar en otros (teams), por ejemplo varonil y mixto.
-- =====================================================================

alter table public.players add column if not exists gym_plan jsonb not null default '{}'::jsonb
  check (jsonb_typeof(gym_plan) = 'object' and octet_length(gym_plan::text) <= 1000);   -- { goal, days, minutes, exp, equip, phase, note, since }
alter table public.players add column if not exists teams jsonb not null default '[]'::jsonb
  check (case when jsonb_typeof(teams) = 'array' then jsonb_array_length(teams) <= 8 else false end);   -- ids de otros equipos donde juega

create table if not exists public.gym_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,   -- siempre el entrenador
  player_id uuid not null references public.players(id) on delete cascade,
  done_on date not null default current_date,
  day text not null default '' check (char_length(day) <= 20),            -- día de la rutina: A, B, C o D
  goal text not null default '' check (char_length(goal) <= 20),          -- objetivo de la rutina (salto, fuerza...)
  plan jsonb not null default '{}'::jsonb check (jsonb_typeof(plan) = 'object' and octet_length(plan::text) <= 1000),
  sets jsonb not null default '[]'::jsonb                                  -- [{ ex, s: [[kg, repeticiones], ...] }]
    check (case when jsonb_typeof(sets) = 'array' then jsonb_array_length(sets) <= 16 and octet_length(sets::text) <= 6000 else false end),
  minutes smallint check (minutes between 1 and 240),
  rpe smallint check (rpe between 1 and 10),                               -- qué tan pesada fue la sesión
  pain boolean not null default false,                                     -- «me dolió algo»
  note text not null default '' check (char_length(note) <= 300),
  created_at timestamptz not null default now()
);
create index if not exists gym_logs_player_idx on public.gym_logs (player_id, done_on desc);
alter table public.gym_logs enable row level security;

-- Entrenador: los registros de sus jugadores (incluido su propio perfil de jugador).
drop policy if exists gym_logs_coach on public.gym_logs;
create policy gym_logs_coach on public.gym_logs for all to authenticated
  using (owner_id = auth.uid() and public.is_coach())
  with check (owner_id = auth.uid() and public.is_coach()
              and player_id in (select id from public.players where owner_id = auth.uid()));

-- Jugador: ve, agrega y borra solo lo suyo. No puede cambiar un registro: si se equivoca, lo borra.
drop policy if exists gym_logs_player_read on public.gym_logs;
create policy gym_logs_player_read on public.gym_logs for select to authenticated
  using (player_id in (select public.my_player_ids()));

drop policy if exists gym_logs_player_insert on public.gym_logs;
create policy gym_logs_player_insert on public.gym_logs for insert to authenticated
  with check (player_id in (select public.my_player_ids()) and done_on between current_date - 7 and current_date + 1);

drop policy if exists gym_logs_player_delete on public.gym_logs;
create policy gym_logs_player_delete on public.gym_logs for delete to authenticated
  using (player_id in (select public.my_player_ids()));

-- El dueño del registro siempre es el entrenador del jugador (igual que en En casa).
create or replace function public.gym_logs_set_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select owner_id into new.owner_id from public.players where id = new.player_id;
  if new.owner_id is null then raise exception 'Jugador no encontrado'; end if;
  return new;
end $$;
drop trigger if exists gym_logs_set_owner on public.gym_logs;
create trigger gym_logs_set_owner before insert on public.gym_logs
  for each row execute function public.gym_logs_set_owner();

revoke all on public.gym_logs from anon;
grant select, insert, update, delete on public.gym_logs to authenticated;

-- =====================================================================
-- REMATE · v3.7: lista de asistencia con QR y método «Video en Remate» en el laboratorio
-- Va después de 01 a 09 (si usas instalar.sql ya viene incluido).
-- Es seguro correrlo más de una vez. Agrega 1 tabla y 1 función, y acepta un método nuevo en jump_tests.
--
-- Lista con QR: el entrenador abre la lista de un entrenamiento y su celular muestra un QR con un código
-- de 6 números que cambia cada 20 segundos. Cada jugador lo escanea desde Remate y queda presente
-- (o con retardo después de la tolerancia). El código sale de un secreto que solo conoce el entrenador:
-- una foto del QR deja de servir en un minuto. Varios intentos fallidos seguidos frenan al jugador.
-- =====================================================================

create table if not exists public.session_checkins (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id uuid not null unique references public.sessions(id) on delete cascade,
  secret text not null check (char_length(secret) between 16 and 128),   -- solo lo ven el entrenador y la función check_in
  open_until timestamptz,                                                  -- hasta cuándo se puede escanear
  late_after timestamptz,                                                  -- después de esta hora queda como retardo
  created_at timestamptz not null default now()
);
alter table public.session_checkins enable row level security;

drop policy if exists session_checkins_coach on public.session_checkins;
create policy session_checkins_coach on public.session_checkins for all to authenticated
  using (owner_id = auth.uid() and public.is_coach())
  with check (owner_id = auth.uid() and public.is_coach()
              and session_id in (select id from public.sessions where owner_id = auth.uid()));
revoke all on public.session_checkins from anon;
grant select, insert, update, delete on public.session_checkins to authenticated;

-- El jugador marca su llegada con el código del QR. Devuelve { status, already, name } o { error: 'bad_code' }.
create or replace function public.check_in(p_session uuid, p_code text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  ck public.session_checkins;
  s public.sessions;
  pid uuid;
  pname text;
  n int;
  w bigint := floor(extract(epoch from now()) / 20);
  c text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');
  matched boolean := false;
  st text;
  cur text;
  i int;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  select count(*) into n from public.join_attempts
   where uid = auth.uid() and not ok and at > now() - interval '10 minutes';
  if n >= 10 then raise exception 'too_many_attempts' using errcode = '54000'; end if;

  select * into s from public.sessions where id = p_session;
  if not found then raise exception 'session_not_found' using errcode = 'P0002'; end if;

  select id, name into pid, pname from public.players
   where user_id = auth.uid() and active and group_id = s.group_id limit 1;
  if pid is null then raise exception 'not_in_team' using errcode = '42501'; end if;

  select * into ck from public.session_checkins where session_id = p_session;
  if not found or ck.open_until is null or ck.open_until < now() then
    raise exception 'checkin_closed' using errcode = 'P0001';
  end if;

  -- Código válido: el de ahora o el de hasta un minuto antes (cambia cada 20 segundos).
  for i in -3..1 loop
    if lpad(((('x' || substr(encode(hmac((w + i)::text, ck.secret, 'sha256'), 'hex'), 1, 7))::bit(28)::int) % 1000000)::text, 6, '0') = c then
      matched := true; exit;
    end if;
  end loop;
  if not matched then
    -- Se devuelve en lugar de lanzar un error para que el intento fallido sí quede anotado.
    insert into public.join_attempts(uid, ok) values (auth.uid(), false);
    return jsonb_build_object('error', 'bad_code');
  end if;

  st := case when ck.late_after is not null and now() > ck.late_after then 'retardo' else 'presente' end;
  select status into cur from public.attendance where session_id = p_session and player_id = pid;
  if cur is not null and cur <> 'falta' then
    return jsonb_build_object('status', cur, 'already', true, 'name', pname);
  end if;
  insert into public.attendance (session_id, player_id, status)
  values (p_session, pid, st)
  on conflict (session_id, player_id) do update set status = excluded.status;
  return jsonb_build_object('status', st, 'already', false, 'name', pname);
end $$;
revoke all on function public.check_in(uuid, text) from public, anon;
grant execute on function public.check_in(uuid, text) to authenticated;

-- ---------- Laboratorio: método nuevo «Video en Remate» (cuadro por cuadro) ----------
do $$
declare c record;
begin
  for c in select conname from pg_constraint
            where conrelid = 'public.jump_tests'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%method%'
  loop
    execute format('alter table public.jump_tests drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.jump_tests add constraint jump_tests_method_check
  check (method in ('myjump', 'sargent', 'mat', 'otro', 'remate'));

-- =====================================================================
-- REMATE · v3.8: hasta 3 celulares por jugador y lista con QR abierta por ayudantes
-- Va después de 01 a 10 (si usas instalar.sql ya viene incluido).
-- Es seguro correrlo más de una vez. Agrega 1 tabla y actualiza funciones de permisos: no borra datos.
--
-- Celulares: antes, al escribir su código en otro lugar, el anterior se desconectaba. En iPhone, Safari y
-- Remate instalado cuentan como dos lugares distintos, así que se pedía el código una y otra vez.
-- Ahora cada jugador puede estar en 3 lugares a la vez; al cuarto se desconecta el más viejo.
-- «Código nuevo» sigue desconectando todos.
-- Lista con QR: el entrenador decide en Ajustes si también la abren sus asistentes (y capitanes).
-- =====================================================================

create table if not exists public.player_devices (
  user_id uuid primary key references auth.users(id) on delete cascade,   -- la sesión de ese celular
  player_id uuid not null references public.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index if not exists player_devices_player_idx on public.player_devices (player_id, last_seen desc);
alter table public.player_devices enable row level security;   -- sin políticas: solo la usan las funciones de abajo
revoke all on public.player_devices from anon, authenticated;

-- Los que ya entraron siguen dentro.
insert into public.player_devices (user_id, player_id)
select user_id, id from public.players where user_id is not null
on conflict (user_id) do nothing;

-- Jugadores de quien está usando la app (cualquiera de sus celulares).
create or replace function public.my_device_player_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.players where user_id = auth.uid()
  union
  select player_id from public.player_devices where user_id = auth.uid();
$$;
create or replace function public.my_player_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select id from public.players where active and id in (select public.my_device_player_ids());
$$;
create or replace function public.my_group_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select group_id from public.players where active and id in (select public.my_device_player_ids());
$$;
create or replace function public.my_coach_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select owner_id from public.players where active and id in (select public.my_device_player_ids());
$$;
create or replace function public.my_staff_group_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select group_id from public.staff where user_id = auth.uid() and active
  union
  select group_id from public.players where active and captain and id in (select public.my_device_player_ids());
$$;

drop policy if exists players_self_read on public.players;
create policy players_self_read on public.players for select to authenticated
  using (id in (select public.my_device_player_ids()));

-- Entrar con el código: este celular queda ligado al jugador sin sacar a los otros (máximo 3).
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
  insert into public.player_devices (user_id, player_id) values (auth.uid(), v.id)
  on conflict (user_id) do update set player_id = excluded.player_id, last_seen = now();
  delete from public.player_devices
   where player_id = v.id and user_id in (
     select user_id from public.player_devices where player_id = v.id order by last_seen desc offset 3);
  update public.players set user_id = auth.uid(), joined_at = now()
   where id = v.id returning * into v;
  insert into public.join_attempts(uid, ok) values (auth.uid(), true);
  return next v;
end $$;
revoke all on function public.join_with_code(text) from public, anon;
grant execute on function public.join_with_code(text) to authenticated;

-- Código nuevo (desde la ficha o con new_join_code): se desconectan todos sus celulares.
create or replace function public.players_code_changed() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.join_code is distinct from old.join_code then
    delete from public.player_devices where player_id = new.id;
  end if;
  return new;
end $$;
drop trigger if exists players_code_changed on public.players;
create trigger players_code_changed after update of join_code on public.players
  for each row execute function public.players_code_changed();

-- Marcar llegada con el QR desde cualquiera de sus celulares.
create or replace function public.check_in(p_session uuid, p_code text)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  ck public.session_checkins;
  s public.sessions;
  pid uuid;
  pname text;
  n int;
  w bigint := floor(extract(epoch from now()) / 20);
  c text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');
  matched boolean := false;
  st text;
  cur text;
  i int;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '28000'; end if;

  select count(*) into n from public.join_attempts
   where uid = auth.uid() and not ok and at > now() - interval '10 minutes';
  if n >= 10 then raise exception 'too_many_attempts' using errcode = '54000'; end if;

  select * into s from public.sessions where id = p_session;
  if not found then raise exception 'session_not_found' using errcode = 'P0002'; end if;

  select id, name into pid, pname from public.players
   where active and group_id = s.group_id and id in (select public.my_device_player_ids()) limit 1;
  if pid is null then raise exception 'not_in_team' using errcode = '42501'; end if;

  select * into ck from public.session_checkins where session_id = p_session;
  if not found or ck.open_until is null or ck.open_until < now() then
    raise exception 'checkin_closed' using errcode = 'P0001';
  end if;

  for i in -3..1 loop
    if lpad(((('x' || substr(encode(hmac((w + i)::text, ck.secret, 'sha256'), 'hex'), 1, 7))::bit(28)::int) % 1000000)::text, 6, '0') = c then
      matched := true; exit;
    end if;
  end loop;
  if not matched then
    insert into public.join_attempts(uid, ok) values (auth.uid(), false);
    return jsonb_build_object('error', 'bad_code');
  end if;

  st := case when ck.late_after is not null and now() > ck.late_after then 'retardo' else 'presente' end;
  select status into cur from public.attendance where session_id = p_session and player_id = pid;
  if cur is not null and cur <> 'falta' then
    return jsonb_build_object('status', cur, 'already', true, 'name', pname);
  end if;
  insert into public.attendance (session_id, player_id, status)
  values (p_session, pid, st)
  on conflict (session_id, player_id) do update set status = excluded.status;
  return jsonb_build_object('status', st, 'already', false, 'name', pname);
end $$;
revoke all on function public.check_in(uuid, text) from public, anon;
grant execute on function public.check_in(uuid, text) to authenticated;

-- ---------- Lista con QR abierta por ayudantes ----------
-- Ajustes del grupo: qr_helpers = 'no' (solo el entrenador), 'asistente' (y asistentes adultos) o 'todos' (y capitanes).
create or replace function public.can_open_qr(p_session uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.sessions s join public.groups g on g.id = s.group_id
     where s.id = p_session and (
       (coalesce(g.settings->>'qr_helpers', 'no') in ('asistente', 'todos')
         and s.group_id in (select group_id from public.staff where user_id = auth.uid() and active))
       or (coalesce(g.settings->>'qr_helpers', 'no') = 'todos'
         and s.group_id in (select group_id from public.players where active and captain and id in (select public.my_device_player_ids())))));
$$;
drop policy if exists session_checkins_staff on public.session_checkins;
create policy session_checkins_staff on public.session_checkins for all to authenticated
  using (public.can_open_qr(session_id))
  with check (public.can_open_qr(session_id));

-- Lo que abre un ayudante queda a nombre del entrenador.
create or replace function public.session_checkins_set_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' then new.owner_id := old.owner_id; return new; end if;
  select owner_id into new.owner_id from public.sessions where id = new.session_id;
  if new.owner_id is null then raise exception 'session_not_found' using errcode = 'P0002'; end if;
  return new;
end $$;
drop trigger if exists session_checkins_set_owner on public.session_checkins;
create trigger session_checkins_set_owner before insert or update on public.session_checkins
  for each row execute function public.session_checkins_set_owner();


-- =====================================================================
-- REMATE · v3.9: carga semanal (esfuerzo de cada entreno), videos de técnica,
-- captura con dos celulares y control de recordatorios automáticos.
-- Seguro de correr más de una vez.
-- =====================================================================

-- ---------- Carga semanal: el esfuerzo (0 a 10) que cada jugador da a cada entreno ----------
create table if not exists public.session_rpe (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,   -- siempre el entrenador
  player_id uuid not null references public.players(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  rpe smallint not null check (rpe between 0 and 10),
  minutes smallint check (minutes between 0 and 400),
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now(),
  unique (player_id, session_id)
);
create index if not exists session_rpe_player_idx on public.session_rpe (player_id);
alter table public.session_rpe enable row level security;

drop policy if exists session_rpe_coach on public.session_rpe;
create policy session_rpe_coach on public.session_rpe for all to authenticated
  using (owner_id = auth.uid() and public.is_coach())
  with check (owner_id = auth.uid() and public.is_coach());

-- Jugador: ve y contesta lo suyo, solo de entrenos de su grupo de los últimos 4 días.
drop policy if exists session_rpe_player_read on public.session_rpe;
create policy session_rpe_player_read on public.session_rpe for select to authenticated
  using (player_id in (select public.my_player_ids()));
create or replace function public.can_rate_session(p_player uuid, p_session uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.sessions s join public.players p on p.group_id = s.group_id
                  where p.id = p_player and s.id = p_session and s.status <> 'cancelada'
                    and s.session_date between current_date - 4 and current_date);
$$;
drop policy if exists session_rpe_player_insert on public.session_rpe;
create policy session_rpe_player_insert on public.session_rpe for insert to authenticated
  with check (player_id in (select public.my_player_ids()) and public.can_rate_session(player_id, session_id));
drop policy if exists session_rpe_player_update on public.session_rpe;
create policy session_rpe_player_update on public.session_rpe for update to authenticated
  using (player_id in (select public.my_player_ids()) and created_at > now() - interval '4 days')
  with check (player_id in (select public.my_player_ids()));

create or replace function public.session_rpe_set_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select owner_id into new.owner_id from public.players where id = new.player_id;
  if new.owner_id is null then raise exception 'Jugador no encontrado'; end if;
  return new;
end $$;
drop trigger if exists session_rpe_set_owner on public.session_rpe;
create trigger session_rpe_set_owner before insert on public.session_rpe
  for each row execute function public.session_rpe_set_owner();
revoke all on public.session_rpe from anon;
grant select, insert, update, delete on public.session_rpe to authenticated;

-- ---------- Videos de técnica: la ruta del video y los comentarios del entrenador ----------
create table if not exists public.tech_videos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,   -- siempre el entrenador
  player_id uuid not null references public.players(id) on delete cascade,
  path text not null check (char_length(path) between 10 and 200),
  skill text not null default '' check (char_length(skill) <= 20),
  note text not null default '' check (char_length(note) <= 200),
  comments jsonb not null default '[]'::jsonb
    check (case when jsonb_typeof(comments) = 'array' then jsonb_array_length(comments) <= 40 and octet_length(comments::text) <= 12000 else false end),
  size_bytes bigint not null default 0 check (size_bytes between 0 and 52428800),
  seconds numeric(6,1) check (seconds between 0 and 600),
  seen_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists tech_videos_player_idx on public.tech_videos (player_id, created_at desc);
alter table public.tech_videos enable row level security;

drop policy if exists tech_videos_coach on public.tech_videos;
create policy tech_videos_coach on public.tech_videos for all to authenticated
  using (owner_id = auth.uid() and public.is_coach())
  with check (owner_id = auth.uid() and public.is_coach());
-- Jugador: ve sus videos y manda nuevos (máximo 10 guardados). No los cambia ni los borra: eso es del entrenador.
drop policy if exists tech_videos_player_read on public.tech_videos;
create policy tech_videos_player_read on public.tech_videos for select to authenticated
  using (player_id in (select public.my_player_ids()));
drop policy if exists tech_videos_player_insert on public.tech_videos;
create policy tech_videos_player_insert on public.tech_videos for insert to authenticated
  with check (player_id in (select public.my_player_ids()) and seen_at is null and comments = '[]'::jsonb
              and split_part(path, '/', 2) = player_id::text);

create or replace function public.tech_videos_set_owner() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select owner_id into new.owner_id from public.players where id = new.player_id;
  if new.owner_id is null then raise exception 'Jugador no encontrado'; end if;
  if split_part(new.path, '/', 1) <> new.owner_id::text then raise exception 'bad_path' using errcode = '22023'; end if;
  select count(*) into n from public.tech_videos where player_id = new.player_id;
  if n >= 10 then raise exception 'too_many_videos' using errcode = '23514'; end if;
  return new;
end $$;
drop trigger if exists tech_videos_set_owner on public.tech_videos;
create trigger tech_videos_set_owner before insert on public.tech_videos
  for each row execute function public.tech_videos_set_owner();
revoke all on public.tech_videos from anon;
grant select, insert, update, delete on public.tech_videos to authenticated;

-- Carpeta privada «tecnica» en Storage: ruta = <entrenador>/<jugador>/<archivo>. Máximo 45 MB, solo videos.
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
      values ('tecnica', 'tecnica', false, 47185920, array['video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp', 'video/x-m4v'])
      on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

    drop policy if exists tecnica_read on storage.objects;
    create policy tecnica_read on storage.objects for select to authenticated
      using (bucket_id = 'tecnica' and ((storage.foldername(name))[1] = auth.uid()::text
             or (storage.foldername(name))[2] in (select id::text from public.my_player_ids() id)));
    drop policy if exists tecnica_upload on storage.objects;
    create policy tecnica_upload on storage.objects for insert to authenticated
      with check (bucket_id = 'tecnica' and (storage.foldername(name))[2] in (select id::text from public.my_player_ids() id)
                  and (storage.foldername(name))[1] = (select p.owner_id::text from public.players p where p.id::text = (storage.foldername(name))[2]));
    drop policy if exists tecnica_delete on storage.objects;
    create policy tecnica_delete on storage.objects for delete to authenticated
      using (bucket_id = 'tecnica' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end $$;

-- ---------- Captura con dos celulares: junta las jugadas de los dos sin perder ninguna ----------
create or replace function public.match_log_merge(p_match uuid, p_add jsonb default '[]'::jsonb, p_remove text[] default '{}')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  m record; cur jsonb; ids text[]; merged jsonb;
begin
  select id, owner_id, group_id into m from public.matches where id = p_match;
  if m.id is null then raise exception 'match_not_found' using errcode = 'P0002'; end if;
  if not (m.owner_id = auth.uid() or m.group_id in (select public.my_staff_group_ids())) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p_add, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_add, '[]'::jsonb)) > 200 then
    raise exception 'bad_events' using errcode = '22023';
  end if;
  insert into public.match_logs (owner_id, match_id, log) values (m.owner_id, p_match, '[]'::jsonb) on conflict (match_id) do nothing;
  select log into cur from public.match_logs where match_id = p_match for update;
  select coalesce(array_agg(e->>'id'), '{}') into ids from jsonb_array_elements(cur) e;
  select coalesce(jsonb_agg(z.e order by (z.e->>'t')::bigint nulls first, z.o), '[]'::jsonb) into merged from (
    select x.e, x.o from jsonb_array_elements(cur) with ordinality x(e, o) where not ((x.e->>'id') = any(coalesce(p_remove, '{}')))
    union all
    select y.e, 1000000 + y.o from jsonb_array_elements(coalesce(p_add, '[]'::jsonb)) with ordinality y(e, o)
     where not ((y.e->>'id') = any(ids)) and not ((y.e->>'id') = any(coalesce(p_remove, '{}')))
  ) z;
  if octet_length(merged::text) > 400000 then raise exception 'log_too_big' using errcode = '54000'; end if;
  update public.match_logs set log = merged where match_id = p_match;
  return merged;
end $$;
revoke all on function public.match_log_merge(uuid, jsonb, text[]) from public, anon;
grant execute on function public.match_log_merge(uuid, jsonb, text[]) to authenticated;

-- ---------- Recordatorios automáticos: qué ya se mandó (lo usa la función «recordatorios») ----------
create table if not exists public.reminders_sent (
  kind text not null check (kind in ('sesion', 'partido')),
  ref_id uuid not null,
  sent_at timestamptz not null default now(),
  sent int not null default 0,
  primary key (kind, ref_id)
);
alter table public.reminders_sent enable row level security;
revoke all on public.reminders_sent from anon, authenticated;

-- =====================================================================
-- REMATE · v3.11: fecha de nacimiento y Remate Fit (zona de adultos: gym, registros y, en la 3.12, nutrición)
-- Solo entran mayores de 18 que el entrenador activa. Lo de cada adulto es suyo: el entrenador lo ve solo si
-- ese adulto activa «Compartir con mi entrenador» (o si es el propio perfil de jugador del entrenador).
-- =====================================================================
alter table public.players add column if not exists birth_date date;
alter table public.players add column if not exists fit boolean not null default false;
do $$ begin
  alter table public.players add constraint players_birth_date_ok check (birth_date is null or birth_date >= date '1930-01-01');
exception when duplicate_object then null; end $$;

-- Edad cumplida en años (null si no hay fecha).
create or replace function public.age_years(d date) returns int
language sql stable as $$ select case when d is null then null else extract(year from age(current_date, d))::int end $$;

-- Remate Fit solo con fecha de nacimiento y 18 años cumplidos. Si cambian la fecha y ya no cumple, se apaga solo.
create or replace function public.players_fit_guard() returns trigger
language plpgsql as $$
begin
  if new.fit and (new.birth_date is null or public.age_years(new.birth_date) < 18) then
    if tg_op = 'UPDATE' and old.fit and new.birth_date is distinct from old.birth_date then
      new.fit := false;
    else
      raise exception 'Remate Fit es solo para mayores de 18 años con su fecha de nacimiento' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists players_fit_guard on public.players;
create trigger players_fit_guard before insert or update of fit, birth_date on public.players
  for each row execute function public.players_fit_guard();

-- ¿Este jugador puede usar Remate Fit hoy?
create or replace function public.fit_ok(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.players where id = p and active and fit
                 and birth_date is not null and public.age_years(birth_date) >= 18);
$$;
-- El perfil de jugador del propio entrenador (Ajustes → Mi perfil de jugador).
create or replace function public.coach_self_players() returns setof uuid
language sql stable security definer set search_path = public as $$
  select (g.settings->>'me_player')::uuid from public.groups g
   where g.owner_id = auth.uid() and public.is_coach()
     and coalesce(g.settings->>'me_player', '') ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
$$;

-- ---------- Perfil Fit (objetivo, experiencia, días, equipo, voleibol, compartir) ----------
create table if not exists public.fit_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,   -- siempre el entrenador
  player_id uuid not null unique references public.players(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 8000),
  share boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- ---------- Registros Fit: gym, peso y medidas, pasos (y en la 3.12, comidas) ----------
create table if not exists public.fit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  kind text not null check (kind in ('gym', 'body', 'steps', 'meal')),
  day date not null default current_date,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 8000),
  created_at timestamptz not null default now()
);
create index if not exists fit_logs_player_idx on public.fit_logs (player_id, kind, day desc);

-- ¿Este adulto comparte su Remate Fit con su entrenador?
create or replace function public.fit_shared(p uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select share from public.fit_profiles where player_id = p), false);
$$;

-- El dueño siempre es el entrenador del jugador.
create or replace function public.fit_set_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select owner_id into new.owner_id from public.players where id = new.player_id;
  if new.owner_id is null then raise exception 'Jugador no encontrado'; end if;
  if tg_table_name = 'fit_profiles' then new.updated_at := now(); end if;
  return new;
end $$;
drop trigger if exists fit_profiles_owner on public.fit_profiles;
create trigger fit_profiles_owner before insert or update on public.fit_profiles for each row execute function public.fit_set_owner();
drop trigger if exists fit_logs_owner on public.fit_logs;
create trigger fit_logs_owner before insert or update on public.fit_logs for each row execute function public.fit_set_owner();

alter table public.fit_profiles enable row level security;
alter table public.fit_logs enable row level security;

-- Adulto: todo lo suyo, mientras tenga Remate Fit activo.
drop policy if exists fit_profiles_self on public.fit_profiles;
create policy fit_profiles_self on public.fit_profiles for all to authenticated
  using (player_id in (select public.my_player_ids()) and public.fit_ok(player_id))
  with check (player_id in (select public.my_player_ids()) and public.fit_ok(player_id));
drop policy if exists fit_logs_self on public.fit_logs;
create policy fit_logs_self on public.fit_logs for all to authenticated
  using (player_id in (select public.my_player_ids()) and public.fit_ok(player_id))
  with check (player_id in (select public.my_player_ids()) and public.fit_ok(player_id) and day between current_date - 400 and current_date + 1);

-- Entrenador: lo suyo (su propio perfil de jugador) completo; lo de otro adulto, solo leer y solo si lo comparte.
drop policy if exists fit_profiles_coach_self on public.fit_profiles;
create policy fit_profiles_coach_self on public.fit_profiles for all to authenticated
  using (owner_id = auth.uid() and player_id in (select public.coach_self_players()) and public.fit_ok(player_id))
  with check (player_id in (select public.coach_self_players()) and public.fit_ok(player_id));
drop policy if exists fit_profiles_coach_shared on public.fit_profiles;
create policy fit_profiles_coach_shared on public.fit_profiles for select to authenticated
  using (owner_id = auth.uid() and public.is_coach() and share);
drop policy if exists fit_logs_coach_self on public.fit_logs;
create policy fit_logs_coach_self on public.fit_logs for all to authenticated
  using (owner_id = auth.uid() and player_id in (select public.coach_self_players()) and public.fit_ok(player_id))
  with check (player_id in (select public.coach_self_players()) and public.fit_ok(player_id) and day between current_date - 400 and current_date + 1);
drop policy if exists fit_logs_coach_shared on public.fit_logs;
create policy fit_logs_coach_shared on public.fit_logs for select to authenticated
  using (owner_id = auth.uid() and public.is_coach() and public.fit_shared(player_id));

revoke all on public.fit_profiles, public.fit_logs from anon;
grant select, insert, update, delete on public.fit_profiles, public.fit_logs to authenticated;
revoke all on function public.fit_ok(uuid), public.fit_shared(uuid), public.coach_self_players() from public, anon;
grant execute on function public.fit_ok(uuid), public.fit_shared(uuid), public.coach_self_players() to authenticated;

-- =====================================================================
-- REMATE · v3.13 — Hora de los partidos, horarios y categoría de los torneos.
-- Se puede correr las veces que quieras. No borra nada.
-- =====================================================================
alter table public.matches     add column if not exists start_time time;   -- hora de inicio
alter table public.matches     add column if not exists end_time time;     -- hora de término (aproximada)
-- Días y horas en que el torneo puede tener partidos: { "days": [2, 4], "times": ["20:00", "21:00"], "minutes": 60 }
-- (days: 0 domingo … 6 sábado).
alter table public.tournaments add column if not exists schedule jsonb not null default '{}'::jsonb;
-- Categoría por edad del torneo (la clave de una de las categorías de Ajustes; vacío = sin categoría).
alter table public.tournaments add column if not exists category text not null default '' check (char_length(category) <= 20);
do $$ begin
  alter table public.tournaments add constraint tournaments_schedule_ok check (jsonb_typeof(schedule) = 'object' and octet_length(schedule::text) <= 2000);
exception when duplicate_object then null; end $$;
-- Los partidos que ya traían «Hora: 20:00» en la nota (los del cuadro y los del lector de carteles) pasan a la hora nueva.
update public.matches
   set start_time = (substring(note from 'Hora: ?([0-2]?[0-9]:[0-5][0-9])'))::time
 where start_time is null and note ~ 'Hora: ?([01]?[0-9]|2[0-3]):[0-5][0-9]';

-- =====================================================================
-- REMATE · v3.23 — Lesiones y regreso por fases.
-- Son datos de salud de menores: solo los ve el entrenador y el propio jugador (los ayudantes no).
-- El jugador solo puede reportar una molestia suya; seguirla, pasarla de fase o darla de alta lo hace el entrenador.
-- Se puede correr las veces que quieras. No borra nada.
-- =====================================================================
create table if not exists public.injuries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,   -- siempre el entrenador
  player_id uuid not null references public.players(id) on delete cascade,
  zone text not null check (zone in ('tobillo', 'rodilla', 'hombro', 'espalda', 'dedos', 'muneca', 'cadera', 'otra')),
  kind text not null default 'molestia' check (kind in ('molestia', 'lesion')),
  pain smallint check (pain between 0 and 10),                       -- qué tanto duele (0 a 10)
  started_on date not null default current_date,
  status text not null default 'activa' check (status in ('activa', 'regreso', 'alta')),
  stage smallint not null default 0 check (stage between 0 and 5),   -- fase del regreso (1 a 5; 0 = aún no empieza)
  note text not null default '' check (char_length(note) <= 500),           -- lo que cuenta el jugador
  coach_note text not null default '' check (char_length(coach_note) <= 500),
  reported_by text not null default 'entrenador' check (reported_by in ('jugador', 'entrenador')),
  seen_at timestamptz,
  ended_on date,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists injuries_player_idx on public.injuries (player_id, started_on desc);
alter table public.injuries enable row level security;

drop policy if exists injuries_coach on public.injuries;
create policy injuries_coach on public.injuries for all to authenticated
  using (owner_id = auth.uid() and public.is_coach())
  with check (owner_id = auth.uid() and public.is_coach());
drop policy if exists injuries_player_read on public.injuries;
create policy injuries_player_read on public.injuries for select to authenticated
  using (player_id in (select public.my_player_ids()));
drop policy if exists injuries_player_insert on public.injuries;
create policy injuries_player_insert on public.injuries for insert to authenticated
  with check (player_id in (select public.my_player_ids()) and reported_by = 'jugador' and status = 'activa'
              and stage = 0 and coach_note = '' and seen_at is null and started_on between current_date - 30 and current_date);

create or replace function public.injuries_set_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    select owner_id into new.owner_id from public.players where id = new.player_id;
    if new.owner_id is null then raise exception 'Jugador no encontrado'; end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists injuries_set_owner on public.injuries;
create trigger injuries_set_owner before insert or update on public.injuries
  for each row execute function public.injuries_set_owner();
revoke all on public.injuries from anon;
grant select, insert, update, delete on public.injuries to authenticated;
