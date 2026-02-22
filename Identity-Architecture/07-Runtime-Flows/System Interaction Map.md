# System Interaction Map

本文件聚焦在「執行期（runtime）交互關係」：各站台如何透過 redirect / cookie / bearer token / API 呼叫來完成登入、驗證、授權、以及（部分）多語資料查詢。

> 圖中同時混合了兩種關係：
> 1) **執行期呼叫**（HTTP / redirect / cookie）
> 2) **共用程式庫能力**（ERP.Security / ERP.CommonLib 提供 middleware / token 工具）

---

## Runtime 交互依賴圖（Mermaid / mmd）

✅ 架構圖加入顏色區分

- 藍色：使用者流程（Browser / 外部呼叫）
- 橘色：系統內部流程（Server ↔ Server）
- 灰色：靜態依賴

# 團隊閱讀重點

藍色線 = 使用者主動行為  
橘色線 = 系統自動處理  
灰色虛線 = 內部服務依賴

這樣一眼就能看出：
- Cookie 只存在於使用者流程
- Bearer 只存在於 Server-to-Server
- Security 只在 API 層生效

```mermaid
flowchart LR

%% 顏色定義
classDef userFlow stroke:#2563eb,stroke-width:2px,color:#2563eb
classDef systemFlow stroke:#ea580c,stroke-width:2px,color:#ea580c
classDef internal stroke:#6b7280,stroke-dasharray: 5 5,color:#6b7280

%% ============ 用戶端 ============
subgraph Clients["用戶端"]
    Browser["瀏覽器"]
    ApiClient["API 客戶端 / App / SPA"]
end

%% ============ MVC 站台 ============
subgraph MVC["MVC 站台"]
    PMS["ERP.PMS"]
    Trade["ERP.Trade"]
    DataAdminMvc["ERP.DataAdmin"]
    PMSSewing["ERP.PMS.Sewing"]
end

%% ============ SSO 站台 ============
subgraph SSO["SSO 站台"]
    SSOWeb["ERP.SSO"]
end

%% ============ WebAPI 站台 ============
subgraph WebAPI["WebAPI 站台"]
    WebApiGateway["ERP.WebAPI"]
    WebApiPMS["ERP.WebAPI.PMS"]
    WebApiDataAdmin["ERP.WebAPI.DataAdmin"]
    WebApiTrade["ERP.WebAPI.TRADE"]
end

%% ============ 共用函式庫 ============
subgraph Shared["共用函式庫"]
    CommonLib["ERP.CommonLib"]
    Security["ERP.Security"]
end

%% ============ 使用者流程 ============
Browser -->|"重新導向 / 顯示登入畫面"| SSOWeb
SSOWeb -->|"設定 AuthToken Cookie"| Browser

Browser -->|"Cookie: AuthToken"| PMS
Browser -->|"Cookie: AuthToken"| Trade
Browser -->|"Cookie: AuthToken"| DataAdminMvc
Browser -->|"Cookie: AuthToken"| PMSSewing

class Browser,SSOWeb,PMS,Trade,DataAdminMvc,PMSSewing userFlow

%% ============ 系統內部流程 ============
PMS -->|"驗證 JWT"| CommonLib
Trade -->|"驗證 JWT"| CommonLib
DataAdminMvc -->|"驗證 JWT"| CommonLib
PMSSewing -->|"驗證 JWT"| CommonLib

CommonLib -->|"Token 無效 → 轉導 SSO"| SSOWeb

PMS -->|"HTTP 呼叫 + Bearer"| WebApiGateway
Trade -->|"HTTP 呼叫 + Bearer"| WebApiGateway
DataAdminMvc -->|"HTTP 呼叫 + Bearer"| WebApiGateway
PMSSewing -->|"HTTP 呼叫 + Bearer"| WebApiPMS

WebApiGateway -->|"BearerTokenMiddleware"| Security
WebApiPMS -->|"Jwt 驗證"| Security
WebApiDataAdmin -->|"Jwt 驗證"| Security
WebApiTrade -->|"依設定可能未啟用"| Security

class CommonLib,Security,WebApiGateway,WebApiPMS,WebApiDataAdmin,WebApiTrade systemFlow

%% ============ 內部依賴（虛線） ============
Trade -.->|"取得多語系資料"| WebApiDataAdmin
DataAdminMvc -.->|"取得多語系資料"| WebApiDataAdmin
WebApiDataAdmin -.->|"呼叫 LocalizationService"| CommonLib

class Trade,DataAdminMvc,WebApiDataAdmin internal


```

---

## 圖的閱讀提示
- MVC 站台的「身份還原」主要靠 CommonLib 的 `UseJwtAuthentication()`：從 cookie `AuthToken` 還原 `HttpContext.User`；失敗就 redirect 到 SSO。
- WebAPI 站台的「token gate」主要靠 Security 的 `BearerTokenMiddleware`（前置檢查）與 JwtBearer/TokenGenerator（簽發/驗證）。
- SSO 是瀏覽器登入體驗與 CookieAuthentication ticket 的落點；但多數 MVC 站台實務上仍大量仰賴 `AuthToken`（JWT）作為跨站身份材料。
- Localization 的 DB 治理能力在 CommonLib，對外 API 入口可見於 WebAPI.DataAdmin（供 UI/模組查字典用）。


---
## 二、JWT + Cookie + SSO 完整時序圖

這張圖用來解釋：

- 首次登入
- Cookie 建立
- JWT 驗證
- Token 過期流程

```mermaid
sequenceDiagram

participant Browser as 瀏覽器
participant MVC as ERP.PMS (MVC)
participant SSO as ERP.SSO
participant CommonLib as ERP.CommonLib
participant Security as ERP.Security

%% === 首次請求 ===
Browser->>MVC: 請求受保護頁面
MVC->>CommonLib: 驗證 AuthToken
CommonLib-->>MVC: 無 Token / Token 無效
MVC->>Browser: 重新導向至 SSO

%% === 登入流程 ===
Browser->>SSO: 顯示登入畫面 + 使用者登入
SSO->>Security: 產生 JWT
Security-->>SSO: 回傳簽章 JWT
SSO->>Browser: 設定 AuthToken Cookie
Browser->>MVC: 帶 Cookie 再次請求

%% === Token 驗證 ===
MVC->>CommonLib: 解析並驗證 JWT
CommonLib->>Security: 驗證簽章與有效期限
Security-->>CommonLib: 驗證成功
CommonLib-->>MVC: 還原 ClaimsPrincipal
MVC-->>Browser: 回傳頁面

%% === Token 過期情境 ===
Browser->>MVC: 帶過期 Cookie 請求
MVC->>CommonLib: 驗證 JWT
CommonLib->>Security: 驗證失敗（過期）
Security-->>CommonLib: Token 無效
CommonLib-->>MVC: 需要重新登入
MVC->>Browser: 重新導向 SSO

```

### 備註：

> Cookie 是傳輸機制  
> JWT 是身份憑證  
> Security 是信任根  
> CommonLib 是驗證入口