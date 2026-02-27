---
project: Auth
tags: [knowledge, db, auth]
aliases: [覆蓋索引, Include Index]
created: 2026-02-27
---

# Covering Index（覆蓋索引）

## 是什麼
Nonclustered [[Index]] 加上 `INCLUDE` 欄位，讓查詢**不需回表（Key Lookup）** 就能取得所有需要的資料。

## 為什麼重要
- Key Lookup 是效能殺手：索引命中後還要跑一趟 Clustered Index 取資料
- Covering Index 讓查詢只靠索引本身完成 → 極大提升讀取效能
- 權限判斷這種高頻查詢，Covering Index 是必要優化

---

## 核心觀念

### 結構
```sql
CREATE NONCLUSTERED INDEX IX_Example
ON TableName (KeyCol1, KeyCol2)        -- 索引 Key：用於 WHERE/JOIN
INCLUDE (Col3, Col4, Col5);            -- Include：只存、不排序，供 SELECT 用
```

### Execution Plan 判讀
- **Index Seek** → ✅ 精準命中索引 key
- **Index Scan** → ⚠️ 掃整個索引
- **Key Lookup** → ❌ 回表取不在索引裡的欄位 → 需要加 INCLUDE

→ 詳見 [[Execution Plan]]

---

## Auth 專案實例

### `IX_AuthGrant_Validation`
```sql
CREATE NONCLUSTERED INDEX IX_AuthGrant_Validation
ON AuthRelationGrant (ResourceKey, ActionCode, RoleCode)
INCLUDE (Effect, ConditionJson, ValidFrom, ValidTo, IsActive);
```
- Query：`WHERE ResourceKey = ? AND ActionCode = ? AND RoleCode IN (...)`
- 回傳 Effect, ConditionJson 等 → 全在 INCLUDE 裡 → 不回表 ✅
- 如果額外 SELECT `Remark`（不在 INCLUDE）→ 觸發 Key Lookup ❌

---

## 相關概念
- [[Index]] — Covering Index 是索引的進階形式
- [[Execution Plan]] — 用來驗證索引是否真的 covering
- [[Permission Decision Flow]] — 權限判斷是 Covering Index 的典型受益者

## 參考來源
- 📎 `_07 授權設定表(AuthRelationGrant)` §三 IX_AuthGrant_Validation / IX_AuthGrant_RoleView
- 📎 BasicDBTransaction-JuniorLevel §8.2（複合索引與 Covering Index）
- 📎 BasicDBTransaction-MiddleLevel §6.3（Execution Plan 解讀練習）
