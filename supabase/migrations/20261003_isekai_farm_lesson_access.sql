-- 新專案 Supabase SQL Editor 執行一次。導師可獨立設定異世界農莊的可玩單元。
BEGIN;
CREATE TABLE IF NOT EXISTS public.isekai_farm_lesson_access (
  class_name text PRIMARY KEY,
  mode text NOT NULL DEFAULT 'all' CHECK (mode IN ('all','allow','deny')),
  units jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(units)='array'),
  updated_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.isekai_farm_lesson_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isekai_farm_lesson_access_app ON public.isekai_farm_lesson_access;
CREATE POLICY isekai_farm_lesson_access_app ON public.isekai_farm_lesson_access
  FOR ALL TO anon,authenticated USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.isekai_farm_lesson_access TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
