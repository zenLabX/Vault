# PermViewer 權限管理查詢頁 Prototype 規格書

日期：2026-02-25

本文件描述本次在 `file/` 以 Pure HTML/CSS/JS 實作的 PermViewer Prototype（查詢 + Wide-Source 顯示 + 右側抽屜覆寫編輯）。

---

## 1. 目的與範圍

### 1.1 目的
- 提供「權限管理查詢頁」的可操作雛形，驗證查詢欄位、結果呈現形式、以及「點 R-DN 開抽屜做個人覆寫」的互動。

### 1.2 範圍
- 以 Wide-Source（Pivot）模式呈現：每列一個權限節點（System/Module/Form/Control），每個 Action 欄位顯示授權來源簡碼。
- 支援查詢表單：UserId、Module、Form、Action、AtUtc。
- 支援編輯：僅點選單筆 `R-DN` 時，右側抽屜開啟並允許設定「個人覆寫 AuthUserOverride」。

### 1.3 非範圍
- 不串後端 API、不連資料庫；所有資料與儲存皆為前端記憶體（refresh 即重置）。
- 不實作完整 RBAC/ABAC 欄位（ConditionJson、Resource 樹狀結構管理等）之 CRUD。

---

## 2. 查詢頁面

### 2.1 查詢表單欄位
- `UserId`（文字輸入）
- `Module`（文字輸入，模糊比對）
- `Form`（文字輸入，模糊比對）
- `Action`（下拉選單；空值代表全部 Actions）
- `AtUtc`（datetime-local，**以 UTC** 解讀；用於評估 ValidFrom/ValidTo）

### 2.2 查詢行為
- 點「查詢」會依當前條件重算並渲染結果表。
- `Action` 若指定，結果表僅顯示該 Action 欄位；未指定則顯示全部 Actions。
- `AtUtc` 若未填，prototype 以「現在」處理。

---

## 3. 結果表（Wide-Source / Pivot）

### 3.1 欄位
固定欄位：
- UserId
- Module
- Form
- Control

動作欄位（需求指定）：
- VIEW / CREATE / EDIT / DELETE / EXPORT / APPROVE / PRINT

### 3.2 Cell 值：授權來源簡碼
每個 Action cell 顯示下列之一：
- `O-AL`：Override Allow（個人覆寫 Allow）
- `O-DN`：Override Deny（個人覆寫 Deny）
- `R-AL`：Role Allow（角色授權 Allow）
- `R-DN`：Role Deny（角色授權 Deny）
- `—`：無來源 / 未設定（Default Deny 的前置狀態）

### 3.2.1 顯示樣式（Prototype 視覺語意）
- `R-AL`：大綠色 pill（強調「角色允許」）
- `R-DN`：大紅色 pill（強調「角色拒絕」）
- `O-DN`：粉紅色 pill（強調「個人覆寫拒絕」）

### 3.3 決策規則（prototype 版）
給定 `(UserId, ResourceKey, ActionCode, AtUtc)`：
1. 先彙總使用者的角色（prototype 用 in-memory USER_ROLES），找有效的 `AuthRelationGrant`：
  - 任一 Effect=0 → `R-DN`（最終拒絕；不可被 override 覆蓋）
2. 若未命中 `R-DN`，再看有效的 `AuthUserOverride`：
  - Effect=1 → `O-AL`
  - Effect=0 → `O-DN`
3. 若無 override，且角色存在任一 Effect=1 → `R-AL`
4. 都沒有命中 → `null`，UI 顯示 `—`

> 注意：此規則對齊 docs 的 Deny-first 與 Default deny 概念，但仍是 demo 簡化版。

---

## 4. 編輯（右側抽屜 Drawer）

### 4.0 UI 位置
- 抽屜為「漂浮式（overlay）」右側滑出，不會推動/壓縮結果表格。

### 4.1 觸發條件
- 點選任一結果表 cell：右側抽屜滑出。
- 若該 cell 的最終來源為 `R-DN`：抽屜仍會顯示資訊，但因 `R-DN` 不可被 override 覆蓋，編輯區為鎖定狀態。

### 4.2 抽屜內容
- 顯示定位資訊：UserId、ResourceKey、Action、AtUtc、PermissionSourceShort
- Override 編輯區：Allow / Deny 兩個 checkbox
- Remark/Reason：文字輸入（對應 AuthUserOverride.Reason）

### 4.3 Allow / Deny checkbox 規則（需求）
- Allow 勾選時：Deny 自動 disabled
- Deny 勾選時：Allow 自動 disabled
- 點擊已勾選的 checkbox 會取消自身（回到未勾）
- 兩個都未勾：視為「override 未選取」
  - prototype 行為：刪除該筆 AuthUserOverride（若存在）
  - 對應 ViewModel：`PermViewerEditVM.Flag = null`

### 4.4 R-DN 的覆蓋限制（討論後採用）
- 若查詢計算結果為 `R-DN`（角色拒絕），則個人覆寫不應影響最終結果。
- Prototype 行為：抽屜仍可開啟以檢視資訊，但編輯控制與儲存按鈕為 disabled（鎖定）。

### 4.4 儲存行為
- `Flag = Y`（Allow）→ upsert AuthUserOverride，Effect=1
- `Flag = N`（Deny）→ upsert AuthUserOverride，Effect=0
- `Flag = null`（Unset）→ 移除 AuthUserOverride
- 儲存後：重算表格並關閉抽屜

---

## 5. 檔案結構

prototype 檔案皆在 `file/`：
- `file/index.html`：頁面結構（表單、表格、抽屜）
- `file/styles.css`：純 CSS（含 drawer 右側滑出）
- `file/app.js`：資料模型（in-memory）、決策與渲染、抽屜互動與儲存
- `file/PermViewerPrototypeSpec.md`：本規格書

---

## 6. 對應 ViewModels（概念對齊）

### 6.1 PermWideSourceRowVM
- 以「每列一個資源節點」+「Action → SourceShort」的方式呈現（prototype 的 table 即此概念）。

### 6.2 PermViewerEditVM
- 抽屜編輯以 `Flag` 作為最終狀態表示：
  - `Y`：Allow
  - `N`：Deny
  - `null`：未設定（不建立/刪除 override）
- `PermissionSourceShort` 在抽屜中呈現（點擊來源為 R-DN 才允許編輯）。

---

## 7. 使用方式（本機）

- 直接用瀏覽器開啟 `file/index.html` 即可。
- 建議：UserId 先用 `U001` 或 `U002` 測試（prototype 內建假資料）。
- 先查詢後，點任一 `R-DN` cell（例如 APPROVE）即可打開抽屜並設定 override。
