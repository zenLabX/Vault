# PrincipalGroupModuleSpec — AuthPrincipalGroup 模組實作稽核報告

> **Prototype Spec 基準**：`AuthPrincipalGroupPrototypeSpec.md`
> **稽核日期**：2025-07-15
> **涵蓋範圍**：DB Schema → Entity → WebAPI Service / Controller → MVC Controller / AppService / ViewModel → Repository
> **檔案總計**：~30 檔，~4,228 行

---

## §0 — 總覽摘要

| 面向 | 狀態 |
|---|---|
| DB Schema 一致性 | ✅ 14 欄位完全對齊 Spec；PK = GroupId (INT IDENTITY)，UNIQUE 在 GroupCode |
| Entity 映射 | ⚠️ `[Key]` 標注在 GroupCode 而非 GroupId — EF 以 GroupCode 為主鍵，與 DB PK 不一致 |
| CRUD — Create | ✅ 基本完成（GroupCode 唯一性檢查、ValidFrom≤ValidTo、DateTime.UtcNow） |
| CRUD — Read | ⚠️ SearchAsync 接受 `app` 參數但從未用於 WHERE 過濾 |
| CRUD — Update | ✅ 白名單機制正確排除 GroupCode（不可變）、RowVersion 樂觀鎖 |
| CRUD — Delete | 🔴 **實作為 Hard Delete**（`_db.Remove(e)`），Spec 要求僅以 IsActive=0 軟刪除 |
| AppCode 過濾 | 🔴 WebAPI SearchAsync 完全不使用 app 參數 — 所有群組不分 App 全部回傳 |
| 依賴關係檢查 | 🔴 刪除前未檢查 AuthRelationPrincipalRole 等關聯表 |
| 時效控制 (ValidFrom/ValidTo) | ✅ 建立/編輯時檢查 ValidFrom≤ValidTo；⚠️ 權限計算範圍未限制時效 |
| Repository 使用率 | 🔴 Repository 有 433 行完整實作（含 SetActiveAsync、依賴檢查 Delete）但完全未被使用 |

**嚴重度統計**：🔴 Critical × 4 ｜ 🟡 Medium × 8 ｜ ⚪ Low × 4

---

## §1 — 檔案清單與職責

### 1-A｜DB Schema

| # | 檔案 | 行數 | 職責 |
|---|---|---|---|
| 1 | `Database/ERP.DataAdmin/AuthPrincipalGroup.sql` | 64 | CREATE TABLE + UNIQUE 約束 |

### 1-B｜Entity

| # | 檔案 | 行數 | 職責 |
|---|---|---|---|
| 2 | `ERP.CommonLib/Data/Auth/AuthPrincipalGroup.cs` | 186 | EF Core Entity（`[Table("AuthPrincipalGroup")]`） |

### 1-C｜WebAPI 層

| # | 檔案 | 行數 | 職責 |
|---|---|---|---|
| 3 | `ERP.WebAPI.DataAdmin/Services/GroupsAdminService.cs` | 310 | CRUD 業務邏輯（直接使用 EF Core） |
| 4 | `ERP.WebAPI.DataAdmin/Services/IGroupsAdminService.cs` | 63 | Service 介面 |
| 5 | `ERP.WebAPI.DataAdmin/Controllers/.../GroupsAdminController.cs` | ~84 | Base + DI |
| 6 | `…GroupsAdminController.Search.cs` | ~84 | `[HttpGet("search")]` |
| 7 | `…GroupsAdminController.Read.cs` | ~84 | `[HttpGet("{groupCode}")]` |
| 8 | `…GroupsAdminController.Create.cs` | ~84 | `[HttpPost]` |
| 9 | `…GroupsAdminController.Update.cs` | ~84 | `[HttpPut("{groupCode}")]` |
| 10 | `…GroupsAdminController.Delete.cs` | ~84 | `[HttpDelete("{groupCode}")]` |

### 1-D｜DTO / Request

