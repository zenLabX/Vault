# BasicDBTransaction（PK/FK + CRUD + Transaction 基礎知識說明書）

日期：2026-02-27

這份文件是給 junior 後端的「關聯式資料庫基本功」總體介紹：
- 你在寫 CRUD（Create/Read/Update/Delete）時，PK/FK 會如何影響正確性與安全性
- 為什麼需要 Transaction（交易）與併發控制（例如 SQL Server 的 `ROWVERSION`）
- 業界常見的約束（UNIQUE/CHECK/DEFAULT）、刪除策略（Restrict/Cascade/Soft delete）、索引與查詢效能注意事項

本文刻意不談太多業務規則，但會用你專案規格書裡的三張表當例子：
- `AuthRole`（角色主檔）
- `AuthRelationPrincipalRole`（主體↔角色 指派關聯）
- `AuthRelationGrant`（角色↔資源/動作 授權矩陣）

> 假設情境：你使用 SQL Server + EF Core（你專案看起來是這個組合），但原理也適用於多數關聯式 DB。

---

## 1. 先建立一個正確的心智模型：資料完整性是「DB + 程式」一起守

關聯式資料庫的核心價值不是「存資料」而已，而是：
- 用 **PK（Primary Key）** 確保「一筆資料唯一」
- 用 **FK（Foreign Key）** 確保「關聯必定存在」
- 用 **Constraints（約束）** 確保「資料永遠在合理範圍」

業界普遍的觀念是：
- **能在 DB 層保證的規則，就不要只靠程式碼保證**（因為程式會改、會漏、會有多個寫入來源）
- **程式碼的責任**是：把 DB 拒絕的情況轉成「使用者看得懂的業務錯誤」，並用 Transaction/併發控制讓行為可預測

> 📎 參考來源：`權限系統架構總覽` 全文、`_02 角色主檔(AuthRole)` §四 CRUD 守則、`ERP.CommonLib/Data/AuthDbContext.cs` 檔頭規範宣告

---

## 2. PK（Primary Key）到底在保證什麼？

### 2.1 PK 的基本定義
PK 是一個（或多個）欄位，滿足：
- `NOT NULL`
- `UNIQUE`
- 能唯一識別一筆 row

你可以把 PK 想成「資料表的身分證」。

### 2.2 兩種常見 PK：自然鍵（Natural Key）與代理鍵（Surrogate Key）

- **自然鍵**：可讀、業務上有意義，例如 `RoleCode = 'ADMIN'`
  - 優點：好查、好對人溝通
  - 缺點：如果你允許修改（rename），就會引發巨大連鎖更新風險

- **代理鍵**：純技術用的唯一 ID，例如 `GrantCode = GUID`、`PrincipalRoleCode = GUID`
  - 優點：穩定、不需要改；關聯更新成本低
  - 缺點：對人不直覺，通常還需要搭配一個業務唯一碼（UNIQUE）

### 2.3 用你這套表當例子
從你提供的 DB 規格書來看：
- `AuthRole`
  - 規格書在文字上同時提到 `RoleCode` 是 PK、也把 `RoleId` 描述成「實體 PK」——這是常見的規格矛盾。
  - **但是所有關聯（指派/授權）都用 `RoleCode` 作 FK**，表示「關聯世界」把 `RoleCode` 當核心 key。
- `AuthRelationPrincipalRole`
  - `PrincipalRoleCode` 是 PK（代理鍵）
  - 同時有 `RelationCode`（業務唯一碼）
- `AuthRelationGrant`
  - `GrantCode` 是 PK（代理鍵）
  - 同時用 UNIQUE 規則避免「同一 Role/Resource/Action 的重複規則」

> 實務建議：被大量 FK 參照的 key（像 `RoleCode`）要盡量「不可變」。一旦可變，就會遇到更新連鎖、鎖表、與資料不一致風險。

> 📎 參考來源：`_02 角色主檔(AuthRole)` §二 欄位清單（RoleId/RoleCode）、`_04 主體角色關聯(AuthRelationPrincipalRole)` §二 欄位清單、`_07 授權設定表(AuthRelationGrant)` §二 欄位清單

---

## 3. FK（Foreign Key）在 CRUD 時真正造成的影響

FK 是用來保證：子表（child）引用的父表（parent）一定存在。

以你們的權限表為例：
- `AuthRelationPrincipalRole(RoleCode)` 必須對到一筆 `AuthRole(RoleCode)`
- `AuthRelationGrant(RoleCode)` 必須對到一筆 `AuthRole(RoleCode)`

### 3.1 Create（新增）時：先父後子
如果 FK 存在：
- 你必須先 insert `AuthRole`，才能 insert `AuthRelationGrant`
- 如果你反過來做，DB 會直接拒絕（FK violation）

### 3.2 Update（更新）時：最危險的是「更新被參照的 key」
如果你更新的是一般欄位（例如 `RoleName`）：通常沒問題。

但若你嘗試更新父表的被參照欄位（例如把 `RoleCode` 從 `ADMIN` 改成 `ADMIN2`）：
- 如果 FK 沒開 cascade update（大多不建議），那 DB 會拒絕
- 如果你硬要 cascade update，會造成大量資料更新、鎖表、與同步風險（尤其在大表）

