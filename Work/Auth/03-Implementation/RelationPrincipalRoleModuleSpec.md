# AuthRelationPrincipalRole 模組實作審計報告

> **Prototype Spec 路徑**：`file/AuthRelationPrincipalRole/AuthRelationPrincipalRolePrototypeSpec.md`
> **審計日期**：2026-02-27
> **對照基準**：AuthRelationPrincipalRolePrototypeSpec（2026-02-27 版）
> **審計範圍**：WebAPI Service / WebAPI Controllers / MVC Controllers / MVC Services / Entity / DTOs / Repository / DB SQL / Views
> **整體完成度**：≈ 55 %（CRUD 骨架完整；核心守則 — Soft Delete、Edit 鎖定、Filtered Unique、ValidFrom≤ValidTo — 均未實現）

---

## §0 檔案清單與行數

| 層 | 檔案 | 行數 |
|---|---|---|
| **WebAPI Service** | `ERP.WebAPI.DataAdmin/Services/Authorization/PrincipalRoles/PrincipalRolesAdminService.cs` | 376 |
| **WebAPI Controller (Base)** | `ERP.WebAPI.DataAdmin/Controllers/Admin/PrincipalRolesAdminController.cs` | 79 |
| **WebAPI Controller (Search)** | `…PrincipalRolesAdminController.Search.cs` | 89 |
| **WebAPI Controller (Read)** | `…PrincipalRolesAdminController.Read.cs` | 80 |
| **WebAPI Controller (Create)** | `…PrincipalRolesAdminController.Create.cs` | 97 |
| **WebAPI Controller (Update)** | `…PrincipalRolesAdminController.Update.cs` | 80 |
| **WebAPI Controller (Delete)** | `…PrincipalRolesAdminController.Delete.cs` | 74 |
| **MVC Controller (Base)** | `ERP.DataAdmin/Controllers/Authorization/PrincipalRolesController.cs` | 192 |
| **MVC Controller (Index)** | `…PrincipalRolesController.Index.cs` | 277 |
| **MVC Controller (AddNew)** | `…PrincipalRolesController.AddNew.cs` | 261 |
| **MVC Controller (Edit)** | `…PrincipalRolesController.Edit.cs` | 334 |
| **MVC Controller (Delete)** | `…PrincipalRolesController.Delete.cs` | 219 |
| **MVC Controller (Details)** | `…PrincipalRolesController.Details.cs` | 132 |
| **MVC AppService** | `ERP.DataAdmin/Services/Authorization/PrincipalRoles/PrincipalRolesAppService.cs` | 267 |
| **MVC Interface** | `…IPrincipalRolesAppService.cs` | 196 |
| **Entity** | `ERP.CommonLib/Models/Entities/Auth/AuthRelationPrincipalRole.cs` | 202 |
| **Repository (Dapper)** | `ERP.CommonLib/Repositories/Auth/AuthRelationPrincipalRoleRepository.cs` | 475 |
| **DTO (Full)** | `…PrincipalRoleDto.cs` | 173 |
| **DTO (Edit)** | `…PrincipalRoleEditDto.cs` | 172 |
| **DTO (List)** | `…PrincipalRoleListItemDto.cs` | 148 |
| **DTO (CreatedResult)** | `…PrincipalRoleCreatedResultDto.cs` | 118 |
| **DB SQL** | `Database/ERP.DataAdmin/dbo/Table/AuthRelationPrincipalRole.sql` | 82 |

**合計**：≈ 4,123 行（不含 Views）

---

## §1 已實現功能總覽

