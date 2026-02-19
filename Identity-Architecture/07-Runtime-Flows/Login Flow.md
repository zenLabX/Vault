
## 理論流程

Policy 依賴 ClaimsPrincipal
ClaimsPrincipal 依賴 Claims
UseAuthorization 依賴 UseAuthentication
UseAuthentication 依賴 JWT/Cookie
JWT 依賴 Issuer + Signing Key

```

User → IdP → 驗證 → 發 JWT → Client 儲存

Request Flow:
Client → Authorization Header
        ↓
UseAuthentication()
        ↓
建立 ClaimsPrincipal
        ↓
UseAuthorization()
        ↓
Policy 檢查
        ↓
Controller

```



---

## 專案實際流程

（你觀察的）

---

## AI 導讀發現

- Middleware 順序是否一致？
- 有沒有 Custom Middleware？


補專案實作