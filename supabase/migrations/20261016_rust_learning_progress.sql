-- 私人 Rust 工作台：跨裝置保存課程進度、程式碼與筆記。
BEGIN;
CREATE TABLE IF NOT EXISTS public.rust_learning_progress (
  owner_key text PRIMARY KEY,
  progress jsonb NOT NULL DEFAULT '{"lessons":{},"lastLesson":"hello-rust"}'::jsonb
    CHECK (jsonb_typeof(progress) = 'object' AND octet_length(progress::text) < 1048576),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.rust_learning_progress IS '司律雙層驗證後台中的私人 Rust 學習進度與筆記。';
ALTER TABLE public.rust_learning_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rust_learning_progress_app_access ON public.rust_learning_progress;
-- 現有後台登入採自訂 Cookie，瀏覽器使用 anon key；沿用既有遊戲資料表的權限模式。
CREATE POLICY rust_learning_progress_app_access ON public.rust_learning_progress
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.rust_learning_progress TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
