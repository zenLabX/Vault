---
project: Auth
tags: [knowledge, db, auth]
aliases: [批次更新, 批次刪除, Batch Operation, 分批處理]
created: 2026-02-27
---

# Bulk Update Strategy（批次操作策略）

## 是什麼
對大量資料進行 UPDATE / DELETE 時，**分批處理**以避免鎖表、逾時和 [[Deadlock]]。

## 為什麼重要
- 一次 UPDATE/DELETE 10 萬筆 → 鎖表數秒 → 其他 API 逾時
- 規格書警告：「物理刪除萬名使用者的角色，會導致 Table Lock + API 大規模逾時」
- 分批 + 延遲 → 讓其他 [[Transaction]] 有機會進來

---

## 核心觀念

### 分批處理模式
```csharp
int batchSize = 1000;
int affected;
do
{
    affected = await _context.Database.ExecuteSqlRawAsync(
        "UPDATE TOP({0}) AuthRelationPrincipalRole SET IsActive = 0 " +
        "WHERE UserId = {1} AND IsActive = 1",
        batchSize, userId);
    // 每批間加短暫延遲，讓其他 Transaction 有機會進來
} while (affected > 0);
```

### EF Core ExecuteUpdate / ExecuteDelete（.NET 7+）
```csharp
await _context.AuthRelationPrincipalRole
    .Where(pr => pr.UserId == userId && pr.IsActive)
    .ExecuteUpdateAsync(s => s
        .SetProperty(p => p.IsActive, false)
        .SetProperty(p => p.ModifiedBy, currentUser)
        .SetProperty(p => p.ModifiedDate, DateTime.UtcNow));
```
⚠️ **注意**：`ExecuteUpdate` / `ExecuteDelete` 不觸發 EF Change Tracker、不走 [[RowVersion]] → 需要另外處理併發控制。

---

## Auth 專案觸發場景
| 場景 | 操作 |
|---|---|
| 收回離職人員所有角色 | `UPDATE SET IsActive = 0 WHERE UserId = ?` |
| 停用整個模組的資源 | `UPDATE SET IsActive = 0 WHERE Path LIKE '/PMS/ORDER/%'` |
| 清理過期 Token | `DELETE FROM AuthTokens WHERE ExpiresAt < ?` → [[Data Retention]] |

---

## 相關概念
- [[Transaction]] — 批次操作的 Transaction 要控制範圍
- [[Deadlock]] — 大批次是 Deadlock 高風險場景
- [[Data Retention]] — TTL Job 用分批刪除
- [[Delete Strategy]] — 批次停用 vs 批次刪除
- [[Cache Invalidation]] — 批次操作後要清快取

## 參考來源
- 📎 `_02 角色主檔(AuthRole)` §四 萬人系統鎖表風險
- 📎 `_09 權杖管理表(AuthTokens)` §四 TTL 排程清理
- 📎 BasicDBTransaction-MiddleLevel §7（批次操作與鎖控制）
