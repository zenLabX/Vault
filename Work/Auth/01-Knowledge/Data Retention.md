---
project: Auth
tags: [knowledge, db, auth]
aliases: [資料保留, TTL, 資料清理, 排程清理]
created: 2026-02-27
---

# Data Retention（資料保留與清理）

## 是什麼
對**會無限增長**的表，定期刪除過期資料的策略——包含 TTL Job（排程清理）和歸檔（Archive）。

## 為什麼重要
- 不清理 → 磁碟空間爆、查詢變慢、[[Index]] 碎片化嚴重
- 清理不當（一次刪太多）→ 鎖表 → API 逾時 → 見 [[Bulk Update Strategy]]

---

## 核心觀念

### TTL Job（排程清理）
- 定時（每小時 / 每天）批次刪除超過保留期的資料
- **分批刪除**：一次刪太多會鎖表，每次只刪 N 筆（如 5000），loop 到刪完
  ```sql
  DELETE TOP(5000) FROM AuthTokens
  WHERE ExpiresAt < DATEADD(DAY, -7, GETDATE());
  ```

### Archive（歸檔）
- 如果要保留歷史 → 先搬到歷史表再刪
- 適用於稽核需求高的表

### 專用清理索引
```sql
CREATE NONCLUSTERED INDEX IX_AuthTokens_Cleanup
ON AuthTokens (ExpiresAt);
```
→ 讓 TTL Job 的 DELETE 走 Index Seek 而非 Table Scan

---

## Auth 專案需要清理的表

| 資料表 | 清理條件 | 頻率 | 索引 |
|---|---|---|---|
| `AuthTokens` | `ExpiresAt < NOW - 7天` | 每天 | `IX_AuthTokens_Cleanup` |
| `AuthUserOverride` | `ValidTo < NOW` | 每月 | — |
| 未來 Audit Log | 依保留政策 | — | — |

---

## 相關概念
- [[Delete Strategy]] — TTL 屬於 hard delete 策略
- [[Bulk Update Strategy]] — 分批刪除避免鎖表
- [[Temporal Pattern]] — ValidTo 過期 ≠ 資料消失，需要清理
- [[Index]] — 清理操作需要專用索引支持
- [[Hash-based Lookup]] — AuthTokens 的查詢最佳化搭配清理

## 參考來源
- 📎 `_09 權杖管理表(AuthTokens)` §四 TTL 策略 + §六 IX_AuthTokens_Cleanup
- 📎 `_08 個人覆寫表(AuthUserOverride)` §四 定期清理機制
- 📎 BasicDBTransaction-JuniorLevel §18（TTL / Data Retention）
