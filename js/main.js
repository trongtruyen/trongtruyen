/* main.js — entry point: imports all modules, wires up nav + global events */

import { load, db, resetDb } from './storage.js';
import { showToast } from './toast.js';

// Modules
import { renderCharList, showCharForm, saveCharacter, deleteCharacter, cancelCharForm, initCharToolbar, charAddCustomField } from './modules/characters.js';
import { renderPlotForm, savePlot, plotAddCustomField } from './modules/plot.js';
import { renderStorylineList, showStorylineForm, saveStoryline, deleteStoryline, cancelStorylineForm, storylineAddCustomField } from './modules/storylines.js';
import { renderWorldList, showWorldForm, saveWorld, deleteWorld, cancelWorldForm, worldAddCustomField } from './modules/worlds.js';
import { renderChapterList, showChapterForm, saveChapter, deleteChapter, cancelChapterForm, initChapterToolbar, chapterAddCustomField, renderChapterPlan } from './modules/chapters.js';
import { renderEventList, showEventForm, saveEvent, deleteEvent, cancelEventForm, eventAddCustomField } from './modules/events.js';
import { renderNoteList, showNoteForm, saveNote, deleteNote, cancelNoteForm, noteAddTag } from './modules/notes.js';
import { renderSourceList, showSourceForm, saveSource, deleteSource, cancelSourceForm } from './modules/sources.js';
import { renderOverview } from './modules/overview.js';
import { exportJSON, exportPDF } from './export.js';
import { handleImport } from './import.js';

export { showToast };

/* ── Navigation + simple history ─────────────────── */
let _returnSection = null;

export function switchSection(name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const sec = document.getElementById('sec-' + name);
  const nav = document.querySelector(`.nav-item[data-module="${name}"]`);
  if (sec) sec.classList.add('active');
  if (nav) nav.classList.add('active');
  if (name === 'overview') renderOverview();
}

window._navBack = () => {
  if (_returnSection) {
    const dest = _returnSection;
    _returnSection = null;
    switchSection(dest);
  }
};

// Allow modules to set the return section before navigating
Object.defineProperty(window, '_returnSection', {
  get: () => _returnSection,
  set: (v) => { _returnSection = v; },
  configurable: true
});

/* ── Topbar title ────────────────────────────────── */
function _updateTopbarTitle() {
  const el = document.getElementById('topbar-plot-title');
  if (el) el.textContent = db?.data?.plot?.title || 'Câu chuyện chưa đặt tên';
}
window._updateTopbarTitle = _updateTopbarTitle;

/* ── Theme toggle ────────────────────────────────── */
function _toggleTheme() {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const next = isDark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('tt-theme', next);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = next === 'dark' ? '🌙 Tối' : '☀ Sáng';
}
window._toggleTheme = _toggleTheme;

/* ── renderAll — called after import ────────────── */
export function renderAll() {
  _updateTopbarTitle();
  renderOverview();
  renderCharList();
  renderPlotForm();
  renderStorylineList();
  renderWorldList();
  renderChapterList();
  renderChapterPlan();
  renderEventList();
  renderNoteList();
  renderSourceList();
}

/* ── Export menu ─────────────────────────────────── */
function _showExportMenu()  { document.getElementById('export-modal')?.classList.add('open'); }
function _closeExportMenu() { document.getElementById('export-modal')?.classList.remove('open'); }
window._showExportMenu  = _showExportMenu;
window._closeExportMenu = _closeExportMenu;
window._exportJSON = () => { _closeExportMenu(); exportJSON(); };
window._exportPDF  = () => { _closeExportMenu(); exportPDF(); };

/* ── Data-warning modal (New story / Import) ─────── */
function _openDataWarning(action) {
  const modal = document.getElementById('data-warning-modal');
  if (!modal) return;
  modal.dataset.action = action;
  modal.classList.add('open');
}
function _confirmDataWarning() {
  const modal  = document.getElementById('data-warning-modal');
  const action = modal?.dataset.action;
  modal?.classList.remove('open');
  if (action === 'new') {
    resetDb();
    renderAll();
    switchSection('overview');
    _updateTopbarTitle();
    showToast('Đã tạo truyện mới ✓');
  } else if (action === 'import') {
    document.getElementById('import-input')?.click();
  }
}
window._newStory           = () => _openDataWarning('new');
window._cancelDataWarning  = () => document.getElementById('data-warning-modal')?.classList.remove('open');
window._confirmDataWarning = _confirmDataWarning;

/* ── Window exports needed by dynamic HTML in modules ── */
window.switchSection = switchSection;
window._createChapterForEvent = (eventId) => {
  switchSection('chapters');
  showChapterForm(null, eventId);
};

