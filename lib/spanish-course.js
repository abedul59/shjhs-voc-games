export const SPANISH_STORAGE_KEY = 'private-spanish-academy-v1';
export const SPANISH_PROGRESS_OWNER = 'private-spanish-owner';

export const spanishStages = [
  { id: 'a1-start', number: '01', icon: '🌱', title: 'A1 生存入門', subtitle: '發音、問候、身分與基本需求', color: '#16a34a' },
  { id: 'a1-core', number: '02', icon: '🏠', title: 'A1 核心生活', subtitle: '家庭、時間、飲食、城市與現在式', color: '#0284c7' },
  { id: 'a2-daily', number: '03', icon: '🧭', title: 'A2 日常溝通', subtitle: '旅行、健康、購物、過去與未來', color: '#7c3aed' },
  { id: 'a2-bridge', number: '04', icon: '💬', title: 'A2 進階橋梁', subtitle: '代名詞、比較、命令與故事敘述', color: '#c026d3' },
  { id: 'b1-independent', number: '05', icon: '🗺️', title: 'B1 獨立使用', subtitle: '意見、條件、虛擬式與完整互動', color: '#ea580c' },
  { id: 'b2-fluency', number: '06', icon: '🎙️', title: 'B2 流暢表達', subtitle: '辯論、新聞、職場、學術與語域', color: '#dc2626' },
  { id: 'c1-advanced', number: '07', icon: '📚', title: 'C1 高階精準', subtitle: '修辭、文學、專業寫作與跨文化', color: '#4338ca' },
  { id: 'c2-mastery', number: '08', icon: '🏆', title: 'C2 深度掌握', subtitle: '細微語意、即席表達、翻譯與總整', color: '#0f172a' }
];

