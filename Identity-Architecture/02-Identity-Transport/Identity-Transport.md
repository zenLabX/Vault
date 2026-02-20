# Identity Transport（身份傳遞層）

## 定義
Identity Transport 是「把已取得的身分憑證（token / session id）在客戶端與伺服器之間安全地帶著走」的層次。  
它不負責驗證身分真偽（那是伺服器端驗證/IdP 的事），重點在 **放哪裡、怎麼帶、怎麼防外洩/被濫用**。

---

## 角色（Responsibilities）
- 決定身分資訊的承載方式：Cookie / Authorization Header /（少見）QueryString
- 確保傳遞安全性：
  - 只走 HTTPS（避免被攔截）
  - 適當的瀏覽器安全屬性（HttpOnly / Secure / SameSite）
  - Token 儲存位置策略（避免被 XSS 讀到）
- 協助伺服器端辨識「這個 request 是誰發的」：讓每次 request 都能帶上可驗證的身分材料

---

## 技術（常見載體）
- [[Cookie]]
  - **Session Cookie**（cookie 裡放 session id，伺服器查 session store）
  - **Auth Cookie**（ASP.NET Core 常見：cookie 內含加密/簽章的 claims ticket）
- [[JWT]]
  - 通常放在 Authorization: Bearer `<token>`（最常見）
  - 可能放在 cookie（但要非常小心 XSS/CSRF 的綜合風險）
- Authorization Header
  - `Authorization: Bearer <access_token>`
  - 適合：API、SPA、Mobile、服務間呼叫

> 原則：**MVC（伺服器端渲染）多用 Cookie；API 多用 Bearer token**。混用可以，但要明確邊界。

---

## 時間流程（Time / Flow）
- 使用者完成登入後（Issuance 已簽發 token 或應用已建立 session）
- **之後每一次 Request**：
  - Cookie 模式：瀏覽器自動帶上 Cookie
  - Bearer 模式：前端程式在每次呼叫 API 時手動加上 Authorization Header

---

## 依賴（Dependencies）
- Issuance（身份發行層）產出的材料：
  - id_token / access_token（OIDC）
  - 或應用自行建立的 auth cookie（本地 session）
- 伺服器端的驗證設定：
  - Cookie 驗證中介軟體（ASP.NET Core Authentication Cookie）
  - JWT Bearer 驗證（簽章金鑰、issuer、audience、clock skew）
- 瀏覽器與網路安全前提：
  - HTTPS/TLS
  - 正確的 CORS（若有跨網域 API）
  - 正確的 SameSite 策略

---

## 輸出（Transport 實際長什麼樣子）
### 1) Cookie（MVC 常見）
- Request Header 自動帶：
  - `Cookie: .AspNetCore.Cookies=...`

### 2) Authorization Header（API 常見）
- Request Header：
  - `Authorization: Bearer eyJhbGciOi...`

---

## 風險（Threats）與對策（Mitigations）
### 1) XSS（跨站腳本）
**風險**：如果 token 放在 `localStorage/sessionStorage` 或可被 JS 讀到的位置，被注入腳本就可能被偷走。  
**對策**：
- MVC + Cookie：設 `HttpOnly=true`（JS 讀不到）
- 全站做輸入輸出編碼、CSP（Content-Security-Policy）、避免 inline script
- 不要把 access_token 長期放 localStorage（若一定要，用短效 token + 旋轉機制）

### 2) CSRF（跨站請求偽造）
**風險**：Cookie 會自動附帶，攻擊者可誘導使用者瀏覽器對你站台發出「帶著 Cookie 的惡意請求」。  
**對策**：
- ASP.NET Core MVC 表單：使用 Anti-Forgery Token（ValidateAntiForgeryToken）
- Cookie 設定 `SameSite=Lax` 或 `Strict`（視 SSO/跨站導轉需求調整）
- 重要操作加二次確認/重輸密碼（例如工單作廢、出貨放行）

### 3) Token 被竊聽 / 中間人攻擊
**風險**：若非 HTTPS，token 可能被攔截。  
**對策**：強制 HTTPS + HSTS。

