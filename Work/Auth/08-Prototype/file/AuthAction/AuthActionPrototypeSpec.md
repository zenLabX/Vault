# AuthAction Prototype Spec（2026-02-26）

本文件描述 AuthAction（操作動作主檔）的 prototype 規格、欄位解讀、UI/互動流程、以及實作注意事項。

- Prototype 路徑：`file/AuthAction/`
- 技術：Pure HTML / CSS / Vanilla JS（無框架、無後端、in-memory 假資料）
- 主要參考文件：`[技術規格書] 權限模組_06_操作動作表 (AuthAction)`
  - 交叉理解：`[技術規格書] 權限模組_07_授權設定表 (AuthRelationGrant)`（ActionCode FK）

---

## 1. 文件解讀重點（AuthAction 的架構位置）

1) **AuthAction 是權限系統的「動詞」**
- 目的：標準化操作指令，避免程式碼散落多種同義字串（View/Read/Show）。
- 授權綁定：`AuthRelationGrant` 以 `ActionCode` 將「Role + Resource + Action」連結。

2) **通用性原則（文件強調）**
- Action 應盡量通用（例如 `APPROVE`），不要綁定特定資源（例如 `APPROVE_ORDER`）。
- 資源差異由 AuthResource 負責；粒度/層級可由 ABAC ConditionJson 表達。

3) **CRUD guardrails（文件重點）**
- `ActionCode` 是授權邏輯基石：必須全域唯一，且不建議變更。
- 刪除策略：文件建議不要物理刪除舊動作，改以 `IsEnabled=0` 停用，以維持歷史授權關聯完整性。
- 快取：本表極低頻異動，文件建議 24 小時長快取或應用啟動時載入。

---

## 2. Prototype 關鍵決策（你已確認）

- **ActionCode 規則**：`ActionCode` 為全域唯一 key，且 **建立後不可修改**。
- **Delete 策略**：不提供 Hard Delete；只提供 **IsEnabled 停用/啟用**。
- **核心動作保護（Core Protection）**：以 `IsBasicAction=1` 視為核心動作：
  - 允許編輯顯示欄位（ActionName/Category/SortOrder/Description）
  - 禁止停用（IsEnabled 不可切到 0）
  - 禁止改碼（ActionCode immutable）
  - 核心動作不可將 IsBasicAction 改成 0
- **Category 值域**：依 seed script，固定下拉：`READ/WRITE/OUTPUT/WORKFLOW`（可留空）。

---

## 3. 欄位解讀與注意事項（UI/驗證觀點）

> 依 AuthAction 欄位表整理。

### 3.1 Key / Identity
- **ActionId**（必填，IDENTITY）
  - 文件：資料庫內部流水號，用於索引效能。
  - UI：prototype 自動生成、唯讀。

- **ActionCode**（必填，UNIQUE，邏輯 PK）
  - 文件：全域唯一，建議全大寫。
  - DB check constraint（文件附錄）：
    - 只能包含大寫字母、數字、底線、連字號
    - `LEN(ActionCode) BETWEEN 2 AND 50`
  - UI：Add 可輸入（自動轉大寫 + 驗證）；Edit/Detail 鎖定不可變更。

- **ActionName**（必填）
  - UI 顯示名稱。

### 3.2 UI 分組欄位
- **Category**（可空）
  - 用途：權限設定 UI 的分組。
  - UI：固定下拉（依 seed script）。

- **SortOrder**（必填）
  - 用途：UI 排列；數字小者在前。

### 3.3 Flags
- **IsEnabled**（必填）
  - 用途：停用取代物理刪除。
  - UI：列表提供 Disable/Enable（核心動作禁用此操作）。

- **IsBasicAction**（必填）
  - 用途：標記基礎 CRUD / 通用動作。
  - Prototype guardrail：`IsBasicAction=1` 視為核心動作：
    - 允許編輯顯示欄位
    - 禁止停用（IsEnabled 不可切到 0）
    - 不允許把 IsBasicAction 改回 0

### 3.4 其他
- **Description**（可空）
  - 用途：描述副作用或適用場景。

### 3.5 Audit / Concurrency
- **Audit Fields**（CreatedBy/CreatedDate/ModifiedBy/ModifiedDate）
  - UI：唯讀顯示。

- **RowVersion**（必填）
  - 文件：Optimistic Lock。
  - Prototype：以數字遞增模擬；Edit Save 會檢查 RowVersion 不一致則拒絕。

---

## 4. Prototype 功能範圍（CRUD）

### 4.1 Search / Index
- 查詢條件：ActionCode、ActionName、Category、IsBasicAction、IsEnabled、SortOrder min/max、Description contains
- 結果表格欄位：ActionId、ActionCode、ActionName、Category、SortOrder、IsBasicAction、IsEnabled、Description、ModifiedDate
- Row Actions：Detail / Edit / Disable(or Enable)
  - 核心動作（IsBasicAction=1）仍可 Edit，但會鎖定 Disable/Enable（且禁止改碼）

### 4.2 Detail
- 右側 drawer 檢視完整欄位（唯讀）

### 4.3 Add New
- `Add New` 開 drawer
- ActionId 自動生成
- ActionCode 必填且需符合格式/唯一性

### 4.4 Edit
- ActionCode 鎖定不可變更
- 核心動作可編輯：ActionName/Category/SortOrder/Description（禁止停用、禁止更改 IsBasicAction）
- 非核心動作可編輯：ActionName/Category/SortOrder/IsEnabled/IsBasicAction/Description
- Save 時檢查 RowVersion

### 4.5 Delete（soft）
- 不提供 Hard Delete
- 列表的 Disable/Enable 即 `IsEnabled` 切換（並更新 Modified/RowVersion）

---

## 5. 已知簡化（prototype 與正式系統差異）

- 無 DB / 無 API：資料為前端記憶體，重新整理即重置。
- 未實作 grant/override 參照檢查（正式版需評估是否允許停用已被參照的動作；文件建議停用保留歷史）。
- 未實作快取（僅於規格保留文件重點）。

---

## 6. 製作心得與正式版注意事項

- **ActionCode 需要明確不可變**：它會被 AuthRelationGrant/AuthUserOverride 等大量資料參照；若要改碼必須有 migration 流程。
- **不要硬刪**：文件明確建議以 IsEnabled 管理舊動作，避免破壞歷史授權。
- **分類與排序是管理體驗關鍵**：Category/SortOrder 不只是 UI；會影響權限設定頁的可用性與一致性。
