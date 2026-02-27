# BasicDBTransaction — Middle Level（中階後端資料庫知識說明書）

日期：2026-02-27

**定位**：建立在 [Junior Level](BasicDBTransaction-JuniorLevel.md) 基礎之上。Junior 講「是什麼 / 為什麼」，本文講「怎麼做到 / 做好 / 做穩」。

**範圍**：仍以你專案的 Auth 模組（10 張權限表）為例，但聚焦在：
- Transaction 隔離等級與死鎖處理
- EF Core DB-first 進階實作模式
- Guardrail / 併發衝突的原子性與重試
- 索引設計深入（Execution Plan 意識）
- 批次操作與鎖控制
- 權限決策引擎的查詢路徑設計
- 錯誤翻譯（DbUpdateException → 業務錯誤碼）
- 時效性資料模式（Temporal Pattern）
- 安全遷移策略（改 PK / 移 FK）

> 假設你已經理解 Junior Level 的 PK/FK、ACID、RowVersion、Soft delete、Constraints、Index 等基本觀念。

---

## 1. Transaction 隔離等級（Isolation Level）：不是只有「開 Transaction」就夠

### 1.1 Junior Level 只告訴你「要包 Transaction」，但沒告訴你隔離等級的差異

SQL Server 預設隔離等級是 `READ COMMITTED`，這代表：
- 你在 Transaction 內讀到的資料，是「已 commit」的
- 但如果你讀完之後、寫入之前，別人改了那筆資料，你不會知道

這就是 guardrail（先查後刪）最大的漏洞。

### 1.2 四種隔離等級（由寬到嚴）

| 等級 | 髒讀 | 不可重複讀 | 幻讀 | 鎖行為 |
|---|---|---|---|---|
| READ UNCOMMITTED | 可能 | 可能 | 可能 | 幾乎不鎖 |
| READ COMMITTED（預設） | 防止 | 可能 | 可能 | 讀完就放鎖 |
| REPEATABLE READ | 防止 | 防止 | 可能 | 讀的 row 持鎖到 commit |
| SERIALIZABLE | 防止 | 防止 | 防止 | 鎖範圍（range lock） |

### 1.3 你們的 Auth 模組實際需要哪種？

**場景 A：刪除 AuthRole 前查 active 參照**
```
BEGIN TRAN
-- 1) 查 PrincipalRole count
-- 2) 查 Grant count
-- 3) 若 both = 0 才 DELETE
COMMIT
```
如果用 `READ COMMITTED`：步驟 1 查完後，別人可以在步驟 2 之前新增一筆 PrincipalRole → 你就漏算了。

安全做法：
- 方案 A：用 `SERIALIZABLE`（最嚴格，但鎖很重）
- 方案 B：用 `REPEATABLE READ` + 再加 RowVersion 檢查（平衡性能）
- 方案 C：不升級隔離等級，而是靠 DB FK Restrict 做最後防線（你們目前的架構）

### 1.4 SQL Server 特有的 SNAPSHOT Isolation
- 不加鎖，改用 Row Versioning（tempdb 存歷史版本）
- 讀取時看到的是交易開始時的快照
- 寫入時若偵測到衝突，會拋「update conflict」
- 適合讀多寫少的系統（例如權限查詢）

### 1.5 EF Core 怎麼設定
```csharp
using var tx = await _context.Database
    .BeginTransactionAsync(System.Data.IsolationLevel.RepeatableRead);
try
{
    // ... 查 + 改 + 刪 ...
    await _context.SaveChangesAsync();
    await tx.CommitAsync();
}
catch
{
    await tx.RollbackAsync();
    throw;
}
```

> 📎 參考來源：`_02 角色主檔(AuthRole)` §四 刪除禁令（先查後刪的 guardrail 需求）、`_05 資源主檔(AuthResource)` §四 Lineage 維護（Transaction 必要性）、`權限系統架構總覽` 決策引擎第一層物理過濾

---

## 2. 死鎖（Deadlock）：偵測、預防與處理

### 2.1 死鎖是什麼
兩個 Transaction 互相等對方的鎖，誰都動不了。DB 會挑一個當「犧牲者」強制 rollback。

### 2.2 Auth 模組最容易死鎖的場景
- **管理員 A** 更新 Role → 觸發查 Grant 清快取
- **管理員 B** 新增 Grant → 觸發查 Role 驗證存在

