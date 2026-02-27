---
project: Auth
tags: [knowledge, db, auth]
aliases: [自我參照FK, 樹狀結構, Materialized Path, 物化路徑]
created: 2026-02-27
---

# Self-Referencing FK（自我參照外鍵 / 樹狀結構）

## 是什麼
一張表的某個 [[Foreign Key]] **指向自己的 [[Primary Key]]**——用來建立樹狀/階層結構（選單樹、組織架構、資源階層）。

## 為什麼重要
- 權限系統的資源（AuthResource）就是樹狀結構
- 操作不當 → 循環參照（Circular Reference）→ 無窮迴圈
- 移動節點 → 整棵子樹的 Path 都要重算 → 需要 [[Transaction]]

---

## 核心觀念

### 常見實作方案

| 方案 | 查子樹 | 移動節點 | 適合 |
|---|---|---|---|
| **Adjacency List**（只存 ParentId） | 需 CTE 遞迴，深度越深越慢 | 改 1 筆 | 淺樹、少量查詢 |
| **Materialized Path（你們用的）** | `LIKE '/ROOT/PMS/%'` 一次搞定 | 要更新所有子孫 Path | **讀多寫少** |
| **Nested Set**（左值/右值） | 範圍查詢極快 | 要重算大量左右值 | 超大分類，幾乎不移動 |
| **Closure Table** | JOIN 最彈性 | 要更新 closure 記錄 | 頻繁查詢 + 偶爾移動 |

### 你們的方案：Materialized Path
- `ParentResourceKey`（FK）→ `ResourceKey`（PK），同一張表
- 根節點 `ParentResourceKey = NULL`
- `Path` 欄位：物化路徑，如 `/ROOT/PMS/ORDER/BTN_SAVE/`
- 子樹查詢：`WHERE Path LIKE '/ROOT/PMS/%'`

### 操作注意事項

**新增**：父節點必須已存在；根節點 `ParentResourceKey = NULL`

**移動**（最危險）：
1. 防循環：目標父節點的 Path 不能包含自己
   ```csharp
   if (newParent.Path.StartsWith(oldPath))
       throw new InvalidOperationException("不能移到自己的子樹下");
   ```
2. 更新自己 + 所有子孫的 Path → 必須包在 [[Transaction]] 裡
   ```sql
   UPDATE AuthResource SET Path = REPLACE(Path, @oldPrefix, @newPrefix)
   WHERE Path LIKE @oldPrefix + '%';
   ```

**刪除**：
- 嚴禁直接刪除非葉節點（子節點會變孤兒）
- 安全做法：先確認 `IsLeaf = 1`，或先遞迴搬移子孫節點
- → 見 [[Delete Strategy]] + [[Immutable System Data]]（根節點保護）

---

## Auth 專案實例
- `AuthResource`：整個權限資源樹
- 索引：`IX_AuthResource_Tree`、`IX_AuthResource_Lineage`
- 如果沒有物化路徑，CTE 遞迴查詢越深越慢

---

## 相關概念
- [[Foreign Key]] — Self-Referencing FK 是 FK 的特殊形式
- [[Transaction]] — 移動子樹必須用 Transaction
- [[Delete Strategy]] — 禁刪非葉節點
- [[Immutable System Data]] — 根節點保護
- [[Index]] — 樹狀查詢需要專用索引

## 參考來源
- 📎 `_05 資源主檔(AuthResource)` §一 樹狀結構、§四 防循環 + 禁刪非葉 + Lineage 維護
- 📎 `_05` §三 IX_AuthResource_Tree / IX_AuthResource_Lineage
- 📎 BasicDBTransaction-JuniorLevel §13（自我參照 FK）
- 📎 BasicDBTransaction-MiddleLevel §13（樹狀結構進階操作）
