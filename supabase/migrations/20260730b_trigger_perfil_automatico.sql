-- Crea automáticamente la fila en profiles cuando se crea cualquier cuenta
-- nueva en auth.users. Sin esto, los alumnos (cuya cuenta se crea desde el
-- Google Form / Apps Script, sin pasar por /api/crear-coach) nunca tienen
-- fila en profiles, y el dashboard no puede resolver su rol → el menú
-- lateral queda vacío.
--
-- rol por defecto 'alumno' si no viene especificado en user_metadata
-- (crear-coach sí pasa user_metadata: { nombre, rol: 'coach' }, y además
-- hace su propio upsert después, así que no hay conflicto).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'rol', 'alumno')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: crea la fila de profiles para cuentas que ya existen y quedaron
-- sin ella (por ejemplo, alumnos creados antes de este trigger).
insert into public.profiles (id, nombre, email, rol)
select
  u.id,
  coalesce(a.nombre, split_part(u.email, '@', 1)),
  u.email,
  'alumno'
from auth.users u
left join public.alumnos a on lower(a.email) = lower(u.email)
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;
