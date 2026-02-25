/* AuthRole prototype (pure JS, in-memory) */

const CURRENT_USER = 'System';

/** @typedef {{
 * roleId: string;
 * roleCode: string;
 * roleName: string;
 * roleDesc: (string|null);
 * isAdmin: boolean;
 * isActive: boolean;
 * priority: number;
 * tags: (string|null);
 * createdBy: string;
 * createdDate: string;
 * modifiedBy: (string|null);
 * modifiedDate: (string|null);
 * rowVersion: number;
 * }} AuthRole
 */

/** @typedef {{
 * principalRoleCode: string;
 * relationCode: string;
 * userId: (string|null);
 * groupCode: (string|null);
 * roleCode: string;
 * appCode: (string|null);
 * validFrom: (string|null);
 * validTo: (string|null);
 * priority: number;
 * isActive: boolean;
 * }} PrincipalRole
 */

/** @typedef {{
 * grantCode: string;
 * roleCode: string;
 * resourceKey: string;
 * actionCode: string;
 * effect: 0|1;
 * isActive: boolean;
 * }} Grant
 */

/** @type {AuthRole[]} */
let ROLES = seedRoles();

/** @type {PrincipalRole[]} */
let PRINCIPAL_ROLES = seedPrincipalRoles();

/** @type {Grant[]} */
let GRANTS = seedGrants();

// ------------------------ DOM ------------------------

const el = {
  queryForm: document.getElementById('queryForm'),
  qRoleCode: document.getElementById('qRoleCode'),
  qRoleName: document.getElementById('qRoleName'),
  qIsAdmin: document.getElementById('qIsAdmin'),
  qIsActive: document.getElementById('qIsActive'),
  qTags: document.getElementById('qTags'),
  qPriorityMin: document.getElementById('qPriorityMin'),
  qPriorityMax: document.getElementById('qPriorityMax'),
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

  fRoleId: document.getElementById('fRoleId'),
  fRoleCode: document.getElementById('fRoleCode'),
  fRoleName: document.getElementById('fRoleName'),
  fPriority: document.getElementById('fPriority'),
  fIsAdmin: document.getElementById('fIsAdmin'),
  fIsActive: document.getElementById('fIsActive'),
  adminHint: document.getElementById('adminHint'),
  fRoleDesc: document.getElementById('fRoleDesc'),
  fTags: document.getElementById('fTags'),
  tagsState: document.getElementById('tagsState'),
  refAssignments: document.getElementById('refAssignments'),
  refGrants: document.getElementById('refGrants'),
  fCreatedBy: document.getElementById('fCreatedBy'),
  fCreatedDate: document.getElementById('fCreatedDate'),
  fModifiedBy: document.getElementById('fModifiedBy'),
  fModifiedDate: document.getElementById('fModifiedDate'),
  fRowVersion: document.getElementById('fRowVersion'),
};

/** @type {{mode: 'detail'|'edit'|'add', roleId: (string|null)}} */
let drawerState = { mode: 'detail', roleId: null };
let formReadOnly = false;

init();

function init() {
  el.queryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideNotice();
    render();
  });

  el.btnAddNew.addEventListener('click', () => openDrawerAdd());

  el.drawerOverlay.addEventListener('click', () => closeDrawer());
  el.drawerClose.addEventListener('click', () => closeDrawer());

  el.fTags.addEventListener('input', () => validateTagsLive());
  el.fIsAdmin.addEventListener('change', () => updateAdminHint());

  render();
}

// ------------------------ Render ------------------------