A 鎖了 Role 等 Grant；B 鎖了 Grant 等 Role → 死鎖。

### 2.3 預防策略（業界標準）
1. **固定存取順序**：所有 Transaction 都先操作 Role → 再操作 Grant（不反過來）
2. **縮小 Transaction 範圍**：不要把「查快取要清哪些人」放在 Transaction 裡
3. **避免在 Transaction 中做長時間操作**（如 HTTP 呼叫、Redis 操作）
4. **使用 SNAPSHOT Isolation**：讀取不加鎖，大幅降低互鎖機率

### 2.4 處理策略（犧牲者重試）
```csharp
const int maxRetries = 3;
for (int i = 0; i < maxRetries; i++)
{
    try
    {
        await ExecuteDeleteWithGuardrailAsync(roleCode);
        return; // 成功
    }
    catch (DbUpdateException ex) when (IsDeadlock(ex))
    {
        if (i == maxRetries - 1) throw;
        await Task.Delay(100 * (i + 1)); // 退避重試
    }
}
```

> 📎 參考來源：`_02 角色主檔(AuthRole)` §四 併發 + 快取失效連鎖、`_07 授權設定表(AuthRelationGrant)` §四 快取策略

---

## 3. EF Core DB-first 進階實作模式

### 3.1 你們專案的限制（再次確認）
`AuthDbContext` 明確禁止：Navigation Property、HasForeignKey、HasIndex、DeleteBehavior。
因此你無法用 `.Include(r => r.Grants)` 之類的延遲/即時載入。

### 3.2 手動 Join 的三種方式

**方式 A：兩次查詢（最清楚）**
```csharp
var role = await _context.AuthRole
    .FirstOrDefaultAsync(r => r.RoleCode == roleCode);

var grantCount = await _context.AuthRelationGrant
    .CountAsync(g => g.RoleCode == roleCode && g.IsActive);
```

**方式 B：LINQ Join（一次查詢）**
```csharp
var result = await (
    from r in _context.AuthRole
    join g in _context.AuthRelationGrant on r.RoleCode equals g.RoleCode into grants
    where r.RoleCode == roleCode
    select new { Role = r, ActiveGrantCount = grants.Count(g => g.IsActive) }
).FirstOrDefaultAsync();
```

**方式 C：Raw SQL（效能最佳，但失去類型安全）**
```csharp
var count = await _context.Database
    .SqlQueryRaw<int>(
        "SELECT COUNT(*) AS Value FROM AuthRelationGrant WHERE RoleCode = {0} AND IsActive = 1",
        roleCode)
    .FirstAsync();
```

### 3.3 何時用哪種
- 簡單 CRUD：方式 A（好讀、好維護）
- 需要聚合數據：方式 B（一次 roundtrip）
- 效能熱點（權限判斷）：方式 C（可精確控制 SQL）

### 3.4 SaveChanges 的行為細節
- 單次 `SaveChanges()` = 一個隱式 Transaction
- 如果你 Add 了 3 筆 + Update 了 1 筆，SaveChanges 會把 4 個 SQL 包在一個 Transaction 裡
- 但如果你要「先 SaveChanges 查結果，再決定下一步」→ 需要顯式 Transaction

> 📎 參考來源：`ERP.CommonLib/Data/AuthDbContext.cs` 完整 OnModelCreating（驗證無 Navigation Property）、`ERP.WebAPI.DataAdmin/Services/Authorization/Roles/RolesAdminService.cs`（實際 CRUD 實作模式）

---

## 4. Guardrail 的原子性實作模式（Check-Then-Act）

### 4.1 問題本質
「先查（Check）再做（Act）」在高併發下不安全，因為查和做之間有時間差。

### 4.2 三種解法（由簡到嚴）

**解法 A：Application-level check + DB FK fallback**
```csharp
// 先做友善檢查
var activeCount = await _context.AuthRelationPrincipalRole
    .CountAsync(pr => pr.RoleCode == roleCode && pr.IsActive);
if (activeCount > 0)
    return Result.Fail("仍有 active 指派，禁止刪除");

// 若通過，嘗試刪除；DB FK 做最後防線
_context.AuthRole.Remove(role);
try { await _context.SaveChangesAsync(); }
catch (DbUpdateException) { return Result.Fail("刪除失敗，可能仍有關聯資料"); }
```
優點：簡單、已經比「不檢查直接刪」好很多
缺點：Race condition 下可能出現 DB 層錯誤訊息