| # | 功能 | 狀態 | 說明 |
|---|---|---|---|
| 1 | CRUD 五端點（Search/Read/Create/Update/Delete） | ✅ | WebAPI 與 MVC 各層齊全 |
| 2 | XOR 驗證（UserId ↔ GroupCode 互斥） | ✅ | Create + Update Service 層均檢查 |
| 3 | MVC PrincipalType（User/Group）切換 | ✅ | AddNew / Edit 以 `PrincipalTypeEnum` 控制欄位顯示與清空 |
| 4 | PK 重複檢查（PrincipalRoleCode） | ✅ | CreateAsync 先 `AnyAsync` 再 Insert |
| 5 | RowVersion 樂觀鎖（Update） | ✅ | UpdateAsync 送 RowVersionBase64，DbUpdateConcurrencyException → 409 |
| 6 | RowVersion 樂觀鎖（Delete） | ✅ | DeleteAsync 支援 optional rowVersionBase64 |
| 7 | Priority 欄位存在且可編輯 | ✅ | Entity/DTO/Service 均涵蓋 |
| 8 | IsActive 欄位存在且可切換 | ✅ | Create 預設 true；Update 白名單含 IsActive |
| 9 | ValidFrom / ValidTo 欄位存在 | ✅ | Entity/DTO 有欄位；Create/Update 可設值 |
| 10 | Audit 欄位（CreatedBy/Date, ModifiedBy/Date） | ✅ | Create 填 CreatedBy/Date；Update 自動設 ModifiedBy/Date |
| 11 | DB FK 約束 | ✅ | UserId→AuthPrincipalUser, GroupCode→AuthPrincipalGroup, RoleCode→AuthRole |
| 12 | DB CHECK 約束（部分） | ⚠️ | `CHK_AuthRelationPrincipalRole_UserOrGroup`：僅「至少一者」非 NULL（非嚴格 XOR） |
| 13 | 分頁查詢 + 關鍵字搜尋 | ✅ | 支援 keyword 搜尋 PrincipalRoleCode/RelationCode/UserId/GroupCode/RoleCode/AppCode |
| 14 | IsActive 篩選 | ✅ | SearchAsync 接受 `bool? isActive` 參數 |
| 15 | ApiResponse\<T\> 統一回應格式 | ✅ | 所有端點使用 ResponseHelper 封裝 |
| 16 | MVC UI-Meta 驅動動態欄位 | ✅ | IPrincipalRolesUiMetaService → GetListColumnsAsync / GetFormFieldsAsync |
| 17 | Repository Dapper 層 | ✅ | Find/GetByUser/GetByGroup/GetByRole/GetEffective/Insert/Update/Delete/Upsert/ExistsDuplicate |

---

## §2 Gap 清單（未實現 / 偏差項目）

### 🔴 Critical（直接違反 Spec 核心要求）

#### G1 — Delete = Hard Delete（應為 Soft Delete `IsActive=0`）

| 項目 | 內容 |
|---|---|
| **Spec 要求** | §2 / §3.7 / §4.5：Delete 行為為 Soft Delete（`IsActive = 0`） |
| **實際行為** | `PrincipalRolesAdminService.DeleteAsync()` 執行 `_db.AuthRelationPrincipalRole.Remove(e)` → **物理刪除** |
| **影響** | 資料永久消失，無法還原；與 Spec 的「soft delete 後仍視為同一筆指派」語意矛盾 |
| **修正建議** | 將 `Remove(e)` 改為 `e.IsActive = false; e.ModifiedBy = ...; e.ModifiedDate = DateTime.UtcNow;` 後 `SaveChangesAsync` |

**程式碼位置**：`PrincipalRolesAdminService.cs` → `DeleteAsync()` 方法（約第 340–370 行）

---

#### G2 — Edit 白名單未鎖定 Spec 要求的欄位

| 項目 | 內容 |
|---|---|
| **Spec 要求** | §2 / §4.4：Edit 鎖定不可改 — `RelationCode` / `UserId` / `GroupCode` / `RoleCode` / `AppCode` |
| **實際行為** | `PrincipalRolesAdminService.UpdateAsync()` 的 `allowed` HashSet 包含上述全部 5 個欄位 |
| **影響** | 前端 / API 直接呼叫即可修改主體、角色、關聯代碼，違反「要改視為刪除後新增」原則 |
| **修正建議** | 從 `allowed` HashSet 移除 `"RelationCode"`, `"UserId"`, `"GroupCode"`, `"RoleCode"`, `"AppCode"` |

**程式碼位置**：`PrincipalRolesAdminService.cs` → `UpdateAsync()` 的 `allowed` HashSet（約第 260 行）

```csharp
// 目前（錯誤）
var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "RelationCode", "UserId", "GroupCode", "RoleCode", "AppCode",
    "ValidFrom", "ValidTo", "ValidFromText", "ValidToText",
    "Priority", "PriorityText", "IsActive", "IsActiveText"
};

// 修正後
var allowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "ValidFrom", "ValidTo", "ValidFromText", "ValidToText",
    "Priority", "PriorityText", "IsActive", "IsActiveText"
};
```

---

#### G3 — Filtered Unique Index 不存在（DB + Service）

