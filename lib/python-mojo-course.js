import { webLesson } from './web-course-builder.js';

export const PYTHON_MOJO_STORAGE_KEY = 'private-python-mojo-academy-v1';
export const PYTHON_MOJO_PROGRESS_OWNER = 'private-python-mojo-owner';

export const pythonMojoStages = [
  { id: 'python-foundation', number: '01', icon: '🐍', title: 'Python 核心基礎', subtitle: '語法、資料結構、函式與物件', color: '#2563eb' },
  { id: 'python-engineering', number: '02', icon: '🧩', title: 'Python 工程能力', subtitle: '型別、測試、非同步、套件與效能', color: '#7c3aed' },
  { id: 'web-data', number: '03', icon: '🌐', title: 'Web 與資料工程', subtitle: 'API、資料庫、NumPy、Pandas 與管線', color: '#0f766e' },
  { id: 'ai-performance', number: '04', icon: '🧠', title: 'AI 與高效能運算', subtitle: '機器學習、深度學習、GPU 與部署', color: '#be123c' },
  { id: 'mojo', number: '05', icon: '🔥', title: 'Mojo 高效能語言', subtitle: '型別、所有權、SIMD、GPU 與 Python 互通', color: '#ea580c' },
  { id: 'projects', number: '06', icon: '🚀', title: '完整專案', subtitle: '自動化、Web、AI 與 Python／Mojo 整合', color: '#334155' }
];

