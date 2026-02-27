---
project: Auth
tags: [knowledge, db, auth]
aliases: [時效性資料, ValidFrom ValidTo, 有效期模式]
created: 2026-02-27
---

# Temporal Pattern（時效性資料模式）

## 是什麼
用 `ValidFrom` / `ValidTo` 欄位控制資料的**生效與失效時間**——是 [[Delete Strategy]] 中軟刪除的進階版。

## 為什麼重要
- 權限可以「預排程」（如：2024-04-01 才生效）
- 權限可以「自動到期」（如：暫時權限三個月後收回）
- 查詢時忘了過濾有效期 → 會撈到過期資料 → 權限漏洞

---

## 核心觀念

### 標準過濾條件
```sql
WHERE IsActive = 1
  AND (ValidFrom IS NULL OR ValidFrom <= GETDATE())
  AND (ValidTo IS NULL OR ValidTo >= GETDATE())
```

### NULL 的語意
| 值 | 意義 |
|---|---|
| `ValidFrom = NULL` | 立即生效 |
| `ValidTo = NULL` | 永不失效 |
| 兩者皆 NULL | 永久有效（標準授權） |

### EF Core 封裝
```csharp
private IQueryable<T> ApplyTemporalFilter<T>(IQueryable<T> query, DateTime now)
    where T : IHasValidity
{
    return query.Where(e =>
        e.IsActive
        && (e.ValidFrom == null || e.ValidFrom <= now)
        && (e.ValidTo == null || e.ValidTo >= now));
}
```

### 常見踩坑
- **時區**：ValidFrom/ValidTo 存 UTC 還是 local？查詢的 `now` 要對齊
- **邊界值**：`ValidTo = 2024-03-31`，3/31 當天算有效（inclusive）
- **過期堆積**：ValidTo 過了資料不會消失 → 需要 [[Data Retention]] 清理
- **[[Guardrail Pattern]]** 的 active 定義要包含有效期

---

## Auth 專案涉及的表
- `AuthRelationPrincipalRole`：角色指派有效期
- `AuthRelationGrant`：授權有效期
- `AuthUserGroup`：群組成員資格有效期
- `AuthUserOverride`：個人覆寫有效期
- `AuthPrincipalGroup`：群組本身有效期

## Auth 搭配 [[Filtered Unique Index]]
`AuthRelationGrant` 的「標準授權」（ValidFrom/ValidTo 皆 NULL）只允許一筆，但帶期限的授權可以多筆。

---

## 相關概念
- [[Delete Strategy]] — Temporal Pattern 是軟刪除的延伸
- [[Data Retention]] — 過期資料需定期清理
- [[Permission Decision Flow]] — 第一層物理過濾包含有效期
- [[Filtered Unique Index]] — 搭配時效欄位做條件唯一
- [[AppCode Isolation]] — 查詢時要同時過濾有效期 + AppCode

## 參考來源
- 📎 `_04 主體角色關聯(AuthRelationPrincipalRole)` §四 時效性控制
- 📎 `_03 使用者群組(AuthPrincipalGroup)` §四 時間邊界校驗
- 📎 `權限系統架構總覽` 決策引擎第一層物理過濾
- 📎 BasicDBTransaction-MiddleLevel §10（Temporal Pattern）
