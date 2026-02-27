# ActionModuleSpec — AuthAction 模組實作稽核報告

> **產出日期**：2026-02-27
> **依據文件**：`AuthActionPrototypeSpec.md`（2026-02-26）
> **稽核範圍**：ERP.DataAdmin（MVC 前端）、ERP.WebAPI.DataAdmin（WebAPI 後端）、ERP.CommonLib（共用層）
> **嚴重性等級**：🔴 Critical / 🟡 Medium / ⚪ Low

---

## §0 稽核總覽

| 項目 | 狀態 |
|------|------|
| Spec 功能項目數 | 18 |
| ✅ 已實現（符合 Spec） | 10 |
| ⚠️ 已實現但有偏差 | 3 |
| ❌ 尚未實現 | 5 |
| 🔴 Critical 缺口 | 4 |
| 🟡 Medium 缺口 | 7 |
| ⚪ Low 缺口 | 4 |

---

## §1 檔案盤點

### 1.1 資料庫層

| 檔案 | 行數 | 說明 |
|------|------|------|
| `Database/ERP.DataAdmin/AuthAction.sql` | 65 | CREATE TABLE + UNIQUE 約束 |

### 1.2 共用層（ERP.CommonLib）

| 檔案 | 行數 | 說明 |
|------|------|------|
| `Models/Entities/Auth/AuthAction.cs` | 178 | EF Core Entity |
| `Models/Dto/Auth/Actions/ActionDto.cs` | 168 | 通用 DTO（含 RowVersion + RowVersionBase64） |
| `Models/Dto/Auth/Actions/ActionEditDto.cs` | 178 | 編輯/更新用 DTO |
| `Models/Dto/Auth/Actions/ActionListItemDto.cs` | 140 | 清單列用輕量 DTO |
| `Models/Dto/Auth/Actions/ActionCreatedResultDto.cs` | 105 | 建立成功回傳 DTO |
| `Models/Requests/Auth/Actions/CreateActionRequest.cs` | 100 | 建立請求模型 |
| `Repositories/Auth/AuthActionRepository.cs` | 1017 | Dapper Repository（⚠️ 未被 WebAPI 使用） |

### 1.3 WebAPI 後端（ERP.WebAPI.DataAdmin）

| 檔案 | 行數 | 說明 |
|------|------|------|
| `Services/Admin/ActionsAdminService.cs` | 314 | 核心 CRUD 業務邏輯 |
| `Services/Admin/IActionsAdminService.cs` | 46 | 服務介面 |
| `Controllers/Admin/ActionsAdminController.cs` | 79 | Controller 基底（路由 + DI） |
| `Controllers/Admin/ActionsAdminController.Search.cs` | 164 | GET search 端點 |
| `Controllers/Admin/ActionsAdminController.Read.cs` | 71 | GET {actionCode} 端點 |
| `Controllers/Admin/ActionsAdminController.Create.cs` | 115 | POST 端點 |
| `Controllers/Admin/ActionsAdminController.Update.cs` | 88 | PUT {actionCode} 端點 |
| `Controllers/Admin/ActionsAdminController.Delete.cs` | 76 | DELETE {actionCode} 端點 |

### 1.4 MVC 前端（ERP.DataAdmin）

| 檔案 | 行數 | 說明 |
|------|------|------|
| `Controllers/Authorization/Actions/ActionsController.cs` | ~160 | Controller 基底（DI + ViewRoot） |
| `Controllers/Authorization/Actions/ActionsController.Index.cs` | ~280 | Index 列表頁 |
| `Controllers/Authorization/Actions/ActionsController.AddNew.cs` | ~200 | 新增頁 |
| `Controllers/Authorization/Actions/ActionsController.Edit.cs` | ~230 | 編輯頁 |
| `Controllers/Authorization/Actions/ActionsController.Delete.cs` | ~190 | 刪除確認頁 |
| `Controllers/Authorization/Actions/ActionsController.Details.cs` | ~120 | 詳情頁 |
| `Services/Authorization/Actions/ActionsAppService.cs` | ~260 | MVC ↔ WebAPI 橋接服務 |
| `Services/Authorization/Actions/IActionsAppService.cs` | ~100 | AppService 介面 |
| `Services/Authorization/Actions/ActionsUiMetaService.cs` | ~150 | UI-Meta 服務 |
| `Services/Authorization/Actions/IActionsUiMetaService.cs` | 33 | UI-Meta 介面 |
| `ViewModels/Authorization/Actions/ActionsEditVM.cs` | 71 | 編輯 ViewModel |
| `ViewModels/Authorization/Actions/ActionRowVM.cs` | 225 | 清單行 ViewModel |
| `ViewModels/Authorization/Actions/ActionsDetailsVM.cs` | 102 | 詳情 ViewModel |
| `ViewModels/Authorization/Actions/ActionsDeleteVM.cs` | 100 | 刪除確認 ViewModel |

