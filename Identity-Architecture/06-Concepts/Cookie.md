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
- 有（但不是所有 MVC 都用框架 CookieAuth）：
	- `ERP.PMS.Sewing`：有 `AddCookie(...)`（MVC 頁面登入預設 scheme），並搭配 `app.UseAuthentication()`
	- `ERP.Trade` / `ERP.DataAdmin`：主要不是 ASP.NET CookieAuthentication；而是「JWT 放在 Cookie」+ `app.UseJwtAuthentication()` 自行還原

## JWT Cookie（本專案常見）
- JWT Cookie 名稱：`AuthToken`
- 讀取位置：`ERP.CommonLib.Middleware.JwtAuthenticationMiddleware`
- 額外的身分/情境資訊也常以 Cookie 傳遞（例如：`Factories`、`CurrentFactory`、`CurrentDivisionID`、`UserID`、`UserEmail` 等），Controller 會直接讀取供畫面/查詢使用

## Cookie 實際寫入點（本 repo 可追到）
- **前端（JS）寫入（登入時）**
	- `ERP.SharedUI/wwwroot/js/login/login.js`（登入成功後 `document.cookie = ...`）
	- `ERP.PMS/wwwroot/js/login/login.js`
	- `ERP.PMS.Sewing/wwwroot/js/login/login.js`
	- `ERP.SSO/wwwroot/js/login.js`（登入成功後寫入 `AuthToken` cookie，接著導向 `/Account/FinalizeLogin`）
	- 寫入包含：`AuthToken`、`Factories`、`CurrentFactory`、`CurrentDivisionID`、`CurrentFtyGroup`、`UserName`、`UserEmail`、`IsAdmin`...
- **後端（Middleware）刷新 AuthToken（每次 request）**
	- `ERP.CommonLib/Middleware/JwtAuthenticationMiddleware.cs`
	- 驗證成功後會重新寫入 `AuthToken` cookie（`HttpOnly = true`, `Secure = true`, `SameSite = Lax`, `Expires = UtcNow + 12h`）

## ASP.NET CookieAuthentication（SSO 站台有用）
- `ERP.SSO/Controllers/TokenLoginController.cs` 會在 `FinalizeLogin` 中呼叫 `HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal, ...)`
- 這會產生「框架的 authentication ticket cookie」（cookie 名稱依設定而定），與 `AuthToken` JWT cookie 是兩種不同材料（可同時存在）

## 是否混用 JWT？
- 主要是「JWT 存在 Cookie 裡」
- 未看到把 JWT 放 `localStorage` 的既有實作（至少在這個 repo 的 server 端邏輯沒有依賴它）

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
