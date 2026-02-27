# RelationGrant Module Spec — 實作狀態稽核報告

日期：2026-02-27  
對照文件：  
- `AuthRelationGrantPrototypeSpec.md`（2026-02-26，主要對照）  
- `_extracted/_技術規格書_權限模組_07_授權設定表_AuthRelationGrant_.txt`（技術規格書，輔助對照）

---

## 0. 涵蓋範圍

| 層級 | 主要檔案 |
|---|---|
| **MVC 前端** | `ERP.DataAdmin/Controllers/Authorization/GrantsController.cs`（Base + `.Index` / `.AddNew` / `.Edit` / `.Delete` / `.Details`） |
| **MVC Views** | `ERP.DataAdmin/Views/Authorization/Grants/`（Index / AddNew / Edit / Delete / Details） |
| **MVC ViewModels** | `GrantRowVM` / `GrantsEditVM` / `GrantsDeleteVM` / `GrantsDetailsVM` |
| **MVC Service** | `ERP.DataAdmin/Services/Authorization/Grants/GrantsAppService.cs`（IGrantsAppService）|
| **MVC UI-Meta** | `ERP.DataAdmin/Services/Authorization/Grants/GrantsUiMetaService.cs`（IGrantsUiMetaService）|
| **WebAPI Controller** | `ERP.WebAPI.DataAdmin/Controllers/Admin/GrantsAdminController.cs`（Base + `.Search` / `.Read` / `.Create` / `.Update` / `.Delete`）|
| **WebAPI Service** | `ERP.WebAPI.DataAdmin/Services/Authorization/Grants/GrantsAdminService.cs`（IGrantsAdminService）|
| **Entity** | `ERP.CommonLib/Models/Entities/Auth/AuthRelationGrant.cs` |
| **DTO** | `GrantDto` / `GrantListItemDto` / `GrantEditDto` / `GrantCreatedResultDto` |
| **Request** | `CreateGrantRequest` |
| **Repository** | `ERP.CommonLib/Repositories/Auth/AuthRelationGrantRepository.cs` |
| **Routes** | `ERP.ApiRoutes/Systems/DataAdmin/DataAdminApiRoutes.Authorization.cs`（`GrantsV1 = "v1/dataadmin/grants"`）|
| **DB Schema** | `Database/ERP.DataAdmin/dbo/Table/AuthRelationGrant.sql` |

---

## 1. 資料模型層（Entity / DB）

| Spec 要求 | 狀態 | 實際實作 | 備註 |
|---|---|---|---|
| PK = `GrantCode` NVARCHAR(40) 單一主鍵 | ✅ 已實現 | Entity `[Key][StringLength(40)]` + DB `CONSTRAINT PK_AuthRelationGrant` | — |
| FK → `AuthRole(RoleCode)` | ✅ 已實現 | DB 有 `FK_AuthRelationGrant_RoleCode` | Entity 註解有標示 FK，但遵循 DB-First 架構不在 EF Code 定義 |
| FK → `AuthResource(ResourceKey)` | ✅ 已實現 | DB 有 `FK_AuthRelationGrant_ResourceKey` | 同上 |
| FK → `AuthAction(ActionCode)` | ✅ 已實現 | DB 有 `FK_AuthRelationGrant_ActionCode` | 同上 |
| Effect（BIT, 必填, 1=ALLOW / 0=DENY） | ✅ 已實現 | Entity `[Required] bool Effect`，DB `DEFAULT ((1))` | — |
| IsActive（BIT, 必填） | ✅ 已實現 | Entity `[Required] bool IsActive`，DB `DEFAULT ((1))` | — |
| ConditionJson（NVARCHAR(MAX), 選填） | ✅ 已實現 | Entity `string? ConditionJson` | — |
| ValidFrom / ValidTo（DATETIME, 選填） | ✅ 已實現 | Entity `DateTime? ValidFrom` / `DateTime? ValidTo` | — |
| Remark（NVARCHAR(200), 選填） | ✅ 已實現 | Entity `[StringLength(200)] string? Remark` | — |
| RowVersion（ROWVERSION / timestamp） | ✅ 已實現 | Entity `[Timestamp] byte[] RowVersion` | — |
| Audit Fields（CreatedBy/CreatedDate/ModifiedBy/ModifiedDate） | ✅ 已實現 | Entity 完整定義 | — |
| DB CHECK `ValidFrom <= ValidTo` | ❌ 未實現 | DB Schema（.sql）無 CHECK constraint | Spec 明確有 `CK_AuthGrant_DateRange`，但實際 DB 腳本未建立 |
| DB CHECK `Effect IN (0,1)` | ⚠️ 隱含 | `BIT` 型別本身只能是 0/1，無需額外 CHECK | Spec 有列，但 BIT 天生已滿足 |
| 索引 `IX_AuthGrant_Validation` (Covering Index) | ❌ 未實現 | DB Schema 無此索引 | Spec 要求 `(ResourceKey, ActionCode, RoleCode) INCLUDE (Effect, ConditionJson, ValidFrom, ValidTo, IsActive)` |
| 索引 `IX_AuthGrant_RoleView` | ❌ 未實現 | DB Schema 無此索引 | Spec 要求 `(RoleCode) INCLUDE (ResourceKey, ActionCode, Effect)` |
| 篩選唯一索引 `UX_AuthGrant_UniqueRule` | ❌ 未實現 | DB Schema 無此索引 | Spec 要求 `(RoleCode, ResourceKey, ActionCode) WHERE ConditionJson IS NULL AND ValidFrom IS NULL AND ValidTo IS NULL` |