function render() {
  const filtered = applyQuery(getQuery(), ROLES);
  el.resultMeta.textContent = `共 ${filtered.length} 筆`;

  el.tbody.innerHTML = '';
  for (const r of filtered) {
    const tr = document.createElement('tr');

    tr.appendChild(td(mono(r.roleId)));
    tr.appendChild(td(mono(r.roleCode)));
    tr.appendChild(td(r.roleName));
    tr.appendChild(td(r.isAdmin ? '1' : '0'));
    tr.appendChild(td(r.isActive ? '1' : '0'));
    tr.appendChild(td(String(r.priority)));
    tr.appendChild(td(r.tags ?? ''));
    tr.appendChild(td(mono((r.modifiedDate ?? r.createdDate).replace('T', ' '))));

    const actionTd = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'actions';

    wrap.appendChild(actionBtn('Detail', () => openDrawerDetail(r.roleId)));
    wrap.appendChild(actionBtn('Edit', () => openDrawerEdit(r.roleId)));
    wrap.appendChild(actionBtn('Delete', () => onSoftDelete(r.roleId), 'danger'));

    actionTd.appendChild(wrap);
    tr.appendChild(actionTd);

    el.tbody.appendChild(tr);
  }
}

function getQuery() {
  return {
    roleCode: (el.qRoleCode.value || '').trim(),
    roleName: (el.qRoleName.value || '').trim(),
    isAdmin: (el.qIsAdmin.value || '').trim(),
    isActive: (el.qIsActive.value || '').trim(),
    tags: (el.qTags.value || '').trim(),
    priorityMin: (el.qPriorityMin.value || '').trim(),
    priorityMax: (el.qPriorityMax.value || '').trim(),
  };
}

function applyQuery(q, rows) {
  const contains = (hay, needle) => (hay || '').toLowerCase().includes((needle || '').toLowerCase());
  const numOrNull = (s) => (s === '' ? null : Number(s));

  const pMin = numOrNull(q.priorityMin);
  const pMax = numOrNull(q.priorityMax);

  return rows.filter((r) => {
    if (q.roleCode && !contains(r.roleCode, q.roleCode)) return false;
    if (q.roleName && !contains(r.roleName, q.roleName)) return false;
    if (q.isAdmin) {
      const want = q.isAdmin === '1';
      if (r.isAdmin !== want) return false;
    }
    if (q.isActive) {
      const want = q.isActive === '1';
      if (r.isActive !== want) return false;
    }
    if (q.tags && !contains(r.tags ?? '', q.tags)) return false;
    if (pMin !== null && !(r.priority >= pMin)) return false;
    if (pMax !== null && !(r.priority <= pMax)) return false;
    return true;
  });
}

// ------------------------ Drawer ------------------------

function openDrawerDetail(roleId) {
  const r = getById(roleId);
  if (!r) return;

  drawerState = { mode: 'detail', roleId };
  el.drawerTitle.textContent = 'Detail – AuthRole';
  el.drawerSubTitle.textContent = r.roleCode;
  fillForm(r, { readOnly: true, isEdit: false });
  setFooterMode('detail');
  openDrawer();
}

function openDrawerEdit(roleId) {
  const r = getById(roleId);
  if (!r) return;

  drawerState = { mode: 'edit', roleId };
  el.drawerTitle.textContent = 'Edit – AuthRole';
  el.drawerSubTitle.textContent = r.roleCode;
  fillForm(r, { readOnly: false, isEdit: true });
  setFooterMode('edit');
  openDrawer();
}