所以業界常見作法是：
- **對外關聯使用的欄位，視為 immutable（不可變）**
- 真要改名稱：新增新 role，再做遷移（或提供 mapping），最後停用舊的

### 3.3 Delete（刪除）時：FK 會逼你做選擇（Restrict vs Cascade）
刪除父表 row（例如刪掉某個 Role）時，若仍有子表引用：
- **Restrict/No Action（常見預設）**：DB 直接拒絕刪除
- **Cascade**：DB 會幫你把所有子表資料一起刪掉

在權限系統裡，多數架構師會傾向：
- 不要 cascade 直接物理刪除（風險極高）
- 改用 **Soft delete（`IsActive=0`）** 或有效期（`ValidTo`）來「失效」

你們的 DB 規格書也明確寫了：
- 刪除 `AuthRole` 前要先檢查是否仍有 `AuthRelationPrincipalRole` 關聯
- 萬人系統不建議物理刪除，優先 `IsActive=0`

> 📎 參考來源：`_02 角色主檔(AuthRole)` §三 關聯地圖 + §四 刪除禁令、`_07 授權設定表(AuthRelationGrant)` §六 SQL Script（FK 定義）、`_04 主體角色關聯(AuthRelationPrincipalRole)` §四 刪除策略

---

## 4. 什麼是 Transaction（交易）？為什麼 CRUD 不是「一行 SQL」就夠

### 4.1 ACID 是業界基本詞彙
- **Atomicity（原子性）**：要嘛全成功，要嘛全失敗
- **Consistency（一致性）**：交易前後都滿足約束
- **Isolation（隔離性）**：同時交易不互相污染
- **Durability（持久性）**：Commit 後不會說沒就沒

### 4.2 什麼情況一定要用交易（Transaction）
只要你的操作「跨多張表」或「多步驟」就該考慮：

例子 A：建立角色後，立刻建立預設授權
1) Insert `AuthRole`
2) Insert 多筆 `AuthRelationGrant`

如果第 2 步失敗（例如 UNIQUE 規則衝突、JSON 不合法、或 FK 不存在），你通常不希望第 1 步留下來變成半套資料。

例子 B：Hard delete（真的要刪）前的檢查 + 刪除
1) 查 references count（PrincipalRole/Grant 有沒有 active）
2) 若為 0 才 delete

如果你不包交易，在高併發下可能發生：
- 你剛查完 count = 0
- 下一秒別人新增了一筆 grant
- 你繼續 delete → 造成不一致（或 DB 拒絕）

### 4.3 EF Core 的交易觀念（很重要）
- 單次 `SaveChanges()` 本身會在 DB 端以交易方式提交（通常是）
- 但**多次 `SaveChanges()`**、或你要把「查 + 改 + 刪」包成一個不可被插隊的單元，就要用顯式交易

> 重點：交易不是越多越好。交易越大，鎖越久，越可能死鎖、逾時。

> 📎 參考來源：`_02 角色主檔(AuthRole)` §四 刪除禁令（guardrail 需 transaction）、`_05 資源主檔(AuthResource)` §四 Lineage Maintenance（移動節點必須封裝在 Transaction）

---

## 5. 併發（Concurrency）：為什麼你需要 `RowVersion`（Optimistic Lock）

### 5.1 你一定會遇到的問題：Lost Update（更新被覆蓋）
兩個管理員同時編輯同一筆資料：
- A 把 `RoleName` 改成「採購主管」
- B 把 `Priority` 改成 10

如果沒有併發控制，最後誰晚送出誰贏，另一個人的修改會被悄悄覆蓋掉。

### 5.2 業界常用：Optimistic Concurrency（樂觀鎖）
SQL Server 的 `ROWVERSION` 是典型做法：
- 每次 row 被更新，`RowVersion` 都會自動變
- API 更新時要帶上「你看到的那個 RowVersion」
- DB 會檢查：你更新時 DB 裡的 RowVersion 是否仍相同
  - 相同：更新成功
  - 不同：代表有人先改過 → 回報衝突（常見是 HTTP 409）

### 5.3 Update/Delete 都應該帶 RowVersion
很多人只在 Update 做併發控制，但 Delete 其實也需要：
- 你看到的資料可能已經被別人改成停用、或改了關鍵欄位
- 你仍然去刪除，會造成非預期行為

你們規格書也明確要求：更新角色時必須檢查 RowVersion。

> 📎 參考來源：`_02 角色主檔(AuthRole)` §四 併發處理、`_01 AuthPrincipalUser` §四 Update 規範（RowVersion WHERE 條件）、`_04 主體角色關聯(AuthRelationPrincipalRole)` §四 RowVersion 檢查

---

## 6. Soft delete（軟刪除）vs Hard delete（物理刪除）

### 6.1 兩者差異
- **Hard delete**：`DELETE FROM ...`
  - 優點：資料真的消失
  - 缺點：
    - FK 參照會阻擋（除非 cascade）
    - 可能造成大鎖、逾時
    - 失去稽核/追溯能力

- **Soft delete**：用欄位表示失效，例如 `IsActive=0` 或 `ValidTo=NOW`
  - 優點：
    - 不破壞關聯完整性
    - 可保留歷史、易稽核
    - 可以「復原」
  - 缺點：
    - 所有查詢都要記得過濾（例如只看 active）
    - UNIQUE 規則可能要搭配 filtered unique index（只限制 active）

