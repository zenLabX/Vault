# Request Flow

Client 發送 Request (帶 JWT)

-> Middleware Pipeline
    -> UseAuthentication()
    -> 建立 ClaimsPrincipal
    -> UseAuthorization()
        -> 檢查 Policy
-> Controller



## 專案實際 Request Flow（依站台類型）

### A) WebAPI（PMS/DataAdmin）
Client → `Authorization: Bearer <jwt>`
→ `UseRouting()`
→ `UseCors("AllowAll")`
→ `BearerTokenMiddleware`（先做 token 格式/白名單/過期等檢查；必要時回 401）
→ `UseAuthentication()`（JwtBearer 還原 `ClaimsPrincipal` 到 `HttpContext.User`）
→ `UseAuthorization()`（套用 `[Authorize]`/Policy）
→ Controller

### B) MVC（Trade/DataAdmin）
Browser → Cookie: `AuthToken=...`（以及 `CurrentFactory` 等情境 cookies）
→ `UseRouting()`
→ `UseSession()`
→ `UseJwtAuthentication()`（自訂，還原 `HttpContext.User`）
→ `UseAuthorization()`
→ Controller/View

### C) 特例提醒：ERP.WebAPI.TRADE
`ERP.WebAPI.TRADE/Program.cs` 目前把 `UseAuthentication()`/`UseAuthorization()` 與 BearerTokenMiddleware 相關段落註解掉，代表該站台在目前狀態下不會執行標準的身分/授權流程（需要特別留意安全邊界）。