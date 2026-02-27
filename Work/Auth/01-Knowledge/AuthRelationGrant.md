---
project: Auth
tags: [entity, db, auth]
aliases: [授權設定表, 授權矩陣, Grant表, 決策矩陣]
created: 2026-02-27
spec: _技術規格書_權限模組_07_授權設定表(AuthRelationGrant)
---

# AuthRelationGrant（授權設定表）

## 實體定位
權限系統的**「大腦」（決策矩陣）**——`角色(Who) + 資源(Where) + 動作(What) = 效果(Allow/Deny)`。萬人系統中資料量最大（可能百萬筆）、讀取最頻繁（每個 API Call 都查）的表。

## 關聯地圖
```
AuthRelationGrant (PK: GrantCode)
├── .RoleCode → [[AuthRole]].RoleCode (FK)
├── .ResourceKey → [[AuthResource]].ResourceKey (FK)
├── .ActionCode → [[AuthAction]].ActionCode (FK)
└── .(ResourceKey, ActionCode) → [[AuthRelationResourceAction]] (FK, 建議加)
```

---

## Schema 摘要

| 欄位 | 型別 | 說明 | 關聯知識 |
|---|---|---|---|
| `GrantCode` | NVARCHAR(40) | PK（UUID） | [[Primary Key]] |
| `RoleCode` | NVARCHAR(50) | FK → Role | [[Foreign Key]] |
| `ResourceKey` | NVARCHAR(160) | FK → Resource | [[Foreign Key]] |
| `ActionCode` | NVARCHAR(50) | FK → Action | [[Foreign Key]] |
| `Effect` | BIT | 1=Allow, 0=Deny（**Deny 權重最高**） | [[Permission Decision Flow]] |
| `IsActive` | BIT | 快速開關 | [[Delete Strategy]] |
| `ConditionJson` | NVARCHAR(MAX) | ABAC 條件（NULL = 無條件全開） | [[Permission Decision Flow]] |
| `ValidFrom` | DATETIME | 生效時間 | [[Temporal Pattern]] |
| `ValidTo` | DATETIME | 失效時間 | [[Temporal Pattern]] |
| `Remark` | NVARCHAR(200) | 授權原因 | — |
| Audit Fields | — | CreatedBy/Date, ModifiedBy/Date | [[Audit Fields]] |
| `RowVersion` | ROWVERSION | 併發控制 | [[RowVersion]] |

### 約束
| 約束 | 說明 | 關聯知識 |
|---|---|---|
| CK_DateRange | `ValidFrom <= ValidTo` | [[Constraints]]、[[Temporal Pattern]] |
| CK_Effect | `Effect IN (0,1)` | [[Constraints]] |
| UX_AuthGrant_UniqueRule | 無條件 + 無期限 → 不可重複 | [[Filtered Unique Index]] |

### 索引（效能命脈）
| 索引 | 用途 | 關聯知識 |
|---|---|---|
| `IX_AuthGrant_Validation` | 權限判斷 Hot Path（[[Covering Index]]） | [[Execution Plan]]、[[Permission Decision Flow]] |
| `IX_AuthGrant_RoleView` | 後台管理 / 登入預載 | [[Index]] |
| `UX_AuthGrant_UniqueRule` | 防重複標準授權 | [[Filtered Unique Index]] |

---

## 決策優先級
```
Deny Override → 任何角色設 Effect=0 → 拒絕
Explicit Allow → 至少一筆 Effect=1 → 允許
Default Deny → 無匹配 → 拒絕
```
→ 詳見 [[Permission Decision Flow]]

---

## CRUD 涉及的底層知識

### Create
- FK 存在性：[[AuthRole]]、[[AuthResource]]、[[AuthAction]] 都必須存在 → [[Foreign Key]]
- **功能目錄約束**：`(ResourceKey, ActionCode)` 必須存在於 [[AuthRelationResourceAction]] → 防止授權一個資源「沒有的動作」
- `ConditionJson` 必須合法 JSON → 應用層驗證
- UNIQUE 規則 → [[Filtered Unique Index]]
- 多步驟建立 → [[Transaction]]

### Read
- 權限判斷 = 全系統最熱路徑 → [[Covering Index]]、[[Execution Plan]]
- **禁止** `WHERE JSON_VALUE(ConditionJson, ...)` → 全表掃描 → [[Index]]
- JSON 解析交給應用層 → [[Permission Decision Flow]] 第 5 層
- 快取策略：依 RoleCode 為單位 → [[Cache Invalidation]]

### Update
- `RowVersion` 必檢 → [[Optimistic Lock]]
- 異動 → 清除對應 Role 的快取 → [[Cache Invalidation]]
- Deny 設定提示：**該角色下使用者絕對無法使用此功能**

### Delete
- 可用 `IsActive = 0` 快速關閉 → [[Delete Strategy]]
- FK violation 不會發生（此表是葉表）
- 百萬級資料過期清理 → [[Data Retention]]

---

## 常見事故速查

| 症狀 | 檢查 | 對應知識 |
|---|---|---|
| 兩角色一 Allow 一沒設定 → 結果 Allow | 白名單機制：有 Allow + 無 Deny = Pass | [[Permission Decision Flow]] |
| 權限明明有開但進不去 | `ValidTo` 過期? 隱藏 Deny? ConditionJson 不滿足? | [[Temporal Pattern]]、[[Permission Decision Flow]] |
| 1000 萬筆查詢變慢 | `IX_AuthGrant_Validation` 碎片率 → 重建索引 | [[Index]]、[[Execution Plan]] |

---

## 相關實體
- [[AuthRelationResourceAction]] — 上游功能目錄（Grant 只能勾目錄中的組合）
- [[AuthRole]] — 授權的角色
- [[AuthResource]] — 授權的資源
- [[AuthAction]] — 授權的動作
- [[AuthUserOverride]] — 比 Grant 優先的個人覆寫

## 參考
- 📎 技術規格書 `_07_授權設定表(AuthRelationGrant)` 全文
