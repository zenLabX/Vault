---
project: Auth
tags: [knowledge, db, auth]
aliases: [執行計畫, Query Plan, 查詢計畫]
created: 2026-02-27
---

# Execution Plan（執行計畫）

## 是什麼
DB 引擎為每個查詢產生的**執行策略說明書**——告訴你它怎麼找資料、用了哪些 [[Index]]、花了多少成本。

## 為什麼重要
- 不看 Execution Plan 就不知道索引有沒有被用到
- 效能問題的根因幾乎都能從 Execution Plan 找到
- 養成「每個重要查詢都看一次」的習慣

---

## 核心觀念

### 在 SSMS 中查看
- `Ctrl + L`：預估執行計畫（不實際執行）
- `Ctrl + M`：實際執行計畫（會真的跑查詢）

### 關鍵指標

| 運算元 | 好壞 | 說明 |
|---|---|---|
| **Index Seek** | ✅ 好 | 精準命中索引 key |
| **Index Scan** | ⚠️ 看情況 | 掃整個索引（小表可接受，大表不行） |
| **Table Scan** | ❌ 最壞 | 沒用到任何索引 |
| **Key Lookup** | ❌ 要處理 | 索引找到 row 但要回表取缺少的欄位 → 加 INCLUDE → [[Covering Index]] |

### DMV 監控
```sql
-- 看哪些索引被用到
SELECT * FROM sys.dm_db_index_usage_stats;
-- 看缺失的索引建議
SELECT * FROM sys.dm_db_missing_index_details;
```

---

## Auth 專案實例

### 權限判斷查詢驗證
```sql
SELECT Effect, ConditionJson, ValidFrom, ValidTo, IsActive
FROM AuthRelationGrant
WHERE ResourceKey = 'PMS:ORDER_FORM'
  AND ActionCode = 'EDIT'
  AND RoleCode IN ('ADMIN', 'PLANNER')
```
- 使用 `IX_AuthGrant_Validation` → Index Seek ✅
- INCLUDE 包含所有 SELECT 欄位 → 不回表 ✅（[[Covering Index]]）
- 如果額外 SELECT `Remark` → Key Lookup ❌

---

## 相關概念
- [[Index]] — Execution Plan 的核心就是看索引使用狀況
- [[Covering Index]] — 消除 Key Lookup 的解法
- [[Hash-based Lookup]] — 長字串查詢的索引策略

## 參考來源
- 📎 `_07 授權設定表(AuthRelationGrant)` §三 全部索引
- 📎 BasicDBTransaction-MiddleLevel §6（讀懂 Execution Plan 的通用能力）
