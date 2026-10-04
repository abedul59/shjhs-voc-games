-- 單字異世界悠閒農莊：邊境戰改為同人數隊伍戰鬥。
-- 先執行 20261003_isekai_frontier_farmland.sql；在網站所連接的 Supabase SQL Editor 執行一次。
BEGIN;

ALTER TABLE public.isekai_frontier_battles
  ADD COLUMN IF NOT EXISTS actor_team jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS defender_team jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS party_size smallint NOT NULL DEFAULT 1;

CREATE OR REPLACE FUNCTION public.isekai_frontier_party(p_farm jsonb, p_leader text)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path = public AS $$
DECLARE
  v_power integer;
  v_allies jsonb;
BEGIN
  v_power := 14
    + CASE p_farm->'profile'->>'raceId' WHEN 'beast' THEN 4 WHEN 'demon' THEN 4 WHEN 'dwarf' THEN 3 ELSE 2 END
    + CASE p_farm->'profile'->>'professionId' WHEN 'knight' THEN 6 WHEN 'mage' THEN 5 WHEN 'ranger' THEN 4 ELSE 2 END;
  IF p_farm::text LIKE '%"facility": "barracks"%' THEN v_power := v_power + 2; END IF;
  IF p_farm::text LIKE '%"facility": "smithy"%' THEN v_power := v_power + 2; END IF;

  WITH allies AS (
    SELECT 3 * (item->>'focus' = 'guard')::integer + 1 AS priority,
      CASE item->>'id'
        WHEN 'ela' THEN '艾拉' WHEN 'ron' THEN '羅恩' WHEN 'lyra' THEN '莉拉' WHEN 'finn' THEN '芬恩'
        WHEN 'borin' THEN '波林' WHEN 'mira' THEN '米拉' WHEN 'sora' THEN '索拉' WHEN 'luka' THEN '盧卡'
        WHEN 'noa' THEN '諾亞' WHEN 'sera' THEN '瑟拉' WHEN 'hana' THEN '花音' WHEN 'nori' THEN '諾里'
        WHEN 'grom' THEN '古洛姆' WHEN 'kira' THEN '琪拉' WHEN 'vel' THEN '維爾' END AS name,
      '員工'::text AS role, '⚔️'::text AS icon,
      CASE item->>'id'
        WHEN 'ela' THEN 8 WHEN 'ron' THEN 17 WHEN 'lyra' THEN 9 WHEN 'finn' THEN 15 WHEN 'borin' THEN 11
        WHEN 'mira' THEN 15 WHEN 'sora' THEN 13 WHEN 'luka' THEN 16 WHEN 'noa' THEN 10 WHEN 'sera' THEN 14
        WHEN 'hana' THEN 8 WHEN 'nori' THEN 9 WHEN 'grom' THEN 18 WHEN 'kira' THEN 12 WHEN 'vel' THEN 12 END
        + CASE WHEN item->>'focus' = 'guard' THEN 3 ELSE 0 END AS power
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_farm->'staff') = 'array' THEN p_farm->'staff' ELSE '[]'::jsonb END) item
    WHERE item->>'id' IN ('ela','ron','lyra','finn','borin','mira','sora','luka','noa','sera','hana','nori','grom','kira','vel')
    UNION ALL
    SELECT 3 * (item->>'focus' = 'guard')::integer + 1,
      CASE item->>'partnerId' WHEN 'aria' THEN '亞莉亞' WHEN 'leo' THEN '雷歐' WHEN 'silva' THEN '希爾瓦'
        WHEN 'eil' THEN '艾爾' WHEN 'dora' THEN '朵拉' WHEN 'bram' THEN '布蘭' WHEN 'luna' THEN '露娜'
        WHEN 'kai' THEN '凱' WHEN 'meya' THEN '梅雅' WHEN 'ren' THEN '蓮' END,
      '配偶'::text, '💞'::text,
      CASE item->>'partnerId' WHEN 'leo' THEN 17 WHEN 'kai' THEN 16 WHEN 'bram' THEN 15 WHEN 'eil' THEN 15
        WHEN 'luna' THEN 13 WHEN 'dora' THEN 12 WHEN 'meya' THEN 13 ELSE 10 END
        + CASE WHEN item->>'focus' = 'guard' THEN 3 ELSE 0 END
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_farm->'spouses') = 'array' THEN p_farm->'spouses' ELSE '[]'::jsonb END) item
    WHERE item->>'focus' <> 'rest' AND item->>'partnerId' IN ('aria','leo','silva','eil','dora','bram','luna','kai','meya','ren')
    UNION ALL
    SELECT 3 * (item->>'focus' = 'guard')::integer + 1,
      left(coalesce(nullif(item->>'name',''),'成年子女'),30), '成年子女'::text, '🗡️'::text,
      11 + CASE WHEN item->>'focus' = 'guard' THEN 3 ELSE 0 END
    FROM jsonb_array_elements(CASE WHEN jsonb_typeof(p_farm->'children') = 'array' THEN p_farm->'children' ELSE '[]'::jsonb END) item
    WHERE item->>'focus' <> 'rest' AND CASE WHEN item->>'bornAt' ~ '^[0-9]{1,15}$'
      THEN now() >= to_timestamp(((item->>'bornAt')::bigint + 18 * 3 * 3600000)::double precision / 1000)
      ELSE false END
  ), selected AS (
    SELECT * FROM allies WHERE name IS NOT NULL ORDER BY priority DESC, power DESC, name LIMIT 16
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'role',role,'icon',icon,
    'power',power,'hp',28+power,'max_hp',28+power) ORDER BY priority DESC,power DESC,name),'[]'::jsonb)
    INTO v_allies FROM selected;
  RETURN jsonb_build_array(jsonb_build_object('name',left(coalesce(p_leader,'領主'),30),
    'role','主角','icon','🧙','power',v_power,'hp',42+v_power,'max_hp',42+v_power)) || v_allies;
