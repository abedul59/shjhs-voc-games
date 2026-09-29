-- 日本 JR 六家客運公司共有四千多個可收集車站章。
-- 在已有 railway_tour_progress 的新專案執行一次；保留原有紀錄與函式。
BEGIN;
ALTER TABLE public.railway_tour_progress
  DROP CONSTRAINT IF EXISTS railway_tour_progress_visited_stations_check;
ALTER TABLE public.railway_tour_progress
  ADD CONSTRAINT railway_tour_progress_visited_stations_check
  CHECK (cardinality(visited_stations) <= 6000);
COMMIT;
