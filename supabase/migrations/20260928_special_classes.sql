-- 在「新專案」Supabase SQL Editor 執行一次。
-- 特殊班級是額外編組；學生原班、座號、帳號及既有紀錄均不變。
BEGIN;

CREATE TABLE IF NOT EXISTS public.special_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grade smallint NOT NULL CHECK (grade IN (7, 8)),
  name varchar(60) NOT NULL CHECK (length(btrim(name)) > 0),
  created_by text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT special_classes_grade_name_key UNIQUE (grade, name)
);
ALTER TABLE public.special_classes ADD COLUMN IF NOT EXISTS created_by text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.special_class_members (
  special_class_id uuid NOT NULL REFERENCES public.special_classes(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (special_class_id, student_id)
);

CREATE INDEX IF NOT EXISTS special_class_members_student_id_idx
  ON public.special_class_members (student_id);

COMMENT ON TABLE public.special_classes IS '七、八年級學習扶助及自訂特殊班級；不取代學生原班。';
COMMENT ON TABLE public.special_class_members IS '特殊班級與既有學生帳號的額外編組；刪班只移除編組。';

-- 現有後台使用 teacher_auth Cookie 與 Supabase anon key；權限模式比照既有 students 表。
ALTER TABLE public.special_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.special_class_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS special_classes_app_access ON public.special_classes;
CREATE POLICY special_classes_app_access ON public.special_classes
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS special_class_members_app_access ON public.special_class_members;
CREATE POLICY special_class_members_app_access ON public.special_class_members
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.special_classes TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.special_class_members TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
