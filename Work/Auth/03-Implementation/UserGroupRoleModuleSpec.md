# AuthUserGroup 模組稽核報告 — UserGroupRoleModuleSpec

> **稽核日期**：2026-01-28  
> **稽核範圍**：ERP.WebAPI.DataAdmin + ERP.DataAdmin（MVC）+ ERP.CommonLib  
> **對照文件**：AuthUserGroupPrototypeSpec.md（Prototype Spec）  
> **稽核者**：AI Auditor  

---

## §0 文件總覽與嚴重度定義

| 符號 | 等級 | 說明 |
|:---:|------|------|
| 🔴 | Critical | 功能缺失或行為與 Spec 直接矛盾，可能導致資料損失或安全風險 |
| 🟡 | Medium | 功能部分實現或有瑕疵，不影響核心流程但需改善 |
| ⚪ | Low | 建議性改善、程式碼品質或一致性問題 |

---

## §1 模組角色與架構概述

**AuthUserGroup**（使用者—群組對應）維護使用者與群組之間的多對多關聯。

| 層級 | 檔案 | 行數 | 說明 |
|------|------|-----:|------|
| DB | `Database/ERP.DataAdmin/AuthUserGroup.sql` | 67 | 資料表定義，含 CHECK 約束 |
| Entity | `ERP.CommonLib/Models/Entities/Auth/AuthUserGroup.cs` | 170 | EF Core 實體 |
| Repository | `ERP.CommonLib/Repositories/Auth/AuthUserGroupRepository.cs` | 509 | Dapper CRUD（未被 WebAPI Service 使用） |
| DTO | `ERP.CommonLib/Models/Dto/Auth/AuthUserGroups/*.cs` | 521 | 4 個 DTO |
| WebAPI Service | `ERP.WebAPI.DataAdmin/Services/.../AuthUserGroupsAdminService.cs` | 371 | 核心業務邏輯（EF Core） |
| WebAPI Controller | `ERP.WebAPI.DataAdmin/Controllers/Admin/AuthUserGroupsAdminController.*.cs` | 407 | 6 個 partial 檔 |
| MVC Service | `ERP.DataAdmin/Services/.../UserGroupsAppService.cs` | 246 | 薄封裝 → WebAPI |
| MVC UiMeta | `ERP.DataAdmin/Services/.../UserGroupsUiMetaService.cs` | 180 | UI-Meta API 轉接 |
| MVC Controller | `ERP.DataAdmin/Controllers/.../UserGroupsController.*.cs` | 1,157 | 6 個 partial 檔 |
| MVC Views | `ERP.DataAdmin/Views/Authorization/UserGroups/*.cshtml` | ~519 | 5 個 Razor Views |
| **合計** | | **~4,147** | |

**PK 結構**：複合鍵 (UserId NVARCHAR(40), GroupCode NVARCHAR(50))  
**路由**：`v1/dataadmin/user-groups`

---

## §2 Prototype Spec 需求 vs 實作對照矩陣

| # | Spec 需求 | 實作狀態 | 嚴重度 | Gap# |
|---|----------|---------|:------:|------|
| S1 | 複合 PK (UserId, GroupCode) 不可在 Edit 中修改 | ✅ Update whitelist 不含 UserId/GroupCode | — | — |
| S2 | Delete = Soft Delete（IsActive=0） | ❌ 硬刪除 `_db.Remove(e)` | 🔴 | G01 |
| S3 | AppCode 固定為 PMS，UI disabled | ❌ AppCode 在 Update whitelist 中可修改 | 🔴 | G02 |
| S4 | ValidFrom ≤ ValidTo 驗證 | ⚠️ DB CHECK 存在，Service 層無驗證 | 🟡 | G03 |
| S5 | Remark 欄位（選填） | ✅ 存在於 Entity/DTO/Update whitelist | — | — |
| S6 | Search 支援 UserId, GroupCode, IsActive, Remark | ✅ keyword 涵蓋上述欄位 + AppCode | — | — |
| S7 | RowVersion 樂觀鎖定 | ⚠️ Update 有、MVC Delete 未傳 RowVersion | 🟡 | G04 |
| S8 | Cache invalidation on CUD | ❌ 無任何快取邏輯 | 🟡 | G09 |
| S9 | 分頁查詢 | ✅ 完整實作（page/pageSize/totalCount） | — | — |
| S10 | 複合鍵路由 (userId/groupCode) | ✅ `[HttpPut("{userId}/{groupCode}")]` 等 | — | — |

