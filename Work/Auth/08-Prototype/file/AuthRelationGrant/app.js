/* AuthRelationGrant prototype (pure JS, in-memory) */

const CURRENT_USER = 'System';

/** @typedef {{
 * grantCode: string;
 * roleCode: string;
 * resourceKey: string;
 * actionCode: string;
 * effect: boolean; // true=ALLOW, false=DENY
 * isActive: boolean;
 * conditionJson: (string|null);
 * validFrom: (string|null);
 * validTo: (string|null);
 * remark: (string|null);
 * createdBy: string;
 * createdDate: string;
 * modifiedBy: (string|null);
 * modifiedDate: (string|null);
 * rowVersion: number;
 * }} AuthRelationGrant
 */

/** @type {{roleCode: string, roleName: string}[]} */
const ROLES = [
  { roleCode: 'ADMIN', roleName: 'Admin' },
  { roleCode: 'PLANNER', roleName: 'Planner' },
  { roleCode: 'VENDOR', roleName: 'Vendor' },
];

/** @type {{resourceKey: string, resourceName: string}[]} */
const RESOURCES = [
  { resourceKey: 'PMS.PROJECT', resourceName: 'Project' },
  { resourceKey: 'PMS.REPORT', resourceName: 'Report' },
  { resourceKey: 'PMS.ADMIN', resourceName: 'Admin' },
];

/** @type {{actionCode: string, actionName: string}[]} */
const ACTIONS = [
  { actionCode: 'VIEW', actionName: 'View' },
  { actionCode: 'EDIT', actionName: 'Edit' },
  { actionCode: 'DELETE', actionName: 'Delete' },
  { actionCode: 'EXPORT', actionName: 'Export' },
];

/** @type {AuthRelationGrant[]} */
let GRANTS = seedGrants();

const el = {
  queryForm: document.getElementById('queryForm'),
  qRoleCode: document.getElementById('qRoleCode'),
  qResourceKey: document.getElementById('qResourceKey'),
  qActionCode: document.getElementById('qActionCode'),
  qEffect: document.getElementById('qEffect'),
  qIsActive: document.getElementById('qIsActive'),
  qText: document.getElementById('qText'),
  btnAddNew: document.getElementById('btnAddNew'),
  notice: document.getElementById('notice'),
  resultMeta: document.getElementById('resultMeta'),
  tbody: document.getElementById('resultTbody'),

  drawer: document.getElementById('drawer'),
  drawerOverlay: document.getElementById('drawerOverlay'),
  drawerClose: document.getElementById('drawerClose'),
  drawerTitle: document.getElementById('drawerTitle'),
  drawerSubTitle: document.getElementById('drawerSubTitle'),
  drawerFooter: document.getElementById('drawerFooter'),

  formError: document.getElementById('formError'),
  fGrantCode: document.getElementById('fGrantCode'),
  fRoleCode: document.getElementById('fRoleCode'),
  fResourceKey: document.getElementById('fResourceKey'),
  fActionCode: document.getElementById('fActionCode'),
  fEffect: document.getElementById('fEffect'),
  fIsActive: document.getElementById('fIsActive'),
  fConditionJson: document.getElementById('fConditionJson'),
  fValidFrom: document.getElementById('fValidFrom'),
  fValidTo: document.getElementById('fValidTo'),
  fRemark: document.getElementById('fRemark'),
  fCreatedBy: document.getElementById('fCreatedBy'),
  fCreatedDate: document.getElementById('fCreatedDate'),
  fModifiedBy: document.getElementById('fModifiedBy'),
  fModifiedDate: document.getElementById('fModifiedDate'),
  fRowVersion: document.getElementById('fRowVersion'),
};

/** @type {{mode: 'detail'|'edit'|'add', grantCode: (string|null), expectedRowVersion: (number|null)}} */
let drawerState = { mode: 'detail', grantCode: null, expectedRowVersion: null };

init();

function init() {
  fillSelect(el.fRoleCode, ROLES.map((r) => ({ value: r.roleCode, label: r.roleCode })));
  fillSelect(el.fResourceKey, RESOURCES.map((r) => ({ value: r.resourceKey, label: r.resourceKey })));
  fillSelect(el.fActionCode, ACTIONS.map((a) => ({ value: a.actionCode, label: a.actionCode })));

  el.queryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideNotice();
    render();
  });

  el.btnAddNew.addEventListener('click', () => openDrawerAdd());
  el.drawerOverlay.addEventListener('click', () => closeDrawer());
  el.drawerClose.addEventListener('click', () => closeDrawer());

  render();
}

