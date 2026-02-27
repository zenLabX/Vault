---
project: Auth
tags: [knowledge, db, auth]
aliases: [AppCode, 多系統隔離, 多租戶, Multi-Tenant]
created: 2026-02-27
---

# AppCode Isolation（多系統隔離）

## 是什麼
用 `AppCode` 欄位（如 PMS、APS、TRADE）標記資料的**系統歸屬**，查詢時必須帶 AppCode 過濾，防止跨系統資料污染。

## 為什麼重要
- 查詢沒帶 AppCode → PMS 使用者看到 APS 的權限資料 → **權限污染**
- 等同於多租戶（Multi-Tenant）隔離的簡化版
- 規格書明確要求：查詢必須 `WHERE (AppCode = 'PMS' OR AppCode IS NULL)`

---

## 核心觀念

### 查詢過濾
```csharp
// AppCode = NULL 代表「全域」
WHERE (AppCode = @currentAppCode OR AppCode IS NULL)
```

### Service 層封裝
```csharp
protected IQueryable<T> FilterByApp<T>(IQueryable<T> query) where T : IHasAppCode
{
    return query.Where(e => e.AppCode == _currentAppCode || e.AppCode == null);
}
```
- 在 Base Service 統一加，**不要交給每個開發者自己記得**
- 如果用 EF Core Global Query Filter → 注意你們專案傾向 [[DB-first vs Code-first]] 不用 Fluent 設定

### 寫入時的 AppCode 控制
- Create：自動填入 `AppCode = _currentAppCode`
- Update/Delete：WHERE 也包含 AppCode（防改到別系統的資料）

### DataAdmin 後台
- 管理後台可能需要「看到所有 AppCode」
- 建議：用特殊 AppCode（如 `GLOBAL` 或 `*`）代表管理模式

---

## Auth 專案涉及的表
- `AuthRelationPrincipalRole`：角色指派的系統範圍
- `AuthUserGroup`：群組歸屬的系統範圍
- `AuthPrincipalGroup`：群組本身隸屬的系統
- `AuthResource`：資源的系統歸屬
- `AuthTokens`：Token 的系統歸屬

---

## 相關概念
- [[Temporal Pattern]] — 查詢時要同時過濾 AppCode + 有效期
- [[Permission Decision Flow]] — 決策引擎查詢必須帶 AppCode
- [[DB-first vs Code-first]] — Global Query Filter 的取捨

## 參考來源
- 📎 `_03 使用者群組(AuthPrincipalGroup)` §四 AppCode 權限污染防護
- 📎 `_04 主體角色關聯(AuthRelationPrincipalRole)` AppCode 欄位
- 📎 `_10 使用者群組對應表(AuthUserGroup)` §四 AppCode 核對
- 📎 BasicDBTransaction-JuniorLevel §20（AppCode 多系統隔離）
- 📎 BasicDBTransaction-MiddleLevel §12（Multi-Tenant Service 層實作）
