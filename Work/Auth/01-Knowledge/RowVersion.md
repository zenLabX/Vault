---
project: Auth
tags: [knowledge, db, auth]
aliases: [列版本, 行版本號, Concurrency Token]
created: 2026-02-27
---

# RowVersion

## 是什麼
SQL Server 的 `ROWVERSION`（舊稱 `TIMESTAMP`）欄位——每次 row 被更新時**自動遞增**的 8-byte binary 值，是 [[Optimistic Lock]] 的實現機制。

## 為什麼重要
- 不需要程式手動維護版本號，DB 自動處理
- Update/Delete 時帶上 RowVersion 做 WHERE 條件，輕量防止 lost update
- 你們規格書明確要求：所有更新操作必須檢查 RowVersion

---

## 核心觀念

### 運作方式
```sql
-- Update 時 WHERE 帶 RowVersion
UPDATE AuthRole
SET RoleName = @NewName, ModifiedBy = @User, ModifiedDate = GETDATE()
WHERE RoleCode = @Code AND RowVersion = @ExpectedVersion;

-- 如果 @@ROWCOUNT = 0 → 表示 RowVersion 不符 = 有人先改過
```

### EF Core 設定
```csharp
// 在 OnModelCreating 中（你們專案允許的三種之一）
entity.Property(e => e.RowVersion).IsRowVersion();
```
- EF 會自動在 UPDATE SQL 加 `WHERE RowVersion = @p`
- 不符合時拋 `DbUpdateConcurrencyException`

### Update 和 Delete 都要帶
- **Update**：防別人先改了你不知道
- **Delete**：防你刪的資料已被改成不同狀態

---

## Auth 專案實例
- `AuthRole`：更新角色時必須帶 RowVersion
- `AuthPrincipalUser`：Update 規範要求 RowVersion WHERE 條件
- `AuthRelationPrincipalRole`：RowVersion 檢查

---

## 相關概念
- [[Optimistic Lock]] — RowVersion 是樂觀鎖的 SQL Server 實現
- [[Transaction]] — RowVersion 搭配 Transaction 使用效果更完整
- [[DB-first vs Code-first]] — RowVersion 是你們 EF 允許設定的三項之一

## 參考來源
- 📎 `_02 角色主檔(AuthRole)` §四 併發處理
- 📎 `_01 AuthPrincipalUser` §四 Update 規範
- 📎 `_04 主體角色關聯(AuthRelationPrincipalRole)` §四 RowVersion 檢查
- 📎 BasicDBTransaction-JuniorLevel §5（RowVersion / Optimistic Lock）
