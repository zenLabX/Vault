# SSO (Single Sign-On)

---

# 🧠 一、Concept Model

## 層級
Identity Issuance（身份發行層）

## 核心角色
讓使用者只登入一次，即可存取多個系統或應用

## 解決問題
- 避免多次登入
- 中央化身份管理
- 支援多系統/多域

---

# 🧱 二、常見協定 / 技術

- SAML 2.0
- OpenID Connect (OIDC)
- OAuth 2.0 (主要做授權，但常配 OIDC 做身份)
- Microsoft Entra ID / Active Directory Federation Services (ADFS)

---

# ⏱ 三、Runtime 流程位置

1️⃣ 使用者訪問應用
2️⃣ 應用發出認證請求到 IdP
3️⃣ IdP 驗證身份
4️⃣ IdP 發行 Token / Assertion (SAML / JWT / id_token)
5️⃣ 使用者帶著 Token 返回應用
6️⃣ UseAuthentication() 解析 Token → 建立 ClaimsPrincipal

---

# 🔗 四、依賴關係

## SSO 依賴：
- 身份提供者 (IdP)
- 使用者憑證
- 驗證協定（SAML / OIDC）
- 配置（ClientId, Secret, RedirectUri）

## 下游依賴：
- Token (JWT / SAML Assertion)
- UseAuthentication()
- ClaimsPrincipal

---

# 🏗 五、專案實作對照

- App 使用 AddOpenIdConnect() 或 AddAuthentication()
- Callback URL 設定
- Token 驗證配置
- 是否整合 Microsoft Entra ID / AD

---

# 🤖 六、AI 導讀補充

- AI 可以分析 SSO 流程對應程式碼
- 查看 Middleware Pipeline 是否正確串接
- 查看 Claims 映射設定是否正確
- 查看是否有自訂事件 (OnTokenValidated, OnRedirectToIdentityProvider)

---

# ⚠ 七、安全觀察

- 是否正確驗證 Token / Assertion 簽章
- 是否使用 HTTPS / Secure Cookie
- 是否正確處理 Logout / Session Revocation
- 是否有 Replay 攻擊風險

---

# 🔗 八、關聯筆記

- [[Identity-Issuance]]
- [[JWT]]
- [[UseAuthentication()]]
- [[ClaimsPrincipal]]
- [[Policy]]
