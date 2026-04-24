<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';

const supabase = useSupabaseClient();
const router = useRouter();
const studentCookie = useCookie('currentStudent');

const gameStatus = ref('selectSong'); // selectSong -> playing -> end
const songs = ref([]);
const selectedSong = ref(null);

const parsedLyrics = ref([]);
const currentTarget = ref(null); // { type: 'word'|'line', text: '...', clean: '' }

const isRecording = ref(false);
const transcript = ref('');
const evalResult = ref(null);

const score = ref(0);
const gameStartTime = ref(0);
const correctWordsList = ref([]);
const wrongWordsSet = ref(new Set());
let recognition = null;

const playTone = (type) => {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator(); const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  if (type === 'correct') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(800, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
  } else {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
  }
  gain.gain.setValueAtTime(0.5, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (type === 'correct'?0.1:0.3));
  osc.start(); osc.stop(ctx.currentTime + (type === 'correct'?0.1:0.3));
};

onMounted(async () => {
  if (!studentCookie.value || !studentCookie.value.id) { alert('請先登入！'); router.push('/'); return; }
  const { data } = await supabase.from('speakno3_songs').select('*').order('created_at', { ascending: false });
  songs.value = data || [];
});

// 🌟 解析歌詞：以換行符號切割句子，保留原本的斷行排版
const parseText = (text) => {
  const lines = text.split('\n').filter(l => l.trim() !== '');
  return lines.map(line => {
    const tokens = line.split(/(\s+|[.,?!;:"]+)/).filter(Boolean);
    const words = tokens.map(token => ({
      raw: token,
      clean: token.replace(/[^a-zA-Z0-9']/g, '').toLowerCase(),
      isPunctuationOrSpace: !/[a-zA-Z0-9]/.test(token)
    }));
    return { raw: line.trim(), words };
  });
};

const startSong = (song) => {
  selectedSong.value = song;
  parsedLyrics.value = parseText(song.lyrics);
  gameStartTime.value = Date.now();
  gameStatus.value = 'playing';
};

const setTarget = (type, rawText, cleanText) => {
  if (isRecording.value) return;
  currentTarget.value = { type, raw: rawText, clean: cleanText || rawText.replace(/[^a-zA-Z0-9'\s]/g, '').toLowerCase() };
  evalResult.value = null;
  playTTS(rawText);
};

const playTTS = (text) => {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = 'en-US'; msg.rate = 0.9;
  window.speechSynthesis.speak(msg);
};

const startRecording = () => {
  if (!currentTarget.value) return alert('請先點擊你想唱的單字或歌詞！');
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) return alert('瀏覽器不支援語音辨識，建議使用 Chrome！');

  transcript.value = ''; evalResult.value = null; isRecording.value = true;
  recognition = new SpeechRec();
  recognition.lang = 'en-US'; recognition.interimResults = false;

  recognition.onresult = (event) => {
    const speech = event.results[0][0].transcript;
    transcript.value = speech;
    evaluateSpeech(speech);
  };
  recognition.onerror = () => { isRecording.value = false; alert('沒聽清楚，請大聲再唱一次！'); };
  recognition.onend = () => { isRecording.value = false; };
  recognition.start();
};

const evaluateSpeech = (speech) => {
  const inputWords = speech.toLowerCase().match(/\b\w+\b/g) || [];
  const targetWords = currentTarget.value.clean.toLowerCase().match(/\b\w+\b/g) || [];
  if (targetWords.length === 0) return;

  if (currentTarget.value.type === 'word') {
    const targetWord = targetWords[0];
    if (inputWords.includes(targetWord) || speech.toLowerCase().includes(targetWord)) {
      playTone('correct'); evalResult.value = { score: 100, text: 'Perfect! 完美音準 🎵' };
      score.value += 10; correctWordsList.value.push(targetWord);
    } else {
      playTone('wrong'); evalResult.value = { score: 0, text: '再試一次喔！ 💪' };
      wrongWordsSet.value.add(targetWord);
    }
  } else {
    let matches = 0;
    targetWords.forEach(tw => { if (inputWords.includes(tw)) matches++; });
    const accuracy = Math.round((matches / targetWords.length) * 100);
    
    if (accuracy >= 80) { playTone('correct'); evalResult.value = { score: accuracy, text: '太好聽了！🌟' }; score.value += 50; }
    else if (accuracy >= 50) { playTone('correct'); evalResult.value = { score: accuracy, text: 'Good job! 👍' }; score.value += 20; }
    else { playTone('wrong'); evalResult.value = { score: accuracy, text: '多練幾次就會更好！💪' }; }
  }
};

const endGame = async () => {
  gameStatus.value = 'end';
  if (!studentCookie.value || !studentCookie.value.id) return;
  try {
    let userIp = 'Unknown'; try { userIp = (await (await fetch('https://api.ipify.org?format=json')).json()).ip; } catch(e){}
    await supabase.from('game_records').insert([{ 
      student_id: studentCookie.value.id, real_name: studentCookie.value.real_name || studentCookie.value.name, class_name: studentCookie.value.class, 
      unit_played: `[歌曲] ${selectedSong.value.title}`, game_type: '英語口說學霸3', score: score.value, time_taken_seconds: Math.round((Date.now() - gameStartTime.value) / 1000),
      correct_words: correctWordsList.value.join(', '), wrong_words: Array.from(wrongWordsSet.value).join(', '),
      device_info: navigator.userAgent, ip_address: userIp, is_anon: studentCookie.value.isAnon || false, browser_id: studentCookie.value.browserId
    }]);
    if (!studentCookie.value.isAnon) {
      const { data } = await supabase.from('students').select('points').eq('id', studentCookie.value.id).single();
      if (data) await supabase.from('students').update({ points: data.points + score.value }).eq('id', studentCookie.value.id);
    }
  } catch(err) { console.error('成績上傳失敗', err); }
};

onUnmounted(() => { if (recognition) recognition.abort(); window.speechSynthesis.cancel(); });
</script>

<template>
  <div class="speak-container">
    <div class="header">
      <NuxtLink to="/" class="back-btn">⬅ 返回首頁</NuxtLink>
      <div v-if="gameStatus === 'playing'" class="score-board">得點：{{ score }} pt</div>
    </div>

    <div v-if="gameStatus === 'selectSong'" class="center-screen">
      <h1>🎤 口說學霸 3<br><small>英語流行歌唱特訓 (八年級)</small></h1>
      <p>請選擇一首你想挑戰的歌曲：</p>
      <div class="song-grid">
        <button v-for="song in songs" :key="song.id" class="song-btn" @click="startSong(song)">
          🎵 {{ song.title }}
        </button>
      </div>
      <p v-if="songs.length === 0" class="empty-msg">老師還沒新增歌曲喔！</p>
    </div>

    <div v-else-if="gameStatus === 'playing'" class="play-screen">
      <h2 class="song-title">{{ selectedSong.title }}</h2>
      
      <div class="yt-section" v-if="selectedSong.youtube_url">
         <a :href="selectedSong.youtube_url" target="_blank" class="yt-play-btn">▶️ 點我前往 YouTube 聽原唱</a>
      </div>
      
      <div class="tip">💡 點擊 🔊 整句發音，點「英文單字」單獨發音。</div>

      <div class="lyrics-content retro-element">
        <div v-for="(line, sIdx) in parsedLyrics" :key="sIdx" class="lyrics-line" :class="{ 'active-target': currentTarget?.raw === line.raw }">
          <button @click="setTarget('line', line.raw)" class="line-play-btn" title="整句發音">🔊</button>
          
          <span v-for="(token, wIdx) in line.words" :key="wIdx">
            <span v-if="token.isPunctuationOrSpace">{{ token.raw }}</span>
            <span v-else class="clickable-word" :class="{ 'active-word': currentTarget?.clean === token.clean }" @click="setTarget('word', token.raw, token.clean)">
              {{ token.raw }}
            </span>
          </span>
        </div>
      </div>

      <div class="control-panel retro-element">
        <div v-if="currentTarget" class="target-display">
          <div class="target-type">{{ currentTarget.type === 'word' ? '📍 當前挑戰單字' : '📍 當前挑戰歌詞' }}</div>
          <div class="target-text">{{ currentTarget.raw }}</div>
        </div>
        <div v-else class="target-display placeholder">請在上方點選你要練習的單字或歌詞！</div>

        <div class="action-buttons">
          <button class="action-btn play-btn" @click="playTTS(currentTarget.raw)" :disabled="!currentTarget">🔊 聽示範</button>
          <button class="action-btn mic-btn" :class="{ recording: isRecording }" @click="startRecording" :disabled="!currentTarget">
            {{ isRecording ? '🎙️ 聆聽中...' : '🎙️ 按下開口唱' }}
          </button>
        </div>

        <div class="result-box" v-if="transcript">
          <p class="transcript">你唱的是：<br><strong>{{ transcript }}</strong></p>
          <div class="eval-result" :class="{ good: evalResult?.score >= 60, bad: evalResult?.score < 60 }">
            {{ evalResult?.text }} (精準度: {{ evalResult?.score }}%)
          </div>
        </div>

        <button class="end-btn" @click="endGame">🛑 結束挑戰並上傳成績</button>
      </div>
    </div>

    <div v-else-if="gameStatus === 'end'" class="center-screen">
      <h1>🎉 恭喜完成歌唱挑戰！</h1>
      <h2>總得分：{{ score }} pt</h2>
      <NuxtLink to="/" class="end-home-btn">返回首頁</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.speak-container { max-width: 800px; margin: 0 auto; padding: 20px; font-family: 'Comic Sans MS', 'PingFang TC', sans-serif; min-height: 100vh;}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.back-btn { text-decoration: none; font-weight: bold; color: #1976d2; border: 2px solid #1976d2; padding: 5px 15px; border-radius: 8px;}
.score-board { font-size: 1.2rem; font-weight: bold; background: #fff8e1; padding: 5px 15px; border-radius: 20px; color: #f57f17; border: 2px solid #fbc02d;}

.center-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 70vh; text-align: center;}
h1 { font-size: 2.2rem; color: #e91e63; margin-bottom: 10px;}
h1 small { font-size: 1.2rem; color: #888; display: block; margin-top: 5px;}

.song-grid { display: flex; flex-direction: column; gap: 15px; width: 100%; max-width: 500px; margin: 20px 0;}
.song-btn { background: white; border: 2px solid #e91e63; padding: 15px; border-radius: 12px; font-size: 1.2rem; font-weight: bold; color: #c2185b; cursor: pointer; transition: 0.2s;}
.song-btn:hover { background: #fce4ec; transform: translateY(-2px);}

.song-title { text-align: center; color: #e91e63; font-size: 1.8rem; margin-bottom: 15px;}
.yt-section { text-align: center; margin-bottom: 20px; }
.yt-play-btn { display: inline-block; background: #ff0000; color: white; text-decoration: none; padding: 10px 20px; border-radius: 25px; font-weight: bold; box-shadow: 0 4px 0 #b71c1c; transition: 0.1s;}
.yt-play-btn:active { transform: translateY(4px); box-shadow: none; }
.tip { text-align: center; color: #1565c0; font-weight: bold; margin-bottom: 15px; font-size: 0.95rem;}

.lyrics-content { background: #fff; padding: 20px; border-radius: 16px; border: 2px solid #e0e0e0; font-size: 1.3rem; margin-bottom: 20px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: center;}
.lyrics-line { margin-bottom: 10px; padding: 5px; border-radius: 8px; transition: 0.2s; }
.lyrics-line:hover { background: #f5f5f5; }
.lyrics-line.active-target { background: #fce4ec; border: 1px dashed #f06292; }
.line-play-btn { background: transparent; border: none; cursor: pointer; font-size: 1.2rem; padding: 0 5px; opacity: 0.6; transition: 0.2s;}
.line-play-btn:hover { opacity: 1; transform: scale(1.2);}
.clickable-word { cursor: pointer; color: #2c3e50; border-bottom: 1px dashed #ccc; transition: 0.2s;}
.clickable-word:hover { color: #e91e63; border-bottom-color: #e91e63; background: #fce4ec; border-radius: 4px;}
.clickable-word.active-word { color: #c2185b; font-weight: bold; background: #f8bbd0; border-bottom: none; border-radius: 4px; padding: 0 2px;}

.control-panel { background: #f8f9fa; border: 2px solid #cfd8dc; border-radius: 16px; padding: 20px; text-align: center;}
.target-display { background: white; padding: 15px; border-radius: 12px; border: 1px solid #ddd; margin-bottom: 15px; min-height: 80px; display: flex; flex-direction: column; justify-content: center;}
.target-display.placeholder { color: #999; font-style: italic; }
.target-type { font-size: 0.85rem; color: #666; font-weight: bold; margin-bottom: 5px;}
.target-text { font-size: 1.5rem; font-weight: bold; color: #c2185b; word-break: break-word;}

.action-buttons { display: flex; gap: 15px; justify-content: center; margin-bottom: 15px;}
.action-btn { flex: 1; padding: 15px; border-radius: 12px; font-size: 1.2rem; font-weight: bold; border: none; cursor: pointer; box-shadow: 0 4px 0 rgba(0,0,0,0.2);}
.action-btn:active { transform: translateY(4px); box-shadow: none;}
.play-btn { background: #4caf50; color: white; box-shadow: 0 4px 0 #388e3c;}
.mic-btn { background: #2196f3; color: white; box-shadow: 0 4px 0 #1565c0;}
.mic-btn.recording { background: #f44336; animation: pulse 1s infinite; box-shadow: 0 4px 0 #c62828;}

.result-box { background: white; border: 2px dashed #ccc; padding: 15px; border-radius: 12px; margin-bottom: 15px; animation: popIn 0.3s ease;}
.transcript { margin: 0 0 10px 0; color: #555; }
.transcript strong { color: #333; font-size: 1.2rem;}
.eval-result { font-weight: bold; font-size: 1.3rem; padding: 10px; border-radius: 8px;}
.eval-result.good { background: #e8f5e9; color: #2e7d32;}
.eval-result.bad { background: #ffebee; color: #c62828;}

.end-btn { width: 100%; background: transparent; border: 2px solid #e53935; color: #e53935; padding: 10px; border-radius: 8px; font-weight: bold; cursor: pointer;}
.end-home-btn { display: inline-block; background: #e91e63; color: white; font-weight: bold; padding: 15px 40px; border-radius: 30px; text-decoration: none; font-size: 1.2rem; margin-top: 20px;}

@keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }
@keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
</style>