| # | 檔案 | 行數 | 職責 |
|---|---|---|---|
| 11 | `ERP.CommonLib/Models/Dto/Auth/Groups/GroupDto.cs` | 169 | 通用 DTO（含 RowVersion + RowVersionBase64） |
| 12 | `ERP.CommonLib/Models/Dto/Auth/Groups/GroupEditDto.cs` | 159 | 編輯用 DTO（含 RowVersionBase64） |
| 13 | `ERP.CommonLib/Models/Dto/Auth/Groups/GroupListItemDto.cs` | 136 | 清單項 DTO |
| 14 | `ERP.CommonLib/Models/Dto/Auth/Groups/GroupCreatedResultDto.cs` | 93 | 建立結果 DTO（設計上不含 RowVersion） |
| 15 | `ERP.CommonLib/Models/Requests/Auth/Groups/CreateGroupRequest.cs` | 100 | 建立請求模型 |

### 1-E｜MVC 層

| # | 檔案 | 行數 | 職責 |
|---|---|---|---|
| 16 | `ERP.DataAdmin/Controllers/.../GroupsController.cs` | 108 | Base + DI |
| 17 | `…GroupsController.Index.cs` | 281 | 分頁清單 |
| 18 | `…GroupsController.AddNew.cs` | 171 | 新增頁面 |
| 19 | `…GroupsController.Edit.cs` | 197 | 編輯頁面 |
| 20 | `…GroupsController.Delete.cs` | 188 | 刪除確認頁面 |
| 21 | `…GroupsController.Details.cs` | 116 | 唯讀詳情頁面 |

### 1-F｜MVC Service / Interface

| # | 檔案 | 行數 | 職責 |
|---|---|---|---|
| 22 | `ERP.DataAdmin/Services/.../GroupsAppService.cs` | 250 | MVC → WebAPI HTTP 呼叫 |
| 23 | `ERP.DataAdmin/Services/.../IGroupsAppService.cs` | 168 | AppService 介面 |
| 24 | `ERP.DataAdmin/Services/.../GroupsUiMetaService.cs` | 162 | UI-Meta 欄位定義 |
| 25 | `ERP.DataAdmin/Services/.../IGroupsUiMetaService.cs` | ~33 | UiMeta 介面 |

### 1-G｜ViewModel

| # | 檔案 | 行數 | 職責 |
|---|---|---|---|
| 26 | `ERP.DataAdmin/ViewModels/.../GroupRowVM.cs` | 116 | Index 行模型 |
| 27 | `ERP.DataAdmin/ViewModels/.../GroupsEditVM.cs` | 111 | 新增/編輯 VM |
| 28 | `ERP.DataAdmin/ViewModels/.../GroupsDetailsVM.cs` | 42 | 詳情 VM |
| 29 | `ERP.DataAdmin/ViewModels/.../GroupsDeleteVM.cs` | 89 | 刪除確認 VM |

### 1-H｜Repository（Dead Code）

| # | 檔案 | 行數 | 職責 |
|---|---|---|---|
| 30 | `ERP.CommonLib/Repositories/Auth/AuthPrincipalGroupRepository.cs` | 433 | Dapper CRUD + SetActiveAsync + 完整依賴檢查 Delete（**未被任何 Service 引用**） |

---

## §2 — DB Schema 分析

### 2-1｜欄位定義

```
AuthPrincipalGroup
├── GroupId        INT IDENTITY(1,1) NOT NULL   ← PK (CLUSTERED)
├── GroupCode      NVARCHAR(50) NOT NULL         ← UNIQUE (UQ_AuthPrincipalGroup_GroupCode)
├── GroupName      NVARCHAR(200) NOT NULL DEFAULT ''
├── GroupDesc      NVARCHAR(500) NULL
├── AppCode        NVARCHAR(50) NULL             ← NULL = 全域
├── Tags           NVARCHAR(500) NULL
├── IsActive       BIT NOT NULL DEFAULT 1
├── ValidFrom      DATETIME2(7) NULL
├── ValidTo        DATETIME2(7) NULL
├── CreatedBy      NVARCHAR(100) NOT NULL DEFAULT 'System'
├── CreatedDate    DATETIME2(7) NOT NULL DEFAULT getdate()
├── ModifiedBy     NVARCHAR(100) NULL
├── ModifiedDate   DATETIME2(7) NULL
└── RowVersion     TIMESTAMP NOT NULL
```

