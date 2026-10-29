export const SCHOOL_HOURS_LABEL = '週一至週五 07:30–16:45';

export const isTaipeiSchoolHours = (date = new Date()) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Taipei',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(date).filter(part => part.type !== 'literal').map(part => [part.type, part.value]));

  if (!['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(parts.weekday)) return false;
  const minutes = Number(parts.hour) * 60 + Number(parts.minute);
  return minutes >= 7 * 60 + 30 && minutes <= 16 * 60 + 45;
};

export const effectiveGameWhitelist = (regularGames, schoolHoursGames, date = new Date()) => {
  const regular = Array.isArray(regularGames) ? regularGames : ['ALL'];
  const school = Array.isArray(schoolHoursGames) ? schoolHoursGames : ['ALL'];
  return isTaipeiSchoolHours(date) ? school : regular;
};