---

## 2. WebAPI 後端（Controller → Service）

### 2.1 端點完整度

| Spec 功能 | HTTP 動作 | 路由 | 狀態 | 實際 |
|---|---|---|---|---|
| Search / Index（分頁查詢） | GET | `v1/dataadmin/grants/search` | ✅ 已實現 | `GrantsAdminController.Search.cs` → `SearchAsync()` |
| Detail（單筆讀取） | GET | `v1/dataadmin/grants/{grantCode}` | ✅ 已實現 | `GrantsAdminController.Read.cs` → `GetAsync()` |
| Add New（建立） | POST | `v1/dataadmin/grants` | ✅ 已實現 | `GrantsAdminController.Create.cs` → `CreateAsync()` |
| Edit（更新） | PUT | `v1/dataadmin/grants/{grantCode}` | ✅ 已實現 | `GrantsAdminController.Update.cs` → `UpdateAsync()` |
| Delete | DELETE | `v1/dataadmin/grants/{grantCode}` | ✅ 已實現 | `GrantsAdminController.Delete.cs` → `DeleteAsync()` |

### 2.2 Search 查詢條件

| Spec 查詢條件 | 狀態 | 實際實作 |
|---|---|---|
| GrantCode（contains） | ✅ 已實現 | `x.GrantCode.Contains(kw)` |
| RoleCode（contains） | ✅ 已實現 | `x.RoleCode.Contains(kw)` |
| ResourceKey（contains） | ✅ 已實現 | `x.ResourceKey.Contains(kw)` |
| ActionCode（contains） | ✅ 已實現 | `x.ActionCode.Contains(kw)` |
| Remark（contains） | ✅ 已實現 | `x.Remark != null && x.Remark.Contains(kw)` |
| ConditionJson（contains） | ✅ 已實現 | `x.ConditionJson != null && x.ConditionJson.Contains(kw)` |
| **IsActive 篩選（獨立參數）** | ✅ 已實現 | `isActive` 查詢參數，`q.Where(x => x.IsActive == isActive.Value)` |
| **Effect 篩選（獨立參數）** | ❌ 未實現 | Search 無 Effect filter 參數；僅能透過 keyword 模糊搜尋 |
| **app（多租戶）** | ⚠️ 簽名保留 | Controller 接收 `app` 參數但 Service 層未使用 |

### 2.3 Search 結果欄位

| Spec 結果欄位 | 狀態 | 實際 |
|---|---|---|
| GrantCode | ✅ | `GrantListItemDto.GrantCode` |
| RoleCode | ✅ | `GrantListItemDto.RoleCode` |
| ResourceKey | ✅ | `GrantListItemDto.ResourceKey` |
| ActionCode | ✅ | `GrantListItemDto.ActionCode` |
| Effect | ✅ | `GrantListItemDto.Effect` |
| IsActive | ✅ | `GrantListItemDto.IsActive` |
| ValidFrom | ✅ | `GrantListItemDto.ValidFrom` |
| ValidTo | ✅ | `GrantListItemDto.ValidTo` |
| Remark | ✅ | `GrantListItemDto.Remark` |
| ModifiedDate | ❌ 未包含 | `GrantListItemDto` 有 `ModifiedDate` 與 `RowVersionBase64` 但 Service 的 `Select()` 投影未映射 |
| RowVersionBase64 | ❌ 未包含 | 同上；`GrantListItemDto` 定義了欄位但 Service 查詢未回傳 |

### 2.4 Create 驗證邏輯

