---
project: Auth
tags: [knowledge, db, auth]
aliases: [系統預設值保護, Protected Data, 不可變系統資料]
created: 2026-02-27
---

# Immutable System Data（系統預設值保護）

## 是什麼
某些資料是**系統內建**的，程式碼直接 hardcode 引用。如果被管理員改名或刪除，整個業務邏輯就崩潰。

## 為什麼重要
- `ActionCode = 'VIEW'` 被程式引用 → 改名 = 權限邏輯崩壞
- Root 節點被刪 → 整棵 [[Self-Referencing FK]] 樹斷裂
- SuperAdmin 被停用 → 系統失去最高管理權

---

## 核心觀念

### 實作模式 A：程式碼 Hardcode 白名單
```csharp
private static readonly HashSet<string> ProtectedActionCodes = new()
{
    "VIEW", "CREATE", "EDIT", "DELETE", "EXPORT",
    "PRINT", "SUBMIT", "APPROVE", "REJECT", "VOID"
};

public async Task<Result> UpdateActionAsync(string actionCode, ...)
{
    if (ProtectedActionCodes.Contains(actionCode))
        return Result.Fail("系統內建動作不允許修改");
}
```

### 實作模式 B：DB 標記欄位
```csharp
var action = await _context.AuthAction.FindAsync(actionCode);
if (action.IsBasicAction)
    return Result.Fail("基礎動作不可異動");
```

---

## Auth 專案需要保護的資料
| 資料表 | 保護對象 | 原因 |
|---|---|---|
| `AuthAction` | VIEW、CREATE、EDIT、DELETE 等核心動作 | 程式 hardcode 引用 |
| `AuthResource` | 根節點 | 刪除 = 整棵樹斷裂 |
| `AuthRole` | SUPER_ADMIN（如有） | 不能被停用或刪除 |

---

## 相關概念
- [[Constraints]] — 保護可在 DB CHECK 層加強
- [[Delete Strategy]] — 受保護資料禁止刪除
- [[Self-Referencing FK]] — 根節點保護

## 參考來源
- 📎 `_06 操作動作表(AuthAction)` §四 系統預設值保護（不可變更原則）+ §六 初始化 Script
- 📎 `_05 資源主檔(AuthResource)` §四 禁刪非葉節點
- 📎 BasicDBTransaction-MiddleLevel §14（Immutable System Data）
