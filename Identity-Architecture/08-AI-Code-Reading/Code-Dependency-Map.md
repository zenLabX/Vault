# Code Dependency Map

## 🎯 範圍
專案模組：身份驗證與授權

---

## 🧩 節點列表
| 節點 | 層級 | 角色 | 依賴 |
|------|------|------|------|
| JWT | Transport | Token | Issuer, Signing Key |
| Cookie | Transport | Token Storage | JWT / Session |
| UseAuthentication() | Restoration | 身份還原 | JWT, Cookie |
| Claims | Restoration | 身份屬性 | Token |
| ClaimsPrincipal | Restoration | 身份物件 | Claims |
| UseAuthorization() | Authorization | Middleware 授權觸發 | ClaimsPrincipal, Policy |
| Policy | Authorization | 規則 | ClaimsPrincipal |
| [Authorize] | Authorization | 標記資源 | Policy |
| Controller | Resource | API Endpoint | ClaimsPrincipal, Policy |

---

## 🔗 依賴圖（可選）

JWT → UseAuthentication() → ClaimsPrincipal → UseAuthorization() → Policy → [Authorize] → Controller  
Cookie → UseAuthentication()



---

## 🤖 AI 導讀補充

- AI 分析的模組依賴表
- AI 發現的多餘依賴或重複授權
- Security 風險警告

---

## 💡 註解

- 這個 Map 是「架構視角」，不是程式碼順序
- 可以用 Graph View 連結各 Concept 筆記
