/* AuthAction prototype (pure JS, in-memory) */

const CURRENT_USER = 'System';
const ACTION_CATEGORIES = ['', 'READ', 'WRITE', 'OUTPUT', 'WORKFLOW']; // per seed script

/** @typedef {{
 * actionId: number;
 * actionCode: string;
 * actionName: string;
 * category: (string|null);
 * sortOrder: number;
 * isEnabled: boolean;
 * isBasicAction: boolean;
 * description: (string|null);
 * createdBy: string;
 * createdDate: string;
 * modifiedBy: (string|null);
 * modifiedDate: (string|null);
 * rowVersion: number;
 * }} AuthAction
 */

/** @type {AuthAction[]} */
let ACTIONS = seedActions();

// ------------------------ DOM ------------------------

const el = {
  queryForm: document.getElementById('queryForm'),
  qActionCode: document.getElementById('qActionCode'),
  qActionName: document.getElementById('qActionName'),
  qCategory: document.getElementById('qCategory'),
  qIsBasic: document.getElementById('qIsBasic'),
  qIsEnabled: document.getElementById('qIsEnabled'),
  qSortMin: document.getElementById('qSortMin'),
  qSortMax: document.getElementById('qSortMax'),
  qDesc: document.getElementById('qDesc'),
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

  fActionId: document.getElementById('fActionId'),
  fActionCode: document.getElementById('fActionCode'),
  hintActionCode: document.getElementById('hintActionCode'),
  actionCodeState: document.getElementById('actionCodeState'),
  fActionName: document.getElementById('fActionName'),
  fCategory: document.getElementById('fCategory'),
  fSortOrder: document.getElementById('fSortOrder'),
  fIsEnabled: document.getElementById('fIsEnabled'),
  fIsBasic: document.getElementById('fIsBasic'),
  fDesc: document.getElementById('fDesc'),
  fCreatedBy: document.getElementById('fCreatedBy'),
  fCreatedDate: document.getElementById('fCreatedDate'),
  fModifiedBy: document.getElementById('fModifiedBy'),
  fModifiedDate: document.getElementById('fModifiedDate'),
  fRowVersion: document.getElementById('fRowVersion'),
};

/** @type {{mode: 'detail'|'edit'|'add', code: (string|null), expectedRowVersion: (number|null)}} */
let drawerState = { mode: 'detail', code: null, expectedRowVersion: null };
let formReadOnly = false;

init();

function init() {
  fillSelect(el.qCategory, ACTION_CATEGORIES, { emptyLabel: '（全部）' });
  fillSelect(el.fCategory, ACTION_CATEGORIES, { emptyLabel: '（None）' });

  el.queryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideNotice();
    render();
  });

  el.btnAddNew.addEventListener('click', () => openDrawerAdd());

  el.drawerOverlay.addEventListener('click', () => closeDrawer());
  el.drawerClose.addEventListener('click', () => closeDrawer());

  el.fActionCode.addEventListener('input', () => normalizeActionCodeInput());
  el.fActionCode.addEventListener('input', () => validateActionCodeLive());

  render();
}

// ------------------------ Render ------------------------

