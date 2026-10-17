export const GO_STORAGE_KEY = 'private-go-academy-v1';
export const GO_PROGRESS_OWNER = 'private-go-owner';

export const goStages = [
  { id: 'foundation', number: '01', icon: '🌱', title: '語言基礎', subtitle: '建立清楚、簡潔的 Go 心智模型', color: '#0891b2' },
  { id: 'core', number: '02', icon: '🧩', title: 'Go 核心', subtitle: '結構體、介面、錯誤與套件', color: '#2563eb' },
  { id: 'concurrency', number: '03', icon: '⚡', title: '並行設計', subtitle: 'Goroutine、Channel 與 Context', color: '#7c3aed' },
  { id: 'engineering', number: '04', icon: '🛠️', title: '工程實務', subtitle: 'I/O、JSON、HTTP 與測試工具', color: '#0f766e' },
  { id: 'advanced', number: '05', icon: '🏗️', title: '進階設計', subtitle: '泛型、反射、效能與架構', color: '#c2410c' },
  { id: 'projects', number: '06', icon: '🚀', title: '實作專案', subtitle: 'CLI、REST API 與並行爬蟲', color: '#be123c' }
];

const lesson = (id, stage, order, duration, title, subtitle, objectives, sections, challenge, quiz) => ({
  id, stage, order, duration, title, subtitle, objectives, sections, challenge, quiz, available: true
});

