# RoleModuleSpec（對照 AuthRole Prototype Spec）

日期：2026-02-27

依據文件：AuthRolePrototypeSpec.md（2026-02-25）

本文件目的：對照 prototype spec，盤點目前專案「Roles（AuthRole / 角色主檔）」在前端 MVC（ERP.DataAdmin）與後端 WebAPI（ERP.WebAPI.DataAdmin）已實作/未實作項目，並標註主要實作位置與落差。

---

## 0. 範圍與名詞

- 本次盤點範圍
  - MVC 前端：
    - ERP.DataAdmin/Controllers/Authorization/RolesController*.cs
    - ERP.DataAdmin/Views/Authorization/Roles/*.cshtml
    - ERP.DataAdmin/Services/Authorization/Roles/*
  - WebAPI 後端：
    - ERP.WebAPI.DataAdmin/Controllers/Admin/RolesAdminController*.cs
    - ERP.WebAPI.DataAdmin/Services/Authorization/Roles/RolesAdminService.cs
  - 參照/關聯（prototype spec 的 guardrail 會用到）：
    - ERP.WebAPI.DataAdmin/Services/Authorization/PrincipalRoles/PrincipalRolesAdminService.cs
    - ERP.WebAPI.DataAdmin/Services/Authorization/Grants/GrantsAdminService.cs
    - 實體：ERP.CommonLib/Models/Entities/Auth/AuthRole.cs、AuthRelationPrincipalRole.cs、AuthRelationGrant.cs

- prototype spec 關鍵要求（摘要）
  - Search：RoleCode、RoleName、IsAdmin、IsActive、Tags contains、Priority min/max
  - Detail：右側 drawer（唯讀）
  - Add：drawer 新增；RoleId 自動生成；RoleCode/RoleName/Priority 必填
  - Edit：RoleCode 鎖定；可編輯欄位；儲存檢查 RowVersion
  - Delete：列表 Delete = soft delete（IsActive=0）；Edit drawer 才允許 hard delete（需 guardrail）
  - Hard delete guardrail：若仍有 active PrincipalRole 指派或 active Grant 參照，禁止

---

## 1. 資料模型對照（spec vs 實作）

### 1.1 AuthRole 欄位

- 實體定義：
  - AuthRole：ERP.CommonLib/Models/Entities/Auth/AuthRole.cs
  - 角色 DTO：
    - 查詢/列表：ERP.CommonLib/Models/Dto/Auth/Roles/RoleDto.cs、RoleListItemDto.cs
    - 單筆編輯：ERP.CommonLib/Models/Dto/Auth/Roles/RoleEditDto.cs
    - 建立請求：ERP.CommonLib/Models/Requests/Auth/Roles/CreateRoleRequest.cs

對照結果：

- RoleId
  - spec：prototype PK（唯讀顯示，自動生成）
  - 實作：
    - DTO/Request 皆存在 RoleId；MVC AddNew 以 Guid.NewGuid() 產生
    - WebAPI Update/Delete 以 RoleId 作為查找依據（RolesAdminService.UpdateAsync/DeleteAsync）
  - 重要差異：AuthRole 實體層（與文件註解）宣告「PK = RoleCode」，RoleId 為唯一欄位；但服務層實際使用 RoleId 當更新/刪除主鍵。
  - DB 規格書補充（_extracted）：同一份規格書同時寫了「主鍵 PK = RoleCode」以及在欄位描述中把 RoleId 寫成「實體 PK」，文字上存在矛盾；但所有關聯（PrincipalRole / Grant）都以 RoleCode 作 FK 參照，表示 RoleCode 才是關聯世界的核心 key。

- RoleCode（UNIQUE / 參照核心）
  - spec：邏輯唯一碼，關聯表以 RoleCode 參照；Edit 必須鎖定不可改
  - 實作：
    - 關聯表（PrincipalRoles、Grants）皆以 RoleCode 儲存
    - WebAPI 更新白名單不包含 RoleCode（即使傳入也不會更新）→ 等同後端鎖定
    - MVC Edit 的路由仍以 roleCode 進入畫面（/Roles/Edit/{roleCode}），但提交更新時會先用 roleCode 查 RoleId，再以 RoleId 呼叫 PUT
  - 未確認點：RoleCode 的「case-insensitive UNIQUE」是否成立，取決於 DB collation/constraint；WebAPI 的重複檢查是字串相等（x.RoleCode == req.RoleCode）。

- RowVersion（Optimistic Lock）
  - spec：更新需檢查 RowVersion
  - 實作：
    - WebAPI Update 支援 RowVersion：body 字典若包含 RowVersion（Base64），會設定 OriginalValue，SaveChanges 時發生衝突回 409
    - MVC Edit.cshtml 會送出 hidden Data[RowVersion]
  - 差異：
    - WebAPI Delete 也支援 rowVersionBase64 query，但 MVC Delete 流程未傳入 rowVersionBase64 → 目前刪除不具備併發保護

- Tags（JSON 字串）
  - spec：若填寫必須為合法 JSON
  - 實作：
    - MVC 端有 JsonFormEditor（common.json-form-editor.js）協助編輯/解析
    - WebAPI 端把 Tags 當作字串保存，未看到強制 JSON 驗證
  - 結論：目前屬「UI 輔助」而非「後端強約束」。

---

## 2. 端點與頁面盤點（已存在的 CRUD 骨架）

### 2.1 MVC（ERP.DataAdmin）頁面/路由

- Index（列表/搜尋）：ERP.DataAdmin/Controllers/Authorization/RolesController.Index.cs + ERP.DataAdmin/Views/Authorization/Roles/Index.cshtml
- AddNew（新增）：ERP.DataAdmin/Controllers/Authorization/RolesController.AddNew.cs + ERP.DataAdmin/Views/Authorization/Roles/AddNew.cshtml
- Details（檢視）：ERP.DataAdmin/Controllers/Authorization/RolesController.Details.cs + ERP.DataAdmin/Views/Authorization/Roles/Details.cshtml
- Edit（編輯）：ERP.DataAdmin/Controllers/Authorization/RolesController.Edit.cs + ERP.DataAdmin/Views/Authorization/Roles/Edit.cshtml
- Delete（刪除確認頁 + POST 刪除）：ERP.DataAdmin/Controllers/Authorization/RolesController.Delete.cs + ERP.DataAdmin/Views/Authorization/Roles/Delete.cshtml

備註：目前 UI 型態是「傳統多頁（Index/Details/Edit/Delete）」，並非 prototype spec 的右側 drawer。

### 2.2 WebAPI（ERP.WebAPI.DataAdmin）角色 CRUD

- Base route：v1/dataadmin/roles（常數：ERP.ApiRoutes/Systems/DataAdmin/DataAdminApiRoutes.Authorization.cs）

- Search：GET v1/dataadmin/roles/search
  - Controller：ERP.WebAPI.DataAdmin/Controllers/Admin/RolesAdminController.Search.cs
  - Service：ERP.WebAPI.DataAdmin/Services/Authorization/Roles/RolesAdminService.cs（SearchAsync）

- Read（單筆）：GET v1/dataadmin/roles/{roleCode}
  - Controller：ERP.WebAPI.DataAdmin/Controllers/Admin/RolesAdminController.Read.cs
  - Service：ERP.WebAPI.DataAdmin/Services/Authorization/Roles/RolesAdminService.cs（GetAsync）

- Create：POST v1/dataadmin/roles
  - Controller：ERP.WebAPI.DataAdmin/Controllers/Admin/RolesAdminController.Create.cs
  - Service：ERP.WebAPI.DataAdmin/Services/Authorization/Roles/RolesAdminService.cs（CreateAsync）

- Update：PUT v1/dataadmin/roles/{roleId}
  - Controller：ERP.WebAPI.DataAdmin/Controllers/Admin/RolesAdminController.Update.cs
  - Service：ERP.WebAPI.DataAdmin/Services/Authorization/Roles/RolesAdminService.cs（UpdateAsync；用 RoleId 查找）

- Delete：DELETE v1/dataadmin/roles/{roleId}?rowVersionBase64=...
  - Controller：ERP.WebAPI.DataAdmin/Controllers/Admin/RolesAdminController.Delete.cs
  - Service：ERP.WebAPI.DataAdmin/Services/Authorization/Roles/RolesAdminService.cs（DeleteAsync；用 RoleId 查找）

備註：Read 用 roleCode；Update/Delete 用 roleId。MVC 端已採「畫面用 roleCode、寫入用 roleId」的折衷流程。

---

## 3. 依 prototype spec 的功能點逐項對照

狀態定義：
- ✅ 已實作：功能與 spec 主要意圖一致
- 🟡 部分實作：有替代方式或只完成一部分
- ❌ 未實作：缺少 spec 明確要求的能力
- ❓ 不明/需確認：取決於 DB 或 UI-Meta 設定，repo 內無法直接確認

### 3.1 Search / Index

| spec 功能 | 現況 | 實作位置 | 說明 |
|---|---:|---|---|
| 分頁列表 | ✅ | ERP.DataAdmin/Controllers/Authorization/RolesController.Index.cs、ERP.WebAPI.DataAdmin/Services/Authorization/Roles/RolesAdminService.cs | MVC 使用 GetPagedAsync → WebAPI SearchAsync 回傳 PagedResults |
| keyword 模糊搜尋（RoleCode/RoleName/RoleDesc/Tags/RoleId） | ✅ | RolesAdminService.SearchAsync | WebAPI 已支援（包含 RoleId） |
| IsActive 篩選 | 🟡 | RolesAdminController.Search.cs、RolesAdminService.SearchAsync | WebAPI 有 isActive 參數；MVC Index.cshtml 沒有提供 UI 控制項（目前只能靠 querystring 手動帶） |
| RoleCode、RoleName 分欄條件 | ❌ | — | 目前僅 keyword；沒有分欄條件 UI / API |
| IsAdmin 條件 | ❌ | — | Search API 無 isAdmin 參數 |
| Tags contains（獨立條件） | ❌ | — | 只能靠 keyword contains |
| Priority min/max | ❌ | — | Search API 無 min/max 參數 |
| 列表欄位：RoleId/RoleCode/RoleName/IsAdmin/IsActive/Priority/Tags/ModifiedDate | 🟡 | MVC Index 依 UI-Meta 決定欄位 | MVC 只取 UI-Meta visible 欄位最多 8 欄；是否包含上述欄位取決於 UI-Meta 設定 |
| Row actions：Detail / Edit / Delete(soft) | 🟡 | ERP.DataAdmin/Controllers/Authorization/RolesController.Index.cs | 有 Detail/Edit/Delete 三個 action，但 Delete 目前是「刪除頁 + hard delete」而非 soft delete |

### 3.2 Detail（唯讀檢視）

| spec 功能 | 現況 | 實作位置 | 說明 |
|---|---:|---|---|
| 右側 drawer 顯示（唯讀） | ❌ | — | 現況為獨立 Details 頁 |
| 顯示完整欄位（含 audit、RowVersion） | 🟡 | ERP.DataAdmin/Controllers/Authorization/RolesController.Details.cs | Controller 會把欄位設 ReadOnly 並帶入 RowVersion（Base64）；是否「完整欄位」仍取決於 UI-Meta 回傳 |

### 3.3 Add New

| spec 功能 | 現況 | 實作位置 | 說明 |
|---|---:|---|---|
| drawer 新增 | ❌ | — | 現況為 AddNew 頁 |
| RoleId 自動生成、唯讀 | ✅ | ERP.DataAdmin/Controllers/Authorization/RolesController.AddNew.cs | POST 時以 Guid.NewGuid() 產生 RoleId 並送至 API |
| RoleCode/RoleName/Priority 必填 | 🟡 | AddNew controller 依 UI-Meta required 驗證；WebAPI CreateAsync 也要求 RoleCode/RoleId/RoleName | Priority 是否必填取決於 UI-Meta；WebAPI 允許 Priority null（會用 0） |
| RoleCode UNIQUE | ✅/❓ | RolesAdminService.CreateAsync | WebAPI 以 AnyAsync 檢查 RoleCode/RoleId 重複，回 409；是否 case-insensitive 取決於 DB |

### 3.4 Edit

| spec 功能 | 現況 | 實作位置 | 說明 |
|---|---:|---|---|
| RoleCode 鎖定不可改 | ✅ | RolesAdminService.UpdateAsync | Update 白名單不含 RoleCode → 後端層面不可變；前端是否顯示為唯讀取決於 UI-Meta |
| 可編輯欄位：RoleName/RoleDesc/IsAdmin/IsActive/Priority/Tags | ✅ | RolesAdminService.UpdateAsync | 白名單即這些欄位 |
| RowVersion 併發檢查（Update） | ✅ | RolesAdminService.UpdateAsync + MVC Edit hidden RowVersion | 有 RowVersionBase64 流程；衝突回 409 |
| Tags 必須合法 JSON | ❌ | — | 後端未強制驗證 JSON；前端雖有 JSON editor，但仍可能送出非 JSON 字串 |
| IsAdmin=1 顯示強提醒 / 需原因（正式要求） | ❌ | — | 未看到 UI 或 API 強制原因/稽核事件 |

### 3.5 Delete（soft + hard）

| spec 功能 | 現況 | 實作位置 | 說明 |
|---|---:|---|---|
| 列表 Delete = soft delete（IsActive=0） | ❌ | — | MVC 列表 Delete 會進入 Delete 頁並呼叫 WebAPI DELETE（物理刪除） |
| Edit drawer 提供 hard delete | 🟡 | ERP.DataAdmin/Views/Authorization/Roles/Delete.cshtml + RolesController.Delete.cs | 有 hard delete（確認後刪除）；但不在 Edit 內，也不是 drawer |
| Hard delete guardrail：若仍有 active 指派或 active 授權參照則禁止 | ❌ | — | RolesAdminService.DeleteAsync 直接 Remove；未先查 PrincipalRoles/Grants active count |
| Hard delete 二次 confirm | ✅ | ERP.DataAdmin/Views/Authorization/Roles/Delete.cshtml | 透過 DeleteConfirmationCard + 全域 MessageBox confirm（依 View 註解） |
| Delete 併發保護（RowVersion） | 🟡 | RolesAdminController.Delete.cs 支援 rowVersionBase64 | API 支援；MVC 未傳 rowVersionBase64，因此實際沒有併發保護 |
| 替代做法：停用（IsActive=0） | ✅（替代） | Edit 流程 | 目前要達到 soft delete 的效果，只能用 Edit 把 IsActive 改成 false |

---

## 4. 與關聯表的整合現況（prototype spec 的 References/guardrail）

spec 希望在 Roles 的 Edit drawer 顯示並使用：
- Assigned principals（AuthRelationPrincipalRole，active count）
- Grants（AuthRelationGrant，active count）

現況：

- PrincipalRoles 模組（CRUD/Search）已存在：
  - ERP.WebAPI.DataAdmin/Services/Authorization/PrincipalRoles/PrincipalRolesAdminService.cs
  - 其資料結構以 RoleCode 做關聯

- Grants 模組（CRUD/Search）已存在：
  - ERP.WebAPI.DataAdmin/Services/Authorization/Grants/GrantsAdminService.cs
  - 其資料結構以 RoleCode 做關聯

- 但 Roles 模組目前沒有：
  - 在 UI 上顯示 references count
  - 在 DeleteAsync 中做 guardrail
  - 在 API 層提供「查某 roleCode 的 active references count」的專用端點

---

## 5. 缺口清單（上線風險導向）

### 5.1 與 spec 明確不一致、且可能影響上線安全的缺口

- 缺口 A：刪除策略不符合（缺少 soft delete；列表 Delete 變成 hard delete）
  - 影響：容易誤刪；也不符合 spec 的「萬人系統避免物理刪除」方向

- 缺口 B：hard delete guardrail 未實作
  - DB 規格書判定（_extracted）：AuthRole 規格書明確要求「刪除前強制檢查 AuthRelationPrincipalRole 是否仍有使用者關聯」，且整體 CRUD 守則偏向用 IsActive=0 停用。
  - 影響：目前 API 直接 Remove，未做業務檢查與友善錯誤訊息。
    - 若實際 DB 依規格建立 FK（RoleCode → AuthRole.RoleCode），刪除有參照的角色會在 SaveChanges 直接觸發資料庫拒絕（DbUpdateException/500），不符合 spec 想要的 guardrail 行為。
    - 若實際 DB 未建立 FK，則會產生孤兒資料，後續查詢/計算權限可能出現污染。

- 缺口 C：Delete 未帶 RowVersion → 實際刪除缺少併發保護
  - 影響：多管理員同時操作時，可能出現非預期刪除或狀態誤判

- 缺口 D：Search 條件不足（缺少 spec 指定的多條件查詢）
  - 影響：管理效率差；難以針對 IsAdmin、Priority 等進行精準治理

- 缺口 E：Tags JSON 驗證未落在後端
  - 影響：若前端送出非 JSON 字串，仍會寫入 DB，後續若有其他服務假設 Tags 為 JSON 會出錯

### 5.2 spec 提到但目前未見到的正式版治理項目

- IsAdmin 變更的理由、稽核、安全事件記錄
- IsActive/授權範圍異動的快取失效（Redis invalidation）
  - DB 規格書補充（_extracted）：AuthRole / AuthRelationPrincipalRole / AuthRelationGrant 的規格與「權限系統架構總覽」都明確提到快取失效鏈（角色停用、指派異動、Grant 異動要清 Redis）

---

## 6. 已實現功能清單（可快速確認）

- MVC（ERP.DataAdmin）
  - ✅ Roles Index（列表、keyword、分頁、Detail/Edit/Delete actions）
  - ✅ Roles AddNew（新增表單 + 後端建立）
  - ✅ Roles Details（唯讀表單）
  - ✅ Roles Edit（更新白名單欄位 + RowVersion hidden 帶回）
  - ✅ Roles Delete（確認頁 + 呼叫 WebAPI DELETE）

- WebAPI（ERP.WebAPI.DataAdmin）
  - ✅ Search（keyword + isActive + 分頁）
  - ✅ Read（依 roleCode 取單筆）
  - ✅ Create（檢查 RoleCode/RoleId 重複）
  - ✅ Update（依 roleId 更新；支援 RowVersion；白名單欄位）
  - ✅ Delete（依 roleId 刪除；支援 rowVersionBase64，但沒有 guardrail）

---

## 7. 未實現/不符合 spec 的功能清單（摘要）

- ❌ Search：RoleCode/RoleName/IsAdmin/Tags contains/Priority min-max 等「分欄條件」
- ❌ UI：右側 drawer（現況為多頁）
- ❌ Delete：soft delete（列表 Delete 應改為 IsActive=0）
- ❌ Hard delete guardrail：刪除前檢查 active PrincipalRoles / Grants
- 🟡 Delete 併發：API 有，MVC 未使用
- ❌ Tags JSON：後端未強制驗證

---

## 8. 待確認事項（需要你提供 DB/規格或我再深入查）

- DB 規格書（_extracted）已明確定義 FK 方向與核心索引，但仍需確認「實際上線 DB」是否完全照規格落地
  - AuthRole 受下列表參照（FK）：
    - AuthRelationPrincipalRole.RoleCode → AuthRole.RoleCode
    - AuthRelationGrant.RoleCode → AuthRole.RoleCode
  - AuthRelationGrant 規格附的標準 SQL script 有建立 FK，但未指定 ON DELETE（SQL Server 預設為 NO ACTION/Restrict）→ 表示只要仍有參照，物理刪除就應該被 DB 擋下
  - AuthRelationPrincipalRole 規格強調 XOR check、Filtered Unique Index、以及刪除策略「優先 IsActive=0」
  - 目前 repo 內 AuthDbContext Fluent API 未看到上述約束/索引的 code-first 設定，推測較可能是 DB-first 由資料庫直接管

- UI-Meta（Roles.Index / Roles.AddNew / Roles.Edit / Roles.Details / Roles.Delete）的欄位配置
  - RoleCode 在 Edit 是否以 ReadOnly 呈現
  - Priority 是否 Required
  - Tags 是否有 regex / 驗證規則
  - 列表是否包含 spec 所需欄位

- 「active 指派/授權」的精確定義需對齊規格與現行資料結構（影響 hard delete guardrail 的查詢條件）
  - PrincipalRoles（AuthRelationPrincipalRole）：規格包含 IsActive + ValidFrom/ValidTo（有效期）
  - Grants（AuthRelationGrant）：規格包含 IsActive + ValidFrom/ValidTo + ConditionJson
  - 權限系統架構總覽（_extracted）明確定義第一層「物理過濾」：IsActive = 1 且 Now 落在 [ValidFrom, ValidTo]，未通過者直接排除
  - 因此 guardrail 建議至少以 IsActive=1，並把有效期（Now 落在 ValidFrom/ValidTo）納入「active」判斷

---

（完）
