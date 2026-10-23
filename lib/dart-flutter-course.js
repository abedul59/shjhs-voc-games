export const DART_FLUTTER_STORAGE_KEY = 'private-dart-flutter-academy-v1';
export const DART_FLUTTER_PROGRESS_OWNER = 'private-dart-flutter-academy-owner';

export const dartFlutterStages = [
  { id: 'dart-foundation', number: '01', icon: '🎯', title: 'Dart 語言基礎', subtitle: '工具鏈、語法、集合與錯誤處理', color: '#0ea5e9' },
  { id: 'dart-types', number: '02', icon: '🧬', title: '型別與物件模型', subtitle: 'Null Safety、Class、Mixin、Generic', color: '#2563eb' },
  { id: 'dart-async', number: '03', icon: '⚡', title: '非同步與套件工程', subtitle: 'Future、Stream、Isolate、Package 與 CLI', color: '#4f46e5' },
  { id: 'flutter-ui', number: '04', icon: '🧱', title: 'Flutter UI 核心', subtitle: 'Widget、Layout、Theme 與生命週期', color: '#7c3aed' },
  { id: 'flutter-app', number: '05', icon: '🧭', title: '互動應用與狀態', subtitle: '表單、導航、Riverpod 與動畫', color: '#db2777' },
  { id: 'data', number: '06', icon: '🌐', title: '資料、API 與離線儲存', subtitle: 'HTTP、JSON、SQLite、Cache 與同步', color: '#ea580c' },
  { id: 'platform', number: '07', icon: '📱', title: '裝置與跨平台整合', subtitle: '相機、通知、定位、Web 與 Desktop', color: '#059669' },
  { id: 'architecture', number: '08', icon: '🏛️', title: '架構、測試與團隊工程', subtitle: 'Clean Architecture、測試、CI 與模組化', color: '#475569' },
  { id: 'production', number: '09', icon: '🛡️', title: '正式品質、安全與效能', subtitle: 'Profiling、無障礙、國際化與資安', color: '#b91c1c' },
  { id: 'capstone', number: '10', icon: '🚀', title: '進階與完整實戰', subtitle: '原生橋接、發布與五個總整專案', color: '#0f766e' }
];

