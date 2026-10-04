-- 單字鍊金工房後台角色名單。部署新專案後在 Supabase SQL Editor 執行一次。
-- NULL 表示全部顯示；設定後分別保存主角與同伴的角色 ID 清單。
BEGIN;
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS alchemy_character_visibility jsonb DEFAULT NULL;
COMMENT ON COLUMN public.system_settings.alchemy_character_visibility IS
  '單字鍊金工房可選角色：{heroes:[id...],companions:[id...]}；NULL 表示全員可選';
NOTIFY pgrst, 'reload schema';
COMMIT;
