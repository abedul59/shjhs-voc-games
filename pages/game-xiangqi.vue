<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import '~/assets/css/board-games.css';
import { newXiangqi, xqCheck, xqIndex, xqMove, xqMoves, xqName, xqResult, chooseXqMove } from '~/lib/vocabulary-xiangqi';
import { useBoardVocabulary } from '~/composables/useBoardVocabulary';
const GAME_TYPE='單字象棋';
const voc=useBoardVocabulary(GAME_TYPE);
const {lesson,words,loading,notice,quiz,saveNotice,correct,wrong,historyLink,leaderboardLink,beginRecord,challenge,answer,cancel,save}=voc;
const state=ref(newXiangqi()),selected=ref(-1),started=ref(false),finished=ref(false),thinking=ref(false),result=ref('');
let timer=null,disposed=false;
const cells=computed(()=>Array.from({length:90},(_,index)=>({index,x:index%9,y:Math.floor(index/9),piece:state.value.board[index]})));
const legal=computed(()=>selected.value<0?[]:xqMoves(state.value).filter(move=>move.from===selected.value).map(move=>move.to));
const playerTurn=computed(()=>state.value.turn==='r'&&!thinking.value&&!finished.value);
const wordScore=computed(()=>correct.value.length*10+(result.value==='勝利'?100:result.value==='和棋'?40:0));
const lastMove=computed(()=>state.value.moves.at(-1));
const rules=[
  ['勝負與先手','紅方先走；把對方將／帥將死，或使對方無合法著法（困斃），即獲勝。不能直接吃掉將帥。'],
  ['將與士','將／帥在九宮內直走一格；士／仕在九宮內斜走一格。兩將帥不得無子相隔而照面。'],
  ['象與馬','象／相走田字、不能過河，象眼被塞不能走；馬走日字，蹩馬腿時不能走。'],
  ['車與炮','車沿橫豎線行走與吃子；炮平時同車，吃子時必須隔恰好一個炮架。'],
  ['卒與兵','過河前只可向前一步；過河後也可向左右一步，不能後退。'],
  ['和棋','本遊戲採雙方各 50 步無吃子和棋。重複局面中的連續長將判負；長捉的特殊裁判判例需由正式賽事裁判處理。']
];
function begin(){if(timer)clearTimeout(timer);state.value=newXiangqi();selected.value=-1;started.value=true;finished.value=false;thinking.value=false;result.value='';beginRecord();notice.value='紅方先行。點選紅色棋子，再點亮起的合法落點。';}
function choose(index){
  if(!started.value||!playerTurn.value||quiz.value)return;
  if(selected.value>=0&&legal.value.includes(index)){
    const move={from:selected.value,to:index};selected.value=-1;
    challenge(()=>play(move));notice.value='答對單字才能走這一步。';return;
  }
  selected.value=state.value.board[index]?.side==='r'?index:-1;
}
function play(move){
  const next=xqMove(state.value,move);
  if(!next){notice.value='這步棋已不合法，請重新選擇。';return;}
  state.value=next;
  notice.value=`你走了 ${labelMove(move)}。${xqCheck(next.board,'b')?'黑將被將軍！':''}`;
  if(endIfNeeded())return;
  thinking.value=true;
  timer=window.setTimeout(()=>{
    if(disposed||finished.value)return;
    const reply=chooseXqMove(state.value);
    if(reply){state.value=xqMove(state.value,reply);notice.value=`電腦走了 ${labelMove(reply)}。${xqCheck(state.value.board,'r')?'紅帥被將軍，必須解將。':'輪到你。'}`;}
    thinking.value=false;endIfNeeded();
  },1000);
}
function labelMove(move){return `${'abcdefghi'[move.from%9]}${Math.floor(move.from/9)} → ${'abcdefghi'[move.to%9]}${Math.floor(move.to/9)}`;}
function endIfNeeded(){
  const ending=xqResult(state.value);if(!ending)return false;
  finished.value=true;thinking.value=false;result.value=ending.winner==='r'?'勝利':ending.winner==='b'?'落敗':'和棋';
  notice.value=`${ending.reason}：${result.value}。`;save(wordScore.value);return true;
}
function resign(){if(!started.value||finished.value||!confirm('確定認輸並結束對局？'))return;if(timer)clearTimeout(timer);finished.value=true;thinking.value=false;result.value='認輸';cancel();notice.value='你已認輸。';save(wordScore.value);}
onBeforeUnmount(()=>{disposed=true;if(timer)clearTimeout(timer);});
</script>
<template>
  <main class="bg-page xq-page"><header class="bg-head"><div><span class="bg-kicker">VOCABULARY · XIANGQI</span><h1>單字象棋</h1><p>紅方先行 · 與電腦對弈 · 答對單字才能走棋</p></div><nav><NuxtLink to="/">← 首頁</NuxtLink><NuxtLink :to="historyLink">學習紀錄</NuxtLink><NuxtLink :to="leaderboardLink">英雄榜</NuxtLink></nav></header>
    <div class="bg-layout"><section class="bg-play"><div class="bg-toolbar"><div><strong>{{finished?`對局結束 · ${result}`:thinking?'電腦思考中…':started?'輪到紅方（你）':'準備對局'}}</strong><small>{{lesson.version}} · {{lesson.volume}} · {{lesson.unit}}</small></div><div><button :disabled="loading||words.length<4||(started&&!finished)" @click="begin">{{started?'再玩一局':'開始遊戲'}}</button><button v-if="started&&!finished" class="bg-outline" @click="resign">認輸</button></div></div>
      <div class="bg-board-container"><div class="xq-board" role="grid" aria-label="象棋棋盤"><button v-for="cell in cells" :key="cell.index" class="xq-cell" :class="{riverTop:cell.y===4,riverBottom:cell.y===5,selected:selected===cell.index,target:legal.includes(cell.index),recent:lastMove&&[lastMove.from,lastMove.to].includes(cell.index)}" :aria-label="`${cell.x+1}路${cell.y+1}列 ${cell.piece?cell.piece.side==='r'?'紅':'黑':''}${cell.piece?xqName[cell.piece.type][cell.piece.side==='r'?1:0]:'空點'}`" :disabled="!started||finished||thinking||!!quiz" @click="choose(cell.index)"><span v-if="cell.piece" class="xq-piece" :class="cell.piece.side==='r'?'red':'black'">{{xqName[cell.piece.type][cell.piece.side==='r'?1:0]}}</span><span v-else-if="legal.includes(cell.index)" class="xq-hint"></span></button><svg class="xq-palaces" viewBox="0 0 9 10" preserveAspectRatio="none" aria-hidden="true"><path d="M3.5 .5 5.5 2.5 M5.5 .5 3.5 2.5 M3.5 7.5 5.5 9.5 M5.5 7.5 3.5 9.5" /></svg><div class="xq-river-title">楚　河　　漢　界</div></div></div>
      <div class="bg-status" role="status">{{notice}}</div><div class="bg-stats"><span>答對 <b>{{correct.length}}</b></span><span>答錯 <b>{{wrong.length}}</b></span><span>分數 <b>{{wordScore}}</b></span><span>步數 <b>{{state.moves.length}}</b></span></div><p v-if="saveNotice" class="bg-save">{{saveNotice}} <button v-if="saveNotice.includes('失敗')" @click="save(wordScore)">重試</button></p></section>
      <aside class="bg-guide"><span class="bg-kicker">RULES & MOVES</span><h2>象棋規則</h2><a class="bg-rule-link" href="https://www.wxf-xiangqi.org/images/wxf-rules/2018_World_XiangQi_Rules_English2018.pdf" target="_blank" rel="noopener noreferrer">世界象棋聯合會規則 ↗</a><p class="bg-intro">先選棋子，再選金色提示點。單字答錯時棋步不會執行。</p><details v-for="rule in rules" :key="rule[0]" :open="['勝負與先手','車與炮'].includes(rule[0])"><summary>{{rule[0]}}</summary><p>{{rule[1]}}</p></details><div class="bg-moves"><h3>走棋紀錄</h3><div><span v-for="(move,i) in state.moves" :key="i">{{i+1}}. {{labelMove(move)}}</span><small v-if="!state.moves.length">開始後顯示記錄</small></div></div></aside></div>
    <div v-if="quiz" class="bg-overlay"><section class="bg-dialog" role="dialog" aria-modal="true" aria-label="單字題"><span class="bg-kicker">WORD CHALLENGE</span><h2>{{quiz.word.zh_tw}}</h2><p>選出正確英文，才可完成棋步。</p><div><button v-for="(choice,i) in quiz.choices" :key="i" @click="answer(choice.en_us)">{{choice.en_us}}</button></div><button class="bg-cancel" @click="cancel">取消</button></section></div>
  </main>
</template>
