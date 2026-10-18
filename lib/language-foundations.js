export const taiwaneseLearnerProfile = {
  title: '依你的語言背景設計：台灣華語 × 英語 × 日語',
  intro: '以台灣華語作為理解說明的主軸，英語用來連結 IPA、拉丁字母與同源詞，日語用來比較音拍、文字系統、助詞及敬語。比較只是橋梁，最後仍以目標語的原音與規則為準。',
  bridges: [
    { icon: '中', title: '從台灣華語出發', body: '利用注音熟悉的送氣／不送氣觀念與清楚的音節感；特別訓練華語沒有的濁音、複輔音、長短母音、詞尾子音和自由重音。不要用國語近似字取代原音。' },
    { icon: 'EN', title: '善用英語基礎', body: '用 IPA、拉丁字母、重音與大量同源詞加速理解；但逐項標記假朋友、不同字母音值，以及英語常見的母音滑動，避免把英語拼讀直接搬過去。' },
    { icon: '日', title: '善用日語基礎', body: '用假名學習經驗理解「先掌握文字—音值—音節再讀詞」的順序，也可比較敬語和助詞；但不可把五母音、拍節或日語外來語發音套到其他語言。' },
    { icon: '循', title: '固定五步學習法', body: '看字形與口形 → 聽原音辨識 → 慢速跟讀 → 最小對立比較 → 放入詞句並隔日複習。每次只練一個對比，錄音後從重音、母音、子音、節奏四項自評。' }
  ],
  routine: '建議每課 35–50 分鐘：5 分鐘辨音、10 分鐘口形與單音、10 分鐘最小對立、10 分鐘詞句跟讀、5 分鐘無文字聽寫，再把最容易混淆的三組記入私人筆記。'
};

const commonObjectives = language => [
  `建立${language}字形、IPA 與實際聲音的直接連結`,
  '能用台灣華語、英語及日語比較，但不依賴不精確的中文諧音',
  '完成辨音、跟讀、最小對立與錄音自評'
];

