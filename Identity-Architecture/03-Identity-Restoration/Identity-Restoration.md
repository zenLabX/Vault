# Identity Restoration（身份還原層）

## 定義
Identity Restoration 是「伺服器在每次 request 進來時，把傳遞過來的憑證（Cookie/JWT）**還原成系統可用的使用者身分物件**」的層。  
在 ASP.NET Core 裡，最終目標就是把結果放進 `HttpContext.User`（`ClaimsPrincipal`），讓後續的授權（Authorize/Policy）與業務程式可以直接使用。

---

## 角色（Responsibilities）
- 從 request 取出身分載體（Cookie 或 Authorization: Bearer）
- 驗證其可信度（簽章、issuer、audience、有效期、nonce/state（若適用））
- 將載體內的資料轉成 claims（必要時做 mapping/轉換）
- 建立 `ClaimsIdentity` / `ClaimsPrincipal`
- 將 principal 放入 `HttpContext.User`
-（常見加值）把「外部身分」對應到「本系統使用者」（本地帳號、角色、廠別權限），必要時補 claims

> 這層回答的是：**這個 request 進來，我們系統認得他是誰、有哪些 claims**。

---

## 關鍵技術（ASP.NET Core）
- `app.UseAuthentication()`：啟用驗證中介軟體，觸發「還原流程」
- Authentication Handlers：
  - Cookie handler（讀 cookie → 解密/驗證 → 建 principal）
  - JwtBearer handler（讀 Authorization header → 驗證 JWT → 建 principal）
- `Claims`, `ClaimsIdentity`, `ClaimsPrincipal`
- `HttpContext.User`
- `IClaimsTransformation`（可選：在還原後追加/轉換 claims）

---

## Runtime 流程（補強版）
以 ASP.NET Core 的 request pipeline 角度：

0. **Routing** 決定 endpoint（例如某個 Controller/Action）
1. `UseAuthentication()` 執行：
   - 1.1 讀取 Token（Cookie 或 Bearer）
   - 1.2 驗證簽章/加密、有效期、issuer/audience（JWT）或資料保護票證（Cookie）
   - 1.3 解析出 claims
   - 1.4 建立 `ClaimsPrincipal`
   - 1.5 指派 `HttpContext.User = principal`
2. `UseAuthorization()` 執行：
   - 讀 `HttpContext.User`，套用 `[Authorize]`/Policy
3. 進入 MVC Action，業務邏輯可直接用 `User` 取得身分

---

## 依賴（Dependencies）
- Transport 帶進來的憑證：
  - JWT（Authorization Header）
  - Cookie（Request Cookie）
- 驗證材料：
  - JWT：簽章金鑰（JWKS / 憑證）、Issuer、Audience
  - Cookie：Data Protection keys（用於解密/驗證 cookie ticket）
- 時間同步（避免 exp/nbf 驗證錯誤）
-（若要本地映射）使用者資料庫 / 角色權限資料表

---

## 輸出（Outputs）
- `HttpContext.User`（`ClaimsPrincipal`）
- `User.Identity.IsAuthenticated == true/false`
- `User.Claims` 可供後續授權與資料過濾
-（常見）`User.FindFirst(ClaimTypes.NameIdentifier)` 作為本地 user key

---

## 常見錯誤與排查點（實作很常踩）
- **忘記 `app.UseAuthentication()`**：`HttpContext.User` 永遠是匿名
- **Middleware 順序錯誤**：`UseAuthentication()` 必須在 `UseAuthorization()` 前
- JWT 驗證失敗：
  - issuer/audience 不一致
  - 簽章金鑰拿錯（JWKS 未更新）
  - 時間飄移（clock skew）
- Cookie 在多節點環境失效：
  - DataProtection keys 未共享（導致某台簽的 cookie 另一台解不開）
- claims 型別不一致導致授權失敗：
  - 角色 claim type 不對（`role` vs `http://schemas.../role`）
  - NameIdentifier 用 email 但 email 會變更，造成帳號對不上

---

## 成衣廠情境（用場景說清楚「還原」的價值）
### Scenario：產線主管查看「工單用料明細」需要帶出廠別/產線權限
- **Role**：產線主管 Lily
- **Business Needs**：Lily 只能看「A廠/第3產線」的工單用料，不可看到 B廠資料
- **Operation Flow**：
  1) Lily 早上登入一次（IdP 簽發 token / 系統簽發 cookie）
  2) Lily 點「工單用料明細」頁面
  3) Request 進來時，Identity Restoration 讀取 cookie/JWT，還原出 `ClaimsPrincipal`
  4) 系統根據 claims（如 `factory=A`、`line=3` 或本地 userId）決定可查範圍
- **Expected Data**：
  - `sub` 或本地 `UserId`
  - `factory`：A
  - `line`：3
  - `role`：ProductionSupervisor

> 重點：還原後的 `HttpContext.User` 直接影響「資料列級別過濾」與授權判斷。

---

## C# ASP.NET Core MVC 範例 1：Cookie 還原（最常見 Web/MVC）
```csharp
// Program.cs
using Microsoft.AspNetCore.Authentication.Cookies;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllersWithViews();

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = ".Garment.Auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromMinutes(30);
    });

var app = builder.Build();

app.UseRouting();
app.UseAuthentication(); // Identity Restoration 發生點
app.UseAuthorization();

app.MapDefaultControllerRoute();
app.Run();
```

