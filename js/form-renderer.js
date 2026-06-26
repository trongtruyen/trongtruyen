/* form-renderer.js — renderFieldsInto(), buildFieldEl(), collectFieldValues() */

import { db } from './storage.js';
import { resizeImageToBase64, deriveSymbol, SYMBOL_PALETTE } from './image-utils.js';
import { removeCustomField } from './custom-fields.js';

let quillInstances = {};

export function clearQuillInstances() { quillInstances = {}; }

/**
 * Renders a list of field descriptors into a container element.
 * @param {HTMLElement} containerEl
 * @param {Array}       fields      — array of field schema objects
 * @param {Object}      values      — current values keyed by field id
 * @param {string}      prefix      — HTML id prefix (e.g. 'char')
 * @param {Object}      opts        — { moduleName, currentEntryId, onCustomRemove }
 */
export function renderFieldsInto(containerEl, fields, values = {}, prefix, opts = {}) {
  containerEl.innerHTML = '';
  for (const f of fields) {
    const el = buildFieldEl(f, values[f.id], prefix, opts);
    if (el) containerEl.appendChild(el);
  }
}

export function buildFieldEl(field, value, prefix, opts = {}) {
  const { moduleName, currentEntryId, onCustomRemove } = opts;
  const wrap = document.createElement('div');
  wrap.className = 'field';
  if (field.isCustom) wrap.classList.add('custom-field-wrapper');

  // ── Label row ──────────────────────────────────────────────────────────
  const labelRow = document.createElement('div');
  labelRow.className = 'field-label-row';
  const label = document.createElement('label');
  label.textContent = field.label + (field.required ? ' *' : '');
  labelRow.appendChild(label);

  if (field.isCustom) {
    const badge = document.createElement('span');
    badge.className = 'custom-badge';
    badge.textContent = 'tùy chỉnh';
    const rmBtn = document.createElement('button');
    rmBtn.className = 'field-remove-btn';
    rmBtn.textContent = '✕ xóa trường';
    rmBtn.onclick = () => removeCustomField(moduleName, field.id, onCustomRemove);
    const right = document.createElement('div');
    right.style.cssText = 'display:flex;gap:6px;align-items:center';
    right.appendChild(badge); right.appendChild(rmBtn);
    labelRow.appendChild(right);
  }
  wrap.appendChild(labelRow);

  const inputId = prefix + '-' + field.id;

  // ── Field type dispatch ─────────────────────────────────────────────────
  switch (field.type) {
    case 'text':
    case 'url':
    case 'number': {
      const input = document.createElement('input');
      input.type = field.type === 'number' ? 'number' : 'text';
      input.id = inputId; input.value = value ?? '';
      if (field.type === 'url') input.placeholder = 'https://...';
      wrap.appendChild(input);
      break;
    }

    case 'textarea': {
      const ta = document.createElement('textarea');
      ta.id = inputId; ta.value = value ?? '';
      wrap.appendChild(ta);
      break;
    }

    case 'select': {
      const sel = document.createElement('select');
      sel.id = inputId;
      for (const opt of (field.options || [])) {
        const o = document.createElement('option');
        o.value = opt; o.textContent = opt;
        if (value === opt) o.selected = true;
        sel.appendChild(o);
      }
      wrap.appendChild(sel);
      break;
    }

    case 'boolean': {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:14px;cursor:pointer';
      const cb = document.createElement('input');
      cb.type = 'checkbox'; cb.id = inputId;
      cb.checked = !!value;
      cb.style.accentColor = 'var(--accent)';
      row.appendChild(cb);
      row.appendChild(document.createTextNode(field.label));
      // Replace the label row with just an empty placeholder
      wrap.innerHTML = '';
      wrap.appendChild(row);
      break;
    }

    case 'multi-tag': {
      const selector = document.createElement('div');
      selector.className = 'multi-tag-selector';
      selector.id = inputId;
      const selected = Array.isArray(value) ? value : [];
      for (const opt of (field.options || [])) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'multi-tag-option' + (selected.includes(opt) ? ' selected' : '');
        btn.dataset.value = opt;
        btn.innerHTML = `<span class="check">${selected.includes(opt) ? '✓ ' : ''}</span>${opt}`;
        btn.onclick = () => {
          btn.classList.toggle('selected');
          const isNowSelected = btn.classList.contains('selected');
          btn.querySelector('.check').textContent = isNowSelected ? '✓ ' : '';
        };
        selector.appendChild(btn);
      }
      wrap.appendChild(selector);
      if (field.optionHints) {
        const hintsEl = document.createElement('div');
        hintsEl.className = 'multi-tag-hints';
        for (const opt of (field.options || [])) {
          const hint = field.optionHints[opt];
          if (!hint) continue;
          const hintEl = document.createElement('div');
          hintEl.className = 'multi-tag-hint';
          hintEl.innerHTML = `<strong>${opt}:</strong> ${hint}`;
          hintsEl.appendChild(hintEl);
        }
        wrap.appendChild(hintsEl);
      }
      break;
    }

    case 'image': {
      wrap.innerHTML = '';
      const avatarWrap = document.createElement('div');
      avatarWrap.className = 'field';
      const lbl = document.createElement('label');
      lbl.textContent = field.label;
      avatarWrap.appendChild(lbl);

      const avatarField = document.createElement('div');
      avatarField.className = 'avatar-field';

      // Preview
      const preview = document.createElement('div');
      preview.className = 'avatar-preview';
      preview.id = inputId + '-preview';
      _updateAvatarPreview(preview, value, null, null);
      avatarField.appendChild(preview);

      // Controls
      const controls = document.createElement('div');
      controls.className = 'avatar-controls';

      const fileInput = document.createElement('input');
      fileInput.type = 'file'; fileInput.accept = 'image/*';
      fileInput.style.display = 'none'; fileInput.id = inputId + '-file';
      fileInput.onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try {
          const b64 = await resizeImageToBase64(f);
          preview.innerHTML = `<img src="${b64}" alt="avatar">`;
          preview.dataset.value = b64;
        } catch { }
      };

      const uploadBtn = document.createElement('button');
      uploadBtn.type = 'button'; uploadBtn.className = 'btn btn-sm';
      uploadBtn.textContent = '📷 Chọn ảnh';
      uploadBtn.onclick = () => fileInput.click();

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button'; removeBtn.className = 'btn btn-sm btn-danger';
      removeBtn.textContent = '✕ Xóa ảnh';
      removeBtn.onclick = () => {
        preview.innerHTML = '🧑'; delete preview.dataset.value;
      };

      const note = document.createElement('p');
      note.className = 'avatar-note';
      note.textContent = 'Ảnh sẽ được thu nhỏ về 64×64px để tiết kiệm bộ nhớ.';

      // Symbol picker
      const symPicker = document.createElement('div');
      symPicker.className = 'avatar-symbol-picker';
      symPicker.id = inputId + '-symbols';
      for (const sym of SYMBOL_PALETTE) {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = sym;
        b.onclick = () => {
          preview.innerHTML = sym; delete preview.dataset.value;
          preview.dataset.symbol = sym;
          symPicker.querySelectorAll('button').forEach(x => x.classList.remove('selected'));
          b.classList.add('selected');
        };
        symPicker.appendChild(b);
      }

      controls.append(uploadBtn, removeBtn, note, symPicker);
      avatarField.append(fileInput, controls);
      avatarWrap.appendChild(avatarField);
      return avatarWrap;
    }

    case 'reference': {
      const { refModule } = field;
      const rows = Array.isArray(value) ? value : [];
      const rowsContainer = document.createElement('div');
      rowsContainer.className = 'ref-rows'; rowsContainer.id = inputId;

      const addRow = (row = {}) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'ref-row';
        const refId = row[_refIdKey(refModule)] || row.characterId || row.eventId || row.storylineId || '';
        const note  = row.note || '';

        const sel = document.createElement('select');
        const blankOpt = document.createElement('option');
        blankOpt.value = ''; blankOpt.textContent = '— Chọn —';
        sel.appendChild(blankOpt);
        const entries = db.data[refModule] || [];
        for (const entry of entries) {
          if (refModule === 'characters' && currentEntryId && entry.id === currentEntryId) continue;
          if (refModule === 'storylines' && currentEntryId && entry.id === currentEntryId) continue;
          const o = document.createElement('option');
          o.value = entry.id;
          o.textContent = entry.name || entry.title || entry.id;
          if (entry.id === refId) o.selected = true;
          sel.appendChild(o);
        }

        const noteInput = document.createElement('input');
        noteInput.type = 'text'; noteInput.placeholder = field.noteLabel || 'Ghi chú...';
        noteInput.value = note;

        const delBtn = document.createElement('button');
        delBtn.type = 'button'; delBtn.className = 'ref-row-del'; delBtn.textContent = '✕';
        delBtn.onclick = () => rowEl.remove();

        rowEl.append(sel, noteInput, delBtn);
        rowsContainer.appendChild(rowEl);
      };

      rows.forEach(addRow);

      const addBtn = document.createElement('button');
      addBtn.type = 'button'; addBtn.className = 'ref-add-btn';
      addBtn.textContent = '+ Thêm liên kết';
      addBtn.onclick = () => addRow();

      wrap.append(rowsContainer, addBtn);
      break;
    }

    case 'ref-single': {
      const { refModule } = field;
      const sel = document.createElement('select');
      sel.id = inputId;
      const blank = document.createElement('option');
      blank.value = ''; blank.textContent = '— Không chọn —';
      sel.appendChild(blank);
      for (const entry of (db.data[refModule] || [])) {
        const o = document.createElement('option');
        o.value = entry.id;
        o.textContent = entry.title || entry.name || entry.id;
        if (entry.id === value) o.selected = true;
        sel.appendChild(o);
      }
      wrap.appendChild(sel);
      break;
    }

    case 'ref-events': {
      // Special: list of { eventId, narrativeType, lengthOverride }
      const rows = Array.isArray(value) ? value : [];
      const rowsContainer = document.createElement('div');
      rowsContainer.className = 'ref-rows'; rowsContainer.id = inputId;

      const NARRATIVE_TYPES = ['Tuyến tính', 'Flashback', 'Flash-forward', 'Chưa xác định'];

      const addRow = (row = {}) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'ref-row'; rowEl.style.flexWrap = 'wrap';

        const evSel = document.createElement('select');
        const blank = document.createElement('option');
        blank.value = ''; blank.textContent = '— Chọn sự kiện —';
        evSel.appendChild(blank);
        for (const ev of (db.data.events || [])) {
          const o = document.createElement('option');
          o.value = ev.id; o.textContent = ev.title || ev.id;
          if (ev.id === row.eventId) o.selected = true;
          evSel.appendChild(o);
        }
        evSel.style.flex = '0 0 180px';

        const typeSel = document.createElement('select');
        for (const nt of NARRATIVE_TYPES) {
          const o = document.createElement('option');
          o.value = nt; o.textContent = nt;
          if (nt === row.narrativeType) o.selected = true;
          typeSel.appendChild(o);
        }
        typeSel.style.flex = '0 0 140px';

        const delBtn = document.createElement('button');
        delBtn.type = 'button'; delBtn.className = 'ref-row-del'; delBtn.textContent = '✕';
        delBtn.onclick = () => rowEl.remove();

        rowEl.append(evSel, typeSel, delBtn);
        rowsContainer.appendChild(rowEl);
      };

      rows.forEach(addRow);
      const addBtn = document.createElement('button');
      addBtn.type = 'button'; addBtn.className = 'ref-add-btn';
      addBtn.textContent = '+ Thêm sự kiện';
      addBtn.onclick = () => addRow();
      wrap.append(rowsContainer, addBtn);
      break;
    }

    case 'tags': {
      // handled manually in notes module — render placeholder
      const tagsDiv = document.createElement('div');
      tagsDiv.id = inputId;
      wrap.appendChild(tagsDiv);
      break;
    }

    case 'richtext': {
      const editorId = inputId + '-editor';
      const editorWrap = document.createElement('div');
      editorWrap.className = 'quill-wrapper';
      const editorDiv = document.createElement('div');
      editorDiv.id = editorId;
      editorWrap.appendChild(editorDiv);
      wrap.appendChild(editorWrap);
      // Initialize Quill after DOM insertion (deferred)
      setTimeout(() => {
        if (window.Quill && !quillInstances[editorId]) {
          const q = new window.Quill('#' + editorId, {
            theme: 'snow',
            modules: {
              toolbar: [
                ['bold', 'italic', 'underline'],
                [{ list: 'ordered' }, { list: 'bullet' }]
              ]
            }
          });
          if (value) q.root.innerHTML = value;
          quillInstances[editorId] = q;
        }
      }, 50);
      break;
    }

    default: {
      const input = document.createElement('input');
      input.type = 'text'; input.id = inputId; input.value = value ?? '';
      wrap.appendChild(input);
    }
  }

  return wrap;
}

