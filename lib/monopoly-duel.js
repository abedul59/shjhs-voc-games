import maps from '../data/monopoly-maps.json';
import { monopolyEvents } from '../data/monopoly-events';

export const DUEL_NAME = '單字大富翁（雙人）';
export const DUEL_KEY = 'monopolyDual';
export const ROUND_OPTIONS = [10, 15, 20];
export const OFFLINE_LIMIT = 90000;
export const shuffle = items => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
export const matchKey = (lesson, mapId, rounds) => 'monopoly-dual:' + JSON.stringify([lesson.version, lesson.volume, lesson.unit, mapId, rounds]);
export const stopsFor = state => {
  const map = maps.find(item => item.id === state?.mapId) || maps[0];
  const count = Math.min(state?.board?.length || 0, map.cities.length, 12);
  return (state?.board || []).slice(0, count).map((word, index) => ({
    ...map.cities[count === 1 ? 0 : Math.round(index * (map.cities.length - 1) / (count - 1))],
    index, word,
    eventType: count === 1 ? 'both' : index === Math.floor(count / 3) ? 'chance' : index === Math.floor(2 * count / 3) ? 'fate' : ''
  }));
};
export const landPrice = (state, id) => 100 + Math.max(0, Math.floor(state.board.findIndex(word => word.id === id) / 4)) * 25;
export const eventLabel = type => type === 'chance' ? '機會' : type === 'fate' ? '命運' : '機會／命運';
const makePlayer = student => ({
  id: String(student.id), name: student.name || '同學', device: student.device || '',
  cash: 1500, pos: 0, direction: 1, shields: 0, correct: [], wrong: [], recordId: crypto.randomUUID()
});

export function createLobby(student, words, lesson, mapId, rounds, now = Date.now()) {
  if (!maps.some(map => map.id === mapId) || !ROUND_OPTIONS.includes(rounds) || !words.length) throw new Error('請選擇有效的地圖、回合與課程。');
  return {
    schema: 1, revision: 0, mapId, rounds, lesson, board: shuffle(words).slice(0, 12),
    players: [makePlayer(student)], owned: {}, turn: 0, round: 1, phase: 'waiting',
    dice: [1, 1], die: 0, remaining: 0, decks: { chance: [], fate: [] },
    question: null, eventCard: null, message: '等待另一位同學加入…',
    presence: [now, 0], dueAt: 0, startedAt: 0, endedAt: 0, winner: null, escaped: null, finishReason: ''
  };
}

export function joinLobby(lobby, student, now = Date.now()) {
  const next = JSON.parse(JSON.stringify(lobby));
  if (next.phase !== 'waiting' || next.players[0].id === String(student.id)) throw new Error('這個房間已無法加入。');
  next.players.push(makePlayer(student)); next.presence = [now, now];
  next.phase = 'ready'; next.startedAt = now; next.revision++;
  next.message = '配對成功！由 ' + next.players[0].name + ' 先擲骰，雙方各行動一次算一回合。';
  return next;
}

