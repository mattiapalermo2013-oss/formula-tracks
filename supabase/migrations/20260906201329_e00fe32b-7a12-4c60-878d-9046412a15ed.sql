ALTER TABLE public.lap_times
  ADD COLUMN IF NOT EXISTS ghost jsonb,
  ADD COLUMN IF NOT EXISTS livery jsonb;