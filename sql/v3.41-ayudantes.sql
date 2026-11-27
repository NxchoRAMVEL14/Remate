-- =====================================================================
-- REMATE · v3.41: ayudantes con función (dar el entreno, suplente, avisos)
-- Cómo usarlo: Supabase → SQL Editor → New query → pega TODO esto → Run.
-- Es seguro correrlo más de una vez. No borra datos ni cambia lo que ya hacen tus ayudantes y capitanes.
-- El entrenador elige la función de cada asistente en Ajustes → Equipo de apoyo; queda guardada en
-- groups.settings.staff_roles y aquí la base de datos la revisa antes de dejarle cambiar algo.
-- =====================================================================

-- ¿El asistente que está usando la app tiene este permiso en este grupo? ('dar', 'editar' o 'avisos')
create or replace function public.staff_can(p_group uuid, p_perm text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff s join public.groups g on g.id = s.group_id
     where s.user_id = auth.uid() and s.active and s.group_id = p_group
       and coalesce((g.settings -> 'staff_roles' -> (s.id::text) -> 'perms' ->> p_perm)::boolean, false));
$$;
revoke all on function public.staff_can(uuid, text) from public, anon;
grant execute on function public.staff_can(uuid, text) to authenticated;

-- Entrenamientos: el asistente con «Crear y cambiar entrenos» crea; con «Dar el entreno» o «Crear y cambiar» actualiza.
drop policy if exists sessions_staff_insert on public.sessions;
create policy sessions_staff_insert on public.sessions for insert to authenticated
  with check (group_id in (select public.my_staff_group_ids()) and public.staff_can(group_id, 'editar'));
drop policy if exists sessions_staff_update on public.sessions;
create policy sessions_staff_update on public.sessions for update to authenticated
  using (group_id in (select public.my_staff_group_ids()) and (public.staff_can(group_id, 'dar') or public.staff_can(group_id, 'editar')))
  with check (group_id in (select public.my_staff_group_ids()) and (public.staff_can(group_id, 'dar') or public.staff_can(group_id, 'editar')));

-- Lo que crea un asistente queda a nombre del entrenador (dueño del grupo), para que el entrenador lo vea y lo controle.
create or replace function public.sessions_staff_owner() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  select owner_id into o from public.groups where id = new.group_id;
  if o is not null and o <> auth.uid() then new.owner_id := o; end if;
  return new;
end $$;
drop trigger if exists sessions_staff_owner on public.sessions;
create trigger sessions_staff_owner before insert on public.sessions for each row execute function public.sessions_staff_owner();

-- Candado: quien no es el entrenador ni tiene «Crear y cambiar entrenos» solo puede cambiar el estado, las notas
-- y las calificaciones de cada ejercicio; no el plan (ejercicios y minutos), la fecha, la hora ni el nombre.
create or replace function public.sessions_staff_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select owner_id into owner from public.groups where id = old.group_id;
  if owner = auth.uid() or auth.uid() is null then return new; end if;
  new.owner_id := old.owner_id; new.group_id := old.group_id;
  if public.staff_can(old.group_id, 'editar') then return new; end if;
  if new.session_date is distinct from old.session_date or new.start_time is distinct from old.start_time
     or new.minutes is distinct from old.minutes or new.title is distinct from old.title or new.focus is distinct from old.focus
     or (select coalesce(jsonb_agg(jsonb_build_array(e -> 'ex', e -> 'min', e -> 'g')), '[]'::jsonb) from jsonb_array_elements(new.plan) e)
        is distinct from
        (select coalesce(jsonb_agg(jsonb_build_array(e -> 'ex', e -> 'min', e -> 'g')), '[]'::jsonb) from jsonb_array_elements(old.plan) e)
  then
    raise exception 'Tu función no permite cambiar el plan, la fecha ni la hora de este entreno' using errcode = '42501';
  end if;
  return new;
end $$;
drop trigger if exists sessions_staff_guard on public.sessions;
create trigger sessions_staff_guard before update on public.sessions for each row execute function public.sessions_staff_guard();

-- Avisos: el asistente con «Mandar avisos» los publica a nombre del entrenador.
drop policy if exists notices_staff_insert on public.notices;
create policy notices_staff_insert on public.notices for insert to authenticated
  with check (group_id in (select public.my_staff_group_ids()) and public.staff_can(group_id, 'avisos'));
create or replace function public.notices_staff_owner() returns trigger
language plpgsql security definer set search_path = public as $$
declare o uuid;
begin
  select owner_id into o from public.groups where id = new.group_id;
  if o is not null and o <> auth.uid() then new.owner_id := o; end if;
  return new;
end $$;
drop trigger if exists notices_staff_owner on public.notices;
create trigger notices_staff_owner before insert on public.notices for each row execute function public.notices_staff_owner();

-- Ejercicios propios del entrenador: el asistente los puede ver (para que el plan del entreno salga completo).
drop policy if exists custom_ex_staff_read on public.custom_exercises;
create policy custom_ex_staff_read on public.custom_exercises for select to authenticated
  using (owner_id in (select owner_id from public.groups where id in (select public.my_staff_group_ids())));
