# ClaimsPrincipal

---

# 🧠 一、Concept Model

## 層級
Identity Restoration 輸出物

## 核心角色
代表「目前登入使用者的身份」

## 解決問題
提供統一身份物件給系統使用

---

# 🧱 二、內部組成

ClaimsPrincipal
    └── ClaimsIdentity
            └── Claims (多個)

---

# 🧱 三、包含資訊

- UserId
- Email
- Role
- Department
- 其他自訂 Claim

---

# ⏱ 四、Runtime 位置

由 UseAuthentication() 建立

存放於：

HttpContext.User

---

# 🔗 五、依賴關係

## 依賴：
- Claims
- Authentication Middleware

## 下游依賴：
- Policy
- [Authorize]
- Controller 業務邏輯

---

# 🏗 六、專案實作對照

## `HttpContext.User` 來源（專案現況）
- WebAPI：`UseAuthentication()`（JwtBearer）建立 `ClaimsPrincipal`
- MVC：`UseJwtAuthentication()`（自訂）直接把 principal 指派到 `HttpContext.User`

## 常見用法（在本 repo 可看到的模式）
- 角色：從 `ClaimTypes.Role` 或 `role` 讀取（例如在 SecurityContext 建 RequestContext 時會掃 role claims）
- 使用者帳號：`HttpContext.User.Identity.Name`（例如 `ERP.CommonLib.Services.ApiCalling.Implementations.JwtAuthenticationProvider` 會用它取得呼叫外部 API 的 token）

## 自訂 Claims
- 來源主要來自 `ERP.Security.Utilities.TokenGenerator`（見「Claims」筆記的清單）

---

# 🤖 七、AI 導讀補充

- 是否修改 Claims？
- 是否有 Claims Transformation？

---

# 🔗 八、關聯筆記

- [[Claims]]
- [[UseAuthentication()]]
- [[Policy]]
- [[Authorize-Attribute]]
