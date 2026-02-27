# AuthRelationGrant Prototype Spec（2026-02-26）

本文件描述 AuthRelationGrant（授權設定表）的 prototype 規格、欄位解讀、UI/互動流程、以及實作注意事項。

- Prototype 路徑：`file/AuthRelationGrant/`
- 技術：Pure HTML / CSS / Vanilla JS（無框架、無後端、in-memory 假資料）
- 主要參考文件：
  - `[技術規格書] 權限模組_07_授權設定表 (AuthRelationGrant)`

---

## 1. 文件解讀重點（AuthRelationGrant 是決策矩陣 / 高頻核心表）

1) **決策矩陣**
- 一筆授權代表「某角色(RoleCode) 對某資源(ResourceKey) 執行某動作(ActionCode) 的准許或拒絕」。

2) **決策優先級（Resolution Strategy）**
- Deny Override：多角色下，只要任何角色命中 `Effect=0 (DENY)` → 最終拒絕。
- Explicit Allow：若無 Deny 且至少一筆 `Effect=1 (ALLOW)` → 允許。
- Default Deny：完全無命中 → 拒絕。

3) **Hybrid RBAC/ABAC**
- RBAC：透過 RoleCode 做基礎綁定。
- ABAC：透過 `ConditionJson` 做動態條件（例：只能讀取 Factory='T1' 的資料）。

4) **高頻讀取/效能守則（文件強調）**
- 禁止 DB 層 JSON 解析：不要用 `JSON_VALUE(ConditionJson, ...)` 當查詢條件，避免全表掃描。
- Best practice：DB 只回傳 JSON 字串；由應用層解析判斷。
- 快取策略：適合以 RoleCode 做 Role-based cache；當本表異動需清除對應 Role 的 Redis Key。

---

## 2. 你已確認的 prototype 決策

- Delete：按 Delete 一律做軟刪除（`IsActive=0`）。
- Edit：`RoleCode/ResourceKey/ActionCode` 在 Edit 模式鎖定不可改（要改需刪除後新增）。
- `ConditionJson`：可空；不為空時必須是合法 JSON。

---

## 3. 欄位解讀與注意事項（UI/驗證觀點）

### 3.1 PK / Identity
- `GrantCode`（NVARCHAR(40), PK）：prototype 以 `GNT-...` 自動產生，唯讀。

### 3.2 RBAC Tuple（FK / Business Key）
- `RoleCode`（必填，FK → AuthRole.RoleCode）
- `ResourceKey`（必填，FK → AuthResource.ResourceKey）
- `ActionCode`（必填，FK → AuthAction.ActionCode）
- Prototype：Add 可選；Edit 鎖定不可改。

### 3.3 Effect（Allow / Deny）
- `Effect`（BIT, 必填）：1=ALLOW，0=DENY。
- Guardrail：UI 必須提示 Deny Override 的影響（DENY 會覆蓋其他角色的 ALLOW）。

### 3.4 IsActive（Soft Delete / 快速開關）
- `IsActive`（BIT, 必填）：用於快速開關授權規則。
- Delete（soft）：將 `IsActive=0`，並更新 Modified/RowVersion。

### 3.5 ConditionJson（ABAC, optional）
- `ConditionJson`（NVARCHAR(MAX), 可空）：ABAC 條件 JSON。
- Prototype：Save 時做 JSON 格式檢查（`JSON.parse`）。

### 3.6 Temporal
- `ValidFrom/ValidTo`（DATETIME, 可空）：生效/失效時間（NULL=立即/永不）。
- DB 約束：`ValidFrom IS NULL OR ValidTo IS NULL OR ValidFrom <= ValidTo`。
- Prototype：Save 時做 `ValidFrom <= ValidTo` 驗證。

### 3.7 Audit / Concurrency
- Audit：`CreatedBy/CreatedDate/ModifiedBy/ModifiedDate`。
- `RowVersion`：併發控制；prototype 以數字遞增模擬，Edit Save 時做 mismatch 擋更新。

---

## 4.（補齊）文件中的 Constraints & Indexes（理解 UniqueRule 與效能核心）

### 4.1 Constraints
- DateRange：`CHECK (ValidFrom IS NULL OR ValidTo IS NULL OR ValidFrom <= ValidTo)`
- Effect：`CHECK (Effect IN (0,1))`

### 4.2 Indexes（文件列出兩個核心索引）