/* ── Init ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Restore saved theme
  const savedTheme = localStorage.getItem('tt-theme') || 'light';
  document.documentElement.dataset.theme = savedTheme;
  const themeBtn = document.getElementById('theme-toggle-btn');
  if (themeBtn) themeBtn.textContent = savedTheme === 'dark' ? '🌙 Tối' : '☀ Sáng';

  window.renderAll = renderAll;
  load();
  renderAll();
  initCharToolbar();
  initChapterToolbar();

  // Nav click handlers
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const module = item.dataset.module;
      if (module) switchSection(module);
    });
  });

  // Import file input
  document.getElementById('import-input')?.addEventListener('change', handleImport);

  // Helper: attach click listener by element ID
  const _on = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);

  // ── Topbar ──────────────────────────────────────────
  _on('theme-toggle-btn', _toggleTheme);
  _on('new-story-btn',    () => _openDataWarning('new'));
  _on('export-btn',       _showExportMenu);
  _on('import-btn',       () => _openDataWarning('import'));

  // ── Plot ─────────────────────────────────────────────
  _on('plot-add-custom-btn', plotAddCustomField);
  _on('save-plot-btn',       () => { savePlot(); _updateTopbarTitle(); });

  // ── Worlds ───────────────────────────────────────────
  _on('new-world-btn',        () => showWorldForm());
  _on('world-back-btn',       cancelWorldForm);
  _on('world-add-custom-btn', worldAddCustomField);
  _on('save-world-btn',       saveWorld);
  _on('cancel-world-btn',     cancelWorldForm);
  _on('world-delete-btn',     deleteWorld);

  // ── Characters ───────────────────────────────────────
  _on('new-char-btn',        () => showCharForm());
  _on('char-back-btn',       cancelCharForm);
  _on('char-add-custom-btn', charAddCustomField);
  _on('save-char-btn',       saveCharacter);
  _on('cancel-char-btn',     cancelCharForm);
  _on('c-delete-btn',        deleteCharacter);

  // ── Storylines ───────────────────────────────────────
  _on('new-storyline-btn',        () => showStorylineForm());
  _on('storyline-back-btn',       cancelStorylineForm);
  _on('storyline-add-custom-btn', storylineAddCustomField);
  _on('save-storyline-btn',       saveStoryline);
  _on('cancel-storyline-btn',     cancelStorylineForm);
  _on('storyline-delete-btn',     deleteStoryline);

  // ── Events / Timeline ────────────────────────────────
  _on('new-event-btn',      () => showEventForm());
  _on('event-back-btn',     cancelEventForm);
  _on('ev-add-custom-btn',  eventAddCustomField);
  _on('save-event-btn',     saveEvent);
  _on('cancel-event-btn',   cancelEventForm);
  _on('ev-delete-btn',      deleteEvent);
  _on('ev-create-chap-btn', () => window._evOpenCreateChapters?.());

  // ── Chapters ─────────────────────────────────────────
  _on('chap-back-btn',       cancelChapterForm);
  _on('chap-add-custom-btn', chapterAddCustomField);
  _on('save-chap-btn',       saveChapter);
  _on('cancel-chap-btn',     cancelChapterForm);
  _on('chap-delete-btn',     deleteChapter);

  // ── Notes ────────────────────────────────────────────
  _on('new-note-btn',    () => showNoteForm());
  _on('note-back-btn',   cancelNoteForm);
  _on('save-note-btn',   saveNote);
  _on('cancel-note-btn', cancelNoteForm);
  _on('n-delete-btn',    deleteNote);
  document.getElementById('n-tag-input')?.addEventListener('keydown', noteAddTag);

  // ── Sources ──────────────────────────────────────────
  _on('new-source-btn',    () => showSourceForm());
  _on('source-back-btn',   cancelSourceForm);
  _on('save-source-btn',   saveSource);
  _on('cancel-source-btn', cancelSourceForm);
  _on('s-delete-btn',      deleteSource);

  // ── Export modal ─────────────────────────────────────
  _on('export-pdf-btn',   () => { _closeExportMenu(); exportPDF(); });
  _on('export-json-btn',  () => { _closeExportMenu(); exportJSON(); });
  _on('close-export-btn', _closeExportMenu);

  // ── Data-warning modal ───────────────────────────────
  _on('cancel-data-warning-btn',  () => document.getElementById('data-warning-modal')?.classList.remove('open'));
  _on('confirm-data-warning-btn', _confirmDataWarning);

  // ── Create chapters modal ────────────────────────────
  _on('confirm-create-chapters-btn', () => window._confirmCreateChapters?.());
  _on('cancel-create-chapters-btn',  () => document.getElementById('create-chapters-modal')?.classList.remove('open'));

  // ── Move chapter modal ───────────────────────────────
  _on('confirm-move-chapter-btn', () => window._confirmMoveChapter?.());
  _on('cancel-move-chapter-btn',  () => document.getElementById('move-chapter-modal')?.classList.remove('open'));

  // ── Overlay / backdrop close ─────────────────────────
  document.getElementById('char-popup-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) window._charClosePopup?.();
  });
  document.getElementById('export-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) _closeExportMenu();
  });
  document.getElementById('create-chapters-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });
  document.getElementById('move-chapter-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });
  document.getElementById('data-warning-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });
});
