# Trade.dbo.Menu（舊系統）欄位說明（主選單/模組群組）

> **用途定位**：主選單（Menu Group / Module）主檔，像「Pattern/Marker」這種第一層模組。  
> **主鍵(PK)**：`PKey`  
> **與 MenuDetail 關係**：`MenuDetail.UKey` 很高機率對應 `Menu.PKey`（你提供的例子：`MenuDetail.UKey=15` 對上 `Menu.PKey=15`，且 `MenuName=Pattern/Marker`，合理）

## 欄位描述

| 欄位 | 類型(推測) | 必填 | 意義/用途 | 轉新DB建議對應 |
|---|---|---:|---|---|
| PKey | int | Y | **主選單/模組主鍵**（MenuGroupId）。 | `MenuGroups.Id` 或 `Menus.Id`（若你把主選單也當 Menu） |
| MenuNo | int | N | 主選單代碼/排序號（例：4）。多用於排序或顯示編號。 | `SortOrder` 或 `CodeNo` |
| MenuName | nvarchar | Y | 主選單名稱（例：`Pattern/Marker`）。 | `MenuGroups.Name` |
| IsSubMenu | bit/int | N | 是否為子選單群組（0=主選單）。語意需跟你們 UI 實作確認。 | `IsSubMenuGroup` |
| ForMISOnly | bit/int | N | 此主選單是否僅 MIS 可見。 | `ITOnly`（或改由權限控制） |
| AddName | nvarchar | N | 建立者。 | `CreatedBy` |
| AddDate | datetime | N | 建立時���。 | `CreatedAt` |
| EditName | nvarchar | N | 最後修改者。 | `UpdatedBy` |
| EditDate | datetime | N | 最後修改時間。 | `UpdatedAt` |

## 推導出的關聯（依你貼的資料）
- `MenuDetail.UKey` → `Menu.PKey`  
  例：`MenuDetail(PKey=56).UKey=15` 對應 `Menu(PKey=15, MenuName=Pattern/Marker)`