const modules = [
  { stage: 'dart-foundation', guide: '使用 dart format、dart analyze 與 dart test 建立可驗證的語言基礎。', lessons: [
    ['sdk-project','Dart SDK、Flutter SDK 與專案','理解 stable channel、dart create、flutter create、pubspec.yaml 與 SDK constraint；Flutter SDK 已內含 Dart，不應再讓另一套 Dart 搶先出現在 PATH。','dart --version\nflutter --version\ndart create -t console-full dart_lab\ncd dart_lab && dart analyze && dart test','同一專案固定 Flutter channel／版本並提交 pubspec.lock。'],
    ['variables','變數、final、const 與型別推論','var 只在宣告時推論一次；final 是執行期單次賦值，const 是編譯期常數。公開 API 應明確型別，區域變數可讓推論減少雜訊。','final course = "Dart";\nconst lessonCount = 100;\nfinal String label = "$course：$lessonCount 堂";\nprint(label);','不要濫用 dynamic；它會把錯誤延後到執行期。'],
    ['numbers-strings','數值、字串與 Unicode','int／double 都繼承 num；字串插值使用 $，多行文字使用三引號。Dart string 是 UTF-16 code units，使用 characters 套件處理使用者可見字元。','final price = 120;\nfinal tax = 0.05;\nprint("總額：${(price * (1 + tax)).toStringAsFixed(0)}");','金錢不要直接依賴 double 精度；正式領域使用最小單位整數或 decimal 套件。'],
    ['booleans-flow','布林、條件與 Pattern Switch','Dart 不做 truthy 轉換；if 條件必須是 bool。switch expression 與 pattern 能解構 sealed type、record 與集合並檢查完整性。','String grade(int score) => switch (score) {\n  >= 90 => "A",\n  >= 60 => "Pass",\n  _ => "Retry",\n};','對 enum／sealed class 使用完整 switch，避免以 default 隱藏新狀態。'],
    ['collections','List、Set 與 Map','List 保序可重複、Set 唯一、Map 儲存 key/value。collection-if、collection-for 與 spread 可宣告式組合 UI 與資料。','final scores = <String, int>{"Ada": 92, "Lin": 78};\nfinal passed = [for (final e in scores.entries) if (e.value >= 60) e.key];','選擇符合語意的集合，對外提供不可變 view 避免狀態被任意修改。'],
    ['functions','函式、具名參數與閉包','必要具名參數用 required，可選參數要有 nullable 或預設值；tear-off 可直接傳遞函式，閉包捕捉外部變數。','double total({required int count, required double price, double tax = .05}) => count * price * (1 + tax);\nprint(total(count: 2, price: 100));','參數過多時建立設定物件；公開函式避免以位置參數表達多個同型別值。'],
    ['iterables','Iterable 與惰性轉換','map、where 產生惰性 Iterable，toList 才具體化；fold 聚合，expand 攤平。重複巡覽昂貴來源時應快取結果。','final values = [1, 2, 3, 4];\nfinal squares = values.where((n) => n.isEven).map((n) => n * n).toList();','不要在 build 中反覆建立昂貴 Iterable 鏈；量測後快取或移至 state。'],
    ['records-patterns','Record、Destructuring 與 Pattern','Record 是具結構型別的輕量多值，可使用位置與命名欄位；pattern 讓 if-case、switch、for 解構資料。公開領域模型仍常適合 class。','(String, int) user() => ("Ada", 20);\nfinal (name, age) = user();\nprint("$name $age");','Record 欄位意義不清或需要驗證／方法時，改用具名 class。'],
    ['exceptions','Exception、Error 與資源清理','只捕捉能處理的例外，使用 on 限定型別；rethrow 保留 stack trace，finally 處理必要清理。Error 通常代表程式錯誤，不應一般性吞掉。','try {\n  await loadCourse();\n} on FormatException catch (error, stack) {\n  log(error, stackTrace: stack);\n  rethrow;\n} finally {\n  client.close();\n}','空白 catch 會隱藏故障；對使用者顯示安全訊息，詳細 stack 只送受保護日誌。'],
    ['foundation-project','實戰：Dart CLI 成績分析器','讀取 CSV／JSON，驗證資料，使用集合與 pattern 計算統計，輸出清楚 exit code，並建立單元測試。','dart run bin/grade_report.dart scores.csv\ndart format --output=none --set-exit-if-changed .\ndart analyze\ndart test','輸入檔案與外部資料都不可信；錯誤行要顯示位置但不可讓整份報告靜默失真。']
  ]},
  { stage: 'dart-types', guide: '以 sound null safety 與清楚物件契約建立可維護模型。', lessons: [
    ['null-safety','Sound Null Safety 與型別提升','T 與 T? 是不同型別；先用條件或 pattern 驗證，分析器會 promotion。late 只適合生命週期保證，不是繞過初始化的通用手段。','String label(String? value) {\n  if (value case final text? when text.isNotEmpty) return text;\n  return "未命名";\n}','避免不必要的 !；若無法證明非 null，型別設計或流程通常需要調整。'],
    ['classes','Class、Constructor 與初始化','使用 initializer list、named constructor、factory 與 redirecting constructor 建立合法物件；欄位可見性以 library 為界，底線代表 private。','final class Course {\n  Course({required this.id, required this.title}) : assert(title != "");\n  final int id;\n  final String title;\n}','assert 不會在所有正式模式執行；外部資料仍需真正驗證並拋出領域錯誤。'],
    ['immutability','不可變物件、Equality 與 copyWith','final 欄位不代表巢狀集合不可變；使用 unmodifiable view。Value equality 可手寫或使用 freezed／equatable，狀態更新回傳新物件。','final class CounterState {\n  const CounterState(this.value);\n  final int value;\n  CounterState copyWith({int? value}) => CounterState(value ?? this.value);\n}','狀態物件不可暴露可變 List／Map；否則 UI 可能無法偵測更新。'],
    ['inheritance','繼承、Abstract、Interface 與 final','Dart 每個 class 都隱式定義 interface。extends 重用實作，implements 只採契約；base、interface、final、sealed 控制跨 library 繼承能力。','abstract interface class CourseRepository {\n  Future<Course?> findById(int id);\n}\nfinal class MemoryCourseRepository implements CourseRepository { /* ... */ }','只在真正替換邊界建立介面，優先組合而非深層繼承。'],
    ['mixins-extensions','Mixin、Extension 與 Extension Type','Mixin 為多個 class 提供受限制重用；extension 為既有型別增加靜態可解析 API；extension type 建立零成本包裝與更強型別。','extension StringValidation on String {\n  bool get isValidEmail => contains("@") && length <= 254;\n}','核心驗證不要散落多個 extension；需要不變條件時使用 value object。'],
    ['generics','Generic、Bound 與型變','Generic 保存型別資訊，bound 限制能力。Dart generic 通常 covariant，但方法參數仍可能在執行期檢查；API 應避免不安全 cast。','T firstOr<T>(List<T> values, T fallback) => values.isEmpty ? fallback : values.first;\nT maxBy<T extends Comparable<T>>(T a, T b) => a.compareTo(b) >= 0 ? a : b;','不要用 List<dynamic> 或 as T 隱藏模型不清；解析邊界要顯式轉型與驗證。'],
    ['enums-sealed','Enhanced Enum 與 Sealed Class','Enhanced enum 可有欄位與方法；sealed class 適合帶不同 payload 的封閉狀態，switch 可由編譯器檢查完整性。','sealed class LoadState {}\nfinal class Loading extends LoadState {}\nfinal class Loaded extends LoadState { Loaded(this.data); final List<String> data; }\nfinal class Failed extends LoadState { Failed(this.message); final String message; }','新增 sealed subtype 後修正所有 switch，不以 wildcard 草率吞掉狀態。'],
    ['operators-call','Operator、call 與 Callable Object','可為值物件實作相等、比較或算術 operator，也可實作 call 讓物件像函式。只在語意自然時使用，避免驚訝行為。','final class Validator {\n  const Validator();\n  bool call(String value) => value.trim().isNotEmpty;\n}\nconst isValid = Validator();','operator 必須符合直覺與代數規則；業務動作通常使用明確方法名。'],
    ['metadata-reflection','Metadata、Annotation 與 Code Generation','Annotation 是 const metadata，build_runner／macros 生態可產生序列化、路由或 immutable 程式碼。Flutter 避免 dart:mirrors 以維持 tree shaking。','dart run build_runner build --delete-conflicting-outputs\ndart run build_runner watch --delete-conflicting-outputs','產生檔是否提交依團隊規範一致決定；CI 必須驗證輸出沒有過期。'],
    ['type-project','實戰：強型別領域模型','以 value object、sealed state、repository interface、immutable collection 與 JSON mapper 建立課程領域，完全通過 strict analyze。','dart analyze --fatal-infos\ndart test test/domain/','任何外部 JSON 先轉 DTO 並驗證，再建立永遠有效的 domain object。']
  ]},
  { stage: 'dart-async', guide: '掌握 event loop、錯誤傳遞、取消與背景計算，再建立可發布套件。', lessons: [
    ['event-loop','Event Loop、Microtask 與同步工作','Dart isolate 依序處理 event queue；microtask 優先於一般 event。長同步工作會阻塞 Flutter frame，不能靠 async 關鍵字自動平行化。','scheduleMicrotask(() => print("microtask"));\nFuture(() => print("event"));\nprint("sync");','不要大量排入 microtask 造成 event starvation；UI 每幀預算約 16ms（60Hz）。'],
    ['future','Future、async／await 與錯誤','await 讓非同步流程維持可讀結構，Future.wait 可並行獨立工作。錯誤沿 Future 傳遞，應在能補救或轉換的邊界處理。','final (user, courses) = await (loadUser(), loadCourses()).wait;','並行工作若共享資源或需順序，不能盲目 Future.wait；也要處理部分失敗。'],
    ['streams','Stream、Subscription 與 Backpressure','Stream 表示多個非同步事件；single-subscription 與 broadcast 語意不同。保留 subscription 時必須 cancel，transform 可集中解析與過濾。','await for (final event in repository.watchCourses()) {\n  print(event);\n}','broadcast 不會重播舊事件；慢消費者、錯誤與關閉策略要明確。'],
    ['stream-controller','StreamController 與事件來源','Controller 適合包裝 callback／socket 來源，onListen、onPause、onResume、onCancel 管理底層資源。能使用 async* 時通常更簡單。','Stream<int> ticks() async* {\n  for (var i = 0; i < 3; i++) {\n    await Future<void>.delayed(const Duration(seconds: 1));\n    yield i;\n  }\n}','Controller 必須 close；Widget dispose 時取消訂閱，避免洩漏與 setState after dispose。'],
    ['isolate','Isolate、Isolate.run 與 compute','Isolate 有獨立 heap，以訊息傳遞。CPU 密集解析、壓縮可移出 UI isolate；小工作建立 isolate 的成本可能更高。','final parsed = await Isolate.run(() => parseLargeJson(source));\n// Flutter 亦可：await compute(parseLargeJson, source);','傳遞資料需可傳送且複製有成本；先用 DevTools 證明 UI jank 來源。'],
    ['cancellation-timeout','取消、Timeout 與生命週期','Future 本身沒有通用取消；HTTP、stream、operation 應使用各套件取消機制。timeout 只是停止等待，不一定停止底層工作。','final result = await client.get(uri).timeout(const Duration(seconds: 10));','離開頁面時取消請求／訂閱；避免逾時後背景工作仍寫入過期狀態。'],
    ['packages-pub','Package、Pub 與 SemVer','pubspec 宣告 SDK、dependencies、dev_dependencies、assets。pubspec.lock 對 application 應提交，library 通常測試版本範圍並不提交 lock 作發布契約。','dart pub add http\ndart pub add --dev test lints\ndart pub outdated\ndart pub deps','版本約束要符合 SemVer；升級前審查 changelog、授權與 transitive dependency。'],
    ['lint-docs','Lint、文件與 API 設計','analysis_options.yaml 啟用 lints；dart doc 產生 API 文件。公開 API 要小、型別明確、命名一致，破壞性改動提升 major。','dart format --output=none --set-exit-if-changed .\ndart analyze --fatal-warnings\ndart doc','不要以 ignore 規則永久掩蓋問題；例外需附理由與最小範圍。'],
    ['cli-io','Dart CLI、檔案與程序','dart:io 提供 File、Directory、HttpServer、Process 與 stdin；路徑使用 path 套件，輸入驗證並回傳有意義 exit code。','final file = File(args.single);\nif (!await file.exists()) {\n  stderr.writeln("檔案不存在");\n  exitCode = 2;\n}','限制使用者路徑與子程序參數；不要把未驗證文字交給 shell。'],
    ['async-project','實戰：非同步資料同步 CLI','並行抓取兩個 API、限制 timeout、解析 stream、以 isolate 處理大型 JSON、快取結果並提供取消／錯誤摘要與測試。','dart run bin/sync.dart --config sync.json\ndart analyze\ndart test','網路重試採指數退避與 jitter，寫入必須冪等，不能因重試產生重複資料。']
  ]},
  { stage: 'flutter-ui', guide: '理解 Flutter 宣告式 widget tree、constraint layout 與 frame pipeline。', lessons: [
    ['flutter-project','Flutter 專案、裝置與 Hot Reload','flutter create 建立多平台專案；flutter devices 選目標，run 啟動 debug。Hot reload 保留 State，hot restart 重建狀態，完整 restart 才重跑原生層。','flutter create --org tw.example academy_app\ncd academy_app\nflutter devices\nflutter run\nflutter analyze\nflutter test','不要在 build 方法執行網路或寫入；hot reload 成功不代表 release build 正常。'],
    ['widget-tree','Widget、Element 與 RenderObject','Widget 是不可變設定，Element 保存樹中身分與關聯，RenderObject 負責 layout／paint。理解三層可解釋 rebuild、key 與狀態保存。','class Greeting extends StatelessWidget {\n  const Greeting({super.key, required this.name});\n  final String name;\n  @override Widget build(BuildContext context) => Text("Hello $name");\n}','Widget 應小而可組合；不要為避免 rebuild 到處加入不必要 GlobalKey。'],
    ['constraints','Constraints Go Down, Sizes Go Up','Parent 傳 constraints，child 選 size，parent 決定 position。Unbounded constraint 常出現在 scrollable 內，Expanded 只能放在 Flex。','LayoutBuilder(builder: (context, constraints) {\n  return constraints.maxWidth >= 600 ? const WideView() : const NarrowView();\n})','遇 overflow 先理解 constraints，不以固定高度或 SingleChildScrollView 掩蓋所有問題。'],
    ['row-column-flex','Row、Column、Flex 與 Stack','mainAxis／crossAxis 控制排列；Expanded 填滿剩餘空間，Flexible 可縮放，Wrap 換行，Stack 疊放。','Row(children: [\n  const Icon(Icons.school),\n  const SizedBox(width: 8),\n  Expanded(child: Text(title, overflow: TextOverflow.ellipsis)),\n])','Row 內長文字要有有限寬度；不同螢幕與文字倍率都要測試。'],
    ['scrolling-lists','ListView、GridView 與 Sliver','大量項目使用 builder 惰性建立。CustomScrollView 組合 SliverAppBar、SliverList、SliverGrid；itemExtent／prototypeItem 可改善固定高度列表。','ListView.builder(\n  itemCount: courses.length,\n  itemBuilder: (context, index) => CourseTile(course: courses[index]),\n)','不可在 itemBuilder 以 index 當永久身分；重排列表使用穩定 ValueKey。'],
    ['stateful-lifecycle','StatefulWidget 生命週期','initState 建立一次性資源，didUpdateWidget 回應設定變更，didChangeDependencies 讀 inherited dependency，dispose 釋放 controller／subscription。','@override void initState() { super.initState(); controller.addListener(_onChanged); }\n@override void dispose() { controller.removeListener(_onChanged); controller.dispose(); super.dispose(); }','非同步完成後先檢查 mounted；每個建立的 controller、focus node、subscription 都要有對稱清理。'],
    ['keys','Key 與 Widget 身分','ValueKey 用資料 id 配對同型 sibling，ObjectKey 用物件身分，UniqueKey 每次都不同；GlobalKey 可跨位置存取 State，但成本與耦合較高。','CourseTile(key: ValueKey(course.id), course: course)','可重排有狀態列表必須使用穩定 key；不要以 index 或每次新建 UniqueKey。'],
    ['theme-material','Material 3、Theme 與 Design Token','ColorScheme.fromSeed 建立一致色彩，ThemeExtension 可加入品牌 token。元件從 Theme 讀設定，避免散落 magic color／spacing。','MaterialApp(\n  theme: ThemeData(colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo), useMaterial3: true),\n)','同時檢查 light/dark、高對比與 disabled 狀態；顏色不能是唯一資訊。'],
    ['assets-fonts','Assets、Image、Icon 與字型','pubspec 宣告 assets／fonts。Image.asset 適合本地資源，Image.network 需 loading/error；圖片提供 semanticLabel，依像素密度與快取需求選格式。','flutter:\n  assets:\n    - assets/images/\n  fonts:\n    - family: NotoSansTC\n      fonts:\n        - asset: assets/fonts/NotoSansTC-Regular.ttf','檔名大小寫在 Linux CI 會區分；字型授權與 app 體積需檢查。'],
    ['ui-project','實戰：響應式課程目錄 UI','建立手機 bottom navigation、平板 navigation rail、桌面雙欄版面，含主題、搜尋、空狀態、錯誤狀態、loading skeleton 與語意標籤。','flutter run -d chrome\nflutter run -d macos\nflutter test','以 320px 寬、文字倍率 200%、鍵盤操作、深色與橫向模式驗證，不只看單一手機。']
  ]},
  { stage: 'flutter-app', guide: '建立可預測狀態、導航、表單、手勢與動畫。', lessons: [
    ['local-state','本機狀態與狀態提升','短暫 UI 狀態放 State；多個 child 共用時提升到最近共同 parent。衍生值由來源計算，不建立第二份可失同步狀態。','setState(() { count += 1; });','setState 只包住同步狀態變更；不可把整段 await 放在 callback 內。'],
    ['controllers-focus','Controller、Focus 與鍵盤','TextEditingController、FocusNode、ScrollController 都有生命週期。FocusTraversalGroup 控制鍵盤順序，Shortcuts／Actions 建立桌面快捷鍵。','final controller = TextEditingController();\nfinal focusNode = FocusNode();\n@override void dispose() { controller.dispose(); focusNode.dispose(); super.dispose(); }','不要在 build 每次建立 controller；敏感輸入不應寫入日誌或 analytics。'],
    ['forms','Form、驗證與輸入格式','FormState 統一驗證／儲存；TextFormField validator 做同步格式檢查，非同步唯一性在提交流程處理。Autovalidate 應避免一輸入就責備使用者。','if (formKey.currentState!.validate()) {\n  await submit();\n}','客戶端驗證改善體驗但不取代伺服器驗證；錯誤訊息要可理解且與欄位關聯。'],
    ['navigation','Navigator、Router 與 Deep Link','Navigator 適合堆疊命令式頁面；go_router 等 Router 封裝 URL、redirect、nested navigation 與 deep link。路由參數仍要驗證。','final router = GoRouter(routes: [\n  GoRoute(path: "/courses/:id", builder: (context, state) => CoursePage(id: state.pathParameters["id"]!)),\n]);','認證 redirect 要保留安全目的地且防止 open redirect；Web back button 必須符合預期。'],
    ['riverpod','Riverpod Provider 與依賴圖','Provider 表達可測試依賴與狀態；ref.watch 使 UI 訂閱，ref.read 只取一次，ref.listen 處理 snackbar／navigation 等副作用。','final courseProvider = FutureProvider.family<Course, String>((ref, id) {\n  return ref.watch(courseRepositoryProvider).find(id);\n});','Provider 保持單一責任；不要在 build 觸發重複寫入或把 BuildContext 放入 repository。'],
    ['notifier-state','Notifier、AsyncValue 與狀態機','Notifier 管理同步狀態，AsyncNotifier 管理非同步狀態；AsyncValue 明確表示 loading／data／error。複雜流程使用 sealed state，避免多個 bool 組合非法狀態。','state = const AsyncLoading();\nstate = await AsyncValue.guard(() => repository.save(input));','提交時防止重複點擊；錯誤保留 stack trace 並支援 retry。'],
    ['gestures','Gesture、Pointer 與 Hit Testing','GestureDetector 辨識高階手勢，Listener 接低階 pointer。InkWell 提供 Material feedback；競爭手勢進 gesture arena。互動目標需足夠大。','Semantics(\n  button: true,\n  label: "開啟課程",\n  child: InkWell(onTap: onOpen, child: content),\n)','不要只靠 swipe 提供唯一操作；鍵盤、switch control 與螢幕閱讀器也要可用。'],
    ['implicit-animation','Implicit Animation','AnimatedContainer、AnimatedOpacity、TweenAnimationBuilder 適合由舊值平滑到新值，不需手動 controller。','AnimatedContainer(duration: const Duration(milliseconds: 250), curve: Curves.easeOut, color: selected ? Colors.indigo : Colors.grey)','尊重 disableAnimations／reduced motion；動畫不應阻擋操作或過度延長。'],
    ['explicit-animation','AnimationController 與 Hero','複雜序列使用 AnimationController、Tween、CurvedAnimation；TickerProvider 驅動 frame。Hero 以相同 tag 連接路由間元素。','late final AnimationController animation;\n@override void initState() { super.initState(); animation = AnimationController(vsync: this, duration: const Duration(milliseconds: 300)); }\n@override void dispose() { animation.dispose(); super.dispose(); }','Controller 必須 dispose；列表 Hero tag 使用穩定唯一 id。'],
    ['app-project','實戰：多頁學習追蹤 App','以 go_router、Riverpod、表單、AsyncValue、深連結與動畫建立課程列表、詳情、編輯與進度頁，完整處理 loading／empty／error／offline 狀態。','flutter analyze\nflutter test\nflutter run --dart-define=APP_ENV=dev','導航與狀態不可依賴隱藏全域變數；未登入 deep link、返回鍵與表單未儲存都要測試。']
  ]},
  { stage: 'data', guide: '把網路、序列化、快取與離線同步隔離在可靠資料層。', lessons: [
    ['http-client','HTTP Client、Timeout 與取消','使用 http／dio 設定 base URL、timeout、interceptor 與取消。依狀態碼分類錯誤，不把網路例外直接顯示給使用者。','final response = await client.get(uri).timeout(const Duration(seconds: 10));\nif (response.statusCode != 200) throw ApiException(response.statusCode);','只對安全／冪等操作自動重試，採指數退避與 jitter。'],
    ['json-models','JSON、DTO 與 Code Generation','API JSON 先轉 DTO，再映射 domain。json_serializable／freezed 減少樣板，但 unknown／缺少欄位仍需版本相容策略。','dart run build_runner build --delete-conflicting-outputs\nfinal course = CourseDto.fromJson(jsonDecode(response.body) as Map<String, dynamic>);','不使用未驗證的 as 串接到 UI；解析錯誤需記錄 endpoint、request id，而非完整敏感 body。'],
    ['rest-pagination','REST、分頁與錯誤模型','列表要處理 page／cursor、hasNext、重複項與排序。建立穩定 ApiError code，讓 UI 決定登入、重試或欄位錯誤呈現。','final next = await api.listCourses(cursor: state.nextCursor, limit: 20);\nstate = state.merge(next);','避免同時載入多次下一頁；refresh 與 pagination 的競態要以 token／generation 控制。'],
    ['auth-tokens','登入、Token 與安全儲存','短期 access token 放記憶體，refresh token 使用 OS secure storage；401 只允許單一 refresh flight，失敗清除 session。Web 優先安全 HttpOnly Cookie。','final token = await secureStorage.read(key: "refresh_token");','不可把 token 放 SharedPreferences、SQLite、URL、analytics 或日誌；登出要撤銷伺服器 session。'],
    ['sqlite-drift','SQLite 與 Drift','SQLite 適合結構化離線資料；Drift 提供型別安全 query、migration 與 reactive stream。交易保護多步寫入，index 依查詢設計。','flutter pub add drift sqlite3_flutter_libs\nflutter pub add --dev drift_dev build_runner\ndart run build_runner build','Migration 必須由舊版本資料實際測試；不可在正式升級時直接刪資料庫重建。'],
    ['key-value','SharedPreferences、Hive／Isar 與選擇','SharedPreferences 適合少量非敏感偏好；object store 適合本機模型；SQLite 適合關聯查詢。依一致性、查詢與 migration 選擇，不只看 API 簡單。','final prefs = await SharedPreferences.getInstance();\nawait prefs.setBool("dark_mode", true);','偏好儲存不是 secret store；大型或關鍵資料要有 schema、備份與錯誤處理。'],
    ['cache','Cache、TTL 與 Stale-While-Revalidate','Memory cache 快、disk cache 可離線。Key 包含使用者／租戶／查詢版本，TTL 控制新鮮度；先顯示 stale 再背景更新可改善體驗。','final cached = await cache.read(key);\nif (cached != null) emit(cached);\nfinal fresh = await api.fetch();\nawait cache.write(key, fresh);','登出清除私人 cache；不可讓上一位使用者資料顯示給下一位。'],
    ['offline-first','Offline-first 與同步佇列','讀取以本機為來源，背景同步遠端；寫入先記 operation log，恢復網路後依序傳送。每筆 operation 有 idempotency key 與狀態。','await database.transaction(() async {\n  await courses.upsert(localChange);\n  await outbox.enqueue(operation);\n});','需處理重試、永久失敗、順序、刪除 tombstone 與使用者可見同步狀態。'],
    ['conflicts-connectivity','衝突解決與 Connectivity','網路類型不代表可上網；實際 request 才能確認。衝突可採 server wins、client wins、field merge 或人工選擇，需依領域決定。','final generation = ++requestGeneration;\nfinal remote = await api.fetch();\nif (generation == requestGeneration) apply(remote);','不可靜默覆蓋重要使用者內容；保存版本、時間與來源並提供復原。'],
    ['data-project','實戰：離線優先課程筆記','建立 REST DTO、Drift schema、repository、記憶體／磁碟 cache、outbox、登入 token、分頁與衝突 UI，完成 migration 與斷網測試。','flutter test test/data/\nflutter test integration_test/offline_sync_test.dart','測試飛航模式、token 過期、重複送出、時鐘偏差、舊 schema 與兩裝置同時編輯。']
  ]},
  { stage: 'platform', guide: '透過 plugin 與 platform channel 安全存取裝置能力並支援各平台。', lessons: [
    ['permissions','權限與隱私流程','權限要在功能需要時解釋後請求，處理 denied、permanently denied、restricted。Android Manifest、iOS Info.plist 與平台政策都要對應。','final status = await Permission.camera.request();\nif (status.isPermanentlyDenied) await openAppSettings();','只要求必要權限；拒絕後仍提供可用替代流程，不用黑暗模式強迫同意。'],
    ['camera-images','相機、照片與圖片處理','camera／image_picker 回傳檔案，需處理生命週期、方向、尺寸、EXIF 與權限。大型 decode／壓縮移出 UI isolate。','final file = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 85);','圖片可能含位置與人臉個資；上傳前說明用途、移除非必要 metadata 並限制大小。'],
    ['location-maps','定位、地圖與地理權限','先檢查服務與權限，再依需求選精度；持續定位耗電且背景限制嚴格。地圖金鑰按平台、bundle id、API 與配額限制。','final enabled = await Geolocator.isLocationServiceEnabled();\nfinal position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.medium);','不要為非必要功能要求精確／背景定位；保存位置需最小化與設定刪除期限。'],
    ['notifications','本機與推播通知','本機通知由裝置排程，push 經 APNs／FCM；前景、背景、terminated 點擊路由不同。Token 會輪替，伺服器需更新與移除失效 token。','await messaging.requestPermission();\nfinal token = await messaging.getToken();','通知 payload 不放敏感內容；深連結參數仍需驗證與登入授權。'],
    ['deep-links','App Links、Universal Links 與分享','Android App Links／iOS Universal Links 需網域驗證檔；custom scheme 較易被攔截。解析 URL 後映射內部 route。','final uri = Uri.parse(link);\nif (uri.host == "app.example.com") router.go(uri.path);','限定 scheme／host／path，防止 open redirect 與任意 WebView／檔案開啟。'],
    ['background','背景工作與生命週期限制','Android WorkManager、iOS Background Tasks 由系統排程，不保證立即或永久執行。工作需短、可中斷、冪等並保存 checkpoint。','await Workmanager().registerOneOffTask("sync-$id", "sync", constraints: Constraints(networkType: NetworkType.connected));','不要用背景工作繞過平台限制；大量上傳需可續傳且尊重電量與數據模式。'],
    ['platform-channels','MethodChannel、EventChannel 與 FFI','Plugin 以 MethodChannel 呼叫單次原生方法，EventChannel 串流事件；高效 C API 可用 dart:ffi。契約需版本化並將平台錯誤轉成 Dart 型別。','const channel = MethodChannel("tw.example/device");\nfinal battery = await channel.invokeMethod<int>("batteryLevel");','所有 channel input 都要驗證；原生 callback 回主執行緒且生命週期安全。'],
    ['web','Flutter Web 與瀏覽器限制','Web renderer、URL strategy、CORS、service worker、SEO 與 bundle 體積和原生不同。瀏覽器禁止任意檔案、背景與秘密儲存。','flutter build web --release --wasm\nflutter run -d chrome --web-port 8080','Wasm／套件相容性與瀏覽器支援要實測；API 金鑰放前端即視為公開。'],
    ['desktop','Windows、macOS、Linux Desktop','Desktop 要處理視窗尺寸、menu、鍵盤滑鼠、檔案選擇、系統匣與簽章。Plugin 平台支援度必須逐一確認。','flutter config --enable-windows-desktop --enable-macos-desktop --enable-linux-desktop\nflutter devices','路徑、權限、sandbox 與自動更新各平台不同；不能只在 mobile 測試。'],
    ['platform-project','實戰：跨平台媒體筆記 App','整合相機／檔案、定位選用、通知、deep link、背景同步，並在 Android、iOS、Web、Desktop 以 capability matrix 提供降級功能。','flutter test\nflutter test integration_test\nflutter build apk --release\nflutter build web --release','每項權限附用途、拒絕流程與隱私說明；不支援平台顯示替代方案而非崩潰。']
  ]},
  { stage: 'architecture', guide: '用明確邊界、測試金字塔與自動化維持大型 Flutter 專案。', lessons: [
    ['clean-architecture','Presentation、Domain、Data 邊界','Presentation 依賴 use case／state，Domain 保存規則與介面，Data 實作 API／DB。依賴朝內，框架型別不流入核心。','lib/\n  features/courses/presentation/\n  features/courses/domain/\n  features/courses/data/','不要為小專案建立空洞層次；以變更原因與可測試邊界決定抽象。'],
    ['feature-first','Feature-first 與模組化','依功能聚合 UI、domain、data，shared 只放真正跨功能能力。大型團隊可拆 Dart packages，使用 melos 管理 monorepo。','dart pub global activate melos\nmelos bootstrap\nmelos run analyze','避免 common/utils 成為無邊界垃圾桶；package API 要小且有 owner。'],
    ['dependency-injection','依賴注入與 Composition Root','在 app bootstrap 組合實作，內層只知道 interface。Riverpod 可同時是狀態與 DI；測試以 override 注入 fake。','await runApp(ProviderScope(overrides: [courseRepositoryProvider.overrideWithValue(repository)], child: const App()));','不得在 domain 呼叫全域 service locator；必要依賴由 constructor 明確表達。'],
    ['error-modeling','Failure、Result 與錯誤邊界','將 HTTP、DB、platform exception 轉成穩定 Failure；UI 依 failure 類型呈現登入、重試、離線或欄位錯誤。不要把技術 stack 暴露給使用者。','sealed class Failure {}\nfinal class NetworkFailure extends Failure {}\nfinal class ValidationFailure extends Failure { ValidationFailure(this.fields); final Map<String,String> fields; }','保留原始 cause／stack 給受保護 observability，但 domain 不依賴套件例外。'],
    ['unit-tests','Dart 單元測試與 Mock','test 使用 group／test／expect；純規則優先 fake／手寫 stub，mock 只驗證真正重要互動。測試邊界與失敗路徑。','test("completed cannot exceed total", () {\n  expect(() => Progress(total: 1, completed: 2), throwsArgumentError);\n});','測試公開行為，不直接測 private method；時鐘、亂數與 ID 由依賴注入。'],
    ['widget-tests','Widget Test、Finder 與 Semantics','pumpWidget 建小型測試樹，Finder 操作，pump 等待指定 frame。檢查文字、互動、navigation 與 semantics；避免無條件 pumpAndSettle 掩蓋無限動畫。','await tester.pumpWidget(const MaterialApp(home: CounterPage()));\nawait tester.tap(find.byIcon(Icons.add));\nawait tester.pump();\nexpect(find.text("1"), findsOneWidget);','使用穩定語意／key 找元件，不依賴脆弱樹深度或實作類別。'],
    ['golden-tests','Golden、字型與視覺回歸','Golden 比對像素，適合 design system 關鍵元件；固定字型、尺寸、pixel ratio 與平台。差異需人工審查，不可盲目更新。','await expectLater(find.byType(CourseCard), matchesGoldenFile("goldens/course_card.png"));','Golden 不取代行為與無障礙測試；只保留高價值畫面以控制維護成本。'],
    ['integration-tests','Integration Test 與端對端','在模擬器／真機啟動完整 App，驗證關鍵使用者旅程。後端使用隔離測試環境與 deterministic fixture，失敗保存 screenshot／log。','flutter test integration_test/app_test.dart -d emulator-5554','E2E 數量保持精簡；不可使用正式帳號、正式資料或不可重置服務。'],
    ['ci-quality','CI、Coverage 與品質門檻','CI 固定 Flutter，執行 format、analyze、test、coverage、build。cache key 包含 lockfile，簽章秘密只供受保護 release job。','dart format --output=none --set-exit-if-changed .\nflutter analyze --fatal-infos\nflutter test --coverage\nflutter build apk --debug','Pull Request from fork 不接觸 signing secret；coverage 用來找缺口而非追求無意義 100%。'],
    ['architecture-project','實戰：多人可維護的模組化 App','把課程、登入、進度拆成 feature packages，建立 composition root、typed failures、fake repositories、widget／integration test 與 CI。','melos bootstrap\nmelos run format\nmelos run analyze\nmelos run test','建立 architecture decision record，說明每個邊界、例外與未採用方案，避免只複製模板。']
  ]},
  { stage: 'production', guide: '以 DevTools、無障礙、安全與發布觀測把 App 提升到正式品質。', lessons: [
    ['devtools','Flutter DevTools 與 Performance Overlay','用 frame chart 分析 UI／raster jank，CPU profiler 找同步熱點，memory 找 retained objects，network 檢查瀑布。先量測 profile mode。','flutter run --profile\nflutter devtools','Debug 效能不代表 release；建立可重現場景並記錄修改前後數據。'],
    ['rebuilds','Rebuild、Const 與 Selector','rebuild 本身常很便宜；昂貴的是 build 中工作、layout、paint。使用 const、拆 widget、select 只監聽必要欄位，RepaintBoundary 隔離昂貴繪製。','final count = ref.watch(cartProvider.select((state) => state.items.length));','不要到處 const／RepaintBoundary 而不量測；過度拆分也增加理解成本。'],
    ['images-memory','圖片、記憶體與大型列表','依顯示尺寸指定 cacheWidth／cacheHeight，分頁與惰性列表控制記憶體。dispose 原生資源，DevTools snapshot 比較洩漏。','Image.network(url, cacheWidth: 800, errorBuilder: (_, __, ___) => const Icon(Icons.broken_image));','不得解碼遠大於顯示尺寸圖片；離開頁面後訂閱與 controller 不應持續保留 State。'],
    ['accessibility','Semantics、鍵盤與螢幕閱讀器','互動元件需 label、role、state、focus order 與足夠 hit target。使用原生 button 控制優先於自製 GestureDetector；測 TalkBack／VoiceOver。','Semantics(label: "完成課程", button: true, child: FilledButton(onPressed: complete, child: const Text("完成")))','顏色、位置、聲音不能是唯一資訊；支援 200% 文字與 reduced motion。'],
    ['localization','國際化、ARB 與 RTL','flutter_localizations＋intl 由 ARB 產型別安全文字；日期、數字、複數依 locale。版面使用 start/end 支援 RTL，翻譯不可字串拼接。','flutter gen-l10n\nText(AppLocalizations.of(context)!.lessonCount(count))','所有使用者可見文字集中翻譯；截圖、overflow 與 RTL 都要自動／人工測試。'],
    ['app-security','Mobile 安全、儲存與網路','TLS 是基本；敏感資料用 secure storage，伺服器執行授權。Obfuscation 只增加逆向成本；憑證 pinning 有輪替風險，需雙 pin 與恢復計畫。','flutter build appbundle --obfuscate --split-debug-info=build/symbols','App 內任何 API secret 都可被取出；高價值動作由伺服器驗證、限速與風險偵測。'],
    ['privacy-analytics','隱私、Crash 與 Analytics','只收集必要事件，取得適用同意並提供退出／刪除。Crash report 過濾 token、輸入、位置與個資；source map／symbols 受控保存。','FlutterError.onError = (details) { reportSanitized(details.exception, details.stack); };','先定義資料字典、用途、保留期與存取者，再加入 SDK；兒少與教育資料更需最小化。'],
    ['flavors-config','Flavor、環境與 Dart Define','dev／staging／prod 使用不同 bundle id、後端與圖示。非秘密設定可 --dart-define 或 compile-time environment；秘密不進 App。','flutter run --flavor dev --dart-define=APP_ENV=dev\nflutter build appbundle --flavor prod --dart-define=APP_ENV=prod','建置腳本明確選環境，避免測試版連正式 API；前端 define 內容可被反編譯。'],
    ['release-signing','Android／iOS 簽章與商店發布','Android 使用 keystore、AAB、Play App Signing；iOS 使用 certificate、provisioning、archive。版本號、隱私表單、截圖與 review notes 都納入 release checklist。','flutter build appbundle --release\nflutter build ipa --release','私鑰放 CI secret store 並備份輪替；不得提交 keystore、p12、密碼或 provisioning secret。'],
    ['production-project','實戰：正式品質稽核與修正','對既有 App 建 performance baseline、無障礙、i18n、security、privacy、flavor、crash、release checklist，修正後以 profile 與測試證明。','flutter analyze --fatal-infos\nflutter test\nflutter run --profile\nflutter build appbundle --release','每項修正附可重現證據、風險與回復方案；不以「在我的手機正常」作結論。']
  ]},
  { stage: 'capstone', guide: '整合語言、UI、資料、平台與交付能力，完成可發布作品。', lessons: [
    ['custom-paint','CustomPainter、Canvas 與圖形','Canvas 依序 draw，shouldRepaint 決定重繪。複雜動畫使用 RepaintBoundary、Picture／shader 並以 raster profiler 量測。','class ProgressPainter extends CustomPainter {\n  @override void paint(Canvas canvas, Size size) { canvas.drawArc(Offset.zero & size, -.5 * pi, 1.5 * pi, false, Paint()..style = PaintingStyle.stroke); }\n  @override bool shouldRepaint(covariant ProgressPainter old) => false;\n}','Custom paint 仍須提供 Semantics 與替代文字；不可只畫出視覺而無可操作節點。'],
    ['ffi-plugin','FFI 與 Federated Plugin','FFI 綁定 C ABI，需管理記憶體、執行緒與各架構 binary。Federated plugin 以 platform interface 加 Android、iOS、Web、Desktop 實作。','flutter create --template=plugin --platforms=android,ios,web,windows,macos,linux device_bridge','原生崩潰可終止整個 App；FFI buffer 所有權、釋放與邊界檢查必須有測試。'],
    ['code-push-limits','功能旗標、Remote Config 與更新邊界','功能旗標可漸進開啟既有程式，但不可下載任意執行碼繞過商店審查。旗標需預設值、owner、到期日與離線行為。','final enabled = remoteConfig.getBool("new_course_ui");','重要安全與收費邏輯由伺服器決定；旗標服務失效時 App 仍可安全啟動。'],
    ['package-publish','發布 Dart／Flutter Package','建立小而穩定 API、README、example、license、changelog、測試與平台支援表；dart pub publish --dry-run 先驗證。','dart pub publish --dry-run\ndart doc\ndart test','發布後版本不可覆寫；避免把私人 URL、憑證或未授權資產打包。'],
    ['store-automation','Fastlane、Codemagic 與分階段發布','CI 產生簽章 artifact，送 internal／TestFlight，通過 smoke test 後 staged rollout。監控 crash／ANR／啟動時間並可暫停。','flutter build appbundle --release\nflutter build ipa --release\n# 上傳由受保護 release job 執行','同一 artifact 經各階段晉升，不能在 production 重新建不同 binary；保留 symbols 與 provenance。'],
    ['capstone-language','專案一：Dart 套件與 CLI 工具','發布一個 typed config／validation package 與 CLI，具 async I/O、完整文件、100% 關鍵規則測試、SemVer 與 GitHub Release。','dart format --output=none --set-exit-if-changed .\ndart analyze --fatal-infos\ndart test\ndart pub publish --dry-run','套件公開 API 一旦發布即有相容性責任；以 deprecation 過渡而非突然刪除。'],
    ['capstone-mobile','專案二：離線優先行動學習 App','完成登入、課程、筆記、進度、Drift、outbox、推播、deep link、無障礙與多語言，並通過 Android／iOS 整合測試。','flutter test\nflutter test integration_test -d emulator-5554\nflutter build appbundle --release','用真實升級路徑測 migration 與 token 輪替；私人進度不可跨帳號洩漏。'],
    ['capstone-web-desktop','專案三：Web／Desktop 管理工作台','建立響應式桌面介面、鍵盤快捷鍵、URL 導航、檔案匯入匯出與權限；比較 Web、Windows、macOS、Linux 差異並降級。','flutter build web --release --wasm\nflutter build windows --release\nflutter build macos --release\nflutter build linux --release','匯入檔案視為不可信；Desktop 安裝包需簽章，Web API 需 CORS 與伺服器授權。'],
    ['capstone-team','專案四：模組化團隊 App','以 melos 管理 design system、auth、courses、analytics packages，制定 code ownership、CI、golden、release train 與 architecture decisions。','melos bootstrap\nmelos run analyze\nmelos run test\nmelos run build','模組邊界與發布流程應降低協作成本；不要為形式拆出大量互相耦合 package。'],
    ['capstone-release','總整專案：跨平台正式發布','從產品需求、資料模型、Flutter 架構、API、離線、裝置能力、測試、效能、安全、隱私，到商店簽章、分階段發布、監控與回滾完整交付。','dart format --output=none --set-exit-if-changed .\nflutter analyze --fatal-infos\nflutter test --coverage\nflutter test integration_test\nflutter build appbundle --release\nflutter build ipa --release','完成標準是可由乾淨環境重建、無秘密、通過無障礙與隱私稽核、具監控與符號檔，並演練發布中止與資料復原。']
  ]}
];

