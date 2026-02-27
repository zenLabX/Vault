# ResourceModuleSpec — AuthResource 模組稽核報告

> **生成日期**：2025-07-17  
> **Prototype Spec**：AuthResourcePrototypeSpec.md  
> **稽核範圍**：Database → CommonLib (Entity / Repository / DTO / Request) → WebAPI (Service / Controller) → MVC (Controller / AppService / ViewModel)  
> **代碼行數統計（約）**：~5,200 行（35 個檔案）

---

## 目錄

| 章節 | 標題 |
|------|------|
| §0 | 總覽與嚴重度統計 |
| §1 | 檔案清單與行數統計 |
| §2 | DB Schema 稽核 |
| §3 | Entity 稽核 |
| §4 | Repository（Dapper）稽核 |
| §5 | WebAPI Service 稽核 |
| §6 | WebAPI Controller 稽核 |
| §7 | MVC Controller + AppService 稽核 |
| §8 | DTO / Request / ViewModel 稽核 |
| §9 | Gap 總表與修復建議 |

---

## §0 總覽與嚴重度統計

### 嚴重度定義

| 等級 | 意義 | 說明 |
|------|------|------|
| 🔴 | Critical | 與 Spec 定義有根本性衝突，必須優先修復 |
| 🟡 | Warning | 功能不完整或有瑕疵，應於下一迭代修復 |
| ⚪ | Info | 建議改善或輕微偏差，可排入 Backlog |

### 統計

| 等級 | 數量 |
|------|------|
| 🔴 Critical | 4 |
| 🟡 Warning | 12 |
| ⚪ Info | 5 |
| **合計** | **21** |

### 關鍵問題摘要

| # | 嚴重度 | 問題 |
|---|--------|------|
| G-01 | 🔴 | Delete 實作為 Hard Delete (`_db.AuthResource.Remove`)；Spec 要求僅 Soft Delete (IsActive=0) |
| G-02 | 🔴 | 更新時無循環父節點驗證；可將 ParentResourceKey 設為自身或後代，造成無限迴圈 |
| G-03 | 🔴 | ParentResourceKey 變更時無遞迴更新 Path；Materialized Path 將與樹結構脫節 |
| G-04 | 🔴 | 缺少 Toggle IsActive API 端點；Spec 定義的「停用/啟用」功能完全不存在 |

---

## §1 檔案清單與行數統計

### Database

| 檔案 | 行數 | 說明 |
|------|------|------|
| `Database/ERP.DataAdmin/AuthResource.sql` | 89 | CREATE TABLE + FK + UNIQUE + Extended Properties |

### CommonLib — Entity

| 檔案 | 行數 | 說明 |
|------|------|------|
| `ERP.CommonLib/Models/Entities/Auth/AuthResource.cs` | 238 | EF Core Entity，[Key] = ResourceKey |

### CommonLib — Repository

| 檔案 | 行數 | 說明 |
|------|------|------|
| `ERP.CommonLib/Repositories/Auth/AuthResourceRepository.cs` | 725 | Dapper CRUD + SetActive + SetPath 等局部更新方法 |

### CommonLib — DTO / Request

| 檔案 | 行數 | 說明 |
|------|------|------|
| `ERP.CommonLib/Models/Dto/Auth/Resources/ResourceDto.cs` | 204 | 通用查詢 DTO（含 RowVersionBase64） |
| `ERP.CommonLib/Models/Dto/Auth/Resources/ResourceEditDto.cs` | 198 | 編輯/詳情 DTO（含 RowVersionBase64） |
| `ERP.CommonLib/Models/Dto/Auth/Resources/ResourceListItemDto.cs` | 177 | 清單 DTO（含 ChildrenCount） |
| `ERP.CommonLib/Models/Dto/Auth/Resources/ResourceCreatedResultDto.cs` | 124 | 建立結果 DTO（無 RowVersion） |
| `ERP.CommonLib/Models/Requests/Auth/Resources/CreateResourceRequest.cs` | 161 | 建立請求模型 |

### WebAPI — Service / Interface

| 檔案 | 行數 | 說明 |
|------|------|------|
| `ERP.WebAPI.DataAdmin/Services/Auth/Resources/ResourcesAdminService.cs` | 465 | 核心業務邏輯（EF Core 直接操作） |
| `ERP.WebAPI.DataAdmin/Services/Auth/Resources/IResourcesAdminService.cs` | 111 | 服務介面 |

### WebAPI — Controller（Partial Classes）

