-- 新化區 16 里農地：每里至多 12 塊田，保留舊農場及互訪紀錄。
-- 須先執行 20260929_happy_farm.sql 與 20260929_happy_farm_visits.sql。
-- 16 × 12 = 192 塊田；互訪紀錄的田地索引範圍擴大至 0..191。
BEGIN;
ALTER TABLE public.happy_farm_visits
  DROP CONSTRAINT IF EXISTS happy_farm_visits_plot_index_check;
ALTER TABLE public.happy_farm_visits
  ADD CONSTRAINT happy_farm_visits_plot_index_check CHECK (plot_index BETWEEN 0 AND 191);
COMMIT;