export const dartFlutterLessons = modules.flatMap((module) => module.lessons.map((lesson) => ({ module, lesson }))).map(({ module, lesson }, index) => {
  const [id, title, concept, code, guardrail] = lesson;
  return {
    id, stage: module.stage, order: index + 1, duration: id.includes('project') || id.includes('capstone') ? 120 : 65,
    title, subtitle: concept.split('。')[0], available: true,
    objectives: [`理解「${title}」的核心模型`, `完成可執行的 Dart／Flutter「${title}」練習`, '能檢查跨平台、生命週期與正式品質風險'],
    sections: [
      { title: '核心模型', body: concept, code },
      { title: '實作與驗證', body: `${module.guide} 本課先在最小專案重現「${title}」，再加入 analyzer、測試或平台驗證。`, code },
      { title: '正式專案檢查', body: guardrail, code: 'dart format --output=none --set-exit-if-changed .\nflutter analyze --fatal-infos\nflutter test' }
    ],
    challenge: {
      title: `實作：${title}`,
      description: `在獨立練習分支完成「${title}」，記錄預期結果、失敗案例與跨平台差異。`,
      starter: code,
      solution: `${code}\n// 完成後執行 format、analyze 與相關測試`,
      required: [code.split('\n')[0].trim().split(/[ (]/)[0]],
      expectedOutput: `能執行並解釋「${title}」的結果`,
      hints: [concept, guardrail]
    },
    quiz: {
      question: `關於「${title}」，何者是正確做法？`,
      choices: [guardrail, '遇到型別錯誤一律改成 dynamic', '所有非同步工作都會自動移到背景 isolate', '只要 debug 模式正常就可直接發布'],
      answer: 0,
      explanation: guardrail
    }
  };
});

export function createDefaultDartFlutterProgress() {
  return { lessons: {}, lastLesson: 'sdk-project', startedAt: new Date().toISOString() };
}
