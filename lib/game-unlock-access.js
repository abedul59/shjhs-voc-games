import { GAME_ACCESS_CATALOG } from '~/lib/game-access-catalog';
import { isVocabScopeAllowed, normalizeVocabScope } from '~/lib/vocab-scope-access';

const explicitRecordTypes = {
  match: ['單字方塊消消樂'], monopoly: ['單字大富翁'], happyFarm: ['單字開心農場'],
  isekaiFarm: ['單字異世界悠閒農莊'], alchemyAtelier: ['單字鍊金工房'],
  convenienceStore: ['單字便利商店'], vocabularyCity: ['單字城市建造家'], vocabularyZoo: ['單字模擬動物園'],
  vocabularyStairs: ['單字小朋友下樓梯'], vocabularyCircus: ['單字馬戲團'], vocabularyCandy: ['單字Candy Crush'],
  vocabularySubway: ['單字地鐵跑酷'], chess: ['單字西洋棋'], go: ['單字圍棋'], xiangqi: ['單字象棋'],
  railwayTour: ['單字鐵路旅遊高手'], move: ['單字神移動'], choice: ['單字選選樂'],
  fill: ['單字填一填'], sentence: ['單字例句神絕配'], listen: ['單字例句順風耳'], puzzle: ['單字拼起來'],
  speakno1: ['英語口說學霸'], speak: ['單字口說測一測'], cross: ['單字填字FUN'], review: ['單字複習趣'],
  picture2meaning: ['單字看圖辨義'], ninja: ['單字音節忍者'], examListen1: ['仿會考辨識句意'],
  tetris: ['單字俄羅斯方塊'], pinball: ['單字彈珠台'], angrybirds: ['單字憤怒鳥'],
  angrybirdsDual: ['單字憤怒鳥（雙人）', '單字憤怒鳥(雙人)'], solitaire: ['單字撲克牌接龍'],
  pikavolley: ['單字皮卡丘排球'], pikavolleyDual: ['單字皮卡丘排球（雙人）', '單字皮卡丘排球(雙人)'],
  pacman: ['單字小精靈'], minesweeper: ['單字踩地雷'], sudoku: ['單字9x9數獨'],
  tarotUno1: ['單字塔羅UNO(單人)'], tarot21solo: ['單人塔羅21點'], tarotAlch1: ['單字塔羅鍊金術(單人)'],
  speakno2: ['英語口說學霸2'], KKphonetics: ['KK音標初學/複習趣'], Phonics: ['自然發音法初學/複習趣'],
  speakno3: ['英語口說學霸3'], examRead2: ['會考閱讀考古學(題組)'], gramAmuPark: ['文法遊樂園'],
  noropejump: ['單字無繩式跳繩'], vocshooting: ['飛鼠單字射擊'], battle: ['單字方塊陣'],
  tenchi: ['單字吞食天地'], tarot21: ['單字塔羅21點'], tarotAlch: ['單字塔羅鍊金術'],
  tarotUno: ['單字塔羅UNO對決'], verbing: ['動詞變化大師'], verbingDual: ['動詞對戰大師'],
  verbAmuPark: ['動詞變化遊樂園'], verbMonopoly: ['動詞變化大富翁（八年級）', '動詞變化大富翁（九年級）']
};

const cleanName = value => String(value || '')
  .replace(/^[^\p{L}\p{N}]+/u, '')
  .replace(/[\s（）()／/·・：:－-]+/g, '')
  .toLowerCase();

const catalogAliases = new Map(GAME_ACCESS_CATALOG.map(game => [
  game.id,
  [game.name, ...(explicitRecordTypes[game.id] || [])].map(cleanName).filter(Boolean)
]));

export const gameRecordMatches = (gameId, recordType) => {
  const normalized = cleanName(recordType);
  if (!normalized) return false;
  return (catalogAliases.get(gameId) || []).some(alias => normalized === alias);
};

export const normalizeUnlockRule = rule => ({
  ...rule,
  source_game_ids: Array.isArray(rule?.source_game_ids) ? rule.source_game_ids : [],
  target_game_ids: Array.isArray(rule?.target_game_ids) ? rule.target_game_ids : [],
  requirement_scope: normalizeVocabScope(rule?.requirement_scope),
  condition_mode: ['plays', 'score', 'either', 'both'].includes(rule?.condition_mode) ? rule.condition_mode : 'plays',
  required_plays: Math.max(0, Number(rule?.required_plays) || 0),
  required_score: Math.max(0, Number(rule?.required_score) || 0)
});

export const evaluateGameUnlockRule = (rawRule, override, records = []) => {
  const rule = normalizeUnlockRule(rawRule);
  const mode = override?.override_mode || 'inherit';
  const requiredPlays = mode === 'custom' && override?.required_plays != null
    ? Math.max(0, Number(override.required_plays) || 0) : rule.required_plays;
  const requiredScore = mode === 'custom' && override?.required_score != null
    ? Math.max(0, Number(override.required_score) || 0) : rule.required_score;

  const eligible = records.filter(record =>
    rule.source_game_ids.some(gameId => gameRecordMatches(gameId, record.game_type))
    && isVocabScopeAllowed(rule.requirement_scope, {
      version: record.version,
      volume: record.volume,
      unit: record.unit_played
    })
  );
  const playBuckets = new Map();
  for (const record of eligible) {
    const key = [record.game_type, record.version, record.volume, record.unit_played].map(value => String(value || '')).join('|');
    const bucket = playBuckets.get(key) || { rows: 0, maxAttempt: 0 };
    bucket.rows += 1;
    bucket.maxAttempt = Math.max(bucket.maxAttempt, Number(record.attempt_number) || 0);
    playBuckets.set(key, bucket);
  }
  const playCount = [...playBuckets.values()].reduce((total, bucket) => total + Math.max(bucket.rows, bucket.maxAttempt), 0);
  const bestScore = eligible.reduce((best, record) => Math.max(best, Number(record.score) || 0), 0);
  const playsMet = playCount >= requiredPlays;
  const scoreMet = bestScore >= requiredScore;
  const conditionMet = rule.condition_mode === 'plays' ? playsMet
    : rule.condition_mode === 'score' ? scoreMet
      : rule.condition_mode === 'both' ? playsMet && scoreMet
        : playsMet || scoreMet;

  return {
    rule,
    overrideMode: mode,
    forcedLock: mode === 'force_lock',
    unlocked: mode === 'force_unlock' || (mode !== 'force_lock' && conditionMet),
    playCount,
    bestScore,
    requiredPlays,
    requiredScore,
    playsMet,
    scoreMet
  };
};

export const unlockProgressText = status => {
  const plays = `完成 ${status.playCount}/${status.requiredPlays} 次`;
  const score = `最高 ${status.bestScore}/${status.requiredScore} 分`;
  if (status.rule.condition_mode === 'plays') return plays;
  if (status.rule.condition_mode === 'score') return score;
  return `${plays}；${score}（${status.rule.condition_mode === 'both' ? '兩者皆須達成' : '任一達成'}）`;
};
