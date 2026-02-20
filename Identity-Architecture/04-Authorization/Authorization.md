# Authorization（權限決策層）

## 定義
Authorization 是「在已知道使用者是誰（Authentication/Restoration 完成）之後，判斷他**能不能**對某個資源/操作做某件事」的決策層。  
它輸出的是「允許/拒絕」，並決定回傳 401/403 或放行到業務邏輯。

---

## 角色（Responsibilities）
- 根據 `ClaimsPrincipal`（使用者身分與 claims）做存取決策
- 決策粒度可包含：
  - **功能層級**（能不能進某頁/用某 API：例如「工單作廢」）
  - **資料層級**（能不能看這筆資料：例如只能看 A 廠的工單）
  - **操作層級**（能不能改欄位/審核：例如只有「生管」能改交期）
- 將決策與業務邏輯分離（可維護、可稽核、可測試）

---

## 技術（ASP.NET Core 常用）
- `[Authorize]` / `[AllowAnonymous]`
- **Role-based**：`[Authorize(Roles="ProductionSupervisor")]`
- **Claims-based**：`[Authorize(Policy="FactoryAOnly")]`
- **Policy**（建議主力：可組合角色、claims、條件、客製 requirement/handler
- Resource-based authorization（針對特定資源實體做判斷，常用於資料列級授權）
-（補充）`IAuthorizationService`：在程式內主動做授權判斷

---

## 依賴（Dependencies）
- `ClaimsPrincipal`（由 Identity Restoration 放在 `HttpContext.User`）
- 權限設計資料來源（選其一或混合）：
  - Token 裡的 roles/claims
  - 系統內權限表（DB）＋登入後補 claims / 每次查詢判斷
- 對資源的識別（Resource）：
  - 路由參數（orderId）
  - 資料模型（Order entity）
  - 操作類型（Create/Approve/Cancel）

---

## 決策結果（Outcomes）與 HTTP 狀態碼
- **200 OK**：授權通過且成功處理
- **401 Unauthorized**：尚未登入/沒有有效身分（未通過 Authentication）
- **403 Forbidden**：已登入但權限不足（Authentication OK，Authorization fail）

> 判斷口訣：  
> **沒有身分 → 401；有身分但不准 → 403。**

---

## 成衣廠情境（用場景釐清「權限決策」會長什麼樣）
### Scenario 1：工單作廢（功能層級）
- **Role**：生管 Allen（可作廢）、產線主管 Lily（不可作廢）
- **Business Needs**：避免產線主管誤把已開裁的工單作廢造成損耗
- **Operation Flow**：
  1) Lily 進入工單詳情點「作廢」
  2) 系統檢查 `User` 是否具備 `Order.Cancel` 權限（Policy）
  3) 不符合 → 回 403
- **Expected Data**：
  - `role=ProductionSupervisor` 或 claims `perm=Order.View`
  - 權限規則：`Order.Cancel` 只允許 `PPCPlanner`

### Scenario 2：只能看自己廠別工單（資料層級 / Row-level）
- **Role**：倉管 Ben（A廠）、倉管 Cindy（B廠）
- **Business Needs**：避免跨廠資料混用導致出貨錯誤
- **Operation Flow**：
  1) Ben 呼叫 `/orders/123`
  2) 系統抓到 order 的 `FactoryId = B`
  3) 判斷 `User` 的 `factory=A`，不匹配 → 403（或回 404 隱藏資源，視安全策略）
- **Expected Data**：
  - `User` claim：`factory=A`
  - Resource：Order.FactoryId

---

## 建議做法（資深工程角度：可落地、可維護）
- **Policy-first**：把權限寫成 policy 名稱，例如：
  - `Policy: "Order.Cancel"`
  - `Policy: "Order.Approve"`
  - `Policy: "FactoryAccess"`
- 角色（Role）可以保留，但不要把所有規則硬寫在 Roles 字串裡；會爆炸難維護。
- 涉及資料列（orderId 這種）就用 **Resource-based authorization**，避免只靠靜態 claims。

---

## C# ASP.NET Core MVC 範例 1：Policy（Claims-based）
```csharp
// Program.cs
using Microsoft.AspNetCore.Authorization;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllersWithViews();

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Order.Cancel", policy =>
        policy.RequireClaim("perm", "Order.Cancel"));

    options.AddPolicy("FactoryAOnly", policy =>
        policy.RequireClaim("factory", "A"));
});

var app = builder.Build();
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

[Authorize] // 先要求有登入身分
public class OrdersController : Controller
{
    [Authorize(Policy = "Order.Cancel")]
    [HttpPost]
    public IActionResult Cancel(int id)
    {
        // 通過授權才會進來
        return Ok(new { id, status = "Cancelled" });
    }

    [Authorize(Policy = "FactoryAOnly")]
    public IActionResult FactoryAList()
    {
        return View();
    }
}
```

