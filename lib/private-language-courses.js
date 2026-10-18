const parsePairs = text => text.trim().split('\n').map(line => line.split('|'));

const sharedTopicGroups = [
  ['字母、文字系統與發音','母音與子音','重音與語調','問候與告別','自我介紹','國籍與語言','數字 0–100','日期與星期','時間與約會','A1 生存對話'],
  ['名詞與冠詞','單複數','人稱代名詞','基本語序','肯定與否定','現在式規則','常見不規則動詞','疑問詞','所有與指示','A1 核心整合'],
  ['家庭與人物','外貌與個性','住家與家具','位置與方向','日常作息','頻率表達','食物與飲料','餐廳點餐','購物與價格','城市生活'],
  ['交通與票務','旅行與住宿','健康與身體','天氣與季節','興趣與運動','直接與間接受詞','比較級與最高級','進行與持續','命令與請求','A2 情境整合'],
  ['過去事件','過去習慣','兩種過去觀點','未來計畫','條件與假設','情態與能力','邀請與拒絕','電話與預約','敘述旅行經驗','A2 任務整合'],
  ['完成式與經驗','關係子句','被動與無人稱','原因與結果','目的與讓步','轉述他人話語','段落與連接詞','正式電子郵件','解決問題','B1 獨立表達'],
  ['願望與建議','情緒與評價','懷疑與確定','複雜條件句','職場會議','簡報與問答','新聞與媒體','環境與永續','社會與文化','B2 議論整合'],
  ['抽象名詞與搭配','語域與禮貌','慣用語','地區與世代變體','文學敘事','論證與反駁','學術摘要','資料與證據','跨文化溝通','B2 流暢表達'],
  ['高階連接詞','近義詞與細微語意','隱喻與修辭','幽默與反諷','批判閱讀','專業寫作','即席演說','深度辯論','翻譯策略','C1 精準表達'],
  ['複雜文本分析','語用與弦外之音','編輯與風格修訂','專業協商','研究發表','文化作品評論','雙向翻譯','高階檢定模擬','個人作品集','C2 總整與精熟']
];

