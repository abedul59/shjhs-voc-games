export const RUST_STORAGE_KEY = 'private-rust-academy-v1';
export const RUST_PROGRESS_OWNER = 'private-rust-owner';

export const rustStages = [
  { id: 'foundation', number: '01', icon: '🌱', title: '基礎語法', subtitle: '建立可靠的 Rust 心智模型', color: '#f97316' },
  { id: 'ownership', number: '02', icon: '🔐', title: '所有權核心', subtitle: '移動、借用、參照與生命週期', color: '#dc2626' },
  { id: 'modeling', number: '03', icon: '🧱', title: '資料建模', subtitle: '結構體、列舉與模式比對', color: '#7c3aed' },
  { id: 'reliability', number: '04', icon: '🧪', title: '錯誤與測試', subtitle: 'Result、測試與模組設計', color: '#2563eb' },
  { id: 'advanced', number: '05', icon: '⚙️', title: '進階 Rust', subtitle: '特徵、迭代器、智慧指標與並行', color: '#0f766e' },
  { id: 'projects', number: '06', icon: '🚀', title: '實作專案', subtitle: '命令列、網路服務與 WebAssembly', color: '#4f46e5' }
];

export const rustLessons = [
  {
    id: 'hello-rust', stage: 'foundation', order: 1, duration: 20, available: true,
    title: '第一支 Rust 程式', subtitle: '認識 main、巨集與 Cargo 的工作方式',
    objectives: ['讀懂最小 Rust 程式的結構', '理解 println! 為何帶有驚嘆號', '認識 rustc 與 Cargo 的角色'],
    sections: [
      { title: '程式從 main 開始', body: 'Rust 的執行程式以 main 函式作為入口。fn 是宣告函式的關鍵字，大括號包住函式要執行的內容。Rust 慣例使用四個空格縮排，陳述式通常以分號結尾。', code: 'fn main() {\n    println!("你好，Rust！");\n}' },
      { title: 'println! 是巨集', body: '名稱後方的 ! 表示它是巨集，而不是一般函式。巨集可以接受不同數量的參數，並在編譯前展開成所需程式。先把它記成「格式化輸出的工具」即可。', code: 'let language = "Rust";\nprintln!("我正在學習 {language}");\nprintln!("{} + {} = {}", 2, 3, 2 + 3);' },
      { title: 'Cargo 負責專案工作', body: 'rustc 可以直接編譯單一檔案；正式專案通常交給 Cargo 管理建立、建置、執行、測試與相依套件。Cargo.toml 是專案設定檔，src/main.rs 是執行程式的預設入口。', code: 'cargo new hello_rust\ncd hello_rust\ncargo run' }
    ],
    challenge: {
      title: '建立個人學習宣言', description: '修改程式，使用兩個變數 name 與 goal，輸出指定句子。',
      starter: 'fn main() {\n    let name = "Ferris";\n    let goal = "學會所有權";\n\n    // 在這裡輸出：Ferris 的目標：學會所有權\n}',
      solution: 'fn main() {\n    let name = "Ferris";\n    let goal = "學會所有權";\n\n    println!("{name} 的目標：{goal}");\n}',
      required: ['let name', 'let goal', 'println!', 'name', 'goal'], expectedOutput: 'Ferris 的目標：學會所有權',
      hints: ['使用 println! 巨集。', '可以直接在格式字串中寫入 {name} 與 {goal}。']
    },
    quiz: { question: '下列哪一項最能說明 println! 後方驚嘆號的意義？', choices: ['它會強制結束程式', '它表示 println! 是巨集', '它表示輸出內容不可修改', '它會略過編譯'], answer: 1, explanation: 'Rust 以驚嘆號標示巨集呼叫；println! 會在編譯前展開。' }
  },
  {
    id: 'variables-types', stage: 'foundation', order: 2, duration: 30, available: true,
    title: '變數、可變性與型別', subtitle: '讓編譯器幫你守住資料的意義',
    objectives: ['理解變數預設不可變', '使用 mut 與 shadowing', '辨識常用純量型別'],
    sections: [
      { title: '預設不可變', body: 'Rust 的 let 變數預設不可重新指定。這讓程式的資料流更容易推理；只有確實需要改變時才加上 mut，意圖會更清楚。', code: 'let score = 80;\n// score = 90; // 編譯錯誤\n\nlet mut level = 1;\nlevel += 1;' },
      { title: '遮蔽不是修改', body: '再次使用 let 宣告同名變數稱為遮蔽。它建立新變數，因此可以改變型別；mut 則是在同一型別內改值。', code: 'let spaces = "   ";\nlet spaces = spaces.len(); // usize\n\nlet mut count = 1;\ncount = 2; // 仍是整數' },
      { title: '常用型別', body: '整數常見 i32，浮點數預設 f64，布林值是 bool，字元 char 使用單引號且支援 Unicode。型別無法由上下文推斷時，要明確標註。', code: "let age: u8 = 18;\nlet rate: f64 = 0.85;\nlet passed: bool = true;\nlet symbol: char = '🦀';" }
    ],
    challenge: {
      title: '計算升級後分數', description: '讓 score 可以改變，加上 bonus，最後輸出 95。',
      starter: 'fn main() {\n    let score = 80;\n    let bonus: i32 = 15;\n\n    // 讓 score 加上 bonus\n    println!("最終分數：{score}");\n}',
      solution: 'fn main() {\n    let mut score = 80;\n    let bonus: i32 = 15;\n\n    score += bonus;\n    println!("最終分數：{score}");\n}',
      required: ['let mut score', 'bonus: i32', 'score += bonus', 'println!'], expectedOutput: '最終分數：95',
      hints: ['需要改變的變數要加 mut。', '可使用 += 運算子。']
    },
    quiz: { question: '哪一種作法能讓同名變數從字串變成數字？', choices: ['只加 mut', '使用 const', '再次使用 let 遮蔽', '移除分號'], answer: 2, explanation: '遮蔽會建立新的同名變數，因此新舊變數可以有不同型別。' }
  },
  {
    id: 'functions-flow', stage: 'foundation', order: 3, duration: 35, available: true,
    title: '函式與流程控制', subtitle: '用運算式組合清楚的決策流程',
    objectives: ['區分陳述式與運算式', '撰寫帶參數與回傳值的函式', '使用 if、loop、while 與 for'],
    sections: [
      { title: '函式簽章', body: '參數必須標示型別，回傳型別寫在 -> 後方。函式最後一個沒有分號的運算式會成為回傳值。加上分號會把它變成陳述式並回傳單位型別 ()。', code: 'fn double(value: i32) -> i32 {\n    value * 2\n}' },
      { title: 'if 也是運算式', body: 'if 可以產生值，所以能直接放在 let 右側。每個分支必須回傳相容型別，而且條件一定要是 bool，Rust 不會把數字自動當真假值。', code: 'let temperature = 28;\nlet label = if temperature >= 30 { "炎熱" } else { "舒適" };' },
      { title: '選擇合適迴圈', body: 'loop 適合明確 break 的無限迴圈；while 適合條件式重複；for 最適合集合與範圍，且不容易發生索引越界。', code: 'for number in 1..=3 {\n    println!("第 {number} 次練習");\n}' }
    ],
    challenge: {
      title: '判斷學習節奏', description: '完成函式：分鐘數大於等於 30 回傳「深度練習」，否則回傳「快速複習」。',
      starter: "fn study_mode(minutes: u32) -> &'static str {\n    // 完成條件判斷\n    todo!()\n}\n\nfn main() {\n    println!(\"{}\", study_mode(45));\n}",
      solution: "fn study_mode(minutes: u32) -> &'static str {\n    if minutes >= 30 {\n        \"深度練習\"\n    } else {\n        \"快速複習\"\n    }\n}\n\nfn main() {\n    println!(\"{}\", study_mode(45));\n}",
      required: ['fn study_mode', 'minutes >= 30', '深度練習', '快速複習'], expectedOutput: '深度練習',
      hints: ['if 可以直接作為回傳值。', '兩個字串後方都不要加分號。']
    },
    quiz: { question: '為什麼函式最後的 value * 2 通常不加分號？', choices: ['避免無限迴圈', '讓它成為函式回傳值', '讓乘法更快', '省略型別檢查'], answer: 1, explanation: '沒有分號的尾端運算式會成為函式的回傳值。' }
  },
  {
    id: 'collections-strings', stage: 'foundation', order: 4, duration: 40, available: true,
    title: '陣列、元組與字串', subtitle: '在固定資料與文字之間做出正確選擇',
    objectives: ['使用陣列與元組', '理解 &str 與 String 的基本差異', '安全地迭代集合'],
    sections: [
      { title: '固定長度陣列', body: '陣列中的元素型別相同，長度在編譯期固定。若資料數量會增減，之後會使用 Vec<T>。用 for 迭代通常比手動索引安全。', code: 'let scores = [72, 88, 95];\nfor score in scores {\n    println!("{score}");\n}' },
      { title: '元組容納不同型別', body: '元組把固定數量、不同型別的值組合在一起，可透過解構或 .0、.1 取值。', code: 'let learner = ("Ferris", 3, true);\nlet (name, level, active) = learner;\nprintln!("{name}: Lv.{level}, {active}");' },
      { title: '字串的兩種常見面貌', body: '&str 是字串切片，常見於字面值與借用；String 擁有可增長的 UTF-8 文字。初學時記住：需要建立或修改文字時多半使用 String，需要只讀參照時多半使用 &str。', code: 'let fixed: &str = "Rust";\nlet mut owned = String::from("Hello");\nowned.push_str(", Rust");' }
    ],
    challenge: {
      title: '整理技能清單', description: '迭代 skills 陣列，逐行輸出三個技能。',
      starter: 'fn main() {\n    let skills = ["語法", "所有權", "借用"];\n\n    // 使用 for 逐一輸出 skill\n}',
      solution: 'fn main() {\n    let skills = ["語法", "所有權", "借用"];\n\n    for skill in skills {\n        println!("{skill}");\n    }\n}',
      required: ['let skills', 'for skill in skills', 'println!'], expectedOutput: '語法\n所有權\n借用',
      hints: ['語法是 for 元素 in 集合。', '迴圈內使用 println!。']
    },
    quiz: { question: '需要一段可擴充、可修改且擁有內容的文字時，通常使用什麼？', choices: ['char', '&str', 'String', '[u8; 0]'], answer: 2, explanation: 'String 擁有堆積上的 UTF-8 內容，並可動態增長與修改。' }
  },
  {
    id: 'foundation-project', stage: 'foundation', order: 5, duration: 50, available: true,
    title: '基礎實作：學習計時器', subtitle: '整合變數、函式、分支與迴圈',
    objectives: ['拆解需求為小函式', '用迴圈累計資料', '用分支產生學習回饋'],
    sections: [
      { title: '先描述資料流', body: '小專案也應先確認輸入、處理與輸出。這個計時器接收每日分鐘數，計算總和，再依總時數產生回饋。', code: '輸入：[25, 40, 35]\n處理：加總分鐘數\n輸出：100 分鐘與學習評語' },
      { title: '小函式降低複雜度', body: '每個函式只處理一件事。sum_minutes 負責加總，feedback 負責判斷文字，main 負責協調流程。這種拆法之後容易測試。', code: "fn feedback(total: u32) -> &'static str {\n    if total >= 90 { \"節奏穩定\" } else { \"繼續累積\" }\n}" },
      { title: '先求正確，再求漂亮', body: 'Rust 編譯器會要求型別與資料關係清楚。先讓程式正確執行，再重構名稱與結構；一次只修一個編譯錯誤，通常能得到最清楚的學習效果。', code: '// cargo check：快速檢查\n// cargo run：建置並執行\n// cargo fmt：統一格式' }
    ],
    challenge: {
      title: '完成分鐘加總', description: '完成 sum_minutes，讓程式輸出「本週共學習 100 分鐘」。',
      starter: 'fn sum_minutes(days: [u32; 3]) -> u32 {\n    let mut total = 0;\n    // 逐一把每天的分鐘數加入 total\n    total\n}\n\nfn main() {\n    let total = sum_minutes([25, 40, 35]);\n    println!("本週共學習 {total} 分鐘");\n}',
      solution: 'fn sum_minutes(days: [u32; 3]) -> u32 {\n    let mut total = 0;\n    for minutes in days {\n        total += minutes;\n    }\n    total\n}\n\nfn main() {\n    let total = sum_minutes([25, 40, 35]);\n    println!("本週共學習 {total} 分鐘");\n}',
      required: ['fn sum_minutes', 'for minutes in days', 'total += minutes', 'total'], expectedOutput: '本週共學習 100 分鐘',
      hints: ['用 for 走訪 days。', '每次把 minutes 加到 total，最後回傳 total。']
    },
    quiz: { question: '把加總與回饋拆成不同函式，最直接的好處是什麼？', choices: ['可以略過編譯', '讓每個函式責任清楚且容易測試', '不必宣告型別', '程式一定不會出錯'], answer: 1, explanation: '單一職責能降低理解與測試成本，但仍需要正常編譯與驗證。' }
  },
  { id: 'ownership-move', stage: 'ownership', order: 6, duration: 40, available: false, title: '所有權與移動', subtitle: '理解 Rust 不靠垃圾回收器的記憶體管理' },
  { id: 'borrowing', stage: 'ownership', order: 7, duration: 45, available: false, title: '借用與參照', subtitle: '共享資料而不轉移所有權' },
  { id: 'slices', stage: 'ownership', order: 8, duration: 35, available: false, title: '切片', subtitle: '安全參照連續資料的一部分' },
  { id: 'lifetimes', stage: 'ownership', order: 9, duration: 50, available: false, title: '生命週期', subtitle: '描述參照之間的有效範圍' },
  { id: 'structs', stage: 'modeling', order: 10, duration: 40, available: false, title: '結構體與方法', subtitle: '用型別表達領域資料' },
  { id: 'enums', stage: 'modeling', order: 11, duration: 45, available: false, title: '列舉與模式比對', subtitle: '完整描述有限狀態' },
  { id: 'modules', stage: 'modeling', order: 12, duration: 40, available: false, title: '模組與套件', subtitle: '管理大型程式的邊界' },
  { id: 'option-result', stage: 'reliability', order: 13, duration: 45, available: false, title: 'Option 與 Result', subtitle: '把缺值與失敗寫進型別' },
  { id: 'testing', stage: 'reliability', order: 14, duration: 40, available: false, title: '自動化測試', subtitle: '用測試保護程式行為' },
  { id: 'traits-generics', stage: 'advanced', order: 15, duration: 55, available: false, title: '泛型與特徵', subtitle: '共享行為而保留型別安全' },
  { id: 'iterators', stage: 'advanced', order: 16, duration: 50, available: false, title: '閉包與迭代器', subtitle: '建立高效的資料處理管線' },
  { id: 'smart-pointers', stage: 'advanced', order: 17, duration: 55, available: false, title: '智慧指標', subtitle: 'Rc、Box、RefCell 與內部可變性' },
  { id: 'concurrency', stage: 'advanced', order: 18, duration: 60, available: false, title: '並行與非同步', subtitle: '安全處理多工作流程' },
  { id: 'cli-project', stage: 'projects', order: 19, duration: 90, available: false, title: '命令列工具', subtitle: '打造可實際使用的 CLI' },
  { id: 'api-project', stage: 'projects', order: 20, duration: 120, available: false, title: '網路服務', subtitle: '建立 REST API 與資料層' },
  { id: 'wasm-project', stage: 'projects', order: 21, duration: 120, available: false, title: 'WebAssembly', subtitle: '把 Rust 帶進瀏覽器' }
];

export function createDefaultRustProgress() {
  return { lessons: {}, lastLesson: 'hello-rust', startedAt: new Date().toISOString() };
}
