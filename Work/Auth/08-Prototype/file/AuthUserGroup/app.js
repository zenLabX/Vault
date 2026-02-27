/* AuthUserGroup prototype (pure JS, in-memory) */

const APP_CODE = 'PMS';
const CURRENT_USER = 'System';

/** @typedef {{
 * userId: string;
 * groupCode: string;
 * appCode: string;
 * validFrom: (string|null);
 * validTo: (string|null);
 * isActive: boolean;
 * remark: (string|null);
 * createdBy: string;
 * createdDate: string;
 * modifiedBy: (string|null);
 * modifiedDate: (string|null);
 * rowVersion: number;
 * }} AuthUserGroup
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

/** @type {AuthUserGroup[]} */
let USER_GROUPS = seedUserGroups();

// ------------------------ DOM ------------------------

const el = {
  queryForm: document.getElementById('queryForm'),
  qAppCode: document.getElementById('qAppCode'),
  qUserId: document.getElementById('qUserId'),
  qGroupCode: document.getElementById('qGroupCode'),
  qIsActive: document.getElementById('qIsActive'),
  qRemark: document.getElementById('qRemark'),
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

  editForm: document.getElementById('editForm'),
  formError: document.getElementById('formError'),

  fUserId: document.getElementById('fUserId'),
  fGroupCode: document.getElementById('fGroupCode'),
  fAppCode: document.getElementById('fAppCode'),
  fValidFrom: document.getElementById('fValidFrom'),
  fValidTo: document.getElementById('fValidTo'),
  fIsActive: document.getElementById('fIsActive'),
  fRemark: document.getElementById('fRemark'),
  fCreatedBy: document.getElementById('fCreatedBy'),
  fCreatedDate: document.getElementById('fCreatedDate'),
  fModifiedBy: document.getElementById('fModifiedBy'),
  fModifiedDate: document.getElementById('fModifiedDate'),
  fRowVersion: document.getElementById('fRowVersion'),
};

/** @type {{mode: 'detail'|'edit'|'add', key: {userId: string, groupCode: string} | null, expectedRowVersion: (number|null)}} */
let drawerState = { mode: 'detail', key: null, expectedRowVersion: null };

init();

function init() {
  el.qAppCode.value = APP_CODE;
  fillSelect(el.fUserId, USERS.map((u) => ({ value: u.userId, label: `${u.userId}` })));
  fillSelect(el.fGroupCode, GROUPS.map((g) => ({ value: g.groupCode, label: `${g.groupCode}` })));

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
  const filtered = applyQuery(getQuery(), USER_GROUPS);
  el.resultMeta.textContent = `共 ${filtered.length} 筆`;

  el.tbody.innerHTML = '';
  for (const r of filtered) {
    const tr = document.createElement('tr');
    tr.appendChild(td(mono(r.userId)));
    tr.appendChild(td(mono(r.groupCode)));
    tr.appendChild(td(mono(r.appCode)));
    tr.appendChild(td(mono(fmtDt(r.validFrom))));
    tr.appendChild(td(mono(fmtDt(r.validTo))));
    tr.appendChild(td(r.isActive ? '1' : '0'));
    tr.appendChild(td(r.remark ?? ''));
    tr.appendChild(td(mono((r.modifiedDate ?? r.createdDate).replace('T', ' '))));

    const actionTd = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'actions';

    wrap.appendChild(actionBtn('Detail', () => openDrawerDetail(r.userId, r.groupCode)));
    wrap.appendChild(actionBtn('Edit', () => openDrawerEdit(r.userId, r.groupCode)));
    wrap.appendChild(actionBtn('Delete', () => onSoftDelete(r.userId, r.groupCode), 'danger'));

    actionTd.appendChild(wrap);
    tr.appendChild(actionTd);
    el.tbody.appendChild(tr);
  }
}

function getQuery() {
  return {
    appCode: (el.qAppCode.value || '').trim(),
    userId: (el.qUserId.value || '').trim(),
    groupCode: (el.qGroupCode.value || '').trim(),
    isActive: (el.qIsActive.value || '').trim(),
    remark: (el.qRemark.value || '').trim(),
  };
}

function applyQuery(q, rows) {
  const contains = (hay, needle) => (hay || '').toLowerCase().includes((needle || '').toLowerCase());
  return rows.filter((r) => {
    if (q.appCode && r.appCode !== q.appCode) return false;
    if (q.userId && !contains(r.userId, q.userId)) return false;
    if (q.groupCode && !contains(r.groupCode, q.groupCode)) return false;
    if (q.isActive) {
      const want = q.isActive === '1';
      if (r.isActive !== want) return false;
    }
    if (q.remark && !contains(r.remark ?? '', q.remark)) return false;
    return true;
  });
}

