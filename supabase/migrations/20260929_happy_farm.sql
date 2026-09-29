-- 單字開心農場：只新增個人農場資料，不變更原有學生、單字及成績表。
-- 請在「新專案」的 Supabase SQL Editor 執行一次。
BEGIN;

CREATE TABLE IF NOT EXISTS public.happy_farm_states (
  student_id varchar(255) PRIMARY KEY,
  farm jsonb NOT NULL CHECK (jsonb_typeof(farm) = 'object' AND octet_length(farm::text) < 65536),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS happy_farm_states_updated_at_idx ON public.happy_farm_states (updated_at);
COMMENT ON TABLE public.happy_farm_states IS '單字開心農場個人進度；student_id 對應既有學生登入識別碼。';

-- 現站學生以自訂 Cookie 登入、前端使用 anon key；權限模式與現有遊戲表一致。
-- 互訪操作由另一支 SQL 的函式限制；現有自訂 Cookie/anon key 架構不能驗證呼叫者身分，
-- 若未來需要防止直接呼叫 API 改寫農場，必須另行升級全站身分驗證。
ALTER TABLE public.happy_farm_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS happy_farm_states_app_access ON public.happy_farm_states;
CREATE POLICY happy_farm_states_app_access ON public.happy_farm_states
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.happy_farm_states TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
