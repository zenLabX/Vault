## 🔐 Authorization
- [[Permission Decision Flow]]
- [[AppCode Isolation]]
- [[Cache Invalidation]]

## 🗄 Database Core
- [[Primary Key]]
- [[Foreign Key]]
- [[Composite Primary Key]]
- [[Logical PK&Business Key]]
- [[Constraints]]
- [[XOR Constraint]]
- [[Transaction]]
- [[ACID]]

## 📇 Index & Query
- [[Index]]
- [[Covering Index]]
- [[Filtered Unique Index]]
- [[Execution Plan]]
- [[Hash-based Lookup]]

## ⚙️ Concurrency & Isolation
- [[Isolation Level]]
- [[Snapshot Isolation]]
- [[Optimistic Lock]]
- [[RowVersion]]
- [[Deadlock]]
- [[Guardrail Pattern]]

## 🗑 Data Lifecycle
- [[Delete Strategy]]
- [[Temporal Pattern]]
- [[Data Retention]]
- [[Audit Fields]]
- [[Immutable System Data]]

## 🏗 Architecture & Patterns
- [[DB-first vs Code-first]]
- [[Exception Translation]]
- [[Bulk Update Strategy]]
- [[Schema Migration]]

## 🌳 Structural Patterns
- [[Self-Referencing FK]]

## Entity Reference（Auth 十表）
| 表                             | 定位         | 關鍵知識概念                                                         |
| ----------------------------- | ---------- | -------------------------------------------------------------- |
| [[AuthPrincipalUser]]         | 使用者主檔      | [[Delete Strategy]]、[[Optimistic Lock]]、[[Cache Invalidation]] |
| [[AuthRole]]                  | 角色主檔       | [[Immutable System Data]]、[[AppCode Isolation]]                |
| [[AuthPrincipalGroup]]        | 群組主檔       | [[Temporal Pattern]]、[[AppCode Isolation]]                     |
| [[AuthRelationPrincipalRole]] | 主體角色關聯     | [[XOR Constraint]]、[[Filtered Unique Index]]                   |
| [[AuthResource]]              | 資源主檔（樹狀）   | [[Self-Referencing FK]]、[[Transaction]]                        |
| [[AuthAction]]                | 操作動作表      | [[Immutable System Data]]、[[Constraints]]                      |
| [[AuthRelationGrant]]         | 授權設定（決策矩陣） | [[Permission Decision Flow]]、[[Covering Index]]                |
| [[AuthUserOverride]]          | 個人覆寫表      | [[Composite Primary Key]]、[[Permission Decision Flow]]         |
| [[AuthTokens]]                | 權杖管理表      | [[Hash-based Lookup]]、[[Data Retention]]                       |
| [[AuthUserGroup]]             | 使用者群組對應    | [[Composite Primary Key]]、[[Cache Invalidation]]               |

## 📚 Source Documents
- [[BasicDBTransaction-JuniorLevel|Junior Level — PK/FK + CRUD + Transaction 基礎]]
- [[BasicDBTransaction-MiddleLevel|Middle Level — 隔離等級、死鎖、進階實作]]