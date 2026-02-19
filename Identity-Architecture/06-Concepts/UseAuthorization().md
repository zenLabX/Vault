# UseAuthorization()

---

# 🧠 一、Concept Model

## 層級
Middleware 層（授權觸發點）

## 核心角色
啟用授權檢查機制

## 解決問題
將 Controller 上的 [Authorize] 與已註冊的 Policy 串接起來

---

# 🧱 二、它實際做什麼？

當 Request 進來時：

1️⃣ 檢查 Endpoint 是否標記 [Authorize]
2️⃣ 如果有：
    - 呼叫 Authorization Service
    - 觸發 Policy 檢查
3️⃣ 如果不通過：
    - 回傳 401 或 403

---

# ⏱ 三、Runtime 時間流程位置

Request 進入 Pipeline：

UseAuthentication()
    ↓
UseAuthorization()
    ↓
Controller

⚠ 必須在 UseAuthentication() 之後

---

# 🔗 四、依賴關係

## UseAuthorization() 依賴：

- UseAuthentication() 已建立 ClaimsPrincipal
- 已註冊的 Policy
- Authorization Service

## 下游依賴：

- Controller
- Endpoint Metadata ([Authorize])

---

# 🏗 五、專案實作對照

## Middleware 順序：

是否為：

app.UseAuthentication();
app.UseAuthorization();

## 是否有自訂 Middleware 插在中間？

---

# 🤖 六、AI 導讀補充

（貼 AI 分析）

- Middleware 順序是否正確？
- 是否存在重複授權邏輯？
- 是否有自訂 Authorization Middleware？

---

# ⚠ 七、常見錯誤

- 把 UseAuthorization() 放在 UseAuthentication() 之前
- 以為它會驗證 Token（它不會）
- 誤以為它處理身份建立（那是 Authentication 的工作）

---

# 🔗 八、關聯筆記

- [[UseAuthentication()]]
- [[Authorization-Middleware]]
- [[Policy]]
- [[Authorize-Attribute]]
- [[Middleware Pipeline]]
