<script setup>
import { ref, onMounted, computed } from 'vue';
import Papa from 'papaparse';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();
const records = ref([]);
const isLoading = ref(true);

const selectedGameType = ref('單字方塊消消樂'); 
const identityMode = ref('student'); 

const showStudentModal = ref(false);
const selectedStudent = ref(null);
const showModal = ref(false);
const isEditing = ref(false);
const formData = ref({ id: null, student_id: '', version: '', volume: '', unit_played: '', score: 0, time_taken_seconds: 0, mistakes: 0, wrong_words: '', correct_words: '', device_info: '' });

const parseDevice = (ua) => {
  if (!ua) return '未知';
  if (ua.includes('iPhone')) return '📱 iPhone';
  if (ua.includes('iPad')) return '📱 iPad';
  if (ua.includes('Android')) return '📱 Android';
  if (ua.includes('Windows')) return '💻 Windows';
  if (ua.includes('Mac OS')) return '💻 Mac';
  return '🖥️ 其他';
};

const formatDateTime = (dateString) => {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const formatIntervals = (jsonObj) => {
  if (!jsonObj) return [];
  
  let parsedObj = jsonObj;
  if (typeof jsonObj === 'string') {
    try { parsedObj = JSON.parse(jsonObj); } catch (e) { return []; }
  }

  return Object.entries(parsedObj)
    .filter(([word, time]) => time !== null && time !== undefined && time !== '' && !isNaN(parseFloat(time)))
    .map(([word, time]) => ({ word, time: parseFloat(time) }))
    .sort((a, b) => b.time - a.time);
};

const fetchRecords = async () => {
  isLoading.value = true;
  const { data: gameData } = await supabase.from('game_records').select('*').order('played_at', { ascending: false }).limit(10000);
  const { data: studentData } = await supabase.from('students').select('student_id, real_name, class_name, seat_number, school').limit(10000);

  if (gameData && studentData) {
    const studentMap = {};
    studentData.forEach(stu => studentMap[stu.student_id] = stu);
    records.value = gameData.map(record => {
      const stu = studentMap[record.student_id] || {};
      const isAnon = record.student_id.startsWith('anon_');
      return {
        ...record,
        real_name: isAnon ? `匿名 (${record.student_id.split('_')[1]?.substring(0,4)})` : (stu.real_name || '未知'),
        class_name: isAnon ? '無' : (stu.class_name || '未知'),
        seat_number: isAnon ? '-' : (stu.seat_number || '-'),
        school: isAnon ? '無' : (stu.school || '未知'),
        short_device: parseDevice(record.device_info),
        formatted_datetime: formatDateTime(record.played_at),
        isAnonRecord: isAnon
      };
    });
  }
  isLoading.value = false;
};

onMounted(fetchRecords);

const filteredRecords = computed(() => {
  return records.value.filter(r => {
    const type = r.game_type || '單字方塊消消樂';
    const identityMatch = identityMode.value === 'student' ? !r.isAnonRecord : r.isAnonRecord;
    return type === selectedGameType.value && identityMatch;
  });
});

const openStudentHistory = (studentId) => {
  const history = filteredRecords.value.filter(r => r.student_id === studentId);
  if (!history.length) return;
  const basicInfo = history[0];
  const unitStats = {};
  history.forEach(r => {
    if (!unitStats[r.unit_played]) unitStats[r.unit_played] = { totalScore: 0, count: 0 };
    unitStats[r.unit_played].totalScore += r.score;
    unitStats[r.unit_played].count++;
  });
  const averages = Object.keys(unitStats).map(unit => ({ unit, avg: Math.round(unitStats[unit].totalScore / unitStats[unit].count), timesPlayed: unitStats[unit].count }));
  selectedStudent.value = { id: studentId, name: basicInfo.real_name, className: basicInfo.class_name, seat: basicInfo.seat_number, history: history, averages: averages };
  showStudentModal.value = true;
};

const openAddModal = () => { isEditing.value = false; formData.value = { id: null, student_id: '', version: '康軒', volume: 'B1', unit_played: 'L1', score: 100, time_taken_seconds: 15, mistakes: 0, wrong_words: '', correct_words: '', device_info: '手動輸入' }; showModal.value = true; };
const openEditModal = (record) => { isEditing.value = true; formData.value = { ...record }; showModal.value = true; };

const saveRecord = async () => {
  if (!formData.value.student_id || !formData.value.unit_played) { alert('學號與單元為必填！'); return; }
  const payload = {
    student_id: formData.value.student_id, game_type: selectedGameType.value, version: formData.value.version, volume: formData.value.volume,
    unit_played: formData.value.unit_played, score: formData.value.score, time_taken_seconds: formData.value.time_taken_seconds,
    mistakes: formData.value.mistakes, wrong_words: formData.value.wrong_words, correct_words: formData.value.correct_words, device_info: formData.value.device_info
  };
  if (isEditing.value) await supabase.from('game_records').update(payload).eq('id', formData.value.id);
  else await supabase.from('game_records').insert([payload]);
  showModal.value = false; fetchRecords();
};

const deleteRecord = async (id) => { if (!confirm('⚠️ 確定要刪除這筆成績紀錄嗎？')) return; await supabase.from('game_records').delete().eq('id', id); fetchRecords(); };

const exportToCSV = () => {
  if (filteredRecords.value.length === 0) return alert('目前沒有任何成績可以匯出！');
  const exportData = filteredRecords.value.map(r => ({
    '測驗時間': r.formatted_datetime, '學校': r.school, '班級': r.class_name, '座號': r.seat_number, '學號': r.student_id, '姓名': r.real_name,
    '遊戲模式': r.game_type || '單字方塊消消樂', '教科書版本': r.version, '冊數': r.volume, '單元(課)': r.unit_played,
    '分數': r.score, '耗時(秒)': r.time_taken_seconds, '錯誤次數': r.mistakes, 
    '不熟單字(錯)': r.wrong_words || '無', '熟練單字(對)': r.correct_words || '無',
    'IP位址': r.ip_address || '無紀錄', '設備ID與資訊': r.device_info || '無紀錄'
  }));
  const csvString = Papa.unparse(exportData);
  const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
  link.download = `${selectedGameType.value}_${identityMode.value === 'student' ? '實名' : '匿名'}_報表.csv`;
  link.click();
};
</script>

<template>
  <div class="admin-container">
    <div class="header"><h1>🏆 成績與紀錄</h1></div>
    <div class="top-actions">
      <NuxtLink to="/admin" class="retro-btn back-btn">← 返回</NuxtLink>
      <div class="action-group">
        <button class="retro-btn add-btn" @click="openAddModal">➕ 補登</button>
        <button class="retro-btn export-btn" @click="exportToCSV" :disabled="isLoading">📊 匯出CSV</button>
      </div>
    </div>

    <div class="filters-panel retro-element">
<div class="game-type-tabs">
        <button class="type-btn" :class="{ active: selectedGameType === '單字方塊消消樂' }" @click="selectedGameType = '單字方塊消消樂'">🟦 方塊</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字神移動' }" @click="selectedGameType = '單字神移動'">🔠 移動</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字選選樂' }" @click="selectedGameType = '單字選選樂'">✅ 選擇</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字填一填' }" @click="selectedGameType = '單字填一填'">⌨️ 填空</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字例句神絕配' }" @click="selectedGameType = '單字例句神絕配'">📝 例句</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字例句順風耳' }" @click="selectedGameType = '單字例句順風耳'">🎧 聽力</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字拼起來' }" @click="selectedGameType = '單字拼起來'">🧩 拼圖</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字口說測一測' }" @click="selectedGameType = '單字口說測一測'">🎙️ 口說</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字填字FUN' }" @click="selectedGameType = '單字填字FUN'">🔠 填字</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字複習趣' }" @click="selectedGameType = '單字複習趣'">✍️ 複習</button>
        
        <button class="type-btn" :class="{ active: selectedGameType === '單字撲克牌接龍' }" @click="selectedGameType = '單字撲克牌接龍'">🃏 接龍</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字踩地雷' }" @click="selectedGameType = '單字踩地雷'">💣 踩地雷</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字9x9數獨' }" @click="selectedGameType = '單字9x9數獨'">🔢 數獨</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅21點(單人)' }" @click="selectedGameType = '單字塔羅21點(單人)'">🃏 塔羅21(單)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅鍊金術(單人)' }" @click="selectedGameType = '單字塔羅鍊金術(單人)'">🔮 鍊金術(單)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅UNO(單人)' }" @click="selectedGameType = '單字塔羅UNO(單人)'">🃏 塔羅UNO(單)</button>

        <button class="type-btn" :class="{ active: selectedGameType === '單字方塊陣' }" @click="selectedGameType = '單字方塊陣'">⚔️ 對戰方塊</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字吞食天地' }" @click="selectedGameType = '單字吞食天地'">🐎 吞食天地</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅21點' }" @click="selectedGameType = '單字塔羅21點'">🃏 塔羅21(雙)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅鍊金術' }" @click="selectedGameType = '單字塔羅鍊金術'">🔮 鍊金術(雙)</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字塔羅UNO對決' }" @click="selectedGameType = '單字塔羅UNO對決'">⚔️ 塔羅UNO(雙)</button>

        <button class="type-btn" :class="{ active: selectedGameType === '單字小精靈' }" @click="selectedGameType = '單字小精靈'">👻 小精靈</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字俄羅斯方塊' }" @click="selectedGameType = '單字俄羅斯方塊'">🧱 俄羅斯</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字皮卡丘排球' }" @click="selectedGameType = '單字皮卡丘排球'">🏐 皮卡排球</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字彈珠台' }" @click="selectedGameType = '單字彈珠台'">🎰 彈珠台</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字憤怒鳥' }" @click="selectedGameType = '單字憤怒鳥'">🐦 憤怒鳥</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字看圖辨義' }" @click="selectedGameType = '單字看圖辨義'">🖼️ 看圖辨義</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字音節忍者' }" @click="selectedGameType = '單字音節忍者'">🥷 音節忍者</button>
        <button class="type-btn" :class="{ active: selectedGameType === '英語口說學霸' }" @click="selectedGameType = '英語口說學霸'">🗣️ 口說學霸-多元評量</button>
        <button class="type-btn" :class="{ active: selectedGameType === '仿會考辨識句意' }" @click="selectedGameType = '仿會考辨識句意'">💯 會考聽力</button>     
  
        
        <button class="type-btn" :class="{ active: selectedGameType === '單字搖搖杯' }" @click="selectedGameType = '單字搖搖杯'">🧋 搖搖杯</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字天平' }" @click="selectedGameType = '單字天平'">⚖️ 天平</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字迷宮滾滾球' }" @click="selectedGameType = '單字迷宮滾滾球'">🔮 迷宮</button>
        <button class="type-btn" :class="{ active: selectedGameType === '霍格華茲單字杖' }" @click="selectedGameType = '霍格華茲單字杖'">🪄 單字杖</button>
        <button class="type-btn" :class="{ active: selectedGameType === 'AR實境單字狙擊手' }" @click="selectedGameType = 'AR實境單字狙擊手'">🔫 狙擊手</button>
        <button class="type-btn" :class="{ active: selectedGameType === '單字地圖 GO' }" @click="selectedGameType = '單字地圖 GO'">🌍 地圖GO</button>