**合計**：~35 檔案，約 4,700 行程式碼。

---

## §2 Spec 功能逐項比對

### 2.1 Key / Identity

| # | Spec 需求 | 狀態 | 說明 |
|---|-----------|------|------|
| F-01 | ActionId 為 IDENTITY 自動產生，唯讀 | ✅ 已實現 | DB: `INT IDENTITY(1,1)`；Entity: `[DatabaseGenerated(Identity)]`；UI 唯讀 |
| F-02 | ActionCode 全域唯一 | ✅ 已實現 | DB: `UNIQUE (UQ_AuthAction_ActionCode)`；Entity: `[Key]` on ActionCode |
| F-03 | ActionCode 建立後不可修改 | ✅ 已實現 | WebAPI `UpdateAsync` 白名單不含 ActionCode；MVC Edit 頁 ActionCode 唯讀 |
| F-04 | ActionCode 格式驗證（大寫字母/數字/底線/連字號，2-50 字元） | ❌ 未實現 | 見 **G-03** |

### 2.2 CRUD 功能

| # | Spec 需求 | 狀態 | 說明 |
|---|-----------|------|------|
| F-05 | Search / Index：關鍵字搜尋 + 分頁 | ✅ 已實現 | WebAPI `SearchAsync` 支援 keyword（搜 ActionCode/ActionName/Description/Category）+ 分頁 |
| F-06 | Detail：唯讀檢視全欄位 | ✅ 已實現 | MVC Details 頁面所有欄位 `ReadOnly=true` |
| F-07 | Add New：建立新 Action | ✅ 已實現 | WebAPI `CreateAsync` + MVC AddNew 頁面 |
| F-08 | Edit：更新可修改欄位 + RowVersion 檢查 | ✅ 已實現 | WebAPI `UpdateAsync` 白名單 + RowVersion 樂觀鎖 |
| F-09 | Delete = 軟刪（只有 IsEnabled 停用/啟用切換） | ❌ 未實現 | 見 **G-01**、**G-04** |

### 2.3 Core Protection（IsBasicAction=1 護欄）

| # | Spec 需求 | 狀態 | 說明 |
|---|-----------|------|------|
| F-10 | 核心動作允許編輯顯示欄位（ActionName/Category/SortOrder/Description） | ⚠️ 部分 | 白名單包含這些欄位 ✅，但也包含不該包含的 IsEnabled/IsBasicAction ❌ |
| F-11 | 核心動作禁止停用（IsEnabled 不可切到 0） | ❌ 未實現 | 見 **G-02** |
| F-12 | 核心動作禁止將 IsBasicAction 改為 0 | ❌ 未實現 | 見 **G-02** |
| F-13 | 核心動作禁止刪除 | ❌ 未實現 | 見 **G-02** |

### 2.4 Category / UI 值域

| # | Spec 需求 | 狀態 | 說明 |
|---|-----------|------|------|
| F-14 | Category 固定下拉：READ / WRITE / OUTPUT / WORKFLOW | ⚠️ 偏差 | 見 **G-05** |

### 2.5 併發 / 稽核

