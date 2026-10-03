// Fictional farm boundaries, drawn by hand. Adjacent paths share their seam points.
// The middle map partitions each region into four territories; the small map
// shows one territory's local terrain. The micro map splits that territory into
// one homestead parcel and six contested frontier parcels. These are gameplay boundaries,
// not claims about an official map.
export const TERRITORY_SHAPES = [
  { path: 'M40 65 150 32 300 45 280 130 310 210 210 190 105 215 30 185Z', x: 158, y: 129 },
  { path: 'M300 45 455 30 560 70 580 170 510 205 410 190 310 210 280 130Z', x: 442, y: 125 },
  { path: 'M30 185 105 215 210 190 310 210 290 315 305 375 170 385 45 350 20 270Z', x: 160, y: 290 },
  { path: 'M310 210 410 190 510 205 580 170 565 290 550 350 445 385 305 375 290 315Z', x: 440, y: 292 }
];

export const FIELD_SHAPES = [
  { path: 'M26 56 150 28 300 36 300 105 205 135 185 230 100 205 22 181Z', x: 128, y: 119 },
  { path: 'M300 36 459 22 570 59 504 182 430 225 405 140 300 105Z', x: 464, y: 111 },
  { path: 'M570 59 585 170 504 182 430 225 475 275 585 300Z', x: 537, y: 216 },
  { path: 'M22 181 100 205 185 230 255 310 190 392 80 365 20 300Z', x: 112, y: 290 },
  { path: 'M255 310 365 310 350 405 190 392Z', x: 285, y: 359 },
  { path: 'M430 225 475 275 585 300 530 365 350 405 365 310Z', x: 481, y: 333 }
];

export const HOMESTEAD_SHAPE = { path: 'M205 135 300 105 405 140 430 225 365 310 255 310 185 230Z', x: 307, y: 208 };

export const MAP_TINTS = {
  west: ['#829869', '#9ba46e', '#73916c', '#9b8d64'],
  north: ['#a8b6a6', '#809c93', '#93a6a1', '#79918a'],
  south: ['#bba476', '#9d9e6c', '#aa8d66', '#bd9865']
};

// Fictional landmarks distinguish the twelve playable territories at the small scale.
export const LOCAL_LANDMARKS = {
  fittoa: ['麥田村', '花徑', '南溪渡口'], asura: ['王都驛道', '豐穗市集', '東畦'],
  riverland: ['上游水車', '河灣', '苔石橋'], foothills: ['山口哨所', '紅石坡', '牧草谷'],
  ranoa: ['學院驛道', '白霜原', '雪松谷'], basherant: ['伐木營', '鹿跡林', '蘑菇溪'],
  'northern-ridge': ['風雪隘口', '晶礦坡', '北崖'], 'east-wood': ['東林入口', '古樹群', '幽光潭'],
  kingdragon: ['王龍渡口', '暖風田', '南谷'], shirone: ['邊境關口', '白石溪', '南方市集'],
  sanakia: ['稻田水渠', '濕地村', '竹林坡'], kikka: ['油籽坡', '南端風車', '金砂溪']
};