| 項目 | 內容 |
|---|---|
| **Spec 要求** | §2：User 指派 `(UserId, RoleCode, AppCode)` 唯一；Group 指派 `(GroupCode, RoleCode, AppCode)` 唯一 |
| **實際行為** | (1) DB SQL 無 Filtered Unique Index；(2) WebAPI `CreateAsync` 僅檢查 PK 重複，不檢查組合唯一；(3) `UpdateAsync` 也不檢查 |
| **影響** | 同一使用者可被重複指派相同角色，造成授權計算膨脹 |
| **修正建議（DB）** | 新增兩個 Filtered Unique Index |

```sql
CREATE UNIQUE NONCLUSTERED INDEX [UX_PrincipalRole_User_Role_App]
ON [dbo].[AuthRelationPrincipalRole] (UserId, RoleCode, AppCode)
WHERE UserId IS NOT NULL;

CREATE UNIQUE NONCLUSTERED INDEX [UX_PrincipalRole_Group_Role_App]
ON [dbo].[AuthRelationPrincipalRole] (GroupCode, RoleCode, AppCode)
WHERE GroupCode IS NOT NULL;
```

**修正建議（Service）**：在 `CreateAsync` 中 PK 檢查後，增加 filtered unique 檢查：

```csharp
if (hasUser)
{
    var dupUser = await _db.AuthRelationPrincipalRole
        .AnyAsync(x => x.UserId == req.UserId && x.RoleCode == req.RoleCode
                    && x.AppCode == req.AppCode, ct);
    if (dupUser) return (false, 400, "Duplicate: (UserId, RoleCode, AppCode) already exists.", null);
}
else
{
    var dupGroup = await _db.AuthRelationPrincipalRole
        .AnyAsync(x => x.GroupCode == req.GroupCode && x.RoleCode == req.RoleCode
                    && x.AppCode == req.AppCode, ct);
    if (dupGroup) return (false, 400, "Duplicate: (GroupCode, RoleCode, AppCode) already exists.", null);
}
```

> **補充**：Repository 已有 `ExistsDuplicateAsync()` 可用，但 WebAPI Service 使用 EF Core 未呼叫。

---

#### G4 — ValidFrom ≤ ValidTo 驗證不存在

| 項目 | 內容 |
|---|---|
| **Spec 要求** | §3.5：`ValidFrom <= ValidTo` |
| **實際行為** | WebAPI `CreateAsync` / `UpdateAsync` 均無此驗證；MVC AddNew / Edit 也無 |
| **影響** | 可建立 ValidFrom > ValidTo 的無效期間記錄，導致授權載入時效過濾邏輯失效 |
| **修正建議** | 在 Create / Update Service 層加入 |

```csharp
if (vf.HasValue && vt.HasValue && vf.Value > vt.Value)
    return (false, 400, "ValidFrom must be ≤ ValidTo.", null);
```

---

### 🟡 Medium（應修正但不阻塞核心功能）

#### G5 — DB CHECK Constraint 僅「至少一者」而非嚴格 XOR

| 項目 | 內容 |
|---|---|
| **Spec 要求** | §2 / §3.3：UserId 與 GroupCode 嚴格互斥（XOR） |
| **實際 DB** | `CHK_AuthRelationPrincipalRole_UserOrGroup` → `([UserId] IS NOT NULL OR [GroupCode] IS NOT NULL)` |
| **風險** | 應用層 XOR 驗證已存在，但若直接操作 DB 或 Dapper 路徑，可能同時填入 UserId 和 GroupCode |
| **修正建議** | 改為嚴格 XOR |

```sql
ALTER TABLE [dbo].[AuthRelationPrincipalRole]
DROP CONSTRAINT [CHK_AuthRelationPrincipalRole_UserOrGroup];

ALTER TABLE [dbo].[AuthRelationPrincipalRole]
ADD CONSTRAINT [CHK_AuthRelationPrincipalRole_UserOrGroup]
CHECK (
    ([UserId] IS NOT NULL AND [GroupCode] IS NULL)
    OR ([UserId] IS NULL AND [GroupCode] IS NOT NULL)
);
```

---

#### G6 — AppCode 搜尋篩選被註解掉