| 檔案 | 行數 | 說明 |
|------|------|------|
| `ResourcesAdminController.cs` | 79 | Base（Route 定義 + DI） |
| `ResourcesAdminController.Search.cs` | 95 | `[HttpGet("search")]` |
| `ResourcesAdminController.Read.cs` | 82 | `[HttpGet("{resourceKey}")]` |
| `ResourcesAdminController.Create.cs` | 97 | `[HttpPost]` |
| `ResourcesAdminController.Update.cs` | 87 | `[HttpPut("{resourceKey}")]` |
| `ResourcesAdminController.Delete.cs` | 74 | `[HttpDelete("{resourceKey}")]` |

### MVC — Controller（Partial Classes）

| 檔案 | 行數 | 說明 |
|------|------|------|
| `ResourcesController.cs` | 151 | Base（DI + ViewRoot） |
| `ResourcesController.Index.cs` | 256 | 清單頁 |
| `ResourcesController.AddNew.cs` | 211 | 新增頁 |
| `ResourcesController.Edit.cs` | 238 | 編輯頁 |
| `ResourcesController.Delete.cs` | 176 | 刪除確認頁 |
| `ResourcesController.Details.cs` | 94 | 詳情頁 |

### MVC — AppService / Interface / ViewModel

| 檔案 | 行數 | 說明 |
|------|------|------|
| `ResourcesAppService.cs` | 265 | MVC → WebAPI 橋接 |
| `IResourcesAppService.cs` | 200 | MVC AppService 介面 |
| `ResourceRowVM.cs` | 171 | 列表行 ViewModel |
| `ResourcesEditVM.cs` | 70 | 編輯 ViewModel（Fields + Data） |

---

## §2 DB Schema 稽核

**檔案**：`Database/ERP.DataAdmin/AuthResource.sql`（89 行）

### 表結構

| 欄位 | 型別 | Nullable | 預設值 | Spec 對應 |
|------|------|----------|--------|-----------|
| ResourceKey | NVARCHAR(160) | NOT NULL | — | PK ✅ |
| AppCode | NVARCHAR(30) | NOT NULL | — | ✅ |
| ResourceType | NVARCHAR(30) | NOT NULL | — | ✅ |
| ResourceCode | NVARCHAR(100) | NOT NULL | — | ✅ |
| ResourceName | NVARCHAR(200) | NOT NULL | `''` | ✅ |
| ParentResourceKey | NVARCHAR(160) | NULL | — | Self-FK ✅ |
| Path | NVARCHAR(800) | NULL | — | Materialized Path ✅ |
| SortOrder | INT | NOT NULL | `0` | ✅ |
| IsLeaf | BIT | NOT NULL | `0` | ✅ |
| IsActive | BIT | NOT NULL | `1` | ✅ |
| Endpoint | NVARCHAR(400) | NULL | — | API 路由 ✅ |
| Method | NVARCHAR(10) | NULL | — | HTTP Method ✅ |
| MetaJson | NVARCHAR(MAX) | NULL | — | ABAC 屬性 ✅ |
| Tags | NVARCHAR(200) | NULL | — | ✅ |
| CreatedBy | NVARCHAR(50) | NOT NULL | `'System'` | ✅ |
| CreatedDate | DATETIME | NOT NULL | `getdate()` | ✅ |
| ModifiedBy | NVARCHAR(50) | NULL | — | ✅ |
| ModifiedDate | DATETIME | NULL | — | ✅ |
| RowVersion | TIMESTAMP | NOT NULL | — | 樂觀鎖定 ✅ |

### 約束

| 約束名 | 類型 | 說明 | Spec 對應 |
|--------|------|------|-----------|
| PK (ResourceKey) | CLUSTERED | 主鍵 | ✅ |
| UQ_AuthResource_AppCode_ResourceCode | UNIQUE | (AppCode, ResourceCode) 唯一 | ✅ |
| FK_AuthResource_ParentResourceKey | FK (Self) | → AuthResource(ResourceKey) | ✅ |

### Extended Property — ResourceType 列舉值

| DB 定義 | Spec 定義 | 匹配 |
|---------|-----------|------|
| SYSTEM | SYSTEM | ✅ |
| MODULE | MODULE | ✅ |
| MENU | MENU | ✅ |
| **FORM** | ~~FORM~~ → PAGE | ⚪ 名稱差異 |
| PAGE | PAGE | ✅ |
| API | API | ✅ |
| **REPORT** | — | ⚪ Spec 未定義 |
| **CONTROL_BUTTON** | BUTTON | ⚪ 名稱差異 |
| **CONTROL_FIELD** | FIELD | ⚪ 名稱差異 |

> **§2 小結**：DB Schema 結構與 Spec 高度一致。ResourceType 的 Extended Property 列舉值存在命名差異（FORM vs PAGE、CONTROL_BUTTON vs BUTTON、CONTROL_FIELD vs FIELD），額外多了 REPORT 類型。這屬於 DB 文件註解層面的偏差，不影響實際欄位儲存（NVARCHAR 自由輸入）。

---