---

## §3 Gap 清單

### 🔴 G01 — Delete 實作為硬刪除（Spec 要求 Soft Delete）

| 項目 | 說明 |
|------|------|
| **Spec 要求** | 刪除 = 將 `IsActive` 設為 0（Soft Delete），保留資料供稽核 |
| **實際行為** | `_db.AuthUserGroup.Remove(e)` → EF Core 發出 `DELETE FROM` |
| **位置** | `AuthUserGroupsAdminService.DeleteAsync()` — L300-320 |
| **影響** | 資料永久刪除、無法復原、無稽核軌跡；若該記錄被 FK 參照將直接 DB 例外 |
| **Repository 參考** | `AuthUserGroupRepository.SetActiveAsync()` 已實作 Soft Delete 邏輯但未被使用 |
| **建議修復** | 將 `Remove(e)` 替換為 `e.IsActive = false; e.ModifiedBy = ...; e.ModifiedDate = DateTime.UtcNow;` + `SaveChangesAsync` |

---

### 🔴 G02 — AppCode 可在 Update 中修改（Spec 要求固定 PMS）

| 項目 | 說明 |
|------|------|
| **Spec 要求** | AppCode 固定為 "PMS"，Edit 頁面 UI disabled，不可變更 |
| **實際行為** | Update whitelist 含 `"AppCode"`，前端傳入即覆寫 |
| **位置** | `AuthUserGroupsAdminService.UpdateAsync()` — whitelist `HashSet` |
| **影響** | 使用者或惡意呼叫可將 AppCode 改為任意值，破壞系統隔離 |
| **建議修復** | 從 Update whitelist 移除 `"AppCode"`；若需修改應另設管理員 API |

---

### 🟡 G03 — ValidFrom ≤ ValidTo 僅靠 DB CHECK，Service 層無驗證

| 項目 | 說明 |
|------|------|
| **Spec 要求** | 若 ValidFrom 與 ValidTo 皆有值，必須 ValidFrom ≤ ValidTo |
| **DB 現況** | `CHK_AuthUserGroup_ValidRange` CHECK 約束存在 ✅ |
| **Service 現況** | `CreateAsync` 與 `UpdateAsync` 皆無此驗證 |
| **影響** | 違規資料依賴 DB 攔截，錯誤訊息為 SQL Constraint 格式（非使用者友善）；且增加 DB 壓力 |
| **建議修復** | 在 `CreateAsync` 與 `UpdateAsync` 中加入 `if (ValidFrom > ValidTo) return error` 前置驗證 |

---

### 🟡 G04 — MVC Delete 未傳遞 RowVersion（無並發保護）

| 項目 | 說明 |
|------|------|
| **Spec 要求** | 所有 CUD 操作應使用 RowVersion 進行樂觀鎖定 |
| **Update** | ✅ MVC Edit 透過 `model.Data["RowVersion"]` → WebAPI → EF OriginalValue |
| **Delete** | ❌ `_userGroups.DeleteAsync(appCode, userId, groupCode)` 未傳 rowVersionBase64 |
| **位置** | `UserGroupsController.Delete.cs` POST action — L147 |
| **影響** | 多使用者同時操作時可能刪除已被修改的記錄（TOCTOU） |
| **建議修復** | Delete GET 取得 RowVersionBase64 → hidden field → POST 傳入 `DeleteAsync(app, userId, groupCode, rowVersionBase64)` |

---

### 🟡 G05 — MVC Edit 使用 DateTime.Now（應為 UtcNow）

| 項目 | 說明 |
|------|------|
| **不一致處** | MVC Edit POST: `DateTime.Now`；WebAPI Service: `DateTime.UtcNow`；Entity 預設: `DateTime.UtcNow` |
| **位置** | `UserGroupsController.Edit.cs` POST — L172 |
| **影響** | ModifiedDate 在 MVC→WebAPI 傳遞鏈中有時區混亂風險（但 WebAPI 會覆寫為 UtcNow，所以 MVC 端設定實際會被忽略） |
| **建議修復** | MVC 端停止自行設定 ModifiedDate/ModifiedBy（由 WebAPI Service 統一處理），或改為 `DateTime.UtcNow` |

---

### 🟡 G06 — GroupCode 下拉選單硬編碼