const languageConfigs = {
  french: {
    slug: 'french', name: '法語', nativeName: 'Français', flag: '🇫🇷', logo: 'FR', accent: '#2563eb', secondary: '#be123c', speech: { engine: 'embedded', voice: 'fr', lang: 'fr-FR' },
    tagline: 'Écouter · Parler · Lire · Écrire', scriptNote: '法語連音、鼻母音、性數一致與語域',
    words: parsePairs(`bonjour|你好
au revoir|再見
merci|謝謝
s'il vous plaît|請
oui|是
non|不是
excusez-moi|不好意思
comment allez-vous ?|您好嗎
je m'appelle…|我叫……
enchanté|幸會
famille|家庭
ami|朋友
homme|男人
femme|女人
enfant|孩子
maison|房子
école|學校
travail|工作
ville|城市
pays|國家
aujourd'hui|今天
demain|明天
hier|昨天
matin|早晨
soir|晚上
heure|時間／小時
semaine|星期
mois|月份
année|年
maintenant|現在
eau|水
pain|麵包
café|咖啡
repas|餐點
fruit|水果
légume|蔬菜
restaurant|餐廳
addition|帳單
faim|飢餓
délicieux|美味的
voyage|旅行
train|火車
avion|飛機
gare|車站
hôtel|旅館
billet|票
gauche|左邊
droite|右邊
près|附近
loin|遠
apprendre|學習
comprendre|理解
parler|說話
écouter|聆聽
lire|閱讀
écrire|寫作
question|問題
réponse|答案
idée|想法
connaissance|知識`),
    frames: ['{term}','Je dis « {term} ».','J’écoute « {term} ».','Je comprends « {term} ».','Je révise « {term} ».','Le mot est « {term} ».','Aujourd’hui : « {term} ».','En contexte : « {term} ».','La question contient « {term} ».','La réponse contient « {term} ».','Je peux utiliser « {term} ».','Je veux mémoriser « {term} ».','Je dois pratiquer « {term} ».','Je reconnais « {term} ».','Je note « {term} ».','Je répète « {term} ».','Expression utile : « {term} ».']
  },
  german: {
    slug: 'german', name: '德語', nativeName: 'Deutsch', flag: '🇩🇪', logo: 'DE', accent: '#dc2626', secondary: '#ca8a04', speech: { engine: 'embedded', voice: 'de', lang: 'de-DE' },
    tagline: 'Hören · Sprechen · Lesen · Schreiben', scriptNote: '德語變格、動詞位置、可分動詞與複合詞',
    words: parsePairs(`hallo|你好
auf Wiedersehen|再見
danke|謝謝
bitte|請／不客氣
ja|是
nein|不是
Entschuldigung|不好意思
wie geht es Ihnen?|您好嗎
ich heiße…|我叫……
freut mich|幸會
Familie|家庭
Freund|朋友
Mann|男人
Frau|女人
Kind|孩子
Haus|房子
Schule|學校
Arbeit|工作
Stadt|城市
Land|國家
heute|今天
morgen|明天
gestern|昨天
Morgen|早晨
Abend|晚上
Stunde|時間／小時
Woche|星期
Monat|月份
Jahr|年
jetzt|現在
Wasser|水
Brot|麵包
Kaffee|咖啡
Essen|餐點／食物
Obst|水果
Gemüse|蔬菜
Restaurant|餐廳
Rechnung|帳單
Hunger|飢餓
lecker|美味的
Reise|旅行
Zug|火車
Flugzeug|飛機
Bahnhof|車站
Hotel|旅館
Fahrkarte|票
links|左邊
rechts|右邊
nah|附近
weit|遠
lernen|學習
verstehen|理解
sprechen|說話
zuhören|聆聽
lesen|閱讀
schreiben|寫作
Frage|問題
Antwort|答案
Idee|想法
Wissen|知識`),
    frames: ['{term}','Ich sage „{term}“.','Ich höre „{term}“.','Ich verstehe „{term}“.','Ich wiederhole „{term}“.','Das Wort ist „{term}“.','Heute: „{term}“.','Im Kontext: „{term}“.','Die Frage enthält „{term}“.','Die Antwort enthält „{term}“.','Ich kann „{term}“ verwenden.','Ich möchte „{term}“ lernen.','Ich muss „{term}“ üben.','Ich erkenne „{term}“.','Ich notiere „{term}“.','Ich spreche „{term}“ nach.','Nützlicher Ausdruck: „{term}“.']
  },
  russian: {
    slug: 'russian', name: '俄語', nativeName: 'Русский', flag: '🇷🇺', logo: 'РУ', accent: '#2563eb', secondary: '#dc2626', speech: { engine: 'native', lang: 'ru-RU' },
    tagline: 'Слушать · Говорить · Читать · Писать', scriptNote: '西里爾字母、重音、六格變化與動詞體',
    words: parsePairs(`здравствуйте|您好
до свидания|再見
спасибо|謝謝
пожалуйста|請／不客氣
да|是
нет|不是
извините|不好意思
как дела?|你好嗎
меня зовут…|我叫……
очень приятно|幸會
семья|家庭
друг|朋友
мужчина|男人
женщина|女人
ребёнок|孩子
дом|房子
школа|學校
работа|工作
город|城市
страна|國家
сегодня|今天
завтра|明天
вчера|昨天
утро|早晨
вечер|晚上
час|時間／小時
неделя|星期
месяц|月份
год|年
сейчас|現在
вода|水
хлеб|麵包
кофе|咖啡
еда|食物
фрукты|水果
овощи|蔬菜
ресторан|餐廳
счёт|帳單
голод|飢餓
вкусный|美味的
путешествие|旅行
поезд|火車
самолёт|飛機
вокзал|車站
гостиница|旅館
билет|票
налево|左邊
направо|右邊
близко|附近
далеко|遠
учиться|學習
понимать|理解
говорить|說話
слушать|聆聽
читать|閱讀
писать|寫作
вопрос|問題
ответ|答案
идея|想法
знание|知識`),
    frames: ['{term}','Я говорю: «{term}».','Я слышу: «{term}».','Я понимаю: «{term}».','Я повторяю: «{term}».','Это слово — «{term}».','Сегодня: «{term}».','В контексте: «{term}».','В вопросе есть «{term}».','В ответе есть «{term}».','Я могу использовать «{term}».','Я хочу запомнить «{term}».','Мне нужно практиковать «{term}».','Я узнаю «{term}».','Я записываю «{term}».','Я произношу «{term}».','Полезное выражение: «{term}».']
  },
  korean: {
    slug: 'korean', name: '韓語', nativeName: '한국어', flag: '🇰🇷', logo: '한', accent: '#2563eb', secondary: '#e11d48', speech: { engine: 'native', lang: 'ko-KR' },
    tagline: '듣기 · 말하기 · 읽기 · 쓰기', scriptNote: '韓文字母、收音、助詞、敬語與語尾層級',
    words: parsePairs(`안녕하세요|您好
안녕히 가세요|再見（對離開者）
감사합니다|謝謝
부탁합니다|拜託／請
네|是
아니요|不是
죄송합니다|對不起
어떻게 지내세요?|您好嗎
제 이름은 …입니다|我叫……
반갑습니다|幸會
가족|家庭
친구|朋友
남자|男人
여자|女人
아이|孩子
집|房子
학교|學校
일|工作
도시|城市
나라|國家
오늘|今天
내일|明天
어제|昨天
아침|早晨
저녁|晚上
시간|時間／小時
주|星期
달|月份
년|年
지금|現在
물|水
빵|麵包
커피|咖啡
음식|食物
과일|水果
채소|蔬菜
식당|餐廳
계산서|帳單
배고픔|飢餓
맛있어요|很好吃
여행|旅行
기차|火車
비행기|飛機
역|車站
호텔|旅館
표|票
왼쪽|左邊
오른쪽|右邊
가까워요|很近
멀어요|很遠
배우다|學習
이해하다|理解
말하다|說話
듣다|聆聽
읽다|閱讀
쓰다|寫作
질문|問題
대답|答案
생각|想法
지식|知識`),
    frames: ['{term}','“{term}”라고 말해요.','“{term}”을 들어요.','“{term}”을 이해해요.','“{term}”을 반복해요.','단어는 “{term}”이에요.','오늘의 표현: “{term}”.','문맥 속 표현: “{term}”.','질문에 “{term}”이 있어요.','대답에 “{term}”이 있어요.','“{term}”을 사용할 수 있어요.','“{term}”을 외우고 싶어요.','“{term}”을 연습해야 해요.','“{term}”을 알아봐요.','“{term}”을 적어요.','“{term}”을 발음해요.','유용한 표현: “{term}”.']
  }
};

