/* AuthTokens prototype (pure JS, in-memory) */

const APP_CODE = 'PMS';
const SOURCE = 'PMS';
const CURRENT_USER = 'System';

/** @typedef {{
 * tokenId: number;
 * token: string;
 * tokenHashHex: string; // 64 hex chars (represents VARBINARY(32))
 * userId: string;
 * source: string;
 * appCode: string;
 * effectiveUserId: (string|null);
 * issuedAt: string;
 * expiresAt: string;
 * isRevoked: boolean;
 * createdBy: (string|null);
 * createdDate: (string|null);
 * modifiedBy: (string|null);
 * modifiedDate: (string|null);
 * rowVersion: number;
 * }} AuthToken
 */

/** @type {{userId: string}[]} */
const USERS = [
  { userId: 'Emp123' },
  { userId: 'Emp456' },
  { userId: 'Admin01' },
];

/** @type {AuthToken[]} */
let TOKENS = [];
let nextTokenId = 1;

const el = {
  queryForm: document.getElementById('queryForm'),
  qAppCode: document.getElementById('qAppCode'),
  qSource: document.getElementById('qSource'),
  qUserId: document.getElementById('qUserId'),
  qTokenHash: document.getElementById('qTokenHash'),
  qIsRevoked: document.getElementById('qIsRevoked'),
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

  fTokenId: document.getElementById('fTokenId'),
  fUserId: document.getElementById('fUserId'),
  fAppCode: document.getElementById('fAppCode'),
  fSource: document.getElementById('fSource'),
  fEffectiveUserId: document.getElementById('fEffectiveUserId'),
  fToken: document.getElementById('fToken'),
  fTokenHash: document.getElementById('fTokenHash'),
  fIssuedAt: document.getElementById('fIssuedAt'),
  fExpiresAt: document.getElementById('fExpiresAt'),
  fIsRevoked: document.getElementById('fIsRevoked'),
  fCreatedBy: document.getElementById('fCreatedBy'),
  fCreatedDate: document.getElementById('fCreatedDate'),
  fModifiedBy: document.getElementById('fModifiedBy'),
  fModifiedDate: document.getElementById('fModifiedDate'),
  fRowVersion: document.getElementById('fRowVersion'),
};

/** @type {{mode: 'detail'|'edit'|'add', tokenId: (number|null), expectedRowVersion: (number|null)}} */
let drawerState = { mode: 'detail', tokenId: null, expectedRowVersion: null };

init();

function init() {
  el.qAppCode.value = APP_CODE;
  el.qSource.value = SOURCE;
  fillSelect(el.fUserId, USERS.map((u) => ({ value: u.userId, label: u.userId })));

  TOKENS = seedTokens();

  el.queryForm.addEventListener('submit', (e) => {
    e.preventDefault();
    hideNotice();
    render();
  });

  el.btnAddNew.addEventListener('click', () => openDrawerAdd());
  el.drawerOverlay.addEventListener('click', () => closeDrawer());
  el.drawerClose.addEventListener('click', () => closeDrawer());

  // Recompute hash when token changes (Add only; Edit token is locked)
  el.fToken.addEventListener('input', () => {
    if (drawerState.mode !== 'add') return;
    scheduleHashCompute();
  });

  render();
}

function render() {
  const filtered = applyQuery(getQuery(), TOKENS);
  el.resultMeta.textContent = `共 ${filtered.length} 筆`;
  el.tbody.innerHTML = '';

  for (const r of filtered) {
    const tr = document.createElement('tr');
    tr.appendChild(td(mono(String(r.tokenId))));
    tr.appendChild(td(mono(r.userId)));
    tr.appendChild(td(mono(r.appCode)));
    tr.appendChild(td(mono(r.source)));
    tr.appendChild(td(mono(r.issuedAt.replace('T', ' '))));
    tr.appendChild(td(mono(r.expiresAt.replace('T', ' '))));
    tr.appendChild(td(revokePill(r.isRevoked)));
    tr.appendChild(td(r.effectiveUserId ?? ''));
    tr.appendChild(td(mono(shortHash(r.tokenHashHex))));

    const actionTd = document.createElement('td');
    const wrap = document.createElement('div');
    wrap.className = 'actions';
    wrap.appendChild(actionBtn('Detail', () => openDrawerDetail(r.tokenId)));
    wrap.appendChild(actionBtn('Edit', () => openDrawerEdit(r.tokenId)));
    wrap.appendChild(actionBtn('Delete(Revoke)', () => onRevoke(r.tokenId), 'danger'));
    actionTd.appendChild(wrap);
    tr.appendChild(actionTd);
    el.tbody.appendChild(tr);
  }
}