| # | Spec 需求 | 狀態 | 說明 |
|---|-----------|------|------|
| F-15 | RowVersion 樂觀鎖定（Update） | ✅ 已實現 | WebAPI `UpdateAsync` WHERE RowVersion 條件 |
| F-16 | RowVersion 樂觀鎖定（Delete/Toggle） | ⚠️ 偏差 | WebAPI Delete 支援，但 MVC 端未傳遞 RowVersion；Toggle 端點不存在。見 **G-06** |
| F-17 | Audit Fields 唯讀顯示 | ✅ 已實現 | MVC Details/Edit 頁面稽核欄位唯讀 |
| F-18 | Index Row Actions = Detail / Edit / Disable(Enable) | ❌ 未實現 | 目前為 Detail / Edit / Delete（硬刪）|

---

## §3 缺口清單（Gap List）

### 🔴 Critical（P0 — 與 Spec 核心邏輯直接衝突）

---

#### G-01 🔴 Delete 為硬刪除 — Spec 明確禁止

**Spec 要求**：
> 「不提供 Hard Delete；只提供 IsEnabled 停用/啟用」

**現況**：
- WebAPI `ActionsAdminService.DeleteAsync()` 使用 `_db.Remove(e)` 執行物理刪除
- MVC Delete 確認頁存在（`ActionsController.Delete.cs` + `ActionsDeleteVM`）
- MVC `ActionsAppService.DeleteAsync()` 呼叫 `DELETE /{actionCode}` 端點

**影響範圍**：
| 層 | 檔案 | 問題 |
|----|------|------|
| WebAPI Service | `ActionsAdminService.cs` L245-275 | `_db.Remove(e)` 硬刪 |
| WebAPI Controller | `ActionsAdminController.Delete.cs` | `[HttpDelete]` 端點 |
| MVC Controller | `ActionsController.Delete.cs` | Delete 確認頁 GET/POST |
| MVC AppService | `ActionsAppService.cs` | `DeleteAsync()` 呼叫 DELETE API |
| MVC ViewModel | `ActionsDeleteVM.cs` | 刪除確認 ViewModel |

**修正方向**：
1. 移除或停用 WebAPI `DeleteAsync` + `[HttpDelete]` 端點
2. 新增 `ToggleEnabledAsync` / `SetEnabledAsync` 方法（Service + Controller）
3. MVC 端將 Delete 頁面改為 Disable/Enable 切換操作
4. 移除 `ActionsDeleteVM`，改用 Toggle 確認流程

---

#### G-02 🔴 缺少 Core Protection（IsBasicAction=1 護欄）

**Spec 要求**：
> - IsBasicAction=1 → 禁止停用（IsEnabled→0）
> - IsBasicAction=1 → 禁止將 IsBasicAction 改為 0
> - IsBasicAction=1 → 禁止刪除

**現況**：WebAPI Service `UpdateAsync` 白名單包含 `IsEnabled` 和 `IsBasicAction`，**無任何條件檢查**；`DeleteAsync` 也無 IsBasicAction 檢查。

**影響範圍**：
| 層 | 檔案 | 問題 |
|----|------|------|
| WebAPI Service | `ActionsAdminService.cs` UpdateAsync | 白名單含 IsEnabled/IsBasicAction 無保護 |
| WebAPI Service | `ActionsAdminService.cs` DeleteAsync | 無 IsBasicAction 檢查即刪除 |
| MVC Controller | `ActionsController.Edit.cs` | 未隱藏/鎖定核心動作的 IsEnabled/IsBasicAction 欄位 |
| MVC Controller | `ActionsController.Delete.cs` | 核心動作也能進入刪除確認頁 |

**修正方向**：
1. WebAPI `UpdateAsync` 加入前置檢查：
   ```csharp
   if (existing.IsBasicAction)
   {
       // 禁止 IsEnabled → false
       if (dict.ContainsKey("IsEnabled") && !TryBool(dict["IsEnabled"]))
           return Forbid("核心動作不可停用");
       // 禁止 IsBasicAction → false
       if (dict.ContainsKey("IsBasicAction") && !TryBool(dict["IsBasicAction"]))
           return Forbid("核心動作不可取消基本動作標記");
   }
   ```
2. WebAPI `DeleteAsync`（或未來 ToggleAsync）加入：若 `IsBasicAction=1`，拒絕停用
3. MVC Edit 頁：核心動作時 IsEnabled/IsBasicAction 欄位設為 ReadOnly

