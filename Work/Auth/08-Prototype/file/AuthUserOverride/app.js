/* AuthUserOverride prototype (pure JS, in-memory) */

const CURRENT_USER = 'System';

/** @typedef {{
 * userId: string;
 * resourceKey: string;
 * actionCode: string;
 * effect: boolean; // true=ALLOW, false=DENY
 * conditionJson: (string|null);
 * validFrom: (string|null);
 * validTo: (string|null);
 * isActive: boolean;
 * reason: string;
 * createdBy: string;
 * createdDate: string;
 * modifiedBy: (string|null);
 * modifiedDate: (string|null);
 * rowVersion: number;
 * }} AuthUserOverride
 */

/** @type {{userId: string}[]} */
const USERS = [
  { userId: 'Emp123' },
  { userId: 'Emp456' },
  { userId: 'Admin01' },
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

/** @type {AuthUserOverride[]} */
let OVERRIDES = seedOverrides();

const el = {
  queryForm: document.getElementById('queryForm'),
  qUserId: document.getElementById('qUserId'),
  qResourceKey: document.getElementById('qResourceKey'),
  qActionCode: document.getElementById('qActionCode'),
  qEffect: document.getElementById('qEffect'),
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
  fUserId: document.getElementById('fUserId'),
  fResourceKey: document.getElementById('fResourceKey'),
  fActionCode: document.getElementById('fActionCode'),
  fEffect: document.getElementById('fEffect'),
  fIsActive: document.getElementById('fIsActive'),
  fConditionJson: document.getElementById('fConditionJson'),
  fValidFrom: document.getElementById('fValidFrom'),
  fValidTo: document.getElementById('fValidTo'),
  fReason: document.getElementById('fReason'),
  fCreatedBy: document.getElementById('fCreatedBy'),
  fCreatedDate: document.getElementById('fCreatedDate'),
  fModifiedBy: document.getElementById('fModifiedBy'),
  fModifiedDate: document.getElementById('fModifiedDate'),
  fRowVersion: document.getElementById('fRowVersion'),
};

/** @type {{mode: 'detail'|'edit'|'add', key: {userId: string, resourceKey: string, actionCode: string} | null, expectedRowVersion: (number|null)}} */
let drawerState = { mode: 'detail', key: null, expectedRowVersion: null };

init();

function init() {
  fillSelect(el.fUserId, USERS.map((u) => ({ value: u.userId, label: u.userId })));
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

function render() {
  const filtered = applyQuery(getQuery(), OVERRIDES);
  el.resultMeta.textContent = `共 ${filtered.length} 筆`;
  el.tbody.innerHTML = '';

  for (const r of filtered) {
    const tr = document.createElement('tr');
    tr.appendChild(td(mono(r.userId)));
    tr.appendChild(td(mono(r.resourceKey)));
    tr.appendChild(td(mono(r.actionCode)));
    tr.appendChild(td(effectPill(r.effect)));
    tr.appendChild(td(mono(fmtDt(r.validFrom))));
    tr.appendChild(td(mono(fmtDt(r.validTo))));
    tr.appendChild(td(r.isActive ? '1' : '0'));
    tr.appendChild(td(r.reason));
    tr.appendChild(td(mono((r.modifiedDate ?? r.createdDate).replace('T', ' '))));

    const actionTd = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'actions';
    wrap.appendChild(actionBtn('Detail', () => openDrawerDetail(r.userId, r.resourceKey, r.actionCode)));
    wrap.appendChild(actionBtn('Edit', () => openDrawerEdit(r.userId, r.resourceKey, r.actionCode)));
    wrap.appendChild(actionBtn('Delete', () => onSoftDelete(r.userId, r.resourceKey, r.actionCode), 'danger'));
    actionTd.appendChild(wrap);
    tr.appendChild(actionTd);
    el.tbody.appendChild(tr);
  }
}

function getQuery() {
  return {
    userId: (el.qUserId.value || '').trim(),
    resourceKey: (el.qResourceKey.value || '').trim(),
    actionCode: (el.qActionCode.value || '').trim(),
    effect: (el.qEffect.value || '').trim(),
    isActive: (el.qIsActive.value || '').trim(),
  };
}

function applyQuery(q, rows) {
  const contains = (hay, needle) => (hay || '').toLowerCase().includes((needle || '').toLowerCase());
  return rows.filter((r) => {
    if (q.userId && !contains(r.userId, q.userId)) return false;
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
    return true;
  });
}

// ------------------------ Drawer ------------------------

function openDrawerDetail(userId, resourceKey, actionCode) {
  const r = getByKey(userId, resourceKey, actionCode);
  if (!r) return;
  drawerState = { mode: 'detail', key: { userId, resourceKey, actionCode }, expectedRowVersion: r.rowVersion };
  el.drawerTitle.textContent = 'Detail – AuthUserOverride';
  el.drawerSubTitle.textContent = `${r.userId} / ${r.resourceKey} / ${r.actionCode}`;
  fillForm(r, { readOnly: true });
  setFooterMode('detail');
  openDrawer();
}

function openDrawerEdit(userId, resourceKey, actionCode) {
  const r = getByKey(userId, resourceKey, actionCode);
  if (!r) return;
  drawerState = { mode: 'edit', key: { userId, resourceKey, actionCode }, expectedRowVersion: r.rowVersion };
  el.drawerTitle.textContent = 'Edit – AuthUserOverride';
  el.drawerSubTitle.textContent = `${r.userId} / ${r.resourceKey} / ${r.actionCode}`;
  fillForm(r, { readOnly: false });
  setFooterMode('edit');
  openDrawer();
}

function openDrawerAdd() {
  drawerState = { mode: 'add', key: null, expectedRowVersion: null };
  el.drawerTitle.textContent = 'Add New – AuthUserOverride';
  el.drawerSubTitle.textContent = 'Composite PK: (UserId, ResourceKey, ActionCode)';

  const now = nowIso();
  /** @type {AuthUserOverride} */
  const blank = {
    userId: USERS[0]?.userId ?? 'Emp123',
    resourceKey: RESOURCES[0]?.resourceKey ?? 'PMS.PROJECT',
    actionCode: ACTIONS[0]?.actionCode ?? 'VIEW',
    effect: true,
    conditionJson: null,
    validFrom: null,
    validTo: null,
    isActive: true,
    reason: '',
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

  el.fUserId.value = r.userId;
  el.fResourceKey.value = r.resourceKey;
  el.fActionCode.value = r.actionCode;
  el.fEffect.value = r.effect ? '1' : '0';
  el.fIsActive.value = r.isActive ? '1' : '0';
  el.fConditionJson.value = r.conditionJson ?? '';
  el.fValidFrom.value = r.validFrom ? toDatetimeLocal(r.validFrom) : '';
  el.fValidTo.value = r.validTo ? toDatetimeLocal(r.validTo) : '';
  el.fReason.value = r.reason ?? '';

  el.fCreatedBy.value = r.createdBy ?? '';
  el.fCreatedDate.value = r.createdDate ?? '';
  el.fModifiedBy.value = r.modifiedBy ?? '';
  el.fModifiedDate.value = r.modifiedDate ?? '';
  el.fRowVersion.value = String(r.rowVersion ?? '');

  // PK immutable
  el.fUserId.disabled = ro || drawerState.mode !== 'add';
  el.fResourceKey.disabled = ro || drawerState.mode !== 'add';
  el.fActionCode.disabled = ro || drawerState.mode !== 'add';
  el.fEffect.disabled = ro;
  el.fIsActive.disabled = ro;
  el.fConditionJson.disabled = ro;
  el.fValidFrom.disabled = ro;
  el.fValidTo.disabled = ro;
  el.fReason.disabled = ro;
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
    /** @type {AuthUserOverride} */
    const newRow = {
      ...draft,
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    };
    OVERRIDES = [newRow].concat(OVERRIDES);
    showNotice(`已新增：${newRow.userId} / ${newRow.resourceKey} / ${newRow.actionCode}`, 'ok');
    closeDrawer();
    render();
    return;
  }

  // edit
  if (!drawerState.key) return;
  const current = getByKey(drawerState.key.userId, drawerState.key.resourceKey, drawerState.key.actionCode);
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
    effect: draft.effect,
    conditionJson: draft.conditionJson,
    validFrom: draft.validFrom,
    validTo: draft.validTo,
    isActive: draft.isActive,
    reason: draft.reason,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };
  OVERRIDES = OVERRIDES.map((x) => (sameKey(x, current) ? updated : x));
  showNotice(`已更新：${updated.userId} / ${updated.resourceKey} / ${updated.actionCode}`, 'warn');
  closeDrawer();
  render();
}

function onSoftDelete(userId, resourceKey, actionCode) {
  hideNotice();
  const current = getByKey(userId, resourceKey, actionCode);
  if (!current) return;
  if (!current.isActive) {
    showNotice('此筆已是 Inactive。', 'warn');
    return;
  }
  const ok = confirm(`確定要刪除（soft）此覆寫？\nUserId=${current.userId}\nResourceKey=${current.resourceKey}\nActionCode=${current.actionCode}\n\n（實際動作：IsActive=0）`);
  if (!ok) return;

  const now = nowIso();
  const updated = {
    ...current,
    isActive: false,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };
  OVERRIDES = OVERRIDES.map((x) => (sameKey(x, current) ? updated : x));
  showNotice(`已 soft delete：${updated.userId} / ${updated.resourceKey} / ${updated.actionCode}`, 'warn');
  render();
}

// ------------------------ Validation ------------------------

function validateDraft(draft, { mode, existingKey }) {
  /** @type {string[]} */
  const errors = [];

  if (!draft.userId) errors.push('UserId 為必填');
  if (!draft.resourceKey) errors.push('ResourceKey 為必填');
  if (!draft.actionCode) errors.push('ActionCode 為必填');
  if (!draft.reason || !draft.reason.trim()) errors.push('Reason 為必填');

  if (draft.validFrom && draft.validTo && draft.validFrom > draft.validTo) {
    errors.push('ValidFrom 不可晚於 ValidTo');
  }

  const cj = draft.conditionJson;
  if (cj && cj.trim()) {
    try {
      JSON.parse(cj);
    } catch {
      errors.push('ConditionJson 必須是合法 JSON（或留空）');
    }
  }

  if (mode === 'add') {
    if (existsKey(draft.userId, draft.resourceKey, draft.actionCode)) errors.push('複合主鍵 (UserId, ResourceKey, ActionCode) 已存在');
  } else {
    if (existingKey) {
      const same = ciEq(draft.userId, existingKey.userId)
        && ciEq(draft.resourceKey, existingKey.resourceKey)
        && ciEq(draft.actionCode, existingKey.actionCode);
      if (!same) errors.push('PK 在 Edit 模式不可變更；請刪除後再新增');
    }
  }

  return { ok: errors.length === 0, errors };
}

function readForm() {
  const from = (el.fValidFrom.value || '').trim();
  const to = (el.fValidTo.value || '').trim();
  const cj = (el.fConditionJson.value || '').trim();
  return {
    userId: (el.fUserId.value || '').trim(),
    resourceKey: (el.fResourceKey.value || '').trim(),
    actionCode: (el.fActionCode.value || '').trim(),
    effect: String(el.fEffect.value) === '1',
    conditionJson: cj ? cj : null,
    validFrom: from ? from.replace('T', ' ') : null,
    validTo: to ? to.replace('T', ' ') : null,
    isActive: String(el.fIsActive.value) === '1',
    reason: (el.fReason.value || '').trim(),
  };
}

// ------------------------ Utils ------------------------

function getByKey(userId, resourceKey, actionCode) {
  return OVERRIDES.find((x) =>
    ciEq(x.userId, userId)
    && ciEq(x.resourceKey, resourceKey)
    && ciEq(x.actionCode, actionCode)
  ) || null;
}

function existsKey(userId, resourceKey, actionCode) {
  return Boolean(getByKey(userId, resourceKey, actionCode));
}

function sameKey(a, b) {
  return ciEq(a.userId, b.userId) && ciEq(a.resourceKey, b.resourceKey) && ciEq(a.actionCode, b.actionCode);
}

function ciEq(a, b) {
  return String(a || '').toLowerCase() === String(b || '').toLowerCase();
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

function seedOverrides() {
  const now = nowIso();
  /** @type {AuthUserOverride[]} */
  return [
    {
      userId: 'Emp123',
      resourceKey: 'PMS.REPORT',
      actionCode: 'EXPORT',
      effect: true,
      conditionJson: '{"Plant":"A"}',
      validFrom: '2026-02-20 00:00:00',
      validTo: '2026-03-05 23:59:59',
      isActive: true,
      reason: '臨時支援報表匯出（Plant A）',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
    {
      userId: 'Emp456',
      resourceKey: 'PMS.ADMIN',
      actionCode: 'VIEW',
      effect: false,
      conditionJson: null,
      validFrom: null,
      validTo: null,
      isActive: true,
      reason: '離職前風險控管：禁止查看後台',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
  ];
}
