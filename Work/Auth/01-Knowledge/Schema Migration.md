---
project: Auth
tags: [knowledge, db, auth]
aliases: [Schema 遷移, PK遷移, FK遷移, 表結構變更]
created: 2026-02-27
---

# Schema Migration（安全遷移策略）

## 是什麼
在生產環境中安全地**改 [[Primary Key]]、移 [[Foreign Key]]、變更表結構**的標準 SOP——核心原則是「向後相容、先加後刪」。

## 為什麼重要
- 直接 rename PK → 所有 FK 瞬間斷裂
- 大表的 ALTER + UPDATE 會鎖表 → 在高峰期執行 = 系統癱瘓
- 遷移沒有 rollback 方案 = 賭博

---

## 核心觀念

### PK/FK 遷移標準 SOP
1. **新增欄位**（目標 PK 若不存在）
   ```sql
   ALTER TABLE AuthRelationGrant ADD RoleId NVARCHAR(50) NULL;
   ```
2. **回填資料**
   ```sql
   UPDATE g SET g.RoleId = r.RoleId
   FROM AuthRelationGrant g JOIN AuthRole r ON g.RoleCode = r.RoleCode;
   ```
3. **設 NOT NULL + FK**
   ```sql
   ALTER TABLE AuthRelationGrant ALTER COLUMN RoleId NVARCHAR(50) NOT NULL;
   ALTER TABLE AuthRelationGrant ADD CONSTRAINT FK_Grant_RoleId
       FOREIGN KEY (RoleId) REFERENCES AuthRole(RoleId);
   ```
4. **雙軌運行期**：程式碼同時寫入 RoleCode 和 RoleId
5. **移除舊 FK**
6. **清理**：移除程式中的雙寫邏輯

### 關鍵原則
- **永遠向後相容**：先加新的，最後才刪舊的
- **不要直接 rename PK**：所有 FK 瞬間斷裂
- **在低流量時段執行**：大表 ALTER + UPDATE 會鎖表
- **先在 staging 環境完整演練**

---

## Auth 專案場景
- `AuthRole` 規格書同時描述 `RoleId`（實體 PK）和 `RoleCode`（邏輯 PK）→ 見 [[Logical PK&Business Key]]
- 若未來需要統一 PK 或切換 FK 參照，就會用到此 SOP

---

## 相關概念
- [[Primary Key]] — 遷移的核心對象
- [[Foreign Key]] — FK 隨 PK 遷移
- [[Logical PK&Business Key]] — 雙 Key 模式的遷移考量
- [[DB-first vs Code-first]] — 你們的 Schema 變更由 DB 端執行

## 參考來源
- 📎 `_02 角色主檔(AuthRole)` §二 RoleId/RoleCode 雙 key 矛盾
- 📎 `_07 授權設定表(AuthRelationGrant)` §六 FK SQL
- 📎 BasicDBTransaction-MiddleLevel §11（安全遷移策略）