**解法 B：顯式 Transaction + 升級隔離等級**
```csharp
using var tx = await _context.Database
    .BeginTransactionAsync(IsolationLevel.RepeatableRead);

var activeCount = await _context.AuthRelationPrincipalRole
    .CountAsync(pr => pr.RoleCode == roleCode && pr.IsActive);
if (activeCount > 0)
{
    await tx.RollbackAsync();
    return Result.Fail("仍有 active 指派，禁止刪除");
}

_context.AuthRole.Remove(role);
await _context.SaveChangesAsync();
await tx.CommitAsync();
```
優點：查和刪在同一個隔離單元；別人在你 commit 前無法新增參照
缺點：鎖比較重

**解法 C：DB Stored Procedure（全部在 DB 端完成）**
```sql
CREATE PROCEDURE sp_DeleteRole @RoleCode NVARCHAR(50), @RowVersion VARBINARY(8)
AS
BEGIN
    SET XACT_ABORT ON;
    BEGIN TRAN;
    IF EXISTS (SELECT 1 FROM AuthRelationPrincipalRole WHERE RoleCode = @RoleCode AND IsActive = 1)
    BEGIN
        ROLLBACK; THROW 50001, '仍有 active 指派', 1;
    END
    DELETE FROM AuthRole WHERE RoleCode = @RoleCode AND RowVersion = @RowVersion;
    IF @@ROWCOUNT = 0 BEGIN ROLLBACK; THROW 50002, '併發衝突', 1; END
    COMMIT;
END
```
優點：最嚴格；DB 端一氣呵成
缺點：邏輯散在 DB 和程式兩邊

### 4.3 你們專案建議用哪種？
考量到 DB-first 架構 + 已有 FK 約束，**解法 A 或 B** 最務實：
- 正常流量用 A（效能好、訊息友善）
- 若發現 race condition 實際造成問題，局部升級到 B

> 📎 參考來源：`_02 角色主檔(AuthRole)` §四 刪除禁令（強制檢查 PrincipalRole）、`_07 授權設定表(AuthRelationGrant)` §六 FK 定義（NO ACTION = Restrict）

---

## 5. 併發衝突的進階處理：重試、合併與衝突解決

### 5.1 Junior Level 只講了「409 衝突」，但接下來呢？

三種業界常見策略：
- **Last Writer Wins（最後寫入者贏）**：不檢查 RowVersion，直接覆蓋 → 最危險，但最簡單
- **Fail and Report（衝突拒絕）**：你們目前的做法，回 409 → 安全但使用者體驗差
- **Merge（合併）**：偵測到衝突後，比較差異，自動合併不衝突的欄位 → 體驗最好，但實作最複雜

### 5.2 EF Core 的 DbUpdateConcurrencyException 詳解
```csharp
try
{
    await _context.SaveChangesAsync();
}
catch (DbUpdateConcurrencyException ex)
{
    var entry = ex.Entries.Single();
    var dbValues = await entry.GetDatabaseValuesAsync();
    
    if (dbValues == null)
    {
        // 資料已被刪除
        return Result.Fail("資料已被其他人刪除");
    }
    
    var dbEntity = (AuthRole)dbValues.ToObject();
    var clientEntity = (AuthRole)entry.Entity;
    
    // 可以在這裡做 merge 邏輯：
    // - 如果只有 RoleName 不同 → auto-merge
    // - 如果 IsActive 或 IsAdmin 不同 → 拒絕合併，回報衝突
    
    // 最終要更新 RowVersion 為 DB 最新版
    entry.OriginalValues.SetValues(dbValues);
}
```

### 5.3 Auth 模組的合併策略建議
- `RoleName`、`RoleDesc`、`Tags`：可以考慮 auto-merge（風險低）
- `IsActive`、`IsAdmin`、`Priority`：必須拒絕 merge（安全敏感）

> 📎 參考來源：`_02 角色主檔(AuthRole)` §四 併發處理（A/B 管理員同時改不同欄位）、`_02` §四 IsAdmin 變更屬高等級安全事件

---

## 6. 索引設計深入：讀懂 Execution Plan 的通用能力

