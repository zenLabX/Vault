---
project: Auth
deadline: 2026-03-31
tags: [architecture, data-model, auth]
---

# ER Diagram — Auth

## 規則: 何謂一對多?

1. 「一個班級」裡可以有「很多個學生」
班級 → 學生 = 一對多
因為：1 個班級（1）可以有很多學生（多），但每個學生通常只在 1 個班級（以這個例子來說）。


2. 怎麼看出「誰是 1、誰是多」？用兩個超簡單規則：

規則 1：看「誰放了對方的編號」
如果「學生名單」裡有「班級ID」，代表：學生要記得自己是哪個班級。
所以：班級是「1」，學生是「多」。

## 關聯圖
- [[AuthERDiagram]]

## Notes
- 主表為: AuthRole、AuthPrincipalGroup、AuthPrincipalUser、AuthAction、AuthResource
- Mapping表為: AuthRelationPrincipalRole、AuthUserGroup、AuthRelationGrant、AuthUserOverride
- 擴充表為: AuthTokens

## Tasks（#auth）
- [x] 畫出全系統 10 張表的 ER Diagram（實體關聯圖），標示 PK/FK #auth
  status:: done
  priority:: medium
  due:: 2026-03-01