| 項目 | 內容 |
|---|---|
| **Spec 要求** | §3.4：AppCode 依決策固定 PMS |
| **實際行為** | `SearchAsync` 中 AppCode 過濾行被註解：`// if (!string.IsNullOrWhiteSpace(app)) q = q.Where(x => x.AppCode == app);` |
| **影響** | 搜尋結果不受 AppCode 限制，多系統資料混在一起 |
| **修正建議** | 解除註解或依業務決策啟用 |

---

#### G7 — RelationCode 唯一性未強制

| 項目 | 內容 |
|---|---|
| **Spec 要求** | §3.2：`RelationCode` 為「業務唯一碼」 |
| **實際行為** | DB 無 UNIQUE 約束、Service 無唯一性檢查 |
| **影響** | 可建立重複 RelationCode，降低業務碼辨識價值 |
| **修正建議** | DB 加 `UNIQUE NONCLUSTERED INDEX` on `RelationCode WHERE RelationCode IS NOT NULL`；Service Create 加查重 |

---

#### G8 — 搜尋缺少 PrincipalType 獨立篩選條件

| 項目 | 內容 |
|---|---|
| **Spec 要求** | §4.1：Search 條件含 PrincipalType 篩選 |
| **實際行為** | WebAPI `SearchAsync` 僅接受 `keyword` + `isActive`；無 PrincipalType 參數 |
| **影響** | 無法快速篩選「僅 User」或「僅 Group」的指派 |
| **修正建議** | 增加 `string? principalType` 參數，依值過濾 `UserId IS NOT NULL` (User) 或 `GroupCode IS NOT NULL` (Group) |

---

#### G9 — Search 排序 Priority 方向不一致

| 項目 | 內容 |
|---|---|
| **Spec 要求** | §3.6：Priority 值越大越優先 |
| **實際行為** | `SearchAsync` 排序：`.OrderByDescending(u => u.CreatedDate).ThenBy(x => x.Priority)` — Priority 為 **ASC** |
| **影響** | 高優先級記錄排在後面，與 Spec 語意相反 |
| **修正建議** | 改為 `.ThenByDescending(x => x.Priority)` |

---

#### G10 — MVC Delete 不傳 RowVersion

| 項目 | 內容 |
|---|---|
| **Spec 要求** | §3.8：Delete 也需 RowVersion 併發控制 |
| **實際行為** | MVC `PrincipalRolesAppService.DeleteAsync()` 未傳 `rowVersionBase64` 查詢參數 |
| **影響** | MVC 刪除操作跳過樂觀鎖檢查，有併發風險 |
| **修正建議** | MVC Delete 從 DTO 取出 RowVersionBase64 並傳入 API 請求 QueryParams |

---

### ⚪ Low / Informational

#### G11 — Search ListItemDto 缺少審計欄位

| 項目 | 內容 |
|---|---|
| **說明** | `PrincipalRoleListItemDto` 不含 `CreatedBy` / `CreatedDate` / `ModifiedBy`，但 MVC Index 嘗試從 `PrincipalRoleDto` 映射這些欄位 |
| **影響** | MVC Index 列表的 CreatedBy / CreatedDate / ModifiedBy 欄位可能顯示為空 |
| **建議** | 評估是否在 ListItemDto 加入 `CreatedBy` / `CreatedDate`，或 MVC Index 不顯示這些欄 |

---

#### G12 — DB 缺少效能索引

| 項目 | 內容 |
|---|---|
| **Spec 提示** | §5：UserId 非叢集索引；`(RoleCode, IsActive)` 複合索引 |
| **實際 DB** | SQL 文件中只有 PK Clustered Index，無額外索引 |
| **建議** | 依查詢負載評估後補建：`IX_PrincipalRole_UserId`、`IX_PrincipalRole_RoleCode_IsActive` |

---

#### G13 — Repository (Dapper) 未被 WebAPI Service 使用

| 項目 | 內容 |
|---|---|
| **說明** | `AuthRelationPrincipalRoleRepository`（475 行）提供完整 CRUD + `ExistsDuplicateAsync` + `GetEffectiveByUser/Group` 等方法，但 WebAPI Service 使用 EF Core 直接操作 |
| **影響** | Repository 為冗餘程式碼；其 `ExistsDuplicateAsync`（已實作 Filtered Unique 檢查）可被 Service 利用 |
| **建議** | 評估統一資料存取策略（EF Core 或 Dapper），避免維護兩套 |

---

#### G14 — Entity CreatedDate 預設值用 DateTime.Now（非 UTC）

