---
project: Auth
tags: [knowledge, db, auth]
aliases: [快取失效, Cache Invalidation, 連鎖反應]
created: 2026-02-27
---

# Cache Invalidation（快取失效）

## 是什麼
當 DB 資料變更後，**主動清除或更新相關快取**，確保使用者看到最新的權限狀態。

## 為什麼重要
- 權限系統改了 DB 但沒清快取 → 使用者以為權限沒變 → 安全漏洞
- 改 A 表往往影響 B、C、D 表的有效狀態 → 需要追蹤連鎖反應鏈
- 「快取失效是電腦科學最難的兩件事之一」

---

## 核心觀念

### 連鎖反應鏈（你們的 Auth 模組）
| 異動 | 影響範圍 | 需清除的快取 |
|---|---|---|
| 改 `AuthRole.IsActive` | 該角色下所有使用者 | `Perm:{UserId}:*` |
| 改 `AuthRelationPrincipalRole` | 該使用者 | `Perm:{UserId}:*` |
| 改 `AuthRelationGrant` | 該角色下所有使用者 | 需先查出受影響的 UserId |
| 改 `AuthUserGroup` | 該使用者 | `Perm:{UserId}:*` |
| `AuthPrincipalUser.IsActive = 0` | 該使用者的 Token | **全部撤銷** |

### Redis Key 設計（規格書建議）
```
Perm:{UserId}:{ResourceKey}:{ActionCode}
```
- 精準清除：只清受影響的 key，不整包刪
- 代價：需要先查 DB 得知「哪些 UserId 受影響」

### 業界做法
| 方案 | 即時性 | 複雜度 |
|---|---|---|
| **精準清除** | 最即時 | 需知道影響範圍 |
| **Pub/Sub 事件** | 即時 | 中等 |
| **短 TTL 自動過期** | 延遲 | 最簡單 |

### 實作原則
- 在 **Service 層的寫入方法結尾**統一呼叫 cache invalidation
- **不要在 Controller 裡零散清快取**（容易漏）
- 不要把快取查詢放在 [[Transaction]] 裡（會加大 [[Deadlock]] 風險）

---

## 相關概念
- [[Delete Strategy]] — 軟刪除 / 停用後必須清快取
- [[Transaction]] — 快取清理應在 Transaction commit 後
- [[Deadlock]] — 快取查詢放在 Transaction 裡會增加風險
- [[Permission Decision Flow]] — 權限查詢會先查快取

## 參考來源
- 📎 `_02 角色主檔(AuthRole)` §四 快取失效 + IsAdmin 變更
- 📎 `_04 主體角色關聯(AuthRelationPrincipalRole)` §四 快取連鎖失效
- 📎 `_07 授權設定表(AuthRelationGrant)` §四 快取策略
- 📎 `權限系統架構總覽` Redis Key 設計建議
- 📎 BasicDBTransaction-JuniorLevel §22（連鎖反應與快取失效）
