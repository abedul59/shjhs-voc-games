-- 新化五寶與鄰區：保留既有農場、成績、作物與互訪紀錄。
-- 請先執行三支既有開心農場 SQL（農場、互訪、新化區里地圖）。
BEGIN;

-- 6 個行政區合計 108 里，每里最多 12 塊田；農場 JSON 容量同步擴大。
DO $$
DECLARE c record;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.happy_farm_states'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%octet_length%'
  LOOP
    EXECUTE format('ALTER TABLE public.happy_farm_states DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE public.happy_farm_states ADD CONSTRAINT happy_farm_states_farm_size_check
  CHECK (jsonb_typeof(farm) = 'object' AND octet_length(farm::text) < 1048576);

ALTER TABLE public.happy_farm_visits
  DROP CONSTRAINT IF EXISTS happy_farm_visits_plot_index_check;
ALTER TABLE public.happy_farm_visits
  ADD CONSTRAINT happy_farm_visits_plot_index_check CHECK (plot_index BETWEEN 0 AND 1295);

-- 更新互訪函式可辨識的作物，並沿用其原有同班與每日摘取限制。
CREATE OR REPLACE FUNCTION public.happy_farm_visit(
  p_actor_id text, p_owner_id text, p_action text, p_plot_index integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor_class text;
  v_owner_class text;
  v_actor_farm jsonb;
  v_owner_farm jsonb;
  v_plot jsonb;
  v_crop text;
  v_actor_revision integer;
  v_owner_revision integer;
  v_now bigint;
  v_ready bigint;
  v_planted bigint;
  v_stolen integer;
  v_yield integer;
  v_daily integer;
  v_today timestamptz;
BEGIN
  IF p_actor_id IS NULL OR p_owner_id IS NULL OR p_actor_id = p_owner_id
     OR p_action IS NULL OR p_action NOT IN ('water', 'weed', 'pest', 'steal') THEN
    RAISE EXCEPTION '無法執行互訪操作';
  END IF;
  SELECT class_name INTO v_actor_class FROM public.students WHERE student_id = p_actor_id;
  SELECT class_name INTO v_owner_class FROM public.students WHERE student_id = p_owner_id;
  IF v_actor_class IS NULL OR v_owner_class IS NULL OR v_actor_class <> v_owner_class THEN
    RAISE EXCEPTION '目前只開放同班學生互訪';
  END IF;

  -- 固定鎖定順序，讓同時互訪不會互相覆蓋農場進度。
  PERFORM 1 FROM public.happy_farm_states
    WHERE student_id IN (p_actor_id, p_owner_id) ORDER BY student_id FOR UPDATE;
  SELECT farm, revision INTO v_actor_farm, v_actor_revision
    FROM public.happy_farm_states WHERE student_id = p_actor_id;
  SELECT farm, revision INTO v_owner_farm, v_owner_revision
    FROM public.happy_farm_states WHERE student_id = p_owner_id;
  IF v_actor_farm IS NULL OR v_owner_farm IS NULL THEN RAISE EXCEPTION '雙方都須先開設農場'; END IF;
  IF p_plot_index IS NULL OR p_plot_index < 0
     OR jsonb_typeof(v_owner_farm->'plots') <> 'array'
     OR p_plot_index >= jsonb_array_length(v_owner_farm->'plots') THEN
    RAISE EXCEPTION '田地不存在';
  END IF;
  v_plot := v_owner_farm->'plots'->p_plot_index;
  IF v_plot IS NULL OR v_plot = 'null'::jsonb THEN RAISE EXCEPTION '這塊田尚未播種'; END IF;
  IF jsonb_typeof(v_plot) <> 'object'
     OR jsonb_typeof(v_plot->'readyAt') <> 'number'
     OR jsonb_typeof(v_plot->'plantedAt') <> 'number'
     OR jsonb_typeof(v_actor_farm->'produce') <> 'object' THEN
    RAISE EXCEPTION '農場資料不完整';
  END IF;
  v_crop := v_plot->>'crop';
  IF v_crop NOT IN ('carrot', 'corn', 'strawberry', 'pumpkin', 'pineapple', 'bamboo', 'sweet_potato', 'olive', 'sesame', 'rice') THEN RAISE EXCEPTION '作物資料無效'; END IF;
  v_now := floor(extract(epoch FROM clock_timestamp()) * 1000)::bigint;
  v_ready := (v_plot->>'readyAt')::bigint;
  v_planted := (v_plot->>'plantedAt')::bigint;
  v_today := ((now() AT TIME ZONE 'Asia/Taipei')::date)::timestamp AT TIME ZONE 'Asia/Taipei';
  SELECT count(*) INTO v_daily FROM public.happy_farm_visits
    WHERE actor_id = p_actor_id AND action = 'steal' AND created_at >= v_today;

  IF p_action = 'water' THEN
    IF v_now >= v_ready OR coalesce((v_plot->>'watered')::boolean, false) THEN RAISE EXCEPTION '作物已成熟或已澆水'; END IF;
    v_owner_farm := jsonb_set(v_owner_farm, ARRAY['plots', p_plot_index::text, 'watered'], 'true'::jsonb);
    v_owner_farm := jsonb_set(v_owner_farm, ARRAY['plots', p_plot_index::text, 'readyAt'],
      to_jsonb(greatest(v_now + 15000, floor(v_ready - (v_ready - v_planted) * 0.15)::bigint)));
  ELSIF p_action = 'weed' THEN
    IF v_now < (v_plot->>'weedAt')::bigint OR coalesce((v_plot->>'weedRemoved')::boolean, false) THEN RAISE EXCEPTION '目前沒有雜草'; END IF;
    v_owner_farm := jsonb_set(v_owner_farm, ARRAY['plots', p_plot_index::text, 'weedRemoved'], 'true'::jsonb);
  ELSIF p_action = 'pest' THEN
    IF v_now < (v_plot->>'pestAt')::bigint OR coalesce((v_plot->>'pestRemoved')::boolean, false) THEN RAISE EXCEPTION '目前沒有害蟲'; END IF;
    v_owner_farm := jsonb_set(v_owner_farm, ARRAY['plots', p_plot_index::text, 'pestRemoved'], 'true'::jsonb);
  ELSE
    IF v_now < v_ready THEN RAISE EXCEPTION '作物還沒成熟'; END IF;
    v_stolen := coalesce((v_plot->>'stolen')::integer, 0);
    IF v_stolen >= 1 THEN RAISE EXCEPTION '這塊田已被摘取過'; END IF;
    IF v_daily >= 3 THEN RAISE EXCEPTION '今日已達三次摘取上限'; END IF;
    v_yield := greatest(1,
      CASE v_crop WHEN 'carrot' THEN 2 WHEN 'pumpkin' THEN 4 ELSE 3 END
      + CASE WHEN coalesce((v_plot->>'watered')::boolean, false) THEN 1 ELSE 0 END
      + CASE WHEN coalesce((v_plot->>'fertilized')::boolean, false) THEN 1 ELSE 0 END
      - CASE WHEN v_now >= (v_plot->>'weedAt')::bigint AND NOT coalesce((v_plot->>'weedRemoved')::boolean, false) THEN 1 ELSE 0 END
      - CASE WHEN v_now >= (v_plot->>'pestAt')::bigint AND NOT coalesce((v_plot->>'pestRemoved')::boolean, false) THEN 1 ELSE 0 END
      - v_stolen);
    IF v_yield <= 1 THEN RAISE EXCEPTION '必須替主人保留至少一份收成'; END IF;
    v_owner_farm := jsonb_set(v_owner_farm, ARRAY['plots', p_plot_index::text, 'stolen'], to_jsonb(v_stolen + 1));
    v_actor_farm := jsonb_set(v_actor_farm, ARRAY['produce', v_crop],
      to_jsonb(coalesce((v_actor_farm->'produce'->>v_crop)::integer, 0) + 1));
  END IF;

  UPDATE public.happy_farm_states
    SET farm = v_owner_farm, revision = revision + 1, updated_at = now()
    WHERE student_id = p_owner_id RETURNING revision INTO v_owner_revision;
  IF p_action = 'steal' THEN
    UPDATE public.happy_farm_states
      SET farm = v_actor_farm, revision = revision + 1, updated_at = now()
      WHERE student_id = p_actor_id RETURNING revision INTO v_actor_revision;
  END IF;
  INSERT INTO public.happy_farm_visits(actor_id, owner_id, action, plot_index, crop)
    VALUES (p_actor_id, p_owner_id, p_action, p_plot_index, v_crop);
  RETURN jsonb_build_object(
    'actor_farm', v_actor_farm, 'actor_revision', v_actor_revision,
    'owner_farm', v_owner_farm, 'owner_revision', v_owner_revision,
    'daily_steals', coalesce(v_daily, 0) + CASE WHEN p_action = 'steal' THEN 1 ELSE 0 END
  );
END $$;

REVOKE ALL ON FUNCTION public.happy_farm_visit(text, text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.happy_farm_visit(text, text, text, integer) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