---

#### G-03 🔴 缺少 ActionCode 格式驗證

**Spec 要求**：
> - 只能包含大寫字母、數字、底線、連字號
> - `LEN(ActionCode) BETWEEN 2 AND 50`
> - UI 端自動轉大寫

**現況**：**全棧無驗證**。
| 層 | 檢查 |
|----|------|
| DB CHECK constraint | ❌ 不存在 |
| Entity DataAnnotation | ❌ 無 `[RegularExpression]` |
| WebAPI Service CreateAsync | ❌ 只驗 required，無格式 |
| MVC AddNew Controller | ❌ 無格式驗證/自動轉大寫 |

**修正方向**：
1. DB 加入 CHECK constraint：
   ```sql
   ALTER TABLE [dbo].[AuthAction]
   ADD CONSTRAINT CK_AuthAction_ActionCode_Format
   CHECK (ActionCode = UPPER(ActionCode)
     AND ActionCode NOT LIKE '%[^A-Z0-9_-]%'
     AND LEN(ActionCode) BETWEEN 2 AND 50);
   ```
2. WebAPI `CreateAsync` 加入 Regex 驗證：`^[A-Z0-9_-]{2,50}$`
3. MVC AddNew 自動 `ToUpperInvariant()` + 前端 input 加 `text-transform: uppercase`
4. Entity 加 `[RegularExpression(@"^[A-Z0-9_-]{2,50}$")]`

---

#### G-04 🔴 缺少 Toggle IsEnabled API 端點

**Spec 要求**：
> 「列表的 Disable/Enable 即 IsEnabled 切換（並更新 Modified/RowVersion）」

**現況**：
- WebAPI 無 `PATCH` 或 `POST toggle` 端點
- Repository **已有** `SetEnabledAsync` 方法（完整實作 + RowVersion），但未被 WebAPI 呼叫
- MVC 前端 Index 的 Row Actions 包含 Delete（硬刪），無 Disable/Enable 切換按鈕

**修正方向**：
1. WebAPI Service 新增 `SetEnabledAsync(actionCode, isEnabled, rowVersion)` 方法
2. WebAPI Controller 新增端點：`[HttpPatch("{actionCode}/enabled")]`
3. MVC Index 行動作改為 Disable/Enable（依當前 IsEnabled 狀態切換）
4. 可考慮直接橋接 Repository 已有的 `SetEnabledAsync`

---

### 🟡 Medium（P1 — 功能偏差或資料一致性風險）

---

#### G-05 🟡 Category 下拉值域錯誤且不一致

**Spec 要求**：`READ / WRITE / OUTPUT / WORKFLOW`

**現況**：

| 頁面 | 實際值 |
|------|--------|
| MVC AddNew | APPROVAL / OTHER / READ / WRITE |
| MVC Edit | APPROVAL / OTHER / READ / WRITE |
| MVC Details | READ / WRITE / DELETE / ADMIN |
| WebAPI Service | 無驗證 |

**影響**：三個頁面的下拉選項互不一致，且均不符合 Spec。

**修正方向**：
1. 統一所有頁面的 Category 下拉為：`READ / WRITE / OUTPUT / WORKFLOW`
2. WebAPI `CreateAsync` / `UpdateAsync` 加入 Category 值域白名單驗證
3. 建議將值域定義為共用常數（如 `ActionCategories.cs`），避免各處硬編碼

---

#### G-06 🟡 MVC Delete 不傳 RowVersion

**現況**：`ActionsAppService.DeleteAsync(app, code)` 呼叫 `DELETE /{actionCode}` 時**未附帶 `rowVersionBase64`** 參數。

**影響**：即使 WebAPI 端支援 RowVersion 檢查，MVC 端也不傳，等於併發保護形同虛設。

**修正方向**：MVC AppService `DeleteAsync` 應傳入 `rowVersionBase64` query parameter。

---

#### G-07 🟡 MVC AppService UpdateAsync / DeleteAsync 丟棄 API 回應

