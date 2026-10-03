// Fictional farm boundaries, drawn by hand. Adjacent paths share their seam points.
// The small map partitions each region into four territories; the micro map splits
// the selected territory into six persistent plots. These are gameplay boundaries,
// not claims about an official map.
export const TERRITORY_SHAPES = [
  { path: 'M40 65 150 32 300 45 280 130 310 210 210 190 105 215 30 185Z', x: 158, y: 129 },
  { path: 'M300 45 455 30 560 70 580 170 510 205 410 190 310 210 280 130Z', x: 442, y: 125 },
  { path: 'M30 185 105 215 210 190 310 210 290 315 305 375 170 385 45 350 20 270Z', x: 160, y: 290 },
  { path: 'M310 210 410 190 510 205 580 170 565 290 550 350 445 385 305 375 290 315Z', x: 440, y: 292 }
];

export const FIELD_SHAPES = [
  { path: 'M40 60 150 30 220 42 205 120 225 205 125 185 25 200 18 120Z', x: 117, y: 119 },
  { path: 'M220 42 330 25 405 45 390 130 410 198 315 215 225 205 205 120Z', x: 308, y: 120 },
  { path: 'M405 45 500 36 560 70 580 150 565 205 485 190 410 198 390 130Z', x: 490, y: 120 },
  { path: 'M25 200 125 185 225 205 210 295 235 380 130 370 35 350 20 280Z', x: 119, y: 285 },
  { path: 'M225 205 315 215 410 198 395 290 430 370 330 388 235 380 210 295Z', x: 314, y: 294 },
  { path: 'M410 198 485 190 565 205 582 285 550 350 430 370 395 290Z', x: 490, y: 282 }
];

export const MAP_TINTS = {
  west: ['#829869', '#9ba46e', '#73916c', '#9b8d64'],
  north: ['#a8b6a6', '#809c93', '#93a6a1', '#79918a'],
  south: ['#bba476', '#9d9e6c', '#aa8d66', '#bd9865']
};