// ------------------------ Render ------------------------

function render() {
  const filtered = applyQuery(getQuery(), GRANTS);
  el.resultMeta.textContent = `共 ${filtered.length} 筆`;
  el.tbody.innerHTML = '';

  for (const r of filtered) {
    const tr = document.createElement('tr');
    tr.appendChild(td(mono(r.grantCode)));
    tr.appendChild(td(mono(r.roleCode)));
    tr.appendChild(td(mono(r.resourceKey)));
    tr.appendChild(td(mono(r.actionCode)));
    tr.appendChild(td(effectPill(r.effect)));
    tr.appendChild(td(r.isActive ? '1' : '0'));
    tr.appendChild(td(mono(fmtDt(r.validFrom))));
    tr.appendChild(td(mono(fmtDt(r.validTo))));
    tr.appendChild(td(r.conditionJson ? 'Y' : ''));
    tr.appendChild(td(r.remark ?? ''));

    const actionTd = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'actions';
    wrap.appendChild(actionBtn('Detail', () => openDrawerDetail(r.grantCode)));
    wrap.appendChild(actionBtn('Edit', () => openDrawerEdit(r.grantCode)));
    wrap.appendChild(actionBtn('Delete', () => onSoftDelete(r.grantCode), 'danger'));
    actionTd.appendChild(wrap);
    tr.appendChild(actionTd);
    el.tbody.appendChild(tr);
  }
}

function getQuery() {
  return {
    roleCode: (el.qRoleCode.value || '').trim(),
    resourceKey: (el.qResourceKey.value || '').trim(),
    actionCode: (el.qActionCode.value || '').trim(),
    effect: (el.qEffect.value || '').trim(),
    isActive: (el.qIsActive.value || '').trim(),
    text: (el.qText.value || '').trim(),
  };
}

function applyQuery(q, rows) {
  const contains = (hay, needle) => (hay || '').toLowerCase().includes((needle || '').toLowerCase());
  return rows.filter((r) => {
    if (q.roleCode && !contains(r.roleCode, q.roleCode)) return false;
    if (q.resourceKey && !contains(r.resourceKey, q.resourceKey)) return false;
    if (q.actionCode && !contains(r.actionCode, q.actionCode)) return false;
    if (q.effect) {
      const want = q.effect === '1';
      if (r.effect !== want) return false;
    }
    if (q.isActive) {
      const want = q.isActive === '1';
      if (r.isActive !== want) return false;
    }
    if (q.text) {
      const blob = `${r.conditionJson ?? ''} ${r.remark ?? ''}`;
      if (!contains(blob, q.text)) return false;
    }
    return true;
  });
}

// ------------------------ Drawer ------------------------

function openDrawerDetail(grantCode) {
  const r = getByCode(grantCode);
  if (!r) return;
  drawerState = { mode: 'detail', grantCode, expectedRowVersion: r.rowVersion };
  el.drawerTitle.textContent = 'Detail – AuthRelationGrant';
  el.drawerSubTitle.textContent = `${r.roleCode} / ${r.resourceKey} / ${r.actionCode}`;
  fillForm(r, { readOnly: true });
  setFooterMode('detail');
  openDrawer();
}

function openDrawerEdit(grantCode) {
  const r = getByCode(grantCode);
  if (!r) return;
  drawerState = { mode: 'edit', grantCode, expectedRowVersion: r.rowVersion };
  el.drawerTitle.textContent = 'Edit – AuthRelationGrant';
  el.drawerSubTitle.textContent = `${r.roleCode} / ${r.resourceKey} / ${r.actionCode}`;
  fillForm(r, { readOnly: false });
  setFooterMode('edit');
  openDrawer();
}

function openDrawerAdd() {
  drawerState = { mode: 'add', grantCode: null, expectedRowVersion: null };
  el.drawerTitle.textContent = 'Add New – AuthRelationGrant';
  el.drawerSubTitle.textContent = '注意：DENY 會覆蓋其他角色的 ALLOW（Deny Override）。';

  const now = nowIso();
  /** @type {AuthRelationGrant} */
  const blank = {
    grantCode: genGrantCode(),
    roleCode: ROLES[0]?.roleCode ?? 'ADMIN',
    resourceKey: RESOURCES[0]?.resourceKey ?? 'PMS.PROJECT',
    actionCode: ACTIONS[0]?.actionCode ?? 'VIEW',
    effect: true,
    isActive: true,
    conditionJson: null,
    validFrom: null,
    validTo: null,
    remark: null,
    createdBy: CURRENT_USER,
    createdDate: now,
    modifiedBy: null,
    modifiedDate: null,
    rowVersion: 1,
  };
  fillForm(blank, { readOnly: false });
  setFooterMode('edit');
  openDrawer();
}

