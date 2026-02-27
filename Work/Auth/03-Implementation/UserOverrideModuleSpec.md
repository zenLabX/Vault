# UserOverride Module Spec — 實作狀態稽核報告

日期：2026-02-27  
對照文件：`AuthUserOverride Prototype Spec（2026-02-26）`

---

## 0. 涵蓋範圍

| 層級 | 主要檔案 |
|---|---|
| **MVC 前端** | `ERP.DataAdmin/Controllers/Authorization/OverridesController.cs`（Base + `.Index` / `.AddNew` / `.Edit` / `.Delete` / `.Details`） |
| **MVC Views** | `ERP.DataAdmin/Views/Authorization/Overrides/`（Index / AddNew / Edit / Delete / Details） |
| **MVC ViewModels** | `OverrideRowVM` / `OverridesEditVM` / `OverridesDeleteVM` / `OverridesDetailsVM` |
| **MVC Service** | `ERP.DataAdmin/Services/Authorization/Overrides/OverridesAppService.cs`（IOverridesAppService）|
| **MVC UI-Meta** | `ERP.DataAdmin/Services/Authorization/Overrides/OverridesUiMetaService.cs`（IOverridesUiMetaService）|
| **WebAPI Controller** | `ERP.WebAPI.DataAdmin/Controllers/Admin/AuthUserOverridesAdminController.cs`（Base + `.Search` / `.Read` / `.Create` / `.Update` / `.Delete`）|
| **WebAPI Service** | `ERP.WebAPI.DataAdmin/Services/Authorization/AuthUserOverrides/AuthUserOverridesAdminService.cs`（IAuthUserOverridesAdminService）|
| **Entity** | `ERP.CommonLib/Models/Entities/Auth/AuthUserOverride.cs` |
| **DTO** | `UserOverrideDto` / `UserOverrideListItemDto` / `UserOverrideEditDto` / `UserOverrideCreatedResultDto` |
| **Request** | `CreateUserOverrideRequest` |
| **Repository** | `ERP.CommonLib/Repositories/Auth/AuthUserOverrideRepository.cs` |
| **Routes** | `ERP.ApiRoutes/Systems/DataAdmin/DataAdminApiRoutes.Authorization.cs`（`OverridesV1 = "v1/dataadmin/overrides"`）|
| **DB Schema** | `Database/ERP.DataAdmin/dbo/Table/AuthUserOverride.sql` |

---

## 1. 資料模型層（Entity / DB）

| Spec 要求 | 狀態 | 實際實作 | 備註 |
|---|---|---|---|
| PK = `(UserId, ResourceKey, ActionCode)` 複合主鍵 | ✅ 已實現 | Entity 使用 `[PrimaryKey]` + DB `CONSTRAINT PK_AuthUserOverride` | — |
| FK → `AuthPrincipalUser(UserId)` | ✅ 已實現 | DB 有 `FK_AuthUserOverride_UserId` | — |
| FK → `AuthResource(ResourceKey)` | ✅ 已實現 | DB 有 `FK_AuthUserOverride_ResourceKey` | — |
| FK → `AuthAction(ActionCode)` | ✅ 已實現 | DB 有 `FK_AuthUserOverride_ActionCode` | — |
| Effect（BIT, 必填, 1=ALLOW / 0=DENY） | ✅ 已實現 | Entity `[Required]`, DB `DEFAULT ((1))` | — |
| ConditionJson（NVARCHAR(MAX), 選填） | ✅ 已實現 | Entity `string? ConditionJson` | — |
| ValidFrom / ValidTo（datetime, 選填） | ✅ 已實現 | Entity `DateTime?` | — |
| IsActive（BIT, 必填） | ✅ 已實現 | Entity `[Required]`, DB `DEFAULT ((1))` | — |
| Reason（NVARCHAR(200)） | ✅ 已實現 | Entity `[StringLength(200)] string? Reason` | — |
| RowVersion（timestamp） | ✅ 已實現 | Entity `[Timestamp] byte[] RowVersion` | — |
| Audit Fields（CreatedBy/CreatedDate/ModifiedBy/ModifiedDate） | ✅ 已實現 | Entity 完整定義 | — |
| DB CHECK `ValidFrom <= ValidTo` | ❌ 未實現 | DB Schema 無 CHECK constraint | 目前僅在 Service 層做程式碼檢查 |