export const privateLanguageFoundationLessons = {
  french: {
    1: {
      title: '法語字母、拼字與讀音地圖', subtitle: 'A1 · 26 字母、附加符號與不發音字尾', objectives: commonObjectives('法語'),
      sections: [
        { title: '26 個字母名稱', body: 'A a /a/　B bé /be/　C cé /se/　D dé /de/　E e /ə/　F effe /ɛf/\nG gé /ʒe/　H ache /aʃ/　I i /i/　J ji /ʒi/　K ka /ka/　L elle /ɛl/　M emme /ɛm/\nN enne /ɛn/　O o /o/　P pé /pe/　Q ku /ky/　R erre /ɛʁ/　S esse /ɛs/　T té /te/\nU u /y/　V vé /ve/　W double vé /dubləve/　X ix /iks/　Y i grec /iɡʁɛk/　Z zède /zɛd/', note: '英語字母名稱只能幫助辨認字形，不能代替法語名稱。U /y/、R /ʁ/、J /ʒ/ 是第一批重點。', speech: 'a, bé, cé, dé, e, effe, gé, ache, i, ji, ka, elle, emme, enne, o, pé, ku, erre, esse, té, u, vé, double vé, ix, i grec, zède' },
        { title: '附加符號不是裝飾', body: 'é：通常 /e/，如 été。è、ê：常為 /ɛ/，如 père、fête。\nç：使 c 在 a/o/u 前讀 /s/，如 français。ë、ï、ü：提示分開發音，如 Noël、naïf。\nà、ù 多用來區別同形詞；â、î、ô 可保留歷史拼字並影響部分詞的音質。', note: '先看到符號再決定音值；不可像英文閱讀時忽略重音符號。', speech: 'été, père, fête, français, Noël, naïf' },
        { title: '拼字到聲音的核心規則', body: 'c + e/i/y → /s/；c + a/o/u → /k/。g + e/i/y → /ʒ/；g + a/o/u → /ɡ/。\nch 多為 /ʃ/；ph → /f/；gn → /ɲ/；qu → /k/。詞尾 d、s、t、x、z 常不發音，但有例外。h 本身通常不發音，h aspiré 仍會阻止連音與省音。', note: '法語不是逐字母拼讀；請把常見字母組當成一個單位。', speech: 'chat, photo, montagne, quatre, grand, petit, les amis' },
        { title: '給台灣華語／英語／日語使用者', body: '華語橋梁：送氣概念有用，但法語 p/t/k 重音節不像英語強烈送氣。\n英語橋梁：大量同源拼字可猜義，但法語字尾常靜音，母音不可英語化成雙母音。\n日語橋梁：可沿用「先熟文字音表」的方法；但法語允許複輔音，節奏不是假名的一拍一拍。', note: '禁止用「ㄈㄚˇ／フランス」等近似標音長期代替 IPA 與原音。' }
      ],
      practice: { prompt: '把 alphabet、français、montagne、été 分成字母組，標出會發音與不發音的部分。', model: 'français：fr + an /ɑ̃/ + ç /s/ + ais /ɛ/，最後 s 不發音。', required: ['français','montagne','été'] },
      quiz: { question: '法語 ç 的主要作用是什麼？', choices: ['讓 c 在 a、o、u 前讀 /s/','表示長母音','表示鼻母音','讓後一字母不發音'], answer: 0, explanation: 'ç 把原本可能讀 /k/ 的 c 改讀 /s/，例如 français。' }
    },
    2: {
      title: '法語母音系統：口腔母音、鼻母音與半母音', subtitle: 'A1 · 唇形、舌位、最小對立與穩定單母音', objectives: commonObjectives('法語'),
      sections: [
        { title: '核心口腔母音', body: '/i/ si　/y/ tu　/u/ tout\n/e/ été　/ø/ peu　/o/ mot\n/ɛ/ père　/œ/ sœur　/ɔ/ porte\n/a/ patte　/ɑ/ pâte（現代法語常與 /a/ 合流）　/ə/ le（弱 e，可能省略）', note: '最重要的三角對比是 /i–y–u/：舌位由前高到後高，而 /y/ 要保持 /i/ 的舌位再圓唇。英語與華語都不能直接提供 /y/。', speech: 'si, tu, tout, été, peu, mot, père, sœur, porte, patte, pâte, le' },
        { title: '四組鼻母音', body: '/ɑ̃/ sans、temps　/ɛ̃/ pain、vin　/ɔ̃/ bon、nom　/œ̃/ un、brun（許多口音與 /ɛ̃/ 合流）\n發音時軟顎下降，氣流同時經口腔與鼻腔；不是在母音後再加一個 /n/ 或 /ŋ/。後接另一個母音或雙寫 n/m 時通常恢復口腔母音，如 bonne。', note: '華語「安、恩」都有明確鼻尾；法語鼻母音要避免收出 n/ng。日語撥音 ん 也不是同一機制。', speech: 'sans, pain, bon, un, bonne' },
        { title: '三個半母音', body: '/j/ fille、pied；/ɥ/ huit、nuit；/w/ oui、moi。\n/j/ 類似英語 yes 的 y；/w/ 類似英語 we；/ɥ/ 是圓唇的 /j/，先做 /y/ 口形再迅速滑向下一母音。', note: '不要把每個拼寫母音拆成兩個完整音節。', speech: 'fille, pied, huit, nuit, oui, moi' },
        { title: '母音訓練程序', body: '① 鏡子確認圓唇：si–su、tu–tout。\n② 最小對立：des /de/–dès /dɛ/；peu /pø/–peur /pœʁ/；beau /bo/–bord /bɔʁ/。\n③ 鼻音對立：beau–bon、lait–lin、bas–banc。\n④ 每組先聽五次，再遮字跟讀，最後錄音比對。', note: '英語母音常滑動；法語多數母音需從頭到尾維持穩定口形。', speech: 'des, dès, peu, peur, beau, bord, bon, lait, lin, bas, banc' }
      ],
      practice: { prompt: '錄下 si–tu–tout、beau–bon、peu–peur，各重複三次並記錄唇形差異。', model: 'si /i/ 不圓唇；tu /y/ 前舌圓唇；tout /u/ 後舌圓唇。', required: ['si','tu','tout'] },
      quiz: { question: '法語 tu 的母音 /y/ 應如何形成？', choices: ['保持 /i/ 舌位並圓唇','把 /u/ 拉長','在 /i/ 後加 /u/','讀成英語 you'], answer: 0, explanation: '/y/ 是前高圓唇母音，不是雙母音，也不是英語 you。' }
    },
    3: {
      title: '法語子音、連誦、連音與節奏', subtitle: 'A1 · /ʁ/、/ʒ/、/ɲ/、清濁與語流', objectives: commonObjectives('法語'),
      sections: [
        { title: '子音總覽與難點', body: '塞音 /p b t d k ɡ/；擦音 /f v s z ʃ ʒ/；鼻音 /m n ɲ ŋ/；流音 /l ʁ/。\n/ʒ/ 如 jour，類似英語 measure 中間的音；/ɲ/ 如 montagne，接近義大利語 gn／日語「にゃ」的起始但不可多出母音；/ʁ/ 多為小舌擦音，不是英語 r。', note: '華語使用者要守住清濁對立：poisson /p/ 與 boisson /b/；英語使用者要減少 p/t/k 過強送氣。', speech: 'jour, chat, montagne, rue, poisson, boisson' },
        { title: '連誦 enchaînement', body: '前一詞原本就發音的子音會自然接到下一個以母音開頭的詞：avec elle → a-ve-kelle；il arrive → i-la-rive。', note: '這是音節重新分配，不是增加新聲音。', speech: 'avec elle, il arrive' },
        { title: '連音 liaison', body: '原本不發音的詞尾子音，在特定語法環境遇母音時出現：les amis /lezami/、vous avez /vu zave/、un grand homme /ɡʁɑ̃ tɔm/。\n必要連音：限定詞＋名詞、代名詞＋動詞等。禁止連音：et 之後、單數名詞之後、多數 h aspiré 前。選擇性連音反映正式程度。', note: '不能看見兩詞相鄰就全部連音；先學必要與禁止兩類。', speech: 'les amis, vous avez, un grand homme, et elle' },
        { title: '重音與節奏群', body: '法語詞彙重音不自由移動，通常落在節奏群最後一個可發音音節。句子按意義分組，組內音節長度較平均：Je voudrais | un café | s’il vous plaît。', note: '不要像英語每個內容詞都強重讀，也不要像日語逐拍切開。', speech: 'Je voudrais un café, s’il vous plaît.' }
      ],
      practice: { prompt: '標示 les amis、avec elle、et elle 哪一個是連音、連誦或禁止連音。', model: 'les amis：連音；avec elle：連誦；et elle：禁止連音。', required: ['les amis','avec elle','et elle'] },
      quiz: { question: '哪一組屬於必要連音？', choices: ['les amis','et elle','un garçon intelligent（名詞後）','haricot 前'], answer: 0, explanation: '限定詞 les 與母音起首名詞 amis 之間通常必須連音。' }
    }
  },
  german: {
    1: {
      title: '德語字母、變音符號與拼讀規則', subtitle: 'A1 · 26 字母＋Ä Ö Ü ß', objectives: commonObjectives('德語'),
      sections: [
        { title: '字母與四個特殊字形', body: 'A–Z 沿用拉丁字母。Ä ä、Ö ö、Ü ü 是獨立音值，不可只當裝飾；ß（Eszett）表示清音 /s/，大寫可寫 ẞ。\nä 常為 /ɛː/ 或 /ɛ/；ö 為 /øː/ 或 /œ/；ü 為 /yː/ 或 /ʏ/。', note: '英語可幫助辨字形；日語與華語都沒有完整對應的 ö、ü 長短對立。', speech: 'Äpfel, schön, fünf, Straße' },
        { title: '高頻字母組', body: 'ei → /aɪ/：mein；ie → /iː/：Liebe；eu/äu → /ɔʏ/：heute、Häuser。\nsch → /ʃ/：Schule；sp/st 在詞首常 → /ʃp, ʃt/：Sport、Straße；z → /ts/：Zeit；w → /v/：Wasser；j → /j/：ja。', note: '最常見錯誤是用英語讀 w、z、j，以及把 ei 與 ie 顛倒。', speech: 'mein, Liebe, heute, Häuser, Schule, Sport, Straße, Zeit, Wasser, ja' },
        { title: '外來字母與字尾', body: 'v 在德語本族詞常讀 /f/（Vater），外來詞可讀 /v/（Vase）；s 在母音前常讀 /z/（Sonne）。\n詞尾 b/d/g 常清化成 /p/t/k/：ab、Rad、Tag；拼字不變但聲音改變。', note: '英語使用者容易保留詞尾濁音；華語使用者則要避免在詞尾加「ㄜ」母音。', speech: 'Vater, Vase, Sonne, ab, Rad, Tag' },
        { title: '三語背景使用策略', body: '台灣華語：利用送氣／不送氣敏感度練 p–b、t–d、k–g，但德語核心是聲帶振動與送氣共同作用。\n英語：同源詞很多，但字母音值較規則；看到 w、j、z 必須切換德語模式。\n日語：可用外來語辨義，卻要去除插入母音，例如 Sport 不是「シュポルト」式逐拍延長。', note: '先朗讀無意義音節，再讀單字，可避免被既有拼字習慣干擾。' }
      ],
      practice: { prompt: '標出 mein、Liebe、Zeit、Wasser、Straße 的關鍵字母組與 IPA。', model: 'mein /maɪn/；Liebe /ˈliːbə/；Zeit /tsaɪt/；Wasser /ˈvasɐ/；Straße /ˈʃtʁaːsə/。', required: ['mein','Liebe','Zeit'] },
      quiz: { question: '德語字母 z 通常讀什麼？', choices: ['/ts/','英語 /z/','/ʃ/','不發音'], answer: 0, explanation: '例如 Zeit /tsaɪt/、zehn /tseːn/。' }
    },
    2: {
      title: '德語母音：長短、變音與雙母音', subtitle: 'A1 · 16 個核心單母音與 3 個主要雙母音', objectives: commonObjectives('德語'),
      sections: [
        { title: '母音長短會改變詞義', body: '長／緊：/iː yː eː øː ɛː aː oː uː/；短／鬆：/ɪ ʏ ɛ œ a ɔ ʊ/，另有弱音 /ə/、/ɐ/。\nStaat /ʃtaːt/–Stadt /ʃtat/；bieten /ˈbiːtən/–bitten /ˈbɪtən/；Ofen /ˈoːfən/–offen /ˈɔfən/。', note: '長短不只是時間，也常伴隨舌位與鬆緊差。華語沒有詞彙性的母音長短，日語雖有長音，但音質變化較少。', speech: 'Staat, Stadt, bieten, bitten, Ofen, offen' },
        { title: '拼字如何提示長短', body: '雙寫母音 aa/ee/oo、h 延長、ie 常提示長音：Saal、Meer、Boot、sehen、Liebe。\n雙寫子音、ck、tz 常提示前母音短：Mitte、kommen、backen、Katze。單一拼字仍需隨詞記憶。', note: '不要把 h 讀出來；它常是前一母音的長度標記。', speech: 'Saal, Meer, Boot, sehen, Liebe, Mitte, kommen, backen, Katze' },
        { title: '圓唇前母音 ä ö ü', body: 'i /iː/ → 圓唇成 ü /yː/；e /eː/ → 圓唇成 ö /øː/。短音同理：/ɪ/ → /ʏ/，/ɛ/ → /œ/。\n最小對立：Kiel–kühl、lesen–lösen、Kissen–küssen。', note: '華語「ü」可作 /y/ 起點，但德語還有長短；日語「ウ」不是 ü；英語通常沒有 /y, ø/。', speech: 'Kiel, kühl, lesen, lösen, Kissen, küssen' },
        { title: '三個主要雙母音', body: 'ei/ai → /aɪ/：mein、Mai；au → /aʊ/：Haus；eu/äu → /ɔʏ/：neu、Häuser。', note: '雙母音是一個音節內的滑動，不要拆成兩拍。', speech: 'mein, Mai, Haus, neu, Häuser' }
      ],
      practice: { prompt: '錄下 Staat–Stadt、bieten–bitten、Kiel–kühl，分別檢查長度與唇形。', model: '先誇張保持長音兩拍，再縮回自然長度；短音保持短而鬆。', required: ['Staat','Stadt','kühl'] },
      quiz: { question: '哪個拼字通常提示前面的母音較短？', choices: ['雙寫子音','ie','母音後的 h','雙寫母音'], answer: 0, explanation: '如 Mitte、kommen；其前母音通常為短音。' }
    },
    3: {
      title: '德語子音、Ich／Ach 音、清化與詞重音', subtitle: 'A1 · 複輔音與自然節奏', objectives: commonObjectives('德語'),
      sections: [
        { title: 'Ich-Laut /ç/ 與 Ach-Laut /x/', body: '前母音、變音母音或子音後常為 /ç/：ich、Milch、Bücher。\na、o、u、au 後常為 /x/：Bach、Buch、auch。/ç/ 在硬顎前部摩擦；/x/ 在軟顎後部摩擦。', note: '不要都讀成英語 /k/、/ʃ/ 或華語「ㄏ」。日語「ヒ」可提示前部摩擦，但不可加 /i/。', speech: 'ich, Milch, Bücher, Bach, Buch, auch' },
        { title: 'R、顫音與元音化', body: '標準德語詞首 r 常為小舌音 [ʁ] 或顫音 [ʀ]；音節尾 er 常元音化為 [ɐ]：Lehrer /ˈleːʁɐ/。不同地區也可用舌尖顫音 [r]。', note: '重點是穩定而可理解，不必強迫模仿單一 r；但不要直接使用英語捲舌 r。', speech: 'rot, Reise, Lehrer, besser' },
        { title: '清濁、送氣與詞尾清化', body: '詞首 p/t/k 通常明顯送氣；b/d/g 較少送氣並可弱濁。詞尾 b/d/g 清化：lieb /liːp/、Hund /hʊnt/、Weg /veːk/。變化詞形可恢復濁音：liebe、Hunde、Wege。', note: '台灣華語的送氣對立可幫助控制氣流，但仍要觀察聲帶；詞尾不可加母音。', speech: 'lieb, liebe, Hund, Hunde, Weg, Wege' },
        { title: '重音與複合詞', body: '本族詞常重第一音節：Mutter、arbeiten。不可分前綴常不重讀：be-, ge-, ver-, zer-；可分前綴通常重讀：AUFstehen。複合詞主要重音常在第一成分：BAHNhof。', note: '英語重音可作概念橋梁，但每個德語詞仍要連同重音一起記。', speech: 'Mutter, arbeiten, verstehen, aufstehen, Bahnhof' }
      ],
      practice: { prompt: '將 ich、Buch、Hund、Hunde、aufstehen 分類為 /ç/、/x/、詞尾清化或重音練習。', model: 'ich /ç/；Buch /x/；Hund 詞尾 /t/；Hunde 恢復 /d/；AUFstehen 前綴重讀。', required: ['ich','Buch','Hund'] },
      quiz: { question: 'Buch 的 ch 通常讀哪一個音？', choices: ['/x/ Ach-Laut','/ç/ Ich-Laut','/k/','/ʃ/'], answer: 0, explanation: 'ch 位於後母音 u 之後，通常是 Ach-Laut /x/。' }
    }
  },
  russian: {
    1: {
      title: '俄語西里爾字母完整入門：33 個字母', subtitle: 'A1 · 印刷體、字母名稱、音值與假朋友', objectives: commonObjectives('俄語'),
      sections: [
        { title: '第一組：外形與拉丁字母相近、音也相近', body: 'А а /a/　К к /k/　М м /m/　О о /o/（非重讀會弱化）　Т т /t/\n例：мама、так、кот。', note: '這組最容易，但仍要注意俄語 т、к 在軟音環境會顎化，о 非重讀不一定保持 /o/。', speech: 'мама, так, кот' },
        { title: '第二組：外形相同但聲音不同的假朋友', body: 'В в /v/（不是 B）　Е е /je/ 或使前音變軟（不是 E）　Н н /n/（不是 H）\nР р /r/（不是 P）　С с /s/（不是 C）　У у /u/（不是 Y）　Х х /x/（不是 X）', note: '英語讀者最容易在這組誤判。做雙向卡片：看到 Р 立刻說 /r/，看到 /r/ 立刻寫 Р。', speech: 'вода, нет, Россия, суп, хорошо' },
        { title: '第三組：新字形與主要音值', body: 'Б б /b/　Г г /ɡ/　Д д /d/　Ё ё /jo/　Ж ж /ʐ/　З з /z/　И и /i/\nЙ й /j/　Л л /l/　П п /p/　Ф ф /f/　Ц ц /ts/　Ч ч /tɕ/　Ш ш /ʂ/　Щ щ /ɕː/', note: 'ж、ш 是硬音；ч、щ 是軟音。華語「ㄓ／ㄕ／ㄑ」只能提示大方向，舌位並不相同。', speech: 'борщ, газета, ёлка, жизнь, чай, школа, щи' },
        { title: '第四組：母音字母與兩個符號', body: 'Ы ы /ɨ/　Э э /e/　Ю ю /ju/ 或使前音變軟　Я я /ja/ 或使前音變軟\nЬ ь 軟音符號：本身無聲，使前一子音顎化或分隔。Ъ ъ 硬音符號：本身無聲，阻止顎化並保留 /j/ 起音。', note: '日語小字ゃゅょ只是外觀上的學習聯想，功能不同；ь、ъ 不是母音也不是停頓。', speech: 'мы, это, люди, язык, день, объект' },
        { title: '33 字母總表與學習順序', body: 'А Б В Г Д Е Ё Ж З И Й К Л М Н О П Р С Т У Ф Х Ц Ч Ш Щ Ъ Ы Ь Э Ю Я\n第 1 天：認讀四組；第 2 天：聽音選字；第 3 天：大寫小寫配對；第 4 天：讀開音節；第 5 天：加入重音與軟硬音。', note: '俄語字母名稱與單字中的音值不同；課程以「音值優先、名稱輔助」處理。', speech: 'А, Б, В, Г, Д, Е, Ё, Ж, З, И, Й, К, Л, М, Н, О, П, Р, С, Т, У, Ф, Х, Ц, Ч, Ш, Щ, Ы, Э, Ю, Я' }
      ],
      practice: { prompt: '將 33 個字母分成「相同朋友、假朋友、新字形、無聲符號」，並朗讀每組。', model: '假朋友：В Е Н Р С У Х；無聲符號：Ь Ъ。', required: ['Р=/r/','С=/s/','Н=/n/'] },
      quiz: { question: '哪個西里爾字母看似拉丁 P，但讀 /r/？', choices: ['Р','В','Н','С'], answer: 0, explanation: 'Р р 讀舌尖顫音／閃音 /r/，是重要的拉丁字母假朋友。' }
    },
    2: {
      title: '俄語 10 個母音字母、母音弱化與 Ы', subtitle: 'A1 · 重音決定母音實際讀法', objectives: commonObjectives('俄語'),
      sections: [
        { title: '硬組與軟化組', body: '硬組：а /a/、э /e/、ы /ɨ/、о /o/、у /u/。\n軟化組：я /ja/、е /je/、и /i/、ё /jo/、ю /ju/；位於子音後時，主要功能常是使前一子音顎化，/j/ 不一定獨立出現。', note: '把兩列成對記：а–я、э–е、ы–и、о–ё、у–ю。這比照字母表順序死背有效。', speech: 'а, я, э, е, ы, и, о, ё, у, ю' },
        { title: '重音不是可有可無', body: '俄語重音自由且能移動，通常不標在一般文字中：за́мок「城堡」– замо́к「鎖」。學新詞必須連重音一起記。ё 幾乎總是重讀。', note: '華語聲調不能代替俄語重音；日語高低アクセント也不同。俄語重讀音節同時更長、更清楚、更有力度。', speech: 'за́мок, замо́к, всё, ещё' },
        { title: 'Аканье 與 Иканье', body: 'о 在非重讀位置常趨近 /a/ 或更弱的 [ɐ, ə]：молоко́ 約 [məɫɐˈko]。\nя、е 在軟子音後非重讀時常向 [ɪ] 集中：язы́к、сестра́。實際程度依離重音距離而變。', note: '不能照拼字把每個 о 都讀成清楚 /o/；這是外國口音最明顯的來源之一。', speech: 'молоко, хорошо, язык, сестра' },
        { title: 'Ы /ɨ/ 的形成', body: '先發 /i/，保持舌尖低、把舌身向後收，不圓唇；不要插入 /w/ 或讀成「ㄨ一」。最小對立：бить /bʲitʲ/–быть /bɨtʲ/；мил /mʲil/–мыл /mɨl/。', note: '英語與日語沒有直接對應音；以口腔動作學，不用中文諧音。', speech: 'бить, быть, мил, мыл, мы, ты' }
      ],
      practice: { prompt: '為 замок 的兩個意思標重音，並解釋 молоко 三個 о 為何不同。', model: 'за́мок 城堡；замо́к 鎖。молоко́ 只有最後 o 重讀且保持 /o/。', required: ['за́мок','замо́к','молоко́'] },
      quiz: { question: '俄語非重讀 о 通常如何變化？', choices: ['向 /a/、[ɐ] 或 [ə] 弱化','永遠保持清楚 /o/','變成 /u/','完全不發音'], answer: 0, explanation: '這稱為 аканье，是標準俄語的重要母音弱化規則。' }
    },
    3: {
      title: '俄語子音：硬音、軟音、清濁與顎化', subtitle: 'A1 · 成對系統與無對應子音', objectives: commonObjectives('俄語'),
      sections: [
        { title: '硬／軟成對概念', body: '多數子音有硬軟對立：б/бь、в/вь、г/гь、д/дь、з/зь、к/кь、л/ль、м/мь、н/нь、п/пь、р/рь、с/сь、т/ть、ф/фь、х/хь。\n軟音不是在後面加 /j/；而是發子音時舌中部同時抬向硬顎。', note: '日語拗音可提示「舌位一起改變」，但俄語顎化是子音本身的音位特徵。', speech: 'был, бил, мат, мать, угол, уголь' },
        { title: '哪些字母提示軟化', body: '子音後的 е、ё、и、ю、я 通常提示軟音；ь 直接標示軟音：день。а、э、ы、о、у 與 ъ 通常維持硬音。\n永遠偏硬：ж、ш、ц；永遠偏軟：й、ч、щ。', note: '拼字規則有例外與歷史殘留，先以高頻詞建立聽覺分類。', speech: 'лук, люк, нос, нёс, день, чай, щи' },
        { title: '清濁成對', body: '濁／清：б–п、в–ф、г–к、д–т、ж–ш、з–с。詞尾濁子音會清化：дуб → [dup]；мороз → [mɐˈros]。濁音前可逆向同化：просьба 中 с 受 б 影響。', note: '英語也有清濁，但俄語同化更系統；華語使用者要練聲帶振動，而非只靠送氣。', speech: 'дуб, дубы, мороз, просьба' },
        { title: 'Р、Л 與子音群', body: 'р 為舌尖顫音或單擊音；硬 л 舌背略後縮，軟 ль 舌中抬高。俄語容許複雜子音群：встреча、здравствуйте。練習時先慢速分組，再刪除插入母音。', note: '日語與華語使用者常在子音群中加母音；應用節拍器保持子音相接。', speech: 'Россия, река, был, были, встреча, здравствуйте' }
      ],
      practice: { prompt: '比較 был–бил、мат–мать、лук–люк，記錄舌中部是否抬高。', model: '第二個詞的子音較軟；不能只在後面附加一個「衣」音。', required: ['был–бил','мат–мать','лук–люк'] },
      quiz: { question: '俄語軟子音的主要特徵是什麼？', choices: ['發子音時舌中部同時抬向硬顎','在後面多加完整 /i/','一定提高音高','一定變成清音'], answer: 0, explanation: '顎化是子音本身的第二發音動作。' }
    },
    4: {
      title: '俄語重音、語調與連續語流', subtitle: 'A1 · 從單字正確進入自然句子', objectives: commonObjectives('俄語'),
      sections: [
        { title: '每個詞連同重音記憶', body: '重音位置無法完全由拼字預測，也可能隨詞形移動：рука́–ру́ки；окно́–о́кна。字典與本課會用重音符號教學，正常俄文通常省略。', note: '建立詞卡時，若沒有重音標記就視為資料不完整。', speech: 'рука, руки, окно, окна' },
        { title: '陳述、是非問句與疑問詞問句', body: '陳述句句末下降。無疑問詞的是非問句，焦點詞上產生明顯升高後下降：Это ма́ма? 疑問詞問句通常在疑問詞或焦點後逐步下降：Кто э́то?', note: '不要套用華語每個問句末尾都上揚的直覺。', speech: 'Это мама. Это мама? Кто это?' },
        { title: '語流中的同化與介系詞', body: '介系詞常與後詞形成同一語音單位：в Москве́、с дру́гом。清濁會依後一子音調整；相同或相近子音需保持正確長度。', note: '先標語意組，再一口氣朗讀，避免逐字停頓。', speech: 'в Москве, с другом, к школе' }
      ],
      practice: { prompt: '朗讀 Это мама.／Это мама?，錄音比較焦點音節與句末走向。', model: '問句在 ма́- 明顯升高，再於句末下降；不是只把最後一音抬高。', required: ['Это мама.','Это мама?'] },
      quiz: { question: '學習新的俄語單字時，哪項資訊必須一起記？', choices: ['詞彙重音','英語式音標拼法','中文諧音','固定句末升調'], answer: 0, explanation: '重音會影響母音品質與詞義，是俄語詞彙的一部分。' }
    },
    5: {
      title: '俄語印刷體、斜體與手寫體辨識', subtitle: 'A1 · 避免看得懂印刷體卻讀不懂筆記', objectives: commonObjectives('俄語'),
      sections: [
        { title: '高風險斜體字形', body: '斜體 т 常像拉丁 m；и 常像 u；п 常像 n；д 小寫手寫常像帶尾巴的 g；ш 像連續的 m；л 常像尖頂。', note: '這些仍是同一字母，不是新的字母。先做印刷體—斜體—聲音三向配對。' },
        { title: '書寫原則', body: '俄語手寫多連筆；先維持高度、傾斜與連接點一致，再追求速度。對 и、ш、щ、м 加入起筆或底線提示，避免一串波浪難辨。', note: '每天抄寫五個含高風險字母的單字，並立即朗讀。' },
        { title: '閱讀策略', body: '第一遍圈出假朋友；第二遍標重音；第三遍標硬軟音；第四遍按語意組朗讀。遇到手寫體先還原成印刷體，再判音。', note: '避免同時猜字形、重音與意思造成過度負荷。' }
      ],
      practice: { prompt: '把 мир、папа、школа、люди 以印刷體與連筆各寫三次並朗讀。', model: '每次書寫後遮住原文，從自己的手寫反讀。', required: ['мир','папа','школа'] },
      quiz: { question: '俄語斜體 т 常看起來像哪個拉丁字母？', choices: ['m','t','r','x'], answer: 0, explanation: '這是初學者閱讀俄語斜體最常見的辨識陷阱之一。' }
    }
  },
  korean: {
    1: {
      title: '韓文字母全貌：現代 40 個字母與造字原理', subtitle: 'A1 · 19 子音＋21 母音；韓語沒有日語五十音', objectives: commonObjectives('韓語'),
      sections: [
        { title: '先釐清：不是「四十音」，而是 40 個現代韓文字母', body: '現代韓文基本書寫系統常整理為 19 個子音字母與 21 個母音字母，共 40 個。它不像日語五十音按固定「子音＋母音」列成音節表；字母會組成方塊，一個方塊代表一個音節。', note: '你可沿用學假名時「字形—音值—反覆辨認」的方法，但韓文是拼音字母，能自由組合。' },
        { title: '14 基本子音', body: 'ㄱ g/k　ㄴ n　ㄷ d/t　ㄹ r/l　ㅁ m　ㅂ b/p　ㅅ s\nㅇ 音節首無聲／收音 ng　ㅈ j　ㅊ ch　ㅋ k　ㅌ t　ㅍ p　ㅎ h', note: '羅馬字只是提示。真正差異要用「平音／送氣音／緊音」與音節位置判斷。', speech: '가, 나, 다, 라, 마, 바, 사, 아, 자, 차, 카, 타, 파, 하' },
        { title: '5 個緊音補足 19 子音', body: 'ㄲ kk　ㄸ tt　ㅃ pp　ㅆ ss　ㅉ jj。緊音不是單純「更大聲」或英文雙寫；起音時聲門與口腔張力較高，送氣很少。', note: '台灣華語有送氣／不送氣經驗，但韓語是三分對立：平音 ㄱ、送氣音 ㅋ、緊音 ㄲ。', speech: '가, 카, 까, 다, 타, 따, 바, 파, 빠, 자, 차, 짜' },
        { title: '10 基本母音與 11 複合母音', body: '基本：ㅏ a　ㅑ ya　ㅓ eo　ㅕ yeo　ㅗ o　ㅛ yo　ㅜ u　ㅠ yu　ㅡ eu　ㅣ i\n複合：ㅐ ae　ㅒ yae　ㅔ e　ㅖ ye　ㅘ wa　ㅙ wae　ㅚ oe　ㅝ wo　ㅞ we　ㅟ wi　ㅢ ui', note: '現代首爾語中 ㅐ/ㅔ 常合流，但拼字仍不同；ㅓ、ㅡ、ㅢ 是華語、英語、日語背景者的核心難點。', speech: '아, 야, 어, 여, 오, 요, 우, 유, 으, 이, 애, 얘, 에, 예, 와, 왜, 외, 워, 웨, 위, 의' },
        { title: '字母如何組成音節方塊', body: '基本結構：初聲＋中聲，如 ㄱ＋ㅏ＝가。母音形狀決定左右或上下排列：ㅏ/ㅓ/ㅣ 類左右排；ㅗ/ㅜ/ㅡ 類上下排。可再加入終聲：ㄱ＋ㅏ＋ㄴ＝간。沒有起始子音時用 ㅇ 佔位：아。', note: '日語一個假名多對應一拍；韓語方塊內可同時包含起音、母音與收音。', speech: '가, 고, 간, 아, 한글' }
      ],
      practice: { prompt: '把 19 子音、21 母音分組抄寫，並組合 가、너、도、무、한、글。', model: '한＝ㅎ＋ㅏ＋ㄴ；글＝ㄱ＋ㅡ＋ㄹ。', required: ['19 子音','21 母音','한글'] },
      quiz: { question: '現代韓文常說的 40 個字母如何組成？', choices: ['19 子音＋21 母音','14 子音＋26 母音','40 個固定音節','日語五十音去掉十個'], answer: 0, explanation: '韓文是拼音字母；40 個現代字母可組合成大量音節方塊。' }
    },
    2: {
      title: '韓語 21 個母音：口形、舌位與複合規則', subtitle: 'A1 · ㅓ／ㅗ、ㅡ／ㅜ、ㅐ／ㅔ、ㅢ', objectives: commonObjectives('韓語'),
      sections: [
        { title: '10 個基本母音逐組學', body: 'ㅏ /a/–ㅑ /ja/；ㅓ /ʌ~ɔ/–ㅕ /jʌ/；ㅗ /o/–ㅛ /jo/；ㅜ /u/–ㅠ /ju/；ㅡ /ɯ/；ㅣ /i/。\n加一短畫的 ㅑㅕㅛㅠ 含 /j/ 起音，不是把母音拉長。', note: '日語 ヤ行可提示 /j/，但 ㅓ 與 ㅡ 在日語五母音中沒有對應。', speech: '아, 야, 어, 여, 오, 요, 우, 유, 으, 이' },
        { title: 'ㅓ、ㅗ 與 ㅡ、ㅜ', body: 'ㅓ：舌位較後、通常不圓唇；ㅗ：後舌且圓唇。ㅡ：後高不圓唇；ㅜ：後高圓唇。\n最小對立：거–고、서–소、그–구、은–운。', note: '華語「ㄜ」不是穩定的 ㅓ；日語 オ、ウ 也不能完整覆蓋。用鏡子確認圓唇才可靠。', speech: '거, 고, 서, 소, 그, 구, 은, 운' },
        { title: '11 個複合母音', body: 'ㅐ /ɛ/、ㅒ /jɛ/、ㅔ /e/、ㅖ /je/；ㅘ /wa/、ㅙ /wɛ/、ㅚ /we/；ㅝ /wʌ/、ㅞ /we/、ㅟ /wi/；ㅢ /ɰi/。\n現代口語中 ㅐ/ㅔ、ㅙ/ㅞ/ㅚ 常接近，但拼字與部分說話者仍區分。', note: '先學規範拼字與共同發音，再訓練能聽懂不同說話者，不強造已弱化的對立。', speech: '애, 얘, 에, 예, 와, 왜, 외, 워, 웨, 위, 의' },
        { title: 'ㅢ 的位置變化', body: '詞首 의 通常 [ɰi]；非詞首常接近 [i]；助詞 의 常讀 [e]，也可保留 [ɰi]。例如 의사、회의、나의。', note: '一個拼字在不同位置可有慣用讀法，需整詞記憶。', speech: '의사, 회의, 나의' }
      ],
      practice: { prompt: '錄下 거–고、그–구、애–에、의사–회의–나의，比較唇形與位置變化。', model: 'ㅓ、ㅡ 不圓唇；ㅗ、ㅜ 圓唇；의 依位置可有不同常用讀法。', required: ['거–고','그–구','의'] },
      quiz: { question: 'ㅡ 與 ㅜ 最明顯的口形差異是什麼？', choices: ['ㅡ 不圓唇，ㅜ 圓唇','ㅡ 圓唇，ㅜ 不圓唇','只有長短不同','完全沒有差異'], answer: 0, explanation: '兩者皆為高後舌附近母音，但圓唇是關鍵對立。' }
    },
    3: {
      title: '韓語 19 個子音：平音、送氣音與緊音', subtitle: 'A1 · 三分對立與音節位置變化', objectives: commonObjectives('韓語'),
      sections: [
        { title: '平音組', body: 'ㄱ、ㄷ、ㅂ、ㅈ 在詞首介於華語／英語清音與濁音直覺之間；詞中母音之間常較濁。ㅅ 為擦音，ㅣ 與 y 類母音前會顎化；ㄴ、ㅁ、ㅇ 為鼻音；ㄹ 在母音間近似閃音，收音近似 l。', note: '羅馬字 g/d/b/j 不是要求你固定讀成英語濁音。要依位置聽實際聲音。', speech: '가구, 다리, 바보, 자주, 사람, 나라, 머리, 아기, 라디오' },
        { title: '送氣音組', body: 'ㅋ、ㅌ、ㅍ、ㅊ、ㅎ 具有較強氣流。用薄紙放在嘴前比較：가–카、다–타、바–파、자–차。', note: '台灣華語 ㄎㄊㄆ 可作氣流概念橋梁，但韓語發聲起始時間與音高線索仍不同。', speech: '가, 카, 다, 타, 바, 파, 자, 차' },
        { title: '緊音組', body: 'ㄲ、ㄸ、ㅃ、ㅆ、ㅉ 使用較高喉頭與口腔張力，幾乎不送氣，後接母音起始音高通常較高。比較 달–탈–딸、불–풀–뿔。', note: '不要用「雙子音＝拉長」理解；緊音主要是起音方式與張力。', speech: '달, 탈, 딸, 불, 풀, 뿔, 자다, 차다, 짜다' },
        { title: 'ㅅ、ㅈ、ㅊ 與 ㅎ 的位置音變', body: 'ㅅ/ㅆ 在 ㅣ、ㅑㅕㅛㅠ 等前接近 [ɕ]；ㅈ/ㅊ 為齦顎塞擦音，不等同英語 j/ch；ㅎ 在語流中可弱化，也會使鄰近塞音送氣化。', note: '日語 し、ち 可提示舌位方向，但韓語仍有自己的三分對立與收音規則。', speech: '시, 샤, 지, 치, 좋아요, 놓고' }
      ],
      practice: { prompt: '用薄紙與錄音比較 가–카–까、다–타–따、바–파–빠。', model: '送氣音紙張移動最大；緊音張力最大但氣流少；平音居中且音高線索不同。', required: ['가–카–까','다–타–따','바–파–빠'] },
      quiz: { question: '韓語緊音 ㄲ、ㄸ、ㅃ、ㅆ、ㅉ 的核心特徵是什麼？', choices: ['高張力、少送氣','單純拉長兩倍','一定是濁音','一定在詞尾'], answer: 0, explanation: '緊音不是長音；它以喉頭與口腔張力、較少送氣等線索構成。' }
    },
    4: {
      title: '韓語音節方塊與收音（받침）完整入門', subtitle: 'A1 · 27 種收音拼字歸併為 7 個代表音', objectives: commonObjectives('韓語'),
      sections: [
        { title: '音節方塊四種骨架', body: 'V：아；CV：가；VC：안；CVC：간。垂直母音左右排，水平母音上下排；複合母音仍視為一個中聲。雙收音放在底部。', note: '看到方塊先找中聲母音，再找初聲與終聲，不要把整個方塊當圖畫死背。', speech: '아, 가, 안, 간, 한글' },
        { title: '七個代表收音', body: '終聲拼字雖多，音節末通常歸併為：ㄱ類 [k̚]、ㄴ [n]、ㄷ類 [t̚]、ㄹ [l]、ㅁ [m]、ㅂ類 [p̚]、ㅇ [ŋ]。\n末尾塞音不爆破：입 [ip̚]、옷 [ot̚]、국 [kuk̚]。', note: '英語詞尾常爆破；華語只有 n/ng 鼻尾；日語常加母音。三種既有習慣都需主動抑制。', speech: '국, 산, 옷, 달, 밤, 입, 방' },
        { title: '雙收音', body: 'ㄳ ㄵ ㄶ ㄺ ㄻ ㄼ ㄽ ㄾ ㄿ ㅀ ㅄ。單獨位於詞尾時通常只實現其中一個代表音；後接母音或子音時依詞形發生連音、送氣化或其他變化：읽다、읽어요、없다、없어요。', note: '雙收音不能只靠一條規則；以「基本形＋常用變化」成組記。', speech: '읽다, 읽어요, 없다, 없어요' },
        { title: '收音檢查法', body: '① 嘴停在阻塞位置，不釋放多餘氣流。② 不加「ㄜ／ウ」等母音。③ 接下一音節時再判斷是否連音。④ 用波形或錄音檢查是否多出一節。', note: '先練 국–구、입–이、옷–오，確認有無多餘母音。', speech: '국, 구, 입, 이, 옷, 오' }
      ],
      practice: { prompt: '把 국、옷、달、밤、입、방 分到七個代表收音，並朗讀不爆破。', model: '국 [k̚]；옷 [t̚]；달 [l]；밤 [m]；입 [p̚]；방 [ŋ]。', required: ['국','옷','입'] },
      quiz: { question: '韓語音節末的 ㄱ 通常如何發音？', choices: ['不爆破的 [k̚]','完整爆破 [kʰ]','加母音讀 [kɯ]','永遠不發音'], answer: 0, explanation: '收音塞音通常保持閉塞、不釋放，後續音節才可能引發連音。' }
    },
    5: {
      title: '韓語連音與主要音變', subtitle: 'A1 · 連音、鼻音化、流音化、緊音化與送氣化', objectives: commonObjectives('韓語'),
      sections: [
        { title: '連音（연음）', body: '收音後接以 ㅇ 開始的母音音節時，收音常移到下一音節起音：한국어 → [한구거]；먹어요 → [머거요]；옷이 → [오시]（並伴隨顎化環境）。', note: 'ㅇ 在音節首只是無聲佔位，讓前一收音有機會連到下一母音。', speech: '한국어, 먹어요, 옷이' },
        { title: '鼻音化與流音化', body: '阻塞音遇 ㄴ/ㅁ 常鼻音化：국물 [궁물]、앞문 [암문]。ㄴ 與 ㄹ 相遇常流音化為 [ll]：신라 [실라]。', note: '音變是為了讓連續發音更順，不是拼字錯誤。閱讀時保留拼字，口說時套用音變。', speech: '국물, 앞문, 신라' },
        { title: '緊音化', body: '部分收音後的平音會變緊：학교 [학꾜]、먹다 [먹따]、국밥 [국빱]。規則受詞彙與形態邊界影響，需以高頻詞累積。', note: '不要把拼字改成緊音；這是發音規則。', speech: '학교, 먹다, 국밥' },
        { title: '送氣化與顎化', body: 'ㅎ 與 ㄱㄷㅂㅈ 相鄰常產生送氣音：좋다 [조타]、놓고 [노코]。ㄷ/ㅌ＋이 常顎化：같이 [가치]、굳이 [구지]。', note: '先找音節邊界，再依相鄰音判斷；不要逐字母孤立朗讀。', speech: '좋다, 놓고, 같이, 굳이' },
        { title: '三語背景的語流提醒', body: '華語：不可用聲調取代句子焦點，詞尾阻塞音需不爆破。英語：不要依羅馬字發音，也不要保留每個拼寫子音。日語：避免把每個方塊等同一拍並插入母音；韓語音變跨音節發生。', note: '每個新詞至少保存「拼字、詞義、規範讀音、音變理由」四欄。' }
      ],
      practice: { prompt: '為 한국어、국물、학교、같이 標出連音或音變後的讀法。', model: '한국어 [한구거]；국물 [궁물]；학교 [학꾜]；같이 [가치]。', required: ['한국어','국물','학교','같이'] },
      quiz: { question: '학교 常讀成接近 [학꾜]，主要發生哪種音變？', choices: ['緊音化','鼻音化','母音弱化','流音化'], answer: 0, explanation: '收音 ㄱ 後的平音 ㄱ 在此變為緊音 ㄲ。' }
    }
  }
};