### 6.1 你要養成的習慣：每個重要查詢都看一次 Execution Plan

在 SSMS 裡：
- `Ctrl + L`：預估執行計畫
- `Ctrl + M`：實際執行計畫（要真的跑查詢）

### 6.2 關鍵指標
- **Index Seek** vs **Index Scan** vs **Table Scan**
  - Seek = 精準命中索引（好）
  - Scan = 掃整個索引（壞，除非你本來就要全部）
  - Table Scan = 沒用到任何索引（最壞）

- **Key Lookup**（也叫 RID Lookup 或 Bookmark Lookup）
  - 索引找到 row 了，但需要的欄位不在索引裡，要「回表」去取
  - 解法：用 INCLUDE 把需要的欄位加進索引（= Covering Index）

### 6.3 用你們的 `IX_AuthGrant_Validation` 做解讀練習
```sql
SELECT Effect, ConditionJson, ValidFrom, ValidTo, IsActive
FROM AuthRelationGrant
WHERE ResourceKey = 'PMS:ORDER_FORM'
  AND ActionCode = 'EDIT'
  AND RoleCode IN ('ADMIN', 'PLANNER')
```
- 索引 key = `(ResourceKey, ActionCode, RoleCode)` → Index Seek ✅
- INCLUDE = `(Effect, ConditionJson, ValidFrom, ValidTo, IsActive)` → 不回表 ✅
- 如果你額外 SELECT `Remark`（不在 INCLUDE 裡）→ 會觸發 Key Lookup ❌

### 6.4 何時該加索引、何時不該
- **加**：WHERE 條件裡頻繁出現的欄位組合、JOIN key、ORDER BY
- **不加**：極少查詢的欄位、超大 NVARCHAR(MAX)、經常批次寫入的表（索引維護成本高）
- **監控**：SQL Server 有 DMV（`sys.dm_db_index_usage_stats`）可以看哪些索引被用到、哪些沒有

> 📎 參考來源：`_07 授權設定表(AuthRelationGrant)` §三 全部索引設計、`_05 資源主檔(AuthResource)` §三 IX_AuthResource_Tree / Route、`_09 權杖管理表(AuthTokens)` §三 IX_AuthTokens_Hash

---

## 7. 批次操作（Bulk Operations）：效能與鎖控制

### 7.1 為什麼需要
你們規格書裡有幾個場景會觸發批次操作：
- 收回離職人員的所有角色：`UPDATE AuthRelationPrincipalRole SET IsActive = 0 WHERE UserId = ?`
- 停用整個模組的所有資源：`UPDATE AuthResource SET IsActive = 0 WHERE Path LIKE '/PMS/ORDER/%'`
- 清理過期 Token：`DELETE FROM AuthTokens WHERE ExpiresAt < ?`

### 7.2 風險
- 一次 UPDATE/DELETE 10 萬筆 → 可能鎖表數秒 → 其他 API 逾時
- 規格書提到：「物理刪除一個擁有萬名使用者的角色，會導致資料庫鎖表 (Table Lock) 並引發 API 大規模逾時」

### 7.3 分批處理模式
```csharp
int batchSize = 1000;
int affected;
do
{
    affected = await _context.Database.ExecuteSqlRawAsync(
        "UPDATE TOP({0}) AuthRelationPrincipalRole SET IsActive = 0 WHERE UserId = {1} AND IsActive = 1",
        batchSize, userId);
    // 每批之間可以加短暫延遲，讓其他 Transaction 有機會進來
} while (affected > 0);
```

### 7.4 EF Core 的 ExecuteUpdate / ExecuteDelete（.NET 7+）
```csharp
// 批次更新（不需要先 load entity）
await _context.AuthRelationPrincipalRole
    .Where(pr => pr.UserId == userId && pr.IsActive)
    .ExecuteUpdateAsync(s => s.SetProperty(p => p.IsActive, false)
                              .SetProperty(p => p.ModifiedBy, currentUser)
                              .SetProperty(p => p.ModifiedDate, DateTime.UtcNow));
```
注意：`ExecuteUpdate` / `ExecuteDelete` 不會觸發 EF Change Tracker、不走 RowVersion → 如果需要併發控制，要另外處理。