function render() {
  const filtered = applyQuery(getQuery(), ACTIONS);
  el.resultMeta.textContent = `共 ${filtered.length} 筆`;

  el.tbody.innerHTML = '';
  for (const a of filtered) {
    const tr = document.createElement('tr');

    tr.appendChild(td(mono(String(a.actionId))));
    tr.appendChild(td(mono(a.actionCode)));
    tr.appendChild(td(a.actionName));
    tr.appendChild(td(a.category ?? ''));
    tr.appendChild(td(String(a.sortOrder)));
    tr.appendChild(td(a.isBasicAction ? '1' : '0'));
    tr.appendChild(td(a.isEnabled ? '1' : '0'));
    tr.appendChild(td(a.description ?? ''));
    tr.appendChild(td(mono((a.modifiedDate ?? a.createdDate).replace('T', ' '))));

    const actionTd = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'actions';

    const btnDetail = actionBtn('Detail', () => openDrawerDetail(a.actionCode));
    const btnEdit = actionBtn('Edit', () => openDrawerEdit(a.actionCode));
    const btnToggle = a.isEnabled
      ? actionBtn('Disable', () => onToggleEnabled(a.actionCode), 'danger')
      : actionBtn('Enable', () => onToggleEnabled(a.actionCode));

    if (isCore(a)) {
      btnToggle.disabled = true;
      btnToggle.title = 'IsBasicAction=1 核心動作：禁止 Disable/Enable';

      btnEdit.title = 'IsBasicAction=1 核心動作：允許編輯顯示欄位；禁止停用、禁止改碼';
    }

    wrap.appendChild(btnDetail);
    wrap.appendChild(btnEdit);
    wrap.appendChild(btnToggle);
    actionTd.appendChild(wrap);
    tr.appendChild(actionTd);

    el.tbody.appendChild(tr);
  }
}

function getQuery() {
  return {
    actionCode: (el.qActionCode.value || '').trim(),
    actionName: (el.qActionName.value || '').trim(),
    category: (el.qCategory.value || '').trim(),
    isBasic: (el.qIsBasic.value || '').trim(),
    isEnabled: (el.qIsEnabled.value || '').trim(),
    sortMin: (el.qSortMin.value || '').trim(),
    sortMax: (el.qSortMax.value || '').trim(),
    desc: (el.qDesc.value || '').trim(),
  };
}

function applyQuery(q, rows) {
  const contains = (hay, needle) => (hay || '').toLowerCase().includes((needle || '').toLowerCase());
  const numOrNull = (s) => (s === '' ? null : Number(s));
  const sMin = numOrNull(q.sortMin);
  const sMax = numOrNull(q.sortMax);

  return rows.filter((a) => {
    if (q.actionCode && !contains(a.actionCode, q.actionCode)) return false;
    if (q.actionName && !contains(a.actionName, q.actionName)) return false;
    if (q.category && (a.category ?? '') !== q.category) return false;
    if (q.isBasic) {
      const want = q.isBasic === '1';
      if (a.isBasicAction !== want) return false;
    }
    if (q.isEnabled) {
      const want = q.isEnabled === '1';
      if (a.isEnabled !== want) return false;
    }
    if (q.desc && !contains(a.description ?? '', q.desc)) return false;
    if (sMin !== null && !(a.sortOrder >= sMin)) return false;
    if (sMax !== null && !(a.sortOrder <= sMax)) return false;
    return true;
  });
}

// ------------------------ Drawer ------------------------

function openDrawerDetail(actionCode) {
  const a = getByCode(actionCode);
  if (!a) return;

  drawerState = { mode: 'detail', code: actionCode, expectedRowVersion: a.rowVersion };
  el.drawerTitle.textContent = 'Detail – AuthAction';
  el.drawerSubTitle.textContent = a.actionCode;
  fillForm(a, { readOnly: true, isEdit: false });
  setFooterMode('detail');
  openDrawer();
}

function openDrawerEdit(actionCode) {
  const a = getByCode(actionCode);
  if (!a) return;

  drawerState = { mode: 'edit', code: actionCode, expectedRowVersion: a.rowVersion };
  el.drawerTitle.textContent = 'Edit – AuthAction';
  el.drawerSubTitle.textContent = a.actionCode;
  fillForm(a, { readOnly: false, isEdit: true });
  setFooterMode('edit');
  openDrawer();
}

function openDrawerAdd() {
  drawerState = { mode: 'add', code: null, expectedRowVersion: null };
  el.drawerTitle.textContent = 'Add New – AuthAction';
  el.drawerSubTitle.textContent = 'ActionId auto-generated; ActionCode immutable after create';

  const now = nowIso();
  /** @type {AuthAction} */
  const blank = {
    actionId: nextActionId(),
    actionCode: '',
    actionName: '',
    category: null,
    sortOrder: 10,
    isEnabled: true,
    isBasicAction: false,
    description: null,
    createdBy: CURRENT_USER,
    createdDate: now,
    modifiedBy: null,
    modifiedDate: null,
    rowVersion: 1,
  };

  fillForm(blank, { readOnly: false, isEdit: false });
  setFooterMode('edit');
  openDrawer();
}

