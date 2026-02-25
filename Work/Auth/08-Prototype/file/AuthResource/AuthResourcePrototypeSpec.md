# AuthResource Prototype Spec（2026-02-25）

本文件描述 AuthResource（資源主檔）的 prototype 規格、欄位解讀、UI/互動流程、以及實作注意事項。

- Prototype 路徑：`file/AuthResource/`
- 技術：Pure HTML / CSS / Vanilla JS（無框架、無後端、in-memory 假資料）
- 主要參考文件：`[技術規格書] 權限模組_05_資源主檔 (AuthResource)`（並交叉理解 AuthRelationGrant/AuthUserOverride 對 AuthResource.ResourceKey 的 FK 依賴）

---

## 1. 文件解讀重點（AuthResource 在架構中的角色）

1) **AuthResource 是「名詞」與「受控物件清單」**
- 無論是 Menu/Page/API/Button/Field，都被視為 Resource；僅透過 `ResourceType` 區分（Single Table Strategy）。

2) **樹狀結構與繼承管理**
- 透過 `ParentResourceKey`（Self-FK）+ `Path`（物化路徑 / materialized path）支援階層管理與子樹查詢。
- 文件強調「授權父節點、子節點可繼承」與「LIKE '/xxx/%' 一次取出子樹」的效能訴求。

3) **ABAC 屬性來源**
- `MetaJson` 作為資源屬性（Attributes）倉儲，供後續動態權限計算使用。

4) **與授權表/覆寫表的關聯（重要：Key 不可隨意變更）**
- `AuthRelationGrant.ResourceKey`、`AuthUserOverride.ResourceKey` 皆 FK 指向 AuthResource.ResourceKey。
- 因此 ResourceKey/ResourceCode 的變更是高風險操作（會造成「引用斷裂」），應以後端 guardrail 保護。

---

## 2. 欄位解讀與注意事項（UI/驗證觀點）

> 依文件欄位表整理；prototype UI 亦依此做基本驗證與互動限制。

### 2.1 Key / Identity
- **ResourceKey**（PK, 必填）
  - 建議格式：`{AppCode}:{ResourceCode}`。
  - UI 策略：由 AppCode + ResourceCode 自動組合、唯讀顯示（避免破壞 FK）。

- **AppCode**（必填）
  - 用途：子系統隔離；同一 AppCode 下 ResourceCode 必須唯一。
  - UI 策略（依你指示）：預設帶入且 disabled。

- **ResourceCode**（必填）
  - 用途：程式碼與授權綁定常用的業務代碼。
  - 驗證：同 AppCode 唯一。
  - UI 策略：Add 可輸入；Edit 鎖定（避免改 Key 造成引用斷裂）。

- **ResourceName**（必填）
  - 顯示名稱（可視為 i18n key 或顯示字串）。

### 2.2 Type / Tree
- **ResourceType**（必填）
  - 枚舉：`SYSTEM, MODULE, MENU, PAGE, API, BUTTON, FIELD`。
  - UI：下拉選單。

- **ParentResourceKey**（可空）
  - Self-FK；根節點為 NULL。
  - Guardrail：
    - 禁止選自己當 parent
    - 禁止選子孫當 parent（避免循環）
    - 移動節點時需遞迴更新自己與所有子孫的 Path（實務上需 transaction）

- **Path**（可空但強烈建議由系統維護）
  - 物化路徑，用於子樹查詢與批次停用。
  - UI 策略：唯讀顯示；由 prototype 依 parent + resourceCode 自動推導。

- **SortOrder**（必填）
  - 同層排序權重；數字越小越前。

- **IsLeaf**（必填）
  - 文件用於優化前端渲染；同時是刪除 guardrail 的判斷基礎。
  - UI 策略：由「是否存在子節點」推導，唯讀顯示。

- **IsActive**（必填）
  - 用途：軟刪除/下架。
  - UI：可編輯（Active/Inactive）。

### 2.3 Routing（API only）
- **Endpoint**（可空；API 型別時視為必填）
  - 用途：Middleware 依 Endpoint/Method 反查 Resource。
  - 文件維運情境：Resource 不存在時預設 Deny。

- **Method**（可空；僅 API）
  - 值域：GET/POST/PUT/DELETE。
  - UI：ResourceType != API 時顯示 N/A（method 清空）。

### 2.4 Meta / Search
- **MetaJson**（可空）
  - 文件描述：ABAC 核心屬性（JSON），且等同 Attributes。
  - UI 驗證：若填寫必須為合法 JSON。