**現況**：
```csharp
// ActionsAppService.cs — UpdateAsync
_ = await _api.SendAsync<ApiResponse<object>>(options);  // ← 完全丟棄回應

// ActionsAppService.cs — DeleteAsync
_ = await _api.SendAsync<ApiResponse<object>>(options);  // ← 完全丟棄回應
```

**對比**：同檔案 `CreateAsync` 有正確檢查 `response.Code`。

**影響**：更新/刪除失敗時（如 RowVersion 衝突、記錄不存在），MVC 端無法得知錯誤，使用者看到假成功。

**修正方向**：
```csharp
var response = await _api.SendAsync<ApiResponse<object>>(options);
if (response.Code != 200)
    throw new Exception(response.Message);
```

---

#### G-08 🟡 Entity `CreatedDate` 預設值使用 `DateTime.Now`

**現況**：`AuthAction.cs` Entity：
```csharp
public DateTime CreatedDate { get; set; } = DateTime.Now;  // ← 本地時間
```

**對比**：Repository 使用 `DateTime.UtcNow` ✅；DB 預設 `getdate()`（SQL Server 伺服器本地時間）。

**影響**：多時區環境下時間不一致。

**修正方向**：改為 `DateTime.UtcNow`，並確保整條鏈路（Entity → Service → DB）一致使用 UTC。

---

#### G-09 🟡 AuthActionRepository（1017 行）為 Dead Code

**現況**：
- `AuthActionRepository` 提供完整 Dapper CRUD（包括 `SetEnabledAsync`、`DeleteAsync` with DryRun + 子表 Cascade、`UpsertAsync`、`EnsureMinimalSetAsync`）
- 同時包含完整 EF Core 版本（在註解中）
- **WebAPI Service 完全不使用此 Repository**，而是直接 `_db.Set<AuthAction>()` 操作 EF Core

**影響**：
- 1017 行程式碼無人呼叫，增加維護負擔
- Repository 品質其實更高（有 SetEnabledAsync、有 DryRun、有 RowVersion）
- 兩套平行實作造成混淆

**修正方向**：
- 方案 A：讓 WebAPI Service 改用 Repository（推薦，品質更高）
- 方案 B：刪除 Repository，將其邏輯移入 WebAPI Service
- 無論選哪種，避免兩套平行程式碼

---

#### G-10 🟡 DB 缺少 ActionCode 格式 CHECK Constraint

**現況**：DB 僅有 `UNIQUE` 約束（`UQ_AuthAction_ActionCode`），無 CHECK constraint 防止小寫、特殊字元或長度不足的 ActionCode 寫入。

**影響**：即使應用層加了驗證，直接 SQL 操作仍可繞過。

**修正方向**：見 G-03 修正方向第 1 點。

---

#### G-11 🟡 CreateActionRequest 缺少 IsBasicAction 欄位

**現況**：`CreateActionRequest.cs` 包含 ActionCode、ActionName、Category、SortOrder、IsEnabled、Description，**但不包含 `IsBasicAction`**。

**影響**：新建 Action 時無法指定 IsBasicAction，只能依賴 DB 預設值（`1`）。若 Seed 或管理需求要建立非核心動作，無法透過此 Request 模型指定。

**修正方向**：加入 `public bool? IsBasicAction { get; set; }` 欄位。

---

### ⚪ Low（P2 — 改善建議）

---

#### G-12 ⚪ CreateAsync 錯誤訊息可能暴露 DB 結構

**現況**：WebAPI `CreateAsync` 捕獲 `DbUpdateException` 時可能回傳含有 SQL Server 錯誤詳情的訊息。

**修正方向**：統一回傳友善錯誤訊息，日誌記錄完整例外。

---

#### G-13 ⚪ CreateAsync 無重複 ActionCode 預先檢查

**現況**：依賴 DB UNIQUE 約束攔截重複，觸發 `DbUpdateException`。

**修正方向**：Service 層先查詢 `SELECT COUNT(1) WHERE ActionCode=@code`，給使用者友善的「ActionCode 已存在」提示。

---

#### G-14 ⚪ ActionCreatedResultDto 不含 RowVersion

**現況**：建立成功後回傳的 `ActionCreatedResultDto` 僅含 ActionCode、ActionName、Category、IsEnabled、CreatedDate，**無 RowVersion**。

