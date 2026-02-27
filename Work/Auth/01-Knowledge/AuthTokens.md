---
project: Auth
tags: [entity, db, auth]
aliases: [權杖管理表, Token表, JWT管理]
created: 2026-02-27
spec: _技術規格書_權限模組_09_權杖管理表(AuthTokens)
---

# AuthTokens（權杖管理表）

## 實體定位
權限系統的**「看門狗」**——Stateful JWT 策略，將發出的 Token 登記在庫，實現即時撤銷（Force Logout）與稽核追蹤。高寫入 + 高查詢的典型表。

## 關聯地圖
```
AuthTokens (PK: TokenId IDENTITY)
└── .UserId → [[AuthPrincipalUser]].UserId (FK)
```

---

## Schema 摘要

| 欄位 | 型別 | 說明 | 關聯知識 |
|---|---|---|---|
| `TokenId` | BIGINT IDENTITY | PK（自動遞增） | [[Primary Key]] |
| `Token` | VARCHAR(MAX) | 原始 JWT（僅存檔，**不查詢**） | — |
| `TokenHash` | VARBINARY(32) | SHA-256 Hash（**核心查詢鍵**） | [[Hash-based Lookup]] |
| `UserId` | NVARCHAR(40) | FK → User | [[Foreign Key]] |
| `Source` | VARCHAR(50) | 來源系統（PMS/Mobile…） | — |
| `AppCode` | NVARCHAR(32) | 授權目標系統 | [[AppCode Isolation]] |
| `EffectiveUserId` | NVARCHAR(64) | 代理人 ID（模擬登入追責） | — |
| `IssuedAt` | DATETIME | 簽發時間 | — |
| `ExpiresAt` | DATETIME | 過期時間（= JWT exp） | [[Data Retention]] |
| `IsRevoked` | BIT | 撤銷標記（1=黑名單） | — |
| Audit Fields | — | CreatedBy/Date, ModifiedBy/Date | [[Audit Fields]] |
| `RowVersion` | ROWVERSION | 併發控制 | [[RowVersion]] |

### 約束
| 約束 | 說明 | 關聯知識 |
|---|---|---|
| CK_LifeCycle | `ExpiresAt > IssuedAt` | [[Constraints]] |

### 索引（效能命脈）
| 索引 | 用途 | 關聯知識 |
|---|---|---|
| `IX_AuthTokens_Hash` | API 驗證 Hot Path（Hash 查詢） | [[Hash-based Lookup]]、[[Covering Index]] |
| `IX_AuthTokens_User` | 強制登出（依 UserId 找 Token） | [[Index]] |
| `IX_AuthTokens_Cleanup` | TTL Job 清理（依 ExpiresAt） | [[Data Retention]] |

---

## CRUD 涉及的底層知識

### Create（簽發 Token）
- 程式算 `SHA256(Token)` 存入 `TokenHash` → [[Hash-based Lookup]]
- FK 存在性：UserId 必須存在 → [[Foreign Key]]

### Read（API 驗證 — 全系統最高頻）
- **嚴禁** `WHERE Token = '...'`（1KB+ 長字串 = 效能災難）
- 正確：`WHERE TokenHash = @hash` → [[Hash-based Lookup]]
- 確認 `IsRevoked = 0` + `ExpiresAt > NOW`

### Update（撤銷）
- 改密碼 / 停用帳號 → `UPDATE SET IsRevoked = 1 WHERE UserId = ?` → [[Cache Invalidation]]
- 模擬登入記錄 `EffectiveUserId`（追責用）

### Delete（**必須定期硬刪**）
- 萬人系統每天數萬筆 → 一年千萬級 → **炸庫風險**
- TTL Job：`DELETE TOP(5000) WHERE ExpiresAt < NOW - 7天` → [[Data Retention]]
- 分批刪避免鎖表 → [[Bulk Update Strategy]]
- 清理索引：`IX_AuthTokens_Cleanup` → [[Index]]

---

## 常見事故速查

| 症狀 | 檢查 | 對應知識 |
|---|---|---|
| 改密碼後舊手機仍能登入 | 漏了 `SET IsRevoked = 1`? | [[Cache Invalidation]] |
| DB CPU 飆高 | 有人直接 `WHERE Token = '...'`? | [[Hash-based Lookup]] |
| 查同時在線人數 | `COUNT(DISTINCT UserId) WHERE ExpiresAt > NOW AND IsRevoked = 0` | — |
| 表無限膨脹 | TTL Job 是否正常運行? | [[Data Retention]] |

---

## 相關實體
- [[AuthPrincipalUser]] — Token 的擁有者

## 參考
- 📎 技術規格書 `_09_權杖管理表(AuthTokens)` 全文
