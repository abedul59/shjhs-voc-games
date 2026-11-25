-- 段考草稿刪除與分年級配分範本；在既有專案執行一次。
create or replace function public.delete_regular_exam_draft(p_id uuid, p_owner text, p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_code is distinct from to_char(now() at time zone 'Asia/Taipei', 'YYMMDD') then raise exception '驗證失敗'; end if;
  delete from public.regular_exam_drafts where id = p_id and owner_key = p_owner;
  return found;
end $$;

create table if not exists public.regular_exam_score_presets (
  id uuid primary key,
  owner_key text not null,
  grade text not null check (grade in ('7', '8', '9')),
  name text not null,
  spec jsonb not null,
  is_default boolean not null default false,
  updated_at timestamptz not null default now()
);
create index if not exists regular_exam_score_presets_owner_grade_idx
  on public.regular_exam_score_presets(owner_key, grade, updated_at desc);
create unique index if not exists regular_exam_score_presets_one_default_idx
  on public.regular_exam_score_presets(owner_key, grade) where is_default;
revoke all on public.regular_exam_score_presets from anon, authenticated;

create or replace function public.list_regular_exam_score_presets(p_owner text, p_grade text, p_code text)
returns table (id uuid, name text, spec jsonb, is_default boolean, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if p_code is distinct from to_char(now() at time zone 'Asia/Taipei', 'YYMMDD') then raise exception '驗證失敗'; end if;
  if p_grade not in ('7', '8', '9') then raise exception '年級無效'; end if;
  return query select s.id, s.name, s.spec, s.is_default, s.updated_at
    from public.regular_exam_score_presets s where s.owner_key = p_owner and s.grade = p_grade
    order by s.is_default desc, s.updated_at desc limit 100;
end $$;

create or replace function public.save_regular_exam_score_preset(p_id uuid, p_owner text, p_grade text, p_name text, p_spec jsonb, p_default boolean, p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare saved_id uuid;
begin
  if p_code is distinct from to_char(now() at time zone 'Asia/Taipei', 'YYMMDD') then raise exception '驗證失敗'; end if;
  if p_grade not in ('7', '8', '9') or length(trim(p_name)) = 0 or length(p_name) > 120 then raise exception '範本名稱或年級無效'; end if;
  if jsonb_typeof(p_spec) is distinct from 'object' then raise exception '配分資料無效'; end if;
  if p_default then update public.regular_exam_score_presets set is_default = false where owner_key = p_owner and grade = p_grade; end if;
  insert into public.regular_exam_score_presets (id, owner_key, grade, name, spec, is_default, updated_at)
  values (p_id, p_owner, p_grade, p_name, p_spec, coalesce(p_default, false), now())
  on conflict (id) do update set name = excluded.name, spec = excluded.spec, is_default = excluded.is_default, updated_at = now()
    where regular_exam_score_presets.owner_key = excluded.owner_key and regular_exam_score_presets.grade = excluded.grade
  returning id into saved_id;
  if saved_id is null then raise exception '無權覆寫此範本'; end if;
  return saved_id;
end $$;

create or replace function public.delete_regular_exam_score_preset(p_id uuid, p_owner text, p_grade text, p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_code is distinct from to_char(now() at time zone 'Asia/Taipei', 'YYMMDD') then raise exception '驗證失敗'; end if;
  delete from public.regular_exam_score_presets where id = p_id and owner_key = p_owner and grade = p_grade;
  return found;
end $$;

grant execute on function public.delete_regular_exam_draft(uuid,text,text) to anon, authenticated;
grant execute on function public.list_regular_exam_score_presets(text,text,text) to anon, authenticated;
grant execute on function public.save_regular_exam_score_preset(uuid,text,text,text,jsonb,boolean,text) to anon, authenticated;
grant execute on function public.delete_regular_exam_score_preset(uuid,text,text,text) to anon, authenticated;
