---
project: Auth
tags: [knowledge, db, auth]
aliases: [護欄模式, Check-Then-Act, 先查後做]
created: 2026-02-27
---

# Guardrail Pattern（護欄模式）

## 是什麼
在執行破壞性操作（如刪除）前，先**檢查前置條件**（如參照 count = 0），條件通過才執行——即 Check-Then-Act 模式。

## 為什麼重要
- DB 的 [[Foreign Key]] Restrict 會擋刪除，但錯誤訊息不友善
- Guardrail 提供**可控的業務錯誤訊息**
- 在高併發下，查和做之間有時間差 → 需要 [[Transaction]] + 適當 [[Isolation Level]] 保護

---

## 核心觀念

### Check-Then-Act 的 Race Condition
用預設 READ COMMITTED：查完 count = 0 後，別人可能在你刪之前新增一筆 → 你漏算了。

### 三種解法（由簡到嚴）

**解法 A：Application check + DB FK fallback**（建議起步）
```csharp
var activeCount = await _context.AuthRelationPrincipalRole
    .CountAsync(pr => pr.RoleCode == roleCode && pr.IsActive);
if (activeCount > 0)
    return Result.Fail("仍有 active 指派，禁止刪除");
// DB FK 做最後防線
_context.AuthRole.Remove(role);
try { await _context.SaveChangesAsync(); }
catch (DbUpdateException) { return Result.Fail("刪除失敗，可能仍有關聯資料"); }
```

**解法 B：顯式 Transaction + 升級隔離等級**
```csharp
using var tx = await _context.Database
    .BeginTransactionAsync(IsolationLevel.RepeatableRead);
var activeCount = await ...CountAsync(...);
if (activeCount > 0) { await tx.RollbackAsync(); return Result.Fail(...); }
_context.AuthRole.Remove(role);
await _context.SaveChangesAsync();
await tx.CommitAsync();
```

**解法 C：DB Stored Procedure（全部在 DB 端完成）**
- 最嚴格，但邏輯散在 DB 和程式兩邊

### 你們專案建議
- 正常流量用 **A**（效能好、訊息友善）
- Race condition 真的造成問題時局部升級到 **B**
- DB FK Restrict 永遠是最後防線

---

## Auth 專案場景
- 刪除 `AuthRole` 前：查 `AuthRelationPrincipalRole` + `AuthRelationGrant` 的 active 參照
- 刪除 `AuthResource` 前：查是否為葉節點 + 有無 Grant/Override 參照
- Guardrail 的「active」定義要一致（[[Temporal Pattern]] 的 IsActive + ValidFrom/ValidTo）

---

## 相關概念
- [[Transaction]] — Guardrail 需要 Transaction 保護原子性
- [[Isolation Level]] — 選對等級才能防止 race condition
- [[Foreign Key]] — FK Restrict 是 Guardrail 的最後防線
- [[Delete Strategy]] — Guardrail 是刪除策略的核心防護
- [[Exception Translation]] — FK violation 的友善訊息翻譯

## 參考來源
- 📎 `_02 角色主檔(AuthRole)` §四 刪除禁令（強制檢查 PrincipalRole）
- 📎 `_07 授權設定表(AuthRelationGrant)` §六 FK 定義（NO ACTION = Restrict）
- 📎 BasicDBTransaction-MiddleLevel §4（Guardrail 原子性實作模式）
