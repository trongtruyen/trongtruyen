/* chapters.js — Read-only table in Chương tab; editing via event form or full form */

import { db, save, genId } from '../storage.js';
import { getFullSchema } from '../schema.js';
import { renderFieldsInto, collectFieldValues } from '../form-renderer.js';
import { addCustomField } from '../custom-fields.js';
import { showToast } from '../toast.js';

let state = { editId: null };

function _sevDotColor(sev) {
  if (sev === 'Cao')       return 'var(--severity-high)';
  if (sev === 'Trung bình') return 'var(--severity-mid)';
  return 'var(--severity-low)';
}

/* ── Chapter list — grouped by event, no drag-drop ── */
export function renderChapterList() {
  const wrap  = document.getElementById('chapter-list-wrap');
  const count = document.getElementById('chap-count');
  if (!wrap) return;

  const chapters = db.data.chapters || [];
  const events   = [...(db.data.events || [])].sort(
    (a, b) => (Number(a.chronologyOrder) || 0) - (Number(b.chronologyOrder) || 0)
  );

  count.textContent = `Tổng: ${chapters.length} chương`;

  if (!chapters.length) {
    wrap.innerHTML = `<div class="list-empty">
      <span class="empty-icon">📄</span>
      Chưa có chương nào.<br>
      Vào <strong>Dòng thời gian</strong> → chọn sự kiện → bấm "Tạo chương".
    </div>`;
    return;
  }

  // Group by eventId
  const byEvent = {};
  const orphans = [];
  for (const ch of chapters) {
    if (ch.eventId) (byEvent[ch.eventId] = byEvent[ch.eventId] || []).push(ch);
    else orphans.push(ch);
  }

  let html = '';
  for (const ev of events) {
    const group = byEvent[ev.id];
    if (!group) continue;
    html += `
      <details class="chapter-group" open>
        <summary class="chapter-group-header">
          <span class="chapter-group-dot" style="background:${_sevDotColor(ev.severity)}"></span>
          <span>${ev.title || '(sự kiện chưa đặt tên)'}</span>
          <span class="chapter-group-count">${group.length} chương</span>
        </summary>
        <div class="chapter-group-body">${group.map(_chapRow).join('')}</div>
      </details>`;
  }
  if (orphans.length) {
    html += `
      <details class="chapter-group" open>
        <summary class="chapter-group-header" style="color:var(--ink-faint)">
          <span class="chapter-group-dot" style="background:var(--ink-faint)"></span>
          Chưa gán sự kiện
          <span class="chapter-group-count">${orphans.length} chương</span>
        </summary>
        <div class="chapter-group-body">${orphans.map(_chapRow).join('')}</div>
      </details>`;
  }

  wrap.innerHTML = html;
}

function _chapRow(ch) {
  return `
    <div class="ev-chap-item">
      <div class="ev-chap-item-body">
        <div class="ev-chap-item-title">${ch.title || '(Chưa đặt tên)'}</div>
        ${ch.summary ? `<div class="ev-chap-item-sub">${ch.summary.substring(0,100)}${ch.summary.length > 100 ? '…' : ''}</div>` : ''}
      </div>
      <div class="ev-chap-item-actions">
        <button class="btn btn-sm" onclick="window._chapEditById('${ch.id}')">Sửa</button>
        <button class="btn btn-sm" onclick="window._chapMoveFromList('${ch.id}')">Chuyển</button>
        <button class="btn btn-sm btn-danger" onclick="window._chapDeleteFromList('${ch.id}')">Xoá</button>
      </div>
    </div>`;
}

window._chapDeleteFromList = (chapId) => {
  if (!confirm('Xoá chương này?')) return;
  db.data.chapters = db.data.chapters.filter(c => c.id !== chapId);
  save();
  showToast('Đã xoá chương ✓');
  renderChapterList();
  window._updateTopbarTitle?.();
};

window._chapMoveFromList = (chapId) => {
  const modal = document.getElementById('move-chapter-modal');
  if (!modal) return;
  const sel = document.getElementById('move-chapter-event-select');
  const events = (db.data.events || []).sort((a, b) => (Number(a.chronologyOrder)||0) - (Number(b.chronologyOrder)||0));
  sel.innerHTML = events.map(ev => `<option value="${ev.id}">${ev.title || '(chưa đặt tên)'}</option>`).join('');
  modal.dataset.chapId = chapId;
  modal.dataset.from   = 'chapters';
  modal.classList.add('open');
};

export function initChapterToolbar() {}

/* ── Full chapter form (Sửa) ───────────────────────── */
export function showChapterForm(chapId = null) {
  state.editId = chapId;
  const c = chapId ? (db.data.chapters.find(x => x.id === chapId) || {}) : {};

  document.getElementById('chapter-view').style.display = 'none';
  document.getElementById('chapter-form').style.display = 'block';

  const ev = c.eventId ? db.data.events.find(x => x.id === c.eventId) : null;
  document.getElementById('chap-form-title').textContent =
    chapId ? (c.title || 'Chương chưa đặt tên') : (ev ? `Chương mới — ${ev.title}` : 'Chương mới');
  document.getElementById('chap-delete-btn').style.display = chapId ? 'inline-flex' : 'none';

  _renderChapterFormFields(c);
}

window._chapEditById = (id) => showChapterForm(id);

function _renderChapterFormFields(c) {
  const { coreFields, customFields } = getFullSchema('chapters', db);
  const opts = { moduleName: 'chapters', onCustomRemove: () => showChapterForm(state.editId) };
  renderFieldsInto(document.getElementById('chapter-core-fields'), coreFields, c, 'chap', opts);

  const customWithMeta = customFields.map(f => ({ ...f, isCustom: true, moduleName: 'chapters' }));
  const cc = document.getElementById('chapter-custom-fields');
  if (customWithMeta.length) {
    renderFieldsInto(cc, customWithMeta, c, 'chap', opts);
  } else {
    cc.innerHTML = '<p style="font-size:12px;color:var(--ink-faint)">Chưa có trường tùy chỉnh.</p>';
  }
}

export function saveChapter() {
  const { coreFields, customFields } = getFullSchema('chapters', db);
  const values = collectFieldValues([...coreFields, ...customFields], 'chap');

  if (state.editId) {
    const idx = db.data.chapters.findIndex(x => x.id === state.editId);
    db.data.chapters[idx] = { ...db.data.chapters[idx], ...values };
  } else {
    if (!values.eventId) { showToast('⚠ Chương phải thuộc một sự kiện'); return; }
    values.id = genId('chapter');
    db.data.chapters.push(values);
  }
  save();
  showToast('Đã lưu chương ✓');
  cancelChapterForm();
}

export function deleteChapter() {
  if (!state.editId) return;
  if (!confirm('Xóa chương này?')) return;
  db.data.chapters = db.data.chapters.filter(c => c.id !== state.editId);
  save();
  showToast('Đã xóa chương ✓');
  cancelChapterForm();
}

export function cancelChapterForm() {
  document.getElementById('chapter-form').style.display = 'none';
  document.getElementById('chapter-view').style.display = 'block';
  state.editId = null;
  renderChapterList();
  window._navBack?.();
}

export function chapterAddCustomField() {
  addCustomField('chapters', 'chap-newfield-name', 'chap-newfield-type', () => {
    const c = state.editId ? (db.data.chapters.find(x => x.id === state.editId) || {}) : {};
    _renderChapterFormFields(c);
  });
}

/* renderChapterPlan kept as no-op so main.js import doesn't break */
export function renderChapterPlan() {}
