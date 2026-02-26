# Trade.dbo.Pass2（舊系統）欄位說明（Role ↔ Menu 權限明細）

> **用途定位**：角色對「功能點(MenuDetail)」的實際授權（可用/不可用 + 動作權限）。  
> **主鍵(PK)**：`PKey`  
> **重要外鍵**：`FKPass0` → Pass0.PKey、`FKMenu` → MenuDetail.PKey

## 欄位描述

| 欄位 | 類型(推測) | 必填 | 意義/用途 | 轉新DB建議對應 |
|---|---|---:|---|---|
| PKey | int | Y | **權限明細主鍵**（每筆 Role-Menu 一筆資料）。 | `RoleMenuPermissions.Id` 或保留 `LegacyPass2PKey` |
| FKPass0 | int | Y | **角色ID** 外鍵 → `Pass0.PKey`。 | `RoleMenuPermissions.RoleId` |
| FKMenu | int | Y | **功能點(Menu)ID** 外鍵 → `MenuDetail.PKey`。 | `RoleMenuPermissions.MenuId` |
| MenuName | nvarchar | N | 模組/群組名稱（冗餘顯示用，如 `Pattern/Marker`）。 | 新系統建議由 Menu 主檔取得，避免冗餘 |
| BarPrompt | nvarchar | N | 選單顯示文字（冗餘快照，如 `B01. SizeSetList`）。 | 同上 |
| Used | char/nvarchar | N | 是否啟用此功能給該角色（常見：`Y`=啟用）。空白/NULL 多半代表未啟用。 | `IsEnabled`（bool） |
| CanNew | bit/int | N | 該角色對此功能：可新增。 | `Permissions.Create` |
| CanEdit | bit/int | N | 可修改。 | `Permissions.Update` |
| CanDelete | bit/int | N | 可刪除。 | `Permissions.Delete` |
| CanPrint | bit/int | N | 可列印。 | `Permissions.Print` |
| CanConfirm | bit/int | N | 可確認（流程動作）。 | `Permissions.Confirm` |
| CanUnConfirm | bit/int | N | 可反確認。 | `Permissions.Unconfirm` |
| CanSend | bit/int | N | 可送出/傳送。 | `Permissions.Send` |
| CanRecall | bit/int | N | 可撤回。 | `Permissions.Recall` |
| CanCheck | bit/int | N | 可覆核/檢查。 | `Permissions.Check` |
| CanUnCheck | bit/int | N | 可反覆核。 | `Permissions.Uncheck` |
| CanClose | bit/int | N | 可結案/關閉。 | `Permissions.Close` |
| CanUnClose | bit/int | N | 可反結案。 | `Permissions.Unclose` |
| CanReceive | bit/int | N | 可接收（常見於收貨/收件流程）。 | `Permissions.Receive` |
| CanReturn | bit/int | N | 可退回。 | `Permissions.Return` |
| CanJunk | bit/int | N | 可作廢。 | `Permissions.Void` |
| CanUnJunk | bit/int | N | 可反作廢。 | `Permissions.Unvoid` |

## 權限計算建議（遷移時要定義清楚）
舊系統看起來同時存在：
- `MenuDetail` 也有 CanNew/CanEdit...（代表功能「能力/可支援動作」）
- `Pass2` 也有 CanNew/CanEdit...（代表角色「授權」）

**建議新系統實作：**
- `實際可做 = MenuDetail(能力) AND Pass2(授權)`  
避免功能本身不支援卻誤開授權。

## 遷移注意事項
1. `Used` 空白/NULL 的語意要統一（通常視為未啟用 = false）。
2. `MenuName/BarPrompt` 建議不要當作權威資料；遷移以 `FKMenu` join `MenuDetail` 為主。
3. 建議加唯一鍵（新系統）：`(RoleId, MenuId)` 必須唯一，避免一個角色對同功能多筆權限。