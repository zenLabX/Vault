# AuthTokens 模組稽核報告 — TokensModuleSpec

> **稽核日期**：2026-02-27  
> **對照來源**：`AuthTokensPrototypeSpec.md`（2026-02-26）+ 技術規格書（權限模組_09_權杖管理表）  
> **稽核範圍**：ERP.DataAdmin (MVC 前端)、ERP.WebAPI.DataAdmin (WebAPI 後端)、ERP.CommonLib (Entity / DTO / Repository)、Database SQL  

---

## §0 涵蓋範圍總覽

| 層級 | 涵蓋 | 說明 |
|---|---|---|
| DB Schema | ✅ | `dbo.AuthTokens` — 15 欄位，PK=TokenId (BIGINT IDENTITY)，FK→AuthPrincipalUser |
| Entity | ✅ | `AuthTokens.cs` — 15 屬性，[Timestamp] on RowVersion |
| DTO | ✅ | TokenDto / TokenEditDto / TokenListItemDto / TokenCreatedResultDto |
| Request Model | ✅ | CreateTokenRequest |
| Repository (Dapper) | ✅ | AuthTokensRepository — 490 行，完整 CRUD + Revoke + Cleanup + Upsert |
| WebAPI Service | ✅ | TokensAdminService (EF Core) — 497 行 |
| WebAPI Controller | ✅ | TokensAdminController (partial × 6 檔：Base/Search/Read/Create/Update/Delete) |
| MVC Controller | ✅ | TokensController (partial × 6 檔：Base/Index/AddNew/Edit/Delete/Details) |
| MVC AppService | ✅ | TokensAppService — 透過 IApiDataServiceV2 呼叫 WebAPI |
| MVC UiMeta | ✅ | TokensUiMetaService — 從 API 取得動態欄位定義 |
| MVC Views | ✅ | Index / AddNew / Edit / Delete / Details (共 5 個 cshtml) |
| AppTokenService | ✅ | CommonLib 中的 JWT 簽發/驗證/撤銷服務（Runtime，非 DataAdmin CRUD） |

---

## §1 資料模型層（DB + Entity）

### 1.1 DB Schema — `dbo.AuthTokens`

| 面向 | Prototype Spec | 實作現況 | 狀態 |
|---|---|---|---|
| PK | TokenId BIGINT IDENTITY | ✅ 一致 | ✅ |
| Token | VARCHAR(MAX) NOT NULL | ✅ 一致 | ✅ |
| Source | VARCHAR(50) NOT NULL | ✅ 一致 | ✅ |
| UserId | NVARCHAR(40) NOT NULL, FK→AuthPrincipalUser | ✅ FK 存在 | ✅ |
| AppCode | NVARCHAR(32) NOT NULL | ✅ 一致 | ✅ |
| TokenHash | VARBINARY(32) NOT NULL | ✅ 一致 | ✅ |
| EffectiveUserId | NVARCHAR(64) NULL | ✅ 一致 | ✅ |
| IssuedAt | DATETIME NOT NULL, DEFAULT GETDATE() | ✅ 一致 | ✅ |
| ExpiresAt | DATETIME NOT NULL | ✅ 一致 | ✅ |
| IsRevoked | BIT NOT NULL, DEFAULT 0 | ✅ 一致 | ✅ |
| RowVersion | TIMESTAMP | ✅ 一致 | ✅ |
| CHECK (ExpiresAt > IssuedAt) | 📋 Spec §3.4 要求 | ❌ **DB 無此 CHECK 約束** | 🔴 |
| INDEX on TokenHash | 📋 Spec §1/§3.2 性能核心 | ❌ **DB 無 TokenHash 索引** | 🔴 |

### 1.2 Entity — `AuthTokens.cs`（210 行）

- 15 個屬性完全對應 DB 欄位 ✅
- `[Key]` on TokenId ✅
- `[Timestamp]` on RowVersion ✅
- `[Required]` 標註在 Token / Source / UserId / AppCode / TokenHash / IssuedAt / ExpiresAt / IsRevoked / CreatedDate / RowVersion ✅

---

## §2 WebAPI 後端（Controller + Service）

### 2.1 TokensAdminController（6 個 partial 檔）