## §3 Entity 稽核

**檔案**：`ERP.CommonLib/Models/Entities/Auth/AuthResource.cs`（238 行）

### 欄位對應

- 19 個屬性完整對應 DB 19 個欄位 ✅
- `[Key]` 標註在 `ResourceKey` ✅
- `[Table("AuthResource")]` ✅
- `[Timestamp]` 標註在 `RowVersion` ✅
- `[StringLength]` 對各字串欄位有正確長度限制 ✅

### 問題

| # | 嚴重度 | 問題 | 說明 |
|---|--------|------|------|
| G-09 | 🟡 | `CreatedDate` 預設值使用 `DateTime.Now` | 應為 `DateTime.UtcNow`，與 WebAPI Service 中使用 UtcNow 不一致 |
| G-17 | ⚪ | 無 Navigation Property | 未定義 `Parent` / `Children` 導覽屬性；EF 無法自動 Include 子節點。目前 Service 以手動 LINQ 查 ChildrenCount，可運作但不利於未來擴展 |

---

## §4 Repository（Dapper）稽核

**檔案**：`ERP.CommonLib/Repositories/Auth/AuthResourceRepository.cs`（725 行）

### 方法清單

| 方法 | 說明 | WebAPI Service 是否有調用 |
|------|------|--------------------------|
| `FindAsync(resourceKey)` | 按 PK 查詢 | ❌ 未使用 |
| `GetByAppAndCodeAsync(appCode, resourceCode)` | 按 App+Code 查詢 | ❌ 未使用 |
| `GetChildrenAsync(parentKey, onlyActive)` | 查子節點 | ❌ 未使用 |
| `GetByAppAndTypeAsync(appCode, type, onlyActive)` | 按 App+Type 篩選 | ❌ 未使用 |
| `GetByEndpointAsync(endpoint, method, onlyActive)` | 按 API 路由反查 | ❌ 未使用 |
| `GetSubtreeByPathPrefixAsync(pathPrefix, onlyActive)` | 按 Path 查子樹 | ❌ 未使用 |
| `SearchAsync(keyword, appCode, type, onlyActive)` | 多條件搜尋 | ❌ 未使用 |
| `InsertAsync(entity)` | 新增 | ❌ 未使用 |
| `UpdateAsync(entity, rowVersion, key)` | 更新（含 RowVersion） | ❌ 未使用 |
| `UpsertAsync(entity, rowVersion)` | 存在則更新，否則新增 | ❌ 未使用 |
| **`SetActiveAsync(key, isActive, rowVersion, ...)`** | **啟用/停用切換** | **❌ 未使用 ← 正是 Spec 需要的** |
| `SetParentAndSortAsync(key, parent, sort, rowVersion)` | 調整父節點+排序 | ❌ 未使用 |
| **`SetPathAsync(key, path, rowVersion, ...)`** | **更新 Materialized Path** | **❌ 未使用 ← Path 遞迴更新所需** |
| `SetEndpointAsync(key, endpoint, method, rowVersion)` | 更新 API 路由 | ❌ 未使用 |
| `SetMetaAndTagsAsync(key, metaJson, tags, rowVersion)` | 更新 MetaJson + Tags | ❌ 未使用 |
| `DeleteAsync(key, rowVersion, options)` | 刪除（含 DryRun / Cascade） | ❌ 未使用 |

### 問題

| # | 嚴重度 | 問題 | 說明 |
|---|--------|------|------|
| G-13 | 🟡 | Repository 所有方法皆為 Dead Code | WebAPI Service（ResourcesAdminService）使用 EF Core 直接操作 `_db.AuthResource`，完全未注入或調用此 Repository。725 行代碼處於未使用狀態 |
| — | ⚪ | Repository 中 `SetActiveAsync` 已實作 | 此方法正是 Spec 所需的 Toggle IsActive 功能的底層操作，但 WebAPI Service 層完全沒有對應的業務方法或 Controller 端點暴露它 |
| — | ⚪ | Repository 中 `GetSubtreeByPathPrefixAsync` + `SetPathAsync` 已實作 | 這兩個方法可用於實現 Spec 要求的 Path 遞迴更新，但 Service 層未調用 |

> **§4 小結**：Repository 設計完善，包含 Spec 所需的 `SetActiveAsync`（軟刪除/啟用切換）、`SetPathAsync`（Path 更新）、 `GetSubtreeByPathPrefixAsync`（子樹查詢）等關鍵方法，以及全功能的 `DeleteAsync`（含 DryRun / Cascade / Blockers）。然而 WebAPI Service 完全使用 EF Core 直接操作，Repository 全部 725 行為 Dead Code。建議將 Service 層重構為調用 Repository，或在 Service 中實作等效邏輯。

---

## §5 WebAPI Service 稽核