| Spec 驗證項目 | 狀態 | 實際實作 |
|---|---|---|
| GrantCode 必填 | ✅ 已實現 | `if (string.IsNullOrWhiteSpace(req.GrantCode)) return (false, 400, ...)` |
| RoleCode 必填 | ✅ 已實現 | 同上模式 |
| ResourceKey 必填 | ✅ 已實現 | 同上模式 |
| ActionCode 必填 | ✅ 已實現 | 同上模式 |
| **GrantCode 唯一性檢查** | ✅ 已實現 | `_db.AuthRelationGrant.AnyAsync(x => x.GrantCode == req.GrantCode)` |
| **FK 友善驗證（RoleCode 是否存在）** | ❌ 未實現 | Service 直接寫入，靠 DB FK constraint 報錯 |
| **FK 友善驗證（ResourceKey 是否存在）** | ❌ 未實現 | 同上 |
| **FK 友善驗證（ActionCode 是否存在）** | ❌ 未實現 | 同上 |
| **ConditionJson JSON 格式驗證** | ❌ 未實現 | 直接 `TrimToNull()` 後存入，未驗證 JSON 合法性 |
| **ValidFrom ≤ ValidTo 日期邏輯檢查** | ❌ 未實現 | 使用 `ParseDate()` 轉換後直接存入，未做比較 |
| **UniqueRule 驗證（同 tuple 無條件無期限唯一）** | ❌ 未實現 | 未檢查「同 RoleCode+ResourceKey+ActionCode 且 ConditionJson/ValidFrom/ValidTo 皆 NULL」是否已存在 |
| Effect 值（0/1） | ✅ 隱含 | `req.Effect` 為 `bool`，C# bool 只有 true/false |
| 系統欄位自動填入（CreatedBy/CreatedDate） | ✅ 已實現 | `userName ?? "admin"` + `DateTime.UtcNow` |
| Remark Trim | ✅ 已實現 | `StringProcessHelper.TextFormat.TrimToNull(req.Remark)` |
| 各欄位 Trim | ✅ 已實現 | `req.GrantCode.Trim()` 等 |

> **注意**：Repository 層（`AuthRelationGrantRepository.InsertAsync()`）有實作 FK 友善檢查（RoleCode / ResourceKey / ActionCode 預查），但 WebAPI Service 層（`GrantsAdminService.CreateAsync()`）未使用 Repository，而是直接透過 EF Core `_db.AuthRelationGrant.Add(e)` 寫入。

### 2.5 Update 驗證邏輯

| Spec 驗證項目 | 狀態 | 實際實作 |
|---|---|---|
| grantCode 必填 | ✅ 已實現 | `if (string.IsNullOrWhiteSpace(grantCode)) return (false, 400, ...)` |
| body 非空 | ✅ 已實現 | `if (data is null) return (false, 400, ...)` |
| 資料存在檢查 | ✅ 已實現 | `FirstOrDefaultAsync` → 404 |
| 白名單欄位限制 | ✅ 已實現 | `allowed` HashSet 包含 `RoleCode, ResourceKey, ActionCode, Effect, IsActive, ConditionJson, ValidFrom, ValidTo, Remark` |
| 樂觀鎖（RowVersion） | ✅ 已實現 | `ByteConverter.TryGetBase64Bytes(data, "RowVersion", ...)` → 設定 OriginalValue |
| 併發衝突攔截 | ✅ 已實現 | `catch (DbUpdateConcurrencyException) → 409` |
| 審計欄位 | ✅ 已實現 | `ModifiedBy + ModifiedDate = UtcNow` |
| **RoleCode / ResourceKey / ActionCode 應鎖定不可改** | ❌ 未實現 | Update 白名單仍包含 `RoleCode, ResourceKey, ActionCode`，允許修改。**Prototype Spec 明確要求 Edit 鎖定三欄位（要改需刪除後新增）** |
| **ConditionJson JSON 格式驗證** | ❌ 未實現 | 直接 `TrimToNull()` 後更新 |
| **ValidFrom ≤ ValidTo 日期邏輯檢查** | ❌ 未實現 | 直接 `ParseDate()` 後更新 |
| **UniqueRule 驗證** | ❌ 未實現 | 修改 ConditionJson/ValidFrom/ValidTo 為 NULL 時，未檢查是否觸發 UniqueRule 衝突 |
| **FK 友善驗證（修改 RoleCode 時）** | ❌ 未實現 | 允許修改 RoleCode/ResourceKey/ActionCode，但無預查 FK 是否存在 |
| bool 轉換（Effect / IsActive） | ✅ 已實現 | `ParseBool()` 支援 `"true"/"false"/"1"/"0"` 等 |
| 日期轉換（ValidFrom / ValidTo） | ✅ 已實現 | `ParseDate()` 支援多格式 |

### 2.6 Delete 驗證邏輯

| Spec 驗證項目 | 狀態 | 實際實作 | 備註 |
|---|---|---|---|
| 資料存在檢查 | ✅ 已實現 | `FirstOrDefaultAsync` → 404 | — |
| 樂觀鎖（RowVersion） | ✅ 已實現 | `StringToByteConverter.TryBase64()` → 設定 OriginalValue | — |
| 併發衝突攔截 | ✅ 已實現 | `catch (DbUpdateConcurrencyException) → 409` | — |
| **刪除策略：Hard Delete** | 🔴 與 Spec 不一致 | `_db.AuthRelationGrant.Remove(e)` → 物理刪除 | **Prototype Spec §2/§3.4/§5.5 明確定義「Delete 一律做軟刪除（IsActive=0）並更新 Modified/RowVersion」**。技術規格書亦設計 IsActive 供快速開關而不需物理刪除 |

---

## 3. MVC 前端（Controller → View）

### 3.1 頁面完整度