### 2-2｜約束

| 約束 | SQL | 狀態 |
|---|---|---|
| PK_AuthPrincipalGroup | CLUSTERED on GroupId | ✅ |
| UQ_AuthPrincipalGroup_GroupCode | UNIQUE on GroupCode | ✅（但為 **case-sensitive**，Spec 期望 case-insensitive） |
| FK → 其他表 | 無 | ⚪ 無 FK 約束定義 |

### 2-3｜與 Spec 比對

| Spec 欄位 | DB 欄位 | 狀態 |
|---|---|---|
| GroupId (INT IDENTITY) | ✅ | 一致 |
| GroupCode (NVARCHAR(50), UNIQUE, 不可變) | ✅ | 一致（不可變由 Service 白名單控制） |
| GroupName (NVARCHAR(200)) | ✅ | 一致 |
| GroupDesc (NVARCHAR(500), nullable) | ✅ | 一致 |
| AppCode (NVARCHAR(50), nullable) | ✅ | 一致 |
| Tags (NVARCHAR(500), nullable) | ✅ | 一致 |
| IsActive (BIT, default 1) | ✅ | 一致 |
| ValidFrom / ValidTo (DATETIME2, nullable) | ✅ | 一致 |
| CreatedBy / CreatedDate | ✅ | 一致 |
| ModifiedBy / ModifiedDate | ✅ | 一致 |
| RowVersion (TIMESTAMP) | ✅ | 一致 |

---

## §3 — Entity 分析

**檔案**：`ERP.CommonLib/Data/Auth/AuthPrincipalGroup.cs`（186 行）

### 3-1｜映射正確性

| 項目 | 狀態 | 說明 |
|---|---|---|
| `[Table("AuthPrincipalGroup")]` | ✅ | 資料表名稱正確 |
| `GroupId` — `[DatabaseGenerated(Identity)]` | ✅ | 自動遞增 |
| `GroupCode` — `[Key]` | 🔴 | **DB PK 是 GroupId，但 EF [Key] 標注在 GroupCode** |
| `[Required]` on GroupCode | ✅ | 非空 |
| `[MaxLength]` annotations | ✅ | 長度限制正確 |
| `[Timestamp]` on RowVersion | ✅ | 樂觀鎖支援 |
| `IsActive` default `true` | ✅ | |
| `CreatedDate` default | ⚠️ | 使用 `DateTime.Now` 而非 `DateTime.UtcNow` |
| Navigation Properties | ⚪ | 無導航屬性（Spec 未強制要求） |

### 3-2｜🔴 G-09：Entity `[Key]` 放在 GroupCode 而非 GroupId

```csharp
// Entity 定義
[Key]
public string GroupCode { get; set; }    // ← EF 視為 PK

[DatabaseGenerated(DatabaseGeneratedOption.Identity)]
public int GroupId { get; set; }         // ← DB 實際 PK
```

**風險**：EF Core 將 GroupCode 視為 PK 使用，`DbContext.Find()` / `Attach()` / 變更追蹤都按 GroupCode 判斷。
目前 Service 大多以 `FirstOrDefaultAsync(x => x.GroupCode == ...)` 查詢，暫未引發問題，
但若未來依賴 `_db.Find(groupCode)` 語義或進行 Migration 時可能觸發不一致。

---

## §4 — WebAPI Service 分析

**檔案**：`ERP.WebAPI.DataAdmin/Services/GroupsAdminService.cs`（310 行）

### 4-1｜功能清單

