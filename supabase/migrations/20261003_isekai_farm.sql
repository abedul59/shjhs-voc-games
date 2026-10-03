-- 單字異世界悠閒農莊：獨立於開心農場的個人進度。
-- 在部署此遊戲的 Supabase 專案 SQL Editor 執行一次；現有表與資料不受影響。
BEGIN;

CREATE TABLE IF NOT EXISTS public.isekai_farm_states (
  student_id varchar(255) PRIMARY KEY,
  farm jsonb NOT NULL CHECK (jsonb_typeof(farm) = 'object' AND octet_length(farm::text) < 65536),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS isekai_farm_states_updated_at_idx ON public.isekai_farm_states (updated_at);
COMMENT ON TABLE public.isekai_farm_states IS '單字異世界悠閒農莊的獨立個人存檔。';

-- 沿用現有學生 Cookie 與 anon key 的權限模式。此模式無法靠 RLS 驗證學生身分。
ALTER TABLE public.isekai_farm_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS isekai_farm_states_app_access ON public.isekai_farm_states;
CREATE POLICY isekai_farm_states_app_access ON public.isekai_farm_states
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.isekai_farm_states TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