function getQuery() {
  return {
    appCode: APP_CODE,
    source: SOURCE,
    userId: (el.qUserId.value || '').trim(),
    tokenHash: (el.qTokenHash.value || '').trim().toLowerCase(),
    isRevoked: (el.qIsRevoked.value || '').trim(),
  };
}

function applyQuery(q, rows) {
  const contains = (hay, needle) => (hay || '').toLowerCase().includes((needle || '').toLowerCase());
  return rows.filter((r) => {
    if (q.appCode && r.appCode !== q.appCode) return false;
    if (q.source && r.source !== q.source) return false;
    if (q.userId && !contains(r.userId, q.userId)) return false;
    if (q.tokenHash && !contains(r.tokenHashHex, q.tokenHash)) return false;
    if (q.isRevoked) {
      const want = q.isRevoked === '1';
      if (r.isRevoked !== want) return false;
    }
    return true;
  });
}

// ------------------------ Drawer ------------------------

function openDrawerDetail(tokenId) {
  const r = getById(tokenId);
  if (!r) return;
  drawerState = { mode: 'detail', tokenId, expectedRowVersion: r.rowVersion };
  el.drawerTitle.textContent = 'Detail – AuthTokens';
  el.drawerSubTitle.textContent = `TokenId=${r.tokenId} / UserId=${r.userId}`;
  fillForm(r, { readOnly: true });
  setFooterMode('detail');
  openDrawer();
}

function openDrawerEdit(tokenId) {
  const r = getById(tokenId);
  if (!r) return;
  drawerState = { mode: 'edit', tokenId, expectedRowVersion: r.rowVersion };
  el.drawerTitle.textContent = 'Edit – AuthTokens';
  el.drawerSubTitle.textContent = `TokenId=${r.tokenId} / UserId=${r.userId}`;
  fillForm(r, { readOnly: false });
  setFooterMode('edit');
  openDrawer();
}

function openDrawerAdd() {
  drawerState = { mode: 'add', tokenId: null, expectedRowVersion: null };
  el.drawerTitle.textContent = 'Add New – AuthTokens';
  el.drawerSubTitle.textContent = '注意：正式系統 Token 應由登入流程簽發，此處僅為 prototype 模擬。';

  const now = nowIso();
  /** @type {AuthToken} */
  const blank = {
    tokenId: 0,
    token: '',
    tokenHashHex: '',
    userId: USERS[0]?.userId ?? 'Emp123',
    source: SOURCE,
    appCode: APP_CODE,
    effectiveUserId: null,
    issuedAt: now,
    expiresAt: addHours(now, 8),
    isRevoked: false,
    createdBy: CURRENT_USER,
    createdDate: now,
    modifiedBy: null,
    modifiedDate: null,
    rowVersion: 1,
  };
  fillForm(blank, { readOnly: false });
  setFooterMode('edit');
  openDrawer();
  scheduleHashCompute();
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
  el.fTokenId.value = r.tokenId ? String(r.tokenId) : '';
  el.fUserId.value = r.userId;
  el.fAppCode.value = r.appCode;
  el.fSource.value = r.source;
  el.fEffectiveUserId.value = r.effectiveUserId ?? '';
  el.fToken.value = r.token;
  el.fTokenHash.value = r.tokenHashHex;
  el.fIssuedAt.value = r.issuedAt;
  el.fExpiresAt.value = toDatetimeLocal(r.expiresAt);
  el.fIsRevoked.value = r.isRevoked ? '1' : '0';
  el.fCreatedBy.value = r.createdBy ?? '';
  el.fCreatedDate.value = r.createdDate ?? '';
  el.fModifiedBy.value = r.modifiedBy ?? '';
  el.fModifiedDate.value = r.modifiedDate ?? '';
  el.fRowVersion.value = String(r.rowVersion ?? '');

  // immutables
  el.fUserId.disabled = ro || drawerState.mode !== 'add';
  el.fEffectiveUserId.disabled = ro;
  el.fToken.disabled = ro || drawerState.mode !== 'add';
  el.fExpiresAt.disabled = ro;

  // IsRevoked can only move 0 -> 1
  el.fIsRevoked.disabled = ro;
}

// ------------------------ Commands ------------------------