| 項目 | 內容 |
|---|---|
| **說明** | Entity：`public DateTime CreatedDate { get; set; } = DateTime.Now;`（本地時間） |
| **實際影響** | WebAPI CreateAsync 覆寫為 `DateTime.UtcNow`，功能不受影響，但 Entity 預設值與全系統 UTC 規範不一致 |
| **建議** | 改為 `= DateTime.UtcNow` |

---

## §3 Spec 要求 vs 實現對照矩陣

| Spec 章節 | 要求 | 實現狀態 | Gap # |
|---|---|---|---|
| §2 Delete | Soft Delete (`IsActive=0`) | ❌ Hard Delete | G1 |
| §2 Edit Lock | RelationCode / Principal / RoleCode / AppCode 不可改 | ❌ 全部在白名單中可改 | G2 |
| §2 Unique (User) | `(UserId, RoleCode, AppCode)` Filtered Unique | ❌ DB 無 Index + Service 無檢查 | G3 |
| §2 Unique (Group) | `(GroupCode, RoleCode, AppCode)` Filtered Unique | ❌ DB 無 Index + Service 無檢查 | G3 |
| §3.2 RelationCode | 業務唯一碼 | ❌ 無 UNIQUE 約束 | G7 |
| §3.3 XOR | UserId ↔ GroupCode 嚴格互斥 | ⚠️ 應用層 ✅ / DB 僅「至少一個」 | G5 |
| §3.4 AppCode | 搜尋過濾 | ⚠️ 被註解 | G6 |
| §3.5 Temporal | ValidFrom ≤ ValidTo | ❌ 無驗證 | G4 |
| §3.6 Priority | 值越大越優先 | ⚠️ 搜尋排序為 ASC | G9 |
| §3.7 IsActive | 快速停用/啟用 | ✅ | — |
| §3.8 RowVersion | Update/Delete 使用 | ⚠️ MVC Delete 未傳 | G10 |
| §4.1 Search | PrincipalType 篩選 | ❌ 無獨立參數 | G8 |
| §4.1 Search | keyword + isActive | ✅ | — |
| §4.2 Detail | 唯讀完整欄位 | ✅ | — |
| §4.3 Add New | XOR / Required / PK 唯一 | ✅（缺 Filtered Unique） | G3 |
| §4.4 Edit | 鎖定欄位 + RowVersion | ❌ 未鎖定 | G2 |
| §4.5 Delete (soft) | `IsActive=0` | ❌ Hard Delete | G1 |
| §5 Index 提示 | UserId index, (RoleCode, IsActive) index | ❌ 無 | G12 |

---

## §4 修正優先順序建議

| 優先序 | Gap | 嚴重度 | 預估影響範圍 |
|---|---|---|---|
| **P0** | G1 — Hard Delete → Soft Delete | 🔴 | WebAPI Service `DeleteAsync`（≈ 30 行） |
| **P0** | G2 — Edit 白名單鎖定 | 🔴 | WebAPI Service `UpdateAsync`（≈ 2 行：移除 5 key） |
| **P0** | G3 — Filtered Unique Index + Service 查重 | 🔴 | DB DDL（2 Index）+ WebAPI `CreateAsync`（≈ 15 行） |
| **P0** | G4 — ValidFrom ≤ ValidTo | 🔴 | WebAPI `CreateAsync` + `UpdateAsync`（各 ≈ 3 行） |
| **P1** | G5 — DB CHECK → 嚴格 XOR | 🟡 | DB DDL（1 ALTER） |
| **P1** | G6 — AppCode 搜尋解除註解 | 🟡 | WebAPI `SearchAsync`（1 行） |
| **P1** | G7 — RelationCode UNIQUE | 🟡 | DB DDL + WebAPI `CreateAsync`（≈ 5 行） |
| **P1** | G8 — PrincipalType 篩選 | 🟡 | WebAPI `SearchAsync` + Controller（≈ 10 行） |
| **P2** | G9 — Priority 排序方向 | 🟡 | WebAPI `SearchAsync`（1 行） |
| **P2** | G10 — MVC Delete 傳 RowVersion | 🟡 | MVC AppService（≈ 5 行） |
| **P3** | G11 — ListItemDto 審計欄位 | ⚪ | DTO + Search Select |
| **P3** | G12 — 效能索引 | ⚪ | DB DDL |
| **P3** | G13 — Repository 策略統一 | ⚪ | 架構決策 |
| **P3** | G14 — Entity DateTime.Now | ⚪ | Entity 1 行 |

