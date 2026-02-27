---
project: Auth
tags: [entity, db, auth]
aliases: [主體角色關聯, 角色指派表, PrincipalRole]
created: 2026-02-27
spec: _技術規格書_權限模組_04_主體角色關聯(AuthRelationPrincipalRole)
---

# AuthRelationPrincipalRole（主體角色關聯）

## 實體定位
RBAC 的**神經接點**——將「主體（User 或 Group）」指派至角色。決定權限如何從角色流向使用者。

## 關聯地圖
```
AuthRelationPrincipalRole (PK: PrincipalRoleCode)
├── .UserId → [[AuthPrincipalUser]].UserId (FK, 與 GroupCode 互斥)
├── .GroupCode → [[AuthPrincipalGroup]].GroupCode (FK, 與 UserId 互斥)
└── .RoleCode → [[AuthRole]].RoleCode (FK)
```

---

## Schema 摘要

| 欄位 | 型別 | 說明 | 關聯知識 |
|---|---|---|---|
| `PrincipalRoleCode` | NVARCHAR(40) | PK（代理鍵） | [[Primary Key]] |
| `RelationCode` | NVARCHAR(50) | 業務唯一碼 | [[Logical PK&Business Key]] |
| `UserId` | NVARCHAR(40) | FK → User（nullable） | [[XOR Constraint]] |
| `GroupCode` | NVARCHAR(50) | FK → Group（nullable） | [[XOR Constraint]] |
| `RoleCode` | NVARCHAR(50) | FK → Role | [[Foreign Key]] |
| `AppCode` | NVARCHAR(50) | 系統範圍（NULL = 全域） | [[AppCode Isolation]] |
| `ValidFrom` | DATETIME | 授權起始 | [[Temporal Pattern]] |
| `ValidTo` | DATETIME | 授權失效 | [[Temporal Pattern]] |
| `Priority` | INT | 衝突時值大者優先 | [[Permission Decision Flow]] |
| `IsActive` | BIT | 是否啟用 | [[Delete Strategy]] |
| Audit Fields | — | CreatedBy/Date, ModifiedBy/Date | [[Audit Fields]] |
| `RowVersion` | ROWVERSION | 併發控制 | [[RowVersion]]、[[Optimistic Lock]] |

### 關鍵約束
| 約束                      | 說明                         | 關聯知識                      |
| ----------------------- | -------------------------- | ------------------------- |
| XOR CHECK               | `UserId` 與 `GroupCode` 二選一 | [[XOR Constraint]]        |
| Filtered Unique (User)  | User-Role-AppCode 不可重複     | [[Filtered Unique Index]] |
| Filtered Unique (Group) | Group-Role-AppCode 不可重複    | [[Filtered Unique Index]] |

### 索引
| 索引 | 用途 |
|---|---|
| IX_UserId | 由人查角色 |
| IX_(RoleCode, IsActive) | 由角色查人（權限回收/稽核） |

---

## CRUD 涉及的底層知識

### Create
- 先確認 [[AuthRole]] 存在 → [[Foreign Key]]
- UserId / GroupCode 二選一 → [[XOR Constraint]]
- 防重複指派 → [[Filtered Unique Index]]

### Read
- `WHERE (AppCode = ? OR AppCode IS NULL)` → [[AppCode Isolation]]
- 有效期過濾 → [[Temporal Pattern]]
- [[Permission Decision Flow]] 第 3 層：角色聚合

### Update
- `RowVersion` 必檢 → [[Optimistic Lock]]
- 異動 → **立即** [[Cache Invalidation]]（受影響使用者權限快取失效）

### Delete
- **建議保留歷史**，`IsActive = 0` → [[Delete Strategy]]
- 物理刪除僅限「錯誤建立」
- 快速收回離職人員所有角色 → [[Bulk Update Strategy]]

---

## 常見事故速查

| 症狀 | 檢查 | 對應知識 |
|---|---|---|
| 被指派角色但沒權限 | `IsActive`? `ValidFrom/To`? `AppCode`? | [[Temporal Pattern]]、[[AppCode Isolation]] |
| 角色衝突（Allow vs Deny） | `Priority` 較大者優先 | [[Permission Decision Flow]] |
| 快速收回離職權限 | `UPDATE SET IsActive = 0 WHERE UserId = ?` | [[Bulk Update Strategy]]、[[Cache Invalidation]] |

---

## 相關實體
- [[AuthPrincipalUser]] — 被指派的使用者
- [[AuthPrincipalGroup]] — 被指派的群組
- [[AuthRole]] — 被指派的角色

## 參考
- 📎 技術規格書 `_04_主體角色關聯(AuthRelationPrincipalRole)` 全文
