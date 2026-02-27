/* AuthPrincipalGroup prototype (pure JS, in-memory) */

const APP_CODE = 'PMS';
const CURRENT_USER = 'System';

/** @typedef {{
 * groupId: number;
 * groupCode: string;
 * groupName: string;
 * groupDesc: (string|null);
 * appCode: string;
 * tags: (string|null);
 * isActive: boolean;
 * validFrom: (string|null);
 * validTo: (string|null);
 * createdBy: string;
 * createdDate: string;
 * modifiedBy: (string|null);
 * modifiedDate: (string|null);
 * rowVersion: number;
 * }} AuthPrincipalGroup
 */

/** Simulated relation: GroupCode -> Roles count. */
const ROLE_RELATIONS = new Map([
  ['RND', 3],
  ['PROJECT_X', 1],
]);

/** @type {AuthPrincipalGroup[]} */
let GROUPS = seedGroups();

// ------------------------ DOM ------------------------

const el = {
  queryForm: document.getElementById('queryForm'),
  qAppCode: document.getElementById('qAppCode'),
  qGroupCode: document.getElementById('qGroupCode'),
  qGroupName: document.getElementById('qGroupName'),
  qIsActive: document.getElementById('qIsActive'),
  qTags: document.getElementById('qTags'),
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

  fGroupId: document.getElementById('fGroupId'),
  fGroupCode: document.getElementById('fGroupCode'),
  fGroupName: document.getElementById('fGroupName'),
  fGroupDesc: document.getElementById('fGroupDesc'),
  fAppCode: document.getElementById('fAppCode'),
  fTags: document.getElementById('fTags'),
  fIsActive: document.getElementById('fIsActive'),
  fValidFrom: document.getElementById('fValidFrom'),
  fValidTo: document.getElementById('fValidTo'),
  fCreatedBy: document.getElementById('fCreatedBy'),
  fCreatedDate: document.getElementById('fCreatedDate'),
  fModifiedBy: document.getElementById('fModifiedBy'),
  fModifiedDate: document.getElementById('fModifiedDate'),
  fRowVersion: document.getElementById('fRowVersion'),
};

/** @type {{mode: 'detail'|'edit'|'add', key: string|null, expectedRowVersion: (number|null)}} */
let drawerState = { mode: 'detail', key: null, expectedRowVersion: null };

init();

function init() {
  el.qAppCode.value = APP_CODE;
  el.fAppCode.value = APP_CODE;

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
  const filtered = applyQuery(getQuery(), GROUPS);
  el.resultMeta.textContent = `共 ${filtered.length} 筆`;
  el.tbody.innerHTML = '';

  for (const r of filtered) {
    const tr = document.createElement('tr');
    tr.appendChild(td(mono(String(r.groupId))));
    tr.appendChild(td(mono(r.groupCode)));
    tr.appendChild(td(r.groupName));
    tr.appendChild(td(mono(r.appCode)));
    tr.appendChild(td(r.isActive ? '1' : '0'));
    tr.appendChild(td(mono(fmtDt(r.validFrom))));
    tr.appendChild(td(mono(fmtDt(r.validTo))));
    tr.appendChild(td(r.tags ?? ''));
    tr.appendChild(td(mono((r.modifiedDate ?? r.createdDate).replace('T', ' '))));

    const actionTd = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'actions';
    wrap.appendChild(actionBtn('Detail', () => openDrawerDetail(r.groupCode)));
    wrap.appendChild(actionBtn('Edit', () => openDrawerEdit(r.groupCode)));
    wrap.appendChild(actionBtn('Delete', () => onSoftDelete(r.groupCode), 'danger'));
    actionTd.appendChild(wrap);
    tr.appendChild(actionTd);
    el.tbody.appendChild(tr);
  }
}

function getQuery() {
  return {
    appCode: (el.qAppCode.value || '').trim(),
    groupCode: (el.qGroupCode.value || '').trim(),
    groupName: (el.qGroupName.value || '').trim(),
    isActive: (el.qIsActive.value || '').trim(),
    tags: (el.qTags.value || '').trim(),
  };
}

function applyQuery(q, rows) {
  const contains = (hay, needle) => (hay || '').toLowerCase().includes((needle || '').toLowerCase());
  return rows.filter((r) => {
    // Decision: AppCode is non-null and fixed to PMS
    if (q.appCode && r.appCode !== q.appCode) return false;
    if (q.groupCode && !contains(r.groupCode, q.groupCode)) return false;
    if (q.groupName && !contains(r.groupName, q.groupName)) return false;
    if (q.isActive) {
      const want = q.isActive === '1';
      if (r.isActive !== want) return false;
    }
    if (q.tags && !contains(r.tags ?? '', q.tags)) return false;
    return true;
  });
}

