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
