---
project: Auth
tags: [knowledge, db, auth]
aliases: [FK, 外鍵, 外來鍵]
created: 2026-02-27
---

# Foreign Key（外鍵）

## 一句話定義
FK 保證子表（child）引用的父表（parent）資料**一定存在**——是關聯式資料庫維護參照完整性的核心機制。

## 為什麼重要
- 防止孤兒資料（orphan rows）
- 直接影響 CRUD 的執行順序與錯誤類型
- FK 的刪除行為（Restrict / Cascade）決定了資料生命週期

## 核心觀念

### FK 對 CRUD 的影響

| 操作 | 影響 | 說明 |
|---|---|---|
| **Create** | 先父後子 | 必須先 insert 父表，才能 insert 子表；否則 FK violation |
| **Update** | 禁改被參照欄位 | 更新父表被參照 key（如 `RoleCode`）→ DB 拒絕或觸發 cascade |
| **Delete** | 先子後父 | 若仍有子表引用，Restrict 會擋、Cascade 會連坐刪 |

### FK 刪除行為

| 模式 | 行為 | 適用場景 |
|---|---|---|
| **Restrict / No Action** | DB 直接拒絕刪除 | 主檔保護（預設，最常用） |
| **Cascade** | 自動刪除所有子表資料 | 風險極高，權限系統通常避免 |
| **Set Null** | 子表 FK 欄位設為 NULL | 少用於強參照 |

> 你們專案的 FK 皆為 **NO ACTION（= Restrict）**，DB 層做最後防線。

### FK violation 錯誤
- `SqlException.Number = 547`
- 常見情境：先子後父的 insert、刪除仍有參照的父表
- 程式端要 catch 並翻譯成友善訊息 → 見 [[Exception Translation]]

## Auth 專案實例
- `AuthRelationPrincipalRole.RoleCode` → `AuthRole.RoleCode`
- `AuthRelationGrant.RoleCode` → `AuthRole.RoleCode`
- `AuthRelationGrant.ResourceKey` → `AuthResource.ResourceKey`
- `AuthRelationGrant.ActionCode` → `AuthAction.ActionCode`
- `AuthTokens.UserId` → `AuthPrincipalUser.UserId`

> 完整關聯地圖見 BasicDBTransaction-JuniorLevel §24。

## 相關概念
- [[Primary Key]] — FK 參照的對象
- [[Self-Referencing FK]] — FK 指向自己的 PK（樹狀結構）
- [[Delete Strategy]] — FK 行為決定刪除策略
- [[Constraints]] — FK 是約束的一種
- [[Guardrail Pattern]] — 先查 FK 參照再刪的安全模式
- [[Exception Translation]] — FK violation 轉譯為業務錯誤

## 參考來源
- 📎 `_02 角色主檔(AuthRole)` §三 關聯地圖 + §四 刪除禁令
- 📎 `_07 授權設定表(AuthRelationGrant)` §六 FK 定義 SQL
- 📎 BasicDBTransaction-JuniorLevel §3（FK 在 CRUD 時真正造成的影響）
