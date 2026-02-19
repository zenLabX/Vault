企業身分系統（可能是 Windows AD 或 Azure AD）

## Azure AD（現在叫 Microsoft Entra ID）

這是雲端版本的 AD。

它是：

- OpenID Connect Provider
- OAuth2 Provider

常見流程：

1. Redirect 到 Microsoft Login
2. 登入
3. 回傳 id_token
4. Middleware 驗證
5. 建立 ClaimsPrincipal
    

這其實就是 SSO。