async function onSave() {
  hideFormError();
  const mode = drawerState.mode;
  if (mode !== 'add' && mode !== 'edit') return;

  const draft = await readFormAndComputeHashIfNeeded();
  const { ok, errors } = validateDraft(draft, { mode });
  if (!ok) {
    showFormError(errors.join('\n'));
    return;
  }

  if (mode === 'add') {
    const now = nowIso();
    /** @type {AuthToken} */
    const row = {
      ...draft,
      tokenId: nextTokenId++,
      issuedAt: draft.issuedAt || now,
      createdBy: CURRENT_USER,
      createdDate: now,
      modifiedBy: null,
      modifiedDate: null,
      rowVersion: 1,
    };
    TOKENS = [row].concat(TOKENS);
    showNotice(`已新增 TokenId=${row.tokenId}（提示：正式系統應由簽發流程寫入）`, 'ok');
    closeDrawer();
    render();
    return;
  }

  // edit
  if (drawerState.tokenId == null) return;
  const current = getById(drawerState.tokenId);
  if (!current) {
    showFormError('找不到資料（可能已被清理或清單重整）。');
    return;
  }
  if (drawerState.expectedRowVersion !== null && current.rowVersion !== drawerState.expectedRowVersion) {
    showFormError(`RowVersion mismatch：目前=${current.rowVersion}，表單=${drawerState.expectedRowVersion}。請重新開啟再編輯。`);
    return;
  }

  if (current.isRevoked && !draft.isRevoked) {
    showFormError('安全性規則：Token 一旦 Revoked，不可復原。');
    return;
  }

  const now = nowIso();
  const updated = {
    ...current,
    // immutable: token/tokenHash/userId/appCode/source/issuedAt
    expiresAt: draft.expiresAt,
    effectiveUserId: draft.effectiveUserId,
    isRevoked: current.isRevoked ? true : draft.isRevoked,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };
  TOKENS = TOKENS.map((x) => (x.tokenId === current.tokenId ? updated : x));
  showNotice(`已更新 TokenId=${updated.tokenId}`, 'warn');
  closeDrawer();
  render();
}

function onRevoke(tokenId) {
  hideNotice();
  const current = getById(tokenId);
  if (!current) return;
  if (current.isRevoked) {
    showNotice('此 Token 已是 Revoked。', 'warn');
    return;
  }
  const ok = confirm(`確定要撤銷此 Token？\nTokenId=${current.tokenId}\nUserId=${current.userId}\n\n（動作：IsRevoked=1）`);
  if (!ok) return;
  const now = nowIso();
  const updated = {
    ...current,
    isRevoked: true,
    modifiedBy: CURRENT_USER,
    modifiedDate: now,
    rowVersion: current.rowVersion + 1,
  };
  TOKENS = TOKENS.map((x) => (x.tokenId === current.tokenId ? updated : x));
  showNotice(`已撤銷 TokenId=${updated.tokenId}（Force Logout）`, 'warn');
  render();
}

// ------------------------ Validation / Form ------------------------

function validateDraft(d, { mode }) {
  /** @type {string[]} */
  const errors = [];
  if (!d.userId) errors.push('UserId 必填');
  if (!d.appCode) errors.push('AppCode 必填');
  if (!d.source) errors.push('Source 必填');
  if (!d.issuedAt) errors.push('IssuedAt 必填');
  if (!d.expiresAt) errors.push('ExpiresAt 必填');
  if (!d.token) errors.push('Token 必填（prototype 模擬簽發）');
  if (!d.tokenHashHex || d.tokenHashHex.length !== 64) errors.push('TokenHash 必須為 64 hex chars（代表 32 bytes）');

  if (d.issuedAt && d.expiresAt && d.expiresAt <= d.issuedAt) {
    errors.push('生命週期約束：ExpiresAt 必須 > IssuedAt');
  }

  if (mode === 'add') {
    // In DB this is identity PK; here we avoid duplicate hashes as a sanity check.
    const dup = TOKENS.some((x) => x.tokenHashHex.toLowerCase() === d.tokenHashHex.toLowerCase());
    if (dup) errors.push('TokenHash 已存在（prototype sanity check）');
  }

  return { ok: errors.length === 0, errors };
}

async function readFormAndComputeHashIfNeeded() {
  const token = (el.fToken.value || '').trim();
  const tokenHashHex = token ? await computeTokenHashHex(token) : '';
  el.fTokenHash.value = tokenHashHex;

  const issuedAt = (el.fIssuedAt.value || '').trim();
  const expiresAtLocal = (el.fExpiresAt.value || '').trim();
  const expiresAt = expiresAtLocal ? expiresAtLocal.replace('T', ' ') + ':00' : '';
  const isRevoked = String(el.fIsRevoked.value) === '1';
  const effectiveUserId = (el.fEffectiveUserId.value || '').trim() || null;

  return {
    token,
    tokenHashHex,
    userId: (el.fUserId.value || '').trim(),
    source: SOURCE,
    appCode: APP_CODE,
    effectiveUserId,
    issuedAt,
    expiresAt,
    isRevoked,
  };
}

