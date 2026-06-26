/* plot.js — single-object Plot module */

import { db, save } from '../storage.js';
import { getFullSchema } from '../schema.js';
import { renderFieldsInto, collectFieldValues } from '../form-renderer.js';
import { addCustomField } from '../custom-fields.js';
import { showToast } from '../toast.js';

export function renderPlotForm() {
  const { coreFields, customFields } = getFullSchema('plot', db);
  const values = db.data.plot || {};

  renderFieldsInto(document.getElementById('plot-core-fields'), coreFields, values, 'plot', {});

  const totalChaps = (db.data.chapters || []).length;
  const noticeEl = document.getElementById('plot-estimated-length');
  if (noticeEl) noticeEl.textContent = `Tổng số chương đã lên kế hoạch: ${totalChaps} chương`;

  const customWithMeta = customFields.map(f => ({ ...f, isCustom: true, moduleName: 'plot' }));
  const customContainer = document.getElementById('plot-custom-fields');
  if (customWithMeta.length) {
    renderFieldsInto(customContainer, customWithMeta, values, 'plot', {
      moduleName: 'plot',
      onCustomRemove: renderPlotForm
    });
  } else {
    customContainer.innerHTML = '<p style="font-size:12px;color:var(--ink-faint)">Chưa có trường tùy chỉnh.</p>';
  }
}

export function savePlot() {
  const { coreFields, customFields } = getFullSchema('plot', db);
  const values = collectFieldValues([...coreFields, ...customFields], 'plot');
  db.data.plot = values;
  if (values.title) db.meta.title = values.title;
  save();
  showToast('Đã lưu cốt truyện ✓');
}

export function plotAddCustomField() {
  addCustomField('plot', 'plot-newfield-name', 'plot-newfield-type', renderPlotForm);
}