### 6.2 你們權限表的「active」定義（非常實務）
從架構總覽規格：
- 物理過濾（Filtering）建議為：`IsActive = 1` 且 Now 落在 `[ValidFrom, ValidTo]`
- 適用於 `AuthRelationPrincipalRole`、`AuthRelationGrant` 等關聯表

> 實作上：你在寫查詢、做 guardrail count，都要想清楚到底要不要把有效期算進去。

> 📎 參考來源：`_01 AuthPrincipalUser` §四 嚴禁物理刪除、`_02 角色主檔(AuthRole)` §四 刪除禁令、`權限系統架構總覽` 權限決策引擎 §第一層 物理過濾（IsActive + ValidFrom/ValidTo）

---

## 7. Constraints（約束）是你最便宜的防線

### 7.1 常見約束類型
- `NOT NULL`：必填欄位
- `DEFAULT`：缺省值（例如 `IsActive default 1`）
- `CHECK`：資料範圍（例如日期區間、Effect 只能是 0/1）
- `UNIQUE` / `UNIQUE INDEX`：業務唯一性
- `FK`：關聯存在性

### 7.2 你們規格書裡的高品質約束例子
- `AuthRelationPrincipalRole` 的 XOR check（`UserId` 與 `GroupCode` 二選一）
  - 這種約束如果只靠程式碼檢查，遲早會被某次「漏檢」污染
- `AuthRelationGrant` 的日期 CHECK：`ValidFrom <= ValidTo`
- `AuthRelationGrant` 的 filtered unique index：
  - 在「無條件、無期限」的標準授權下，避免同 Role/Resource/Action 重複規則

> 📎 參考來源：`_04 主體角色關聯(AuthRelationPrincipalRole)` §三 XOR Check + Unique Indexes、`_07 授權設定表(AuthRelationGrant)` §三 日期 CHECK + Filtered Unique Index、`_08 個人覆寫表(AuthUserOverride)` §三 效果值 CHECK

---

## 8. Index（索引）與查詢效能：CRUD 的 R 會支配整體成本

### 8.1 你要先知道：讀取通常比寫入多很多
權限系統尤其極端：每個 API 呼叫都可能查授權，所以讀取效能決定系統上限。

### 8.2 複合索引與 Covering Index 的觀念
以規格書的 `IX_AuthGrant_Validation` 為例：
- 索引 key：`(ResourceKey, ActionCode, RoleCode)`
- include：`(Effect, ConditionJson, ValidFrom, ValidTo, IsActive)`

意思是：
- 你用 `WHERE ResourceKey = ? AND ActionCode = ? AND RoleCode IN (...)` 查詢時
- DB 可以只用索引就把需要的欄位取齊，不用回表（避免 Key Lookup）

### 8.3 JSON 欄位的效能陷阱
規格書也提醒：不要在 SQL 用 `JSON_VALUE(ConditionJson, ...)` 做 where 條件。
- 這通常會讓索引失效，變成全表掃描
- 比較實務的做法是：DB 回傳字串，應用層解析與判斷（或把常用條件正規化成欄位）

> 📎 參考來源：`_07 授權設定表(AuthRelationGrant)` §三 IX_AuthGrant_Validation / IX_AuthGrant_RoleView + §四 JSON 效能陷阱、`_05 資源主檔(AuthResource)` §三 IX_AuthResource_Tree / IX_AuthResource_Route

---

## 9. CRUD 實作時的「業界基本檢查清單」（偏通用，不依賴特定業務）

### 9.1 Create（新增）
- 先做必填欄位驗證（NOT NULL 對齊）
- 先檢查 UNIQUE（但要知道：**檢查不是保證**，真正保證是 DB UNIQUE；程式檢查只是為了回傳友善訊息）
- 建立子資料前，先確定父資料存在（FK）
- 多步驟新增請包 transaction

### 9.2 Read（查詢）
- 預設只撈 active（`IsActive=1`）與有效期內（如有）
- 列表一定要分頁（避免一次撈光）
- 先決定查詢路徑：
  - 以 RoleCode 查 grants → 用 `IX_AuthGrant_RoleView`
  - 以 Resource/Action/Role 查權限判斷 → 用 `IX_AuthGrant_Validation`

### 9.3 Update（更新）
- 帶 RowVersion（避免 lost update）
- 不要允許更新被大量 FK 參照的 key（例如 RoleCode）
- 若更新會影響快取/衍生資料，明確做 invalidation（規格書也要求）

### 9.4 Delete（刪除/失效）
- 預設優先 soft delete（`IsActive=0`），尤其是被大量關聯參照的主檔
- 真的要 hard delete：
  - 先做 guardrail（references count = 0）
  - guardrail 的「active」定義要一致（只看 IsActive？還要看有效期？）
  - 用 transaction 包住「檢查 + 刪除」
  - Delete 也要帶 RowVersion（避免刪到你沒看過的新狀態）

> 📎 參考來源：`_02 角色主檔(AuthRole)` §四 全部、`_07 授權設定表(AuthRelationGrant)` §四 寫入安全、`_01 AuthPrincipalUser` §四 所有 CRUD 守則、`權限系統架構總覽` 決策引擎第一層