<button class="type-btn" :class="{ active: selectedGameType === '英語口說學霸2' }" @click="selectedGameType = '英語口說學霸2'">📖 口說學霸-朗讀與說故事</button>
  <button class="type-btn" :class="{ active: selectedGameType === '動詞變化大師' }" @click="selectedGameType = '動詞變化大師'">動詞變化大師</button>
  <button class="type-btn" :class="{ active: selectedGameType === '動詞對戰大師' }" @click="selectedGameType = '動詞對戰大師'">動詞對戰大師</button>

      </div>
      <div class="identity-tabs" style="margin-top:10px;">
        <button class="id-btn" :class="{active: identityMode === 'student'}" @click="identityMode = 'student'">🧑‍🎓 實名紀錄</button>
        <button class="id-btn" :class="{active: identityMode === 'anon'}" @click="identityMode = 'anon'">🕵️ 匿名紀錄</button>
      </div>
    </div>

    <div class="table-container retro-element">
      <p v-if="isLoading" class="loading-msg">⏳ 讀取中...</p>
      <table v-else class="retro-table">
        <thead><tr><th>時間</th><th>班級</th><th>姓名</th><th>進度 (版本/冊數/單元)</th><th>成績</th><th>設備</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-if="filteredRecords.length === 0"><td colspan="7" class="empty-msg">沒有符合的紀錄。</td></tr>
          <tr v-for="record in filteredRecords" :key="record.id">
            <td class="time-col">{{ record.formatted_datetime }}</td>
            <td>{{ record.class_name }}</td>
            <td><button class="student-name-link" @click="openStudentHistory(record.student_id)">🔍 <strong>{{ record.real_name }}</strong></button></td>
            <td>
              <span class="tag">{{ record.version }}</span>
              <span class="tag volume-tag" v-if="record.volume">{{ record.volume }}</span>
              <br><strong>{{ record.unit_played }}</strong>
            </td>
            <td><span class="score-text">{{ record.score }}分</span> ({{ record.time_taken_seconds }}s)<br><small class="mistake-text" v-if="record.mistakes > 0">❌錯{{ record.mistakes }}次</small></td>
            <td>{{ record.short_device }}</td>
            <td><button class="action-btn" @click="openEditModal(record)">✏️</button><button class="action-btn" @click="deleteRecord(record.id)">🗑️</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showStudentModal && selectedStudent" class="modal-overlay">
      <div class="modal-box retro-element student-report">
        <div class="report-header"><h2>🧑‍🎓 {{ selectedStudent.name }}</h2><span class="attempt-badge">{{ selectedGameType }}</span></div>
        <div class="report-section">
          <h3>🕒 歷史紀錄</h3>
          <div class="history-list">
            <div class="history-item" v-for="item in selectedStudent.history" :key="item.id">
              <div class="hi-header">
                <strong>{{ item.version }} - {{ item.volume || '未記錄冊數' }} - {{ item.unit_played }}</strong>
                <span>{{ item.formatted_datetime }}</span>
              </div>
              <div class="hi-body"><span class="hi-score">{{ item.score }} 分</span><span class="hi-details">花費 {{ item.time_taken_seconds }} 秒 | 錯 {{ item.mistakes }} 次</span></div>
              <div class="hi-words-box">
                <div v-if="item.wrong_words" class="wrong-box"><strong>⚠️ 錯：</strong>{{ item.wrong_words }}</div>
                <div v-if="item.correct_words" class="correct-box"><strong>🌟 對：</strong>{{ item.correct_words }}</div>
                <div v-if="item.word_intervals" class="intervals-row"><strong>⏱️ 秒數：</strong>
                  <span v-for="i in formatIntervals(item.word_intervals)" :key="i.word">{{ i.word }}({{ i.time }}s) </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button class="retro-btn cancel-btn" @click="showStudentModal = false">關閉</button>
      </div>
    </div>
    
    <div v-if="showModal" class="modal-overlay">
      <div class="modal-box retro-element edit-modal">
        <h2>{{ isEditing ? '✏️ 編輯' : '➕ 補登' }}</h2>
        <div class="form-grid">
          <div class="input-group"><label>學號 *</label><input type="text" v-model="formData.student_id" class="retro-input" /></div>
          <div class="input-group"><label>版本</label><input type="text" v-model="formData.version" class="retro-input" /></div>
          <div class="input-group"><label>冊數</label><input type="text" v-model="formData.volume" class="retro-input" placeholder="例如: B1" /></div>
          <div class="input-group"><label>單元 *</label><input type="text" v-model="formData.unit_played" class="retro-input" /></div>
          <div class="input-group"><label>分數</label><input type="number" v-model="formData.score" class="retro-input" /></div>
        </div>
        <div class="modal-actions"><button class="retro-btn save-btn" @click="saveRecord">💾 儲存</button><button class="retro-btn cancel-btn" @click="showModal = false">❌ 取消</button></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container { padding: 20px; max-width: 1200px; margin: 0 auto; box-sizing: border-box; }
