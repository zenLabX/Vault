/* AuthResource prototype (pure JS, in-memory) */

const APP_CODE = 'PMS';
const CURRENT_USER = 'System';

const RESOURCE_TYPES = ['SYSTEM', 'MODULE', 'MENU', 'PAGE', 'API', 'BUTTON', 'FIELD'];
const HTTP_METHODS = ['', 'GET', 'POST', 'PUT', 'DELETE'];

/** @typedef {{
 * resourceKey: string;
 * appCode: string;
 * resourceCode: string;
 * resourceName: string;
 * resourceType: string;
 * parentResourceKey: (string|null);
 * path: string;
 * sortOrder: number;
 * endpoint: (string|null);
 * method: (string|null);
 * metaJson: (string|null);
 * isActive: boolean;
 * tags: (string|null);
 * createdBy: string;
 * createdDate: string;
 * modifiedBy: (string|null);
 * modifiedDate: (string|null);
 * rowVersion: number;
 * isLeaf: boolean;
 * }} AuthResource
 */

/** @type {AuthResource[]} */
let RESOURCES = seedResources();

// ------------------------ DOM ------------------------

const el = {
  queryForm: document.getElementById('queryForm'),
  qAppCode: document.getElementById('qAppCode'),
  qResourceCode: document.getElementById('qResourceCode'),
  qResourceName: document.getElementById('qResourceName'),
  qResourceType: document.getElementById('qResourceType'),
  qIsActive: document.getElementById('qIsActive'),
  qPath: document.getElementById('qPath'),
  qEndpoint: document.getElementById('qEndpoint'),
  qMethod: document.getElementById('qMethod'),
  qTags: document.getElementById('qTags'),
  qParentResourceKey: document.getElementById('qParentResourceKey'),
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
  btnDrawerCancel: document.getElementById('btnDrawerCancel'),
  btnDrawerSave: document.getElementById('btnDrawerSave'),

  editForm: document.getElementById('editForm'),
  formError: document.getElementById('formError'),

  fResourceKey: document.getElementById('fResourceKey'),
  fAppCode: document.getElementById('fAppCode'),
  fResourceCode: document.getElementById('fResourceCode'),
  fResourceName: document.getElementById('fResourceName'),
  fResourceType: document.getElementById('fResourceType'),
  fParentResourceKey: document.getElementById('fParentResourceKey'),
  fPath: document.getElementById('fPath'),
  fSortOrder: document.getElementById('fSortOrder'),
  fEndpoint: document.getElementById('fEndpoint'),
  fMethod: document.getElementById('fMethod'),
  fMetaJson: document.getElementById('fMetaJson'),
  metaJsonState: document.getElementById('metaJsonState'),
  fTags: document.getElementById('fTags'),
  fIsLeaf: document.getElementById('fIsLeaf'),
  fIsActive: document.getElementById('fIsActive'),
  fCreatedBy: document.getElementById('fCreatedBy'),
  fCreatedDate: document.getElementById('fCreatedDate'),
  fModifiedBy: document.getElementById('fModifiedBy'),
  fModifiedDate: document.getElementById('fModifiedDate'),
  fRowVersion: document.getElementById('fRowVersion'),
};

/** @type {{mode: 'detail'|'edit'|'add', key: (string|null)}} */
let drawerState = { mode: 'detail', key: null };

let formReadOnly = false;

init();

function init() {
  el.qAppCode.value = APP_CODE;
  fillSelect(el.qResourceType, [''].concat(RESOURCE_TYPES));
  fillSelect(el.fResourceType, RESOURCE_TYPES);

  el.queryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideNotice();
    render();
  });

  el.btnAddNew.addEventListener('click', () => openDrawerAdd());

  el.drawerOverlay.addEventListener('click', () => closeDrawer());
  el.drawerClose.addEventListener('click', () => closeDrawer());
  el.btnDrawerCancel.addEventListener('click', () => closeDrawer());
  el.btnDrawerSave.addEventListener('click', () => onSave());

  el.fResourceCode.addEventListener('input', () => syncComputedFields());
  el.fResourceType.addEventListener('change', () => applyTypeRules());
  el.fParentResourceKey.addEventListener('change', () => syncComputedFields());
  el.fMetaJson.addEventListener('input', () => validateMetaJsonLive());

  render();
}

