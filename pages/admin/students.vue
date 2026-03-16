<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import Papa from 'papaparse';
import { getStrokeArrayAsync } from '~/utils/strokeCounter';
import { allThemes } from '~/utils/themes';

definePageMeta({ middleware: 'auth' });
const supabase = useSupabaseClient();
const students = ref([]);
const isLoading = ref(true);
const isUploading = ref(false);

const schoolPhone = ref('');

// 🌟 1. 讀取登入時儲存的權限 Cookie
// 🌟 修正版：強制轉為陣列，防範 null 或 undefined 造成系統崩潰
const authCookie = useCookie('teacher_auth');
const allowedClasses = Array.isArray(authCookie.value?.classes) 
  ? authCookie.value.classes 
  : [];
const isSuperAdmin = allowedClasses.includes('ALL');

// 🌟 2. 產生全校班級清單 (供總管理員使用，假設為 701~714, 801~814, 901~914)
const generateAllClasses = () => {
  const list = [];
  for (let grade of [7, 8, 9]) {
    for (let i = 1; i <= 14; i++) {
      list.push(`${grade}${String(i).padStart(2, '0')}`);
    }
  }
  return list;
};

// 🌟 3. 計算出「此帳號可以在下拉選單看到的班級」
const displayClasses = computed(() => {
  if (isSuperAdmin) {
    return generateAllClasses();
  }
  // 如果是一般老師，只回傳他權限內的班級，並排好序
  return [...allowedClasses].sort();
});

// 預設選擇權限內的第一個班級
const selectedClass = ref(displayClasses.value.length > 0 ? displayClasses.value[0] : '');

// 編輯或新增學生
const showModal = ref(false);
const isEditing = ref(false);
const formData = ref({ id: null, student_id: '', real_name: '', hidden_name: '', class_name: '', seat_number: '', pin_code: '', unlocked_themes: [] });

// 學生的歷史紀錄與登入儀表板變數
const showStudentHistoryModal = ref(false);
const selectedStudent = ref(null);
const isHistoryLoading = ref(false);
const studentLoginLogs = ref([]);
const gameStats = ref({});
const playedUnitsList = ref([]);

onMounted(async () => {
  if (!authCookie.value) {
    alert('身分已過期，請重新登入！');
    navigateTo('/login');
    return;
  }
  const { data: settings } = await supabase.from('system_settings').select('school_phone').eq('id', 1).single();
  if (settings) schoolPhone.value = settings.school_phone || '';
  fetchStudents();
});

// 🌟 4. 依照「選取的班級」載入學生資料
const fetchStudents = async () => {
  if (!selectedClass.value) {
    students.value = [];
    isLoading.value = false;
    return;
  }
  isLoading.value = true;
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_name', selectedClass.value)
    .order('seat_number', { ascending: true });

  if (!error && data) students.value = data;
  isLoading.value = false;
};

// 當選擇的班級改變時，自動重新載入
watch(selectedClass, () => {
  fetchStudents();
});

// 老師手動輸入名字時自動算筆畫
watch(() => formData.value.real_name, async (newName) => {
  if (newName && !isEditing.value) {
    const strokesArray = await getStrokeArrayAsync(newName);
    if (strokesArray && !strokesArray.includes(0)) {
      const phoneSuffix = schoolPhone.value.slice(-4);
      formData.value.pin_code = strokesArray.join('') + phoneSuffix;
    }
    if (newName.length === 2) formData.value.hidden_name = newName[0] + 'O';
    else if (newName.length >= 3) formData.value.hidden_name = newName[0] + 'O' + newName.substring(2);
  }
});
watch([() => formData.value.class_name, () => formData.value.seat_number], ([cls, seat]) => {
  if (cls && seat && !isEditing.value) formData.value.student_id = `${cls}${String(seat).padStart(2, '0')}`;
});

const openAddModal = () => { isEditing.value = false; formData.value = { id: null, student_id: '', real_name: '', hidden_name: '', class_name: selectedClass.value, seat_number: '', pin_code: '', unlocked_themes: [] }; showModal.value = true; };
const openEditModal = (stu) => { isEditing.value = true; formData.value = { ...stu, unlocked_themes: stu.unlocked_themes || [] }; showModal.value = true; };

