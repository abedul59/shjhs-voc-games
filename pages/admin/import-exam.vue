<script setup>
import { ref } from 'vue';

const supabase = useSupabaseClient();
const parsedData = ref([]);
const isUploading = ref(false);
const uploadStatus = ref('');

// 處理 CSV 檔案選擇
const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    parseCSV(text);
  };
  reader.readAsText(file, 'utf-8');
};

// 智慧型 CSV 解析器 (能正確處理引號內的逗號，並支援 9 個欄位含圖片)
const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim());
  const result = [];
  
  // 跳過第一行的標題列
  for (let i = 1; i < lines.length; i++) {
    // 使用正則表達式分割逗號，但忽略雙引號內的逗號
    const rowRaw = lines[i].split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    
    if (rowRaw.length >= 9) { // 確認有 9 個欄位 (加入 image_url)
      const row = rowRaw.map(col => {
        let val = col.trim();
        // 脫去最外層的雙引號，並將內部的兩個雙引號 "" 還原為單個 "
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.substring(1, val.length - 1).replace(/""/g, '"');
        }
        return val;
      });

      result.push({
        year: parseInt(row[0]),
        question_id: parseInt(row[1]),
        image_url: row[2] || null, // 圖片網址 (若為空則存入 null)
        question: row[3],
        option_a: row[4],
        option_b: row[5],
        option_c: row[6],
        option_d: row[7],
        answer: row[8]
      });
    }
  }
  parsedData.value = result;
  uploadStatus.value = `✅ 成功解析 ${result.length} 筆題目！準備好可點擊下方按鈕寫入資料庫。`;
};

// 將解析好的資料寫入 Supabase
const uploadToDatabase = async () => {
  if (parsedData.value.length === 0) return;
  
  isUploading.value = true;
  uploadStatus.value = '⏳ 正在寫入資料庫，請稍候...';

  const { error } = await supabase.from('exam_questions').insert(parsedData.value);

  if (error) {
    console.error('上傳失敗:', error);
    uploadStatus.value = `❌ 上傳失敗: ${error.message}`;
  } else {
    uploadStatus.value = `🎉 恭喜！${parsedData.value.length} 筆會考題目已成功匯入！`;
    parsedData.value = []; // 清空預覽
  }
  isUploading.value = false;
};
</script>

<template>
  <div class="admin-container">
    <div class="header">
      <h1>📥 會考題庫 CSV 匯入工具</h1>
      <NuxtLink to="/admin" class="retro-btn btn-secondary" style="text-decoration: none;">返回後台</NuxtLink>
    </div>

    <div class="upload-card">
      <p class="instruction">
        請上傳會考題目的 CSV 檔案。<br>
        <small style="color: #d32f2f; font-weight:bold;">
          ⚠️ 欄位順序必須為：year, question_id, image_url, question, option_a, option_b, option_c, option_d, answer
        </small>
      </p>
      
      <input type="file" accept=".csv" @change="handleFileUpload" class="file-input" />
      
      <p v-if="uploadStatus" class="status-msg" :class="{'success': uploadStatus.includes('✅') || uploadStatus.includes('🎉'), 'error': uploadStatus.includes('❌')}">
        {{ uploadStatus }}
      </p>

      <button 
        v-if="parsedData.length > 0" 
        class="retro-btn btn-primary" 
        @click="uploadToDatabase" 
        :disabled="isUploading"
      >
        {{ isUploading ? '寫入中...' : '💾 確定匯入至資料庫' }}
      </button>
    </div>

    <div v-if="parsedData.length > 0" class="preview-section">
      <h3>👀 解析資料預覽 (共 {{ parsedData.length }} 筆)</h3>
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>年份</th>
              <th>題號</th>
              <th>圖片網址</th>
              <th>題目</th>
              <th>A</th>
              <th>B</th>
              <th>C</th>
              <th>D</th>
              <th>答案</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, index) in parsedData" :key="index">
              <td>{{ item.year }}</td>
              <td>{{ item.question_id }}</td>
              <td>
                <span v-if="item.image_url" style="color: green; font-weight:bold;">✅ 有圖片</span>
                <span v-else style="color: #999;">無</span>
              </td>
              <td class="text-left">{{ item.question.substring(0, 30) }}...</td>
              <td>{{ item.option_a.substring(0, 10) }}...</td>
              <td>{{ item.option_b.substring(0, 10) }}...</td>
              <td>{{ item.option_c.substring(0, 10) }}...</td>
              <td>{{ item.option_d.substring(0, 10) }}...</td>
              <td style="font-weight: bold; color: #d32f2f;">{{ item.answer }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin-container { padding: 20px; max-width: 1000px; margin: 0 auto; color: #333; font-family: sans-serif; }
.header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #ccc; padding-bottom: 15px; margin-bottom: 20px; }

.upload-card { background: #f8f9fa; border: 2px dashed #007bff; border-radius: 8px; padding: 30px; text-align: center; margin-bottom: 20px; }
.instruction { font-size: 1.1rem; color: #555; margin-bottom: 20px; line-height: 1.5; }
.file-input { display: block; margin: 0 auto 20px auto; font-size: 1.1rem; padding: 10px; border: 1px solid #ccc; border-radius: 4px; cursor: pointer; }

.status-msg { font-size: 1.2rem; font-weight: bold; margin: 15px 0; }
.status-msg.success { color: #2e7d32; }
.status-msg.error { color: #c62828; }

.table-wrapper { overflow-x: auto; background: white; border: 1px solid #ccc; border-radius: 8px; }
table { width: 100%; border-collapse: collapse; text-align: center; }
th, td { padding: 10px; border-bottom: 1px solid #eee; }
th { background: #e3f2fd; color: #0d47a1; font-weight: bold; }
.text-left { text-align: left; }

.retro-btn { padding: 12px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; border: 2px solid; transition: 0.1s; font-size: 1.1rem; }
.btn-primary { background: #007bff; color: white; border-color: #0056b3; width: 100%; max-width: 400px; }
.btn-primary:disabled { background: #ccc; border-color: #999; cursor: not-allowed; }
.btn-secondary { background: #e0e0e0; color: #333; border-color: #ccc; }
</style>