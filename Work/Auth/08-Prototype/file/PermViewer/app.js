/* Pure JS prototype for PermViewer (wide-source pivot). */

(function () {
  'use strict';

  const ACTIONS = ['VIEW', 'CREATE', 'EDIT', 'DELETE', 'EXPORT', 'APPROVE', 'PRINT'];

  /**
   * Demo resources (each becomes a row).
   * In real system this aligns to AuthResource tree (System/Module/Form/Control).
   */
  const RESOURCES = [
    {
      resourceKey: 'ERP:ORDER:FORM:BTN_SUBMIT',
      system: 'ERP',
      module: 'ORDER',
      form: 'OrderForm',
      control: 'BTN_SUBMIT',
      controlFinalFormCode: 'ORDER_FORM',
      controlFinalFormName: '訂單表單',
    },
    {
      resourceKey: 'ERP:ORDER:FORM:BTN_EXPORT',
      system: 'ERP',
      module: 'ORDER',
      form: 'OrderForm',
      control: 'BTN_EXPORT',
      controlFinalFormCode: 'ORDER_FORM',
      controlFinalFormName: '訂單表單',
    },
    {
      resourceKey: 'ERP:PO:FORM:BTN_APPROVE',
      system: 'ERP',
      module: 'PO',
      form: 'PurchaseOrder',
      control: 'BTN_APPROVE',
      controlFinalFormCode: 'PO_FORM',
      controlFinalFormName: '採購單',
    },
    {
      resourceKey: 'ERP:FIN:FORM:RPT_PRINT',
      system: 'ERP',
      module: 'FIN',
      form: 'FinanceReport',
      control: 'RPT_PRINT',
      controlFinalFormCode: 'FIN_RPT',
      controlFinalFormName: '財務報表',
    },
  ];

  /**
   * Demo user-role mapping (AuthRelationPrincipalRole + AuthUserGroup etc.).
   */
  const USER_ROLES = {
    U001: ['ROLE_ORDER_USER', 'ROLE_PO_CLERK'],
    U002: ['ROLE_ORDER_ADMIN', 'ROLE_FIN_VIEWER'],
  };

  /**
   * Demo role grants (AuthRelationGrant).
   * effect: 1 allow, 0 deny.
   */
  let ROLE_GRANTS = [
    // Order user: can VIEW/CREATE/EDIT, but DENY EXPORT (explicit deny)
    grant('ROLE_ORDER_USER', 'ERP:ORDER:FORM:BTN_SUBMIT', 'VIEW', 1),
    grant('ROLE_ORDER_USER', 'ERP:ORDER:FORM:BTN_SUBMIT', 'CREATE', 1),
    grant('ROLE_ORDER_USER', 'ERP:ORDER:FORM:BTN_SUBMIT', 'EDIT', 1),
    grant('ROLE_ORDER_USER', 'ERP:ORDER:FORM:BTN_EXPORT', 'EXPORT', 0),

    // PO clerk: can VIEW but DENY APPROVE
    grant('ROLE_PO_CLERK', 'ERP:PO:FORM:BTN_APPROVE', 'VIEW', 1),
    grant('ROLE_PO_CLERK', 'ERP:PO:FORM:BTN_APPROVE', 'APPROVE', 0),

    // Order admin: allow most actions
    grant('ROLE_ORDER_ADMIN', 'ERP:ORDER:FORM:BTN_EXPORT', 'EXPORT', 1),
    grant('ROLE_ORDER_ADMIN', 'ERP:ORDER:FORM:BTN_SUBMIT', 'DELETE', 1),

    // Finance viewer: can VIEW/PRINT but deny EDIT
    grant('ROLE_FIN_VIEWER', 'ERP:FIN:FORM:RPT_PRINT', 'VIEW', 1),
    grant('ROLE_FIN_VIEWER', 'ERP:FIN:FORM:RPT_PRINT', 'PRINT', 1),
    grant('ROLE_FIN_VIEWER', 'ERP:FIN:FORM:RPT_PRINT', 'EDIT', 0),
  ];

  /**
   * Demo user overrides (AuthUserOverride). This is what the drawer edits.
   */
  let USER_OVERRIDES = [
    // Example: U001 has an override allow for EXPORT on export button
    override('U001', 'ERP:ORDER:FORM:BTN_EXPORT', 'EXPORT', 1, {
      reason: '特批匯出',
    }),
  ];

  // -------------------------
  // Utilities
  // -------------------------

  function grant(roleCode, resourceKey, actionCode, effect, opts = {}) {
    return {
      roleCode,
      resourceKey,
      actionCode: actionCode.toUpperCase(),
      effect: Number(effect) === 1 ? 1 : 0,
      isActive: opts.isActive ?? true,
      validFromUtc: opts.validFromUtc ?? null,
      validToUtc: opts.validToUtc ?? null,
      remark: opts.remark ?? null,
    };
  }

  function override(userId, resourceKey, actionCode, effect, opts = {}) {
    return {
      userId,
      resourceKey,
      actionCode: actionCode.toUpperCase(),
      effect: Number(effect) === 1 ? 1 : 0,
      isActive: opts.isActive ?? true,
      validFromUtc: opts.validFromUtc ?? null,
      validToUtc: opts.validToUtc ?? null,
      reason: opts.reason ?? '',
      modifiedAtUtc: opts.modifiedAtUtc ?? new Date().toISOString(),
    };
  }

  function parseAtUtc(inputValue) {
    // input is datetime-local; interpret as UTC.
    if (!inputValue) return new Date();
    // yyyy-MM-ddTHH:mm:ss
    const iso = inputValue.endsWith('Z') ? inputValue : `${inputValue}Z`;
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return new Date();
    return dt;
  }

  function toLocalInputUtc(date) {
    // format to yyyy-MM-ddTHH:mm:ss in UTC (no Z) for datetime-local.
    const pad = (n) => String(n).padStart(2, '0');
    const yyyy = date.getUTCFullYear();
    const mm = pad(date.getUTCMonth() + 1);
    const dd = pad(date.getUTCDate());
    const hh = pad(date.getUTCHours());
    const mi = pad(date.getUTCMinutes());
    const ss = pad(date.getUTCSeconds());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
  }

  function isEffectiveAsOf(entry, atUtc) {
    if (!entry || entry.isActive === false) return false;
    const t = atUtc.getTime();
    if (entry.validFromUtc) {
      const from = new Date(entry.validFromUtc).getTime();
      if (!Number.isNaN(from) && t < from) return false;
    }
    if (entry.validToUtc) {
      const to = new Date(entry.validToUtc).getTime();
      if (!Number.isNaN(to) && t > to) return false;
    }
    return true;
  }

  function norm(s) {
    return String(s ?? '').trim();
  }

  function includesCI(haystack, needle) {
    const h = String(haystack ?? '').toLowerCase();
    const n = String(needle ?? '').toLowerCase();
    if (!n) return true;
    return h.includes(n);
  }

  // -------------------------
  // Permission evaluation
  // -------------------------

  function getUserRoles(userId) {
    return USER_ROLES[userId] ?? [];
  }

  function findEffectiveOverride(userId, resourceKey, actionCode, atUtc) {
    const a = actionCode.toUpperCase();
    return (
      USER_OVERRIDES.find(
        (o) =>
          o.userId === userId &&
          o.resourceKey === resourceKey &&
          o.actionCode.toUpperCase() === a &&
          isEffectiveAsOf(o, atUtc)
      ) ?? null
    );
  }

  function findRoleGrants(userId, resourceKey, actionCode, atUtc) {
    const roles = getUserRoles(userId);
    if (roles.length === 0) return [];
    const a = actionCode.toUpperCase();
    return ROLE_GRANTS.filter(
      (g) =>
        roles.includes(g.roleCode) &&
        g.resourceKey === resourceKey &&
        g.actionCode.toUpperCase() === a &&
        isEffectiveAsOf(g, atUtc)
    );
  }

  function hasRoleDeny(userId, resourceKey, actionCode, atUtc) {
    const grants = findRoleGrants(userId, resourceKey, actionCode, atUtc);
    return grants.some((g) => g.effect === 0);
  }

  function computeSourceShort(userId, resourceKey, actionCode, atUtc) {
    // New rule per latest clarification:
    // - Role deny (R-DN) is final and cannot be overridden.
    // - Otherwise, user override (O-AL/O-DN) can cover role allow / default.
    const grants = findRoleGrants(userId, resourceKey, actionCode, atUtc);
    if (grants.some((g) => g.effect === 0)) return 'R-DN';

    const ov = findEffectiveOverride(userId, resourceKey, actionCode, atUtc);
    if (ov) return ov.effect === 1 ? 'O-AL' : 'O-DN';

    if (grants.some((g) => g.effect === 1)) return 'R-AL';
    return null;
  }

  function computeFlagFromOverride(ov) {
    if (!ov) return null;
    return ov.effect === 1 ? 'Y' : 'N';
  }

  // -------------------------
  // Rendering
  // -------------------------

  const dom = {
    form: document.getElementById('queryForm'),
    qUserId: document.getElementById('qUserId'),
    qModule: document.getElementById('qModule'),
    qForm: document.getElementById('qForm'),
    qAction: document.getElementById('qAction'),
    qAtUtc: document.getElementById('qAtUtc'),
    thead: document.getElementById('resultThead'),
    tbody: document.getElementById('resultTbody'),

    drawer: document.getElementById('drawer'),
    drawerOverlay: document.getElementById('drawerOverlay'),
    drawerClose: document.getElementById('drawerClose'),
    drawerTitle: document.getElementById('drawerTitle'),
    drawerSubTitle: document.getElementById('drawerSubTitle'),
    drawerKv: document.getElementById('drawerKv'),
    chkAllow: document.getElementById('chkAllow'),
    chkDeny: document.getElementById('chkDeny'),
    flagState: document.getElementById('flagState'),
    txtRemark: document.getElementById('txtRemark'),
    btnDrawerCancel: document.getElementById('btnDrawerCancel'),
    btnDrawerSave: document.getElementById('btnDrawerSave'),
  };

  function setActionOptions() {
    const frag = document.createDocumentFragment();
    for (const a of ACTIONS) {
      const opt = document.createElement('option');
      opt.value = a;
      opt.textContent = a;
      frag.appendChild(opt);
    }
    dom.qAction.appendChild(frag);
  }

  function pillClass(sourceShort) {
    switch (sourceShort) {
      case 'O-AL':
        return 'pill pill--oal';
      case 'O-DN':
        return 'pill pill--odn';
      case 'R-AL':
        return 'pill pill--ral';
      case 'R-DN':
        return 'pill pill--rdn';
      default:
        return 'pill pill--na';
    }
  }

  function renderTable(state) {
    const shownActions = state.action ? [state.action] : ACTIONS;

    dom.thead.innerHTML = '';
    dom.tbody.innerHTML = '';

    const trh = document.createElement('tr');
    const fixedHeaders = [
      { key: 'userId', label: 'UserId' },
      { key: 'module', label: 'Module' },
      { key: 'form', label: 'Form' },
      { key: 'control', label: 'Control' },
    ];

    for (const h of fixedHeaders) {
      const th = document.createElement('th');
      th.textContent = h.label;
      trh.appendChild(th);
    }
    for (const a of shownActions) {
      const th = document.createElement('th');
      th.textContent = a;
      trh.appendChild(th);
    }
    dom.thead.appendChild(trh);

    const rows = RESOURCES.filter((r) => {
      if (state.module && !includesCI(r.module, state.module)) return false;
      if (state.form && !includesCI(r.form, state.form)) return false;
      return true;
    });

    for (const r of rows) {
      const tr = document.createElement('tr');
      tr.appendChild(tdText(state.userId));
      tr.appendChild(tdText(r.module));
      tr.appendChild(tdText(r.form));
      tr.appendChild(tdText(r.control));

      for (const a of shownActions) {
        const source = computeSourceShort(state.userId, r.resourceKey, a, state.atUtc);
        const td = document.createElement('td');
        td.appendChild(renderCellButton({
          userId: state.userId,
          atUtc: state.atUtc,
          resource: r,
          action: a,
          source,
        }));
        tr.appendChild(td);
      }

      dom.tbody.appendChild(tr);
    }
  }

  function tdText(s) {
    const td = document.createElement('td');
    td.textContent = String(s ?? '');
    return td;
  }

  function renderCellButton(ctx) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cellBtn';

    const span = document.createElement('span');
    span.className = pillClass(ctx.source);
    span.textContent = ctx.source ?? '—';
    btn.appendChild(span);

    btn.addEventListener('click', () => {
      openDrawer(ctx);
    });

    return btn;
  }

  // -------------------------
  // Drawer
  // -------------------------

  let drawerCtx = null;
  let drawerFlag = null; // 'Y' | 'N' | null
  let drawerLocked = false;

  function openDrawer(ctx) {
    drawerCtx = ctx;

    // If role deny applies, override is not effective (locked UI).
    drawerLocked = hasRoleDeny(ctx.userId, ctx.resource.resourceKey, ctx.action, ctx.atUtc);

    const existingOv = findEffectiveOverride(ctx.userId, ctx.resource.resourceKey, ctx.action, ctx.atUtc);
    drawerFlag = computeFlagFromOverride(existingOv); // could be null

    dom.drawerTitle.textContent = '編輯覆寫權限（AuthUserOverride）';
    dom.drawerSubTitle.textContent = `${ctx.userId} / ${ctx.resource.module} / ${ctx.resource.form} / ${ctx.resource.control} / ${ctx.action}`;

    dom.drawerKv.innerHTML = '';
    dom.drawerKv.appendChild(kvRow('PermissionSourceShort', ctx.source));
    dom.drawerKv.appendChild(kvRow('ResourceKey', ctx.resource.resourceKey));
    dom.drawerKv.appendChild(kvRow('AtUtc', ctx.atUtc.toISOString()));

    if (drawerLocked) {
      dom.drawerKv.appendChild(
        kvRow('Note', '此筆為 Role Deny (R-DN)，依規則不可被個人 Override 覆蓋')
      );
    }

    dom.txtRemark.value = existingOv?.reason ?? '';

    syncChecksFromFlag();
    syncCheckDisables();
    renderFlagState();

    // Lock controls if override is not effective.
    dom.chkAllow.disabled = drawerLocked || dom.chkDeny.checked;
    dom.chkDeny.disabled = drawerLocked || dom.chkAllow.checked;
    dom.txtRemark.disabled = drawerLocked;
    dom.btnDrawerSave.disabled = drawerLocked;

    dom.drawer.setAttribute('aria-hidden', 'false');
  }

  function closeDrawer() {
    dom.drawer.setAttribute('aria-hidden', 'true');
    drawerCtx = null;
    drawerFlag = null;
    drawerLocked = false;
  }

  function kvRow(k, v) {
    const row = document.createElement('div');
    row.className = 'kv__row';
    const kk = document.createElement('div');
    kk.className = 'kv__k';
    kk.textContent = k;
    const vv = document.createElement('div');
    vv.className = 'kv__v';
    vv.textContent = String(v ?? '');
    row.appendChild(kk);
    row.appendChild(vv);
    return row;
  }

  function syncChecksFromFlag() {
    dom.chkAllow.checked = drawerFlag === 'Y';
    dom.chkDeny.checked = drawerFlag === 'N';
  }

  function syncCheckDisables() {
    dom.chkDeny.disabled = drawerLocked || dom.chkAllow.checked;
    dom.chkAllow.disabled = drawerLocked || dom.chkDeny.checked;
  }

  function renderFlagState() {
    if (drawerLocked) {
      dom.flagState.textContent = '目前狀態：Role Deny（R-DN）。此筆不可被個人 Override 覆蓋。';
      return;
    }
    if (drawerFlag === 'Y') {
      dom.flagState.textContent = '目前狀態：Override Allow（Flag = Y / Effect=1）';
    } else if (drawerFlag === 'N') {
      dom.flagState.textContent = '目前狀態：Override Deny（Flag = N / Effect=0）';
    } else {
      dom.flagState.textContent = '目前狀態：Override 未選取（Flag = null；視為沒有 AuthUserOverride 設定，回到預設規則）';
    }
  }

  function onAllowChanged() {
    if (drawerLocked) return;
    if (dom.chkAllow.checked) {
      drawerFlag = 'Y';
      dom.chkDeny.checked = false;
    } else {
      drawerFlag = dom.chkDeny.checked ? 'N' : null;
    }
    syncChecksFromFlag();
    syncCheckDisables();
    renderFlagState();
  }

  function onDenyChanged() {
    if (drawerLocked) return;
    if (dom.chkDeny.checked) {
      drawerFlag = 'N';
      dom.chkAllow.checked = false;
    } else {
      drawerFlag = dom.chkAllow.checked ? 'Y' : null;
    }
    syncChecksFromFlag();
    syncCheckDisables();
    renderFlagState();
  }

  function saveDrawer() {
    if (!drawerCtx) return;
    if (drawerLocked) return;

    const userId = drawerCtx.userId;
    const resourceKey = drawerCtx.resource.resourceKey;
    const action = drawerCtx.action;

    // Upsert/delete override
    const idx = USER_OVERRIDES.findIndex(
      (o) => o.userId === userId && o.resourceKey === resourceKey && o.actionCode.toUpperCase() === action.toUpperCase()
    );

    if (drawerFlag === null) {
      if (idx >= 0) USER_OVERRIDES.splice(idx, 1);
    } else {
      const effect = drawerFlag === 'Y' ? 1 : 0;
      const reason = norm(dom.txtRemark.value);
      const entry = override(userId, resourceKey, action, effect, {
        reason,
        modifiedAtUtc: new Date().toISOString(),
      });
      if (idx >= 0) USER_OVERRIDES[idx] = entry;
      else USER_OVERRIDES.push(entry);
    }

    // Re-render with current query
    renderTable(getQueryState());
    closeDrawer();
  }

  // -------------------------
  // Query state
  // -------------------------

  function getQueryState() {
    const userId = norm(dom.qUserId.value);
    const module = norm(dom.qModule.value);
    const form = norm(dom.qForm.value);
    const action = norm(dom.qAction.value).toUpperCase();
    const atUtc = parseAtUtc(dom.qAtUtc.value);

    return {
      userId,
      module,
      form,
      action: action || '',
      atUtc,
    };
  }

  function resetForm() {
    // Prefill a demo user so the prototype shows non-empty computed sources.
    dom.qUserId.value = 'U001';
    dom.qModule.value = '';
    dom.qForm.value = '';
    dom.qAction.value = '';
    dom.qAtUtc.value = toLocalInputUtc(new Date());
  }

  // -------------------------
  // Wiring
  // -------------------------

  function init() {
    setActionOptions();
    resetForm();

    dom.form.addEventListener('submit', (e) => {
      e.preventDefault();
      renderTable(getQueryState());
    });

    dom.drawerOverlay.addEventListener('click', closeDrawer);
    dom.drawerClose.addEventListener('click', closeDrawer);
    dom.btnDrawerCancel.addEventListener('click', closeDrawer);

    dom.chkAllow.addEventListener('change', onAllowChanged);
    dom.chkDeny.addEventListener('change', onDenyChanged);

    dom.btnDrawerSave.addEventListener('click', saveDrawer);

    // initial render
    renderTable(getQueryState());
  }

  init();
})();