- **Tags**（可空）
  - 文字型標籤（prototype 採 contains 搜尋）。

### 2.5 Audit / Concurrency
- **Audit Fields**（CreatedBy/CreatedDate/ModifiedBy/ModifiedDate）
  - UI：唯讀顯示。

- **RowVersion**（必填）
  - 併發控制：避免多人同時修改。
  - Prototype：以數字遞增模擬，儲存時做簡化版版本檢查（不一致就阻擋）。

---

## 3. 文件中的命名不一致（prototype 的處理方式）

- 文件中索引區出現 `Lineage`，欄位表使用 `Path`。
  - Prototype UI 採用：`Path`（依你確認）。

- 索引區出現 `HttpMethod`，欄位表使用 `Method`。
  - Prototype UI 採用：`Method`（依你確認）。

---

## 4. Prototype 功能範圍（你要求的 CRUD）

### 4.1 Search / Index
- 上方 Search Form（AppCode 固定、其餘可條件查詢）
- 結果表格每列提供：
  - **Detail**：開 drawer 檢視完整欄位（唯讀）
  - **Edit**：開 drawer 編輯（保護 Key 欄位）
  - **Delete**：執行 soft delete（將 IsActive=0）

### 4.2 Detail
- 以右側 drawer 顯示完整資料
- 所有欄位唯讀

### 4.3 Add New
- 點 `Add New` 開 drawer
- Add 時可輸入 ResourceCode（進而自動組 ResourceKey）
- Parent 可選 root 或既有節點

### 4.4 Edit
- Edit 時鎖定：AppCode / ResourceKey / ResourceCode
- 可編輯：ResourceName/ResourceType/Parent/SortOrder/Endpoint/Method/MetaJson/Tags/IsActive

### 4.5 Delete（soft delete）
- `Delete` 只做「下架」：把 `IsActive` 設為 0
- Guardrail：若該筆 **非葉節點**（有 children），則 **阻擋 Delete**，並提示先處理子節點或改用下架（此處仍符合文件精神：不可直接刪非葉節點）

---

## 5. 驗證規則（prototype 已實作）

- Required
  - ResourceCode、ResourceName、ResourceType、SortOrder
  - ResourceType=API 時：Endpoint、Method 必填

- Unique
  - `(AppCode, ResourceCode)` 不可重複（prototype 以 case-insensitive 比對模擬）

- Tree safety
  - ParentResourceKey 必須存在（或為 root）
  - Edit 時禁止循環：不可選自己或子孫作為 parent

- JSON
  - MetaJson 若非空必須可被 `JSON.parse` 成功解析

- Concurrency
  - Save 時檢查 RowVersion，若不一致則拒絕（提醒重新打開再編）

---

## 6. Path 維護策略（prototype 的可視化做法）

文件重點：移動節點（修改 ParentResourceKey）時，需要遞迴更新該節點與所有子孫節點的 Path，且應封裝在 transaction。

Prototype 實作：
- Path 由下列規則推導：
  - root：`/{AppCode}/{ResourceCode}/`
  - child：`{Parent.Path}{ResourceCode}/`
- Edit 改 Parent 時：
  - 會遞迴更新自己與子孫的 Path
  - 也會同步更新子孫的 ModifiedDate/RowVersion（用來呈現「維護成本」）

---

## 7. 已知簡化（prototype 與正式系統差異）

- 無 DB / 無 API：所有資料存在前端記憶體，重新整理即重置。
- Delete 僅做 soft delete；不做「物理刪除 + 連帶清 AuthRelationGrant」的 DB cascade。
- 未實作索引/效能議題（僅在 spec 中保留文件重點）。
- 未實作多 AppCode 切換（依需求固定為 PMS）。

---

## 8. 製作心得與注意事項（交付給後端/正式版的提醒）

- **Key 的不可變性要明確落地**：ResourceKey/ResourceCode 一旦被 Grant/Override 引用後，變更成本極高；UI/後端應共同保護。
- **樹狀維護要交易化**：Parent 變動必須 transaction + 遞迴更新子孫 path；否則資料很容易出現「路徑不一致」。
- **刪除策略要先定義清楚**：文件建議 soft delete；若要物理刪除需先清掉 grant/override 等關聯資料。
- **MetaJson 先做格式驗證，再談 schema**：prototype 只做 JSON parse；正式版應視 ABAC 規格定 schema/鍵值白名單。
- **Route 欄位是 Hot Path**：API middleware 依 Endpoint/Method 查表，資源不存在 = Default deny；運維上要提供快速檢查工具。