const rawLessons = [
  ['python-setup', 'python-foundation', 'Python 工具鏈與執行模型', '安裝、虛擬環境、REPL 與位元碼', 'Python 原始碼由直譯器編譯為 bytecode 後執行；每個專案應使用獨立虛擬環境並鎖定版本。', 'python -m venv .venv\npython -m pip install --upgrade pip', 'print("Python ready")'],
  ['values-types', 'python-foundation', '變數、型別與運算', '理解動態型別與物件模型', '名稱綁定物件而不是固定記憶格；int 可任意精度，浮點數仍有 IEEE 754 誤差。', 'count = 3\nprice = 99.5\ntotal = count * price', 'hours = minutes / 60'],
  ['control-flow', 'python-foundation', '條件、迴圈與模式配對', '以清楚流程處理狀態', 'if 處理條件，for 直接迭代 iterable，match 適合結構化資料；避免不必要的深層巢狀。', 'match command:\n    case ["add", title]:\n        add(title)\n    case _:\n        show_help()', 'label = "pass" if score >= 60 else "retry"'],
  ['collections', 'python-foundation', 'List、Tuple、Dict 與 Set', '依順序、可變性與查找選擇容器', 'list 可變且有序，tuple 適合固定紀錄，dict 保存鍵值，set 提供唯一性與集合運算。', 'scores = [80, 95, 72]\nby_id = {course.id: course for course in courses}', 'unique_names = set(names)'],
  ['strings', 'python-foundation', '字串、Unicode 與格式化', '正確處理文字、編碼與正規表示式', 'str 是 Unicode code point 序列，檔案與網路邊界才進行 bytes 編解碼；顯示使用 f-string。', 'message = f"{name}: {score:.1f}"\nraw = text.encode("utf-8")', 'text = raw.decode("utf-8")'],
  ['functions', 'python-foundation', '函式、參數與作用域', '建立小型可組合的介面', '函式是一級物件；keyword-only 參數改善呼叫可讀性，可變預設值應改用 None。', 'def enroll(user_id: int, *, notify: bool = True) -> None:\n    ...', 'def square(value: int) -> int:\n    return value * value'],
  ['comprehensions', 'python-foundation', 'Comprehension、Iterator 與 Generator', '建立惰性資料流程', 'comprehension 適合簡短轉換，generator 逐項產生資料並節省記憶體；複雜邏輯應拆成函式。', 'active_names = [user.name for user in users if user.active]\nsquares = (n * n for n in numbers)', 'yield from source'],
  ['exceptions-context', 'python-foundation', '例外與 Context Manager', '保留錯誤語境並確保資源釋放', '只捕捉能處理的例外，以 raise from 保留原因；with 會可靠呼叫資源的離開流程。', 'with path.open(encoding="utf-8") as file:\n    content = file.read()', 'raise ConfigError("invalid port") from error'],
  ['classes-dataclasses', 'python-foundation', 'Class、Dataclass 與封裝', '用資料模型表達不變量', 'dataclass 減少值物件樣板，property 保護存取契約；組合通常比多層繼承更容易維護。', '@dataclass(frozen=True, slots=True)\nclass Course:\n    id: int\n    title: str', 'course = Course(id=1, title="Python")'],
  ['python-cli', 'projects', '專案：Python 命令列記帳工具', '整合 argparse、驗證、JSON 與測試', '建立 add、list、summary 命令，將命令解析、領域規則與儲存層分離並回傳明確 exit code。', 'python -m ledger add 120 lunch\npython -m ledger summary', 'raise SystemExit(main())'],
  ['modules-packages', 'python-engineering', 'Module、Package 與 Import', '設計清楚公開 API', 'package 用 __init__ 定義邊界；避免循環 import 與匯入時副作用，應用程式以 python -m 啟動。', 'from academy.models import Course\n__all__ = ["Course"]', 'if __name__ == "__main__":\n    main()'],
  ['typing', 'python-engineering', 'Type Hint、Protocol 與 Generic', '用靜態分析保護動態程式', '型別提示不會自動執行期檢查，但 mypy 或 pyright 可驗證契約；Protocol 支援結構型別。', 'class Repository(Protocol):\n    def get(self, course_id: int) -> Course | None: ...', 'def first[T](items: Sequence[T]) -> T:\n    return items[0]'],
  ['decorators', 'python-engineering', 'Decorator、Closure 與 Descriptor', '理解 Python 的可呼叫抽象', 'decorator 包裝函式並應保留 metadata；descriptor 是 property、method 與 ORM 欄位的底層協定。', '@functools.wraps(function)\ndef wrapper(*args, **kwargs):\n    return function(*args, **kwargs)', 'return decorator(function)'],
  ['dunder-model', 'python-engineering', '資料模型與 Dunder Method', '讓自訂型別融入語言協定', '__iter__、__len__、__enter__ 等協定讓物件與內建語法合作；不要任意改變使用者預期語意。', 'def __iter__(self):\n    return iter(self._items)', 'def __len__(self) -> int:\n    return len(self._items)'],
  ['files-pathlib', 'python-engineering', 'Pathlib、檔案與序列化', '安全處理路徑、JSON 與大型檔案', 'Path 提供跨平台操作；使用者路徑要限制於允許根目錄，大檔案逐列處理。', 'data = json.loads(path.read_text(encoding="utf-8"))', 'path.write_text(json.dumps(data), encoding="utf-8")'],
  ['testing-pytest', 'python-engineering', 'Pytest 與測試替身', '驗證行為、邊界與失敗路徑', 'fixture 管理測試資源，parametrize 覆蓋多組案例；只替換時間、網路與資料庫等外部邊界。', '@pytest.mark.parametrize(("value", "expected"), [(2, 4), (3, 9)])\ndef test_square(value, expected):\n    assert square(value) == expected', 'assert result == expected'],
  ['asyncio', 'python-engineering', 'Asyncio 與結構化並行', '用非阻塞 I/O 處理大量工作', 'coroutine 在 await 讓出事件迴圈；TaskGroup 讓子任務生命週期與錯誤保持結構化。', 'async with asyncio.TaskGroup() as group:\n    for url in urls:\n        group.create_task(fetch(url))', 'result = await client.get(url)'],
  ['threads-processes', 'python-engineering', 'Thread、Process 與 GIL', '依 I/O 或 CPU 工作選並行模型', 'thread 適合阻塞 I/O，process 可平行 CPU 工作；共享狀態需要同步，批次大小影響序列化成本。', 'with ProcessPoolExecutor() as pool:\n    results = list(pool.map(compute, jobs))', 'result = await asyncio.to_thread(blocking_call)'],
  ['packaging', 'python-engineering', 'Pyproject 與套件發布', '建立可重現依賴與版本', 'pyproject.toml 集中 build、metadata 與工具設定；應鎖定應用依賴並以 wheel 發布類庫。', 'python -m build\npython -m twine check dist/*', 'python -m pip install --require-hashes -r requirements.txt'],
  ['profiling', 'python-engineering', '效能分析、記憶體與快取', '先量測再最佳化熱點', '使用 cProfile、py-spy 與 tracemalloc 找 CPU 和配置熱點；演算法與 I/O 批次通常優先於微調語法。', 'python -m cProfile -o profile.out app.py', '@functools.lru_cache(maxsize=256)\ndef lookup(key): ...'],
  ['http-api', 'web-data', 'HTTP Client 與韌性', '設定 timeout、重試與連線池', '所有外部請求都要 timeout；只對冪等操作進行有限退避重試，並驗證 URL 以避免 SSRF。', 'async with httpx.AsyncClient(timeout=5.0) as client:\n    response = await client.get(url)\n    response.raise_for_status()', 'return response.json()'],
  ['fastapi', 'web-data', 'FastAPI 與型別化 API', '以 Pydantic 建立輸入輸出契約', 'FastAPI 從型別產生驗證與 OpenAPI；DTO 應與資料庫 model 分離，授權仍在伺服器執行。', '@app.get("/courses/{course_id}", response_model=CourseResponse)\nasync def get_course(course_id: int): ...', 'raise HTTPException(status_code=404, detail="Not found")'],
  ['database-sql', 'web-data', 'SQL、ORM 與交易', '避免 N+1 並保護一致性', '參數化查詢避免 injection，transaction 保護多步驟更新；ORM 查詢仍要理解產生的 SQL。', 'async with session.begin():\n    session.add(course)\n    await session.flush()', 'result = await session.execute(select(Course).where(Course.id == course_id))'],
  ['web-security', 'web-data', '驗證、授權與 Web 安全', '防範 Injection、CSRF、XSS 與秘密外洩', '使用成熟密碼雜湊與短期 token，逐項檢查資源擁有者；機密由環境或 vault 注入。', 'if course.owner_id != current_user.id:\n    raise HTTPException(status_code=403)', 'secret = os.environ["APP_SECRET"]'],
  ['numpy', 'web-data', 'NumPy 陣列與向量化', '理解 shape、dtype、broadcast 與 view', 'ndarray 用連續型別資料加速計算；切片常是 view，broadcast 可避免複製但需確認 shape。', 'matrix = np.asarray(values, dtype=np.float32)\nnormalized = (matrix - matrix.mean(0)) / matrix.std(0)', 'result = np.sum(matrix, axis=0)'],
  ['pandas', 'web-data', 'Pandas 資料清理與分析', '建立可檢查的表格轉換流程', '明確指定 dtype、處理缺失值並避免 chained assignment；大型資料應只讀取需要欄位。', 'clean = (frame.dropna(subset=["score"])\n    .assign(passed=lambda data: data.score >= 60))', 'summary = clean.groupby("course")["score"].mean()'],
  ['visualization', 'web-data', '資料視覺化與敘事', '選擇正確圖表並避免誤導', '圖表應標示單位、範圍與樣本；折線表示趨勢，長條比較類別，散點觀察關係。', 'figure, axis = plt.subplots()\naxis.plot(days, scores)\naxis.set(title="Progress", ylabel="Score")', 'figure.tight_layout()'],
  ['etl', 'web-data', 'ETL、資料品質與排程', '建立冪等且可重跑的管線', '每階段保存 lineage 與品質檢查；以 partition、checkpoint 和 idempotent write 支援失敗後重跑。', 'records = extract(source)\nvalidated = validate(transform(records))\nload(validated, partition=date)', 'assert rejected_ratio < 0.01'],
  ['queues-workers', 'web-data', 'Queue、Worker 與背景任務', '處理重試、冪等與反壓', '工作要有唯一 ID 與狀態；使用有上限退避、dead-letter queue 與 idempotency key 防止重複副作用。', 'job = queue.reserve(timeout=5)\ntry:\n    process(job)\n    queue.ack(job)\nexcept RetryableError:\n    queue.retry(job)', 'if already_processed(job.id): return'],
  ['web-data-project', 'projects', '專案：Python 資料 API', '整合 FastAPI、PostgreSQL、ETL 與觀測', '建立課程分析 API、排程匯入與背景報表，具驗證、交易、快取、限流與 OpenTelemetry。', 'uvicorn academy.main:app --host 0.0.0.0 --port 8000', 'return CourseResponse.model_validate(course)'],
  ['ml-workflow', 'ai-performance', '機器學習工作流程', '從切分、特徵到可重現評估', '先固定資料與評估指標，train/validation/test 嚴格分離；所有前處理只在訓練資料 fit。', 'pipeline = make_pipeline(StandardScaler(), LogisticRegression())\npipeline.fit(x_train, y_train)', 'score = pipeline.score(x_test, y_test)'],
  ['feature-evaluation', 'ai-performance', '特徵工程與模型評估', '處理洩漏、不平衡與偏差', '依業務成本選 precision、recall、ROC 或 PR；交叉驗證分組要反映正式資料生成方式。', 'scores = cross_validate(model, features, labels, scoring=["precision", "recall"])', 'matrix = confusion_matrix(y_true, y_pred)'],
  ['pytorch', 'ai-performance', 'PyTorch Tensor 與自動微分', '建立訓練迴圈與裝置管理', 'tensor 的 shape、dtype、device 必須一致；每個 batch 執行 zero_grad、forward、backward 與 optimizer step。', 'optimizer.zero_grad()\nloss = criterion(model(inputs), targets)\nloss.backward()\noptimizer.step()', 'model.eval()'],
  ['deep-learning', 'ai-performance', '神經網路架構與正則化', '理解 representation、loss 與泛化', '網路容量、資料品質與正則化共同影響泛化；以 baseline 和 learning curve 驗證每次複雜化。', 'network = nn.Sequential(nn.Linear(128, 64), nn.ReLU(), nn.Dropout(0.2), nn.Linear(64, 10))', 'prediction = network(batch)'],
  ['llm-apps', 'ai-performance', 'LLM、Embedding 與 RAG', '建立可評估且可防護的生成應用', 'RAG 將檢索證據放入上下文；要防 prompt injection、限制工具權限，並以固定資料集評估答案與引用。', 'documents = retriever.search(question, top_k=5)\nanswer = generate(question, documents)', 'assert all(citation in documents for citation in answer.citations)'],
  ['gpu-compute', 'ai-performance', 'GPU、批次與混合精度', '提升吞吐並控制記憶體', 'GPU 適合大量平行計算；批次與資料搬移決定吞吐，mixed precision 需監控數值穩定性。', 'with torch.autocast(device_type="cuda", dtype=torch.float16):\n    loss = model(batch)', 'inputs = inputs.to(device, non_blocking=True)'],
  ['native-acceleration', 'ai-performance', 'C Extension、Cython 與 JIT', '突破 Python 熱迴圈限制', '先向量化，再考慮 Cython、Numba、C API 或新語言核心；跨邊界成本與記憶體配置要一起量測。', '@numba.njit\ndef distance(values):\n    return sum(value * value for value in values)', 'result = native_kernel(buffer)'],
  ['mlops', 'ai-performance', 'MLOps、模型監控與部署', '版本化資料、模型與推論服務', '模型 registry 要連結程式、資料與指標；正式環境監控 drift、延遲、錯誤與公平性並保留回滾。', 'mlflow.log_params(params)\nmlflow.log_metric("validation_accuracy", accuracy)', 'registry.promote(model_version, stage="staging")'],
  ['mojo-intro', 'mojo', 'Mojo 定位、工具鏈與 Python 關係', '理解高效能系統語言的設計目標', 'Mojo 以 Python 家族語法連接高階易用性與底層效能，但語言仍快速演進，課程範例需配合使用中的版本文件。', 'fn main():\n    print("Mojo ready")', 'print("Pythonic syntax, systems performance")'],
  ['mojo-def-fn', 'mojo', 'Def、Fn、Var 與 Let', '區分動態便利與嚴格編譯契約', 'def 偏向 Python 式彈性，fn 強化型別與初始化規則；var 可重新綁定，let 表達不可重新綁定的值。', 'fn square(value: Int) -> Int:\n    return value * value', 'let answer = square(6)'],
  ['mojo-struct', 'mojo', 'Struct、Trait 與泛型', '建立零成本可重用抽象', 'struct 具明確資料配置與生命週期，trait 表達能力契約，參數化型別讓編譯器專門化熱路徑。', 'struct Point:\n    var x: Float64\n    var y: Float64', 'let origin = Point(0.0, 0.0)'],
  ['mojo-ownership', 'mojo', 'Ownership、Borrow 與生命週期', '在沒有 GC 熱點下安全管理資源', 'owned 轉移所有權，borrowed 提供唯讀借用，inout 允許受控修改；API 應直接表達資源責任。', 'fn consume(owned value: Buffer):\n    print(value.size)', 'fn length(borrowed value: Buffer) -> Int:\n    return value.size'],
  ['mojo-memory', 'mojo', '記憶體、Pointer 與 RAII', '控制配置、對齊與釋放', '低階記憶體操作換來效能也提高風險；優先封裝 allocator 與 pointer，讓解構流程自動清理。', 'var buffer = UnsafePointer[Float32].alloc(count)\ndefer:\n    buffer.free()', 'buffer.store(0, 1.0)'],
  ['mojo-simd', 'mojo', 'SIMD、Vectorization 與 Parallelize', '把資料平行工作映射到硬體', 'SIMD 一次處理多個元素；先確保 tail 與對齊正確，再依硬體寬度專門化並量測。', 'alias width = simdwidthof[DType.float32]()\nvar chunk = buffer.load[width=width](index)', 'buffer.store[width=width](index, chunk * 2)'],
  ['mojo-gpu', 'mojo', 'Mojo GPU Kernel 與裝置運算', '管理 thread、記憶體層級與同步', 'GPU kernel 將索引映射到資料，coalesced access 與 shared memory 影響效能；每次存取都要檢查邊界。', 'fn kernel(index: Int, size: Int):\n    if index < size:\n        output[index] = input[index] * 2', 'gpu.enqueue_function[kernel](grid, block)'],
  ['mojo-python-interop', 'mojo', 'Python 互通與漸進式加速', '保留 Python 生態並替換熱核心', 'Mojo 可呼叫 Python 模組，理想策略是先用 Python 驗證，再將 profiler 找到的 kernel 移入 Mojo；邊界要減少資料複製。', 'from python import Python\nlet np = Python.import_module("numpy")\nlet array = np.array([1, 2, 3])', 'let result = optimized_kernel(array)'],
  ['automation-project', 'projects', '專案：Python 自動化工作平台', '整合 CLI、排程、瀏覽器與報告', '建立可重試工作、機密管理、結構化日誌與乾跑模式；每個外部副作用都具冪等鍵。', 'python -m automation run --job weekly-report --dry-run', 'return JobResult(status="completed", artifacts=artifacts)'],
  ['ai-service-project', 'projects', '專案：Python AI 推論服務', '整合模型、RAG、評估、監控與安全', '服務提供批次推論與串流 API，限制輸入、隔離工具、快取 embedding，並監控品質、延遲與成本。', 'uvicorn inference.main:app --workers 4', 'if not guardrail.accept(request): raise UnsafeRequest()'],
  ['mojo-kernel-project', 'projects', '專案：Mojo 高效能運算核心', '以 SIMD／GPU 加速 Python 資料工作', '先建立 Python reference，再實作 Mojo CPU SIMD 與 GPU kernel，以 property test 驗證結果並用 benchmark 比較。', 'mojo run benchmark.mojo --size 1000000', 'assert_all_close(reference, accelerated)'],
  ['python-mojo-capstone', 'projects', '總整專案：Python／Mojo 正式平台', '從快速開發、AI 到跨硬體高效能交付', '總整平台以 Python 提供 API、資料與 AI 編排，以 Mojo 執行熱核心，具備型別、測試、fuzz、觀測、容器與可回滾部署。', 'pytest -q\nruff check .\npyright\nmojo run tests.mojo\ndocker build -t academy .', 'raise SystemExit(0 if all_checks_passed() else 1)']
];

export const pythonMojoLessons = rawLessons.map(([id, stage, title, subtitle, concept, code, solution], index) =>
  webLesson(
    id, stage, index + 1, index >= 46 ? 150 : index % 10 === 9 ? 100 : 55,
    title, subtitle, concept, code,
    `# TODO：完成「${title}」的核心練習`, solution,
    solution.split(/\s+/).filter(Boolean).slice(0, 2), subtitle, concept
  )
);

export function createDefaultPythonMojoProgress() {
  return { lessons: {}, lastLesson: 'python-setup', startedAt: new Date().toISOString() };
}
