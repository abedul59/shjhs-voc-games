export const GAME_ACCESS_CATALOG = [
  ['match', '🟦 方塊消消樂'],
  ['monopoly', '🏘️ 單字大富翁'],
  ['happyFarm', '🌻 單字開心農場'],
  ['isekaiFarm', '✧ 單字異世界悠閒農莊'],
  ['alchemyAtelier', '⚗️ 單字鍊金工房'],
  ['chess', '♔ 單字西洋棋'],
  ['vocabularyCity', '🏙️ 單字城市建造家'],
  ['vocabularyZoo', '🦁 單字模擬動物園'],
  ['vocabularyStairs', '🪜 單字小朋友下樓梯'],
  ['vocabularyCircus', '🎪 單字馬戲團'],
  ['vocabularyCandy', '🍬 單字 Candy Crush'],
  ['vocabularySubway', '🚇 單字地鐵跑酷'],
  ['convenienceStore', '🏪 單字便利商店'],
  ['go', '⚫ 單字圍棋'],
  ['xiangqi', '帥 單字象棋'],
  ['railwayTour', '🚂 單字鐵路旅遊高手'],
  ['verbMonopoly', '🏘️ 動詞變化大富翁'],
  ['move', '🔠 單字神移動'],
  ['choice', '✅ 單字選選樂'],
  ['fill', '⌨️ 單字填一填'],
  ['sentence', '📝 單字例句神絕配'],
  ['listen', '🎧 單字例句順風耳'],
  ['puzzle', '🧩 單字拼起來'],
  ['speakno1', '🗣️ 英語口說學霸-多元評量'],
  ['speak', '🎙️ 單字口說測一測'],
  ['cross', '🔠 單字填字FUN'],
  ['review', '✍️ 單字複習趣'],
  ['picture2meaning', '🖼️ 單字看圖辨義'],
  ['ninja', '🥷 單字音節忍者'],
  ['examListen1', '💯 仿會考-辨識句意'],
  ['examRead1', '📜 會考閱讀考古學（單題）'],
  ['GPSmap', '🌍 單字地圖 GO'],
  ['tetris', '🧱 俄羅斯方塊'],
  ['pinball', '🎰 單字彈珠台'],
  ['angrybirds', '🐦 單字憤怒鳥'],
  ['angrybirdsDual', '🐦 單字憤怒鳥（雙人）'],
  ['solitaire', '🃏 撲克牌接龍'],
  ['pikavolley', '⚡ 皮卡丘排球'],
  ['pikavolleyDual', '⚡ 皮卡丘排球（雙人）'],
  ['pacman', '👻 單字小精靈'],
  ['minesweeper', '💣 單字踩地雷'],
  ['sudoku', '🔢 單字 9x9 數獨'],
  ['tarotUno1', '🃏 塔羅 UNO（單人）'],
  ['tarot21solo', '🃏 塔羅 21 點（單人）'],
  ['tarotAlch1', '🔮 塔羅鍊金術（單人）'],
  ['shake2shuffle', '🧋 單字搖搖杯'],
  ['tilt2sort', '⚖️ 左右為難：單字天平'],
  ['gravitymaze', '🔮 單字迷宮滾滾球'],
  ['swing2cast', '🪄 霍格華茲單字杖'],
  ['ARsniper', '🔫 AR 實境單字狙擊手'],
  ['speakno2', '📖 英語口說學霸-朗讀與說故事'],
  ['KKphonetics', '🔤 KK 音標初學／複習'],
  ['Phonics', '🔤 自然發音初學／複習'],
  ['speakno3', '🎤 英語口說學霸-英語歌唱'],
  ['examRead2', '📜 會考閱讀考古學（題組）'],
  ['gramAmuPark', '🎡 文法遊樂園'],
  ['noropejump', '🏃‍♂️ 單字無繩式跳繩'],
  ['vocshooting', '🔫 單字飛鼠射擊'],
  ['monopolyDual', '🏘️ 單字大富翁（雙人）'],
  ['battle', '⚔️ 單字方塊陣'],
  ['tenchi', '🐎 吞食天地'],
  ['tarot21', '🃏 塔羅 21 點'],
  ['tarotAlch', '🔮 塔羅鍊金術'],
  ['tarotUno', '🃏 塔羅 UNO'],
  ['verbing', '🌀 動詞變化大師'],
  ['verbingDual', '⚔️ 動詞變化大師（對戰）'],
  ['verbAmuPark', '🎢 動詞變化遊樂園'],
  ['vocReviewing', '📖 單字例句總複習']
].map(([id, name]) => ({ id, name }));

export const DEFAULT_GAME_CATEGORIES = [
  { id: 'c1', name: '🕹️ 經典單字遊戲', games: ['monopoly', 'happyFarm', 'isekaiFarm', 'alchemyAtelier', 'convenienceStore', 'vocabularyCity', 'vocabularyZoo', 'railwayTour', 'chess', 'go', 'xiangqi', 'match', 'move', 'choice', 'fill', 'sentence', 'listen', 'puzzle', 'cross', 'review', 'picture2meaning', 'ninja'] },
  { id: 'c2', name: '🏆 體感與趣味挑戰', games: ['shake2shuffle', 'tilt2sort', 'gravitymaze', 'swing2cast', 'ARsniper', 'GPSmap', 'vocshooting', 'noropejump'] },
  { id: 'c3', name: '👾 懷舊街機遊樂場', games: ['vocabularyStairs', 'vocabularyCircus', 'vocabularyCandy', 'vocabularySubway', 'tetris', 'pinball', 'angrybirds', 'solitaire', 'pikavolley', 'pacman', 'minesweeper', 'sudoku'] },
  { id: 'c4', name: '⚔️ 雙人對戰與領域牌組', games: ['monopolyDual', 'pikavolleyDual', 'angrybirdsDual', 'battle', 'tenchi', 'tarot21', 'tarotAlch', 'tarotUno', 'tarotUno1', 'tarot21solo', 'tarotAlch1', 'verbingDual'] },
  { id: 'c5', name: '🎓 考試與口說訓練', games: ['speak', 'speakno1', 'speakno2', 'speakno3', 'KKphonetics', 'Phonics', 'examListen1', 'examRead1', 'examRead2', 'gramAmuPark', 'verbing', 'verbAmuPark', 'verbMonopoly', 'vocReviewing'] }
];

const knownGameIds = new Set(GAME_ACCESS_CATALOG.map((game) => game.id));

export function normalizeGameCategories(source) {
  const input = Array.isArray(source) && source.length ? source : DEFAULT_GAME_CATEGORIES;
  const seen = new Set();
  const categories = input.map((category, index) => {
    const games = [];
    for (const gameId of Array.isArray(category?.games) ? category.games : []) {
      if (!knownGameIds.has(gameId) || seen.has(gameId)) continue;
      seen.add(gameId);
      games.push(gameId);
    }
    return {
      id: category?.id || `cat_${index + 1}`,
      name: category?.name || category?.category_name || `分類 ${index + 1}`,
      games
    };
  });
  const uncategorized = GAME_ACCESS_CATALOG.map((game) => game.id).filter((gameId) => !seen.has(gameId));
  if (uncategorized.length) categories.push({ id: 'uncategorized', name: '📦 尚未分類遊戲', games: uncategorized });
  return categories;
}

export function gamesGroupedByCategory(categories) {
  const gameMap = new Map(GAME_ACCESS_CATALOG.map((game) => [game.id, game]));
  return normalizeGameCategories(categories).map((category) => ({
    ...category,
    games: category.games.map((gameId) => gameMap.get(gameId)).filter(Boolean)
  }));
}
