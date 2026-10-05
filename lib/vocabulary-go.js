// 19路圍棋；採中國數子法與全局同形禁著（positional superko）。
export const GO_SIZE = 19;
export const GO_KOMI = 7.5;
export const goIndex = (x, y) => y * GO_SIZE + x;
export const goNeighbors = (point) => {
  const x = point % GO_SIZE, y = Math.floor(point / GO_SIZE);
  return [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
    .filter(([cx, cy]) => cx >= 0 && cy >= 0 && cx < GO_SIZE && cy < GO_SIZE)
    .map(([cx, cy]) => goIndex(cx, cy));
};
export function newGoGame() {
  const board = Array(GO_SIZE * GO_SIZE).fill(0);
  return { board, turn: 1, passes: 0, captures: [0, 0, 0], history: [board.join('')], moves: [], phase: 'playing' };
}
export function goGroup(board, start) {
  const color = board[start], stones = new Set([start]), liberties = new Set(), stack = [start];
  while (stack.length) {
    for (const next of goNeighbors(stack.pop())) {
      if (!board[next]) liberties.add(next);
      else if (board[next] === color && !stones.has(next)) { stones.add(next); stack.push(next); }
    }
  }
  return { stones, liberties };
}
export function goPlay(state, point) {
  if (state.phase !== 'playing' || state.board[point] || point < 0 || point >= GO_SIZE * GO_SIZE) return null;
  const color = state.turn, enemy = 3 - color, board = [...state.board];
  board[point] = color;
  let taken = 0;
  for (const neighbor of goNeighbors(point)) {
    if (board[neighbor] !== enemy) continue;
    const group = goGroup(board, neighbor);
    if (group.liberties.size === 0) {
      for (const stone of group.stones) { board[stone] = 0; taken++; }
    }
  }
  if (goGroup(board, point).liberties.size === 0) return null;
  const hash = board.join('');
  if (state.history.includes(hash)) return null;
  const captures = [...state.captures]; captures[color] += taken;
  return { ...state, board, turn: enemy, passes: 0, captures, history: [...state.history, hash],
    moves: [...state.moves, { color, point, taken }] };
}
export function goPass(state) {
  if (state.phase !== 'playing') return state;
  const passes = state.passes + 1;
  return { ...state, turn: 3 - state.turn, passes, phase: passes === 2 ? 'scoring' : 'playing',
    moves: [...state.moves, { color: state.turn, pass: true }] };
}
export function goScore(board, dead = new Set()) {
  const working = board.map((stone, index) => dead.has(index) ? 0 : stone);
  const score = { black: 0, white: GO_KOMI }, visited = new Set();
  for (let point = 0; point < working.length; point++) {
    if (working[point] === 1) { score.black++; continue; }
    if (working[point] === 2) { score.white++; continue; }
    if (visited.has(point)) continue;
    const area = new Set([point]), edges = new Set(), stack = [point]; visited.add(point);
    while (stack.length) {
      for (const next of goNeighbors(stack.pop())) {
        if (working[next]) edges.add(working[next]);
        else if (!visited.has(next)) { visited.add(next); area.add(next); stack.push(next); }
      }
    }
    if (edges.size === 1) { if (edges.has(1)) score.black += area.size; else score.white += area.size; }
  }
  return score;
}
export function goToggleDead(board, dead, point) {
  if (!board[point]) return dead;
  const next = new Set(dead);
  for (const stone of goGroup(board, point).stones) { if (dead.has(stone)) next.delete(stone); else next.add(stone); }
  return next;
}
export function chooseGoMove(state) {
  const occupied = [];
  for (let i = 0; i < state.board.length; i++) if (state.board[i]) occupied.push(i);
  const opening = [goIndex(3, 3), goIndex(15, 15), goIndex(3, 15), goIndex(15, 3), goIndex(9, 9)];
  const candidates = new Set(occupied.length < 3 ? opening : []);
  for (const point of occupied) {
    const x = point % GO_SIZE, y = Math.floor(point / GO_SIZE);
    for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < GO_SIZE && ny < GO_SIZE && !state.board[goIndex(nx, ny)]) candidates.add(goIndex(nx, ny));
    }
  }
  if (!candidates.size) for (let i = 0; i < state.board.length; i++) if (!state.board[i]) candidates.add(i);
  let best = null, bestScore = -Infinity;
  for (const point of candidates) {
    const after = goPlay(state, point);
    if (!after) continue;
    const group = goGroup(after.board, point);
    const x = point % GO_SIZE, y = Math.floor(point / GO_SIZE);
    const neighbors = goNeighbors(point);
    const enemyAdj = neighbors.filter(next => state.board[next] === 3 - state.turn).length;
    const ownAdj = neighbors.filter(next => state.board[next] === state.turn).length;
    const ownEye = ownAdj === neighbors.length;
    const score = (after.captures[state.turn] - state.captures[state.turn]) * 12
      + Math.min(group.liberties.size, 7) * .35 + enemyAdj * 1.1
      + (occupied.length < 16 ? (x === 3 || x === 15 ? 1 : 0) + (y === 3 || y === 15 ? 1 : 0) : 0)
      - (group.liberties.size === 1 ? 9 : 0) - (ownEye ? 20 : 0)
      - (ownAdj >= 3 && !enemyAdj ? 4 : 0) + Math.random() * 1.8;
    if (score > bestScore) { bestScore = score; best = point; }
  }
  return bestScore < -2 ? null : best;
}