| 頁面 | 狀態 | 實際 |
|---|---|---|
| Index（列表） | ✅ 已實現 | `GrantsController.Index.cs` → `Views/Authorization/Grants/Index.cshtml` |
| AddNew（新增） | ✅ 已實現 | `GrantsController.AddNew.cs` GET/POST → `Views/Authorization/Grants/AddNew.cshtml` |
| Edit（編輯） | ✅ 已實現 | `GrantsController.Edit.cs` GET/POST → `Views/Authorization/Grants/Edit.cshtml` |
| Delete（刪除確認） | ✅ 已實現 | `GrantsController.Delete.cs` GET/POST → `Views/Authorization/Grants/Delete.cshtml` |
| Details（唯讀檢視） | ✅ 已實現 | `GrantsController.Details.cs` → `Views/Authorization/Grants/Details.cshtml` |

### 3.2 Index 頁功能

| 功能 | 狀態 | 實際實作 |
|---|---|---|
| 分頁查詢 | ✅ 已實現 | `GetPagedAsync(appCode, keyword, page, pageSize)` |
| Keyword 搜尋 | ✅ 已實現 | 傳入 `keyword` 參數 |
| 動態欄位（UI-Meta columns） | ✅ 已實現 | `_grantsUiMeta.GetListColumnsAsync()` |
| 多語系表頭 | ✅ 已實現 | `_localizationApp.GetTableFieldTextsAsync()` |
| 行操作按鈕（View / Edit / Delete） | ✅ 已實現 | 每行 3 個 `UiTableAction` |
| 工具列（Toolbar）+ 可選 pageSize | ✅ 已實現 | `ViewData["TableToolbarConfig"]` |
| Breadcrumb 導航 | ✅ 已實現 | `ApplyBreadcrumb(...)` |
| 側邊欄多語系 | ✅ 已實現 | `_localizationApp.GetStringTextsAsync(...)` |

### 3.3 AddNew 頁功能

| 功能 | 狀態 | 實際實作 |
|---|---|---|
| UI-Meta 動態欄位 | ✅ 已實現 | `_grantsUiMeta.GetFormFieldsAsync(form: "Grants.AddNew")` |
| 必填檢查（依 Meta required） | ✅ 已實現 | 遍歷 `fields.Where(f => f.Required)` |
| GrantCode 自動產生（GUID） | ✅ 已實現 | `Guid.NewGuid().ToUpperString()` |
| 系統欄位自動填入 | ✅ 已實現 | `CreatedBy = User.Identity.Name`，`CreatedDate = UtcNow` |
| bool 轉換（Effect / IsActive） | ✅ 已實現 | `ToNullableBool()` |
| 預設值（Effect=true, IsActive=true） | ✅ 已實現 | `Data["Effect"] = true, Data["IsActive"] = true` |
| **下拉選單（RoleCode / ResourceKey / ActionCode）** | ⚠️ 硬編碼 | 下拉選項為寫死的 `SelectListItem`，未從 API 動態取得。Prototype Spec §3.2 定義三欄位皆為 FK，應動態載入 |
| **ConditionJson 前端 JSON 格式檢查** | ❌ 未實現 | Prototype Spec §3.5/§5.3 要求 Save 時做 `JSON.parse` 格式驗證；目前無前端驗證 |
| **ValidFrom ≤ ValidTo 前端日期驗證** | ❌ 未實現 | Prototype Spec §3.6/§5.3 要求 Save 時做日期邏輯檢查；目前無前端驗證 |
| **UniqueRule 前端提示** | ❌ 未實現 | Prototype Spec §5.3/§6 要求違反 UniqueRule 時顯示錯誤訊息；目前無此邏輯 |
| 新增成功 → 導向 Index | ✅ 已實現 | `TempData["ok"]` + `RedirectToAction(nameof(Index))` |
| 新增失敗 → 顯示錯誤 | ✅ 已實現 | `TempData["err"]` + 回到 AddNew View |

### 3.4 Edit 頁功能

| 功能 | 狀態 | 實際實作 |
|---|---|---|
| UI-Meta 動態欄位 | ✅ 已實現 | `_grantsUiMeta.GetFormFieldsAsync(form: "Grants.Edit")` |
| 資料載入 | ✅ 已實現 | `_grants.GetByCodeAsync(appCode, grantCode)` |
| 必填檢查 | ✅ 已實現 | 遍歷 `fields.Where(z => z.Visible && z.Required)` |
| Regex 格式驗證 | ✅ 已實現 | `Regex.IsMatch(s, f.Regex)` |
| RowVersion 攜帶 | ✅ 已實現 | 從 DTO 映射 `RowVersionBase64` 至 `Data["RowVersion"]` |
| **RoleCode / ResourceKey / ActionCode 前端鎖定（不可編輯）** | ❌ 未實現 | Edit View 的 `_FieldEditor` partial 依 UI-Meta 欄位定義渲染，但 Controller 未對三欄位設定 `ReadOnly = true`；View 本身也無 `readonly`/`disabled` 處理。**Prototype Spec §2/§3.2/§5.4 明確要求 Edit 模式鎖定三欄位** |
| **UniqueRule 前端提示** | ❌ 未實現 | Prototype Spec §5.4 指出 Edit 清空 ConditionJson/ValidFrom/ValidTo 可能觸發 UniqueRule 衝突 |
| **Deny Override 警告提示** | ❌ 未實現 | Prototype Spec §3.3/§7.1 要求 UI 提示 DENY 權重最高，目前 Edit 表單無此警告 |
| 更新成功 → 導向 Index | ✅ 已實現 | `TempData["ok"]` + `RedirectToAction(nameof(Index))` |
| 更新失敗 → 顯示錯誤 | ✅ 已實現 | `TempData["err"]` + 回到 Edit View |
| **下拉選單（RoleCode / ResourceKey / ActionCode）** | ⚠️ 硬編碼 | 同 AddNew，寫死的選項列表 |