export const spanishFoundationLessons = {
  1: {
    title: '西班牙語字母、拼讀與詞重音完整入門', subtitle: 'A1 · 27 字母、字母組與重音符號', objectives: commonObjectives('西班牙語'),
    sections: [
      { title: '27 個字母與高風險字母', body: '西語字母表有 27 字母，包含 Ñ ñ。B/V 多數地區不構成音位對立；H 不發音；J 與 g(e/i) 為後部擦音 /x/；Ñ 為 /ɲ/；R/RR 表示閃音與顫音；Y 可作子音或母音。', note: '英語字母可幫辨字形，但不能套用英語名稱與音值。日語外來語也不可取代西語原音。', speech: 'be, uve, hache, jota, eñe, erre, doble erre, ye' },
      { title: 'C、G、Q 與地區變體', body: 'c + a/o/u → /k/；c + e/i 在拉美多 /s/、西班牙中北部多 /θ/。g + a/o/u → /ɡ/；g + e/i → /x/；gue/gui 中 u 通常不發音，güe/güi 的 ü 提示 u 要發音。q 只常見於 que/qui，u 不發音。', note: '先選一種主要口音穩定輸出，同時學會聽懂另一種。', speech: 'casa, cine, gente, guitarra, pingüino, queso' },
      { title: '重音三規則', body: '無重音符號時：以母音、n、s 結尾通常重倒數第二音節；其他子音結尾通常重最後音節。偏離規則就寫重音符號：teléfono、inglés。重音符號也可區別同形詞：sí/si、tú/tu。', note: '華語聲調與日語高低アクセント都不能代替西語詞重音；每詞以一個主要重讀音節為核心。', speech: 'casa, hablan, reloj, teléfono, inglés, sí, si, tú, tu' },
      { title: '依你的三語背景學習', body: '台灣華語：可利用清楚音節感，但要補詞尾子音與顫音。英語：同源詞多，卻要移除英語母音滑動與弱化。日語：五母音相近可作起點，但西語有子音群、词尾子音與不同重音節奏。', note: '先按西語拼讀，不用英文單字讀法或日語片假名讀法。' }
    ],
    practice: { prompt: '替 casa、reloj、teléfono、inglés 標出重讀音節並說明規則。', model: 'CA-sa；re-LOJ；te-LÉ-fo-no；in-GLÉS。', required: ['casa','reloj','teléfono'] },
    quiz: { question: '沒有重音符號且以母音、n、s 結尾的詞，通常重讀哪裡？', choices: ['倒數第二音節','最後音節','第一音節','每個音節都一樣'], answer: 0, explanation: '這是西語預設詞重音的核心規則之一。' }
  },
  2: {
    title: '西班牙語五母音與穩定發音', subtitle: 'A1 · /a e i o u/、連母音與英語去干擾', objectives: commonObjectives('西班牙語'),
    sections: [
      { title: '五個穩定母音', body: 'a /a/：casa；e /e/：mesa；i /i/：vino；o /o/：loco；u /u/：luna。無論重讀與否，音質通常比英語穩定清楚。', note: '英語使用者要避免 e、o 滑成雙母音；華語與日語五母音可作起點，但口形仍需依西語校準。', speech: 'casa, mesa, vino, loco, luna' },
      { title: '強母音與弱母音', body: 'a、e、o 為強母音；i、u 為弱母音。弱＋強、強＋弱或兩弱常形成雙母音：tierra、aire、ciudad。重音符號可打破雙母音形成 hiatus：país、río。', note: '不要看到兩個母音就固定拆成兩音節，也不要全部合併；看強弱與重音。', speech: 'tierra, aire, ciudad, país, río' },
      { title: '最小對立與節奏', body: 'peso–piso、mesa–misa、cosa–casa、puso–paso。先維持每個母音清楚，再把重讀音節拉出。西語節奏比英語更接近音節等時，但仍有句子焦點。', note: '日語五母音相似，不代表重音與音節長度相同；不要自動加入日語長音。', speech: 'peso, piso, mesa, misa, cosa, casa, puso, paso' }
    ],
    practice: { prompt: '錄下 a-e-i-o-u，再讀 peso–piso、cosa–casa、país–aire。', model: '每個母音保持單一口形；país 分兩音節，aire 通常含雙母音。', required: ['a-e-i-o-u','país','aire'] },
    quiz: { question: '西語重音符號在 país 中造成什麼效果？', choices: ['打破雙母音，分成兩音節','讓 s 不發音','把 a 變成鼻母音','形成長母音'], answer: 0, explanation: '重讀弱母音 í 與 a 分開，pa-ís 為兩音節。' }
  },
  3: {
    title: '西班牙語子音、顫音與自然語流', subtitle: 'A1 · 清濁變體、R/RR、LL/Y 與音節連接', objectives: commonObjectives('西班牙語'),
    sections: [
      { title: 'B/D/G 的兩套實現', body: '停頓後或鼻音等環境常較閉塞 [b d ɡ]；母音間多為近音 [β ð ɣ]：la boca、cada、amigo。這不是省略，而是降低閉塞。', note: '英語使用者常把每個 b/d/g 都讀得太硬；華語使用者則需先建立濁音與聲帶振動。', speech: 'boca, la boca, cada, amigo' },
      { title: '單 R 與 RR', body: '母音間單 r 多為一次舌尖閃音 /ɾ/：pero；rr 與詞首 r 多為顫音 /r/：perro、rojo。最小對立 pero「但是」–perro「狗」、caro「昂貴」–carro「車」。', note: '日語 r 可作單閃音起點；長顫音需要持續氣流讓舌尖振動，不是用力敲多次。', speech: 'pero, perro, caro, carro, rojo' },
      { title: 'J、Ñ、LL/Y 與地區差異', body: 'j 與 ge/gi 多為 /x/；ñ 為 /ɲ/；ll/y 在多數地區合流為 /ʝ/ 或其變體，阿根廷、烏拉圭常見 [ʃ]/[ʒ]。', note: '課程以可廣泛理解的 yeísmo 為主，同時標示主要地區變體。', speech: 'jamón, gente, niño, calle, yo' },
      { title: '語流與連音', body: '詞尾子音與下一詞母音自然相接：los amigos；相鄰相同母音可融合；句子按意義群朗讀。重點不是每個詞停頓，而是保持五母音清晰。', note: '不要套用英語大量弱化，也不要像日語逐拍切開。', speech: 'Los amigos hablan español.' }
    ],
    practice: { prompt: '錄下 pero–perro、caro–carro，再以一句話朗讀 Los amigos hablan español。', model: '單 r 一次閃音；rr 保持顫動；句內詞與詞自然相接。', required: ['pero–perro','caro–carro'] },
    quiz: { question: 'pero 與 perro 的主要發音差異是什麼？', choices: ['單次閃音與顫音','清音與濁音','母音長短','是否鼻音化'], answer: 0, explanation: '單 r /ɾ/ 與 rr /r/ 能區分詞義。' }
  }
};
