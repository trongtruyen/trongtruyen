/* storage.js — db object, load(), save() */

const STORAGE_KEY = 'story-vault-v3';

export let db = {
  meta: { title: '', lastModified: '' },
  schemas: {
    characters: { customFields: [] },
    plot:        { customFields: [] },
    storylines:  { customFields: [] },
    worlds:      { customFields: [] },
    chapters:    { customFields: [] },
    events:      { customFields: [] }
  },
  data: {
    characters: [],
    plot:        {},
    storylines:  [],
    worlds:      [],
    chapters:    [],
    events:      [],
    notes:       [],
    sources:     []
  }
};

export function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge to ensure all schema keys exist (forward compatibility)
      db = parsed;
      if (!db.schemas.storylines) db.schemas.storylines = { customFields: [] };
      if (!db.schemas.worlds)     db.schemas.worlds     = { customFields: [] };
      if (!Array.isArray(db.data.storylines)) db.data.storylines = [];
      if (!Array.isArray(db.data.worlds))     db.data.worlds     = [];
    }
  } catch (e) { console.warn('Storage parse error', e); }
}

export function save() {
  db.meta.lastModified = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function replaceDb(newDb) {
  db = newDb;
  if (!db.schemas.storylines) db.schemas.storylines = { customFields: [] };
  if (!db.schemas.worlds)     db.schemas.worlds     = { customFields: [] };
  if (!Array.isArray(db.data.storylines)) db.data.storylines = [];
  if (!Array.isArray(db.data.worlds))     db.data.worlds     = [];
  save();
}

/* ── ID generation ───────────────────────────────── */
export function genId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
}
