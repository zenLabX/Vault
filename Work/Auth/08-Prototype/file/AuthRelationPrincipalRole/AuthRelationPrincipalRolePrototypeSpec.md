# AuthRelationPrincipalRole Prototype Spec（2026-02-27）

本文件描述 AuthRelationPrincipalRole（主體-角色對應）的 prototype 規格、欄位解讀、UI/互動流程、以及實作注意事項。

- Prototype 路徑：`file/AuthRelationPrincipalRole/`
- 技術：Pure HTML / CSS / Vanilla JS（無框架、無後端、in-memory 假資料）
- 主要參考文件：
  - `[技術規格書] 權限模組_04_主體角色關聯 (AuthRelationPrincipalRole)`

---

## 1. 文件解讀重點（RBAC Assignment / 權限流的神經接點）

1) **用途**
- 將「主體（User 或 Group）」指派到特定 Role。
- 使用者取得角色有兩條路徑：
  - 直接指派：User → AuthRelationPrincipalRole → Role
  - 群組繼承：User → AuthUserGroup → Group → AuthRelationPrincipalRole → Role

2) **XOR 約束（文件強調）**
- 一筆記錄只能屬於 User 或 Group 擇一：
  - `UserId` 有值時 `GroupCode` 必須為 NULL
  - `GroupCode` 有值時 `UserId` 必須為 NULL

3) **唯一性與資料污染防護（文件強調）**
- 透過 Filtered Unique Index，防止重複指派造成計算膨脹。
- `RelationCode` 為業務唯一碼（可讀性代碼）。

4) **維運/效能守則**
- 查詢需做時效過濾（GETDATE() 落在 ValidFrom/ValidTo）。
- 異動需立即失效受影響使用者的 Redis 權限快取。
- 更新需校驗 RowVersion，避免多人同時修改衝突。

---

## 1.1（補上說明）它如何串到 AuthRelationGrant / AuthUserOverride（整體權限流程）

AuthRelationPrincipalRole 本身不決定 Allow/Deny，它負責產生「某使用者目前有哪些角色（Role list）」；之後才由 AuthRelationGrant / AuthUserOverride 決定最終允許與否。

### A) 角色來源（Role list 的兩條路徑）
- 直接指派：User → AuthRelationPrincipalRole（UserId）→ Role
- 群組繼承：User → AuthUserGroup → Group → AuthRelationPrincipalRole（GroupCode）→ Role

### B) 載入/計算前必做的過濾（文件 Guardrails）
正式系統在載入某使用者角色時，至少需要過濾：
- `IsActive=1`
- 有效期：`ValidFrom/ValidTo` 與 Now 的範圍判斷（任一為 NULL 代表不限制）
- `AppCode` 範圍（文件：可空=全域；本 prototype 依決策固定 PMS）

### C) 與「最終決策」表的關係（概念順序）
- AuthUserOverride：屬於個人例外層（通常優先於角色授權）。
- AuthRelationGrant：以「Role × Resource × Action」形成決策矩陣（含 Deny Override/Explicit Allow/Default Deny）。

換句話說：
1. 先由本表（含群組路徑）取得使用者 Role list
2. 再用 Role list 去查 AuthRelationGrant 得出 Allow/Deny（同時考慮 ConditionJson 與有效期）
3. 若存在 AuthUserOverride 的命中規則，通常會覆寫/短路角色授權（依文件的 override 規則）

### D) Priority 的白話用途（需與後端一致）
文件描述：當擁有多個角色且權限衝突時，`Priority` 值較大者的授權記錄優先。

在實務上常見用法是：
- 系統需要在多個角色結果之間做「排序/挑選」時，把 Priority 當成 tie-breaker 或主要決策依據。

注意：AuthRelationGrant 文件同時存在 Deny Override 的決策策略，因此 Priority 在你們正式系統中實際如何介入（例如介入 Role list 的排序、或介入衝突決策），需要與後端/規則引擎一致；prototype 先提供欄位可維護與 guardrail 提示，不實作整體推理引擎。

---

## 2. 你已確認的 prototype 決策

