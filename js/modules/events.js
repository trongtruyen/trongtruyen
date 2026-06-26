/* events.js — Timeline module */

import { db, save, genId } from '../storage.js';
import { getFullSchema } from '../schema.js';
import { renderFieldsInto, collectFieldValues } from '../form-renderer.js';
import { addCustomField } from '../custom-fields.js';
import { showToast } from '../toast.js';

let editId = null;

/* ── Cleanup on deletion ─────────────────────────── */
function cleanupEventLinks(eventId) {
  for (const ch of db.data.chapters) {
    if (ch.eventId === eventId) ch.eventId = null;
    if (Array.isArray(ch.relatedEvents))
      ch.relatedEvents = ch.relatedEvents.filter(r => r.eventId !== eventId);
  }
  for (const sl of db.data.storylines) {
    if (Array.isArray(sl.relatedEvents))
      sl.relatedEvents = sl.relatedEvents.filter(r => r.eventId !== eventId);
  }
}

function sevDotColor(sev) {
  if (sev === 'Cao')      return 'var(--severity-high)';
  if (sev === 'Trung bình') return 'var(--severity-mid)';
  return 'var(--severity-low)';
}
function sevClass(sev) {
  if (sev === 'Cao')      return 'severity-high';
  if (sev === 'Trung bình') return 'severity-med';
  return 'severity-low';
}

