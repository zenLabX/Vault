---
project: Auth
tags: [entity, db, auth]
aliases: [資源動作目錄表, 功能目錄表, RA表]
created: 2026-02-27
spec: _技術規格書_權限模組_11_資源動作目錄表(AuthRelationResourceAction)
---

# AuthRelationResourceAction（資源動作目錄表）

## 實體定位
四層收斂架構的**第二層（功能目錄）**——從 Action × Resource 的理論全集收斂為「業務上有意義的組合」。Grant 設定畫面因此只列出合法動作，而非五千種無意義排列組合。

## 架構層級
```
第 1 層  AuthAction × AuthResource          ← 理論全集
第 2 層  ★ AuthRelationResourceAction ★     ← 功能目錄（本表）
第 3 層  AuthRelationGrant                   ← 授權矩陣（Role × 目錄）
第 4 層  AuthUserOverride                    ← 個人覆寫
```

## 關聯地圖
```
AuthRelationResourceAction (PK: ResourceKey + ActionCode)
├── .ResourceKey → [[AuthResource]].ResourceKey (FK)
├── .ActionCode  → [[AuthAction]].ActionCode (FK)
│
│  ── 下游消費者 ──
├── [[AuthRelationGrant]].(ResourceKey, ActionCode) (FK, 建議加)
└── [[AuthUserOverride]].(ResourceKey, ActionCode)  (邏輯關聯)
```

---

## Schema 摘要

| 欄位 | 型別 | 說明 | 關聯知識 |
|---|---|---|---|
| `ResourceKey` | NVARCHAR(160) | PK-1 / FK → Resource | [[Composite Primary Key]] |
| `ActionCode` | NVARCHAR(50) | PK-2 / FK → Action | [[Composite Primary Key]] |
| `IsEnabled` | BIT | 快速開關（停用不刪除） | [[Delete Strategy]] |
| `SortOrder` | INT | UI 排列順序 | — |
| `Remark` | NVARCHAR(200) | 維護備註 | — |
| Audit Fields | — | CreatedBy/Date, ModifiedBy/Date | [[Audit Fields]] |
| `RowVersion` | ROWVERSION | 併發控制 | [[RowVersion]]、[[Optimistic Lock]] |

### 約束
| 約束 | 說明 | 關聯知識 |
|---|---|---|
| PK 複合鍵 | `(ResourceKey, ActionCode)` → 一資源一動作僅一筆 | [[Composite Primary Key]] |
| FK_ARRA_Resource | → AuthResource.ResourceKey | [[Foreign Key]] |
| FK_ARRA_Action | → AuthAction.ActionCode | [[Foreign Key]] |

### 索引
| 索引 | 用途 | 關聯知識 |
|---|---|---|
| PK (Clustered) | Grant UI：載入資源的可用動作 | [[Composite Primary Key]] |
| `IX_ARRA_ActionLookup` | 反查：停用動作→影響範圍 | [[Covering Index]] |
| `IX_ARRA_ResourceUI` | UI 渲染：依排序列出可用動作 | [[Covering Index]] |

---

## 種子資料初始化

```sql
-- 通用動作 × Form 資源 → 自動產生功能目錄
INSERT INTO AuthRelationResourceAction
       (ResourceKey, ActionCode, IsEnabled, SortOrder, CreatedBy)
SELECT r.ResourceKey, a.ActionCode, 1, a.SortOrder, 'SYSTEM'
FROM   AuthAction   a
CROSS JOIN AuthResource r
WHERE  a.Category      = '通用'
  AND  a.IsEnabled     = 1
  AND  r.ResourceType  = 'Form'
  AND  r.IsActive      = 1
  AND  NOT EXISTS (
         SELECT 1 FROM AuthRelationResourceAction t
         WHERE  t.ResourceKey = r.ResourceKey
           AND  t.ActionCode  = a.ActionCode
       );
-- 後續由 DataAdmin 人工維護（移除不適用、新增特殊動作）
```

---

## CRUD 涉及的底層知識

### Create
- 複合 PK 天生防重 → [[Composite Primary Key]]
- FK 雙向存在性（Resource + Action）→ [[Foreign Key]]
- 大量初始化用種子腳本；個別新增由 DataAdmin 手動操作

### Read
- Grant 設定畫面的**資料來源**：`WHERE ResourceKey = ? AND IsEnabled = 1 ORDER BY SortOrder`
- 建議應用層快取（TTL 30 min 或手動 Purge）→ [[Cache Invalidation]]

### Update
- `RowVersion` 必檢 → [[Optimistic Lock]]
- `SortOrder` 異動 → 清 UI 快取 → [[Cache Invalidation]]

### Delete
- **優先 `IsEnabled = 0`**（Grant 表可能仍參照此組合）→ [[Delete Strategy]]
- 物理刪除前需確認無 Grant 參照 → [[Guardrail Pattern]]
- 若 Grant 表有加 FK，物理刪會觸發 FK violation → [[Exception Translation]]

---

## 與 Grant 表的 FK 建議

在 [[AuthRelationGrant]] 上新增複合 FK，確保授權只能針對目錄中存在的組合：

```sql
ALTER TABLE AuthRelationGrant
ADD CONSTRAINT FK_Grant_ResourceAction
    FOREIGN KEY (ResourceKey, ActionCode)
    REFERENCES AuthRelationResourceAction (ResourceKey, ActionCode);
```

效果：管理員**不可能**授權一個資源「沒有的動作」——從 DB 層面杜絕髒資料。

---

## 常見事故速查

| 症狀 | 檢查 | 對應知識 |
|---|---|---|
| 新 Form 的權限設定畫面沒動作可勾 | 種子初始化跑了嗎? | [[Bulk Update Strategy]] |
| 想暫停某資源的 EXPORT | `SET IsEnabled = 0 WHERE ActionCode = 'EXPORT'` | [[Delete Strategy]] |
| 停用動作後 Grant 紀錄怎辦 | Grant 不受影響（保留歷史）；UI 不顯示已停用動作 | [[Delete Strategy]] |
| 停用 VOID 動作影響多大 | `SELECT ResourceKey WHERE ActionCode = 'VOID'` 反查 | [[Covering Index]] |

---

## 相關實體
- [[AuthResource]] — 目錄中的資源（名詞）
- [[AuthAction]] — 目錄中的動作（動詞）
- [[AuthRelationGrant]] — 下游消費者（授權矩陣只能勾目錄中的組合）
- [[AuthUserOverride]] — 下游消費者（個人覆寫同理）

## 參考
- 📎 技術規格書 `_11_資源動作目錄表(AuthRelationResourceAction)` 全文
