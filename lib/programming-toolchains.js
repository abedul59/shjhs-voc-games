const nodePlatforms = {
  windows: [
    { name: 'fnm', role: 'Node.js 版本管理器（推薦）', command: 'winget install --id Schniz.fnm -e\nfnm env --use-on-cd | Out-String | Invoke-Expression\nfnm install --lts\nfnm default lts-latest\nnode --version', note: '將 fnm env 指令加入 PowerShell Profile，之後進入含 .node-version 的專案會自動切換版本。' },
    { name: 'Corepack＋pnpm', role: '套件管理器', command: 'corepack enable\ncorepack prepare pnpm@latest --activate\npnpm --version', note: 'Corepack 由 Node 發行版提供；專案再用 packageManager 欄位固定 pnpm 版本。npm 可直接使用，不需另裝。' }
  ],
  linux: [
    { name: 'nvm', role: 'Node.js 版本管理器（普及）', command: 'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash\nsource "$HOME/.nvm/nvm.sh"\nnvm install --lts\nnvm alias default lts/*', note: '執行遠端安裝腳本前先閱讀官方內容。若偏好單一跨語言工具，可改用 mise。' },
    { name: 'Corepack＋pnpm', role: '套件管理器', command: 'corepack enable\ncorepack prepare pnpm@latest --activate\npnpm --version', note: '不要用 sudo 安裝全域 npm 套件；nvm 的 Node 與專案本機 devDependencies 可避免權限問題。' }
  ],
  macos: [
    { name: 'fnm 或 nvm', role: 'Node.js 版本管理器', command: 'brew install fnm\neval "$(fnm env --use-on-cd --shell zsh)"\nfnm install --lts\nfnm default lts-latest', note: '把 eval 指令加入 ~/.zshrc。若團隊既有 .nvmrc，也可 brew install nvm 並依 Homebrew 提示設定。' },
    { name: 'Corepack＋pnpm', role: '套件管理器', command: 'corepack enable\ncorepack prepare pnpm@latest --activate\npnpm --version', note: 'Apple Silicon 與 Intel 指令相同；確認 node 與 pnpm 都來自目前 fnm 版本。' }
  ]
};

const nodeToolchain = (frameworkPackages) => ({
  summary: '以 fnm／nvm 管理 Node.js LTS，以 Corepack 固定 pnpm 或 Yarn；npm 也可使用，但同一專案只提交一種 lockfile。',
  platforms: nodePlatforms,
  managers: [
    { name: 'fnm／nvm', role: '切換 Node.js 版本', bestFor: 'fnm 跨平台且快速；nvm 在 Linux／macOS 教學與既有專案最普及。' },
    { name: 'npm', role: 'Node 內建套件管理器', bestFor: '相容性最高、適合簡單專案。' },
    { name: 'pnpm', role: '高效率套件管理器（推薦）', bestFor: '節省磁碟、嚴格依賴與 monorepo workspace。' },
    { name: 'Yarn', role: '套件管理器', bestFor: '既有 Yarn workspace；新專案應透過 Corepack 固定版本。' }
  ],
  packages: frameworkPackages,
  lockfiles: ['.node-version 或 .nvmrc：固定 Node.js 版本', 'package.json 的 packageManager：固定 pnpm／Yarn 版本', 'pnpm-lock.yaml、package-lock.json 或 yarn.lock：三者只保留一種'],
  workflow: 'corepack enable\npnpm install\npnpm add zod\npnpm add -D vitest eslint\npnpm outdated\npnpm audit\npnpm run build',
  caution: '不要在同一專案交替執行 npm install、pnpm install 與 yarn；切換工具時要由團隊一次完成並重新產生唯一 lockfile。'
});