function openDrawerAdd() {
  drawerState = { mode: 'add', roleId: null };
  el.drawerTitle.textContent = 'Add New – AuthRole';
  el.drawerSubTitle.textContent = 'RoleId auto-generated';

  const now = nowIso();
  /** @type {AuthRole} */
  const blank = {
    roleId: newId('ROLE'),
    roleCode: '',
    roleName: '',
    roleDesc: null,
    isAdmin: false,
    isActive: true,
    priority: 0,
    tags: null,
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
  validateTagsLive();
  updateAdminHint();
  refreshReferences();
}

function closeDrawer() {
  el.drawer.setAttribute('aria-hidden', 'true');
}

function setFooterMode(mode) {
  el.drawerFooter.innerHTML = '';

  if (mode === 'detail') {
    el.drawerFooter.appendChild(footerBtn('關閉', 'ghost', () => closeDrawer()));
    return;
  }

  // edit/add
  el.drawerFooter.appendChild(footerBtn('取消', 'ghost', () => closeDrawer()));
  el.drawerFooter.appendChild(footerBtn('儲存', 'primary', () => onSave()));

  // hard delete only on edit
  if (drawerState.mode === 'edit') {
    el.drawerFooter.appendChild(footerBtn('Hard Delete', 'danger', () => onHardDelete()));
  }
}

function fillForm(r, { readOnly, isEdit }) {
  formReadOnly = Boolean(readOnly);

  el.fRoleId.value = r.roleId;
  el.fRoleCode.value = r.roleCode;
  el.fRoleName.value = r.roleName;
  el.fRoleDesc.value = r.roleDesc ?? '';
  el.fIsAdmin.value = r.isAdmin ? '1' : '0';
  el.fIsActive.value = r.isActive ? '1' : '0';
  el.fPriority.value = String(r.priority);
  el.fTags.value = r.tags ?? '';

  el.fCreatedBy.value = r.createdBy ?? '';
  el.fCreatedDate.value = r.createdDate ?? '';
  el.fModifiedBy.value = r.modifiedBy ?? '';
  el.fModifiedDate.value = r.modifiedDate ?? '';
  el.fRowVersion.value = String(r.rowVersion ?? '');

  // RoleId always readonly. RoleCode is editable only during add.
  el.fRoleCode.disabled = readOnly || isEdit;
  el.fRoleName.disabled = readOnly;
  el.fPriority.disabled = readOnly;
  el.fIsAdmin.disabled = readOnly;
  el.fIsActive.disabled = readOnly;
  el.fRoleDesc.disabled = readOnly;
  el.fTags.disabled = readOnly;
}

function refreshReferences() {
  const roleCode = (el.fRoleCode.value || '').trim();
  if (!roleCode) {
    el.refAssignments.textContent = '0';
    el.refGrants.textContent = '0';
    return;
  }
  const a = PRINCIPAL_ROLES.filter((x) => x.roleCode === roleCode && x.isActive).length;
  const g = GRANTS.filter((x) => x.roleCode === roleCode && x.isActive).length;
  el.refAssignments.textContent = String(a);
  el.refGrants.textContent = String(g);
}

function updateAdminHint() {
  const isAdmin = el.fIsAdmin.value === '1';
  el.adminHint.parentElement?.classList.remove('notice--warn');
  if (!formReadOnly && isAdmin) {
    // subtle in-form reminder
    el.adminHint.textContent = '⚠ IsAdmin=1 通常代表繞過細節權限檢查；正式系統應要求輸入原因並寫安全日誌。';
  } else {
    el.adminHint.textContent = 'IsAdmin 異動屬高風險事件；正式系統應記錄原因與安全日誌';
  }
}

function validateTagsLive() {
  const s = (el.fTags.value || '').trim();
  if (!s) {
    el.tagsState.textContent = '（可空）若填寫需為合法 JSON。';
    return true;
  }
  try {
    JSON.parse(s);
    el.tagsState.textContent = 'JSON ✅';
    return true;
  } catch {
    el.tagsState.textContent = 'JSON ❌（格式不合法）';
    return false;
  }
}

// ------------------------ Save / Delete ------------------------

function onSave() {
  if (drawerState.mode === 'detail') return;

  hideFormError();

  const payload = readPayload();
  const v = validatePayload(payload);
  if (!v.ok) {
    showFormError(v.message);
    return;
  }

  if (drawerState.mode === 'add') {
    const now = nowIso();
    /** @type {AuthRole} */
    const r = {
      roleId: payload.roleId,
      roleCode: payload.roleCode,
      roleName: payload.roleName,
      roleDesc: payload.roleDesc,
      isAdmin: payload.isAdmin,
      isActive: payload.isActive,
      priority: payload.priority,
      tags: payload.tags,
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    };
    ROLES.push(r);
    showNotice(`已新增：${r.roleCode}`);
    closeDrawer();
    render();
    return;
  }

  // edit
  const roleId = drawerState.roleId;
  const existing = roleId ? getById(roleId) : null;
  if (!existing) return;

  const currentVersion = Number(el.fRowVersion.value || '0');
  if (existing.rowVersion !== currentVersion) {
    showFormError(`RowVersion 不一致：目前=${existing.rowVersion}，表單=${currentVersion}。請重新開啟再編輯。`);
    return;
  }

  existing.roleName = payload.roleName;
  existing.roleDesc = payload.roleDesc;
  existing.isAdmin = payload.isAdmin;
  existing.isActive = payload.isActive;
  existing.priority = payload.priority;
  existing.tags = payload.tags;
  existing.modifiedBy = CURRENT_USER;
  existing.modifiedDate = nowIso();
  existing.rowVersion += 1;

  showNotice(`已更新：${existing.roleCode}`);
  closeDrawer();
  render();
}

function onSoftDelete(roleId) {
  const r = getById(roleId);
  if (!r) return;

  const ok = confirm(`Delete（soft）: ${r.roleCode}\n\n此動作會將 IsActive 設為 0（建議作法）。`);
  if (!ok) return;

  if (!r.isActive) {
    showNotice('已是 Inactive，未變更。');
    return;
  }

  r.isActive = false;
  r.modifiedBy = CURRENT_USER;
  r.modifiedDate = nowIso();
  r.rowVersion += 1;

  // in real system: invalidate caches for affected users
  showNotice(`已停用（IsActive=0）：${r.roleCode}`);
  render();
}

function onHardDelete() {
  const roleId = drawerState.roleId;
  const r = roleId ? getById(roleId) : null;
  if (!r) return;

  const refs = getRefsByRoleCode(r.roleCode);
  if (refs.assignments > 0 || refs.grants > 0) {
    showFormError(`不可 Hard delete：仍有參照（Assignments=${refs.assignments}, Grants=${refs.grants}）。請先解除指派與授權。`);
    return;
  }

  const ok1 = confirm(`Hard delete: ${r.roleCode}\n\n此動作會從資料集中移除角色（高風險）。是否繼續？`);
  if (!ok1) return;
  const ok2 = confirm('再次確認：真的要 Hard delete 嗎？');
  if (!ok2) return;

  ROLES = ROLES.filter((x) => x.roleId !== r.roleId);
  showNotice(`已 Hard delete：${r.roleCode}`);
  closeDrawer();
  render();
}

function readPayload() {
  const roleId = (el.fRoleId.value || '').trim();
  const roleCode = (el.fRoleCode.value || '').trim();
  return {
    roleId,
    roleCode,
    roleName: (el.fRoleName.value || '').trim(),
    roleDesc: normalizeNullable((el.fRoleDesc.value || '').trim()),
    isAdmin: (el.fIsAdmin.value || '0') === '1',
    isActive: (el.fIsActive.value || '1') === '1',
    priority: Number(el.fPriority.value || 'NaN'),
    tags: normalizeNullable((el.fTags.value || '').trim()),
  };
}

function validatePayload(p) {
  if (!p.roleId) return bad('RoleId 缺失');
  if (!p.roleCode) return bad('RoleCode 為必填');
  if (!p.roleName) return bad('RoleName 為必填');
  if (!Number.isFinite(p.priority)) return bad('Priority 必須為數字');

  // RoleCode unique (case-insensitive)
  const dup = ROLES.find((r) => r.roleCode.toLowerCase() === p.roleCode.toLowerCase() && (drawerState.mode === 'add' || r.roleId !== drawerState.roleId));
  if (dup) return bad(`RoleCode 重複：已存在 RoleId=${dup.roleId}`);

  // Tags JSON
  if (p.tags) {
    try { JSON.parse(p.tags); } catch { return bad('Tags 必須為合法 JSON'); }
  }

  return { ok: true, message: '' };
}

function getRefsByRoleCode(roleCode) {
  return {
    assignments: PRINCIPAL_ROLES.filter((x) => x.roleCode === roleCode && x.isActive).length,
    grants: GRANTS.filter((x) => x.roleCode === roleCode && x.isActive).length,
  };
}

function bad(message) { return { ok: false, message }; }

// ------------------------ Helpers ------------------------

function getById(roleId) {
  return ROLES.find((r) => r.roleId === roleId) ?? null;
}

function normalizeNullable(s) {
  if (!s) return null;
  return s;
}

function td(content) {
  const cell = document.createElement('td');
  if (content instanceof Node) cell.appendChild(content);
  else cell.textContent = content;
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

function footerBtn(label, kind, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.className = kind === 'primary' ? 'btn' : kind === 'danger' ? 'btn btn--danger' : 'btn btn--ghost';
  b.addEventListener('click', onClick);
  return b;
}

function showNotice(message, { error, warn } = { error: false, warn: false }) {
  el.notice.hidden = false;
  el.notice.textContent = message;
  el.notice.classList.toggle('notice--error', Boolean(error));
  el.notice.classList.toggle('notice--warn', Boolean(warn));
}

function hideNotice() {
  el.notice.hidden = true;
  el.notice.textContent = '';
  el.notice.classList.remove('notice--error');
  el.notice.classList.remove('notice--warn');
}

function showFormError(message) {
  el.formError.hidden = false;
  el.formError.textContent = message;
}

function hideFormError() {
  el.formError.hidden = true;
  el.formError.textContent = '';
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

function newId(prefix) {
  const rnd = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  return `${prefix}-${rnd()}-${rnd()}`;
}

// ------------------------ Seed ------------------------

function seedRoles() {
  const now = nowIso();
  return [
    {
      roleId: 'ROLE-00000001',
      roleCode: 'ADMIN',
      roleName: '系統管理員',
      roleDesc: '全系統管理角色（高風險）',
      isAdmin: true,
      isActive: true,
      priority: 100,
      tags: '{"isAdmin":true,"dept":"IT"}',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
    {
      roleId: 'ROLE-00000002',
      roleCode: 'PLANNER',
      roleName: '排程人員',
      roleDesc: null,
      isAdmin: false,
      isActive: true,
      priority: 30,
      tags: '{"dept":"OPS"}',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
    {
      roleId: 'ROLE-00000003',
      roleCode: 'MANAGER',
      roleName: '主管',
      roleDesc: null,
      isAdmin: false,
      isActive: true,
      priority: 60,
      tags: '{"dept":"SALES"}',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
    {
      roleId: 'ROLE-00000004',
      roleCode: 'TEMP',
      roleName: '臨時專員',
      roleDesc: '短期角色，通常需有效期管理（此處僅示意）',
      isAdmin: false,
      isActive: true,
      priority: 10,
      tags: '{"temporary":true}',
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    },
  ];
}

function seedPrincipalRoles() {
  return [
    {
      principalRoleCode: 'PR-0001',
      relationCode: 'RPR-U001-ADMIN',
      userId: 'U001',
      groupCode: null,
      roleCode: 'ADMIN',
      appCode: 'PMS',
      validFrom: null,
      validTo: null,
      priority: 100,
      isActive: true,
    },
    {
      principalRoleCode: 'PR-0002',
      relationCode: 'RPR-U002-PLANNER',
      userId: 'U002',
      groupCode: null,
      roleCode: 'PLANNER',
      appCode: 'PMS',
      validFrom: null,
      validTo: null,
      priority: 30,
      isActive: true,
    },
    {
      principalRoleCode: 'PR-0003',
      relationCode: 'RPR-G001-MANAGER',
      userId: null,
      groupCode: 'G001',
      roleCode: 'MANAGER',
      appCode: 'PMS',
      validFrom: null,
      validTo: null,
      priority: 60,
      isActive: true,
    },
  ];
}

function seedGrants() {
  return [
    {
      grantCode: 'GR-0001',
      roleCode: 'PLANNER',
      resourceKey: 'PMS:ORDER_API_LIST',
      actionCode: 'VIEW',
      effect: 1,
      isActive: true,
    },
    {
      grantCode: 'GR-0002',
      roleCode: 'TEMP',
      resourceKey: 'PMS:ORDER_API_CREATE',
      actionCode: 'CREATE',
      effect: 0,
      isActive: true,
    },
  ];
}
