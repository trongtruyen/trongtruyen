# Trồng Truyện — App Specification

> This document is the input spec for Claude Code to build the application.

---

## 1. Project Overview

### 1.1. App Name

**Trồng Truyện** (Vietnamese for "Growing a Story")

Metaphor: the app is a "plot of land" where authors plant and grow story ideas — nurturing them gradually — before the idea is clear enough to start writing the actual manuscript.

### 1.2. Vision Statement

Trồng Truyện is a tool that helps novelists **brainstorm and store structured story ideas** before writing — it is not a place to write the novel itself.

### 1.3. Target User

Vietnamese-language novelists (amateur → semi-pro), low-to-medium tech proficiency, non-coders.

- May be managing long novels (many chapters) or stories with multiple parallel/episodic character arcs — this is the audience that benefits most from the Storyline mechanism (section 3.10).
- Uses laptop/desktop only; no need to access the app on mobile (section 2.5) — the need to view content on the go is solved via PDF export.
- Does not need an account, does not need to know Git/GitHub to USE the app (distinct from people who want to contribute code — see section 9.2).

### 1.4. Core Problem Statement

Authors need to **capture ideas easily and quickly**, right when an idea strikes — without being slowed down by a complicated tool.

Current tools (Google Docs, notebooks) dump every kind of information (outlines, drafts, character ideas, plot development...) into one long block of text, which becomes hard to track as the story grows or when juggling multiple stories.

Trồng Truyện solves this by managing **all information in a single interface**, organized into clear sections (characters / plot / worldbuilding...), with **easy switching between sections** for an overview at a glance — while staying simple enough for low-tech users who don't want to learn how to use a tool.

### 1.5. v1 Scope — Non-Goals

**Most important non-goal:** The app does **not** include writing the actual manuscript/chapter content. It only stores ideas, outlines, character sheets, etc. This is a clear boundary that must be respected during the build — do not add a "chapter text editor" / word-processor feature.

**Other confirmed non-goals:**

- No mobile/tablet support — laptop/desktop only (section 2.5).
- No backend/server, no accounts, no automatic multi-device sync — only localStorage + manual JSON export/import (section 2.3; multi-device sync is a v1.5+ direction, section 9.3).
- No multi-story management within a single app session — the app works with one story at a time; switching stories is done via export/import.
- No visual Relationship Map for character relationships — only a clickable text list of links in v1 (section 3.7; the visual map is a v1.5 direction, section 9.1).
- No image support for any module other than character avatars.
- No dropdown/number/date types for Custom Fields — only `text`/`textarea` (section 3.4).
- No internationalization (i18n) — Vietnamese only (section 2.6).

---

## 2. Technical Requirements & Constraints

### 2.1. Tech Stack

**Plain HTML/CSS/JavaScript (vanilla)** — no framework (React/Vue/etc.).

Rationale:

- The end user cannot code → the final deployment (static files via GitHub Pages) is the same regardless of tech choice, so framework complexity isn't needed.
- The app's scope (8 modules) doesn't warrant a framework to manage complexity.
- Business logic (schema, export, validation) is written decoupled from DOM rendering from the start — if a framework migration is needed later, the hardest part (the schema/custom-field architecture in section 3) doesn't need to be rewritten, only the UI layer.

**Structure:** Single Page App (SPA) — see section 8 for details. Do NOT split into separate `.html` files per module (this would lose in-progress form state when switching modules).

### 2.2. Runtime Environment

