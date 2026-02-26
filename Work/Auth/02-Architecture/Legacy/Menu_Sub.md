# Trade.dbo.Menu_Sub（舊系統）欄位說明（子選單入口/快捷功能）

> **用途定位**：子選單（第二層）或快捷入口設定，包含顯示名稱、導向頁面/功能代碼、圖示、顏色等。  
> **主鍵(PK)**：你未提供（目前看起來不像有 PKey；可能是複合鍵或另有隱藏PK）。  
> **與 Menu（主選單）關係**：`MenuUkey` 應該對應 `Menu.PKey`（例：MenuUkey=4 → 可能是 `Menu.PKey=15`? 但你的樣本中 Menu.PKey=15、MenuNo=4，這裡要小心：Menu_Sub.MenuUkey 可能對 `Menu.MenuNo` 或對 `Menu.PKey`，需要用全表比對確認。）

## 欄位描述

| 欄位 | 類型(推測) | 必填 | 意義/用途 | 轉新DB建議對應 |
|---|---|---:|---|---|
| SubMenuUkey | int | Y | 子選單唯一鍵/識別碼（看起來像流水號：1,2,3...）。若表上沒 PK，這欄通常就是邏輯PK。 | `MenuItems.Id`（建議設為PK）或 `LegacySubMenuKey` |
| MenuUkey | int | Y | 所屬主選單鍵。**需確認是對 Menu.PKey 還是 Menu.MenuNo**。 | `MenuItems.MenuGroupId` |
| SubMenuSeq | int | N | 子選單排序（同一主選單下順序）。 | `SortOrder` |
| SubMenuName | nvarchar | Y | 子選單顯示名稱（例：`Purchase List`、`Greige Forecast`）。 | `MenuItems.DisplayName` |
| FilePath | nvarchar | N | 導向頁面/功能代碼（例：`UserSetting`、`T1T2Main`）。像是舊系統功能 key 或 route。 | `RouteName` / `Path` / `FeatureKey`（新系統建議統一） |
| ImgPath | nvarchar | N | 圖示路徑（例：`~/img/icon-settings.png`）。 | `IconUrl` |
| Color | nvarchar | N | 顏色主題（例：gray/yellow/blue）。 | `ThemeColor` |

## 你這份資料透露的設計意圖
- `Menu`：像模組群組（Pattern/Marker）
- `Menu_Sub`：模組底下的快捷入口（帶 icon/color），偏「導航用」
- `MenuDetail`：更細的「功能點（含表單類名、能力 CanNew/CanEdit...）」，偏「授權用」

也就是：**導航（Menu/Menu_Sub）** 與 **授權（MenuDetail/Pass2）** 在舊系統是兩套概念，可能只有部分欄位關聯。

## 遷移前必做驗證（很重要）
你提供的 `Menu` 範例：`PKey=15, MenuNo=4`  
`Menu_Sub` 有 `MenuUkey=4` 的資料��例如 Greige Forecast 那筆）

這會出現兩種可能：
1. `Menu_Sub.MenuUkey` 其實對的是 `Menu.MenuNo`
2. `Menu_Sub.MenuUkey` 對 `Menu.PKey`，只是你貼的 `Menu` 例子剛好不涵蓋 Menu.PKey=4 那筆

**建議你跑這段 SQL 來驗證：**

```sql
-- 驗證 Menu_Sub.MenuUkey 對應 Menu.PKey 還是 MenuNo
SELECT TOP 100
    ms.MenuUkey,
    m1.PKey AS MatchByPKey,
    m1.MenuNo AS MenuNoByPKey,
    m2.PKey AS MatchByMenuNo,
    m2.MenuNo AS MenuNoMatched,
    ms.SubMenuName
FROM Trade.dbo.Menu_Sub ms
LEFT JOIN Trade.dbo.Menu m1 ON m1.PKey = ms.MenuUkey
LEFT JOIN Trade.dbo.Menu m2 ON m2.MenuNo = ms.MenuUkey
ORDER BY ms.MenuUkey, ms.SubMenuSeq;
```

看 `MatchByPKey`、`MatchByMenuNo` 哪一個命中率高，就能定義正確外鍵。