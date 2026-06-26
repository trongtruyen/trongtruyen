/* export.js — exportJSON() and exportPDF() */

import { db } from './storage.js';
import { showToast } from './toast.js';

/* ── JSON Export ────────────────────────────────── */
export function exportJSON() {
  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  const title = db.data.plot?.title || 'trong-truyen';
  a.download = title.replace(/[/\\?%*:|"<>]/g, '-') + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Đã xuất file JSON ✓');
}

/* ── PDF Export (HTML print approach — full Unicode / Vietnamese support) ── */
export function exportPDF() {
  const html = _buildPrintHTML();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (!win) {
    showToast('⚠ Trình duyệt chặn cửa sổ pop-up. Vui lòng cho phép pop-up và thử lại.');
    URL.revokeObjectURL(url);
    return;
  }
  win.addEventListener('load', () => {
    setTimeout(() => {
      win.focus();
      win.print();
      URL.revokeObjectURL(url);
    }, 400);
  });
  showToast('Đang mở cửa sổ in — chọn "Save as PDF" ✓');
}

/* ── HTML builder ─────────────────────────────── */
function _buildPrintHTML() {
  const p    = db.data.plot        || {};
  const chars = db.data.characters || [];
  const storyLines = db.data.storylines || [];
  const worlds  = db.data.worlds   || [];
  const chapters = [...(db.data.chapters || [])].sort((a, b) => (Number(a.num)||0) - (Number(b.num)||0));
  const events   = [...(db.data.events   || [])].sort((a, b) => (Number(a.chronologyOrder)||0) - (Number(b.chronologyOrder)||0));
  const notes   = db.data.notes    || [];
  const sources = db.data.sources  || [];

  const totalLen = events.reduce((s, e) => s + (Number(e.estimatedLength) || 0), 0);

  const esc = (s) => (s || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const stripHtml = (s) => (s || '').replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').trim();

  const val = (v) => esc(stripHtml(v));

  const field = (label, value, opts = {}) => {
    const v = stripHtml(value);
    if (!v) return '';
    const cls = opts.mono ? ' class="mono"' : '';
    return `<div class="field-row">
      <div class="field-label">${esc(label)}</div>
      <div class="field-value"${cls}>${val(v)}</div>
    </div>`;
  };

  const refList = (arr, refModule, idKey) =>
    (arr || []).map(r => {
      const entry = (db.data[refModule] || []).find(x => x.id === r[idKey]);
      const name  = entry ? (entry.name || entry.title || '') : '';
      if (!name) return '';
      return name + (r.note ? ` (${esc(r.note)})` : '');
    }).filter(Boolean).join(' · ');

  const sevBadge = (sev) => {
    const cls = sev === 'Cao' ? 'sev-high' : sev === 'Trung bình' ? 'sev-mid' : 'sev-low';
    return sev ? `<span class="badge ${cls}">${esc(sev)}</span>` : '';
  };

  const tag = (t) => `<span class="tag">${esc(t)}</span>`;

  /* ── Sections ─────────────────────────────────── */

  // Cover
  let body = `
    <div class="cover">
      <h1>${val(p.title) || 'Không tiêu đề'}</h1>
      ${p.genreTagline ? `<p class="tagline">${val(p.genreTagline)}</p>` : ''}
      ${p.author       ? `<p class="meta">Tác giả: ${val(p.author)}</p>` : ''}
      ${totalLen       ? `<p class="meta">Ước tính: ~${totalLen} chương</p>` : ''}
      <p class="meta">Xuất ngày: ${new Date().toLocaleDateString('vi-VN')}</p>
    </div>`;

  // Plot
  if (Object.values(p).some(Boolean)) {
    body += section('Cốt truyện', `
      ${field('Tóm tắt / Logline', p.summary)}
      ${field('Chủ đề chính', p.theme)}
      ${field('Thông điệp', p.message)}
      ${field('Thể loại', p.genreTagline)}
    `);
  }

  // Storylines
  if (storyLines.length) {
    body += section('Tuyến truyện', storyLines.map((s, i) => `
      <div class="entry">
        <h3>${i + 1}. ${val(s.title) || '(chưa đặt tên)'}</h3>
        ${field('Tóm tắt', s.summary)}
        ${s.involvedCharacters?.length ? field('Nhân vật', refList(s.involvedCharacters, 'characters', 'characterId')) : ''}
        ${s.relatedEvents?.length      ? field('Sự kiện',  refList(s.relatedEvents, 'events', 'eventId')) : ''}
        ${_customFields(s, 'storylines')}
      </div>`).join(''));
  }

  // Characters
  if (chars.length) {
    body += section('Nhân vật', chars.map((c, i) => {
      const importance = (c.roleImportance || []).map(tag).join('');
      const alignment  = (c.roleAlignment  || []).map(tag).join('');
      const rels = (c.relations || []).map(r => {
        const t = chars.find(x => x.id === r.characterId);
        return t ? esc(t.name) + (r.note ? ` (${esc(r.note)})` : '') : '';
      }).filter(Boolean).join(' · ');
      const visOpt = c.visibleOptionalFields || [];
      return `
        <div class="entry">
          <div class="char-header">
            ${c.avatar ? `<img class="avatar" src="${c.avatar}" alt="">` : `<div class="avatar-sym">${c.avatarSymbol || '👤'}</div>`}
            <div>
              <h3>${i + 1}. ${val(c.name) || '(chưa đặt tên)'}</h3>
              <div class="tags">${importance}${alignment}</div>
            </div>
          </div>
          ${field('Giới tính', c.gender)}
          ${field('Tuổi', c.age)}
          ${field('Tính cách', c.personality)}
          ${rels  ? field('Mối quan hệ', rels) : ''}
          ${visOpt.includes('origin')     ? field('Xuất thân', c.origin) : ''}
          ${visOpt.includes('appearance') ? field('Ngoại hình', c.appearance) : ''}
          ${visOpt.includes('goal')       ? field('Mục tiêu / Động lực', c.goal) : ''}
          ${visOpt.includes('backstory')  ? field('Backstory', c.backstory) : ''}
          ${visOpt.includes('notes')      ? field('Ghi chú riêng', stripHtml(c.notes)) : ''}
          ${_customFields(c, 'characters')}
        </div>`;
    }).join(''));
  }

  // Worlds
  if (worlds.length) {
    body += section('Thiết lập thế giới', worlds.map((w, i) => `
      <div class="entry">
        <h3>${i + 1}. ${val(w.title) || '(chưa đặt tên)'}</h3>
        ${field('Thời đại & Địa điểm', w.spacetime)}
        ${field('Mô tả', w.desc)}
        ${field('Môi trường & Địa lý', w.environment)}
        ${field('Chính trị', w.politics)}
        ${field('Xã hội & Văn hóa', w.society)}
        ${field('Ngoại lệ / Quy tắc đặc biệt', w.exception)}
        ${field('Lịch sử', w.history)}
        ${field('Ghi chú thêm', w.notes)}
        ${_customFields(w, 'worlds')}
      </div>`).join(''));
  }

  // Chapters (grouped by event)
  if (chapters.length) {
    const chapsByEvent = {};
    const orphanChaps  = [];
    for (const ch of chapters) {
      if (ch.eventId) (chapsByEvent[ch.eventId] = chapsByEvent[ch.eventId] || []).push(ch);
      else orphanChaps.push(ch);
    }

    let chapHTML = '';
    for (const ev of events) {
      const group = chapsByEvent[ev.id];
      if (!group) continue;
      chapHTML += `<div class="chapter-group-header">${sevBadge(ev.severity)} ${val(ev.title)}</div>`;
      for (const ch of group) {
        chapHTML += `
          <div class="entry entry-compact">
            <h4>Chương ${ch.num || '?'}: ${val(ch.title)}</h4>
            ${field('Tóm tắt', ch.summary)}
            ${field('Địa điểm', ch.place)}
            ${field('Mục tiêu', ch.goal)}
            ${field('Nhân vật', refList(ch.chars, 'characters', 'characterId'))}
            ${field('Ghi chú', ch.notes)}
            ${_customFields(ch, 'chapters')}
          </div>`;
      }
    }
    if (orphanChaps.length) {
      for (const ch of orphanChaps) {
        chapHTML += `
          <div class="entry entry-compact">
            <h4>Chương ${ch.num || '?'}: ${val(ch.title)}</h4>
            ${field('Tóm tắt', ch.summary)}
            ${field('Địa điểm', ch.place)}
            ${field('Mục tiêu', ch.goal)}
          </div>`;
      }
    }
    body += section('Chương', chapHTML);
  }

  // Timeline / Events
  if (events.length) {
    body += section('Dòng thời gian / Sự kiện', events.map(ev => `
      <div class="entry entry-compact">
        <div class="ev-header">
          <h4>${val(ev.title) || '(chưa đặt tên)'}</h4>
          ${sevBadge(ev.severity)}
          ${ev.isFlashback ? '<span class="badge flash">Flashback</span>' : ''}
        </div>
        ${ev.time            ? field('Thời điểm', ev.time) : ''}
        ${ev.estimatedLength ? field('Số chương ước tính', ev.estimatedLength + ' chương') : ''}
        ${field('Mô tả', ev.desc)}
        ${ev.chars?.length   ? field('Nhân vật liên quan', refList(ev.chars, 'characters', 'characterId')) : ''}
        ${_customFields(ev, 'events')}
      </div>`).join(''));
  }

  // Notes
  if (notes.length) {
    body += section('Ghi chú', notes.map(n => `
      <div class="entry entry-compact">
        <h4>${val(n.title) || 'Ghi chú'}</h4>
        ${n.content ? `<p class="note-body">${val(n.content)}</p>` : ''}
        ${n.tags?.length ? `<div class="tags">${(n.tags).map(tag).join('')}</div>` : ''}
      </div>`).join(''));
  }

  // Sources
  if (sources.length) {
    body += section('Tài liệu tham khảo', sources.map((s, i) => `
      <div class="entry entry-compact">
        <h4>${i + 1}. ${val(s.title)}</h4>
        ${field('Loại', s.type)}
        ${s.url ? `<div class="field-row"><div class="field-label">Link</div><div class="field-value mono">${esc(s.url)}</div></div>` : ''}
        ${field('Ghi chú', s.notes)}
      </div>`).join(''));
  }

  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<title>${val(p.title) || 'Trồng Truyện'} — Story Bible</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, 'Noto Sans', sans-serif;
    font-size: 11pt;
    color: #1a1a1a;
    line-height: 1.6;
    background: #fff;
  }
  .page { max-width: 780px; margin: 0 auto; padding: 24px 32px; }

  /* ── Cover ──────────────────────────── */
  .cover {
    padding: 48px 0 36px;
    border-bottom: 3px solid #1a1a1a;
    margin-bottom: 32px;
    page-break-after: always;
  }
  .cover h1 { font-size: 28pt; font-weight: 800; letter-spacing: -1px; margin-bottom: 10px; }
  .cover .tagline { font-size: 13pt; color: #555; margin-bottom: 8px; }
  .cover .meta { font-size: 10pt; color: #888; margin-top: 4px; }

  /* ── Section ────────────────────────── */
  .section { margin-bottom: 32px; page-break-inside: avoid; }
  .section-title {
    font-size: 9pt; font-weight: 700; text-transform: uppercase;
    letter-spacing: .1em; color: #888;
    border-bottom: 1.5px solid #e0e0e0;
    padding-bottom: 6px; margin-bottom: 16px;
  }

  /* ── Entry ──────────────────────────── */
  .entry { margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #f0f0f0; }
  .entry:last-child { border-bottom: none; }
  .entry h3 { font-size: 13pt; font-weight: 700; margin-bottom: 10px; }
  .entry h4 { font-size: 11pt; font-weight: 700; margin-bottom: 8px; color: #222; }
  .entry-compact { margin-bottom: 14px; padding-bottom: 12px; }

  /* ── Fields ─────────────────────────── */
  .field-row { display: flex; gap: 12px; margin-bottom: 6px; align-items: flex-start; }
  .field-label {
    font-size: 9pt; font-weight: 700; color: #888;
    min-width: 140px; max-width: 140px; text-transform: uppercase;
    letter-spacing: .04em; padding-top: 1px; flex-shrink: 0;
  }
  .field-value { font-size: 10.5pt; flex: 1; }
  .field-value.mono { font-family: 'Courier New', monospace; font-size: 9.5pt; word-break: break-all; }

  /* ── Characters ─────────────────────── */
  .char-header { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 12px; }
  .avatar { width: 52px; height: 52px; border-radius: 6px; object-fit: cover; flex-shrink: 0; }
  .avatar-sym { width: 52px; height: 52px; border-radius: 6px; background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 24pt; flex-shrink: 0; }

  /* ── Tags / Badges ──────────────────── */
  .tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 4px; }
  .tag {
    display: inline-block; font-size: 9pt; padding: 2px 8px;
    border: 1px solid #ccc; border-radius: 100px; color: #555;
  }
  .badge {
    display: inline-block; font-size: 8.5pt; font-weight: 700;
    padding: 2px 8px; border-radius: 100px;
  }
  .badge.sev-high { background: #fee2e2; color: #b91c1c; }
  .badge.sev-mid  { background: #fef3c7; color: #92400e; }
  .badge.sev-low  { background: #f1f5f9; color: #64748b; }
  .badge.flash    { background: #ede9fe; color: #6d28d9; }

  /* ── Chapter group ───────────────────── */
  .chapter-group-header {
    font-size: 10pt; font-weight: 700; color: #555;
    background: #f8f8f8; padding: 6px 10px; border-radius: 4px;
    margin: 10px 0 6px; display: flex; align-items: center; gap: 8px;
  }

  /* ── Event header ────────────────────── */
  .ev-header { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
  .ev-header h4 { margin-bottom: 0; }

  /* ── Notes ───────────────────────────── */
  .note-body { white-space: pre-wrap; font-size: 10.5pt; color: #333; }

  /* ── Print rules ─────────────────────── */
  @media print {
    body { font-size: 10.5pt; }
    .page { padding: 0; }
    .cover { padding: 0 0 24px; page-break-after: always; }
    .section { page-break-inside: avoid; }
    .entry { page-break-inside: avoid; }
    @page { margin: 18mm 20mm; size: A4 portrait; }
  }
</style>
</head>
<body>
<div class="page">
${body}
</div>
</body>
</html>`;
}

function section(title, innerHtml) {
  if (!innerHtml.trim()) return '';
  return `<div class="section">
    <div class="section-title">${title}</div>
    ${innerHtml}
  </div>`;
}

function _customFields(entry, moduleName) {
  const customFields = db.schemas?.[moduleName]?.customFields || [];
  return customFields.map(f => {
    const v = entry[f.id];
    if (!v) return '';
    const display = Array.isArray(v) ? v.join(', ') : v.toString();
    return `<div class="field-row">
      <div class="field-label">${(f.label || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>
      <div class="field-value">${display.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
    </div>`;
  }).join('');
}
