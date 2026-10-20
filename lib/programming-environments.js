const nodePlatforms = [
  {
    id: 'windows', name: 'Windows 10／11', icon: '⊞', shell: 'PowerShell',
    steps: [
      { title: '安裝 Git 與 Node.js LTS', command: 'winget install --id Git.Git -e\nwinget install --id OpenJS.NodeJS.LTS -e', note: '安裝後關閉並重新開啟 PowerShell，讓 PATH 生效。' },
      { title: '啟用套件管理器', command: 'corepack enable\nnode --version\nnpm --version\ngit --version', note: 'Node.js 請使用目前仍受支援的 LTS，不要使用 Current 測試版。' }
    ]
  },
  {
    id: 'linux', name: 'Linux', icon: '🐧', shell: 'Bash（Ubuntu／Debian 範例）',
    steps: [
      { title: '安裝 Git、curl 與編譯工具', command: 'sudo apt update\nsudo apt install -y git curl build-essential', note: 'Fedora 可改用 sudo dnf install git curl gcc-c++ make。' },
      { title: '透過 nvm 安裝 Node.js LTS', command: 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash\nsource ~/.nvm/nvm.sh\nnvm install --lts\ncorepack enable', note: '正式執行安裝腳本前，可先從 nvm 官方儲存庫閱讀內容。' }
    ]
  },
  {
    id: 'macos', name: 'macOS', icon: '◆', shell: 'Terminal（zsh）',
    steps: [
      { title: '安裝命令列工具', command: 'xcode-select --install', note: '若已安裝會顯示提示，不必重複安裝。' },
      { title: '使用 Homebrew 安裝工具鏈', command: 'brew install git node\ncorepack enable\nnode --version\nnpm --version', note: '尚未安裝 Homebrew 時，請先依 brew.sh 官方說明完成安裝。Apple Silicon 預設路徑為 /opt/homebrew。' }
    ]
  }
];

const nodeGuide = ({ title, intro, create, verify = 'node --version\nnpm --version\ngit --version', editor, official }) => ({
  title, intro, platforms: nodePlatforms, verify, create, editor,
  checklist: ['版本指令可正常執行', '新專案能啟動開發伺服器', '瀏覽器能開啟終端機顯示的 localhost 網址', '停止伺服器後能再次正常啟動'],
  troubleshooting: ['找不到 node 或 npm：重新開啟終端機並檢查 PATH。', '權限錯誤：不要使用 sudo npm install -g；改用 nvm 或專案本機依賴。', '版本不一致：查看專案的 .nvmrc、package.json engines 與 lockfile。'],
  official
});

export const programmingEnvironmentGuides = {
  rust: {
    title: 'Rust 開發環境安裝', intro: '使用官方 rustup 同時管理 stable 工具鏈、rustc、Cargo 與格式化／檢查元件。Windows 建議採 MSVC 工具鏈。',
    platforms: [
      { id: 'windows', name: 'Windows 10／11', icon: '⊞', shell: 'PowerShell', steps: [
        { title: '安裝 MSVC C++ 建置工具', command: 'winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"', note: 'Rust 的 windows-msvc 目標需要 linker 與 Windows SDK。' },
        { title: '安裝 rustup', command: 'winget install --id Rustlang.Rustup -e\nrustup default stable\nrustup component add rustfmt clippy', note: '完成後重新開啟 PowerShell。' }
      ]},
      { id: 'linux', name: 'Linux', icon: '🐧', shell: 'Bash（Ubuntu／Debian 範例）', steps: [
        { title: '安裝系統編譯工具', command: 'sudo apt update\nsudo apt install -y build-essential curl pkg-config libssl-dev', note: 'Fedora 可使用 gcc gcc-c++ make openssl-devel pkgconf-pkg-config。' },
        { title: '安裝官方工具鏈', command: 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh\nsource "$HOME/.cargo/env"\nrustup component add rustfmt clippy', note: '選擇預設 stable 安裝即可。' }
      ]},
      { id: 'macos', name: 'macOS', icon: '◆', shell: 'Terminal（zsh）', steps: [
        { title: '安裝 Apple 編譯工具', command: 'xcode-select --install', note: '提供 clang、linker 與 macOS SDK。' },
        { title: '安裝官方工具鏈', command: 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh\nsource "$HOME/.cargo/env"\nrustup component add rustfmt clippy', note: 'Intel 與 Apple Silicon 都由 rustup 自動選擇正確架構。' }
      ]}
    ],
    verify: 'rustc --version\ncargo --version\nrustup show active-toolchain\ncargo clippy --version',
    create: 'cargo new hello-rust\ncd hello-rust\ncargo run\ncargo fmt --check\ncargo clippy',
    editor: 'VS Code：安裝 rust-analyzer 與 CodeLLDB；或使用支援 Rust 的 JetBrains IDE。',
    checklist: ['cargo run 顯示 Hello, world!', 'rustfmt 與 Clippy 可執行', '編輯器能顯示型別與錯誤提示'],
    troubleshooting: ['Windows linker 錯誤：確認已安裝 VCTools 與 Windows SDK。', 'cargo 找不到：重新開啟終端機或載入 $HOME/.cargo/env。', '套件編譯失敗：依錯誤補齊 pkg-config、OpenSSL 或其他原生函式庫。'],
    official: [{ label: 'Rust 官方安裝', url: 'https://www.rust-lang.org/tools/install' }, { label: 'The Rust Book', url: 'https://doc.rust-lang.org/book/' }]
  },
  go: {
    title: 'Go 開發環境安裝', intro: '安裝官方 Go 工具鏈與 Git；模組、格式化、測試及建置都由 go 指令統一處理。',
    platforms: [
      { id: 'windows', name: 'Windows 10／11', icon: '⊞', shell: 'PowerShell', steps: [
        { title: '安裝 Go 與 Git', command: 'winget install --id GoLang.Go -e\nwinget install --id Git.Git -e', note: '重新開啟 PowerShell 後再驗證版本。' }
      ]},
      { id: 'linux', name: 'Linux', icon: '🐧', shell: 'Bash（Ubuntu／Debian 範例）', steps: [
        { title: '安裝工具鏈', command: 'sudo apt update\nsudo apt install -y golang-go git build-essential', note: '發行版套件較舊時，改用 go.dev/dl 的官方壓縮檔，並先移除舊的 /usr/local/go。' }
      ]},
      { id: 'macos', name: 'macOS', icon: '◆', shell: 'Terminal（zsh）', steps: [
        { title: '安裝工具鏈', command: 'xcode-select --install\nbrew install go git', note: '也可由 go.dev/dl 安裝官方 pkg。' }
      ]}
    ],
    verify: 'go version\ngo env GOROOT GOPATH GOOS GOARCH\ngit --version',
    create: 'mkdir hello-go && cd hello-go\ngo mod init example.com/hello-go\nprintf "package main\\nimport \\"fmt\\"\\nfunc main(){fmt.Println(\\"Go ready\\")}\\n" > main.go\ngofmt -w main.go\ngo run .\ngo test ./...',
    editor: 'VS Code：安裝官方 Go 擴充套件，首次開啟時允許安裝 gopls、dlv 與 staticcheck。',
    checklist: ['go run . 顯示 Go ready', 'gofmt 後檔案格式正確', 'gopls 能提供補全與診斷'],
    troubleshooting: ['不要把專案放進 GOROOT；一般專案可放在任意資料夾並使用 go.mod。', '公司代理環境請設定 GOPROXY，不要關閉 checksum 驗證。', 'CGO 錯誤通常表示缺少 C 編譯器或原生函式庫。'],
    official: [{ label: 'Go 官方下載', url: 'https://go.dev/dl/' }, { label: 'Go 安裝說明', url: 'https://go.dev/doc/install' }]
  },
  nuxt: nodeGuide({
    title: 'JavaScript／Vue／Nuxt 開發環境安裝', intro: '先安裝 Node.js LTS、npm 與 Git，再用 Nuxt 官方建立器生成 TypeScript 專案。',
    create: 'npm create nuxt@latest nuxt-lab\ncd nuxt-lab\nnpm install\nnpm run dev',
    editor: 'VS Code：安裝 Vue - Official（Volar）、ESLint；停用舊版 Vetur，避免語言服務衝突。',
    official: [{ label: 'Node.js 下載', url: 'https://nodejs.org/' }, { label: 'Nuxt 安裝', url: 'https://nuxt.com/docs/getting-started/installation' }, { label: 'Vue 快速開始', url: 'https://vuejs.org/guide/quick-start.html' }]
  }),
  react: nodeGuide({
    title: 'React／Next.js／Gatsby 開發環境安裝', intro: '三者共用 Node.js LTS 工具鏈；以 Next.js 作全端主線，並保留 Vite React 與 Gatsby 的獨立練習專案。',
    create: 'npx create-next-app@latest next-lab\ncd next-lab\nnpm run dev\n\n# 另建 Gatsby 練習專案\nnpm init gatsby',
    editor: 'VS Code：安裝 ESLint；TypeScript 與 JSX 支援已內建。React Developer Tools 安裝在瀏覽器。',
    official: [{ label: 'React 文件', url: 'https://react.dev/learn' }, { label: 'Next.js 安裝', url: 'https://nextjs.org/docs/app/getting-started/installation' }, { label: 'Gatsby 教學', url: 'https://www.gatsbyjs.com/docs/tutorial/' }]
  }),
  svelte: nodeGuide({
    title: 'Svelte／SvelteKit 開發環境安裝', intro: '使用 Node.js LTS 與 Svelte 官方 sv CLI 建立專案，建議直接選擇 TypeScript、ESLint 與 Prettier。',
    create: 'npx sv create svelte-lab\ncd svelte-lab\nnpm install\nnpm run dev',
    editor: 'VS Code：安裝 Svelte for VS Code 與 ESLint；讓專案內的 Prettier 設定負責格式化。',
    official: [{ label: 'Svelte 入門', url: 'https://svelte.dev/docs/svelte/getting-started' }, { label: 'SvelteKit 建立專案', url: 'https://svelte.dev/docs/kit/creating-a-project' }]
  }),
  'java-kotlin': {
    title: 'Java／Kotlin／JVM 開發環境安裝', intro: '以 JDK 21 LTS、Gradle Wrapper 與 IntelliJ IDEA 為基準；專案應固定 toolchain 與 Wrapper 版本。',
    platforms: [
      { id: 'windows', name: 'Windows 10／11', icon: '⊞', shell: 'PowerShell', steps: [
        { title: '安裝 JDK 與 IDE', command: 'winget install --id EclipseAdoptium.Temurin.21.JDK -e\nwinget install --id JetBrains.IntelliJIDEA.Community -e', note: '重新開啟 PowerShell，確認 JAVA_HOME 指向 JDK 21。' }
      ]},
      { id: 'linux', name: 'Linux', icon: '🐧', shell: 'Bash（Ubuntu／Debian 範例）', steps: [
        { title: '安裝 JDK 21', command: 'sudo apt update\nsudo apt install -y openjdk-21-jdk git unzip', note: '若發行版沒有 JDK 21，可使用 Eclipse Temurin 或 SDKMAN；不要只安裝 JRE。' },
        { title: '選擇預設 JDK', command: 'sudo update-alternatives --config java\njava --version\njavac --version', note: 'IntelliJ 可從 JetBrains Toolbox 或發行版套件安裝。' }
      ]},
      { id: 'macos', name: 'macOS', icon: '◆', shell: 'Terminal（zsh）', steps: [
        { title: '安裝 JDK、Kotlin 與 IDE', command: 'brew install --cask temurin@21\nbrew install kotlin\nbrew install --cask intellij-idea-ce', note: '必要時以 /usr/libexec/java_home -V 查看已安裝 JDK。' }
      ]}
    ],
    verify: 'java --version\njavac --version\nkotlin -version  # 若有安裝獨立 Kotlin CLI\n./gradlew --version  # 已建立專案後',
    create: '在 IntelliJ 選擇 New Project → Kotlin 或 Java → Gradle → JDK 21。\n建立後在專案終端機執行：\n./gradlew run       # Windows 使用 .\\gradlew.bat run\n./gradlew test      # Windows 使用 .\\gradlew.bat test',
    editor: '優先使用 IntelliJ IDEA Community；VS Code 則安裝 Extension Pack for Java 與 Kotlin 擴充套件。',
    checklist: ['java 與 javac 都是 21.x', '專案包含 gradlew、gradlew.bat 與 gradle/wrapper', 'Wrapper 能執行 test 與 run'],
    troubleshooting: ['只裝 JRE 會缺少 javac；請安裝完整 JDK。', 'IDE 與終端機版本不同：同時檢查 Project SDK、Gradle JVM 與 JAVA_HOME。', '不要要求使用者全域安裝相同 Gradle；提交 Wrapper 並用 ./gradlew。'],
    official: [{ label: 'Eclipse Temurin JDK', url: 'https://adoptium.net/' }, { label: 'Kotlin 入門', url: 'https://kotlinlang.org/docs/getting-started.html' }, { label: 'Gradle 安裝', url: 'https://docs.gradle.org/current/userguide/installation.html' }]
  },
  csharp: {
    title: 'C#／.NET 開發環境安裝', intro: '使用目前受支援的 .NET SDK；SDK 已包含 C# 編譯器、CLI、專案範本與 NuGet。課程以 .NET 10 LTS 為主。',
    platforms: [
      { id: 'windows', name: 'Windows 10／11', icon: '⊞', shell: 'PowerShell', steps: [
        { title: '安裝 .NET SDK 與編輯器', command: 'winget install --id Microsoft.DotNet.SDK.10 -e\nwinget install --id Microsoft.VisualStudioCode -e', note: '需要完整桌面 IDE 時可安裝 Visual Studio Community，並選 ASP.NET 工作負載。' }
      ]},
      { id: 'linux', name: 'Linux', icon: '🐧', shell: 'Bash', steps: [
        { title: '安裝到個人目錄', command: 'curl -L https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh\nless /tmp/dotnet-install.sh\nbash /tmp/dotnet-install.sh --channel 10.0\nexport PATH="$HOME/.dotnet:$PATH"', note: '將 PATH 設定加入 ~/.bashrc；正式伺服器也可依 Microsoft 文件加入發行版套件來源。' }
      ]},
      { id: 'macos', name: 'macOS', icon: '◆', shell: 'Terminal（zsh）', steps: [
        { title: '安裝 SDK', command: 'brew install --cask dotnet-sdk\ndotnet --info', note: 'Apple Silicon 請確認顯示 arm64；需要特定 LTS 時使用 Microsoft 官方安裝程式。' }
      ]}
    ],
    verify: 'dotnet --version\ndotnet --list-sdks\ndotnet --info',
    create: 'dotnet new console -n HelloDotnet\ncd HelloDotnet\ndotnet run\ndotnet test',
    editor: 'VS Code：安裝 C# Dev Kit；Windows 也可使用 Visual Studio Community。',
    checklist: ['dotnet --version 顯示 10.x SDK', 'dotnet run 能編譯並執行', '編輯器可進行補全、偵錯與測試'],
    troubleshooting: ['Runtime 不能取代 SDK；若 dotnet new 不存在，表示只裝了 Runtime。', '多版本並存時使用 global.json 固定 SDK。', 'Linux 找不到 dotnet：將 $HOME/.dotnet 加入 PATH 並重開 shell。'],
    official: [{ label: '.NET 下載', url: 'https://dotnet.microsoft.com/download' }, { label: '.NET 安裝文件', url: 'https://learn.microsoft.com/dotnet/core/install/' }]
  },
  'c-cpp': {
    title: 'C／C++ 跨平台開發環境安裝', intro: '同時準備編譯器、偵錯器、CMake 與 Ninja。課程以 C17、C++23 及 CMake 專案為主。',
    platforms: [
      { id: 'windows', name: 'Windows 10／11', icon: '⊞', shell: 'Developer PowerShell', steps: [
        { title: '安裝 MSVC 工具鏈', command: 'winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"', note: '之後從開始選單開啟 Developer PowerShell for VS 2022。' },
        { title: '安裝建置工具', command: 'winget install --id Kitware.CMake -e\nwinget install --id Ninja-build.Ninja -e', note: 'MSVC、Windows SDK、CMake 與 Ninja 缺一不可。' }
      ]},
      { id: 'linux', name: 'Linux', icon: '🐧', shell: 'Bash（Ubuntu／Debian 範例）', steps: [
        { title: '安裝 GCC、Clang 與工具', command: 'sudo apt update\nsudo apt install -y build-essential clang clangd cmake ninja-build gdb valgrind', note: 'Fedora 可使用 Development Tools、clang、cmake、ninja-build、gdb 與 valgrind。' }
      ]},
      { id: 'macos', name: 'macOS', icon: '◆', shell: 'Terminal（zsh）', steps: [
        { title: '安裝 Apple Clang 與建置工具', command: 'xcode-select --install\nbrew install cmake ninja llvm', note: 'Apple clang 隨 Command Line Tools 提供；Homebrew LLVM 安裝在獨立路徑。' }
      ]}
    ],
    verify: 'cc --version\nc++ --version\ncmake --version\nninja --version',
    create: '建立 main.cpp 與 CMakeLists.txt 後執行：\ncmake -S . -B build -G Ninja -DCMAKE_BUILD_TYPE=Debug\ncmake --build build\nctest --test-dir build --output-on-failure',
    editor: 'VS Code：安裝 C/C++、CMake Tools；Linux/macOS 可加 clangd，避免同時啟用兩套語言伺服器。',
    checklist: ['編譯器、CMake、Ninja 均可執行', 'Debug 組態可下中斷點', '建置目錄與原始碼分離'],
    troubleshooting: ['Windows 一般 PowerShell 找不到 cl：改用 Developer PowerShell。', 'CMake 快取記住舊編譯器時，刪除單一專案的 build 目錄後重設。', 'macOS 的 Apple clang 與 Homebrew LLVM 路徑不同，專案應明確選擇。'],
    official: [{ label: 'Visual Studio C++ 工具', url: 'https://visualstudio.microsoft.com/vs/features/cplusplus/' }, { label: 'CMake 教學', url: 'https://cmake.org/cmake/help/latest/guide/tutorial/' }, { label: 'LLVM 文件', url: 'https://clang.llvm.org/docs/' }]
  },
  'python-mojo': {
    title: 'Python／Mojo 開發環境安裝', intro: 'Python 使用獨立虛擬環境；Mojo 工具鏈更新較快，另建專用環境。Windows 的 Mojo 建議在 WSL2 Ubuntu 中執行。',
    platforms: [
      { id: 'windows', name: 'Windows 10／11', icon: '⊞', shell: 'PowerShell＋WSL2', steps: [
        { title: '安裝 Python 與 Git', command: 'winget install --id Python.Python.3.13 -e\nwinget install --id Git.Git -e\npy -3.13 --version', note: '安裝後重新開啟 PowerShell。Python 專案使用 py 啟動器最穩定。' },
        { title: '為 Mojo 安裝 WSL2', command: 'wsl --install -d Ubuntu\nwsl --update', note: '重新啟動後進入 Ubuntu，再依 Linux 分頁安裝 Mojo；不要混用 Windows 與 WSL 的虛擬環境。' }
      ]},
      { id: 'linux', name: 'Linux', icon: '🐧', shell: 'Bash（Ubuntu／Debian 範例）', steps: [
        { title: '安裝 Python 基礎工具', command: 'sudo apt update\nsudo apt install -y python3 python3-venv python3-pip pipx git curl', note: '不要直接以 sudo pip 安裝專案套件。' },
        { title: '安裝 Mojo 環境管理器', command: 'curl -fsSL https://pixi.sh/install.sh | bash\nsource ~/.bashrc\npixi --version', note: 'Mojo 發布方式可能更新；建立環境前核對 Modular 官方下載頁的最新 channel 指令。' }
      ]},
      { id: 'macos', name: 'macOS', icon: '◆', shell: 'Terminal（zsh）', steps: [
        { title: '安裝 Python 與工具', command: 'xcode-select --install\nbrew install python git pixi\npython3 --version\npixi --version', note: 'Intel／Apple Silicon 的 Mojo 支援狀態請以 Modular 官方相容性表為準。' }
      ]}
    ],
    verify: 'python3 --version  # Windows 可用 py -3.13 --version\npython3 -m pip --version\npixi --version\nmojo --version      # 進入 Mojo 專用環境後',
    create: 'python3 -m venv .venv\nsource .venv/bin/activate   # Windows: .\\.venv\\Scripts\\Activate.ps1\npython -m pip install --upgrade pip\npython -c "print(\'Python ready\')"\n\n# Mojo：依 Modular 官方目前指令建立獨立 pixi 環境，再執行 mojo --version',
    editor: 'VS Code：安裝 Python、Pylance、Jupyter；每個專案選擇 .venv 直譯器。Mojo 使用官方擴充套件。',
    checklist: ['Python 專案已建立並啟用 .venv', 'pip 指向 .venv 內的路徑', 'Mojo 位於獨立環境且 mojo --version 成功'],
    troubleshooting: ['python 指到錯誤版本：Windows 用 py -0p，Unix 用 which python3。', 'PowerShell 禁止啟用腳本時，只調整 CurrentUser 執行原則，不要關閉整台機器安全限制。', 'Mojo 套件或 channel 不存在：以 Modular 官方下載頁為準，舊教學指令可能已失效。'],
    official: [{ label: 'Python 下載', url: 'https://www.python.org/downloads/' }, { label: 'Python venv', url: 'https://docs.python.org/3/library/venv.html' }, { label: 'Mojo 官方下載', url: 'https://www.modular.com/mojo' }]
  }
};

export function getProgrammingEnvironmentGuide(key) {
  return programmingEnvironmentGuides[key] || null;
}
