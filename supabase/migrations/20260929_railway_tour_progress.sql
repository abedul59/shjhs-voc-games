-- 單字鐵路旅遊高手：跨裝置保存學生的車站章與各區最後所在車站。
-- 在新專案的 Supabase SQL Editor 執行一次，不改動原有資料表。
BEGIN;

CREATE TABLE IF NOT EXISTS public.railway_tour_progress (
  student_id varchar(255) PRIMARY KEY,
  visited_stations text[] NOT NULL DEFAULT '{}' CHECK (cardinality(visited_stations) <= 300),
  last_stations jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(last_stations) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.railway_tour_progress IS '單字鐵路旅遊高手的學生車站圖鑑進度。';
ALTER TABLE public.railway_tour_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS railway_tour_progress_app_access ON public.railway_tour_progress;
-- 現有學生登入為自訂 Cookie，瀏覽器用 anon key；權限模式與既有遊戲表一致。
CREATE POLICY railway_tour_progress_app_access ON public.railway_tour_progress
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.railway_tour_progress TO anon, authenticated;

-- 單次到站以資料庫原子方式合併車站章，避免不同裝置覆蓋彼此進度。
CREATE OR REPLACE FUNCTION public.railway_stamp_station(
  p_student_id varchar, p_station_ids text[], p_station_id text, p_region_id text
) RETURNS TABLE(visited_stations text[], last_stations jsonb)
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.railway_tour_progress AS progress (student_id, visited_stations, last_stations)
  VALUES (p_student_id, p_station_ids, jsonb_build_object(p_region_id, p_station_id))
  ON CONFLICT (student_id) DO UPDATE
    SET visited_stations = ARRAY(
      SELECT DISTINCT station_id
      FROM unnest(progress.visited_stations || EXCLUDED.visited_stations) AS station_id
    ),
    last_stations = progress.last_stations || EXCLUDED.last_stations,
    updated_at = now();

  RETURN QUERY
    SELECT progress.visited_stations, progress.last_stations
    FROM public.railway_tour_progress AS progress
    WHERE progress.student_id = p_student_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.railway_stamp_station(varchar, text[], text, text) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
