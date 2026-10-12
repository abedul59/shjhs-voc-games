-- Keep existing articles and grades. Each article can have multiple named reference links.
alter table public.speakno2_articles
  add column if not exists resource_links jsonb not null default '[]'::jsonb;

comment on column public.speakno2_articles.resource_links is
  'Optional named HTTP(S) reference links, e.g. [{"name":"示範影片","url":"https://..."}]';