### 4) Token 重放（Replay）
**風險**：token 被偷後在有效期內可被重放。  
**對策**：
- 縮短 access_token 有效期
- 高風險操作使用 step-up MFA 或一次性確認
-（進階）token 綁定裝置/DPoP/MTLS（看系統成熟度）

### 5) CORS / 同源策略誤設
**風險**：允許任意網域呼叫 API + 帶憑證會爆炸。  
**對策**：CORS 白名單、避免 `AllowAnyOrigin` + `AllowCredentials` 同時存在。

---

## 選型建議（成衣廠常見系統型態）
- 內網/辦公室用的「工單/生管/採購」MVC：**Cookie + Anti-forgery**
- 對接 PDA/平板「入庫、出庫、盤點」API：**Bearer access_token**
- 產線共用機台（多人輪班）：Cookie session 要短、閒置自動登出，避免「上一班帳號殘留」

---

## C# ASP.NET Core MVC 範例（Cookie Transport + 防 CSRF）
```csharp
// Program.cs
using Microsoft.AspNetCore.Authentication.Cookies;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllersWithViews();

builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = ".Garment.Auth";
        options.Cookie.HttpOnly = true;          // 防 XSS 讀取
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always; // 只走 HTTPS
        options.Cookie.SameSite = SameSiteMode.Lax; // 多數 MVC 預設安全選擇
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
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

```csharp
// Controllers/OrdersController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace WebApp.Controllers;

[Authorize]
public class OrdersController : Controller
{
    [HttpPost]
    [ValidateAntiForgeryToken] // 防 CSRF（搭配 Cookie）
    public IActionResult Cancel(int id, string reason)
    {
        // 取消工單（示意）
        return RedirectToAction("Details", new { id });
    }
}
```

```html
<!-- Views/Orders/Details.cshtml：送出表單時自動帶 Anti-forgery token -->
<form asp-action="Cancel" method="post">
    <input type="hidden" name="id" value="@Model.Id" />
    <input type="text" name="reason" />
    <button type="submit">取消工單</button>
</form>
```

---

## 專案實作對照（本 repo 已觀察到）
- **混用（Web vs API 邊界存在）**
  - WebAPI：主要走 `Authorization: Bearer <jwt>`（搭配 `ERP.Security.Middlewares.BearerTokenMiddleware` + `UseAuthentication()`）
  - MVC：主要走 Cookie `AuthToken`（JWT）+ `app.UseJwtAuthentication()`（`ERP.CommonLib.Middleware.JwtAuthenticationMiddleware`）
- **CORS Preflight 與 Bearer**
  - `BearerTokenMiddleware` 會直接放行 `OPTIONS`，避免 preflight 因未帶 Authorization 被擋
- **token 是否落地保存**
  - MVC：token 會落在 Cookie（`AuthToken`）
    - 前端登入 JS 會用 `document.cookie = ...` 寫入（例如 `ERP.SharedUI/wwwroot/js/login/login.js`）
    - 後端 `JwtAuthenticationMiddleware` 驗證通過後會刷新 `AuthToken`（HttpOnly/Secure/Expires）
  - WebAPI client：server 端僅看到以 header bearer 帶入；client 端保存位置不在此 repo 的 server code 範圍
- **Cookie SameSite / SSO redirect**
  - 目前未在已讀到的 `Program.cs` 中看到明確的 `SameSite` 設定；若要支援跨站 SSO redirect，通常需要檢查是否設成 `SameSite=None; Secure`（此項建議納入部署/驗證清單）

- **SSO:TokenEndpoint 設定存在路徑不一致（需留意）**
  - `ERP.Trade/appsettings.json`：`/v1/token/issue`（與 `ERP.WebAPI/Controllers/TokenController.cs` 相符）
  - `ERP.DataAdmin/appsettings.json`：`/v1/auth/token/issue`（本次掃描未在 `ERP.WebAPI/Controllers` 找到對應 action；可能是舊路徑或需 proxy rewrite）
- **共用機台/快速切換**
  - 現況：MVC 端大量依賴 cookie 承載使用者與工廠情境；若有共用機台需求，通常會需要縮短有效期或強制登出/切換流程（此 repo 尚未直接呈現完整策略）