| 方法 | Spec 要求 | 實作狀態 | 備註 |
|---|---|---|---|
| `SearchAsync` | ✅ 分頁搜尋 | ⚠️ 部分實現 | `app` 參數被接受但從未用於 WHERE |
| `GetAsync` | ✅ 依 GroupCode 查詢 | ✅ 完整 | 回傳 GroupEditDto + RowVersionBase64 |
| `CreateAsync` | ✅ 建立群組 | ✅ 完整 | GroupCode 唯一性 ✅、ValidFrom≤ValidTo ✅ |
| `UpdateAsync` | ✅ 更新群組 | ✅ 完整 | 白名單 ✅、GroupCode 不可變 ✅、RowVersion ✅ |
| `DeleteAsync` | ✅ 軟刪除 | 🔴 **Hard Delete** | `_db.AuthPrincipalGroup.Remove(e)` |
| Toggle IsActive | ✅ 啟用/停用 | 🔴 不存在 | Spec 需要 IsActive 切換端點 |

### 4-2｜🔴 G-01：Delete 為 Hard Delete

```csharp
// GroupsAdminService.DeleteAsync 第 ≈280 行
_db.AuthPrincipalGroup.Remove(e);
await _db.SaveChangesAsync();
```

**Spec 要求**：
> 「Delete（軟刪除）：系統僅允許使用 IsActive = 0 來標記群組為無效，不允許物理刪除」

**建議**：
1. 將 `DeleteAsync` 改為將 `IsActive` 設為 `false`（`e.IsActive = false`）
2. Repository 已有 `SetActiveAsync` 方法完全符合此需求
3. 或新增獨立端點 `[HttpPatch("{groupCode}/deactivate")]`

### 4-3｜🔴 G-02：刪除前未檢查依賴關係

**Spec 要求**：
> 「刪除作業前，須先檢查 AuthRelationPrincipalRole 表中是否仍存在以此 GroupCode 為 PrincipalCode 的記錄」

**現況**：`DeleteAsync` 直接刪除，無任何依賴檢查。

**Repository 已有完整實作**（`AuthPrincipalGroupRepository.DeleteAsync`）：
- DryRun 模式
- 檢查 AuthGroupOverride、AuthRelationPrincipalRole、AuthUserGroup、AuthTokens 四張關聯表
- 支援 Cascade 或 Blockers 回報

**建議**：切換至 Repository 的 `DeleteAsync` 或在 Service 層加入等效的依賴檢查。

### 4-4｜🔴 G-03：SearchAsync 忽略 `app` 參數

```csharp
// SearchAsync 方法簽名
public async Task<PagedResults<GroupListItemDto>> SearchAsync(
    string? app, string? keyword, bool? isActive, int page, int pageSize)

// WHERE 條件：只用 keyword 和 isActive — 完全沒有 app 過濾
query = query.Where(x =>
    x.GroupCode.Contains(kw) ||
    x.GroupName.Contains(kw) ||
    x.GroupDesc!.Contains(kw) ||
    x.Tags!.Contains(kw) ||
    x.AppCode!.Contains(kw) ||
    x.GroupId.ToString().Contains(kw)
);
```

**結果**：所有 App 的群組混合回傳，違反 Spec 的 AppCode 過濾要求（`WHERE AppCode = @app OR AppCode IS NULL`）。

**建議**：加入 `if (!string.IsNullOrEmpty(app)) query = query.Where(x => x.AppCode == app || x.AppCode == null);`

### 4-5｜SearchAsync — Keyword 搜尋範圍

| Spec 要求搜尋欄位 | 是否實作 |
|---|---|
| GroupCode | ✅ |
| GroupName | ✅ |
| GroupDesc | ✅ |
| Tags | ✅ |
| AppCode | ✅（但 Spec 是否要求在 keyword 搜 AppCode 待確認） |
| GroupId（數字轉字串） | ⚪ 額外實作，Spec 未要求 |

### 4-6｜Create 驗證比對

| 驗證規則 | 實作 | 備註 |
|---|---|---|
| GroupCode 必填 | ✅ | |
| GroupName 必填 | ✅ | |
| GroupCode 唯一性檢查 | ✅ | `AnyAsync(x => x.GroupCode == req.GroupCode)` |
| GroupCode 不可變 | ✅ | 建立後由 Update 白名單排除 |
| ValidFrom ≤ ValidTo | ✅ | |
| AppCode 預設 PMS | ✅ | `CreateGroupRequest.AppCode` 預設 `"PMS"` |
| IsActive 預設 true | ✅ | Entity 預設 `true` |
| CreatedBy / CreatedDate | ✅ | 使用 `DateTime.UtcNow` |
| GroupCode 格式驗證 | ⚪ | 無 Regex 驗證，依賴前端 UI-Meta |
| GroupCode 大小寫不敏感唯一性 | ⚪ | 未做 `.ToUpper()` 比對 |

