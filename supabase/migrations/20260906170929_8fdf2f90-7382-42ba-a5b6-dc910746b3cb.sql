DROP POLICY IF EXISTS "Users can insert their own lap time" ON public.lap_times;
DROP POLICY IF EXISTS "Users can update their own lap time" ON public.lap_times;

GRANT SELECT, INSERT, UPDATE ON public.lap_times TO anon;
GRANT SELECT, INSERT, UPDATE ON public.lap_times TO authenticated;

CREATE POLICY "Anyone can insert a lap time"
ON public.lap_times
FOR INSERT
TO anon, authenticated
WITH CHECK (
  slot >= 1 AND slot <= 24
  AND time_ms > 1000 AND time_ms < 3600000
  AND length(player_name) >= 1 AND length(player_name) <= 24
);

CREATE POLICY "Anyone can update a lap time"
ON public.lap_times
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (
  slot >= 1 AND slot <= 24
  AND time_ms > 1000 AND time_ms < 3600000
  AND length(player_name) >= 1 AND length(player_name) <= 24
);