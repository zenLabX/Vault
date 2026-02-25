# 權限資料表關聯與決策規則

本文件整理自你提出「根據資料表關聯的理解」之後，我們針對正確/錯誤/盲點，以及「Deny > Override > Role Grant」的深挖討論。

> 範圍：從你列出各表定位（AuthPrincipalUser…AuthTokens）開始，到釐清 Deny/Override/Role 優先序與可能的文字矛盾為止。

---

## 1. 你的初步結論（原始整理）

- AuthPrincipalUser => 使用者主表，所有使用者設定是以這張表為出發
- AuthPrincipalGroup => 群組主表，系統中記載公司有哪些群組
- AuthRole => 角色主表，系統中有那些角色
- AuthAction => 動作主表，系統中有哪一些「系統操作行為」的資料表
- AuthResource => 資源主表，系統中有那些資源
- AuthUserGroup => 串起使用者被分配到哪個群組的 mapping 表
- AuthRelationPrincipalRole => 串起使用者隸屬哪一個群組、對應到哪一個角色的 mapping 表
- AuthRelationGrant => 主要 mapping 角色有哪些 資源-動作-權限 設定
- AuthUserOverride => 主要 mapping 單一使用者有哪些 資源-動作-權限 設定
- AuthToken => 附屬表，單純紀載使用者的 token

---

## 2. 哪些地方是正確的（a）

### 2.1 表的定位（大方向正確）
- AuthPrincipalUser：✅ 使用者主表
- AuthPrincipalGroup：✅ 群組主表
- AuthRole：✅ 角色主表
- AuthAction：✅ 動作主檔（規格書把它定位為權限系統的「動詞」）
- AuthResource：✅ 資源主檔（規格書把它定位為權限系統的「名詞」）
- AuthUserGroup：✅ User ↔ Group 的 mapping
- AuthRelationGrant：✅ Role ↔ Resource ↔ Action ↔ Effect(Allow/Deny) 的授權規則
- AuthUserOverride：✅ User ↔ Resource ↔ Action ↔ Effect(Allow/Deny) 的個人覆寫
- AuthTokens：✅ Token/Session 類型的附屬資料（偏「連線執行/權杖管理」）

---

## 3. 哪些地方有錯誤（b）

### 3.1 AuthRelationPrincipalRole 的描述需要修正
你原本寫：
> 「串起使用者隸屬哪一個群組、對應到哪一個角色」

修正後理解：
- AuthRelationPrincipalRole 是「**主體（Principal）被指派到哪個角色（Role）**」的關聯表
- 主體可以是 **USER** 或 **GROUP**，透過 `PrincipalType` 區分

因此使用者取得角色有兩條路徑：

- 路徑 A（直接指派）：
  - User → AuthRelationPrincipalRole（PrincipalType='USER'）→ Role
- 路徑 B（透過群組繼承）：
  - User → AuthUserGroup → Group → AuthRelationPrincipalRole（PrincipalType='GROUP'）→ Role

> 結論：AuthUserGroup 負責「人在哪些群組」，AuthRelationPrincipalRole 負責「哪些主體（人/群組）擁有哪些角色」。

---

## 4. 盲點/誤區提醒（c）

### 4.1 權限不是只有關聯圖，還有「決策優先序」
你對資料表的「是什麼」描述得很完整，但權限引擎的關鍵是「怎麼算」。

討論中整理出的決策流程重點：
1. 先做有效性過濾：`IsActive=1` 且 AtUtc 落在 `ValidFrom/ValidTo`（若有）
2. 再處理個人覆寫（AuthUserOverride）
3. 再彙總角色來源（包含直接/群組繼承）
4. 再進入角色授權矩陣（AuthRelationGrant）
5. 最後才套 ABAC 條件（ConditionJson）

一句話總結：
- **任何地方出現 Deny 即拒絕；沒有 Deny 且任何地方出現 Allow 則允許；其餘預設拒絕。**

### 4.2 容易忽略「時間維度」（AtUtc）
- 多張表都有 `ValidFrom/ValidTo` + `IsActive`
- 同一個人、同一個資源/動作，在不同 AtUtc 查詢，可能會有不同的有效結果

### 4.3 容易忽略 ABAC（ConditionJson）
- AuthRelationGrant / AuthUserOverride 都可能帶 `ConditionJson`
- 即使動作被允許，若條件不滿足，仍可能視為 Deny（細粒度資料約束）

### 4.4 AuthRelationGrant 與 AuthUserOverride 不是「平行等權」
- Role Grant 是常規授權來源（大多數人的權限來源）
- User Override 是例外處理（特批/封鎖等）
- 但例外是否能覆蓋，仍要回到 Deny-Overrides 的整體策略理解

---

## 5. 關於「Deny > Override > Role Grant」的關鍵釐清

你指出了一個核心疑問：
> 若優先序是 Deny > Override > Role Grant，那 AuthRelationGrant 若已 Deny，AuthUserOverride 若 Allow 是否仍不可允許？

討論結論：
- **是的：只要存在 explicit Deny（不論來源），Override Allow 也不應該把它翻成 Allow。**

可用下表理解（以單一 resource/action 在同一 AtUtc 為例）：

| Role Grant | User Override | 最終 | 原因 |
|---|---|---|---|
| Deny | Allow | DENY | Deny 優先於一切（Deny-Overrides） |
| Allow | Deny | DENY | Deny 優先於 Allow |
| 無（未設定） | Allow | ALLOW | 沒有 Deny，Override Allow 可視為特批 |
| Allow | 無 | ALLOW | 沒有 Deny，Role Allow 生效 |
| 無 | 無 | DENY | Default Deny |

### 5.1 為什麼會覺得規格書「看起來矛盾」？
對話中也指出：
- 有些敘述會用「個人覆寫絕對優先」、「命中就收工」描述 Override Allow
- 但這通常是在「**沒有 explicit Deny**」的案例下（例如原本只是沒設定/預設拒絕），而不是「已存在 Role Deny」的情境

> 最安全的一致化解讀：Override Allow 只能覆蓋「Role Allow/未設定」，但不能覆蓋任何 explicit Deny。

---

## 6. 後續可延伸的驗證問題（可作為下一輪確認清單）

- 「Deny」的來源範圍要不要包含：
  - Role Deny（AuthRelationGrant.Effect=0）
  - Override Deny（AuthUserOverride.Effect=0）
  - ABAC 條件不滿足（ConditionJson）
- 若同時存在多角色：是否遵循「任何一個角色 Deny → 最終 Deny」
- Override 是否允許“寫入但不生效”（作為紀錄/稽核）？還是 UI 應直接鎖定不讓存？

---

## 7. 文件拆分說明

本次內容聚焦在：
- 資料表定位
- 關聯路徑（User/Group/Role）
- 決策優先序（Deny/Override/Role）

若你希望把「決策規則」獨立成可給團隊的短版 SOP，我可以再另外整理一份一頁式摘要。