**檔案**：`ERP.WebAPI.DataAdmin/Services/Auth/Resources/ResourcesAdminService.cs`（465 行）

### 方法對照

| 方法 | Spec 需求 | 實作狀態 | 備註 |
|------|-----------|----------|------|
| `SearchAsync` | 分頁搜尋 | ✅ 已實作 | 多條件篩選（app, type, parent, keyword, isActive, isLeaf）+ 分頁 + ChildrenCount |
| `GetAsync` | 單筆讀取 | ✅ 已實作 | ResourceEditDto 含 RowVersionBase64 |
| `CreateAsync` | 建立資源 | ✅ 已實作 | AppCode/ResourceCode Regex ✅、ResourceKey 格式驗證 ✅、重複檢查 ✅、父節點存在性驗證 ✅ |
| `UpdateAsync` | 更新資源 | 🟡 部分實作 | Whitelist 正確排除 ResourceKey/AppCode/ResourceCode ✅、RowVersion 併發 ✅；但缺少循環父節點檢查、Path 遞迴更新 |
| `DeleteAsync` | 停用（IsActive=0） | 🔴 **行為錯誤** | 實作為 `_db.AuthResource.Remove(e)` → Hard Delete；Spec 僅允許 IsActive=0 |
| — | Toggle IsActive | 🔴 **不存在** | Spec 定義的「停用/啟用」切換功能完全沒有對應業務方法 |

### SearchAsync 詳細分析

```
✅ 多條件篩選：app / resourceType / parent / keyword / isActive / isLeaf
✅ Keyword 搜尋範圍：ResourceKey, ResourceCode, ResourceName, Endpoint, Method, Tags, ResourceType
✅ 分頁：Skip/Take + TotalCount
✅ ChildrenCount：per item 計算子節點數
✅ 排序：CreatedDate DESC, SortOrder, ResourceCode
```

### CreateAsync 詳細分析

```
✅ 必填驗證：AppCode, ResourceType, ResourceName
✅ AppCode 正則：^[A-Z0-9_]+$
✅ ResourceCode 正則：^[A-Z0-9_.]+$
✅ ResourceKey 格式：必須等於 {AppCode}:{ResourceCode}
✅ 重複檢查：ResourceKey 重複 + (AppCode, ResourceCode) 重複
✅ 父節點存在性：若提供 ParentResourceKey 則查詢是否存在
✅ IsLeaf 預設：依 PermCalcHelper.IsLeafTypeLocal 推斷
✅ 時間戳：DateTime.UtcNow
✅ 回傳 ResourceCreatedResultDto
```

### UpdateAsync 詳細分析

```
✅ Whitelist 欄位：ResourceType, ResourceName, ParentResourceKey, Path, SortOrder,
                   IsLeaf, IsActive, Endpoint, Method, MetaJson, Tags + Text 變體 + RowVersion
✅ Key 不可修改：ResourceKey / AppCode / ResourceCode 不在 Whitelist 中
✅ RowVersion 併發控制：ByteConverter.TryGetBase64Bytes 轉換
✅ 時間戳：DateTime.UtcNow

❌ 無循環父節點驗證（G-02）
❌ 無 Path 遞迴更新（G-03）
❌ 無 MetaJson JSON 格式驗證（G-11）
❌ 無條件式 Endpoint/Method 必填（當 ResourceType=API 時）（G-12）
```

### DeleteAsync 詳細分析

```
✅ 存在性檢查：找不到則回傳 "Resource not found"
✅ 子節點保護：若有子節點則阻擋刪除
✅ RowVersion 併發控制
❌ 使用 _db.AuthResource.Remove(e) → HARD DELETE（G-01）
❌ Spec 定義 Delete = IsActive 設為 0（Soft Delete），且限定非葉節點不可刪
```

### 問題彙整

| # | 嚴重度 | 問題 | 影響 |
|---|--------|------|------|
| G-01 | 🔴 | Delete = Hard Delete | 資料不可復原；Spec 要求僅軟刪除 (IsActive=0) |
| G-02 | 🔴 | 無循環父節點驗證 | `ParentResourceKey` 可被設為自身或後代節點，導致樹結構循環 |
| G-03 | 🔴 | 無 Path 遞迴更新 | 變更 `ParentResourceKey` 後，自身與所有後代的 `Path` 不會同步更新 |
| G-04 | 🔴 | 缺少 Toggle IsActive | Spec 定義的「停用/啟用」核心功能不存在 |
| G-11 | 🟡 | 無 MetaJson JSON 格式驗證 | Spec 要求 MetaJson 若提供必須為合法 JSON |
| G-12 | 🟡 | 無條件式 Endpoint/Method 必填 | 當 ResourceType=API 時，Spec 要求 Endpoint 和 Method 必填 |

---