| 項目 | 說明 |
|------|------|
| **位置** | `UserGroupsController.AddNew.cs` GET — L79-83 |
| **現況** | 硬編碼 3 個選項：`G_HR`, `G_CUTTING`, `G_EXECUTIVE` |
| **影響** | 新增群組時需手動改 code，不符合動態資料驅動原則 |
| **建議修復** | 查詢 `AuthPrincipalGroup` 表取得可用群組清單，或透過 UI-Meta API 提供 |

---

### 🟡 G07 — Dapper Repository (509 行) 完全未被 WebAPI Service 使用

| 項目 | 說明 |
|------|------|
| **現況** | `AuthUserGroupRepository.cs` 提供完整 CRUD + `SetActiveAsync` + `SetValidityAsync` + `UpsertAsync` + `GetEffectiveByUser/GroupAsync` 等 15+ 方法 |
| **問題** | WebAPI Service 使用 EF Core `AuthDbContext` 直接操作，Repository 處於 Dead Code 狀態 |
| **影響** | 維護成本增加；Repository 中的 Soft Delete (`SetActiveAsync`) 邏輯恰好是 Spec 要求但未被使用 |
| **建議** | 統一選擇 EF Core 或 Dapper 路線；若保留 EF Core，可將 Repository 的商業邏輯（如 SetActiveAsync 的 Soft Delete 概念）遷移到 Service |

---

### 🟡 G08 — Helper 方法重複定義（未共用）

| 項目 | 說明 |
|------|------|
| **位置** | `AuthUserGroupsAdminService.cs` — L330-371 |
| **方法** | `NullIfEmpty`, `ParseBool`, `ParseDate`, `TryBase64`, `TryGetBase64Bytes` |
| **問題** | 與其他模組（AuthRelationPrincipalRole、AuthTokens 等）的 Service 中完全相同的 private 方法 |
| **建議** | 抽為 `CommonLib` 的 `ServiceParseHelper` 靜態工具類，所有 Service 共用 |

---

### 🟡 G09 — 無任何 Cache Invalidation 機制

| 項目 | 說明 |
|------|------|
| **Spec 要求** | Create/Update/Delete 後應觸發快取失效 |
| **現況** | WebAPI Service、MVC Service 皆無 cache 相關程式碼 |
| **影響** | 若未來引入快取（如 Redis），需回頭在所有 CUD 路徑補上 invalidation |
| **建議** | 預留 `ICacheInvalidator` 介面或 Domain Event 機制 |

---

### ⚪ G10 — Create 未回傳 RowVersion（新增後立即編輯需再查一次）

| 項目 | 說明 |
|------|------|
| **位置** | `AuthUserGroupsAdminService.CreateAsync()` 回傳 `UserGroupCreatedResultDto` |
| **現況** | `UserGroupCreatedResultDto` 不含 RowVersion/RowVersionBase64 |
| **影響** | 前端新增成功後若要立即導向 Edit，需額外 GET 一次才能取得 RowVersion |
| **建議** | 在 `UserGroupCreatedResultDto` 加入 `RowVersionBase64` 欄位 |

---

### ⚪ G11 — CreateAsync 錯誤處理回傳原始 SQL 訊息

| 項目 | 說明 |
|------|------|
| **位置** | `AuthUserGroupsAdminService.CreateAsync()` — DbUpdateException catch |
| **現況** | `var errMsg = $"DB Update Error: {ex.Message} | Inner: {inner}";` 直接回傳 |
| **影響** | 可能洩漏 DB 結構資訊（表名、欄位名、約束名）給前端 |
| **建議** | 分類常見 Constraint 錯誤（如 CHK_AuthUserGroup_ValidRange → "有效起始日期不可晚於結束日期"）；其他統一回傳 "系統錯誤，請聯絡管理員" |

---

### ⚪ G12 — MVC AppService.UpdateAsync 未檢查回應狀態

| 項目 | 說明 |
|------|------|
| **位置** | `UserGroupsAppService.UpdateAsync()` — L217 |
| **現況** | `_ = await _api.SendAsync<ApiResponse<object>>(options);` 捨棄回傳值 |
| **對比** | `CreateAsync` 會 `if (response.Code != 200) throw …` |
| **影響** | WebAPI 回傳的 400/404/409 錯誤碼被吞掉，MVC 端永遠以為成功 |
| **建議** | 比照 `CreateAsync` 加入 `if (response.Code != 200) throw …` |

---

### ⚪ G13 — MVC AppService.DeleteAsync 未檢查回應狀態