// ------------------------ Render ------------------------

function render() {
  ensureTreeConsistency();
  const filtered = applyQuery(getQuery(), RESOURCES);
  el.resultMeta.textContent = `共 ${filtered.length} 筆`;

  el.tbody.innerHTML = '';
  for (const r of filtered) {
    const tr = document.createElement('tr');

    tr.appendChild(td(mono(r.resourceKey)));
    tr.appendChild(td(mono(r.resourceCode)));
    tr.appendChild(td(r.resourceName));
    tr.appendChild(td(r.resourceType));
    tr.appendChild(td(mono(r.parentResourceKey ?? '')));
    tr.appendChild(td(mono(r.path)));
    tr.appendChild(td(String(r.sortOrder)));
    tr.appendChild(td(mono(r.endpoint ?? '')));
    tr.appendChild(td(mono(r.method ?? '')));
    tr.appendChild(td(r.isLeaf ? '1' : '0'));
    tr.appendChild(td(r.isActive ? '1' : '0'));
    tr.appendChild(td(r.tags ?? ''));
    tr.appendChild(td(mono((r.modifiedDate ?? r.createdDate).replace('T', ' '))));

    const actionTd = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'actions';

    const btnDetail = actionBtn('Detail', () => openDrawerDetail(r.resourceKey));
    const btnEdit = actionBtn('Edit', () => openDrawerEdit(r.resourceKey));
    const btnDelete = actionBtn('Delete', () => onDelete(r.resourceKey), 'danger');

    wrap.appendChild(btnDetail);
    wrap.appendChild(btnEdit);
    wrap.appendChild(btnDelete);
    actionTd.appendChild(wrap);
    tr.appendChild(actionTd);

    el.tbody.appendChild(tr);
  }

  // Keep drawer select options fresh (Parent dropdown depends on current tree)
  if (el.drawer.getAttribute('aria-hidden') === 'false') {
    refreshParentOptions();
    syncComputedFields();
    applyTypeRules();
  }
}

function getQuery() {
  return {
    appCode: (el.qAppCode.value || '').trim(),
    resourceCode: (el.qResourceCode.value || '').trim(),
    resourceName: (el.qResourceName.value || '').trim(),
    resourceType: (el.qResourceType.value || '').trim(),
    isActive: (el.qIsActive.value || '').trim(),
    path: (el.qPath.value || '').trim(),
    endpoint: (el.qEndpoint.value || '').trim(),
    method: (el.qMethod.value || '').trim(),
    tags: (el.qTags.value || '').trim(),
    parentResourceKey: (el.qParentResourceKey.value || '').trim(),
  };
}

function applyQuery(q, rows) {
  const contains = (hay, needle) => (hay || '').toLowerCase().includes((needle || '').toLowerCase());
  const startsWith = (hay, needle) => (hay || '').toLowerCase().startsWith((needle || '').toLowerCase());

  return rows.filter((r) => {
    if (q.appCode && r.appCode !== q.appCode) return false;
    if (q.resourceCode && !contains(r.resourceCode, q.resourceCode)) return false;
    if (q.resourceName && !contains(r.resourceName, q.resourceName)) return false;
    if (q.resourceType && r.resourceType !== q.resourceType) return false;
    if (q.isActive) {
      const want = q.isActive === '1';
      if (r.isActive !== want) return false;
    }
    if (q.path && !startsWith(r.path, q.path)) return false;
    if (q.endpoint && !contains(r.endpoint ?? '', q.endpoint)) return false;
    if (q.method && (r.method ?? '') !== q.method) return false;
    if (q.tags && !contains(r.tags ?? '', q.tags)) return false;
    if (q.parentResourceKey && !contains(r.parentResourceKey ?? '', q.parentResourceKey)) return false;
    return true;
  });
}

// ------------------------ Drawer ------------------------

function openDrawerDetail(resourceKey) {
  const r = getByKey(resourceKey);
  if (!r) return;

  drawerState = { mode: 'detail', key: resourceKey };
  el.drawerTitle.textContent = 'Detail – AuthResource';
  el.drawerSubTitle.textContent = `${r.resourceKey}`;

  fillForm(r, { readOnly: true, isEdit: false });
  setFooterMode('detail');
  openDrawer();
}

