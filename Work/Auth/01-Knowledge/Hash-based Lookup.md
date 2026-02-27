---
project: Auth
tags: [knowledge, db, auth]
aliases: [雜湊查詢, Token Hash, 雜湊索引]
created: 2026-02-27
---

# Hash-based Lookup（雜湊查詢）

## 是什麼
對**超長字串**（如 JWT Token）先算 hash（如 SHA-256），再用 hash 值做 [[Index]] 查詢——把索引大小從數百 bytes 壓縮到固定 32 bytes。

## 為什麼重要
- JWT Token 可能超過 1KB，直接做 WHERE / index Key 極度浪費 IO 和 CPU
- Hash 索引固定 32 bytes，查詢效率高出數倍
- 規格書明確規定：**禁止** `WHERE Token = '...'`

---

## 核心觀念

### 實作模式
1. 寫入時：程式算出 `SHA256(Token)` 存入 `TokenHash` 欄位
2. 查詢時：`WHERE TokenHash = @hash`
3. 原始 Token 欄位保留，但**只用於除錯/稽核**，不用來搜尋

### 索引設計
```sql
CREATE NONCLUSTERED INDEX IX_AuthTokens_Hash
ON AuthTokens (TokenHash);
-- TokenHash 只有 32 bytes → 索引極小，seek 極快
```

### 通用適用場景
- API Key、Session Token、長字串識別碼
- 任何「值太長不適合做索引 key」的欄位

---

## Auth 專案實例
- `AuthTokens.TokenHash`：SHA-256 hash of JWT Token
- 查詢模式：`WHERE TokenHash = @computedHash`
- 搭配 [[Data Retention]]（TTL Job）定期清理過期 Token

---

## 相關概念
- [[Index]] — Hash-based Lookup 是索引最佳化的一種手法
- [[Data Retention]] — Token 表的 TTL 清理策略
- [[Execution Plan]] — 驗證 hash 查詢是否真的走 Index Seek

## 參考來源
- 📎 `_09 權杖管理表(AuthTokens)` §四 儲存優化策略（雜湊查詢原則）+ §三 IX_AuthTokens_Hash
- 📎 BasicDBTransaction-JuniorLevel §19（Hash-based Lookup）
