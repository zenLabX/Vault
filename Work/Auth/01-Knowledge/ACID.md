---
project: Auth
tags: [knowledge, db, auth]
aliases: [ACID特性, 資料庫ACID]
created: 2026-02-27
---

# ACID

## 一句話定義
[[Transaction]] 必須滿足的四大特性：**原子性、一致性、隔離性、持久性**。

## 為什麼重要
- 這是面試基本題，也是理解所有 DB 併發與一致性問題的基礎
- 每個字母代表一個可能出錯的面向——理解 ACID 就知道 DB 在防什麼

## 核心觀念

| 特性 | 英文 | 意義 | 對應防護 |
|---|---|---|---|
| **A** | Atomicity（原子性） | 要嘛全成功，要嘛全失敗 | [[Transaction]] rollback |
| **C** | Consistency（一致性） | 交易前後都滿足 [[Constraints]] | PK/FK/CHECK/UNIQUE |
| **I** | Isolation（隔離性） | 同時交易不互相污染 | [[Isolation Level]] |
| **D** | Durability（持久性） | Commit 後資料不會消失 | Write-Ahead Log（WAL） |

### 常見違反情境
- **A 違反**：多步驟操作沒包 Transaction → 半套資料
- **C 違反**：程式繞過 [[Constraints]] 直接寫入 → 資料不合法
- **I 違反**：[[Isolation Level]] 太低 → dirty read / phantom read
- **D 違反**：硬體故障 + 沒有 WAL → 資料遺失（現代 DB 幾乎不會）

## Auth 專案實例
- 建立角色 + 預設授權：靠 **A**（Transaction）保證不會只建一半
- FK/CHECK/UNIQUE：靠 **C** 保證資料合法
- 多管理員同時改角色：靠 **I**（[[Isolation Level]] + [[RowVersion]]）防污染
- Commit 後角色資料永久保留：靠 **D**

## 相關概念
- [[Transaction]] — ACID 的載體
- [[Isolation Level]] — I（隔離性）的具體實現
- [[Constraints]] — C（一致性）的 DB 層保證
- [[Optimistic Lock]] — I 的另一種實現方式

## 參考來源
- 📎 BasicDBTransaction-JuniorLevel §4.1（ACID 是業界基本詞彙）