function openDrawerEdit(resourceKey) {
  const r = getByKey(resourceKey);
  if (!r) return;

  drawerState = { mode: 'edit', key: resourceKey };
  el.drawerTitle.textContent = 'Edit – AuthResource';
  el.drawerSubTitle.textContent = `${r.resourceKey}`;

  fillForm(r, { readOnly: false, isEdit: true });
  setFooterMode('edit');
  openDrawer();
}

function openDrawerAdd() {
  drawerState = { mode: 'add', key: null };
  el.drawerTitle.textContent = 'Add New – AuthResource';
  el.drawerSubTitle.textContent = `AppCode=${APP_CODE}`;

  const now = nowIso();
  /** @type {AuthResource} */
  const blank = {
    resourceKey: '',
    appCode: APP_CODE,
    resourceCode: '',
    resourceName: '',
    resourceType: 'PAGE',
    parentResourceKey: null,
    path: '',
    sortOrder: 100,
    endpoint: null,
    method: null,
    metaJson: null,
    isActive: true,
    tags: null,
    createdBy: CURRENT_USER,
    createdDate: now,
    modifiedBy: null,
    modifiedDate: null,
    rowVersion: 1,
    isLeaf: true, // computed later
  };

  fillForm(blank, { readOnly: false, isEdit: false });
  setFooterMode('edit');
  openDrawer();
}

