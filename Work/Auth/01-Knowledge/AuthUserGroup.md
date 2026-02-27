---
project: Auth
tags: [entity, db, auth]
aliases: [使用者群組對應表, User-Group, 群組成員表]
created: 2026-02-27
spec: _技術規格書_權限模組_10_使用者群組對應表(AuthUserGroup)
---

# AuthUserGroup（使用者群組對應表）

## 實體定位
將「人」轉化為「群體」的**最後一公里**——RBAC 鏈條中 U（User）→ G（Group）的關鍵連結。支援一人多組、時效控制。

## 關聯地圖
```
AuthUserGroup (PK: UserId + GroupCode)
├── .UserId → [[AuthPrincipalUser]].UserId (FK)
└── .GroupCode → [[AuthPrincipalGroup]].GroupCode (FK)
```

權限流轉路徑：
```
User → AuthUserGroup → [[AuthPrincipalGroup]] → [[AuthRelationPrincipalRole]] → [[AuthRole]]
```

---

## Schema 摘要

| 欄位 | 型別 | 說明 | 關聯知識 |
|---|---|---|---|
| `UserId` | NVARCHAR(40) | PK-1 / FK → User | [[Composite Primary Key]] |
| `GroupCode` | NVARCHAR(50) | PK-2 / FK → Group | [[Composite Primary Key]] |
| `AppCode` | NVARCHAR(50) | 系統範圍（NULL = 全域） | [[AppCode Isolation]] |
| `ValidFrom` | DATETIME | 生效時間 | [[Temporal Pattern]] |
| `ValidTo` | DATETIME | 失效時間（外包必填） | [[Temporal Pattern]] |
| `IsActive` | BIT | 是否啟用 | [[Delete Strategy]] |
| `Remark` | NVARCHAR(200) | 加入原因 | [[Audit Fields]] |
| Audit Fields | — | CreatedBy/Date, ModifiedBy/Date | [[Audit Fields]] |
| `RowVersion` | ROWVERSION | 併發控制 | [[RowVersion]] |

### 約束
| 約束 | 說明 | 關聯知識 |
|---|---|---|
| PK 複合鍵 | `(UserId, GroupCode)` → 同一人同一群組不重複 | [[Composite Primary Key]] |
| CK_DateRange | `ValidFrom <= ValidTo` | [[Constraints]] |

### 索引
| 索引 | 用途 | 關聯知識 |
|---|---|---|
| PK_AuthUserGroup | `(UserId, GroupCode)` 主體查詢 | [[Composite Primary Key]] |
| IX_AUG_GroupToUsers | `(GroupCode, IsActive)` 成員管理 | [[Index]] |
| IX_AUG_ValidTo | `(ValidTo)` 自動清理 | [[Data Retention]] |

---

## CRUD 涉及的底層知識

### Create
- 複合 PK 天生防重 → [[Composite Primary Key]]
- FK 存在性：UserId / GroupCode 必須存在 → [[Foreign Key]]
- 外包人員必填 `ValidTo` → [[Temporal Pattern]]

### Read
- `WHERE (AppCode = 'PMS' OR AppCode IS NULL)` → [[AppCode Isolation]]
- 有效期過濾 → [[Temporal Pattern]]
- [[Permission Decision Flow]] 第 3 層：群組繼承路徑

### Update
- `RowVersion` 必檢 → [[Optimistic Lock]]
- **人組變動 = 權限重算** → [[Cache Invalidation]]（立即清 Redis）

### Delete
- `UPDATE SET IsActive = 0 WHERE UserId = ?`（離職快速拔權）→ [[Bulk Update Strategy]]
- 過期資料清理 `ValidTo < NOW` → [[Data Retention]]

---

## 常見事故速查

| 症狀 | 檢查 | 對應知識 |
|---|---|---|
| 加入研發組但看不到頁面 | `IsActive`? `ValidFrom`? `AppCode` 對嗎? | [[Temporal Pattern]]、[[AppCode Isolation]] |
| 快速拔離職人員所有群組 | `UPDATE SET IsActive = 0 WHERE UserId = ?` | [[Bulk Update Strategy]] |
| 專案結束查成員 | `SELECT UserId WHERE GroupCode = 'PROJECT_X'` | — |

---

## 相關實體
- [[AuthPrincipalUser]] — 群組的成員
- [[AuthPrincipalGroup]] — 群組定義
- [[AuthRelationPrincipalRole]] — 群組的角色指派（權限繼承的下一步）

## 參考
- 📎 技術規格書 `_10_使用者群組對應表(AuthUserGroup)` 全文
