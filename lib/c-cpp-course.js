import { webLesson } from './web-course-builder.js';
import { normalizeProgrammingCourse } from './programming-course-normalizer.js';

export const C_CPP_STORAGE_KEY = 'private-c-cpp-academy-v1';
export const C_CPP_PROGRESS_OWNER = 'private-c-cpp-owner';

export const cCppStages = [
  { id: 'c-foundation', number: '01', icon: 'C', title: 'C 語言基礎', subtitle: '工具鏈、流程、函式與資料模型', color: '#2563eb' },
  { id: 'c-systems', number: '02', icon: '⚙️', title: 'C 系統程式', subtitle: '記憶體、檔案、程序、網路與執行緒', color: '#0f766e' },
  { id: 'cpp-modern', number: '03', icon: 'C++', title: '現代 C++', subtitle: 'RAII、泛型、STL、Ranges 與所有權', color: '#7c3aed' },
  { id: 'cpp-advanced', number: '04', icon: '🚀', title: '進階 C++', subtitle: '並行、Coroutine、編譯期與效能', color: '#be123c' },
  { id: 'engineering', number: '05', icon: '🛡️', title: '工程品質與跨平台', subtitle: '建置、測試、安全、嵌入式與 CI', color: '#b45309' },
  { id: 'projects', number: '06', icon: '🏗️', title: '完整專案', subtitle: '從資料結構到高效能正式系統', color: '#334155' }
];

