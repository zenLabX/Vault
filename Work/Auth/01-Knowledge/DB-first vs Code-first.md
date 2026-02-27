---
project: Auth
tags: [knowledge, db, auth]
aliases: [DB-first, Code-first, EF Core DB-first]
created: 2026-02-27
---

# DB-first vs Code-first

## 是什麼
兩種 DB Schema 管理策略：**Code-first** 由 C# Entity 定義 → EF Migration 建表；**DB-first** 由 DBA/規格書定義 Schema → 程式只做映射。

## 為什麼重要
- 你們專案選了 **DB-first** → 直接影響你每天的開發方式
- EF Core 在 DB-first 下只是「資料搬運工」，不負責結構正確性
- FK violation 以 `DbUpdateException` 形式出現 → 見 [[Exception Translation]]

---

## 核心觀念

### 你們的架構宣告（AuthDbContext 檔頭規範）
OnModelCreating **只允許**三件事：
1. `ToTable()` — 指定表名
2. `HasKey()` — 指定 [[Primary Key]]
3. `IsRowVersion()` — 設定 [[RowVersion]]

**嚴格禁止**：
- `HasOne` / `HasMany`（Navigation Property）
- `HasIndex`
- `HasMaxLength`
- `DeleteBehavior`

### 對日常開發的具體影響
| 操作 | Code-first | **DB-first（你們）** |
|---|---|---|
| 改表結構 | 改 C# + EF Migration | 改 DB（不改 C#） |
| FK/Index/CHECK | EF 管 | **DB 管** |
| `entity.Roles` 導航 | ✅ 可用 | ❌ **不存在** |
| FK violation | EF 驗證錯誤 | `DbUpdateException`（要 catch） |
| 查關聯表 | `.Include()` 即時載入 | 手動 Join 或分次查詢 |

### 手動查關聯的三種方式
1. **兩次查詢**（最清楚）
2. **LINQ Join**（一次 roundtrip）
3. **Raw SQL**（效能最佳，失去類型安全）

→ 詳見 BasicDBTransaction-MiddleLevel §3

### 為什麼選 DB-first
- DB Schema 的生命週期通常比程式長很多
- 大型系統交給 DBA 管比較穩
- Schema 決策（[[Index]]、[[Constraints]]、[[Foreign Key]]）留在 DB 層

---

## 相關概念
- [[RowVersion]] — EF 允許設定的三項之一
- [[Exception Translation]] — DB-first 的 FK/UNIQUE violation 處理
- [[Foreign Key]] — DB 管，程式要 catch
- [[Constraints]] — DB 管，程式要翻譯
- [[Index]] — DB 管，程式不介入

## 參考來源
- 📎 `ERP.CommonLib/Data/AuthDbContext.cs` 檔頭「ℹ️ DbContext Fluent API 使用規範」
- 📎 BasicDBTransaction-JuniorLevel §17（DB-first vs Code-first）
- 📎 BasicDBTransaction-MiddleLevel §3（EF Core DB-first 進階實作）