function openDrawer() {
  hideFormError();
  el.drawer.setAttribute('aria-hidden', 'false');
  refreshParentOptions();
  syncComputedFields();
  applyTypeRules();
  validateMetaJsonLive();
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

  // edit/add
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

function fillForm(r, { readOnly, isEdit }) {
  formReadOnly = Boolean(readOnly);

  // Note: keep these rules aligned with earlier interpretation
  el.fAppCode.value = r.appCode;
  el.fResourceCode.value = r.resourceCode;
  el.fResourceName.value = r.resourceName;
  el.fResourceType.value = r.resourceType;
  el.fSortOrder.value = String(r.sortOrder ?? '');
  el.fEndpoint.value = r.endpoint ?? '';
  el.fMethod.value = r.method ?? '';
  el.fMetaJson.value = r.metaJson ?? '';
  el.fTags.value = r.tags ?? '';
  el.fIsActive.value = r.isActive ? '1' : '0';

  el.fCreatedBy.value = r.createdBy ?? '';
  el.fCreatedDate.value = r.createdDate ?? '';
  el.fModifiedBy.value = r.modifiedBy ?? '';
  el.fModifiedDate.value = r.modifiedDate ?? '';
  el.fRowVersion.value = String(r.rowVersion ?? '');

  // Parent select filled separately
  el.fParentResourceKey.value = r.parentResourceKey ?? '';

  // Computed / derived
  el.fResourceKey.value = r.resourceKey || buildResourceKey(r.appCode, r.resourceCode);
  el.fPath.value = r.path || previewPath(r.appCode, r.resourceCode, r.parentResourceKey);
  el.fIsLeaf.value = r.isLeaf ? '1' : '0';

  // edit rules: AppCode always disabled; ResourceKey always disabled
  // ResourceCode: editable only in add. On edit, lock to avoid breaking FK.
  el.fResourceCode.disabled = readOnly || isEdit;
  el.fResourceName.disabled = readOnly;
  el.fResourceType.disabled = readOnly;
  el.fParentResourceKey.disabled = readOnly;
  el.fSortOrder.disabled = readOnly;
  el.fEndpoint.disabled = readOnly;
  el.fMethod.disabled = readOnly;
  el.fMetaJson.disabled = readOnly;
  el.fTags.disabled = readOnly;
  el.fIsActive.disabled = readOnly;
}

function refreshParentOptions() {
  const mode = drawerState.mode;
  const currentKey = drawerState.key;

  const select = el.fParentResourceKey;
  select.innerHTML = '';

  const optNone = document.createElement('option');
  optNone.value = '';
  optNone.textContent = '(root)';
  select.appendChild(optNone);

  const blocked = new Set();
  if (mode !== 'add' && currentKey) {
    blocked.add(currentKey);
    for (const d of getDescendantKeys(currentKey)) blocked.add(d);
  }

  // Only allow parents within same AppCode for this prototype
  const candidates = RESOURCES
    .filter((r) => r.appCode === APP_CODE)
    .filter((r) => !blocked.has(r.resourceKey))
    .slice()
    .sort((a, b) => a.path.localeCompare(b.path));

  for (const r of candidates) {
    const opt = document.createElement('option');
    opt.value = r.resourceKey;
    opt.textContent = `${r.resourceKey}  (${r.resourceType})`;
    select.appendChild(opt);
  }

  // Keep previous selection if possible
  const existing = select.value;
  if (existing && !candidates.some((c) => c.resourceKey === existing)) {
    select.value = '';
  }
}

function syncComputedFields() {
  if (el.drawer.getAttribute('aria-hidden') !== 'false') return;

  const appCode = (el.fAppCode.value || APP_CODE).trim();
  const resourceCode = (el.fResourceCode.value || '').trim();
  const parentKey = (el.fParentResourceKey.value || '').trim() || null;

  el.fResourceKey.value = buildResourceKey(appCode, resourceCode);
  el.fPath.value = previewPath(appCode, resourceCode, parentKey);

  // Keep leaf computed based on current RESOURCES (not including unsaved changes)
  if (drawerState.mode !== 'add' && drawerState.key) {
    el.fIsLeaf.value = isLeaf(drawerState.key) ? '1' : '0';
  } else {
    el.fIsLeaf.value = '1';
  }
}

function applyTypeRules() {
  const t = (el.fResourceType.value || '').trim();
  const isApi = t === 'API';

  el.fEndpoint.placeholder = isApi ? '/api/...' : '（可空）';

  if (!isApi) el.fMethod.value = '';
  el.fMethod.disabled = formReadOnly || !isApi;
  el.fEndpoint.disabled = formReadOnly;
}

function validateMetaJsonLive() {
  const s = (el.fMetaJson.value || '').trim();
  if (!s) {
    el.metaJsonState.textContent = '（可空）若填寫需為合法 JSON。';
    return true;
  }
  try {
    JSON.parse(s);
    el.metaJsonState.textContent = 'JSON ✅';
    return true;
  } catch {
    el.metaJsonState.textContent = 'JSON ❌（格式不合法）';
    return false;
  }
}

// ------------------------ Save / Delete ------------------------

function onSave() {
  if (drawerState.mode === 'detail') return;

  hideFormError();

  const payload = readFormPayload();
  const validation = validatePayload(payload);
  if (!validation.ok) {
    showFormError(validation.message);
    return;
  }

  if (drawerState.mode === 'add') {
    const now = nowIso();
    /** @type {AuthResource} */
    const r = {
      resourceKey: payload.resourceKey,
      appCode: payload.appCode,
      resourceCode: payload.resourceCode,
      resourceName: payload.resourceName,
      resourceType: payload.resourceType,
      parentResourceKey: payload.parentResourceKey,
      path: '',
      sortOrder: payload.sortOrder,
      endpoint: payload.endpoint,
      method: payload.method,
      metaJson: payload.metaJson,
      isActive: payload.isActive,
      tags: payload.tags,
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
      isLeaf: true,
    };
    RESOURCES.push(r);

    // compute paths for the new node (and any descendants in future)
    ensureTreeConsistency();
    updateSubtreePaths(r.resourceKey);
    ensureTreeConsistency();

    showNotice(`已新增：${r.resourceKey}`);
    closeDrawer();
    render();
    return;
  }

  // edit
  const key = drawerState.key;
  if (!key) return;
  const existing = getByKey(key);
  if (!existing) return;

  // optimistic concurrency (simplified)
  const currentVersion = Number(el.fRowVersion.value || '0');
  if (existing.rowVersion !== currentVersion) {
    showFormError(`RowVersion 不一致：目前=${existing.rowVersion}，表單=${currentVersion}。請關閉後重新開啟再編輯。`);
    return;
  }

  const prevParent = existing.parentResourceKey;

  existing.resourceName = payload.resourceName;
  existing.resourceType = payload.resourceType;
  existing.parentResourceKey = payload.parentResourceKey;
  existing.sortOrder = payload.sortOrder;
  existing.endpoint = payload.endpoint;
  existing.method = payload.method;
  existing.metaJson = payload.metaJson;
  existing.tags = payload.tags;
  existing.isActive = payload.isActive;
  existing.modifiedBy = CURRENT_USER;
  existing.modifiedDate = nowIso();
  existing.rowVersion += 1;

  // When parent changes, must cascade Path updates
  if (prevParent !== existing.parentResourceKey) {
    ensureTreeConsistency();
    updateSubtreePaths(existing.resourceKey);
  } else {
    existing.path = previewPath(existing.appCode, existing.resourceCode, existing.parentResourceKey);
  }

  ensureTreeConsistency();
  showNotice(`已更新：${existing.resourceKey}`);
  closeDrawer();
  render();
}

function onDelete(resourceKey) {
  ensureTreeConsistency();

  if (!isLeaf(resourceKey)) {
    showNotice(`不可刪除非葉節點（IsLeaf=0）。請先處理子節點，或改用 IsActive=0 下架。`, { error: true });
    return;
  }

  const r = getByKey(resourceKey);
  if (!r) return;

  const ok = confirm(`Delete（soft）: ${resourceKey}\n\n此動作會將 IsActive 設為 0（不做物理刪除）。`);
  if (!ok) return;

  if (!r.isActive) {
    showNotice('已是 Inactive，未變更。');
    return;
  }

  r.isActive = false;
  r.modifiedBy = CURRENT_USER;
  r.modifiedDate = nowIso();
  r.rowVersion += 1;

  showNotice(`已下架（IsActive=0）：${resourceKey}`);
  render();
}

function readFormPayload() {
  const appCode = (el.fAppCode.value || APP_CODE).trim();
  const resourceCode = (el.fResourceCode.value || '').trim();
  const resourceKey = buildResourceKey(appCode, resourceCode);

  return {
    resourceKey,
    appCode,
    resourceCode,
    resourceName: (el.fResourceName.value || '').trim(),
    resourceType: (el.fResourceType.value || '').trim(),
    parentResourceKey: (el.fParentResourceKey.value || '').trim() || null,
    sortOrder: Number(el.fSortOrder.value || 'NaN'),
    endpoint: normalizeNullable((el.fEndpoint.value || '').trim()),
    method: normalizeNullable((el.fMethod.value || '').trim()),
    metaJson: normalizeNullable((el.fMetaJson.value || '').trim()),
    tags: normalizeNullable((el.fTags.value || '').trim()),
    isActive: (el.fIsActive.value || '1') === '1',
  };
}

function validatePayload(p) {
  if (!p.resourceCode) return bad('ResourceCode 為必填');
  if (!p.resourceName) return bad('ResourceName 為必填');
  if (!p.resourceType) return bad('ResourceType 為必填');
  if (!Number.isFinite(p.sortOrder)) return bad('SortOrder 必須為數字');

  // uniqueness (AppCode, ResourceCode)
  const dup = RESOURCES.find((r) =>
    r.appCode === p.appCode &&
    r.resourceCode.toLowerCase() === p.resourceCode.toLowerCase() &&
    (drawerState.mode === 'add' || r.resourceKey !== drawerState.key)
  );
  if (dup) return bad(`ResourceCode 重複：同一 AppCode 下已存在 ${dup.resourceKey}`);

  // parent existence
  if (p.parentResourceKey) {
    const parent = getByKey(p.parentResourceKey);
    if (!parent) return bad('ParentResourceKey 不存在');

    if (drawerState.mode !== 'add' && drawerState.key) {
      if (p.parentResourceKey === drawerState.key) return bad('不可指定自己為 Parent');
      if (isAncestor(drawerState.key, p.parentResourceKey)) {
        return bad('循環參照：不可選擇子孫節點作為 Parent');
      }
    }
  }

  // API type rules
  if (p.resourceType === 'API') {
    if (!p.endpoint) return bad('ResourceType=API 時，Endpoint 為必填');
    if (!p.method) return bad('ResourceType=API 時，Method 為必填');
    if (!HTTP_METHODS.includes(p.method)) return bad('Method 不在允許清單');
  } else {
    // Not API: method must be null
    p.method = null;
  }

  // MetaJson must be valid JSON if present
  if (p.metaJson) {
    try { JSON.parse(p.metaJson); } catch { return bad('MetaJson 必須為合法 JSON'); }
  }

  return { ok: true, message: '' };
}

function bad(message) { return { ok: false, message }; }

// ------------------------ Tree / Path ------------------------

function ensureTreeConsistency() {
  // Compute isLeaf + normalize Path deterministically via tree recursion.
  const map = new Map(RESOURCES.map((r) => [r.resourceKey, r]));
  const children = new Map();
  for (const r of RESOURCES) {
    if (!children.has(r.parentResourceKey ?? '')) children.set(r.parentResourceKey ?? '', []);
    children.get(r.parentResourceKey ?? '').push(r);
  }

  // isLeaf computed based on any child existence (including inactive children)
  for (const r of RESOURCES) {
    const kid = children.get(r.resourceKey) ?? [];
    r.isLeaf = kid.length === 0;
  }

  // Path recompute (guard cycles)
  const visiting = new Set();
  const memo = new Map();
  const getPath = (key) => {
    if (memo.has(key)) return memo.get(key);
    const node = map.get(key);
    if (!node) return '';
    if (visiting.has(key)) return '';
    visiting.add(key);

    const parentKey = node.parentResourceKey;
    let base;
    if (!parentKey || !map.has(parentKey)) {
      base = `/${node.appCode}/${node.resourceCode}/`;
    } else {
      const pp = getPath(parentKey);
      base = `${ensureEndsWithSlash(pp)}${node.resourceCode}/`;
    }

    visiting.delete(key);
    memo.set(key, base);
    return base;
  };

  for (const r of RESOURCES) {
    r.path = getPath(r.resourceKey);
  }
}

function updateSubtreePaths(rootKey) {
  // In real system this must be inside a transaction.
  const root = getByKey(rootKey);
  if (!root) return;

  const visited = new Set();
  const walk = (key) => {
    if (visited.has(key)) return;
    visited.add(key);

    const node = getByKey(key);
    if (!node) return;

    node.path = previewPath(node.appCode, node.resourceCode, node.parentResourceKey);

    const kids = RESOURCES.filter((r) => r.parentResourceKey === key);
    for (const c of kids) {
      c.modifiedBy = CURRENT_USER;
      c.modifiedDate = nowIso();
      c.rowVersion += 1;
      walk(c.resourceKey);
    }
  };

  walk(rootKey);
}

function previewPath(appCode, resourceCode, parentKey) {
  const code = (resourceCode || '').trim();
  if (!code) return '';
  if (!parentKey) return `/${appCode}/${code}/`;
  const p = getByKey(parentKey);
  const base = p?.path || `/${appCode}/`;
  return `${ensureEndsWithSlash(base)}${code}/`;
}

function ensureEndsWithSlash(s) {
  if (!s) return '/';
  return s.endsWith('/') ? s : `${s}/`;
}

function isLeaf(resourceKey) {
  return !RESOURCES.some((r) => r.parentResourceKey === resourceKey);
}

function getDescendantKeys(resourceKey) {
  const result = [];
  const stack = [resourceKey];
  while (stack.length) {
    const k = stack.pop();
    const children = RESOURCES.filter((r) => r.parentResourceKey === k);
    for (const c of children) {
      result.push(c.resourceKey);
      stack.push(c.resourceKey);
    }
  }
  return result;
}

function isAncestor(ancestorKey, nodeKey) {
  // Returns true if ancestorKey is an ancestor of nodeKey
  let cur = getByKey(nodeKey);
  const guard = new Set();
  while (cur?.parentResourceKey) {
    if (guard.has(cur.resourceKey)) return true; // already cyclic => treat as bad
    guard.add(cur.resourceKey);

    if (cur.parentResourceKey === ancestorKey) return true;
    cur = getByKey(cur.parentResourceKey);
  }
  return false;
}

// ------------------------ Helpers ------------------------

function buildResourceKey(appCode, resourceCode) {
  const a = (appCode || '').trim();
  const c = (resourceCode || '').trim();
  if (!a || !c) return '';
  return `${a}:${c}`;
}

function normalizeNullable(s) {
  if (!s) return null;
  return s;
}

function getByKey(resourceKey) {
  return RESOURCES.find((r) => r.resourceKey === resourceKey) ?? null;
}

function nowIso() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

function fillSelect(select, values) {
  select.innerHTML = '';
  for (const v of values) {
    const opt = document.createElement('option');
    opt.value = v;
    opt.textContent = v || '（全部）';
    select.appendChild(opt);
  }
}

function td(content) {
  const cell = document.createElement('td');
  if (content instanceof Node) {
    cell.appendChild(content);
  } else {
    cell.textContent = content;
  }
  return cell;
}

function mono(text) {
  const span = document.createElement('span');
  span.className = 'mono';
  span.textContent = text;
  return span;
}

function actionBtn(label, onClick, kind) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `btn btn--sm ${kind === 'danger' ? 'btn--danger' : 'btn--ghost'}`;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function showNotice(message, { error } = { error: false }) {
  el.notice.hidden = false;
  el.notice.textContent = message;
  el.notice.classList.toggle('notice--error', Boolean(error));
}

function hideNotice() {
  el.notice.hidden = true;
  el.notice.textContent = '';
  el.notice.classList.remove('notice--error');
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

function seedResources() {
  const now = nowIso();

  /** @type {AuthResource[]} */
  const rows = [
    mk({ code: 'ROOT', name: 'PMS Root', type: 'SYSTEM', parent: null, sort: 1 }),
    mk({ code: 'ORDER', name: '訂單管理', type: 'MODULE', parent: 'PMS:ROOT', sort: 10, tags: '#Core' }),
    mk({ code: 'ORDER_MENU', name: '訂單選單', type: 'MENU', parent: 'PMS:ORDER', sort: 10 }),
    mk({ code: 'ORDER_PAGE', name: '訂單查詢頁', type: 'PAGE', parent: 'PMS:ORDER_MENU', sort: 10, endpoint: '/pms/order', method: null }),
    mk({ code: 'ORDER_API_LIST', name: '訂單查詢 API', type: 'API', parent: 'PMS:ORDER', sort: 20, endpoint: '/api/orders', method: 'GET' }),
    mk({ code: 'ORDER_API_CREATE', name: '訂單新增 API', type: 'API', parent: 'PMS:ORDER', sort: 21, endpoint: '/api/orders', method: 'POST' }),
    mk({ code: 'BTN_ORDER_EXPORT', name: '匯出按鈕', type: 'BUTTON', parent: 'PMS:ORDER_PAGE', sort: 50, tags: '#Beta' }),

    mk({ code: 'SECURITY', name: '系統設定', type: 'MODULE', parent: 'PMS:ROOT', sort: 99, tags: '#Admin' }),
    mk({ code: 'USER_PAGE', name: '使用者管理', type: 'PAGE', parent: 'PMS:SECURITY', sort: 10, endpoint: '/pms/security/users', method: null }),
    mk({ code: 'USER_API_LIST', name: '使用者查詢 API', type: 'API', parent: 'PMS:SECURITY', sort: 11, endpoint: '/api/users', method: 'GET', metaJson: '{"Sensitivity":"High"}' }),
  ];

  // stamp audit & path
  for (const r of rows) {
    r.createdBy = CURRENT_USER;
    r.createdDate = now;
    r.modifiedBy = null;
    r.modifiedDate = null;
    r.rowVersion = 1;
  }

  // Path / IsLeaf will be computed by render() via ensureTreeConsistency().
  return rows;

  function mk({ code, name, type, parent, sort, endpoint, method, tags, metaJson }) {
    /** @type {AuthResource} */
    const r = {
      resourceKey: `PMS:${code}`,
      appCode: 'PMS',
      resourceCode: code,
      resourceName: name,
      resourceType: type,
      parentResourceKey: parent,
      path: '',
      sortOrder: sort,
      endpoint: endpoint ?? null,
      method: method ?? null,
      metaJson: metaJson ?? null,
      isActive: true,
      tags: tags ?? null,
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
      isLeaf: true,
    };
    return r;
  }
}
