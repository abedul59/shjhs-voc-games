// 標準 9 路 10 列象棋。紅方先走，座標 row 0 為黑方底線。
export const XQ_FILES = 9, XQ_RANKS = 10;
export const xqIndex = (x, y) => y * 9 + x;
export const xqInside = (x, y) => x >= 0 && x < 9 && y >= 0 && y < 10;
export const xqName = { k: ['將', '帥'], a: ['士', '仕'], e: ['象', '相'], h: ['馬', '傌'], r: ['車', '俥'], c: ['砲', '炮'], p: ['卒', '兵'] };
const piece = (type, side) => ({ type, side });
export function newXiangqi() {
  const board = Array(90).fill(null);
  const back = ['r', 'h', 'e', 'a', 'k', 'a', 'e', 'h', 'r'];
  back.forEach((type, x) => { board[xqIndex(x, 0)] = piece(type, 'b'); board[xqIndex(x, 9)] = piece(type, 'r'); });
  for (const x of [1, 7]) { board[xqIndex(x, 2)] = piece('c', 'b'); board[xqIndex(x, 7)] = piece('c', 'r'); }
  for (const x of [0, 2, 4, 6, 8]) { board[xqIndex(x, 3)] = piece('p', 'b'); board[xqIndex(x, 6)] = piece('p', 'r'); }
  return { board, turn: 'r', history: [xqHash(board, 'r')], moves: [], halfmoves: 0 };
}
export const xqHash = (board, turn) => board.map(item => item ? `${item.side}${item.type}` : '..').join('') + turn;
const opposite = side => side === 'r' ? 'b' : 'r';
const palace = (x, y, side) => x >= 3 && x <= 5 && (side === 'r' ? y >= 7 && y <= 9 : y >= 0 && y <= 2);
function pseudo(board, from) {
  const p = board[from]; if (!p) return [];
  const x = from % 9, y = Math.floor(from / 9), result = [];
  function add(nx, ny) {
    if (!xqInside(nx, ny)) return;
    const to = xqIndex(nx, ny), target = board[to];
    if (!target || target.side !== p.side) result.push(to);
  }
  if (p.type === 'k' || p.type === 'a') {
    const offsets = p.type === 'k' ? [[1,0],[-1,0],[0,1],[0,-1]] : [[1,1],[1,-1],[-1,1],[-1,-1]];
    for (const [dx,dy] of offsets) if (palace(x+dx,y+dy,p.side)) add(x+dx,y+dy);
    if (p.type === 'k') {
      for (const dir of [-1,1]) for (let ny=y+dir; ny>=0 && ny<10; ny+=dir) {
        const target=board[xqIndex(x,ny)];
        if (target) { if (target.type==='k' && target.side!==p.side) add(x,ny); break; }
      }
    }
  } else if (p.type === 'e') {
    for (const [dx,dy] of [[2,2],[2,-2],[-2,2],[-2,-2]]) {
      const ny=y+dy;
      if (!xqInside(x+dx,ny) || (p.side==='r' ? ny<5 : ny>4)) continue;
      if (!board[xqIndex(x+dx/2,y+dy/2)]) add(x+dx,ny);
    }
  } else if (p.type === 'h') {
    for (const [dx,dy,legx,legy] of [[2,1,1,0],[2,-1,1,0],[-2,1,-1,0],[-2,-1,-1,0],[1,2,0,1],[-1,2,0,1],[1,-2,0,-1],[-1,-2,0,-1]])
      if (xqInside(x+legx,y+legy) && !board[xqIndex(x+legx,y+legy)]) add(x+dx,y+dy);
  } else if (p.type === 'r' || p.type === 'c') {
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      let screen=false;
      for (let nx=x+dx,ny=y+dy; xqInside(nx,ny); nx+=dx,ny+=dy) {
        const target=board[xqIndex(nx,ny)];
        if (p.type==='r') { if (!target || target.side!==p.side) add(nx,ny); if (target) break; }
        else if (!screen) { if (!target) add(nx,ny); else screen=true; }
        else if (target) { if (target.side!==p.side) add(nx,ny); break; }
      }
    }
  } else if (p.type === 'p') {
    add(x,y+(p.side==='r'?-1:1));
    if (p.side==='r' ? y<=4 : y>=5) { add(x-1,y); add(x+1,y); }
  }
  return result;
}
export function xqCheck(board, side) {
  const king = board.findIndex(p => p?.type==='k' && p.side===side);
  if (king<0) return true;
  return board.some((p,from) => p?.side===opposite(side) && pseudo(board,from).includes(king));
}
export function xqMoves(state, side=state.turn) {
  const list=[];
  state.board.forEach((p,from) => {
    if (p?.side!==side) return;
    for (const to of pseudo(state.board,from)) {
      if (state.board[to]?.type==='k') continue; // 將帥不能被直接吃掉；以將死或困斃結束。
      const board=[...state.board]; board[to]=p; board[from]=null;
      if (!xqCheck(board,side)) list.push({from,to,captured:state.board[to]});
    }
  });
  return list;
}
export function xqMove(state, move) {
  if (!xqMoves(state).some(item=>item.from===move.from && item.to===move.to)) return null;
  const board=[...state.board], captured=board[move.to];
  board[move.to]=board[move.from]; board[move.from]=null;
  const turn=opposite(state.turn), halfmoves=captured ? 0 : state.halfmoves+1;
  const gaveCheck=xqCheck(board,turn);
  return {board,turn,halfmoves,history:[...state.history,xqHash(board,turn)],moves:[...state.moves,{...move,side:state.turn,captured,gaveCheck}]};
}
export function xqResult(state) {
  if (!xqMoves(state).length) return {winner:opposite(state.turn),reason:xqCheck(state.board,state.turn)?'將死':'困斃'};
  if (state.halfmoves>=100) return {winner:null,reason:'雙方各五十步無吃子，和棋'};
  if (!state.board.some(piece=>piece&&['r','c','h','p'].includes(piece.type))) return {winner:null,reason:'雙方子力不足，和棋'};
  const current=state.history.at(-1);
  const repeats=state.history.map((hash,index)=>hash===current?index:-1).filter(index=>index>=0);
  if (repeats.length>=3) {
    const cycle=state.moves.slice(repeats.at(-2),repeats.at(-1));
    const red=cycle.filter(move=>move.side==='r'),black=cycle.filter(move=>move.side==='b');
    const redChecks=red.length>0&&red.every(move=>move.gaveCheck);
    const blackChecks=black.length>0&&black.every(move=>move.gaveCheck);
    if(redChecks!==blackChecks)return {winner:redChecks?'b':'r',reason:'連續長將違規'};
    return {winner:null,reason:'重複局面和棋'};
  }
  // 長捉判例需要進一步裁判；棋面不以此自動判負。
  return null;
}
const VALUES={k:10000,r:900,c:450,h:400,e:200,a:200,p:110};
export function chooseXqMove(state) {
  const side=state.turn, list=xqMoves(state);
  let best=null,bestScore=-Infinity;
  for (const move of list) {
    const after=xqMove(state,move); const result=xqResult(after);
    let score=move.captured ? VALUES[move.captured.type] : 0;
    if (result?.winner===side) score+=100000;
    if (xqCheck(after.board,after.turn)) score+=45;
    let reply=0;
    for (const other of xqMoves(after)) reply=Math.max(reply,other.captured?VALUES[other.captured.type]:0);
    score-=reply*.75;
    score+=Math.random()*18;
    if (score>bestScore) {bestScore=score;best=move;}
  }
  return best;
}
