/* notes.js — Free-form Notes module with Quill rich text */

import { db, save, genId } from '../storage.js';
import { showToast } from '../toast.js';

let editId = null;
let currentTags = [];
let _quill = null;

/* ── Quill init (lazy, once) ─────────────────────── */
function _initQuill() {
  if (_quill) return;
  const el = document.getElementById('n-content-editor');
  if (!el || typeof Quill === 'undefined') return;
  _quill = new Quill(el, {
    theme: 'snow',
    placeholder: 'Ghi chú tự do — hỗ trợ định dạng...',
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline'],
        [{ list: 'ordered' }, { list: 'bullet' }]
      ]
    }
  });
}

export function renderNoteList() {
  const wrap  = document.getElementById('notes-list');
  const count = document.getElementById('note-count');
  if (!wrap) return;

  const notes = db.data.notes || [];
  count.textContent = notes.length + ' ghi chú';

  if (!notes.length) {
    wrap.innerHTML = `<div class="list-empty"><span class="empty-icon">📝</span>Chưa có ghi chú nào.<br>Bấm "+ Thêm ghi chú" để bắt đầu.</div>`;
    return;
  }

  wrap.innerHTML = notes.map(n => `
    <div class="list-item" onclick="window._noteEdit('${n.id}')">
      <div class="list-item-left">
        <div class="list-item-icon" style="background:var(--note-bg);color:var(--note-color)">📝</div>
        <div>
          <div class="list-item-title">${n.title || 'Ghi chú'}</div>
          <div class="tags-wrap" style="margin-top:4px">
            ${(n.tags || []).map(t => `<span class="tag" style="border-color:var(--note-color);color:var(--note-color)">${t}</span>`).join('')}
          </div>
        </div>
      </div>
      <span class="list-chevron">›</span>
    </div>`).join('');
}

export function showNoteForm(noteId = null) {
  editId = noteId;
  const n = noteId ? (db.data.notes.find(x => x.id === noteId) || {}) : {};
  currentTags = [...(n.tags || [])];

  document.getElementById('notes-view').style.display = 'none';
  document.getElementById('note-form').style.display  = 'block';
  document.getElementById('n-delete-btn').style.display = noteId ? 'inline-flex' : 'none';
  document.getElementById('n-title').value   = n.title || '';
  document.getElementById('n-tag-input').value = '';

  _initQuill();
  if (_quill) {
    _quill.root.innerHTML = n.content || '';
    // move cursor to end
    _quill.setSelection(_quill.getLength(), 0);
  }
  _renderTagsUI();
}

window._noteEdit = (id) => showNoteForm(id);

function _renderTagsUI() {
  document.getElementById('n-tags').innerHTML = currentTags.map((t, i) =>
    `<span class="tag">${t}<span class="tag-rm" onclick="window._noteRemoveTag(${i})">✕</span></span>`).join('');
}

window._noteRemoveTag = (i) => { currentTags.splice(i, 1); _renderTagsUI(); };

export function noteAddTag(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  const v = e.target.value.trim();
  if (v && !currentTags.includes(v)) { currentTags.push(v); _renderTagsUI(); }
  e.target.value = '';
}

export function saveNote() {
  const title   = document.getElementById('n-title').value;
  const content = _quill ? _quill.root.innerHTML : '';
  const n = { title, content, tags: [...currentTags] };

  if (editId) {
    const idx = db.data.notes.findIndex(x => x.id === editId);
    db.data.notes[idx] = { ...db.data.notes[idx], ...n };
  } else {
    n.id = genId('note');
    db.data.notes.push(n);
  }
  save();
  showToast('Đã lưu ghi chú ✓');
  cancelNoteForm();
}

export function deleteNote() {
  if (!editId) return;
  if (!confirm('Xóa ghi chú này?')) return;
  db.data.notes = db.data.notes.filter(n => n.id !== editId);
  save();
  showToast('Đã xóa ✓');
  cancelNoteForm();
}

export function cancelNoteForm() {
  document.getElementById('note-form').style.display  = 'none';
  document.getElementById('notes-view').style.display = 'block';
  editId = null;
  renderNoteList();
  window._navBack?.();
}
