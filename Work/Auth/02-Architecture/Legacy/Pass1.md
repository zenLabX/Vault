# Trade.dbo.Pass1（舊系統）欄位說明（User / 使用者主檔）

> **用途定位**：系統使用者帳號與人員資料、所屬角色、部分特殊旗標。  
> **主鍵(PK)**：`ID`（注意：是字串帳號）

## 欄位描述（依常見語意+資料推論；建議遷移前做資料驗證）

| 欄位             | 類型(推測)        |  必填 | 意義/用途                                       | 轉新DB建議對應                                              |
| -------------- | ------------- | --: | ------------------------------------------- | ----------------------------------------------------- |
| ID             | nvarchar      |   Y | **使用者帳號（PK）**，如 `Robot`。                    | `Users.UserName` 或 `Users.Account`（unique）            |
| Name           | nvarchar      |   N | 使用者姓名/顯示名稱。                                 | `Users.DisplayName`                                   |
| Password       | nvarchar      |   N | 舊系統密碼（為明碼）。**遷移通常不直接搬**。                    | 新系統改用 Identity/AD/OAuth；保留 `LegacyPasswordHash`（必要才留） |
| Position       | nvarchar      |   N | 職務/職位類別（例：MIS）。                             | `Users.JobFunction` 或 `Title`                         |
| FKPass0        | int           |   Y | **所屬角色(群組)** 外鍵 → `Pass0.PKey`。             | `UserRoles.RoleId`（若新系統一人多角色則需拆關聯表）                   |
| IsAdmin        | bit/int       |   N | 使用者是否管理者（個人層級旗標）。可能用於快速判斷。                  | `Users.IsAdmin`（或改由角色決定）                              |
| IsMIS          | bit/int       |   N | 使用者是否 MIS（個人層級旗標）。                          | `Users.IsIT` 或 Claim/Role                             |
| OrderGroup     | nvarchar      |   N | 訂單群組/分組（業務或工廠分組用）。                          | `Users.OrderGroup` 或 mapping table                    |
| EMail          | nvarchar      |   N | Email。                                      | `Users.Email`                                         |
| ExtNo          | nvarchar      |   N | 分機號碼。                                       | `Users.Extension`                                     |
| OnBoard        | datetime      |   N | 到職日。                                        | `Users.HireDate`                                      |
| Resign         | datetime      |   N | 離職日。                                        | `Users.TerminationDate`                               |
| Supervisor     | nvarchar      |   N | 主管帳號/工號（可能是 Pass1.ID）。                      | `Users.SupervisorUserName` 或 FK `SupervisorUserId`    |
| Manager        | nvarchar      |   N | 經理帳號/工號。                                    | 同上（層級主管）                                              |
| Deputy         | nvarchar      |   N | 代理人帳號/工號。                                   | `Users.DeputyUserId`                                  |
| Factory        | nvarchar      |   N | 工廠別/廠區權限標記。                                 | `UserFactoryScope`                                    |
| CountryList    | nvarchar      |   N | 國別清單（可能逗號字串）。                               | 正規化為 `UserCountryScopes`                              |
| CodePage       | nvarchar/int  |   N | 編碼頁/語系相關設定。                                 | `Users.Locale`                                        |
| FilePath       | nvarchar      |   N | 使用者檔案路徑/匯出路徑設定。                             | `Users.FilePath` 或改為設定表                               |
| AddName        | nvarchar      |   N | 建立者。                                        | `CreatedBy`                                           |
| AddDate        | datetime      |   N | 建立時間。                                       | `CreatedAt`                                           |
| EditName       | nvarchar      |   N | 修改者。                                        | `UpdatedBy`                                           |
| EditDate       | datetime      |   N | 修改時間。                                       | `UpdatedAt`                                           |
| PWDWindows     | nvarchar      |   N | Windows/網域密碼或相關欄位（需確認）。通常不應保存。              | 建議不遷移（改AD/SSO）                                        |
| PWDEmail       | nvarchar      |   N | Email 密碼（高風險）。                              | 建議不遷移                                                 |
| CreateDate     | date/datetime |   N | 帳號建立日（可能與 AddDate 不同）。                      | `Users.CreatedAt`                                     |
| Sample         | bit/int       |   N | 是否開 Sample 模組權限旗標（或功能開關）。                   | 建議改成角色/權限，不用旗標                                        |
| Trade          | bit/int       |   N | 是否開 Trade 模組。                               | 同上                                                    |
| Accounting     | bit/int       |   N | 是否開 Accounting 模組。                          | 同上                                                    |
| FromFactory    | bit/int       |   N | 是否工廠端帳號/從工廠登入類型。                            | `Users.Source=Factory`                                |
| Duty           | nvarchar      |   N | 職責/班別/職務說明。                                 | `Users.Duty`                                          |
| DepartmentID   | nvarchar/int  |   N | 部門代碼。                                       | `Departments.DepartmentId` + FK                       |
| Department     | nvarchar      |   N | 部門名稱（冗餘）。                                   | 新系統用 FK，不存冗餘或僅快照                                      |
| Kpi            | bit/int       |   N | KPI 相關旗標（是否納入/是否顯示）。                        | `Users.KpiEnabled`                                    |
| TeamAvg        | bit/int       |   N | 團隊平均相關旗標。                                   | 需求確認後再遷移                                              |
| MultipleRank   | bit/int       |   N | 多重評等/多層級排名旗標。                               | 需求確認                                                  |
| KpiRemark      | nvarchar      |   N | KPI 備註。                                     | `Users.KpiRemark`                                     |
| EmailID        | nvarchar      |   N | 內部 Email 帳號/代碼（不同於 EMail）。                  | `Users.EmailAccount`                                  |
| Key_Old        | nvarchar      |   N | 舊鍵值/歷史ID（用於對照）。                             | `Users.LegacyKey`                                     |
| ShipAdvicePath | nvarchar      |   N | 出貨通知相關路徑。                                   | `Users.ShipAdvicePath`                                |
| PositionTitle  | nvarchar      |   N | 職稱（更正式的 Title）。                             | `Users.Title`                                         |
| LoginName      | nvarchar      |   N | 登入名（例如 `domain\unattendedrobot`）。可能是 AD 帳號。 | `Users.LoginName` 或 `ExternalLogin`                   |
| NeedMFA        | bit/int       |   N | 是否需要 MFA。                                   | `Users.MfaRequired`                                   |
| HRDepartmentID | nvarchar/int  |   N | HR 系統部門代碼（可能不同於 DepartmentID）。              | `Users.HrDepartmentId` 或 mapping                      |

## 關聯（舊系統）
- `Pass1.FKPass0` → `Pass0.PKey`（一個使用者對一個角色；新系統多角色要拆）

## 遷移注意事項（強烈建議）
1. **密碼欄位(PWD/Password)不要直接遷移**：新系統採用 ASP.NET Core Identity（hash+salt）或 AD/SSO。
2. `Supervisor/Manager/Deputy` 若是以字串存帳號，遷移時要先建立 Users，再回填關聯（兩階段）。
3. `CountryList` 這種字串清單建議正規化成多筆資料。