10 張資料表關聯圖 (ER Diagram)

```mermaid
erDiagram
    AuthPrincipalUser ||--o{ AuthUserGroup : "UserId"
    AuthPrincipalGroup ||--o{ AuthUserGroup : "GroupCode"
    
    AuthPrincipalUser ||--o{ AuthRelationPrincipalRole : "UserId (XOR)"
    AuthPrincipalGroup ||--o{ AuthRelationPrincipalRole : "GroupCode (XOR)"
    AuthRole ||--o{ AuthRelationPrincipalRole : "RoleCode"
    
    AuthRole ||--o{ AuthRelationGrant : "RoleCode"
    AuthResource ||--o{ AuthRelationGrant : "ResourceKey"
    AuthAction ||--o{ AuthRelationGrant : "ActionCode"
    
    AuthPrincipalUser ||--o{ AuthUserOverride : "UserId"
    AuthResource ||--o{ AuthUserOverride : "ResourceKey"
    AuthAction ||--o{ AuthUserOverride : "ActionCode"
    
    AuthPrincipalUser ||--o{ AuthTokens : "UserId"
    
    AuthResource ||--o{ AuthResource : "ParentResourceKey (Self-FK)"

    AuthPrincipalUser {
        string UserId PK
        string UserName
    }
    AuthPrincipalGroup {
        string GroupCode PK
        string GroupName
    }
    AuthUserGroup {
        string UserId PK_FK
        string GroupCode PK_FK
    }
    AuthRole {
        string RoleCode PK
        string RoleName
    }
    AuthRelationPrincipalRole {
        string PrincipalRoleCode PK
        string UserId FK
        string GroupCode FK
        string RoleCode FK
    }
    AuthResource {
        string ResourceKey PK
        string ParentResourceKey FK
        string ResourceName
    }
    AuthAction {
        string ActionCode PK
        string ActionName
    }
    AuthRelationGrant {
        string GrantCode PK
        string RoleCode FK
        string ResourceKey FK
        string ActionCode FK
    }
    AuthUserOverride {
        string UserId PK_FK
        string ResourceKey PK_FK
        string ActionCode PK_FK
    }
    AuthTokens {
        bigint TokenId PK
        string UserId FK
    }
```

--------------------------------------------------------------------------------

關鍵關聯說明

1. **身分主體 (Identity)**：

    ◦ **AuthPrincipalUser** (使用者) 與 **AuthPrincipalGroup** (群組) 是權限的主體。

    ◦ **AuthUserGroup** 是兩者的對應表，實現「一人多組」的關聯，主鍵為 `(UserId, GroupCode)` 的複合主鍵。

2. **角色指派 (Assignment)**：

    ◦ **AuthRelationPrincipalRole** 是核心的神經接點，將使用者或群組指派給角色。

    ◦ **XOR 約束**：該表包含一個重要的資料完整性約束，即 `UserId` 與 `GroupCode` 必須二選一（互斥），確保一筆授權記錄明確歸屬於個人或群組。

3. **授權決策矩陣 (Grant Matrix)**：

    ◦ **AuthRelationGrant** 將「角色 (`RoleCode`)」、「資源 (`ResourceKey`)」與「動作 (`ActionCode`)」串連起來，定義最終的權限效果（Allow/Deny）。

4. **資源與動作 (Object & Verb)**：

    ◦ **AuthResource** 透過 `ParentResourceKey` 實作 **Self-FK (自我參照)** 的樹狀結構，支援階層管理。

    ◦ **AuthAction** 提供標準化的動詞代碼，用於定義可執行的操作。

5. **例外與執行 (Exception & Session)**：

    ◦ **AuthUserOverride** 擁有最高優先級，直接關聯使用者、資源與動作，用於處理個人化的例外權限。

    ◦ **AuthTokens** 則負責追蹤每位使用者的會話狀態，與 `AuthPrincipalUser` 透過 `UserId` 關聯。

這套架構透過以上 PK 與 FK 的嚴密定義，構成了一個完整的 **RBAC + ABAC 混合權限引擎**