function openDrawer() {
  hideFormError();
  el.drawer.setAttribute('aria-hidden', 'false');
}

function closeDrawer() {
  el.drawer.setAttribute('aria-hidden', 'true');
}

function setFooterMode(mode) {
  el.drawerFooter.innerHTML = '';

  if (mode === 'detail') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--ghost';
    btn.textContent = '關閉';
    btn.addEventListener('click', () => closeDrawer());
    el.drawerFooter.appendChild(btn);
    return;
  }

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn--ghost';
  cancel.textContent = '取消';
  cancel.addEventListener('click', () => closeDrawer());

  const save = document.createElement('button');
  save.type = 'button';
  save.className = 'btn';
  save.textContent = '儲存';
  save.addEventListener('click', () => onSave());

  el.drawerFooter.appendChild(cancel);
  el.drawerFooter.appendChild(save);
}

function fillForm(r, { readOnly }) {
  const ro = Boolean(readOnly);

  el.fGrantCode.value = r.grantCode;
  el.fRoleCode.value = r.roleCode;
  el.fResourceKey.value = r.resourceKey;
  el.fActionCode.value = r.actionCode;
  el.fEffect.value = r.effect ? '1' : '0';
  el.fIsActive.value = r.isActive ? '1' : '0';
  el.fConditionJson.value = r.conditionJson ?? '';
  el.fValidFrom.value = r.validFrom ? toDatetimeLocal(r.validFrom) : '';
  el.fValidTo.value = r.validTo ? toDatetimeLocal(r.validTo) : '';
  el.fRemark.value = r.remark ?? '';

  el.fCreatedBy.value = r.createdBy ?? '';
  el.fCreatedDate.value = r.createdDate ?? '';
  el.fModifiedBy.value = r.modifiedBy ?? '';
  el.fModifiedDate.value = r.modifiedDate ?? '';
  el.fRowVersion.value = String(r.rowVersion ?? '');

  // immutables
  const tupleLocked = ro || drawerState.mode !== 'add';
  el.fRoleCode.disabled = tupleLocked;
  el.fResourceKey.disabled = tupleLocked;
  el.fActionCode.disabled = tupleLocked;
  el.fEffect.disabled = ro;
  el.fIsActive.disabled = ro;
  el.fConditionJson.disabled = ro;
  el.fValidFrom.disabled = ro;
  el.fValidTo.disabled = ro;
  el.fRemark.disabled = ro;
}

// ------------------------ Commands ------------------------

function onSave() {
  hideFormError();
  const mode = drawerState.mode;
  if (mode !== 'add' && mode !== 'edit') return;

  const draft = readForm();
  const { ok, errors } = validateDraft(draft, { mode, grantCode: drawerState.grantCode });
  if (!ok) {
    showFormError(errors.join('\n'));
    return;
  }

  if (mode === 'add') {
    const now = nowIso();
    /** @type {AuthRelationGrant} */
    const row = {
      ...draft,
      grantCode: draft.grantCode || genGrantCode(),
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    };
    GRANTS = [row].concat(GRANTS);
    showNotice(`已新增：${row.roleCode} / ${row.resourceKey} / ${row.actionCode}（提示：正式系統需 Purge 該 Role 權限快取）`, 'warn');
    closeDrawer();
    render();
    return;
  }

  // edit
  if (!drawerState.grantCode) return;
  const current = getByCode(drawerState.grantCode);
  if (!current) {
    showFormError('找不到資料（可能已被刪除或清單重整）。');
    return;
  }
  if (drawerState.expectedRowVersion !== null && current.rowVersion !== drawerState.expectedRowVersion) {
    showFormError(`RowVersion mismatch：目前=${current.rowVersion}，表單=${drawerState.expectedRowVersion}。請重新開啟再編輯。`);
    return;
  }

  // tuple immutable
  if (current.roleCode !== draft.roleCode || current.resourceKey !== draft.resourceKey || current.actionCode !== draft.actionCode) {
    showFormError('RoleCode/ResourceKey/ActionCode 在 Edit 模式不可變更；請刪除後再新增。');
    return;
  }

  const now = nowIso();
  const updated = {
    ...current,
    effect: draft.effect,
    isActive: draft.isActive,
    conditionJson: draft.conditionJson,
    validFrom: draft.validFrom,
    validTo: draft.validTo,
    remark: draft.remark,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };

  // Enforce filtered unique rule on edit as well
  const uniqueErr = checkUniqueRule(updated, { ignoreGrantCode: current.grantCode });
  if (uniqueErr) {
    showFormError(uniqueErr);
    return;
  }

  GRANTS = GRANTS.map((x) => (x.grantCode === current.grantCode ? updated : x));
  showNotice(`已更新：${updated.roleCode} / ${updated.resourceKey} / ${updated.actionCode}（提示：正式系統需 Purge 該 Role 權限快取）`, 'warn');
  closeDrawer();
  render();
}