### 4-7｜Update 白名單

```
允許更新欄位：GroupName, GroupDesc, AppCode, Tags, IsActive, ValidFrom, ValidTo, RowVersion
排除欄位：    GroupCode, GroupId, CreatedBy, CreatedDate
```

✅ 正確 — GroupCode 不在白名單中（不可變）。

---

## §5 — WebAPI Controller 分析

**路由基底**：`[Route(DataAdminApiRoutes.GroupsV1)]` → `v1/dataadmin/groups`

| Endpoint | HTTP 方法 | 路由 | 狀態 |
|---|---|---|---|
| 搜尋 | GET | `/search?app=&keyword=&isActive=&page=&pageSize=` | ✅（但 app 無效 — G-03） |
| 讀取 | GET | `/{groupCode}` | ✅ |
| 建立 | POST | `/` | ✅ |
| 更新 | PUT | `/{groupCode}` | ✅ |
| 刪除 | DELETE | `/{groupCode}?rowVersionBase64=` | 🔴 Hard Delete |
| 切換啟用 | — | — | 🔴 **不存在** |

### 5-1｜🟡 G-04：缺少 Toggle IsActive 端點

Spec 的「刪除」語義 = 設定 `IsActive = 0`，需要一個獨立的端點：

```
建議新增：PATCH /v1/dataadmin/groups/{groupCode}/toggle-active
Body: { "isActive": false, "rowVersionBase64": "..." }
```

Repository 已有 `SetActiveAsync` 可直接使用。

---

## §6 — MVC Controller 分析

### 6-1｜頁面功能

| 頁面 | Controller | 狀態 | 備註 |
|---|---|---|---|
| Index （清單） | `GroupsController.Index.cs` (281 行) | ⚠️ | 僅傳 keyword，不傳 isActive/Tags |
| AddNew（新增） | `GroupsController.AddNew.cs` (171 行) | ✅ | AppCode 預設 PMS、IsActive=true |
| Edit （編輯） | `GroupsController.Edit.cs` (197 行) | ⚠️ | ModifiedDate 使用 `DateTime.Now` |
| Delete（刪除） | `GroupsController.Delete.cs` (188 行) | 🔴 | Hard Delete、無 RowVersion、無依賴檢查 |
| Details（詳情） | `GroupsController.Details.cs` (116 行) | ✅ | 全欄位唯讀 |

### 6-2｜🟡 G-08：MVC Edit POST 使用 DateTime.Now

```csharp
// GroupsController.Edit.cs POST action
model.Data["ModifiedDate"] = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
```

**問題**：使用本機時間而非 UTC。同 Entity 的 `CreatedDate` 預設值問題（G-07）。
**建議**：改為 `DateTime.UtcNow`。

### 6-3｜🟡 G-11：MVC Index 僅傳 keyword

```csharp
// GroupsController.Index.cs
var result = await _groups.GetPagedAsync(appCode, keyword, page, pageSize);
```

WebAPI 支援 `isActive` 過濾，但：
- `IGroupsAppService.GetPagedAsync` 介面簽名僅有 `(app, keyword, page, pageSize)` — **不接受 isActive**
- MVC 清單無法切換「僅顯示已啟用 / 已停用群組」

### 6-4｜🟡 G-05：MVC Delete 未傳 RowVersion

```csharp
// GroupsController.Delete.cs POST
await _groups.DeleteAsync(appCode, code);
```

- `IGroupsAppService.DeleteAsync(app, id)` 介面簽名無 rowVersion 參數
- 無法利用樂觀鎖防止並發刪除衝突

### 6-5｜DeleteReason 死欄位

`GroupsDeleteVM.DeleteReason` 屬性存在但 Controller 從未讀取或傳遞。

