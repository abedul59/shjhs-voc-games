create table if not exists public.teacher_admin_feature_settings (
  id smallint primary key default 1 check (id = 1),
  allowed_features text[] not null default array[
    'verb-mastery',
    'records',
    'stats',
    'leaderboard',
    'logs',
    'student-logs',
    'live-activity',
    'focus-monitor',
    'vocab-exam-generator',
    'regular-exam-generator',
    'grammar-stats',
    'exam-stats',
    'exam-stats2'
  ]::text[],
  updated_at timestamptz not null default now()
);

insert into public.teacher_admin_feature_settings (id)
values (1)
on conflict (id) do nothing;

grant select, insert, update on table public.teacher_admin_feature_settings to anon, authenticated;