**影響**：前端建立完成後若要立即更新，需先 re-fetch 才能取得 RowVersion。

**修正方向**：加入 `RowVersionBase64` 欄位，或文件記載「建立後應 redirect 至 Edit 頁重新載入」。

---

#### G-15 ⚪ Index Row Actions 顯示文字不符 Spec

**Spec 要求**：Row Actions = Detail / Edit / Disable（或 Enable）
**現況**：Row Actions = Details / Edit / Delete

**修正方向**：當 G-01 / G-04 修正後，一併調整 Index 行動作按鈕。

---

## §4 已正確實現功能清單

| # | 功能 | 層級 | 說明 |
|---|------|------|------|
| ✅ 1 | ActionId IDENTITY 自動產生 | DB + Entity | `INT IDENTITY(1,1)`，Entity `[DatabaseGenerated(Identity)]` |
| ✅ 2 | ActionCode UNIQUE 約束 | DB | `UQ_AuthAction_ActionCode` |
| ✅ 3 | ActionCode 不可修改（Update） | WebAPI | `UpdateAsync` 白名單不含 ActionCode |
| ✅ 4 | 搜尋 + 分頁 | WebAPI + MVC | keyword + onlyEnabled + pagination |
| ✅ 5 | 單筆查詢 by ActionCode | WebAPI + MVC | `GET /{actionCode}` → ActionEditDto |
| ✅ 6 | 建立新 Action | WebAPI + MVC | `POST /` + MVC AddNew 頁面 |
| ✅ 7 | 更新 + RowVersion 樂觀鎖 | WebAPI | `UpdateAsync` WHERE RowVersion 條件 |
| ✅ 8 | Audit Fields 唯讀顯示 | MVC Details | CreatedBy/Date, ModifiedBy/Date 顯示 |
| ✅ 9 | CSRF 防護 | MVC | 所有 POST 均 `[ValidateAntiForgeryToken]` |
| ✅ 10 | ViewModel 安全綁定 | MVC | `[BindNever]` 保護 ActionCode/Fields |
| ✅ 11 | UI-Meta 動態欄位 | MVC | UiFormField / UiListColumn 驅動 |
| ✅ 12 | DTO 欄位完整 | CommonLib | ActionDto 13 欄位 + RowVersion + RowVersionBase64 |
| ✅ 13 | Repository 有 SetEnabledAsync | CommonLib | 已實作但未橋接（待 G-04 修正後可用） |

---

## §5 架構流程圖

```
┌────────────────────────────────────────────────────────────┐
│                   使用者 (Browser)                          │
└──────────┬───────────────────────────────────┬─────────────┘
           │ HTTP                              │
           ▼                                   │
┌──────────────────────┐                       │
│  ERP.DataAdmin (MVC) │                       │
│ ┌──────────────────┐ │                       │
│ │ ActionsController│ │                       │
│ │  .Index          │ │  Index/AddNew/        │
│ │  .AddNew         │ │  Edit/Delete/         │
│ │  .Edit           │ │  Details              │
│ │  .Delete  ❌G-01 │ │                       │
│ │  .Details        │ │                       │
│ └────────┬─────────┘ │                       │
│          │            │                       │
│ ┌────────▼─────────┐ │                       │
│ │ActionsAppService │ │                       │
│ │ UpdateAsync ❌G-07│ │                       │
│ │ DeleteAsync ❌G-06│ │                       │
│ └────────┬─────────┘ │                       │
└──────────┼───────────┘                       │
           │ HTTP (ApiDataServiceV2)           │
           ▼                                   │
┌──────────────────────────────┐               │
│ ERP.WebAPI.DataAdmin (API)   │               │
│ ┌──────────────────────────┐ │               │
│ │ActionsAdminController    │ │               │
│ │ [Route v1/dataadmin/     │ │               │
│ │        actions]          │ │               │
│ │  Search / Read /         │ │               │
│ │  Create / Update /       │ │               │
│ │  Delete     ❌G-01       │ │               │
│ │  (Toggle    ❌G-04 缺)   │ │               │
│ └──────────┬───────────────┘ │               │
│            │                 │               │
│ ┌──────────▼───────────────┐ │               │
│ │ ActionsAdminService      │ │               │
│ │  SearchAsync    ✅       │ │               │
│ │  GetAsync       ✅       │ │               │
│ │  CreateAsync    ❌G-03   │ │  使用 EF Core │
│ │  UpdateAsync    ❌G-02   │ ├──────────────►│
│ │  DeleteAsync    ❌G-01   │ │               │
│ │  (Toggle        ❌G-04)  │ │               │
│ └──────────────────────────┘ │               │
└──────────────────────────────┘               │
                                               ▼
                               ┌───────────────────────┐
                               │   SQL Server           │
                               │ [dbo].[AuthAction]     │
                               │  PK: ActionId (IDENT)  │
                               │  UQ: ActionCode        │
                               │  CHECK: ❌ G-10 缺     │
                               └───────────────────────┘

┌──────────────────────────────────┐
│ ERP.CommonLib (共用)              │
│  AuthActionRepository (1017行)   │
│   ✅ SetEnabledAsync             │
│   ✅ DeleteAsync (DryRun+Cascade)│
│   ❌ 未被 WebAPI 使用 → G-09    │
└──────────────────────────────────┘
```

