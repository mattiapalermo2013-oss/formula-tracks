CREATE TABLE public.lap_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot smallint NOT NULL,
  player_name text NOT NULL,
  time_ms integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.lap_times TO anon;
GRANT SELECT, INSERT ON public.lap_times TO authenticated;
GRANT ALL ON public.lap_times TO service_role;

ALTER TABLE public.lap_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view lap times" ON public.lap_times
FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anyone can submit lap times" ON public.lap_times
FOR INSERT TO anon, authenticated
WITH CHECK (
  slot BETWEEN 1 AND 24
  AND time_ms > 1000 AND time_ms < 3600000
  AND length(player_name) BETWEEN 1 AND 24
);

CREATE INDEX lap_times_slot_time_idx ON public.lap_times (slot, time_ms);