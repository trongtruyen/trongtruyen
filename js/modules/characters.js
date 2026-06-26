/* characters.js — 3-layer UI: List → Quick-view Popup → Full edit Form */

import { db, save, genId } from '../storage.js';
import { getFullSchema, CORE_SCHEMAS } from '../schema.js';
import { renderFieldsInto, buildFieldEl, collectFieldValues, getAvatarDisplay, clearQuillInstances } from '../form-renderer.js';
import { addCustomField } from '../custom-fields.js';
import { showToast } from '../toast.js';
import { deriveSymbol } from '../image-utils.js';

const PAGE_SIZE = 20;
let state = {
  page: 1,
  search: '',
  filterImportance: '',
  filterAlignment: '',
  editId: null
};

/* ── Role color helper ───────────────────────────── */
function _roleStyle(role) {
  if (role === 'Nhân vật chính')      return 'background:#EDE9FE;color:#7C3AED';
  if (role === 'Nhân vật phụ')        return 'background:#DBEAFE;color:#1D4ED8';
  if (role === 'Nhân vật quần chúng') return 'background:#F3F4F6;color:#6B7280';
  return 'background:var(--char-bg);color:var(--char-color)';
}

/* ── Cleanup dangling links on delete ── */
function cleanupCharLinks(charId) {
  for (const c of db.data.characters) {
    if (Array.isArray(c.relations))
      c.relations = c.relations.filter(r => r.characterId !== charId);
  }
  for (const ch of db.data.chapters) {
    if (Array.isArray(ch.chars))
      ch.chars = ch.chars.filter(r => r.characterId !== charId);
  }
  for (const ev of db.data.events) {
    if (Array.isArray(ev.chars))
      ev.chars = ev.chars.filter(r => r.characterId !== charId);
  }
  for (const sl of db.data.storylines) {
    if (Array.isArray(sl.involvedCharacters))
      sl.involvedCharacters = sl.involvedCharacters.filter(r => r.characterId !== charId);
  }
}

/* ── List ──────────────────────────────────────────── */
export function renderCharList() {
  const wrap    = document.getElementById('char-list-wrap');
  const countEl = document.getElementById('char-count');
  if (!wrap) return;

  let items = [...db.data.characters];
  if (state.search) {
    const q = state.search.toLowerCase();
    items = items.filter(c => (c.name || '').toLowerCase().includes(q));
  }
  if (state.filterImportance)
    items = items.filter(c => (c.roleImportance || []).includes(state.filterImportance));
  if (state.filterAlignment)
    items = items.filter(c => (c.roleAlignment  || []).includes(state.filterAlignment));

  items.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
  countEl.textContent = items.length + ' nhân vật';

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  state.page = Math.min(state.page, pages);
  const pageItems = items.slice((state.page - 1) * PAGE_SIZE, state.page * PAGE_SIZE);

  if (!total) {
    wrap.innerHTML = `<div class="list-empty"><span class="empty-icon">👤</span>Chưa có nhân vật nào.<br>Bấm "+ Thêm nhân vật" để bắt đầu.</div>`;
    _renderPagination(0, 1, 1);
    return;
  }

  wrap.innerHTML = `<div class="char-card-grid">${pageItems.map(c => {
    const avatar = getAvatarDisplay(c);
    const roles  = (c.roleImportance || []);
    const desc   = c.personality || '';
    return `<div class="char-card" onclick="window._charOpenPopup('${c.id}')">
      <div class="char-card-avatar" style="background:var(--char-bg)">${avatar}</div>
      <div class="char-card-name">${c.name || 'Chưa đặt tên'}</div>
      ${roles.length ? `<div class="char-card-roles">${roles.map(r => `<span class="char-card-role" style="${_roleStyle(r)}">${r}</span>`).join('')}</div>` : ''}
      ${desc ? `<div class="char-card-desc">${desc.substring(0, 80)}${desc.length > 80 ? '…' : ''}</div>` : ''}
    </div>`;
  }).join('')}</div>`;

  _renderPagination(total, state.page, pages);
}