---

## 10. 用你這套表做三個「實作級」小例子（理解用）

### 10.1 停用角色（建議取代刪除）
- 更新 `AuthRole.IsActive = 0`
- 依規格書：這應觸發快取失效（讓使用者權限立刻反映）

### 10.2 新增一筆授權（Grant）
新增 `AuthRelationGrant` 前，至少要保證：
- `RoleCode` 存在於 `AuthRole`
- `ResourceKey` 存在於 `AuthResource`
- `ActionCode` 存在於 `AuthAction`
- `ConditionJson`（若有）是合法 JSON（規格書要求）
- 不違反 UNIQUE 規則（無條件/無期限的標準授權不可重複）

### 10.3 物理刪除角色（不建議，但你要懂它怎麼安全地做）
一個安全的做法通常是：
1) transaction begin
2) 以一致的 active 規則去 count：
   - 是否存在 active 的 `AuthRelationPrincipalRole` 參照
   - 是否存在 active 的 `AuthRelationGrant` 參照
3) 若 count > 0：rollback，回傳業務錯誤（例如「仍有指派/授權，禁止刪除」）
4) 若 count = 0：才 delete role（同時 Delete 也建議檢查 RowVersion）
5) commit

> 若 DB 有 FK 且是 Restrict，步驟 4 在有參照時會直接失敗；你仍應該做步驟 2/3，因為「友善錯誤訊息」與「可控流程」是 API 的責任。

> 📎 參考來源：`_02 角色主檔(AuthRole)` §四 刪除禁令 + §四 併發處理、`_07 授權設定表(AuthRelationGrant)` §六 FK 定義 SQL

---

## 11. 常見錯誤訊號（你日後遇到可以快速定位）

- **FK violation（外鍵衝突）**：通常是「先子後父」或「刪除父但子還在」
- **UNIQUE violation**：同一業務 key 重複（Race condition 下很常見）
- **DbUpdateConcurrencyException / HTTP 409**：RowVersion 不一致（有人先改了）
- **Deadlock / Timeout**：交易太大、鎖太久、索引不佳、或同時大量更新

> 📎 參考來源：通用 DB 知識（結合上述各章規格書參照情境歸納）

---

## 12. 複合主鍵（Composite PK）：一個欄位不夠用的時候

### 12.1 什麼是複合主鍵
當「單一欄位無法唯一識別」一筆資料時，你可以用兩個（或以上）欄位組成 PK。

### 12.2 你們專案的例子
- `AuthUserGroup`：PK = `(UserId, GroupCode)`
  - 意義：同一個人 (UserId) 只能在同一個群組 (GroupCode) 出現一次
  - 天生防止重複指派，不需額外 UNIQUE
- `AuthUserOverride`：PK = `(UserId, ResourceKey, ActionCode)`
  - 意義：同一個人、同一個資源、同一個動作，只能有一條覆寫規則
  - 三欄位組合確保邏輯上不會衝突

### 12.3 複合主鍵對 CRUD 的影響
- **Create**：Insert 時，如果兩欄位組合已存在，DB 會直接拒絕（PK violation）
- **Read**：查詢時必須提供「全部」PK 欄位才能精準定位
  - 正確：`WHERE UserId = ? AND GroupCode = ?`
  - 錯誤：只帶 `WHERE UserId = ?`（這會回傳多筆）
- **Update / Delete**：同理，WHERE 條件必須包含所有 PK 欄位
- **EF Core 設定**：
  ```csharp
  entity.HasKey(e => new { e.UserId, e.GroupCode });
  ```
  必須用匿名物件指定；漏掉任何一個欄位 EF 會報錯或行為異常

### 12.4 複合 PK vs 代理鍵 + UNIQUE 兩種做法
- 複合 PK：天然防重、語意清楚、不需額外流水號
- 代理鍵 + UNIQUE：更簡單的 FK 引用（只要一個 ID），但需額外維護唯一約束

> 實務上沒有絕對對錯。你們的 `AuthRelationGrant` 選了代理鍵（`GrantCode`）+ filtered unique index；`AuthUserGroup` 則直接用複合 PK。

> 📎 參考來源：`_10 使用者群組對應表(AuthUserGroup)` §設計邏輯說明（複合主鍵）、`_08 個人覆寫表(AuthUserOverride)` §三 PK 設計、`ERP.CommonLib/Data/AuthDbContext.cs` HasKey 設定

---

## 13. 自我參照 FK（Self-referencing FK）：樹狀結構

### 13.1 概念
一張表的某個 FK 指向自己的 PK。最常見的場景：選單樹、組織架構、資源階層。

### 13.2 你們的例子：`AuthResource`
- `ParentResourceKey`（FK）→ `ResourceKey`（PK），同一張表
- 根節點的 `ParentResourceKey = NULL`
- 規格書設計了 `Path`（物化路徑，如 `/ROOT/PMS/ORDER/BTN_SAVE/`）來加速子樹查詢

### 13.3 實作注意事項

**新增**：
- 新增子節點前，父節點必須已存在
- 根節點沒有父，所以通常第一筆先 insert 進去

**更新**：
- 移動節點（改 `ParentResourceKey`）要防止**循環參照（Circular Reference）**
  - 例如：A 是 B 的父 → 你把 B 設成 A 的父 → 無窮迴圈
  - 規格書要求：「更新前檢查目標父節點的 Path 是否包含自己」
