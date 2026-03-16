# 🌟 單字領域展開 (Vocabulary Domain Expansion) - 教師專屬部署版

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/pyfbsdk59/shjhs-voc-games/)

這是一套專為教育現場打造的**「全端單字遊戲化學習系統」**。
透過本專案，任何老師都能在 **5 分鐘內免寫程式**，一鍵建立屬於自己的獨立單字教學網站與專屬資料庫。學生遊玩的數據、老師的題庫，皆與原作者完全獨立，百分之百掌握在您自己手中！

## ✨ 系統核心特色

- **🎮 四大遊戲模式**：包含「單字方塊消消樂」、「單字神移動」、「單字選選樂」、「單字填一填」，涵蓋認字、拼寫與直覺反應訓練。
- **🎨 20 種沈浸式主題**：從「現代復古」、「靜默純灰」到「賽博龐克」、「鬼滅之刃」等多達 20 種極致視覺風格，學生可一鍵自由切換，大幅提升刷題黏著度。
- **📊 獨立教師控制中心**：具備強大的後台管理，可一鍵匯入 CSV 題庫、管理學生名單、觀看全班成績總表。
- **📈 深度學習數據分析**：系統會自動計算每位學生的「各單元平均分數」、「單字反應秒數」，並統整出「錯誤率最高 Top 10 單字」，精準抓出教學盲點。
- **🕵️ 實名與匿名雙軌分流**：支援學生綁定學號登入，也支援全自動配發設備碼的「匿名訪客模式」，兩者成績獨立排行，適合隨堂測驗或公開挑戰。

---

## 🚀 5 分鐘無痛架站指南 (免寫程式版)

只要跟著以下 3 個大步驟，即可擁有您的專屬教學網站！

### 第一步：註冊三大免費神器帳號
本系統架構完全採用企業級的雲端免費方案，足以應付全校數百人同時上線。請先準備好以下三個帳號：
1. 註冊 [GitHub](https://github.com/) (存放網站原始碼的倉庫)
2. 註冊 [Vercel](https://vercel.com/) (負責發佈網站，建議直接使用 GitHub 帳號連動登入)
3. 註冊 [Supabase](https://supabase.com/) (您的雲端專屬資料庫)

---

### 第二步：一鍵建立您的專屬資料庫 (Supabase)
1. 登入 Supabase，點擊「**New Project**」建立一個新專案（請牢記您設定的資料庫密碼）。
2. 等待專案建立完成後，點擊左側選單的 **SQL Editor**，選擇「**New Query**」。
3. 複製下方框框內的「全部 SQL 語法」，貼上後點擊右下角的 **Run (執行)**。
   *(看到 Success 就代表資料庫的地基已經全部蓋好了！)*

<details>
<summary>👉 點擊展開複製 SQL 建表語法</summary>

```sql
-- 1. 建立學生資料表
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255) UNIQUE NOT NULL,
    real_name VARCHAR(50) NOT NULL,
    hidden_name VARCHAR(50),
    class_name VARCHAR(20),
    seat_number INT,
    birthdate DATE,
    school VARCHAR(100) DEFAULT '我的學校'
);

-- 2. 建立單字題庫表
CREATE TABLE IF NOT EXISTS vocabularies (
    id SERIAL PRIMARY KEY,
    version VARCHAR(50),
    volume VARCHAR(20),
    unit VARCHAR(50),
    en_us VARCHAR(100) NOT NULL,
    zh_tw VARCHAR(100) NOT NULL
);

-- 3. 建立遊戲紀錄表
CREATE TABLE IF NOT EXISTS game_records (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(255),
    game_type VARCHAR(50) DEFAULT '單字方塊消消樂',
    version VARCHAR(50),
    volume VARCHAR(20),
    unit_played VARCHAR(50),
    score INT DEFAULT 0,
    time_taken_seconds INT DEFAULT 0,
    mistakes INT DEFAULT 0,
    wrong_words TEXT,
    correct_words TEXT,
    word_intervals JSONB,
    attempt_number INT DEFAULT 1,
    played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(50),
    device_info TEXT
);

-- 4. 建立系統設定表與預設值
CREATE TABLE IF NOT EXISTS system_settings (
    id INT PRIMARY KEY,
    move_game_time_limit INT DEFAULT 20,
    fill_game_time_limit INT DEFAULT 20
);
INSERT INTO system_settings (id, move_game_time_limit, fill_game_time_limit) 
VALUES (1, 20, 20) ON CONFLICT (id) DO NOTHING;
</details>

接著，點擊左下角的 ⚙️ Project Settings -> 選擇 API。

請找到畫面上方的 Project URL 和 Project API keys (anon public)，將這兩串英數字複製下來備用，這非常重要！

第三步：點擊按鈕，網站上線！ (Vercel)
回到本頁面的最上方，點擊那顆藍色的 「Deploy with Vercel」 按鈕。

Vercel 會要求您建立一個新的存放區 (Create Git Repository)，請隨便幫您的網站取個英文名字，然後點擊 Create。

⚠️ 最重要的一步：在進入部署前，畫面會出現一個 「Environment Variables (環境變數)」 的區塊。

第一格 Name 請輸入：SUPABASE_URL，Value 貼上您剛剛在 Supabase 複製的 URL。

點擊 Add 新增第二格，Name 輸入：SUPABASE_KEY，Value 貼上剛剛複製的 API Key。

點擊 Deploy！等待大約 1 到 2 分鐘，當畫面撒下慶祝的紙花 🎉 時，恭喜您，專屬網站已經正式上線！

👨‍🏫 老師如何開始使用？ (控制中心設定)
網站上線後，點擊 Vercel 提供的網址進入您的首頁。

1. 進入老師後台
在您的網站網址後方加上 /admin/login (例如 https://您的網址.vercel.app/admin/login)。

預設管理員密碼：168168168

2. 新增學生與題庫
進入後台後，您可以前往「🧑‍🎓 管理學生名單」手動建立班級與學生資料（含登入用的學號與生日）。

前往「📁 匯入單字題庫」，準備一份包含 version (版本), volume (冊數), unit (單元), en_us (英文), zh_tw (中文) 欄位的 CSV 檔案並上傳。

上傳成功後，學生即可在首頁下拉選單看見您準備的教材，並開始進行挑戰！

🛠️ 技術架構 (For Developers)
Frontend Framework: Nuxt 3 / Vue 3

Styling: Pure CSS with Dynamic CSS Variables (No external UI library dependency)

Backend / Database: Supabase (PostgreSQL)

Deployment: Vercel Edge Network

Zero Server Load Architecture: Game logic runs purely on the client-side browser, ensuring high concurrency support for classroom environments without backend bottlenecks.

Created with ❤️ for Better Education.