### 3.5 Delete 頁功能

| 功能 | 狀態 | 實際實作 |
|---|---|---|
| 刪除確認頁（GET） | ✅ 已實現 | 顯示 GrantCode / RoleCode / ResourceKey / ActionCode / Effect / IsActive |
| UI-Meta 動態欄位 | ✅ 已實現 | `_grantsUiMeta.GetFormFieldsAsync(form: "Grants.Delete")` |
| 執行刪除（POST） | ✅ 已實現 | `_grants.DeleteAsync(appCode, grantCode)` |
| 刪除結果顯示 | ✅ 已實現 | `TempData["DeleteResult"]` + `TempData["DeleteMessage"]` |
| **DeletePost 中 form 參數寫錯** | 🔴 Bug | POST handler 呼叫 `GetFormFieldsAsync(form: "Resources.Delete")`，應為 `"Grants.Delete"` |
| **DeleteReason 欄位** | ⚠️ 未使用 | `GrantsDeleteVM` 定義了 `DeleteReason` 屬性，但 Controller 未使用 |

### 3.6 Details 頁功能

| 功能 | 狀態 | 實際實作 |
|---|---|---|
| 唯讀顯示 | ✅ 已實現 | 載入後 `foreach (var f in fields) f.ReadOnly = true` |
| 完整欄位顯示 | ✅ 已實現 | Grant 所有欄位 + ConditionJson + ValidFrom/To + Remark + audit fields |
| **form 參數不一致** | ⚠️ 次要 | Details 使用 `form: "Grants.AddNew"` 取得欄位定義，非 `"Grants.Details"` |

---

## 4. Repository 層（Dapper）

Repository（`AuthRelationGrantRepository.cs`）提供額外的 Dapper-based CRUD 與查詢方法，但 **WebAPI Service 未使用 Repository，改用 EF Core 直接操作**。

| Repository 方法 | 用途 | WebAPI Service 是否使用 |
|---|---|---|
| `FindAsync(grantCode)` | 單筆查詢 | ❌ 未使用（EF `FirstOrDefaultAsync`） |
| `GetByRoleAsync(roleCode)` | 按角色查全部授權 | ❌ 未使用 |
| `GetEffectiveAsync(roleCodes, resourceKey, actionCode, atUtc)` | 有效權限查詢 | ❌ 未使用（但 PMS WebAPI 可能使用） |
| `InsertAsync(entity)` | 新增（**含 FK 友善驗證**） | ❌ 未使用 |
| `UpdateAsync(entity, rowVersion, grantCode)` | 更新（含 RowVersion） | ❌ 未使用 |
| `DeleteAsync(grantCode, rowVersion)` | 刪除（含 RowVersion） | ❌ 未使用 |
| `DeleteByRoleAsync(roleCode)` | 批量刪除某角色所有授權 | ❌ 未使用 |
| `SetActiveAsync(grantCode, isActive, rowVersion)` | 啟用/停用 | ❌ 未使用 |
| `SetValidityAsync(grantCode, validFrom, validTo, rowVersion)` | 調整有效期 | ❌ 未使用 |
| `UpsertAsync(entity, rowVersion)` | 若存在則更新否則新增 | ❌ 未使用 |
| `GetEffectiveBulkAsync(roleCodes, resActs, atUtc)` | 批量有效權限查詢 | ❌ 未使用 |

> **重要發現**：Repository 的 `InsertAsync()` 有實作 FK 友善檢查（預查 AuthRole / AuthResource / AuthAction 是否存在），但 WebAPI Service 完全繞過 Repository 直接用 EF Core，導致此防禦措施不被利用。

---

## 5. Spec 決策面項目匯總

