# AuthTokens Prototype Spec（2026-02-26）

本文件描述 AuthTokens（權杖管理表）的 prototype 規格、欄位解讀、UI/互動流程、以及實作注意事項。

- Prototype 路徑：`file/AuthTokens/`
- 技術：Pure HTML / CSS / Vanilla JS（無框架、無後端、in-memory 假資料）
- 主要參考文件：
  - `[技術規格書] 權限模組_09_權杖管理表 (AuthTokens)`

---

## 1. 文件解讀重點（為何要有 AuthTokens）

1) **Stateful JWT（能即時強制登出）**
- 傳統 Stateless JWT 無法「中途失效」。
- 文件設計：簽章驗證後，Middleware 仍需查 AuthTokens，確認 Token **存在且未被撤銷**。

2) **撤銷 (Revocation) 與稽核 (Audit)**
- `IsRevoked=1` 可立即阻擋後續存取。
- `EffectiveUserId` 用於 Impersonation（代理登入），追查「誰假裝成誰」。

3) **性能核心：TokenHash 查詢**
- 文件強制規範：不得用長字串 `Token` 做查詢或索引；必須用 `TokenHash (SHA-256, 32 bytes)`。

4) **資料留存與清理**
- 文件要求 TTL 策略：Background Job 定期刪除 `ExpiresAt < NOW - 7 Days`（保留緩衝供稽核）。

---

## 2. 你已確認的 prototype 決策

- `Delete` 按鈕語意：**Revoke**（按下後設 `IsRevoked=1`）。
- `AppCode` / `Source`：**固定且 disabled**，並且 **不可為 NULL**（prototype 使用 `PMS`）。
- TokenHash：新增時 **輸入 Token，系統自動計算 TokenHash**。

---

## 3. 欄位解讀與注意事項（UI/驗證觀點）

### 3.1 PK / Identity
- `TokenId`：BIGINT IDENTITY，內部 PK。
  - Prototype：新增時自動遞增，唯讀顯示。

### 3.2 Token / TokenHash
- `Token`：僅供存檔與稽核除錯，不作查詢條件。
- `TokenHash`：核心查詢鍵（對應 VARBINARY(32)）。
  - Prototype：以 64 hex chars 表示 32 bytes。
  - 注意：瀏覽器若不支援 WebCrypto，prototype 會改用「可重現的假雜湊」以保留 UX 流程（非安全用途）。

### 3.3 User / Context
- `UserId`：FK → AuthPrincipalUser.UserId。
- `Source`：登入來源（PMS/MobileApp...）；prototype 固定。
- `AppCode`：Token 允許存取的目標系統；prototype 固定。
- `EffectiveUserId`：代理登入時填寫操作者 ID。

### 3.4 Lifecycle
- `IssuedAt`：簽發時間（prototype 自動）。
- `ExpiresAt`：過期時間（必填）。
- DB 約束：`ExpiresAt > IssuedAt`（prototype 驗證嚴格大於）。

### 3.5 Revocation
- `IsRevoked`：撤銷標記。
- Prototype guardrail：Token 一旦 Revoked，不允許改回 Valid（不可復原）。

### 3.6 Audit / Concurrency
- `RowVersion`：Optimistic Locking。
- Prototype：以數字遞增模擬，Edit Save 時做 mismatch 檢查。

---

## 4. Prototype 功能範圍

### 4.1 Search / Index
- 條件：UserId、TokenHash（contains / prefix）、IsRevoked（AppCode/Source 固定）
- 列表：TokenId、UserId、IssuedAt、ExpiresAt、IsRevoked、EffectiveUserId、TokenHash(縮短顯示)
- Row actions：Detail / Edit / Delete(Revoke)

### 4.2 Detail
- Drawer 唯讀檢視完整欄位。

### 4.3 Add New
- Drawer 新增（prototype 模擬簽發）：
  - 必填：UserId、Token、ExpiresAt
  - 自動：IssuedAt、TokenHash
  - 驗證：ExpiresAt > IssuedAt

### 4.4 Edit
- 不可改：Token、TokenHash、UserId、AppCode、Source、IssuedAt。
- 可改：ExpiresAt、EffectiveUserId、IsRevoked（僅能 0→1）。

### 4.5 Delete(Revoke)
- 行為：設 `IsRevoked=1`（強制登出）。

---

## 5. 已知簡化（prototype 與正式系統差異）

- 無 Middleware/簽章驗證串接：prototype 不會真的驗 JWT，只呈現資料管理。
- 無 TTL Job：僅在 spec 提醒需背景清理。
- TokenHash 的 SHA-256：在不支援 WebCrypto 的環境以 deterministic fallback 模擬（不可用於安全目的）。