- Runs entirely client-side in the browser — no backend/server processing.
- **During dev/test:** because JS code is split across multiple files and loaded via ES Modules (`<script type="module">`), the app **cannot be opened directly by double-clicking the file** (`file://`) — the browser will block `import`/`export` between files with a CORS error. Run through a small local server instead (e.g. VS Code's "Live Server" extension, `python -m http.server`, or `npx serve`).
- **In production (GitHub Pages):** no issue, since GitHub Pages serves over `https://` and ES Modules work normally.
- Node.js/npm are NOT required to run the app.
- **Strictly offline-first:** Once the page has finished loading (the first time the link is opened), the app must work completely without internet — not just data entry/storage (which uses localStorage, section 2.3), but ALSO every external library (jsPDF, Quill.js), which must be bundled inside the repo (`js/vendor/` — section 2.4), not linked via CDN. Goal: even on the very first page load under weak/no connectivity, every feature (including PDF export and rich text) must work fully once `index.html` and the static assets have finished downloading.

### 2.3. Data Storage

**`localStorage` only** — no IndexedDB, no backend/database, no server sync. This is a deliberate, fixed decision for v1, not a temporary default.

**How it works:**

- The entire `db` object (containing `meta`, `schemas`, `data` — section 3.2) is serialized with `JSON.stringify()` and saved to a single key in localStorage.
- On reopening the app, that key is read with `localStorage.getItem()` and parsed with `JSON.parse()` to restore `db`.
- localStorage is scoped per domain + browser — it does NOT auto-sync across devices/browsers (this is why the Export/Import JSON feature in section 4.10/4.11 exists — to let users manually move data to another machine).

**Storage limit:** localStorage is typically limited to ~5–10MB per domain (varies by browser). This limit was already accounted for when deciding to resize avatar images down to 64×64px (section 3.6) — do not increase image size without reconsidering this limit.

Do not add IndexedDB or any other storage mechanism even if it seems "more technically sound" (e.g. for image handling) — localStorage is a deliberate choice prioritizing simplicity over optimization.

### 2.4. External Libraries

**General principle:** Prefer vanilla JS and built-in browser APIs first. Only add an external library when truly necessary for a complex task that isn't reasonable to hand-roll — and the library must be free (free/open-source, no trial limits or hidden fees).

**How to load libraries: download the file and store it inside the repo** (`js/vendor/`), do NOT link directly to a CDN. Reason: the app must be 100% offline-capable even on first load (section 2.2) — using a CDN means the first page load (or whenever the browser cache expires) still requires internet to fetch the library. Download the library's `.js` file, copy it into `js/vendor/`, and load it via a local path (`<script src="js/vendor/jspdf.min.js">`) — this still does not use `npm install`; it's simply a change of file source from "CDN link" to "static file bundled in the repo".

**Libraries already identified as needed:**

- **jsPDF** (version `2.5.1`, stored at `js/vendor/jspdf.min.js`) — used for the PDF export feature (section 4.10).
- **Quill.js** (version `1.3.6`, stored at `js/vendor/quill.js` + `css/vendor/quill.snow.css`) — used for the rich text editor on the character Notes field (section 3.9).

**Tasks that do NOT need an external library** (use built-in browser APIs):

- Resizing avatar images (section 3.6) → plain `<canvas>`
- Form management, custom fields, localStorage → vanilla JS
- Icons in the UI (navbar, badges...) → built-in emoji, no icon font/library needed

If a need for a new library arises during the build, it's allowed — provided that (1) it's completely free, and (2) the file is downloaded and stored in `js/vendor/` (or `css/vendor/`), not loaded via CDN/npm/bundler.

### 2.5. Device Compatibility

**Laptop/desktop support only.** No need to optimize or test for mobile/tablet — there is no "view on phone" version of this app.

- No responsive breakpoints needed for narrow screens.
- Supported browsers: any modern desktop browser (Chrome, Edge, Firefox, Safari).
- The need to "review ideas on the go" is solved by the exported PDF file (section 4.10) — not by making the app responsive.
- No media queries for narrow viewports, no touch-event handling needed — always assume mouse + keyboard, screen width ≥1024px.

### 2.6. UI Language

**Vietnamese** — all UI text (labels, placeholders, buttons, toast messages, module names...) is in Vietnamese; no i18n system needed for v1.

- No need to build an i18n system — Vietnamese text is hard-coded directly in HTML/JS.
- String handling must correctly support Vietnamese diacritics (notably: `slugify()` in section 3.5 already strips diacritics when generating custom-field IDs — keep this logic as-is; do NOT strip diacritics anywhere text is displayed to the user).
- The HTML file must declare `<meta charset="UTF-8">`.

### 2.7. Performance / Limits

Since there's no backend, every sort/filter/search task is performed with vanilla JavaScript (`.filter()`, `.sort()`) directly on an in-memory array (loaded from localStorage on app start) — no network request, results appear nearly instantly.

**Decision for long lists** (list-type modules: Characters, Chapters, Timeline...):

- **Pagination** — e.g. 20 entries/page, with next/previous (or page-number) controls.
- **Combine Search + Filter + Sort** directly on the list (UI details in section 4.1, applied similarly to the Chapters/Timeline modules where appropriate):
  - **Search:** filter by keyword — narrows results as the user types (`.filter()` with `includes()`, case-insensitive).
  - **Filter:** filter by a specific field (e.g. by `role`).
  - **Sort:** sort by name or another field. Sorting Vietnamese strings MUST use `localeCompare(b.value, 'vi')` — never the default string comparison (`a > b`), which gets diacritics wrong (e.g. "Ánh" might sort incorrectly relative to "An").
- Pagination is applied AFTER filtering/searching — the page count is based on the filtered result set, not the full underlying list.

**Performance target:** No hard numeric cap, but the architecture (pagination + filtering on plain JS arrays) must remain smooth with a few hundred entries per module.

---

## 3. Data Architecture

### 3.1. Schema vs Data Model

**The foundational principle of the entire app:** separating two concepts — **Schema** (defines what a form looks like: which fields, what labels, what data types) and **Data** (the actual values the user has entered into those fields).

```
Schema (structure)              Data (actual values)
──────────────────              ────────────────────
{ id:"name",                    { name:"An",
  label:"Character name",         role:"Protagonist",
  type:"text" }                   mon_phai:"Shaolin" }
```

**Why this separation is required** (instead of hand-writing each `<input id="c-name">`):

- It enables a single `renderFieldsInto()` function to render every form for every module, instead of hand-coding each input per field — eliminating code duplication.
- It is a prerequisite for the Custom Field feature (section 3.4) to work at all: a user "adding a new field" is really just pushing an object into the Schema array at runtime; the render function automatically reads and draws the new field — no code changes, no new `<input>` to write.
- Field-handling functions (`buildFieldEl()`, `collectFieldValues()`) don't need to know whether a field is core or custom — to them, every field has the same shape (`{id, label, type}`), so the handling logic is identical.

### 3.2. Overall localStorage Structure

All data for one story is stored in a single JS object (the `db` variable), serialized with `JSON.stringify()` and saved under a single key in localStorage. The structure has 3 blocks:

```javascript
db = {
  meta: {
    title: "Kiếm Lộ Vô Song",        // story title (synced with plot.title)
    lastModified: "2026-06-25T10:00:00Z"
  },

  schemas: {
    // Every module except notes/sources has its own customFields array —
    // this is where custom fields added by the user for this story are stored
    characters: { customFields: [
      { id:"mon_phai", label:"Môn phái", type:"text" },
      { id:"canh_gioi", label:"Cảnh giới tu luyện", type:"text" }
    ]},
    plot:       { customFields: [] },
    worlds:     { customFields: [] },
    chapters:   { customFields: [] },
    events:     { customFields: [] },
    storylines: { customFields: [] }
  },

  data: {
    characters: [
      { id:"char_001", name:"An", roleImportance:["Protagonist"], roleAlignment:["Hero"],
        mon_phai:"Shaolin", canh_gioi:"...", avatar:"data:image/jpeg;base64,...",
        visibleOptionalFields:["backstory"] }
      // each character is an object; key = field id (core or custom), value = entered value
    ],
    plot: { author:"...", title:"...", genreTagline:"...", summary:"..." },   // single object — story-wide overview
    worlds: [
      { id:"world_001", title:"...", spacetime:"...", desc:"...",
        environment:"...", politics:"...", society:"...", exception:"", history:"" }
      // array — most stories have exactly one entry, but multiple are supported for epic/multi-world stories
    ],
    chapters: [
      { id:"chapter_001", num:1, title:"...", storylineId:"story_001",
        relatedEvents:[{ eventId:"event_006", narrativeType:"chronological", lengthOverride:null }] }
    ],
    events: [
      { id:"event_004", chronologyOrder:0, isFlashback:true, estimatedLength:10, time:"...", severity:"High", title:"..." },
      { id:"event_006", chronologyOrder:1, isFlashback:false, estimatedLength:5, time:"...", severity:"Medium", title:"..." }
      // NOTE: there is no stored "occurrences" field — the occurrence count of an
      // isFlashback=true event is always COUNTED from chapters.relatedEvents at render time
    ],
    storylines: [
      { id:"story_001", title:"...", summary:"...",
        involvedCharacters:[{characterId:"char_001", note:"..."}],
        relatedEvents:[{eventId:"event_006"}],
        relatedStorylines:[] }
    ],
    notes:   [ {...}, {...} ],   // array — no custom fields
    sources: [ {...}, {...} ]    // array — no custom fields
  }
}
```

**Important rule:** `schemas` MUST be stored together with `data` in the same object — because the next time the app opens, it needs to know "what custom fields does the Characters module have for THIS story" in order to render the form correctly. The exported JSON file (section 4.10) must include `schemas`, not just `data`.

### 3.3. Fixed Schema (Core Fields) per Module

#### Module `characters` (Characters)

| id | label | type | Status |
|---|---|---|---|
| `id` | *(hidden)* | — | system — auto-generated (e.g. `char_001`), used by other modules to reference this character (section 3.7) |
| `name` | Character name | text | **Required, fixed** |
| `roleImportance` | Importance | multi-tag | **Required** (select ≥1), fixed. Options: **Nhân vật chính** (protagonist — central to the whole plot) / **Nhân vật phụ** (supporting — appears throughout, mid-level role) / **Nhân vật quần chúng** (crowd/minor — appears in 1–2 events only, no major plot impact). Each option shows an inline hint text below the selector to guide the user's choice. Each tier has its own color: protagonist = purple `#7C3AED`, supporting = blue `#1D4ED8`, minor = gray `#6B7280`. |
| `roleAlignment` | Alignment | multi-tag | **Required** (select ≥1), fixed. Options: Hero / Villain / Neutral |
| `avatar` | Avatar image | image | Value optional, field is fixed and always shown (section 3.6) |
| `gender` | Gender | select | Fixed, always shown. Options: Male / Female / Other |
| `age` | Age | text | Fixed, always shown |
| `personality` | Personality | textarea | Fixed, always shown |
| `relations` | Relationships | reference | Fixed, always shown — links to other characters (section 3.7) |
| `origin` | Background | text | Optional field — hidden by default (section 3.8) |
| `appearance` | Appearance | textarea | Optional field — hidden by default |
| `goal` | Goal / Motivation | textarea | Optional field — hidden by default |
| `backstory` | Backstory | textarea | Optional field — hidden by default |
| `notes` | Personal notes | richtext | Optional field — hidden by default. Uses Quill.js (section 3.9), stored as HTML string |
| `visibleOptionalFields` | *(hidden)* | — | system — array of optional field ids currently shown for this specific character (section 3.8) |

Rationale for splitting the original single `role` select into two multi-tag fields: a character can simultaneously be the "protagonist" AND part of the "hero" alignment — a single select cannot represent that combination. Splitting into two groups prevents contradictory selections within the same group (can't pick both "protagonist" and "supporting"), while still allowing free combination across the two groups.

#### Module `plot` (Plot — single object, story-wide overview)

| id | label | type |
|---|---|---|
| `author` | Author | text |
| `title` | Story title | text |
| `genreTagline` | Genre & Tagline | text |
| `summary` | Logline / overall summary | textarea |
| `theme` | Core theme | text |
| `message` | Message to convey | textarea |

`genreTagline` merges the old `genre` + `tagline` fields into one free-text field (e.g. "Wuxia — A journey to reclaim lost memories") — at the ideation stage, this is just a reference note, no need to keep the data separate. `author` records authorship on the file.

`plot` now only holds overview information that applies to the WHOLE story, not to any specific arc — the actual plot progression has moved to the `storylines` module.

#### Module `storylines` (Storylines / Arcs — list)

| id | label | type | notes |
|---|---|---|---|
| `id` | *(hidden)* | — | system — auto-generated (e.g. `story_001`) |
| `title` | Storyline name | text | **Required** — e.g. "Main arc — An's quest to reclaim memory" |
| `summary` | Summary of this arc | textarea | |
| `involvedCharacters` | Involved characters | reference → `characters` | each row: {characterId, note} (section 3.7) |
| `relatedEvents` | Related events | reference → `events` | each row: {eventId} — links to Timeline (section 3.10) |
| `relatedStorylines` | Linked storylines | reference → `storylines` (self) | each row: {storylineId, note} — automatic bidirectional link (section 3.10) |

`storylines` exists to solve the limitation of a single-arc `plot`: a story can have multiple parallel arcs, especially for episodic stories or stories with multiple concurrent character threads.

#### Module `worlds` (World Setting — list)

| id | label | type | Status |
|---|---|---|---|
| `id` | *(hidden)* | — | system — auto-generated (e.g. `world_001`) |
| `title` | World name | text | **Required** — e.g. "The Myriad-Tribes Continent" |
| `spacetime` | Time & Place | text | merges the old `era` + `location` fields into one free-text field (e.g. "Medieval era, Western Continent") |
| `desc` | World description | textarea | |
| `environment` | Environment | textarea | Pillar 1 — nature, geography, climate |
| `politics` | Politics | textarea | Pillar 2 |
| `society` | Society | textarea | Pillar 3 — incorporates culture/customs |
| `exception` | Exceptions / Special rules | textarea | Optional — leave blank if not needed (e.g. an underground magic system) |
| `history` | History | textarea | Optional — leave blank if not needed |
| `notes` | Additional notes | textarea | |

This is a LIST, not a single object — epic, multi-generational, or multi-universe/fantasy stories may need multiple independent world settings. The vast majority of stories need only one entry — the UI stays simple for this case; a "+ Add world" button only appears for anyone who needs more than one.

The `exception`/`history` fields use a simpler mechanism than the Characters per-entry optional fields (section 3.8) — these fields are ALWAYS shown on the form, with no dynamic show/hide; the author simply leaves them blank if unused.

#### Module `chapters` (Chapters / Scenes — list)

| id | label | type | notes |
|---|---|---|---|
| `id` | *(hidden)* | — | auto-generated (e.g. `chapter_001`) |
| `num` | Chapter number | number | the story's main "narrative order" axis (section 3.11) |
| `title` | Chapter title | text | |
| `summary` | Summary | textarea | |
| `chars` | Characters appearing | reference → `characters` | section 3.7 |
| `storylineId` | Belongs to storyline | reference → `storylines` (1-to-1) | each chapter belongs to exactly one storyline (section 3.11) |
| `relatedEvents` | Events told | reference → `events` (many-to-many) | each row: {eventId, narrativeType, lengthOverride} (section 3.11/3.12) |
| `place` | Location | text | |
| `goal` | Chapter goal | textarea | |
| `notes` | Notes / Ideas | textarea | |

`lengthOverride` (number, nullable) only has meaning when the referenced event has `isFlashback=true` — `null` means use the auto-calculated even split.

#### Module `events` (Timeline — list)

| id | label | type | notes |
|---|---|---|---|
| `id` | *(hidden)* | — | system — auto-generated (e.g. `event_001`) |
| `chronologyOrder` | Position in story timeline | number | the TRUE position in the story world's timeline, distinct from when it's NARRATED (section 3.11). Reordered by drag-and-drop on the Timeline UI |
| `isFlashback` | Is this a recurring/out-of-order event? | boolean | false: linear event (occupies one contiguous block on the narrative axis). true: the event can appear multiple times, scattered (section 3.12) |
| `estimatedLength` | Estimated length (chapters) | number | total number of chapters this event occupies across the whole story (section 3.12) |
| `time` | Time (description) | text | free text, purely descriptive — NOT used for sorting (sorting uses `chronologyOrder`) |
| `severity` | Severity / importance | select | options: High / Medium / Low — color-coded (section 4.6) |
| `title` | Event title | text | **Required** |
| `desc` | Detailed description | textarea | |
| `chars` | Related characters | reference → `characters` | section 3.7 |

When viewing an event's detail, add a "Belongs to storyline" section (computed in reverse from `storylines.relatedEvents`, section 3.10) and a "Told in chapter" section (computed in reverse from `chapters.relatedEvents`, including the `narrativeType` of each link, section 3.11).

#### Modules `notes` (Notes) and `sources` (Reference Sources)

No custom-field system — simple fixed structure:

| Module | Fields |
|---|---|
| `notes` | `title`, `content`, `tags` |
| `sources` | `title` (required), `type`, `url`, `notes` |

### 3.4. Custom Field Mechanism

**Scope:** Custom fields are added once at the module level (not per individual entry) — when a user adds a "Blood Type" field to the Characters module, this field applies to every character in that story.

**Modules that support custom fields:** `characters`, `plot`, `worlds`, `chapters`, `events`, `storylines`. **Modules that do NOT support them:** `notes`, `sources` (already simple/free-form structures; no need for a dynamic field mechanism).

**Supported data types:** Only 2 — `text` (single-line input) and `textarea` (multi-line). No dropdown, number, date, image, or reference type in v1 — those types (`image`, `reference`, `number`) only exist as predefined core fields, not exposed for users to create via custom fields.

**Flow for adding a new field:**

1. User enters a field name (e.g. "Blood Type") and picks a type (Short/Long) in the "+ Add custom field" area at the bottom of that module's form.
2. The system auto-generates an `id` from the name via the `slugify()` function (section 3.5).
3. The new field is pushed into `db.schemas[moduleName].customFields` and saved to localStorage immediately.
4. The form re-renders to show the new field — it applies to the entry currently open AND every other entry the next time it's opened.

**Flow for deleting a field:** Clicking "✕ remove field" next to a custom field → confirmation → the field is removed from that module's `customFields`. Data previously entered into that field, across every entry, will no longer be displayed (the old data still exists in the data object, but there's no field left in the schema to render it — section 7.3).

**Display in the form:** Custom fields show a small "custom" badge to distinguish them from core fields, plus their own remove button — core fields have neither of these.

### 3.5. Naming Rules

The `slugify()` function converts a Vietnamese field name (with diacritics) into a safe `id` for use as an object key in JS:

```javascript
function slugify(text) {
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")  // strip diacritics
    .replace(/đ/g,'d').replace(/Đ/g,'D')                // handle "đ" specially
    .replace(/[^a-z0-9\s]/g, '')                         // strip other special chars
    .trim().replace(/\s+/g, '_');                        // spaces → underscore
}
// "Môn phái" → "mon_phai"
// "Cảnh giới tu luyện" → "canh_gioi_tu_luyen"
```

The `id` is used as an object key and as part of an HTML `id` attribute — a key with Vietnamese diacritics technically still works, but is prone to hard-to-debug bugs (encoding issues during export/import, CSS selector conflicts). The `label` (the text shown to the user) keeps its original Vietnamese diacritics — only the internal-use `id` is stripped.

**Handling duplicate `id`s:** If `slugify()` produces an `id` that already exists in that module's `customFields`, the system shows a warning "This field already exists" and refuses to add the duplicate.

### 3.6. Image Handling (Character Avatar)

**Decision:** Support exactly one avatar image per character — no image support for any other module in v1.

**Trade-off principle:** Prioritize the number of supportable characters over image sharpness — a single story can have hundreds of characters; the image only needs to be recognizable, not crisp.

**Storage mechanism:**

- The image is NOT stored as a file path (this would break when switching machines). It is embedded directly in the data as a Base64 string (`data:image/jpeg;base64,...`), which automatically travels along when exporting/importing JSON.
- Before saving, the image MUST be resized to a maximum of **64×64px**, with low JPEG quality (~0.6), done with plain `<canvas>` (draw the original image into a canvas set to the small size, then output via `canvas.toDataURL('image/jpeg', 0.6)`). Estimated ~2–4KB per image after resizing — safe for a few hundred characters within the localStorage limit.
- The `avatar` field has `type: "image"` — the 3rd data type alongside `text`/`textarea`, used only for this core field.
- The value stored in `data.characters[i].avatar` is the full Base64 string, used directly as an `<img>`'s `src`.

**User notice:** When choosing an image to upload, show a short note nearby (e.g. "The image will be shrunk to save storage space"). The preview after selection should show the actual post-resize dimensions.

**Default fallback symbol when no real image exists:**

- When a character has no uploaded image, the system automatically suggests a symbol/emoji based on the `gender` and `roleAlignment` fields entered (e.g. Female → 👩, Male → 👨, unset → 🧑). This happens automatically, with no extra effort from the user.
- The user can still manually pick a different icon from a small preset palette. This manual choice is stored in a separate field, `avatarSymbol` — the display priority is: `avatar` (real image) → `avatarSymbol` (manual choice) → auto-derived symbol.

### 3.7. Cross-Reference Mechanism (Reference Field)

**Decision:** Fields that reference characters (`characters.relations`, `chapters.chars`, `events.chars`) are real links (selected from an existing list of characters), not freely typed names. This is a field of type `reference` — the 4th data type, alongside `text`/`textarea`/`image`.

**Why a hidden `id` is required:** A link must point to a stable identifier, not to `name` (names can collide, or be renamed later). Every character automatically gets an `id` like `char_` + an incrementing number or timestamp when created — completely hidden from the user, used only internally.

**Data structure for a `reference`-type field:**
```javascript
// In the schema:
{ id:"relations", label:"Relationships", type:"reference", refModule:"characters" }

// In the data — ALWAYS an array, each element is one link row:
relations: [
  { characterId: "char_002", note: "Childhood best friend" },
  { characterId: "char_005", note: "Enemy" }
]
```

Each link row consists of: `characterId` + `note` (a short freely typed description). Each row contains only one character — if multiple links are needed, add multiple rows.

**UI when rendering a `reference` field:**

- Show the list of existing link rows, each with: a dropdown/autocomplete to pick a character (search by name) + a text box for the relationship note + a delete button for that row.
- A "+ Add link" button to add a new row.
- The character currently being edited does NOT appear in its own `relations` field's dropdown.

**Handling character deletion:** The system automatically scans for and removes every dangling link pointing to that character across all other modules (`characters.relations`, `chapters.chars`, `events.chars`) — done as part of the delete-character function, silently, with no separate notification needed.

**Display when viewing:** A linked character's name should be clickable → jumps to that character's detail screen. This is v1's full scope — just a clickable text list, no visual diagram (the visual Relationship Map is a v1.5 feature, section 9.1 — it requires a graph-drawing library/layout algorithm, significantly more complex than the data/form work designed here).

### 3.8. Per-Entry Optional Field Mechanism

Distinct from Custom Field (section 3.4):

| | Custom Field | Optional Field |
|---|---|---|
| Already defined in the schema? | No — the user types a brand-new field name | Yes — the field is already defined in `CORE_SCHEMAS`, just hidden |
| Scope | Per module/whole story | Per individual entry (each character shows/hides independently) |
| What the user does | Types a name + picks a type | Just checks a box to reveal an existing field |

**Applied to the `characters` module:** 5 fixed fields are always shown: `avatar`, `gender`, `age`, `personality`, `relations` (plus `name`/`roleImportance`/`roleAlignment`, which are required). The remaining fields (`origin`, `appearance`, `goal`, `backstory`, `notes`) are hidden by default, revealed only when the user actively turns them on.

**State storage mechanism:** Each character has an additional hidden field, `visibleOptionalFields` — an array containing the `id`s of optional fields currently turned on for that specific character:
```javascript
{ id:"char_001", name:"An", ..., visibleOptionalFields: ["origin", "backstory"] }
{ id:"char_002", name:"Bình", ..., visibleOptionalFields: ["appearance"] }
```

**UI for turning on optional fields:** At the bottom of the detail form, a "+ Add more details" area — clicking reveals a checklist of optional fields not yet enabled. Checking one adds it to that character's `visibleOptionalFields` and shows the field immediately in the form.

**Turning an optional field back off:** If the user unchecks a field that was previously enabled and contains data, confirm before hiding it — the old data remains in the data object, just no longer displayed until re-enabled.

**v1 scope:** This mechanism applies only to `characters` — other modules (`plot`, `worlds`, `chapters`, `events`, `storylines`) keep the original "every core field is always shown" behavior.

### 3.9. Rich Text for the Notes Field

**Decision:** The character `notes` field uses a rich text editor instead of a plain `textarea` — allowing basic formatting (bold, italic, bullet lists) similar to simple word-processor text.

**Library: Quill.js**, loaded from a local file in `js/vendor/` (section 2.4) — not via CDN.

**Storage:** Quill outputs content as an HTML string (e.g. `"<p><b>Important:</b> An hates water</p>"`) — still plain text, stored in `data.characters[i].notes` just like any other field, with no change needed to the localStorage architecture.

**When exporting to PDF:** HTML must be converted to text while preserving basic formatting where feasible (jsPDF supports bold/italic via `setFont(undefined, 'bold')`), or at minimum strip HTML tags so `<b>...</b>` doesn't appear literally in the PDF.

This field does NOT render through the standard `buildFieldEl()` — it needs a separate branch within `renderFieldsInto()`/`buildFieldEl()` to initialize a Quill instance whenever a field has `type: "richtext"`.

### 3.10. The `storylines` Module — Extending the Reference Mechanism

**Context:** The original design had a single `plot` object for the whole story, assuming one linear storyline. For stories with multiple parallel character arcs or episodic structure, a single object isn't enough — each arc needs to be its own independent entry. `storylines` reuses the exact `reference` mechanism already designed in section 3.7, just extended in scope.

**Extending the scope of `reference`:**

| Field | Containing module | References | Link type |
|---|---|---|---|
| `characters.relations` | characters | characters (other) | one-directional |
| `chapters.chars`, `events.chars` | chapters/events | characters | one-directional |
| `storylines.involvedCharacters` | storylines | characters | one-directional |
| `storylines.relatedEvents` | storylines | events | one-directional |
| `storylines.relatedStorylines` | storylines | storylines (self) | automatic bidirectional |

**Automatic bidirectional linking for `relatedStorylines`:**

- **Only stored one-directionally** — when an author adds a link from Storyline A to Storyline B, the data is stored ONLY in `A.relatedStorylines`. No mirrored entry is written into `B.relatedStorylines`.
- **The bidirectional display is computed at render time, never duplicated in storage:** when viewing Storyline B's details, the system scans all other entries in `data.storylines`, finds any storyline whose `relatedStorylines` contains `storylineId: "B"`, and shows those as reverse links: "Linked from: [Storyline A] — note".
- **Why this single-source-of-truth design:** it avoids data-drift bugs (e.g. removing the link on A but forgetting to remove the mirrored copy on B) — there's only one place data is stored; the reverse direction is purely a computed result at display time.

**The same reverse-lookup-at-display-time principle applies to `storylines.relatedEvents` (storyline → event):** when viewing an event's detail, show "Belongs to which storyline" by scanning `data.storylines`. This is not a true bidirectional link (the relationship is storyline "owns" many events, not a peer-to-peer relation), but the reverse-display pattern is the same — no new stored field is needed on `events`.

**Cleaning up dangling links on deletion:**

- Deleting an `event` → automatically clean up dangling references in `storylines.relatedEvents` for every storyline that referenced it.
- Deleting a `storyline` → automatically clean up dangling references in `relatedStorylines` for every other storyline that referenced it.

### 3.11. Two Time Axes: Chronology vs Narrative Order

**The core problem:** An event isn't necessarily narrated in the same order it occurs within the story's world — techniques like flashback/flash-forward decouple "story time" from "narration order." The original design (just `events.time` as text, sorted by entry order) cannot represent this.

**Solution — split into two independent axes:**

| Axis | Storage field | Meaning |
|---|---|---|
| Axis 1 — Chronology (story time) | `events.chronologyOrder` (number) | The event's FIXED position in the story world's timeline — unchanged no matter how it's narrated |
| Axis 2 — Narrative Order (telling order) | `chapters.num` (number) | The chapter's position in the book — the order the reader actually experiences, which may not match Axis 1 at all |

**Linking the two axes via `chapters.relatedEvents` (many-to-many):**
```javascript
chapters: [
  { id:"chapter_001", num:1, relatedEvents:[
      { eventId:"event_005", narrativeType:"flashback" }
    ] },
  { id:"chapter_002", num:2, relatedEvents:[
      { eventId:"event_001", narrativeType:"chronological" }
    ] }
]
```

**Many-to-many relationship between Event and Chapter:** one event can be linked to multiple chapters (e.g. teased in chapter 1, told in full in chapter 15 as a flashback) — matching the need to tell a story in a non-continuous/drip-fed way. Conversely, one chapter can also tell multiple events.

**The `narrativeType` field** is attached to each individual link (Chapter↔Event pair), not to the Event or Chapter alone — because the same event might be "in chronological order" in one chapter but "a flashback" when referenced again in another chapter. Options: `Chronological` / `Flashback` / `Flash-forward` / `Unclear`.

Automatic suggestion (not mandatory): when an author links an event to a chapter, the app may compare `chronologyOrder` values to suggest an appropriate label — the author can always override.

**Chapter ↔ Storyline relationship (1-to-1):** the `chapters.storylineId` field — each chapter belongs to exactly one storyline. This is a single-value reference field (one value, not an array of rows like other reference fields — because the relationship is 1-to-1). When viewing a Storyline's detail, show the reverse-computed list of Chapters whose `storylineId` points to it.

**Cleaning up dangling links on deletion:**

- Deleting an `event` → clean up every row in any chapter's `relatedEvents` that referenced it.
- Deleting a `storyline` → set `chapters.storylineId` to null for every chapter that belonged to it (the chapter itself is not deleted, just disconnected).

### 3.12. Chapter Planning Engine

**Context:** Authors often have to mentally imagine or manually count which event occupies which chapter. This mechanism automates the calculation (cumulative chapter counting) while leaving the creative decisions (narration order, where to insert flashbacks) entirely to the author — the system cannot and should not make these decisions.

**Two event types, handled differently:**

| Type | `isFlashback` | Appears on the narrative axis | Chapter-count method |
|---|---|---|---|
| Linear | `false` | Exactly once, as one contiguous block | Linear cumulative sum — fully automatic |
| Non-linear (flashback/flash-forward) | `true` | Multiple times, scattered | Splits `estimatedLength` evenly across however many times the author has dragged it, with manual overrides allowed |

**Mechanism 1 — main axis (non-flashback events): automatic cumulative sum**
```javascript
// Sort isFlashback=false events by chronologyOrder (drag-and-drop in the UI)
let currentChapter = 1;
linearEvents.forEach(event => {
  event.startChapter = currentChapter;
  event.endChapter = currentChapter + event.estimatedLength - 1;
  currentChapter = event.endChapter + 1;
});
```

**Mechanism 2 — flashback events: dynamic counting through drag-and-drop behavior**

- The author drags an event (from a "tray" of unplaced flashback events) and drops it at the desired position — each drag-and-drop creates a new row in `chapters.relatedEvents`, with no limit on how many times this can happen.
- **The occurrence count = the number of rows** found across all `chapters.relatedEvents` pointing to that event — computed at render time, never stored as its own field (since the author may add/remove occurrences at any time while brainstorming, storing a fixed count would require constant re-syncing and risk drifting out of sync).
- **The length of each occurrence** = `estimatedLength` divided evenly by the occurrence count, with any remainder added to the last occurrence (ordered by chapter position, not drag order):
```javascript
function getOccurrenceLengths(event, occurrenceCount) {
  const base = Math.floor(event.estimatedLength / occurrenceCount);
  const remainder = event.estimatedLength % occurrenceCount;
  return Array.from({length: occurrenceCount}, (_, i) =>
    i === occurrenceCount - 1 ? base + remainder : base);
}
// e.g. estimatedLength=10, occurrenceCount=3 → [3, 3, 4]
```

- **Manual override (double-click to type a number):** each occurrence "slice" in the UI can be double-clicked to reveal a small input where the author types the exact chapter count desired for that occurrence (stored in `lengthOverride`). Occurrences without an override automatically re-split the remaining `estimatedLength`. No drag-to-resize UI is used — only double-click-to-type, to keep the UI simple and avoid drag-induced inaccuracies.
- **Automatic renumbering:** every time a flashback occurrence is added or moved, the `chapters.num` of every chapter after the insertion point must be automatically shifted up/down accordingly.

**Displaying total estimated story length:** `plot` can show a reference figure, "Estimated length: ~N chapters" = the sum of `estimatedLength` across all events — computed at display time, not a stored field.

**v1 scope:** Authors are not required to "place" every event right away — a flashback event can have "0 occurrences" (not yet dragged anywhere) without triggering any error, since the drag-and-drop process itself is a free-form brainstorming activity, not a checklist that must be completed.

---

## 4. Modules / Feature Breakdown

### 4.1. Module: Characters

**UI consists of 3 layers: List → Quick-view Popup → Full edit Form.** Rationale for moving away from a "2 screens" model to a popup: at the ideation stage, authors typically want to browse many characters rather than focus deeply on one; switching screens entirely on every view breaks that browsing flow.

**Layer 1 — List (default view when entering this module):**

- Shown as a **card grid** (`auto-fill, minmax(175px, 1fr)`) — each card shows: avatar/symbol, name, role badges (color-coded by `roleImportance` tier — purple/blue/gray), and a short personality excerpt (max 80 characters, truncated with "…"). NOT a simple single-column list.
- **Toolbar:** Search by name (filters live as you type, case-insensitive) · Filter by tag (`roleImportance` and/or `roleAlignment`) · Sort by name (using `localeCompare(..., 'vi')`).
- Pagination at the bottom — default 20 characters/page, computed on the filtered/searched result.
- Clicking a card → opens the Quick-view Popup (Layer 2), without switching screens entirely.
- "+ Add character" button → opens the full edit Form (Layer 3) directly, in a blank state.

**Layer 2 — Quick-view Popup:**

- A modal/overlay appears centered on screen, with the background dimmed.
- Shows the fixed fields (avatar, name, role tags, gender, age, personality, relations) as read-only.
- Does NOT show currently-enabled optional fields — the popup is purely a "quick glance," full detail requires opening the edit form.
- "Close" button and an "Edit / View full" button → opens the full edit Form for that character.

**Layer 3 — Full edit Form:**

- Shows all fixed fields + a "+ Add more details" area to enable optional fields (section 3.8) + custom fields if any (section 3.4).
- `avatar` field: an upload control, post-resize preview, a remove-image button, automatic fallback symbol + manual override.
- `relations` field: a list of link rows (character dropdown + note + delete row button), a "+ Add link" button.
- `notes` field (if enabled): rendered via the Quill.js rich text editor.
- Back button, Save button, Delete button (with confirmation, plus dangling-link cleanup on deletion).

### 4.2. Module: Plot

Shows a reference figure, "Estimated length: ~N chapters" — computed from the total `estimatedLength` across all events, not stored as its own field (section 3.12).

### 4.3. Module: Storylines

UI similar to the Characters module pattern: a simple list of storylines (name + count of related characters/events), clicking through to a detail view with a summary + three link sections (characters/events/other storylines). Since the number of storylines is typically small (a story might have only 3–10 arcs), pagination may not be needed.

**Storyline cards on the list view** show: title, summary text, and a **collapsible event list** (`<details>`/`<summary>`) — collapsed by default, click to expand and see the events linked to that storyline. Each event row within the expanded list shows the event title plus two inline action buttons: **Sửa** (edit — navigates to the Timeline and opens that event's form) and **Gỡ** (remove — removes the event from this storyline only, with a confirmation prompt; does not delete the event itself).

### 4.4. Module: World Setting (Worlds)

Since this is now a list (section 3.3), it needs UI similar to Storylines — a list of worlds (usually just one) + a "+ Add world" button for anyone who needs more than one. The detail form follows the 3 fixed pillars (Environment/Politics/Society) plus optional Exceptions/History fields (always shown, no dynamic show/hide).

**3-column form layout:** The three core pillars — "Môi trường & Địa lý" (Environment & Geography), "Xã hội & Văn hoá" (Society & Culture), and "Chính trị & Lịch sử" (Politics & History) — are displayed side-by-side in a **3-column CSS grid** (`repeat(3, 1fr)`). Rationale: these three aspects are interconnected and authors frequently need to reference them together when filling in details. The fields that appear above (title, spacetime, desc) and below (exception, notes) the 3-column block are full-width.

### 4.5. Module: Chapters / Scenes

Apply the same list-view pattern with search/filter/sort/pagination as the Characters module.

**Chapters are grouped by their parent event** in the list view — each event appears as a collapsible `<details>`/`<summary>` group header (open by default). The header shows: a severity color dot, the event title, and the chapter count for that group. Chapters within a group are shown as rows with title, order, and inline Sửa/Xóa/Chuyển (edit/delete/move) action buttons. This grouping replaces the flat list from earlier designs and makes it easier to see how chapters map to events.

The Chapter Planning Engine from section 3.12 (drag-and-drop auto-numbering scaffold) is a v1.5 feature — not implemented in v1. In v1, chapter creation is driven manually from the Event detail form (a "+ Tạo chương" button that opens a modal to select how many chapters to create), or edited standalone in the Chapters module.

### 4.6. Module: Timeline (Events)

Each event is color-coded by `severity` (section 3.3, section 6.3): 🔴 red/orange for "High," 🟡 yellow/amber for "Medium," ⚪ gray/light-blue for "Low." Add a "Belongs to storyline" section (reverse-computed from `storylines.relatedEvents`, section 3.10) in the event detail view. Sorted by `chronologyOrder`, with drag-and-drop support for reordering (section 3.11).

### 4.7. Module: Notes

A free-form list of notes, each with a title + content + tags.

### 4.8. Module: Reference Sources

A list of reference links/books/articles, each with a required title + type + URL + notes.

### 4.9. Custom Field Feature

- **UI to add a field:** a "+ Add custom field" area at the bottom of each supported module's form (section 3.4) — a name input + a type dropdown (Short/Long) + an "+ Add" button.
- **UI for displaying an added field:** a "custom" badge + its own "✕ remove field" button.
- **UI to remove a field:** clicking "✕ remove field" → confirm dialog clearly stating the consequence (section 7.3) → if confirmed, removed from the schema, form re-rendered immediately.
- The `notes`/`sources` modules don't have this area.

### 4.10. Export Feature (PDF, JSON)

**JSON export:** `JSON.stringify(db, null, 2)` for the entire object (`meta`, `schemas`, `data`) → create a `Blob` → trigger download, filename based on `plot.title`.

**PDF export (using jsPDF):** Structure the file in this order, with each section read through `getFullSchema()` to print both core and custom fields:

1. Cover: `title` + `author` + `genreTagline` + the "Estimated length: ~N chapters" figure
2. Plot section — remaining `plot` fields
3. Storylines section — for each storyline: name, summary, list of related characters/events as text
4. Characters section — fixed fields + currently-enabled optional fields + custom fields. Avatar embedded via `doc.addImage()`. The `notes` field (richtext): strip HTML tags or preserve basic formatting
5. World Setting section — for each world entry: name + 3 pillars + exceptions/history if present
6. Chapters section — sorted by `num`, with the owning storyline + a summary of related events
7. Timeline section — sorted by `chronologyOrder` (not by entry order), with `severity` (written as text) and a flag if `isFlashback`
8. Notes, Reference Sources sections

Exporting to PDF/JSON never creates new data — it's just two different presentations of the existing `db`.

### 4.11. Import Feature (JSON)

- Read the file via `FileReader` → `JSON.parse()` (catch syntax errors — section 7.4).
- Validate minimal structure: `parsed.data` and `parsed.schemas` must exist — if missing, show an error and do not overwrite the current `db`.
- If valid: **completely overwrite** the current `db` with the imported file's content (no merging) → save → re-render.
- This also serves as the "switch stories" mechanism — there's no separate "manage multiple stories" UI; import fills that role.

---

## 5. User Flows

### 5.1. Opening the App for the First Time

```
Open index.html (or the GitHub Pages link) → browser loads the app
        ↓
load() runs: checks the "story-vault-v3" localStorage key
        ↓
NO existing data → db is initialized with empty defaults
        ↓
Default screen displayed (Characters module) with an empty state
— e.g. "No characters yet. Click + Add Character to begin."
```

No onboarding/tutorial in v1 — the UI is meant to be self-explanatory via placeholders/empty states.

### 5.2. Adding / Editing / Deleting an Entry (e.g. a character)

**Add new:**
```
List → "+ Add character" → full edit Form, blank
        ↓
Fill required fields (name, roleImportance, roleAlignment) + optionals if desired
        ↓
Click "Save" → validate required fields → push into data.characters,
auto-generate an id → save to localStorage → return to the List
```

**Edit:**
```
List → click a character → Quick-view Popup → "Edit" → full Form
(pre-filled with current values) → edit → "Save" → overwrite the old entry → save
```

**Delete:**
```
Edit Form (existing entry) → "Delete" button → confirm
        ↓
If confirmed: clean up dangling links (chapters.chars, events.chars,
storylines.involvedCharacters, other characters' relations pointing to this entry)
→ splice the entry out of data → save → return to the List
```

### 5.3. Adding a Custom Field to a Module

```
The edit Form of a module that supports custom fields → at the bottom,
"+ Add custom field" area → enter a name + pick a type → click "+ Add"
        ↓
slugify() auto-generates the id → check for duplicate id →
push into the schema → save → re-render the form → the new field appears
immediately, applying to every entry of that module
```

### 5.4. Exporting a PDF / JSON File

```
At any point in the app → "Export" button → choose PDF or JSON
        ↓
JSON: JSON.stringify(the whole db) → create a Blob → trigger download
PDF: use jsPDF, reading getFullSchema() for each module to print core+custom fields
        ↓
The file downloads to the user's machine — no server involved
```

### 5.5. Importing a JSON File

```
Click "Nhập file" (Import) in the topbar
        ↓
Data-loss warning modal appears (see 5.7)
User chooses: "Dừng thao tác" (cancel) → modal closes, nothing changes
             "Tiếp Tục" (continue) → OS file picker opens
        ↓
User selects a JSON file → FileReader reads it → JSON.parse()
        ↓
Validate basic structure: does it have data and schemas?
        ├── INVALID → show an error, do NOT change the current db
        └── Valid → completely overwrite the current db with the imported file
                ↓
            save to localStorage → re-render → display the app with the new data
```

If the imported file's custom fields differ from the current ones: since import overwrites the entire db (including `schemas`), there's no real conflict — the imported file's schema wins entirely.

### 5.6. Switching to a Different Story

```
Currently working on Story A → want to switch to Story B
        ↓
(Recommended) Export Story A's JSON first as a backup
        ↓
Import Story B's JSON file (triggers the data-loss warning — section 5.7)
        ↓
db is completely overwritten with Story B's data → the app displays Story B
```

This is why the app only needs to support "one story per session" — there's no need for a separate "manage multiple stories" screen.

### 5.7. Creating a New Story ("Truyện mới")

A **"✦ Truyện mới"** button sits in the topbar between the theme toggle and the Export button. Clicking it (or clicking "Nhập file") triggers a **data-loss warning modal** before proceeding, because both actions would erase all current localStorage data.

```
Click "✦ Truyện mới" or "⬆ Nhập file"
        ↓
Modal appears with message:
  "Những thông tin hiện tại sẽ mất khi bạn tạo / nhập file truyện mới.
   Hãy chắc chắn rằng bạn đã xuất truyện hiện tại thành JSON file trước khi tiếp tục."
Two buttons:
  "Dừng thao tác" → close modal, no change
  "Tiếp Tục"      → proceed
        ↓
If "Truyện mới" was the trigger:
  resetDb() resets all data to blank defaults → renderAll() → switchSection('overview')
  → toast "Đã tạo truyện mới ✓"
If "Nhập file" was the trigger:
  OS file picker opens → continue as per section 5.5
```

`resetDb()` (in `storage.js`) creates a fresh blank `db` object (empty arrays, empty schemas, empty meta) and saves it to localStorage immediately. Clicking overlay outside the modal also closes it without acting.

---

## 6. UI/UX Spec

### 6.1. Overall Layout

**A fixed top navbar + main content area below** — similar to Google Docs/browser tabs, familiar to the low-tech author audience.

```
┌──────────────────────────────────────────────────────────┐
│ 📖 Trồng Truyện   [Characters][Plot][Storylines]...       │ ← Navbar (top, fixed)
│                              [World Setting][Chapters]     │
│                                      [Export][Import]      │
├──────────────────────────────────────────────────────────┤
│                                                            │
│              Main content area (selected module)          │
│                                                            │
└──────────────────────────────────────────────────────────┘
```

- **Navbar:** dark background (`--ink`), logo + app name, module list as tabs (each tab has its own colored dot — section 6.3). Export/Import buttons placed on the right side of the navbar.
- **Main content area:** generous padding, a `max-width` constraint for readability. Each module is a `.section` (shown/hidden via the `.active` class, no page reload).
- **Popup/Modal:** floats above the entire layout (including the navbar).

### 6.2. Design Tokens

```css
/* Base palette */
--ink: #1C1917;        /* primary text */
--ink-muted: #78716C;  /* secondary text */
--ink-faint: #A8A29E;  /* placeholder, faint text */
--surface: #FFFBF7;    /* page background */
--card: #FFFFFF;       /* card background */
--border: #E7E2DC;     /* light border */
--border-md: #D4CEC8;  /* medium border */

/* Primary accent (warm amber) */
--accent: #D97706;
--accent-bg: #FEF3C7;
--accent-text: #92400E;

/* Border radius */
--radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-xl: 20px;

/* Shadows */
--shadow-card: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
--shadow-btn: 0 1px 2px rgba(0,0,0,.08);
```

**Font:** `-apple-system, 'Segoe UI', sans-serif` (system font, no external font needed). Base font size: 16px, `line-height: 1.6`.

### 6.3. Module Color Coding

```css
/* Storylines module */
--story-color: #C2410C; --story-bg: #FFF7ED;

/* Event severity */
--severity-high: #DC2626;   /* red — High */
--severity-mid:  #D97706;   /* amber — Medium */
--severity-low:  #94A3B8;   /* gray-blue — Low */
```

| Module | Color |
|---|---|
| Characters | Purple `#7C3AED` |
| Plot | Blue `#0369A1` |
| Storylines | Burnt orange `#C2410C` |
| World Setting | Green `#047857` |
| Chapters | Amber `#B45309` |
| Timeline | Pink `#BE185D` |
| Notes | Teal `#0F766E` |
| Sources | Indigo `#4338CA` |

### 6.4. Component Patterns

| Component | Characteristics |
|---|---|
| `.card` | White background, light border, `--radius-lg` rounding, `--shadow-card` |
| `.list-item` | A list row, hover effect (slight lift + deeper shadow), clickable |
| `.field` | Wrapper for each field (label + input/textarea/select) |
| `.btn` / `.btn-primary` / `.btn-accent` / `.btn-danger` | 4 button variants by emphasis level |
| `.toast` | A floating notification at the bottom-right, auto-dismisses after ~2.2s |
| `.tag` / `.custom-badge` | Small rounded badge — role tags, "custom" label |
| `.section-badge` | A larger colored badge next to a module's name |

New patterns to add: modal/popup overlay, multi-tag selector (`roleImportance`/`roleAlignment`), reference-field UI (dropdown + note + delete-row button), rich text toolbar (Quill.js).

### 6.5. Responsive Behavior

No responsive design needed for mobile/tablet (laptop/desktop only, screen width ≥1024px).

### 6.6. Empty States

Every list (characters, chapters, events, storylines, notes, sources), when it has no entries, shows a dashed-border box with: a large icon/emoji representing the module + a short instructional line. No error styling or red color — an empty state is a normal state, not an error.

### 6.7. Micro-interactions

- Hover on a list-item: slight lift (`translateY(-1px)`) + a deeper shadow.
- Focus on an input/textarea: border color changes to `--accent` + a soft glow box-shadow.
- Toast: smooth transitions on show/hide (opacity + translateY).
- General transitions: `transition: all .15s` — fast, suiting the "browsing many characters" use case.
- No complex animations needed — prioritize responsiveness over flourish.

---

## 7. Edge Cases

### 7.1. Required Field Validation

| Module | Required fields |
|---|---|
| `characters` | `name`, `roleImportance` + `roleAlignment` (each group requires ≥1 tag) |
| `events` | `title` |
| `storylines` | `title` |
| `sources` | `title` |

When clicking "Save," check required fields before writing to `data`. If any are missing, show a specific toast warning and do not save, keeping the user on the form to fix it. Every other module/field is optional.

### 7.2. Importing a File with Different Custom Fields than the Current Schema

There is no real conflict to handle here — import always completely overwrites the current `db` (including both `schemas` and `data`), with no merging of the two schemas. The imported file's schema always wins.

### 7.3. Deleting a Custom Field That Has Data

Data previously entered into that field, across every entry, is NOT deleted from the data object — it only loses its display. This "orphaned" data persists silently in localStorage until either:

- The user re-adds a custom field with the same `id` (same name) → the old data reappears normally.
- Or it persists indefinitely if no one re-adds that field — this has no meaningful performance impact, and no automatic "garbage collection" mechanism is needed in v1.

The confirmation dialog before deleting a field must clearly state this consequence.

### 7.4. Handling an Invalid JSON File on Import

1. **The file is not valid JSON** (syntax error) → `JSON.parse()` throws → caught via try/catch, show a toast "Invalid file," do not change the current `db`.
2. **The file is valid JSON but doesn't match the expected structure** (missing `data`/`schemas` keys) → check the minimal structure after a successful parse → if missing, show a toast "File format not recognized," do not overwrite the current `db`.

General principle: import must never leave the app in a broken/half-applied data state.

### 7.5. Character/Length Limits on Input

No hard limit is imposed on any text/textarea/richtext field (the sole exception: avatar images, already size-limited in section 3.6, for storage-size reasons). Imposing character limits would get in the way exactly when an author is brainstorming. The only thing worth keeping in mind is the overall localStorage limit (~5–10MB total).

---

## 8. File Structure & Code Organization

### 8.1. Project Directory Structure

**Architectural decision:** Single Page App (SPA) — a single `index.html` file is the only one the user opens/visits. CSS and JS code are split into multiple files for maintainability, but everything still loads into one page, with no real page navigation between modules (reason: to avoid losing in-progress form data when switching modules).

```
trong-truyen/
├── index.html                  ← page shell: navbar + empty content area
├── css/
│   ├── base.css                 ← reset, design tokens (:root variables)
│   ├── components.css           ← button, card, list-item, field, badge, toast, tag
│   ├── modules.css               ← per-module colors/badges
│   └── vendor/
│       └── quill.snow.css        ← downloaded from Quill.js, NOT linked via CDN
├── js/
│   ├── vendor/
│   │   ├── jspdf.min.js          ← downloaded from jsPDF, NOT linked via CDN
│   │   └── quill.js              ← downloaded from Quill.js, NOT linked via CDN
│   ├── schema.js                 ← CORE_SCHEMAS, getFullSchema()
│   ├── storage.js                ← db object, load(), save()
│   ├── form-renderer.js          ← renderFieldsInto(), buildFieldEl(), collectFieldValues()
│   ├── custom-fields.js          ← addCustomField(), removeCustomField(), slugify()
│   ├── image-utils.js            ← canvas-based resize, Base64 conversion
│   ├── modules/
│   │   ├── characters.js
│   │   ├── plot.js
│   │   ├── worlds.js
│   │   ├── storylines.js
│   │   ├── chapters.js
│   │   ├── events.js
│   │   ├── notes.js
│   │   └── sources.js
│   ├── export.js                 ← exportPDF() (jsPDF), exportJSON()
│   ├── import.js                 ← handleImport(), validate the JSON file
│   └── main.js                    ← entry point: imports every module, calls load(), wires up nav events
└── README.md                      ← dev instructions + usage guide
```

**How files are loaded:** `index.html` uses `<script type="module" src="js/main.js"></script>`; files within `js/` use `import`/`export` (ES Modules) — this is why section 2.2 requires a local server during development.

### 8.2. File/Module Organization Conventions

- One `.js` file inside `js/modules/` corresponds to exactly one data module.
- Shared functions (not belonging to any single module) live in root files under `js/`: `schema.js`, `storage.js`, `form-renderer.js`, `custom-fields.js`, `image-utils.js`.
- Each module file exports functions following a fixed pattern: `render<Module>Form()`, `render<Module>List()`, `save<Module>()`, `edit<Module>()`/`show<Module>Form()`, `delete<Module>()`.
- `main.js` only performs "assembly" duties: importing every module, calling `load()`, wiring up event listeners — it contains no business logic.

**Event handler pattern (important — required for ES Modules):**

All static HTML button events in `index.html` are wired via `addEventListener` inside `main.js`'s `DOMContentLoaded` block — **never via inline `onclick` attributes**. This is a hard requirement because ES Modules are function-scoped and do NOT attach to `window` by default; inline `onclick="fnName()"` would silently fail in production (GitHub Pages) with "Uncaught TypeError: window.fnName is not a function."

Static buttons in `index.html` have explicit `id` attributes. `main.js` uses a helper pattern:
```javascript
const _on = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
_on('save-plot-btn', () => { savePlot(); _updateTopbarTitle(); });
```

**Exception:** Dynamically generated HTML (innerHTML strings built in JS module files) uses `window.xxx?.()` references in its inline handlers — because those elements are created after `DOMContentLoaded` fires and would require event delegation otherwise. Functions that dynamically generated HTML calls (e.g. `window._charOpenPopup`, `window._evEdit`, `window.switchSection`) remain assigned to `window` at module load time.

### 8.3. Naming Conventions

| Object | Convention | Example |
|---|---|---|
| Function names (JS) | camelCase, verb-first | `renderCharForm()`, `saveCharacter()`, `addCustomField()` |
| Variable names | camelCase | `editIdx`, `noteTags`, `visibleOptionalFields` |
| Custom field `id` (from slugify) | snake_case | `mon_phai`, `canh_gioi_tu_luyen` |
| Core field `id` (hand-written, short English) | camelCase | `roleImportance`, `visibleOptionalFields`, `relatedStorylines` |
| CSS class | kebab-case | `.list-item`, `.custom-field-wrapper`, `.section-badge` |
| CSS variable | kebab-case, `--` prefix | `--char-color`, `--radius-lg` |
| Entity id | type prefix + number/timestamp | `char_001`, `event_001`, `story_001` |
| JS file | kebab-case | `form-renderer.js`, `custom-fields.js`, `image-utils.js` |

---

## 9. Roadmap (Beyond v1)

### 9.1. Planned Features for v1.5 / v2

**Relationship Map** — high priority for v1.5.

Visualize the `relations` data (already present from section 3.7) as a node-and-edge diagram, instead of just a text list.

- No data structure changes needed — v1.5 only adds a new display layer reading this data; the schema isn't modified.
- Will need a graph-drawing library (D3.js or vis.js — downloaded locally, not CDN, per section 2.4) to handle the layout problem.
- Reason for deferring to v1.5: keep v1 focused on getting the foundation (data + linking forms) working correctly and stably first.

### 9.2. Community Project Direction

The community doesn't need to know how to code to participate — they can simply share templates (JSON files containing predefined schema/custom fields for a genre) via the project's GitHub repo.

- A public GitHub repo with a dedicated `templates/` folder; each file is a sample JSON users can download and Import into their own app (using the existing Import mechanism).
- Anyone wanting to contribute: build a schema/template within the app → Export JSON → submit via a GitHub Pull Request — the project owner reviews and merges.
- The main app is deployed via GitHub Pages, free, no backend needed.

### 9.3. Multi-Device Sync Direction

A local-first + optional sync model (not required, doesn't affect users who don't need multi-device support):

- By default, the app only uses localStorage — no account, no friction.
- An optional add-on (v1.5+): a "Sync with Google Drive" button — using Google Identity Services + the Drive API, storing one JSON file in the user's own Drive.
- Conflict resolution when syncing across two machines: last-write-wins based on `meta.lastModified` (already present since section 3.2).
- Not part of v1 scope — recorded here only so the data architecture won't need to be redesigned when this is implemented later.

---

## 10. Acceptance Criteria (v1 Completion)

### 10.1. Feature Checklist

**Data & storage:**

- Opening the app, entering data, refreshing the page → data persists.
- Every character/event/chapter/storyline has an auto-generated hidden `id`, with no duplicates.

**Schema & Custom Fields:**

- Adding a new custom field to a module → the field appears immediately, applying to every entry of that module.
- Deleting a custom field → old data is hidden but not lost, reappears if a field with the same name is re-added.
- Vietnamese field names with diacritics are correctly `slugify()`-ed into diacritic-free ids.

**Characters module:**

- Toggling optional fields per character works independently, without affecting other characters.
- Multiple tags can be selected for `roleImportance` and `roleAlignment` independently.
- Uploading an image auto-resizes to 64×64px, with an accurate preview at that size.
- No image yet → an automatic symbol appears based on gender/role, with manual override available.
- The `notes` field renders via Quill.js, correctly saving/loading HTML formatting.
- The `relations` field allows picking existing characters (not free typing), and the character being edited never appears in its own dropdown.
- Deleting a character → every dangling link to it is automatically cleaned up everywhere.
- Clicking a character in the list → opens a quick-view popup.
- Search/filter/sort/pagination all work correctly on the character list.

**Storylines & linking:**

- Creating a storyline and linking it to characters/events/other storylines works correctly.
- Storyline↔storyline links display bidirectionally (even though only stored one-directionally).
- Viewing an event's detail shows which storyline(s) it belongs to.

**Chapter Planning:**

- Reordering non-flashback events → chapter numbers auto-accumulate correctly.
- Dragging a flashback event to multiple positions → the occurrence count is counted correctly, with length split evenly.
- Double-clicking an occurrence → entering a custom number recalculates the remaining occurrences correctly.
- Adding/moving an occurrence → subsequent `chapters.num` values renumber correctly.
- Each chapter belongs to exactly one storyline.

**Export/Import:**

- Exporting JSON then re-importing the same file → data is restored exactly, including custom fields/schema.
- Exporting PDF → every module appears correctly with all fields.
- Importing a malformed/invalid JSON file → shows a clear error without corrupting the current data.

**UI:**

- The app displays correctly on desktop; no mobile testing required.
- All UI text is in Vietnamese, with diacritics displaying correctly.
- Empty states display correctly when a module has no data.

### 10.2. Manual Test Cases

1. **Basic flow:** Create a new story from scratch — add 3 characters, 1 storyline, 5 events (2 flashbacks + 3 linear), verify chapters auto-calculate correctly.
2. **Custom field end-to-end:** Add a custom field to `characters`, enter data for 2 different characters, delete the field, re-add a field with the same name → verify the old data reappears correctly.
3. **Linking & cleanup:** Create two characters A and B linked via `relations`, assign both to one event and one chapter → delete character B → verify every link to B disappears everywhere (A's relations, the event's chars, the chapter's chars).
4. **Chapter Planning with flashback:** Create a flashback event, drag it into 3 different positions → verify the occurrence count is 3 and lengths split per the formula → override one occurrence by double-clicking → verify the remaining two recalculate correctly.
5. **Export/import round-trip:** Export a full story's JSON (with images, custom fields, storylines, flashbacks) → wipe all data → re-import → verify every piece of information is restored 100% correctly.
6. **PDF with complex data:** Export a PDF for a story with multiple flashbacks and intersecting storylines → verify the content is readable, with no formatting errors or missing sections.
7. **localStorage limits:** Create ~50–100 characters with avatars → verify the app still runs smoothly, with no errors from exceeding the storage limit.

---

## Appendix A — Glossary

| Term | Definition |
|---|---|
| Schema | Defines a form's structure (which fields, what labels, what data types) — separate from Data |
| Data | The actual values the user has entered, stored by the field's `id` from the Schema |
| Core field | A fixed field, predefined in `CORE_SCHEMAS`, cannot be deleted |
| Custom field | A field the user names/types themselves, added at the module level, applying to every entry of that module |
| Optional field | An existing core field that's hidden by default, toggled on/off per individual entry (applies only to `characters` in v1) |
| Entry | A single record within a list-type module (e.g. one character, one chapter, one storyline) |
| Reference field | A special field type storing a link to an entry in another module (or the same module — self-reference) via `id`, not free text |
| Automatic bidirectional link | A mechanism that stores a link on only one side in the data, but displays it in reverse on the other side by scanning/computing at render time — without duplicating storage |
| Chronology | The fixed position of an event in the story world's timeline, unchanged no matter how it's narrated — stored in `events.chronologyOrder` |
| Narrative Order | The position at which an event is told in the book, determined by which chapter links to it — can differ entirely from Chronology; this is how flashback/flash-forward is represented |
| Storyline / Arc | An independent thread within a story that has multiple parallel arcs |
| Severity | An event's importance level in the Timeline — 3 tiers (High/Medium/Low), color-coded |
| Local-first | The design philosophy: the app works completely using only localStorage, no backend/account required |
| SPA (Single Page App) | An architecture with a single HTML page, where modules are switched via CSS show/hide, with no page reload |

## Appendix B — Quick Reference: Core Fields per Module

| Module | Fixed fields (always shown) | Optional fields (per-entry hide — `characters` only) | Custom fields |
|---|---|---|---|
| `characters` | id, name*, roleImportance*, roleAlignment*, avatar, gender, age, personality, relations | origin, appearance, goal, backstory, notes (richtext) | Yes |
| `plot` | author, title, genreTagline, summary, theme, message | — (single object) | Yes |
| `storylines` | id, title*, summary, involvedCharacters, relatedEvents, relatedStorylines | — | Yes |
| `worlds` (list) | id, title*, spacetime, desc, environment, politics, society, exception, history, notes | — | Yes |
| `chapters` | id, num (number), title, summary, chars, storylineId (1-to-1), relatedEvents (many-to-many + narrativeType), place, goal, notes | — | Yes |
| `events` | id, chronologyOrder (number), isFlashback (boolean), estimatedLength (number), time, severity, title*, desc, chars | — | Yes |
| `notes` | title, content, tags | — | No |
| `sources` | title*, type, url, notes | — | No |

`*` = required field (section 7.1)

---

## Appendix C — Update History

Records significant implementation changes made after the initial spec was written. Most recent first.

---

### 2026-06-26 — ES Module Event Handler Refactor

**Files changed:** `index.html`, `js/main.js`

**Change:** Removed every `onclick`, `onkeydown`, and other inline event attribute from all static HTML elements in `index.html`. Added unique `id` attributes to all previously-anonymous buttons (~25 new IDs). All event listeners are now wired via `addEventListener` inside `main.js`'s `DOMContentLoaded` block using a helper pattern (`const _on = (id, fn) => ...`).

**Why:** ES Modules are scoped — functions imported into a module file do not automatically attach to `window`. Inline `onclick="fnName()"` in HTML silently fails in production (GitHub Pages) because the browser looks for `window.fnName` and finds nothing. The fix ensures every button works correctly regardless of whether the script is served via `file://`, Live Server, or GitHub Pages.

**Scope note:** Only static HTML buttons were changed. Dynamically generated HTML (innerHTML strings built inside JS module files) continues to use `window.xxx?.()` references because those elements are created after DOMContentLoaded and would require event delegation otherwise. Functions they reference remain assigned to `window` at module load time.

---

### 2026-06-26 — UI Improvements (Session 1)

**Files changed:** `js/schema.js`, `js/form-renderer.js`, `js/modules/characters.js`, `js/modules/chapters.js`, `js/modules/worlds.js`, `js/modules/storylines.js`, `js/storage.js`, `js/main.js`, `index.html`, `css/components.css`

**Changes:**

1. **Character card grid** — the character list was changed from a flat row list to a responsive card grid (`auto-fill, minmax(175px, 1fr)`). Each card shows: avatar/symbol, name, `roleImportance` badges (color-coded), and a 80-char personality excerpt. Cards are clickable to open the quick-view popup.

2. **`roleImportance` 3-tier update** — expanded from 2 options (Protagonist/Supporting) to 3: **Nhân vật chính** (purple), **Nhân vật phụ** (blue), **Nhân vật quần chúng** (gray). Added `optionHints` property to the field definition in `schema.js`; `form-renderer.js` renders these as descriptive hint text below the multi-tag selector.

3. **Chapters module — collapsible event groups** — the chapter list now groups chapters under their parent event using `<details>`/`<summary>` (open by default). Each group header shows a severity dot, event title, and chapter count. Inline Sửa/Xóa/Chuyển buttons on each chapter row. The Chapter Planning Engine (drag-and-drop auto-numbering from spec section 3.12) is deferred to v1.5; chapter creation in v1 is driven from the Event form via a "+ Tạo chương" button that opens a modal.

4. **World form 3-column layout** — the three major world pillars (Environment & Geography | Society & Culture | Politics & History) are now displayed side-by-side in a `repeat(3, 1fr)` CSS grid inside the world edit form. Title/spacetime/desc appear above the grid; exception/notes appear below — all full-width.

5. **Storyline event list** — each storyline card on the list view now shows the storyline description and a collapsible list of linked events. Each event row has **Sửa** (navigate to Timeline + open event form) and **Gỡ** (remove event from storyline, with confirm) buttons.

6. **"Truyện mới" topbar button** — added "✦ Truyện mới" button to the topbar between the theme toggle and "Xuất file". Clicking it shows a data-loss warning modal (same modal as "Nhập file"). On confirm, calls `resetDb()` → `renderAll()` → navigates to Overview with a success toast.

7. **Data-loss warning modal** — a shared modal (`#data-warning-modal`) appears whenever the user clicks "Truyện mới" or "Nhập file". Warns that current data will be lost and recommends exporting first. Buttons: "Dừng thao tác" (cancel) and "Tiếp Tục" (proceed). Clicking the backdrop also cancels.

8. **`resetDb()` in storage.js** — added a new export function that resets `db` to a blank-defaults state (empty arrays, empty schemas, empty meta) and saves to localStorage.

9. **`overview.js` navigation** — the overview section now shows a full plot info block and makes hover cards clickable, navigating to the corresponding module section.

10. **History tracking / `_navBack()`** — `main.js` added a `_returnSection` mechanism. Modules can set `window._returnSection = 'sectionName'` before navigating away; calling `window._navBack()` returns to that section. Used when editing an event from within the Storylines view.
