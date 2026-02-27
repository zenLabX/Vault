# AuthPrincipalGroup Prototype Spec（2026-02-26）

本文件描述 AuthPrincipalGroup（使用者群組主檔）的 prototype 規格、欄位解讀、UI/互動流程與實作注意事項。

- Prototype 路徑：`file/AuthPrincipalGroup/`
- 技術：Pure HTML / CSS / Vanilla JS（無框架、無後端、in-memory 假資料）
- 主要參考文件：`[技術規格書] 權限模組_03_使用者群組(AuthPrincipalGroup)`

---

## 1. 文件解讀重點

1) **定位：RBAC 的 Group 主檔（G）**
- 群組作為使用者與角色之間的「緩衝層」，支持批量角色指派。

2) **時間區間生效（ValidFrom/ValidTo）**
- 文件要求在權限計算/查詢時必須納入時間範圍過濾，避免過期群組仍釋放權限。

3) **刪除守則（Delete Guardrails）**
- 文件：刪除群組前必須確認 `AuthRelationPrincipalRole` 無關聯該 `GroupCode`。
- 文件建議：優先使用 `IsActive=0`（軟刪除/停用），降低大規模權限計算與孤兒風險。

4) **多系統 AppCode 與污染防護**
- 文件：PMS 查權限需 `(AppCode='PMS' OR AppCode IS NULL)` 以避免污染。
- Prototype 決策（你已確認）：本 prototype 不支援 NULL（全域）；AppCode 固定 PMS 且 disabled。

---

## 2. Prototype 關鍵決策（你已確認）

- **AppCode**：固定 `PMS`、disabled、不可為 NULL。
- **Search 的 AppCode 視角**：僅顯示 `AppCode='PMS'` 的群組。
- **Delete**：Index 的 Delete 一律做 soft delete（`IsActive=0`）。
- **ValidFrom/ValidTo 驗證**：允許 `ValidTo == ValidFrom`（即 `ValidTo >= ValidFrom`）。

---

## 3. 欄位解讀與注意事項（UI/驗證觀點）

### 3.1 Keys
- **GroupId**（INT IDENTITY）
  - 內部流水號；prototype 自動遞增產生，僅供顯示。

- **GroupCode**（NVARCHAR(50), 必填, UNIQUE）
  - 業務邏輯主鍵；與其它表的關聯核心鍵。
  - Prototype：新增後鎖定不可改；新增時檢查唯一性（大小寫不敏感）。

### 3.2 Basic
- **GroupName**（NVARCHAR(100), 必填）
- **GroupDesc**（NVARCHAR(200), 選填）

### 3.3 Scope
- **AppCode**（NVARCHAR(50), 選填；文件允許 NULL=全域）
  - Prototype：固定 PMS 且 disabled。

### 3.4 Tags
- **Tags**（NVARCHAR(200), 選填）
  - 建議逗號分隔供快速篩選；prototype 以文字 contains 搜尋。

### 3.5 Flags
- **IsActive**（BIT, 必填）
  - Delete(soft) 會將其設為 0。

### 3.6 Temporal
- **ValidFrom / ValidTo**（DATETIME, 選填）
  - 驗證：兩者都有值時需 `ValidFrom <= ValidTo`（允許相等）。

### 3.7 Audit & Concurrency
- Audit（Created/Modified）：prototype 顯示為唯讀。
- RowVersion：prototype 以數字遞增模擬 optimistic lock；Edit Save 會做版本一致性檢查。

---

## 4. Prototype 功能範圍

### 4.1 Search / Index
- 查詢條件：GroupCode contains、GroupName contains、IsActive、Tags contains（AppCode 固定）
- 結果欄位：GroupId、GroupCode、GroupName、AppCode、IsActive、ValidFrom、ValidTo、Tags、ModifiedDate
- Row actions：Detail / Edit / Delete（soft）

### 4.2 Detail
- 右側 drawer 顯示完整欄位（唯讀）。

### 4.3 Add New
- 以 drawer 新增。
- 驗證：GroupCode/GroupName 必填；GroupCode 唯一；長度上限（50/100/200）；ValidFrom/To 合法。

### 4.4 Edit
- GroupCode 鎖定不可改。
- 可編輯：GroupName、GroupDesc、Tags、IsActive、ValidFrom/ValidTo。
- Save 時檢查 RowVersion。

### 4.5 Delete（soft）
- 將 IsActive 設為 0，並更新 Modified/RowVersion。
- Prototype 會在 confirm 中提示「若存在角色關聯，正式系統應先解除關聯」。

---

## 5. 已知簡化（prototype 與正式系統差異）

- 無 DB / 無 API：資料在前端記憶體，刷新即重置。
- AppCode=NULL（全域）未實作。
- 未實作真實的 AuthRelationPrincipalRole 查詢；僅用少量 mock 關聯數在刪除時提示。

---

## 6. 製作心得與正式版注意事項

- **GroupCode 的不可變性要堅持**：它是關聯核心鍵；允許修改會把下游關聯弄亂。
- **停用（IsActive=0）要有稽核**：群組停用會造成整批人權限失效，需記錄 ModifiedBy/Date。
- **時間有效期應一致納入權限計算**：否則會出現「已過期仍有權限」的嚴重問題。
