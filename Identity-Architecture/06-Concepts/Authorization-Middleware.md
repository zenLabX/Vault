# Authorization Middleware

---

# 🧠 一、Concept Model

## 層級
Authorization（權限決策層） + Middleware

## 核心角色
在 Request Pipeline 中執行授權決策

## 解決問題
根據 Policy 與 Claims 判斷是否允許存取資源

---

# 🧱 二、與其他元件關係

[Authorize] → 標記資源需要授權
Policy → 定義規則
UseAuthorization() → 啟動授權機制
Authorization Middleware → 實際執行檢查

---

# ⏱ 三、Runtime 流程

1️⃣ Request 進入
2️⃣ Authentication Middleware 建立 ClaimsPrincipal
3️⃣ Authorization Middleware：
    - 讀取 Endpoint Metadata
    - 取得對應 Policy
    - 執行 Policy Handler
4️⃣ 回傳結果：
    - 允許 → 進入 Controller
    - 拒絕 → 401 / 403

---

# 🔗 四、依賴關係

Authorization Middleware 依賴：

- Authentication 完成
- ClaimsPrincipal
- 已註冊 Policy
- Authorization Service

下游依賴：

- Controller 執行

---

# 🔍 五、401 vs 403 的決策邏輯

| 情境 | 結果 |
|------|------|
| 未登入（沒有身份） | 401 |
| 已登入但不符合 Policy | 403 |

---

# 🏗 六、專案實作對照

## WebAPI：多一層「BearerTokenMiddleware」作為前置安全閘
- `ERP.Security.Middlewares.BearerTokenMiddleware`
    - 位置建議：`UseRouting()` 後、`UseAuthorization()` 前
    - 作用：檢查 `Authorization: Bearer ...`、支援白名單、驗證失敗直接回 401
    - 注意：它不是 `UseAuthorization()`，也不負責執行 policy；它是 Token 驗證前置防線

## MVC：授權依賴 `UseJwtAuthentication()` 先建好 `HttpContext.User`
- `ERP.CommonLib.Middleware.JwtAuthenticationMiddleware` 成功後會指派 `HttpContext.User`
- 因此即使不呼叫 `UseAuthentication()`，`UseAuthorization()` 仍可對 `[Authorize]` 做判斷

## 例外 bypass（已觀察到）
- Bearer token 驗證：有白名單路徑（login/captcha/report export 等）
- MVC JWT 還原：有排除路徑（登入/登出/靜態資源等）

---

# 🤖 七、AI 導讀補充

（貼 AI 分析）

- 哪些 Endpoint 需要授權？
- 是否有漏加授權？
- 是否在 Controller 內再做額外權限判斷？

---

# ⚠ 八、架構觀察

- 是否將商業邏輯塞進 Authorization？
- 是否將 Authorization 與 Domain Logic 混在一起？

---

# 🔗 九、關聯筆記

- [[UseAuthorization()]]
- [[Policy]]
- [[Authorize-Attribute]]
- [[ClaimsPrincipal]]
- [[Middleware Pipeline]]
