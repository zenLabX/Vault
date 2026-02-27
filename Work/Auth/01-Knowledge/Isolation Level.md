---
project: Auth
tags: [knowledge, db, auth]
aliases: [隔離等級, Transaction Isolation, 交易隔離]
created: 2026-02-27
---

# Isolation Level（隔離等級）

## 是什麼
[[Transaction]] 之間「互相能看到多少」的嚴格程度設定——是 [[ACID]] 中 **I（Isolation）** 的具體實現。

## 為什麼重要
- 隔離等級太低 → 髒讀 / 不可重複讀 / 幻讀
- 隔離等級太高 → 鎖太重 → 效能差 → [[Deadlock]] 風險升高
- 選對等級是 [[Guardrail Pattern]] 安全性的關鍵

---

## 核心觀念

### 四種等級（由寬到嚴）

| 等級 | 髒讀 | 不可重複讀 | 幻讀 | 鎖行為 |
|---|---|---|---|---|
| **READ UNCOMMITTED** | ⚠️ 可能 | ⚠️ 可能 | ⚠️ 可能 | 幾乎不鎖 |
| **READ COMMITTED**（預設） | ✅ 防止 | ⚠️ 可能 | ⚠️ 可能 | 讀完就放鎖 |
| **REPEATABLE READ** | ✅ 防止 | ✅ 防止 | ⚠️ 可能 | 讀的 row 持鎖到 commit |
| **SERIALIZABLE** | ✅ 防止 | ✅ 防止 | ✅ 防止 | Range Lock（最重） |

→ SQL Server 特有的第五種：[[Snapshot Isolation]]（不加鎖的隔離方案）

### READ COMMITTED 的漏洞
預設等級下，「先查後改」有時間差：
1. 你查 count = 0
2. 別人在這之間新增一筆
3. 你繼續刪 → 漏算了

→ 這就是 [[Guardrail Pattern]] 要升級隔離等級的原因

### EF Core 設定
```csharp
using var tx = await _context.Database
    .BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead);
```

---

## Auth 專案場景

| 場景 | 建議等級 | 原因 |
|---|---|---|
| 刪除 AuthRole 前查參照 | REPEATABLE READ 或靠 FK fallback | 防止查完被插入新關聯 |
| 權限查詢（讀多寫少） | [[Snapshot Isolation]] | 讀取不加鎖，效能最佳 |
| 移動 AuthResource 子樹 | REPEATABLE READ | 保護 Path 一致性 |

---

## 相關概念
- [[Transaction]] — 隔離等級是 Transaction 的屬性
- [[ACID]] — I = Isolation
- [[Snapshot Isolation]] — SQL Server 的第五種隔離
- [[Deadlock]] — 隔離等級越高，Deadlock 風險越大
- [[Guardrail Pattern]] — 需要適當隔離等級保護

## 參考來源
- 📎 `_02 角色主檔(AuthRole)` §四 刪除禁令（guardrail 需求）
- 📎 BasicDBTransaction-MiddleLevel §1（Transaction 隔離等級）