END $$;
REVOKE ALL ON FUNCTION public.isekai_frontier_party(jsonb,text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.isekai_frontier_strike(
  p_attackers jsonb, p_defenders jsonb, p_turn integer, p_bonus integer, p_shield integer
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  v_team jsonb := p_defenders;
  v_attacker jsonb;
  v_target integer;
  v_unit jsonb;
  v_damage integer;
  v_total integer := 0;
  v_log text := '';
  v_index integer := 0;
BEGIN
  FOR v_attacker IN SELECT value FROM jsonb_array_elements(p_attackers) LOOP
    IF coalesce((v_attacker->>'hp')::integer,0) <= 0 THEN CONTINUE; END IF;
    SELECT ordinality::integer - 1 INTO v_target
      FROM jsonb_array_elements(v_team) WITH ORDINALITY AS member(value,ordinality)
      WHERE coalesce((value->>'hp')::integer,0) > 0
      ORDER BY (value->>'hp')::integer, ordinality LIMIT 1;
    IF v_target IS NULL THEN EXIT; END IF;
    v_unit := v_team->v_target;
    v_damage := greatest(2, (v_attacker->>'power')::integer * 2 / 3 + p_bonus
      + ((p_turn * 3 + v_index * 5) % 5) - p_shield);
    v_total := v_total + least(v_damage,(v_unit->>'hp')::integer);
    v_team := jsonb_set(v_team, ARRAY[v_target::text,'hp'],
      to_jsonb(greatest(0,(v_unit->>'hp')::integer-v_damage)));
    v_log := v_log || CASE WHEN v_log = '' THEN '' ELSE '；' END
      || coalesce(v_attacker->>'name','隊員') || '攻擊' || coalesce(v_unit->>'name','守軍')
      || ' ' || least(v_damage,(v_unit->>'hp')::integer);
    v_index := v_index + 1;
    v_target := NULL;
  END LOOP;
  RETURN jsonb_build_object('team',v_team,'damage',v_total,'log',v_log);
END $$;
REVOKE ALL ON FUNCTION public.isekai_frontier_strike(jsonb,jsonb,integer,integer,integer) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.isekai_frontier_battle(
  p_actor_id text, p_area_id text, p_plot_index integer, p_command text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_class text;
  v_owner text;
  v_lease text;
  v_lease_end timestamptz;
  v_home_area text;
  v_farm jsonb;
  v_defender jsonb;
  v_battle public.isekai_frontier_battles%ROWTYPE;
  v_actor_team jsonb;
  v_defender_team jsonb;
  v_party_size integer;
  v_actor_hp integer;
  v_defender_hp integer;
  v_result jsonb;
  v_text text;
  v_target integer;
  v_unit jsonb;
  v_healed integer;
  v_defense_bonus integer;
BEGIN
  IF p_actor_id IS NULL OR length(p_actor_id) > 255 OR p_area_id IS NULL OR p_command IS NULL OR p_area_id NOT IN
    ('fittoa','asura','riverland','foothills','ranoa','basherant','northern-ridge','east-wood','kingdragon','shirone','sanakia','kikka')
    OR p_plot_index IS NULL OR p_plot_index NOT BETWEEN 0 AND 5
    OR p_command NOT IN ('start','attack','magic','guard','item') THEN RAISE EXCEPTION '戰鬥參數無效'; END IF;
  SELECT class_name INTO v_class FROM public.students WHERE student_id=p_actor_id;
  IF v_class IS NULL THEN RAISE EXCEPTION '只有已登入班級的學生能參加邊境戰'; END IF;
  SELECT farm INTO v_farm FROM public.isekai_farm_states WHERE student_id=p_actor_id;
  IF v_farm IS NULL OR v_farm->'profile' IS NULL THEN RAISE EXCEPTION '請先建立角色'; END IF;
  v_home_area := coalesce(v_farm->'profile'->>'startAreaId','fittoa');
  IF p_area_id <> v_home_area AND (SELECT count(*) FROM public.isekai_frontier_claims
    WHERE class_name=v_class AND area_id=v_home_area AND owner_id=p_actor_id) < 6 THEN
    RAISE EXCEPTION '請先佔領起始領地的六塊邊境地，才能向外拓展'; END IF;
  INSERT INTO public.isekai_frontier_claims(class_name,area_id,plot_index)
    VALUES(v_class,p_area_id,p_plot_index) ON CONFLICT DO NOTHING;
  SELECT owner_id,lease_holder_id,lease_expires_at INTO v_owner,v_lease,v_lease_end
    FROM public.isekai_frontier_claims WHERE class_name=v_class AND area_id=p_area_id AND plot_index=p_plot_index FOR UPDATE;
  IF v_lease IS NOT NULL AND v_lease_end > now() THEN RAISE EXCEPTION '此田地租約尚未結束，不能發動戰鬥'; END IF;
  IF v_owner = p_actor_id THEN RAISE EXCEPTION '你已佔領這塊邊境田地'; END IF;
  IF v_owner IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.students WHERE student_id=v_owner AND class_name=v_class) THEN
      UPDATE public.isekai_frontier_claims SET owner_id=NULL,captured_at=now()
        WHERE class_name=v_class AND area_id=p_area_id AND plot_index=p_plot_index;
      v_owner := NULL;
    ELSE
      SELECT farm INTO v_defender FROM public.isekai_farm_states WHERE student_id=v_owner;
      IF v_defender IS NULL THEN
        UPDATE public.isekai_frontier_claims SET owner_id=NULL,captured_at=now()
          WHERE class_name=v_class AND area_id=p_area_id AND plot_index=p_plot_index;
        v_owner := NULL;
      END IF;
    END IF;
  END IF;

  IF p_command='start' THEN
    v_actor_team := public.isekai_frontier_party(v_farm,'我方主角');
    v_defender_team := CASE WHEN v_defender IS NULL
      THEN jsonb_build_array(jsonb_build_object('name','邊境守衛長','role','守衛','icon','🛡️',
        'power',20+p_plot_index*2,'hp',64+p_plot_index*4,'max_hp',64+p_plot_index*4))
      ELSE public.isekai_frontier_party(v_defender,'同班領主') END;
    IF v_defender IS NOT NULL THEN
      v_defense_bonus := 2 + CASE WHEN v_defender::text LIKE '%"facility": "watchtower"%' THEN 3 ELSE 0 END;
      v_defender_team := jsonb_set(v_defender_team,'{0,power}',
        to_jsonb((v_defender_team->0->>'power')::integer+v_defense_bonus));
      v_defender_team := jsonb_set(v_defender_team,'{0,hp}',
        to_jsonb((v_defender_team->0->>'hp')::integer+8));
      v_defender_team := jsonb_set(v_defender_team,'{0,max_hp}',
        to_jsonb((v_defender_team->0->>'max_hp')::integer+8));
    END IF;
    v_party_size := greatest(jsonb_array_length(v_actor_team),jsonb_array_length(v_defender_team));
    WHILE jsonb_array_length(v_actor_team) < v_party_size LOOP
      v_actor_team := v_actor_team || jsonb_build_array(jsonb_build_object('name','我方支援兵 '||(jsonb_array_length(v_actor_team)+1),
        'role','援軍','icon','🗡️','power',10,'hp',38,'max_hp',38));
    END LOOP;
    WHILE jsonb_array_length(v_defender_team) < v_party_size LOOP
      v_defender_team := v_defender_team || jsonb_build_array(jsonb_build_object('name','守方援軍 '||(jsonb_array_length(v_defender_team)+1),
        'role','援軍','icon','🛡️','power',10,'hp',38,'max_hp',38));
    END LOOP;
    SELECT coalesce(sum((member->>'hp')::integer),0) INTO v_actor_hp FROM jsonb_array_elements(v_actor_team) member;
    SELECT coalesce(sum((member->>'hp')::integer),0) INTO v_defender_hp FROM jsonb_array_elements(v_defender_team) member;
    DELETE FROM public.isekai_frontier_battles WHERE actor_id=p_actor_id;
    INSERT INTO public.isekai_frontier_battles(actor_id,class_name,area_id,plot_index,defender_id,
      actor_hp,defender_hp,actor_power,defender_power,actor_mana,actor_items,actor_magic_bonus,actor_heal_bonus,
      actor_team,defender_team,party_size)
    VALUES(p_actor_id,v_class,p_area_id,p_plot_index,v_owner,v_actor_hp,v_defender_hp,12,12,2,2,
      CASE WHEN v_farm::text LIKE '%"facility": "academy"%' THEN 4 ELSE 0 END,
      CASE WHEN v_farm::text LIKE '%"facility": "infirmary"%' THEN 8 ELSE 0 END,
      v_actor_team,v_defender_team,v_party_size);
    RETURN jsonb_build_object('status','active','turn',0,'actor_hp',v_actor_hp,'defender_hp',v_defender_hp,
      'actor_mana',2,'actor_items',2,'actor_team',v_actor_team,'defender_team',v_defender_team,
      'party_size',v_party_size,'owner_id',v_owner,
      'message','雙方各 '||v_party_size||' 人出戰；每位隊員都有獨立生命值。');
  END IF;

  SELECT * INTO v_battle FROM public.isekai_frontier_battles WHERE actor_id=p_actor_id FOR UPDATE;
  IF NOT FOUND OR v_battle.expires_at < now() OR v_battle.class_name <> v_class
    OR v_battle.area_id <> p_area_id OR v_battle.plot_index <> p_plot_index
    OR v_battle.defender_id IS DISTINCT FROM v_owner OR jsonb_array_length(v_battle.actor_team)=0 THEN
    RAISE EXCEPTION '戰鬥已過期或田地歸屬已變更，請重新挑戰'; END IF;
  v_actor_team := v_battle.actor_team;
  v_defender_team := v_battle.defender_team;
  IF p_command='magic' AND v_battle.actor_mana < 1 THEN RAISE EXCEPTION '魔力已用盡'; END IF;
  IF p_command='item' AND v_battle.actor_items < 1 THEN RAISE EXCEPTION '補給已用盡'; END IF;

  IF p_command='item' THEN
    SELECT ordinality::integer-1 INTO v_target FROM jsonb_array_elements(v_actor_team) WITH ORDINALITY AS member(value,ordinality)
      WHERE (value->>'hp')::integer > 0 AND (value->>'hp')::integer < (value->>'max_hp')::integer
      ORDER BY ((value->>'max_hp')::integer-(value->>'hp')::integer) DESC,ordinality LIMIT 1;
    IF v_target IS NULL THEN RAISE EXCEPTION '目前沒有需要治療的隊員'; END IF;
    v_unit := v_actor_team->v_target;
    v_healed := least(28+v_battle.actor_heal_bonus,(v_unit->>'max_hp')::integer-(v_unit->>'hp')::integer);
    v_actor_team := jsonb_set(v_actor_team,ARRAY[v_target::text,'hp'],to_jsonb((v_unit->>'hp')::integer+v_healed));
    v_battle.actor_items := v_battle.actor_items-1;
    v_text := '治療' || (v_unit->>'name') || '，恢復 ' || v_healed || ' 生命';
  ELSIF p_command='guard' THEN
    v_text := '全隊防禦，本回合承受傷害降低';
  ELSE
    v_result := public.isekai_frontier_strike(v_actor_team,v_defender_team,v_battle.turn,
      CASE WHEN p_command='magic' THEN 4+v_battle.actor_magic_bonus ELSE 0 END,0);
    v_defender_team := v_result->'team';
    IF p_command='magic' THEN v_battle.actor_mana := v_battle.actor_mana-1; END IF;
    v_text := CASE WHEN p_command='magic' THEN '合力魔術：' ELSE '全隊出擊：' END || coalesce(v_result->>'log','');
  END IF;
  SELECT coalesce(sum((member->>'hp')::integer),0) INTO v_defender_hp FROM jsonb_array_elements(v_defender_team) member;
  IF v_defender_hp > 0 THEN
    v_result := public.isekai_frontier_strike(v_defender_team,v_actor_team,v_battle.turn,0,
      CASE WHEN p_command='guard' THEN 7 ELSE 0 END);
    v_actor_team := v_result->'team';
    v_text := v_text || '；守方反擊：' || coalesce(v_result->>'log','');
  END IF;
  SELECT coalesce(sum((member->>'hp')::integer),0) INTO v_actor_hp FROM jsonb_array_elements(v_actor_team) member;
  IF v_defender_hp <= 0 THEN
    UPDATE public.isekai_frontier_claims SET owner_id=p_actor_id,captured_at=now(),lease_holder_id=NULL,lease_expires_at=NULL
      WHERE class_name=v_class AND area_id=p_area_id AND plot_index=p_plot_index;
    DELETE FROM public.isekai_frontier_battles WHERE actor_id=p_actor_id;
    RETURN jsonb_build_object('status','won','turn',v_battle.turn+1,'actor_hp',v_actor_hp,'defender_hp',0,
      'actor_mana',v_battle.actor_mana,'actor_items',v_battle.actor_items,'actor_team',v_actor_team,
      'defender_team',v_defender_team,'party_size',v_battle.party_size,'owner_id',p_actor_id,
      'message',v_text||'；戰勝並永久佔領邊境地！');
  END IF;
  IF v_actor_hp <= 0 OR v_battle.turn >= 14 THEN
    DELETE FROM public.isekai_frontier_battles WHERE actor_id=p_actor_id;
    RETURN jsonb_build_object('status','lost','turn',v_battle.turn+1,'actor_hp',v_actor_hp,'defender_hp',v_defender_hp,
      'actor_mana',v_battle.actor_mana,'actor_items',v_battle.actor_items,'actor_team',v_actor_team,
      'defender_team',v_defender_team,'party_size',v_battle.party_size,'owner_id',v_owner,
      'message',v_text||'；挑戰失敗，邊境地仍屬守方。');
  END IF;
  UPDATE public.isekai_frontier_battles SET actor_team=v_actor_team,defender_team=v_defender_team,
    actor_hp=v_actor_hp,defender_hp=v_defender_hp,actor_mana=v_battle.actor_mana,
    actor_items=v_battle.actor_items,turn=v_battle.turn+1 WHERE actor_id=p_actor_id;
  RETURN jsonb_build_object('status','active','turn',v_battle.turn+1,'actor_hp',v_actor_hp,'defender_hp',v_defender_hp,
    'actor_mana',v_battle.actor_mana,'actor_items',v_battle.actor_items,'actor_team',v_actor_team,
    'defender_team',v_defender_team,'party_size',v_battle.party_size,'owner_id',v_owner,'message',v_text);
END $$;
REVOKE ALL ON FUNCTION public.isekai_frontier_battle(text,text,integer,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.isekai_frontier_battle(text,text,integer,text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
