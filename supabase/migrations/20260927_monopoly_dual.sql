-- 單字大富翁（雙人）：在目前新站使用的 Supabase SQL Editor 執行一次。
-- 只追加雙人棋盤狀態；既有房間、單人遊戲、資料和 RLS 政策保持原狀。
BEGIN;
ALTER TABLE public.game_rooms
  ADD COLUMN IF NOT EXISTS monopoly_state jsonb;
COMMENT ON COLUMN public.game_rooms.monopoly_state IS
  '單字大富翁雙人版的共用棋盤、版本號、回合與雙方學習紀錄；其他遊戲留空。';
NOTIFY pgrst, 'reload schema';
COMMIT;
