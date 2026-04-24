<template>
  <div class="min-h-screen bg-gray-50 p-4 md:p-8">
    <div class="max-w-6xl mx-auto">
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">司律題庫管理系統</h1>
          <p class="text-gray-500 mt-1">匯入、導出或編輯你的法律考試題目</p>
        </div>
        <div class="flex gap-2">
          <NuxtLink to="/admin/law-exam/practice" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition shadow-sm">
            前往練習模式
          </NuxtLink>
          <NuxtLink to="/admin" class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition">
            回後台首頁
          </NuxtLink>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 class="text-lg font-semibold mb-4 flex items-center">
            <span class="mr-2">📥</span> 批量匯入 CSV
          </h2>
          <input 
            type="file" 
            accept=".csv" 
            @change="handleImport" 
            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <p class="text-xs text-gray-400 mt-3">
            * CSV 格式：科目, 年份, 題目, 選項A...D, 正確答案, 詳解A文字, 詳解A網址...
          </p>
        </div>

        <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 class="text-lg font-semibold mb-4 flex items-center">
            <span class="mr-2">🛠️</span> 數據維護
          </h2>
          <div class="flex gap-3">
            <button @click="handleExport" class="flex-1 bg-green-50 text-green-700 border border-green-200 py-2 rounded-lg hover:bg-green-100 transition">
              導出備份 (CSV)
            </button>
            <button @click="confirmClear" class="flex-1 bg-red-50 text-red-700 border border-red-200 py-2 rounded-lg hover:bg-red-100 transition">
              清空題庫
            </button>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div class="p-4 border-b bg-gray-50 flex justify-between items-center">
          <h3 class="font-bold text-gray-700">目前題庫 ({{ questions.length }} 題)</h3>
          <div class="flex gap-2">
            <input v-model="searchQuery" type="text" placeholder="關鍵字搜尋..." class="text-sm border rounded px-3 py-1" />
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="bg-gray-100 text-gray-600">
                <th class="p-3">科目/年份</th>
                <th class="p-3">題目內容</th>
                <th class="p-3 w-20">解答</th>
                <th class="p-3 w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="q in filteredQuestions" :key="q.id" class="border-t hover:bg-gray-50">
                <td class="p-3">
                  <span class="block font-medium">{{ q.subject }}</span>
                  <span class="text-xs text-gray-400">{{ q.exam_year }}</span>
                </td>
                <td class="p-3 truncate max-w-md">{{ q.question_text }}</td>
                <td class="p-3 font-bold text-blue-600">{{ q.correct_answer }}</td>
                <td class="p-3 text-red-500 cursor-pointer" @click="deleteQuestion(q.id)">刪除</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Papa from 'papaparse'

definePageMeta({ 
  // 順序很重要：先檢查是否為管理員(auth)，再檢查是否通過司律驗證(law-auth)
  middleware: ["auth", "law-auth"] 
})

const supabase = useSupabaseClient()
const questions = ref([])
const searchQuery = ref('')

const fetchQuestions = async () => {
  const { data } = await supabase.from('law_exam_questions').select('*').order('created_at', { ascending: false })
  questions.value = data || []
}

const handleImport = (event) => {
  const file = event.target.files[0]
  if (!file) return

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: async (results) => {
      const formatted = results.data.map(row => ({
        subject: row['科目'],
        exam_year: row['年份'],
        question_text: row['題目'],
        options: [row['選項A'], row['選項B'], row['選項C'], row['選項D']],
        correct_answer: row['正確答案'],
        explanations: {
          "A": { text: row['詳解A文字'], url: row['詳解A網址'] },
          "B": { text: row['詳解B文字'], url: row['詳解B網址'] },
          "C": { text: row['詳解C文字'], url: row['詳解C網址'] },
          "D": { text: row['詳解D文字'], url: row['詳解D網址'] }
        }
      }))
      
      const { error } = await supabase.from('law_exam_questions').insert(formatted)
      if (error) alert('錯誤: ' + error.message)
      else {
        alert('匯入完成')
        fetchQuestions()
      }
    }
  })
}

const handleExport = () => {
  const exportData = questions.value.map(q => ({
    '科目': q.subject,
    '年份': q.exam_year,
    '題目': q.question_text,
    '選項A': q.options[0],
    '選項B': q.options[1],
    '選項C': q.options[2],
    '選項D': q.options[3],
    '正確答案': q.correct_answer,
    '詳解A文字': q.explanations?.A?.text, '詳解A網址': q.explanations?.A?.url,
    '詳解B文字': q.explanations?.B?.text, '詳解B網址': q.explanations?.B?.url,
    '詳解C文字': q.explanations?.C?.text, '詳解C網址': q.explanations?.C?.url,
    '詳解D文字': q.explanations?.D?.text, '詳解D網址': q.explanations?.D?.url,
  }))
  
  const csv = Papa.unparse(exportData)
  const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = `law_questions_backup.csv`
  link.click()
}

const deleteQuestion = async (id) => {
  if (!confirm('確定刪除？')) return
  await supabase.from('law_exam_questions').delete().eq('id', id)
  fetchQuestions()
}

const confirmClear = async () => {
  if (!confirm('警告：這將刪除所有題目且無法復原！確定？')) return
  await supabase.from('law_exam_questions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  fetchQuestions()
}

const filteredQuestions = computed(() => {
  if (!searchQuery.value) return questions.value
  return questions.value.filter(q => q.question_text.includes(searchQuery.value) || q.subject.includes(searchQuery.value))
})

onMounted(fetchQuestions)
</script>