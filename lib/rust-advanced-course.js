// 第二階段至實作專案的完整課程。資料結構與基礎課程一致，供課程頁共用。
export const advancedRustLessons = [
  {
    id: 'ownership-move', stage: 'ownership', order: 6, duration: 40, available: true,
    title: '所有權與移動', subtitle: '理解 Rust 不靠垃圾回收器的記憶體管理',
    objectives: ['說出所有權三項規則', '分辨複製與移動', '理解離開作用域時的 drop'],
    sections: [
      { title: '每個值只有一位擁有者', body: 'Rust 以所有權決定何時釋放資源：每個值都有擁有者，同一時間只能有一位；擁有者離開作用域時值會被釋放。這讓記憶體安全能在編譯期完成。', code: 'let message = String::from("hello");\nprintln!("{message}");\n// 作用域結束後自動呼叫 drop' },
      { title: '移動避免重複釋放', body: 'String 持有堆積資料。指定給另一個變數時，擁有權會移動，舊變數不再可用；Rust 因而不會讓兩個變數重複釋放同一塊記憶體。', code: 'let first = String::from("Rust");\nlet second = first;\n// println!("{first}"); // 已移動\nprintln!("{second}");' },
      { title: 'Copy 與 clone', body: '固定大小的純量型別通常實作 Copy，指定時會複製值。需要深層複製 String 時可明確呼叫 clone，但應先思考是否能改用借用。', code: 'let x = 8;\nlet y = x; // Copy\nlet a = String::from("book");\nlet b = a.clone();' }
    ],
    challenge: { title: '安全轉移書名', description: '把 title 的所有權移給 archived，並輸出 archived。', starter: 'fn main() {\n    let title = String::from("Rust Book");\n    // 將所有權移給 archived\n    println!("{archived}");\n}', solution: 'fn main() {\n    let title = String::from("Rust Book");\n    let archived = title;\n    println!("{archived}");\n}', required: ['let title', 'let archived = title', 'println!'], expectedOutput: 'Rust Book', hints: ['直接指定 String 會移動所有權。', '移動後不要再使用 title。'] },
    quiz: { question: 'String 指定給另一個變數後，原變數預設為何不能再使用？', choices: ['字串已被清空', '所有權已移動', '變數名稱太短', '必須先轉成整數'], answer: 1, explanation: '移動能避免兩個擁有者重複釋放同一份堆積資料。' }
  },
  {
    id: 'borrowing', stage: 'ownership', order: 7, duration: 45, available: true,
    title: '借用與參照', subtitle: '共享資料而不轉移所有權',
    objectives: ['使用不可變與可變參照', '遵守借用規則', '用借用避免不必要複製'],
    sections: [
      { title: '參照只借不拿', body: '&T 讓函式讀取值而不取得所有權。參照離開作用域時不會釋放原值，因此呼叫者仍能繼續使用資料。', code: 'fn length(text: &String) -> usize {\n    text.len()\n}\nlet word = String::from("borrow");\nprintln!("{}", length(&word));' },
      { title: '可變借用', body: '&mut T 可以修改借來的值。為避免資料競爭，同一時間只能有一個可變參照，而且不能同時存在其他有效參照。', code: 'fn add_mark(text: &mut String) {\n    text.push(\'!\');\n}\nlet mut word = String::from("Rust");\nadd_mark(&mut word);' },
      { title: '參照的有效範圍', body: '現代 Rust 依參照最後一次使用的位置判斷借用何時結束。把讀取集中在修改之前，通常就能讓不可變借用與可變借用依序成立。', code: 'let mut s = String::from("safe");\nlet size = &s;\nprintln!("{size}"); // 最後一次使用\nlet edit = &mut s;\nedit.push_str(" Rust");' }
    ],
    challenge: { title: '借用後加上標籤', description: '完成 tag 函式，透過可變參照在文字後加上「 #rust」。', starter: 'fn tag(text: /* 參照型別 */) {\n    text.push_str(" #rust");\n}\nfn main() {\n    let mut note = String::from("ownership");\n    tag(/* 傳入參照 */);\n    println!("{note}");\n}', solution: 'fn tag(text: &mut String) {\n    text.push_str(" #rust");\n}\nfn main() {\n    let mut note = String::from("ownership");\n    tag(&mut note);\n    println!("{note}");\n}', required: ['&mut String', 'tag(&mut note)', 'push_str', 'println!'], expectedOutput: 'ownership #rust', hints: ['函式參數使用 &mut String。', '呼叫時也要寫 &mut note。'] },
    quiz: { question: '同一時間已有有效的可變參照時，還能建立什麼參照？', choices: ['任意多個不可變參照', '另一個可變參照', '不能建立其他有效參照', '只能建立字串參照'], answer: 2, explanation: '單一可變借用規則在編譯期排除資料競爭。' }
  },
  {
    id: 'slices', stage: 'ownership', order: 8, duration: 35, available: true,
    title: '切片', subtitle: '安全參照連續資料的一部分',
    objectives: ['建立字串與陣列切片', '理解切片不擁有資料', '避免不安全的手動索引'],
    sections: [
      { title: '切片綁定資料與範圍', body: '切片是對集合連續區段的參照，會保存起點與長度。&str 是 UTF-8 字串切片，[T] 則是元素切片。', code: 'let text = String::from("hello world");\nlet hello: &str = &text[0..5];\nlet all: &str = &text[..];' },
      { title: '優先接收 &str', body: '只需讀取文字的函式通常接收 &str，這樣既能傳入 String 的切片，也能傳入字串字面值，介面更通用。', code: 'fn first_word(text: &str) -> &str {\n    text.split_whitespace().next().unwrap_or("")\n}' },
      { title: '陣列與 Vec 也能切片', body: '&[T] 能描述陣列或 Vec 的一段資料。索引超出範圍會被 Rust 阻止或在執行時明確失敗，不會靜默讀取其他記憶體。', code: 'let values = [10, 20, 30, 40];\nlet middle: &[i32] = &values[1..3];\nassert_eq!(middle, &[20, 30]);' }
    ],
    challenge: { title: '取得第一個單字', description: '完成 first_word，回傳第一個空白前的 &str。', starter: 'fn first_word(text: &str) -> &str {\n    // 使用 split_whitespace\n    todo!()\n}\nfn main() {\n    println!("{}", first_word("learn Rust safely"));\n}', solution: 'fn first_word(text: &str) -> &str {\n    text.split_whitespace().next().unwrap_or("")\n}\nfn main() {\n    println!("{}", first_word("learn Rust safely"));\n}', required: ['fn first_word', '&str', 'split_whitespace()', 'next()', 'unwrap_or'], expectedOutput: 'learn', hints: ['split_whitespace 會產生迭代器。', 'next 取得第一項，unwrap_or 處理空字串。'] },
    quiz: { question: '&str 是否擁有它參照的字串資料？', choices: ['是', '否，它只是借用一段資料', '只有 ASCII 時擁有', '只有函式內擁有'], answer: 1, explanation: '切片是參照，原資料仍由其他值擁有。' }
  },
  {
    id: 'lifetimes', stage: 'ownership', order: 9, duration: 50, available: true,
    title: '生命週期', subtitle: '描述參照之間的有效範圍',
    objectives: ['理解懸垂參照', '讀懂生命週期標註', '辨識何時可由編譯器省略標註'],
    sections: [
      { title: '參照不能比資料活得久', body: '借用檢查器會拒絕可能指向已釋放資料的參照。生命週期不是延長資料壽命，而是描述多個參照有效範圍的關係。', code: '// 錯誤示意：result 不能指向已離開作用域的 local\n// let result = { let local = String::from("x"); &local };' },
      { title: '泛型生命週期參數', body: '當回傳參照可能來自多個輸入時，以 \'a 告訴編譯器：回傳值不會活得比兩個輸入中較短的那一個更久。', code: "fn longer<'a>(a: &'a str, b: &'a str) -> &'a str {\n    if a.len() >= b.len() { a } else { b }\n}" },
      { title: '省略規則與 static', body: '常見的單一輸入參照可由編譯器推斷，不必處處標註。\'static 表示可存活整個程式期間，例如字串字面值；它不是修正懸垂參照的捷徑。', code: 'fn first(text: &str) -> &str { text }\nlet language: &\'static str = "Rust";' }
    ],
    challenge: { title: '回傳較長文字', description: '補上生命週期，讓 longest 安全回傳其中一個輸入切片。', starter: 'fn longest(/* 參數 */) -> /* 回傳 */ {\n    if left.len() >= right.len() { left } else { right }\n}', solution: "fn longest<'a>(left: &'a str, right: &'a str) -> &'a str {\n    if left.len() >= right.len() { left } else { right }\n}", required: ["fn longest<'a>", "left: &'a str", "right: &'a str", "-> &'a str"], expectedOutput: '回傳值的生命週期受較短輸入限制', hints: ['宣告泛型生命週期 <\'a>。', '兩個輸入與輸出都使用同一個 \'a。'] },
    quiz: { question: '生命週期標註的主要用途是什麼？', choices: ['延長所有變數壽命', '描述參照之間的有效範圍關係', '停用借用檢查', '自動複製資料'], answer: 1, explanation: '標註描述關係，不會改變任何值實際存活的時間。' }
  },
  {
    id: 'structs', stage: 'modeling', order: 10, duration: 40, available: true,
    title: '結構體與方法', subtitle: '用型別表達領域資料',
    objectives: ['定義與建立結構體', '撰寫方法與關聯函式', '使用更新語法與解構'],
    sections: [
      { title: '把相關欄位組成型別', body: 'struct 為資料命名並約束欄位型別。建立實例時每個欄位都必須有值，編譯器會防止漏填或拼錯。', code: 'struct Course {\n    title: String,\n    lessons: u32,\n    published: bool,\n}' },
      { title: '方法放在 impl', body: '方法第一個參數常是 &self、&mut self 或 self，分別代表借用讀取、借用修改與取得所有權。關聯函式沒有 self，常用作建構器。', code: 'impl Course {\n    fn new(title: &str) -> Self {\n        Self { title: title.into(), lessons: 0, published: false }\n    }\n    fn add_lesson(&mut self) { self.lessons += 1; }\n}' },
      { title: '更新語法重用欄位', body: '..other 能從另一實例取得未明列欄位。若被重用的欄位含 String，可能發生部分移動，之後要留意舊實例哪些欄位仍可使用。', code: 'let advanced = Course {\n    title: String::from("Advanced"),\n    ..basic\n};' }
    ],
    challenge: { title: '建立計數器方法', description: '完成 Counter 的 new 與 increment，使結果為 1。', starter: 'struct Counter { value: u32 }\nimpl Counter {\n    // 建構器與加一方法\n}\nfn main() {\n    let mut counter = Counter::new();\n    counter.increment();\n    println!("{}", counter.value);\n}', solution: 'struct Counter { value: u32 }\nimpl Counter {\n    fn new() -> Self { Self { value: 0 } }\n    fn increment(&mut self) { self.value += 1; }\n}\nfn main() {\n    let mut counter = Counter::new();\n    counter.increment();\n    println!("{}", counter.value);\n}', required: ['impl Counter', 'fn new()', 'Self { value: 0 }', 'fn increment(&mut self)', 'self.value += 1'], expectedOutput: '1', hints: ['new 是沒有 self 的關聯函式。', '修改欄位的方法接收 &mut self。'] },
    quiz: { question: '會修改結構體但不取得所有權的方法，第一個參數通常是？', choices: ['self', '&self', '&mut self', 'mut Self'], answer: 2, explanation: '&mut self 代表對目前實例的可變借用。' }
  },
  {
    id: 'enums', stage: 'modeling', order: 11, duration: 45, available: true,
    title: '列舉與模式比對', subtitle: '完整描述有限狀態',
    objectives: ['用 enum 表達互斥狀態', '使用 match 完整處理變體', '使用 if let 處理單一模式'],
    sections: [
      { title: '變體可以攜帶不同資料', body: 'enum 列出一個值所有合法形態，每個變體還能帶不同型別的資料，比用多個布林欄位表達狀態更精確。', code: 'enum Message {\n    Quit,\n    Text(String),\n    Move { x: i32, y: i32 },\n}' },
      { title: 'match 必須完整', body: 'match 會依模式解構資料，而且編譯器要求涵蓋所有可能變體。_ 可作為最後的通用分支，但重要狀態宜明確列出。', code: 'fn label(message: Message) -> String {\n    match message {\n        Message::Quit => "quit".into(),\n        Message::Text(text) => text,\n        Message::Move { x, y } => format!("{x},{y}"),\n    }\n}' },
      { title: 'if let 適合單一分支', body: '只關心一個模式時可用 if let，並搭配 else；若邏輯涉及多個變體，match 通常更清楚也更不易漏掉。', code: 'if let Message::Text(text) = message {\n    println!("{text}");\n}' }
    ],
    challenge: { title: '計算指令分數', description: '完成 match：Stop 得 0 分，Go(n) 得 n 分。', starter: 'enum Command { Stop, Go(u32) }\nfn score(command: Command) -> u32 {\n    // 完整比對兩個變體\n    todo!()\n}', solution: 'enum Command { Stop, Go(u32) }\nfn score(command: Command) -> u32 {\n    match command {\n        Command::Stop => 0,\n        Command::Go(points) => points,\n    }\n}', required: ['match command', 'Command::Stop => 0', 'Command::Go(points)', '=> points'], expectedOutput: 'Stop 為 0；Go 回傳攜帶分數', hints: ['match 的每個分支用 =>。', 'Go(points) 能直接解構數值。'] },
    quiz: { question: 'match 少處理一個 enum 變體時會發生什麼事？', choices: ['自動忽略', '編譯器報錯', '永遠回傳零', '執行到該變體才警告'], answer: 1, explanation: '完整性檢查是 Rust 模式比對的重要安全保障。' }
  },
  {
    id: 'modules', stage: 'modeling', order: 12, duration: 40, available: true,
    title: '模組與套件', subtitle: '管理大型程式的邊界',
    objectives: ['區分 package、crate 與 module', '使用 pub 與 use', '規劃清楚的模組邊界'],
    sections: [
      { title: 'Cargo 套件與 crate', body: 'Cargo.toml 定義 package；package 可包含多個 binary crate 與最多一個 library crate。crate root 通常是 src/main.rs 或 src/lib.rs。', code: 'src/\n├── lib.rs       # library crate root\n├── main.rs      # binary crate root\n└── course.rs    # module file' },
      { title: '模組預設私有', body: 'mod 建立模組，項目預設只對父層私有。使用 pub 開放必要介面，保留實作細節，能讓重構更安全。', code: 'mod academy {\n    pub fn enroll() { validate(); }\n    fn validate() {}\n}\nacademy::enroll();' },
      { title: 'use 縮短路徑', body: 'use 把路徑帶入目前作用域；crate:: 從目前 crate 根開始，super:: 從父模組開始。公開函式簽章中的型別也必須具有足夠可見性。', code: 'use crate::academy::enroll;\n\npub fn start() {\n    enroll();\n}' }
    ],
    challenge: { title: '公開課程函式', description: '建立 academy 模組，公開 start，但保持 validate 私有。', starter: 'mod academy {\n    // start 呼叫私有 validate\n}\nfn main() { academy::start(); }', solution: 'mod academy {\n    pub fn start() {\n        validate();\n        println!("course started");\n    }\n    fn validate() {}\n}\nfn main() { academy::start(); }', required: ['mod academy', 'pub fn start()', 'validate();', 'fn validate()', 'academy::start()'], expectedOutput: 'course started', hints: ['只有要從模組外呼叫的 start 需要 pub。', '同一模組內可直接呼叫 validate。'] },
    quiz: { question: 'Rust 模組中的項目預設可見性為何？', choices: ['全域公開', '只讀', '私有', '依檔名決定'], answer: 2, explanation: '預設私有能讓模組只公開刻意設計的介面。' }
  },
  {
    id: 'option-result', stage: 'reliability', order: 13, duration: 45, available: true,
    title: 'Option 與 Result', subtitle: '把缺值與失敗寫進型別',
    objectives: ['用 Option 表達可能缺值', '用 Result 傳遞可恢復錯誤', '使用 ? 簡潔傳播錯誤'],
    sections: [
      { title: 'Option 取代 null', body: 'Option<T> 只有 Some(T) 與 None。呼叫者必須明確處理缺值，不能在未檢查時把不存在的資料當成 T 使用。', code: 'let scores = [80, 90];\nmatch scores.get(5) {\n    Some(score) => println!("{score}"),\n    None => println!("沒有資料"),\n}' },
      { title: 'Result 保留成功或錯誤', body: 'Result<T, E> 的 Ok(T) 代表成功，Err(E) 代表可恢復失敗。應優先回傳有意義的錯誤，而不是在函式內任意 panic。', code: 'fn parse_level(text: &str) -> Result<u32, std::num::ParseIntError> {\n    text.parse::<u32>()\n}' },
      { title: '? 傳播錯誤', body: '? 遇到 Ok 會取出值，遇到 Err 會提早回傳。它只能用在回傳相容 Result 或 Option 的函式，並保留原本錯誤資訊。', code: 'fn double(text: &str) -> Result<u32, std::num::ParseIntError> {\n    let value = text.parse::<u32>()?;\n    Ok(value * 2)\n}' }
    ],
    challenge: { title: '安全解析並加一', description: '使用 ? 解析 u32，成功後回傳加一結果。', starter: 'fn next_level(text: &str) -> Result<u32, std::num::ParseIntError> {\n    // 解析並加一\n    todo!()\n}', solution: 'fn next_level(text: &str) -> Result<u32, std::num::ParseIntError> {\n    let level = text.parse::<u32>()?;\n    Ok(level + 1)\n}', required: ['Result<u32', 'parse::<u32>()?', 'Ok(level + 1)'], expectedOutput: '輸入 4 時得到 Ok(5)', hints: ['在 parse 後加上 ?。', '成功值要包進 Ok。'] },
    quiz: { question: '? 運算子遇到 Err 時會做什麼？', choices: ['忽略錯誤', '轉成 None', '從目前函式提早回傳錯誤', '讓程式永遠 panic'], answer: 2, explanation: '? 會傳播相容的錯誤，讓主要流程保持清楚。' }
  },
  {
    id: 'testing', stage: 'reliability', order: 14, duration: 40, available: true,
    title: '自動化測試', subtitle: '用測試保護程式行為',
    objectives: ['撰寫單元測試', '使用 assert 系列巨集', '區分單元與整合測試'],
    sections: [
      { title: '測試是帶有 #[test] 的函式', body: 'cargo test 會建置測試模式並平行執行測試。測試通常遵循準備、執行、驗證三段，名稱應描述預期行為。', code: '#[test]\nfn adds_two() {\n    let result = 2 + 2;\n    assert_eq!(result, 4);\n}' },
      { title: '選擇合適斷言', body: 'assert! 驗證布林條件，assert_eq! 與 assert_ne! 比較值。可加入自訂訊息，使失敗輸出直接指出情境。', code: 'assert!(score >= 60, "分數應及格，實際為 {score}");\nassert_eq!(label(80), "通過");' },
      { title: '測試錯誤與整合邊界', body: '#[should_panic] 可驗證預期 panic；回傳 Result 可使用 ?。tests/ 下的整合測試只透過公開 API 使用 library crate，能驗證外部使用者視角。', code: '#[test]\nfn parses_level() -> Result<(), Box<dyn std::error::Error>> {\n    assert_eq!("5".parse::<u32>()?, 5);\n    Ok(())\n}' }
    ],
    challenge: { title: '測試平方函式', description: '加入測試，確認 square(4) 等於 16。', starter: 'fn square(value: i32) -> i32 { value * value }\n\n// 在這裡加入測試', solution: 'fn square(value: i32) -> i32 { value * value }\n\n#[test]\nfn squares_four() {\n    assert_eq!(square(4), 16);\n}', required: ['#[test]', 'fn squares_four()', 'assert_eq!(square(4), 16)'], expectedOutput: 'test squares_four ... ok', hints: ['測試函式上方加 #[test]。', '使用 assert_eq! 比較實際值與 16。'] },
    quiz: { question: 'tests/ 目錄中的整合測試主要從什麼角度驗證程式？', choices: ['編譯器內部', '公開 API 的外部使用者', '只測私有函式', '只測效能'], answer: 1, explanation: '整合測試會像其他 crate 一樣透過公開介面使用程式庫。' }
  },
  {
    id: 'traits-generics', stage: 'advanced', order: 15, duration: 55, available: true,
    title: '泛型與特徵', subtitle: '共享行為而保留型別安全',
    objectives: ['撰寫泛型函式與型別', '定義並實作 trait', '使用 trait bound 約束能力'],
    sections: [
      { title: '泛型抽出重複結構', body: 'T 是型別參數，讓同一演算法支援多種型別。Rust 會在編譯期單態化，通常不需付出執行期動態分派成本。', code: 'fn first<T>(items: &[T]) -> Option<&T> {\n    items.first()\n}\nstruct Pair<T> { left: T, right: T }' },
      { title: 'trait 定義共享行為', body: 'trait 宣告型別必須提供的方法。不同型別可各自實作，同時保留自己的資料結構。預設方法能重用共同邏輯。', code: 'trait Summary {\n    fn title(&self) -> &str;\n    fn summary(&self) -> String { format!("主題：{}", self.title()) }\n}' },
      { title: 'trait bound 表達需求', body: 'T: Summary 表示泛型只接受實作 Summary 的型別。多個條件可用 +，複雜條件可移到 where 子句，讓簽章更容易閱讀。', code: 'fn print_summary<T>(item: &T)\nwhere T: Summary + std::fmt::Debug {\n    println!("{}", item.summary());\n}' }
    ],
    challenge: { title: '為課程實作摘要', description: '定義 Summary trait，並讓 Course 回傳自己的 title。', starter: 'trait Summary { fn summary(&self) -> String; }\nstruct Course { title: String }\n// 實作 Summary', solution: 'trait Summary { fn summary(&self) -> String; }\nstruct Course { title: String }\nimpl Summary for Course {\n    fn summary(&self) -> String {\n        format!("課程：{}", self.title)\n    }\n}', required: ['trait Summary', 'impl Summary for Course', 'fn summary(&self)', 'format!'], expectedOutput: '課程：Rust', hints: ['語法是 impl Trait for Type。', '方法簽章須與 trait 一致。'] },
    quiz: { question: '泛型函式上的 T: Display 表示什麼？', choices: ['T 必須是字串', 'T 必須實作 Display', 'T 只能使用一次', 'T 會在執行時才決定'], answer: 1, explanation: 'trait bound 明確列出泛型型別必須提供的能力。' }
  },
  {
    id: 'iterators', stage: 'advanced', order: 16, duration: 50, available: true,
    title: '閉包與迭代器', subtitle: '建立高效的資料處理管線',
    objectives: ['撰寫與傳遞閉包', '組合迭代器轉接器', '理解惰性求值與消費者'],
    sections: [
      { title: '閉包可以捕捉環境', body: '閉包以 |參數| 表示，可借用、可變借用或取得周圍變數。編譯器依使用方式推斷 Fn、FnMut 或 FnOnce。', code: 'let bonus = 5;\nlet add_bonus = |score: u32| score + bonus;\nprintln!("{}", add_bonus(80));' },
      { title: '迭代器是惰性的', body: 'map、filter 等轉接器只描述處理流程，直到 collect、sum、for_each 等消費者出現才真正執行。這使多段處理能被最佳化成單次走訪。', code: 'let doubled: Vec<_> = [1, 2, 3]\n    .iter()\n    .filter(|value| **value >= 2)\n    .map(|value| value * 2)\n    .collect();' },
      { title: '所有權取決於迭代方式', body: 'iter 借用元素，iter_mut 可變借用元素，into_iter 通常取得集合所有權。選擇方式時先決定迭代後是否還需要原集合。', code: 'let mut values = vec![1, 2, 3];\nfor value in values.iter_mut() {\n    *value += 1;\n}' }
    ],
    challenge: { title: '篩選並加總偶數平方', description: '用迭代器算出 1 到 5 中偶數的平方總和。', starter: 'fn main() {\n    let total: i32 = (1..=5)\n        // filter、map、sum\n        ;\n    println!("{total}");\n}', solution: 'fn main() {\n    let total: i32 = (1..=5)\n        .filter(|value| value % 2 == 0)\n        .map(|value| value * value)\n        .sum();\n    println!("{total}");\n}', required: ['.filter(', 'value % 2 == 0', '.map(', 'value * value', '.sum()'], expectedOutput: '20', hints: ['先 filter 保留偶數。', 'map 平方後以 sum 消費迭代器。'] },
    quiz: { question: '只呼叫 map 而沒有 collect、sum 等消費者時會怎樣？', choices: ['立即處理全部資料', '流程保持惰性，通常尚未執行', '編譯失敗', '資料自動清空'], answer: 1, explanation: '迭代器轉接器是惰性的，需要消費者驅動。' }
  },
  {
    id: 'smart-pointers', stage: 'advanced', order: 17, duration: 55, available: true,
    title: '智慧指標', subtitle: 'Box、Rc、RefCell 與共享所有權',
    objectives: ['知道何時使用 Box', '理解 Rc 參照計數', '辨識 RefCell 的內部可變性與風險'],
    sections: [
      { title: 'Box 把資料放到堆積', body: 'Box<T> 擁有一個堆積值，常用於遞迴型別、巨大資料或 trait object。離開作用域時 Box 與內容都會自動釋放。', code: 'enum List {\n    Node(i32, Box<List>),\n    End,\n}\nlet list = List::Node(1, Box::new(List::End));' },
      { title: 'Rc 提供單執行緒共享所有權', body: 'Rc<T> 以參照計數讓多位擁有者共享唯讀資料。Rc::clone 只增加計數，不會深層複製；最後一位擁有者消失時才釋放值。', code: 'use std::rc::Rc;\nlet shared = Rc::new(String::from("course"));\nlet another = Rc::clone(&shared);\nprintln!("{}", Rc::strong_count(&shared));' },
      { title: 'RefCell 把借用檢查移到執行期', body: 'RefCell<T> 允許在外層不可變時修改內部值，但 borrow_mut 規則若被違反會在執行時 panic。常見組合 Rc<RefCell<T>> 應謹慎使用並避免循環參照。', code: 'use std::cell::RefCell;\nlet value = RefCell::new(1);\n*value.borrow_mut() += 1;\nprintln!("{}", value.borrow());' }
    ],
    challenge: { title: '共享學習目標', description: '建立 Rc<String> 並 clone 一次，輸出強參照數量。', starter: 'use std::rc::Rc;\nfn main() {\n    // 建立 shared 與 another\n    println!("{}", Rc::strong_count(&shared));\n}', solution: 'use std::rc::Rc;\nfn main() {\n    let shared = Rc::new(String::from("learn Rust"));\n    let another = Rc::clone(&shared);\n    println!("{}", Rc::strong_count(&shared));\n    drop(another);\n}', required: ['Rc::new', 'Rc::clone(&shared)', 'Rc::strong_count(&shared)'], expectedOutput: '2', hints: ['先用 Rc::new 包住 String。', 'Rc::clone 會增加強參照計數。'] },
    quiz: { question: 'RefCell 的借用規則在何時檢查？', choices: ['編譯期', '執行期', '部署時', '不會檢查'], answer: 1, explanation: 'RefCell 保留相同借用規則，但違規會在執行時 panic。' }
  },
  {
    id: 'concurrency', stage: 'advanced', order: 18, duration: 60, available: true,
    title: '並行與非同步', subtitle: '安全處理多工作流程',
    objectives: ['建立執行緒與移動資料', '使用 channel 與 Mutex', '理解 async/await 的基本模型'],
    sections: [
      { title: '執行緒與 move 閉包', body: 'thread::spawn 建立作業系統執行緒。move 讓閉包取得所需資料的所有權，join 則等待工作結束並處理可能的 panic。', code: 'use std::thread;\nlet values = vec![1, 2, 3];\nlet handle = thread::spawn(move || values.iter().sum::<i32>());\nprintln!("{}", handle.join().unwrap());' },
      { title: '訊息傳遞與共享狀態', body: 'mpsc channel 讓工作者傳送資料；Arc<Mutex<T>> 則讓多執行緒共享可修改狀態。MutexGuard 離開作用域時會自動解鎖。', code: 'use std::sync::{Arc, Mutex};\nlet count = Arc::new(Mutex::new(0));\nlet worker = Arc::clone(&count);\nstd::thread::spawn(move || *worker.lock().unwrap() += 1).join().unwrap();' },
      { title: 'async 是可暫停的工作', body: 'async fn 回傳 Future；.await 讓出控制權直到結果可用。Future 需要 Tokio 等執行器推進。不要在 async 工作中直接做長時間阻塞操作。', code: 'async fn fetch_label() -> String {\n    // client.get(...).send().await?\n    String::from("ready")\n}\n// #[tokio::main] async fn main() { ... }' }
    ],
    challenge: { title: '等待背景計算', description: '使用 move 執行緒加總資料，join 後輸出 10。', starter: 'use std::thread;\nfn main() {\n    let values = vec![1, 2, 3, 4];\n    // 建立 handle 並等待結果\n}', solution: 'use std::thread;\nfn main() {\n    let values = vec![1, 2, 3, 4];\n    let handle = thread::spawn(move || values.iter().sum::<i32>());\n    let total = handle.join().unwrap();\n    println!("{total}");\n}', required: ['thread::spawn(move', 'sum::<i32>()', 'handle.join().unwrap()', 'println!'], expectedOutput: '10', hints: ['spawn 的閉包加上 move。', 'join 回傳 Result，需要處理後取得總和。'] },
    quiz: { question: '為什麼跨執行緒常使用 Arc 而不是 Rc？', choices: ['Arc 支援原子參照計數，可安全跨執行緒', 'Arc 永遠更快', 'Rc 只能存字串', 'Arc 不需要所有權'], answer: 0, explanation: 'Arc 的參照計數操作具原子性；Rc 並未實作跨執行緒所需的 Send/Sync。' }
  },
  {
    id: 'cli-project', stage: 'projects', order: 19, duration: 90, available: true,
    title: '實作專案：命令列工具', subtitle: '打造可實際使用的文字搜尋 CLI',
    objectives: ['拆分參數解析與核心邏輯', '讀取檔案並回傳錯誤', '為搜尋函式撰寫測試'],
    sections: [
      { title: '先定義 CLI 邊界', body: '這個專案接收查詢字串與檔案路徑，輸出包含查詢的行。main 只負責協調與顯示錯誤，Config 負責驗證參數，run 負責 I/O。', code: 'cargo new minigrep\ncd minigrep\ncargo run -- rust notes.txt' },
      { title: '純函式負責搜尋', body: 'search 不需要知道檔案或終端機，只接收文字並回傳相符行。把核心規則寫成純函式，就能用極小測試快速驗證。', code: "fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {\n    contents.lines().filter(|line| line.contains(query)).collect()\n}" },
      { title: '錯誤交給呼叫端決定', body: 'run 回傳 Result，main 在最外層印出訊息並設定非零退出碼。這讓核心邏輯可測試，也不會在一般輸入錯誤時顯示不友善 panic。', code: 'fn run(path: &str) -> Result<String, std::io::Error> {\n    std::fs::read_to_string(path)\n}\n// if let Err(error) = run(...) { eprintln!("{error}"); }' }
    ],
    challenge: { title: '完成文字搜尋核心', description: '使用 lines、filter 與 contains 回傳所有相符行。', starter: "fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {\n    // 完成搜尋管線\n    todo!()\n}", solution: "fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {\n    contents\n        .lines()\n        .filter(|line| line.contains(query))\n        .collect()\n}", required: ['fn search<\'a>', '.lines()', '.filter(', '.contains(query)', '.collect()'], expectedOutput: '只回傳包含 query 的文字行', hints: ['contents.lines() 產生逐行迭代器。', 'filter 內呼叫 contains，最後 collect。'] },
    quiz: { question: '為何搜尋核心不直接在函式內讀檔？', choices: ['Rust 無法讀檔', '分離 I/O 後更容易測試與重用', '讀檔一定很慢', '生命週期不允許'], answer: 1, explanation: '把純邏輯與外部 I/O 分離，是可靠 CLI 的重要設計。' }
  },
  {
    id: 'api-project', stage: 'projects', order: 20, duration: 120, available: true,
    title: '實作專案：REST API', subtitle: '以 Axum 建立具狀態的學習紀錄服務',
    objectives: ['設計路由與 JSON 型別', '共享執行緒安全狀態', '處理狀態碼與錯誤回應'],
    sections: [
      { title: '以型別定義 API 契約', body: '使用 serde 的 Serialize 與 Deserialize 定義輸入輸出。明確型別會讓遺漏欄位與格式錯誤在邊界被拒絕。正式專案可用 cargo add axum tokio serde 建立相依。', code: '#[derive(serde::Serialize, serde::Deserialize, Clone)]\nstruct Note {\n    id: u64,\n    text: String,\n}' },
      { title: '路由連接 handler', body: 'Axum Router 將 HTTP 方法與 async handler 組合。Json<T> 同時負責解析請求與序列化回應，Path<T> 可安全擷取路徑參數。', code: 'use axum::{routing::{get, post}, Router};\nlet app = Router::new()\n    .route("/notes", get(list_notes).post(create_note));' },
      { title: '狀態與錯誤都要明確', body: '簡易版本可用 Arc<RwLock<Vec<Note>>> 共享狀態；正式服務改接資料庫。找不到資源應回 404，驗證失敗回 400，未預期錯誤回 500，並避免洩漏內部資訊。', code: 'type Store = std::sync::Arc<tokio::sync::RwLock<Vec<Note>>>;\n// Result<Json<Note>, (StatusCode, String)>' }
    ],
    challenge: { title: '建立健康檢查 handler', description: '完成 async health，使它回傳 JSON 狀態 ready。', starter: 'use axum::Json;\nuse serde::Serialize;\n#[derive(Serialize)]\nstruct Health { status: String }\nasync fn health() -> Json<Health> {\n    // 回傳 ready\n    todo!()\n}', solution: 'use axum::Json;\nuse serde::Serialize;\n#[derive(Serialize)]\nstruct Health { status: String }\nasync fn health() -> Json<Health> {\n    Json(Health { status: String::from("ready") })\n}', required: ['async fn health()', 'Json<Health>', 'Json(Health', 'String::from("ready")'], expectedOutput: '{"status":"ready"}', hints: ['建立 Health 實例後用 Json 包住。', '欄位型別是 String。'] },
    quiz: { question: 'API 找不到指定資源時，最合適的 HTTP 狀態碼是？', choices: ['200', '201', '404', '500'], answer: 2, explanation: '404 明確表示客戶端要求的資源不存在。' }
  },
  {
    id: 'wasm-project', stage: 'projects', order: 21, duration: 120, available: true,
    title: '實作專案：WebAssembly', subtitle: '把 Rust 學習計算器帶進瀏覽器',
    objectives: ['理解 wasm-bindgen 邊界', '匯出 Rust 函式給 JavaScript', '建立與測試 wasm 套件'],
    sections: [
      { title: 'Wasm 是瀏覽器可執行目標', body: 'Rust 可編譯為 wasm32-unknown-unknown。wasm-pack 會建置模組並產生 JavaScript 包裝，適合重用計算密集或需要型別安全的核心邏輯。', code: 'rustup target add wasm32-unknown-unknown\ncargo install wasm-pack\nwasm-pack build --target web' },
      { title: '用 wasm-bindgen 匯出介面', body: '#[wasm_bindgen] 讓函式能從 JavaScript 呼叫。跨邊界型別應保持簡單；複雜資料可序列化，並避免大量細碎呼叫造成轉換成本。', code: 'use wasm_bindgen::prelude::*;\n\n#[wasm_bindgen]\npub fn study_score(minutes: u32, lessons: u32) -> u32 {\n    minutes + lessons * 10\n}' },
      { title: 'JavaScript 載入模組', body: '產物是瀏覽器模組，先 await 初始化，再呼叫匯出函式。核心 Rust 邏輯仍可用一般 cargo test 測試，瀏覽器整合則用 wasm-bindgen-test。', code: 'import init, { study_score } from "./pkg/rust_academy.js";\nawait init();\nconsole.log(study_score(30, 2));' }
    ],
    challenge: { title: '匯出進度百分比', description: '完成可匯出的 progress 函式，並避免 total 為零時除法錯誤。', starter: 'use wasm_bindgen::prelude::*;\n#[wasm_bindgen]\npub fn progress(done: u32, total: u32) -> u32 {\n    // total 為 0 回傳 0，否則計算百分比\n    todo!()\n}', solution: 'use wasm_bindgen::prelude::*;\n#[wasm_bindgen]\npub fn progress(done: u32, total: u32) -> u32 {\n    if total == 0 {\n        0\n    } else {\n        done.saturating_mul(100) / total\n    }\n}', required: ['#[wasm_bindgen]', 'pub fn progress', 'if total == 0', 'saturating_mul(100)', '/ total'], expectedOutput: 'progress(3, 4) 回傳 75', hints: ['先處理 total == 0。', 'saturating_mul 可避免乘法溢位造成意外。'] },
    quiz: { question: 'wasm-pack 在此工作流程中的主要用途是什麼？', choices: ['架設資料庫', '建置 Wasm 並產生 JavaScript 包裝', '取代瀏覽器', '自動撰寫 Rust'], answer: 1, explanation: 'wasm-pack 整合 Rust 到 WebAssembly 的建置與 JS 介面產生流程。' }
  }
];
