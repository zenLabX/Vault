---
project: Auth
tags: [entity, db, auth]
aliases: [動作主檔, 操作動作表, Action表]
created: 2026-02-27
spec: _技術規格書_權限模組_06_操作動作表(AuthAction)
---

# AuthAction（操作動作表）

## 實體定位
權限系統的**「動詞」**——標準化所有可執行操作（VIEW、CREATE、EDIT、DELETE…），防止開發者重複或模糊定義。

## 關聯地圖
```
AuthAction (PK: ActionCode)
├── [[AuthRelationResourceAction]].ActionCode (FK, 複合 PK) — 功能目錄
├── [[AuthRelationGrant]].ActionCode (FK) — 授權矩陣
└── [[AuthUserOverride]].ActionCode (FK, 複合 PK) — 個人覆寫
```

---

## Schema 摘要

| 欄位 | 型別 | 說明 | 關聯知識 |
|---|---|---|---|
| `ActionId` | INT IDENTITY | 實體 PK（流水號） | [[Logical PK&Business Key]] |
| `ActionCode` | NVARCHAR(50) | 邏輯 PK / UNIQUE（全大寫） | [[Primary Key]]、[[Constraints]] |
| `ActionName` | NVARCHAR(100) | 顯示名稱（新增、檢視…） | — |
| `Category` | NVARCHAR(50) | 動作類別（READ/WRITE/WORKFLOW） | — |
| `SortOrder` | INT | UI 排列順序 | — |
| `IsEnabled` | BIT | 是否啟用 | [[Delete Strategy]] |
| `IsBasicAction` | BIT | 基礎動作標記（不可修改/刪除） | [[Immutable System Data]] |
| `Description` | NVARCHAR(200) | 說明 | — |
| Audit Fields | — | CreatedBy/Date, ModifiedBy/Date | [[Audit Fields]] |
| `RowVersion` | ROWVERSION | 併發控制 | [[RowVersion]] |

### 約束
| 約束 | 說明 | 關聯知識 |
|---|---|---|
| UX_AuthAction_Code | `ActionCode` 全系統唯一 | [[Constraints]] |
| CK_AuthAction_Code_Format | 只允許 `A-Z 0-9 _ -` | [[Constraints]] |

### 索引
| 索引 | 用途 |
|---|---|
| IX_AuthAction_IsEnabled | 快取預熱：載入所有啟用動作 |
| IX_AuthAction_Category | UI 渲染：依類別分組排序 |
| IX_AuthAction_ActionCode | 權限校驗：`Check("EDIT")` 反查 |

---

## CRUD 涉及的底層知識

### Create
- `ActionCode` 格式限制（全大寫 + 數字 + 底線）→ [[Constraints]]
- 通用性原則：建 `APPROVE`，不要建 `APPROVE_ORDER`

### Read
- 極低頻異動 → 建議 24h 長快取或 Singleton 載入
- 預設過濾 `IsEnabled = 1`

### Update
- `IsBasicAction = 1` 的核心動作**禁止修改** → [[Immutable System Data]]
- 程式碼 hardcode `Check("VIEW")` → 改名 = 全系統權限崩壞

### Delete
- **不要物理刪除** → `IsEnabled = 0` → [[Delete Strategy]]
- 被 [[AuthRelationResourceAction]] / [[AuthRelationGrant]] / [[AuthUserOverride]] 參照 → FK 會擋
- 核心動作禁刪 → [[Immutable System Data]]

---

## 常見事故速查

| 症狀 | 檢查 | 對應知識 |
|---|---|---|
| `Check("View")` 無效 | 大小寫！DB 是 `VIEW` | [[Constraints]] |
| 權限設定畫面很亂 | 補齊 `Category` + `SortOrder` | — |
| 想刪舊動作 | `IsEnabled = 0`，不要物理刪 | [[Delete Strategy]]、[[Immutable System Data]] |

---

## 系統預設動作（初始化）
```sql
VIEW, CREATE, EDIT, DELETE      -- 基礎 CRUD (IsBasicAction=1)
EXPORT, PRINT                    -- 資料輸出
SUBMIT, APPROVE, REJECT, VOID   -- 簽核流程
```

---

## 相關實體
- [[AuthRelationResourceAction]] — 動作在功能目錄中的登記（哪些資源有此動作）
- [[AuthRelationGrant]] — 動作在授權矩陣中的使用
- [[AuthUserOverride]] — 動作的個人覆寫
- [[AuthResource]] — 動作作用在哪個資源上

## 參考
- 📎 技術規格書 `_06_操作動作表(AuthAction)` 全文
