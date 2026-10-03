-- 異世界農莊：戰勝後可耕作的永久邊境地，以及六小時租地。
-- 在新專案已執行 20261003_isekai_frontier_battles.sql 的資料庫執行一次。
BEGIN;
ALTER TABLE public.isekai_frontier_claims
  ADD COLUMN IF NOT EXISTS lease_holder_id varchar(255),
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;
CREATE INDEX IF NOT EXISTS isekai_frontier_lease_idx ON public.isekai_frontier_claims(lease_holder_id);

CREATE OR REPLACE FUNCTION public.isekai_frontier_battle(
  p_actor_id text, p_area_id text, p_plot_index integer, p_command text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_class text;
  v_owner text;
  v_lease text;
  v_lease_end timestamptz;
  v_home_area text;
  v_farm jsonb;
  v_defender jsonb;
  v_battle public.isekai_frontier_battles%ROWTYPE;
  v_actor_power integer;
  v_defender_power integer;
  v_actor_hp integer;
  v_defender_hp integer;
  v_damage integer;
  v_reply integer;
  v_text text;
  v_status text := 'active';
  v_staff integer;
BEGIN
  IF p_actor_id IS NULL OR length(p_actor_id) > 255 OR p_area_id IS NULL OR p_command IS NULL OR p_area_id NOT IN
    ('fittoa','asura','riverland','foothills','ranoa','basherant','northern-ridge','east-wood','kingdragon','shirone','sanakia','kikka')
    OR p_plot_index IS NULL OR p_plot_index NOT BETWEEN 0 AND 5
    OR p_command NOT IN ('start','attack','magic','guard','item') THEN
    RAISE EXCEPTION '戰鬥參數無效';
  END IF;
  SELECT class_name INTO v_class FROM public.students WHERE student_id = p_actor_id;
  IF v_class IS NULL THEN RAISE EXCEPTION '只有已登入班級的學生能參加邊境戰'; END IF;
  SELECT farm INTO v_farm FROM public.isekai_farm_states WHERE student_id = p_actor_id;
  IF v_farm IS NULL OR v_farm->'profile' IS NULL THEN
    RAISE EXCEPTION '請先建立角色';
  END IF;
  v_home_area := coalesce(v_farm->'profile'->>'startAreaId','fittoa');
  IF p_area_id <> v_home_area AND (SELECT count(*) FROM public.isekai_frontier_claims
      WHERE class_name=v_class AND area_id=v_home_area AND owner_id=p_actor_id) < 6 THEN
    RAISE EXCEPTION '請先佔領起始領地的六塊邊境田地，才能向外拓展';
  END IF;
  INSERT INTO public.isekai_frontier_claims(class_name,area_id,plot_index)
    VALUES(v_class,p_area_id,p_plot_index) ON CONFLICT DO NOTHING;
  SELECT owner_id,lease_holder_id,lease_expires_at INTO v_owner,v_lease,v_lease_end FROM public.isekai_frontier_claims
    WHERE class_name = v_class AND area_id = p_area_id AND plot_index = p_plot_index FOR UPDATE;
  IF v_lease IS NOT NULL AND v_lease_end > now() THEN RAISE EXCEPTION '此田地租約尚未結束，不能發動戰鬥'; END IF;
  IF v_owner = p_actor_id THEN RAISE EXCEPTION '你已佔領這塊邊境田地'; END IF;
  IF v_owner IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.students WHERE student_id = v_owner AND class_name = v_class) THEN
      UPDATE public.isekai_frontier_claims SET owner_id=NULL,captured_at=now()
        WHERE class_name=v_class AND area_id=p_area_id AND plot_index=p_plot_index;
      v_owner := NULL;
    ELSE
      SELECT farm INTO v_defender FROM public.isekai_farm_states WHERE student_id = v_owner;
      IF v_defender IS NULL THEN
        UPDATE public.isekai_frontier_claims SET owner_id=NULL,captured_at=now()
          WHERE class_name=v_class AND area_id=p_area_id AND plot_index=p_plot_index;
        v_owner := NULL;
      END IF;
    END IF;
  END IF;

  IF p_command = 'start' THEN
    SELECT coalesce(sum(CASE item->>'id'
      WHEN 'ela' THEN 8 WHEN 'ron' THEN 17 WHEN 'lyra' THEN 9 WHEN 'finn' THEN 15 WHEN 'borin' THEN 11
      WHEN 'mira' THEN 15 WHEN 'sora' THEN 13 WHEN 'luka' THEN 16 WHEN 'noa' THEN 10 WHEN 'sera' THEN 14
      WHEN 'hana' THEN 8 WHEN 'nori' THEN 9 WHEN 'grom' THEN 18 WHEN 'kira' THEN 12 WHEN 'vel' THEN 12 ELSE 0 END),0)
      INTO v_staff FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_farm->'staff')='array' THEN v_farm->'staff' ELSE '[]'::jsonb END) AS item;
    v_actor_power := 10 + least(v_staff,120) / 3
      + CASE v_farm->'profile'->>'raceId' WHEN 'beast' THEN 5 WHEN 'demon' THEN 5 WHEN 'dwarf' THEN 3 ELSE 2 END
      + CASE v_farm->'profile'->>'professionId' WHEN 'knight' THEN 8 WHEN 'mage' THEN 6 WHEN 'ranger' THEN 5 ELSE 2 END;
    SELECT count(*) INTO v_staff FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_farm->'staff')='array' THEN v_farm->'staff' ELSE '[]'::jsonb END) AS item WHERE item->>'focus'='guard';
    v_actor_power := v_actor_power + least(v_staff,8) * 3;
    SELECT count(*) INTO v_staff FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_farm->'spouses')='array' THEN v_farm->'spouses' ELSE '[]'::jsonb END) AS item WHERE item->>'focus'='guard';
    v_actor_power := v_actor_power + least(v_staff,3) * 5;
    SELECT count(*) INTO v_staff FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_farm->'children')='array' THEN v_farm->'children' ELSE '[]'::jsonb END) AS item
      WHERE item->>'focus'='guard' AND now() >= to_timestamp(((item->>'bornAt')::bigint + 18 * 3 * 3600000)::double precision / 1000);
    v_actor_power := v_actor_power + least(v_staff,5) * 3;
    IF v_farm::text LIKE '%"facility": "barracks"%' THEN v_actor_power := v_actor_power + 10; END IF;
    IF v_farm::text LIKE '%"facility": "smithy"%' THEN v_actor_power := v_actor_power + 6; END IF;
    v_defender_power := 12;
    IF v_defender IS NOT NULL THEN
      SELECT coalesce(sum(CASE item->>'id'
        WHEN 'ela' THEN 8 WHEN 'ron' THEN 17 WHEN 'lyra' THEN 9 WHEN 'finn' THEN 15 WHEN 'borin' THEN 11
        WHEN 'mira' THEN 15 WHEN 'sora' THEN 13 WHEN 'luka' THEN 16 WHEN 'noa' THEN 10 WHEN 'sera' THEN 14
        WHEN 'hana' THEN 8 WHEN 'nori' THEN 9 WHEN 'grom' THEN 18 WHEN 'kira' THEN 12 WHEN 'vel' THEN 12 ELSE 0 END),0)
        INTO v_staff FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_defender->'staff')='array' THEN v_defender->'staff' ELSE '[]'::jsonb END) AS item;
      v_defender_power := 12 + least(v_staff,120) / 3;
      SELECT count(*) INTO v_staff FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_defender->'staff')='array' THEN v_defender->'staff' ELSE '[]'::jsonb END) AS item WHERE item->>'focus'='guard';
      v_defender_power := v_defender_power + least(v_staff,8) * 3;
      SELECT count(*) INTO v_staff FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_defender->'spouses')='array' THEN v_defender->'spouses' ELSE '[]'::jsonb END) AS item WHERE item->>'focus'='guard';
      v_defender_power := v_defender_power + least(v_staff,3) * 5;
      SELECT count(*) INTO v_staff FROM jsonb_array_elements(CASE WHEN jsonb_typeof(v_defender->'children')='array' THEN v_defender->'children' ELSE '[]'::jsonb END) AS item
        WHERE item->>'focus'='guard' AND now() >= to_timestamp(((item->>'bornAt')::bigint + 18 * 3 * 3600000)::double precision / 1000);
      v_defender_power := v_defender_power + least(v_staff,5) * 3;
      IF v_defender::text LIKE '%"facility": "watchtower"%' THEN v_defender_power := v_defender_power + 8; END IF;
    END IF;
    DELETE FROM public.isekai_frontier_battles WHERE actor_id = p_actor_id;
    INSERT INTO public.isekai_frontier_battles(actor_id,class_name,area_id,plot_index,defender_id,actor_hp,defender_hp,actor_power,defender_power,actor_magic_bonus,actor_heal_bonus)
      VALUES(p_actor_id,v_class,p_area_id,p_plot_index,v_owner,75 + v_actor_power,70 + v_defender_power,v_actor_power,v_defender_power,
        CASE WHEN v_farm::text LIKE '%"facility": "academy"%' THEN 8 ELSE 0 END,
        CASE WHEN v_farm::text LIKE '%"facility": "infirmary"%' THEN 10 ELSE 0 END);
    RETURN jsonb_build_object('status','active','turn',0,'actor_hp',75+v_actor_power,'defender_hp',70+v_defender_power,
      'actor_mana',2,'actor_items',1,'owner_id',v_owner,'message',coalesce('挑戰同班領主 ' || v_owner,'挑戰系統邊境守衛'));
  END IF;

  SELECT * INTO v_battle FROM public.isekai_frontier_battles WHERE actor_id = p_actor_id FOR UPDATE;
  IF NOT FOUND OR v_battle.expires_at < now() OR v_battle.class_name <> v_class
    OR v_battle.area_id <> p_area_id OR v_battle.plot_index <> p_plot_index
    OR v_battle.defender_id IS DISTINCT FROM v_owner THEN
    RAISE EXCEPTION '戰鬥已過期或田地歸屬已變更，請重新挑戰';
  END IF;
  v_actor_hp := v_battle.actor_hp;
  v_defender_hp := v_battle.defender_hp;
  IF p_command = 'magic' AND v_battle.actor_mana < 1 THEN RAISE EXCEPTION '魔力已用盡'; END IF;
  IF p_command = 'item' AND v_battle.actor_items < 1 THEN RAISE EXCEPTION '補給已用盡'; END IF;
  IF p_command = 'item' THEN
    v_actor_hp := least(75 + v_battle.actor_power,v_actor_hp + 28 + v_battle.actor_heal_bonus);
    v_battle.actor_items := v_battle.actor_items - 1;
    v_text := '隊伍使用治療藥草，恢復 ' || (28 + v_battle.actor_heal_bonus) || ' 生命';
  ELSIF p_command = 'guard' THEN
    v_text := '隊伍架起盾牌，準備迎擊';
  ELSE
    v_damage := greatest(5, v_battle.actor_power / 2 + CASE WHEN p_command='magic' THEN 11 + v_battle.actor_magic_bonus ELSE 3 END + ((v_battle.turn * 7) % 6));
    v_defender_hp := greatest(0,v_defender_hp-v_damage);
    IF p_command = 'magic' THEN v_battle.actor_mana := v_battle.actor_mana - 1; END IF;
    v_text := CASE WHEN p_command='magic' THEN '魔術衝擊' ELSE '全員攻擊' END || '造成 ' || v_damage || ' 傷害';
  END IF;
  IF v_defender_hp <= 0 THEN
    UPDATE public.isekai_frontier_claims SET owner_id=p_actor_id,captured_at=now(),lease_holder_id=NULL,lease_expires_at=NULL
      WHERE class_name=v_class AND area_id=p_area_id AND plot_index=p_plot_index;
    DELETE FROM public.isekai_frontier_battles WHERE actor_id=p_actor_id;
    RETURN jsonb_build_object('status','won','turn',v_battle.turn+1,'actor_hp',v_actor_hp,'defender_hp',0,
      'actor_mana',v_battle.actor_mana,'actor_items',v_battle.actor_items,'owner_id',p_actor_id,'message',v_text || '；成功佔領邊境田地！這塊地現在可耕作，佔領不會自動到期');
  END IF;
  v_reply := greatest(3,v_battle.defender_power / 2 + ((v_battle.turn * 5) % 7) - CASE WHEN p_command='guard' THEN 12 ELSE 0 END);
  v_actor_hp := greatest(0,v_actor_hp-v_reply);
  v_text := v_text || '；守方反擊造成 ' || v_reply || ' 傷害';
  IF v_actor_hp <= 0 OR v_battle.turn >= 11 THEN
    DELETE FROM public.isekai_frontier_battles WHERE actor_id=p_actor_id;
    RETURN jsonb_build_object('status','lost','turn',v_battle.turn+1,'actor_hp',v_actor_hp,'defender_hp',v_defender_hp,
      'actor_mana',v_battle.actor_mana,'actor_items',v_battle.actor_items,'owner_id',v_owner,'message',v_text || '；挑戰失敗，田地仍屬守方。');
  END IF;
  UPDATE public.isekai_frontier_battles SET actor_hp=v_actor_hp,defender_hp=v_defender_hp,
    actor_mana=v_battle.actor_mana,actor_items=v_battle.actor_items,turn=v_battle.turn+1
    WHERE actor_id=p_actor_id;
  RETURN jsonb_build_object('status',v_status,'turn',v_battle.turn+1,'actor_hp',v_actor_hp,'defender_hp',v_defender_hp,
    'actor_mana',v_battle.actor_mana,'actor_items',v_battle.actor_items,'owner_id',v_owner,'message',v_text);
