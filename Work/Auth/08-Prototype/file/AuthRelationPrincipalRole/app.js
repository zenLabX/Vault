/* AuthRelationPrincipalRole prototype (pure JS, in-memory) */

const APP_CODE = 'PMS';
const CURRENT_USER = 'System';

/** @typedef {{
 * principalRoleCode: string;
 * relationCode: string;
 * userId: (string|null);
 * groupCode: (string|null);
 * roleCode: string;
 * appCode: string;
 * validFrom: (string|null);
 * validTo: (string|null);
 * priority: number;
 * isActive: boolean;
 * remark: (string|null);
 * createdBy: string;
 * createdDate: string;
 * modifiedBy: (string|null);
 * modifiedDate: (string|null);
 * rowVersion: number;
 * }} AuthRelationPrincipalRole
 */

/** @type {{userId: string, userName: string}[]} */
const USERS = [
  { userId: 'Emp123', userName: 'Emp123' },
  { userId: 'Emp456', userName: 'Emp456' },
  { userId: 'Admin01', userName: 'Admin01' },
];

/** @type {{groupCode: string, groupName: string}[]} */
const GROUPS = [
  { groupCode: 'RND', groupName: '研發組' },
  { groupCode: 'PROJECT_X', groupName: '專案 X' },
  { groupCode: 'VENDOR', groupName: '外包組' },
];

/** @type {{roleCode: string, roleName: string}[]} */
const ROLES = [
  { roleCode: 'ADMIN', roleName: 'Admin' },
  { roleCode: 'MANAGER', roleName: 'Manager' },
  { roleCode: 'PLANNER', roleName: 'Planner' },
  { roleCode: 'VENDOR', roleName: 'Vendor' },
];

/** @type {AuthRelationPrincipalRole[]} */
let ASSIGNMENTS = seedAssignments();

const el = {
  queryForm: document.getElementById('queryForm'),
  qAppCode: document.getElementById('qAppCode'),
  qPrincipalType: document.getElementById('qPrincipalType'),
  qUserId: document.getElementById('qUserId'),
  qGroupCode: document.getElementById('qGroupCode'),
  qRoleCode: document.getElementById('qRoleCode'),
  qRelationCode: document.getElementById('qRelationCode'),
  qIsActive: document.getElementById('qIsActive'),
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
  fPrincipalRoleCode: document.getElementById('fPrincipalRoleCode'),
  fRelationCode: document.getElementById('fRelationCode'),
  fPrincipalType: document.getElementById('fPrincipalType'),
  fUserId: document.getElementById('fUserId'),
  fGroupCode: document.getElementById('fGroupCode'),
  fRoleCode: document.getElementById('fRoleCode'),
  fAppCode: document.getElementById('fAppCode'),
  fPriority: document.getElementById('fPriority'),
  fIsActive: document.getElementById('fIsActive'),
  fValidFrom: document.getElementById('fValidFrom'),
  fValidTo: document.getElementById('fValidTo'),
  fRemark: document.getElementById('fRemark'),
  fCreatedBy: document.getElementById('fCreatedBy'),
  fCreatedDate: document.getElementById('fCreatedDate'),
  fModifiedBy: document.getElementById('fModifiedBy'),
  fModifiedDate: document.getElementById('fModifiedDate'),
  fRowVersion: document.getElementById('fRowVersion'),

  userField: document.getElementById('userField'),
  groupField: document.getElementById('groupField'),
};

/** @type {{mode: 'detail'|'edit'|'add', principalRoleCode: (string|null), expectedRowVersion: (number|null)}} */
let drawerState = { mode: 'detail', principalRoleCode: null, expectedRowVersion: null };

init();

function init() {
  el.qAppCode.value = APP_CODE;
  el.fAppCode.value = APP_CODE;

  fillSelect(el.fUserId, USERS.map((u) => ({ value: u.userId, label: u.userId })));
  fillSelect(el.fGroupCode, GROUPS.map((g) => ({ value: g.groupCode, label: g.groupCode })));
  fillSelect(el.fRoleCode, ROLES.map((r) => ({ value: r.roleCode, label: r.roleCode })));

  el.queryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideNotice();
    render();
  });

  el.btnAddNew.addEventListener('click', () => openDrawerAdd());
  el.drawerOverlay.addEventListener('click', () => closeDrawer());
  el.drawerClose.addEventListener('click', () => closeDrawer());

  el.fPrincipalType.addEventListener('change', () => syncPrincipalTypeUI());
  el.fUserId.addEventListener('change', () => maybeAutoFillRelationCode());
  el.fGroupCode.addEventListener('change', () => maybeAutoFillRelationCode());
  el.fRoleCode.addEventListener('change', () => maybeAutoFillRelationCode());

  render();
}

