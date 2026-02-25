# AuthRole Prototype Spec（2026-02-25）

本文件描述 AuthRole（角色主檔）的 prototype 規格、欄位解讀、UI/互動流程、以及實作注意事項。

- Prototype 路徑：`file/AuthRole/`
- 技術：Pure HTML / CSS / Vanilla JS（無框架、無後端、in-memory 假資料）
- 主要參考文件：`[技術規格書] 權限模組_02_角色主檔(AuthRole)`
  - 交叉理解：`[技術規格書] 權限模組_04_主體角色關聯(AuthRelationPrincipalRole)`、`[技術規格書] 權限模組_07_授權設定表(AuthRelationGrant)`

---

## 1. 文件解讀重點（AuthRole 的架構位置）

1) **AuthRole 是 RBAC 的「Role」定義核心**
- 角色透過 AuthRelationPrincipalRole 指派給 User/Group。
- 角色透過 AuthRelationGrant 對 Resource + Action 授權。

2) **AuthRole 會被大量下游資料參照**
- AuthRelationPrincipalRole.RoleCode → AuthRole.RoleCode
- AuthRelationGrant.RoleCode → AuthRole.RoleCode
- 因此 RoleCode 是高穩定性識別碼：一旦被指派/授權引用，不建議任意變更。

3) **CRUD guardrails（文件重點）**
- Delete：刪除前必須檢查是否仍存在 PrincipalRole 指派；萬人系統不建議物理刪除，優先 IsActive=0。
- Update：變更 IsActive/權限範圍需做 Redis 權限快取失效；IsAdmin 變更屬高風險事件。
- Concurrency：更新需檢查 RowVersion（Optimistic Lock）。

---

## 2. Prototype 關鍵決策（你已確認）

- **主鍵欄位**：Prototype 以 `RoleId` 當主鍵（PK）。
- **RoleCode 的定位**：`RoleCode` 為邏輯唯一碼（UNIQUE），且所有關聯（指派/授權）以 RoleCode 參照。
- **Delete 策略**：提供 soft + hard 兩段式刪除
  - Search(Index) row 上的 Delete：soft delete（IsActive=0）
  - Drawer（Edit 模式）提供 Hard Delete：需通過 guardrail（無任何指派/授權參照）
- **Priority 解讀**：決策優先序仍以安全為主（Deny 最高）。Priority 只作為「在 Allow 候選中」的輔助排序概念（prototype 不做完整權限引擎）。

---

## 3. 欄位解讀與注意事項（UI/驗證觀點）

> 依 AuthRole 欄位表整理。

- **RoleId**（必填）
  - 文件：實體 PK。
  - UI：prototype 自動生成、唯讀。

- **RoleCode**（必填 / UNIQUE / 關聯核心）
  - 文件：業務關聯代碼、程式碼判斷依據。
  - 重要性：被指派/授權引用的外鍵識別。
  - UI：Add 可輸入；Edit 鎖定（避免破壞下游參照）。
  - 驗證：case-insensitive UNIQUE。

- **RoleName**（必填）
  - UI 顯示名稱。

- **RoleDesc**（可空）
  - UI 長文字。

- **IsAdmin**（必填）
  - 文件：最高權限標記；通常可繞過細節權限檢查。
  - UI：可編輯；若設為 1 顯示明顯提醒（正式系統應要求輸入原因+安全日誌）。

- **IsActive**（必填）
  - 文件：停用後該角色下所有使用者失去授權；並需清快取。
  - UI：可編輯；Delete(soft) 亦是設為 0。

- **Priority**（必填）
  - 文件：衝突解析優先序。
  - 注意：Grant 文件採 Deny-Override/Explicit-Allow；Priority 的實際應用需在整體決策引擎中定義清楚。
  - UI：可編輯；prototype 僅保存與提供查詢。

- **Tags**（可空 / JSON 字串）
  - 文件：JSON 擴充標籤。
  - UI：textarea；若填寫必須為合法 JSON。

- **Audit Fields**（CreatedBy/CreatedDate/ModifiedBy/ModifiedDate）
  - UI：唯讀顯示。

- **RowVersion**（必填）
  - 文件：Optimistic Lock。
  - UI：唯讀顯示；prototype 以數字遞增模擬，儲存時做版本一致性檢查。

---

## 4. Prototype 功能範圍

### 4.1 Search / Index
- 查詢條件：RoleCode、RoleName、IsAdmin、IsActive、Tags contains、Priority min/max
- 結果表格欄位：RoleId、RoleCode、RoleName、IsAdmin、IsActive、Priority、Tags、ModifiedDate
- Row Actions：Detail / Edit / Delete（soft）

### 4.2 Detail
- 以右側 drawer 檢視完整欄位（唯讀）

### 4.3 Add New
- 以 drawer 新增角色
- RoleId 自動生成
- RoleCode/RoleName/Priority 必填

### 4.4 Edit
- RoleCode 鎖定
- 可編輯：RoleName、RoleDesc、IsAdmin、IsActive、Priority、Tags
- 儲存時檢查 RowVersion

### 4.5 Delete
- **Soft delete（列表 Delete）**：將 IsActive 設為 0
- **Hard delete（Edit drawer）**：
  - guardrail：若仍有 Active 指派（AuthRelationPrincipalRole）或 Active 授權（AuthRelationGrant）參照，則禁止
  - 需二次 confirm

---

## 5. 與其他表的關聯（prototype 模擬）

為了能展示 hard delete guardrail，prototype 內建最小關聯資料：
- `PRINCIPAL_ROLES`：模擬 AuthRelationPrincipalRole（以 RoleCode 連到 AuthRole）
- `GRANTS`：模擬 AuthRelationGrant（以 RoleCode 連到 AuthRole）

Drawer 的 References 區塊顯示：
- Assigned principals（active count）
- Grants（active count）

---

## 6. 已知簡化（prototype 與正式系統差異）

- 無 DB / 無 API：資料為前端記憶體，重新整理即重置。
- 未實作 Redis cache invalidate（僅以提示文字保留文件重點）。
- 未實作完整權限決策引擎（Priority/Deny/Allow 的整體運算在此頁僅作資料維護展示）。

---

## 7. 製作心得與正式版注意事項

- **RoleCode 需要強約束與變更流程**：它是大量 FK 的樞紐；建議後端直接限制不可變或以 migration 流程處理。
- **刪除策略務必以可回收為主**：文件提到萬人系統鎖表風險，IsActive=0 是可控做法。
- **IsAdmin 變更應納入稽核**：建議強制 reason + 寫安全日誌；也要有雙人覆核或 RBAC 再授權的機制。
- **RowVersion 是必要的**：權限資料常被多管理員同時調整，沒有 optimistic lock 很容易覆蓋設定。
