# Cookie

---

# 🧠 一、Concept Model

## 層級
Identity Transport（身份傳遞層）

## 核心角色
瀏覽器儲存身份資訊並自動隨 Request 傳送

## 解決問題
- Web session 管理
- Browser-based authentication

---

# 🧱 二、Cookie 內容類型

## 1️⃣ Session ID
Server-side session

## 2️⃣ JWT Cookie
JWT 存在 Cookie 裡

## 3️⃣ Encrypted Authentication Ticket
ASP.NET Identity 常見

---

# ⏱ 三、Runtime 時間流程位置

## Login 成功後
Server 設定：

Set-Cookie

## 每次 Request
Browser 自動帶上 Cookie

## Authentication Middleware
- 讀取 Cookie
- 解密
- 還原 ClaimsPrincipal

---

# 🔗 四、依賴關係

## Cookie 依賴：
- 瀏覽器
- Domain
- Path
- Secure 設定

## 下游依賴 Cookie：
- Authentication Middleware

---

# ⚠ 五、安全屬性

- HttpOnly
- Secure
- SameSite
- Expiration

---

# 🏗 六、專案實作對照

## 是否使用 Cookie Authentication？
- AddCookie()？
- Cookie 名稱？

## 是否混用 JWT？
- JWT 存在 Cookie 裡？
- 還是存在 LocalStorage？

---

# 🤖 七、AI 導讀補充

（貼 AI 分析 Cookie 設定）

- CookieOptions 設定在哪？
- 是否存在 CSRF 風險？
- 是否有自訂 CookieEvents？

---

# 🔍 八、JWT vs Cookie 對照觀察

| 比較 | JWT | Cookie |
|------|------|--------|
| 是否 Stateless | 是 | 可否 |
| 是否自動傳送 | 否 | 是 |
| API 常用 | 是 | 少 |
| Web App 常用 | 可 | 是 |

---

# 🔗 九、關聯筆記

- [[Identity-Transport]]
- [[UseAuthentication()]]
- [[JWT]]
- [[Middleware Pipeline]]
