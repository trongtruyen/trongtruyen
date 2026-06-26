/* sources.js — Reference Sources module */

import { db, save, genId } from '../storage.js';
import { showToast } from '../toast.js';

const SRC_ICONS = { 'Link web': '🌐', 'Sách': '📚', 'Bài báo': '📰', 'Video': '🎬', 'Khác': '📎' };
let editId = null;

export function renderSourceList() {
  const wrap  = document.getElementById('sources-list');
  const count = document.getElementById('src-count');
  if (!wrap) return;

  const sources = db.data.sources || [];
  count.textContent = sources.length + ' tài liệu';

  if (!sources.length) {
    wrap.innerHTML = `<div class="list-empty"><span class="empty-icon">🔗</span>Chưa có tài liệu nào.<br>Bấm "+ Thêm tài liệu" để bắt đầu.</div>`;
    return;
  }

  wrap.innerHTML = sources.map(s => `
    <div class="source-item" onclick="window._srcEdit('${s.id}')">
      <div class="source-type-icon" style="background:var(--src-bg);color:var(--src-color)">${SRC_ICONS[s.type] || '📎'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600">${s.title || ''}</div>
        <div style="font-size:12px;color:var(--ink-muted);margin-top:2px">${s.type || ''}${s.url ? ` · <a href="${s.url}" onclick="event.stopPropagation()" target="_blank" rel="noopener" style="color:var(--src-color)">${s.url}</a>` : ''}</div>
        ${s.notes ? `<div style="font-size:12px;color:var(--ink-faint);margin-top:3px">${s.notes}</div>` : ''}
      </div>
    </div>`).join('');
}

export function showSourceForm(srcId = null) {
  editId = srcId;
  const s = srcId ? (db.data.sources.find(x => x.id === srcId) || {}) : {};

  document.getElementById('sources-view').style.display = 'none';
  document.getElementById('source-form').style.display = 'block';
  document.getElementById('s-delete-btn').style.display = srcId ? 'inline-flex' : 'none';

  document.getElementById('s-title').value = s.title || '';
  document.getElementById('s-type').value  = s.type  || 'Link web';
  document.getElementById('s-url').value   = s.url   || '';
  document.getElementById('s-notes').value = s.notes || '';
}

window._srcEdit = (id) => showSourceForm(id);

export function saveSource() {
  const title = document.getElementById('s-title').value.trim();
  if (!title) { showToast('⚠ Vui lòng nhập tiêu đề'); return; }

  const s = {
    title,
    type:  document.getElementById('s-type').value,
    url:   document.getElementById('s-url').value,
    notes: document.getElementById('s-notes').value
  };

  if (editId) {
    const idx = db.data.sources.findIndex(x => x.id === editId);
    db.data.sources[idx] = { ...db.data.sources[idx], ...s };
  } else {
    s.id = genId('src');
    db.data.sources.push(s);
  }
  save();
  showToast('Đã lưu tài liệu ✓');
  cancelSourceForm();
}

export function deleteSource() {
  if (!editId) return;
  if (!confirm('Xóa tài liệu này?')) return;
  db.data.sources = db.data.sources.filter(s => s.id !== editId);
  save();
  showToast('Đã xóa ✓');
  cancelSourceForm();
}

export function cancelSourceForm() {
  document.getElementById('source-form').style.display = 'none';
  document.getElementById('sources-view').style.display = 'block';
  editId = null;
  renderSourceList();
}