function onSoftDelete(grantCode) {
  hideNotice();
  const current = getByCode(grantCode);
  if (!current) return;
  if (!current.isActive) {
    showNotice('此筆已是 Inactive。', 'warn');
    return;
  }
  const ok = confirm(`確定要刪除（soft）此授權規則？\nGrantCode=${current.grantCode}\nRoleCode=${current.roleCode}\nResourceKey=${current.resourceKey}\nActionCode=${current.actionCode}\n\n（實際動作：IsActive=0）`);
  if (!ok) return;

  const now = nowIso();
  const updated = {
    ...current,
    isActive: false,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };
  GRANTS = GRANTS.map((x) => (x.grantCode === current.grantCode ? updated : x));
  showNotice(
    `已 soft delete：${updated.grantCode}（提示：正式系統需 Purge 該 Role 權限快取；另外 UniqueRule 不會因 soft delete 放行，若要恢復請改回 IsActive=1）`,
    'warn'
  );
  render();
}

// ------------------------ Validation ------------------------

function validateDraft(d, { mode, grantCode }) {
  /** @type {string[]} */
  const errors = [];
  if (!d.grantCode) errors.push('GrantCode 缺失（prototype 會自動產生）');
  if (!d.roleCode) errors.push('RoleCode 必填');
  if (!d.resourceKey) errors.push('ResourceKey 必填');
  if (!d.actionCode) errors.push('ActionCode 必填');

  if (d.validFrom && d.validTo && d.validFrom > d.validTo) errors.push('ValidFrom 不可晚於 ValidTo');

  const cj = d.conditionJson;
  if (cj && cj.trim()) {
    try {
      JSON.parse(cj);
    } catch {
      errors.push('ConditionJson 必須是合法 JSON（或留空）');
    }
  }

  // Filtered unique rule simulation
  const uniqueErr = checkUniqueRule(d, { ignoreGrantCode: mode === 'edit' ? grantCode : null });
  if (uniqueErr) errors.push(uniqueErr);

  return { ok: errors.length === 0, errors };
}

function checkUniqueRule(d, { ignoreGrantCode }) {
  // Mimic UX_AuthGrant_UniqueRule:
  // (RoleCode, ResourceKey, ActionCode) must be unique when ConditionJson IS NULL AND ValidFrom IS NULL AND ValidTo IS NULL
  const isUnconditional = isNullOrEmpty(d.conditionJson) && !d.validFrom && !d.validTo;
  if (!isUnconditional) return null;

  const dup = GRANTS.find((x) => {
    if (ignoreGrantCode && x.grantCode === ignoreGrantCode) return false;
    const sameTuple = x.roleCode === d.roleCode && x.resourceKey === d.resourceKey && x.actionCode === d.actionCode;
    const xUnconditional = isNullOrEmpty(x.conditionJson) && !x.validFrom && !x.validTo;
    return sameTuple && xUnconditional;
  });
  if (dup) {
    return '唯一性規則（UX_AuthGrant_UniqueRule）：同一 Role/Resource/Action 在「ConditionJson=NULL 且 ValidFrom/ValidTo=NULL」只能有一筆。若需要多筆，請加上 ConditionJson 或 ValidFrom/ValidTo 讓規則可區分。';
  }
  return null;
}

function isNullOrEmpty(s) {
  return s == null || String(s).trim() === '';
}

