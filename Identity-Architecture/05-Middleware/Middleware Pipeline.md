# Middleware Pipeline

## 定義
Middleware Pipeline 是 ASP.NET Core 處理每個 HTTP Request 的「流水線」。  
每個 middleware 依序執行，決定：要不要繼續往下走到 MVC Controller、要不要短路回應（例如 401/403/redirect）、以及在 `HttpContext` 上補齊需要的資訊（例如 `HttpContext.User`）。

---

## 角色（Responsibilities）
- 定義 Request 的處理順序（Order matters）
- 在進入 Controller 前完成：
  - 安全性（HTTPS、HSTS）
  - 靜態檔案處理
  - Routing（找到對應 endpoint）
  - Authentication（還原使用者身分到 `HttpContext.User`）
  - Authorization（根據 `User` + policy 做存取決策）
- 在回應離開時，可能追加 response header、記錄 log、處理例外等

---

## 時間軸（Time Line）
`Request -> Middleware Pipeline -> Endpoint(Controller/Action) -> Middleware Pipeline(回程) -> Response`

> 你可以把它想像成「進廠安檢流程」：先分流（Routing），再驗證身分（Authentication），再檢查是否有權進入該區（Authorization），最後才真的進到產線（Controller）。

---

## 關鍵順序（Critical Order）
### 最小可用且正確的核心順序（常見 Web/MVC）
1. `UseRouting()`
2. `UseAuthentication()`  
3. `UseAuthorization()`
4. `MapControllerRoute(...)` / `MapControllers()`

> **一定要：Authentication 在 Authorization 前面**  
> 因為 Authorization 需要 `HttpContext.User`（ClaimsPrincipal）才能判斷。

---

## 依賴方向（Dependency Direction）
- Authorization 依賴 Authentication：  
  - Authentication 負責把「你是誰」放到 `HttpContext.User`
  - Authorization 才能基於 `User` 判斷「你能不能做」

---

## 常見錯誤（你排查問題時很常用到）
- 忘記 `app.UseAuthentication()`  
  - 結果：`[Authorize]` 可能永遠導去登入或永遠是匿名
- `UseAuthorization()` 放在 `UseAuthentication()` 前  
  - 結果：授權判斷拿不到正確的 `User`
- `UseRouting()` 放錯位置  
  - 結果：endpoint/policy metadata 沒有被正確解析
- API + SPA 情境 CORS 放錯  
  - 若要用跨網域呼叫且帶憑證，CORS 通常要放在 routing 後、auth 前（視情況），且設定要非常嚴謹

---

## 成衣廠情境（幫你把順序對上業務）
### Scenario：產線主管進「工單審核」頁
- **Role**：產線主管 Lily
- **Business Needs**：只有具備 `Order.Approve` 權限的人可審核，否則禁止進入
- **Operation Flow（Pipeline 視角）**：
  1) Request `/Orders/Approve/123` 進來
  2) `UseRouting()` 找到對應的 `OrdersController.Approve(id)`
  3) `UseAuthentication()` 從 cookie/JWT 還原 `HttpContext.User`（Identity Restoration）
  4) `UseAuthorization()` 讀取 action 上的 `[Authorize(Policy="Order.Approve")]`，檢查 `User` claims/roles
  5) 通過才進 Controller；不通過直接回 401/403（短路）
- **Expected Data**：
  - Cookie/JWT 可被驗證
  - `User` claims 裡有 `perm=Order.Approve`（或角色映射到該權限）

---

## C# ASP.NET Core MVC 範例（推薦的 Pipeline 模板）
```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();

// 假設已設定 AddAuthentication / AddAuthorization（略）

var app = builder.Build();

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthentication(); // 先還原身分 HttpContext.User
app.UseAuthorization();  // 再做權限決策（401/403 或放行）

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();
```

---

##（選用）你可以把這段當作筆記的「速查表」
- **需要 User/Claims 才能做的事情**：放在 `UseAuthentication()` 之後
- **需要讀 endpoint metadata（Authorize/Policy）的事情**：要在 `UseRouting()` 之後
- **順序錯了就會出現的症狀**：
  - 永遠匿名、永遠 401、或莫名其妙 403

---

## 問題區（實作時補：建議你先填）
- 我們是 MVC 為主、還是同站台也有 API？（會影響 CORS、JWT/Cookie 混用）
- 有沒有反向代理/負載平衡？（影響 HTTPS、ForwardedHeaders、Cookie Secure）
- 是否多台機器？（影響 DataProtection keys 與 Cookie 可解密性）
- 需要全域例外處理/稽核 log middleware 嗎？要放在哪一段？