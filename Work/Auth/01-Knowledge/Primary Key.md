---
project: Auth
tags: [knowledge, db, auth]
aliases: [PK, 主鍵, 主鍵設計]
created: 2026-02-27
---

# Primary Key（主鍵）

## 一句話定義
PK 是一個（或多個）欄位，用來**唯一識別**資料表中的每一筆 row——它是資料表的身分證。

## 為什麼重要
- 沒有 PK 就無法精準定位、更新、刪除特定資料
- PK 是 [[Foreign Key]] 參照的基礎——整個關聯完整性靠它維繫
- PK 的設計直接影響 [[Index]] 效能與 [[Schema Migration]] 成本

## 核心觀念

### PK 的基本約束
- `NOT NULL`：不可為空
- `UNIQUE`：不可重複
- 通常也是 Clustered Index 的預設 key

### 兩種常見 PK 策略

| 類型 | 說明 | 優點 | 缺點 |
|---|---|---|---|
| **自然鍵（Natural Key）** | 可讀、業務有意義，如 `RoleCode = 'ADMIN'` | 好查、好溝通 | 改名 → 連鎖更新風險 |
| **代理鍵（Surrogate Key）** | 純技術 ID，如 GUID、INT IDENTITY | 穩定、不需改 | 對人不直覺，需搭配業務唯一碼 |

> 實務建議：被大量 [[Foreign Key]] 參照的 key 要盡量**不可變（immutable）**。一旦可變，就會遇到更新連鎖、鎖表、與資料不一致風險。

## Auth 專案實例
- `AuthRole`：`RoleCode` 是 PK（自然鍵），所有 [[Foreign Key]] 關聯都用它
- `AuthRelationPrincipalRole`：`PrincipalRoleCode` 是 PK（代理鍵 GUID）
- `AuthRelationGrant`：`GrantCode` 是 PK（代理鍵 GUID）
- 多張表同時有 Physical PK + Logical PK → 見 [[Logical PK&Business Key]]

## 相關概念
- [[Foreign Key]] — PK 是 FK 參照的對象
- [[Composite Primary Key]] — 多欄位組成的 PK
- [[Logical PK&Business Key]] — 雙 Key 模式的架構決策
- [[Constraints]] — PK 本質上是 NOT NULL + UNIQUE 約束
- [[Index]] — PK 通常自動建立 Clustered Index
- [[Schema Migration]] — 改 PK 的遷移 SOP

## 參考來源
- 📎 `_02 角色主檔(AuthRole)` §二 欄位清單（RoleId / RoleCode）
- 📎 `_04 主體角色關聯(AuthRelationPrincipalRole)` §二 欄位清單
- 📎 `_07 授權設定表(AuthRelationGrant)` §二 欄位清單
- 📎 BasicDBTransaction-JuniorLevel §2（PK 到底在保證什麼）