- 移動後，該節點與「所有子孫」的 `Path` 都要重算 → 必須包在 Transaction 裡

**刪除**：
- 規格書要求：「嚴禁直接刪除非葉節點」（會讓所有子節點變孤兒）
- 安全做法：先確認 `IsLeaf = 1`，或先遞迴刪除/搬移所有子孫節點

**查詢**：
- `Path LIKE '/ROOT/PMS/%'` 可以一次撈出某模組下所有資源
- 如果沒有物化路徑，遞迴查詢（CTE）效能較差（越深越慢）

> 📎 參考來源：`_05 資源主檔(AuthResource)` §一 樹狀結構、§四 防循環參照 + 禁刪非葉節點 + Lineage 維護、§三 IX_AuthResource_Tree / IX_AuthResource_Lineage

---

## 14. XOR 約束（互斥欄位）：兩者只能填其一

### 14.1 什麼時候需要
當一筆資料可以關聯 A 或 B，但不能同時關聯兩者。

### 14.2 你們的例子：`AuthRelationPrincipalRole`
- `UserId`：指向使用者（nullable）
- `GroupCode`：指向群組（nullable）
- 規格書要求：**二選一（XOR）**
  ```sql
  CHECK (
    (UserId IS NOT NULL AND GroupCode IS NULL)
    OR
    (UserId IS NULL AND GroupCode IS NOT NULL)
  )
  ```
  → 每筆只能是「使用者指派」或「群組指派」

### 14.3 實作注意
- **DB 層**：用 CHECK constraint 強制。這是最可靠的。
- **程式層**：Create/Update 時也要驗證（提供使用者友善錯誤訊息）
- **查詢**：要注意兩個欄位其中一個永遠是 NULL
  - 查某使用者的角色：`WHERE UserId = ? AND UserId IS NOT NULL`
  - 查某群組的角色：`WHERE GroupCode = ? AND GroupCode IS NOT NULL`
- **索引**：規格書建議搭配 Filtered Unique Index（見下一節）

> 📎 參考來源：`_04 主體角色關聯(AuthRelationPrincipalRole)` §三 XOR CHECK + 篩選唯一索引（User-Role-AppCode / Group-Role-AppCode）

---

## 15. Filtered Unique Index（篩選唯一索引）

### 15.1 一般的 UNIQUE vs Filtered UNIQUE
- 一般 UNIQUE：「整張表裡，這個欄位（組合）不能重複」
- Filtered UNIQUE：「只在特定條件下，這個欄位（組合）不能重複」

### 15.2 你們的例子
`AuthRelationGrant` 的避免重複規則：
```sql
CREATE UNIQUE NONCLUSTERED INDEX UX_AuthGrant_UniqueRule
ON dbo.AuthRelationGrant(RoleCode, ResourceKey, ActionCode)
WHERE ConditionJson IS NULL AND ValidFrom IS NULL AND ValidTo IS NULL;
```
意思：「標準授權」（無條件、無期限）只允許一筆；但「帶條件的」或「有時間限制的」可以多筆。

### 15.3 為什麼不用一般 UNIQUE？
因為實際上同一個 Role + Resource + Action 組合，可能有：
- 一筆「全域 Allow」（無條件）
- 一筆「限工廠 A」（帶 ConditionJson）
- 一筆「2024 年暫時開放」（帶 ValidFrom/ValidTo）

> Filtered Unique Index 是 SQL Server 特有功能（PostgreSQL 有類似的 partial unique index）。如果你用 MySQL 則需用其他方式（如 trigger 或程式碼）模擬。

> 📎 參考來源：`_07 授權設定表(AuthRelationGrant)` §三 避免重複規則 UX_AuthGrant_UniqueRule + §六 SQL Script

---

## 16. 雙 Key 模式：Identity 流水號 + 業務主鍵並存

### 16.1 為什麼很多表同時有兩個「唯一」欄位？
你們的表常常出現：
- `AuthAction`：`ActionId`（INT IDENTITY，自動遞增）+ `ActionCode`（NVARCHAR，PK）
- `AuthPrincipalGroup`：`GroupId`（INT IDENTITY）+ `GroupCode`（NVARCHAR，PK）
- `AuthRole`：`RoleId`（NVARCHAR）+ `RoleCode`（NVARCHAR，PK）

### 16.2 它們各自的用途
- **業務 PK（如 `RoleCode`）**：可讀、給人看、給關聯表用
- **流水號（如 `ActionId`）**：
  - 效能最佳化（INT 佔空間小、索引效率高）
  - 未來如果需要 INT 型 FK（某些舊系統或跨 DB 整合），可以用
  - DB 內部 clustered index 通常以 INT 遞增做 key 更不容易碎片化

### 16.3 實務注意
- 程式對外溝通（API、URL）一律用業務 PK（`RoleCode`）
- 只有 DB 內部最佳化或跨系統整合才考慮用流水號
- 兩者的 UNIQUE 約束都要建立，否則流水號失去意義

> 📎 參考來源：`_02 角色主檔(AuthRole)` §二 RoleId/RoleCode 雙 key、`_03 使用者群組(AuthPrincipalGroup)` §二 GroupId/GroupCode、`_06 操作動作表(AuthAction)` §二 ActionId/ActionCode

