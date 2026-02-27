---
project: Auth
tags: [entity, db, auth]
aliases: [使用者主檔, 帳號表, User表]
created: 2026-02-27
spec: _技術規格書_權限模組_01_AuthPrincipalUser
---

# AuthPrincipalUser（使用者主檔）

## 實體定位
系統所有主體（Principal）的**根源**——使用者身分、安全驗證狀態與稽核軌跡。被 4 張子表參照，是 FK 扇出最多的主檔。

## 關聯地圖

AuthPrincipalUser (PK: UserId)
├── [[AuthUserGroup]].UserId (FK) — 群組歸屬
├── [[AuthRelationPrincipalRole]].UserId (FK, 與 GroupCode 互斥)
├── [[AuthUserOverride]].UserId (FK, 複合 PK)
└── [[AuthTokens]].UserId (FK)

---

## Schema 摘要

| 欄位 | 型別 | 說明 | 關聯知識 |
|---|---|---|---|
| `UserId` | NVARCHAR(40) | PK（流水號） | [[Primary Key]] |
| `UserName` | NVARCHAR(50) | 登入帳號，UNIQUE | [[Constraints]] |
| `Email` | NVARCHAR(200) | 電子郵件，UNIQUE | [[Constraints]] |
| `PasswordHash` | NVARCHAR(255) | 密碼雜湊 | [[Hash-based Lookup]] |
| `PasswordAlgo` | NVARCHAR(50) | 雜湊演算法標記 | — |
| `IsActive` | BIT | 是否啟用 | [[Delete Strategy]] |
| `IsLockedOut` | BIT | 是否鎖定 | — |
| `LockoutEndAt` | DATETIME | 鎖定結束時間 | — |
| `AccessFailedCount` | INT | 連續登入失敗次數 | — |
| `TwoFactorEnabled` | BIT | 是否啟用 2FA | — |
| `MustChangePassword` | BIT | 強制改密碼 | — |
| `Tags` | NVARCHAR(MAX) | JSON（Position/Factory…） | — |
| Audit Fields | — | CreatedBy/Date, ModifiedBy/Date | [[Audit Fields]] |
| `RowVersion` | ROWVERSION | 併發控制 | [[RowVersion]]、[[Optimistic Lock]] |

### 索引
| 索引 | 欄位 | 用途 |
|---|---|---|
| UX_UserName | (UserName) UNIQUE | 登入帳號唯一 |
| UX_Email | (Email) UNIQUE | 信箱唯一 |
| IX_AdAccount | (AdAccount) | AD/LDAP 查詢 |
| IX_LastLoginDate | (LastLoginDate) | 活躍度統計 |

---

## CRUD 涉及的底層知識

### Create
- `UserName` / `Email` 唯一性 → [[Constraints]]
- 初始化 `AccessFailedCount = 0`

### Read
- 只撈 `IsActive = 1` → [[Delete Strategy]]
- 帳號鎖定檢查：`IsLockedOut` + `LockoutEndAt`

### Update
- 必須帶 `RowVersion` → [[RowVersion]]、[[Optimistic Lock]]
- **敏感變動連鎖**：
  - `IsActive = 0` 或 `IsLockedOut = 1` → 立即撤銷 [[AuthTokens]] 所有 Token → [[Cache Invalidation]]
  - 改密碼 → `UPDATE AuthTokens SET IsRevoked = 1 WHERE UserId = ?`

### Delete
- **嚴禁物理刪除**，僅 `IsActive = 0` → [[Delete Strategy]]
- 若真要物理刪：先清 [[AuthRelationPrincipalRole]]、[[AuthUserGroup]]、[[AuthTokens]] → [[Guardrail Pattern]]
- FK violation → `SqlException 547` → [[Exception Translation]]

---

## 常見事故速查

| 症狀 | 檢查 | 對應知識 |
|---|---|---|
| 帳號正確卻無法登入 | `IsActive`? `IsLockedOut`? `LockoutEndAt`? | [[Delete Strategy]] |
| 改密碼後舊裝置仍能用 | Token 是否已撤銷? | [[AuthTokens]]、[[Cache Invalidation]] |
| 兩管理員同時改壞資料 | `RowVersion` + `ModifiedBy` | [[Optimistic Lock]]、[[Audit Fields]] |

---

## 相關實體
- [[AuthUserGroup]] — 使用者的群組歸屬
- [[AuthRelationPrincipalRole]] — 使用者的角色指派
- [[AuthUserOverride]] — 使用者的個人覆寫權限
- [[AuthTokens]] — 使用者的登入 Token

## 參考
- 📎 技術規格書 `_01_AuthPrincipalUser` 全文