## §6 WebAPI Controller 稽核

**檔案**：6 個 Partial Class，共 514 行

### 路由規格

| 端點 | HTTP | Controller 方法 | Spec 需求 | 狀態 |
|------|------|----------------|-----------|------|
| `v1/dataadmin/resources/search` | GET | Search | 分頁搜尋 | ✅ |
| `v1/dataadmin/resources/{resourceKey}` | GET | Read | 單筆讀取 | ✅ |
| `v1/dataadmin/resources` | POST | Create | 建立 | ✅ |
| `v1/dataadmin/resources/{resourceKey}` | PUT | Update | 更新 | ✅ |
| `v1/dataadmin/resources/{resourceKey}` | DELETE | Delete | 停用 | 🔴 實際為 Hard Delete |
| — | — | — | Toggle IsActive | 🔴 不存在 |
| — | — | — | 取得子樹 | ⚪ 不存在（可透過 Search + parent 篩選部分替代） |

### Controller 層問題

Controller 為薄層 passthrough，主要問題集中在 Service 層。Controller 本身無額外業務邏輯，結構正確。

---

## §7 MVC Controller + AppService 稽核

### MVC Controller（6 個 Partial Class，共 ~1,126 行）

#### Index（清單頁）

| 項目 | 狀態 | 說明 |
|------|------|------|
| 分頁 | ✅ | pageSize=20，UI-Meta 驅動欄位 |
| 關鍵字搜尋 | ✅ | 傳遞 keyword 到 API |
| 進階篩選（type/parent/isActive/isLeaf） | 🟡 | **未暴露**；WebAPI Search 支援這些篩選，但 MVC Index 只傳 keyword |
| Row Actions | 🟡 | 目前為 Details / Edit / Delete；Spec 應為 Details / Edit / **Deactivate** |

#### AddNew（新增頁）

| 項目 | 狀態 | 說明 |
|------|------|------|
| ResourceType Dropdown | 🟡 | 硬編碼 4 值：CONTROL_BUTTON / FORM / MODULE / SYSTEM<br>Spec 定義 7 值：SYSTEM / MODULE / MENU / PAGE / API / BUTTON / FIELD |
| ResourceCode 輸入 | 🟡 | **硬編碼佔位符** `PMS.Test.B01`（Dropdown）；應為自由文字輸入 |
| ResourceName 輸入 | 🟡 | **硬編碼佔位符** `B01. Test`（Dropdown）；應為自由文字輸入 |
| ParentResourceKey 選擇 | 🟡 | **硬編碼佔位符** `PMS:Basic`（Dropdown）；應為動態父節點選擇器 |
| Method Dropdown | ✅ | GET / POST / PUT / DELETE |
| IsActive 預設 | ✅ | true |
| IsLeaf 預設 | ✅ | false |
| AntiForgeryToken | ✅ | |

#### Edit（編輯頁）

| 項目 | 狀態 | 說明 |
|------|------|------|
| 路由 | ✅ | `Edit/{*resourceKey}` catch-all 處理冒號 |
| RowVersion 載入 | ✅ | 從 API 載入到 VM |
| ResourceType/Code/Name/Parent Dropdown | 🟡 | 同 AddNew 硬編碼佔位符問題 |
| ModifiedDate | 🟡 | POST 時使用 `DateTime.Now`（應為 UtcNow） |
| AntiForgeryToken | ✅ | |

#### Delete（刪除確認頁）

| 項目 | 狀態 | 說明 |
|------|------|------|
| 確認頁 | ✅ | 顯示 ResourceKey / ResourceName / ResourceCode |
| RowVersion 傳遞 | 🟡 | **未傳遞 RowVersion** 至 API → 無併發保護 |
| 實際行為 | 🔴 | Hard Delete（透過 AppService → WebAPI → `_db.Remove`） |
| AntiForgeryToken | ✅ | |

#### Details（詳情頁）

| 項目 | 狀態 | 說明 |
|------|------|------|
| 所有欄位唯讀 | ✅ | 19 個欄位全部 ReadOnly |
| 包含 MetaJson/Tags/RowVersion | ✅ | |

### MVC AppService（ResourcesAppService.cs，265 行）

| 方法 | 狀態 | 問題 |
|------|------|------|
| `GetPagedAsync` | ✅ | 正確解析 API 回應 |
| `GetByIdAsync` / `GetByKeyAsync` | ✅ | 使用 `Uri.EscapeDataString` 處理冒號 |
| `CreateAsync` | ✅ | 檢查 response.Code，失敗拋例外 |
| `UpdateAsync` | 🟡 | `_ = await _api.SendAsync(...)` — **丟棄回應，無錯誤檢查** |
| `DeleteAsync` | 🟡 | **丟棄回應，無錯誤檢查** + **未傳遞 rowVersionBase64** |