// ------------------------ Render ------------------------

function render() {
  const filtered = applyQuery(getQuery(), ASSIGNMENTS);
  el.resultMeta.textContent = `共 ${filtered.length} 筆`;
  el.tbody.innerHTML = '';

  for (const r of filtered) {
    const tr = document.createElement('tr');
    tr.appendChild(td(mono(r.principalRoleCode)));
    tr.appendChild(td(mono(r.relationCode)));
    tr.appendChild(td(r.userId ? 'USER' : 'GROUP'));
    tr.appendChild(td(mono(r.userId ?? '')));
    tr.appendChild(td(mono(r.groupCode ?? '')));
    tr.appendChild(td(mono(r.roleCode)));
    tr.appendChild(td(mono(r.appCode)));
    tr.appendChild(td(mono(String(r.priority))));
    tr.appendChild(td(r.isActive ? '1' : '0'));
    tr.appendChild(td(mono(fmtDt(r.validFrom))));
    tr.appendChild(td(mono(fmtDt(r.validTo))));

    const actionTd = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'actions';
    wrap.appendChild(actionBtn('Detail', () => openDrawerDetail(r.principalRoleCode)));
    wrap.appendChild(actionBtn('Edit', () => openDrawerEdit(r.principalRoleCode)));
    wrap.appendChild(actionBtn('Delete', () => onSoftDelete(r.principalRoleCode), 'danger'));
    actionTd.appendChild(wrap);
    tr.appendChild(actionTd);

    el.tbody.appendChild(tr);
  }
}

function getQuery() {
  return {
    appCode: APP_CODE,
    principalType: (el.qPrincipalType.value || '').trim(),
    userId: (el.qUserId.value || '').trim(),
    groupCode: (el.qGroupCode.value || '').trim(),
    roleCode: (el.qRoleCode.value || '').trim(),
    relationCode: (el.qRelationCode.value || '').trim(),
    isActive: (el.qIsActive.value || '').trim(),
  };
}

function applyQuery(q, rows) {
  const contains = (hay, needle) => (hay || '').toLowerCase().includes((needle || '').toLowerCase());
  return rows.filter((r) => {
    if (q.principalType === 'USER' && !r.userId) return false;
    if (q.principalType === 'GROUP' && !r.groupCode) return false;
    if (q.userId && !contains(r.userId ?? '', q.userId)) return false;
    if (q.groupCode && !contains(r.groupCode ?? '', q.groupCode)) return false;
    if (q.roleCode && !contains(r.roleCode, q.roleCode)) return false;
    if (q.relationCode && !contains(r.relationCode, q.relationCode)) return false;
    if (q.isActive) {
      const want = q.isActive === '1';
      if (r.isActive !== want) return false;
    }
    return true;
  });
}

// ------------------------ Drawer ------------------------

function openDrawerDetail(principalRoleCode) {
  const r = getById(principalRoleCode);
  if (!r) return;
  drawerState = { mode: 'detail', principalRoleCode, expectedRowVersion: r.rowVersion };
  el.drawerTitle.textContent = 'Detail – AuthRelationPrincipalRole';
  el.drawerSubTitle.textContent = formatSubtitle(r);
  fillForm(r, { readOnly: true });
  setFooterMode('detail');
  openDrawer();
}

function openDrawerEdit(principalRoleCode) {
  const r = getById(principalRoleCode);
  if (!r) return;
  drawerState = { mode: 'edit', principalRoleCode, expectedRowVersion: r.rowVersion };
  el.drawerTitle.textContent = 'Edit – AuthRelationPrincipalRole';
  el.drawerSubTitle.textContent = formatSubtitle(r);
  fillForm(r, { readOnly: false });
  setFooterMode('edit');
  openDrawer();
}

