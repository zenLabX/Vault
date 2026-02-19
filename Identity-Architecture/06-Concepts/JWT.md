# JWT (JSON Web Token)

---

# 🧠 一、Concept Model

## 層級
Identity Transport（身份傳遞層）

## 核心角色
作為身份資訊的載體，從 Client 傳到 Server

## 解決問題
- Stateless authentication
- 跨系統身份傳遞
- API 授權

---

# 🧱 二、結構

## 1️⃣ Header
- 演算法（alg）
- token 類型（typ）

## 2️⃣ Payload
- Claims
- sub
- email
- role
- exp

## 3️⃣ Signature
- 簽章
- 驗證完整性
- 防止竄改

---

# ⏱ 三、Runtime 時間流程位置

## Login 階段
IdP 發行 JWT

## Request 階段
Client 在 Header 加上：

Authorization: Bearer {token}

## Authentication 階段
UseAuthentication()：
- 驗證簽章
- 檢查 exp
- 解析 claims
- 建立 ClaimsPrincipal

---

# 🔗 四、依賴關係

## JWT 依賴：
- Issuer（身份發行者）
- Signing Key
- 驗證演算法

## 下游依賴 JWT：
- Authentication Middleware
- Authorization 決策

---

# 🏗 五、專案實作對照

## Token 來源：
（公司專案填）

## 驗證設定：
- Authority:
- Audience:
- ValidateIssuer:
- ValidateLifetime:

## 是否使用：
- Access token？
- id_token？
- Refresh token？

---

# 🤖 六、AI 導讀補充

（貼 AI 分析的 JWT 驗證流程）

- Token 驗證邏輯在哪？
- 是否有自訂 handler？
- 金鑰從哪裡載入？

---

# ⚠ 七、安全觀察

- 是否 ValidateLifetime = true？
- 是否硬編碼 SigningKey？
- 是否存在弱演算法？

---

# 🔗 八、關聯筆記

- [[Identity-Transport]]
- [[UseAuthentication()]]
- [[Claims]]
- [[ClaimsPrincipal]]
- [[Authorization]]
