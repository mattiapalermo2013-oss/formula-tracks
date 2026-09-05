DELETE FROM public.lap_times;

ALTER TABLE public.lap_times ADD COLUMN user_id uuid;
UPDATE public.lap_times SET user_id = gen_random_uuid() WHERE user_id IS NULL;
ALTER TABLE public.lap_times ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.lap_times ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
CREATE UNIQUE INDEX lap_times_slot_user_key ON public.lap_times (slot, user_id);

DROP POLICY IF EXISTS "Anyone can submit lap times" ON public.lap_times;

CREATE POLICY "Users can insert their own lap time"
ON public.lap_times FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND slot >= 1 AND slot <= 24
  AND time_ms > 1000 AND time_ms < 3600000
  AND length(player_name) BETWEEN 1 AND 24
);

CREATE POLICY "Users can update their own lap time"
ON public.lap_times FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND slot >= 1 AND slot <= 24
  AND time_ms > 1000 AND time_ms < 3600000
  AND length(player_name) BETWEEN 1 AND 24
);

CREATE TRIGGER lap_times_set_updated_at
BEFORE UPDATE ON public.lap_times
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE ON public.lap_times TO authenticated;
GRANT SELECT ON public.lap_times TO anon;
GRANT ALL ON public.lap_times TO service_role;