function _renderPagination(total, page, pages) {
  const pg = document.getElementById('char-pagination');
  if (!pg) return;
  if (pages <= 1) { pg.innerHTML = ''; return; }
  let html = `<button ${page===1?'disabled':''} onclick="window._charPage(${page-1})">‹</button>`;
  for (let i = 1; i <= pages; i++)
    html += `<button class="${i===page?'active':''}" onclick="window._charPage(${i})">${i}</button>`;
  html += `<button ${page===pages?'disabled':''} onclick="window._charPage(${page+1})">›</button>`;
  pg.innerHTML = html;
}

window._charPage = (p) => { state.page = p; renderCharList(); };

export function initCharToolbar() {
  const search  = document.getElementById('char-search');
  const filterI = document.getElementById('char-filter-importance');
  const filterA = document.getElementById('char-filter-alignment');
  if (search)  search.oninput   = (e) => { state.search            = e.target.value; state.page = 1; renderCharList(); };
  if (filterI) filterI.onchange = (e) => { state.filterImportance  = e.target.value; state.page = 1; renderCharList(); };
  if (filterA) filterA.onchange = (e) => { state.filterAlignment   = e.target.value; state.page = 1; renderCharList(); };
}

/* ── Quick-view Popup ──────────────────────────────── */
window._charOpenPopup = (charId) => {
  const c = db.data.characters.find(x => x.id === charId);
  if (!c) return;
  const overlay = document.getElementById('char-popup-overlay');
  const box     = overlay.querySelector('.modal-box');

  const avatar    = getAvatarDisplay(c);
  const importance = (c.roleImportance || []).map(t => `<span class="tag" style="border-color:var(--char-color);color:var(--char-color)">${t}</span>`).join(' ');
  const alignment  = (c.roleAlignment  || []).map(t => `<span class="tag">${t}</span>`).join(' ');

  const relHtml = (c.relations || []).map(r => {
    const target = db.data.characters.find(x => x.id === r.characterId);
    if (!target) return '';
    return `<div class="reverse-link-item">
      <a onclick="window._charClosePopup();window._charOpenPopup('${target.id}')">${target.name}</a>
      ${r.note ? `— ${r.note}` : ''}
    </div>`;
  }).join('');

  box.innerHTML = `
    <div class="modal-header">
      <div class="modal-avatar" style="background:var(--char-bg)">${avatar}</div>
      <div style="flex:1">
        <div class="modal-title">${c.name || 'Chưa đặt tên'}</div>
        <div class="tags-wrap" style="margin-top:6px">${importance}${alignment}</div>
      </div>
      <button class="modal-close" onclick="window._charClosePopup()">✕</button>
    </div>
    ${_popupField('Giới tính', c.gender)}
    ${_popupField('Tuổi', c.age)}
    ${_popupField('Tính cách', c.personality)}
    ${relHtml ? `<div class="modal-field"><div class="modal-field-label">Mối quan hệ</div><div class="reverse-links">${relHtml}</div></div>` : ''}
    <div class="modal-actions">
      <button class="btn" onclick="window._charClosePopup()">Đóng</button>
      <button class="btn btn-primary" onclick="window._charClosePopup();window._charEditById('${c.id}')">✎ Chỉnh sửa</button>
    </div>`;

  overlay.classList.add('open');
};

function _popupField(label, val) {
  if (!val) return '';
  return `<div class="modal-field"><div class="modal-field-label">${label}</div><div class="modal-field-value">${val}</div></div>`;
}

window._charClosePopup = () => {
  document.getElementById('char-popup-overlay').classList.remove('open');
};