---

## §5 各層程式碼摘要

### 5.1 WebAPI Service（PrincipalRolesAdminService.cs）

| 方法 | 行為 | 問題 |
|---|---|---|
| `SearchAsync` | keyword 模糊搜尋 + isActive 過濾 + 分頁；AsNoTracking | AppCode 過濾被註解；Priority 排序 ASC（應 DESC） |
| `GetAsync` | 單筆查詢 → PrincipalRoleEditDto；AsNoTracking | ✅ 正常 |
| `CreateAsync` | XOR 驗證 + PK 查重 + Insert + SaveChanges | 缺 Filtered Unique 查重 + ValidFrom≤ValidTo |
| `UpdateAsync` | 白名單 + XOR post-check + RowVersion + SaveChanges | 白名單含 5 個應鎖欄位 + 缺 ValidFrom≤ValidTo |
| `DeleteAsync` | `_db.Remove(e)` + RowVersion | **Hard Delete**（應為 Soft Delete） |

### 5.2 WebAPI Controllers（6 partial files）

- 路由：`[Route(DataAdminApiRoutes.PrincipalRolesV1)]` → `v1/dataadmin/principal-roles`
- 回應：統一 `ApiResponse<T>` + `ResponseHelper.Success/Fail`
- Create：接收 `object body` → JSON 反序列化為 `CreatePrincipalRoleRequest`
- Update：接收 `Dictionary<string, object?>` body → 直接傳 Service
- Delete：接收 `string? rowVersionBase64` 查詢參數
- 結構正常，無特殊問題

### 5.3 MVC Controllers（6 partial files）

| 動作 | 行為 | 問題 |
|---|---|---|
| Index | UI-Meta 欄位 + GetPagedAsync + UiTableModel | ✅ |
| AddNew GET | UI-Meta + 預設值（PrincipalType=User, Priority=1, IsActive=true） | ✅ |
| AddNew POST | PrincipalType → XOR 驗證 + 必填檢查 + PK = GUID + CreateAsync | ✅（缺 ValidFrom≤ValidTo） |
| Edit GET | UI-Meta + GetByIdAsync + 推斷 PrincipalType | ✅ |
| Edit POST | PrincipalType → XOR + 必填 + Regex + UpdateAsync | 未強制鎖定 Spec 欄位（依賴 UI-Meta ReadOnly） |
| Delete GET | GetByIdAsync + UI-Meta → 確認頁 | ✅ |
| Delete POST | `DeleteAsync` → 物理刪除 | 繼承 G1 |
| Details | 全欄位唯讀 | ✅ |

### 5.4 Entity（AuthRelationPrincipalRole.cs）

- 15 欄位：PrincipalRoleCode(PK) / UserId / RelationCode / GroupCode / RoleCode / AppCode / ValidFrom / ValidTo / Priority / IsActive / CreatedBy / CreatedDate / ModifiedBy / ModifiedDate / RowVersion
- Data Annotations：`[Key]`, `[Required]`, `[StringLength]`, `[Timestamp]`
- 無 Navigation Properties（符合 DB-first 架構規範）
- `CreatedDate` 預設 `DateTime.Now`（G14）

### 5.5 DB SQL

- PK：`PrincipalRoleCode` Clustered
- 預設值：Priority=0, IsActive=1, CreatedBy='System', CreatedDate=getdate()
- FK：UserId, GroupCode, RoleCode（均含 WITH CHECK）
- CHECK：`CHK_AuthRelationPrincipalRole_UserOrGroup`（僅 OR，非 XOR）
- **缺少**：Filtered Unique Index × 2、效能索引、RelationCode UNIQUE

### 5.6 Repository（Dapper，475 行）

Repository 完整度高，但 **WebAPI Service 未使用**（EF Core 路線）。