const themes = [
  { id:'greetings', label:'問候與禮貌', phrase:'Mucho gusto. ¿Cómo está usted?', meaning:'很高興認識您，您好嗎？', words:[['hola','你好'],['adiós','再見'],['gracias','謝謝'],['por favor','請'],['perdón','抱歉'],['bienvenido','歡迎'],['encantado','幸會'],['salud','祝健康']] },
  { id:'identity', label:'身分與國家', phrase:'Me llamo Ana y soy de Taiwán.', meaning:'我叫安娜，來自臺灣。', words:[['nombre','名字'],['país','國家'],['ciudad','城市'],['idioma','語言'],['persona','人'],['amigo','朋友'],['estudiante','學生'],['profesor','老師']] },
  { id:'numbers', label:'數字與時間', phrase:'La clase empieza a las nueve y media.', meaning:'課程九點半開始。', words:[['uno','一'],['diez','十'],['hora','小時／時間'],['minuto','分鐘'],['hoy','今天'],['mañana','明天／早晨'],['tarde','下午'],['noche','夜晚']] },
  { id:'family', label:'家庭與人物', phrase:'Mi hermana mayor vive con nuestros padres.', meaning:'我的姊姊和我們的父母住在一起。', words:[['familia','家庭'],['madre','母親'],['padre','父親'],['hermano','兄弟'],['hermana','姊妹'],['hijo','兒子'],['abuelo','祖父'],['pareja','伴侶']] },
  { id:'home', label:'住家與物品', phrase:'La llave está encima de la mesa.', meaning:'鑰匙在桌子上面。', words:[['casa','房子'],['habitación','房間'],['puerta','門'],['ventana','窗戶'],['mesa','桌子'],['silla','椅子'],['llave','鑰匙'],['cocina','廚房']] },
  { id:'food', label:'飲食與餐廳', phrase:'Quisiera una sopa y agua sin hielo, por favor.', meaning:'我想要一碗湯和不加冰的水，謝謝。', words:[['comida','食物'],['agua','水'],['pan','麵包'],['arroz','米飯'],['carne','肉'],['verdura','蔬菜'],['cuenta','帳單'],['hambre','飢餓']] },
  { id:'city', label:'城市與方向', phrase:'Siga recto y gire a la izquierda en el banco.', meaning:'直走並在銀行左轉。', words:[['calle','街道'],['plaza','廣場'],['derecha','右邊'],['izquierda','左邊'],['cerca','附近'],['lejos','遠'],['banco','銀行'],['estación','車站']] },
  { id:'routine', label:'日常與工作', phrase:'Normalmente trabajo desde casa hasta las seis.', meaning:'我通常在家工作到六點。', words:[['trabajar','工作'],['estudiar','讀書'],['comer','吃'],['dormir','睡覺'],['empezar','開始'],['terminar','結束'],['siempre','總是'],['nunca','從不']] },
  { id:'shopping', label:'購物與金錢', phrase:'¿Cuánto cuesta esta camisa si pago en efectivo?', meaning:'如果付現，這件襯衫多少錢？', words:[['precio','價格'],['dinero','金錢'],['barato','便宜的'],['caro','昂貴的'],['comprar','購買'],['vender','販售'],['talla','尺寸'],['efectivo','現金']] },
  { id:'travel', label:'旅行與交通', phrase:'Perdí el tren, pero todavía puedo tomar el autobús.', meaning:'我錯過火車，但仍可以搭公車。', words:[['viaje','旅行'],['billete','票'],['tren','火車'],['avión','飛機'],['autobús','公車'],['maleta','行李箱'],['salida','出發／出口'],['llegada','抵達']] },
  { id:'health', label:'健康與身體', phrase:'Me duele la cabeza desde ayer y necesito descansar.', meaning:'我從昨天開始頭痛，需要休息。', words:[['salud','健康'],['cabeza','頭'],['mano','手'],['dolor','疼痛'],['médico','醫師'],['medicina','藥'],['descansar','休息'],['mejorar','改善']] },
  { id:'nature', label:'自然與天氣', phrase:'Aunque llueva, protegeremos este bosque.', meaning:'即使下雨，我們仍會保護這座森林。', words:[['tiempo','天氣／時間'],['lluvia','雨'],['viento','風'],['mar','海'],['montaña','山'],['bosque','森林'],['clima','氣候'],['proteger','保護']] },
  { id:'emotion', label:'情緒與關係', phrase:'Me alegra que podamos hablar con sinceridad.', meaning:'我很高興我們能坦誠交談。', words:[['alegría','喜悅'],['miedo','恐懼'],['enfado','生氣'],['tranquilo','平靜的'],['confiar','信任'],['apoyar','支持'],['acuerdo','共識'],['relación','關係']] },
  { id:'education', label:'教育與學習', phrase:'Aprender requiere curiosidad, práctica y reflexión.', meaning:'學習需要好奇心、練習與反思。', words:[['aprender','學習'],['enseñar','教導'],['conocimiento','知識'],['habilidad','技能'],['investigar','研究'],['explicar','解釋'],['lograr','達成'],['reflexión','反思']] },
  { id:'work', label:'職場與商務', phrase:'Conviene que negociemos un plazo realista.', meaning:'我們最好協商一個實際的期限。', words:[['empresa','公司'],['reunión','會議'],['proyecto','專案'],['plazo','期限'],['cliente','客戶'],['acuerdo','協議'],['negociar','協商'],['liderazgo','領導力']] },
  { id:'technology', label:'科技與媒體', phrase:'La privacidad digital depende tanto del diseño como del usuario.', meaning:'數位隱私同時取決於設計與使用者。', words:[['datos','資料'],['red','網路'],['pantalla','螢幕'],['usuario','使用者'],['seguridad','安全'],['privacidad','隱私'],['algoritmo','演算法'],['innovación','創新']] },
  { id:'society', label:'社會與公共議題', phrase:'Es imprescindible que la política pública reduzca la desigualdad.', meaning:'公共政策必須降低不平等。', words:[['sociedad','社會'],['derecho','權利／法律'],['igualdad','平等'],['justicia','正義'],['gobierno','政府'],['ciudadanía','公民身分'],['debate','辯論'],['responsabilidad','責任']] },
  { id:'culture', label:'文化與藝術', phrase:'La obra cuestiona la memoria colectiva sin imponer una respuesta.', meaning:'這件作品質疑集體記憶，但不強加答案。', words:[['cultura','文化'],['obra','作品'],['música','音樂'],['literatura','文學'],['memoria','記憶'],['identidad','認同'],['interpretar','詮釋'],['patrimonio','文化遺產']] },
  { id:'academic', label:'學術與論證', phrase:'La evidencia respalda la hipótesis, si bien quedan varias limitaciones.', meaning:'證據支持假設，儘管仍有若干限制。', words:[['evidencia','證據'],['hipótesis','假設'],['hallazgo','研究發現'],['enfoque','方法／觀點'],['matiz','細微差異'],['coherencia','連貫性'],['refutar','反駁'],['sustentar','支持論證']] },
  { id:'mastery', label:'精準表達與翻譯', phrase:'Lejos de ser inequívoco, el mensaje admite lecturas contrapuestas.', meaning:'這個訊息遠非單一明確，而容許相反的解讀。', words:[['inequívoco','明確無疑的'],['ambiguo','模稜兩可的'],['plantear','提出'],['conllevar','意味／導致'],['subyacente','潛在的'],['contrapuesto','相對立的'],['dilucidar','闡明'],['reformular','重新表述']] }
];

