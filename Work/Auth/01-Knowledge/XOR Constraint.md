---
project: Auth
tags: [knowledge, db, auth]
aliases: [互斥約束, 互斥欄位, XOR CHECK]
created: 2026-02-27
---

# XOR Constraint（互斥約束）

## 是什麼
一種 [[Constraints|CHECK 約束]]，確保一筆資料中**兩個 nullable 欄位恰好只有一個有值**（互斥、二選一）。

## 為什麼重要
- 如果只靠程式檢查 → 遲早會被某次「漏檢」污染 DB
- DB 層 CHECK 是最後防線 → 任何寫入來源都被約束
- 查詢時要注意其中一個欄位永遠是 NULL

---

## 核心觀念

### SQL CHECK 語法
```sql
CHECK (
    (UserId IS NOT NULL AND GroupCode IS NULL)
    OR
    (UserId IS NULL AND GroupCode IS NOT NULL)
)
```
→ 每筆只能是「使用者指派」或「群組指派」，不能同時或皆無

### 程式層也要檢查
- DB CHECK 保證資料正確性 → **最可靠**
- 程式碼 Create/Update 時也要驗證 → **提供友善錯誤訊息**（[[Exception Translation]]）

### 查詢注意
- 查某使用者的角色：`WHERE UserId = @id`（GroupCode 自然是 NULL）
- 查某群組的角色：`WHERE GroupCode = @code`（UserId 自然是 NULL）
- 搭配 [[Filtered Unique Index]]：分別對 User-Role-AppCode 和 Group-Role-AppCode 建索引

---

## Auth 專案實例
- `AuthRelationPrincipalRole`：`UserId`（指向使用者）和 `GroupCode`（指向群組）二選一
- 搭配篩選唯一索引：
  - `UX_PrincipalRole_User`：`WHERE UserId IS NOT NULL`
  - `UX_PrincipalRole_Group`：`WHERE GroupCode IS NOT NULL`

---

## 相關概念
- [[Constraints]] — XOR 是 CHECK 約束的特殊形式
- [[Filtered Unique Index]] — 搭配 XOR 建不同組合的唯一索引
- [[Foreign Key]] — XOR 的兩個欄位分別是不同表的 FK
- [[Exception Translation]] — CHECK violation 翻譯

## 參考來源
- 📎 `_04 主體角色關聯(AuthRelationPrincipalRole)` §三 XOR CHECK + 篩選唯一索引
- 📎 BasicDBTransaction-JuniorLevel §14（XOR 約束）