| 方法 | 功能 | 備註 |
|---|---|---|
| `FindAsync` | PK 查詢（NOLOCK） | — |
| `GetByUserAsync` | 依 UserId 查全部指派 | — |
| `GetByGroupAsync` | 依 GroupCode 查全部指派 | — |
| `GetByRoleCodeAsync` | 依 RoleCode 查全部指派 | — |
| `GetEffectiveByUserAsync` | 依 UserId + IsActive=1 + 有效期 + AppCode | ✅ 完整時效過濾 |
| `GetEffectiveByGroupAsync` | 依 GroupCode + 同上 | ✅ 完整時效過濾 |
| `InsertAsync` | 含 Group/Role FK 存在性驗證 | ✅ 但僅驗證 Group/Role |
| `UpdateAsync` | RowVersion 併發控制 | ✅ |
| `DeleteAsync` | RowVersion 併發控制 / Hard Delete | 同 G1 |
| `DeleteByUserAsync` | 依 UserId 批量刪除 | — |
| `DeleteByGroupAsync` | 依 GroupCode 批量刪除 | — |
| `DeleteByRoleCodeAsync` | 依 RoleCode 批量刪除 | — |
| `UpsertAsync` | Find → Insert or Update | — |
| `ExistsDuplicateAsync` | (UserId/GroupCode, RoleCode, AppCode) 查重 | ✅ 可做 Filtered Unique 驗證 |
| `GetEffectiveRoleCodesAsync` | 有效角色 code 清單（DISTINCT） | ✅ |

---

## §6 關鍵發現摘要

1. **Delete 行為根本性錯誤**：當前為 Hard Delete，Spec 明確要求 Soft Delete（`IsActive=0`）。這是最優先修復項。
2. **Edit 白名單開放過大**：5 個應鎖定欄位（RelationCode / UserId / GroupCode / RoleCode / AppCode）全部可被 PUT 修改，違反「要改視為刪除後新增」原則。修改僅需刪除 HashSet 中 5 個 key。
3. **Filtered Unique 完全缺失**：DB 無 Index、Service 無查重，可造成重複指派。Repository 已有 `ExistsDuplicateAsync` 可用但未被呼叫。
4. **ValidFrom ≤ ValidTo 未驗證**：可建立無效期間記錄。
5. **DB CHECK 約束不夠嚴格**：僅「至少一者」而非 XOR，應用層已補，但 DB 層防線不完整。

---

## §7 MVC 前端 UI 行為觀察

| 觀察項 | 描述 |
|---|---|
| PrincipalType 切換 | AddNew/Edit 以 `PrincipalTypeEnum` (User/Group) 控制欄位顯示，選 User 則清空 GroupCode，反之亦然 |
| 下拉選單選項 | `SetPrincipalRolesViewData()` 硬編碼少量選項（4 個 RelationCode、2 個 UserId、4 個 GroupCode、4 個 RoleCode），非動態從 API 取得 |
| Edit 欄位鎖定 | 依賴 UI-Meta（`GetFormFieldsAsync` form="PrincipalRoles.Edit"）的 ReadOnly 設定，而非 Controller 強制鎖定 |
| PrincipalRoleCode 產生 | AddNew POST 用 `Guid.NewGuid().ToString().ToUpper()` 產生（Spec 提到 `PRR-...` 格式，但程式使用 UUID） |

---

## §8 與其他模組的共通模式比較

| 項目 | AuthTokens | AuthRelationGrant | AuthRelationPrincipalRole |
|---|---|---|---|
| Delete 行為 | 🔴 Hard Delete | 🔴 Hard Delete | 🔴 Hard Delete |
| Edit 白名單過寬 | 🔴 6 欄位應鎖 | 🔴 類似 | 🔴 5 欄位應鎖 |
| RowVersion Update | ✅ | ✅ | ✅ |
| Filtered Unique | — | ❌ | ❌ |
| ValidFrom ≤ ValidTo | ❌ | ❌ | ❌ |
| Repository 未被使用 | ✅ 同 | ✅ 同 | ✅ 同 (Dapper unused by WebAPI) |

---

## §9 結論

AuthRelationPrincipalRole 模組的 **CRUD 骨架已完整**（五端點 + MVC UI + UI-Meta + API 統一回應），但 **Prototype Spec 的四大守則全部未落實**：

1. ❌ Delete = Hard Delete（應 Soft Delete）
2. ❌ Edit 白名單未鎖定 5 個欄位
3. ❌ Filtered Unique Index + Service 查重缺失
4. ❌ ValidFrom ≤ ValidTo 驗證缺失

XOR 驗證在應用層已做到（Create + Update），但 DB CHECK 約束僅為寬鬆版本。Repository（Dapper）已有可用的 `ExistsDuplicateAsync` 但未被 Service 呼叫。

**P0 修正估計工作量**：≈ 50 行程式碼 + 2 段 DB DDL，即可補齊 G1–G4。
