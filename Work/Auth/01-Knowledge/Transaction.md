---
project: Auth
tags: [knowledge, db, auth]
aliases: [交易, DB Transaction, 資料庫交易]
created: 2026-02-27
---

# Transaction（交易）

## 是什麼
把多個 DB 操作包成一個**不可分割的工作單元**——要嘛全成功，要嘛全失敗。是 [[ACID]] 四大特性的載體。

## ACID
- **A**tomicity — 全成功或全失敗
- **C**onsistency — 前後都滿足 [[Constraints]]
- **I**solation — 同時交易互不污染 → [[Isolation Level]]
- **D**urability — Commit 後不會消失

→ 詳見 [[ACID]]

---

## 什麼時候一定要用
1. **跨表操作**：insert 父表 + insert 子表（[[Foreign Key]] 順序）
2. **先查後改（Check-Then-Act）**：查 count → 再 delete → [[Guardrail Pattern]]
3. **樹狀結構移動**：改 parent + 更新所有子孫 Path → [[Self-Referencing FK]]
4. **批次停用 + 快取清理**：狀態改完要保證一致 → [[Cache Invalidation]]

---

## 專案中的使用場景
- 刪除 `AuthRole` 前的 [[Guardrail Pattern]]（查參照 → 刪除）
- 移動 `AuthResource` 節點（[[Self-Referencing FK]] Path 連鎖更新）
- 建立角色 + 建立預設授權（避免半套資料）
- 批次停用角色 → [[Bulk Update Strategy]]

→ 相關模組 [[AuthRole]]

---

## EF Core 交易行為
- 單次 `SaveChanges()` = 隱式 Transaction（Add 3 筆 + Update 1 筆 → 4 SQL 包一起）
- **多次 `SaveChanges()`** 或「查 + 改 + 刪」 → 需顯式 Transaction：
  ```csharp
  using var tx = await _context.Database
      .BeginTransactionAsync(IsolationLevel.RepeatableRead);
  await _context.SaveChangesAsync();
  await tx.CommitAsync();
  ```
- 相關：[[DB-first vs Code-first]]（你們專案 EF 只是搬運工）

---

## 隔離等級
- Read Committed（預設）
- Repeatable Read
- Serializable
- Snapshot

→ 詳見 [[Isolation Level]]、[[Snapshot Isolation]]

---

## 常見錯誤
- 查完 count 再 delete 沒包 Transaction → race condition
- 交易內做 HTTP 呼叫 / Redis 操作 → 鎖持有太久
- 大量更新導致鎖表 → 見 [[Bulk Update Strategy]] 分批處理
- Transaction 越大 → 鎖越久 → 越容易 [[Deadlock]]

---

## Mid Level 延伸
- [[Deadlock]] — 互鎖偵測、預防與重試
- [[Isolation Level]] — 選錯等級的代價
- [[Guardrail Pattern]] — Check-Then-Act 的原子性保證
- [[Snapshot Isolation]] — SQL Server 不加鎖的隔離方案

## 參考來源
- 📎 `_02 角色主檔(AuthRole)` §四 刪除禁令
- 📎 `_05 資源主檔(AuthResource)` §四 Lineage Maintenance
- 📎 BasicDBTransaction-JuniorLevel §4
- 📎 BasicDBTransaction-MiddleLevel §1