// ==========================================
// 點擊名字開啟「學生個人儀表板」的邏輯
// ==========================================
const formatDateTime = (dateString) => {
  if (!dateString) return '--';
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const parseDevice = (ua) => {
  if (!ua) return '未知設備';
  if (ua.includes('iPhone')) return '📱 iPhone';
  if (ua.includes('iPad')) return '📱 iPad';
  if (ua.includes('Android')) return '📱 Android';
  if (ua.includes('Windows')) return '💻 Windows';
  if (ua.includes('Mac OS')) return '💻 Mac';
  return '🖥️ 其他';
};

const openStudentHistory = async (student) => {
  selectedStudent.value = student;
  isHistoryLoading.value = true;
  showStudentHistoryModal.value = true;
  
  // 1. 抓取登入紀錄
  const { data: logs } = await supabase
    .from('login_logs')
    .select('*')
    .eq('student_id', student.student_id)
    .order('login_time', { ascending: false });
    
  studentLoginLogs.value = (logs || []).map(log => {
    let durationStr = '約 10 分鐘 (系統自動登出)';
    if (log.logout_time) {
      const diff = new Date(log.logout_time) - new Date(log.login_time);
      durationStr = Math.max(1, Math.round(diff / 60000)) + ' 分鐘';
    } else {
      const diff = Date.now() - new Date(log.login_time);
      if (diff < 600000) {
        durationStr = '在線中 / 尚未登出';
      }
    }
    return { ...log, durationStr, login_time_fmt: formatDateTime(log.login_time) };
  });

  // 2. 抓取遊戲統計紀錄
  const { data: games } = await supabase
    .from('game_records')
    .select('game_type, version, volume, unit_played')
    .eq('student_id', student.student_id);
    
  const stats = {};
  const units = new Set();
  
  (games || []).forEach(g => {
    stats[g.game_type] = (stats[g.game_type] || 0) + 1;
    const unitStr = `${g.version || ''} ${g.volume || ''} ${g.unit_played || ''}`.trim();
    if (unitStr) units.add(unitStr);
  });
  
  gameStats.value = stats;
  playedUnitsList.value = Array.from(units);
  isHistoryLoading.value = false;
};

// ==========================================
// CSV 匯入/匯出功能
// ==========================================
const handleImportCsv = (e) => {
  const file = e.target.files[0]; if (!file) return;
  isUploading.value = true;
  Papa.parse(file, {
    header: true, skipEmptyLines: true,
    complete: async (results) => {
      const cleanData = [];
      const phoneSuffix = schoolPhone.value.slice(-4);
      
      for (const row of results.data) {
        const rName = row.real_name ? String(row.real_name).trim() : '';
        const seat = row.seat_number ? String(row.seat_number).trim() : '';
        const cls = selectedClass.value; // 🌟 5. 強制綁定為畫面上選取的班級
        
        let pCode = ''; let hName = '';
        if (rName && cls && seat) {
          const strokesArray = await getStrokeArrayAsync(rName);
          pCode = strokesArray.join('') + phoneSuffix;
          hName = rName.length === 2 ? rName[0] + 'O' : (rName.length >= 3 ? rName[0] + 'O' + rName.substring(2) : rName);
          
          cleanData.push({
            student_id: `${cls}${seat.padStart(2, '0')}`,
            class_name: cls, seat_number: seat, real_name: rName, hidden_name: hName, pin_code: pCode
          });
        }
      }

      if (cleanData.length > 0) {
        await supabase.from('students').insert(cleanData);
        alert(`✅ 成功匯入 ${cleanData.length} 位學生到 ${selectedClass.value} 班！`);
        fetchStudents();
      } else { alert('❌ 匯入失敗，請檢查 CSV 格式 (需有 seat_number 與 real_name)'); }
      isUploading.value = false; e.target.value = '';
    }
  });
};

const exportToCSV = () => {
  if (students.value.length === 0) {
    alert('沒有資料可匯出！');
    return;
  }
  const csvContent = "data:text/csv;charset=utf-8,\uFEFF"
    + "class_name,seat_number,real_name\n"
    + students.value.map(s => `${s.class_name},${s.seat_number},${s.real_name}`).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `students_${selectedClass.value}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const saveStudent = async () => {
  if (!formData.value.student_id || !formData.value.real_name || !formData.value.pin_code) { alert('必填欄位不可為空！'); return; }
  
  // 🌟 二次防護：一般老師不能修改自己沒權限的班級
  if (!isSuperAdmin && !allowedClasses.includes(formData.value.class_name)) {
    alert('您無權修改此班級的資料！');
    return;
  }

  const payload = {
    student_id: formData.value.student_id, real_name: formData.value.real_name, hidden_name: formData.value.hidden_name,
    class_name: formData.value.class_name, seat_number: formData.value.seat_number, pin_code: String(formData.value.pin_code).trim(), unlocked_themes: formData.value.unlocked_themes 
  };
  if (isEditing.value) await supabase.from('students').update(payload).eq('id', formData.value.id);
  else await supabase.from('students').insert([payload]);
  showModal.value = false; fetchStudents();
};

const deleteStudent = async (id) => {
  if (!confirm('⚠️ 確定要刪除？')) return;
  await supabase.from('students').delete().eq('id', id); fetchStudents();
};
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <h1>🧑‍🎓 學生名單管理</h1>
      <p class="role-badge">
        目前身分：{{ authCookie?.name || '未知' }} 
        <span v-if="isSuperAdmin">(總管理員)</span>
      </p>
    </div>

    <div class="top-actions">
      <NuxtLink to="/admin" class="retro-btn back-btn">← 控制中心</NuxtLink>
      
      <div class="right-actions">
        <button class="retro-btn export-btn" @click="exportToCSV" :disabled="isLoading">📊 匯出名單</button>
        <input type="file" accept=".csv" id="student-csv" @change="handleImportCsv" style="display:none" :disabled="isUploading"/>
        <label for="student-csv" class="retro-btn csv-btn">{{ isUploading ? '計算筆畫中...' : '📁 匯入(CSV)' }}</label>
        <button class="retro-btn add-btn" @click="openAddModal">➕ 新增</button>
      </div>
    </div>

    <div class="filters-panel retro-element">
      <div class="filter-group">
        <label>選擇班級：</label>
        <select v-model="selectedClass" class="retro-input-class">
          <option v-if="displayClasses.length === 0" value="">(無授權班級)</option>
          <option v-for="cls in displayClasses" :key="cls" :value="cls">
            {{ cls }} 班
          </option>
        </select>
      </div>
    </div>

    <div class="table-container retro-element">
      <p v-if="isLoading" class="loading-msg">⏳ 讀取中...</p>
      <p v-else-if="displayClasses.length === 0" class="empty-msg">您目前沒有被授權管理任何班級，請聯繫管理員。</p>
      <table v-else class="retro-table">
        <thead><tr><th>班級</th><th>座號</th><th>🎮 遊戲帳號</th><th>真實姓名 (點擊查看)</th><th>🔑 筆畫密碼</th><th>🎵 解鎖風格數</th><th>操作</th></tr></thead>
        <tbody>
          <tr v-if="students.length === 0"><td colspan="7" class="empty-msg">此班級目前沒有學生資料。</td></tr>
          <tr v-for="stu in students" :key="stu.id">
            <td>{{ stu.class_name }}</td><td>{{ stu.seat_number }}</td><td><strong>{{ stu.student_id }}</strong></td>
            <td>
              <button class="student-name-link" @click="openStudentHistory(stu)" title="點擊查看登入與遊戲紀錄">
                🔍 <strong>{{ stu.real_name }}</strong>
              </button>
            </td>
            <td style="color:var(--danger-color); font-weight:bold;">{{ stu.pin_code }}</td>
            <td><span class="badge" :class="stu.unlocked_themes?.length > 0 ? 'bgm-badge' : 'none-badge'">{{ stu.unlocked_themes?.length || 0 }} 款</span></td>
            <td><button class="action-btn edit" @click="openEditModal(stu)">✏️</button><button class="action-btn del" @click="deleteStudent(stu.id)">🗑️</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showStudentHistoryModal" class="modal-overlay">
      <div class="modal-box retro-element dashboard-modal">
        <h2 style="margin-top:0; border-bottom: 2px dashed var(--border-color); padding-bottom: 10px; color: var(--danger-color);">
          🧑‍🎓 {{ selectedStudent?.class_name }}班 {{ selectedStudent?.real_name }} 的學習足跡
        </h2>
        
        <div v-if="isHistoryLoading" class="loading-msg">⏳ 正在調閱資料庫...</div>
        <div v-else class="history-content">
          
          <div class="dashboard-section">
            <h3>🎮 遊戲參與統計</h3>
            <div class="stats-grid">
              <div v-for="(count, game) in gameStats" :key="game" class="stat-card">
                <strong>{{ game }}</strong>
                <span class="stat-count">{{ count }} 次</span>
              </div>
              <div v-if="Object.keys(gameStats).length === 0" class="empty-text">尚無遊戲紀錄，快提醒他去闖關！</div>
            </div>
            
            <div style="margin-top: 15px;">
              <strong>📖 挑戰過的範圍 (版本 / 冊數 / 單元)：</strong>
              <div class="tags-container">
                <span v-for="unit in playedUnitsList" :key="unit" class="unit-tag">{{ unit }}</span>
                <span v-if="playedUnitsList.length === 0" class="empty-text">無</span>
              </div>
            </div>
          </div>

          <div class="dashboard-section">
            <h3>🕒 歷史登入紀錄與時長</h3>
            <div class="logs-table-wrapper">
              <table class="retro-table logs-table">
                <thead><tr><th>登入時間</th><th>停留時間</th><th>設備</th><th>IP 位址</th></tr></thead>
                <tbody>
                  <tr v-if="studentLoginLogs.length === 0"><td colspan="4" class="empty-text" style="text-align:center;">無登入紀錄</td></tr>
                  <tr v-for="log in studentLoginLogs" :key="log.id">
                    <td>{{ log.login_time_fmt }}</td>
                    <td style="color:var(--success-color); font-weight:bold;">{{ log.durationStr }}</td>
                    <td>{{ parseDevice(log.device_info) }}</td>
                    <td>{{ log.ip_address || '未知' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <div class="modal-actions" style="margin-top: 20px;">
          <button class="retro-btn cancel-btn" style="width:100%" @click="showStudentHistoryModal = false">關閉儀表板</button>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="modal-overlay">
      <div class="modal-box retro-element">
        <h2>{{ isEditing ? '✏️ 編輯學生' : '➕ 新增學生' }}</h2>
        <div class="form-grid">
          <div class="input-group"><label>1. 班級 (受權限保護)</label><input type="text" v-model="formData.class_name" class="retro-input" :disabled="!isSuperAdmin" /></div>
          <div class="input-group"><label>2. 座號</label><input type="number" v-model="formData.seat_number" class="retro-input" /></div>
          <div class="input-group"><label>3. 🎮 遊戲帳號 *</label><input type="text" v-model="formData.student_id" class="retro-input" placeholder="自動產生" /></div>
          <div class="input-group"><label>4. 真實姓名 *</label><input type="text" v-model="formData.real_name" class="retro-input" /></div>
          <div class="input-group"><label>5. 顯示名稱</label><input type="text" v-model="formData.hidden_name" class="retro-input" /></div>
          <div class="input-group highlight-input"><label>🔑 筆畫密碼 *</label><input type="text" v-model="formData.pin_code" class="retro-input" placeholder="自動計算" /></div>
        </div>
        
        <div class="unlock-section" v-if="isEditing">
          <label class="section-title">🎁 解鎖風格管理 (共解鎖 {{ formData.unlocked_themes.length }} 款)</label>
          <div class="themes-grid">
            <label v-for="theme in allThemes" :key="theme.id" class="theme-checkbox" :title="theme.desc">
              <input type="checkbox" :value="theme.id" v-model="formData.unlocked_themes" />
              <span>{{ theme.name }}</span>
            </label>
          </div>
        </div>
        
        <div class="modal-actions"><button class="retro-btn save-btn" @click="saveStudent">💾 儲存</button><button class="retro-btn cancel-btn" @click="showModal = false">❌ 取消</button></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container { padding: 20px; max-width: 1000px; margin: 0 auto; box-sizing: border-box; }
.header h1 { text-align: center; color: var(--text-main); margin: 0 0 5px 0; font-weight: 900;}
.role-badge { text-align: center; color: var(--info-color); font-weight: bold; margin-bottom: 20px; background: var(--info-bg); padding: 5px 15px; border-radius: 20px; display: inline-block; border: 2px solid var(--info-color);}
.header { text-align: center; }

.top-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; flex-wrap: wrap; gap: 10px;}
.right-actions { display: flex; gap: 10px; flex-wrap: wrap;}

.filters-panel { background: var(--box-bg); padding: 15px 20px; display: flex; gap: 20px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-box); margin-bottom: 20px; align-items: center;}
.filter-group { display: flex; align-items: center; gap: 10px; font-weight: bold; color: var(--text-main); }
.retro-input-class { padding: 8px 12px; border: 2px solid var(--border-color); border-radius: 8px; font-size: 1.1rem; font-family: inherit; font-weight: bold; min-width: 150px; background: var(--input-bg); color: var(--text-main);}

.retro-btn { padding: 10px 15px; font-weight: 900; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); box-shadow: var(--shadow-btn); background: var(--box-bg); color: var(--text-main); text-decoration: none; cursor: pointer; transition: all 0.15s;}
.retro-btn:active:not(.disabled) { transform: var(--transform-active); box-shadow: var(--shadow-btn-active); }
.retro-btn:disabled { opacity: 0.6; cursor: not-allowed; }
.add-btn { background-color: var(--btn-primary-bg); color: var(--btn-primary-text); }
.csv-btn { background-color: var(--success-bg); color: var(--success-color); cursor: pointer; border-color: var(--success-color); }
.export-btn { background: var(--info-bg); color: var(--text-main); }

.table-container { background: var(--box-bg); border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); box-shadow: var(--shadow-box); overflow-x: auto; color: var(--text-main);}
.retro-table { width: 100%; border-collapse: collapse; text-align: left; }
.retro-table th, .retro-table td { padding: 12px; border-bottom: 2px solid var(--border-color); white-space: nowrap; }
.retro-table th { background: var(--tab-bg); font-weight: 900; }

.empty-msg { text-align: center; padding: 30px; color: var(--text-muted); font-weight: bold;}

/* 🌟 學生姓名點擊按鈕樣式 */
.student-name-link { background: var(--info-bg); border: var(--border-width) solid var(--border-color); border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 1rem; font-weight: 900; color: var(--text-main); transition: all 0.2s; box-shadow: 2px 2px 0px var(--border-color); }
.student-name-link:hover { background: var(--tab-active-bg); color: var(--tab-active-text); transform: translate(1px, 1px); box-shadow: 1px 1px 0px var(--border-color); }
.student-name-link:active { transform: translate(2px, 2px); box-shadow: none; }

.badge { padding: 4px 8px; border-radius: 12px; font-size: 0.85rem; font-weight: bold; }
.bgm-badge { background: var(--success-bg); color: var(--success-color); border: 1px solid var(--success-color); }
.none-badge { background: var(--tab-bg); color: var(--text-muted); border: 1px dashed var(--text-muted); }
.action-btn { background: none; border: none; font-size: 1.3rem; cursor: pointer; transition: transform 0.1s;}
.action-btn:hover { transform: scale(1.2); }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 20px; box-sizing: border-box;}
.modal-box { background: var(--box-bg); border: var(--box-border-width) solid var(--border-color); border-radius: var(--radius-box); padding: 25px; width: 100%; max-width: 650px; max-height: 90vh; overflow-y: auto; color: var(--text-main); box-shadow: var(--shadow-box); }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
.input-group { display: flex; flex-direction: column; } .input-group label { font-weight: bold; margin-bottom: 5px; }
.retro-input { padding: 10px; border: var(--border-width) solid var(--border-color); border-radius: var(--radius-element); background: var(--input-bg); color: var(--text-main); font-family: inherit; font-weight: bold; }
.retro-input:disabled { opacity: 0.6; cursor: not-allowed; }
.highlight-input .retro-input { border: 2px solid var(--danger-color); background: var(--danger-bg); }
.unlock-section { background: var(--tab-bg); border: 2px dashed var(--border-color); border-radius: var(--radius-element); padding: 15px; margin-bottom: 20px; }
.section-title { font-weight: 900; font-size: 1.1rem; display: block; margin-bottom: 15px; color: var(--danger-color); border-bottom: 1px solid var(--border-color); padding-bottom: 8px;}
.themes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; max-height: 250px; overflow-y: auto; padding-right: 10px; }
.theme-checkbox { display: flex; align-items: center; gap: 6px; font-size: 0.9rem; cursor: pointer; background: var(--box-bg); padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; position: relative;}
.theme-checkbox:hover { border-color: var(--success-color); }
.theme-checkbox input { accent-color: var(--text-main); width: 16px; height: 16px; cursor: pointer; }
.modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; }
.save-btn { background: var(--btn-primary-bg); color: var(--btn-primary-text); } .cancel-btn { background: var(--tab-bg); color: var(--text-main); }

/* 🌟 個人儀表板專屬樣式 */
.dashboard-modal { max-width: 800px; }
.dashboard-section { background: var(--tab-bg); border: 2px solid var(--border-color); border-radius: var(--radius-element); padding: 15px; margin-bottom: 15px; }
.dashboard-section h3 { margin-top: 0; color: var(--text-main); border-bottom: 1px dashed var(--border-color); padding-bottom: 5px;}
.stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.stat-card { background: var(--box-bg); padding: 10px; border: var(--border-width) solid var(--border-color); border-radius: 6px; display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center; }
.stat-count { font-size: 1.2rem; font-weight: 900; color: var(--danger-color); }
.tags-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
.unit-tag { background: var(--btn-secondary-bg); color: var(--btn-secondary-text); padding: 4px 8px; border: 1px solid var(--border-color); border-radius: 4px; font-size: 0.85rem; font-weight: bold; }
.logs-table-wrapper { max-height: 250px; overflow-y: auto; border: 1px solid var(--border-color); }
.logs-table th { background: var(--info-bg); position: sticky; top: 0; z-index: 1; }
.empty-text { color: var(--text-muted); font-weight: bold; font-style: italic; }
</style>