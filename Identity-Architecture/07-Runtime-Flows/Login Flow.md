
## 理論流程

Policy 依賴 ClaimsPrincipal
ClaimsPrincipal 依賴 Claims
UseAuthorization 依賴 UseAuthentication
UseAuthentication 依賴 JWT/Cookie
JWT 依賴 Issuer + Signing Key

```

User → IdP → 驗證 → 發 JWT → Client 儲存

Request Flow:
Client → Authorization Header
        ↓
UseAuthentication()
        ↓
建立 ClaimsPrincipal
        ↓
UseAuthorization()
        ↓
Policy 檢查
        ↓
Controller

```



---

## 專案實際流程

本 repo 實際有兩種「登入 → 取得可用身分材料」的路徑：

### A) WebAPI 登入（給 API Client / SPA / App）
1. Client 呼叫登入/簽發相關 API
        - `POST /v1/auth/login`：`ERP.WebAPI/Controllers/AuthController.cs`
        - `POST /v1/sso/login`：`ERP.WebAPI/Controllers/SSOController.cs`（含 Captcha + 會簽發 App-Scoped Token 到 response header）
        - `GET /v1/token/issue`：`ERP.WebAPI/Controllers/TokenController.cs`（系統對系統用途，靠 Header `TokenKey`）
2. 後端產生 JWT 的方式有多路徑（以程式碼為準）
        - `AuthService` 路徑：`ERP.Security.Utilities.TokenGenerator.GenerateToken(...)`（預設效期 12h）
        - `SSOController` 路徑：在 Controller 內直接用 `JwtSecurityToken` + HMAC Key 簽發（效期 12h 或 RememberMe 30d）
        - `TokenController` 路徑：`TokenGenerator.GenerateToken(username, ...)`
3. Client 保存 JWT（通常在記憶體/安全儲存）
4. 後續呼叫 API 時加上 `Authorization: Bearer <jwt>`

### B) MVC 站台登入（以瀏覽器 Cookie 為主）
1. 使用者訪問 MVC 頁面
2. `ERP.CommonLib.Middleware.JwtAuthenticationMiddleware` 嘗試從 Cookie `AuthToken`（或 query `token`）還原 `HttpContext.User`
3. 若無 token 或驗證失敗：依 middleware 設計導向登入（排除路徑包含 `/account/login` 等）
4. 登入成功後，站台以 Cookie 方式保存：
        - `AuthToken`（JWT）
        - 以及多個使用者/工廠情境 cookie（例如 `Factories`、`CurrentFactory`、`UserID` 等，供畫面與查詢使用）

#### Cookie 實際寫入點（本 repo 可追到）
- **前端（JS）寫入**：登入成功後直接用 `document.cookie = ...` 寫入多個 cookies
        - `ERP.SharedUI/wwwroot/js/login/login.js`
        - `ERP.PMS/wwwroot/js/login/login.js`
        - `ERP.PMS.Sewing/wwwroot/js/login/login.js`
        - 寫入項目包含：`AuthToken`、`Factories`、`CurrentFactory`、`CurrentDivisionID`、`CurrentFtyGroup`、`UserID`、`UserEmail`、`IsAdmin`…
- **SSO WebApp 也會寫入 AuthToken**
        - `ERP.SSO/wwwroot/js/login.js`：登入成功後寫 `AuthToken` cookie，並導向 `/Account/FinalizeLogin?token=...`
        - `ERP.SSO/Controllers/TokenLoginController.cs`：`FinalizeLogin` 驗證 JWT 後以 `SignInAsync` 建立 ASP.NET CookieAuthentication ticket
- **後端（Middleware）續期/刷新**：`ERP.CommonLib/Middleware/JwtAuthenticationMiddleware.cs`
        - 每次 request 驗證成功後會重新 `Append("AuthToken", ...)` 設定 `HttpOnly/Secure/SameSite/Expires`
- **後端（取得 SSO token 時順便落 cookie）**：
        - `ERP.CommonLib/Helpers/Network/ApiHelper.cs`（`SetTokenToCookies`）
        - `ERP.CommonLib/Services/ApiCalling/Implementations/JwtAuthenticationProvider.cs`（取得 `/v1/token/issue` 類端點後寫入 `AuthToken`）

---

## AI 導讀發現

- Middleware 順序是否一致？
- 有沒有 Custom Middleware？


（上述已補上可追到的實作點；若你想把「Factory 切換時後端寫入 cookie + reload」也一起追齊，我可以再把 `switchFactory(...)` 對應到 MVC controller action 的實作位置補進來。）