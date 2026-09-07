create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

revoke select on public.lap_times from anon, authenticated;

create or replace view public.leaderboard
as
select
  id,
  slot,
  player_name,
  time_ms,
  created_at,
  livery,
  ghost,
  (ghost is not null) as has_ghost
from public.lap_times;

grant select on public.leaderboard to anon, authenticated;

create or replace function public.protect_lap_time_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Cannot change the owner of a lap time';
  end if;
  if new.slot is distinct from old.slot then
    raise exception 'Cannot move a lap time to another track';
  end if;
  if new.time_ms >= old.time_ms then
    raise exception 'Only a faster lap time can overwrite a record';
  end if;
  return new;
end;
$$;

drop trigger if exists lap_times_protect_update on public.lap_times;
create trigger lap_times_protect_update
before update on public.lap_times
for each row execute function public.protect_lap_time_update();