---

## §7 — MVC AppService 分析

**檔案**：`ERP.DataAdmin/Services/Authorization/Groups/GroupsAppService.cs`（250 行）

### 7-1｜方法功能

| 方法 | 狀態 | 備註 |
|---|---|---|
| `GetPagedAsync` | ⚠️ | 不傳 isActive（介面不支援） |
| `GetByIdAsync` / `GetByCodeAsync` | ✅ | 正確使用 `Uri.EscapeDataString` |
| `CreateAsync` | ✅ | 檢查 response.Code |
| `UpdateAsync` | ⚠️ | `_ = await _api.SendAsync(...)` — 丟棄回應，無錯誤檢查 |
| `DeleteAsync` | ⚠️ | 丟棄回應 + 不傳 rowVersionBase64 |

### 7-2｜🟡 G-06：UpdateAsync / DeleteAsync 丟棄 API 回應

```csharp
// GroupsAppService.UpdateAsync
_ = await _api.SendAsync<ApiResponse<object>>(options);    // ← 回應被丟棄

// GroupsAppService.DeleteAsync
_ = await _api.SendAsync<ApiResponse<object>>(options);    // ← 回應被丟棄
```

**風險**：WebAPI 回傳 400/409/500 時，MVC 層靜默忽略，使用者以為操作成功。
**建議**：檢查 `response.Code`，失敗時拋出異常或回傳錯誤訊息。

---

## §8 — Repository 分析（Dead Code）

**檔案**：`ERP.CommonLib/Repositories/Auth/AuthPrincipalGroupRepository.cs`（433 行）

### 8-1｜🟡 G-10：Repository 完全未使用

| Repository 方法 | 功能 | 被呼叫 | 備註 |
|---|---|---|---|
| `FindAsync` | 按 GroupCode 查詢 | ❌ | |
| `GetAllAsync` | 全部查詢 | ❌ | |
| `GetByAppAsync` | 按 AppCode 查詢 | ❌ | |
| `SearchAsync` | 分頁搜尋 | ❌ | |
| `InsertAsync` | 新增 | ❌ | |
| `UpdateAsync` | 更新（含 RowVersion） | ❌ | |
| **`SetActiveAsync`** | **切換 IsActive**（含 RowVersion） | ❌ | **正是 Spec 軟刪除所需** |
| **`SetValidityAsync`** | 更新 ValidFrom/ValidTo | ❌ | |
| **`DeleteAsync`** | **完整刪除**（DryRun/Cascade/Blockers） | ❌ | **檢查 4 張關聯表** |
| `UpsertAsync` | 新增或更新 | ❌ | |
| `RemoveAllMembersAsync` | 移除所有 AuthUserGroup | ❌ | |

**矛盾**：
- WebAPI Service 使用 EF Core 直接操作 `_db.AuthPrincipalGroup`
- Repository 以 Dapper 實作，擁有 `SetActiveAsync`（軟刪除）和完整依賴檢查的 `DeleteAsync`
- 如果 Service 改用 Repository，G-01（Hard Delete）和 G-02（無依賴檢查）可同時解決

### 8-2｜Repository.DeleteAsync 依賴檢查覆蓋

```
檢查的關聯表：
├── AuthGroupOverride       ← 群組覆寫
├── AuthRelationPrincipalRole  ← 群組-角色關聯（Spec 明確要求）
├── AuthUserGroup           ← 使用者-群組關聯
└── AuthTokens              ← 權杖
```

---

## §9 — Gap 清單（依嚴重度排序）

### 🔴 Critical

