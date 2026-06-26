/* custom-fields.js — addCustomField(), removeCustomField(), slugify() */

import { db, save } from './storage.js';
import { showToast } from './toast.js';

export function slugify(text) {
  return text.toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip combining diacritics
    .replace(/đ/g, 'd')            // đ
    .replace(/Đ/g, 'D')            // Đ
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '_');
}

export function addCustomField(moduleName, nameInputId, typeInputId, onDone) {
  const nameEl = document.getElementById(nameInputId);
  const typeEl = document.getElementById(typeInputId);
  const label  = nameEl.value.trim();
  if (!label) { showToast('⚠ Nhập tên trường trước'); return; }

  const id = slugify(label) || ('field_' + Date.now());
  if (!db.schemas[moduleName]) db.schemas[moduleName] = { customFields: [] };

  if (db.schemas[moduleName].customFields.some(f => f.id === id)) {
    showToast('⚠ Trường này đã tồn tại'); return;
  }
  db.schemas[moduleName].customFields.push({ id, label, type: typeEl.value });
  nameEl.value = '';
  save();
  showToast(`Đã thêm trường "${label}" ✓`);
  if (onDone) onDone();
}

export function removeCustomField(moduleName, fieldId, onDone) {
  if (!confirm(
    'Xóa trường này?\n\nDữ liệu đã nhập vào trường này (ở mọi mục) sẽ bị ẩn đi nhưng KHÔNG mất — ' +
    'nếu bạn thêm lại trường có cùng tên sau này, dữ liệu cũ sẽ hiện lại.'
  )) return;
  db.schemas[moduleName].customFields =
    db.schemas[moduleName].customFields.filter(f => f.id !== fieldId);
  save();
  showToast('Đã xóa trường ✓');
  if (onDone) onDone();
}