| 項目 | 說明 |
|------|------|
| **位置** | `UserGroupsAppService.DeleteAsync()` — L243 |
| **現況** | 與 G12 相同問題，`_ = await _api.SendAsync(…)` 未檢查回應碼 |
| **建議** | 加入回應碼檢查 |

---

### ⚪ G14 — Search API 與 MVC Index 的 DTO 型態不一致

| 項目 | 說明 |
|------|------|
| **WebAPI Search** | 回傳 `PagedResults<UserGroupListItemDto>` |
| **MVC GetPagedAsync** | 接收 `PagedResults<UserGroupDto>`（完整 DTO） |
| **影響** | MVC 實際上收到 `UserGroupDto` 結構但 Search API 投射為 `UserGroupListItemDto`（較精簡）；型態不匹配可能導致反序列化失敗或欄位遺失 |
| **建議** | 統一為同一 DTO，或 MVC AppService 接收端也改為 `UserGroupListItemDto` |

---

## §4 已正確實現的功能

| # | 功能 | 驗證結果 |
|---|------|---------|
| ✅ 1 | 複合 PK (UserId + GroupCode) 結構正確 | DB CLUSTERED PK + Entity [Key][Column(Order=1/2)] |
| ✅ 2 | PK 欄位在 Edit 中不可修改 | Update whitelist 不含 UserId/GroupCode |
| ✅ 3 | FK 約束 (UserId → AuthPrincipalUser, GroupCode → AuthPrincipalGroup) | DB WITH CHECK + Repository InsertAsync 有 FK 檢查 |
| ✅ 4 | RowVersion 樂觀鎖定（Update） | WebAPI Service 正確取 Base64 → EF OriginalValue |
| ✅ 5 | 分頁查詢完整 | page/pageSize/totalCount/totalPages 全數實作 |
| ✅ 6 | Keyword 搜尋涵蓋 UserId/GroupCode/AppCode/Remark | SearchAsync LINQ Contains |
| ✅ 7 | IsActive 篩選 | SearchAsync 支援 `isActive` 參數 |
| ✅ 8 | DB CHECK 約束 ValidFrom ≤ ValidTo | CHK_AuthUserGroup_ValidRange ✅ |
| ✅ 9 | Remark 欄位支援 | Entity/DTO/Update whitelist/Search 全涵蓋 |
| ✅ 10 | 重複 PK 檢查（Create） | `_db.AuthUserGroup.AnyAsync(x => x.UserId == uid && x.GroupCode == gcode)` |
| ✅ 11 | Entity CreatedDate 預設 `DateTime.UtcNow` | 正確（其他模組部分使用 DateTime.Now） |
| ✅ 12 | 統一回應格式 `ApiResponse<T>` | 全部 WebAPI Controller 使用 ResponseHelper |
| ✅ 13 | UI-Meta 驅動動態欄位 | MVC 透過 `IUserGroupsUiMetaService` → WebAPI API |
| ✅ 14 | Details 頁面全欄位唯讀 | `foreach (var f in fields) f.ReadOnly = true;` |
| ✅ 15 | ValidateAntiForgeryToken | MVC AddNew/Edit/Delete POST 全有 |
| ✅ 16 | 類別密封 (`sealed`) | WebAPI Service + Controller + MVC Service |

---

## §5 檔案清單與讀取紀錄

