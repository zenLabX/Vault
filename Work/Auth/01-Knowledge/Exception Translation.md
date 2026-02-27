---
project: Auth
tags: [knowledge, db, auth]
aliases: [錯誤翻譯, DbUpdateException, SqlException 處理]
created: 2026-02-27
---

# Exception Translation（錯誤翻譯）

## 是什麼
在 [[DB-first vs Code-first]] 架構下，把 DB 層的 `SqlException` / `DbUpdateException` **翻譯成業務語言的錯誤訊息** + 對應的 HTTP Status Code。

## 為什麼重要
- DB-first 專案中，[[Foreign Key]]、[[Constraints]] 的 violation 都以 raw exception 穿透到 Service 層
- 使用者不該看到 `SqlException: The DELETE statement conflicted with the REFERENCE constraint`
- 統一翻譯 → 錯誤訊息可控、好除錯、好維護

---

## 核心觀念

### SqlException.Number 對照表

| Number | 意義 | 建議 HTTP Status | 說明 |
|---|---|---|---|
| **547** | FK violation | 409 或 400 | 仍有關聯（[[Foreign Key]]） |
| **2601 / 2627** | UNIQUE violation | 409 | 代碼重複（[[Constraints]]） |
| **515** | NOT NULL violation | 400 | 缺必填 |
| **1205** | [[Deadlock]] victim | 應重試 | — |

### 實作模式
```csharp
public static class DbExceptionTranslator
{
    public static Result TranslateToBusinessError(DbUpdateException ex)
    {
        if (ex.InnerException is SqlException sqlEx)
        {
            return sqlEx.Number switch
            {
                547 => Result.Fail("仍有關聯資料，請先移除", HttpStatusCode.Conflict),
                2601 or 2627 => Result.Fail("代碼重複", HttpStatusCode.Conflict),
                515 => Result.Fail("缺少必填欄位", HttpStatusCode.BadRequest),
                _ => Result.Fail($"DB 異常：{sqlEx.Message}", HttpStatusCode.InternalServerError)
            };
        }
        return Result.Fail("儲存失敗", HttpStatusCode.InternalServerError);
    }
}
```

### 在 Service 層使用
```csharp
try { await _context.SaveChangesAsync(); }
catch (DbUpdateConcurrencyException) // [[RowVersion]] 衝突
{
    return Result.Fail("資料已被他人修改，請重新載入", HttpStatusCode.Conflict);
}
catch (DbUpdateException ex) // FK/UNIQUE/NOT NULL violation
{
    return DbExceptionTranslator.TranslateToBusinessError(ex);
}
```

---

## 常見錯誤訊號快速定位
| 現象 | 可能原因 | 對應概念 |
|---|---|---|
| FK violation (547) | 先子後父 / 刪父但子還在 | [[Foreign Key]] |
| UNIQUE violation (2601) | 業務 key 重複 / Race condition | [[Constraints]] |
| ConcurrencyException (409) | [[RowVersion]] 不一致 | [[Optimistic Lock]] |
| Deadlock / Timeout (1205) | Transaction 太大 / [[Index]] 不佳 | [[Deadlock]] |

---

## 相關概念
- [[DB-first vs Code-first]] — 錯誤翻譯是 DB-first 架構的必備
- [[Foreign Key]] — 547 的來源
- [[Constraints]] — 2601/2627/515 的來源
- [[Deadlock]] — 1205 的來源
- [[Optimistic Lock]] — ConcurrencyException 的來源
- [[Guardrail Pattern]] — 用友善檢查減少裸 exception

## 參考來源
- 📎 `ERP.CommonLib/Data/AuthDbContext.cs` DB-first 規範
- 📎 `_02 角色主檔(AuthRole)` §四 刪除禁令（需友善訊息）
- 📎 BasicDBTransaction-MiddleLevel §9（錯誤翻譯模式）