| Spec 決策項目 | 來源 | 狀態 | 說明 |
|---|---|---|---|
| 決策優先級：Deny Override > Explicit Allow > Default Deny | Prototype §1(2) / 技術規格 | ⚠️ 非本模組職責 | 此邏輯在權限驗證引擎（Permission Evaluator）中實現，Grant CRUD 模組無需處理 |
| Deny 優先原則 UI 提示 | Prototype §3.3/§7.1 | ❌ 未實現 | 兩份文件均要求「UI 必須警告管理員：DENY 權重最高，會覆蓋其他角色的 ALLOW」，目前 AddNew/Edit 前端無此提示 |
| Delete = Soft Delete（IsActive=0） | Prototype §2/§3.4/§5.5 | ❌ 未實現 | Prototype Spec 明確定義「Delete 一律做軟刪除（IsActive=0）並更新 Modified/RowVersion」，實際使用 Hard Delete |
| Edit 鎖定 RoleCode/ResourceKey/ActionCode | Prototype §2/§3.2/§5.4 | ❌ 未實現 | Edit 模式應鎖定三欄位（要改需刪除後新增），實際 WebAPI 白名單仍允許修改且 View 無 readonly |
| ConditionJson 寫入前 JSON 格式驗證 | Prototype §3.5/§5.3/§7.1 | ❌ 未實現 | Create / Update 均未驗證 |
| ValidFrom ≤ ValidTo 驗證 | Prototype §3.6/§5.3 / 技術規格 | ❌ 未實現 | Create / Update 均未檢查 |
| UniqueRule（同 tuple 無條件無期限唯一） | Prototype §5.3/§5.4/§6 / 技術規格 | ❌ 未實現 | Service 層無此驗證，DB 亦缺此索引 |
| UniqueRule + Soft Delete 互動 | Prototype §6（重要細節） | ❌ 未實現 | UniqueRule WHERE 不含 IsActive，soft-deleted 記錄仍佔位阻止新增，目前無處理 |
| 禁止 DB 層級 JSON 解析 | Prototype §1(4)/§7.2 / 技術規格 | ✅ 已遵守 | 查詢條件中無 `JSON_VALUE()` 使用 |
| Role-Based Cache + Redis 失效 | Prototype §1(4)/§7.2 / 技術規格 | ❌ 未實現 | Grant 異動後未清除對應 Role 的 Redis Cache Key |

---

## 6. 差距清單（Gap List）

### 🔴 必須修復（Must Fix）

| 編號 | 問題 | 說明 | 影響範圍 |
|---|---|---|---|
| G1 | **Hard Delete 取代 Soft Delete** | `GrantsAdminService.DeleteAsync()` 使用 `_db.AuthRelationGrant.Remove(e)` 物理刪除。**Prototype Spec §2/§3.4/§5.5 明確定義「Delete 一律做軟刪除（IsActive=0）並更新 Modified/RowVersion」**。技術規格書亦設計 IsActive 供快速開關。 | WebAPI Service |
| G2 | **ConditionJson 未做 JSON 格式驗證** | Create / Update 直接 `TrimToNull()` 存入，未驗證合法 JSON。**Prototype Spec §3.5/§5.3 要求「Save 時做 JSON.parse 格式檢查」**；技術規格書亦要求：「應用層寫入前必須驗證 JSON 格式，否則導致 Runtime Error」。 | WebAPI Service |
| G3 | **ValidFrom ≤ ValidTo 未做日期邏輯檢查** | Create / Update 均未比較 ValidFrom 與 ValidTo。**Prototype Spec §3.6/§5.3 要求「Save 時做 ValidFrom ≤ ValidTo 驗證」**；DB 也缺少 CHECK constraint（見 G4）。 | WebAPI Service + DB |
| G4 | **DB 缺少 CHECK constraint `CK_AuthGrant_DateRange`** | Spec 要求 `CHECK (ValidFrom IS NULL OR ValidTo IS NULL OR ValidFrom <= ValidTo)`，實際 DB 腳本未建立。 | DB Schema |
| G5 | **DB 缺少效能索引（3 個）** | 缺少 `IX_AuthGrant_Validation`（覆蓋索引）、`IX_AuthGrant_RoleView`（角色反查）、`UX_AuthGrant_UniqueRule`（篩選唯一約束）。Spec 強調這些索引是萬人系統高頻讀取的關鍵。 | DB Schema |
| G6 | **Delete POST handler 的 form 參數寫錯** | `GrantsController.Delete.cs` 的 `DeletePost()` 呼叫 `GetFormFieldsAsync(form: "Resources.Delete")`，應為 `"Grants.Delete"`。 | MVC Controller |
| G7 | **FK 友善驗證未實現（Create / Update）** | WebAPI Service 未預查 RoleCode / ResourceKey / ActionCode 是否存在於對應主表，直接依賴 DB FK 報錯。Repository 有此邏輯但未被使用。 | WebAPI Service |
| G8 | **Edit 未鎖定 RoleCode / ResourceKey / ActionCode** | Prototype Spec §2/§3.2/§5.4 明確要求 Edit 模式鎖定三欄位（要改需刪除後新增）。目前 (1) WebAPI `UpdateAsync` 白名單仍包含三欄位允許修改 (2) MVC Edit Controller 未設 `ReadOnly = true` (3) View 無 `readonly`/`disabled`。 | WebAPI Service + MVC |
| G9 | **UniqueRule 未在 Service 層驗證** | Prototype Spec §5.3/§5.4/§6 明確要求 Create/Edit 違反 UniqueRule 時擋下並顯示訊息。目前 Create 僅檢查 GrantCode 唯一，Update 完全不檢查。DB 也缺少 `UX_AuthGrant_UniqueRule` 索引（見 G5），等於程式碼和 DB 兩端皆無防線。 | WebAPI Service |
| G10 | **UniqueRule + Soft Delete 互動問題** | Prototype Spec §6 明確說明：UniqueRule 的 WHERE 不包含 IsActive，因此 soft-deleted 資料仍佔位，阻止新增同 tuple 標準授權。目前無任何邏輯處理此邊界情境。 | WebAPI Service + MVC |