const levelForOrder = order => order <= 20 ? 'A1' : order <= 40 ? 'A2' : order <= 60 ? 'B1' : order <= 80 ? 'B2' : order <= 92 ? 'C1' : 'C2';
const stageForOrder = order => Math.min(7, Math.floor((order - 1) / 13));
const stageBlueprints = [
  ['01','🌱','A1 生存入門','文字、發音、問候與基本需求'],['02','🏠','A1 核心生活','人物、時間、住家與現在式'],
  ['03','🧭','A2 日常溝通','飲食、購物、城市與旅行'],['04','💬','A2 進階橋梁','過去、未來、比較與完整互動'],
  ['05','🗺️','B1 獨立使用','敘事、條件、意見與任務解決'],['06','🎙️','B2 流暢表達','職場、新聞、辯論與正式寫作'],
  ['07','📚','C1 高階精準','語域、修辭、學術與跨文化'],['08','🏆','C2 深度掌握','細微語意、翻譯、即席表達與總整']
];

function makeVocabulary(config) {
  const zhFrames = ['{zh}','我說「{zh}」','我聽見「{zh}」','我理解「{zh}」','我複習「{zh}」','這個詞是「{zh}」','本日詞語：「{zh}」','在語境中使用「{zh}」','問題包含「{zh}」','答案包含「{zh}」','我可以使用「{zh}」','我想記住「{zh}」','我需要練習「{zh}」','我認得「{zh}」','我寫下「{zh}」','我跟讀「{zh}」','實用表達：「{zh}」'];
  return config.words.flatMap(([term, zh], wordIndex) => config.frames.map((frame, frameIndex) => ({
    id: `${config.slug}-${wordIndex + 1}-${frameIndex + 1}`,
    term: frame.replace('{term}', term), zh: zhFrames[frameIndex].replace('{zh}', zh),
    level: levelForOrder(Math.min(100, wordIndex + 1 + frameIndex * 3)),
    theme: ['基礎溝通','人物與生活','時間與日常','飲食與購物','旅行與城市','學習與抽象表達'][Math.floor(wordIndex / 10)]
  }))).slice(0, 1000);
}

