---
project: Auth
tags: [knowledge, db, auth]
aliases: [權限決策流程, 五層決策, RBAC Decision Engine, Deny First]
created: 2026-02-27
---

# Permission Decision Flow（權限決策流程）

## 是什麼
Auth 系統判斷「某使用者能否對某資源執行某動作」的**五層決策引擎**——最終結果是 Allow 或 Deny。

## 為什麼重要
- 這是整個權限系統的核心演算法
- 層次設計影響查詢效能（短路機制）→ 每個 API 呼叫都走這條路
- Deny First 原則 → 安全優先

---

## 核心觀念

### 五層決策流程

```
1. 物理過濾 → 1.5 功能目錄 → 2. 個人覆寫 → 3. 角色聚合 → 4. 授權矩陣 → 5. 條件過濾
```

### 第 1 層：物理過濾
- `IsActive = 1`
- `NOW` 在 `[ValidFrom, ValidTo]` 之間 → [[Temporal Pattern]]
- `AppCode` 匹配 → [[AppCode Isolation]]

### 第 1.5 層：功能目錄（AuthRelationResourceAction）
- 在進入授權判斷前，先確認 `(ResourceKey, ActionCode)` 存在於 [[AuthRelationResourceAction]]
- 不在目錄中 → **該資源根本沒有此動作** → 直接 Deny（short-circuit）
- 目錄 `IsEnabled = 0` → 同上，該功能已被關閉

### 第 2 層：個人覆寫（AuthUserOverride）
- **Deny → 立即拒絕（short-circuit）** → 不用繼續查
- Allow → 記下，繼續
- 用 `FastDeny` 索引快速判斷

### 第 3 層：角色聚合
兩條路徑（可並行查）：
- **直接指派**：`AuthRelationPrincipalRole WHERE UserId = ?`
- **群組繼承**：`AuthUserGroup` JOIN `AuthRelationPrincipalRole ON GroupCode`
- 合併去重 → `allRoles`

### 第 4 層：授權矩陣（AuthRelationGrant）
```
WHERE RoleCode IN (@allRoles)
  AND ResourceKey = @resource
  AND ActionCode = @action
  AND IsActive = 1 AND 有效期...
```
- **Deny First**：任何一筆 `Effect = Deny` → 拒絕
- 有 Allow → 進入第 5 層
- 無任何 Grant → **Default Deny**

### 第 5 層：條件過濾（ConditionJson / ABAC）
- 應用層解析 `ConditionJson`
- 不要在 SQL 用 `JSON_VALUE()` → [[Index]] 失效
- 細粒度控制（如：只允許操作自己工廠的訂單）

### 短路設計（效能關鍵）
- 第 2 層 Deny → 直接結束（不查 Grant）
- 第 4 層 Deny → 直接結束（不解析 JSON）
- 大量節省查詢成本

---

## 查詢路徑對應索引
| 層 | 查詢表 | 索引 |
|---|---|---|
| 1.5 | AuthRelationResourceAction | PK `(ResourceKey, ActionCode)` |
| 2 | AuthUserOverride | FastDeny Index |
| 3 | AuthRelationPrincipalRole | User/Group Index |
| 3 | AuthUserGroup | UserId Index |
| 4 | AuthRelationGrant | `IX_AuthGrant_Validation` ([[Covering Index]]) |

---

## 相關概念
- [[Temporal Pattern]] — 第 1 層物理過濾
- [[AppCode Isolation]] — 第 1 層系統隔離
- [[AuthRelationResourceAction]] — 第 1.5 層功能目錄（合法組合過濾）
- [[XOR Constraint]] — 第 3 層的 User/Group 互斥
- [[Covering Index]] — 第 4 層授權查詢效能
- [[Cache Invalidation]] — 決策結果快取
- [[Index]] — JSON 欄位不能做 WHERE

## 參考來源
- 📎 `權限系統架構總覽` 決策引擎五層流程 + 情境 1~5
- 📎 `_08 個人覆寫表(AuthUserOverride)` §一 決策優先級
- 📎 `_07 授權設定表(AuthRelationGrant)` §一 決策優先級 + §三 索引
- 📎 `_10 使用者群組對應表(AuthUserGroup)` §一 權限流轉邏輯
- 📎 BasicDBTransaction-MiddleLevel §8（RBAC 權限決策引擎查詢路徑）
