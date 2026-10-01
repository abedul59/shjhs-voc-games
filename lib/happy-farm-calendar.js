// Keep the farm calendar independent of crop, loan and economy modules.
// Importing economy while the crop catalogue initializes creates a module cycle.
export const taiwanDate = now => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
export const taiwanMonth = now => Number(taiwanDate(now).slice(5, 7));

export function farmDay(now) {
  const date = taiwanDate(now);
  const month = taiwanMonth(now);
  const seed = [...date].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) % 997, 17);
  const wetSeason = month >= 5 && month <= 9;
  const weather = seed % 10 < (wetSeason ? 4 : 6) ? 'sunny' : seed % 10 < 8 ? 'cloudy' : 'rainy';
  const weekday = new Date(`${date}T12:00:00+08:00`).getUTCDay();
  return {
    date, month, weather,
    weatherName: { sunny: '晴天', cloudy: '多雲', rainy: '雨天' }[weather],
    weatherIcon: { sunny: '☀️', cloudy: '☁️', rainy: '🌧️' }[weather],
    season: month <= 2 || month === 12 ? '冬季' : month <= 5 ? '春季' : month <= 8 ? '夏季' : '秋季',
    weekend: weekday === 0 || weekday === 6
  };
}