| 層級 | 檔案路徑 | 行數 | 已讀 |
|------|----------|-----:|:----:|
| DB | `Database/ERP.DataAdmin/AuthUserGroup.sql` | 67 | ✅ |
| Entity | `ERP.CommonLib/Models/Entities/Auth/AuthUserGroup.cs` | 170 | ✅ |
| Repo | `ERP.CommonLib/Repositories/Auth/AuthUserGroupRepository.cs` | 509 | ✅ |
| DTO | `ERP.CommonLib/Models/Dto/Auth/AuthUserGroups/UserGroupDto.cs` | 156 | ✅ |
| DTO | `ERP.CommonLib/Models/Dto/Auth/AuthUserGroups/UserGroupEditDto.cs` | 148 | ✅ |
| DTO | `ERP.CommonLib/Models/Dto/Auth/AuthUserGroups/UserGroupListItemDto.cs` | 127 | ✅ |
| DTO | `ERP.CommonLib/Models/Dto/Auth/AuthUserGroups/UserGroupCreatedResultDto.cs` | 94 | ✅ |
| WebAPI Svc | `ERP.WebAPI.DataAdmin/Services/.../AuthUserGroupsAdminService.cs` | 371 | ✅ |
| WebAPI Ctrl | `AuthUserGroupsAdminController.cs` (Base) | 73 | ✅ |
| WebAPI Ctrl | `AuthUserGroupsAdminController.Create.cs` | 97 | ✅ |
| WebAPI Ctrl | `AuthUserGroupsAdminController.Update.cs` | 81 | ✅ |
| WebAPI Ctrl | `AuthUserGroupsAdminController.Delete.cs` | 74 | ✅ |
| WebAPI Ctrl | `AuthUserGroupsAdminController.Search.cs` | 92 | ✅ |
| WebAPI Ctrl | `AuthUserGroupsAdminController.Read.cs` | 83 | ✅ |
| MVC Svc | `UserGroupsAppService.cs` | 246 | ✅ |
| MVC Svc | `IUserGroupsAppService.cs` | 160 | ✅ |
| MVC Svc | `UserGroupsUiMetaService.cs` | 180 | ✅ |
| MVC Ctrl | `UserGroupsController.cs` (Base) | 159 | ✅ |
| MVC Ctrl | `UserGroupsController.Index.cs` | 283 | ✅ |
| MVC Ctrl | `UserGroupsController.AddNew.cs` | 214 | ✅ |
| MVC Ctrl | `UserGroupsController.Edit.cs` | 194 | ✅ |
| MVC Ctrl | `UserGroupsController.Delete.cs` | 192 | ✅ |
| MVC Ctrl | `UserGroupsController.Details.cs` | 115 | ✅ |

---

## §6 嚴重度統計

| 嚴重度 | 數量 | Gap 編號 |
|:------:|:----:|----------|
| 🔴 | 2 | G01, G02 |
| 🟡 | 7 | G03, G04, G05, G06, G07, G08, G09 |
| ⚪ | 5 | G10, G11, G12, G13, G14 |
| **合計** | **14** | |

---

## §7 優先修復建議（按風險排序）

### P0 — 立即修復

1. **G01** — 將 `DeleteAsync` 從 `_db.Remove(e)` 改為 Soft Delete（`e.IsActive = false`）
2. **G02** — 從 Update whitelist 移除 `"AppCode"`

### P1 — 短期修復

3. **G03** — 在 `CreateAsync` / `UpdateAsync` 前置加入 ValidFrom ≤ ValidTo 驗證
4. **G04** — MVC Delete 傳遞 RowVersionBase64 以啟用並發保護
5. **G12/G13** — MVC AppService 的 `UpdateAsync` / `DeleteAsync` 加入回應碼檢查
6. **G06** — GroupCode 下拉改為動態查詢

### P2 — 中期改善

7. **G05** — 統一使用 `DateTime.UtcNow`
8. **G07** — 決定 EF Core vs Dapper 策略，清除 Dead Code
9. **G08** — 抽出共用 Helper
10. **G09** — 預留 Cache Invalidation 機制
11. **G14** — 統一 Search/MVC 的 DTO 型態

### P3 — 長期優化

12. **G10** — CreateResult 加入 RowVersionBase64
13. **G11** — 分類 DB 錯誤，避免洩漏結構資訊

---

## §8 與其他模組共通問題比對

| 共通問題 | AuthUserGroup | AuthRelationPrincipalRole | AuthTokens | AuthRelationGrant |
|---------|:---:|:---:|:---:|:---:|
| Hard Delete（應為 Soft Delete） | ✅ G01 | ✅ | — | — |
| Helper 方法重複 | ✅ G08 | ✅ | ✅ | ✅ |
| Repository Dead Code | ✅ G07 | ✅ | ✅ | ✅ |
| Service 無 ValidRange 驗證 | ✅ G03 | ✅ | — | — |
| MVC Delete 未傳 RowVersion | ✅ G04 | ✅ | — | — |

---

## §9 結論

AuthUserGroup 模組的 **CRUD 基礎架構完整**，複合鍵處理、分頁查詢、RowVersion 樂觀鎖定（Update）、重複 PK 檢查、UI-Meta 驅動等核心功能皆已到位。

**最關鍵的兩個問題**：

1. 🔴 **Delete = 硬刪除**（Spec 要求 Soft Delete）— 這是最高風險問題，一旦誤刪將無法復原。
2. 🔴 **AppCode 可被修改**（Spec 要求固定 PMS）— 破壞系統隔離機制。

建議 **優先處理 G01 + G02**（預估 30 分鐘），再處理 G03/G04/G12/G13 等中等風險問題。