1) `IX_AuthGrant_Validation`
- Key：`(ResourceKey, ActionCode, RoleCode)`
- Include：`(Effect, ConditionJson, ValidFrom, ValidTo, IsActive)`
- 用途：API 權限驗證 critical path（用 Resource+Action + 使用者 Role list 做比對）。

2) `IX_AuthGrant_RoleView`
- Key：`(RoleCode)`
- Include：`(ResourceKey, ActionCode, Effect)`
- 用途：後台管理檢視「某角色有哪些權限」/ 登入預載至 Role-based cache。

---

## 5. Prototype 功能範圍

### 5.1 Search / Index
- 條件：RoleCode、ResourceKey、ActionCode（contains）、Effect、IsActive、ConditionJson/Remark（contains）。
- Row actions：Detail / Edit / Delete（soft）。

### 5.2 Detail
- Drawer 唯讀顯示完整欄位。

### 5.3 Add New
- Drawer 新增：產生 GrantCode；輸入 Role/Resource/Action、Effect、IsActive、ConditionJson、ValidFrom/To、Remark。
- 驗證：
  - `ConditionJson` 若非空必須是合法 JSON。
  - `ValidFrom <= ValidTo`。
  - UniqueRule（見下一節）。

### 5.4 Edit
- 鎖定：RoleCode/ResourceKey/ActionCode 不可改。
- Save 時檢查 RowVersion。
- 仍需遵守 UniqueRule（例如你把 ConditionJson 清空且 ValidFrom/To 也清空，可能觸發衝突）。

### 5.5 Delete（soft）
- 行為：將 `IsActive=0`。

---

## 6.（你特別要求）Filtered Unique Index 規則說明（UX_AuthGrant_UniqueRule）

文件的 SQL 明確定義：

```sql
CREATE UNIQUE NONCLUSTERED INDEX UX_AuthGrant_UniqueRule
ON dbo.AuthRelationGrant(RoleCode, ResourceKey, ActionCode)
WHERE ConditionJson IS NULL AND ValidFrom IS NULL AND ValidTo IS NULL;
```

白話解釋：

- **同一組 `(RoleCode, ResourceKey, ActionCode)` 在「無條件（ConditionJson=NULL）且無期限（ValidFrom/ValidTo=NULL）」時只能存在一筆。**
- 目的：避免資料冗餘/衝突，讓「標準授權」只有一筆、最清楚。

如果真的需要同 tuple 多筆，怎麼做？
- 讓規則可區分：
  - 其中一筆加 `ConditionJson`（ABAC 條件不同），或
  - 其中一筆加 `ValidFrom/ValidTo`（時間區間不同）。

與 soft delete 的互動（重要細節）：
- 這個 UniqueRule 的 WHERE 沒有包含 `IsActive`。
- 因此就算你把那筆標準授權 soft delete（IsActive=0），它仍然滿足「ConditionJson/ValidFrom/ValidTo 都是 NULL」的條件，**DB 仍會阻止你再新增第二筆標準授權**。
- 正確做法通常是：在原本那筆上調整（例如重新啟用 `IsActive=1`，或改成有條件/有期限）。

Prototype 實作：
- 若新增/編輯造成「同 tuple 的無條件無期限」出現第二筆，prototype 會直接擋下並顯示 UniqueRule 訊息，以模擬 DB 行為。

---

## 7.（補齊）CRUD Guardrails 與 Troubleshooting（文件的維運視角）

### 7.1 Write Guardrails
- Deny 教育：UI 必須警告管理員「DENY 權重最高，會覆蓋其他角色的 ALLOW」。
- JSON 格式驗證：寫入 ConditionJson 前需驗證 JSON 格式，避免 runtime error。

### 7.2 Read 效能陷阱
- 禁止 DB 層 JSON 解析（避免全表掃描）。
- Role-based cache：本表異動需清除對應 Role 的 Redis key。

### 7.3 Troubleshooting Checklist（文件範例整理）
- 權限明明有開但進不去：
  - 是否已過期？`ValidTo < Now`
  - 是否有隱藏的 Deny？（使用者的其他角色是否命中 DENY）
  - ConditionJson 條件是否真的滿足？
- 資料暴增導致變慢：
  - 檢查核心索引（如 `IX_AuthGrant_Validation`）碎片率，必要時重建。

---

## 8. 已知簡化（prototype 與正式系統差異）

- 無 DB / 無 API：資料在前端記憶體，刷新即重置。
- 不實作真正的權限計算引擎；只呈現規則資料與 guardrails。
- 不實作 Redis purge / index maintenance；僅以提示文字保留必要的維運資訊。
