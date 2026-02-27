---
project: Auth
tags: [knowledge, db, auth]
aliases: [死鎖, 互鎖, DB Deadlock]
created: 2026-02-27
---

# Deadlock（死鎖）

## 是什麼
兩個 [[Transaction]] **互相等對方持有的鎖**，誰都動不了。DB 引擎會挑一個當「犧牲者」強制 rollback。

## 為什麼重要
- Deadlock 是高併發系統最常見的生產事故之一
- 被犧牲的 Transaction 會失敗 → 使用者看到錯誤
- 預防比治療重要：固定存取順序 + 縮小 Transaction 範圍

---

## 核心觀念

### 典型死鎖場景
- **管理員 A** 更新 Role → 觸發查 Grant 清快取（鎖 Role → 等 Grant）
- **管理員 B** 新增 Grant → 觸發查 Role 驗證存在（鎖 Grant → 等 Role）
- → 互鎖

### 預防策略（業界標準）
1. **固定存取順序**：所有 Transaction 先操作 Role → 再操作 Grant（統一順序）
2. **縮小 Transaction 範圍**：不要把「查快取要清哪些人」放在 Transaction 裡
3. **避免 Transaction 中做長時間操作**（HTTP 呼叫、Redis）
4. **使用 [[Snapshot Isolation]]**：讀取不加鎖 → 大幅降低互鎖

### 處理策略（犧牲者重試）
```csharp
const int maxRetries = 3;
for (int i = 0; i < maxRetries; i++)
{
    try
    {
        await ExecuteDeleteWithGuardrailAsync(roleCode);
        return;
    }
    catch (DbUpdateException ex) when (IsDeadlock(ex)) // SqlException.Number == 1205
    {
        if (i == maxRetries - 1) throw;
        await Task.Delay(100 * (i + 1)); // 退避重試
    }
}
```

### SqlException 識別
- `SqlException.Number = 1205` → Deadlock victim
- → 見 [[Exception Translation]] 統一處理

---

## Auth 專案場景
- Role ↔ Grant 的交叉更新最容易死鎖
- [[Cache Invalidation]] 查詢如果放在 Transaction 裡會加大死鎖風險

---

## 相關概念
- [[Transaction]] — Deadlock 是 Transaction 的風險
- [[Isolation Level]] — 等級越高，鎖越重，Deadlock 風險越大
- [[Snapshot Isolation]] — 不加鎖方案，降低 Deadlock
- [[Guardrail Pattern]] — Check-Then-Act 的 Transaction 也有 Deadlock 風險
- [[Exception Translation]] — Deadlock 的 SqlException 翻譯

## 參考來源
- 📎 `_02 角色主檔(AuthRole)` §四 併發 + 快取失效連鎖
- 📎 `_07 授權設定表(AuthRelationGrant)` §四 快取策略
- 📎 BasicDBTransaction-MiddleLevel §2（死鎖：偵測、預防與處理）