export const goLessons = [
  lesson('hello-go', 'foundation', 1, 20, '第一支 Go 程式', '認識 package、main、fmt 與 go 工具鏈',
    ['讀懂最小 Go 程式', '使用 go run 與 go build', '理解 gofmt 的角色'], [
      { title: '程式從 package main 開始', body: '可執行程式使用 package main，執行入口是 main 函式。import 引入套件，fmt.Println 負責格式化輸出。', code: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, Go!")\n}' },
      { title: '模組與工具鏈', body: 'go mod init 建立模組，go run 編譯後立即執行，go build 產生執行檔。Go 工具把常見工作整合成一致介面。', code: 'go mod init example.com/hello\ngo run .\ngo build .' },
      { title: '格式是語言文化的一部分', body: 'gofmt 自動統一縮排與空白，go vet 找出常見可疑程式。團隊不必為格式爭論，程式碼也更容易閱讀。', code: 'gofmt -w .\ngo vet ./...\ngo test ./...' }
    ], { title: '輸出學習宣言', description: '建立 language 與 goal，使用 fmt.Printf 輸出指定內容。', starter: 'package main\nimport "fmt"\nfunc main() {\n    language := "Go"\n    goal := "學會並行"\n    // 輸出：Go 的目標：學會並行\n}', solution: 'package main\nimport "fmt"\nfunc main() {\n    language := "Go"\n    goal := "學會並行"\n    fmt.Printf("%s 的目標：%s\\n", language, goal)\n}', required: ['package main', 'language := "Go"', 'goal :=', 'fmt.Printf'], expectedOutput: 'Go 的目標：學會並行', hints: ['使用 %s 放入字串。', 'Printf 不會自動換行，格式字串加入 \\n。'] },
    { question: '哪個指令會統一 Go 原始碼格式？', choices: ['go clean', 'gofmt', 'go env', 'go list'], answer: 1, explanation: 'gofmt 是 Go 官方且具一致性的格式化工具。' }),

  lesson('variables-types', 'foundation', 2, 30, '變數、常數與型別', '善用推斷，同時保留明確意圖',
    ['宣告變數與常數', '辨識常用基本型別', '理解零值與轉型'], [
      { title: '兩種常用宣告', body: 'var 可明確指定型別或使用零值；:= 適合函式內短宣告。短宣告左側至少要有一個新變數。', code: 'var score int = 80\nlevel := 1\nname, active := "Gopher", true' },
      { title: '零值可直接使用', body: '未初始化變數會得到該型別零值：數字 0、布林 false、字串空字串，參照型別通常是 nil。這減少未定義狀態。', code: 'var count int      // 0\nvar ready bool     // false\nvar title string   // ""' },
      { title: '轉型必須明確', body: 'Go 不會在不同數值型別間隱式轉換。明確寫出 int、float64 等轉型，能避免精度與範圍被悄悄改變。', code: 'total := 7\naverage := float64(total) / 2\nconst Pi = 3.14159' }
    ], { title: '計算平均分數', description: '把 total 轉成 float64，計算三次練習平均。', starter: 'package main\nimport "fmt"\nfunc main() {\n    total := 250\n    attempts := 3\n    // 計算 average\n    fmt.Printf("%.1f\\n", average)\n}', solution: 'package main\nimport "fmt"\nfunc main() {\n    total := 250\n    attempts := 3\n    average := float64(total) / float64(attempts)\n    fmt.Printf("%.1f\\n", average)\n}', required: ['average :=', 'float64(total)', 'float64(attempts)', 'fmt.Printf'], expectedOutput: '83.3', hints: ['整數除法會捨去小數。', '除法兩側都轉成 float64。'] },
    { question: '未賦值的 bool 變數零值是什麼？', choices: ['true', 'false', 'nil', '隨機值'], answer: 1, explanation: 'Go 為每種型別定義可預期的零值。' }),

  lesson('functions-flow', 'foundation', 3, 35, '函式與流程控制', '以小函式和簡潔控制流程組合程式',
    ['撰寫多回傳值函式', '使用 if、switch 與 defer', '使用三種形式的 for'], [
      { title: '函式可回傳多個值', body: '多回傳值常用來同時傳回結果與錯誤。參數型別相同時可合併書寫，具名回傳值則應節制使用。', code: 'func divide(a, b float64) (float64, error) {\n    if b == 0 { return 0, fmt.Errorf("除數不可為零") }\n    return a / b, nil\n}' },
      { title: '控制流程刻意精簡', body: 'Go 只有 for 迴圈；它可表達計數、條件與無限迴圈。switch 預設不會自動 fallthrough，if 可在條件前放短陳述式。', code: 'for i := 1; i <= 3; i++ { fmt.Println(i) }\nif value, err := strconv.Atoi("8"); err == nil { fmt.Println(value) }' },
      { title: 'defer 延後清理', body: 'defer 會在函式返回前以後進先出順序執行，常用於關閉檔案或解鎖。取得資源成功後應立即安排清理。', code: 'file, err := os.Open("notes.txt")\nif err != nil { return err }\ndefer file.Close()' }
    ], { title: '判斷學習節奏', description: '完成 studyMode：30 分鐘以上回傳深度練習，否則快速複習。', starter: 'func studyMode(minutes int) string {\n    // 完成判斷\n}', solution: 'func studyMode(minutes int) string {\n    if minutes >= 30 {\n        return "深度練習"\n    }\n    return "快速複習"\n}', required: ['func studyMode', 'minutes >= 30', 'return "深度練習"', 'return "快速複習"'], expectedOutput: 'studyMode(45) 回傳深度練習', hints: ['條件不加括號。', '提早 return 可省略 else。'] },
    { question: 'Go 以哪個關鍵字表達 while 類型迴圈？', choices: ['while', 'loop', 'for', 'repeat'], answer: 2, explanation: 'Go 統一使用 for 表達所有迴圈形式。' }),

  lesson('collections', 'foundation', 4, 40, '陣列、Slice 與 Map', '掌握 Go 最常用的集合型別',
    ['區分陣列與 slice', '安全新增與切分資料', '使用 map 與 comma-ok'], [
      { title: 'Slice 是彈性檢視', body: '陣列長度屬於型別；slice 則描述底層陣列的一段資料，包含指標、長度與容量。append 可能配置新底層陣列。', code: 'scores := []int{72, 88, 95}\nscores = append(scores, 100)\nfirstTwo := scores[:2]' },
      { title: 'range 走訪集合', body: 'range 對 slice 回傳索引和值，對 map 回傳鍵和值。若不需要其中一項，以 _ 明確忽略。', code: 'for index, score := range scores {\n    fmt.Println(index, score)\n}' },
      { title: 'Map 查找需要辨識缺值', body: '讀取不存在鍵會得到值型別零值。使用 value, ok := m[key] 才能區分「不存在」和「存在但剛好是零值」。', code: 'levels := map[string]int{"Go": 3}\nlevel, ok := levels["Rust"]\nfmt.Println(level, ok)' }
    ], { title: '統計及格人數', description: '走訪 scores，計算大於等於 60 的數量。', starter: 'func passed(scores []int) int {\n    count := 0\n    // 使用 range\n    return count\n}', solution: 'func passed(scores []int) int {\n    count := 0\n    for _, score := range scores {\n        if score >= 60 { count++ }\n    }\n    return count\n}', required: ['for _, score := range scores', 'score >= 60', 'count++', 'return count'], expectedOutput: 'passed([]int{50, 80, 90}) 回傳 2', hints: ['不需要索引時用 _。', '每個及格分數讓 count 加一。'] },
    { question: '如何可靠判斷 map 中是否存在某個鍵？', choices: ['只檢查零值', '使用 comma-ok', '檢查長度', '呼叫 contains'], answer: 1, explanation: 'comma-ok 同時提供值與鍵是否存在的布林值。' }),

  lesson('foundation-project', 'foundation', 5, 55, '基礎實作：學習紀錄器', '整合輸入、集合、函式與格式化輸出',
    ['將需求拆成資料與函式', '累計每日學習時間', '產生可讀摘要'], [
      { title: '先定義資料流', body: '紀錄器接收每日分鐘數，計算總和與平均，再依總量產生回饋。讓每個函式只負責一項轉換。', code: '輸入：[]int{25, 40, 35}\n處理：總和、平均、評語\n輸出：100 分鐘，節奏穩定' },
      { title: '純函式容易驗證', body: 'sum 只根據輸入回傳結果，沒有檔案或終端機副作用。這類函式容易測試，也能被 CLI、API 重用。', code: 'func sum(values []int) int {\n    total := 0\n    for _, value := range values { total += value }\n    return total\n}' },
      { title: 'main 負責協調', body: 'main 準備輸入、呼叫核心函式並輸出，不把所有規則塞進單一函式。先求正確，再用 gofmt 與測試改善。', code: 'func main() {\n    total := sum([]int{25, 40, 35})\n    fmt.Printf("本週共學習 %d 分鐘\\n", total)\n}' }
    ], { title: '完成分鐘加總', description: '完成 sumMinutes，使三天總計為 100。', starter: 'func sumMinutes(days []int) int {\n    total := 0\n    // 累加每天分鐘\n    return total\n}', solution: 'func sumMinutes(days []int) int {\n    total := 0\n    for _, minutes := range days {\n        total += minutes\n    }\n    return total\n}', required: ['func sumMinutes', 'range days', 'total += minutes', 'return total'], expectedOutput: '100', hints: ['使用 range 取得每一天。', '累加到 total 後回傳。'] },
    { question: '將加總寫成純函式最直接的好處是？', choices: ['不需編譯', '容易測試與重用', '永遠不會出錯', '可以省略型別'], answer: 1, explanation: '純函式輸入輸出清楚，測試不需準備外部資源。' }),

  lesson('structs-methods', 'core', 6, 40, '結構體與方法', '用資料型別表達領域概念',
    ['定義與初始化 struct', '撰寫值與指標接收者方法', '使用組合取代繼承'], [
      { title: 'Struct 組合相關欄位', body: 'struct 以具名欄位建立領域型別。具名初始化較能承受欄位順序改變，零值設計良好的型別可直接使用。', code: 'type Course struct {\n    Title string\n    Lessons int\n    Published bool\n}' },
      { title: '接收者決定修改語意', body: '值接收者取得副本，適合唯讀小型值；指標接收者可修改原值，也避免複製大型結構。Go 呼叫時會自動處理常見取址。', code: 'func (c *Course) AddLesson() { c.Lessons++ }\nfunc (c Course) Label() string { return c.Title }' },
      { title: '嵌入提供組合', body: 'Go 沒有類別繼承。匿名嵌入欄位可提升其方法，但外層型別仍以組合方式擁有內層值。', code: 'type Audit struct { CreatedBy string }\ntype Course struct {\n    Audit\n    Title string\n}' }
    ], { title: '建立計數器', description: '為 Counter 實作指標接收者 Increment。', starter: 'type Counter struct { Value int }\n// 實作 Increment\nfunc main() {\n    counter := Counter{}\n    counter.Increment()\n}', solution: 'type Counter struct { Value int }\nfunc (c *Counter) Increment() {\n    c.Value++\n}\nfunc main() {\n    counter := Counter{}\n    counter.Increment()\n}', required: ['type Counter struct', 'func (c *Counter) Increment()', 'c.Value++'], expectedOutput: 'counter.Value 為 1', hints: ['修改原值要用 *Counter。', '接收者名稱通常簡短且一致。'] },
    { question: '需要修改原結構體的方法通常使用哪種接收者？', choices: ['值接收者', '指標接收者', '介面接收者', '匿名接收者'], answer: 1, explanation: '指標接收者可修改原值並避免結構複製。' }),

  lesson('interfaces', 'core', 7, 45, '介面與組合', '以小介面描述能力',
    ['理解隱式實作', '設計小而專注的介面', '正確處理 nil 介面'], [
      { title: '實作不需要宣告', body: '型別只要具備介面要求的方法就自動實作它，套件之間不需預先相依。介面通常由使用者端依需求定義。', code: 'type Summarizer interface { Summary() string }\nfunc Print(item Summarizer) { fmt.Println(item.Summary()) }' },
      { title: '小介面更容易組合', body: 'io.Reader 只有 Read，io.Writer 只有 Write。單方法介面容易測試、替換與組合；避免建立包含整個服務所有方法的巨大介面。', code: 'type Reader interface {\n    Read(p []byte) (n int, err error)\n}\ntype ReadWriter interface { Reader; io.Writer }' },
      { title: '介面值包含型別和值', body: '介面持有動態型別與動態值。裝入 nil 指標後，介面本身可能不等於 nil；API 應避免回傳帶型別的 nil。', code: 'var pointer *Course = nil\nvar value any = pointer\nfmt.Println(value == nil) // false' }
    ], { title: '實作 Stringer', description: '讓 Course 實作 fmt.Stringer，回傳「課程：Go」。', starter: 'type Course struct { Title string }\n// 實作 String() string', solution: 'type Course struct { Title string }\nfunc (c Course) String() string {\n    return "課程：" + c.Title\n}', required: ['func (c Course) String() string', 'return "課程：" + c.Title'], expectedOutput: '課程：Go', hints: ['fmt.Stringer 只要求 String() string。', '不需要寫 implements。'] },
    { question: 'Go 型別如何實作介面？', choices: ['使用 implements', '繼承介面', '具備介面要求的方法即可', '修改 go.mod'], answer: 2, explanation: 'Go 採結構式、隱式介面實作。' }),

  lesson('errors', 'core', 8, 45, '錯誤處理', '把可預期失敗當成一般值',
    ['建立與包裝錯誤', '使用 errors.Is 與 errors.As', '區分 error 與 panic'], [
      { title: 'Error 是值', body: '函式通常把 error 放在最後一個回傳值。呼叫端立即檢查 err，成功流程保持靠左，失敗則加入上下文後回傳。', code: 'value, err := strconv.Atoi(input)\nif err != nil {\n    return 0, fmt.Errorf("解析等級 %q: %w", input, err)\n}' },
      { title: '保留錯誤鏈', body: '%w 包裝原錯誤，errors.Is 可比對已知錯誤，errors.As 可取得特定錯誤型別。不要依賴錯誤訊息字串判斷程式流程。', code: 'if errors.Is(err, os.ErrNotExist) {\n    return defaultConfig(), nil\n}' },
      { title: 'Panic 不是一般錯誤', body: 'panic 適合程式不變量被破壞等無法合理繼續的情況。檔案不存在、輸入錯誤等應回傳 error，讓呼叫者決定處理方式。', code: 'func MustPositive(value int) int {\n    if value < 0 { panic("value must be positive") }\n    return value\n}' }
    ], { title: '安全除法', description: '除數為零時回傳錯誤，否則回傳結果與 nil。', starter: 'func divide(a, b float64) (float64, error) {\n    // 完成錯誤處理\n}', solution: 'func divide(a, b float64) (float64, error) {\n    if b == 0 {\n        return 0, fmt.Errorf("除數不可為零")\n    }\n    return a / b, nil\n}', required: ['func divide', 'if b == 0', 'fmt.Errorf', 'return a / b, nil'], expectedOutput: 'divide(8, 2) 回傳 4, nil', hints: ['錯誤時仍要提供 float64 零值。', '成功時 error 回傳 nil。'] },
    { question: '包裝錯誤並保留錯誤鏈應使用哪個格式動詞？', choices: ['%s', '%v', '%w', '%q'], answer: 2, explanation: 'fmt.Errorf 的 %w 讓 errors.Is/As 能沿錯誤鏈檢查。' }),

  lesson('packages-testing', 'core', 9, 50, '套件、模組與測試', '建立可維護、可驗證的 Go 專案',
    ['安排 package 邊界', '撰寫表格驅動測試', '使用測試替身與 coverage'], [
      { title: '套件名稱描述職責', body: '同一資料夾通常屬於同一 package。公開識別字以大寫開頭；internal 目錄可限制外部模組匯入。避免 util、common 等模糊套件。', code: 'go.mod\ncmd/server/main.go\ninternal/course/service.go\ninternal/course/service_test.go' },
      { title: '測試與原始碼並排', body: '*_test.go 由 go test 自動發現。表格驅動測試以多組名稱、輸入、預期結果重用同一套驗證流程。', code: 'for _, test := range tests {\n    t.Run(test.name, func(t *testing.T) {\n        if got := Double(test.input); got != test.want { t.Fatalf("got %d", got) }\n    })\n}' },
      { title: '工具支援品質回饋', body: 'go test ./... 執行所有測試，-race 找資料競爭，-cover 顯示覆蓋率。覆蓋率是線索，不等於測試品質。', code: 'go test ./...\ngo test -race ./...\ngo test -coverprofile=cover.out ./...' }
    ], { title: '撰寫平方測試', description: '加入 TestSquare，確認 Square(4) 等於 16。', starter: 'func Square(value int) int { return value * value }\n// 加入測試', solution: 'func TestSquare(t *testing.T) {\n    if got := Square(4); got != 16 {\n        t.Fatalf("Square(4) = %d, want 16", got)\n    }\n}', required: ['func TestSquare(t *testing.T)', 'Square(4)', 'got != 16', 't.Fatalf'], expectedOutput: 'PASS', hints: ['測試函式名稱以 Test 開頭。', '失敗時用 t.Fatalf 顯示實際值。'] },
    { question: '偵測並行資料競爭常使用哪個指令？', choices: ['go test -race', 'go run -safe', 'go vet -parallel', 'gofmt -race'], answer: 0, explanation: '競爭偵測器可在測試執行期間找出未同步存取。' }),

  lesson('goroutines', 'concurrency', 10, 40, 'Goroutine', '用輕量工作單位執行並行任務',
    ['啟動 goroutine', '等待工作完成', '避免 goroutine 洩漏'], [
      { title: 'go 啟動並行工作', body: '在函式呼叫前加 go 就會建立 goroutine。排程順序不保證，因此不能依賴 sleep 猜測工作何時完成。', code: 'go func() {\n    fmt.Println("background work")\n}()' },
      { title: 'WaitGroup 等待一組工作', body: 'Add 在啟動前登記數量，每個 goroutine defer Done，主流程 Wait。Go 1.25 也提供 WaitGroup.Go 簡化常見模式。', code: 'var wg sync.WaitGroup\nwg.Add(1)\ngo func() { defer wg.Done(); work() }()\nwg.Wait()' },
      { title: '每個工作都要有結束路徑', body: '阻塞在永遠無人接收的 channel 或失去取消訊號會造成洩漏。設計 goroutine 時先回答由誰等待、由誰取消、如何回報錯誤。', code: 'select {\ncase result <- value:\ncase <-ctx.Done():\n    return\n}' }
    ], { title: '並行執行兩個工作', description: '用 WaitGroup 啟動兩個 worker 並等待完成。', starter: 'var wg sync.WaitGroup\n// 啟動兩個 goroutine 並等待', solution: 'var wg sync.WaitGroup\nfor i := 0; i < 2; i++ {\n    wg.Add(1)\n    go func(id int) {\n        defer wg.Done()\n        fmt.Println(id)\n    }(i)\n}\nwg.Wait()', required: ['var wg sync.WaitGroup', 'wg.Add(1)', 'go func(id int)', 'defer wg.Done()', 'wg.Wait()'], expectedOutput: '輸出 0 與 1，順序不固定', hints: ['Add 要在啟動 goroutine 前。', '把迴圈值當參數傳入閉包。'] },
    { question: '等待 goroutine 完成時，為何不應只使用 time.Sleep？', choices: ['Sleep 不能編譯', '時間猜測不保證工作完成', 'Sleep 只能在測試中用', 'Sleep 會關閉 goroutine'], answer: 1, explanation: '應使用 WaitGroup、channel 等明確同步機制。' }),

  lesson('channels', 'concurrency', 11, 50, 'Channel 與 Select', '以通訊協調並行流程',
    ['建立與關閉 channel', '理解緩衝與阻塞', '使用 select 協調多個事件'], [
      { title: 'Channel 傳遞具型別資料', body: 'make(chan T) 建立無緩衝 channel，傳送會等待接收者。緩衝 channel 允許有限數量傳送先完成，但不是無限佇列。', code: 'results := make(chan int)\ngo func() { results <- 42 }()\nvalue := <-results' },
      { title: '由傳送方決定何時關閉', body: 'close 表示不會再有值。接收端可用 range 讀到關閉；不必為每個 channel 關閉，重複關閉或關閉後傳送會 panic。', code: 'go func() {\n    defer close(results)\n    for i := 0; i < 3; i++ { results <- i }\n}()\nfor value := range results { fmt.Println(value) }' },
      { title: 'Select 等待多個事件', body: 'select 會選擇已就緒 case，常用於結果、逾時與取消。沒有 case 就緒且沒有 default 時會阻塞。', code: 'select {\ncase value := <-results:\n    fmt.Println(value)\ncase <-time.After(time.Second):\n    return fmt.Errorf("timeout")\n}' }
    ], { title: '產生數字串流', description: '傳送 1 到 3 後關閉 channel，讓接收端可 range。', starter: 'func numbers() <-chan int {\n    output := make(chan int)\n    // 啟動傳送工作\n    return output\n}', solution: 'func numbers() <-chan int {\n    output := make(chan int)\n    go func() {\n        defer close(output)\n        for i := 1; i <= 3; i++ { output <- i }\n    }()\n    return output\n}', required: ['func numbers() <-chan int', 'go func()', 'defer close(output)', 'output <- i'], expectedOutput: '依序接收 1、2、3', hints: ['回傳唯讀 channel 可限制呼叫者。', '傳送完畢後由生產者關閉。'] },
    { question: '通常應由誰關閉 channel？', choices: ['任意接收者', '確定不再傳值的傳送方', '垃圾回收器', 'main 一律關閉'], answer: 1, explanation: '傳送方最清楚何時不會再產生資料。' }),

  lesson('context', 'concurrency', 12, 45, 'Context 與取消', '讓逾時、取消與請求範圍一路傳遞',
    ['建立 timeout 與 cancel', '沿呼叫鏈傳遞 context', '避免把 context 存進 struct'], [
      { title: 'Context 是請求生命週期', body: 'context.Context 通常是函式第一個參數，名稱為 ctx。它傳遞取消、期限與少量請求範圍資料，不用來塞一般選項。', code: 'func Fetch(ctx context.Context, id string) error {\n    // ...\n    return nil\n}' },
      { title: '建立後務必呼叫 cancel', body: 'WithCancel、WithTimeout 會回傳 cancel 函式。立即 defer cancel 可釋放計時器與關聯資源，即使工作提前完成也一樣。', code: 'ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)\ndefer cancel()' },
      { title: '阻塞點要監聽 Done', body: '長時間工作與 channel 操作應 select ctx.Done，並回傳 ctx.Err。取消只有在每層合作檢查時才能真正停止工作。', code: 'select {\ncase <-ctx.Done():\n    return ctx.Err()\ncase result := <-results:\n    return result\n}' }
    ], { title: '加入逾時控制', description: '建立 500ms timeout，並確保 cancel 被呼叫。', starter: 'func run() error {\n    // 建立 ctx 與 cancel\n    select {\n    case <-ctx.Done(): return ctx.Err()\n    }\n}', solution: 'func run() error {\n    ctx, cancel := context.WithTimeout(context.Background(), 500*time.Millisecond)\n    defer cancel()\n    select {\n    case <-ctx.Done(): return ctx.Err()\n    }\n}', required: ['context.WithTimeout', 'context.Background()', '500*time.Millisecond', 'defer cancel()', 'ctx.Err()'], expectedOutput: '約 500ms 後回傳 context deadline exceeded', hints: ['WithTimeout 回傳 ctx 與 cancel。', '建立後立刻 defer cancel。'] },
    { question: 'Context 參數通常應放在函式的哪裡？', choices: ['最後一個', '第一個', '全域變數', 'struct 欄位'], answer: 1, explanation: '慣例是第一個參數 ctx context.Context。' }),

  lesson('sync-primitives', 'concurrency', 13, 55, 'Mutex、原子操作與競爭', '在共享狀態與訊息傳遞間做正確選擇',
    ['使用 Mutex 保護不變量', '辨識資料競爭', '選擇 RWMutex、Once 與 atomic'], [
      { title: 'Mutex 保護一組共享狀態', body: 'Lock 到 Unlock 之間是臨界區。鎖應與它保護的資料放在同一型別，並讓臨界區短小；取得鎖後通常立即 defer Unlock。', code: 'type Counter struct {\n    mu sync.Mutex\n    value int\n}\nfunc (c *Counter) Add() { c.mu.Lock(); defer c.mu.Unlock(); c.value++ }' },
      { title: '競爭是正確性問題', body: '兩個 goroutine 未同步存取同一資料且至少一方寫入，就可能發生資料競爭。go test -race 能在執行路徑中偵測它。', code: 'go test -race ./...\ngo run -race ./cmd/server' },
      { title: '使用最簡單的同步工具', body: 'RWMutex 適合讀多寫少且量測證實有益；Once 執行一次初始化；atomic 適合簡單計數或旗標。複合不變量仍應使用鎖或單一擁有者。', code: 'var once sync.Once\nonce.Do(func() { config = loadConfig() })\nvar requests atomic.Int64\nrequests.Add(1)' }
    ], { title: '建立安全計數器', description: '完成 Add 與 Value，讓讀寫都受 Mutex 保護。', starter: 'type Counter struct { mu sync.Mutex; value int }\nfunc (c *Counter) Add() {}\nfunc (c *Counter) Value() int { return 0 }', solution: 'type Counter struct { mu sync.Mutex; value int }\nfunc (c *Counter) Add() {\n    c.mu.Lock()\n    defer c.mu.Unlock()\n    c.value++\n}\nfunc (c *Counter) Value() int {\n    c.mu.Lock()\n    defer c.mu.Unlock()\n    return c.value\n}', required: ['c.mu.Lock()', 'defer c.mu.Unlock()', 'c.value++', 'return c.value'], expectedOutput: '並行累加不遺失更新', hints: ['讀取也要同步，否則仍可能競爭。', '鎖與資料都放在 Counter 內。'] },
    { question: '什麼情況構成資料競爭？', choices: ['兩個 goroutine 只讀同一值', '未同步同時存取且至少一方寫入', '使用 channel', '呼叫 gofmt'], answer: 1, explanation: '未同步的讀寫或寫寫可能產生不可預期行為。' }),

  lesson('io-files', 'engineering', 14, 45, 'I/O、檔案與串流', '以 Reader／Writer 建立可組合資料流程',
    ['使用 io.Reader 與 io.Writer', '安全開啟與關閉檔案', '以緩衝處理大型資料'], [
      { title: 'Reader 與 Writer 是通用邊界', body: '函式接收 io.Reader 就能讀檔案、網路、記憶體字串或測試資料。依賴小介面讓核心邏輯與來源解耦。', code: 'func CountLines(reader io.Reader) (int, error) {\n    scanner := bufio.NewScanner(reader)\n    count := 0\n    for scanner.Scan() { count++ }\n    return count, scanner.Err()\n}' },
      { title: '取得資源後安排關閉', body: 'os.Open 成功後立即 defer Close。小檔可用 os.ReadFile；大型或持續資料應串流，避免一次載入全部記憶體。', code: 'file, err := os.Open(path)\nif err != nil { return err }\ndefer file.Close()' },
      { title: '緩衝與複製', body: 'bufio.Reader/Writer 減少系統呼叫，io.Copy 在 Reader 與 Writer 間高效搬移資料。使用 Writer 後要記得 Flush。', code: 'writer := bufio.NewWriter(output)\ndefer writer.Flush()\n_, err := io.Copy(writer, input)' }
    ], { title: '計算行數', description: '使用 Scanner 逐行讀取並回傳行數與錯誤。', starter: 'func countLines(reader io.Reader) (int, error) {\n    // 建立 Scanner 並逐行計數\n}', solution: 'func countLines(reader io.Reader) (int, error) {\n    scanner := bufio.NewScanner(reader)\n    count := 0\n    for scanner.Scan() { count++ }\n    return count, scanner.Err()\n}', required: ['bufio.NewScanner(reader)', 'scanner.Scan()', 'count++', 'scanner.Err()'], expectedOutput: '三行文字回傳 3, nil', hints: ['Scanner 每次 Scan 前進一個 token。', '迴圈後一定回傳 scanner.Err。'] },
    { question: '接收 io.Reader 的主要設計優點是？', choices: ['只能讀檔案', '可替換多種資料來源且容易測試', '自動關閉所有資源', '完全不會出錯'], answer: 1, explanation: '小介面讓函式不綁定特定檔案或網路實作。' }),

  lesson('json-http', 'engineering', 15, 55, 'JSON 與 HTTP 用戶端', '安全呼叫外部服務並解碼資料',
    ['使用 struct tag 編解碼 JSON', '設定 HTTP timeout', '檢查狀態碼並限制回應'], [
      { title: '以型別定義 JSON', body: 'encoding/json 只處理公開欄位。struct tag 對應 JSON 名稱，omitempty 可省略空值；未知欄位策略依 API 相容性決定。', code: 'type Course struct {\n    ID int `json:"id"`\n    Title string `json:"title"`\n    Draft bool `json:"draft,omitempty"`\n}' },
      { title: 'HTTP Client 必須有逾時', body: '預設 Client 沒有整體 timeout。可設定 Client.Timeout，並使用 NewRequestWithContext 讓上游取消沿請求傳遞。', code: 'client := &http.Client{Timeout: 5 * time.Second}\nrequest, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)' },
      { title: '回應不是只有 200 與錯誤', body: 'Do 的 err 為 nil 不代表 HTTP 成功。應 defer Body.Close、檢查狀態碼並限制讀取大小，避免意外巨大回應。', code: 'response, err := client.Do(request)\nif err != nil { return err }\ndefer response.Body.Close()\nif response.StatusCode != http.StatusOK { return fmt.Errorf("status: %s", response.Status) }' }
    ], { title: '解碼課程 JSON', description: '從 reader 解碼成 Course，並包裝錯誤。', starter: 'func decodeCourse(reader io.Reader) (Course, error) {\n    var course Course\n    // 解碼並回傳\n}', solution: 'func decodeCourse(reader io.Reader) (Course, error) {\n    var course Course\n    if err := json.NewDecoder(reader).Decode(&course); err != nil {\n        return Course{}, fmt.Errorf("decode course: %w", err)\n    }\n    return course, nil\n}', required: ['json.NewDecoder(reader)', 'Decode(&course)', 'fmt.Errorf', 'return course, nil'], expectedOutput: '有效 JSON 回傳 Course 與 nil', hints: ['Decode 需要指標才能寫入。', '錯誤以 %w 保留原因。'] },
    { question: 'http.Client 為何應設定 timeout？', choices: ['讓 JSON 更小', '避免請求無限等待並耗盡資源', '自動重試所有錯誤', '隱藏狀態碼'], answer: 1, explanation: '明確期限是可靠網路程式的基本要求。' }),

  lesson('tooling-observability', 'engineering', 16, 50, '測試、日誌與可觀測性', '讓服務的行為可以驗證與診斷',
    ['撰寫 HTTP 測試', '使用結構化日誌', '建立 benchmark 與 profile'], [
      { title: 'httptest 驗證 Handler', body: 'httptest.NewRecorder 與 NewRequest 可在不開真實連接埠的情況測試 HTTP handler，並檢查狀態碼、標頭與 body。', code: 'request := httptest.NewRequest(http.MethodGet, "/health", nil)\nrecorder := httptest.NewRecorder()\nhandler.ServeHTTP(recorder, request)' },
      { title: '日誌是具欄位的事件', body: 'log/slog 支援結構化欄位與層級。記錄 request_id、耗時與結果，避免寫入密碼、token 或完整個資。', code: 'logger.Info("request complete",\n    "method", request.Method,\n    "duration_ms", elapsed.Milliseconds())' },
      { title: '先量測再最佳化', body: 'Benchmark 以 B 開頭並接收 *testing.B。go test -bench 與 pprof 能指出真正熱點；不要只靠直覺增加複雜度。', code: 'func BenchmarkSearch(b *testing.B) {\n    for i := 0; i < b.N; i++ { Search(data, "go") }\n}\n// go test -bench=. -benchmem' }
    ], { title: '測試健康檢查', description: '用 httptest 呼叫 healthHandler，確認狀態碼 200。', starter: 'func TestHealth(t *testing.T) {\n    // 建立 request 與 recorder，呼叫 handler\n}', solution: 'func TestHealth(t *testing.T) {\n    request := httptest.NewRequest(http.MethodGet, "/health", nil)\n    recorder := httptest.NewRecorder()\n    healthHandler(recorder, request)\n    if recorder.Code != http.StatusOK {\n        t.Fatalf("got %d, want 200", recorder.Code)\n    }\n}', required: ['httptest.NewRequest', 'httptest.NewRecorder()', 'healthHandler(recorder, request)', 'recorder.Code != http.StatusOK'], expectedOutput: 'PASS', hints: ['Recorder 實作 ResponseWriter。', '最後檢查 recorder.Code。'] },
    { question: '效能改善前最重要的第一步是？', choices: ['先增加 goroutine', '量測並找出真正瓶頸', '改用全域變數', '移除所有測試'], answer: 1, explanation: 'Benchmark 與 profile 能避免對錯誤位置進行最佳化。' }),

  lesson('generics-reflection', 'advanced', 17, 60, '泛型與反射', '在型別安全與動態能力間取捨',
    ['定義型別參數與 constraint', '使用 type set', '理解反射的成本與適用時機'], [
      { title: '泛型重用型別安全演算法', body: '型別參數放在方括號，constraint 描述允許操作。當多種型別共享同一資料結構或演算法時，泛型比 any 加型別斷言安全。', code: 'func First[T any](values []T) (T, bool) {\n    if len(values) == 0 { var zero T; return zero, false }\n    return values[0], true\n}' },
      { title: 'Constraint 表達能力集合', body: '~ 允許底層型別相同的自訂型別。constraint 應保持最小，若只是呼叫方法，小介面往往已足夠。', code: 'type Number interface {\n    ~int | ~int64 | ~float64\n}\nfunc Sum[T Number](values []T) T { var total T; for _, value := range values { total += value }; return total }' },
      { title: '反射留給真正動態的邊界', body: 'reflect 可在執行期檢查型別和值，常見於序列化或框架。它較難讀、錯誤延後到執行期；一般業務邏輯優先使用介面或泛型。', code: 'value := reflect.ValueOf(input)\nfmt.Println(value.Type(), value.Kind())' }
    ], { title: '泛型 Contains', description: '為 comparable 型別完成 Contains。', starter: 'func Contains[T comparable](values []T, target T) bool {\n    // 搜尋 target\n}', solution: 'func Contains[T comparable](values []T, target T) bool {\n    for _, value := range values {\n        if value == target { return true }\n    }\n    return false\n}', required: ['func Contains[T comparable]', 'range values', 'value == target', 'return false'], expectedOutput: 'Contains([]int{1,2}, 2) 回傳 true', hints: ['== 需要 comparable constraint。', '走訪結束仍未找到就回 false。'] },
    { question: '何時最適合使用泛型？', choices: ['任何函式都要使用', '多種型別共享同一資料結構或演算法', '取代所有介面', '隱藏錯誤'], answer: 1, explanation: '泛型應解決真實重複，同時保持型別安全。' }),

  lesson('architecture-performance', 'advanced', 18, 65, '架構與效能', '打造可演進、可量測的 Go 服務',
    ['以依賴方向切分層次', '設計可取消工作流程', '使用 pprof 與逃逸分析'], [
      { title: '依賴朝向核心', body: '業務規則依賴自己定義的小介面，資料庫與 HTTP 是外層實作。這讓核心能在無網路、無資料庫時快速測試。', code: 'type CourseStore interface {\n    Find(ctx context.Context, id string) (Course, error)\n}\ntype Service struct { store CourseStore }' },
      { title: '有界並行保護系統', body: '無限制啟動 goroutine 會耗盡記憶體、連線或下游容量。使用 worker pool、semaphore 與 context 建立背壓和取消。', code: 'limit := make(chan struct{}, 8)\nlimit <- struct{}{}\ngo func() { defer func(){ <-limit }(); work() }()' },
      { title: '用資料決定最佳化', body: 'pprof 分析 CPU、heap、goroutine 與 blocking；go build -gcflags=-m 顯示逃逸分析。先建立基準，再改動並確認結果。', code: 'go test -bench=. -cpuprofile=cpu.out\ngo tool pprof cpu.out\ngo build -gcflags=-m ./...' }
    ], { title: '限制同時工作數', description: '以容量 3 的 semaphore 包住 goroutine 工作。', starter: 'limit := make(chan struct{}, 3)\nfor _, job := range jobs {\n    // 取得名額、啟動工作、釋放名額\n}', solution: 'limit := make(chan struct{}, 3)\nfor _, job := range jobs {\n    limit <- struct{}{}\n    go func(job Job) {\n        defer func() { <-limit }()\n        process(job)\n    }(job)\n}', required: ['make(chan struct{}, 3)', 'limit <- struct{}{}', 'go func(job Job)', '<-limit', 'process(job)'], expectedOutput: '同時間最多執行 3 個工作', hints: ['啟動前先送入 semaphore。', 'goroutine 結束時接收一次以釋放名額。'] },
    { question: '大量任務為何需要有界並行？', choices: ['Go 只能跑三個 goroutine', '避免耗盡自身與下游資源', '讓程式碼更長', '取消型別檢查'], answer: 1, explanation: '背壓可限制資源使用並維持整體穩定。' }),

  lesson('cli-project', 'projects', 19, 90, '實作專案：CLI 任務管理器', '建立可測試、可持久化的命令列工具',
    ['設計子命令與旗標', '以 JSON 檔案保存資料', '處理退出碼與測試'], [
      { title: '命令介面先於實作', body: '設計 task add、task list、task done，明確定義參數、輸出與錯誤。flag 套件可建立子命令，核心服務不直接讀 os.Args。', code: 'add := flag.NewFlagSet("add", flag.ContinueOnError)\ntitle := add.String("title", "", "task title")' },
      { title: '儲存層隔離檔案操作', body: 'Store 介面提供 Load 與 Save，JSONStore 負責檔案。寫入可先建立暫存檔再 rename，降低中途失敗造成損毀。', code: 'type Store interface {\n    Load() ([]Task, error)\n    Save([]Task) error\n}' },
      { title: 'main 只轉換退出碼', body: 'run(args, stdout, stderr) 回傳 error，測試可注入 bytes.Buffer。main 只顯示最終錯誤並 os.Exit(1)，不把 os.Exit 放進深層函式。', code: 'func main() {\n    if err := run(os.Args[1:], os.Stdout); err != nil {\n        fmt.Fprintln(os.Stderr, err); os.Exit(1)\n    }\n}' }
    ], { title: '完成 add 子命令核心', description: '拒絕空標題，否則追加任務並保存。', starter: 'func addTask(store Store, title string) error {\n    // 驗證、載入、追加、保存\n}', solution: 'func addTask(store Store, title string) error {\n    if strings.TrimSpace(title) == "" { return fmt.Errorf("標題不可空白") }\n    tasks, err := store.Load()\n    if err != nil { return fmt.Errorf("load tasks: %w", err) }\n    tasks = append(tasks, Task{Title: title})\n    return store.Save(tasks)\n}', required: ['strings.TrimSpace(title)', 'store.Load()', 'append(tasks', 'store.Save(tasks)'], expectedOutput: '有效標題新增一筆任務', hints: ['先拒絕純空白字串。', 'Load 錯誤要保留上下文。'] },
    { question: '為何 run 函式接收 io.Writer？', choices: ['只能寫檔案', '方便替換輸出並在測試中捕捉內容', '避免所有錯誤', '自動解析旗標'], answer: 1, explanation: '注入 Writer 讓 CLI 不綁死全域 stdout。' }),

  lesson('api-project', 'projects', 20, 120, '實作專案：REST API', '以標準庫建立可靠的課程服務',
    ['設計路由與 JSON 契約', '加入 middleware 與 graceful shutdown', '以介面隔離資料層'], [
      { title: 'Handler 保持邊界清楚', body: 'net/http 的 ServeMux 負責路由，handler 解析請求、驗證輸入、呼叫 service，再把結果轉為 HTTP 回應。業務規則不依賴 ResponseWriter。', code: 'mux := http.NewServeMux()\nmux.HandleFunc("GET /courses/{id}", api.getCourse)\nmux.HandleFunc("POST /courses", api.createCourse)' },
      { title: '一致的 JSON 與錯誤格式', body: '設定 Content-Type，限制 body 大小，拒絕未知欄位並統一錯誤 envelope。狀態碼區分驗證失敗、找不到、衝突與內部錯誤。', code: 'type ErrorResponse struct { Error string `json:"error"` }\nfunc writeJSON(w http.ResponseWriter, status int, value any) {\n    w.Header().Set("Content-Type", "application/json")\n    w.WriteHeader(status); json.NewEncoder(w).Encode(value)\n}' },
      { title: '伺服器要能優雅停止', body: '設定 ReadHeaderTimeout 等期限，監聽作業系統訊號後以 Shutdown 等待進行中請求完成，並以有期限的 context 防止永久等待。', code: 'server := &http.Server{Addr: ":8080", Handler: mux, ReadHeaderTimeout: 5*time.Second}\nctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)\ndefer cancel()\nserver.Shutdown(ctx)' }
    ], { title: '建立健康檢查 Handler', description: '回傳狀態碼 200 與 JSON {"status":"ready"}。', starter: 'func health(w http.ResponseWriter, r *http.Request) {\n    // 回傳 JSON\n}', solution: 'func health(w http.ResponseWriter, r *http.Request) {\n    w.Header().Set("Content-Type", "application/json")\n    w.WriteHeader(http.StatusOK)\n    json.NewEncoder(w).Encode(map[string]string{"status": "ready"})\n}', required: ['func health', 'Content-Type', 'http.StatusOK', 'json.NewEncoder(w).Encode', '"status": "ready"'], expectedOutput: '{"status":"ready"}', hints: ['先設定標頭再寫狀態碼。', '使用 json.Encoder 寫入 ResponseWriter。'] },
    { question: 'Graceful shutdown 的目的為何？', choices: ['立刻中斷所有請求', '停止接收新請求並讓進行中請求在期限內完成', '刪除資料庫', '重新格式化程式碼'], answer: 1, explanation: '優雅停止能降低部署或關機造成的請求失敗。' }),

  lesson('crawler-project', 'projects', 21, 120, '實作專案：並行網站檢查器', '整合有界並行、Context 與 HTTP',
    ['建立 worker pool', '傳遞取消與彙整結果', '避免重複與資源洩漏'], [
      { title: '管線分成任務、工作者與結果', body: '主流程產生 URL，固定數量 worker 讀取 jobs 並送出 Result，彙整者計算成功率。每個 channel 都有明確擁有者與關閉責任。', code: 'jobs := make(chan string)\nresults := make(chan Result)\nfor i := 0; i < workers; i++ { go worker(ctx, client, jobs, results) }' },
      { title: '每個請求沿用 Context', body: 'worker 使用 NewRequestWithContext，Client 設定 timeout，回應 body 一定關閉。ctx 取消後，生產者與工作者都應停止阻塞。', code: 'request, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)\nresponse, err := client.Do(request)\nif response != nil { defer response.Body.Close() }' },
      { title: '關閉順序由 WaitGroup 協調', body: '生產者關 jobs；另一個 goroutine 等待所有 worker 完成後關 results；主流程 range results。這能避免 send on closed channel 與永遠等待。', code: 'go func() {\n    workers.Wait()\n    close(results)\n}()\nfor result := range results { collect(result) }' }
    ], { title: '完成可取消 Worker', description: '從 jobs 接收 URL，檢查後送到 results；取消時立即返回。', starter: 'func worker(ctx context.Context, jobs <-chan string, results chan<- Result) {\n    // 使用 select 處理工作與取消\n}', solution: 'func worker(ctx context.Context, jobs <-chan string, results chan<- Result) {\n    for {\n        select {\n        case <-ctx.Done():\n            return\n        case url, ok := <-jobs:\n            if !ok { return }\n            result := check(ctx, url)\n            select {\n            case results <- result:\n            case <-ctx.Done(): return\n            }\n        }\n    }\n}', required: ['ctx.Done()', 'url, ok := <-jobs', 'if !ok', 'check(ctx, url)', 'results <- result'], expectedOutput: '工作完成時回傳結果，取消或 jobs 關閉時結束', hints: ['接收 jobs 時同時檢查 ok。', '傳送結果時也要監聽取消。'] },
    { question: '誰應在所有 worker 完成後關閉 results？', choices: ['任一 worker', '等待 WaitGroup 的協調者', '結果接收者在第一筆後', 'HTTP Client'], answer: 1, explanation: '協調者知道所有傳送者都已結束，關閉才安全。' })
];

export function createDefaultGoProgress() {
  return { lessons: {}, lastLesson: 'hello-go', startedAt: new Date().toISOString() };
}