| 端點 | Route | Prototype 對應 | 狀態 |
|---|---|---|---|
| Search | `GET /v1/dataadmin/tokens/search` | §4.1 Search/Index | ✅ 存在 |
| Read | `GET /v1/dataadmin/tokens/{tokenId:long}` | §4.2 Detail | ✅ 存在 |
| Create | `POST /v1/dataadmin/tokens` | §4.3 Add New | ✅ 存在 |
| Update | `PUT /v1/dataadmin/tokens/{tokenId:long}` | §4.4 Edit | ✅ 存在 |
| Delete | `DELETE /v1/dataadmin/tokens/{tokenId:long}` | §4.5 Delete(Revoke) | ⚠️ 語意錯誤（見下） |

### 2.2 TokensAdminService（497 行）— 使用 EF Core 直接操作

#### SearchAsync

| Prototype §4.1 要求 | 實作現況 | 狀態 |
|---|---|---|
| 搜尋條件：UserId | ✅ keyword 搜尋包含 UserId | ✅ |
| 搜尋條件：TokenHash (contains/prefix) | ❌ **未納入搜尋** | 🔴 |
| 搜尋條件：IsRevoked 篩選 | ❌ **無 IsRevoked 篩選參數** | 🟡 |
| 列表欄位：EffectiveUserId | ❌ **TokenListItemDto 未包含** | 🟡 |
| 列表欄位：TokenHash（縮短顯示） | ❌ **TokenListItemDto 未包含** | 🟡 |
| 排序：TokenId DESC | ✅ 正確 | ✅ |
| 分頁：pageSize max 200 | ✅ 正確 | ✅ |
| AppCode 篩選 | ✅ 有 `app` 參數 | ✅ |

#### GetAsync

| Prototype §4.2 要求 | 實作現況 | 狀態 |
|---|---|---|
| 完整欄位唯讀檢視 | ✅ 回傳 TokenEditDto 含所有欄位 | ✅ |
| RowVersionBase64 | ✅ 含 RowVersionBase64 | ✅ |

#### CreateAsync

| Prototype §4.3 要求 | 實作現況 | 狀態 |
|---|---|---|
| 必填：UserId | ✅ 驗證 required | ✅ |
| 必填：Token | ✅ 驗證 required | ✅ |
| 必填：ExpiresAt | ✅ 驗證 required | ✅ |
| 自動：IssuedAt | ✅ `req.IssuedAt ?? now` | ✅ |
| 自動：TokenHash | ⚠️ Service 接收前端已算好的 TokenHashBase64 | ⚠️ |
| TokenHashBase64 格式驗證 | ✅ try/catch Base64 解碼 | ✅ |
| UserId FK 驗證 | ✅ 查 AuthPrincipalUser | ✅ |
| **ExpiresAt > IssuedAt 驗證** | ❌ **Service 未檢查** | 🔴 |

#### UpdateAsync

| Prototype §4.4 要求 | 實作現況 | 狀態 |
|---|---|---|
| **不可改：Token** | ❌ **可修改** (case "token") | 🔴 |
| **不可改：TokenHash** | ❌ **可修改** (case "tokenhashbase64") | 🔴 |
| **不可改：UserId** | ❌ **可修改** (case "userid") | 🔴 |
| **不可改：AppCode** | ❌ **可修改** (case "appcode") | 🔴 |
| **不可改：Source** | ❌ **可修改** (case "source") | 🔴 |
| **不可改：IssuedAt** | ❌ **可修改** (case "issuedat") | 🔴 |
| 可改：ExpiresAt | ✅ 可修改 | ✅ |
| 可改：EffectiveUserId | ✅ 可修改 | ✅ |
| **可改：IsRevoked（僅 0→1）** | ❌ **可雙向切換 0↔1，無 guardrail** | 🔴 |
| RowVersion 樂觀鎖 | ✅ 支援併發衝突 409 | ✅ |
| ExpiresAt > IssuedAt 驗證 | ❌ **未檢查** | 🔴 |

#### DeleteAsync

| Prototype §4.5 要求 | 實作現況 | 狀態 |
|---|---|---|
| 語意：Revoke（設 IsRevoked=1） | ❌ **Hard Delete**（`_db.AuthTokens.Remove(e)`） | 🔴 |
| RowVersion 樂觀鎖 | ✅ 支援 | ✅ |

---

## §3 MVC 前端（Controller + Views）

### 3.1 TokensController（6 個 partial 檔）

| 頁面 | 存在 | Prototype 對應 | 說明 |
|---|---|---|---|
| Index | ✅ | §4.1 | 分頁列表 + keyword 搜尋 + UiTableModel |
| AddNew | ✅ | §4.3 | UI-Meta 驅動表單 |
| Edit | ✅ | §4.4 | UI-Meta 驅動表單 |
| Delete | ✅ | §4.5 | 確認頁面 + POST 刪除 |
| Details | ✅ | §4.2 | 唯讀檢視，全欄位 ReadOnly |

