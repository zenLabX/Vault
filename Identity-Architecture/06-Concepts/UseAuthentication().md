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

本專案同時存在「框架內建 Authentication Handler」與「自訂 JWT 還原 Middleware」兩條路徑：

## A) WebAPI：JwtBearer + app.UseAuthentication()
- 代表：`ERP.WebAPI.PMS`、`ERP.WebAPI.DataAdmin`
- Request 會帶 `Authorization: Bearer <jwt>`
- Pipeline 會在 `UseAuthorization()` 前呼叫 `app.UseAuthentication()`，由 `JwtBearer` handler 驗證 JWT 並建立 `HttpContext.User`
- 另外會插入 `ERP.Security.Middlewares.BearerTokenMiddleware`（放在 `UseAuthentication()` 前）先做「Header / 逾期 / 基本 claim」的快速驗證與白名單放行

## B) MVC：app.UseJwtAuthentication()（ERP.CommonLib）
- 代表：`ERP.Trade`、`ERP.DataAdmin`
- 不一定會呼叫 `app.UseAuthentication()`；而是使用 `app.UseJwtAuthentication()`（`ERP.CommonLib.Middleware.JwtAuthenticationMiddleware`）
- 身分載體：Cookie `AuthToken`（必要時也支援 query string `token`）
- 驗證設定：讀取 `Jwt:Key` / `Jwt:Issuer` / `Jwt:Audience`，`ClockSkew = 0`
- 成功後直接指派 `HttpContext.User = principal`，讓 `UseAuthorization()`/Controller 可使用

## C) MVC 混合：CookieAuthentication + JwtBearer
- 代表：`ERP.PMS.Sewing`
- 服務註冊同時 `AddCookie(...)` + `AddJwtBearer(...)`
- Pipeline：`app.UseJwtAuthentication(); app.UseAuthentication(); app.UseAuthorization();`
- 授權預設：設定 `FallbackPolicy`，未標 `[AllowAnonymous]` 的頁面/端點一律要求已登入

## 金鑰/參數來源（可追碼）
- `ERP.Security.Utilities.TokenGenerator`：從 `appsettings.json` 讀 `Jwt:Key` / `Jwt:Issuer` / `Jwt:Audience` 產生 JWT（預設效期 12 小時）
- `ERP.CommonLib.Middleware.JwtAuthenticationMiddleware`：從 `Jwt:*` 讀驗證參數並還原 `ClaimsPrincipal`
- `ERP.WebAPI.*`：在各自 `Program.cs` 配置 `JwtBearer` 驗證參數（ValidateIssuer/Audience/Lifetime/SigningKey）

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