- Delete：soft delete（`IsActive=0`）。
- AppCode：固定 `PMS` 且 disabled（不允許 NULL）。
- Edit：鎖定 `RelationCode + Principal(User/Group) + RoleCode + AppCode` 不可改（要改視為刪除後新增）。
- Unique：
  - User 指派：`(UserId, RoleCode, AppCode)` 唯一（UserId 不為 NULL 時適用）
  - Group 指派：`(GroupCode, RoleCode, AppCode)` 唯一（GroupCode 不為 NULL 時適用）
  - 不因 `IsActive=0` 放行（soft delete 後仍視為同一筆指派，應以重新啟用/調整有效期處理）

---

## 3. 欄位解讀與注意事項（UI/驗證觀點）

### 3.1 PK / Identity
- `PrincipalRoleCode`（NVARCHAR(40), PK）：prototype 自動產生 `PRR-...`，唯讀。

### 3.2 Business Code
- `RelationCode`（NVARCHAR(50), Unique）：業務唯一碼（例：`RPR-USER01-ADMIN`）。
- Prototype：Add 時可填（預設自動產生）；Edit 時鎖定不可改。

### 3.3 XOR 主體欄位
- `UserId`（可空，FK）：與 `GroupCode` 互斥。
- `GroupCode`（可空，FK）：與 `UserId` 互斥。
- Prototype：以 `PrincipalType`（USER/GROUP）控制顯示哪個欄位，並在 Save 驗證 XOR。

### 3.4 Role / Scope
- `RoleCode`（必填，FK）：Edit 鎖定不可改。
- `AppCode`：依決策固定 PMS。

### 3.5 Temporal
- `ValidFrom/ValidTo`：可空；需符合 `ValidFrom <= ValidTo`。
- 文件維運：讀取/載入授權時必須做 Now 的有效期過濾。

### 3.6 Priority
- `Priority`（INT, 必填）：衝突時數值較大者優先。
- Prototype：僅呈現與可編輯，不實作整體衝突判定引擎。

### 3.7 IsActive / Soft Delete
- `IsActive`（BIT, 必填）：快速停用/啟用。
- Delete（soft）：將 `IsActive=0`。

### 3.8 Audit / Concurrency
- `CreatedBy/CreatedDate/ModifiedBy/ModifiedDate`
- `RowVersion`：prototype 以數字遞增模擬；Edit Save 時做 mismatch 擋更新。

---

## 4. Prototype 功能範圍

### 4.1 Search / Index
- 條件：PrincipalType、UserId(contains)、GroupCode(contains)、RoleCode(contains)、RelationCode(contains)、IsActive。
- 列表：PrincipalRoleCode、RelationCode、PrincipalType、UserId/GroupCode、RoleCode、AppCode、Priority、IsActive、ValidFrom/ValidTo。
- Row actions：Detail / Edit / Delete(soft)。

### 4.2 Detail
- Drawer 唯讀顯示完整欄位。

### 4.3 Add New
- Drawer 新增：
  - 必填：RelationCode、RoleCode、Priority
  - XOR：UserId / GroupCode 擇一
  - 驗證：RelationCode 唯一、filtered unique、ValidFrom <= ValidTo

### 4.4 Edit
- 鎖定不可改：RelationCode / Principal(User|Group) / RoleCode / AppCode。
- 可改：Priority、ValidFrom/ValidTo、IsActive、Remark。
- Save 時檢查 RowVersion。

### 4.5 Delete（soft）
- 行為：將 `IsActive=0`。

---

## 5.（補齊）文件 Guardrails / 索引提示（prototype 以文字保留）

- 查詢效能（文件）：
  - 由人查角色：UserId 非叢集索引
  - 由角色查人：`(RoleCode, IsActive)` 複合索引
- 時效過濾：查詢需含 Now 落在 ValidFrom/ValidTo。
- 快取連鎖失效：此表異動需失效受影響使用者的 Redis 權限快取。

---

## 6. 已知簡化（prototype 與正式系統差異）

- 無 DB / 無 API：資料在前端記憶體，刷新即重置。
- 不實作真正的授權引擎（衝突判定/跨表計算），只呈現資料與 guardrails。
- 不實作 Redis purge；僅提示維運必要資訊。