### 3.2 Index（Search）

| 項目 | 實作現況 | 狀態 |
|---|---|---|
| keyword 搜尋 | ✅ 傳至 WebAPI | ✅ |
| 列表 Actions: Detail / Edit / Delete | ✅ 三個按鈕 | ✅ |
| IsRevoked 圖示顯示 | ✅ icon = disable/enable | ✅ |
| 日期格式化 | ✅ `yyyy/MM/dd HH:mm:ss` | ✅ |
| TokenHash 縮短顯示 | ❌ 依賴 DTO，目前 DTO 未帶此欄位 | 🟡 |

### 3.3 AddNew

| Prototype §4.3 要求 | 實作現況 | 狀態 |
|---|---|---|
| 必填：UserId、Token、ExpiresAt | ✅ 必填檢查（UI-Meta Required + Controller 驗證） | ✅ |
| 自動：IssuedAt | ✅ 預設 `DateTime.UtcNow` | ✅ |
| 自動：TokenHash（SHA-256） | ✅ `HashProcessHelper.ComputeSHA256()` 後 Base64 | ✅ |
| Token 自動產生（流水號） | ✅ `GetNextTokenAsync` 生成 `{app}.SEED.{n}` | ✅ |
| AppCode 固定/disabled | ⚠️ 從 `appCode` 參數帶入，但表單未設 disabled | ⚠️ |
| Source 固定/disabled | ❌ **硬編碼三個選項 WEB/WINDOWS/PMS，非固定 disabled** | 🟡 |
| UserId 動態載入 | ❌ **硬編碼 E5000201/E5000202** | 🟡 |
| ExpiresAt > IssuedAt 前端驗證 | ❌ **無前端驗證** | 🟡 |

### 3.4 Edit

| Prototype §4.4 要求 | 實作現況 | 狀態 |
|---|---|---|
| Token 不可改 | ❌ **未設 ReadOnly** | 🔴 |
| TokenHash 不可改 | ❌ **未設 ReadOnly** | 🔴 |
| UserId 不可改 | ❌ **未設 ReadOnly** | 🔴 |
| AppCode 不可改 | ❌ **未設 ReadOnly** | 🔴 |
| Source 不可改 | ❌ **未設 ReadOnly** | 🔴 |
| IssuedAt 不可改 | ❌ **未設 ReadOnly** | 🔴 |
| ExpiresAt 可改 | ✅ | ✅ |
| EffectiveUserId 可改 | ✅ | ✅ |
| IsRevoked 僅 0→1 | ❌ **UI 無 guardrail** | 🔴 |
| RowVersion 隱藏欄位帶回 | ✅ hidden input 含 RowVersion | ✅ |

### 3.5 Delete

| Prototype §4.5 要求 | 實作現況 | 狀態 |
|---|---|---|
| 行為：Revoke（IsRevoked=1） | ❌ **呼叫 `_tokens.DeleteAsync()` → Hard Delete** | 🔴 |
| 確認頁面顯示資料 | ✅ 顯示 TokenId/UserId/Source/AppCode/IssuedAt/ExpiresAt | ✅ |

### 3.6 Details

| Prototype §4.2 要求 | 實作現況 | 狀態 |
|---|---|---|
| 唯讀全欄位檢視 | ✅ 所有 fields → `f.ReadOnly = true` | ✅ |
| form 來源 | ✅ `form: "Tokens.Details"` — 正確 | ✅ |

---

## §4 Repository 層（AuthTokensRepository — Dapper）

