---
project: Auth
tags: [knowledge, db, auth]
aliases: [樂觀鎖, Optimistic Concurrency, OCC]
created: 2026-02-27
---

# Optimistic Lock（樂觀鎖）

## 是什麼
一種併發控制策略：**不在讀取時加鎖**，而是在寫入時才檢查「資料是否被別人改過」。若被改過則報衝突，由程式決定如何處理。

## 為什麼重要
- 解決 **Lost Update**（更新被覆蓋）問題
- 比悲觀鎖（Pessimistic Lock）效能好很多——不阻塞讀取
- SQL Server 的實現機制：[[RowVersion]]

---

## 核心觀念

### Lost Update 問題
兩個管理員同時編輯同一筆資料：
- A 改 `RoleName` = 「採購主管」
- B 改 `Priority` = 10
- 沒有併發控制 → 最後送出的人贏，另一個修改被悄悄覆蓋

### 樂觀鎖流程
1. 讀取資料時，帶回 [[RowVersion]]
2. 更新時帶上「你看到的 RowVersion」
3. DB 檢查：目前的 RowVersion 是否仍相同？
   - ✅ 相同 → 更新成功
   - ❌ 不同 → 有人先改過 → 拋 `DbUpdateConcurrencyException` / HTTP 409

### Update 和 Delete 都要帶 RowVersion
- **Update**：防止覆蓋別人的修改
- **Delete**：防止刪到你沒看過的新狀態

### 衝突後的三種策略
| 策略 | 說明 | 適用場景 |
|---|---|---|
| **Last Writer Wins** | 不檢查，直接覆蓋 | 最危險，不建議 |
| **Fail and Report** | 衝突 → 回 409 | 安全但體驗差（你們目前的做法） |
| **Merge** | 偵測差異，自動合併 | 體驗最好，實作最複雜 |

### EF Core 衝突處理
```csharp
catch (DbUpdateConcurrencyException ex)
{
    var entry = ex.Entries.Single();
    var dbValues = await entry.GetDatabaseValuesAsync();
    if (dbValues == null) return Result.Fail("資料已被刪除");
    // 可做 merge 邏輯或直接回報衝突
    entry.OriginalValues.SetValues(dbValues); // 更新 RowVersion
}
```

---

## Auth 專案場景
- `AuthRole` 更新時必須檢查 [[RowVersion]]
- 合併策略建議：
  - `RoleName`、`RoleDesc`、`Tags` → 可考慮 auto-merge（風險低）
  - `IsActive`、`IsAdmin`、`Priority` → 必須拒絕（安全敏感）

---

## 相關概念
- [[RowVersion]] — SQL Server 的樂觀鎖實現機制
- [[Snapshot Isolation]] — 概念相近的隔離方案
- [[Deadlock]] — 樂觀鎖能降低 Deadlock 風險（不提前加鎖）
- [[Transaction]] — 樂觀鎖與 Transaction 互補使用
- [[Exception Translation]] — 衝突 exception 翻譯為業務錯誤

## 參考來源
- 📎 `_02 角色主檔(AuthRole)` §四 併發處理
- 📎 `_01 AuthPrincipalUser` §四 Update 規範（RowVersion WHERE 條件）
- 📎 BasicDBTransaction-JuniorLevel §5（併發與 RowVersion）
- 📎 BasicDBTransaction-MiddleLevel §5（衝突進階處理）
