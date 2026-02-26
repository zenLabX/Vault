# Trade.dbo.Pass0（舊系統）欄位說明（Role / 群組主檔）

> **用途定位**：角色/群組（Role、Permission Group）主檔。  
> **主鍵(PK)**：`PKey`

## 欄位描述

| 欄位 | 類型(推測) | 必填 | 意義/用途 | 轉新DB建議對應 |
|---|---|---:|---|---|
| PKey | int | Y | **角色主鍵**（RoleId）。供 Pass1、Pass2 外鍵引用。 | `Roles.RoleId`（int identity）或保留舊ID欄位 `LegacyRoleKey` |
| ID | nvarchar | Y | **角色代碼/簡稱**，如 `MIS`、`Pattern`、`ADMIN`。常用於顯示、查詢或程式判斷。 | `Roles.Code`（unique） |
| Description | nvarchar | N | 角色說明（中文描述/適用部門/備註）。 | `Roles.Name` 或 `Roles.Description` |
| IsAdmin | bit/int | N | 角色層級是否管理者（Admin Role）。可能用於放大權限或顯示管理選單。 | `Roles.IsAdmin`（bool） |
| AddName | nvarchar | N | 建立者（帳號/工號）。 | `CreatedBy` |
| AddDate | datetime | N | 建立時間。 | `CreatedAt` |
| EditName | nvarchar | N | 最後修改者。 | `UpdatedBy` |
| EditDate | datetime | N | 最後修改時間。 | `UpdatedAt` |
| Junk | bit/int | N | 作廢/停用旗標（常見：1=停用、0=啟用；需以資料驗證）。 | `IsActive`（反向）或 `Status` |
| Department_DHL | nvarchar | N | 部門/群組對應碼（看起來像部門代碼或群組集合，如 `PD01+MMC`、`TP`）。具體規則需再確認。 | 若新系統有部門維度：`RoleDepartmentMapping` 或 `Roles.DepartmentTag` |

## 關聯（舊系統）
- `Pass1.FKPass0` → `Pass0.PKey`（使用者所屬角色）
- `Pass2.FKPass0` → `Pass0.PKey`（角色對功能點權限）

## 遷移注意事項（建議）
1. **保留舊PKey**：建議新表加 `LegacyPass0PKey`，避免歷史權限對應困難。
2. `Junk` 建議轉成狀態欄位並統一語意（例如新系統 `IsActive = (Junk==0)`）。
3. `ID`（角色代碼）建議設唯一索引，避免重複造成授權混亂。