const rawLessons = [
  ['toolchain', 'c-foundation', 'C 工具鏈與第一支程式', '理解編譯、連結與警告', '編譯器先把來源檔轉為物件檔，再由 linker 組合函式庫；應從第一天啟用高警告等級。', 'cc -std=c17 -Wall -Wextra -Werror main.c -o app', 'int main(void) { puts("C ready"); return 0; }'],
  ['types', 'c-foundation', '型別、變數與運算', '掌握整數寬度、轉型與溢位', 'stdint.h 提供明確寬度型別；signed 溢位未定義，混合 signed 與 unsigned 前要先釐清範圍。', 'uint32_t count = 42u;\ndouble ratio = 3.0 / 4.0;', 'uint32_t total = count + 1u;'],
  ['control-flow', 'c-foundation', '條件、迴圈與 switch', '建立可讀且可終止的控制流程', 'if 表達條件，for 適合有界迭代，switch 適合離散狀態；每個迴圈都要有清楚的不變量與終止條件。', 'for (size_t i = 0; i < length; ++i) { sum += values[i]; }', 'for (int i = 0; i < 10; ++i) { total += i; }'],
  ['functions', 'c-foundation', '函式、作用域與契約', '以參數與回傳值切分責任', '函式宣告是呼叫端契約；static 可限制檔案內可見性，const 指標參數表達不修改輸入。', 'static int max_of(int left, int right) { return left > right ? left : right; }', 'static int square(int value) { return value * value; }'],
  ['arrays-strings', 'c-foundation', '陣列、字串與邊界', '正確處理長度與 NUL 結尾', 'C 陣列不攜帶長度，字串以 NUL 結尾；API 應同時接收 buffer 容量並檢查截斷。', 'char name[16];\nsnprintf(name, sizeof name, "%s", input);', 'size_t length = strnlen(name, sizeof name);'],
  ['pointers', 'c-foundation', '指標與 const 語意', '理解位址、解參照與生命週期', '指標指向物件或函式；解參照前必須有效且對齊，不能保存已離開生命週期的區域變數位址。', 'void increment(int *value) { if (value) { ++*value; } }', 'if (pointer != NULL) { value = *pointer; }'],
  ['struct-enum', 'c-foundation', 'Struct、Enum 與資料建模', '組合資料並表達有限狀態', 'struct 聚合相關欄位，enum 建立具名狀態；初始化所有欄位可避免未定值傳播。', 'typedef struct { int x; int y; } Point;\ntypedef enum { IDLE, RUNNING, STOPPED } State;', 'Point origin = { .x = 0, .y = 0 };'],
  ['dynamic-memory', 'c-foundation', '動態記憶體配置', '成對管理 malloc、realloc 與 free', '配置大小要檢查乘法溢位，malloc 失敗回傳 NULL；每塊記憶體應有唯一清楚的釋放責任。', 'int *items = calloc(count, sizeof *items);\nif (!items) return EXIT_FAILURE;', 'free(items); items = NULL;'],
  ['errors-cleanup', 'c-foundation', '錯誤處理與資源清理', '用狀態碼與單一 cleanup 路徑收尾', 'C 常用回傳碼傳遞失敗；取得多個資源時，集中 cleanup 可確保每條路徑都正確釋放。', 'if (!file) { result = errno; goto cleanup; }\ncleanup:\nif (file) fclose(file);', 'int result = operation() == 0 ? EXIT_SUCCESS : EXIT_FAILURE;'],
  ['c-cli', 'projects', '專案：C 命令列工具', '整合解析、驗證、檔案與錯誤碼', '建立支援 add、list、summary 的工具，將 CLI、領域邏輯與檔案存取拆成可測試模組。', './tracker add 45 pointers\n./tracker summary', 'return argc < 2 ? print_help() : dispatch(argc, argv);'],
  ['headers-linkage', 'c-systems', 'Header、翻譯單元與 Linkage', '設計穩定模組邊界', 'header 放公開宣告並使用 include guard；實作細節保持 static，避免重複定義與符號污染。', '#ifndef ACADEMY_VECTOR_H\n#define ACADEMY_VECTOR_H\nsize_t vector_size(const Vector *self);\n#endif', 'static bool is_valid(const Vector *self) { return self != NULL; }'],
  ['file-io', 'c-systems', '檔案與二進位 I/O', '處理短讀寫、錯誤與格式版本', 'fread/fwrite 可能只完成部分資料；持久格式要定義 endian、版本與欄位大小，不直接傾印 struct。', 'while ((read = fread(buffer, 1, sizeof buffer, file)) > 0) { /* consume */ }', 'if (ferror(file)) { perror("read"); }'],
  ['bits-layout', 'c-systems', '位元運算與資料配置', '操作旗標、遮罩與序列化', '遮罩用 AND 測試位元、OR 設定位元；位元欄位配置具實作差異，網路格式應自行編解碼。', 'flags |= READY_MASK;\nflags &= ~ERROR_MASK;', 'bool ready = (flags & READY_MASK) != 0;'],
  ['data-structures-c', 'c-systems', 'C 資料結構', '實作 Vector、List、Hash Table', '資料結構要明確定義所有權、容量成長、失敗後狀態與 iterator 失效規則。', 'bool vector_push(Vector *self, int value);\nvoid vector_destroy(Vector *self);', 'return self->length == self->capacity ? vector_grow(self) : true;'],
  ['callbacks', 'c-systems', '函式指標與 Callback', '以行為參數建立泛用演算法', '函式指標可注入比較器或事件處理器；callback 的 context 指標要有明確型別與生命週期。', 'qsort(items, count, sizeof *items, compare_items);', 'int compare_ints(const void *a, const void *b) { return (*(const int *)a > *(const int *)b) - (*(const int *)a < *(const int *)b); }'],
  ['processes-signals', 'c-systems', '程序、Pipe 與 Signal', '建立可控制的 Unix 工作程序', 'fork 複製程序，exec 載入程式，pipe 串流資料；signal handler 內只能呼叫 async-signal-safe 操作。', 'pid_t child = fork();\nif (child == 0) execlp("worker", "worker", NULL);', 'while (waitpid(child, &status, 0) < 0 && errno == EINTR) {}'],
  ['sockets', 'c-systems', 'Socket 與網路協定', '正確處理 framing、短傳輸與 endian', 'TCP 是 byte stream 沒有訊息邊界；協定要定義長度或分隔，並處理 send/recv 的部分完成。', 'uint32_t wire_length = htonl(length);\nsend_all(fd, &wire_length, sizeof wire_length);', 'while (sent < length) { sent += send(fd, data + sent, length - sent, 0); }'],
  ['c-concurrency', 'c-systems', 'C11 Thread、Mutex 與 Atomic', '避免 data race 與死鎖', '共享可變狀態需要同步；mutex 保護複合不變量，atomic 適合小型狀態但仍需正確 memory order。', 'mtx_lock(&mutex);\n++shared_count;\nmtx_unlock(&mutex);', 'atomic_fetch_add_explicit(&counter, 1, memory_order_relaxed);'],
  ['cpp-toolchain', 'cpp-modern', 'C++ 工具鏈與語言標準', '使用 C++23、警告與標準函式庫', '選定標準版本並開啟警告與 sanitizers；編譯、連結與 ABI 設定必須在團隊與 CI 一致。', 'c++ -std=c++23 -Wall -Wextra -Wpedantic main.cpp -o app', 'int main() { std::println("C++ ready"); }'],
  ['raii', 'cpp-modern', 'RAII 與確定性資源管理', '讓資源生命週期綁定物件', '建構子建立不變量，解構子釋放資源；RAII 讓正常回傳與例外都不會遺漏 cleanup。', 'std::lock_guard lock{mutex};\nstd::ofstream output{"report.txt"};', 'auto file = std::unique_ptr<FILE, decltype(&fclose)>{fopen(path, "r"), fclose};'],
  ['references-const', 'cpp-modern', 'Reference、Const 與 Value Category', '選擇值、借用與移動介面', '小型值可傳值，大物件唯讀借用用 const T&；回傳 reference 前要確保被引用物件活得更久。', 'std::string_view trim(std::string_view input);\nvoid render(const Document& document);', 'const auto& first = items.front();'],
  ['classes-special', 'cpp-modern', 'Class 與特殊成員函式', '掌握 Rule of Zero/Five', '優先用標準容器與智慧指標達成 Rule of Zero；自行管理資源時才完整定義 move、copy 與 destructor。', 'class Buffer {\n  std::vector<std::byte> bytes_;\npublic:\n  explicit Buffer(std::size_t size) : bytes_(size) {}\n};', 'class Session { public: Session(const Session&) = delete; Session& operator=(const Session&) = delete; };'],
  ['templates-concepts', 'cpp-modern', 'Template 與 Concept', '建立受約束的泛型程式', 'template 在編譯期產生型別安全實作，concept 將需求寫成可讀契約並改善錯誤訊息。', 'template<std::totally_ordered T>\nT clamp_value(T value, T low, T high);', 'template<std::integral T> T twice(T value) { return value + value; }'],
  ['stl-containers', 'cpp-modern', 'STL Container 選擇', '依存取、穩定性與成本選結構', 'vector 是預設連續容器，unordered_map 提供平均常數查找；選擇前要考慮 iterator 失效與 cache locality。', 'std::vector<Course> courses;\nstd::unordered_map<Id, Course> by_id;', 'courses.reserve(expected_count);'],
  ['iterators-ranges', 'cpp-modern', 'Iterator、Range 與 View', '組合惰性資料管線', 'iterator 抽象位置，range 抽象序列；view 通常不擁有資料，底層範圍必須維持有效。', 'auto active = users | std::views::filter(&User::active) | std::views::transform(&User::name);', 'auto even = values | std::views::filter([](int value) { return value % 2 == 0; });'],
  ['algorithms-lambdas', 'cpp-modern', 'Algorithm 與 Lambda', '用標準演算法取代手寫迴圈', 'ranges algorithm 清楚表達搜尋、排序與轉換；lambda capture 應最小化，非同步工作不可引用失效區域值。', 'std::ranges::sort(courses, {}, &Course::title);', 'auto found = std::ranges::find_if(items, [](const auto& item) { return item.ready(); });'],
  ['smart-pointers', 'cpp-modern', '智慧指標與所有權', '區分 unique、shared 與 observer', 'unique_ptr 表達唯一所有權，shared_ptr 只用於真正共享生命週期；一般借用優先 reference 或裸指標。', 'auto service = std::make_unique<Service>();', 'std::weak_ptr<Node> parent = node;'],
  ['errors-cpp', 'cpp-modern', 'Exception、Expected 與錯誤契約', '依失敗模型選擇傳遞方式', '例外適合無法就地處理的罕見失敗，expected 適合預期中的分支；destructor 不應拋出。', 'std::expected<Config, ParseError> parse_config(std::string_view text);', 'if (!result) { return std::unexpected(result.error()); }'],
  ['move-semantics', 'cpp-modern', 'Move Semantics 與完美轉送', '降低複製並維持有效狀態', '移動轉移資源，moved-from 物件仍有效但值未指定；std::forward 只用在 forwarding reference。', 'std::vector<std::string> names;\nnames.push_back(std::move(name));', 'template<class T> void add(T&& value) { items.emplace_back(std::forward<T>(value)); }'],
  ['polymorphism', 'cpp-modern', '多型、Variant 與型別擦除', '選擇 runtime 與封閉集合模型', 'virtual 適合開放繼承，variant 適合已知型別集合；基底以多型刪除時必須有 virtual destructor。', 'using Event = std::variant<Started, Stopped, Failed>;', 'std::visit([](const auto& event) { handle(event); }, current);'],
  ['cpp-library', 'projects', '專案：現代 C++ 類庫', '設計 API、文件、測試與套件', '建立不洩漏實作細節的類庫，以 RAII、concept、ranges 與 semantic versioning 提供穩定介面。', 'cmake --build build\nctest --test-dir build', '[[nodiscard]] Result process(std::span<const std::byte> input);'],
  ['filesystem-chrono', 'cpp-advanced', 'Filesystem、Chrono 與格式化', '安全操作路徑、時間與顯示', 'filesystem 處理平台路徑，chrono 區分 duration 與 time point；使用者路徑仍須限制根目錄與 symbolic link。', 'for (const auto& entry : std::filesystem::directory_iterator{root}) {}', 'auto elapsed = std::chrono::steady_clock::now() - started;'],
  ['coroutines', 'cpp-advanced', 'Coroutine 與非同步抽象', '理解 suspend、promise 與生命週期', 'coroutine 由編譯器建立 frame，awaitable 控制暫停與恢復；取消與 frame 擁有權必須明確。', 'task<Response> load() { co_return co_await client.get("/courses"); }', 'generator<int> count() { for (int i = 0; i < 3; ++i) co_yield i; }'],
  ['cpp-concurrency', 'cpp-advanced', 'Jthread、Future 與同步原語', '建立可取消的並行工作', 'jthread 自動 join 並提供 stop_token；condition_variable 的等待必須用 predicate 防止虛假喚醒。', 'std::jthread worker{[](std::stop_token stop) { while (!stop.stop_requested()) work(); }};', 'condition.wait(lock, [&] { return ready; });'],
  ['memory-model', 'cpp-advanced', 'Atomic 與 C++ Memory Model', '理解 happens-before 與 ordering', 'data race 造成未定義行為；release/acquire 可發布資料，relaxed 只保證單一 atomic 的修改順序。', 'payload = value;\nready.store(true, std::memory_order_release);', 'if (ready.load(std::memory_order_acquire)) { consume(payload); }'],
  ['allocators-pmr', 'cpp-advanced', 'Allocator、PMR 與資料區域性', '控制配置策略與延遲', 'pmr 容器把配置策略與型別分離；monotonic resource 適合批次生命週期，但不能比上游資源活得久。', 'std::pmr::monotonic_buffer_resource pool;\nstd::pmr::vector<int> values{&pool};', 'values.reserve(1024);'],
  ['constexpr-meta', 'cpp-advanced', 'Constexpr 與編譯期程式', '把可驗證計算移到編譯期', 'constexpr 讓函式可在編譯期或執行期使用，static_assert 保護不變量；避免難以維護的樣板技巧。', 'constexpr int square(int value) { return value * value; }\nstatic_assert(square(4) == 16);', 'consteval std::size_t checked_size() { return 64; }'],
  ['modules-build', 'cpp-advanced', 'Module、ODR 與大型建置', '降低 header 耦合與編譯成本', 'module 提供明確匯出邊界；仍要理解 ODR、ABI 與建置工具對 compiler module interface 的支援。', 'export module academy.math;\nexport int add(int, int);', 'import academy.math;\nauto result = add(2, 3);'],
  ['performance', 'cpp-advanced', '效能分析與最佳化', '用量測定位 CPU、配置與快取問題', '先定義基準再用 profiler 找熱點；演算法、資料配置與 I/O 往往比微小語法調整更重要。', 'auto started = std::chrono::steady_clock::now();\nrun_workload();', 'benchmark::DoNotOptimize(result);'],
  ['interop-abi', 'engineering', 'C／C++ Interop 與 ABI', '設計穩定的跨語言邊界', 'extern C 關閉 C++ name mangling；邊界只傳固定配置資料與 opaque handle，不讓例外跨越 ABI。', 'extern "C" academy_handle* academy_create();\nextern "C" void academy_destroy(academy_handle*);', 'try { return run(); } catch (...) { return ACADEMY_ERROR; }'],
  ['cmake-deps', 'engineering', 'CMake 與依賴管理', '建立 target-based 可重現建置', '用 target_link_libraries 與 usage requirements 傳播設定；鎖定 vcpkg/Conan 依賴版本並避免全域 flags。', 'add_library(academy src/academy.cpp)\ntarget_compile_features(academy PUBLIC cxx_std_23)', 'target_include_directories(academy PUBLIC include);'],
  ['testing', 'engineering', '單元、整合與 Property Testing', '從範例到不變量驗證', '單元測試驗證純邏輯，整合測試驗證邊界，property test 以大量輸入檢查排序或序列化不變量。', 'REQUIRE(parse(serialize(value)) == value);', 'CHECK(sort_twice(values) == sort_once(values));'],
  ['sanitizers-analysis', 'engineering', 'Sanitizer 與靜態分析', '提早發現越界、UAF 與 UB', 'ASan、UBSan、TSan 分別檢查記憶體、未定義行為與競態；clang-tidy 補充靜態規則。', 'cmake -S . -B build -DENABLE_SANITIZERS=ON\ncmake --build build && ctest --test-dir build', 'clang-tidy src/*.cpp -- -std=c++23'],
  ['security', 'engineering', 'C／C++ 安全程式設計', '防範記憶體破壞與輸入攻擊', '所有外部長度、索引與算術都不可信；優先 bounded API、span、容器與 fuzzing，並啟用編譯器防護。', 'if (length > capacity || offset > capacity - length) return ERROR_BOUNDS;', 'std::span<const std::byte> packet{data, checked_length};'],
  ['embedded', 'engineering', '嵌入式與即時系統', '在有限資源下控制時間與配置', '即時系統重視最壞情況延遲；避免熱路徑動態配置，ISR 保持短小並以 lock-free queue 交接工作。', 'void timer_isr(void) { atomic_flag_set(&tick_ready); }', 'static_assert(sizeof(Message) <= 64);'],
  ['ci-delivery', 'engineering', 'CI、套件與跨平台交付', '在 Linux、macOS、Windows 驗證產物', 'CI matrix 應固定 compiler 與 dependency lock，執行格式、分析、測試、sanitizer，再簽署版本產物。', 'cmake --preset release\ncmake --build --preset release\nctest --preset release', 'cpack --preset release'],
  ['c-project', 'projects', '專案：C 資料庫與 CLI', '實作索引、交易日誌與復原', '以 append-only log 保存紀錄，啟動時重建 hash index，寫入採 checksum 與原子替換避免半成品。', './minidb put course C17\n./minidb get course', 'return fsync(fd) == 0 ? DB_OK : DB_IO_ERROR;'],
  ['server-project', 'projects', '專案：C 高效能伺服器', '整合 socket、poll、worker 與反壓', '主事件迴圈管理非阻塞連線，固定 worker pool 處理工作；每個 queue 與 buffer 都設容量上限。', 'server --threads 4 --queue-capacity 1024', 'if (!queue_try_push(job)) { respond_busy(client); }'],
  ['cpp-app', 'projects', '專案：C++ 桌面／遊戲核心', '整合 ECS、資源、事件與 frame budget', '用 RAII 管理 GPU/視窗資源，以 data-oriented component 儲存提升局部性，背景載入不可阻塞 frame。', 'while (window.open()) { input(); update(delta); render(); }', 'accumulator = std::min(accumulator + frame_time, max_lag);'],
  ['capstone', 'projects', '總整專案：正式 C／C++ 平台', '從架構、效能、安全到可交付版本', '總整專案同時提供穩定 C ABI 與現代 C++ 核心，具備測試、fuzz、sanitizer、benchmark、觀測與跨平台套件。', 'cmake --workflow --preset ci\nctest --preset release\ncpack --preset release', 'return checks_all_passed() ? EXIT_SUCCESS : EXIT_FAILURE;']
];

const baseCCppLessons = rawLessons.map(([id, stage, title, subtitle, concept, code, solution], index) =>
  webLesson(
    id, stage, index + 1, index >= 46 ? 150 : index % 10 === 9 ? 100 : 55,
    title, subtitle, concept, code,
    `// TODO：完成「${title}」的核心練習`, solution,
    solution.split(/\s+/).filter(Boolean).slice(0, 2), subtitle, concept
  )
);

export const cCppLessons = normalizeProgrammingCourse({ lessons: baseCCppLessons, stages: cCppStages, courseName: 'C／C++' });

export function createDefaultCCppProgress() {
  return { lessons: {}, lastLesson: 'toolchain', startedAt: new Date().toISOString() };
}
