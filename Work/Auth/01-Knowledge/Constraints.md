---
project: Auth
tags: [knowledge, db, auth]
aliases: [約束, DB約束, 資料約束]
created: 2026-02-27
---

# Constraints（資料庫約束）

## 一句話定義
DB 層級的規則，強制資料永遠處於**合理、一致**的狀態——是最便宜也最可靠的防線。

## 為什麼重要
- 能在 DB 層保證的規則，就不要只靠程式碼（程式會改、會漏、會有多個寫入來源）
- 程式碼的責任是：把 DB 拒絕轉成「使用者看得懂的業務錯誤」→ 見 [[Exception Translation]]
- 約束違反會拋 `SqlException`，需要在 Service 層處理

## 核心觀念

### 常見約束類型

| 類型 | 用途 | 範例 |
|---|---|---|
| `NOT NULL` | 必填欄位 | `RoleCode NVARCHAR(50) NOT NULL` |
| `DEFAULT` | 缺省值 | `IsActive BIT DEFAULT 1` |
| `CHECK` | 資料範圍限制 | `CHECK (ValidFrom <= ValidTo)` |
| `UNIQUE` | 欄位（組合）不可重複 | `UNIQUE (RelationCode)` |
| `FK` | 關聯必須存在 | → 見 [[Foreign Key]] |
| `PK` | 唯一識別 | → 見 [[Primary Key]] |

### Violation 錯誤碼
| SqlException.Number | 約束類型 |
|---|---|
| 547 | FK violation |
| 2601 / 2627 | UNIQUE violation |
| 515 | NOT NULL violation |

## Auth 專案實例
- `AuthRelationPrincipalRole` 的 [[XOR Constraint]]：`UserId` 與 `GroupCode` 二選一
- `AuthRelationGrant` 的日期 CHECK：`ValidFrom <= ValidTo`
- `AuthRelationGrant` 的 [[Filtered Unique Index]]：無條件/無期限授權不可重複
- `AuthAction` 的 `IsBasicAction` 標記 → 搭配 [[Immutable System Data]] 保護

## 相關概念
- [[Foreign Key]] — FK 是約束的一種
- [[Primary Key]] — PK = NOT NULL + UNIQUE
- [[XOR Constraint]] — 互斥欄位的特殊 CHECK
- [[Filtered Unique Index]] — 條件式 UNIQUE
- [[Exception Translation]] — 約束 violation 的錯誤翻譯

## 參考來源
- 📎 `_04 主體角色關聯(AuthRelationPrincipalRole)` §三 XOR Check
- 📎 `_07 授權設定表(AuthRelationGrant)` §三 日期 CHECK + Filtered Unique Index
- 📎 BasicDBTransaction-JuniorLevel §7（Constraints 是最便宜的防線）
