// ========================== File: ERP.DataAdmin/ViewModels/Authorization/PermViewer/PermViewerEditVM.cs ==========================
using ERP.CommonLib.Attributes.CodeManagement;
using ERP.CommonLib.Models.Shared.UI.FormCode;
using ERP.DataAdmin.Services;

namespace ERP.DataAdmin.ViewModels.Authorization.PermViewer
{
    /// <summary>
    /// ⚙️ <b>權限檢視器編輯視圖模型（PermViewerEditVM）</b>  
    /// <para name="zh-TW">用於前端「權限檢視器（PermViewer）」表單的資料綁定與覆寫權限設定操作。</para>  
    /// <para name="en-US">Represents the editable view model for permission viewer (PermViewer),  
    /// supporting dynamic form fields and data binding for authorization override operations.</para>
    /// </summary>
    /// <remarks>
    /// <list type="bullet">
    /// <item>📦 <b>對應資料模型：</b> <c>AuthUserOverride</c> 或 <see cref="PermViewerRowVM"/>（權限檢視結果列）。</item>
    /// <item>🔗 <b>關聯服務：</b> <c>IPermViewerAppService</c> — 處理權限檢視與覆寫資料邏輯。</item>
    /// <item>🧩 <b>UI 結構來源：</b> <see cref="IUiMetaService"/> — 提供動態表單欄位設定。</item>
    /// <item>🧠 <b>應用場景：</b> 用於「權限檢視 → 編輯」流程中，調整特定 ActionCode 的覆寫旗標（允許 / 拒絕）。</item>
    /// </list>
    /// </remarks>
    [CodeVersion(
        "1.0.0",
        "權限檢視器編輯視圖模型（PermViewerEditVM）",
        ticketId: "N/A",
        status: "Stable",
        notes: "PermViewerEditVM.cs — 用於權限覆寫編輯與動態欄位配置。",
        author: "Ryu",
        date: "2025-11-03",
        system: "ERP.DataAdmin",
        module: "ViewModels.Authorization.PermViewer",
        form: "PermViewerEditVM")]
    public sealed class PermViewerEditVM
    {
        /// <summary>
        /// 🆔 使用者識別碼（UserId）  
        /// <para name="zh-TW">用於識別權限所屬的使用者。</para>  
        /// <para name="en-US">Unique identifier of the user whose permissions are being viewed or edited.</para>
        /// </summary>
        public string? UserId { get; set; }

        /// <summary>
        /// 🧩 系統代碼（System）  
        /// <para name="zh-TW">用於標識權限所屬系統（例如 PMS、TRADE）。</para>  
        /// <para name="en-US">Indicates the system code (e.g., PMS, TRADE) where the permission applies.</para>
        /// </summary>
        public string? System { get; set; }

        /// <summary>
        /// 📦 模組名稱（Module）  
        /// <para name="zh-TW">用於標識權限所屬模組。</para>  
        /// <para name="en-US">Indicates the functional module of the permission entry.</para>
        /// </summary>
        public string? Module { get; set; }

        /// <summary>
        /// 🗂️ 表單代碼（Form）  
        /// <para name="zh-TW">用於辨識權限對應的表單或功能畫面。</para>  
        /// <para name="en-US">Specifies the form or screen associated with the permission entry.</para>
        /// </summary>
        public string? Form { get; set; }

        /// <summary>
        /// 🎛️ 控制項代碼（Control）  
        /// <para name="zh-TW">用於標識目標控制項（例如按鈕、功能開關）。</para>  
        /// <para name="en-US">Represents the target control (e.g., button, toggle) for permission editing.</para>
        /// </summary>
        public string? Control { get; set; }

        /// <summary>
        /// ⚙️ 動作代碼（ActionCode）  
        /// <para name="zh-TW">動作識別碼（例如 READ、CREATE、UPDATE、DELETE）。</para>  
        /// <para name="en-US">Specifies the action code (e.g., READ, CREATE, UPDATE, DELETE).</para>
        /// </summary>
        public string? ActionCode { get; set; }

        /// <summary>
        /// 📋 表單欄位清單（Fields）  
        /// <para name="zh-TW">定義權限覆寫編輯表單的結構與顯示規則。</para>  
        /// <para name="en-US">Defines the structure and display rules of the permission override edit form.</para>
        /// </summary>
        /// <remarks>
        /// <list type="bullet">
        /// <item>型別：<see cref="UiFormField"/></item>
        /// <item>內容：欄位名稱、輸入型別、驗證規則、顯示順序等。</item>
        /// <item>預設：初始化為空集合。</item>
        /// </list>
        /// </remarks>
        public List<UiFormField> Fields { get; set; } = new();

        /// <summary>
        /// 💾 權限資料內容（Data）  
        /// <para name="zh-TW">儲存表單的實際輸入資料，用於建立或更新覆寫設定。</para>  
        /// <para name="en-US">Stores the actual input data for creating or updating permission overrides.</para>
        /// </summary>
        /// <remarks>
        /// <list type="bullet">
        /// <item>型別：<c>Dictionary&lt;string, object?&gt;</c></item>
        /// <item>用途：綁定 <c>IPermViewerAppService</c> 的 CreateAsync/UpdateAsync 資料結構。</item>
        /// <item>預設：初始化為空字典。</item>
        /// </list>
        /// </remarks>
        public Dictionary<string, object?> Data { get; set; } = new();

        /// <summary>
        /// 🚦 權限旗標（Flag）  
        /// <para name="zh-TW">表示最終授權狀態：'Y'（允許）、'N'（拒絕）、null（未設定）。</para>  
        /// <para name="en-US">Indicates the final authorization state: 'Y' (allow), 'N' (deny), or null (unset).</para>
        /// </summary>
        public string? Flag { get; set; }

        /// <summary>
        /// 🧭 權限來源（PermissionSourceShort）  
        /// <para name="zh-TW">指出授權的來源，例如角色允許（R-AL）或覆寫拒絕（O-DN）。</para>  
        /// <para name="en-US">Indicates the source of the permission such as Role-Allow (R-AL) or Override-Deny (O-DN).</para>
        /// </summary>
        public string? PermissionSourceShort { get; set; }

        /// <summary>
        /// 📝 備註欄（Remark）  
        /// <para name="zh-TW">用於記錄修改原因、調整依據或備註資訊。</para>  
        /// <para name="en-US">Used to record remarks, change reasons, or explanatory notes.</para>
        /// </summary>
        public string? Remark { get; set; }

        /// <summary>
        /// 🧱 標題（Title）  
        /// <para name="zh-TW">對應於前端 UI 的標題，例如「修改覆寫權限」。</para>  
        /// <para name="en-US">Represents the UI title displayed in the frontend, such as “Edit Override Permission”.</para>
        /// </summary>
        public string? Title { get; set; }

        /// <summary>
        /// 💡 說明文字（HelpText）  
        /// <para name="zh-TW">提供給前端的輔助說明或提示文字。</para>  
        /// <para name="en-US">Provides instructional or helper text for the frontend UI.</para>
        /// </summary>
        public string? HelpText { get; set; }
    }
}