END $$;

REVOKE ALL ON FUNCTION public.isekai_frontier_battle(text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.isekai_frontier_battle(text,text,integer,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.isekai_frontier_rent(
  p_actor_id text, p_area_id text, p_plot_index integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_class text;
  v_farm jsonb;
  v_home_area text;
  v_owner text;
  v_lease text;
  v_lease_end timestamptz;
  v_end timestamptz;
BEGIN
  IF p_actor_id IS NULL OR length(p_actor_id) > 255 OR p_area_id IS NULL OR p_area_id NOT IN
    ('fittoa','asura','riverland','foothills','ranoa','basherant','northern-ridge','east-wood','kingdragon','shirone','sanakia','kikka')
    OR p_plot_index IS NULL OR p_plot_index NOT BETWEEN 0 AND 5 THEN
    RAISE EXCEPTION '租地參數無效';
  END IF;
  SELECT class_name INTO v_class FROM public.students WHERE student_id=p_actor_id;
  IF v_class IS NULL THEN RAISE EXCEPTION '只有班級學生能租用邊境地'; END IF;
  SELECT farm INTO v_farm FROM public.isekai_farm_states WHERE student_id=p_actor_id FOR UPDATE;
  IF v_farm IS NULL OR v_farm->'profile' IS NULL THEN RAISE EXCEPTION '請先建立角色'; END IF;
  v_home_area := coalesce(v_farm->'profile'->>'startAreaId','fittoa');
  IF p_area_id <> v_home_area AND (SELECT count(*) FROM public.isekai_frontier_claims
      WHERE class_name=v_class AND area_id=v_home_area AND owner_id=p_actor_id) < 6 THEN
    RAISE EXCEPTION '請先佔領起始領地的六塊邊境田地，才能向外拓展';
  END IF;
  INSERT INTO public.isekai_frontier_claims(class_name,area_id,plot_index)
    VALUES(v_class,p_area_id,p_plot_index) ON CONFLICT DO NOTHING;
  SELECT owner_id,lease_holder_id,lease_expires_at INTO v_owner,v_lease,v_lease_end
    FROM public.isekai_frontier_claims WHERE class_name=v_class AND area_id=p_area_id AND plot_index=p_plot_index FOR UPDATE;
  IF v_owner IS NOT NULL THEN RAISE EXCEPTION '這塊田地已被佔領，不能租用'; END IF;
  IF v_lease IS NOT NULL AND v_lease_end > now() AND v_lease <> p_actor_id THEN
    RAISE EXCEPTION '這塊田地仍由其他同學租用';
  END IF;
  IF coalesce((v_farm->>'coins')::integer,0) < 60 THEN RAISE EXCEPTION '租地需要 60 金幣'; END IF;
  v_end := greatest(now(),coalesce(v_lease_end,now())) + interval '6 hours';
  UPDATE public.isekai_frontier_claims SET lease_holder_id=p_actor_id,lease_expires_at=v_end,
    captured_at=CASE WHEN v_lease=p_actor_id AND v_lease_end > now() THEN captured_at ELSE now() END
    WHERE class_name=v_class AND area_id=p_area_id AND plot_index=p_plot_index;
  UPDATE public.isekai_farm_states SET
    farm=jsonb_set(v_farm,'{coins}',to_jsonb((v_farm->>'coins')::integer-60),true),
    revision=revision+1,updated_at=now()
    WHERE student_id=p_actor_id;
  RETURN jsonb_build_object('message','租用邊境第 '||(p_plot_index+1)||' 塊田至 '||to_char(v_end,'YYYY-MM-DD HH24:MI')||'；已扣 60 金幣','lease_expires_at',v_end);
END $$;
REVOKE ALL ON FUNCTION public.isekai_frontier_rent(text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.isekai_frontier_rent(text,text,integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.isekai_frontier_relinquish(p_actor_id text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer;
BEGIN
  IF p_actor_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.students WHERE student_id=p_actor_id) THEN
    RAISE EXCEPTION '找不到學生';
  END IF;
  DELETE FROM public.isekai_frontier_battles WHERE actor_id=p_actor_id;
  UPDATE public.isekai_frontier_claims SET owner_id=NULL,lease_holder_id=NULL,lease_expires_at=NULL,captured_at=now()
    WHERE owner_id=p_actor_id OR lease_holder_id=p_actor_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;
REVOKE ALL ON FUNCTION public.isekai_frontier_relinquish(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.isekai_frontier_relinquish(text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