| 方法 | 用途 | WebAPI Service 是否使用 | 狀態 |
|---|---|---|---|
| `FindAsync` | 依 TokenId 查詢 | ❌ Service 用 EF Core | ⚪ |
| `FindByTokenAsync` | 依 Token 字串查詢 | ❌ | ⚪ |
| `FindByHashAsync` | 依 TokenHash 查詢 | ❌ | ⚪ |
| `GetByUserAsync` | 依 UserId 查詢（含 active 篩選） | ❌ | ⚪ |
| `InsertAsync` | 新增（OUTPUT TokenId） | ❌ | ⚪ |
| `UpdateAsync` | 併發更新 | ❌ | ⚪ |
| `DeleteAsync` | 併發刪除 | ❌ | ⚪ |
| `DeleteByUserAsync` | 依 UserId 批次刪除 | ❌ | ⚪ |
| `RevokeAsync` | ✨ 撤銷（IsRevoked=0→1，併發安全） | ❌ **未使用但正是 Prototype 需要的** | 🟡 |
| `RevokeByTokenAsync` | 相容撤銷 | ❌ | ⚪ |
| `RevokeByHashAsync` | 依 Hash 撤銷 | ❌ | ⚪ |
| `ExtendAsync` | 延長到期 | ❌ | ⚪ |
| `IsValidAsync` | Token 有效性檢查 | ❌（Runtime 用） | ⚪ |
| `IsValidByHashAsync` | Hash 有效性檢查 | ❌（Runtime 用） | ⚪ |
| `CleanupExpiredAsync` | TTL 清理 | ❌ **無 Background Job 呼叫** | 🟡 |
| `UpsertAsync` | Insert or Update | ❌ | ⚪ |

> **備註**：Repository 已具備 `RevokeAsync` 方法（更新 IsRevoked=0→1 + RowVersion 併發），但 WebAPI Service 完全不使用 Repository，而是直接操作 EF Core。如果 Delete 語意改為 Revoke，可直接在 Service 層加入邏輯，或改用 Repository。

---

## §5 Spec 決策對照表

| 決策 | Prototype Spec 來源 | 目前實作 | 是否一致 |
|---|---|---|---|
| Delete = Revoke（IsRevoked=1） | §2 / §4.5 | Hard Delete（`_db.Remove`） | ❌ |
| Edit 鎖定 Token/TokenHash/UserId/AppCode/Source/IssuedAt | §4.4 | 全部可修改 | ❌ |
| IsRevoked 不可逆（0→1 only） | §3.5 | 雙向切換 | ❌ |
| ExpiresAt > IssuedAt 驗證 | §3.4 | 無驗證 | ❌ |
| AppCode/Source 固定 disabled | §2 | MVC 非固定 disabled | ❌ |
| TokenHash = SHA-256 自動計算 | §2 | AddNew 有自動計算 ✅ | ✅ |
| TokenId = IDENTITY 自動遞增 | §3.1 | ✅ | ✅ |
| RowVersion 樂觀鎖 | §3.6 | ✅ Update/Delete 都有 | ✅ |
| TokenHash 為核心查詢鍵（需索引） | §1 | DB 無索引 | ❌ |
| TTL 清理 Job（7 天緩衝） | §1 / §5 | 無 Background Job | ❌ |

---

## §6 Gap List（缺口清單）

### 🔴 Must Fix（上線必修）

| # | 缺口 | Prototype Spec 來源 | 影響範圍 | 說明 |
|---|---|---|---|---|
| G1 | Delete 為 Hard Delete，應改 Revoke | §2 / §4.5 | WebAPI Service + MVC | `DeleteAsync` 使用 `_db.AuthTokens.Remove(e)`，應改為 `e.IsRevoked = true` + `SaveChanges` |
| G2 | Edit 允許修改 Token/TokenHash/UserId/AppCode/Source/IssuedAt — 全應鎖定 | §4.4 | WebAPI Service + MVC | `UpdateAsync` 白名單包含所有 6 欄位，應移除；MVC Edit 未設 ReadOnly |
| G3 | IsRevoked 可雙向切換，應為單向 0→1 | §3.5 | WebAPI Service | `UpdateAsync` 的 `case "isrevoked"` 無方向檢查，需加入 guardrail：`if (e.IsRevoked) return error` |
| G4 | ExpiresAt > IssuedAt 驗證缺失 | §3.4 | WebAPI Service (Create + Update) + DB | Service 未驗證，DB 無 CHECK 約束 |
| G5 | DB 缺少 TokenHash 索引 | §1 / §3.2 | DB | TokenHash 為核心查詢鍵，缺索引將嚴重影響 Runtime 性能 |
| G6 | Search 不支援 TokenHash 搜尋條件 | §4.1 | WebAPI Service | `SearchAsync` 僅搜 UserId/AppCode/Source/EffectiveUserId/TokenId，未含 TokenHash |

### 🟡 Should Improve（建議改善）

