/* worlds.js — World Setting list module */

import { db, save, genId } from '../storage.js';
import { getFullSchema } from '../schema.js';
import { renderFieldsInto, collectFieldValues, buildFieldEl } from '../form-renderer.js';
import { addCustomField } from '../custom-fields.js';
import { showToast } from '../toast.js';

let editId = null;

export function renderWorldList() {
  const wrap  = document.getElementById('world-list-wrap');
  const count = document.getElementById('world-count');
  if (!wrap) return;

  const worlds = db.data.worlds || [];
  count.textContent = worlds.length + ' thế giới';

  if (!worlds.length) {
    wrap.innerHTML = `<div class="list-empty"><span class="empty-icon">🌍</span>Chưa có thế giới nào được thiết lập.<br>Bấm "+ Thế giới mới" để bắt đầu.</div>`;
    return;
  }

  wrap.innerHTML = worlds.map(w => `
    <div class="list-item" onclick="window._worldEdit('${w.id}')">
      <div class="list-item-left">
        <div class="list-item-icon" style="background:var(--world-bg);color:var(--world-color)">🌍</div>
        <div>
          <div class="list-item-title">${w.title || 'Chưa đặt tên'}</div>
          <div class="list-item-sub">${w.spacetime || ''}</div>
        </div>
      </div>
      <span class="list-chevron">›</span>
    </div>`).join('');
}

export function showWorldForm(worldId = null) {
  editId = worldId;
  const w = worldId ? (db.data.worlds.find(x => x.id === worldId) || {}) : {};

  document.getElementById('world-view').style.display = 'none';
  document.getElementById('world-form').style.display = 'block';
  document.getElementById('world-form-title').textContent = worldId ? (w.title || 'Thế giới') : 'Thế giới mới';
  document.getElementById('world-delete-btn').style.display = worldId ? 'inline-flex' : 'none';

  _renderWorldFormFields(w);
}

window._worldEdit = (id) => showWorldForm(id);

function _renderWorldFormFields(w) {
  const { coreFields, customFields } = getFullSchema('worlds', db);
  const opts = { moduleName: 'worlds', onCustomRemove: () => showWorldForm(editId) };

  // Top: basic info
  renderFieldsInto(
    document.getElementById('world-top-fields'),
    coreFields.filter(f => ['title', 'spacetime', 'desc'].includes(f.id)),
    w, 'world', opts
  );

  // 3-col: environment | society | politics + history
  const renderCol = (elId, fieldIds) => {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = '';
    for (const fid of fieldIds) {
      const field = coreFields.find(f => f.id === fid);
      if (field) el.appendChild(buildFieldEl(field, w[fid], 'world', opts));
    }
  };
  renderCol('world-col-env', ['environment']);
  renderCol('world-col-soc', ['society']);
  renderCol('world-col-pol', ['politics', 'history']);

  // Bottom: exception + notes
  renderFieldsInto(
    document.getElementById('world-bottom-fields'),
    coreFields.filter(f => ['exception', 'notes'].includes(f.id)),
    w, 'world', opts
  );

  const customWithMeta = customFields.map(f => ({ ...f, isCustom: true, moduleName: 'worlds' }));
  const customContainer = document.getElementById('world-custom-fields');
  if (customWithMeta.length) {
    renderFieldsInto(customContainer, customWithMeta, w, 'world', opts);
  } else {
    customContainer.innerHTML = '<p style="font-size:12px;color:var(--ink-faint)">Chưa có trường tùy chỉnh.</p>';
  }
}

export function saveWorld() {
  const { coreFields, customFields } = getFullSchema('worlds', db);
  const values = collectFieldValues([...coreFields, ...customFields], 'world');

  if (!values.title?.trim()) { showToast('⚠ Vui lòng nhập tên thế giới'); return; }

  if (editId) {
    const idx = db.data.worlds.findIndex(x => x.id === editId);
    db.data.worlds[idx] = { ...db.data.worlds[idx], ...values };
  } else {
    values.id = genId('world');
    db.data.worlds.push(values);
  }
  save();
  showToast('Đã lưu thiết lập ✓');
  cancelWorldForm();
}

export function deleteWorld() {
  if (!editId) return;
  if (!confirm('Xóa thế giới này?')) return;
  db.data.worlds = db.data.worlds.filter(w => w.id !== editId);
  save();
  showToast('Đã xóa ✓');
  cancelWorldForm();
}

export function cancelWorldForm() {
  document.getElementById('world-form').style.display = 'none';
  document.getElementById('world-view').style.display = 'block';
  editId = null;
  renderWorldList();
  window._navBack?.();
}

export function worldAddCustomField() {
  addCustomField('worlds', 'world-newfield-name', 'world-newfield-type', () => {
    const w = editId ? (db.data.worlds.find(x => x.id === editId) || {}) : {};
    _renderWorldFormFields(w);
  });
}