---

## §6 修正優先順序建議

### Phase 1（🔴 P0 — 上線前必修）

| 順序 | 缺口 | 預估工作量 | 說明 |
|------|------|-----------|------|
| 1 | G-01 移除硬刪 | 2h | 停用 Delete 端點 + 移除 MVC Delete 頁面 |
| 2 | G-04 新增 Toggle | 3h | WebAPI SetEnabled 端點 + MVC Disable/Enable 按鈕 |
| 3 | G-02 Core Protection | 2h | UpdateAsync/ToggleAsync 加入 IsBasicAction 檢查 |
| 4 | G-03 ActionCode 驗證 | 1.5h | WebAPI Regex + MVC toUpper + DB CHECK |

### Phase 2（🟡 P1 — 上線後短期修復）

| 順序 | 缺口 | 預估工作量 | 說明 |
|------|------|-----------|------|
| 5 | G-05 Category 統一 | 0.5h | 三處下拉改 READ/WRITE/OUTPUT/WORKFLOW |
| 6 | G-07 回應檢查 | 0.5h | AppService Update/Delete 加 response check |
| 7 | G-06 RowVersion 傳遞 | 0.5h | MVC Delete (→Toggle) 帶 RowVersion |
| 8 | G-08 DateTime.UtcNow | 0.25h | Entity 一行修正 |
| 9 | G-09 Dead Code 處理 | 2h | 決定 Repository 去留 |
| 10 | G-10 DB CHECK | 0.5h | ALTER TABLE 加 constraint |
| 11 | G-11 CreateRequest 補欄 | 0.25h | 加 IsBasicAction 欄位 |

### Phase 3（⚪ P2 — 品質改善）

| 順序 | 缺口 | 預估工作量 | 說明 |
|------|------|-----------|------|
| 12 | G-12 錯誤訊息遮蔽 | 0.5h | 統一友善訊息 |
| 13 | G-13 重複預檢 | 0.5h | 先查後建 |
| 14 | G-14 CreatedResult 補 RowVersion | 0.25h | 加欄位 |
| 15 | G-15 Index 按鈕文字 | 0.25h | 隨 G-01/G-04 一併修正 |

**Phase 1 總計**：~8.5 hr
**Phase 2 總計**：~4.5 hr
**Phase 3 總計**：~1.5 hr

---

## §7 重點程式片段標記

### 7.1 硬刪 — ActionsAdminService.DeleteAsync（G-01）

```csharp
// ERP.WebAPI.DataAdmin/Services/Admin/ActionsAdminService.cs
public async Task<(bool ok, string msg)> DeleteAsync(string actionCode, string? rowVersionBase64)
{
    // ...
    _db.Remove(e);                    // ← 物理刪除
    await _db.SaveChangesAsync();     // ← 資料永久消失
    // ...
}
```

### 7.2 無 Core Protection — ActionsAdminService.UpdateAsync（G-02）