function openDrawer() {
  hideFormError();
  el.drawer.setAttribute('aria-hidden', 'false');
  validateActionCodeLive();
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

function fillForm(a, { readOnly, isEdit }) {
  formReadOnly = Boolean(readOnly);

  el.fActionId.value = String(a.actionId ?? '');
  el.fActionCode.value = a.actionCode ?? '';
  el.fActionName.value = a.actionName ?? '';
  el.fCategory.value = a.category ?? '';
  el.fSortOrder.value = String(a.sortOrder ?? '');
  el.fIsEnabled.value = a.isEnabled ? '1' : '0';
  el.fIsBasic.value = a.isBasicAction ? '1' : '0';
  el.fDesc.value = a.description ?? '';

  el.fCreatedBy.value = a.createdBy ?? '';
  el.fCreatedDate.value = a.createdDate ?? '';
  el.fModifiedBy.value = a.modifiedBy ?? '';
  el.fModifiedDate.value = a.modifiedDate ?? '';
  el.fRowVersion.value = String(a.rowVersion ?? '');

  // Rules
  // 1) ActionCode is immutable after create.
  // 2) Core action (IsBasicAction=1): allow editing display fields, but forbid IsEnabled toggle and forbids changing IsBasicAction.
  const core = isCore(a);

  // ActionCode: enabled only in add mode; otherwise disabled.
  el.fActionCode.disabled = drawerState.mode !== 'add';

  const canEdit = !formReadOnly && drawerState.mode !== 'detail';
  const canEditDisplay = canEdit; // includes core
  const canEditFlags = canEdit && !core;

  setReadOnly(el.fActionName, !canEditDisplay);
  setReadOnly(el.fCategory, !canEditDisplay);
  setReadOnly(el.fSortOrder, !canEditDisplay);
  setReadOnly(el.fDesc, !canEditDisplay);

  // Flags
  setReadOnly(el.fIsEnabled, !canEditFlags);
  setReadOnly(el.fIsBasic, !canEditFlags);

  el.hintActionCode.textContent = drawerState.mode === 'add'
    ? '全域唯一；建立後不可變更（避免破壞授權關聯）'
    : '已鎖定：建立後不可變更（避免破壞授權關聯）';

  validateActionCodeLive();
}

function setReadOnly(inputOrSelect, readOnly) {
  if (!inputOrSelect) return;
  inputOrSelect.disabled = Boolean(readOnly);
}

// ------------------------ Commands ------------------------

function onSave() {
  hideFormError();

  const mode = drawerState.mode;
  if (mode !== 'add' && mode !== 'edit') return;

  const draft = readForm();

  const current = mode === 'edit' ? getByCode(drawerState.code) : null;
  const { ok, errors } = validateDraft(draft, { mode, existingCode: drawerState.code, existingRow: current });
  if (!ok) {
    showFormError(errors.join('\n'));
    return;
  }

  if (mode === 'add') {
    const now = nowIso();
    /** @type {AuthAction} */
    const newRow = {
      actionId: draft.actionId,
      actionCode: draft.actionCode,
      actionName: draft.actionName,
      category: draft.category,
      sortOrder: draft.sortOrder,
      isEnabled: draft.isEnabled,
      isBasicAction: draft.isBasicAction,
      description: draft.description,
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    };

    ACTIONS = [newRow].concat(ACTIONS);
    showNotice(`已新增 ActionCode=${newRow.actionCode}`, 'ok');
    closeDrawer();
    render();
    return;
  }

  // edit
  if (!current) {
    showFormError('找不到資料（可能已被刪除/停用或清單重整）。');
    return;
  }
  if (drawerState.expectedRowVersion !== null && current.rowVersion !== drawerState.expectedRowVersion) {
    showFormError(`RowVersion mismatch：目前=${current.rowVersion}，表單=${drawerState.expectedRowVersion}。請重新開啟後再編輯。`);
    return;
  }

  const now = nowIso();
  const updated = {
    ...current,
    actionName: draft.actionName,
    category: draft.category,
    sortOrder: draft.sortOrder,
    isEnabled: draft.isEnabled,
    isBasicAction: draft.isBasicAction,
    description: draft.description,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };

  ACTIONS = ACTIONS.map((x) => (x.actionCode === current.actionCode ? updated : x));
  showNotice(`已更新 ActionCode=${updated.actionCode}`, 'ok');
  closeDrawer();
  render();
}

function onToggleEnabled(actionCode) {
  hideNotice();
  const current = getByCode(actionCode);
  if (!current) return;

  if (isCore(current)) {
    showNotice('核心動作（IsBasicAction=1）禁止 Disable/Enable（prototype guardrail）。', 'warn');
    return;
  }

  const next = !current.isEnabled;
  const now = nowIso();
  const updated = {
    ...current,
    isEnabled: next,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };

  ACTIONS = ACTIONS.map((x) => (x.actionCode === current.actionCode ? updated : x));
  showNotice(`${next ? '已啟用' : '已停用'} ActionCode=${updated.actionCode}`, next ? 'ok' : 'warn');
  render();
}

// ------------------------ Validation ------------------------

function normalizeActionCodeInput() {
  if (drawerState.mode !== 'add') return;
  const v = (el.fActionCode.value || '').toUpperCase();
  if (el.fActionCode.value !== v) el.fActionCode.value = v;
}

function validateActionCodeLive() {
  const mode = drawerState.mode;
  const code = (el.fActionCode.value || '').trim().toUpperCase();
  const msgs = [];

  if (mode === 'add') {
    if (!code) msgs.push('必填');
    if (code && (code.length < 2 || code.length > 50)) msgs.push('長度需介於 2–50');
    if (code && !/^[A-Z0-9_-]+$/.test(code)) msgs.push('僅允許 A-Z / 0-9 / _ / -');
    if (code && existsActionCode(code)) msgs.push('ActionCode 重複');
  } else {
    msgs.push('已鎖定（建立後不可變更）');
  }

  el.actionCodeState.textContent = msgs.length ? msgs.join('；') : 'OK';
}

function validateDraft(draft, { mode, existingCode, existingRow }) {
  /** @type {string[]} */
  const errors = [];

  const code = (draft.actionCode || '').trim().toUpperCase();
  if (mode === 'add') {
    if (!code) errors.push('ActionCode 為必填');
    if (code && (code.length < 2 || code.length > 50)) errors.push('ActionCode 長度需介於 2–50');
    if (code && !/^[A-Z0-9_-]+$/.test(code)) errors.push('ActionCode 僅允許 A-Z / 0-9 / _ / -');
    if (code && existsActionCode(code)) errors.push('ActionCode 重複（需全域唯一）');
  } else {
    // immutable
    if (existingCode && code !== existingCode) errors.push('ActionCode 建立後不可變更');
  }

  if (!draft.actionName.trim()) errors.push('ActionName 為必填');
  if (!Number.isFinite(draft.sortOrder)) errors.push('SortOrder 為必填且需為數字');
  if (draft.category !== null && draft.category !== '' && !ACTION_CATEGORIES.includes(draft.category)) {
    errors.push('Category 不在 seed script 固定值內');
  }
  if (draft.isBasicAction && draft.isEnabled === false) {
    errors.push('IsBasicAction=1（核心動作）禁止停用（prototype guardrail）');
  }

  // Core edit restrictions
  if (mode === 'edit' && existingRow && isCore(existingRow)) {
    if (draft.isEnabled === false) errors.push('核心動作禁止停用（IsEnabled 必須為 1）');
    if (draft.isBasicAction === false) errors.push('核心動作不可將 IsBasicAction 改為 0');
  }

  return { ok: errors.length === 0, errors };
}

function readForm() {
  const toBool = (v) => String(v) === '1';
  const toInt = (v) => {
    const n = Number(String(v));
    return Number.isFinite(n) ? Math.trunc(n) : NaN;
  };

  const actionCode = (el.fActionCode.value || '').trim().toUpperCase();
  const categoryRaw = (el.fCategory.value || '').trim();
  const category = categoryRaw ? categoryRaw : null;
  const desc = (el.fDesc.value || '').trim();

  return {
    actionId: toInt(el.fActionId.value),
    actionCode,
    actionName: (el.fActionName.value || '').trim(),
    category,
    sortOrder: toInt(el.fSortOrder.value),
    isEnabled: toBool(el.fIsEnabled.value),
    isBasicAction: toBool(el.fIsBasic.value),
    description: desc ? desc : null,
  };
}

function existsActionCode(code) {
  const c = (code || '').trim().toUpperCase();
  return ACTIONS.some((a) => a.actionCode.toUpperCase() === c);
}

// ------------------------ Utils ------------------------

function isCore(a) {
  return Boolean(a && a.isBasicAction);
}

function getByCode(actionCode) {
  const c = (actionCode || '').trim().toUpperCase();
  return ACTIONS.find((a) => a.actionCode.toUpperCase() === c) || null;
}

function nowIso() {
  return new Date().toISOString().slice(0, 19);
}

function nextActionId() {
  const maxId = ACTIONS.reduce((m, a) => Math.max(m, Number(a.actionId) || 0), 0);
  return maxId + 1;
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

function fillSelect(select, items, { emptyLabel } = {}) {
  select.innerHTML = '';
  for (const [i, v] of items.entries()) {
    const opt = document.createElement('option');
    opt.value = v;
    if (i === 0 && v === '' && emptyLabel) opt.textContent = emptyLabel;
    else opt.textContent = v === '' ? '' : v;
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

function seedActions() {
  const now = nowIso();
  /** @type {Array<Pick<AuthAction,'actionCode'|'actionName'|'category'|'sortOrder'|'isBasicAction'>>} */
  const seed = [
    { actionCode: 'VIEW', actionName: '檢視', category: 'READ', sortOrder: 10, isBasicAction: true },
    { actionCode: 'CREATE', actionName: '新增', category: 'WRITE', sortOrder: 20, isBasicAction: true },
    { actionCode: 'EDIT', actionName: '編輯', category: 'WRITE', sortOrder: 30, isBasicAction: true },
    { actionCode: 'DELETE', actionName: '刪除', category: 'WRITE', sortOrder: 40, isBasicAction: true },
    { actionCode: 'EXPORT', actionName: '匯出', category: 'OUTPUT', sortOrder: 50, isBasicAction: false },
    { actionCode: 'PRINT', actionName: '列印', category: 'OUTPUT', sortOrder: 60, isBasicAction: false },
    { actionCode: 'SUBMIT', actionName: '送出', category: 'WORKFLOW', sortOrder: 70, isBasicAction: false },
    { actionCode: 'APPROVE', actionName: '核准', category: 'WORKFLOW', sortOrder: 80, isBasicAction: false },
    { actionCode: 'REJECT', actionName: '駁回', category: 'WORKFLOW', sortOrder: 85, isBasicAction: false },
    { actionCode: 'VOID', actionName: '作廢', category: 'WORKFLOW', sortOrder: 90, isBasicAction: false },
  ];

  /** @type {AuthAction[]} */
  const rows = [];
  let id = 1;
  for (const s of seed) {
    rows.push({
      actionId: id++,
      actionCode: s.actionCode,
      actionName: s.actionName,
      category: s.category,
      sortOrder: s.sortOrder,
      isEnabled: true,
      isBasicAction: s.isBasicAction,
      description: null,
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    });
  }
  return rows;
}