function openDrawerAdd() {
  drawerState = { mode: 'add', principalRoleCode: null, expectedRowVersion: null };
  el.drawerTitle.textContent = 'Add New – AuthRelationPrincipalRole';
  el.drawerSubTitle.textContent = '注意：XOR（UserId 與 GroupCode 擇一）；異動需失效權限快取（prototype 僅提示）。';

  const now = nowIso();
  const userId = USERS[0]?.userId ?? 'Emp123';
  const roleCode = ROLES[0]?.roleCode ?? 'ADMIN';

  /** @type {AuthRelationPrincipalRole} */
  const blank = {
    principalRoleCode: genPrincipalRoleCode(),
    relationCode: genRelationCode({ principalType: 'USER', userId, groupCode: null, roleCode }),
    userId,
    groupCode: null,
    roleCode,
    appCode: APP_CODE,
    validFrom: null,
    validTo: null,
    priority: 0,
    isActive: true,
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

  el.fPrincipalRoleCode.value = r.principalRoleCode;
  el.fRelationCode.value = r.relationCode;
  el.fRoleCode.value = r.roleCode;
  el.fAppCode.value = r.appCode;
  el.fPriority.value = String(r.priority ?? 0);
  el.fIsActive.value = r.isActive ? '1' : '0';
  el.fValidFrom.value = r.validFrom ? toDatetimeLocal(r.validFrom) : '';
  el.fValidTo.value = r.validTo ? toDatetimeLocal(r.validTo) : '';
  el.fRemark.value = r.remark ?? '';

  el.fCreatedBy.value = r.createdBy ?? '';
  el.fCreatedDate.value = r.createdDate ?? '';
  el.fModifiedBy.value = r.modifiedBy ?? '';
  el.fModifiedDate.value = r.modifiedDate ?? '';
  el.fRowVersion.value = String(r.rowVersion ?? '');

  const principalType = r.userId ? 'USER' : 'GROUP';
  el.fPrincipalType.value = principalType;

  // set selects
  el.fUserId.value = r.userId ?? (USERS[0]?.userId ?? '');
  el.fGroupCode.value = r.groupCode ?? (GROUPS[0]?.groupCode ?? '');
  syncPrincipalTypeUI();

  // immutables per your decision
  const keysLocked = ro || drawerState.mode !== 'add';
  el.fRelationCode.disabled = keysLocked;
  el.fPrincipalType.disabled = keysLocked;
  el.fUserId.disabled = keysLocked;
  el.fGroupCode.disabled = keysLocked;
  el.fRoleCode.disabled = keysLocked;
  el.fAppCode.disabled = true;

  // editable
  el.fPriority.disabled = ro;
  el.fIsActive.disabled = ro;
  el.fValidFrom.disabled = ro;
  el.fValidTo.disabled = ro;
  el.fRemark.disabled = ro;
}

function syncPrincipalTypeUI() {
  const t = String(el.fPrincipalType.value || 'USER');
  const isUser = t === 'USER';
  el.userField.hidden = !isUser;
  el.groupField.hidden = isUser;
}

function maybeAutoFillRelationCode() {
  if (drawerState.mode !== 'add') return;
  const current = (el.fRelationCode.value || '').trim();
  if (current) return;

  const principalType = String(el.fPrincipalType.value || 'USER');
  const userId = principalType === 'USER' ? (el.fUserId.value || '').trim() : null;
  const groupCode = principalType === 'GROUP' ? (el.fGroupCode.value || '').trim() : null;
  const roleCode = (el.fRoleCode.value || '').trim();

  el.fRelationCode.value = genRelationCode({ principalType, userId, groupCode, roleCode });
}

// ------------------------ Commands ------------------------

function onSave() {
  hideFormError();
  const mode = drawerState.mode;
  if (mode !== 'add' && mode !== 'edit') return;

  const draft = readForm();
  const { ok, errors } = validateDraft(draft, { mode, principalRoleCode: drawerState.principalRoleCode });
  if (!ok) {
    showFormError(errors.join('\n'));
    return;
  }

  if (mode === 'add') {
    const now = nowIso();
    /** @type {AuthRelationPrincipalRole} */
    const row = {
      ...draft,
      principalRoleCode: draft.principalRoleCode || genPrincipalRoleCode(),
      appCode: APP_CODE,
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    };
    ASSIGNMENTS = [row].concat(ASSIGNMENTS);
    showNotice(`已新增指派：${formatSubtitle(row)}（提示：正式系統需失效受影響使用者的權限快取）`, 'warn');
    closeDrawer();
    render();
    return;
  }

  // edit
  if (!drawerState.principalRoleCode) return;
  const current = getById(drawerState.principalRoleCode);
  if (!current) {
    showFormError('找不到資料（可能已被刪除或清單重整）。');
    return;
  }
  if (drawerState.expectedRowVersion !== null && current.rowVersion !== drawerState.expectedRowVersion) {
    showFormError(`RowVersion mismatch：目前=${current.rowVersion}，表單=${drawerState.expectedRowVersion}。請重新開啟再編輯。`);
    return;
  }

  // immutables
  const keyChanged =
    current.relationCode !== draft.relationCode ||
    current.userId !== draft.userId ||
    current.groupCode !== draft.groupCode ||
    current.roleCode !== draft.roleCode ||
    current.appCode !== draft.appCode;
  if (keyChanged) {
    showFormError('RelationCode / Principal(User|Group) / RoleCode / AppCode 在 Edit 模式不可變更；請刪除後再新增。');
    return;
  }

  const now = nowIso();
  const updated = {
    ...current,
    validFrom: draft.validFrom,
    validTo: draft.validTo,
    priority: draft.priority,
    isActive: draft.isActive,
    remark: draft.remark,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };
  ASSIGNMENTS = ASSIGNMENTS.map((x) => (x.principalRoleCode === current.principalRoleCode ? updated : x));
  showNotice(`已更新指派：${formatSubtitle(updated)}（提示：正式系統需失效受影響使用者的權限快取）`, 'warn');
  closeDrawer();
  render();
}

function onSoftDelete(principalRoleCode) {
  hideNotice();
  const current = getById(principalRoleCode);
  if (!current) return;
  if (!current.isActive) {
    showNotice('此筆已是 Inactive。', 'warn');
    return;
  }
  const ok = confirm(`確定要刪除（soft）此指派？\nPrincipalRoleCode=${current.principalRoleCode}\nRelationCode=${current.relationCode}\nRoleCode=${current.roleCode}\n\n（實際動作：IsActive=0）`);
  if (!ok) return;

  const now = nowIso();
  const updated = {
    ...current,
    isActive: false,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };
  ASSIGNMENTS = ASSIGNMENTS.map((x) => (x.principalRoleCode === current.principalRoleCode ? updated : x));
  showNotice(`已 soft delete：${updated.relationCode}（提示：正式系統需失效受影響使用者的權限快取；Unique 不因 Inactive 放行，若要恢復請改回 IsActive=1）`, 'warn');
  render();
}

// ------------------------ Validation ------------------------

function validateDraft(d, { mode, principalRoleCode }) {
  /** @type {string[]} */
  const errors = [];

  if (!d.principalRoleCode) errors.push('PrincipalRoleCode 缺失（prototype 會自動產生）');
  if (!d.relationCode) errors.push('RelationCode 必填');
  if (!d.roleCode) errors.push('RoleCode 必填');
  if (!d.appCode) errors.push('AppCode 必填');

  // XOR (exactly one)
  const hasUser = Boolean(d.userId);
  const hasGroup = Boolean(d.groupCode);
  if ((hasUser && hasGroup) || (!hasUser && !hasGroup)) {
    errors.push('XOR 約束：UserId 與 GroupCode 必須且只能填一個');
  }

  if (!Number.isFinite(d.priority)) errors.push('Priority 必須是整數');

  if (d.validFrom && d.validTo && d.validFrom > d.validTo) errors.push('ValidFrom 不可晚於 ValidTo');

  // RelationCode unique
  const relDup = ASSIGNMENTS.find((x) => {
    if (mode === 'edit' && x.principalRoleCode === principalRoleCode) return false;
    return x.relationCode === d.relationCode;
  });
  if (relDup) errors.push('RelationCode 必須唯一（已存在相同 RelationCode）');

  // Filtered unique indexes (do NOT release by IsActive)
  const uniqueErr = checkFilteredUnique(d, { ignoreId: mode === 'edit' ? principalRoleCode : null });
  if (uniqueErr) errors.push(uniqueErr);

  return { ok: errors.length === 0, errors };
}

function checkFilteredUnique(d, { ignoreId }) {
  // Mimic filtered unique indexes:
  // - When UserId IS NOT NULL: unique(UserId, RoleCode, AppCode)
  // - When GroupCode IS NOT NULL: unique(GroupCode, RoleCode, AppCode)
  const isUser = Boolean(d.userId);
  const isGroup = Boolean(d.groupCode);
  if (!isUser && !isGroup) return null;

  const dup = ASSIGNMENTS.find((x) => {
    if (ignoreId && x.principalRoleCode === ignoreId) return false;
    if (isUser) {
      return x.userId === d.userId && x.roleCode === d.roleCode && x.appCode === d.appCode;
    }
    return x.groupCode === d.groupCode && x.roleCode === d.roleCode && x.appCode === d.appCode;
  });

  if (!dup) return null;
  if (isUser) return '唯一性（Filtered Unique Index）：同一 UserId + RoleCode + AppCode 只能有一筆（不因 IsActive=0 放行）';
  return '唯一性（Filtered Unique Index）：同一 GroupCode + RoleCode + AppCode 只能有一筆（不因 IsActive=0 放行）';
}

function readForm() {
  const t = String(el.fPrincipalType.value || 'USER');
  const userId = t === 'USER' ? (el.fUserId.value || '').trim() : null;
  const groupCode = t === 'GROUP' ? (el.fGroupCode.value || '').trim() : null;
  const from = (el.fValidFrom.value || '').trim();
  const to = (el.fValidTo.value || '').trim();
  const remark = (el.fRemark.value || '').trim();
  const pr = parseInt((el.fPriority.value || '').trim(), 10);

  return {
    principalRoleCode: (el.fPrincipalRoleCode.value || '').trim(),
    relationCode: (el.fRelationCode.value || '').trim(),
    userId: userId || null,
    groupCode: groupCode || null,
    roleCode: (el.fRoleCode.value || '').trim(),
    appCode: APP_CODE,
    validFrom: from ? from.replace('T', ' ') : null,
    validTo: to ? to.replace('T', ' ') : null,
    priority: Number.isFinite(pr) ? pr : NaN,
    isActive: String(el.fIsActive.value) === '1',
    remark: remark ? remark : null,
  };
}

// ------------------------ Utils ------------------------

function getById(principalRoleCode) {
  return ASSIGNMENTS.find((x) => x.principalRoleCode === principalRoleCode) || null;
}

function formatSubtitle(r) {
  const principal = r.userId ? `USER:${r.userId}` : `GROUP:${r.groupCode}`;
  return `${principal} → ${r.roleCode} (P=${r.priority}, Active=${r.isActive ? 1 : 0})`;
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

function genPrincipalRoleCode() {
  const r = Math.random().toString(16).slice(2, 10).toUpperCase();
  const t = Date.now().toString(16).slice(-6).toUpperCase();
  return `PRR-${t}-${r}`;
}

function genRelationCode({ principalType, userId, groupCode, roleCode }) {
  const p = principalType === 'GROUP' ? (groupCode || 'GROUP') : (userId || 'USER');
  const safeP = String(p).replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 18);
  const safeR = String(roleCode || 'ROLE').replace(/[^A-Za-z0-9_\-]/g, '').slice(0, 18);
  return `RPR-${safeP}-${safeR}`;
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

function seedAssignments() {
  const now = nowIso();
  /** @type {AuthRelationPrincipalRole[]} */
  return [
    {
      principalRoleCode: 'PRR-SEED-1',
      relationCode: 'RPR-Emp123-MANAGER',
      userId: 'Emp123',
      groupCode: null,
      roleCode: 'MANAGER',
      appCode: APP_CODE,
      validFrom: null,
      validTo: null,
      priority: 10,
      isActive: true,
      remark: '直接指派',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
    {
      principalRoleCode: 'PRR-SEED-2',
      relationCode: 'RPR-RND-PLANNER',
      userId: null,
      groupCode: 'RND',
      roleCode: 'PLANNER',
      appCode: APP_CODE,
      validFrom: '2026-01-01 00:00:00',
      validTo: null,
      priority: 1,
      isActive: true,
      remark: '群組繼承',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
    {
      principalRoleCode: 'PRR-SEED-3',
      relationCode: 'RPR-VENDOR-VENDOR',
      userId: null,
      groupCode: 'VENDOR',
      roleCode: 'VENDOR',
      appCode: APP_CODE,
      validFrom: '2026-02-01 00:00:00',
      validTo: '2026-12-31 23:59:59',
      priority: 0,
      isActive: true,
      remark: '外包限定期間',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
  ];
}