// ------------------------ Drawer ------------------------

function openDrawerDetail(groupCode) {
  const r = getByCode(groupCode);
  if (!r) return;

  drawerState = { mode: 'detail', key: r.groupCode, expectedRowVersion: r.rowVersion };
  el.drawerTitle.textContent = 'Detail – AuthPrincipalGroup';
  el.drawerSubTitle.textContent = `${r.groupCode} / ${r.groupName}`;
  fillForm(r, { readOnly: true });
  setFooterMode('detail');
  openDrawer();
}

function openDrawerEdit(groupCode) {
  const r = getByCode(groupCode);
  if (!r) return;

  drawerState = { mode: 'edit', key: r.groupCode, expectedRowVersion: r.rowVersion };
  el.drawerTitle.textContent = 'Edit – AuthPrincipalGroup';
  el.drawerSubTitle.textContent = `${r.groupCode} / ${r.groupName}`;
  fillForm(r, { readOnly: false });
  setFooterMode('edit');
  openDrawer();
}

function openDrawerAdd() {
  drawerState = { mode: 'add', key: null, expectedRowVersion: null };
  el.drawerTitle.textContent = 'Add New – AuthPrincipalGroup';
  el.drawerSubTitle.textContent = 'GroupCode 為邏輯 PK / UNIQUE（新增後鎖定不可改）';

  const now = nowIso();
  /** @type {AuthPrincipalGroup} */
  const blank = {
    groupId: nextGroupId(),
    groupCode: '',
    groupName: '',
    groupDesc: null,
    appCode: APP_CODE,
    tags: null,
    isActive: true,
    validFrom: null,
    validTo: null,
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
  el.fGroupId.value = String(r.groupId ?? '');
  el.fGroupCode.value = r.groupCode ?? '';
  el.fGroupName.value = r.groupName ?? '';
  el.fGroupDesc.value = r.groupDesc ?? '';
  el.fAppCode.value = APP_CODE;
  el.fTags.value = r.tags ?? '';
  el.fIsActive.value = r.isActive ? '1' : '0';
  el.fValidFrom.value = r.validFrom ? toDatetimeLocal(r.validFrom) : '';
  el.fValidTo.value = r.validTo ? toDatetimeLocal(r.validTo) : '';
  el.fCreatedBy.value = r.createdBy ?? '';
  el.fCreatedDate.value = r.createdDate ?? '';
  el.fModifiedBy.value = r.modifiedBy ?? '';
  el.fModifiedDate.value = r.modifiedDate ?? '';
  el.fRowVersion.value = String(r.rowVersion ?? '');

  // Lock GroupCode after add
  el.fGroupCode.disabled = ro || drawerState.mode !== 'add';
  el.fGroupName.disabled = ro;
  el.fGroupDesc.disabled = ro;
  el.fTags.disabled = ro;
  el.fIsActive.disabled = ro;
  el.fValidFrom.disabled = ro;
  el.fValidTo.disabled = ro;
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
    /** @type {AuthPrincipalGroup} */
    const newRow = {
      groupId: draft.groupId,
      groupCode: draft.groupCode,
      groupName: draft.groupName,
      groupDesc: draft.groupDesc,
      appCode: APP_CODE,
      tags: draft.tags,
      isActive: draft.isActive,
      validFrom: draft.validFrom,
      validTo: draft.validTo,
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    };
    GROUPS = [newRow].concat(GROUPS);
    showNotice(`已新增群組：${newRow.groupCode}`, 'warn');
    closeDrawer();
    render();
    return;
  }

  // edit
  if (!drawerState.key) return;
  const current = getByCode(drawerState.key);
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
    // GroupCode immutable
    groupName: draft.groupName,
    groupDesc: draft.groupDesc,
    tags: draft.tags,
    isActive: draft.isActive,
    validFrom: draft.validFrom,
    validTo: draft.validTo,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };

  GROUPS = GROUPS.map((x) => (ciEq(x.groupCode, current.groupCode) ? updated : x));
  showNotice(`已更新：${updated.groupCode}（提示：正式系統需重新載入權限計算/快取流程）`, 'warn');
  closeDrawer();
  render();
}