> 📎 參考來源：`_02 角色主檔(AuthRole)` §四 萬人系統鎖表風險、`_09 權杖管理表(AuthTokens)` §四 TTL 排程清理、`_01 AuthPrincipalUser` §四 停用帳號清理 Token

---

## 8. RBAC 權限決策引擎的查詢路徑設計

### 8.1 你們架構總覽定義的五層決策流程
1. **物理過濾**：IsActive=1 且在有效期內
2. **個人覆寫**（AuthUserOverride）：Deny → 立即拒絕（short-circuit）；Allow → 記下
3. **角色聚合**：直接指派 + 群組繼承的角色
4. **授權矩陣**（AuthRelationGrant）：Deny First → Allow Check
5. **條件過濾**（ConditionJson）：ABAC 細粒度

### 8.2 查詢效能的關鍵：短路（Short-Circuit）
```csharp
// 第一步：快速 Deny 檢查（用 FastDeny 索引）
var hasDeny = await _context.AuthUserOverride
    .AnyAsync(o => o.UserId == userId
                 && o.ResourceKey == resourceKey
                 && o.ActionCode == actionCode
                 && o.Effect == false
                 && o.IsActive
                 && (o.ValidFrom == null || o.ValidFrom <= now)
                 && (o.ValidTo == null || o.ValidTo >= now));

if (hasDeny) return PermissionResult.Deny;

// 後續才進入比較昂貴的 Role Aggregation + Grant Matrix
```

### 8.3 角色聚合的兩條路徑（並行查）
```csharp
// 路徑 A：User 直接指派的 Role
var directRoles = await _context.AuthRelationPrincipalRole
    .Where(pr => pr.UserId == userId && pr.IsActive && ...)
    .Select(pr => pr.RoleCode)
    .ToListAsync();

// 路徑 B：User 所屬 Group 的 Role
var groupRoles = await (
    from ug in _context.AuthUserGroup
    join pr in _context.AuthRelationPrincipalRole on ug.GroupCode equals pr.GroupCode
    where ug.UserId == userId && ug.IsActive && pr.IsActive && ...
    select pr.RoleCode
).ToListAsync();

var allRoles = directRoles.Union(groupRoles).Distinct().ToList();
```

### 8.4 Grant 查詢（一次性撈取 + 應用層判斷）
```csharp
var grants = await _context.AuthRelationGrant
    .Where(g => allRoles.Contains(g.RoleCode)
             && g.ResourceKey == resourceKey
             && g.ActionCode == actionCode
             && g.IsActive
             && (g.ValidFrom == null || g.ValidFrom <= now)
             && (g.ValidTo == null || g.ValidTo >= now))
    .Select(g => new { g.Effect, g.ConditionJson })
    .ToListAsync();

// Deny First
if (grants.Any(g => !g.Effect)) return PermissionResult.Deny;
// Allow Check
if (grants.Any(g => g.Effect)) 
{
    // ABAC：應用層解析 ConditionJson
    // ...
    return PermissionResult.Allow;
}
// Default Deny
return PermissionResult.Deny;
```

> 📎 參考來源：`權限系統架構總覽` 決策引擎五層流程 + 情境 1~5、`_08 個人覆寫表(AuthUserOverride)` §一 決策優先級、`_07 授權設定表(AuthRelationGrant)` §一 決策優先級 + §三 索引、`_10 使用者群組對應表(AuthUserGroup)` §一 權限流轉邏輯

---

## 9. 錯誤翻譯模式（Exception Translation）

### 9.1 DB-first 意味著 DB 層的錯誤會穿透到 Service

在你們的架構裡，FK violation、UNIQUE violation、CHECK violation 都會以 `DbUpdateException` 或 `SqlException` 的形式出現。你要在 Service 層「翻譯」成業務語言。

### 9.2 SqlException 的 Number 是你的判斷依據
| SqlException.Number | 意義 | 建議 HTTP Status |
|---|---|---|
| 547 | FK violation | 409（仍有關聯）或 400（父不存在） |
| 2601 / 2627 | UNIQUE violation | 409（重複） |
| 515 | NOT NULL violation | 400（缺必填欄位） |
| 1205 | Deadlock victim | 應重試 |

