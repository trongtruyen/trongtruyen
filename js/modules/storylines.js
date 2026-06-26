/* storylines.js — Storylines / Arcs module (NEW) */

import { db, save, genId } from '../storage.js';
import { getFullSchema } from '../schema.js';
import { renderFieldsInto, collectFieldValues } from '../form-renderer.js';
import { addCustomField } from '../custom-fields.js';
import { showToast } from '../toast.js';

let editId = null;

function _esc(s) {
  return (s || '').toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── Cleanup on deletion ─────────────────────────── */
function cleanupStorylineLinks(storyId) {
  // Remove from other storylines' relatedStorylines
  for (const sl of db.data.storylines) {
    if (Array.isArray(sl.relatedStorylines)) {
      sl.relatedStorylines = sl.relatedStorylines.filter(r => r.storylineId !== storyId);
    }
  }
  // Set chapters' storylineId to null
  for (const ch of db.data.chapters) {
    if (ch.storylineId === storyId) ch.storylineId = null;
  }
}

/* ── List ──────────────────────────────────────────── */
export function renderStorylineList() {
  const wrap  = document.getElementById('storyline-list-wrap');
  const count = document.getElementById('storyline-count');
  if (!wrap) return;

  const stories = db.data.storylines || [];
  count.textContent = stories.length + ' storyline';

  if (!stories.length) {
    wrap.innerHTML = `<div class="list-empty"><span class="empty-icon">🔀</span>Chưa có storyline nào.<br>Bấm "+ Thêm storyline" để bắt đầu.</div>`;
    return;
  }

  wrap.innerHTML = stories.map(s => {
    const linkedEvents = (s.relatedEvents || [])
      .map(r => db.data.events.find(e => e.id === r.eventId))
      .filter(Boolean);

    const evListHtml = linkedEvents.length ? `
      <details class="storyline-events-details">
        <summary class="storyline-events-summary">${linkedEvents.length} sự kiện liên quan</summary>
        <div class="storyline-events-list">
          ${linkedEvents.map(ev => `
            <div class="storyline-ev-item">
              <div class="storyline-ev-body">
                <div class="storyline-ev-title">${_esc(ev.title) || '(chưa đặt tên)'}</div>
                ${ev.desc ? `<div class="storyline-ev-sub">${_esc(ev.desc.substring(0, 70))}${ev.desc.length > 70 ? '…' : ''}</div>` : ''}
              </div>
              <div class="storyline-ev-actions">
                <button class="btn btn-sm" onclick="window._storyEvEdit('${ev.id}')">Sửa</button>
                <button class="btn btn-sm btn-danger" onclick="window._storyEvRemove('${s.id}','${ev.id}')">Gỡ</button>
              </div>
            </div>`).join('')}
        </div>
      </details>` : `<div class="storyline-no-events">Chưa có sự kiện liên quan. Thêm từ form chỉnh sửa storyline.</div>`;

    return `<div class="storyline-card">
      <div class="storyline-card-top">
        <div class="storyline-card-info">
          <div class="storyline-card-title">${_esc(s.title) || 'Chưa đặt tên'}</div>
          ${s.summary ? `<div class="storyline-card-summary">${_esc(s.summary.substring(0, 180))}${s.summary.length > 180 ? '…' : ''}</div>` : ''}
        </div>
        <button class="btn btn-sm" onclick="window._storyEdit('${s.id}')">Sửa storyline</button>
      </div>
      ${evListHtml}
    </div>`;
  }).join('');
}

window._storyEvEdit = (evId) => {
  window._returnSection = 'storylines';
  window.switchSection('timeline');
  window._evEdit?.(evId);
};

window._storyEvRemove = (storyId, evId) => {
  if (!confirm('Gỡ sự kiện này khỏi storyline? (Sự kiện vẫn còn trong Dòng thời gian)')) return;
  const s = db.data.storylines.find(x => x.id === storyId);
  if (!s) return;
  s.relatedEvents = (s.relatedEvents || []).filter(r => r.eventId !== evId);
  save();
  showToast('Đã gỡ sự kiện ✓');
  renderStorylineList();
};

export function showStorylineForm(storyId = null) {
  editId = storyId;
  const s = storyId ? (db.data.storylines.find(x => x.id === storyId) || {}) : {};

  document.getElementById('storyline-view').style.display = 'none';
  document.getElementById('storyline-form').style.display = 'block';
  document.getElementById('storyline-form-title').textContent = storyId ? (s.title || 'Storyline') : 'Storyline mới';
  document.getElementById('storyline-delete-btn').style.display = storyId ? 'inline-flex' : 'none';

  _renderStorylineFormFields(s);
}

window._storyEdit = (id) => showStorylineForm(id);

function _renderStorylineFormFields(s) {
  const { coreFields, customFields } = getFullSchema('storylines', db);
  const opts = { moduleName: 'storylines', currentEntryId: s.id, onCustomRemove: () => showStorylineForm(editId) };

  renderFieldsInto(document.getElementById('storyline-core-fields'), coreFields, s, 'story', opts);

  // Reverse links section — show storylines that link TO this one
  _renderReverseStorylineLinks(s.id);

  // Reverse chapters section — chapters that belong to this storyline
  _renderReverseChapters(s.id);

  const customWithMeta = customFields.map(f => ({ ...f, isCustom: true, moduleName: 'storylines' }));
  const customContainer = document.getElementById('storyline-custom-fields');
  if (customWithMeta.length) {
    renderFieldsInto(customContainer, customWithMeta, s, 'story', opts);
  } else {
    customContainer.innerHTML = '<p style="font-size:12px;color:var(--ink-faint)">Chưa có trường tùy chỉnh.</p>';
  }
}

function _renderReverseStorylineLinks(storyId) {
  const el = document.getElementById('storyline-reverse-links');
  if (!el || !storyId) { if (el) el.innerHTML = ''; return; }
  const linked = db.data.storylines.filter(s => s.id !== storyId &&
    (s.relatedStorylines || []).some(r => r.storylineId === storyId));
  if (!linked.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="card-header">Được liên kết từ</div>
    <div class="reverse-links">
      ${linked.map(s => `<div class="reverse-link-item"><a onclick="window._storyEdit('${s.id}')">${s.title || '(chưa đặt tên)'}</a></div>`).join('')}
    </div>`;
}

function _renderReverseChapters(storyId) {
  const el = document.getElementById('storyline-reverse-chapters');
  if (!el || !storyId) { if (el) el.innerHTML = ''; return; }
  const chapters = db.data.chapters.filter(c => c.storylineId === storyId)
    .sort((a, b) => (Number(a.num) || 0) - (Number(b.num) || 0));
  if (!chapters.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div class="card-header">Chương thuộc storyline này</div>
    <div class="reverse-links">
      ${chapters.map(c => `<div class="reverse-link-item">Chương ${c.num || '?'}: <a onclick="window._chapEditById('${c.id}')">${c.title || '(chưa đặt tên)'}</a></div>`).join('')}
    </div>`;
}

export function saveStoryline() {
  const { coreFields, customFields } = getFullSchema('storylines', db);
  const values = collectFieldValues([...coreFields, ...customFields], 'story');

  if (!values.title?.trim()) { showToast('⚠ Vui lòng nhập tên storyline'); return; }

  if (editId) {
    const idx = db.data.storylines.findIndex(x => x.id === editId);
    db.data.storylines[idx] = { ...db.data.storylines[idx], ...values };
  } else {
    values.id = genId('story');
    db.data.storylines.push(values);
  }
  save();
  showToast('Đã lưu storyline ✓');
  cancelStorylineForm();
}

export function deleteStoryline() {
  if (!editId) return;
  if (!confirm('Xóa storyline này? Các chương thuộc storyline này sẽ bị tách rời (không bị xóa).')) return;
  cleanupStorylineLinks(editId);
  db.data.storylines = db.data.storylines.filter(s => s.id !== editId);
  save();
  showToast('Đã xóa storyline ✓');
  cancelStorylineForm();
}

export function cancelStorylineForm() {
  document.getElementById('storyline-form').style.display = 'none';
  document.getElementById('storyline-view').style.display = 'block';
  editId = null;
  renderStorylineList();
  window._navBack?.();
}

export function storylineAddCustomField() {
  addCustomField('storylines', 'storyline-newfield-name', 'storyline-newfield-type', () => {
    const s = editId ? (db.data.storylines.find(x => x.id === editId) || {}) : {};
    _renderStorylineFormFields(s);
  });
}
