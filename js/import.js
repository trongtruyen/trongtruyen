/* import.js — handleImport(), JSON validation */

import { replaceDb } from './storage.js';
import { showToast } from './toast.js';

export function triggerImport() {
  document.getElementById('import-input').click();
}

export function handleImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onerror = () => showToast('⚠ Không đọc được file');
  reader.onload = (ev) => {
    let parsed;
    try {
      parsed = JSON.parse(ev.target.result);
    } catch {
      showToast('⚠ File không hợp lệ (JSON lỗi)');
      return;
    }

    if (!parsed.data || !parsed.schemas) {
      showToast('⚠ File không đúng định dạng Trồng Truyện');
      return;
    }

    replaceDb(parsed);
    // renderAll is registered on window by main.js after init
    if (typeof window.renderAll === 'function') window.renderAll();
    showToast('Import thành công! ✓');
  };

  reader.readAsText(file, 'UTF-8');
  e.target.value = '';
}