### 9.3 實作模式
```csharp
public static class DbExceptionTranslator
{
    public static Result TranslateToBusinessError(DbUpdateException ex)
    {
        if (ex.InnerException is SqlException sqlEx)
        {
            return sqlEx.Number switch
            {
                547 => Result.Fail("操作失敗：仍有關聯資料存在，請先移除相關指派或授權", 
                                   HttpStatusCode.Conflict),
                2601 or 2627 => Result.Fail("操作失敗：資料已存在（代碼重複）", 
                                            HttpStatusCode.Conflict),
                515 => Result.Fail("操作失敗：缺少必填欄位", 
                                   HttpStatusCode.BadRequest),
                _ => Result.Fail($"資料庫異常：{sqlEx.Message}", 
                                HttpStatusCode.InternalServerError)
            };
        }
        return Result.Fail("儲存失敗", HttpStatusCode.InternalServerError);
    }
}
```

### 9.4 在 Service 層使用
```csharp
try
{
    await _context.SaveChangesAsync();
}
catch (DbUpdateConcurrencyException)
{
    return Result.Fail("資料已被其他人修改，請重新載入", HttpStatusCode.Conflict);
}
catch (DbUpdateException ex)
{
    return DbExceptionTranslator.TranslateToBusinessError(ex);
}
```

> 📎 參考來源：`ERP.CommonLib/Data/AuthDbContext.cs` DB-first 規範（EF 不管 FK/Index）、`_02 角色主檔(AuthRole)` §四 刪除禁令（需要友善訊息）、`_07 授權設定表(AuthRelationGrant)` §六 FK SQL（547 會觸發的場景）

---

## 10. 時效性資料模式（Temporal Pattern）

### 10.1 你們大量使用 ValidFrom / ValidTo
涉及的表：
- `AuthRelationPrincipalRole`：角色指派有效期
- `AuthRelationGrant`：授權有效期
- `AuthUserGroup`：群組成員資格有效期
- `AuthUserOverride`：個人覆寫有效期
- `AuthPrincipalGroup`：群組本身有效期

### 10.2 查詢時的標準條件
```csharp
private IQueryable<T> ApplyTemporalFilter<T>(IQueryable<T> query, DateTime now)
    where T : IHasValidity // 假設有 ValidFrom/ValidTo 介面
{
    return query.Where(e => 
        e.IsActive
        && (e.ValidFrom == null || e.ValidFrom <= now)
        && (e.ValidTo == null || e.ValidTo >= now));
}
```

### 10.3 常見踩坑
- **時區問題**：ValidFrom/ValidTo 存的是 UTC 還是 local time？查詢時的 `now` 要對齊
- **NULL 的語意**：`ValidFrom = NULL` = 立即生效；`ValidTo = NULL` = 永不失效
- **邊界值**：`ValidTo = 2024-03-31`，那 3/31 當天算有效還是失效？
  - 規格書的建議：`GETDATE() BETWEEN ISNULL(ValidFrom, '1900-01-01') AND ISNULL(ValidTo, '9999-12-31')`
  - 表示 ValidTo 當天仍有效（inclusive）
- **過期資料堆積**：ValidTo 過了不代表資料會消失，查詢如果忘了過濾就會撈到過期資料

### 10.4 過期資料清理
- AuthUserOverride 規格建議：每月掃描 `ValidTo < NOW` 標記或移入歷史表
- AuthTokens：每天清 `ExpiresAt < NOW - 7天`

> 📎 參考來源：`_04 主體角色關聯(AuthRelationPrincipalRole)` §四 時效性控制、`_03 使用者群組(AuthPrincipalGroup)` §四 時間邊界校驗、`_10 使用者群組對應表(AuthUserGroup)` §四 自動權限收回、`_08 個人覆寫表(AuthUserOverride)` §四 定期清理、`權限系統架構總覽` 決策引擎第一層物理過濾

---

## 11. 安全遷移策略：改 PK、移 FK、表結構變更

### 11.1 為什麼需要這個知識
你們的 AuthRole 規格書同時描述 `RoleId` 為「實體 PK」、`RoleCode` 為「邏輯 PK」。如果未來需要統一或切換，就會面臨「PK 遷移」。

### 11.2 PK/FK 遷移的標準 SOP
1. **新增欄位**（如果目標 PK 不存在）
   ```sql
   ALTER TABLE AuthRelationGrant ADD RoleId NVARCHAR(50) NULL;
   ```
