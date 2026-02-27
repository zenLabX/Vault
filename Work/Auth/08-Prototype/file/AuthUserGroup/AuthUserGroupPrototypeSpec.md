# AuthUserGroup Prototype Spec（2026-02-26）

本文件描述 AuthUserGroup（使用者群組對應表）的 prototype 規格、欄位解讀、UI/互動流程、以及實作注意事項。

- Prototype 路徑：`file/AuthUserGroup/`
- 技術：Pure HTML / CSS / Vanilla JS（無框架、無後端、in-memory 假資料）
- 主要參考文件：
  - `[技術規格書] 權限模組_10_使用者群組對應表 (AuthUserGroup)`
  - 交叉理解：`[技術規格書] 權限模組_03_使用者群組(AuthPrincipalGroup)`、`[技術規格書] 權限模組_01_AuthPrincipalUser`

---

## 1. 文件解讀重點（AuthUserGroup 在架構中的角色）

1) **AuthUserGroup 是 User → Group 的最後一公里**
- 目的：讓「一人多組」成為可維護資料，而不是程式碼邏輯。
- 權限流轉鏈：User → AuthUserGroup → AuthPrincipalGroup → AuthRelationPrincipalRole → AuthRole。

2) **跨系統權限污染防護**
- 文件強調：檢核某系統（如 PMS）權限時，查詢必須包含 `(AppCode='PMS' OR AppCode IS NULL)`，避免其它系統群組污染。
- Prototype 決策（你已確認）：AppCode 固定帶入且 disabled（不支援 NULL 全域）。

3) **時效性控制（ValidFrom/ValidTo）**
- 文件要求：權限計算/查詢需納入有效區間。
- DB 約束：`ValidFrom <= ValidTo`（任一為 NULL 允許）。

4) **Cache Invalidation**
- 文件要求：AuthUserGroup 任一增刪改，都必須立即 Purge 該使用者 Redis 權限快取。
- Prototype：只以提示文字保留重點，不實作快取。

---

## 2. Prototype 關鍵決策（你已確認）

- **AppCode**：固定帶入（disabled），prototype 以 `PMS` 模擬。
- **Delete 策略**：Index row 的 Delete 一律做 soft delete：`IsActive=0`。
- **複合主鍵不可變**：`(UserId, GroupCode)` 在 Edit 模式鎖定；若要改群組歸屬，請 Delete 舊資料後 Add 新資料。

---

## 3. 欄位解讀與注意事項（UI/驗證觀點）

### 3.1 Key / FK
- **UserId**（必填，PK，FK）
  - FK → AuthPrincipalUser.UserId。

- **GroupCode**（必填，PK，FK）
  - FK → AuthPrincipalGroup.GroupCode。

- **Uniqueness**
  - `(UserId, GroupCode)` 不可重複（複合 PK）。

### 3.2 Scope
- **AppCode**（可空）
  - 文件：空值代表全域；非空代表僅在特定系統生效。
  - Prototype：固定 PMS，不提供 NULL。

### 3.3 Temporal
- **ValidFrom / ValidTo**（可空）
  - 驗證：ValidFrom 不可晚於 ValidTo。
  - 維運建議：外包/臨時人員建議填 ValidTo。

### 3.4 Flags
- **IsActive**（必填）
  - 用途：軟刪除/行政凍結。

### 3.5 Remark
- **Remark**（可空）
  - 用途：加入原因/稽核備註。

### 3.6 Audit / Concurrency
- **Audit Fields**：唯讀顯示。
- **RowVersion**：prototype 以數字遞增模擬，Edit Save 會做版本一致性檢查。

---

## 4. Prototype 功能範圍

### 4.1 Search / Index
- 查詢條件：UserId、GroupCode、IsActive、Remark（AppCode 固定）
- 結果欄位：UserId、GroupCode、AppCode、ValidFrom、ValidTo、IsActive、Remark、ModifiedDate
- Row actions：Detail / Edit / Delete（soft）

### 4.2 Detail
- 右側 drawer 檢視完整欄位（唯讀）。

### 4.3 Add New
- 以 drawer 新增。
- 驗證：UserId/GroupCode 必填；複合 PK 不可重複；ValidFrom/ValidTo 區間合法。

### 4.4 Edit
- PK（UserId/GroupCode）鎖定不可改。
- 可編輯：ValidFrom/ValidTo、IsActive、Remark。
- Save 時檢查 RowVersion。

### 4.5 Delete（soft）
- 將 IsActive 設為 0，並更新 Modified/RowVersion。

---

## 5. 已知簡化（prototype 與正式系統差異）

- 無 DB / 無 API：資料在前端記憶體，刷新即重置。
- 未做 FK 真實查詢：僅用小型 seed lists（USERS/GROUPS）提供下拉選項。
- 未實作 AppCode=NULL（全域）與跨系統查詢 `(AppCode='PMS' OR AppCode IS NULL)` 的真實行為。

---

## 6. 製作心得與正式版注意事項

- **複合 PK 的 UX 要清楚**：Edit 不能改 UserId/GroupCode，避免 PK 變更造成資料污染。
- **有效期是常見踩雷點**：要一致地在查詢/計算納入 ValidFrom/ValidTo。
- **快取失效必做**：人組異動不清 Redis，權限會「看起來改了但用戶端沒生效」。
