---
project: Auth
tags: [entity, db, auth]
aliases: [資源主檔, 資源表, Resource表]
created: 2026-02-27
spec: _技術規格書_權限模組_05_資源主檔(AuthResource)
---

# AuthResource（資源主檔）

## 實體定位
權限系統的**「名詞」**——定義所有受控物件（選單、頁面、API、按鈕、欄位）。採 [[Self-Referencing FK]] 樹狀結構。

## 關聯地圖
```
AuthResource (PK: ResourceKey)
├── .ParentResourceKey → AuthResource.ResourceKey (Self-FK, 樹狀)
├── [[AuthRelationResourceAction]].ResourceKey (FK, 複合 PK) — 功能目錄
├── [[AuthRelationGrant]].ResourceKey (FK) — 授權矩陣
└── [[AuthUserOverride]].ResourceKey (FK, 複合 PK) — 個人覆寫
```

---

## Schema 摘要

| 欄位 | 型別 | 說明 | 關聯知識 |
|---|---|---|---|
| `ResourceKey` | NVARCHAR(160) | PK（格式：`{AppCode}:{ResourceCode}`） | [[Primary Key]] |
| `AppCode` | NVARCHAR(50) | 系統歸屬 | [[AppCode Isolation]] |
| `ResourceCode` | NVARCHAR(100) | 業務代碼（同 AppCode 下 UNIQUE） | [[Constraints]] |
| `ResourceName` | NVARCHAR(200) | 顯示名稱 | — |
| `ResourceType` | NVARCHAR(30) | SYSTEM/MODULE/MENU/PAGE/API/BUTTON/FIELD | — |
| `ParentResourceKey` | NVARCHAR(160) | Self-FK（根節點 = NULL） | [[Self-Referencing FK]] |
| `Path` | NVARCHAR(800) | 物化路徑（如 `/ROOT/PMS/ORDER/BTN_SAVE/`） | [[Self-Referencing FK]] |
| `SortOrder` | INT | 排序權重 | — |
| `Endpoint` | NVARCHAR(400) | API 路徑 / 前端路由 | — |
| `Method` | NVARCHAR(10) | HTTP 動詞 | — |
| `MetaJson` | NVARCHAR(MAX) | ABAC 屬性（JSON） | [[Permission Decision Flow]] |
| `IsLeaf` | BIT | 是否為葉節點 | [[Self-Referencing FK]] |
| `IsActive` | BIT | 是否啟用 | [[Delete Strategy]] |
| Audit Fields | — | CreatedBy/Date, ModifiedBy/Date | [[Audit Fields]] |
| `RowVersion` | ROWVERSION | 併發控制 | [[RowVersion]]、[[Optimistic Lock]] |

### 約束與索引
| 約束/索引 | 說明 | 關聯知識 |
|---|---|---|
| UX_App_ResCode | `(AppCode, ResourceCode)` UNIQUE | [[Constraints]] |
| IX_AuthResource_Tree | `(ParentResourceKey, SortOrder)` | [[Index]]、[[Self-Referencing FK]] |
| IX_AuthResource_Lineage | `(Path)` | [[Self-Referencing FK]] |
| IX_AuthResource_Route | `(Endpoint, Method)` | [[Index]] |

---

## CRUD 涉及的底層知識

### Create
- 父節點必須先存在 → [[Foreign Key]]、[[Self-Referencing FK]]
- 同 AppCode 下 ResourceCode 唯一 → [[Constraints]]

### Read
- 子樹查詢：`WHERE Path LIKE '/ROOT/PMS/%'` → [[Self-Referencing FK]]
- API 攔截：`WHERE Endpoint = ? AND Method = ?` → `IX_AuthResource_Route`
- 預設過濾 `IsActive = 1` → [[Delete Strategy]]

### Update
- **移動節點**（改 `ParentResourceKey`）：
  - 防循環：目標父的 Path 不能包含自己 → [[Self-Referencing FK]]
  - 連鎖更新所有子孫 Path → 必須包 [[Transaction]]
- `RowVersion` 必檢 → [[Optimistic Lock]]

### Delete
- **嚴禁刪除非葉節點**（子節點成孤兒）→ [[Self-Referencing FK]]
- **優先 `IsActive = 0`** → [[Delete Strategy]]
- 物理刪除須連帶清除 [[AuthRelationResourceAction]] 與 [[AuthRelationGrant]] → [[Guardrail Pattern]]
- 批次停用整模組：`UPDATE SET IsActive = 0 WHERE Path LIKE '/PMS/ORDER/%'` → [[Bulk Update Strategy]]

---

## 常見事故速查

| 症狀 | 檢查 | 對應知識 |
|---|---|---|
| 新 API 呼叫回 403 | Endpoint + Method 有寫入 AuthResource? | [[Permission Decision Flow]] |
| 暫停整個模組 | `UPDATE IsActive = 0 WHERE Path LIKE '...'` | [[Bulk Update Strategy]] |
| 選單順序錯亂 | 調 `SortOrder` + 清 Menu Cache | [[Cache Invalidation]] |

---

## 相關實體
- [[AuthRelationResourceAction]] — 資源的功能目錄（定義此資源有哪些動作）
- [[AuthRelationGrant]] — 資源的授權設定
- [[AuthUserOverride]] — 資源的個人覆寫
- [[AuthAction]] — 資源上可執行的動作

## 參考
- 📎 技術規格書 `_05_資源主檔(AuthResource)` 全文
