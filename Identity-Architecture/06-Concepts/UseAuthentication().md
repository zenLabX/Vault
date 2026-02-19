# UseAuthentication()

---

# 🧠 一、Concept Model

## 層級
Identity Restoration（身份還原層） + Middleware

## 核心角色
從 Request 中讀取身份資訊並建立 ClaimsPrincipal

## 解決問題
將 JWT / Cookie 轉換為系統可用的身份物件

---

# 🧱 二、它實際做什麼？

1️⃣ 讀取 Request 中的 Token
2️⃣ 驗證簽章
3️⃣ 檢查過期時間
4️⃣ 解析 Claims
5️⃣ 建立 ClaimsPrincipal
6️⃣ 塞入 HttpContext.User

⚠ 它不做授權判斷

---

# ⏱ 三、Runtime 位置

Request 進入 Pipeline：

UseAuthentication()
    ↓
UseAuthorization()

必須在 UseAuthorization() 之前

---

# 🔗 四、依賴關係

## 依賴：

- JWT 或 Cookie
- Authentication Scheme
- Signing Key

## 下游依賴：

- ClaimsPrincipal
- Authorization Middleware
- Controller

---

# 🏗 五、專案實作對照

- 使用 JwtBearer？
- 使用 Cookie Authentication？
- 金鑰來源？

---

# 🤖 六、AI 導讀補充

- 驗證參數在哪？
- 是否 ValidateIssuer？
- 是否 ValidateLifetime？

---

# 🔗 七、關聯筆記

- [[JWT]]
- [[Cookie]]
- [[Claims]]
- [[ClaimsPrincipal]]
- [[UseAuthorization()]]