---

## 2. WebAPI 後端（Controller → Service）

### 2.1 端點完整度

| Spec 功能 | HTTP 動作 | 路由 | 狀態 | 實際 |
|---|---|---|---|---|
| Search / Index（分頁查詢） | GET | `v1/dataadmin/overrides/search` | ✅ 已實現 | `AuthUserOverridesAdminController.Search.cs` → `SearchAsync()` |
| Detail（單筆讀取） | GET | `v1/dataadmin/overrides/{userId}/{resourceKey}/{actionCode}` | ✅ 已實現 | `AuthUserOverridesAdminController.Read.cs` → `GetAsync()` |
| Add New（建立） | POST | `v1/dataadmin/overrides` | ✅ 已實現 | `AuthUserOverridesAdminController.Create.cs` → `CreateAsync()` |
| Edit（更新） | PUT | `v1/dataadmin/overrides/{userId}/{resourceKey}/{actionCode}` | ✅ 已實現 | `AuthUserOverridesAdminController.Update.cs` → `UpdateAsync()` |
| Delete | DELETE | `v1/dataadmin/overrides/{userId}/{resourceKey}/{actionCode}` | ✅ 已實現 | `AuthUserOverridesAdminController.Delete.cs` → `DeleteAsync()` |

### 2.2 Search 查詢條件

| Spec 查詢條件 | 狀態 | 實際實作 |
|---|---|---|
| UserId（contains） | ✅ 已實現 | `x.UserId.Contains(kw)` |
| ResourceKey（contains） | ✅ 已實現 | `x.ResourceKey.Contains(kw)` |
| ActionCode（contains） | ✅ 已實現 | `x.ActionCode.Contains(kw)` |
| Reason（contains） | ✅ 已實現 | `x.Reason != null && x.Reason.Contains(kw)` |
| **Effect 篩選（下拉 / toggle）** | ❌ 未實現 | Search 只支援 keyword 模糊搜尋，無獨立 Effect filter | 
| **IsActive 篩選（下拉 / toggle）** | ❌ 未實現 | Search 只支援 keyword 模糊搜尋，無獨立 IsActive filter |

### 2.3 Search 結果欄位

| Spec 結果欄位 | 狀態 | 實際 |
|---|---|---|
| UserId | ✅ | `UserOverrideListItemDto.UserId` |
| ResourceKey | ✅ | `UserOverrideListItemDto.ResourceKey` |
| ActionCode | ✅ | `UserOverrideListItemDto.ActionCode` |
| Effect | ✅ | `UserOverrideListItemDto.Effect` |
| ValidFrom | ✅ | `UserOverrideListItemDto.ValidFrom` |
| ValidTo | ✅ | `UserOverrideListItemDto.ValidTo` |
| IsActive | ✅ | `UserOverrideListItemDto.IsActive` |
| Reason | ✅ | `UserOverrideListItemDto.Reason` |
| ModifiedDate | ✅ | `UserOverrideListItemDto.ModifiedDate` |
| **CreatedBy** | ❌ 未包含 | ListItemDto 不含 CreatedBy（Spec 雖未明確要求，但可能需要稽核用途） |

### 2.4 Create 驗證

| Spec 驗證 | 狀態 | 實際實作 |
|---|---|---|
| PK 三欄必填 | ✅ 已實現 | CreateAsync 檢查 `IsNullOrWhiteSpace(req.UserId/ResourceKey/ActionCode)` |
| PK 不可重複 | ✅ 已實現 | `AnyAsync(x => x.UserId == ... && x.ResourceKey == ... && x.ActionCode == ...)` |
| FK 友善檢查（UserId 存在） | ✅ 已實現 | `AuthPrincipalUser.AnyAsync(u => u.UserId == req.UserId)` |
| FK 友善檢查（ResourceKey 存在） | ✅ 已實現 | `AuthResource.AnyAsync(r => r.ResourceKey == req.ResourceKey)` |
| FK 友善檢查（ActionCode 存在） | ✅ 已實現 | `AuthAction.AnyAsync(a => a.ActionCode == req.ActionCode)` |
| `ValidFrom <= ValidTo` | ✅ 已實現 | `if (req.ValidFrom.HasValue && req.ValidTo.HasValue && req.ValidTo < req.ValidFrom)` |
| **Reason 必填** | ❌ 未實現 | `CreateUserOverrideRequest.Reason` 為 `string?`，Service 未強制檢查。Spec 明確要求 Reason 必填 |
| **ConditionJson 格式檢查（若非空必須是合法 JSON）** | ❌ 未實現 | Service 只做 `IsNullOrWhiteSpace` 判斷，未做 JSON parse 驗證 |

