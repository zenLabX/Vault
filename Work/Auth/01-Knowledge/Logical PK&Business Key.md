---
project: Auth
tags: [knowledge, db, auth]
---

# DB 知識模板 — Auth

## 目標
- DB / Schema / Index / Consistency / Migration 的可複製筆記模板

## 核心概念

### Physical PK（實體主鍵 / Entity PK）
- 定義：資料庫層級用來唯一識別資料列的鍵（偏「系統內部身分證」）
- 常見形式：`INT IDENTITY`、UUID（例如以 `NVARCHAR(40)` 存放）
- 主要用途：
  - 效能：作為索引與 JOIN 的核心鍵，讓資料存取穩定且快速
  - 關聯穩定：FK 使用流水號/UUID，就算業務代碼改名也不影響關聯
- 例（規格書語境）：
  - `AuthAction.ActionId`
  - `AuthRole.RoleId`
  - `AuthPrincipalGroup.GroupId`

### Logical PK（邏輯主鍵 / Business Key）
- 定義：開發與業務溝通真正使用的「有語意代碼」（偏「業務名稱/代碼」）
- 常見形式：具語意字串（如 `ADMIN`、`VIEW`、`CUT_TEAM_A`）
- 主要用途：
  - 可讀性：程式碼傾向寫 `Check("VIEW")` 而非 `Check(10)`
  - 跨系統整合：交換權限/角色資料時，`RoleCode` 等業務代碼比隨機 UUID 更好對接
- 例（規格書語境）：
  - `ActionCode`：標準化動作代碼（如 `VIEW`, `CREATE`）
  - `RoleCode`：角色代碼（如 `ADMIN`, `PLANNER`）
  - `GroupCode`：群組代碼（如 `CUT_TEAM_A`）
  - `ResourceKey`：資源全域唯一鍵（如 `PMS:ORDER_FORM`）

### 為什麼要分開（雙主鍵的架構價值）
- 「名」與「身」分離：業務代碼可改名（改 Logical PK）但資料庫關聯不動（靠 Physical PK）
- 開發/營運可讀：像授權設定表（例：`AuthRelationGrant`）若直接存 `RoleCode`、`ResourceKey`、`ActionCode`，用 SQL/Excel 也能看懂權限矩陣，減少為了「看懂數字 ID」而層層 JOIN
- 防錯與保護：核心 `ActionCode`（如 `VIEW`）常會被程式硬編碼引用，規格書可要求「禁止/限制修改」以避免誤改造成權限邏輯崩壞

> 結論：Physical PK 給資料庫（效能、穩定關聯）；Logical PK 給人（語意、可讀、好整合）。

## Entity / Table 清單
- 

## 關聯（Relationships）
- 

## 索引與查詢（Index & Query）
- 

## 一致性與交易（Consistency & Transactions）
- 

## 遷移策略（Migrations）
- 

## 風險
- 

## Tasks（#auth）
- [ ] 任務內容 #auth
  status:: backlog
  priority:: medium
  due::