---

## 17. DB-first vs Code-first：你們專案的選擇與影響

### 17.1 兩種主流策略
- **Code-first**：在 C# Entity/Fluent API 裡定義欄位、FK、Index → EF Migration 幫你建表
- **DB-first**：DBA 或規格書定義 Schema → 程式碼只映射（map）

### 17.2 你們的架構抉擇
你們的 `AuthDbContext` 檔頭有一段明確的規範宣告：
- OnModelCreating **只允許** `ToTable()` + `HasKey()` + `IsRowVersion()`
- **嚴格禁止**：`HasOne/HasMany`（FK 導航）、`HasIndex`、`HasMaxLength`、`DeleteBehavior` 等
- 理由：「本專案採 DB-first 原則，所有 Schema 決策由資料庫負責」

### 17.3 對你日常開發的具體影響
- 你改表結構，要去改 DB（不是改 C#）
- EF 不會幫你建 FK、Index、CHECK — 這些全部在 DB 端管
- EF 的 Entity 只是「資料搬運工」，不負責結構正確性
- FK violation 會以 `DbUpdateException` 的形式出現（不是 EF 的驗證錯誤），你要在程式碼裡 catch 並轉成友善訊息
- Navigation Property（`entity.Roles`、`entity.Grants`）在你們專案裡**不存在**，你要手動 join 或分次查詢

> 這個選擇對大型系統是常見的：DB Schema 的生命週期通常比程式長很多，交給 DBA 管比較穩。

> 📎 參考來源：`ERP.CommonLib/Data/AuthDbContext.cs` 檔頭「ℹ️ DbContext Fluent API 使用規範」完整宣告 + OnModelCreating 實作

---

## 18. 高寫入表的資料保留與清理策略（TTL / Data Retention）

### 18.1 問題
某些表的資料會無限增長（例如 log、token、audit）。不清理就會：
- 磁碟空間炸掉
- 查詢變慢
- 索引碎片化嚴重

### 18.2 你們的例子：`AuthTokens`
- 萬人系統每天可能產生數萬筆 Token
- 規格書要求：Background Job 定期刪除 `ExpiresAt < NOW - 7天` 的過期資料
- 有專用清理索引：`IX_AuthTokens_Cleanup ON (ExpiresAt)`

### 18.3 業界標準做法
- **TTL Job（排程清理）**：定時（每小時/每天）批次刪除超過保留期的資料
- **分批刪除**：一次刪太多會鎖表。常見做法是每次只刪 N 筆（如 5000），loop 到刪完
  ```sql
  -- 每次刪 5000 筆，避免長時間鎖表
  DELETE TOP(5000) FROM AuthTokens
  WHERE ExpiresAt < DATEADD(DAY, -7, GETDATE());
  ```
- **Archive（歸檔）**：如果要保留歷史，先搬到歷史表再刪

### 18.4 哪些表需要注意
- `AuthTokens`：最明顯，量最大
- `AuthUserOverride`：規格書建議每月掃描 `ValidTo < NOW` 的過期資料
- 未來如果有 Audit Log 表，也一樣

> 📎 參考來源：`_09 權杖管理表(AuthTokens)` §四 TTL 策略 + §六 IX_AuthTokens_Cleanup、`_08 個人覆寫表(AuthUserOverride)` §四 定期清理機制

---

## 19. Hash-based Lookup（雜湊查詢）：效能關鍵技巧

### 19.1 問題
有些欄位值很長（例如 JWT token 可能超過 1KB），拿來做 WHERE 條件或索引會極度浪費 IO、CPU。

### 19.2 你們的例子：`AuthTokens.TokenHash`
- 規格書規定：所有查詢**禁止**直接 `WHERE Token = '...'`
- 正確做法：程式先算出 Token 的 SHA-256 hash（32 bytes），查 `WHERE TokenHash = @hash`
- 索引 `IX_AuthTokens_Hash ON (TokenHash)` 只有 32 bytes，極度高效

### 19.3 通用場景
- API Key、Session Token、長字串識別碼
- 任何「值太長不適合做索引 key」的欄位

### 19.4 實作要點
- Hash 演算法要一致（SHA-256 = 32 bytes），所有寫入/查詢都用同一個
- Hash 欄位必須建索引
- 原始值（Token）仍保留，但只用於「除錯/稽核時讀取」，不拿來搜尋

> 📎 參考來源：`_09 權杖管理表(AuthTokens)` §四 儲存優化策略（雜湊查詢原則）+ §三 IX_AuthTokens_Hash

---

## 20. AppCode 多系統隔離：查詢時必須帶的「隱形條件」

### 20.1 你們的權限系統支援多子系統
很多表都有 `AppCode` 欄位（如 PMS、APS、TRADE），用來標記「這筆資料只在某個子系統生效」。`NULL` 通常代表「全域」。

### 20.2 為什麼這跟 CRUD 有關
如果你的查詢沒帶 AppCode 過濾：
- 使用者在 PMS 系統會「看到」APS 的權限資料 → **權限污染**
- 規格書明確要求：查詢時必須 `WHERE (AppCode = 'PMS' OR AppCode IS NULL)`

