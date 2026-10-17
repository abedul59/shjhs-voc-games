-- 私人 Nuxt/Vue 工作台：跨裝置保存課程進度、程式碼與筆記。
BEGIN;
CREATE TABLE IF NOT EXISTS public.nuxt_learning_progress (
  owner_key text PRIMARY KEY,
  progress jsonb NOT NULL DEFAULT '{"lessons":{},"lastLesson":"js-first-step"}'::jsonb
    CHECK (jsonb_typeof(progress) = 'object' AND octet_length(progress::text) < 1048576),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.nuxt_learning_progress IS '司律雙層驗證後台中的私人 Nuxt/Vue 學習進度與筆記。';
ALTER TABLE public.nuxt_learning_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS nuxt_learning_progress_app_access ON public.nuxt_learning_progress;
CREATE POLICY nuxt_learning_progress_app_access ON public.nuxt_learning_progress FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.nuxt_learning_progress TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
