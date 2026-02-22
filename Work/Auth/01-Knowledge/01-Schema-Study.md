---
project: Auth
deadline: 2026-03-31
tags: [knowledge, db, auth]
---

# Schema Study — Auth

## 目標
- 拆解資料表、釐清關聯、準備後續 prototype 與驗證

## 模組研究筆記
### 模組 A：身分主體
- AuthPrincipalUser
- AuthPrincipalGroup
- AuthUserGroup

### 模組 B：資源與動作
- AuthResource
- AuthAction

### 模組 C：角色與授權矩陣
- AuthRole
- AuthRelationPrincipalRole
- AuthRelationGrant

### 模組 D：進階例外與連線
- AuthUserOverride
- AuthTokens

## Tasks（#auth）
- [ ] 模組研究 A：身分主體（AuthPrincipalUser, AuthPrincipalGroup, AuthUserGroup） #auth
  status:: backlog
  priority:: medium
  due:: 2026-02-28
- [ ] 模組研究 B：資源與動作（AuthResource, AuthAction） #auth
  status:: backlog
  priority:: medium
  due:: 2026-03-01
- [ ] 模組研究 C：角色與授權矩陣（AuthRole, AuthRelationPrincipalRole, AuthRelationGrant） #auth
  status:: backlog
  priority:: medium
  due:: 2026-03-01
- [ ] 模組研究 D：進階例外與連線（AuthUserOverride, AuthTokens） #auth
  status:: backlog
  priority:: medium
  due:: 2026-03-01
