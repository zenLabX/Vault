---
project: Auth
tags: [entity, db, auth]
aliases: [角色主檔, 角色表]
created: 2026-02-27
spec: _技術規格書_權限模組_02_角色主檔(AuthRole)
---

# AuthRole（角色主檔）

## 實體定位
RBAC 模型中的 **R（Role）**。所有存取控制邏輯以 `RoleCode` 為核心。

## 關聯地圖

AuthRole (PK: RoleCode)
├── [[AuthRelationPrincipalRole]].RoleCode (FK) — 角色指派
└── [[AuthRelationGrant]].RoleCode (FK) — 權限授權

---

## Schema 摘要

| 欄位 | 型別 | 說明 | 關聯知識 |
|---|---|---|---|
| `RoleId` | NVARCHAR(50) | 實體 PK（流水號） | [[Logical PK&Business Key]] |
| `RoleCode` | NVARCHAR(50) | 邏輯 PK / UNIQUE | [[Primary Key]] |
| `RoleName` | NVARCHAR(100) | UI 顯示名稱 | — |
| `RoleDesc` | NVARCHAR(200) | 角色描述 | — |
| `IsAdmin` | BIT | 最高權限標記（繞過細節檢查） | [[Immutable System Data]] |
| `IsActive` | BIT | 是否啟用 | [[Delete Strategy]] |
| `Priority` | INT | 衝突解析優先序 | [[Permission Decision Flow]] |
| `Tags` | NVARCHAR(MAX) | JSON 擴充標籤 | — |
| Audit Fields | — | CreatedBy/Date, ModifiedBy/Date | [[Audit Fields]] |
| `RowVersion` | ROWVERSION | 併發控制 | [[RowVersion]]、[[Optimistic Lock]] |

---

## CRUD 涉及的底層知識

### Create
- `RoleCode` 唯一性 → [[Constraints]]
- 若同時建預設授權 → 需 [[Transaction]]（避免半套）

### Read
- 預設只撈 `IsActive = 1` → [[Temporal Pattern]]
- 由角色查授權 → `IX_AuthGrant_RoleView` → [[Index]]、[[Covering Index]]

### Update
- 必須帶 `RowVersion` → [[RowVersion]]、[[Optimistic Lock]]
- `IsAdmin` 變更 = 高安全事件 → 審計日誌 + [[Audit Fields]]
- `IsActive` / 權限範圍變動 → [[Cache Invalidation]]（Redis 失效）
- 併發衝突：A 改 RoleName、B 改 Priority → [[Optimistic Lock]] 擋下後者

### Delete
- **優先 `IsActive = 0`**（萬人系統鎖表風險）→ [[Delete Strategy]]
- 物理刪除前必須 [[Guardrail Pattern]]：
  1. 查 [[AuthRelationPrincipalRole]] active 參照
  2. 查 [[AuthRelationGrant]] active 參照
  3. count > 0 → 拒絕；count = 0 → 才刪
- 查和刪之間有 race condition → [[Transaction]] + [[Isolation Level]]
- FK violation → `SqlException 547` → [[Exception Translation]]
- 大量子表 → [[Bulk Update Strategy]]（分批處理避免鎖表）

---

## 常見事故速查

| 症狀 | 檢查 | 對應知識 |
|---|---|---|
| 有 ADMIN 角色但進不了頁面 | `IsActive`? `IsAdmin` 被關? | [[Delete Strategy]] |
| 暫時凍結某職能存取 | `IsActive = 0` | [[Cache Invalidation]] |
| 多角色權限衝突 | `Priority` 欄位 | [[Permission Decision Flow]] |
| FK violation (547) | 仍有 PrincipalRole / Grant 參照 | [[Foreign Key]]、[[Exception Translation]] |
| UNIQUE violation (2627) | RoleCode 重複 | [[Constraints]] |
| Deadlock (1205) | Role ↔ Grant 交叉更新 | [[Deadlock]] |
| 併發衝突 (409) | RowVersion 不一致 | [[Optimistic Lock]] |

---

## 相關實體
- [[AuthRelationPrincipalRole]] — 誰擁有這個角色
- [[AuthRelationGrant]] — 這個角色能做什麼

## 參考
- 📎 技術規格書 `_02_角色主檔(AuthRole)` 全文