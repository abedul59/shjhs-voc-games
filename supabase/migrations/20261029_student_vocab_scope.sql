alter table public.students
  add column if not exists allowed_vocab_scope jsonb not null
  default '{"mode":"ALL","scopes":[]}'::jsonb;

comment on column public.students.allowed_vocab_scope is
  '學生可玩的教材版本、冊別與單元。ALL 為全部；CUSTOM.scopes 使用 version|volume|unit，* 代表整層。';
