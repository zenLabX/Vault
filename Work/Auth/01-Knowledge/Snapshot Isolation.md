---
project: Auth
tags: [knowledge, db, auth]
aliases: [快照隔離, RCSI, Row Versioning Isolation]
created: 2026-02-27
---

# Snapshot Isolation（快照隔離）

## 是什麼
SQL Server 特有的 [[Isolation Level]]——**不加鎖**，改用 Row Versioning（tempdb 存歷史版本），讀取時看到的是交易開始時的快照。

## 為什麼重要
- 讀取不加鎖 → 大幅降低 [[Deadlock]] 機率
- 適合讀多寫少的系統（如權限查詢）
- 寫入時若偵測到衝突，會拋「update conflict」→ 自動防止 lost update

---

## 核心觀念

### 與傳統隔離的差異
| 傳統（Lock-based） | Snapshot（Version-based） |
|---|---|
| 讀取時加共享鎖 | 讀取時**不加鎖** |
| 可能阻塞寫入 | 讀寫互不阻塞 |
| 鎖競爭 → [[Deadlock]] | 衝突以 exception 方式回報 |
| 即時看到最新資料 | 看到交易開始時的快照 |

### 啟用方式
```sql
-- DB 層級啟用（DBA 操作）
ALTER DATABASE [YourDB] SET ALLOW_SNAPSHOT_ISOLATION ON;
-- 或啟用 RCSI（Read Committed Snapshot Isolation）
ALTER DATABASE [YourDB] SET READ_COMMITTED_SNAPSHOT ON;
```

### 注意事項
- tempdb 負擔增加（存歷史版本）
- 寫入衝突會拋 exception，程式要處理（類似 [[Optimistic Lock]]）

---

## Auth 專案場景
- **權限判斷查詢**：讀多寫少，用 Snapshot 避免讀取被寫入阻塞
- **[[Permission Decision Flow]]** 的五層查詢：全程不加鎖，效能最佳

---

## 相關概念
- [[Isolation Level]] — Snapshot 是 SQL Server 的第五種隔離等級
- [[Optimistic Lock]] — 概念類似（衝突時才報錯）
- [[Deadlock]] — Snapshot 可大幅降低 Deadlock 發生率
- [[Transaction]] — Snapshot 是 Transaction 的屬性設定

## 參考來源
- 📎 BasicDBTransaction-MiddleLevel §1.4（SQL Server SNAPSHOT Isolation）
- 📎 `權限系統架構總覽` 決策引擎第一層物理過濾