### 2.5 Update 驗證

| Spec 驗證 | 狀態 | 實際實作 |
|---|---|---|
| PK 鎖定不可改 | ✅ 已實現 | PK 由路由帶入，Update 白名單不含 PK 欄位 |
| 白名單欄位限制 | ✅ 已實現 | `allowed = { "Effect","ConditionJson","ValidFrom","ValidTo","IsActive","Reason" }` |
| RowVersion 併發控制 | ✅ 已實現 | `ByteConverter.TryGetBase64Bytes` → 設 `OriginalValue`；catch `DbUpdateConcurrencyException` → 409 |
| `ValidFrom <= ValidTo` | ✅ 已實現 | 更新後檢查 `e.ValidTo < e.ValidFrom` → return 400 |
| 自動補 ModifiedBy/ModifiedDate | ✅ 已實現 | `e.ModifiedBy = userName; e.ModifiedDate = DateTime.UtcNow` |
| **ConditionJson 格式檢查（若非空必須是合法 JSON）** | ❌ 未實現 | 未做 JSON parse 驗證 |

### 2.6 Delete

| Spec 要求 | 狀態 | 實際實作 | 差異說明 |
|---|---|---|---|
| **軟刪除（IsActive=0）** | ❌ 未按 Spec | WebAPI Service 使用 `_db.AuthUserOverride.Remove(e)` = **物理刪除（Hard Delete）** | **Spec 明確要求 Soft Delete**：「將 IsActive=0」 |
| RowVersion 併發控制 | ✅ 已實現 | 支援 `rowVersionBase64` query param → catch `DbUpdateConcurrencyException` → 409 |
| 刪除後更新 Modified/RowVersion | ❌ 不適用 | 因為做的是 Hard Delete，所以不存在更新 Modified 的問題 | Soft Delete 時才需要 |

---

## 3. MVC 前端（Controller → View）

### 3.1 頁面完整度

| Spec 頁面 | 狀態 | 實際檔案 |
|---|---|---|
| Index（列表 + 搜尋 + 分頁） | ✅ 已實現 | `OverridesController.Index.cs` → `Views/Authorization/Overrides/Index.cshtml` |
| Detail（右側 drawer 唯讀檢視） | 🟡 部分實現 | `OverridesController.Details.cs` → `Views/Authorization/Overrides/Details.cshtml`（有獨立頁面，但是否為 drawer 需確認） |
| Add New（drawer 新增） | 🟡 部分實現 | `OverridesController.AddNew.cs` → `Views/Authorization/Overrides/AddNew.cshtml`（有獨立頁面，但是否為 drawer 需確認） |
| Edit（編輯 PK 鎖定） | ✅ 已實現 | `OverridesController.Edit.cs` → `Views/Authorization/Overrides/Edit.cshtml` |
| Delete（Soft Delete 確認頁） | 🟡 部分實現 | `OverridesController.Delete.cs` → `Views/Authorization/Overrides/Delete.cshtml`（頁面存在，但後端實際為 Hard Delete） |

### 3.2 Index 功能

| Spec 功能 | 狀態 | 實際實作 |
|---|---|---|
| 關鍵字搜尋 | ✅ 已實現 | `keyword` query param → 傳給 `_overrides.GetPagedAsync()` |
| 分頁 | ✅ 已實現 | `page` / `pageSize` 完整實作（含 TableToolbarConfig + PaginationConfig） |
| Row Actions: Detail | ✅ 已實現 | `Url.Action("Details", "Overrides", ...)` |
| Row Actions: Edit | ✅ 已實現 | `Url.Action("Edit", "Overrides", ...)` |
| Row Actions: Delete | ✅ 已實現 | `Url.Action("Delete", "Overrides", ...)` |
| **Effect 篩選條件（獨立篩選）** | ❌ 未實現 | Index 只有 keyword 搜尋，無 Effect 下拉 |
| **IsActive 篩選條件（獨立篩選）** | ❌ 未實現 | Index 只有 keyword 搜尋，無 IsActive 下拉 |