function onSoftDelete(groupCode) {
  hideNotice();
  const current = getByCode(groupCode);
  if (!current) return;
  if (!current.isActive) {
    showNotice('此群組已是 Inactive。', 'warn');
    return;
  }

  const relationCount = ROLE_RELATIONS.get(current.groupCode) ?? 0;
  const relationHint = relationCount > 0
    ? `\n\n注意：此群組目前模擬有 ${relationCount} 筆角色關聯（正式系統 Delete 前需確認 AuthRelationPrincipalRole 無關聯）。`
    : '';

  const ok = confirm(
    `確定要刪除（soft）此群組？\nGroupCode=${current.groupCode}\n\n（實際動作：IsActive=0）${relationHint}`,
  );
  if (!ok) return;

  const now = nowIso();
  const updated = {
    ...current,
    isActive: false,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };
  GROUPS = GROUPS.map((x) => (ciEq(x.groupCode, current.groupCode) ? updated : x));
  showNotice(`已 soft delete：${updated.groupCode}`, 'warn');
  render();
}

// ------------------------ Validation ------------------------

function validateDraft(draft, { mode, existingKey }) {
  /** @type {string[]} */
  const errors = [];

  if (!draft.groupCode) errors.push('GroupCode 為必填');
  if (!draft.groupName) errors.push('GroupName 為必填');

  if (draft.groupCode && draft.groupCode.length > 50) errors.push('GroupCode 長度不可超過 50');
  if (draft.groupName && draft.groupName.length > 100) errors.push('GroupName 長度不可超過 100');
  if ((draft.groupDesc ?? '').length > 200) errors.push('GroupDesc 長度不可超過 200');
  if ((draft.tags ?? '').length > 200) errors.push('Tags 長度不可超過 200');

  // Decision: allow equality (ValidTo >= ValidFrom)
  if (draft.validFrom && draft.validTo && draft.validFrom > draft.validTo) {
    errors.push('ValidFrom 不可晚於 ValidTo（允許相等）');
  }

  if (mode === 'add') {
    if (existsCode(draft.groupCode)) errors.push('GroupCode 已存在（UNIQUE），禁止重複');
  } else {
    if (existingKey && !ciEq(draft.groupCode, existingKey)) {
      errors.push('Edit 模式不可變更 GroupCode；請新增新群組或另行處理資料遷移');
    }
  }

  return { ok: errors.length === 0, errors };
}

function readForm() {
  const toBool = (v) => String(v) === '1';
  const from = (el.fValidFrom.value || '').trim();
  const to = (el.fValidTo.value || '').trim();

  return {
    groupId: Number(el.fGroupId.value || 0),
    groupCode: (el.fGroupCode.value || '').trim(),
    groupName: (el.fGroupName.value || '').trim(),
    groupDesc: (el.fGroupDesc.value || '').trim() ? (el.fGroupDesc.value || '').trim() : null,
    appCode: APP_CODE,
    tags: (el.fTags.value || '').trim() ? (el.fTags.value || '').trim() : null,
    isActive: toBool(el.fIsActive.value),
    validFrom: from ? from.replace('T', ' ') : null,
    validTo: to ? to.replace('T', ' ') : null,
  };
}

// ------------------------ Utils ------------------------

function getByCode(groupCode) {
  return GROUPS.find((x) => ciEq(x.groupCode, groupCode)) || null;
}

function existsCode(groupCode) {
  return Boolean(getByCode(groupCode));
}

function nextGroupId() {
  return Math.max(0, ...GROUPS.map((g) => g.groupId)) + 1;
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

function ciEq(a, b) {
  return String(a || '').toLowerCase() === String(b || '').toLowerCase();
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

function seedGroups() {
  const now = nowIso();
  /** @type {AuthPrincipalGroup[]} */
  return [
    {
      groupId: 1,
      groupCode: 'RND',
      groupName: '研發組',
      groupDesc: '研發與工程團隊',
      appCode: APP_CODE,
      tags: 'tech,core',
      isActive: true,
      validFrom: null,
      validTo: null,
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
    {
      groupId: 2,
      groupCode: 'PROJECT_X',
      groupName: '專案 X',
      groupDesc: '跨部門專案群組',
      appCode: APP_CODE,
      tags: 'project,temporary',
      isActive: true,
      validFrom: '2026-02-01 00:00:00',
      validTo: '2026-03-31 23:59:59',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
    {
      groupId: 3,
      groupCode: 'VENDOR',
      groupName: '外包組',
      groupDesc: '外包/臨時人員（建議設有效期）',
      appCode: APP_CODE,
      tags: 'vendor',
      isActive: true,
      validFrom: '2026-02-15 09:00:00',
      validTo: '2026-02-28 18:00:00',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
  ];
}