| ID | 標題 | 位置 | 說明 | 建議修復 |
|---|---|---|---|---|
| G-01 | **Delete 為 Hard Delete** | `GroupsAdminService.DeleteAsync` | `_db.AuthPrincipalGroup.Remove(e)` 直接刪除資料列。Spec 明確要求「僅允許使用 IsActive = 0 軟刪除，不允許物理刪除」。 | 改用 `e.IsActive = false; _db.SaveChangesAsync()` 或引入 Repository 的 `SetActiveAsync` |
| G-02 | **刪除前無依賴關係檢查** | `GroupsAdminService.DeleteAsync` | 未檢查 AuthRelationPrincipalRole、AuthUserGroup 等關聯表。Spec 要求：「須先檢查 AuthRelationPrincipalRole 表中是否仍存在以此 GroupCode 為 PrincipalCode 的記錄」。 | 刪除前查詢關聯表，有記錄則回傳 409 Conflict。Repository.DeleteAsync 已有完整實作。 |
| G-03 | **SearchAsync 忽略 `app` 參數** | `GroupsAdminService.SearchAsync` | 方法簽名接受 `app` 參數，Controller 也傳入，但 LINQ WHERE 完全未使用此參數。所有 App 的群組混合回傳。 | 加入 `query.Where(x => x.AppCode == app \|\| x.AppCode == null)` |
| G-09 | **Entity [Key] 在 GroupCode 而非 GroupId** | `AuthPrincipalGroup.cs` | DB PK = GroupId (INT IDENTITY)，但 EF `[Key]` 標注在 GroupCode。EF 以 GroupCode 為 PK 做變更追蹤，與 DB 實際結構不一致。 | 將 `[Key]` 移至 GroupId，GroupCode 僅保留 `[Required]` + 在 `OnModelCreating` 設定 UNIQUE。 |

### 🟡 Medium

| ID | 標題 | 位置 | 說明 | 建議修復 |
|---|---|---|---|---|
| G-04 | **缺少 Toggle IsActive 端點** | WebAPI Controller | Spec 刪除語義 = IsActive=0 切換，但無對應 API 端點。 | 新增 `[HttpPatch("{groupCode}/toggle-active")]` |
| G-05 | **MVC Delete 不傳 RowVersion** | `GroupsController.Delete.cs` + `IGroupsAppService` | 介面 `DeleteAsync(app, id)` 無 rowVersion 參數，無法做樂觀鎖。 | 介面加 `rowVersionBase64?` 參數 |
| G-06 | **MVC AppService Update/Delete 丟棄回應** | `GroupsAppService.cs` | `_ = await _api.SendAsync(...)` — 400/409/500 時靜默忽略。 | 解析 `response.Code`，非 200 拋異常 |
| G-07 | **Entity CreatedDate = DateTime.Now** | `AuthPrincipalGroup.cs` | Entity 預設 `CreatedDate = DateTime.Now`（本機時間）。WebAPI Service 用 `DateTime.UtcNow` 覆寫故實際影響有限，但 Entity 預設值不一致。 | 改為 `DateTime.UtcNow` |
| G-08 | **MVC Edit POST 用 DateTime.Now** | `GroupsController.Edit.cs` | `model.Data["ModifiedDate"] = DateTime.Now.ToString(...)` — 使用本機時間。 | 改為 `DateTime.UtcNow` |
| G-10 | **Repository 433 行 Dead Code** | `AuthPrincipalGroupRepository.cs` | 完整 Dapper CRUD 包含 SetActiveAsync 和依賴檢查 Delete，但 WebAPI Service 完全未使用。 | 擇一：(A) Service 改用 Repository；(B) 確認不用則移除 |
| G-11 | **MVC Index 僅傳 keyword** | `GroupsController.Index.cs` | 不傳 isActive 或 Tags 過濾條件，清單無法按啟用狀態篩選。 | 擴展 `IGroupsAppService.GetPagedAsync` 加 `isActive?` 參數 |
| G-12 | **IGroupsAppService 不支援 isActive 過濾** | `IGroupsAppService.cs` | `GetPagedAsync(app, keyword, page, pageSize)` 簽名無 `isActive` 參數，即使 WebAPI 支援。 | 介面加 `bool? isActive = null` 參數 |

### ⚪ Low / 改善建議