### 3.3 Add New 驗證

| Spec 驗證 | 狀態 | 實際實作 |
|---|---|---|
| PK 三欄必填 | ✅ 已實現 | UI-Meta `Required` 驗證 + Controller 必填檢查 |
| **PK 不可重複（前端提示）** | 🟡 部分實現 | 重複由 WebAPI 回 400 → MVC catch Exception → `TempData["err"]` → 訊息不夠明確 |
| **Reason 必填（UI 層強制）** | 🟡 看 UI-Meta | Controller 做 `f.Required` 迴圈檢查；是否強制取決於 UI-Meta API 回傳的 `Required` flag。Spec 明確要求 Reason 必填 |
| **ConditionJson 格式檢查（合法 JSON）** | ❌ 未實現 | AddNew Controller 未做 JSON.parse 驗證 |
| `ValidFrom <= ValidTo` | 🟡 部分實現 | 前端 Controller 未明確做區間檢查；依賴 WebAPI Service 端檢查 |
| FK 下拉選單 | 🟡 硬編碼 | `ViewData["meta:userid"]` / `ViewData["meta:resourcekey"]` / `ViewData["meta:actioncode"]` 目前是 **硬編碼** seed 假資料，非動態從 DB 取 |

### 3.4 Edit 功能

| Spec 功能 | 狀態 | 實際實作 |
|---|---|---|
| PK 鎖定不可改 | ✅ 已實現 | `[BindNever]` 在 VM + 路由帶 PK |
| 可編輯欄位（Effect, ConditionJson, ValidFrom/ValidTo, IsActive, Reason） | ✅ 已實現 | UI-Meta 決定可見/可編輯欄位 |
| RowVersion 檢查 | ✅ 已實現 | `RowVersionBase64` 帶入 → WebAPI 端 check |
| 必填驗證 | ✅ 已實現 | Controller 做 `Required` 迴圈 + Regex 檢查 |
| **ConditionJson 格式檢查** | ❌ 未實現 | 未做前端 JSON 驗證 |

### 3.5 Delete 功能

| Spec 功能 | 狀態 | 實際實作 | 差異 |
|---|---|---|---|
| 刪除確認頁面 | ✅ 已實現 | Delete GET → 顯示確認表單 → POST 提交 | — |
| **軟刪除（IsActive=0）** | ❌ 未按 Spec | MVC 呼叫 `_overrides.DeleteAsync()` → WebAPI 做 Hard Delete | **Spec 明確要求 Soft Delete** |

---

## 4. Spec 決策項目匯總

| # | Spec 決策 | 狀態 | 說明 |
|---|---|---|---|
| D1 | Reason **必填**（UI 層強制） | 🟡 | WebAPI `CreateAsync` 未強制 Reason 必填；MVC 端依賴 UI-Meta `Required` flag（需確認 API 回傳值）|
| D2 | Delete 為**軟刪除**（IsActive=0） | ❌ | WebAPI 實際做 `_db.Remove(e)` = Hard Delete（物理刪除） |
| D3 | ConditionJson **儲存時做 JSON 格式檢查** | ❌ | 前端/後端均未做 `JSON.parse` / `JsonDocument.Parse` 驗證 |

---

## 5. 差距清單（Gap List）

### 🔴 必須修正（與 Spec 決策直接矛盾）

| # | 問題 | 位置 | 建議修正 |
|---|---|---|---|
| G1 | **Delete 為 Hard Delete，Spec 要求 Soft Delete** | `AuthUserOverridesAdminService.DeleteAsync()` | 改為 `e.IsActive = false; e.ModifiedBy = ...; e.ModifiedDate = ...; await _db.SaveChangesAsync()` |
| G2 | **Reason 未強制必填**（WebAPI 端） | `AuthUserOverridesAdminService.CreateAsync()` | 新增 `if (string.IsNullOrWhiteSpace(req.Reason)) return (false, 400, "Reason is required.", null);` |
| G3 | **ConditionJson 未做 JSON 格式驗證** | `AuthUserOverridesAdminService.CreateAsync()` + `UpdateAsync()` | 新增：若 `ConditionJson` 非空，嘗試 `JsonDocument.Parse()`，失敗回 400 |