let hashComputeTimer = null;
function scheduleHashCompute() {
  if (hashComputeTimer) clearTimeout(hashComputeTimer);
  hashComputeTimer = setTimeout(async () => {
    const token = (el.fToken.value || '').trim();
    el.fTokenHash.value = token ? await computeTokenHashHex(token) : '';
  }, 180);
}

// ------------------------ Hashing ------------------------

async function computeTokenHashHex(token) {
  // Prefer real SHA-256 if available; fallback to deterministic non-crypto hash.
  try {
    if (globalThis.crypto?.subtle && globalThis.TextEncoder) {
      const bytes = new TextEncoder().encode(token);
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return bufToHex(digest);
    }
  } catch {
    // fall through
  }
  return fakeSha256Hex(token);
}

function bufToHex(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let hex = '';
  for (const b of bytes) hex += b.toString(16).padStart(2, '0');
  return hex;
}

function fakeSha256Hex(s) {
  // Not cryptographically secure. Only for prototype/demo when WebCrypto is unavailable.
  // Produces 64 hex chars deterministically.
  let h1 = 2166136261 >>> 0;
  let h2 = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 ^= c; h1 = Math.imul(h1, 16777619) >>> 0;
    h2 ^= (c + i) & 0xff; h2 = Math.imul(h2, 16777619) >>> 0;
  }
  let out = '';
  let x = h1;
  let y = h2;
  for (let i = 0; i < 32; i++) {
    x = (x + 0x9e3779b9 + (y ^ (y >>> 16))) >>> 0;
    y = (y + 0x85ebca6b + (x ^ (x >>> 13))) >>> 0;
    const byte = (x ^ y ^ (x >>> 8) ^ (y >>> 7)) & 0xff;
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
}

// ------------------------ UI Helpers ------------------------

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

function revokePill(isRevoked) {
  const span = document.createElement('span');
  span.className = `pill ${isRevoked ? 'pill--revoked' : 'pill--valid'}`;
  span.textContent = isRevoked ? 'REVOKED' : 'VALID';
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

function shortHash(hex64) {
  if (!hex64) return '';
  if (hex64.length <= 14) return hex64;
  return `${hex64.slice(0, 10)}…${hex64.slice(-4)}`;
}

function getById(tokenId) {
  return TOKENS.find((x) => x.tokenId === tokenId) || null;
}

function nowIso() {
  return new Date().toISOString().slice(0, 19);
}

function addHours(iso, hours) {
  const d = new Date(iso.replace(' ', 'T') + 'Z');
  d.setUTCHours(d.getUTCHours() + hours);
  return d.toISOString().slice(0, 19);
}

function toDatetimeLocal(isoLike) {
  const s = String(isoLike || '').replace('T', ' ');
  const m = s.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2})(?::\d{2})?/);
  if (!m) return '';
  return `${m[1]}T${m[2]}`;
}

// ------------------------ Seed ------------------------

function seedTokens() {
  const now = nowIso();
  const rows = [
    makeSeedToken({
      userId: 'Emp123',
      token: 'eyJhbGciOi...Emp123.sample.token',
      effectiveUserId: null,
      issuedAt: now,
      expiresAt: addHours(now, 8),
      isRevoked: false,
    }),
    makeSeedToken({
      userId: 'Emp456',
      token: 'eyJhbGciOi...Emp456.sample.token',
      effectiveUserId: 'Admin01',
      issuedAt: now,
      expiresAt: addHours(now, 2),
      isRevoked: true,
    }),
  ];
  return rows;
}

function makeSeedToken({ userId, token, effectiveUserId, issuedAt, expiresAt, isRevoked }) {
  const tokenId = nextTokenId++;
  const tokenHashHex = fakeSha256Hex(token);
  return {
    tokenId,
    token,
    tokenHashHex,
    userId,
    source: SOURCE,
    appCode: APP_CODE,
    effectiveUserId,
    issuedAt,
    expiresAt,
    isRevoked,
    createdBy: CURRENT_USER,
    createdDate: issuedAt,
    modifiedBy: null,
    modifiedDate: null,
    rowVersion: 1,
  };
}