### 🟡 建議改善（Should Improve）

| 編號 | 問題 | 說明 | 影響範圍 |
|---|---|---|---|
| G11 | **下拉選單硬編碼** | AddNew / Edit 的 RoleCode / ResourceKey / ActionCode 下拉選項為寫死的 `SelectListItem`（僅 ADMINISTRATOR / CI_MANAGER 等），應從 API 動態載入。Prototype Spec §3.2 定義三欄位皆為 FK，選項應來自對應主表。 | MVC Controller |
| G12 | **Search 缺少 Effect 獨立篩選** | Prototype Spec §5.1 明確列出 Effect 為獨立搜尋條件（Allow/Deny toggle），但目前只能透過 keyword 模糊搜尋。 | WebAPI + MVC |
| G13 | **Search 結果缺少 ModifiedDate / RowVersionBase64** | `GrantListItemDto` 定義了 `ModifiedDate` 與 `RowVersionBase64` 屬性，但 Service 的 `Select()` 投影未映射這兩個欄位。 | WebAPI Service |
| G14 | **Deny 優先原則 UI 提示未實現** | Prototype Spec §3.3/§7.1 與技術規格書：UI 必須警告管理員 DENY 會覆蓋其他角色 ALLOW。目前 AddNew / Edit 表單無此警告。 | MVC View |
| G15 | **Details 使用 `"Grants.AddNew"` form 參數** | `GrantsController.Details.cs` 取欄位定義時使用 `form: "Grants.AddNew"` 而非 `"Grants.Details"`。 | MVC Controller |
| G16 | **Role-Based Cache 失效邏輯未實現** | Prototype Spec §1(4)/§7.2 與技術規格書：Grant 異動需清除對應 Role 的 Redis Cache Key，目前 Service 無此邏輯。 | WebAPI Service |
| G17 | **ConditionJson / ValidFrom≤ValidTo 前端驗證缺失** | Prototype Spec §5.3/§5.4 要求 Save 時前端做 JSON.parse 格式檢查與日期邏輯驗證，目前 View 無任何前端驗證。 | MVC View |
| G18 | **DeleteReason 欄位未被使用** | `GrantsDeleteVM` 定義了 `DeleteReason` 屬性，但 Controller 從未讀取或傳遞。 | MVC ViewModel |
| G19 | **app 多租戶參數未被 Service 使用** | WebAPI Controller 接收 `app` 查詢參數，但 `GrantsAdminService` 的 `SearchAsync()` 等方法未實際篩選 app。 | WebAPI Service |

### ⚪ 低優先（Nice to Have）

| 編號 | 問題 | 說明 |
|---|---|---|
| G20 | WebAPI Service 直接用 EF Core，Repository 整套 Dapper 方法未被利用 | 建議統一使用策略（EF Core 或 Dapper），避免兩套並行維護 |
| G21 | `GrantCreatedResultDto` 未包含 `IsActive` / `ConditionJson` | Create 回傳的結果 DTO 比較精簡，可考慮擴充 |
| G22 | 排序策略可考慮加入 GrantCode / RoleCode 排序參數 | 目前 Search 固定 `OrderByDescending(CreatedDate).ThenBy(GrantCode)` |

---

## 7. 已實現功能總覽

| 功能類別 | 已實現項目 |
|---|---|
| **資料模型** | 完整 Entity 15 欄位、3 個 FK（DB 層有約束）、單一主鍵 GrantCode、ROWVERSION 併發控制 |
| **WebAPI CRUD** | 完整 5 端點（Search / Read / Create / Update / Delete） |
| **WebAPI 查詢** | 分頁 + keyword 模糊搜尋 + IsActive 篩選、排序策略 |
| **WebAPI 驗證** | 必填檢查、唯一性檢查、白名單欄位更新、RowVersion 樂觀鎖、併發衝突 409、審計欄位自動填入 |
| **MVC 前端** | 完整 5 頁面（Index / AddNew / Edit / Delete / Details）+ UI-Meta 動態欄位 + 多語系 + Breadcrumb |
| **Repository** | 完整 Dapper CRUD + FK 友善驗證 + 有效權限查詢 + 批量查詢 + Upsert + SetActive + SetValidity |

---

## 8. 檔案清單

