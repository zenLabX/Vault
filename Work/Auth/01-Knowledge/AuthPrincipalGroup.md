---
project: Auth
tags: [entity, db, auth]
aliases: [使用者群組, 群組主檔, Group表]
created: 2026-02-27
spec: _技術規格書_權限模組_03_使用者群組(AuthPrincipalGroup)
---

# AuthPrincipalGroup（使用者群組）

## 實體定位
RBAC 模型中的 **G（Group）**——大批量角色指派的緩衝層。支援時間區間生效，適用於臨時性權限。

## 關聯地圖
```
AuthPrincipalGroup (PK: GroupCode)
├── [[AuthUserGroup]].GroupCode (FK, 複合 PK) — 成員名冊
└── [[AuthRelationPrincipalRole]].GroupCode (FK, 與 UserId 互斥)
```

---

## Schema 摘要

| 欄位 | 型別 | 說明 | 關聯知識 |
|---|---|---|---|
| `GroupId` | INT IDENTITY | 實體 PK（流水號） | [[Logical PK&Business Key]] |
| `GroupCode` | NVARCHAR(50) | 邏輯 PK / UNIQUE | [[Primary Key]] |
| `GroupName` | NVARCHAR(100) | 群組名稱 | — |
| `GroupDesc` | NVARCHAR(200) | 群組描述 | — |
| `AppCode` | NVARCHAR(50) | 多系統隔離（NULL = 全域） | [[AppCode Isolation]] |
| `Tags` | NVARCHAR(200) | 搜尋標籤 | — |
| `IsActive` | BIT | 是否啟用 | [[Delete Strategy]] |
| `ValidFrom` | DATETIME | 生效時間 | [[Temporal Pattern]] |
| `ValidTo` | DATETIME | 失效時間 | [[Temporal Pattern]] |
| Audit Fields | — | CreatedBy/Date, ModifiedBy/Date | [[Audit Fields]] |
| `RowVersion` | ROWVERSION | 併發控制 | [[RowVersion]]、[[Optimistic Lock]] |

---

## CRUD 涉及的底層知識

### Create
- `GroupCode` 唯一性 → [[Constraints]]
- `ValidTo` 必須晚於 `ValidFrom` → [[Temporal Pattern]]
- `AppCode = NULL` → 跨系統共用群組

### Read
- `WHERE (AppCode = 'PMS' OR AppCode IS NULL)` → [[AppCode Isolation]]
- 有效期過濾 → [[Temporal Pattern]]

### Update
- `RowVersion` 必檢 → [[RowVersion]]、[[Optimistic Lock]]
- 異動後 → [[Cache Invalidation]]（受影響使用者權限快取失效）

### Delete
- **優先 `IsActive = 0`**（群組內可能數千人）→ [[Delete Strategy]]
- 物理刪除前查 [[AuthRelationPrincipalRole]] 是否仍有關聯 → [[Guardrail Pattern]]
- 大範圍權限異動計算風險 → [[Bulk Update Strategy]]

---

## 常見事故速查

| 症狀 | 檢查 | 對應知識 |
|---|---|---|
| 外包團隊突然無法存取 | `ValidTo` 過期? `IsActive`? | [[Temporal Pattern]] |
| 建全公司公告群組 | `AppCode = NULL` | [[AppCode Isolation]] |
| 誰改過群組描述? | `ModifiedBy` + `ModifiedDate` | [[Audit Fields]] |

---

## 相關實體
- [[AuthUserGroup]] — 群組的成員名冊
- [[AuthRelationPrincipalRole]] — 群組的角色指派

## 參考
- 📎 技術規格書 `_03_使用者群組(AuthPrincipalGroup)` 全文
