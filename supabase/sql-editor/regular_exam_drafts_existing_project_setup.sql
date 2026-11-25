-- 在既有 Supabase 專案的 SQL Editor 執行一次；可重複執行。
create table if not exists public.regular_exam_drafts (
  id uuid primary key,
  owner_key text not null,
  name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists regular_exam_drafts_owner_recent_idx
  on public.regular_exam_drafts (owner_key, updated_at desc);
revoke all on public.regular_exam_drafts from anon, authenticated;

create or replace function public.list_regular_exam_drafts(p_owner text, p_code text)
returns table (id uuid, name text, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if p_code is distinct from to_char(now() at time zone 'Asia/Taipei', 'YYMMDD') then
    raise exception '驗證失敗';
  end if;
  return query select d.id, d.name, d.updated_at from public.regular_exam_drafts d
    where d.owner_key = p_owner order by d.updated_at desc limit 100;
end $$;

create or replace function public.get_regular_exam_draft(p_id uuid, p_owner text, p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  if p_code is distinct from to_char(now() at time zone 'Asia/Taipei', 'YYMMDD') then
    raise exception '驗證失敗';
  end if;
  select jsonb_build_object('name', name, 'payload', payload, 'updated_at', updated_at)
    into result from public.regular_exam_drafts where id = p_id and owner_key = p_owner;
  return result;
end $$;

create or replace function public.save_regular_exam_draft(p_id uuid, p_owner text, p_name text, p_payload jsonb, p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare saved_id uuid;
begin
  if p_code is distinct from to_char(now() at time zone 'Asia/Taipei', 'YYMMDD') then
    raise exception '驗證失敗';
  end if;
  if length(trim(p_name)) = 0 or length(p_name) > 120 then raise exception '草稿名稱無效'; end if;
  insert into public.regular_exam_drafts (id, owner_key, name, payload, updated_at)
  values (p_id, p_owner, p_name, p_payload, now())
  on conflict (id) do update set name = excluded.name, payload = excluded.payload, updated_at = now()
  where regular_exam_drafts.owner_key = excluded.owner_key
  returning id into saved_id;
  if saved_id is null then raise exception '無權覆寫此草稿'; end if;
  return saved_id;
end $$;

grant execute on function public.list_regular_exam_drafts(text,text) to anon, authenticated;
grant execute on function public.get_regular_exam_draft(uuid,text,text) to anon, authenticated;
grant execute on function public.save_regular_exam_draft(uuid,text,text,jsonb,text) to anon, authenticated;
