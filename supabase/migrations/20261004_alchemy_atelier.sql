-- 單字鍊金工房獨立存檔；部署至新專案的 Supabase SQL Editor 執行一次。
BEGIN;
CREATE TABLE IF NOT EXISTS public.alchemy_atelier_states (
  student_id varchar(255) PRIMARY KEY,
  workshop jsonb NOT NULL CHECK (jsonb_typeof(workshop) = 'object' AND octet_length(workshop::text) < 65536),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alchemy_atelier_states_updated_at_idx ON public.alchemy_atelier_states (updated_at);
ALTER TABLE public.alchemy_atelier_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS alchemy_atelier_states_app_access ON public.alchemy_atelier_states;
CREATE POLICY alchemy_atelier_states_app_access ON public.alchemy_atelier_states
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.alchemy_atelier_states TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