| # | 缺口 | Prototype Spec 來源 | 影響範圍 | 說明 |
|---|---|---|---|---|
| G7 | Search 缺少 IsRevoked 篩選參數 | §4.1 | WebAPI Service + Controller | 目前只有 keyword + app，無獨立 IsRevoked 參數 |
| G8 | TokenListItemDto 缺少 EffectiveUserId 和 TokenHash | §4.1 | DTO | 列表應顯示 EffectiveUserId 及 TokenHash（縮短） |
| G9 | DB 缺少 CHECK 約束 `ExpiresAt > IssuedAt` | §3.4 | DB | 作為 DB 層防線，應加上 CHECK constraint |
| G10 | MVC AddNew Source 非固定 disabled（硬編碼三選項） | §2 / §3.3 | MVC AddNew | Prototype 要求 Source 固定 disabled，目前含 WEB/WINDOWS/PMS 下拉選單 |
| G11 | MVC AddNew UserId 硬編碼 E5000201/E5000202 | §3.3 | MVC AddNew | 應從 DB 動態載入 AuthPrincipalUser |
| G12 | Repository `RevokeAsync` 已可用但未被 Service 採用 | §4.5 | Architecture | Service 用 EF Core，Repository 有現成 Revoke 邏輯（含併發安全）未串接 |
| G13 | MVC Edit 所有欄位未依 Prototype 設定 ReadOnly | §4.4 | MVC Edit Controller | Edit GET 未對 Token/TokenHash/UserId/AppCode/Source/IssuedAt 設 `f.ReadOnly = true` |

### ⚪ Nice to Have（未來優化）

| # | 缺口 | Prototype Spec 來源 | 影響範圍 | 說明 |
|---|---|---|---|---|
| G14 | 無 TTL Background Job 自動清理過期 Token | §1 / §5 | 系統架構 | Spec 要求定期刪 `ExpiresAt < NOW - 7 Days`；Repository 有 `CleanupExpiredAsync` 但無 Job 呼叫 |
| G15 | AppCode 在 AddNew 雖帶入 appCode 但表單未 disabled | §2 | MVC AddNew | 使用者仍可在表單上修改 AppCode |
| G16 | Service 不使用 Repository，架構不一致 | 技術規格 | Architecture | WebAPI Service 直接 EF Core，Repository（Dapper）完整但閒置 |

---

## §7 功能實現總覽

| Prototype 功能 | 節次 | WebAPI 後端 | MVC 前端 | 整體狀態 |
|---|---|---|---|---|
| Search（分頁、keyword） | §4.1 | ✅ 實作 | ✅ 實作 | ⚠️ 缺 TokenHash/IsRevoked 篩選 |
| Detail（唯讀檢視） | §4.2 | ✅ 實作 | ✅ 實作 | ✅ 完整 |
| Add New（UserId/Token/ExpiresAt） | §4.3 | ✅ 實作 | ✅ 實作 | ⚠️ 缺 ExpiresAt>IssuedAt 驗證 |
| Edit（鎖定不可改欄位） | §4.4 | ❌ 全可改 | ❌ 無 ReadOnly | 🔴 重大缺口 |
| Delete = Revoke（IsRevoked=1） | §4.5 | ❌ Hard Delete | ❌ Hard Delete | 🔴 重大缺口 |
| IsRevoked 不可逆 guardrail | §3.5 | ❌ 無限制 | ❌ 無限制 | 🔴 重大缺口 |
| ExpiresAt > IssuedAt 驗證 | §3.4 | ❌ 未實作 | ❌ 未實作 | 🔴 缺失 |
| TokenHash 索引（性能核心） | §1 | — | — | 🔴 DB 缺失 |
| AppCode/Source 固定 disabled | §2 | — | ⚠️ 非固定 | 🟡 偏差 |
| RowVersion 樂觀鎖 | §3.6 | ✅ 實作 | ✅ 實作 | ✅ 完整 |
| TTL 清理 Job | §1/§5 | ❌ 未實作 | — | ⚪ 未實作 |

---

## §8 涉及檔案列表

### WebAPI 後端（ERP.WebAPI.DataAdmin）

| 檔案 | 行數 | 角色 |
|---|---|---|
| `Controllers/Admin/TokensAdminController.cs` | 83 | Base partial — 路由 + DI |
| `Controllers/Admin/TokensAdminController.Search.cs` | 95 | GET search |
| `Controllers/Admin/TokensAdminController.Read.cs` | 95 | GET {tokenId} |
| `Controllers/Admin/TokensAdminController.Create.cs` | 133 | POST |
| `Controllers/Admin/TokensAdminController.Update.cs` | 92 | PUT {tokenId} |
| `Controllers/Admin/TokensAdminController.Delete.cs` | 82 | DELETE {tokenId} |
| `Services/Authorization/Tokens/TokensAdminService.cs` | 497 | Service 層（EF Core） |

