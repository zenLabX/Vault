---
project: Auth
tags: [entity, db, auth]
aliases: [個人覆寫表, UserOverride, 例外權限]
created: 2026-02-27
spec: _技術規格書_權限模組_08_個人覆寫表(AuthUserOverride)
---

# AuthUserOverride（個人覆寫表）

## 實體定位
權限系統的**「例外處理層」**——針對特定使用者做「加權（Allow）」或「限縮（Deny）」。邏輯權重**高於** [[AuthRelationGrant]]，是「救火」用的表。

## 關聯地圖
```
AuthUserOverride (PK: UserId + ResourceKey + ActionCode)
├── .UserId → [[AuthPrincipalUser]].UserId (FK)
├── .ResourceKey → [[AuthResource]].ResourceKey (FK)
└── .ActionCode → [[AuthAction]].ActionCode (FK)
```

---

## Schema 摘要

| 欄位 | 型別 | 說明 | 關聯知識 |
|---|---|---|---|
| `UserId` | NVARCHAR(40) | PK-1 / FK → User | [[Composite Primary Key]] |
| `ResourceKey` | NVARCHAR(160) | PK-2 / FK → Resource | [[Composite Primary Key]] |
| `ActionCode` | NVARCHAR(50) | PK-3 / FK → Action | [[Composite Primary Key]] |
| `Effect` | BIT | 1=Allow（特權放行）, 0=Deny（黑名單） | [[Permission Decision Flow]] |
| `ConditionJson` | NVARCHAR(MAX) | ABAC 條件 | — |
| `ValidFrom` | DATETIME | 生效時間 | [[Temporal Pattern]] |
| `ValidTo` | DATETIME | 失效時間 | [[Temporal Pattern]] |
| `IsActive` | BIT | 是否啟用 | [[Delete Strategy]] |
| `Reason` | NVARCHAR(200) | 覆寫原因（建議必填） | [[Audit Fields]] |
| Audit Fields | — | CreatedBy/Date, ModifiedBy/Date | [[Audit Fields]] |
| `RowVersion` | ROWVERSION | 併發控制 | [[RowVersion]] |

### 約束
| 約束 | 說明 | 關聯知識 |
|---|---|---|
| PK 複合鍵 | `(UserId, ResourceKey, ActionCode)` → 一人一功能一覆寫 | [[Composite Primary Key]] |
| CK_DateRange | `ValidFrom <= ValidTo` | [[Constraints]] |
| CK_Effect | `Effect IN (0,1)` | [[Constraints]] |

### 索引
| 索引 | 用途 | 關聯知識 |
|---|---|---|
| IX_AUO_FastDeny | 快速 Deny 短路檢查（Effect=0, IsActive=1） | [[Permission Decision Flow]] |
| IX_AUO_Validation | 覆寫查詢（[[Covering Index]]） | [[Covering Index]] |
| IX_AUO_Maintenance | 過期清理 `(ValidTo)` | [[Data Retention]] |

---

## 決策優先級
```
1. User Deny (Override Effect=0) → 立即拒絕（short-circuit）
2. User Allow (Override Effect=1) → 覆蓋角色設定
3. 無命中 → 進入 AuthRelationGrant 角色邏輯
```
→ 詳見 [[Permission Decision Flow]]

---

## CRUD 涉及的底層知識

### Create
- 複合 PK → 同一人 + 同一功能只能一條覆寫 → [[Composite Primary Key]]
- FK 三向存在性（User/Resource/Action）→ [[Foreign Key]]
- **Reason 建議必填**（三個月後你會忘記為什麼開特權）
- Conflict Check：提示管理員該使用者目前 Role 權限狀態

### Read
- [[Permission Decision Flow]] 第 2 層（比 Grant 優先）
- Fast Deny 短路 → `IX_AUO_FastDeny` → [[Index]]
- 有效期過濾 → [[Temporal Pattern]]

### Update
- `RowVersion` 必檢 → [[Optimistic Lock]]
- 異動 → [[Cache Invalidation]]

### Delete
- 過期資料可物理刪除 → [[Data Retention]]（排程 Job 每月掃描 `ValidTo < NOW`）
- 不要當常態使用 → 超過 5 人需求應建 [[AuthRole]]

---

## ⚠️ Anti-Pattern 警告
- ❌ 因為懶得開 Role，就直接加 50 筆 Override 給 50 人
- ✅ 僅用於「臨時性」「單一性」需求；超過 5 人 → 開新 Role

---

## 常見事故速查

| 症狀 | 檢查 | 對應知識 |
|---|---|---|
| 角色權限關了但使用者還能用 | Override 有 Effect=1 且 ValidTo 未過期? | [[Permission Decision Flow]]（幽靈權限） |
| 緊急封鎖惡意帳號 | 新增 Effect=0 覆寫 | [[Permission Decision Flow]] |
| 稽核質疑權限與角色不符 | 出示 `Reason` + `CreatedBy` | [[Audit Fields]] |

---

## 相關實體
- [[AuthPrincipalUser]] — 被覆寫的使用者
- [[AuthResource]] — 被覆寫的資源
- [[AuthAction]] — 被覆寫的動作
- [[AuthRelationResourceAction]] — 功能目錄（覆寫的 Resource+Action 組合應存在於目錄中）
- [[AuthRelationGrant]] — Override 優先於 Grant

## 參考
- 📎 技術規格書 `_08_個人覆寫表(AuthUserOverride)` 全文