### ERP.WebAPI.DataAdmin（WebAPI 後端）
- `Controllers/Admin/GrantsAdminController.cs`（Base — DI + Route）
- `Controllers/Admin/GrantsAdminController.Search.cs`
- `Controllers/Admin/GrantsAdminController.Read.cs`
- `Controllers/Admin/GrantsAdminController.Create.cs`
- `Controllers/Admin/GrantsAdminController.Update.cs`
- `Controllers/Admin/GrantsAdminController.Delete.cs`
- `Services/Authorization/Grants/IGrantsAdminService.cs`
- `Services/Authorization/Grants/GrantsAdminService.cs`

### ERP.DataAdmin（MVC 前端）
- `Controllers/Authorization/GrantsController.cs`（Base）
- `Controllers/Authorization/GrantsController.Index.cs`
- `Controllers/Authorization/GrantsController.AddNew.cs`
- `Controllers/Authorization/GrantsController.Edit.cs`
- `Controllers/Authorization/GrantsController.Delete.cs`
- `Controllers/Authorization/GrantsController.Details.cs`
- `Services/Authorization/Grants/IGrantsAppService.cs`
- `Services/Authorization/Grants/GrantsAppService.cs`
- `Services/Authorization/Grants/IGrantsUiMetaService.cs`
- `Services/Authorization/Grants/GrantsUiMetaService.cs`
- `ViewModels/Authorization/Grants/GrantRowVM.cs`
- `ViewModels/Authorization/Grants/GrantsEditVM.cs`
- `ViewModels/Authorization/Grants/GrantsDeleteVM.cs`
- `ViewModels/Authorization/Grants/GrantsDetailsVM.cs`
- `Views/Authorization/Grants/Index.cshtml`
- `Views/Authorization/Grants/AddNew.cshtml`
- `Views/Authorization/Grants/Edit.cshtml`
- `Views/Authorization/Grants/Delete.cshtml`
- `Views/Authorization/Grants/Details.cshtml`

### ERP.CommonLib（共用層）
- `Models/Entities/Auth/AuthRelationGrant.cs`
- `Models/Dto/Auth/Grants/GrantDto.cs`
- `Models/Dto/Auth/Grants/GrantListItemDto.cs`
- `Models/Dto/Auth/Grants/GrantEditDto.cs`
- `Models/Dto/Auth/Grants/GrantCreatedResultDto.cs`
- `Models/Requests/Auth/Grants/CreateGrantRequest.cs`
- `Repositories/Auth/AuthRelationGrantRepository.cs`

### Database
- `Database/ERP.DataAdmin/dbo/Table/AuthRelationGrant.sql`

### Routes
- `ERP.ApiRoutes/Systems/DataAdmin/DataAdminApiRoutes.Authorization.cs`（`GrantsV1`）

---

## 9. 結論

### 整體完成度：**~65%**

**已做到的部分**：
- 完整的 WebAPI CRUD 5 端點 + MVC 5 頁面
- Entity 欄位與 DB Schema 完全對齊（15 欄位 + 3 FK）
- 白名單欄位更新、RowVersion 樂觀鎖定、併發衝突攔截
- UI-Meta 動態欄位 + 多語系 + Breadcrumb
- Repository 層提供完整的 Dapper CRUD 與高階查詢

**關鍵缺口**（根據 Prototype Spec 對照）：
1. **Hard Delete vs Soft Delete**：Prototype Spec §2/§3.4/§5.5 明確定義 Delete = `IsActive=0`，但實際使用 `_db.Remove()` 物理刪除。
2. **Edit 未鎖定 RBAC Tuple**：Prototype Spec §2/§5.4 明確要求 Edit 鎖定 RoleCode/ResourceKey/ActionCode，但 WebAPI 白名單允許修改且 View 無 readonly。
3. **UniqueRule 完全不設防**：Prototype Spec §5.3/§5.4/§6 要求 Create/Edit 違反 UniqueRule 時擋下，但 Service 層無此檢查且 DB 也缺少 `UX_AuthGrant_UniqueRule` 索引。
4. **寫入安全規範未落實**：ConditionJson JSON 驗證（Prototype Spec §3.5）、ValidFrom ≤ ValidTo 檢查（§3.6）、FK 友善驗證均缺失。
5. **DB 基礎設施不完整**：缺少 3 個效能索引 + 1 個 CHECK constraint，Spec 強調為萬人系統高頻讀取關鍵。
6. **Deny Override UI 提示**：Prototype Spec §3.3/§7.1 要求 UI 必須警告 DENY 覆蓋效果，目前無此提示。
7. **下拉選單硬編碼**：RoleCode / ResourceKey / ActionCode 選項寫死，無法反映真實資料。
8. **Cache 策略未實現**：Prototype Spec §1(4)/§7.2 要求 Role-Based Cache + Redis 失效，目前無快取。
9. **Delete POST 有 Bug**：form 參數引用了錯誤的模組 `"Resources.Delete"`。

**建議修復優先順序**：G6（Bug 修復）→ G1（Soft Delete）→ G8（Edit 鎖定三欄位）→ G9（UniqueRule 驗證）→ G2（JSON 驗證）→ G3+G4（日期檢查）→ G5（DB 索引）→ G7（FK 驗證）→ G11（動態下拉）→ G14（Deny UI 提示）→ G16（Cache）
