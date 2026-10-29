-- 既有正式專案請在 Supabase SQL Editor 執行一次。
-- 舊帳號預設上學時段仍為全部開放，不會意外鎖住學生。
alter table public.students
  add column if not exists school_hours_allowed_games text[] not null
  default array['ALL']::text[];

comment on column public.students.school_hours_allowed_games is
  '週一至週五 07:30-16:45（Asia/Taipei）套用的遊戲白名單；其他時間使用 allowed_games。';
