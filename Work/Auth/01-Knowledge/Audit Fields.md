---
project: Auth
tags: [knowledge, db, auth]
aliases: [稽核欄位, CreatedBy, ModifiedBy, 審計欄位]
created: 2026-02-27
---

# Audit Fields（審計欄位）

## 是什麼
每張表都有的「四兄弟」欄位：`CreatedBy` / `CreatedDate` / `ModifiedBy` / `ModifiedDate`——記錄**誰、何時**建立和修改了資料。

## 為什麼重要
- 出事時能追溯「誰改的、什麼時候改的」
- 如果忘記填或填錯 → 稽核時無法追責
- 軟刪除（[[Delete Strategy]]）時也要更新 ModifiedBy/Date

---

## 核心觀念

### 標準欄位定義
| 欄位 | 類型 | 規則 |
|---|---|---|
| `CreatedBy` | NVARCHAR(50), NOT NULL | DEFAULT 'System'，建立時填寫 |
| `CreatedDate` | DATETIME, NOT NULL | DEFAULT GETDATE()，建立時填寫 |
| `ModifiedBy` | NVARCHAR(50), NULL | 修改時填寫 |
| `ModifiedDate` | DATETIME, NULL | 修改時填寫 |

### CRUD 規則
| 操作 | CreatedBy/Date | ModifiedBy/Date |
|---|---|---|
| **Create** | 填入當前操作者 + 時間 | NULL |
| **Update** | ❌ **不可覆蓋**（永遠不變） | ✅ 更新為當前操作者 + 時間 |
| **Soft Delete** | 不動 | 更新（記錄誰停用的） |
| **Hard Delete** | 資料消失 | 資料消失（稽核軌跡也沒了） |

### 常見踩坑
- 忘記填 `ModifiedBy` → 不知道誰改的
- Hardcode `CreatedBy = "System"` → 所有操作都變 System
- 多個 API 寫同一張表，審計欄位邏輯不統一

---

## Auth 專案實例
- 全部 10 張表都有這四個欄位
- `AuthPrincipalUser` §四 明確要求：Update 必須用 ModifiedBy/Date
- 軟刪除 `AuthRole.IsActive = 0` 時，`ModifiedBy` = 執行停用的管理員

---

## 相關概念
- [[Delete Strategy]] — 軟刪除保留稽核軌跡；硬刪除失去
- [[DB-first vs Code-first]] — 你們專案的 DEFAULT 由 DB 管

## 參考來源
- 📎 全部 10 張規格書皆包含 Audit Fields
- 📎 `_01 AuthPrincipalUser` §四 Update 規範（必須用 ModifiedBy/Date）
- 📎 BasicDBTransaction-JuniorLevel §21（審計欄位）
