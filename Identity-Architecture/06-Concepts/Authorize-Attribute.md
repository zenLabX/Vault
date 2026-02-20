# [Authorize] Attribute

---

# 🧠 一、Concept Model

## 層級
Authorization（權限觸發層）

## 核心角色
標記哪些資源需要授權檢查

## 解決問題
- 宣告式授權
- 控制 Controller / Action 存取

---

# 🧱 二、常見用法

## 1️⃣ 基本授權
[Authorize]

表示只要已登入即可

## 2️⃣ 指定 Role
[Authorize(Roles = "Admin")]

## 3️⃣ 指定 Policy
[Authorize(Policy = "RequireManager")]

---

# ⏱ 三、Runtime 時間流程位置

1. Request 進入 Controller 前
2. Authorization Middleware 讀取 Attribute
3. 呼叫對應 Policy
4. 若不通過：
   - 401（未登入）
   - 403（無權限）

---

# 🔗 四、依賴關係

## [Authorize] 依賴：
- UseAuthentication()
- UseAuthorization()
- 已註冊的 Policy

## 下游依賴：
- Controller / Action

---

# 🏗 五、專案實作對照

## 站台層級預設要求登入（示例）
- `ERP.PMS.Sewing` 在 `Program.cs` 設定 `FallbackPolicy`：沒有 `[AllowAnonymous]` 的 action 會被視為需要授權

## Token/Session 還原方式差異會影響 `[Authorize]`
- WebAPI：依賴 `UseAuthentication()`（JwtBearer）先建立 `HttpContext.User`
- MVC（Trade/DataAdmin）：依賴 `UseJwtAuthentication()` 先把 `HttpContext.User` 建好，再由 `UseAuthorization()` 讀 `[Authorize]`

## 例外路徑（不驗證/不授權）
- `ERP.CommonLib.Middleware.JwtAuthenticationMiddleware` 有排除路徑清單（例如 `/account/login`, `/captcha`, 靜態資源等）
- `ERP.Security.Middlewares.BearerTokenMiddleware` 有 API 白名單（例如 `/v1/auth/login`, `/v1/captcha` 等）

---

# 🤖 六、AI 導讀補充

（貼 AI 分析）

- 哪些 Controller 使用 Authorize？
- 是否存在漏加授權的 Endpoint？
- 是否使用 AllowAnonymous？

---

# ⚠ 七、安全觀察

- 是否有敏感 API 沒加 [Authorize]？
- 是否誤用 AllowAnonymous？
- 是否過度依賴 Role 字串？

---

# 🔍 八、401 vs 403

| 狀態碼 | 意義 |
|--------|------|
| 401 | 未通過身份驗證 |
| 403 | 身份正確，但權限不足 |

---

# 🔗 九、關聯筆記

- [[Policy]]
- [[Authorization]]
- [[ClaimsPrincipal]]
- [[UseAuthorization()]]
- [[Identity-Restoration]]
