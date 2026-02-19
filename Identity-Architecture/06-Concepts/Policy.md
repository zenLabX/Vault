# Policy

---

# 🧠 一、Concept Model

## 層級
Authorization（權限決策層）

## 核心角色
定義「什麼條件下可以存取資源」

## 解決問題
- 超越單純 Role-based 授權
- 支援 Claims-based 授權
- 支援複雜商業邏輯授權

---

# 🧱 二、組成元素

## 1️⃣ Requirements
定義需要滿足的條件

## 2️⃣ Handlers
實作條件驗證邏輯

## 3️⃣ Policy 設定
在程式中註冊規則

例如：

- RequireRole
- RequireClaim
- RequireAssertion

---

# ⏱ 三、Runtime 時間流程位置

1. Request 進入
2. UseAuthentication() 建立 ClaimsPrincipal
3. UseAuthorization() 觸發授權檢查
4. Authorization Middleware 呼叫 Policy
5. Policy 檢查 Claims 是否符合條件

---

# 🔗 四、依賴關係

## Policy 依賴：
- ClaimsPrincipal
- Authentication 已完成
- 已註冊的 Policy 設定

## 下游依賴 Policy：
- [Authorize] attribute
- Authorization Middleware

---

# 🏗 五、專案實作對照

## Policy 註冊位置
- Program.cs
- Startup.cs

## 是否有自訂 Requirement？
- Yes / No

## 是否有自訂 Handler？
- Yes / No

---

# 🤖 六、AI 導讀補充

（貼 AI 分析）

- Policy 定義在哪？
- 是否存在重複 Policy？
- 是否將商業邏輯混入授權層？

---

# ⚠ 七、設計觀察

- 是否濫用 Role-based？
- 是否使用硬編碼字串？
- 是否把資料庫查詢放進 Handler？

---

# 🔗 八、關聯筆記

- [[Authorization]]
- [[Authorize-Attribute]]
- [[Claims]]
- [[ClaimsPrincipal]]
- [[UseAuthorization()]]