.header { text-align: center; margin-bottom: 20px; }
.header h1 { font-size: 2rem; color: var(--text-main); font-weight: 900; margin: 0; }
.top-actions { display: flex; justify-content: space-between; margin-bottom: 20px; }

.retro-btn { padding: 10px 15px; font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); box-shadow: var(--shadow-btn); cursor: pointer; background: var(--box-bg); color: var(--text-main); text-decoration: none; transition: all 0.15s;}
.retro-btn:active { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }
.add-btn { background-color: var(--btn-danger-bg); }
.export-btn { background-color: var(--btn-primary-bg); color: var(--btn-primary-text); }

.filters-panel { background: var(--tab-bg); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); padding: 15px; margin-bottom: 20px; box-shadow: var(--shadow-btn); }
.game-type-tabs, .identity-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.type-btn, .id-btn { flex: 1; min-width: 18%; padding: 8px 5px; font-size: 0.9rem; font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); cursor: pointer; box-shadow: var(--shadow-btn); background: var(--box-bg); color: var(--text-main); transition: all 0.2s;}
.type-btn.active, .id-btn.active { background: var(--tab-active-bg); color: var(--tab-active-text); transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }

.table-container { background: var(--box-bg); border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); overflow-x: auto; }
.retro-table { width: 100%; border-collapse: collapse; text-align: left; color: var(--text-main); }
.retro-table th, .retro-table td { padding: 12px; border-bottom: 2px solid var(--border-color); white-space: nowrap; }
.retro-table th { background: var(--tab-bg); font-weight: 900; }
.score-text { font-weight: 900; color: var(--danger-color); font-size: 1.2rem; }
.mistake-text { color: var(--danger-color); font-weight: bold; }
.tag { background: var(--info-bg); padding: 2px 6px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.8rem; font-weight: bold; margin-right: 4px; }
.volume-tag { background: var(--success-bg); color: var(--success-color); border-color: var(--success-color); }
.action-btn { background: none; border: none; font-size: 1.3rem; cursor: pointer; }

