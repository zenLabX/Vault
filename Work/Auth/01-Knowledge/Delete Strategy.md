---
project: Auth
tags: [knowledge, db, auth]
aliases: [刪除策略, Soft Delete, Hard Delete, 軟刪除, 物理刪除]
created: 2026-02-27
---

# Delete Strategy（刪除策略）

## 是什麼
決定資料「消失」的方式：**物理刪除（Hard Delete）** 讓資料真正消失；**軟刪除（Soft Delete）** 用欄位標記失效但保留資料。

## 為什麼重要
- 被大量 [[Foreign Key]] 參照的主檔，物理刪除風險極高（鎖表、逾時、資料斷裂）
- 軟刪除保留歷史、易稽核、可「復原」
- 權限系統不分青紅皂白地刪，可能導致安全漏洞

---

## 核心觀念

### Hard Delete vs Soft Delete

| | Hard Delete | Soft Delete |
|---|---|---|
| 方式 | `DELETE FROM ...` | `UPDATE SET IsActive = 0` |
| 優點 | 資料真的消失 | 不破壞關聯；保留歷史；可復原 |
| 缺點 | FK 擋、鎖表、失去稽核 | 查詢都要過濾；UNIQUE 要搭配 [[Filtered Unique Index]] |
| 適用 | 過期 Token、TTL 清理 | 主檔（User/Role/Resource/Action） |

### FK 的刪除行為
| 模式 | 行為 |
|---|---|
| **Restrict / No Action** | DB 拒絕刪除（你們的預設） |
| **Cascade** | DB 連坐刪所有子表（權限系統不建議） |

→ 詳見 [[Foreign Key]]

### 軟刪除的 active 定義
- `IsActive = 1` 且 `NOW` 落在 `[ValidFrom, ValidTo]` → 見 [[Temporal Pattern]]
- 所有查詢都要加過濾（[[AppCode Isolation]] 也要一起考慮）

---

## Auth 專案刪除策略總覽

### 主檔（嚴禁或不建議物理刪除）
| 資料表 | 策略 | 原因 |
|---|---|---|
| AuthPrincipalUser | `IsActive=0` | 稽核 + 大量關聯 |
| AuthPrincipalGroup | `IsActive=0` | 群組內可能數千人 |
| AuthRole | `IsActive=0` | 被 PrincipalRole/Grant 大量參照 |
| AuthResource | `IsActive=0` + 禁刪非葉節點 | [[Self-Referencing FK]] 樹狀結構 |
| AuthAction | `IsEnabled=0` | 程式 hardcode 引用 → [[Immutable System Data]] |

### 關聯/過渡表（可物理刪除，有前提）
| 資料表 | 策略 | 前提 |
|---|---|---|
| AuthUserGroup | soft/hard 皆可 | 建議保留歷史 |
| AuthRelationPrincipalRole | 建議保留 | 硬刪前清 [[Cache Invalidation]] |
| AuthRelationGrant | 條件式 | 硬刪前清快取 |
| AuthUserOverride | 過期清理 | [[Data Retention]] TTL Job |
| AuthTokens | **必須定期硬刪** | 否則表膨脹崩潰 → [[Data Retention]] |

### 安全物理刪除 SOP
1. [[Transaction]] begin
2. [[Guardrail Pattern]]：count active 參照
3. count > 0 → rollback + 回傳業務錯誤
4. count = 0 → delete（帶 [[RowVersion]]）
5. commit
6. 觸發 [[Cache Invalidation]]

---

## 相關概念
- [[Foreign Key]] — FK Restrict 決定刪除是否被擋
- [[Guardrail Pattern]] — 刪除前的安全檢查
- [[Temporal Pattern]] — 有效期搭配軟刪除
- [[Data Retention]] — 硬刪除的 TTL 排程
- [[Cache Invalidation]] — 刪除後的快取清理
- [[Audit Fields]] — 軟刪除時更新 ModifiedBy/Date

## 參考來源
- 📎 `_01 AuthPrincipalUser` §四 嚴禁物理刪除
- 📎 `_02 AuthRole` §四 刪除禁令
- 📎 `_09 AuthTokens` §四 TTL
- 📎 BasicDBTransaction-JuniorLevel §6（Soft delete vs Hard delete）+ §23（刪除策略總結）
