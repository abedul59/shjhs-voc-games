<script setup>
import { computed, onBeforeUnmount, ref } from 'vue';
import '~/assets/css/board-games.css';
import { GO_SIZE, GO_KOMI, newGoGame, goPlay, goPass, goScore, goToggleDead, chooseGoMove } from '~/lib/vocabulary-go';
import { useBoardVocabulary } from '~/composables/useBoardVocabulary';
const GAME_TYPE='單字圍棋';
const voc=useBoardVocabulary(GAME_TYPE);
const {lesson,words,loading,notice,quiz,saveNotice,correct,wrong,historyLink,leaderboardLink,beginRecord,challenge,answer,cancel,save}=voc;
const state=ref(newGoGame()),started=ref(false),finished=ref(false),thinking=ref(false),result=ref(''),dead=ref(new Set()),finalScore=ref(null),zoomed=ref(true);
let timer=null,disposed=false;
const points=computed(()=>state.value.board.map((stone,index)=>({index,x:index%GO_SIZE,y:Math.floor(index/GO_SIZE),stone})));
const currentScore=computed(()=>goScore(state.value.board,dead.value));
const wordScore=computed(()=>correct.value.length*10+(result.value==='勝利'?100:result.value==='和棋'?40:0));
const rules=[
  ['基本走法','黑棋先行，雙方輪流把棋子放在 19×19 線條的交點。棋子落下後不能移動。'],
  ['氣與提子','棋群上下左右相鄰的空點叫氣。對方棋群沒有氣時整群提走；不能在落子後讓自己沒有氣（禁自殺）。'],
  ['劫與全局同形','不得下一步讓棋盤重現任何先前出現過的局面，因此不能立即提回單劫，也防止循環劫。'],
  ['停著與終局','玩家可選擇停著；雙方連續停著後進入數子。若棋盤上仍有死棋，先在數子畫面標記整組死棋，再確認結果。'],
  ['中國數子法','黑白各計算在盤上的活棋子與所圍空交點；無法只歸屬單方的空點不計。白棋加貼目 7.5 目。分數較高者獲勝。']
];
function begin(){if(timer)clearTimeout(timer);state.value=newGoGame();dead.value=new Set();finalScore.value=null;started.value=true;finished.value=false;thinking.value=false;result.value='';beginRecord();notice.value='你執黑棋先行。點棋盤交點、答對單字後落子。';}
function choose(point){
  if(!started.value||finished.value||thinking.value||quiz.value)return;
  if(state.value.phase==='scoring'){dead.value=goToggleDead(state.value.board,dead.value,point);return;}
  if(state.value.turn!==1)return;
  const next=goPlay(state.value,point);
  if(!next){notice.value='這個交點不能落子（已占用、禁自殺或違反全局同形禁著）。';return;}
  challenge(()=>{state.value=next;notice.value=next.moves.at(-1).taken?`提走 ${next.moves.at(-1).taken} 顆白棋！`:'黑棋落子成功。';scheduleAi();});
}
function pass(){if(!started.value||finished.value||thinking.value||quiz.value||state.value.phase!=='playing'||state.value.turn!==1)return;state.value=goPass(state.value);notice.value='你選擇停著。';scheduleAi();}
function scheduleAi(){
  if(state.value.phase==='scoring'){thinking.value=false;notice.value='雙方連續停著。請標記死棋，再確認數子。';return;}
  thinking.value=true;
  timer=window.setTimeout(()=>{
    if(disposed||finished.value)return;
    const point=state.value.passes===1&&state.value.moves.length>=90?null:chooseGoMove(state.value);
    if(point===null){state.value=goPass(state.value);notice.value='電腦停著。';}
    else {state.value=goPlay(state.value,point);notice.value=`電腦落在 ${'ABCDEFGHJKLMNOPQRST'[point%19]}${19-Math.floor(point/19)}。`;}
    thinking.value=false;
    if(state.value.phase==='scoring')notice.value='雙方連續停著。點選死棋整組標記；可按「繼續下棋」處理未結束的棋，再計分。';
  },950);
}
function resume(){if(state.value.phase!=='scoring')return;state.value={...state.value,phase:'playing',passes:0};dead.value=new Set();notice.value=state.value.turn===1?'繼續對弈，輪到黑棋。':'繼續對弈，輪到白棋。';if(state.value.turn===2)scheduleAi();}
function finish(){
  if(state.value.phase!=='scoring'||finished.value)return;
  finalScore.value=goScore(state.value.board,dead.value);
  result.value=finalScore.value.black>finalScore.value.white?'勝利':finalScore.value.black<finalScore.value.white?'落敗':'和棋';
  finished.value=true;notice.value=`數子完成：黑 ${finalScore.value.black}，白 ${finalScore.value.white}（含貼目 ${GO_KOMI}）；${result.value}。`;
  save(wordScore.value);
}
function resign(){if(!started.value||finished.value||!confirm('確定認輸並結束對局？'))return;if(timer)clearTimeout(timer);finished.value=true;thinking.value=false;result.value='認輸';cancel();notice.value='你已認輸。';save(wordScore.value);}
onBeforeUnmount(()=>{disposed=true;if(timer)clearTimeout(timer);});
</script>
<template>
  <main class="bg-page go-page"><header class="bg-head"><div><span class="bg-kicker">VOCABULARY · GO</span><h1>單字圍棋</h1><p>十九路棋盤 · 中國數子法 · 與電腦對弈</p></div><nav><NuxtLink to="/">← 首頁</NuxtLink><NuxtLink :to="historyLink">學習紀錄</NuxtLink><NuxtLink :to="leaderboardLink">英雄榜</NuxtLink></nav></header>
    <div class="bg-layout"><section class="bg-play"><div class="bg-toolbar"><div><strong>{{finished?`對局結束 · ${result}`:state.phase==='scoring'?'終局數子':thinking?'電腦思考中…':started?'輪到黑棋（你）':'準備對局'}}</strong><small>{{lesson.version}} · {{lesson.volume}} · {{lesson.unit}}</small></div><div><button :disabled="loading||words.length<4||(started&&!finished)" @click="begin">{{started?'再玩一局':'開始遊戲'}}</button><button v-if="started&&!finished&&state.phase==='playing'" class="bg-outline" :disabled="thinking||!!quiz" @click="pass">停著</button><button v-if="started&&!finished&&state.phase==='scoring'" class="bg-outline" @click="resume">繼續下棋</button><button v-if="started&&!finished&&state.phase==='scoring'" @click="finish">確認數子</button><button v-if="started&&!finished" class="bg-outline" @click="resign">認輸</button><button class="bg-outline go-zoom-toggle" :aria-pressed="zoomed" @click="zoomed=!zoomed">{{zoomed?'全盤':'放大棋盤'}}</button></div></div>
      <p class="go-pan-hint">手機可放大棋盤並用手指滑動查看交點。</p>
      <div class="bg-board-container" :class="{'go-zoomed':zoomed}"><div class="go-board" role="grid" aria-label="十九路圍棋棋盤"><button v-for="point in points" :key="point.index" class="go-point" :class="{edgeTop:point.y===0,edgeBottom:point.y===18,edgeLeft:point.x===0,edgeRight:point.x===18,star:[3,9,15].includes(point.x)&&[3,9,15].includes(point.y),dead:dead.has(point.index),recent:state.moves.at(-1)?.point===point.index}" :aria-label="`${'ABCDEFGHJKLMNOPQRST'[point.x]}${19-point.y} ${point.stone===1?'黑棋':point.stone===2?'白棋':'空點'}`" :disabled="!started||finished||thinking||!!quiz" @click="choose(point.index)"><span v-if="point.stone" class="go-stone" :class="point.stone===1?'black':'white'"></span><span v-else-if="[3,9,15].includes(point.x)&&[3,9,15].includes(point.y)" class="go-star"></span></button></div></div>
      <div class="bg-status" role="status">{{notice}}</div><div class="bg-stats"><span>黑棋提子 <b>{{state.captures[1]}}</b></span><span>白棋提子 <b>{{state.captures[2]}}</b></span><span>答對／答錯 <b>{{correct.length}}／{{wrong.length}}</b></span><span>分數 <b>{{wordScore}}</b></span></div><p v-if="saveNotice" class="bg-save">{{saveNotice}} <button v-if="saveNotice.includes('失敗')" @click="save(wordScore)">重試</button></p></section>
      <aside class="bg-guide"><span class="bg-kicker">RULES & SCORING</span><h2>圍棋規則</h2><a class="bg-rule-link" href="https://www.britgo.org/rules/approved" target="_blank" rel="noopener noreferrer">參考國際通行的數子與禁著規則 ↗</a><p class="bg-intro">請點線的交點。單字答錯時不落子，仍輪到你。</p><details v-for="rule in rules" :key="rule[0]" :open="['基本走法','中國數子法'].includes(rule[0])"><summary>{{rule[0]}}</summary><p>{{rule[1]}}</p></details><div class="bg-moves"><h3>盤面估計</h3><p>黑 {{currentScore.black}} 目 · 白 {{currentScore.white}} 目（已含貼目）</p><p>第 {{state.moves.length}} 手 · 黑 {{state.turn===1?'待下':'已下'}}</p><p>計分前若尚有活死未定的棋群，請先繼續下棋處理。</p></div></aside></div>
    <div v-if="quiz" class="bg-overlay"><section class="bg-dialog" role="dialog" aria-modal="true" aria-label="單字題"><span class="bg-kicker">WORD CHALLENGE</span><h2>{{quiz.word.zh_tw}}</h2><p>選出正確英文，才可落子。</p><div><button v-for="(choice,i) in quiz.choices" :key="i" @click="answer(choice.en_us)">{{choice.en_us}}</button></div><button class="bg-cancel" @click="cancel">取消</button></section></div>
  </main>
</template>
<style scoped>
.go-zoom-toggle,.go-pan-hint{display:none}
@media(max-width:700px){
  .go-zoom-toggle,.go-pan-hint{display:block}
  .go-pan-hint{width:100%;margin:4px 0;color:#d9e6d9;font-size:12px}
  .bg-board-container.go-zoomed{display:block;max-height:min(68dvh,560px);overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;border-radius:7px}
  .go-zoomed .go-board{width:min(700px,185vw);max-width:none;margin:0}
  .go-zoomed .go-point{touch-action:auto}
}
</style>