```csharp
// Controllers/MeController.cs
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace WebApp.Controllers;

[Authorize]
public class MeController : Controller
{
    public IActionResult Index()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = User.FindFirstValue(ClaimTypes.Email);

        return Json(new
        {
            IsAuthenticated = User.Identity?.IsAuthenticated,
            UserId = userId,
            Email = email,
            Claims = User.Claims.Select(c => new { c.Type, c.Value })
        });
    }
}
```

---

## C# ASP.NET Core MVC 範例 2：JWT Bearer 還原（API 常見；MVC 也可用在 API Controller）
```csharp
// Program.cs（示意：同一站台同時支援 Cookie + JWT）
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllersWithViews();

builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = CookieAuthenticationDefaults.AuthenticationScheme;
})
.AddCookie()
.AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
{
    options.Authority = "https://login.microsoftonline.com/{tenantId}/v2.0";
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Auth:ApiAudience"], // e.g. api://xxx
        ValidateLifetime = true
    };
});

var app = builder.Build();
app.UseRouting();
app.UseAuthentication(); // 讀 Authorization: Bearer
app.UseAuthorization();
app.MapDefaultControllerRoute();
app.Run();
```

---

##（選用）Claims 補強：把外部身分映射成本地使用者/廠別權限
> 常見做法：在還原後，用 `IClaimsTransformation` 補上本地角色、廠別、站點等 claims。

```csharp
// Security/GarmentClaimsTransformation.cs
using Microsoft.AspNetCore.Authentication;
using System.Security.Claims;

public class GarmentClaimsTransformation : IClaimsTransformation
{
    public Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        var identity = (ClaimsIdentity)principal.Identity!;

        // 示例：若沒有 factory claim，補一個（實務上應從 DB 依 userId 查）
        if (!principal.HasClaim(c => c.Type == "factory"))
        {
            identity.AddClaim(new Claim("factory", "A"));
        }

        return Task.FromResult(principal);
    }
}
```

```csharp
// Program.cs（註冊）
builder.Services.AddScoped<IClaimsTransformation, GarmentClaimsTransformation>();
```

---

## 問題區（專案實作對應）
### 1) 主要模式是 Cookie 還是 JWT？
**專案實作狀況：**
- WebAPI：JWT Bearer 為主（`Authorization: Bearer <jwt>`）
  - 常見會先經過 `ERP.Security.Middlewares.BearerTokenMiddleware`，再由 `UseAuthentication()`（JwtBearer）還原 principal
- MVC：以「JWT 放在 Cookie」為主（Cookie 名稱 `AuthToken`）
  - 使用 `app.UseJwtAuthentication()`（`ERP.CommonLib.Middleware.JwtAuthenticationMiddleware`）自行驗證並指派 `HttpContext.User`
  - 並且大量使用額外 cookies 傳遞使用者/工廠情境（例如 `Factories`、`CurrentFactory`、`CurrentDivisionID`、`UserID` 等）
- MVC 特例：`ERP.PMS.Sewing` 同時使用 ASP.NET CookieAuthentication + JwtBearer

### 2) JWT 的 issuer/audience/jwks 來源？
**專案實作狀況：**
- 本地簽發為主：`ERP.Security.Utilities.TokenGenerator`
- 設定來源：`appsettings.json` 的 `Jwt:Key` / `Jwt:Issuer` / `Jwt:Audience`
- 驗證方式：以對稱金鑰（HMAC）驗證為主；未看到必須依賴 JWKS/Authority 的既有設定

### 3) 多台 Web 伺服器共享 DataProtection keys？
**專案實作狀況：**
- 僅當站台使用 ASP.NET CookieAuthentication（例如 `ERP.PMS.Sewing`）時才會遇到「多機解密票證」問題
- 目前 Identity 還原主力在 JWT（Bearer 或 `AuthToken` cookie），DataProtection keys 是否要共享仍取決於部署型態與是否啟用 CookieAuth

### 4) 本地授權資料放在 token claims 還是查 DB？
**專案實作狀況：**
- 混合模式（以「Cookie + JWT claims」為主）：
  - JWT claims：`ERP.Security.Utilities.TokenGenerator` 會帶入 Role/System/UserID/CurrentFactory 等欄位
  - Cookie：MVC 站台常直接以 cookie 搭配（工廠/部門/使用者資料）供 UI 與查詢使用
- DB 細粒度授權：本 repo 有 `IAuthorizationService` 的使用示例與 Casbin 相關服務（在 `ERP.CommonLib.Services.Authentication`），但是否所有模組皆已接入需再逐系統盤點

### 5) Row-level security 實作？
**專案實作狀況：**
- 在 MVC 基礎 Controller/RequestContext 建置時，會從 cookie 解析 `CurrentFactory` 等情境資訊（例如 `Factories`、`CurrentFactory`）
- API 是否有「自動 row filter」需要再對實際 repository/query 層做盤點；目前已能確定「工廠情境」在 UI/MVC 端是以 cookie 方式傳遞並被廣泛使用