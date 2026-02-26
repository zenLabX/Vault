# Trade.dbo.MenuDetail（舊系統）欄位說明（功能點/選單明細）

> **用途定位**：功能/選單/表單的「功能點主檔」，定義功能代碼、顯示名稱、對應程式(Form)、以及此功能支援哪些動作（能力）。  
> **主鍵(PK)**：`PKey`

## 欄位描述

| 欄位 | 類型(推測) | 必填 | 意義/用途 | 轉新DB建議對應 |
|---|---|---:|---|---|
| PKey | int | Y | **功能點主鍵**（MenuId）。被 `Pass2.FKMenu` 引用。 | `Menus.MenuId` 或 `Features.Id` |
| UKey | int | N | 上層選單/群組的鍵（很可能對應另一張 MenuHeader/MenuBar 表）。用來組樹狀選單。 | `Menus.ParentId` 或 `MenuGroups.Id`（需補上層表才能定案） |
| BarNo | int | N | 選單排序/所在列/分組序號（推測與 UI 選單排列相關）。 | `Menus.SortOrder` |
| ObjectCode | int | N | 功能物件代碼（0/其他）。可能表示模組類別或權限物件分類。 | `Menus.ObjectCode`（或 enum） |
| BarPrompt | nvarchar | Y | 選單顯示文字（例如 `B01. SizeSetList`）。 | `Menus.DisplayName` 或 `Menus.Code + Name` |
| FormName | nvarchar | N | 對應的程式入口（舊系統可能是 WinForm 類名，例如 `Sci.Sample.Basic.B04`）。 | 新系統對應 `Controller/Action/Route` 或 `FeatureKey` |
| FormParameter | nvarchar | N | 開啟表單時的參數（字串）。 | `Menus.RouteParams` 或 JSON |
| ForMISOnly | bit/int | N | 是否僅 MIS 可用（功能層級限制）。 | `Menus.ITOnly`（bool）或改由角色權限管理 |
| CanNew | bit/int | N | 功能本身是否支援「新增」動作（能力）。 | `MenuCapabilities.CanCreate` |
| CanEdit | bit/int | N | 支援修改。 | `MenuCapabilities.CanUpdate` |
| CanDelete | bit/int | N | 支援刪除。 | `MenuCapabilities.CanDelete` |
| CanPrint | bit/int | N | 支援列印。 | `MenuCapabilities.CanPrint` |
| CanConfirm | bit/int | N | 支援確認。 | `MenuCapabilities.CanConfirm` |
| CanUnConfirm | bit/int | N | 支援反確認。 | `MenuCapabilities.CanUnconfirm` |
| CanSend | bit/int | N | 支援送出。 | `MenuCapabilities.CanSend` |
| CanRecall | bit/int | N | 支援撤回。 | `MenuCapabilities.CanRecall` |
| CanCheck | bit/int | N | 支援覆核。 | `MenuCapabilities.CanCheck` |
| CanUnCheck | bit/int | N | 支援反覆核。 | `MenuCapabilities.CanUncheck` |
| CanClose | bit/int | N | 支援結案。 | `MenuCapabilities.CanClose` |
| CanUnClose | bit/int | N | 支援反結案。 | `MenuCapabilities.CanUnclose` |
| CanReceive | bit/int | N | 支援接收。 | `MenuCapabilities.CanReceive` |
| CanReturn | bit/int | N | 支援退回。 | `MenuCapabilities.CanReturn` |
| CanJunk | bit/int | N | 支援作廢。 | `MenuCapabilities.CanVoid` |
| CanUnJunk | bit/int | N | 支援反作廢。 | `MenuCapabilities.CanUnvoid` |

## 舊系統與 Pass2 的關係（很關鍵）
- `MenuDetail` 定義「**功能能做什麼**」（能力）
- `Pass2` 定義「**角色被允許做什麼**」（授權）
- 新系統建議最終權限：`能力 AND 授權`

## 遷移注意事項
1. `UKey/BarNo/ObjectCode` 的真正語意通常要搭配上層選單表才完整（你如果補上層表，我可幫你把選單樹/模組分群也寫進欄位描述）。
2. `FormName` 在新系統（ASP.NET Core MVC）通常不再直接使用：建議建立 `FeatureKey`（例如 `Sample.SizeSetList`）再對應到路由。