/* ── List (with drag-drop reordering) ─────────────── */
export function renderEventList() {
  const list  = document.getElementById('timeline-list');
  const count = document.getElementById('ev-count');
  if (!list) return;

  const events = [...(db.data.events || [])].sort(
    (a, b) => (Number(a.chronologyOrder) || 0) - (Number(b.chronologyOrder) || 0)
  );
  count.textContent = events.length + ' sự kiện';

  if (!events.length) {
    list.innerHTML = `<div class="list-empty"><span class="empty-icon">🕐</span>Chưa có sự kiện nào.<br>Bấm "+ Thêm sự kiện" để bắt đầu.</div>`;
    return;
  }

  list.innerHTML = events.map(ev => {
    const chapCount = (db.data.chapters || []).filter(c => c.eventId === ev.id).length;
    return `
    <div class="timeline-item" draggable="true"
         data-ev-id="${ev.id}"
         ondragstart="window._evDragStart(event,'${ev.id}')"
         ondragover="event.preventDefault();this.classList.add('drag-over')"
         ondragleave="this.classList.remove('drag-over')"
         ondrop="window._evDrop(event,'${ev.id}');this.classList.remove('drag-over')">
      <div class="timeline-dot" style="background:${sevDotColor(ev.severity)};box-shadow:0 0 0 2px ${sevDotColor(ev.severity)}40"></div>
      <div class="timeline-card ${sevClass(ev.severity)}" onclick="window._evEdit('${ev.id}')">
        <div class="timeline-meta">
          ${ev.isFlashback ? '<span style="font-size:11px;background:rgba(0,0,0,.08);padding:1px 6px;border-radius:100px">🔁 Flashback</span> ' : ''}
          ${ev.time || ''}
          <span style="float:right;font-size:11px;font-weight:600">${ev.severity || ''}</span>
        </div>
        <div class="timeline-title">${ev.title || ''}</div>
        ${ev.desc ? `<div class="timeline-desc">${ev.desc.substring(0, 80)}${ev.desc.length > 80 ? '…' : ''}</div>` : ''}
        ${chapCount ? `<div style="font-size:11px;color:var(--ink-faint);margin-top:4px">📄 ${chapCount} chương</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

/* Drag-drop reordering of events in timeline */
let _dragId = null;
window._evDragStart = (e, evId) => { _dragId = evId; };
window._evDrop = (e, targetId) => {
  e.preventDefault();
  if (!_dragId || _dragId === targetId) { _dragId = null; return; }
  const events  = db.data.events;
  const fromIdx = events.findIndex(ev => ev.id === _dragId);
  const toIdx   = events.findIndex(ev => ev.id === targetId);
  if (fromIdx < 0 || toIdx < 0) { _dragId = null; return; }
  // Swap chronologyOrder and renormalize
  const fromOrder = Number(events[fromIdx].chronologyOrder) || fromIdx;
  const toOrder   = Number(events[toIdx].chronologyOrder)   || toIdx;
  events[fromIdx].chronologyOrder = toOrder;
  events[toIdx].chronologyOrder   = fromOrder;
  const sorted = [...events].sort((a, b) => (Number(a.chronologyOrder)||0) - (Number(b.chronologyOrder)||0));
  sorted.forEach((ev, i) => { ev.chronologyOrder = i; });
  save();
  _dragId = null;
  renderEventList();
};

/* ── Form ──────────────────────────────────────────── */
export function showEventForm(evId = null) {
  editId = evId;
  const ev = evId ? (db.data.events.find(x => x.id === evId) || {}) : {};

  document.getElementById('timeline-view').style.display = 'none';
  document.getElementById('event-form').style.display    = 'block';
  document.getElementById('ev-form-title').textContent   = evId ? (ev.title || 'Sự kiện') : 'Sự kiện mới';
  document.getElementById('ev-delete-btn').style.display = evId ? 'inline-flex' : 'none';

  // Show/hide chapter creation button
  const createChapBtn = document.getElementById('ev-create-chap-btn');
  if (createChapBtn) createChapBtn.style.display = evId ? 'inline-flex' : 'none';

  _renderEventFormFields(ev);
  if (evId) _renderEventChapterList(evId);
  else { const el = document.getElementById('ev-chapter-list'); if (el) el.innerHTML = ''; }
}

window._evEdit = (id) => showEventForm(id);

function _renderEventFormFields(ev) {
  const { coreFields, customFields } = getFullSchema('events', db);
  const opts = { moduleName: 'events', onCustomRemove: () => showEventForm(editId) };
  renderFieldsInto(document.getElementById('event-core-fields'), coreFields, ev, 'ev', opts);

  _renderReverseStorylines(ev.id);

  const customWithMeta = customFields.map(f => ({ ...f, isCustom: true, moduleName: 'events' }));
  const cc = document.getElementById('event-custom-fields');
  if (customWithMeta.length) {
    renderFieldsInto(cc, customWithMeta, ev, 'ev', opts);
  } else {
    cc.innerHTML = '<p style="font-size:12px;color:var(--ink-faint)">Chưa có trường tùy chỉnh.</p>';
  }
}

function _renderReverseStorylines(evId) {
  const el = document.getElementById('event-reverse-storylines');
  if (!el || !evId) { if (el) el.innerHTML = ''; return; }
  const storylines = (db.data.storylines || []).filter(s =>
    (s.relatedEvents || []).some(r => r.eventId === evId));
  if (!storylines.length) { el.innerHTML = ''; return; }
  el.innerHTML = `<div style="margin-top:.5rem">
    <div class="modal-field-label">Thuộc storyline</div>
    <div class="reverse-links">
      ${storylines.map(s => `<div class="reverse-link-item"><a onclick="window._storyEdit('${s.id}')">${s.title || '(chưa đặt tên)'}</a></div>`).join('')}
    </div>
  </div>`;
}

/* ── Inline chapter list inside event form ────────── */
function _renderEventChapterList(evId) {
  const el = document.getElementById('ev-chapter-list');
  if (!el) return;
  const chapters = (db.data.chapters || []).filter(c => c.eventId === evId);
  if (!chapters.length) {
    el.innerHTML = '<p style="font-size:12.5px;color:var(--ink-faint);margin-top:.5rem">Chưa có chương nào. Bấm "Tạo chương" để bắt đầu.</p>';
    return;
  }
  el.innerHTML = `
    <div class="ev-chap-list">
      <div class="ev-chap-list-header">
        <span>${chapters.length} chương thuộc sự kiện này</span>
      </div>
      ${chapters.map((ch, i) => `
        <div class="ev-chap-item">
          <div class="ev-chap-item-body">
            <div class="ev-chap-item-title">${ch.title || '(Chưa đặt tên)'}</div>
            ${ch.summary ? `<div class="ev-chap-item-sub">${ch.summary.substring(0, 80)}${ch.summary.length > 80 ? '…' : ''}</div>` : ''}
          </div>
          <div class="ev-chap-item-actions">
            <button class="btn btn-sm" onclick="window._evChapEdit('${ch.id}')">Sửa</button>
            <button class="btn btn-sm" onclick="window._evChapMove('${ch.id}')">Chuyển</button>
            <button class="btn btn-sm btn-danger" onclick="window._evChapDelete('${ch.id}','${evId}')">Xoá</button>
          </div>
        </div>`).join('')}
    </div>`;
}

/* Chapter actions from within event form */
window._evChapEdit = (chapId) => {
  window._returnSection = 'timeline';
  window.switchSection('chapters');
  window.showChapterForm(chapId);
};

window._evChapDelete = (chapId, evId) => {
  if (!confirm('Xoá chương này? Hành động không thể hoàn tác.')) return;
  db.data.chapters = db.data.chapters.filter(c => c.id !== chapId);
  save();
  showToast('Đã xoá chương ✓');
  _renderEventChapterList(evId);
  window._updateTopbarTitle?.();
};

window._evChapMove = (chapId) => {
  const modal = document.getElementById('move-chapter-modal');
  if (!modal) return;
  const sel = document.getElementById('move-chapter-event-select');
  const events = (db.data.events || []).sort((a, b) => (Number(a.chronologyOrder)||0) - (Number(b.chronologyOrder)||0));
  sel.innerHTML = events.map(ev => `<option value="${ev.id}">${ev.title || '(chưa đặt tên)'}</option>`).join('');
  modal.dataset.chapId = chapId;
  modal.classList.add('open');
};

window._confirmMoveChapter = () => {
  const modal  = document.getElementById('move-chapter-modal');
  const chapId = modal?.dataset.chapId;
  const newEvId = document.getElementById('move-chapter-event-select')?.value;
  if (!chapId || !newEvId) return;
  const ch = db.data.chapters.find(c => c.id === chapId);
  if (ch) { ch.eventId = newEvId; save(); showToast('Đã chuyển chương ✓'); }
  modal.classList.remove('open');
  if (editId) _renderEventChapterList(editId);
  // Also refresh chapters tab if visible
  const chapSec = document.getElementById('sec-chapters');
  if (chapSec?.classList.contains('active')) window.renderAll?.();
};

/* ── Chapter creation popup ───────────────────────── */
window._evOpenCreateChapters = () => {
  if (!editId) return;
  const modal = document.getElementById('create-chapters-modal');
  if (!modal) return;
  const input = document.getElementById('create-chapters-count');
  if (input) input.value = '1';
  modal.dataset.evId = editId;
  modal.classList.add('open');
};

window._confirmCreateChapters = () => {
  const modal = document.getElementById('create-chapters-modal');
  const evId  = modal?.dataset.evId;
  const count = parseInt(document.getElementById('create-chapters-count')?.value, 10);
  if (!evId || isNaN(count) || count < 1) { showToast('⚠ Nhập số chương hợp lệ'); return; }
  for (let i = 0; i < count; i++) {
    db.data.chapters.push({ id: genId('chapter'), eventId: evId, title: '', summary: '' });
  }
  save();
  modal.classList.remove('open');
  showToast(`Đã tạo ${count} chương ✓`);
  _renderEventChapterList(evId);
  window._updateTopbarTitle?.();
};

/* ── Save / Delete / Cancel ───────────────────────── */
export function saveEvent() {
  const { coreFields, customFields } = getFullSchema('events', db);
  const values = collectFieldValues([...coreFields, ...customFields], 'ev');

  if (!values.title?.trim()) { showToast('⚠ Vui lòng nhập tiêu đề sự kiện'); return; }

  if (editId) {
    const idx = db.data.events.findIndex(x => x.id === editId);
    db.data.events[idx] = { ...db.data.events[idx], ...values };
  } else {
    values.id = genId('event');
    // New events placed at top: shift all existing orders up by 1
    db.data.events.forEach(ev => { ev.chronologyOrder = (Number(ev.chronologyOrder) || 0) + 1; });
    values.chronologyOrder = 0;
    db.data.events.push(values);
  }
  save();
  showToast('Đã lưu sự kiện ✓');
  cancelEventForm();
}

export function deleteEvent() {
  if (!editId) return;
  if (!confirm('Xóa sự kiện này? Mọi liên kết và chương thuộc sự kiện này sẽ bị ảnh hưởng.')) return;
  cleanupEventLinks(editId);
  db.data.events = db.data.events.filter(e => e.id !== editId);
  save();
  showToast('Đã xóa sự kiện ✓');
  cancelEventForm();
}

export function cancelEventForm() {
  document.getElementById('event-form').style.display   = 'none';
  document.getElementById('timeline-view').style.display = 'block';
  editId = null;
  renderEventList();
  window._navBack?.();
}

export function eventAddCustomField() {
  addCustomField('events', 'ev-newfield-name', 'ev-newfield-type', () => {
    const ev = editId ? (db.data.events.find(x => x.id === editId) || {}) : {};
    _renderEventFormFields(ev);
  });
}
