# Claims

---

# 🧠 一、Concept Model

## 層級
Identity 資料載體（身份資料容器）

## 核心角色
表示使用者的一項屬性

## 解決問題
讓身份具有可判斷的資訊

---

# 🧱 二、基本結構

Claim = (Type, Value)

例如：

- (sub, 123)
- (email, user@company.com)
- (role, Admin)

---

# 🧱 三、常見 Claim 類型

Claims 會包含：

- UserId (NameIdentifier)
- Email
- Role
- Department
- TenantId
- Custom Claim

這些資料會被 Authorization 使用。

Claims 本身不是一個步驟，它是**Authentication 的產物**。


---

# ⏱ 四、Runtime 位置

Authentication 成功後，會建立：
```

ClaimsPrincipal
 └── ClaimsIdentity
      └── Claims

```

1️⃣ 存在於 JWT Payload
2️⃣ 被 UseAuthentication() 解析
3️⃣ 存入 ClaimsPrincipal
4️⃣ 被 Policy 檢查

---

# 🔗 五、依賴關係

Claims 依賴：
- Issuer 發行

下游依賴：
- ClaimsPrincipal
- Policy
- Authorization

---

# 🏗 六、專案實作對照

- 是否有自訂 Claim？
- 是否將資料庫資料放入 Claim？
- 是否存在 Claim 爆量？

---

# 🤖 七、AI 導讀補充


#### 🔹 為什麼框架設計成 Claims？

因為 Claims 是：

- ✅ 標準化（來自 OAuth2 / OpenID Connect 規範）
- ✅ 可序列化（JWT 就是 claim 的集合）
- ✅ 可跨系統傳遞
- ✅ 可擴充（你可以加 Department、TenantId）
- ✅ 與 AuthorizationHandler 完整整合

#### 🔹  本質的原因

Claims 是一種：

> **聲明式安全模型（Claim-based Identity）**

不是物件導向模型。

它的概念是：

> 我不關心你是誰，我只關心你帶了哪些聲明。

這樣系統可以做到：

- 與外部 SSO 整合
- 支援微服務
- 支援多 Identity Provider
- 不依賴資料庫查詢

#### 🔹 其他問題探討
- Claim 在哪裡被加入？
- 是否有 Claims Transformation？

---

# ⚠ 八、設計觀察

- 是否將商業資料塞入 Claim？
- 是否導致 Token 過大？
- 是否使用硬編碼字串？

---

# 🔗 九、關聯筆記

- [[JWT]]
- [[ClaimsPrincipal]]
- [[Policy]]
- [[Identity-Restoration]]