### 20.3 涉及的資料表
- `AuthRelationPrincipalRole`：角色指派的系統範圍
- `AuthUserGroup`：群組歸屬的系統範圍
- `AuthPrincipalGroup`：群組本身隸屬的系統
- `AuthResource`：資源的系統歸屬

### 20.4 實作建議
- 在 Service 層的「基底查詢」就加上 AppCode 過濾，不要交給每個開發者自己記得
- 如果你用 EF Core，考慮用 Global Query Filter（但你們專案傾向 DB-first 不用 Fluent 設定，所以要在 Service 層統一處理）

> 📎 參考來源：`_03 使用者群組(AuthPrincipalGroup)` §四 AppCode 權限污染防護、`_04 主體角色關聯(AuthRelationPrincipalRole)` AppCode 欄位、`_10 使用者群組對應表(AuthUserGroup)` §四 AppCode 核對

---

## 21. 審計欄位（Audit Fields）：每張表都有的「四兄弟」

### 21.1 標準模式
你們的每張表都有：
- `CreatedBy`（NVARCHAR 50，NOT NULL，DEFAULT 'System'）
- `CreatedDate`（DATETIME，NOT NULL，DEFAULT GETDATE()）
- `ModifiedBy`（NVARCHAR 50，NULL）
- `ModifiedDate`（DATETIME，NULL）

### 21.2 CRUD 的影響
- **Create**：
  - `CreatedBy` = 當前操作者帳號（不是 'System'，除非真的是系統自動操作）
  - `CreatedDate` = 當前時間（通常讓 DB DEFAULT 處理，或程式統一填）
  - `ModifiedBy` / `ModifiedDate` = NULL
- **Update**：
  - **不可**覆蓋 `CreatedBy` / `CreatedDate`（這是建立時的紀錄，永遠不變）
  - 必須更新 `ModifiedBy` = 當前操作者、`ModifiedDate` = 當前時間
- **Delete**：
  - 如果是 soft delete（改 IsActive），同樣更新 ModifiedBy/ModifiedDate
  - 如果是 hard delete，稽核軌跡就沒了（這也是 soft delete 的好處之一）

### 21.3 常見踩坑
- 忘記填 `ModifiedBy` → 稽核時不知道誰改的
- 程式碼裡 hardcode `CreatedBy = "System"` → 所有操作都變成 System 做的，無法追責
- 多個 API 寫入同一張表，審計欄位的填寫邏輯不統一

> 📎 參考來源：全部 10 張規格書皆包含 Audit Fields（CreatedBy/Date、ModifiedBy/Date）、`_01 AuthPrincipalUser` §四 Update 規範（必須用 ModifiedBy/Date）

---

## 22. 連鎖反應與快取失效（Cascading Side-Effects）

### 22.1 問題
在權限系統中，改 A 表往往會影響 B、C、D 表的「有效狀態」。如果你只改了 DB 卻沒通知快取，使用者會以為權限沒變。

### 22.2 你們規格書提到的連鎖反應鏈
- 改 `AuthRole.IsActive` → 該角色下**所有使用者**的權限快取要失效
- 改 `AuthRelationPrincipalRole`（指派/取消角色）→ 該使用者的權限快取要失效
- 改 `AuthRelationGrant`（新增/修改授權）→ 該角色下所有使用者的快取要失效
- 改 `AuthUserGroup`（加入/退出群組）→ 該使用者的快取要失效
- 改 `AuthPrincipalUser.IsActive = 0`（停用帳號）→ 該使用者的 Token 要全部撤銷

### 22.3 業界做法
- **Redis 快取精準清除**：規格書建議 key 設計為 `Perm:{UserId}:{ResourceKey}:{ActionCode}`
  - 好處：只清受影響的 key，不整包刪
  - 壞處：需要知道「哪些 UserId 受影響」，可能要先查一次 DB
- **Pub/Sub 或 Event**：異動時發事件，快取訂閱者自己處理
- **定時過期 + 短 TTL**：最簡單但最不即時

### 22.4 對你的建議
- 先搞清楚「改這張表，會影響哪些人」
- 在 Service 層的寫入方法結尾，統一呼叫 cache invalidation
- 不要在 Controller 裡零散地清快取（容易漏）

> 📎 參考來源：`_02 角色主檔(AuthRole)` §四 快取失效 + IsAdmin 變更、`_04 主體角色關聯(AuthRelationPrincipalRole)` §四 快取連鎖失效、`_07 授權設定表(AuthRelationGrant)` §四 快取策略、`_10 使用者群組對應表(AuthUserGroup)` §四 快取一致性、`_01 AuthPrincipalUser` §四 停用帳號→Token撤銷、`權限系統架構總覽` Redis Key 設計建議

---

## 23. 「禁止物理刪除」的主檔 vs 「可以物理刪除」的關聯表

### 23.1 你們規格書的刪除策略總結
仔細讀完 10 張表的規格書後，可以歸納出一個模式：