2. **回填資料**
   ```sql
   UPDATE g SET g.RoleId = r.RoleId
   FROM AuthRelationGrant g
   JOIN AuthRole r ON g.RoleCode = r.RoleCode;
   ```
3. **設 NOT NULL + FK**
   ```sql
   ALTER TABLE AuthRelationGrant ALTER COLUMN RoleId NVARCHAR(50) NOT NULL;
   ALTER TABLE AuthRelationGrant ADD CONSTRAINT FK_Grant_RoleId 
       FOREIGN KEY (RoleId) REFERENCES AuthRole(RoleId);
   ```
4. **雙軌運行期**：程式碼同時寫入 RoleCode 和 RoleId
5. **移除舊 FK**
   ```sql
   ALTER TABLE AuthRelationGrant DROP CONSTRAINT FK_AuthGrant_Role;
   ```
6. **清理**：移除程式中的雙寫邏輯

### 11.3 關鍵原則
- **永遠向後相容**：先加新的，最後才刪舊的
- **不要直接 rename PK**：會導致所有 FK 瞬間斷裂
- **在低流量時段執行**：大表的 ALTER + UPDATE 會鎖表
- **先在 staging 環境完整演練**

> 📎 參考來源：`_02 角色主檔(AuthRole)` §二 RoleId/RoleCode 雙 key 矛盾、`_07 授權設定表(AuthRelationGrant)` §六 FK SQL、Junior Level §3.2 更新被參照 key 的風險

---

## 12. 多租戶（Multi-Tenant）隔離的 Service 層實作

### 12.1 你們的 AppCode 模式
`AppCode` 出現在 `AuthRelationPrincipalRole`、`AuthUserGroup`、`AuthPrincipalGroup`、`AuthResource`、`AuthTokens`。

### 12.2 Base Repository / Service 的過濾封裝
```csharp
public class AuthServiceBase
{
    protected readonly AuthDbContext _context;
    protected readonly string _currentAppCode; // 從 HttpContext 或 Config 取得

    /// <summary>
    /// 標準 AppCode 過濾：只看當前系統 + 全域
    /// </summary>
    protected IQueryable<T> FilterByApp<T>(IQueryable<T> query) where T : IHasAppCode
    {
        return query.Where(e => e.AppCode == _currentAppCode || e.AppCode == null);
    }
}
```

### 12.3 寫入時的 AppCode 控制
- 建立資料時，自動填入 `AppCode = _currentAppCode`（除非使用者明確指定 NULL = 全域）
- 更新/刪除時，WHERE 也要包含 AppCode 過濾（避免 PMS 管理員改到 APS 的資料）

### 12.4 跨系統管理介面
DataAdmin 後台（你們的 ERP.DataAdmin）可能需要「看到所有 AppCode」的權限。
建議：用一個特殊的 AppCode（如 `GLOBAL` 或 `*`）代表管理模式，在 Service 層判斷。

> 📎 參考來源：`_03 使用者群組(AuthPrincipalGroup)` §四 AppCode 權限污染防護、`_10 使用者群組對應表(AuthUserGroup)` §四 AppCode 核對、`_04 主體角色關聯(AuthRelationPrincipalRole)` AppCode 欄位、`權限系統架構總覽` 給開發者建議（AppCode 隔離）

---

## 13. 樹狀結構的進階操作：移動、批次停用、路徑查詢最佳化

### 13.1 Materialized Path（你們 AuthResource 使用的）vs 其他方案

| 方案 | 查子樹 | 移動節點 | 適合 |
|---|---|---|---|
| Adjacency List（只存 ParentId）| 需 CTE 遞迴，深度越深越慢 | 改 1 筆 | 淺樹、少量查詢 |
| **Materialized Path（你們用的）** | `LIKE '/ROOT/PMS/%'`，一次搞定 | 要更新所有子孫的 Path | 讀多寫少的選單/資源 |
| Nested Set（左值/右值）| 範圍查詢極快 | 要重算大量左右值 | 超大量分類，幾乎不移動 |
| Closure Table（另開一張關聯表）| 直接 JOIN，最彈性 | 要更新 closure 記錄 | 需要頻繁查詢且偶爾移動 |

