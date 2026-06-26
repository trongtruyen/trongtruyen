/* overview.js — Tổng quan: plot info + 3-column interactive overview */

import { db } from '../storage.js';

export function renderOverview() {
  const container = document.getElementById('overview-content');
  if (!container) return;

  const p          = db.data.plot        || {};
  const storylines = db.data.storylines  || [];
  const characters = db.data.characters  || [];
  const worlds     = db.data.worlds      || [];
  const events     = db.data.events      || [];
  const chapters   = db.data.chapters    || [];

  /* ── Plot summary block ───────────────────────────── */
  const plotBlock = (p.title || p.author || p.genreTagline || p.summary || p.theme || p.message) ? `
    <div class="overview-plot-block">
      ${p.title       ? `<div class="overview-plot-title">${_esc(p.title)}</div>` : ''}
      ${p.author      ? `<div class="overview-plot-meta">Tác giả: ${_esc(p.author)}</div>` : ''}
      ${p.genreTagline? `<div class="overview-plot-meta">Thể loại: ${_esc(p.genreTagline)}</div>` : ''}
      ${p.summary     ? `<div class="overview-plot-summary">${_esc(p.summary)}</div>` : ''}
      <div class="overview-plot-fields">
        ${p.theme   ? `<div class="overview-plot-field"><span class="overview-plot-label">Chủ đề</span>${_esc(p.theme)}</div>` : ''}
        ${p.message ? `<div class="overview-plot-field"><span class="overview-plot-label">Thông điệp</span>${_esc(p.message)}</div>` : ''}
      </div>
      <div class="overview-plot-stats">
        <span>${characters.length} nhân vật</span>
        <span>${events.length} sự kiện</span>
        <span>${chapters.length} chương</span>
        <span>${storylines.length} tuyến truyện</span>
      </div>
    </div>` : '';

  /* ── 3-column grid ────────────────────────────────── */
  const grid = `
    <div class="overview-grid">

      <!-- Col 1: Storylines -->
      <div class="overview-col">
        <div class="overview-col-title" style="color:var(--story-color)">Tuyến truyện
          <span class="overview-count">${storylines.length}</span>
        </div>
        ${storylines.length
          ? storylines.map(s => {
              const relEvs = (s.relatedEvents || []).map(r => events.find(e => e.id === r.eventId)).filter(Boolean);
              const chars  = (s.involvedCharacters || []).map(r => characters.find(c => c.id === r.characterId)).filter(Boolean);
              return `<div class="overview-item">
                <div class="overview-item-dot" style="background:var(--story-color)"></div>
                <span class="overview-item-name">${_esc(s.title) || '(chưa đặt tên)'}</span>
                <div class="hover-card">
                  <div class="hover-card-title">${_esc(s.title) || ''}</div>
                  ${s.summary ? `<div class="hover-card-body">${_esc(s.summary)}</div>` : ''}
                  ${relEvs.length ? `
                    <div class="hover-card-section">
                      <div class="hover-card-label">Sự kiện liên quan</div>
                      ${relEvs.slice(0, 6).map(e => `<div class="hover-card-row">• ${_esc(e.title)}</div>`).join('')}
                      ${relEvs.length > 6 ? `<div class="hover-card-more">+${relEvs.length - 6} sự kiện nữa</div>` : ''}
                    </div>` : ''}
                  ${chars.length ? `
                    <div class="hover-card-section">
                      <div class="hover-card-label">Nhân vật tham gia</div>
                      <div class="hover-card-chips">
                        ${chars.slice(0, 5).map(c => `<span class="hover-chip" style="border-color:var(--char-color);color:var(--char-color)">${_esc(c.name)}</span>`).join('')}
                        ${chars.length > 5 ? `<span class="hover-chip">+${chars.length - 5}</span>` : ''}
                      </div>
                    </div>` : ''}
                  <div class="hover-card-nav">
                    <a class="hover-card-link" onclick="window._navFromOverview('storylines','${s.id}')">Xem chi tiết →</a>
                  </div>
                </div>
              </div>`;
            }).join('')
          : `<div class="overview-empty">Chưa có tuyến truyện.<br>
              <a onclick="window.switchSection('storylines')" class="overview-link">+ Thêm tuyến truyện</a></div>`}
      </div>

      <!-- Col 2: Characters -->
      <div class="overview-col">
        <div class="overview-col-title" style="color:var(--char-color)">Nhân vật
          <span class="overview-count">${characters.length}</span>
        </div>
        ${characters.length
          ? characters.map(c => {
              const importance = (c.roleImportance || []).join(', ');
              const relations  = (c.relations || []).map(r => characters.find(x => x.id === r.characterId)).filter(Boolean);
              return `<div class="overview-item">
                <div class="overview-item-dot" style="background:var(--char-color)"></div>
                <span class="overview-item-name">${_esc(c.name) || '(chưa đặt tên)'}</span>
                ${importance ? `<span class="overview-item-badge" style="border-color:var(--char-color);color:var(--char-color)">${_esc(importance)}</span>` : ''}
                <div class="hover-card">
                  <div class="hover-card-title">${_esc(c.name) || ''}</div>
                  <div class="hover-card-chips" style="margin-bottom:.5rem">
                    ${(c.roleAlignment || []).map(a => `<span class="hover-chip">${_esc(a)}</span>`).join('')}
                    ${c.age    ? `<span class="hover-chip">${_esc(c.age)} tuổi</span>` : ''}
                    ${c.gender ? `<span class="hover-chip">${_esc(c.gender)}</span>` : ''}
                  </div>
                  ${c.personality ? `<div class="hover-card-body">${_esc(c.personality).substring(0, 120)}${c.personality.length > 120 ? '…' : ''}</div>` : ''}
                  ${relations.length ? `
                    <div class="hover-card-section">
                      <div class="hover-card-label">Mối quan hệ</div>
                      ${relations.slice(0, 4).map(r => {
                        const rel = (c.relations || []).find(x => x.characterId === r.id);
                        return `<div class="hover-card-row">• ${_esc(r.name)}${rel?.note ? ` — ${_esc(rel.note)}` : ''}</div>`;
                      }).join('')}
                    </div>` : ''}
                  <div class="hover-card-nav">
                    <a class="hover-card-link" onclick="window._navFromOverview('characters','${c.id}')">Chỉnh sửa →</a>
                  </div>
                </div>
              </div>`;
            }).join('')
          : `<div class="overview-empty">Chưa có nhân vật.<br>
              <a onclick="window.switchSection('characters')" class="overview-link">+ Thêm nhân vật</a></div>`}
      </div>

      <!-- Col 3: Worlds -->
      <div class="overview-col">
        <div class="overview-col-title" style="color:var(--world-color)">Thiết lập thế giới
          <span class="overview-count">${worlds.length}</span>
        </div>
        ${worlds.length
          ? worlds.map(w => `
              <div class="overview-item overview-item-right">
                <div class="overview-item-dot" style="background:var(--world-color)"></div>
                <span class="overview-item-name">${_esc(w.title) || '(chưa đặt tên)'}</span>
                ${w.spacetime ? `<span class="overview-item-sub">${_esc(w.spacetime)}</span>` : ''}
                <div class="hover-card hover-card-left">
                  <div class="hover-card-title">${_esc(w.title) || ''}</div>
                  ${w.spacetime ? `<div class="hover-card-meta">📍 ${_esc(w.spacetime)}</div>` : ''}
                  ${w.desc ? `<div class="hover-card-body">${_esc(w.desc).substring(0, 140)}${w.desc.length > 140 ? '…' : ''}</div>` : ''}
                  ${w.politics ? `<div class="hover-card-section"><div class="hover-card-label">Chính trị</div><div class="hover-card-body">${_esc(w.politics).substring(0, 80)}…</div></div>` : ''}
                  ${w.society  ? `<div class="hover-card-section"><div class="hover-card-label">Xã hội</div><div class="hover-card-body">${_esc(w.society).substring(0, 80)}…</div></div>` : ''}
                  <div class="hover-card-nav">
                    <a class="hover-card-link" onclick="window._navFromOverview('worlds','${w.id}')">Chỉnh sửa →</a>
                  </div>
                </div>
              </div>`).join('')
          : `<div class="overview-empty">Chưa có thiết lập thế giới.<br>
              <a onclick="window.switchSection('worlds')" class="overview-link">+ Thêm thế giới</a></div>`}
      </div>

    </div>`;

  container.innerHTML = plotBlock + grid;
}

/* Navigation from overview hover card → specific module + entity */
window._navFromOverview = (section, entityId) => {
  window._returnSection = 'overview';
  window.switchSection(section);
  // Open the specific entity's form
  if (section === 'characters') window._charEditById?.(entityId);
  if (section === 'worlds')     window._worldEdit?.(entityId);
  if (section === 'storylines') window._storyEdit?.(entityId);
};

function _esc(s) {
  return (s || '').toString()
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
