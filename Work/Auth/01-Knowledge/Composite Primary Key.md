---
project: Auth
tags: [knowledge, db, auth]
aliases: [複合主鍵, Compound Key, 複合PK]
created: 2026-02-27
---

# Composite Primary Key（複合主鍵）

## 一句話定義
當單一欄位無法唯一識別一筆資料時，用**兩個以上欄位組合**作為 [[Primary Key]]。

## 為什麼重要
- 天然防止重複（不需額外 UNIQUE 約束）
- 語意清楚：PK 本身就表達了業務規則
- 查詢/更新/刪除時必須帶齊所有 PK 欄位，否則定位不到正確資料

## 核心觀念

### 對 CRUD 的影響
- **Create**：組合已存在 → PK violation
- **Read**：`WHERE UserId = ? AND GroupCode = ?`（必須帶齊全部 PK 欄位）
- **Update / Delete**：WHERE 條件必須包含所有 PK 欄位
- **EF Core 設定**：
  ```csharp
  entity.HasKey(e => new { e.UserId, e.GroupCode });
  ```
  漏掉任一欄位，EF 會報錯或行為異常

### 複合 PK vs 代理鍵 + UNIQUE

| 方案 | 優點 | 缺點 |
|---|---|---|
| 複合 PK | 天然防重、語意清楚 | FK 引用需多欄位 |
| 代理鍵 + UNIQUE | FK 只需一個 ID | 額外維護唯一約束 |

## Auth 專案實例
- `AuthUserGroup`：PK = `(UserId, GroupCode)` — 同一人只能在同一群組出現一次
- `AuthUserOverride`：PK = `(UserId, ResourceKey, ActionCode)` — 同一人/同一資源/同一動作只能有一條覆寫
- `AuthRelationGrant`：選了代理鍵 `GrantCode` + [[Filtered Unique Index]]（另一種做法）

## 相關概念
- [[Primary Key]] — 複合 PK 是 PK 的一種形式
- [[Constraints]] — 複合 PK 本身兼具 UNIQUE 約束
- [[Filtered Unique Index]] — 代理鍵方案下的替代防重機制

## 參考來源
- 📎 `_10 使用者群組對應表(AuthUserGroup)` §設計邏輯（複合主鍵）
- 📎 `_08 個人覆寫表(AuthUserOverride)` §三 PK 設計
- 📎 BasicDBTransaction-JuniorLevel §12（複合主鍵）