### 13.2 移動子樹的 Transaction 模式
```csharp
using var tx = await _context.Database.BeginTransactionAsync();

var node = await _context.AuthResource.FindAsync(resourceKey);
var oldPath = node.Path;   // e.g. "/ROOT/PMS/ORDER/BTN_SAVE/"
var newParent = await _context.AuthResource.FindAsync(newParentKey);

// 防循環：新父的 Path 不能包含當前節點
if (newParent.Path.StartsWith(oldPath))
    throw new InvalidOperationException("不能把節點移動到自己的子樹下");

var newPath = newParent.Path + resourceKey + "/";
node.ParentResourceKey = newParentKey;
node.Path = newPath;

// 批次更新所有子孫的 Path（用 SQL 效能較佳）
var oldPrefix = oldPath;
var newPrefix = newPath;
await _context.Database.ExecuteSqlRawAsync(
    "UPDATE AuthResource SET Path = REPLACE(Path, {0}, {1}) WHERE Path LIKE {2}",
    oldPrefix, newPrefix, oldPrefix + "%");

await _context.SaveChangesAsync();
await tx.CommitAsync();
```

### 13.3 批次停用整棵子樹
```sql
UPDATE AuthResource SET IsActive = 0
WHERE Path LIKE '/PMS/ORDER/%';
```
- 同時也要清理 `AuthRelationGrant` 中參照這些 ResourceKey 的快取

> 📎 參考來源：`_05 資源主檔(AuthResource)` §一 樹狀結構 + §四 循環參照防護 + Lineage 維護 + 禁刪非葉節點、§三 IX_AuthResource_Lineage

---

## 14. 系統預設值保護（Immutable System Data）

### 14.1 概念
某些資料是「系統內建」的，程式碼直接 hardcode 引用（如 `ActionCode = 'VIEW'`）。如果被管理員改名或刪除，整個權限邏輯就崩潰。

### 14.2 你們的表有哪些需要保護
- `AuthAction`：VIEW、CREATE、EDIT、DELETE 等核心動作 → 規格書說「禁止修改核心動作的 ActionCode」
- `AuthResource`：根節點 → 刪除會讓整棵樹斷裂
- `AuthRole`：可能有內建 SUPER_ADMIN → 不能被停用或刪除

### 14.3 實作模式
```csharp
private static readonly HashSet<string> ProtectedActionCodes = new()
{
    "VIEW", "CREATE", "EDIT", "DELETE", "EXPORT", "PRINT",
    "SUBMIT", "APPROVE", "REJECT", "VOID"
};

public async Task<Result> UpdateActionAsync(string actionCode, UpdateActionRequest req)
{
    if (ProtectedActionCodes.Contains(actionCode))
        return Result.Fail("系統內建動作不允許修改");
    // ...
}

public async Task<Result> DeleteActionAsync(string actionCode)
{
    if (ProtectedActionCodes.Contains(actionCode))
        return Result.Fail("系統內建動作不允許刪除");
    // ...
}
```

或者在 DB 用 `IsBasicAction = 1` 標記，程式端檢查：
```csharp
var action = await _context.AuthAction.FindAsync(actionCode);
if (action.IsBasicAction)
    return Result.Fail("基礎動作不可異動");
```

> 📎 參考來源：`_06 操作動作表(AuthAction)` §四 系統預設值保護（不可變更原則）+ §六 初始化 Script（IsBasicAction 標記）、`_05 資源主檔(AuthResource)` §四 禁刪非葉節點

---

## 15. 中階總結：從「能動」到「穩定」

| Junior 教你的 | Middle 教你的 |
|---|---|
| 要包 Transaction | 要選對隔離等級；要處理死鎖 |
| RowVersion 防衝突 | 衝突後要重試/合併/提供清楚訊息 |
| FK 會擋刪除 | 要把 DbUpdateException 翻譯成業務語言 |
| 要建索引 | 要讀 Execution Plan，知道 Seek/Scan/Key Lookup |
| Soft delete 比 hard delete 安全 | 批次操作要分批、要控鎖、要考慮 TTL |
| 有 FK 就能保證關聯 | DB-first 下 FK 是 DB 管，程式要 catch 並翻譯 |
| 查詢要過濾 IsActive | 要把 IsActive + ValidFrom/ValidTo + AppCode 封裝成 base filter |
| 知道權限表有關聯 | 能實作五層決策引擎的查詢路徑 |
| PK 不可變 | 真要遷移時有 SOP（加新→回填→雙軌→移舊） |

---

（完）
