---
project: Auth
tags: [knowledge, db, auth]
aliases: [索引, DB Index, 資料庫索引]
created: 2026-02-27
---

# Index（索引）

## 是什麼
索引是 DB 為了**加速查詢**而建立的資料結構（類似書的目錄）。讀取通常比寫入多，索引是效能的底盤。

## 為什麼重要
- 權限系統每個 API 呼叫都可能查授權 → 讀取效能決定系統上限
- 沒有適當索引 → Table Scan → 系統慢到不可用
- 索引設計錯誤 → 寫入變慢、碎片化、空間浪費

---

## 核心觀念

### 索引類型
| 類型 | 說明 |
|---|---|
| **Clustered Index** | 每張表只有一個；決定資料的物理排列順序（通常是 [[Primary Key]]） |
| **Nonclustered Index** | 可以多個；獨立的查詢結構，指向資料列 |
| **[[Covering Index]]** | Nonclustered + INCLUDE 欄位，查詢不需回表 |
| **[[Filtered Unique Index]]** | 只在特定條件下生效的 UNIQUE 索引 |
| **Composite Index** | 多欄位組合的索引（欄位順序很重要） |

### 何時該加 / 不加索引
- **加**：WHERE 頻繁出現的欄位組合、JOIN key、ORDER BY
- **不加**：極少查詢的欄位、NVARCHAR(MAX)、頻繁批次寫入的表
- **監控**：`sys.dm_db_index_usage_stats` 可看哪些索引被用到

### JSON 欄位的效能陷阱
- 不要在 SQL 用 `JSON_VALUE(ConditionJson, ...)` 做 WHERE 條件
- 通常讓索引失效 → 全表掃描
- 正確做法：DB 回傳字串，應用層解析判斷

---

## Auth 專案實例

| 索引名稱 | 資料表 | 用途 |
|---|---|---|
| `IX_AuthGrant_Validation` | AuthRelationGrant | 權限判斷查詢（[[Covering Index]]） |
| `IX_AuthGrant_RoleView` | AuthRelationGrant | 角色管理檢視 |
| `IX_AuthResource_Tree` | AuthResource | 樹狀結構查詢 |
| `IX_AuthResource_Route` | AuthResource | 路由對應 |
| `IX_AuthTokens_Hash` | AuthTokens | [[Hash-based Lookup]] 查詢 |
| `IX_AuthTokens_Cleanup` | AuthTokens | [[Data Retention]] TTL 清理 |

---

## 相關概念
- [[Covering Index]] — INCLUDE 避免 Key Lookup
- [[Filtered Unique Index]] — 條件式唯一索引
- [[Execution Plan]] — 驗證索引是否被正確使用
- [[Hash-based Lookup]] — 長字串欄位的索引最佳化
- [[Primary Key]] — 通常是 Clustered Index

## 參考來源
- 📎 `_07 授權設定表(AuthRelationGrant)` §三 全部索引設計
- 📎 `_05 資源主檔(AuthResource)` §三 IX_AuthResource_Tree / Route
- 📎 BasicDBTransaction-JuniorLevel §8（索引與查詢效能）
- 📎 BasicDBTransaction-MiddleLevel §6（讀懂 Execution Plan）
