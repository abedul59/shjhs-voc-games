-- 單字小朋友下樓梯：後台可調整出題間隔及答錯暫停秒數。
ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS stairs_quiz_min_seconds integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS stairs_quiz_max_seconds integer NOT NULL DEFAULT 40,
  ADD COLUMN IF NOT EXISTS stairs_wrong_pause_seconds integer NOT NULL DEFAULT 3;
