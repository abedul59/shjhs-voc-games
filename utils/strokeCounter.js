// 檔案位置：utils/strokeCounter.js

// 用來暫存在記憶體中的字典，避免重複下載
let globalStrokeMap = null;

// 🔗 請將這裡替換成您在 Supabase Storage 複製的 Public URL
const DICT_URL = "https://arpwmnoykukawkickmiv.supabase.co/storage/v1/object/public/assets/stroke_dict.json";

const loadDict = async () => {
  if (globalStrokeMap) return globalStrokeMap;
  
  try {
    const response = await fetch(DICT_URL);
    if (!response.ok) throw new Error("字典下載失敗");
    
    const rawData = await response.json();
    globalStrokeMap = new Map();
    
    // 將 JSON 物件轉入 Map，搜尋速度最快
    for (const char in rawData) {
      globalStrokeMap.set(char, rawData[char]);
    }
    return globalStrokeMap;
  } catch (error) {
    console.error("無法載入筆畫字典：", error);
    return null;
  }
};

export const getStrokeArrayAsync = async (name) => {
  if (!name) return [];
  const strokes = [];
  const dictMap = await loadDict();

  for (let i = 0; i < name.length; i++) {
    const char = name[i];
    
    // 1. 英文或數字，給 1 畫
    if (/[a-zA-Z0-9]/.test(char)) {
      strokes.push(1);
    } 
    // 2. 在 Supabase 字典裡查表
    else if (dictMap && dictMap.has(char)) {
      strokes.push(dictMap.get(char));
    } 
    // 3. 終極防呆：萬一字典沒載入成功，或遇到外星文
    else {
      const fallbackStroke = (char.charCodeAt(0) % 20) + 1;
      strokes.push(fallbackStroke);
      console.warn(`字元 [${char}] 查無資料，使用防呆計算：${fallbackStroke} 畫。`);
    }
  }
  
  return strokes;
};