-- 舊專案 Supabase SQL Editor：單字鍊金工房一次性設定。
-- 只新增獨立存檔表與角色顯示欄位，不清除既有資料。
BEGIN;

CREATE TABLE IF NOT EXISTS public.alchemy_atelier_states (
  student_id varchar(255) PRIMARY KEY,
  workshop jsonb NOT NULL CHECK (jsonb_typeof(workshop) = 'object' AND octet_length(workshop::text) < 65536),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alchemy_atelier_states_updated_at_idx
  ON public.alchemy_atelier_states (updated_at);
ALTER TABLE public.alchemy_atelier_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alchemy_atelier_states_app_access ON public.alchemy_atelier_states;
CREATE POLICY alchemy_atelier_states_app_access ON public.alchemy_atelier_states
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.alchemy_atelier_states TO anon, authenticated;

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS alchemy_character_visibility jsonb DEFAULT NULL;
COMMENT ON COLUMN public.system_settings.alchemy_character_visibility IS
  '單字鍊金工房可選角色：{heroes:[id...],companions:[id...]}；NULL 表示全員可選';

NOTIFY pgrst, 'reload schema';
COMMIT;