/**
 * Reads all field values back from the DOM.
 */
export function collectFieldValues(fields, prefix) {
  const result = {};
  for (const f of fields) {
    const id = prefix + '-' + f.id;
    switch (f.type) {
      case 'multi-tag': {
        const container = document.getElementById(id);
        if (container) {
          result[f.id] = Array.from(container.querySelectorAll('.multi-tag-option.selected'))
            .map(b => b.dataset.value);
        }
        break;
      }
      case 'boolean': {
        const cb = document.getElementById(id);
        result[f.id] = cb ? cb.checked : false;
        break;
      }
      case 'image': {
        const preview = document.getElementById(id + '-preview');
        if (preview) {
          result[f.id]       = preview.dataset.value || null;
          result['avatarSymbol'] = preview.dataset.symbol || null;
        }
        break;
      }
      case 'reference': {
        const container = document.getElementById(id);
        if (!container) { result[f.id] = []; break; }
        const rows = [];
        for (const rowEl of container.querySelectorAll('.ref-row')) {
          const selVal = rowEl.querySelector('select')?.value;
          const noteVal = rowEl.querySelector('input')?.value || '';
          if (selVal) {
            const row = {};
            row[_refIdKey(f.refModule)] = selVal;
            row.note = noteVal;
            rows.push(row);
          }
        }
        result[f.id] = rows;
        break;
      }
      case 'ref-single': {
        const sel = document.getElementById(id);
        result[f.id] = sel ? (sel.value || null) : null;
        break;
      }
      case 'ref-events': {
        const container = document.getElementById(id);
        if (!container) { result[f.id] = []; break; }
        const rows = [];
        for (const rowEl of container.querySelectorAll('.ref-row')) {
          const sels = rowEl.querySelectorAll('select');
          const evId = sels[0]?.value; const nt = sels[1]?.value || 'Tuyến tính';
          if (evId) rows.push({ eventId: evId, narrativeType: nt, lengthOverride: null });
        }
        result[f.id] = rows;
        break;
      }
      case 'tags': {
        result[f.id] = [];
        break;
      }
      case 'richtext': {
        const editorId = id + '-editor';
        const q = quillInstances[editorId];
        result[f.id] = q ? q.root.innerHTML : '';
        break;
      }
      default: {
        const el = document.getElementById(id);
        result[f.id] = el ? el.value : '';
      }
    }
  }
  return result;
}

