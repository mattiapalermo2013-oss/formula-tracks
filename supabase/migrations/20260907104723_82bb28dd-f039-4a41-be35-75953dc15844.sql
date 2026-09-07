drop view if exists public.leaderboard;

revoke select on public.lap_times from anon, authenticated;

grant select (id, slot, player_name, time_ms, created_at, ghost, livery) on public.lap_times to anon, authenticated;