### MVC 層問題彙整

| # | 嚴重度 | 問題 |
|---|--------|------|
| G-05 | 🟡 | ResourceType Dropdown 不完整（4 值 vs Spec 7 值） |
| G-06 | 🟡 | ResourceCode / ResourceName / ParentResourceKey 硬編碼佔位符 |
| G-07 | 🟡 | MVC Delete 未傳遞 RowVersion → 無併發保護 |
| G-08 | 🟡 | MVC AppService UpdateAsync / DeleteAsync 丟棄 API 回應 |
| G-10 | 🟡 | MVC Edit POST 使用 `DateTime.Now`（非 UtcNow） |
| G-14 | 🟡 | MVC Index 僅暴露 keyword 搜尋，未暴露 type / parent / isActive / isLeaf 篩選 |
| G-18 | ⚪ | Row Actions 使用 Delete 而非 Deactivate |

---

## §8 DTO / Request / ViewModel 稽核

### ResourceDto（204 行）

- 19 個欄位 + RowVersionBase64 ✅
- 含 RowVersion (byte[]) 和 RowVersionBase64 (string) 雙格式 ✅

### ResourceEditDto（198 行）

- 全欄位覆蓋 ✅、含 RowVersionBase64 ✅
- 用於 Edit + Details 場景 ✅

### ResourceListItemDto（177 行）

- 含 ChildrenCount ✅
- 含 RowVersionBase64 ✅
- 不含 MetaJson、CreatedBy、CreatedDate（清單精簡設計合理）

### ResourceCreatedResultDto（124 行）

- 含 ResourceKey / AppCode / ResourceType / ResourceCode / ResourceName / CreatedBy / CreatedDate ✅
- **不含 RowVersion** ⚪（前端若需立即編輯需再次 GET）

### CreateResourceRequest（161 行）

- 含 ResourceKey（可選，後端可自動產生） ✅
- 含 Text 變體（SortOrderText / IsLeafText / IsActiveText）支援彈性輸入 ✅
- 全欄位覆蓋 ✅

### ResourceRowVM（171 行）

- 18 個欄位 + `GetValue(key)` 動態存取 ✅
- 不含 RowVersion（清單頁不需要，合理）

### ResourcesEditVM（70 行）

- `Fields` (List\<UiFormField\>) + `Data` (Dictionary) + `ResourceKey` ✅
- 標準 UI-Meta 驅動表單模式 ✅

### DTO 層問題

| # | 嚴重度 | 問題 |
|---|--------|------|
| G-15 | ⚪ | ResourceCreatedResultDto 不含 RowVersion；前端若需立即編輯新建資源須額外 GET |

---

## §9 Gap 總表與修復建議

### 🔴 Critical（4 項）

| # | Gap | 現狀 | Spec 要求 | 修復建議 |
|---|-----|------|-----------|----------|
| G-01 | Delete = Hard Delete | `_db.AuthResource.Remove(e)` 物理刪除 | 僅允許 Soft Delete (IsActive=0)；非葉節點不可停用 | 1. 將 `DeleteAsync` 改為 `SET IsActive=0`<br>2. 加入非葉節點檢查（若有 IsActive 子節點則阻擋）<br>3. 保留 RowVersion 併發控制<br>4. MVC Delete 頁改為 Deactivate 確認頁 |
| G-02 | 無循環父節點驗證 | UpdateAsync 允許將 ParentResourceKey 設為自身或後代 | 禁止循環設定；驗證新父節點不在自身子樹中 | 在 UpdateAsync 中：<br>1. 若 ParentResourceKey 變更 → 查詢新 parent 的 Path<br>2. 檢查新 parent 的 Path 是否以自身 Path 為前綴（表示是後代）<br>3. 檢查 ParentResourceKey ≠ ResourceKey（禁止自引用）<br>4. 可利用 Repository 的 `GetSubtreeByPathPrefixAsync` |
| G-03 | 無 Path 遞迴更新 | 變更 ParentResourceKey 後 Path 不更新 | ParentResourceKey 變更時，自身及所有後代的 Path 須在同一交易中遞迴更新 | 1. 偵測 ParentResourceKey 是否變更<br>2. 計算新 Path = 新父節點 Path + "/" + 自身 Key<br>3. 使用 `GetSubtreeByPathPrefixAsync(oldPath)` 找出所有後代<br>4. 批次 UPDATE 替換 Path 前綴<br>5. 包在同一交易中 |
| G-04 | 缺少 Toggle IsActive | 無對應 API / 業務方法 | 提供啟用/停用切換端點 | 1. 新增 `ToggleActiveAsync(resourceKey, rowVersion)` 業務方法<br>2. 新增 `[HttpPatch("{resourceKey}/active")]` 端點<br>3. Repository 已有 `SetActiveAsync` 可直接調用<br>4. MVC 新增 Deactivate/Activate 按鈕取代 Delete |

