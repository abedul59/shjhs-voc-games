import { computed, onMounted, ref } from 'vue';

export function useBoardVocabulary(gameType) {
  const db=useSupabaseClient(),route=useRoute(),student=useCookie('currentStudent');
  const lesson={version:String(route.query.version||''),volume:String(route.query.volume||''),unit:String(route.query.unit||'')};
  const words=ref([]),loading=ref(true),notice=ref('正在載入單字…'),quiz=ref(null),saveNotice=ref('');
  const correct=ref([]),wrong=ref([]),startedAt=ref(0),recordId=ref(''),attempt=ref(0);
  const historyLink=computed(()=>({path:'/history',query:{game:gameType}}));
  const leaderboardLink=computed(()=>({path:'/leaderboard',query:{game:gameType,...lesson}}));
  let action=null;
  onMounted(async()=>{
    if (!student.value?.id) {await navigateTo('/');return;}
    if (!lesson.version||!lesson.volume||!lesson.unit) {loading.value=false;notice.value='請先從首頁選擇單字版本、冊次與單元。';return;}
    const {data,error}=await db.from('vocabularies').select('en_us,zh_tw')
      .eq('version',lesson.version).eq('volume',lesson.volume).eq('unit',lesson.unit).limit(1000);
    loading.value=false;
    if (error) {notice.value=`單字載入失敗：${error.message}`;return;}
    const seen=new Set();
    words.value=(data||[]).filter(word=>{
      const key=word.en_us?.trim().toLowerCase();
      if (!key||!word.zh_tw?.trim()||seen.has(key)) return false;
      seen.add(key);return true;
    });
    notice.value=words.value.length>=4?'選好設定後開始對局。':'本課需要至少四筆不同單字，請回首頁更換範圍。';
  });
  function beginRecord() {correct.value=[];wrong.value=[];startedAt.value=Date.now();recordId.value=crypto.randomUUID();attempt.value=0;saveNotice.value='';}
  function challenge(callback) {
    if (words.value.length<4) return;
    const word=words.value[Math.floor(Math.random()*words.value.length)];
    const others=words.value.filter(item=>item.en_us.toLowerCase()!==word.en_us.toLowerCase());
    for (let i=others.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[others[i],others[j]]=[others[j],others[i]];}
    const choices=[word,...others.slice(0,3)];
    for (let i=choices.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
    action=callback;quiz.value={word,choices};
  }
  function answer(choice) {
    if (!quiz.value) return;
    const target=quiz.value.word,yes=choice.trim().toLowerCase()===target.en_us.trim().toLowerCase();
    (yes?correct:wrong).value.push(target.en_us);
    quiz.value=null;
    if (yes) {const callback=action;action=null;callback?.();}
    else {action=null;notice.value=`答錯了：${target.zh_tw}＝${target.en_us}。這步尚未執行，可重新選擇。`;}
  }
  function cancel(){quiz.value=null;action=null;}
  async function save(score){
    if (!recordId.value||!student.value?.id) return;
    if (!attempt.value){const {count}=await db.from('game_records').select('id',{count:'exact',head:true})
      .eq('student_id',String(student.value.id)).eq('game_type',gameType)
      .eq('version',lesson.version).eq('volume',lesson.volume).eq('unit_played',lesson.unit);
      attempt.value=(count||0)+1;
    }
    const {error}=await db.from('game_records').upsert({id:recordId.value,student_id:String(student.value.id),game_type:gameType,
      version:lesson.version,volume:lesson.volume,unit_played:lesson.unit,score,mistakes:wrong.value.length,
      correct_words:correct.value.join(', '),wrong_words:wrong.value.join(', '),attempt_number:attempt.value,
      played_at:new Date(startedAt.value).toISOString(),time_taken_seconds:Math.floor((Date.now()-startedAt.value)/1000),
      device_info:navigator.userAgent},{onConflict:'id'});
    saveNotice.value=error?`儲存失敗：${error.message}`:'本局分數與對錯單字已記錄。';
  }
  return {lesson,words,loading,notice,quiz,saveNotice,correct,wrong,historyLink,leaderboardLink,beginRecord,challenge,answer,cancel,save};
}
