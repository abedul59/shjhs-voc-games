-- 新專案 Supabase SQL Editor 執行一次。導師可按原班指定開心農場單元白／黑名單。
BEGIN;

CREATE TABLE IF NOT EXISTS public.happy_farm_lesson_access (
  class_name text PRIMARY KEY,
  mode text NOT NULL DEFAULT 'all' CHECK (mode IN ('all', 'allow', 'deny')),
  units jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(units) = 'array'),
  updated_by text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.happy_farm_lesson_access IS '開心農場各原班可玩單元；all 全開、allow 白名單、deny 黑名單。';

-- 現站導師登入仍為自訂 Cookie，前台共用 anon key。這與既有後台權限模式一致，
-- 並非防止直接呼叫 API 的安全邊界；要做到不可繞過須全站升級為可信伺服端身分驗證。
ALTER TABLE public.happy_farm_lesson_access ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS happy_farm_lesson_access_app ON public.happy_farm_lesson_access;
CREATE POLICY happy_farm_lesson_access_app ON public.happy_farm_lesson_access
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.happy_farm_lesson_access TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
