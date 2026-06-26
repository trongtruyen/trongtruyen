/* main.js — entry point: imports all modules, wires up nav + global events */

import { load, db } from './storage.js';
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
import { triggerImport, handleImport } from './import.js';

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
window._toggleTheme = () => {
  const isDark = document.documentElement.dataset.theme === 'dark';
  const next = isDark ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('tt-theme', next);
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = next === 'dark' ? '🌙 Tối' : '☀ Sáng';
};

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
window._showExportMenu  = () => document.getElementById('export-modal')?.classList.add('open');
window._closeExportMenu = () => document.getElementById('export-modal')?.classList.remove('open');
window._exportJSON = () => { window._closeExportMenu(); exportJSON(); };
window._exportPDF  = () => { window._closeExportMenu(); exportPDF(); };

/* ── Wire module functions to window ────────────── */
window.switchSection = switchSection;

// Characters
window.showCharForm       = () => showCharForm();
window.saveCharacter      = saveCharacter;
window.deleteCharacter    = deleteCharacter;
window.cancelCharForm     = cancelCharForm;
window.charAddCustomField = charAddCustomField;

// Plot
window.savePlot           = () => { savePlot(); _updateTopbarTitle(); };
window.plotAddCustomField = plotAddCustomField;

// Storylines
window.showStorylineForm       = () => showStorylineForm();
window.saveStoryline           = saveStoryline;
window.deleteStoryline         = deleteStoryline;
window.cancelStorylineForm     = cancelStorylineForm;
window.storylineAddCustomField = storylineAddCustomField;

// Worlds
window.showWorldForm       = () => showWorldForm();
window.saveWorld           = saveWorld;
window.deleteWorld         = deleteWorld;
window.cancelWorldForm     = cancelWorldForm;
window.worldAddCustomField = worldAddCustomField;

// Chapters — created from events; can also be edited standalone
window.showChapterForm       = (chapId, fromEventId) => showChapterForm(chapId, fromEventId);
window.saveChapter           = saveChapter;
window.deleteChapter         = deleteChapter;
window.cancelChapterForm     = cancelChapterForm;
window.chapterAddCustomField = chapterAddCustomField;

// Create chapter from event detail
window._createChapterForEvent = (eventId) => {
  switchSection('chapters');
  showChapterForm(null, eventId);
};

// Events
window.showEventForm       = () => showEventForm();
window.saveEvent           = saveEvent;
window.deleteEvent         = deleteEvent;
window.cancelEventForm     = cancelEventForm;
window.eventAddCustomField = eventAddCustomField;

// Notes
window.showNoteForm   = () => showNoteForm();
window.saveNote       = saveNote;
window.deleteNote     = deleteNote;
window.cancelNoteForm = cancelNoteForm;
window.noteAddTag     = noteAddTag;

// Sources
window.showSourceForm   = () => showSourceForm();
window.saveSource       = saveSource;
window.deleteSource     = deleteSource;
window.cancelSourceForm = cancelSourceForm;

// Import
window.triggerImport = triggerImport;
window.handleImport  = handleImport;

/* ── Init ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Restore saved theme
  const savedTheme = localStorage.getItem('tt-theme') || 'light';
  document.documentElement.dataset.theme = savedTheme;
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = savedTheme === 'dark' ? '🌙 Tối' : '☀ Sáng';

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
  const importInput = document.getElementById('import-input');
  if (importInput) importInput.addEventListener('change', handleImport);

  // Close modals on overlay click
  document.getElementById('char-popup-overlay')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) window._charClosePopup?.();
  });
  document.getElementById('export-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) window._closeExportMenu();
  });
  document.getElementById('create-chapters-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });
  document.getElementById('move-chapter-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
  });
});