function _refIdKey(refModule) {
  if (refModule === 'characters') return 'characterId';
  if (refModule === 'events')     return 'eventId';
  if (refModule === 'storylines') return 'storylineId';
  return 'refId';
}

function _updateAvatarPreview(preview, avatarBase64, avatarSymbol, gender) {
  if (avatarBase64) {
    preview.innerHTML = `<img src="${avatarBase64}" alt="avatar">`;
    preview.dataset.value = avatarBase64;
  } else if (avatarSymbol) {
    preview.textContent = avatarSymbol;
    preview.dataset.symbol = avatarSymbol;
  } else {
    preview.textContent = deriveSymbol(gender, []);
  }
}

/** Populate avatar preview from a character data object (used when editing) */
export function populateAvatarPreview(prefix, char) {
  const preview = document.getElementById(prefix + '-avatar-preview');
  if (!preview) return;
  if (char.avatar) {
    preview.innerHTML = `<img src="${char.avatar}" alt="avatar">`;
    preview.dataset.value = char.avatar;
  } else if (char.avatarSymbol) {
    preview.textContent = char.avatarSymbol;
    preview.dataset.symbol = char.avatarSymbol;
  } else {
    preview.textContent = deriveSymbol(char.gender, char.roleAlignment || []);
  }
}

/** Get avatar display (img or symbol) for a character object */
export function getAvatarDisplay(char) {
  if (char.avatar) return `<img src="${char.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
  if (char.avatarSymbol) return char.avatarSymbol;
  return deriveSymbol(char.gender, char.roleAlignment || []);
}
