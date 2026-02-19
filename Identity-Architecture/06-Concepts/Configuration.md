# Configuration / Environment

---

# 🧠 一、Concept Model
系統運行所需的環境與設定管理，決定各層身份與授權行為。

---

# 🧱 二、用途
- Dev / Prod / QA 環境區分
- DB 連線字串、API Endpoint
- SSO / Token 驗證金鑰
- Feature Flags

---

# ⏱ 三、Runtime 位置
- App 啟動階段讀取 Configuration
- Middleware / Authentication / Authorization 使用時參考設定

---

# 🔗 四、依賴關係
## Configuration 依賴：
- 環境變數 / 設定檔
## 下游依賴：
- SSO / JWT / Cookie
- UseAuthentication()
- UseAuthorization()
- Policy

---

# 🏗 五、專案實作對照
- appsettings.json / appsettings.{Environment}.json
- Secret Manager / KeyVault
- 配置 IdP / SigningKey / CookieOptions
- Feature Flags 設定

---

# 🤖 六、AI 導讀補充
- AI 可以掃描程式碼找到使用的配置項
- 標註是否與安全性相關（硬編碼金鑰、過期時間、SSL 設定）
- 檢查不同環境設定是否一致

---

# ⚠ 七、安全觀察
- 避免硬編碼敏感資訊
- 區分 Dev / Prod 設定
- Secure / HttpOnly Cookie、SigningKey、Token 秘密

---

# 🔗 八、關聯筆記
- [[SSO]]
- [[JWT]]
- [[Cookie]]
- [[UseAuthentication()]]
- [[UseAuthorization()]]
- [[Policy]]
