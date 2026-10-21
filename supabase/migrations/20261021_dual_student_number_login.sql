-- 第一階段：七年級正式學號與既有班級座號雙重登入。
-- 既有 students.student_id 仍是所有進度資料使用的穩定遊戲帳號，不可覆寫。

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS school_student_id varchar(32);

CREATE UNIQUE INDEX IF NOT EXISTS students_school_student_id_unique_idx
  ON public.students (school_student_id)
  WHERE school_student_id IS NOT NULL;

COMMENT ON COLUMN public.students.school_student_id IS
  '校方正式學號；僅作為額外登入識別碼。student_id 繼續作為既有遊戲與進度關聯鍵。';

ALTER TABLE public.system_settings
  ADD COLUMN IF NOT EXISTS student_number_login_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.system_settings.student_number_login_enabled IS
  '是否顯示正式學號登入。設為 false 即立即回復班級＋座號單軌制，不刪除正式學號。';

ALTER TABLE public.login_logs
  ADD COLUMN IF NOT EXISTS login_method varchar(32);

COMMENT ON COLUMN public.login_logs.login_method IS
  '登入方式：class_seat、school_student_id 或 anonymous。';