function makeCourse(config) {
  const vocabulary = makeVocabulary(config);
  const stages = stageBlueprints.map(([number, icon, title, subtitle], index) => ({ id: `${config.slug}-stage-${index + 1}`, number, icon, title, subtitle, color: index % 2 ? config.secondary : config.accent }));
  const topics = sharedTopicGroups.flat();
  const lessons = topics.map((title, index) => {
    const order = index + 1; const level = levelForOrder(order); const start = (index * 7) % config.words.length;
    const words = Array.from({ length: 8 }, (_, offset) => config.words[(start + offset) % config.words.length]).map(([term, zh], offset) => ({ id: `${config.slug}-lesson-${order}-${offset}`, term, zh }));
    const alternatives = [words[2].zh, words[4].zh, words[6].zh];
    return {
      id: `lesson-${String(order).padStart(3, '0')}`, stage: stages[stageForOrder(order)].id, order, level, duration: order % 10 === 0 ? 75 : 50,
      title, subtitle: `${level} · ${config.scriptNote}`,
      objectives: [`掌握「${title}」的規則與使用時機`, `熟練本課 8 個${config.name}關鍵詞彙`, '完成聽說讀寫練習並保存私人筆記'], vocabulary: words,
      sections: [
        { title: '核心語料', body: `${words[0].term}  ·  ${words[1].term}`, note: `${words[0].zh}；${words[1].zh}` },
        { title: '文法與語用', body: `本課以「${title}」為主軸，從形式、語序與情境逐步比較正式及日常用法。`, note: `${config.scriptNote}；程度目標：${level}` },
        { title: '情境對話', body: `A：${words[2].term}\nB：${words[3].term}`, note: '先慢速跟讀，再遮住中文，以自然速度重述。' },
        { title: '輸出任務', body: `使用本課至少三個詞彙，完成一段與「${title}」有關的四句表達。`, note: '檢查發音、語序、詞形與語域。' }
      ],
      practice: { prompt: `請用${config.name}改寫或延伸：「${words[0].zh}」`, model: words[0].term, required: words.slice(0, 3).map(word => word.term) },
      quiz: { question: `「${words[0].term}」最貼近哪個中文意思？`, choices: [words[0].zh, ...alternatives], answer: 0, explanation: `正確語意是「${words[0].zh}」。` }
    };
  });
  return {
    ...config, vocabulary, stages, lessons, base: `/admin/law-exam/${config.slug}`,
    storageKey: `private-${config.slug}-academy-v1`, ownerKey: `private-${config.slug}-owner`,
    createDefault: () => ({ lessons: {}, games: { played: 0, correct: 0, best: 0, history: [] }, lastLesson: 'lesson-001', startedAt: new Date().toISOString() })
  };
}

export const privateLanguageCourses = Object.fromEntries(Object.entries(languageConfigs).map(([slug, config]) => [slug, makeCourse(config)]));
export const getPrivateLanguageCourse = slug => privateLanguageCourses[String(slug)] || null;