// ------------------------ Drawer ------------------------

function openDrawerDetail(userId, groupCode) {
  const r = getByKey(userId, groupCode);
  if (!r) return;

  drawerState = { mode: 'detail', key: { userId, groupCode }, expectedRowVersion: r.rowVersion };
  el.drawerTitle.textContent = 'Detail – AuthUserGroup';
  el.drawerSubTitle.textContent = `${r.userId} / ${r.groupCode}`;
  fillForm(r, { readOnly: true });
  setFooterMode('detail');
  openDrawer();
}

function openDrawerEdit(userId, groupCode) {
  const r = getByKey(userId, groupCode);
  if (!r) return;

  drawerState = { mode: 'edit', key: { userId, groupCode }, expectedRowVersion: r.rowVersion };
  el.drawerTitle.textContent = 'Edit – AuthUserGroup';
  el.drawerSubTitle.textContent = `${r.userId} / ${r.groupCode}`;
  fillForm(r, { readOnly: false });
  setFooterMode('edit');
  openDrawer();
}

function openDrawerAdd() {
  drawerState = { mode: 'add', key: null, expectedRowVersion: null };
  el.drawerTitle.textContent = 'Add New – AuthUserGroup';
  el.drawerSubTitle.textContent = 'Composite PK: (UserId, GroupCode)';

  const now = nowIso();
  /** @type {AuthUserGroup} */
  const blank = {
    userId: USERS[0]?.userId ?? 'Emp123',
    groupCode: GROUPS[0]?.groupCode ?? 'RND',
    appCode: APP_CODE,
    validFrom: null,
    validTo: null,
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
  if (mode === 'detail') {
    el.drawerFooter.innerHTML = '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn--ghost';
    btn.textContent = '關閉';
    btn.addEventListener('click', () => closeDrawer());
    el.drawerFooter.appendChild(btn);
    return;
  }

  el.drawerFooter.innerHTML = '';

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

  el.fAppCode.value = r.appCode;
  el.fUserId.value = r.userId;
  el.fGroupCode.value = r.groupCode;

  el.fValidFrom.value = r.validFrom ? toDatetimeLocal(r.validFrom) : '';
  el.fValidTo.value = r.validTo ? toDatetimeLocal(r.validTo) : '';
  el.fIsActive.value = r.isActive ? '1' : '0';
  el.fRemark.value = r.remark ?? '';

  el.fCreatedBy.value = r.createdBy ?? '';
  el.fCreatedDate.value = r.createdDate ?? '';
  el.fModifiedBy.value = r.modifiedBy ?? '';
  el.fModifiedDate.value = r.modifiedDate ?? '';
  el.fRowVersion.value = String(r.rowVersion ?? '');

  // PK immutable
  el.fUserId.disabled = ro || drawerState.mode !== 'add';
  el.fGroupCode.disabled = ro || drawerState.mode !== 'add';
  el.fValidFrom.disabled = ro;
  el.fValidTo.disabled = ro;
  el.fIsActive.disabled = ro;
  el.fRemark.disabled = ro;
}

// ------------------------ Commands ------------------------

function onSave() {
  hideFormError();
  const mode = drawerState.mode;
  if (mode !== 'add' && mode !== 'edit') return;

  const draft = readForm();
  const { ok, errors } = validateDraft(draft, { mode, existingKey: drawerState.key });
  if (!ok) {
    showFormError(errors.join('\n'));
    return;
  }

  if (mode === 'add') {
    const now = nowIso();
    /** @type {AuthUserGroup} */
    const newRow = {
      ...draft,
      appCode: APP_CODE,
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    };
    USER_GROUPS = [newRow].concat(USER_GROUPS);
    showNotice(`已新增：${newRow.userId} → ${newRow.groupCode}`, 'ok');
    closeDrawer();
    render();
    return;
  }

  // edit
  if (!drawerState.key) return;
  const current = getByKey(drawerState.key.userId, drawerState.key.groupCode);
  if (!current) {
    showFormError('找不到資料（可能已被刪除或清單重整）。');
    return;
  }
  if (drawerState.expectedRowVersion !== null && current.rowVersion !== drawerState.expectedRowVersion) {
    showFormError(`RowVersion mismatch：目前=${current.rowVersion}，表單=${drawerState.expectedRowVersion}。請重新開啟再編輯。`);
    return;
  }

  const now = nowIso();
  const updated = {
    ...current,
    // PK immutable
    validFrom: draft.validFrom,
    validTo: draft.validTo,
    isActive: draft.isActive,
    remark: draft.remark,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };

  USER_GROUPS = USER_GROUPS.map((x) => (sameKey(x, current) ? updated : x));
  showNotice(`已更新：${updated.userId} → ${updated.groupCode}（提示：正式系統需 Purge 該使用者權限快取）`, 'warn');
  closeDrawer();
  render();
}

function onSoftDelete(userId, groupCode) {
  hideNotice();
  const current = getByKey(userId, groupCode);
  if (!current) return;
  if (!current.isActive) {
    showNotice('此筆已是 Inactive。', 'warn');
    return;
  }

  const ok = confirm(`確定要刪除（soft）此關係？\nUserId=${current.userId}\nGroupCode=${current.groupCode}\n\n（實際動作：IsActive=0）`);
  if (!ok) return;

  const now = nowIso();
  const updated = {
    ...current,
    isActive: false,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };
  USER_GROUPS = USER_GROUPS.map((x) => (sameKey(x, current) ? updated : x));
  showNotice(`已 soft delete：${updated.userId} → ${updated.groupCode}（提示：正式系統需 Purge 權限快取）`, 'warn');
  render();
}

// ------------------------ Validation ------------------------

function validateDraft(draft, { mode, existingKey }) {
  /** @type {string[]} */
  const errors = [];

  if (!draft.userId) errors.push('UserId 為必填');
  if (!draft.groupCode) errors.push('GroupCode 為必填');

  const from = draft.validFrom;
  const to = draft.validTo;
  if (from && to && from > to) errors.push('ValidFrom 不可晚於 ValidTo');

  if (mode === 'add') {
    if (existsKey(draft.userId, draft.groupCode)) errors.push('複合主鍵 (UserId, GroupCode) 已存在，禁止重複加入');
  } else {
    if (existingKey) {
      const same = ciEq(draft.userId, existingKey.userId) && ciEq(draft.groupCode, existingKey.groupCode);
      if (!same) errors.push('PK（UserId/GroupCode）在 Edit 模式不可變更；請刪除後再新增');
    }
  }

  return { ok: errors.length === 0, errors };
}

function readForm() {
  const toBool = (v) => String(v) === '1';
  const from = (el.fValidFrom.value || '').trim();
  const to = (el.fValidTo.value || '').trim();

  return {
    userId: (el.fUserId.value || '').trim(),
    groupCode: (el.fGroupCode.value || '').trim(),
    appCode: APP_CODE,
    validFrom: from ? from.replace('T', ' ') : null,
    validTo: to ? to.replace('T', ' ') : null,
    isActive: toBool(el.fIsActive.value),
    remark: (el.fRemark.value || '').trim() ? (el.fRemark.value || '').trim() : null,
  };
}

// ------------------------ Utils ------------------------

function getByKey(userId, groupCode) {
  return USER_GROUPS.find((x) => ciEq(x.userId, userId) && ciEq(x.groupCode, groupCode)) || null;
}

function existsKey(userId, groupCode) {
  return Boolean(getByKey(userId, groupCode));
}

function sameKey(a, b) {
  return ciEq(a.userId, b.userId) && ciEq(a.groupCode, b.groupCode);
}

function ciEq(a, b) {
  return String(a || '').toLowerCase() === String(b || '').toLowerCase();
}

function nowIso() {
  return new Date().toISOString().slice(0, 19);
}

function toDatetimeLocal(isoLike) {
  // Accept 'YYYY-MM-DD HH:mm:ss' or 'YYYY-MM-DDTHH:mm:ss'
  const s = String(isoLike || '').replace('T', ' ');
  const m = s.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::\d{2})?/);
  if (!m) return '';
  return `${m[1]}T${m[2]}`;
}

function fmtDt(isoLike) {
  if (!isoLike) return '';
  return String(isoLike).replace('T', ' ');
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

function seedUserGroups() {
  const now = nowIso();
  /** @type {AuthUserGroup[]} */
  return [
    {
      userId: 'Emp123',
      groupCode: 'RND',
      appCode: APP_CODE,
      validFrom: null,
      validTo: null,
      isActive: true,
      remark: '研發人員',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
    {
      userId: 'Emp123',
      groupCode: 'PROJECT_X',
      appCode: APP_CODE,
      validFrom: '2026-02-01 00:00:00',
      validTo: '2026-03-31 23:59:59',
      isActive: true,
      remark: '專案期間成員',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
    {
      userId: 'Emp456',
      groupCode: 'VENDOR',
      appCode: APP_CODE,
      validFrom: '2026-02-15 09:00:00',
      validTo: '2026-02-28 18:00:00',
      isActive: true,
      remark: '外包（需 ValidTo）',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
  ];
}
