const pageLabels = {
  '/': '🏠 首頁與遊戲選單',
  '/history': '📜 個人學習紀錄',
  '/leaderboard': '🏆 全校英雄榜',
  '/student-grammar-stats': '📊 個人文法統計',
  '/student-verb-stats': '📊 個人動詞統計',
  '/tarot': '🃏 每日塔羅牌',
  '/game': '🟦 單字方塊消消樂',
  '/game-monopoly': '🏘️ 單字大富翁',
  '/game-monopoly-dual': '🏘️ 單字大富翁（雙人）',
  '/game-happy-farm': '🌻 單字開心農場',
  '/game-happy-farm-school': '🏫 開心農場校園與村莊',
  '/game-happy-farm-foundation': '🌱 開心農場學習扶助模式',
  '/game-isekai-farm': '✧ 單字異世界悠閒農莊',
  '/game-alchemy-atelier': '⚗️ 單字鍊金工房',
  '/game-convenience-store': '🏪 單字便利商店',
  '/game-railway-tour': '🚂 單字鐵路旅遊高手',
  '/game-vocabulary-city': '🏙️ 單字城市建造家',
  '/game-vocabulary-zoo': '🦁 單字模擬動物園',
  '/game-vocabulary-stairs': '🪜 單字小朋友下樓梯',
  '/game-vocabulary-circus': '🎪 單字馬戲團',
  '/game-vocabulary-candy': '🍬 單字 Candy Crush',
  '/game-vocabulary-subway': '🚇 單字地鐵跑酷',
  '/game-chess': '♔ 單字西洋棋',
  '/game-go': '⚫ 單字圍棋',
  '/game-xiangqi': '帥 單字象棋',
  '/game-move': '🔠 單字神移動',
  '/game-choice': '✅ 單字選選樂',
  '/game-fill': '⌨️ 單字填一填',
  '/game-sentence': '📝 單字例句神絕配',
  '/game-listen': '🎧 單字例句順風耳',
  '/game-puzzle': '🧩 單字拼起來',
  '/game-speak': '🎙️ 單字口說測一測',
  '/game-speakno1': '🗣️ 英語口說學霸－多元評量',
  '/game-speakno2': '📖 英語口說學霸－朗讀與說故事',
  '/game-speakno3': '🎤 英語口說學霸－英語歌唱',
  '/game-cross': '🔠 單字填字 FUN',
  '/game-review': '✍️ 單字複習趣',
  '/game-picture2meaning': '🖼️ 單字看圖辨義',
  '/game-ninja': '🥷 單字音節忍者',
  '/game-KKphonetics': '🔤 KK 音標初學／複習',
  '/game-Phonics': '🔤 自然發音初學／複習',
  '/game-examListen1': '💯 仿會考－辨識句意',
  '/game-examRead1': '📜 會考閱讀考古學（單題）',
  '/game-examRead2': '📚 會考閱讀考古學（題組）',
  '/game-gramAmuPark': '🎡 文法遊樂園',
  '/game-verbing': '🌀 動詞變化大師',
  '/game-verbingDual': '⚔️ 動詞變化大師（對戰）',
  '/game-verbAmuPark': '🎢 動詞變化遊樂園',
  '/game-verb-monopoly': '🏘️ 動詞變化大富翁',
  '/game-vocReviewing': '📖 單字例句總複習',
  '/game-GPSmap': '🌍 單字地圖 GO',
  '/game-ARsniper': '🔫 AR 實境單字狙擊手',
  '/game-shake2shuffle': '🧋 單字搖搖杯',
  '/game-tilt2sort': '⚖️ 左右為難：單字天平',
  '/game-gravitymaze': '🔮 單字迷宮滾滾球',
  '/game-swing2cast': '🪄 霍格華茲單字杖',
  '/game-noropejump': '🏃 單字無繩式跳繩',
  '/game-vocshooting': '🔫 單字飛鼠射擊',
  '/game-tetris': '🧱 單字俄羅斯方塊',
  '/game-pinball': '🎰 單字彈珠台',
  '/game-angrybirds': '🐦 單字憤怒鳥',
  '/game-angrybirds-dual': '🐦 單字憤怒鳥（雙人）',
  '/game-solitaire': '🃏 單字撲克牌接龍',
  '/game-pikavolley': '⚡ 單字皮卡丘排球',
  '/game-pikavolley-dual': '⚡ 單字皮卡丘排球（雙人）',
  '/game-pacman': '👻 單字小精靈',
  '/game-minesweeper': '💣 單字踩地雷',
  '/game-9x9sudoku': '🔢 單字 9×9 數獨',
  '/game-battle': '⚔️ 單字方塊陣',
  '/game-tenchi': '🐎 單字吞食天地',
  '/game-tarot21': '🃏 塔羅 21 點（對戰）',
  '/game-tarot21solo': '🃏 塔羅 21 點（單人）',
  '/game-tarotAlch': '🔮 塔羅鍊金術（對戰）',
  '/game-tarotAlch1': '🔮 塔羅鍊金術（單人）',
  '/game-tarotUno': '🃏 塔羅 UNO（對戰）',
  '/game-tarotUno1': '🃏 塔羅 UNO（單人）'
};

const legacyGameLabels = {
  match: '單字方塊消消樂',
  monopoly: '單字大富翁',
  happyFarm: '單字開心農場',
  isekaiFarm: '單字異世界悠閒農莊',
  vocabularyCandy: '單字 Candy Crush',
  no_record: '尚無活動紀錄'
};

const detailKeys = [
  ['version', '版本'],
  ['volume', '冊別'],
  ['unit', '單元'],
  ['year', '年度'],
  ['game', '遊戲']
];

function cleanPath(path) {
  const raw = String(path || '').trim();
  if (!raw) return { pathname: '', searchParams: new URLSearchParams() };
  try {
    const url = new URL(raw, 'https://student-activity.local');
    const normalized = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
    return { pathname: normalized, searchParams: url.searchParams };
  } catch {
    return { pathname: raw.split('?')[0], searchParams: new URLSearchParams() };
  }
}

export function getStudentActivity(path) {
  const { pathname, searchParams } = cleanPath(path);
  const name = pageLabels[pathname] || (pathname
    ? `📄 未登記頁面：${pathname}`
    : '❔ 未知活動');
  const details = detailKeys.flatMap(([key, label]) => {
    const value = searchParams.get(key);
    return value ? [`${label}：${value}`] : [];
  });
  return { name, details, pathname };
}

export function getGameActivityName(gameType) {
  const value = String(gameType || '').trim();
  if (!value || value === '無紀錄') return '尚無遊戲紀錄';
  return legacyGameLabels[value] || value;
}

export const studentActivityPaths = Object.freeze({ ...pageLabels });