.student-name-link { background: var(--info-bg); border: var(--border-width) solid var(--border-color); border-radius: 6px; padding: 4px 8px; cursor: pointer; font-weight: bold; color: var(--text-main); transition: all 0.2s; }
.student-name-link:hover { background: var(--tab-active-bg); color: var(--tab-active-text); }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.6); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 20px; box-sizing: border-box; }
.modal-box { background: var(--box-bg); border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); padding: 20px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; color: var(--text-main); box-shadow: var(--shadow-box); }
.report-header { text-align: center; border-bottom: 2px dashed var(--border-color); padding-bottom: 15px; margin-bottom: 20px; }
.attempt-badge { background: var(--text-main); color: var(--box-bg); padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: bold; }
.history-item { background: var(--box-bg); border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); padding: 15px; margin-bottom: 10px; }
.hi-header { display: flex; justify-content: space-between; border-bottom: 1px dashed var(--border-color); padding-bottom: 5px; font-weight: bold; color: var(--text-muted); margin-bottom: 10px;}
.hi-score { font-size: 1.5rem; font-weight: 900; color: var(--danger-color); margin-right: 15px; }

.wrong-box { color: var(--danger-color); margin-bottom: 6px; }
.correct-box { color: var(--success-color); margin-bottom: 6px; }
.intervals-row { color: var(--text-muted); font-size: 0.85rem; border-top: 1px dashed var(--border-color); padding-top: 5px; margin-top: 5px; }

.form-grid { display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;}
.input-group label { font-weight: bold; margin-bottom: 5px; display: block;}
.retro-input { width: 100%; padding: 10px; border: var(--border-width) solid var(--border-color); border-radius: 6px; background: var(--input-bg); color: var(--text-main); font-family: inherit; font-weight: bold; box-sizing: border-box; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; }
.save-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text); }
</style>
