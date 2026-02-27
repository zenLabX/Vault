# AuthUserOverride Prototype Spec（2026-02-26）

本文件描述 AuthUserOverride（個人覆寫表）的 prototype 規格、欄位解讀、UI/互動流程、以及實作注意事項。

- Prototype 路徑：`file/AuthUserOverride/`
- 技術：Pure HTML / CSS / Vanilla JS（無框架、無後端、in-memory 假資料）
- 主要參考文件：
  - `[技術規格書] 權限模組_08_個人覆寫表 (AuthUserOverride)`

---

## 1. 文件解讀重點（AuthUserOverride 在決策流中的位置）

1) **用途：例外層（救火用）**
- 針對「特定使用者 × 特定資源 × 特定動作」做 Allow/Deny 覆寫。
- 適用情境：臨時性、單一性需求；避免動到整個 Role。

2) **優先級高於 Role（文件給了決策流程）**
- Sanity Check：先檢查 `IsActive` 與 `ValidFrom/ValidTo`。
- User Deny：若命中 `Effect=0 (DENY)`，直接拒絕（不再查 Role）。
- User Allow：若命中 `Effect=1 (ALLOW)`，直接允許（文件註記：除非有系統級全域 Deny 另行處理）。
- Role Logic：本表無命中才進入角色計算（AuthRelationGrant）。

3) **Anti-pattern / 維運**
- 文件警告：不要大量常態使用；若超過 5 人同需求應建立新 Role。
- 建議：定期清理 `ValidTo < GETDATE()` 過期資料，避免膨脹影響登入效能。

---

## 2. 你已確認的 prototype 決策

- `Reason`：**必填**（UI 層強制）。
- Delete：**軟刪除**（將 `IsActive=0`）。
- `ConditionJson`：**儲存時做 JSON 格式檢查**（允許空；若非空必須是合法 JSON）。

---

## 3. 欄位解讀與注意事項（UI/驗證觀點）

### 3.1 Composite PK / FK
- **PK**：`(UserId, ResourceKey, ActionCode)`
  - 含義：同一個人同一個功能只能有一條覆寫規則，避免邏輯衝突。
  - Prototype：Add 時檢查不可重複；Edit 時鎖定 PK 不可改。

- **FK**：
  - `UserId` → AuthPrincipalUser(UserId)
  - `ResourceKey` → AuthResource(ResourceKey)
  - `ActionCode` → AuthAction(ActionCode)
  - Prototype：用 seed 下拉選單模擬。

### 3.2 Effect
- `Effect`（BIT, 必填）
  - 1=ALLOW（特權放行）
  - 0=DENY（個人黑名單）

### 3.3 ConditionJson
- `ConditionJson`（NVARCHAR(MAX), 選填）
  - 用途：ABAC 條件限制（例如只能看某廠區）。
  - Prototype：以文字輸入呈現；Save 時若不為空必須能 `JSON.parse`。

### 3.4 Temporal
- `ValidFrom/ValidTo`（選填）
  - DB 約束：`ValidFrom <= ValidTo`（任一為 NULL 允許）。
  - Prototype：使用 `datetime-local`；Save 時做區間檢查。

### 3.5 IsActive / Soft Delete
- `IsActive`（BIT, 必填）
  - 0 表示此覆寫規則暫時無效。
- Delete（soft）：將 `IsActive=0`，並更新 Modified/RowVersion。

### 3.6 Reason（必填）
- `Reason`（NVARCHAR(200)）
  - 文件 guardrail：原因必填，否則無法稽核「為何給這個人特權」。

### 3.7 Audit / Concurrency
- `RowVersion`：併發控制。
- Prototype：以數字遞增模擬，Edit Save 時檢查 mismatch。

---

## 4. Prototype 功能範圍

### 4.1 Search / Index
- 查詢條件：UserId、ResourceKey、ActionCode（contains）、Effect、IsActive
- 結果欄位：UserId、ResourceKey、ActionCode、Effect、ValidFrom、ValidTo、IsActive、Reason、ModifiedDate
- Row actions：Detail / Edit / Delete（soft）

### 4.2 Detail
- 右側 drawer 檢視完整欄位（唯讀）。

### 4.3 Add New
- Drawer 新增，驗證：
  - PK 三欄必填且不可重複
  - `Reason` 必填
  - `ConditionJson` 若非空必須是合法 JSON
  - `ValidFrom <= ValidTo`

### 4.4 Edit
- PK（UserId/ResourceKey/ActionCode）鎖定不可改。
- 可編輯：Effect、ConditionJson、ValidFrom/ValidTo、IsActive、Reason。
- Save 時檢查 RowVersion。

### 4.5 Delete（soft）
- 將 IsActive 設為 0。

---

## 5. 已知簡化（prototype 與正式系統差異）

- 無 DB / 無 API：資料在前端記憶體，刷新即重置。
- 未實作正式決策引擎：prototype 不會真的把 Override 與 Role 計算串起來，只呈現資料與 guardrails。
- 未實作排程清理：僅在 spec 提醒維運需求。