### 🟡 Warning（12 項）

| # | Gap | 現狀 | 修復建議 |
|---|-----|------|----------|
| G-05 | ResourceType Dropdown 不完整 | 4 值（CONTROL_BUTTON / FORM / MODULE / SYSTEM） | 補齊 Spec 定義的 7 值（SYSTEM / MODULE / MENU / PAGE / API / BUTTON / FIELD）；建議從 DB 或設定檔動態載入 |
| G-06 | 硬編碼佔位符 Dropdown | ResourceCode="PMS.Test.B01"、ResourceName="B01. Test"、ParentResourceKey="PMS:Basic" | 改為：ResourceCode/ResourceName → 自由文字輸入；ParentResourceKey → 動態查詢 API 載入父節點選項 |
| G-07 | MVC Delete 未傳 RowVersion | `_resources.DeleteAsync(app, rkey)` 無 rowVersion 參數 | 在 Delete GET 時載入 RowVersion 到 VM，POST 時傳遞給 API |
| G-08 | AppService Update/Delete 丟棄回應 | `_ = await _api.SendAsync(...)` | 參照 `CreateAsync` 模式，解析回應碼並在失敗時拋出例外 |
| G-09 | Entity CreatedDate = DateTime.Now | `public DateTime CreatedDate { get; set; } = DateTime.Now;` | 改為 `DateTime.UtcNow`，或移除 Entity 端預設值，統一由 Service 層賦值 |
| G-10 | MVC Edit POST 使用 DateTime.Now | ModifiedDate 使用 `DateTime.Now` | 改為 `DateTime.UtcNow`，或移除 MVC 端賦值（由 WebAPI Service 統一處理） |
| G-11 | 無 MetaJson JSON 驗證 | Create/Update 不驗證 MetaJson 格式 | 在 Service 的 Create/Update 中加入 `JsonDocument.Parse(metaJson)` 驗證；若失敗回傳 400 |
| G-12 | 無條件式 Endpoint/Method 必填 | ResourceType=API 時不檢查 Endpoint/Method | 在 Create/Update 中：若 ResourceType == "API" && (Endpoint 為空 \|\| Method 為空) → 回傳驗證錯誤 |
| G-13 | Repository 725 行 Dead Code | WebAPI Service 使用 EF Core 直接操作，未注入 Repository | 二選一：(A) 重構 Service 使用 Repository → 可直接利用 SetActiveAsync/SetPathAsync 等方法；(B) 移除 Repository → 減少維護負擔 |
| G-14 | MVC Index 搜尋功能不完整 | 僅傳 keyword，不傳 type/parent/isActive/isLeaf | 在 Index 頁加入篩選欄位（Dropdown + Checkbox），傳遞給 AppService.GetPagedAsync |
| G-16 | DB Extended Property 值與 Spec 不一致 | FORM/REPORT/CONTROL_BUTTON/CONTROL_FIELD | 更新 Extended Property 以匹配 Spec 定義；或在 Spec 中記錄 DB 的實際列舉值 |
| G-19 | CreateAsync 父節點 Path 驗證缺失 | 建立時若指定 ParentResourceKey，未自動計算並設定 Path | 建立時應查詢父節點 Path，自動計算新節點 Path = ParentPath + "/" + ResourceKey |

### ⚪ Info（5 項）

| # | Gap | 說明 | 建議 |
|---|-----|------|------|
| G-15 | ResourceCreatedResultDto 不含 RowVersion | 前端建立後若需立即編輯，須額外 GET | 考慮加入 RowVersionBase64 欄位 |
| G-17 | Entity 無 Navigation Property | 無 Parent / Children 集合 | 若未來需 EF Include 載入子節點，可加入導覽屬性 |
| G-18 | MVC Row Action 為 Delete 非 Deactivate | 按鈕文字不符 Spec 語意 | 配合 G-01 修復，將按鈕名稱改為「停用」 |
| G-20 | ChildrenCount 為 N+1 查詢模式 | Service 中 foreach 逐筆計算子節點數 | 可改為 SQL 子查詢或 Window Function 一次取得 |
| G-21 | Search 排序不支援自訂 | 固定 CreatedDate DESC, SortOrder, ResourceCode | 未來可加入 sortBy / sortDir 參數 |

---

## 附錄 A — Spec 功能實現狀態對照

