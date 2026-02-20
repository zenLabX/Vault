# SSO (Single Sign-On)

---

# 🧠 一、Concept Model

## 層級
Identity Issuance（身份發行層）

## 核心角色
讓使用者只登入一次，即可存取多個系統或應用

## 解決問題
- 避免多次登入
- 中央化身份管理
- 支援多系統/多域

---

# 🧱 二、常見協定 / 技術

- SAML 2.0
- OpenID Connect (OIDC)
- OAuth 2.0 (主要做授權，但常配 OIDC 做身份)
- Microsoft Entra ID / Active Directory Federation Services (ADFS)

---

# ⏱ 三、Runtime 流程位置

1️⃣ 使用者訪問應用
2️⃣ 應用發出認證請求到 IdP
3️⃣ IdP 驗證身份
4️⃣ IdP 發行 Token / Assertion (SAML / JWT / id_token)
5️⃣ 使用者帶著 Token 返回應用
6️⃣ UseAuthentication() 解析 Token → 建立 ClaimsPrincipal

---

# 🔗 四、依賴關係

## SSO 依賴：
- 身份提供者 (IdP)
- 使用者憑證
- 驗證協定（SAML / OIDC）
- 配置（ClientId, Secret, RedirectUri）

## 下游依賴：
- Token (JWT / SAML Assertion)
- UseAuthentication()
- ClaimsPrincipal

---

# 🏗 五、專案實作對照

## 站台/專案對應
- Repo 內有獨立 SSO 站台：`ERP.SSO`、`ERP.SSONT`
	- 這兩個專案在 csproj 上依賴 `ERP.CommonLib`，且 `ERP.SSO` 另依賴 `ERP.Security`、`ERP.SharedUI`

## SSO WebApp（ERP.SSO）的實際落地流程（可追到程式碼）
- 前端登入頁：`ERP.SSO/wwwroot/js/login.js`
	- 呼叫 `ssoUrl`（設定檔 `SSO:wwwroot/config.json`）對應的 `POST /v1/sso/login`
	- 登入成功後寫入 `AuthToken` cookie（`document.cookie = AuthToken=...; max-age=...`）
	- 接著導向：`/Account/FinalizeLogin?token=...&returnUrl=...`
- 後端完成登入：`ERP.SSO/Controllers/TokenLoginController.cs`
	- `FinalizeLogin` 會驗證 JWT（Issuer/Audience/SigningKey/Lifetime）
	- 驗證成功後呼叫 `HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal, ...)`
	- 並把 JWT token 寫入 `HttpContext.Session["JwtToken"]`

## 非 SSO 站台如何接 SSO（專案現況）
- 多個 MVC 站台使用 `app.UseJwtAuthentication()`（`ERP.CommonLib.Middleware.JwtAuthenticationMiddleware`）
	- 若 JWT 無效/不存在，middleware 會導向登入/SSO（詳見該 middleware 的註解與排除路徑設計）
	- 身分載體以 Cookie `AuthToken` 為主

## WebAPI 登入/簽發入口（已追到實作）
- `POST /v1/sso/login`：`ERP.WebAPI/Controllers/SSOController.cs`
  - 特色：支援 Captcha；會簽發 JWT；並額外用 response header 回傳 `X-App-Token`（子系統範圍 token）
- `POST /v1/auth/login`：`ERP.WebAPI/Controllers/AuthController.cs`
  - 特色：走多驗證器（`IAccountAuthenticator`）聚合策略；回傳 `LoginResponse`（包含 Token / UserProfile / Factories 等）

## 白名單/例外路徑（實作層）
- `ERP.Security/Middlewares/BearerTokenMiddleware.cs` 會把 `/v1/auth/login`、`/v1/sso/login` 等路徑列入白名單，避免 token gate 造成「登入本身也需要 token」的死鎖
- 白名單中存在 `/v1/auth/token/issue`（以及部分 MVC appsettings 也指向它），但目前在 repo 內未找到對應 action；可追到的 token issue 端點是 `GET /v1/token/issue`（`TokenController`）

---

# 🤖 六、AI 導讀補充

- AI 可以分析 SSO 流程對應程式碼
- 查看 Middleware Pipeline 是否正確串接
- 查看 Claims 映射設定是否正確
- 查看是否有自訂事件 (OnTokenValidated, OnRedirectToIdentityProvider)

---

# ⚠ 七、安全觀察

- 是否正確驗證 Token / Assertion 簽章
- 是否使用 HTTPS / Secure Cookie
- 是否正確處理 Logout / Session Revocation
- 是否有 Replay 攻擊風險

---

# 🔗 八、關聯筆記

- [[Identity-Issuance]]
- [[JWT]]
- [[UseAuthentication()]]
- [[ClaimsPrincipal]]
- [[Policy]]