**主檔（Master Data）— 嚴禁或不建議物理刪除**
| 資料表 | PK | 刪除策略 | 理由 |
|---|---|---|---|
| AuthPrincipalUser | UserId | 嚴禁物理刪除，只能 `IsActive=0` | 要留稽核軌跡；有大量關聯 |
| AuthPrincipalGroup | GroupCode | 優先 `IsActive=0` | 群組內可能數千人，改動影響太大 |
| AuthRole | RoleCode | 優先 `IsActive=0` | 被 PrincipalRole/Grant 大量參照 |
| AuthResource | ResourceKey | 優先 `IsActive=0`；禁刪非葉節點 | 樹狀結構 + 被 Grant/Override 參照 |
| AuthAction | ActionCode | 優先 `IsEnabled=0` | 被 Grant/Override 參照 + 程式碼 hardcode |

**關聯/過渡表 — 可以物理刪除（但有前提）**
| 資料表 | PK | 刪除策略 | 前提 |
|---|---|---|---|
| AuthUserGroup | (UserId, GroupCode) | 可 soft/hard | 建議保留歷史 |
| AuthRelationPrincipalRole | PrincipalRoleCode | 建議保留；僅錯建才硬刪 | 硬刪前要清快取 |
| AuthRelationGrant | GrantCode | 可（條件式） | 硬刪前要清快取 |
| AuthUserOverride | (UserId, ResourceKey, ActionCode) | 可（過期清理） | 要有 TTL Job |
| AuthTokens | TokenId | 必須定期硬刪 | 否則表膨脹崩潰 |

### 23.2 原則
- **被大量 FK 參照的表 → soft delete**
- **量會無限增長的表 → 必須有硬刪 + TTL 機制**
- **關聯表 → 看情況，但務必先做影響分析再刪**

> 📎 參考來源：`_01 AuthPrincipalUser` §四 嚴禁物理刪除、`_02 AuthRole` §四 刪除禁令、`_03 AuthPrincipalGroup` §四 刪除禁令、`_05 AuthResource` §四 刪除策略、`_06 AuthAction` §四 不可變更原則、`_09 AuthTokens` §四 TTL、`_08 AuthUserOverride` §四 清理、`_04 AuthRelationPrincipalRole` §四 刪除策略

---

## 24. 完整的 PK/FK 關聯地圖（你們這 10 張表）

```
AuthPrincipalUser (PK: UserId)
    ├── AuthUserGroup.UserId (FK)
    ├── AuthRelationPrincipalRole.UserId (FK, 與 GroupCode 互斥)
    ├── AuthUserOverride.UserId (FK, 複合 PK 之一)
    └── AuthTokens.UserId (FK)

AuthPrincipalGroup (PK: GroupCode)
    ├── AuthUserGroup.GroupCode (FK, 複合 PK 之一)
    └── AuthRelationPrincipalRole.GroupCode (FK, 與 UserId 互斥)

AuthRole (PK: RoleCode)
    ├── AuthRelationPrincipalRole.RoleCode (FK)
    └── AuthRelationGrant.RoleCode (FK)

AuthResource (PK: ResourceKey)
    ├── AuthResource.ParentResourceKey (Self-FK, 樹狀)
    ├── AuthRelationGrant.ResourceKey (FK)
    └── AuthUserOverride.ResourceKey (FK, 複合 PK 之一)

AuthAction (PK: ActionCode)
    ├── AuthRelationGrant.ActionCode (FK)
    └── AuthUserOverride.ActionCode (FK, 複合 PK 之一)

AuthUserGroup           PK: (UserId, GroupCode)       FK → User, Group
AuthRelationPrincipalRole  PK: PrincipalRoleCode      FK → User|Group(XOR), Role
AuthRelationGrant       PK: GrantCode                 FK → Role, Resource, Action
AuthUserOverride        PK: (UserId, ResourceKey, ActionCode)  FK → User, Resource, Action
AuthTokens              PK: TokenId (IDENTITY)        FK → User
```

看這張圖，你就能快速判斷：
- 刪 `AuthPrincipalUser` 會影響 4 張子表
- 刪 `AuthRole` 會影響 2 張子表
- 刪 `AuthResource` 會影響 3 張表（含自我參照）

> 📎 參考來源：全部 10 張規格書 + `ERP.CommonLib/Models/Entities/Auth/` 全部 Entity 檔案 + `ERP.CommonLib/Data/AuthDbContext.cs`

---

## 25. 你可以先背下來的超短結論（面試也常問）

- PK 保證「唯一」，FK 保證「關聯存在」
- FK 會直接影響 Delete：你要嘛 Restrict（擋刪）、要嘛 Cascade（連坐刪）
- 被大量參照的主檔，通常優先 soft delete（`IsActive=0`）
- 多步驟改資料要用 transaction，Update/Delete 要用 RowVersion 防併發覆蓋
- Constraints/Index 是可用性與效能的底盤：不要只靠程式碼
- 複合主鍵天然防重複，但查詢/更新必須帶齊所有 PK 欄位
- 自我參照 FK 操作時要防循環，移動節點要 transaction 更新整棵子樹
- XOR 約束要在 DB 層 CHECK，程式層也要檢查（給友善錯誤訊息）
- 高寫入表一定要有 TTL 清理機制，否則遲早爆表
- DB-first 專案裡，EF 只是搬運工 — FK violation 會以 DbUpdateException 出現，你要 catch 並轉譯
- 任何寫入操作結束後，想一下「快取有沒有要清」

> 📎 參考來源：本章為全文總結，各點對應規格書參照請見各章節 📎 標註

---

（完）