/* ── Full edit Form ────────────────────────────────── */
export function showCharForm(charId = null) {
  state.editId = charId;
  const c    = charId ? (db.data.characters.find(x => x.id === charId) || {}) : {};
  const visOpt = c.visibleOptionalFields || [];

  document.getElementById('char-view').style.display  = 'none';
  document.getElementById('char-form').style.display  = 'block';
  document.getElementById('char-form-title').textContent = charId ? (c.name || 'Nhân vật') : 'Nhân vật mới';
  document.getElementById('c-delete-btn').style.display  = charId ? 'inline-flex' : 'none';

  _renderCharFormFields(c, visOpt);
}

window._charEditById = (charId) => showCharForm(charId);

function _renderCharFormFields(c, visOpt) {
  clearQuillInstances();

  const { customFields } = getFullSchema('characters', db, visOpt);
  const alwaysShown = CORE_SCHEMAS.characters.alwaysShown;
  const optional    = CORE_SCHEMAS.characters.optional;
  const opts = { moduleName: 'characters', currentEntryId: c.id, onCustomRemove: () => showCharForm(state.editId) };

  // 1. Always-shown core fields
  renderFieldsInto(document.getElementById('char-core-fields'), alwaysShown, c, 'char', opts);

  // Re-populate avatar
  const avatarPreview = document.getElementById('char-avatar-preview');
  if (avatarPreview) {
    if (c.avatar) {
      avatarPreview.innerHTML = `<img src="${c.avatar}" alt="avatar">`;
      avatarPreview.dataset.value = c.avatar;
    } else if (c.avatarSymbol) {
      avatarPreview.textContent = c.avatarSymbol;
      avatarPreview.dataset.symbol = c.avatarSymbol;
    } else {
      avatarPreview.textContent = deriveSymbol(c.gender, c.roleAlignment || []);
    }
  }

  // 2. Visible optional fields (with individual "✕ Ẩn" button)
  _renderVisibleOptionals(optional, visOpt, c, opts);

  // 3. "Add optional field" chips (for remaining hidden optional fields)
  _renderOptionalChips(optional, visOpt);

  // 4. Custom fields
  const customWithMeta = customFields.map(f => ({ ...f, isCustom: true, moduleName: 'characters' }));
  const customContainer = document.getElementById('char-custom-fields');
  if (customWithMeta.length) {
    renderFieldsInto(customContainer, customWithMeta, c, 'char', opts);
  } else {
    customContainer.innerHTML = '<p style="font-size:12px;color:var(--ink-faint)">Chưa có trường tùy chỉnh. Thêm bên dưới nếu cần.</p>';
  }
}

function _renderVisibleOptionals(optional, visOpt, c, opts) {
  const container = document.getElementById('char-visible-optionals');
  if (!container) return;
  container.innerHTML = '';

  const visibleOpts = optional.filter(f => visOpt.includes(f.id));
  if (!visibleOpts.length) return;

  for (const f of visibleOpts) {
    const fieldEl = buildFieldEl(f, c[f.id], 'char', opts);
    if (!fieldEl) continue;

    // Append "✕ Ẩn" button to the flex label row (field-label-row has justify-content:space-between)
    const labelRow = fieldEl.querySelector('.field-label-row');
    if (labelRow) {
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.className = 'optional-remove-btn';
      removeBtn.textContent = '✕ Ẩn';
      removeBtn.onclick = () => window._charToggleOptional(f.id, false);
      labelRow.appendChild(removeBtn);
    }

    container.appendChild(fieldEl);
  }
}

function _renderOptionalChips(optional, visOpt) {
  const area = document.getElementById('char-optional-area');
  if (!area) return;

  const hidden = optional.filter(f => !visOpt.includes(f.id));
  if (!hidden.length) { area.innerHTML = ''; return; }

  area.innerHTML = `<div class="optional-add-row">
    <span class="optional-add-label">Thêm thông tin (${hidden.length} trường chưa hiển thị):</span>
    <div class="optional-chips">
      ${hidden.map(f => `<button class="optional-chip" onclick="window._charToggleOptional('${f.id}', true)">+ ${f.label}</button>`).join('')}
      ${hidden.length > 1 ? `<button class="optional-chip optional-chip-all" onclick="window._charAddAllOptional()">Thêm tất cả (${hidden.length})</button>` : ''}
    </div>
  </div>`;
}