const topicGroups = [
  ['西語字母與重音','母音與穩定發音','問候與告別','介紹自己的名字','國籍與居住地','正式與非正式稱呼','數字 0–100','日期與星期','時間與約會','A1 生存對話整合'],
  ['名詞陰陽性','單複數與冠詞','主格代名詞','Ser：身分與本質','Estar：狀態與位置','Hay：表達存在','規則動詞現在式','常見不規則現在式','疑問詞與提問','否定與基本語序'],
  ['家庭與所有格','描述人物外貌','個性與喜好','住家與房間','位置介系詞','日常作息','反身動詞','頻率副詞','食物與飲料','餐廳點餐'],
  ['城市問路','交通與票務','購物與尺寸','價格與數量','直接受詞代名詞','間接受詞代名詞','Gustar 類動詞','比較級與最高級','現在進行式','A2 情境會話整合'],
  ['簡單過去式規則變化','簡單過去式不規則變化','未完成過去式','兩種過去式比較','敘述旅行經驗','健康與身體不適','命令式：tú','命令式：usted','近期未來 ir a','簡單未來式'],
  ['條件式與禮貌請求','Por 與 Para','關係代名詞','不定詞與動名詞','Se 的被動與無人稱','現在完成式','過去完成式','連接詞與段落','電話與預約','B1 任務整合'],
  ['現在虛擬式形成','願望與建議','情緒與評價','懷疑與否定','目的與條件子句','未完成虛擬式','Si 條件句三型','時態呼應','轉述語氣','議論文章結構'],
  ['職場會議與簡報','談判與委婉表達','新聞與資訊來源','假訊息與媒體識讀','環境與永續','科技與數位倫理','社會正義議題','提出反駁與讓步','正式電子郵件','B2 口試整合'],
  ['高階連接詞','語域與禮貌層次','慣用語與搭配詞','西班牙與拉美變體','文學敘事視角','隱喻與修辭','學術摘要','證據與論證','跨文化溝通','C1 長篇表達'],
  ['細微語意與近義詞','幽默、反諷與弦外之音','複雜文本批判閱讀','即席演說與辯論','專業簡報問答','西中翻譯策略','中西翻譯策略','編輯與風格修訂','DELE C2 模擬任務','總整：個人西語作品集']
];

const stageFor = order => order <= 10 ? 'a1-start' : order <= 25 ? 'a1-core' : order <= 40 ? 'a2-daily' : order <= 50 ? 'a2-bridge' : order <= 65 ? 'b1-independent' : order <= 80 ? 'b2-fluency' : order <= 92 ? 'c1-advanced' : 'c2-mastery';
const levelFor = order => order <= 25 ? 'A1' : order <= 50 ? 'A2' : order <= 65 ? 'B1' : order <= 80 ? 'B2' : order <= 92 ? 'C1' : 'C2';
const topics = topicGroups.flat();

export const spanishVocabulary = themes.flatMap((theme, themeIndex) => theme.words.map(([es, zh], index) => ({
  id: `${theme.id}-${index + 1}`, es, zh, theme: theme.label,
  level: themeIndex < 5 ? 'A1' : themeIndex < 10 ? 'A2' : themeIndex < 14 ? 'B1' : themeIndex < 17 ? 'B2' : themeIndex < 19 ? 'C1' : 'C2'
})));

export const spanishLessons = topics.map((title, index) => {
  const order = index + 1;
  const themeIndex = Math.min(themes.length - 1, Math.floor(index / 5));
  const theme = themes[themeIndex];
  const level = levelFor(order);
  const vocabulary = theme.words.map(([es, zh], wordIndex) => ({ id: `${theme.id}-${wordIndex + 1}`, es, zh }));
  const alternatives = [themes[(themeIndex + 1) % themes.length].meaning, themes[(themeIndex + 7) % themes.length].meaning, themes[(themeIndex + 13) % themes.length].meaning];
  return {
    id: `lesson-${String(order).padStart(3, '0')}`, stage: stageFor(order), order, level, duration: order % 10 === 0 ? 75 : 50,
    title, subtitle: `${level} · ${theme.label}`,
    objectives: [`掌握「${title}」的核心規則與使用時機`, `熟練 ${theme.label} 的 8 個關鍵詞彙`, '完成口說、理解與輸出練習並留下個人筆記'],
    vocabulary,
    sections: [
      { title: '核心句型', body: theme.phrase, note: theme.meaning },
      { title: '文法與語用', body: `本課以「${title}」為主軸。先辨識形式與語境，再比較正式、非正式及西班牙／拉丁美洲常見用法。`, note: `程度目標：${level}` },
      { title: '情境對話', body: `A：${theme.phrase}\nB：Claro. Vamos a practicarlo paso a paso.`, note: '先慢速朗讀，再遮住中文以正常速度重述。' },
      { title: '輸出任務', body: `使用本課至少三個詞彙，寫出或說出一段與「${theme.label}」有關的四句短文。`, note: '錄音後檢查重音、動詞一致與連接詞。' }
    ],
    practice: { prompt: `請用西班牙語改寫或延伸：${theme.meaning}`, model: theme.phrase, required: vocabulary.slice(0, 3).map(word => word.es) },
    quiz: { question: `「${theme.phrase}」最貼近哪個中文意思？`, choices: [theme.meaning, ...alternatives], answer: 0, explanation: `正確語意是「${theme.meaning}」。注意本課的語境與語域。` }
  };
});

export function createDefaultSpanishProgress() {
  return { lessons: {}, games: { played: 0, correct: 0, best: 0, history: [] }, lastLesson: 'lesson-001', startedAt: new Date().toISOString() };
}