function finish(state, reason, now, escaped = null) {
  state.phase = 'over'; state.endedAt = now; state.escaped = escaped;
  state.winner = escaped !== null ? 1 - escaped : state.players[0].cash === state.players[1].cash ? null : state.players[0].cash > state.players[1].cash ? 0 : 1;
  state.finishReason = reason; state.message = reason; state.question = null; state.eventCard = null;
}
function endTurn(state, now) {
  if (state.players.some(player => player.cash <= 0)) return finish(state, '有玩家現金用盡，本局提前結算。', now);
  if (state.turn === 1 && state.round >= state.rounds) return finish(state, '已完成 ' + state.rounds + ' 回合，自動結束遊戲。', now);
  if (state.turn === 1) state.round++;
  state.turn = 1 - state.turn; state.phase = 'ready'; state.question = null;
  state.message = '輪到 ' + state.players[state.turn].name + ' 擲骰。';
}
function feedback(state, message, now) {
  state.message = message; state.phase = 'feedback'; state.dueAt = now + 2200; state.question = null;
}
function buyQuestion(state, now) {
  const player = state.players[state.turn], stop = stopsFor(state)[player.pos], word = stop.word;
  const owner = state.owned[word.id];
  if (player.cash <= 0) return endTurn(state, now);
  if (owner !== undefined) {
    if (owner === state.turn) feedback(state, player.name + ' 回到自己的土地「' + stop.name + '」。', now);
    else if (player.shields > 0) { player.shields--; feedback(state, player.name + ' 在「' + stop.name + '」使用免租券，本次不用付租金。', now); }
    else { player.cash -= 30; state.players[owner].cash += 30; feedback(state, player.name + ' 在「' + stop.name + '」支付 $30 租金給 ' + state.players[owner].name + '。', now); }
    return;
  }
  const letters = [...word.en_us].map((letter, index) => /[a-z]/i.test(letter) ? index : -1).filter(index => index >= 0);
  const type = letters.length < 2 || Math.random() < .5 ? 'choice' : 'letters';
  const masked = [...word.en_us], missing = [];
  if (type === 'letters') for (const index of shuffle(letters).slice(0, 2).sort((a, b) => a - b)) { missing.push(masked[index].toLowerCase()); masked[index] = '＿'; }
  const seen = new Set([word.en_us.trim().toLowerCase()]);
  const choices = shuffle(state.board).filter(item => {
    const key = item.en_us.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 3);
  state.question = { id: crypto.randomUUID(), type, word, masked: masked.join(''), missing, choices: shuffle([word, ...choices]) };
  state.phase = 'question'; state.message = player.name + ' 抵達「' + stop.name + '」，正在回答單字。';
}
function land(state, now) {
  const player = state.players[state.turn], stop = stopsFor(state)[player.pos];
  if (!stop.eventType) return buyQuestion(state, now);
  const type = stop.eventType === 'both' ? (state.round % 2 ? 'chance' : 'fate') : stop.eventType;
  if (!state.decks[type].length) state.decks[type] = shuffle(monopolyEvents[type].map((_, i) => i));
  const card = monopolyEvents[type][state.decks[type].pop()], before = player.cash, shields = player.shields;
  player.cash += card.cash || 0;
  player.shields = Math.min(2, player.shields + (card.shield || 0));
  const effect = card.cash ? (card.cash > 0 ? '+' : '−') + '$' + Math.abs(card.cash) + '（$' + before + ' → $' + player.cash + '）' : shields < player.shields ? '獲得免租券 ×1' : '免租券已達 2 張上限';
  state.eventCard = { ...card, type, player: player.name, effect };
  state.phase = 'event'; state.message = player.name + ' 抽到「' + eventLabel(type) + '：' + card.title + '」' + effect;
}

// Every transition is persisted with a revision compare-and-swap by the room composable.
// Only the current player's client advances animation phases; the other client observes.
export function transition(current, action, actor, now = Date.now()) {
  if (!current || current.schema !== 1 || !current.players[actor] || current.phase === 'over') return null;
  const state = JSON.parse(JSON.stringify(current));
  if (action.type === 'heartbeat') state.presence[actor] = now;
  else if (action.type === 'escape' && state.phase !== 'waiting') finish(state, state.players[actor].name + ' 已離場，對手獲勝。', now, actor);
  else if (action.type === 'timeout' && state.phase !== 'waiting' && now - state.presence[1 - actor] > OFFLINE_LIMIT && now - state.presence[actor] < 20000) finish(state, state.players[1 - actor].name + ' 已離線超過 90 秒，判定離場。', now, 1 - actor);
  else {
    if (actor !== state.turn || state.phase === 'waiting') return null;
    if (action.type === 'roll' && state.phase === 'ready') {
      state.dice = [1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)];
      state.die = state.dice[0] + state.dice[1]; state.remaining = state.die;
      state.phase = 'rolling'; state.dueAt = now + 1200; state.message = state.players[actor].name + ' 正在擲骰…';
    } else if (action.type === 'advance' && now >= state.dueAt) {
      if (state.phase === 'rolling') { state.phase = 'moving'; state.dueAt = now + 350; state.message = state.players[actor].name + ' 擲出 ' + state.die + ' 點。'; }
      else if (state.phase === 'moving') {
        const player = state.players[actor], last = stopsFor(state).length - 1;
        let bonus = '';
        if (last > 0) {
          let next = player.pos + player.direction;
          if (next > last) { player.direction = -1; next = last - 1; }
          else if (next < 0) { player.direction = 1; next = 1; player.cash += 200; bonus = ' 經過起點，領取 $200。'; }
          player.pos = next;
        }
        state.remaining--; state.dueAt = now + 350;
        state.message = player.name + ' 前往「' + stopsFor(state)[player.pos].name + '」…' + bonus;
        if (state.remaining <= 0) land(state, now);
      } else if (state.phase === 'feedback') endTurn(state, now);
      else return null;
    } else if (action.type === 'continue' && state.phase === 'event') {
      state.eventCard = null; buyQuestion(state, now);
    } else if (action.type === 'answer' && state.phase === 'question' && action.questionId === state.question.id) {
      const question = state.question, word = question.word, player = state.players[actor];
      const correct = question.type === 'choice' ? String(action.answer) === String(word.id) : String(action.answer).trim().toLowerCase() === question.missing.join('');
      player[correct ? 'correct' : 'wrong'].push(word.en_us);
      let message;
      if (correct && player.cash >= landPrice(state, word.id)) {
        state.owned[word.id] = actor; player.cash -= landPrice(state, word.id);
        message = player.name + ' 答對並買下「' + stopsFor(state)[player.pos].name + '／' + word.en_us + '（' + word.zh_tw + '）」的土地！';
      } else if (correct) message = player.name + ' 答對了，但現金不足，無法買地。';
      else message = player.name + ' 答錯了，答案是 ' + word.en_us + '＝' + word.zh_tw + '。';
      feedback(state, message, now);
    } else return null;
    state.presence[actor] = now;
  }
  state.revision++;
  return state;
}

