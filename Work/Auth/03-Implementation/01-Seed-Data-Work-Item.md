---
project: Auth
tags: [implementation, seed, auth]
---

# Work Item — Seed Data（Legacy pass0/pass1/pass2 → New Normalized Auth）

## Context
- 來源會議：[[Auth/04-Meetings/2026-02-23-Seed-Data-Discussion]]
- 目的：建立與 ERP.Trade B01（或會議確認的目標場景）正相關的 seed data，用於後續串接/驗證正確性。

## Scope
- In-scope（先寫最小可驗證範圍）
  - 以「可驗證串接」為目的的一組 seed data（最少資料量、但能走完整流程）
  - 從舊系統 `pass0/pass1/pass2` 拆解/轉化成新系統正規化資料
- Out-of-scope（先不做）
  - 全量搬遷
  - 歷史資料清洗與例外修補（除非會議決議納入）

## Definition of Done（DoD）
- Seed data 已能在新系統環境成功寫入（或可由 migration/seed script 成功匯入）
- 可用既定的驗證方式（API / SQL / UI / integration flow）重現並驗證關鍵行為
- 轉換規則（mapping）有文件化：可追溯到 `pass0/pass1/pass2` 的來源欄位與規則

## Tasks（#auth）
- [ ] 確認 Seed Data 的驗證目標場景（例如 ERP.Trade B01 的哪條串接/哪個驗證點） #auth
  status:: backlog
  priority:: medium
  due:: 2026-02-24
- [ ] 取得舊系統 pass0/pass1/pass2 schema（欄位、PK/FK、索引、範例資料） #auth
  status:: backlog
  priority:: medium
  due:: 2026-02-25
- [ ] 定義新系統 seed data 最小集合（哪些角色/資源/動作/主體/關聯一定要有） #auth
  status:: backlog
  priority:: medium
  due:: 2026-02-25
- [ ] 撰寫 Legacy→New 的 mapping 規格（含轉換規則、去重策略、缺值策略） #auth
  status:: backlog
  priority:: medium
  due:: 2026-02-26
- [ ] 依 ER Diagram 決定匯入順序並產出 seed data（或 seed script） #auth
  status:: backlog
  priority:: medium
  due:: 2026-02-27
- [ ] 用串接驗證流程驗證 seed data 正確性（紀錄結果與差異） #auth
  status:: backlog
  priority:: medium
  due:: 2026-02-28

---

# Legacy Tables 拆解與轉換規格（可直接填寫）

## 0) 你要先釘死的 5 件事
- **Business Key**：舊系統用什麼欄位代表「同一個使用者/群組/角色/資源/動作」？
- **資料粒度**：pass0/1/2 各自一筆資料代表「什麼」？（一個人？一個權限？一組關聯？）
- **去重策略**：同一個 business key 出現多筆時，保留哪筆？（最新、有效狀態、優先序）
- **缺值策略**：必要欄位缺值怎麼補？（拒絕、預設值、回填、另開對照表）
- **驗證方式**：轉完後怎麼證明對？（行為驗證優先，其次才是筆數對帳）

## 1) pass0（來源表 1）
### 1.1 表意與鍵
- 表用途（一句話）：
- PK：
- 候選 business key（若無 PK 可用）：
- 重要欄位：
- 常見狀態欄位（啟用/停用/刪除/有效日）：

### 1.2 抽取（Extract）
- 篩選條件（例如：只抓 B01 相關、只抓啟用、只抓某日期區間）：
- 欄位標準化（trim/upper/lower/型別轉換/日期格式）：

### 1.3 轉換（Transform）
- 去重規則：
- 缺值處理：
- 需要建立的對照表（例如 legacy_code → new_id）：

### 1.4 載入（Load）到新系統
> 依你目前 ER Diagram，常見匯入順序會先建立主表，再建 mapping 表。

順序會是「主表 → 關聯表」（例如 Principal/Role/Resource/Action 建好後，再建 PrincipalRole、Grant、UserGroup、Override）

- 目標表候選（擇一或多個，依實際欄位確認）：
  - AuthPrincipalUser
  - AuthPrincipalGroup
  - AuthRole
  - AuthResource
  - AuthAction

### 1.5 Mapping 表（填寫範本）
| legacy_table | legacy_column | meaning | transform_rule | target_table | target_column | note |
|---|---|---|---|---|---|---|
| pass0 |  |  |  |  |  |  |

## 2) pass1（來源表 2）
### 2.1 表意與鍵
- 表用途（一句話）：
- PK：
- 候選 business key：

### 2.2 抽取（Extract）
- 篩選條件：
- 需要 join 的表/欄位：

### 2.3 轉換（Transform）
- 對應關聯類型（先描述「關聯」再談欄位）：
  - Principal ↔ Role？
  - Role ↔ Resource/Action？
  - User ↔ Group？

### 2.4 載入（Load）到新系統
- 目標表候選：
  - AuthRelationPrincipalRole
  - AuthRelationGrant
  - AuthUserGroup

### 2.5 Mapping 表（填寫範本）
| legacy_table | legacy_column | meaning | transform_rule | target_table | target_column | note |
|---|---|---|---|---|---|---|
| pass1 |  |  |  |  |  |  |

## 3) pass2（來源表 3）
### 3.1 表意與鍵
- 表用途（一句話）：
- PK：
- 候選 business key：

### 3.2 轉換（Transform）
- 如果 pass2 是「例外/覆寫/黑白名單」類資料：
  - 規則優先序：Override > Grant > Role default（或會議定義的優先序）
  - 生效範圍：user-level / group-level / resource-level / action-level

### 3.3 載入（Load）到新系統
- 目標表候選：
  - AuthUserOverride
  - AuthTokens（若 pass2 含 token/連線資訊才納入）

### 3.4 Mapping 表（填寫範本）
| legacy_table | legacy_column | meaning | transform_rule | target_table | target_column | note |
|---|---|---|---|---|---|---|
| pass2 |  |  |  |  |  |  |

---

# Seed Data 產出位置
- 內容/清單放在：[[Auth/99-Seed/seed-data]]
- 轉換規則與決策放在本檔（方便回溯）