```csharp
// 白名單包含 IsEnabled + IsBasicAction，無任何 guard
var whitelist = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "ActionName", "Category", "SortOrder",
    "IsEnabled",       // ← 核心動作也能被停用
    "Description",
    "IsBasicAction"    // ← 核心動作的旗標也能被改掉
};
```

### 7.3 無格式驗證 — ActionsAdminService.CreateAsync（G-03）

```csharp
// 只驗 required, 無 regex/大寫/長度
var actionCode = CoalesceString(dict, "ActionCode");
if (string.IsNullOrWhiteSpace(actionCode))
    return (false, "ActionCode required.", null);
// ← 缺少：Regex.IsMatch(actionCode, @"^[A-Z0-9_-]{2,50}$")
```

### 7.4 MVC AppService 丟棄回應（G-07）

```csharp
// ActionsAppService.cs — UpdateAsync
_ = await _api.SendAsync<ApiResponse<object>>(options);
// ↑ 完全丟棄：即使 API 回 409 Conflict 或 404 NotFound，前端也不知道

// 對比 CreateAsync 正確做法：
var response = await _api.SendAsync<ApiResponse<ActionCreatedResultDto>>(options);
if (response.Code != 200)
    throw new Exception(response.Message ?? "建立失敗");
```

### 7.5 Category 不一致（G-05）

```csharp
// ActionsController.AddNew.cs / Edit.cs
var categoryOptions = new List<SelectListItem>
{
    new("APPROVAL", "APPROVAL"),   // ← Spec 無此值
    new("OTHER", "OTHER"),         // ← Spec 無此值
    new("READ", "READ"),
    new("WRITE", "WRITE"),
    // ← 缺 OUTPUT, WORKFLOW
};

// ActionsController.Details.cs（又不同！）
new("READ", "READ"),
new("WRITE", "WRITE"),
new("DELETE", "DELETE"),           // ← Spec 無此值
new("ADMIN", "ADMIN"),            // ← Spec 無此值
```

---

## §8 Repository vs WebAPI Service 比較

| 能力 | Repository (Dapper) | WebAPI Service (EF Core) |
|------|---------------------|--------------------------|
| SetEnabledAsync（軟刪） | ✅ 完整實作 + RowVersion | ❌ 不存在 |
| DeleteAsync + DryRun | ✅ 預覽 + 白名單 Cascade | ❌ 直接 `_db.Remove` |
| 子表相依檢查 | ✅ UserOverride + RelationGrant | ❌ 無檢查 |
| RowVersion（Update） | ✅ WHERE 條件 | ✅ WHERE 條件 |
| RowVersion（Delete） | ✅ WHERE 條件 | ⚠️ 支援但 MVC 端不傳 |
| CreateAsync 日期 | ✅ `DateTime.UtcNow` | ⚠️ Entity 預設 `DateTime.Now` |
| UpsertAsync | ✅ | ❌ |
| EnsureMinimalSetAsync | ✅ | ❌ |
| **是否被 WebAPI 使用** | **❌ 完全未使用** | **✅ 唯一使用路徑** |

> **建議**：Repository 品質明顯更高，建議 WebAPI Service 改為橋接 Repository，或至少將 Repository 中的關鍵邏輯（SetEnabled、Delete DryRun、子表檢查）移植至 Service。

---

## §9 結論

AuthAction 模組的基本 CRUD 框架已建立（搜尋、查看、新增、更新均可運作），但與 Prototype Spec 的**核心差異集中在刪除策略與安全護欄**：

1. **最嚴重**：Delete 為物理刪除而非 IsEnabled 切換 — 這是 Spec 的核心設計理念
2. **第二嚴重**：完全缺少 IsBasicAction=1 的 Core Protection — 核心動作可被任意停用/變更/刪除
3. **第三嚴重**：ActionCode 無格式驗證 — 可輸入小寫、特殊字元、1 字元代碼
4. **結構議題**：Repository 已有更完善的實作（SetEnabled、DryRun Delete），但 WebAPI 完全未使用

建議 **Phase 1（4 項 P0 缺口）於上線前修正完畢**，預估 8.5 小時工作量。

---

*文件結束*