### MVC 前端（ERP.DataAdmin）

| 檔案 | 行數 | 角色 |
|---|---|---|
| `Controllers/Authorization/TokensController.cs` | 152 | Base partial — DI + ViewRoot |
| `Controllers/Authorization/TokensController.Index.cs` | 318 | Search 列表頁 |
| `Controllers/Authorization/TokensController.AddNew.cs` | 300 | 新增 GET/POST |
| `Controllers/Authorization/TokensController.Edit.cs` | 271 | 編輯 GET/POST |
| `Controllers/Authorization/TokensController.Delete.cs` | 208 | 刪除 GET/POST |
| `Controllers/Authorization/TokensController.Details.cs` | 130 | 唯讀詳情 |
| `Services/Authorization/Tokens/TokensAppService.cs` | 219 | MVC→WebAPI 薄包裝 |
| `Services/Authorization/Tokens/TokensUiMetaService.cs` | 174 | UI-Meta 服務 |
| `Views/Authorization/Tokens/Index.cshtml` | 148 | 列表頁 |
| `Views/Authorization/Tokens/AddNew.cshtml` | 121 | 新增表單 |
| `Views/Authorization/Tokens/Edit.cshtml` | 105 | 編輯表單 |
| `Views/Authorization/Tokens/Delete.cshtml` | 120 | 刪除確認 |
| `Views/Authorization/Tokens/Details.cshtml` | 76 | 唯讀詳情 |

### CommonLib 共用層

| 檔案 | 行數 | 角色 |
|---|---|---|
| `Models/Entities/Auth/AuthTokens.cs` | 209 | Entity |
| `Models/Dto/Auth/Tokens/TokenDto.cs` | 183 | 完整 DTO |
| `Models/Dto/Auth/Tokens/TokenEditDto.cs` | 142 | 編輯/詳情 DTO |
| `Models/Dto/Auth/Tokens/TokenListItemDto.cs` | 100 | 列表 DTO |
| `Models/Dto/Auth/Tokens/TokenCreatedResultDto.cs` | 112 | 建立結果 DTO |
| `Models/Requests/Auth/Tokens/CreateTokenRequest.cs` | 120 | 建立請求 Model |
| `Repositories/Auth/AuthTokensRepository.cs` | 489 | Dapper Repository |
| `Services/Auth/Tokens/AppTokenService.cs` | 848 | JWT 簽發/驗證/撤銷（Runtime） |
| `Services/Auth/Tokens/IAppTokenService.cs` | 467 | 介面 |

### DB

| 檔案 | 角色 |
|---|---|
| `Database/ERP.DataAdmin/dbo/Table/AuthTokens.sql` | CREATE TABLE + FK + Defaults |

---

## §9 結論

### 完成率估計：**~55%**

CRUD 骨架（Controller / Service / Entity / DTO）已完整建置，Search/Detail/AddNew 基本可用。但 **Prototype Spec 的核心安全語意有嚴重缺口**：

1. **Delete = Revoke 語意完全錯誤**（Hard Delete 而非 IsRevoked=1）
2. **Edit 無任何欄位鎖定**（6 個不可改欄位全可改）
3. **IsRevoked 不可逆 guardrail 不存在**（可 1→0 回復）
4. **ExpiresAt > IssuedAt 驗證全無**（Service + DB 都缺）
5. **TokenHash 索引缺失**（影響 Runtime 性能）

### 建議修復優先順序

| 優先順序 | Gap | 說明 |
|---|---|---|
| P0 | G1 | Delete → Revoke（事關資料不可回復和稽核留存） |
| P0 | G2 + G13 | Edit 欄位鎖定（Service 白名單 + MVC ReadOnly） |
| P0 | G3 | IsRevoked 單向 guardrail |
| P1 | G4 + G9 | ExpiresAt > IssuedAt（Service 驗證 + DB CHECK） |
| P1 | G5 | TokenHash 索引 |
| P2 | G6 + G7 + G8 | Search 條件擴充（TokenHash / IsRevoked / DTO 補欄位） |
| P2 | G10 + G11 + G15 | AddNew 欄位固定/動態載入 |
| P3 | G14 | TTL Background Job |
| P3 | G12 + G16 | Repository 串接 / 架構統一 |