export function duelRecord(state, index) {
  const player = state.players[index], opponent = state.players[1 - index];
  const outcome = state.escaped === index ? '逃' : state.winner === null ? '平' : state.winner === index ? '勝' : '敗';
  const opponentName = opponent.name.replace(/[,，\r\n]/g, ' ');
  return {
    id: player.recordId, student_id: player.id, game_type: DUEL_NAME,
    version: state.lesson.version, volume: state.lesson.volume, unit_played: state.lesson.unit,
    score: player.cash, mistakes: player.wrong.length, played_at: new Date(state.endedAt).toISOString(),
    time_taken_seconds: Math.max(0, Math.floor((state.endedAt - state.startedAt) / 1000)),
    correct_words: ['【' + outcome + '】對手: ' + opponentName, ...player.correct].join(', '),
    wrong_words: player.wrong.join(', '), device_info: player.device
  };
}

export function rankDuels(records, mode) {
  const groups = {};
  for (const record of records) {
    const entry = groups[record.student_id] ||= { student_id: record.student_id, wins: 0, losses: 0, escapes: 0, draws: 0, best: null };
    const outcome = (record.correct_words || '').match(/^【(勝|敗|逃|平)】/)?.[1];
    const counter = { 勝: 'wins', 敗: 'losses', 逃: 'escapes', 平: 'draws' }[outcome];
    if (counter) entry[counter]++;
    if (!entry.best || record.score > entry.best.score || (record.score === entry.best.score && record.time_taken_seconds < entry.best.time_taken_seconds)) entry.best = record;
  }
  const key = ['wins', 'losses', 'escapes', 'draws', 'score'].includes(mode) ? mode : 'wins';
  return Object.values(groups).map(({ best, ...counts }) => ({ ...best, ...counts }))
    .filter(item => key === 'score' || item[key] > 0)
    .sort((a, b) => b[key] - a[key] || b.wins - a.wins || a.escapes - b.escapes || a.time_taken_seconds - b.time_taken_seconds || String(a.student_id).localeCompare(String(b.student_id)));
}