### 🟡 建議改善（影響功能完整度或用戶體驗）

| # | 問題 | 位置 | 建議 |
|---|---|---|---|
| G4 | **Search 缺少 Effect / IsActive 獨立篩選** | WebAPI `SearchAsync()` + MVC `Index` | 新增 `[FromQuery] bool? effect` / `[FromQuery] bool? isActive` query param |
| G5 | **AddNew FK 下拉為硬編碼假資料** | `OverridesController.AddNew.cs` L68-83 | 改為從 WebAPI 動態取得 User / Resource / Action 清單 |
| G6 | **PK 重複會回泛用錯誤訊息** | MVC `AddNew POST` catch block | 解析 WebAPI 回應的 error message，顯示更明確的「此組合已存在」提示 |
| G7 | **MVC AddNew 未做 ValidFrom ≤ ValidTo 前端檢查** | `OverridesController.AddNew.cs` POST | 在必填檢查後加上區間驗證（目前僅依賴 WebAPI 端） |
| G8 | **DB 無 CHECK (ValidFrom ≤ ValidTo)** | `AuthUserOverride.sql` | 建議加上 `ALTER TABLE AuthUserOverride ADD CONSTRAINT CK_AuthUserOverride_ValidRange CHECK (ValidFrom IS NULL OR ValidTo IS NULL OR ValidFrom <= ValidTo)` |
| G9 | **Details / AddNew 是否為 Drawer** | MVC Views | Spec 描述為「右側 drawer 檢視」與「Drawer 新增」，需確認目前 View 是否使用側邊 drawer 元件 |

### ⚪ 低優先（已接受的簡化或待確認）

| # | 問題 | 說明 |
|---|---|---|
| G10 | Spec 提及「定期清理 ValidTo < GETDATE()」 | 維運需求，prototype 未實作；正式系統需排程或手動 |
| G11 | Spec 提及「Anti-pattern：超過 5 人同需求應建立 Role」 | 系統層面提醒功能，非 CRUD 必要項 |
| G12 | `UserOverrideListItemDto` 不含 `CreatedBy` | 列表頁是否需要顯示建立者（依業務需求決定） |
| G13 | MVC `OverridesDeleteVM` 程式碼註解說「Soft Delete」但實際執行 Hard Delete | 需統一程式碼與行為的一致性 |

---

## 6. 已實現功能總覽

| 功能 | MVC 前端 | WebAPI 後端 |
|---|---|---|
| 列表 + 分頁 + keyword 搜尋 | ✅ | ✅ |
| 單筆詳情（Detail） | ✅ | ✅ |
| 新增（Add New）| ✅ | ✅ |
| 編輯（Edit）| ✅ | ✅ |
| 刪除（Delete）| ✅（頁面有） | ✅（但為 Hard Delete） |
| PK 複合鍵支援 | ✅ | ✅ |
| FK 友善檢查（Create 時） | —（依賴 WebAPI） | ✅ |
| PK 重複檢查（Create 時） | —（依賴 WebAPI） | ✅ |
| ValidFrom ≤ ValidTo 驗證 | ❌（MVC 端缺） | ✅ |
| RowVersion 併發控制 | ✅ | ✅ |
| 白名單欄位更新 | — | ✅ |
| UI-Meta 動態欄位 | ✅ | — |
| 多系統切換（AppCode） | ✅（query param） | 🟡（SearchAsync 接收 app 但未過濾） |
| Reason 必填 | 🟡（靠 UI-Meta） | ❌ |
| ConditionJson JSON 驗證 | ❌ | ❌ |
| Soft Delete | ❌ | ❌ |

---

## 7. 檔案清單

### ERP.DataAdmin（MVC 前端）