---

## C# ASP.NET Core MVC 範例 2：Resource-based（資料列級授權）
```csharp
// Security/OrderFactoryRequirement.cs
using Microsoft.AspNetCore.Authorization;

public class OrderFactoryRequirement : IAuthorizationRequirement { }
```

```csharp
// Security/OrderFactoryHandler.cs
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

public class OrderFactoryHandler : AuthorizationHandler<OrderFactoryRequirement, Order>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        OrderFactoryRequirement requirement,
        Order resource)
    {
        var userFactory = context.User.FindFirstValue("factory");
        if (!string.IsNullOrWhiteSpace(userFactory) && userFactory == resource.FactoryId)
        {
            context.Succeed(requirement);
        }
        return Task.CompletedTask;
    }
}

// 示例資源模型（你可換成 EF Entity）
public class Order
{
    public int Id { get; set; }
    public string FactoryId { get; set; } = "";
}
```

```csharp
// Program.cs（註冊）
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Order.FactoryAccess", policy =>
        policy.AddRequirements(new OrderFactoryRequirement()));
});

builder.Services.AddSingleton<IAuthorizationHandler, OrderFactoryHandler>();
```

```csharp
// Controllers/OrdersController.cs（在 action 內做授權）
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

public class OrdersController : Controller
{
    private readonly IAuthorizationService _authz;
    public OrdersController(IAuthorizationService authz) => _authz = authz;

    public async Task<IActionResult> Details(int id)
    {
        // 假裝從 DB 撈到訂單
        var order = new Order { Id = id, FactoryId = "B" };

        var result = await _authz.AuthorizeAsync(User, order, "Order.FactoryAccess");
        if (!result.Succeeded) return Forbid(); // 403

        return View(order);
    }
}
```

---

## 問題區（專案實作對應）
### 1) 權限來源？
**專案實作狀況：**
- JWT claims：`ERP.Security.Utilities.TokenGenerator` 會產生包含 `Role`、`System`、`UserID`、`CurrentFactory` 等資訊的 token
- MVC cookies：許多 UI/查詢用的「工廠/部門/使用者資訊」直接存在 cookie（例如 `CurrentFactory`, `CurrentDivisionID`, `UserID`），Controller 會讀取使用
- Casbin：`ERP.CommonLib.Services.Authentication.AuthenticationService` 有整合 Casbin 的介面/實作（表示專案具備政策式授權能力），但實際是否已全面接入需逐模組確認

### 2) 權限粒度到哪一級？
**專案實作狀況：**
- 站台層級：`ERP.PMS.Sewing` 有 `FallbackPolicy`（未標 `[AllowAnonymous]` 一律要求登入）
- 角色/Claim：JWT 內有 `ClaimTypes.Role` 等資訊，可用於 Role/Claims-based 授權
- 工廠/部門情境：MVC 端大量使用 cookie（`CurrentFactory`/`CurrentDivisionID`）驅動畫面與查詢條件

### 3) 資料列級權限實作方式？
**專案實作狀況：**
- MVC 端已能看到「工廠情境」透過 cookie 建立（例如 BaseController/RequestContext 會讀 `CurrentFactory`）
- 是否存在「通用 row-level filter」需要再深入各 domain 的 repository/query 實作才能下定論

### 4) 不通過授權回應策略？
**專案實作狀況：**
- 一般情況：回403 Forbidden（已登入但權限不足）
- 未登入：回401 Unauthorized，導向登入頁
- 敏感資源：視安全需求可回404（隱藏資源存在）
- 實作：在Controller/Middleware中自訂錯誤處理（見ERP.CommonLib.Middleware.ExceptionMiddleware）

### 5) 權限異動即時生效機制？
**專案實作狀況：**
- WebAPI：目前以 JWT（12h）為主，未看到 refresh token 機制；若要「立即失效」通常需要縮短 JWT 或做 server-side 黑名單/版本號
- MVC：若大量依賴 cookie（包含 `AuthToken` 與各種使用者資訊 cookie），權限/情境異動通常透過更新 cookie 或重新登入生效