export const programmingToolchains = {
  containers: {
    summary: 'Docker Engine／Desktop 生態完整；Podman、Buildah、Skopeo 提供 daemonless 與 rootless OCI 工具鏈。Compose 管理多服務，Trivy／Cosign／Syft 負責掃描、SBOM 與簽章。',
    platforms: {
      windows: [
        { name: 'Docker Desktop＋WSL2', role: '主要 Docker 工具鏈', command: 'wsl --update\nwinget install --id Docker.DockerDesktop -e\ndocker version\ndocker compose version\ndocker buildx version', note: '以 WSL2 backend 執行 Linux containers；課程不使用 Windows containers。確認 Desktop 授權與資源設定。' },
        { name: 'Podman Desktop＋Podman machine', role: 'Rootless／daemonless 選項', command: 'winget install --id RedHat.Podman-Desktop -e\nwinget install --id RedHat.Podman -e\npodman machine init\npodman machine start\npodman info', note: 'Docker 與 Podman 可以並存，但 port、Compose provider 與 IDE context 要明確選定。' },
        { name: 'Trivy＋kubectl＋Helm', role: '安全與編排工具', command: 'winget install --id AquaSecurity.Trivy -e\nwinget install --id Kubernetes.kubectl -e\nwinget install --id Helm.Helm -e', note: '安裝後記錄版本；CI 與課程專案應固定 image／chart 版本。' }
      ],
      linux: [
        { name: 'Podman Suite', role: 'Rootless OCI 工具（推薦入門）', command: 'sudo apt update\nsudo apt install -y podman buildah skopeo uidmap slirp4netns fuse-overlayfs\npodman info\nbuildah version\nskopeo --version', note: 'Podman 管理 runtime，Buildah 建置，Skopeo 檢查與搬移 registry image。正式版本依發行版支援政策選擇。' },
        { name: 'Docker Engine Plugins', role: 'Docker／Compose／Buildx', command: '# 先依 Docker 官方文件加入 apt repository\nsudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin\ndocker compose version\ndocker buildx version', note: 'docker group 等同高權限；多人主機考慮 rootless mode 或 Podman。' },
        { name: 'Trivy＋Cosign＋kind', role: '供應鏈與本機叢集', command: '# 依各官方 repository／release checksum 安裝\ntrivy --version\ncosign version\nkind version\nkubectl version --client\nhelm version', note: '不要從未核對來源的二進位下載站安裝安全工具。' }
      ],
      macos: [
        { name: 'Docker Desktop', role: 'Docker／Compose／Buildx', command: 'brew install --cask docker\nopen -a Docker\ndocker version\ndocker compose version\ndocker buildx version', note: '容器在 Linux VM 執行；大型 bind mount 專案要評估同步效能與一致性。' },
        { name: 'Podman machine', role: 'Podman／OCI 工具', command: 'brew install podman skopeo\nbrew install --cask podman-desktop\npodman machine init\npodman machine start\npodman info', note: 'Buildah 可在 Podman machine Linux 環境使用；主機與 VM 路徑不可混為一談。' },
        { name: '供應鏈與 Kubernetes CLI', role: '掃描、簽章與本機編排', command: 'brew install trivy cosign syft kubectl kind helm\ntrivy --version\ncosign version\nkind version', note: 'Apple Silicon 優先原生 arm64 工具與 multi-arch image。' }
      ]
    },
    managers: [{ name: 'Docker Engine／Desktop', role: 'Build、Runtime、Compose', bestFor: '最廣泛文件、第三方整合與跨平台開發。' }, { name: 'Podman', role: 'Rootless daemonless runtime', bestFor: 'Linux 安全預設、systemd／Quadlet 與 OCI 工作流。' }, { name: 'Buildah＋Skopeo', role: 'Image 建置與 Registry 搬移', bestFor: '無 daemon CI、air-gap、跨 registry 管理。' }, { name: 'Kubernetes＋Helm', role: '多節點編排與套件化', bestFor: '服務數量、可用性與團隊規模確實需要叢集時。' }],
    packages: [{ group: '多服務與開發', items: 'Docker Compose、Podman Compose、Dev Containers、Testcontainers' }, { group: '資料與入口', items: 'PostgreSQL、Redis、Nginx、Traefik、Mailpit、MinIO' }, { group: '安全供應鏈', items: 'Trivy、Grype、Syft、Cosign、Gitleaks' }, { group: '維運與管理', items: 'Prometheus、Grafana、Loki、Portainer、Cockpit' }, { group: '編排與發布', items: 'kind、minikube、kubectl、Helm、Kustomize' }],
    lockfiles: ['Containerfile／Dockerfile：固定 base image tag，正式部署再記錄 digest', '.dockerignore／.containerignore：限制 build context', 'compose.yaml＋compose.lock（工具支援時）：版本化多服務設定', 'devcontainer.json：一致開發環境', 'SBOM、provenance 與簽章：隨 release image 保存', 'Kubernetes manifests／Helm Chart.lock：固定正式編排設定'],
    workflow: 'docker compose config --quiet\ndocker compose build --pull\ndocker compose up -d --wait\ndocker compose ps\ndocker compose logs --since 5m\ntrivy image app:dev\ndocker compose down\n# Podman 專案使用 podman／podman compose 對應指令並逐項驗證',
    caution: '不要使用 latest、privileged、公開 engine socket、明文 secrets 或未備份 volume；任何 down -v、prune、registry delete 與正式 context 操作前都要確認目標與可復原路徑。'
  },
  git: {
    summary: 'Git CLI 是核心；GitHub CLI 管理平台協作，Git Credential Manager／SSH Agent 保護憑證，Git LFS 處理必要的大型二進位。',
    platforms: {
      windows: [
        { name: 'winget＋Git for Windows', role: '版本安裝與更新', command: 'winget install --id Git.Git -e\nwinget install --id GitHub.cli -e\nwinget upgrade --id Git.Git\ngit update-git-for-windows', note: 'Git for Windows 同時提供 Git Bash、OpenSSH 與 Credential Manager；升級前關閉正在使用 Git 的終端機與 IDE。' },
        { name: 'GCM／SSH Agent', role: '憑證與金鑰管理', command: 'git config --global credential.helper manager\ngh auth login\nGet-Service ssh-agent\nssh-add $HOME\\.ssh\\id_ed25519', note: 'HTTPS 建議 GCM/OAuth；SSH 私鑰需 passphrase。不要使用 credential.helper store 保存純文字 token。' },
        { name: 'Git LFS＋輔助工具', role: '大型檔案與介面', command: 'winget install --id GitHub.GitLFS -e\nwinget install --id dandavison.delta -e\ngit lfs install\ngit lfs env', note: 'delta 改善 diff 閱讀但非必要；任何 GUI 操作後仍用 git status 與 git log 驗證。' }
      ],
      linux: [
        { name: '發行版套件', role: 'Git 版本安裝', command: 'sudo apt update\nsudo apt install -y git git-lfs openssh-client\ngit --version\ngit lfs install', note: '穩定伺服器優先使用發行版安全更新；需要新功能才依 Git 官方建議升級套件來源。' },
        { name: 'GitHub CLI／SSH Agent', role: '平台與認證', command: 'sudo apt install gh\ngh auth login\neval "$(ssh-agent -s)"\nssh-add ~/.ssh/id_ed25519', note: 'gh 套件來源依官方文件設定。SSH Agent 生命週期依桌面環境或 shell 管理，不輸出私鑰內容。' },
        { name: 'delta／lazygit／pre-commit', role: '常用輔助工具', command: 'sudo apt install -y pipx\npipx install pre-commit\npre-commit --version\n# delta 與 lazygit 依各自官方 release／套件來源安裝', note: '輔助工具可提升效率，但不可取代 Git 狀態模型、CI 與 code review。' }
      ],
      macos: [
        { name: 'Homebrew', role: 'Git 與平台工具版本', command: 'brew install git git-lfs gh\nbrew upgrade git git-lfs gh\ngit lfs install\nwhich -a git', note: 'Homebrew Git 通常優先於 Apple Git；確認 ~/.zshrc PATH，避免 IDE 與終端機使用不同版本。' },
        { name: 'Keychain／SSH Agent', role: '安全認證', command: 'gh auth login\nssh-add --apple-use-keychain ~/.ssh/id_ed25519\ngit config --global credential.helper osxkeychain', note: 'HTTPS 用 Keychain，SSH 用具 passphrase 金鑰；每台裝置使用不同 key 以便撤銷。' },
        { name: '常用輔助工具', role: 'Diff、TUI 與 Hooks', command: 'brew install git-delta lazygit pipx\npipx install pre-commit\npre-commit --version\nlazygit --version', note: 'delta 可設為 pager；lazygit 是 TUI。設定前先備份並了解 ~/.gitconfig 變更。' }
      ]
    },
    managers: [{ name: 'Git CLI', role: '版本控制核心', bestFor: '所有 repository；最完整且最容易診斷。' }, { name: 'GitHub CLI（gh）', role: 'PR、Issue、Release 與 Actions', bestFor: 'GitHub 平台操作與腳本自動化。' }, { name: 'GCM／SSH Agent', role: '憑證保存', bestFor: 'OAuth token 或具 passphrase SSH key，避免純文字秘密。' }, { name: 'GUI／TUI', role: '視覺化歷史與互動操作', bestFor: 'Fork、Sourcetree、GitKraken、lazygit；仍需理解 CLI 狀態。' }],
    packages: [{ group: '平台與大型檔案', items: 'GitHub CLI、Git LFS、Git Credential Manager' }, { group: 'Diff 與介面', items: 'delta、difftastic、lazygit、Fork／Sourcetree' }, { group: '品質與安全', items: 'pre-commit、Gitleaks、commitlint、git-secrets' }, { group: '歷史維護', items: 'git-filter-repo、BFG（既有 Java 工具）、GitHub secret scanning' }],
    lockfiles: ['.gitconfig：個人設定，不直接複製含憑證內容', '.gitattributes／.gitignore：專案共同規則，應提交', '.pre-commit-config.yaml：固定 hooks revision', '.gitmodules：submodule URL 與路徑', '.lfsconfig（需要時）：LFS 專案設定，不含秘密'],
    workflow: 'git status --short --branch\ngit fetch --prune\ngit diff\ngit diff --staged\ngit add -p\ngit commit\ngit push --dry-run\ngit push\ngh pr checks --watch',
    caution: '任何 reset --hard、clean -fdx、rebase 或 force push 前都先確認 repository、branch、範圍與備份；共享分支優先 revert，改寫自己的 PR branch 才使用 --force-with-lease。'
  },
  rust: {
    summary: 'rustup 是官方版本安裝器；Cargo 同時負責套件、建置、測試與發布，Cargo.lock 固定可重現版本。',
    platforms: {
      windows: [
        { name: 'rustup-init', role: '官方版本管理器', command: 'winget install --id Rustlang.Rustup -e\nrustup toolchain install stable\nrustup default stable\nrustup component add rustfmt clippy', note: '使用 windows-msvc toolchain，並先安裝 Visual Studio C++ Build Tools 與 Windows SDK。' },
        { name: 'Cargo 工具', role: '套件與開發指令', command: 'cargo install cargo-edit cargo-audit cargo-outdated\ncargo add serde --features derive\ncargo audit', note: 'cargo-edit 提供 cargo add/remove；cargo-audit 檢查 RustSec，CLI 工具安裝在使用者目錄。' }
      ],
      linux: [
        { name: 'rustup', role: '官方版本管理器', command: 'curl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh\nsource "$HOME/.cargo/env"\nrustup toolchain install stable\nrustup component add rustfmt clippy', note: '不要優先使用發行版較舊的 rustc；系統套件只負責 linker、pkg-config 與原生函式庫。' },
        { name: 'Cargo 工具', role: '套件與安全檢查', command: 'cargo install cargo-edit cargo-audit cargo-outdated\ncargo add tokio --features full\ncargo audit', note: '需要隔離安裝 CLI 時可使用 cargo-binstall 或 cargo install --locked。' }
      ],
      macos: [
        { name: 'rustup', role: '官方版本管理器', command: 'xcode-select --install\ncurl --proto "=https" --tlsv1.2 -sSf https://sh.rustup.rs | sh\nsource "$HOME/.cargo/env"\nrustup component add rustfmt clippy', note: 'rustup 會依 Apple Silicon／Intel 選擇正確 target；交叉編譯再用 rustup target add。' },
        { name: 'Cargo 工具', role: '套件與稽核', command: 'cargo install cargo-edit cargo-audit cargo-outdated\ncargo add serde --features derive\ncargo audit', note: 'Homebrew 可安裝原生相依，但 Rust toolchain 仍交給 rustup。' }
      ]
    },
    managers: [{ name: 'rustup', role: 'stable／beta／nightly 與 target', bestFor: '全平台官方標準；可用 rust-toolchain.toml 固定版本。' }, { name: 'Cargo', role: '套件、建置、測試、文件', bestFor: '所有 Rust 專案。' }, { name: 'cargo-binstall', role: '預編譯 Cargo CLI', bestFor: '縮短大型工具的安裝時間，使用前仍要確認來源。' }],
    packages: [{ group: '序列化與錯誤', items: 'serde、serde_json、anyhow、thiserror' }, { group: '非同步與 Web', items: 'tokio、axum、reqwest、tower' }, { group: 'CLI 與資料', items: 'clap、tracing、sqlx、uuid' }, { group: '測試品質', items: 'proptest、insta、criterion、cargo-audit' }],
    lockfiles: ['rust-toolchain.toml：固定 toolchain、元件與 targets', 'Cargo.toml：直接依賴與 feature', 'Cargo.lock：應用程式與 workspace 應提交'],
    workflow: 'rustup update stable\ncargo add serde --features derive\ncargo fmt --check\ncargo clippy --all-targets --all-features -- -D warnings\ncargo test --all-features\ncargo audit',
    caution: 'nightly 只在確實需要不穩定功能時使用；依賴應以最少 feature 啟用，避免編譯時間與攻擊面膨脹。'
  },

  go: {
    summary: 'Go Modules 是官方依賴機制；一般只需官方 Go 安裝器，多版本可用 golang.org/dl 或 mise 管理。',
    platforms: {
      windows: [
        { name: '官方 MSI／winget', role: 'Go 版本安裝', command: 'winget install --id GoLang.Go -e\ngo version\ngo env GOROOT GOPATH', note: '升級可執行 winget upgrade GoLang.Go；安裝後重開終端機，不手動把專案放入 GOROOT。' },
        { name: 'Go Modules', role: '套件管理', command: 'go mod init example.com/app\ngo get github.com/go-chi/chi/v5\ngo mod tidy\ngo mod verify', note: 'go.mod 宣告直接依賴，go.sum 驗證模組內容；兩者都應提交。' }
      ],
      linux: [
        { name: 'mise', role: '多版本 Go 管理器（選用）', command: 'curl https://mise.run | sh\neval "$(~/.local/bin/mise activate bash)"\nmise use --global go@latest\ngo version', note: '執行腳本前先閱讀 mise 官方內容；只需單一版本時可依 go.dev/dl 安裝官方 tarball。' },
        { name: 'Go Modules＋工具', role: '依賴與 CLI', command: 'go mod init example.com/app\ngo get github.com/go-chi/chi/v5\ngo install honnef.co/go/tools/cmd/staticcheck@latest\ngo mod tidy', note: 'go install package@version 用於 CLI；不要把工具依賴誤加進應用執行依賴。' }
      ],
      macos: [
        { name: 'Homebrew 或 mise', role: 'Go 版本安裝', command: 'brew install mise\neval "$(mise activate zsh)"\nmise use --global go@latest\ngo version', note: '單一版本也可 brew install go；團隊需要精確版本時在專案放 mise.toml。' },
        { name: 'Go Modules', role: '套件管理', command: 'go mod init example.com/app\ngo get github.com/stretchr/testify\ngo mod tidy\ngo mod verify', note: '私有模組另設 GOPRIVATE；不要關閉公開模組 checksum 驗證。' }
      ]
    },
    managers: [{ name: '官方安裝器', role: '單一 Go 版本', bestFor: '最少變動、正式建置機。' }, { name: 'mise', role: '跨語言版本管理', bestFor: '同時管理 Go、Node、Python 等多工具專案。' }, { name: 'Go Modules', role: '官方套件管理', bestFor: '所有現代 Go 專案。' }],
    packages: [{ group: 'Web 與 API', items: 'chi、gin、echo、grpc-go' }, { group: 'CLI 與設定', items: 'cobra、viper、envconfig' }, { group: '資料與產碼', items: 'pgx、sqlc、GORM、goose' }, { group: '品質與觀測', items: 'testify、zap／zerolog、OpenTelemetry、staticcheck' }],
    lockfiles: ['mise.toml（選用）：固定 Go 版本', 'go.mod：語言版本與模組需求', 'go.sum：模組內容校驗，必須提交'],
    workflow: 'go get github.com/go-chi/chi/v5\ngo mod tidy\ngo mod verify\ngofmt -w .\ngo vet ./...\nstaticcheck ./...\ngo test ./...',
    caution: '不要手改 go.sum 或 vendor 內容；更新前用 go list -m -u all 檢視，再以測試確認相容性。'
  },

  nuxt: nodeToolchain([{ group: 'Nuxt 核心', items: 'Nuxt、Vue、Vue Router、Nitro' }, { group: '狀態與資料', items: 'Pinia、VueUse、TanStack Query、Zod' }, { group: 'UI 與內容', items: 'Nuxt UI、Tailwind CSS、Nuxt Content、Nuxt Image' }, { group: '測試品質', items: 'Vitest、Vue Test Utils、Playwright、ESLint' }]),
  react: nodeToolchain([{ group: '框架', items: 'Next.js、Gatsby、Vite React、React Router' }, { group: '狀態與資料', items: 'TanStack Query、Zustand、Redux Toolkit、Zod' }, { group: 'UI 與表單', items: 'Tailwind CSS、React Hook Form、Radix UI／MUI' }, { group: '測試品質', items: 'Vitest、Testing Library、Playwright、ESLint' }]),
  svelte: nodeToolchain([{ group: '框架', items: 'Svelte、SvelteKit、官方 adapters' }, { group: '表單與資料', items: 'Superforms、Zod、TanStack Query' }, { group: 'UI', items: 'Tailwind CSS、Skeleton、Bits UI' }, { group: '測試品質', items: 'Vitest、Testing Library、Playwright、ESLint' }]),

  'java-kotlin': {
    summary: 'JDK 用 SDKMAN／mise 或系統安裝器管理；專案一律提交 Gradle Wrapper 或 Maven Wrapper，不依賴全域建置工具。',
    platforms: {
      windows: [
        { name: 'Temurin＋winget', role: 'JDK LTS 安裝', command: 'winget install --id EclipseAdoptium.Temurin.21.JDK -e\njava --version\njavac --version', note: '課程使用 JDK 21；新專案也可評估 JDK 25 LTS。IDE、JAVA_HOME 與 Gradle JVM 要指向同一版本。' },
        { name: 'Gradle／Maven Wrapper', role: '套件與建置版本鎖定', command: '.\\gradlew.bat --version\n.\\gradlew.bat dependencies\n.\\gradlew.bat test\n# Maven 專案：.\\mvnw.cmd test', note: 'Wrapper 檔案要提交；不要求每台 Windows 全域安裝同版本 Gradle/Maven。' }
      ],
      linux: [
        { name: 'SDKMAN!', role: 'JDK、Kotlin、Gradle 版本管理器', command: 'curl -s "https://get.sdkman.io" | bash\nsource "$HOME/.sdkman/bin/sdkman-init.sh"\nsdk list java\nsdk install java 21.0.8-tem\nsdk default java 21.0.8-tem', note: '候選版本字串會更新，先以 sdk list java 選 Temurin 21 或 25 LTS；可在專案產生 .sdkmanrc。' },
        { name: 'Wrapper', role: '建置與依賴管理', command: './gradlew --version\n./gradlew dependencies\n./gradlew test\n# Maven：./mvnw test', note: 'Gradle Version Catalog（libs.versions.toml）可集中管理套件版本。' }
      ],
      macos: [
        { name: 'SDKMAN! 或 Homebrew', role: 'JDK 多版本管理', command: 'curl -s "https://get.sdkman.io" | bash\nsource "$HOME/.sdkman/bin/sdkman-init.sh"\nsdk list java\nsdk install java 21.0.8-tem\nsdk env init', note: '也可 brew install --cask temurin@21；多專案切換時 SDKMAN 的 .sdkmanrc 較方便。' },
        { name: 'Gradle／Maven Wrapper', role: '套件與建置', command: './gradlew dependencyUpdates\n./gradlew test\n# Maven：./mvnw versions:display-dependency-updates', note: 'Apple Silicon 原生 JDK 應顯示 aarch64；避免誤用 Rosetta x64 JDK。' }
      ]
    },
    managers: [{ name: 'SDKMAN!', role: 'JDK／Kotlin／Gradle 切換', bestFor: 'Linux、macOS 與 WSL；支援 .sdkmanrc。' }, { name: 'Gradle', role: '建置與套件管理', bestFor: 'Kotlin DSL、Android、Kotlin 與多模組。' }, { name: 'Maven', role: '建置與套件管理', bestFor: 'Java 後端與既有企業專案。' }],
    packages: [{ group: 'Java 後端', items: 'Spring Boot、Quarkus、Micronaut、Hibernate' }, { group: 'Kotlin', items: 'Ktor、kotlinx.coroutines、kotlinx.serialization、Exposed' }, { group: '測試', items: 'JUnit 5、AssertJ、MockK／Mockito、Testcontainers' }, { group: '品質', items: 'Spotless、Checkstyle、Detekt、OWASP Dependency-Check' }],
    lockfiles: ['.sdkmanrc 或 mise.toml：固定 JDK', 'gradle-wrapper.properties／maven-wrapper.properties：固定建置工具', 'libs.versions.toml 或 dependencyManagement：集中依賴版本'],
    workflow: './gradlew dependencyUpdates\n./gradlew spotlessCheck detekt test\n./gradlew build\n# Maven 專案改用 ./mvnw verify',
    caution: '不要只寫「最新版」而忽略 LTS 與框架支援矩陣；升級 JDK、Kotlin、Gradle 與框架時應分開進行。'
  },

  csharp: {
    summary: '.NET SDK 可多版本並存，以 global.json 固定；NuGet 管理函式庫，dotnet tool-manifest 固定專案 CLI。',
    platforms: {
      windows: [
        { name: 'winget／Visual Studio Installer', role: '.NET SDK 版本安裝', command: 'winget install --id Microsoft.DotNet.SDK.10 -e\ndotnet --list-sdks\ndotnet new globaljson --sdk-version 10.0.100 --roll-forward latestFeature', note: 'SDK patch 版本請以 dotnet --list-sdks 實際結果填入；Visual Studio 需勾選 ASP.NET 或桌面工作負載。' },
        { name: 'NuGet＋dotnet tool', role: '套件與專案工具', command: 'dotnet add package Serilog.AspNetCore\ndotnet new tool-manifest\ndotnet tool install dotnet-ef\ndotnet tool restore', note: '套件版本寫入 csproj；工具版本寫入 .config/dotnet-tools.json。' }
      ],
      linux: [
        { name: 'dotnet-install', role: 'SDK 多版本安裝', command: 'curl -L https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh\nless /tmp/dotnet-install.sh\nbash /tmp/dotnet-install.sh --channel 10.0\nexport PATH="$HOME/.dotnet:$PATH"\ndotnet --list-sdks', note: '個人開發可並存多版本；正式伺服器建議依 Microsoft 發行版套件庫或容器映像固定版本。' },
        { name: 'NuGet＋tool manifest', role: '依賴與 CLI', command: 'dotnet add package FluentValidation\ndotnet new tool-manifest\ndotnet tool install dotnet-ef\ndotnet restore --locked-mode', note: 'CI 可使用 packages.lock.json 與 locked-mode，避免解析到未審查版本。' }
      ],
      macos: [
        { name: '官方 pkg／Homebrew', role: '.NET SDK 安裝', command: 'brew install --cask dotnet-sdk\ndotnet --list-sdks\ndotnet --info', note: 'Apple Silicon 確認 RID／Architecture 為 arm64；舊 x64 SDK 可能透過 Rosetta 執行。' },
        { name: 'NuGet＋tool manifest', role: '依賴與工具', command: 'dotnet add package Microsoft.EntityFrameworkCore\ndotnet new tool-manifest\ndotnet tool install dotnet-ef\ndotnet tool restore', note: '若多版本 SDK 解析錯誤，以 global.json 固定 major/minor 與 rollForward。' }
      ]
    },
    managers: [{ name: 'global.json', role: 'SDK 選擇與 roll-forward', bestFor: '所有團隊與 CI 專案。' }, { name: 'NuGet', role: '.NET 套件管理', bestFor: 'PackageReference 與中央套件版本管理。' }, { name: 'dotnet tool manifest', role: 'CLI 工具版本', bestFor: 'EF migration、format、coverage 等專案工具。' }],
    packages: [{ group: 'Web 與資料', items: 'ASP.NET Core、EF Core、Dapper、Refit' }, { group: '架構與驗證', items: 'MediatR、FluentValidation、Polly' }, { group: '觀測', items: 'Serilog、OpenTelemetry、HealthChecks' }, { group: '測試', items: 'xUnit／NUnit、FluentAssertions、Moq／NSubstitute、Testcontainers' }],
    lockfiles: ['global.json：固定 SDK 與 roll-forward', 'Directory.Packages.props：集中 NuGet 版本', 'packages.lock.json：可重現 restore', '.config/dotnet-tools.json：固定 CLI 工具'],
    workflow: 'dotnet restore --locked-mode\ndotnet format --verify-no-changes\ndotnet test -c Release\ndotnet list package --outdated\ndotnet list package --vulnerable\ndotnet publish -c Release',
    caution: 'Runtime 不能取代 SDK；套件 major 升級要核對 Target Framework、EF Provider 與 ASP.NET Core 支援版本。'
  },

  'c-cpp': {
    summary: '編譯器版本由 OS 工具鏈管理；CMake Presets 固定建置設定，vcpkg 或 Conan 管理第三方函式庫。',
    platforms: {
      windows: [
        { name: 'MSVC＋CMake', role: '編譯器與建置版本', command: 'winget install --id Microsoft.VisualStudio.2022.BuildTools -e --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"\nwinget install --id Kitware.CMake -e\nwinget install --id Ninja-build.Ninja -e', note: '使用 Developer PowerShell；MSVC toolset 與 Windows SDK 由 Visual Studio Installer 管理。' },
        { name: 'vcpkg／Conan', role: 'C/C++ 套件管理器', command: 'git clone https://github.com/microsoft/vcpkg.git C:\\dev\\vcpkg\nC:\\dev\\vcpkg\\bootstrap-vcpkg.bat\nC:\\dev\\vcpkg\\vcpkg.exe new --application\npy -m pip install --user pipx\npipx install conan', note: '新專案優先 vcpkg manifest mode 或 Conan 2；不要只使用全域 install mode。' }
      ],
      linux: [
        { name: 'GCC／Clang＋alternatives', role: '編譯器版本', command: 'sudo apt update\nsudo apt install -y gcc g++ clang clangd cmake ninja-build gdb\ncc --version\nc++ --version', note: '需要新版編譯器時使用發行版官方 toolchain repository；不要任意覆蓋 /usr/bin/cc。' },
        { name: 'Conan 2／vcpkg', role: '套件管理', command: 'python3 -m pip install --user pipx\npipx ensurepath\npipx install conan\nconan profile detect --force\nconan --version', note: 'vcpkg 亦支援 Linux；Conan profile 要明確記錄 compiler、版本、libc++ 與 build type。' }
      ],
      macos: [
        { name: 'Apple Clang／Homebrew LLVM', role: '編譯器版本', command: 'xcode-select --install\nbrew install llvm cmake ninja\n/usr/bin/clang++ --version\n$(brew --prefix llvm)/bin/clang++ --version', note: 'Apple Clang 與 upstream LLVM 不同；CMake Preset 應明確指定要使用哪一套。' },
        { name: 'Conan 2／vcpkg', role: '套件管理', command: 'brew install pipx\npipx ensurepath\npipx install conan\nconan profile detect --force\nconan --version', note: 'Apple Silicon profile 應為 armv8；依賴若只有 x86_64 版本，不要無意間混合架構。' }
      ]
    },
    managers: [{ name: 'vcpkg', role: 'C/C++ 套件管理', bestFor: '跨平台 manifest、Visual Studio 與 CMake 整合。' }, { name: 'Conan 2', role: '二進位套件與 profile', bestFor: '多編譯器、多組態、私有 remote。' }, { name: 'CMake Presets', role: '建置設定版本化', bestFor: '統一本機與 CI 的 compiler、generator、cache。' }],
    packages: [{ group: '基礎', items: 'fmt、spdlog、Boost、Abseil' }, { group: '資料與網路', items: 'nlohmann/json、cpr、libcurl、Protobuf／gRPC' }, { group: '測試', items: 'Catch2、GoogleTest、Google Benchmark' }, { group: '品質', items: 'clang-format、clang-tidy、cppcheck、Sanitizers' }],
    lockfiles: ['CMakePresets.json：版本化共用建置設定', 'vcpkg.json＋builtin-baseline：固定 vcpkg 依賴', 'conanfile.py／txt＋lockfile：固定 Conan graph'],
    workflow: 'conan install . --output-folder=build --build=missing\ncmake --preset debug\ncmake --build --preset debug\nctest --preset debug --output-on-failure\n# vcpkg 專案改用 manifest preset',
    caution: '不可混用不同 compiler ABI、runtime、CPU 架構或 Debug/Release 二進位；套件管理器設定必須與 CMake toolchain 一致。'
  },

  php: {
    summary: 'Composer 是標準套件管理器；Windows 可用 Herd／Scoop 管理 PHP，Linux/macOS 多版本可用 mise、phpenv 或系統套件。',
    platforms: {
      windows: [
        { name: 'winget／Laravel Herd', role: 'PHP 版本安裝與切換', command: 'winget install --id PHP.PHP.8.4 -e\nwinget install --id Composer.Composer -e\nphp --version\ncomposer --version', note: 'CLI 課程可用 winget；需要多版本與本機站點時可選 Laravel Herd for Windows，並確認終端機 PATH 的 php 來源。' },
        { name: 'Composer', role: '套件與專案工具', command: 'composer init\ncomposer require monolog/monolog\ncomposer require --dev phpunit/phpunit phpstan/phpstan\ncomposer audit', note: 'composer.json 宣告約束，composer.lock 固定實際版本；應用程式必須提交 lockfile。' }
      ],
      linux: [
        { name: 'mise／系統套件', role: 'PHP 多版本管理', command: 'curl https://mise.run | sh\neval "$(~/.local/bin/mise activate bash)"\nmise use --global php@8.4\nphp --version', note: 'mise 編譯 PHP 時需先安裝 build dependencies；正式伺服器通常使用發行版受支援套件或官方容器。' },
        { name: 'Composer', role: '套件管理', command: 'composer init\ncomposer require symfony/console\ncomposer require --dev pestphp/pest phpstan/phpstan\ncomposer validate --strict\ncomposer audit', note: '不要 sudo composer；全域 CLI 可用 composer global，但專案品質工具宜放 require-dev。' }
      ],
      macos: [
        { name: 'Homebrew／Herd／mise', role: 'PHP 版本管理', command: 'brew install php composer\nphp --version\ncomposer --version\n# 多版本可改用：brew install mise && mise use --global php@8.4', note: 'Herd 提供方便的 PHP 切換與本機 HTTPS；CLI 顯示版本必須與 Web Server 使用版本一致。' },
        { name: 'Composer', role: '依賴與工具', command: 'composer require guzzlehttp/guzzle\ncomposer require --dev phpunit/phpunit phpstan/phpstan friendsofphp/php-cs-fixer\ncomposer outdated --direct\ncomposer audit', note: 'Homebrew PHP 升級後若 extension 失效，先確認 php --ini 與 pecl 對應版本。' }
      ]
    },
    managers: [{ name: 'Composer', role: 'PHP 標準套件管理', bestFor: '所有 PHP 專案與 PSR-4 autoload。' }, { name: 'mise／phpenv', role: 'PHP 多版本切換', bestFor: 'Linux／macOS 開發者與多語言專案。' }, { name: 'Laravel Herd', role: 'PHP＋本機 Web 環境', bestFor: 'Windows／macOS 的 Laravel 與多版本快速切換。' }],
    packages: [{ group: '框架', items: 'Laravel、Symfony、Slim、API Platform' }, { group: 'HTTP 與日誌', items: 'Guzzle、Monolog、PSR interfaces' }, { group: '測試分析', items: 'PHPUnit／Pest、PHPStan／Psalm、PHP-CS-Fixer' }, { group: '資料與品質', items: 'Doctrine、Carbon、Ramsey UUID、Composer Audit' }],
    lockfiles: ['.tool-versions／mise.toml：固定 PHP 版本', 'composer.json：版本約束、scripts 與 autoload', 'composer.lock：應用程式必須提交並在 CI 使用 composer install'],
    workflow: 'composer validate --strict\ncomposer install\ncomposer require monolog/monolog\ncomposer outdated --direct\ncomposer audit\nvendor/bin/phpstan analyse\nvendor/bin/phpunit',
    caution: '不要手改 vendor 或以 composer update 取代正式部署的 composer install；PHP extension 也要列入環境檢查。'
  },

  'python-mojo': {
    summary: '新 Python 專案推薦 uv 統一管理 Python、虛擬環境與套件；Poetry 適合既有 pyproject 工作流，pyenv 專注直譯器切換。Mojo 另用 pixi。',
    platforms: {
      windows: [
        { name: 'uv', role: 'Python 版本、環境與套件（推薦）', command: 'winget install --id astral-sh.uv -e\nuv python install 3.14\nuv init python-lab\ncd python-lab\nuv add requests\nuv run python --version', note: 'uv 可避免系統 Python 汙染；uv.lock 要提交。若 winget 找不到，依 Astral 官方 PowerShell 安裝方式。' },
        { name: 'pyenv-win／Poetry', role: '既有工作流選項', command: 'winget install --id pyenv.pyenv-win -e\npyenv install --list\npyenv install 3.14.0\npyenv local 3.14.0\npipx install poetry\npoetry env use 3.14', note: 'pyenv-win 與 uv 都能管理 Python，單一專案擇一為主；Poetry 透過 pipx 隔離安裝。' },
        { name: 'WSL2＋pixi', role: 'Mojo 環境', command: 'wsl --install -d Ubuntu\n# 進入 Ubuntu 後：curl -fsSL https://pixi.sh/install.sh | bash\npixi --version', note: 'Mojo 在 Windows 建議使用 WSL2，且不要混用 Windows 與 Linux 的 .venv。' }
      ],
      linux: [
        { name: 'uv', role: 'Python 全方位管理器（推薦）', command: 'curl -LsSf https://astral.sh/uv/install.sh | sh\nsource "$HOME/.local/bin/env"\nuv python install 3.14\nuv init python-lab\ncd python-lab\nuv add fastapi pytest ruff', note: '先閱讀官方腳本；uv 會建立 .venv、pyproject.toml 與 uv.lock，平常用 uv run 執行。' },
        { name: 'pyenv＋Poetry', role: '直譯器與發布工作流', command: 'curl https://pyenv.run | bash\n# 依 pyenv 文件把 init 加入 shell 後：\npyenv install 3.14.0\npyenv local 3.14.0\npipx install poetry\npoetry install', note: 'pyenv 編譯 Python 前需安裝 openssl、zlib、readline、sqlite 等 build dependencies。' },
        { name: 'pixi', role: 'Mojo 與 Conda 生態', command: 'curl -fsSL https://pixi.sh/install.sh | bash\nsource ~/.bashrc\npixi --version\n# Mojo channel 與建立指令以 Modular 官方頁面為準', note: 'Mojo 發布方式仍可能調整，與 Python .venv 分開管理。' }
      ],
      macos: [
        { name: 'uv', role: 'Python 全方位管理器（推薦）', command: 'brew install uv\nuv python install 3.14\nuv init python-lab\ncd python-lab\nuv add polars pytest ruff\nuv sync', note: 'uv 管理的 Python 不取代 macOS 系統 Python；專案透過 .python-version 與 uv.lock 重現。' },
        { name: 'pyenv＋Poetry', role: '傳統多版本與發布', command: 'brew install pyenv pipx\npyenv install 3.14.0\npyenv local 3.14.0\npipx ensurepath\npipx install poetry\npoetry install', note: 'Apple Silicon 檢查 Python 為 arm64；不要在同一專案同時提交 poetry.lock 與 uv.lock。' },
        { name: 'pixi', role: 'Mojo 環境', command: 'brew install pixi\npixi --version\n# 依 Modular 官方相容性表建立 Mojo 環境', note: '先確認目前 Mojo 是否支援你的 macOS 版本與 CPU 架構。' }
      ]
    },
    managers: [{ name: 'uv', role: 'Python、venv、套件與 lock', bestFor: '新專案首選，速度快且能取代多數 pip／venv／pip-tools 工作。' }, { name: 'Poetry', role: '依賴解析、打包與發布', bestFor: '既有 Poetry 專案與 PyPI library workflow。' }, { name: 'pyenv／pyenv-win', role: '多 Python 直譯器', bestFor: '需測試多個 CPython 版本的專案。' }, { name: 'pixi', role: 'Conda 套件與 Mojo', bestFor: 'Mojo、資料科學與非 Python 原生依賴。' }],
    packages: [{ group: 'Web 與 API', items: 'Django、FastAPI、Pydantic、HTTPX' }, { group: '資料與 AI', items: 'NumPy、Polars／pandas、Jupyter、PyTorch' }, { group: '測試品質', items: 'pytest、Ruff、mypy／Pyright、coverage.py' }, { group: 'CLI 與設定', items: 'Typer、Rich、Click、pydantic-settings' }],
    lockfiles: ['.python-version：固定 CPython 版本', 'pyproject.toml：專案 metadata 與直接依賴', 'uv.lock 或 poetry.lock：同一專案選一種並提交', 'pixi.toml＋pixi.lock：Mojo／pixi 環境'],
    workflow: 'uv python pin 3.14\nuv add fastapi pydantic\nuv add --dev pytest ruff mypy\nuv lock --check\nuv run ruff check .\nuv run pytest\nuv sync --locked',
    caution: '不要 sudo pip install，也不要把 uv、Poetry、pipenv、Conda 的 lockfile 混在同一專案；先依專案既有工具決定唯一來源。'
  }
};

export function getProgrammingToolchainGuide(key) {
  return programmingToolchains[key] || null;
}