| Spec 功能 | 對應層 | 狀態 | Gap # |
|-----------|--------|------|-------|
| ResourceKey 為 PK (NVARCHAR(160)) | DB + Entity | ✅ 已實現 | — |
| ResourceKey 格式 = {AppCode}:{ResourceCode} | Service Create | ✅ 已實現 | — |
| ResourceKey 建立後不可修改 | Service Update (Whitelist) | ✅ 已實現 | — |
| AppCode 正則 ^[A-Z0-9_]+$ | Service Create | ✅ 已實現 | — |
| ResourceCode 正則 ^[A-Z0-9_.]+$ | Service Create | ✅ 已實現 | — |
| (AppCode, ResourceCode) UNIQUE | DB + Service Create | ✅ 已實現 | — |
| ParentResourceKey Self-FK | DB | ✅ 已實現 | — |
| Path (Materialized Path) | DB + Entity | ✅ 欄位存在 | G-03 (不自動更新) |
| 循環父節點禁止 | Service Update | ❌ 未實現 | G-02 |
| Path 遞迴更新 | Service Update | ❌ 未實現 | G-03 |
| ResourceType 列舉 (7 值) | DB + MVC Dropdown | 🟡 部分 | G-05, G-16 |
| Soft Delete Only (IsActive=0) | Service Delete | ❌ Hard Delete | G-01 |
| 非葉節點不可停用 | Service Delete | 🟡 有子節點檢查但行為錯誤 | G-01 |
| Toggle IsActive 端點 | Service + Controller | ❌ 不存在 | G-04 |
| Endpoint + Method (API 類型) | DB + Entity + DTO | ✅ 欄位存在 | G-12 (無條件必填) |
| MetaJson = 合法 JSON | Service Create/Update | ❌ 未驗證 | G-11 |
| RowVersion 樂觀鎖定 | DB + Entity + Service | ✅ 已實現 | G-07 (MVC Delete 未傳) |
| 分頁搜尋 (多條件) | WebAPI Search | ✅ 已實現 | G-14 (MVC 未完整暴露) |
| CRUD API | WebAPI Controller | ✅ 5 端點 | G-01 (Delete 行為錯誤) |
| MVC 管理介面 | MVC Controller | 🟡 基本可用 | G-05/06/07/08/10/14 |

---

## 附錄 B — Repository ↔ Service 方法對照

> 說明：Repository（Dapper）提供了豐富的方法集，但 WebAPI Service（EF Core）完全未使用。

| Repository 方法 | Service 等效實作 | 建議 |
|----------------|----------------|------|
| `FindAsync` | `_db.AuthResource.FirstOrDefaultAsync(e => e.ResourceKey == key)` | 等效 |
| `GetByAppAndCodeAsync` | `_db.AuthResource.AnyAsync(e => e.AppCode == ... && e.ResourceCode == ...)` | 等效 |
| `GetChildrenAsync` | `_db.AuthResource.CountAsync(e => e.ParentResourceKey == key)` | Service 只查 Count |
| `GetByEndpointAsync` | 未實作 | 未來 API 路由鑑權可能需要 |
| `GetSubtreeByPathPrefixAsync` | 未實作 | **Path 遞迴更新必須** |
| `SetActiveAsync` | 未實作 | **Toggle IsActive 必須** |
| `SetPathAsync` | 未實作 | **Path 遞迴更新必須** |
| `SetParentAndSortAsync` | 未實作 | Service Update 可替代 |
| `SetEndpointAsync` | 未實作 | Service Update 可替代 |
| `SetMetaAndTagsAsync` | 未實作 | Service Update 可替代 |
| `DeleteAsync` (DryRun/Cascade) | `_db.AuthResource.Remove(e)` | Repository 版本功能更完善 |

---

## 附錄 C — 建議修復優先順序

| 優先級 | Gap # | 預估工時 | 說明 |
|--------|-------|---------|------|
| P0 | G-01 | 2h | Delete → Soft Delete 改造 |
| P0 | G-04 | 2h | 新增 Toggle IsActive 端點 + MVC 按鈕 |
| P0 | G-02 | 3h | 循環父節點防護 |
| P0 | G-03 | 4h | Path 遞迴更新邏輯 |
| P1 | G-05 | 1h | ResourceType Dropdown 補齊 |
| P1 | G-06 | 2h | 移除硬編碼佔位符，改為動態輸入 |
| P1 | G-08 | 1h | AppService Update/Delete 檢查回應 |
| P1 | G-07 | 1h | MVC Delete 傳遞 RowVersion |
| P1 | G-11 | 1h | MetaJson JSON 驗證 |
| P1 | G-12 | 1h | ResourceType=API 條件必填 |
| P2 | G-09, G-10 | 0.5h | DateTime.Now → UtcNow |
| P2 | G-13 | 2h | 決定 Repository 去留（重構或移除） |
| P2 | G-14 | 2h | MVC Index 進階篩選 UI |
| P3 | G-15 ~ G-21 | — | Backlog |

---

*報告完畢。共發現 21 項差異，其中 4 項 🔴 Critical 需優先處理。*
