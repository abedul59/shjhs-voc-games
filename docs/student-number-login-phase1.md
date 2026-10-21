# 七年級正式學號雙重登入：第一階段

長期逐年過渡與全面學號制規劃見 `docs/student-number-login-roadmap.md`。

## 設計原則

- `students.student_id` 保持原值（班級＋兩位座號），繼續作為遊戲進度、登入紀錄及其他功能的既有關聯鍵。
- `students.school_student_id` 僅作為新的正式學號登入識別碼。
- 正式學號登入與舊制登入都會取得同一筆學生資料，因此不會建立第二套進度。
- 第一階段只接受 701～710 班；八、九年級維持舊制。
- 學生繼續使用原有 `pin_code`，本階段不變更密碼。

## 上線順序

1. 在正式 Supabase SQL Editor 執行 `supabase/sql-editor/dual_student_number_login_existing_project_setup.sql`。
2. 部署網站程式；資料庫開關預設為關閉，因此部署後仍是原有單軌制。
3. 進入「學生名單管理」，匯入含 `班級,座號,姓名,學號` 的 CSV。系統會核對既有班級、座號與姓名，只更新正式學號。
4. 抽查七年級學生的正式學號與舊制帳號。
5. 進入「遊戲權限與開放時間管理」，啟用正式學號登入並儲存。
6. 分別測試同一學生的兩種登入方式，確認看到相同姓名與既有進度。

## 回復原有單軌制

總管理員可在「遊戲權限與開放時間管理」按「一鍵回復原有單軌制」。這會立即把 `system_settings.student_number_login_enabled` 設為 `false`：

- 前台重新整理後不再顯示正式學號入口。
- 班級＋座號＋原有密碼照常使用。
- 正式學號保留在資料庫，可再次啟用。
- 不刪除學生、不改密碼、不搬移或重建任何進度。

必要時也能在 SQL Editor 執行：

```sql
UPDATE public.system_settings
SET student_number_login_enabled = false
WHERE id = 1;
```

## 不建議的回復方式

不要刪除 `school_student_id` 欄位或將正式學號寫回 `student_id`。前者沒有必要，後者會切斷大量既有進度資料的關聯。