| ID | 標題 | 位置 | 說明 | 建議 |
|---|---|---|---|---|
| G-13 | **GroupCode 唯一性為 case-sensitive** | `AuthPrincipalGroup.sql` + `GroupsAdminService.CreateAsync` | DB UNIQUE 約束預設 case-sensitive。若 SQL Server collation 為 `CI`（Case-Insensitive）則無影響，否則 `ADMIN` 和 `admin` 可並存。 | 確認 collation，或在 Service 加 `.ToUpperInvariant()` 比對 |
| G-14 | **GroupCreatedResultDto 不含 RowVersion** | `GroupCreatedResultDto.cs` | 設計文件明確說明「不包含主鍵 Id、RowVersion」，為有意為之。但前端在建立後立即編輯需額外 GET 取得 RowVersion。| 依需求考慮加入 RowVersionBase64 |
| G-15 | **ValidFrom/ValidTo 權限計算未限制時效** | 權限引擎範圍 | Spec 期望群組的 ValidFrom/ValidTo 在權限計算時應作為過濾條件，但此為權限引擎層級實作。 | 在權限引擎查詢時加入 `WHERE ValidFrom <= GETUTCDATE() AND (ValidTo IS NULL OR ValidTo >= GETUTCDATE())` |
| G-16 | **GroupsDeleteVM.DeleteReason 死欄位** | `GroupsDeleteVM.cs` + `GroupsController.Delete.cs` | VM 有 `DeleteReason` 屬性但 Controller 從未讀取或使用。 | 移除或實作稽核記錄 |

---

## §A — 附錄：Prototype Spec vs 實作矩陣

| Spec 規格項目 | 狀態 | Gap ID |
|---|---|---|
| GroupId = INT IDENTITY (內部主鍵) | ✅ | — |
| GroupCode = NVARCHAR(50) UNIQUE (業務鍵) | ✅ | — |
| GroupCode 不可變（建立後不可修改） | ✅ | —（Update 白名單排除） |
| GroupCode case-insensitive 唯一性 | ⚪ | G-13 |
| GroupName 必填 | ✅ | — |
| GroupDesc / Tags nullable | ✅ | — |
| AppCode nullable（NULL=全域） | ✅ | — |
| AppCode 範圍過濾（Search 依 AppCode） | 🔴 | G-03 |
| IsActive 預設 true | ✅ | — |
| ValidFrom ≤ ValidTo 檢查 | ✅ | — |
| ValidFrom/ValidTo 時效在權限計算中生效 | ⚪ | G-15 |
| RowVersion 樂觀鎖 | ✅（WebAPI）/ ⚠️（MVC Delete） | G-05 |
| Delete = 軟刪除（IsActive=0）| 🔴 | G-01 |
| Delete 前依賴檢查（AuthRelationPrincipalRole）| 🔴 | G-02 |
| 禁止物理刪除 | 🔴 | G-01 |
| Tags 用於搜尋 | ✅ | — |
| 分頁搜尋 + 多欄位關鍵字 | ✅ | — |
| CreatedBy / CreatedDate 由後端設定 | ✅ | — |
| ModifiedBy / ModifiedDate 更新時寫入 | ✅ | — |
| 群組作為 RBAC 緩衝層 | ✅（架構層面） | — |

---

## §B — 附錄：建議修復優先順序

| 優先級 | Gap ID | 工作量估計 | 說明 |
|---|---|---|---|
| P0 | G-01 + G-02 | 2-4 hr | Delete 改軟刪除 + 加依賴檢查（可引入 Repository） |
| P0 | G-03 | 0.5 hr | SearchAsync 加 AppCode WHERE 條件 |
| P0 | G-09 | 1-2 hr | Entity [Key] 修正（需確認 EF Migration 影響） |
| P1 | G-04 | 1-2 hr | 新增 Toggle IsActive 端點 |
| P1 | G-05 + G-06 | 1-2 hr | MVC AppService 加 RowVersion + 回應檢查 |
| P1 | G-11 + G-12 | 1 hr | IGroupsAppService 加 isActive 參數 |
| P2 | G-07 + G-08 | 0.5 hr | DateTime.Now → DateTime.UtcNow |
| P2 | G-10 | 決策點 | Repository 留用或移除 |
| P3 | G-13~G-16 | 各 0.5 hr | 低優先改善 |

---

*報告結束 — PrincipalGroupModuleSpec v1.0*
