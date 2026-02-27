---
project: Auth
tags: [knowledge, db, auth]
aliases: [篩選唯一索引, Partial Unique Index]
created: 2026-02-27
---

# Filtered Unique Index（篩選唯一索引）

## 是什麼
只在**特定 WHERE 條件下**才生效的 UNIQUE [[Index]]——SQL Server 特有功能（PostgreSQL 有類似的 Partial Unique Index）。

## 為什麼重要
- 有些業務規則是「只在某些條件下不可重複」，一般 UNIQUE 約束做不到
- 不用 trigger 或程式碼就能把條件式唯一性下推到 DB 層 → 最可靠

---

## 核心觀念

### 一般 UNIQUE vs Filtered UNIQUE
| 類型 | 規則 |
|---|---|
| 一般 UNIQUE | 整張表裡，欄位組合不可重複 |
| Filtered UNIQUE | 只在 WHERE 條件為 true 的 rows 之間不可重複 |

### 語法
```sql
CREATE UNIQUE NONCLUSTERED INDEX UX_Example
ON TableName (Col1, Col2, Col3)
WHERE ConditionCol IS NULL AND DateCol IS NULL;
```

### MySQL 不支援
MySQL 沒有 Filtered Index，需用 trigger 或程式碼模擬。

---

## Auth 專案實例

### `UX_AuthGrant_UniqueRule`
```sql
CREATE UNIQUE NONCLUSTERED INDEX UX_AuthGrant_UniqueRule
ON AuthRelationGrant (RoleCode, ResourceKey, ActionCode)
WHERE ConditionJson IS NULL AND ValidFrom IS NULL AND ValidTo IS NULL;
```
**意思**：「標準授權」（無條件、無期限）只允許一筆；「帶條件的」或「有時間限制的」可以多筆。

### 為什麼不用一般 UNIQUE？
同一個 Role + Resource + Action 組合可能同時存在：
- 一筆「全域 Allow」（無條件）
- 一筆「限工廠 A」（帶 ConditionJson）→ [[Temporal Pattern]]
- 一筆「2024 暫時開放」（帶 ValidFrom/ValidTo）

---

## 相關概念
- [[Index]] — Filtered Unique Index 是索引的特殊形式
- [[Constraints]] — 替代一般 UNIQUE 的條件式防重
- [[Composite Primary Key]] — 複合 PK 也能防重，但不支援條件式

## 參考來源
- 📎 `_07 授權設定表(AuthRelationGrant)` §三 避免重複規則 UX_AuthGrant_UniqueRule + §六 SQL Script
- 📎 BasicDBTransaction-JuniorLevel §15（Filtered Unique Index）
