# Identity Issuance（身份發行層）

## 定義（你可以直接拿去對外溝通）
Identity Issuance 是「完成身分驗證後，簽發可被其他系統信任的身分憑證（Token / Assertion）」的能力層。  
它通常由 IdP（Identity Provider）提供，並透過標準協定（OIDC / SAML）把「誰是誰」與必要屬性安全地交付給應用系統。

---

## 角色（Responsibilities）
- 驗證使用者（Authentication）：帳密、MFA、裝置/風險評估、條件式存取（依產品而定）
- **簽發身份憑證（Issuance）**：發出 token/assertion（例如 OIDC id_token、SAML assertion）
- 提供使用者屬性（Claims）：email、name、employeeId、department、groups 等
- 金鑰與簽章管理：用簽章確保 token 不可竄改（JWKS / signing keys）
- Token 生命週期治理：過期時間、撤銷（revocation）、重發（refresh）
-（可選）單一登入 SSO 支援：維持 IdP session，使多系統可重用登入狀態

> 注意：**授權（Authorization）與權限判斷通常在應用或內部 IAM 做**；Issuance 主要回答「你是誰」與「你有哪些屬性」。

---

## 代表系統（Examples / Vendors）
- [[Microsoft Entra ID]]（Azure AD）
- Okta
- Ping Identity
- Google Identity / Google Workspace（做企業帳號時）
- Keycloak（自建）
- Auth0（SaaS）

---

## 時間流程位置（Time / Flow）
以 OIDC（OpenID Connect）為例：

1. 使用者在應用系統（SP/RP）點「登入」
2. 應用把使用者 **redirect 到 IdP**
3. IdP 進行驗證（帳密/MFA/條件式存取）
4. 驗證成功後，IdP 將使用者導回應用的 callback（通常帶授權碼 code）
5. 應用用 code 向 IdP 換取 token
6. **IdP 簽發 token（Identity Issuance 發生點）**
7. 應用驗證 token 簽章/有效期/受眾（audience），建立本地 session（cookie）

---

## 依賴（Dependencies）
- 使用者憑證：帳密 / MFA / FIDO2 / 生物辨識（取決於 IdP）
- IdP 端使用者目錄：使用者帳號、狀態（啟用/停用）、群組/部門等屬性
- 應用端事前設定：
  - ClientId / ClientSecret 或憑證（client auth）
  - Redirect URI 白名單
  - 信任設定（issuer、jwks_uri、簽章演算法）
- 時間同步：NTP（避免 token 的 exp/nbf 驗證失敗）
-（若是企業整合）HR/AD 同步：員工到職/離職、部門異動

---

## 輸出（Outputs）
### OIDC 常見
- **id_token**（身份聲明，回答「你是誰」）
- **access_token**（呼叫資源 API 的憑證，回答「你能用什麼 API」）
- refresh_token（可選，用於延長登入不需重新互動）

### SAML 常見
- SAML Assertion（等價於 id_token 的角色）

---

## Token 裡常見的資料（Claims / Expected Data）
- `iss`：發行者（IdP）
- `sub`：使用者唯一識別（穩定且不可猜）
- `aud`：接收者（你的系統 ClientId）
- `exp/iat/nbf`：有效期相關
- `email`, `name`
-（企業常用）`employeeId`, `department`, `factory`, `costCenter`
-（若做角色/群組）`groups` 或自訂 `roles`（注意：大多公司仍會做「系統內映射」）

---

## 我目前理解（補強版）
你的理解「看起來是發行 token 的地方」是對的；再補一句更精準的：

> Identity Issuance 不只發 token，還包含「token 的信任與可驗證性」（簽章、issuer、audience、有效期）以及把使用者屬性用標準方式交付給應用。

---

## 與 SSO 的關係（釐清用）
- **Identity Issuance ≠ SSO**（不是同一個詞）
- 但 **SSO 很大一部分是建立在 Identity Issuance 之上**
- SSO 發生的關鍵是：IdP 有 session，使用者第二個系統再被 redirect 回 IdP 時，IdP 不需要再次互動登入，就能直接再簽一次 token

---

## 問題區（實作時補：我先幫你列成檢核清單）
### 1) 登入策略
- 是否只允許公司網域（例如 `@garment.com`）？
- 是否允許外部供應商/代工廠用 Google / Entra B2B？
- 是否強制 MFA？哪些角色必須（財務、採購、工單審核）？

### 2) 帳號對應（外部身分 → 系統帳號）
- 用 `sub` 還是 `email` 當作本地唯一鍵？（建議：`sub` + 另外保存 email，email 可能變）
- 第一次登入是否自動開帳？還是要 IT/主管審核？
- 離職/停用：IdP 停用後，本系統 session 要不要即刻失效？

### 3) 權限模型與 Claims
- 角色/群組是從 IdP 帶過來，還是系統內維護？
- 若 IdP 帶 groups：群組量太大怎麼處理（group overage）？
- 工廠常見：按「廠別/產線/站點」切權限，資料怎麼表達？（claim vs 本地表）

### 4) Token 驗證與安全
- 驗證哪些項目：issuer、audience、簽章、clock skew、nonce/state
- Token 存放：是否存 access_token？（通常不要存太久，避免外洩風險）
- Redirect URI、CORS、SameSite cookie 設定

### 5) 登出與風險
- 需要 Single Logout（SLO）嗎？（多數 OIDC 不保證完整 SLO）
- 產線共用機台：要不要短 session、閒置自動登出、禁止記住我？

### 6) 稽核與可追蹤
- 需要登入稽核：誰、何時、哪台機器、哪個 IP、是否 MFA 成功
- 需要把 IdP 的 sign-in logs 對接 SIEM 或內部稽核報表嗎？

---

## C# ASP.NET Core MVC（最小示例：把 IdP 當 issuance 來源）
> 這段示例對應到「redirect → 驗證 → 拿到 token → 建立本地 cookie session」。

```csharp
// Program.cs（示例：OIDC）
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.OpenIdConnect;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllersWithViews();

builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = OpenIdConnectDefaults.AuthenticationScheme;
})
.AddCookie()
.AddOpenIdConnect(options =>
{
    options.Authority = "https://login.microsoftonline.com/{tenantId}/v2.0"; // Entra ID
    options.ClientId = builder.Configuration["Auth:ClientId"];
    options.ClientSecret = builder.Configuration["Auth:ClientSecret"];
    options.ResponseType = "code";

    options.Scope.Add("openid");
    options.Scope.Add("profile");
    options.Scope.Add("email");

    options.SaveTokens = true; // 可拿到 id_token / access_token
});

var app = builder.Build();
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapDefaultControllerRoute();
app.Run();
```

---

## 一句話總結（放在筆記最上面也可以）
Identity Issuance = 「IdP 在完成驗證後，**簽發可被應用驗證/信任的 token/assertion**，讓多系統能用同一個身分來源（SSO 的基石）」