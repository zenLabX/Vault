// ========================== File: ERP.DataAdmin/ViewModels/Authorization/PermViewer/PermWideSourceRowVM.cs ==========================
using ERP.CommonLib.Attributes.CodeManagement;

namespace ERP.DataAdmin.ViewModels.Authorization.PermViewer
{
    /// <summary>
    /// 🧭 <b>權限檢視 Wide-Source（Pivot：Action → 來源簡碼）列視圖模型（PermWideSourceRowVM）</b>
    /// <para name="zh-TW">
    /// 用於「PermViewer」權限檢視畫面中的 Wide-Source（橫向 Pivot）模式，
    /// 每一列代表一個具體的權限節點（系統／模組／表單／控制項），
    /// 並以「動作代碼 → 授權來源簡碼」的方式呈現每個 Action
    /// 最終授權是由哪一層級（Role / Override）所決定。
    /// </para>
    /// <para name="en-US">
    /// Represents a single row in the permission viewer wide-source (pivot) mode,
    /// where each action column shows the source code indicating
    /// which authorization layer determined the final permission.
    /// </para>
    /// </summary>
    /// <remarks>
    /// <list type="bullet">
    /// <item>📊 <b>顯示模式：</b>Wide-Source / Pivot（Action → SourceCode）。</item>
    /// <item>🧱 <b>列層級：</b>System → Module → Form → Control。</item>
    /// <item>🔍 <b>用途：</b>用於分析授權來源，協助除錯「為何允許 / 為何拒絕」。</item>
    /// <item>🧩 <b>資料來源：</b>後端整合 Role、Group、Override 後計算出的來源標記。</item>
    /// <item>⚠️ <b>注意：</b>此 ViewModel 僅負責顯示，不參與任何授權判斷或合併邏輯。</item>
    /// </list>
    /// </remarks>
    [CodeVersion(
        "1.0.0",
        "權限檢視 Wide-Source（Pivot）列視圖模型",
        ticketId: "N/A",
        status: "Stable",
        notes: "PermWideSourceRowVM.cs — PermViewer 專用顯示模型，以 Action → 授權來源簡碼 呈現最終授權來源。",
        author: "Ryu",
        date: "2026-01-XX",
        system: "ERP.DataAdmin",
        module: "ViewModels.Authorization.PermViewer",
        form: "PermWideSourceRowVM")]
    public sealed class PermWideSourceRowVM
    {
        /// <summary>
        /// 🖥️ 系統代碼（System）
        /// </summary>
        public string System { get; set; } = string.Empty;

        /// <summary>
        /// 🧩 模組名稱（Module）
        /// </summary>
        public string? Module { get; set; }

        /// <summary>
        /// 📄 表單名稱（Form）
        /// </summary>
        public string? Form { get; set; }

        /// <summary>
        /// 📄 使用者 ID（UserId）
        /// </summary>
        public string? UserId { get; set; }

        /// <summary>
        /// 🎛️ 控制項名稱（Control）
        /// </summary>
        public string? Control { get; set; }

        /// <summary>
        /// 🧾 控制項最終表單代碼
        /// </summary>
        public string? ControlFinalFormCode { get; set; }

        /// <summary>
        /// 🧾 控制項最終表單名稱
        /// </summary>
        public string? ControlFinalFormName { get; set; }

        /// <summary>
        /// 🧬 動作來源對照表（ActionCode → 授權來源簡碼）
        /// <para>
        /// Value 定義：
        /// <list type="bullet">
        /// <item><c>O-AL</c>：Override Allow</item>
        /// <item><c>O-DN</c>：Override Deny</item>
        /// <item><c>R-AL</c>：Role Allow</item>
        /// <item><c>R-DN</c>：Role Deny</item>
        /// <item><c>null</c>：未定義 / 無授權來源</item>
        /// </list>
        /// </para>
        /// </summary>
        public Dictionary<string, string?> SourceByAction { get; set; } =
            new(StringComparer.OrdinalIgnoreCase);
    }
}
