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

是否使用：

User.FindFirst(...)
User.IsInRole(...)

是否存在自訂 Claims？

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