window._charToggleOptional = (fieldId, show) => {
  const c   = state.editId ? (db.data.characters.find(x => x.id === state.editId) || {}) : {};
  let vis   = Array.isArray(c.visibleOptionalFields) ? [...c.visibleOptionalFields] : [];

  if (show) {
    if (!vis.includes(fieldId)) vis.push(fieldId);
  } else {
    const hasData = c[fieldId] && c[fieldId].toString().trim();
    if (hasData && !confirm('Ẩn trường này? Dữ liệu vẫn được giữ lại và sẽ hiện lại nếu bạn bật trường này trở lại.')) return;
    vis = vis.filter(x => x !== fieldId);
  }

  _saveVisibleOptionals(vis);
  _renderCharFormFields({ ...c, ...(_collectCurrentForm(c)) }, vis);
};

window._charAddAllOptional = () => {
  const c   = state.editId ? (db.data.characters.find(x => x.id === state.editId) || {}) : {};
  const vis = CORE_SCHEMAS.characters.optional.map(f => f.id);
  _saveVisibleOptionals(vis);
  _renderCharFormFields({ ...c, ...(_collectCurrentForm(c)) }, vis);
};

function _saveVisibleOptionals(vis) {
  if (!state.editId) return;
  const idx = db.data.characters.findIndex(x => x.id === state.editId);
  if (idx >= 0) {
    db.data.characters[idx].visibleOptionalFields = vis;
    save();
  }
}

function _collectCurrentForm(c) {
  const vis = c.visibleOptionalFields || [];
  const { coreFields, customFields } = getFullSchema('characters', db, vis);
  return collectFieldValues([...coreFields, ...customFields], 'char');
}

export function saveCharacter() {
  const c   = state.editId ? (db.data.characters.find(x => x.id === state.editId) || {}) : {};
  const vis = c.visibleOptionalFields || [];
  const { coreFields, customFields } = getFullSchema('characters', db, vis);
  const values = collectFieldValues([...coreFields, ...customFields], 'char');

  if (!values.name?.trim())           { showToast('⚠ Vui lòng nhập tên nhân vật'); return; }
  if (!(values.roleImportance?.length)) { showToast('⚠ Chọn ít nhất 1 tầm quan trọng'); return; }
  if (!(values.roleAlignment?.length))  { showToast('⚠ Chọn ít nhất 1 phe'); return; }

  values.visibleOptionalFields = vis;

  if (state.editId) {
    const idx = db.data.characters.findIndex(x => x.id === state.editId);
    db.data.characters[idx] = { ...db.data.characters[idx], ...values };
  } else {
    values.id = genId('char');
    db.data.characters.push(values);
  }
  save();
  showToast('Đã lưu nhân vật ✓');
  cancelCharForm();
}

export function deleteCharacter() {
  if (!state.editId) return;
  if (!confirm('Xóa nhân vật này? Mọi liên kết đến nhân vật này sẽ tự động bị xóa.')) return;
  cleanupCharLinks(state.editId);
  db.data.characters = db.data.characters.filter(c => c.id !== state.editId);
  save();
  showToast('Đã xóa nhân vật ✓');
  cancelCharForm();
}

export function cancelCharForm() {
  document.getElementById('char-form').style.display = 'none';
  document.getElementById('char-view').style.display = 'block';
  state.editId = null;
  renderCharList();
}

export function charAddCustomField() {
  addCustomField('characters', 'char-newfield-name', 'char-newfield-type', () => {
    const c = state.editId ? (db.data.characters.find(x => x.id === state.editId) || {}) : {};
    _renderCharFormFields(c, c.visibleOptionalFields || []);
  });
}