| 檔案 | 職責 |
|---|---|
| `Controllers/Authorization/OverridesController.cs` | 主控制器（DI、共用方法） |
| `Controllers/Authorization/OverridesController.Index.cs` | 列表查詢 + 分頁 |
| `Controllers/Authorization/OverridesController.AddNew.cs` | 新增 GET/POST |
| `Controllers/Authorization/OverridesController.Edit.cs` | 編輯 GET/POST |
| `Controllers/Authorization/OverridesController.Delete.cs` | 刪除 GET/POST |
| `Controllers/Authorization/OverridesController.Details.cs` | 詳情顯示 |
| `Views/Authorization/Overrides/Index.cshtml` | 列表頁 View |
| `Views/Authorization/Overrides/AddNew.cshtml` | 新增表單 View |
| `Views/Authorization/Overrides/Edit.cshtml` | 編輯表單 View |
| `Views/Authorization/Overrides/Delete.cshtml` | 刪除確認 View |
| `Views/Authorization/Overrides/Details.cshtml` | 詳情 View |
| `ViewModels/Authorization/Overrides/OverrideRowVM.cs` | 列表行 VM |
| `ViewModels/Authorization/Overrides/OverridesEditVM.cs` | 編輯表單 VM |
| `ViewModels/Authorization/Overrides/OverridesDeleteVM.cs` | 刪除 VM |
| `ViewModels/Authorization/Overrides/OverridesDetailsVM.cs` | 詳情 VM |
| `Services/Authorization/Overrides/IOverridesAppService.cs` | MVC 端 App Service 介面 |
| `Services/Authorization/Overrides/OverridesAppService.cs` | MVC 端 App Service（呼叫 WebAPI） |
| `Services/Authorization/Overrides/OverridesUiMetaService.cs` | UI-Meta 服務 |

### ERP.WebAPI.DataAdmin（WebAPI 後端）

| 檔案 | 職責 |
|---|---|
| `Controllers/Admin/AuthUserOverridesAdminController.cs` | 主控制器（DI） |
| `Controllers/Admin/AuthUserOverridesAdminController.Search.cs` | GET search 端點 |
| `Controllers/Admin/AuthUserOverridesAdminController.Read.cs` | GET 單筆端點 |
| `Controllers/Admin/AuthUserOverridesAdminController.Create.cs` | POST 建立端點 |
| `Controllers/Admin/AuthUserOverridesAdminController.Update.cs` | PUT 更新端點 |
| `Controllers/Admin/AuthUserOverridesAdminController.Delete.cs` | DELETE 端點 |
| `Services/Authorization/AuthUserOverrides/IAuthUserOverridesAdminService.cs` | Service 介面 |
| `Services/Authorization/AuthUserOverrides/AuthUserOverridesAdminService.cs` | Service 實作（EF Core） |

### ERP.CommonLib（共用層）

| 檔案 | 職責 |
|---|---|
| `Models/Entities/Auth/AuthUserOverride.cs` | EF Entity |
| `Models/Dto/Auth/AuthUserOverrides/UserOverrideDto.cs` | 完整 DTO |
| `Models/Dto/Auth/AuthUserOverrides/UserOverrideListItemDto.cs` | 列表精簡 DTO |
| `Models/Dto/Auth/AuthUserOverrides/UserOverrideEditDto.cs` | 編輯 DTO（含 RowVersionBase64） |
| `Models/Dto/Auth/AuthUserOverrides/UserOverrideCreatedResultDto.cs` | 建立結果 DTO |
| `Models/Requests/Auth/AuthUserOverrides/CreateUserOverrideRequest.cs` | 建立請求模型 |
| `Repositories/Auth/AuthUserOverrideRepository.cs` | Repository（Dapper, 用於 Permission Engine） |
| `Data/AuthDbContext.cs` | DB Context（含 AuthUserOverride 設定） |

### 其他

| 檔案 | 職責 |
|---|---|
| `ERP.ApiRoutes/Systems/DataAdmin/DataAdminApiRoutes.Authorization.cs` | 路由常數 `OverridesV1 = "v1/dataadmin/overrides"` |
| `Database/ERP.DataAdmin/dbo/Table/AuthUserOverride.sql` | DB 建表腳本 |

---

## 8. 結論

**整體完成度：約 80%** — CRUD 五大端點與對應的 MVC 頁面均已到位，資料模型完整，複合主鍵 / FK 友善檢查 / RowVersion 併發控制均已實作。

**最關鍵的 3 個 Gap 是：**
1. **G1：Delete 是 Hard Delete，應改為 Soft Delete（IsActive=0）** — 這是 Spec 明確的決策項。
2. **G2：Reason 未在 WebAPI 端強制必填** — Spec guardrail 要求「原因必填，否則無法稽核」。
3. **G3：ConditionJson 未做 JSON 格式驗證** — Spec 要求「儲存時做 JSON 格式檢查」。

修正這三項即可與 Prototype Spec 完全對齊。