function readForm() {
  const from = (el.fValidFrom.value || '').trim();
  const to = (el.fValidTo.value || '').trim();
  const cj = (el.fConditionJson.value || '').trim();
  const remark = (el.fRemark.value || '').trim();
  return {
    grantCode: (el.fGrantCode.value || '').trim(),
    roleCode: (el.fRoleCode.value || '').trim(),
    resourceKey: (el.fResourceKey.value || '').trim(),
    actionCode: (el.fActionCode.value || '').trim(),
    effect: String(el.fEffect.value) === '1',
    isActive: String(el.fIsActive.value) === '1',
    conditionJson: cj ? cj : null,
    validFrom: from ? from.replace('T', ' ') : null,
    validTo: to ? to.replace('T', ' ') : null,
    remark: remark ? remark : null,
  };
}

// ------------------------ Utils ------------------------

function getByCode(grantCode) {
  return GRANTS.find((x) => x.grantCode === grantCode) || null;
}

function nowIso() {
  return new Date().toISOString().slice(0, 19);
}

function toDatetimeLocal(isoLike) {
  const s = String(isoLike || '').replace('T', ' ');
  const m = s.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::\d{2})?/);
  if (!m) return '';
  return `${m[1]}T${m[2]}`;
}

function fmtDt(isoLike) {
  if (!isoLike) return '';
  return String(isoLike).replace('T', ' ');
}

function genGrantCode() {
  // Simple deterministic-ish code; real system should use GUID
  const r = Math.random().toString(16).slice(2, 10).toUpperCase();
  const t = Date.now().toString(16).slice(-6).toUpperCase();
  return `GNT-${t}-${r}`;
}

function td(textOrNode) {
  const cell = document.createElement('td');
  if (textOrNode instanceof Node) cell.appendChild(textOrNode);
  else cell.textContent = String(textOrNode ?? '');
  return cell;
}

function mono(text) {
  const span = document.createElement('span');
  span.className = 'mono';
  span.textContent = String(text ?? '');
  return span;
}

function effectPill(effect) {
  const span = document.createElement('span');
  span.className = `pill ${effect ? 'pill--allow' : 'pill--deny'}`;
  span.textContent = effect ? 'ALLOW' : 'DENY';
  return span;
}

function actionBtn(label, onClick, tone) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `btn btn--sm${tone === 'danger' ? ' btn--danger' : ''}`;
  btn.textContent = label;
  btn.addEventListener('click', onClick);
  return btn;
}

function fillSelect(select, items) {
  select.innerHTML = '';
  for (const it of items) {
    const opt = document.createElement('option');
    opt.value = it.value;
    opt.textContent = it.label;
    select.appendChild(opt);
  }
}

function showNotice(message, tone) {
  el.notice.hidden = false;
  el.notice.textContent = message;
  el.notice.className = 'notice';
  if (tone === 'warn') el.notice.classList.add('notice--warn');
  if (tone === 'error') el.notice.classList.add('notice--error');
}

function hideNotice() {
  el.notice.hidden = true;
  el.notice.textContent = '';
  el.notice.className = 'notice';
}

function showFormError(message) {
  el.formError.hidden = false;
  el.formError.textContent = message;
}

function hideFormError() {
  el.formError.hidden = true;
  el.formError.textContent = '';
}

// ------------------------ Seed ------------------------

function seedGrants() {
  const now = nowIso();
  /** @type {AuthRelationGrant[]} */
  return [
    {
      grantCode: 'GNT-SEED-ALLOW-1',
      roleCode: 'PLANNER',
      resourceKey: 'PMS.PROJECT',
      actionCode: 'VIEW',
      effect: true,
      isActive: true,
      conditionJson: null,
      validFrom: null,
      validTo: null,
      remark: '標準授權（無條件/無期限）',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
    {
      grantCode: 'GNT-SEED-DENY-1',
      roleCode: 'VENDOR',
      resourceKey: 'PMS.ADMIN',
      actionCode: 'VIEW',
      effect: false,
      isActive: true,
      conditionJson: null,
      validFrom: null,
      validTo: null,
      remark: '外包禁止查看後台（Deny Override）',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
    {
      grantCode: 'GNT-SEED-ABAC-1',
      roleCode: 'PLANNER',
      resourceKey: 'PMS.REPORT',
      actionCode: 'EXPORT',
      effect: true,
      isActive: true,
      conditionJson: '{"Factory":["T1"],"AmountLimit":5000}',
      validFrom: '2026-02-01 00:00:00',
      validTo: '2026-12-31 23:59:59',
      remark: '僅限特定廠區/金額條件',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
  ];
}
