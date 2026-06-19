# Pokémon Champions Live Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete Pokémon Champions Live Widget ecosystem — a management panel for streamers and a real-time OBS widget for displaying team Pokémon with sprites, layouts, and custom styling.

**Architecture:** Zero-build Jamstack (Vanilla HTML/CSS/JS ES modules) with Firebase v10+ modular SDK for auth and Realtime Database. All assets (sprites) served from Pokémon Showdown CDN. Static files hosted on GitHub Pages.

**Tech Stack:** Vanilla JS (ES modules), CSS3 with custom properties, Firebase v10+ (auth + RTDB), Pokémon Showdown CDN for sprites.

---

## File Structure

```
stream-overlay-pokemon/
├── index.html                # OBS Widget (displays team sprites, real-time updates)
├── panel.html                # Management Panel (login, 6-slots, styling, importer modal)
├── css/
│   ├── variables.css         # Theme design tokens (colors, layout rules, typography)
│   ├── widget.css            # Styles, layout grids, and animations for OBS widget
│   └── panel.css             # Styles, dark mode, mobile responsiveness for panel
├── data/
│   ├── pokemon_list.json     # Pokedex dictionary (name -> key -> cdn_file) — full set
│   └── item_list.json        # Items dictionary (name -> key) — full set
└── js/
    ├── firebase-config.js    # [EXISTS] Firebase SDK initialization (v10+ modular)
    ├── auth-service.js       # [EXISTS] Auth handlers + onIdTokenChanged observer
    ├── db-service.js         # CRUD operations for Firebase Realtime Database
    ├── importer-service.js   # Showdown team text parser
    ├── panel.js              # Panel event-handling, autocomplete, styling controls
    └── widget.js             # Real-time data receiver + image preloader for OBS
```

**Existing files** (already built): `js/firebase-config.js`, `js/auth-service.js`, `panel.html` (test page — will be replaced), `data/pokemon_list.json` (sample — needs expansion), `data/item_list.json` (sample — needs expansion).

**Files to create:** `index.html`, `css/variables.css`, `css/widget.css`, `css/panel.css`, `js/db-service.js`, `js/importer-service.js`, `js/panel.js`, `js/widget.js`.

**Files to modify:** `panel.html`, `data/pokemon_list.json`, `data/item_list.json`.

---

### Task 1: CSS Design Tokens — `css/variables.css`

**Files:**
- Create: `css/variables.css`

- [ ] **Step 1: Create variables.css with all design tokens**

```css
:root {
  /* Panel theme */
  --bg-primary: #121214;
  --bg-secondary: #202024;
  --bg-tertiary: #2a2a2e;
  --text-primary: #e1e1e6;
  --text-secondary: #a8a8b3;
  --text-muted: #737380;
  --accent: #8257e5;
  --accent-hover: #9466ff;
  --accent-dim: #6b46c1;
  --success: #2ea44f;
  --danger: #e04848;
  --warning: #f0a030;
  --border: #323238;
  --border-focus: #8257e5;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.5);
  --transition-fast: 150ms ease;
  --transition-normal: 300ms ease;
  --font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  /* Widget theme (defaults, overridden by panel config) */
  --widget-bg: transparent;
  --main-color: #8257e5;
  --border-style: glow;
  --layout-mode: horizontal;
  --slot-gap: 8px;
  --sprite-size: 64px;
}

/* Border style presets */
:root[data-border="flat"] {
  --border-template: none;
  --slot-border: 2px solid var(--main-color);
  --slot-radius: var(--radius-sm);
  --slot-shadow: none;
}

:root[data-border="glow"] {
  --border-template: none;
  --slot-border: 2px solid var(--main-color);
  --slot-radius: var(--radius-md);
  --slot-shadow: 0 0 12px var(--main-color), 0 0 24px color-mix(in srgb, var(--main-color) 60%, transparent);
}

:root[data-border="metallic"] {
  --border-template: linear-gradient(145deg, #c0c0c0, #808080, #c0c0c0);
  --slot-border: 2px solid transparent;
  --slot-radius: var(--radius-md);
  --slot-shadow: 0 2px 8px rgba(0,0,0,0.5);
}

:root[data-border="cyber"] {
  --border-template: none;
  --slot-border: 2px solid var(--main-color);
  --slot-radius: 0;
  --slot-shadow: none;
  --slot-clip: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
}
```

---

### Task 2: OBS Widget Styles — `css/widget.css`

**Files:**
- Create: `css/widget.css`

- [ ] **Step 1: Create widget.css with layout grids and animations**

```css
@import url('./variables.css');

.widget-team {
  display: flex;
  gap: var(--slot-gap, 8px);
  padding: 8px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  transition: opacity var(--transition-normal);
}

/* Layout modes */
.widget-team.layout-horizontal {
  flex-direction: row;
  align-items: center;
  justify-content: center;
}

.widget-team.layout-vertical {
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.widget-team.layout-grid-2x3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(2, 1fr);
  align-items: center;
  justify-items: center;
}

.widget-team.layout-grid-3x2 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(3, 1fr);
  align-items: center;
  justify-items: center;
}

/* Individual slot */
.pokemon-slot {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border: var(--slot-border, 2px solid var(--main-color));
  border-radius: var(--slot-radius, 8px);
  background: var(--slot-bg, rgba(0,0,0,0.3));
  box-shadow: var(--slot-shadow, none);
  clip-path: var(--slot-clip, none);
  transition: opacity 300ms ease, transform 150ms ease;
  opacity: 1;
}

.pokemon-slot .sprite {
  width: var(--sprite-size, 64px);
  height: var(--sprite-size, 64px);
  object-fit: contain;
  image-rendering: pixelated;
}

.pokemon-slot .item-icon {
  position: absolute;
  bottom: 0;
  right: 0;
  width: calc(var(--sprite-size, 64px) * 0.35);
  height: calc(var(--sprite-size, 64px) * 0.35);
  object-fit: contain;
  image-rendering: pixelated;
}

/* Loading state skeleton */
.pokemon-slot.slot-loading {
  opacity: 0.3;
}

.pokemon-slot.slot-loading .sprite {
  filter: blur(4px) grayscale(1);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}

/* Empty slot */
.pokemon-slot.slot-empty {
  border-style: dashed;
  opacity: 0.4;
}

/* Metallic border background */
.pokemon-slot.border-metallic {
  background: linear-gradient(145deg, #c0c0c0, #808080, #c0c0c0);
  padding: 2px;
}

.pokemon-slot.border-metallic .slot-inner {
  background: rgba(0,0,0,0.6);
  border-radius: inherit;
  padding: 4px;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Cyber border clipping */
.pokemon-slot.border-cyber {
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
  position: relative;
}

.pokemon-slot.border-cyber::before {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border: 2px solid var(--main-color);
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%);
  pointer-events: none;
}
```

---

### Task 3: Management Panel Styles — `css/panel.css`

**Files:**
- Create: `css/panel.css`

- [ ] **Step 1: Create panel.css with full panel styling**

```css
@import url('./variables.css');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
}

.auth-view,
.panel-view {
  display: none;
}

.auth-view.active,
.panel-view.active {
  display: block;
}

/* === AUTH === */
.auth-container {
  max-width: 420px;
  margin: 80px auto;
  padding: 32px;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.auth-container h1 {
  font-size: 1.5rem;
  margin-bottom: 4px;
}

.auth-container p {
  color: var(--text-secondary);
  font-size: 0.875rem;
  margin-bottom: 24px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  transition: border-color var(--transition-fast);
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: var(--border-focus);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background var(--transition-fast), opacity var(--transition-fast);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--accent);
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: var(--accent-hover);
}

.btn-success {
  background: var(--success);
  color: #fff;
}

.btn-danger {
  background: var(--danger);
  color: #fff;
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-primary);
}

.btn-outline:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.btn-full {
  width: 100%;
}

.auth-error {
  color: var(--danger);
  font-size: 0.8rem;
  margin-top: 8px;
  display: none;
}

/* === PANEL HEADER === */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
}

.panel-header h1 {
  font-size: 1.25rem;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.user-badge {
  color: var(--text-secondary);
  font-size: 0.8rem;
}

/* === PANEL LAYOUT === */
.panel-layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 24px;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

@media (max-width: 1024px) {
  .panel-layout {
    grid-template-columns: 1fr;
  }
}

/* === PREVIEW === */
.preview-section {
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--bg-primary);
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

.preview-section h2 {
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-frame {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: 16px;
  min-height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* Preview uses widget styles directly */
.preview-frame .widget-team {
  max-width: 100%;
}

/* Edit area */
.edit-area {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* === SLOT EDITOR === */
.slot-editor {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 16px;
  border: 1px solid var(--border);
}

.slot-editor .slot-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.slot-editor .slot-number {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.slot-editor .slot-controls {
  display: flex;
  gap: 8px;
}

.slot-editor .shiny-toggle {
  padding: 4px 10px;
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.slot-editor .shiny-toggle.active {
  background: var(--warning);
  color: #000;
  border-color: var(--warning);
}

.slot-editor .clear-slot {
  padding: 4px 10px;
  font-size: 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--danger);
  background: transparent;
  color: var(--danger);
  cursor: pointer;
}

/* === COMBOBOX === */
.combobox-wrapper {
  position: relative;
}

.combobox-wrapper input {
  width: 100%;
  padding: 10px 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
}

.combobox-wrapper input:focus {
  outline: none;
  border-color: var(--border-focus);
}

.combobox-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  max-height: 250px;
  overflow-y: auto;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  z-index: 100;
  display: none;
  box-shadow: var(--shadow-md);
}

.combobox-dropdown.open {
  display: block;
}

.combobox-item {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: background var(--transition-fast);
}

.combobox-item:hover,
.combobox-item.highlighted {
  background: var(--accent-dim);
  color: #fff;
}

.combobox-empty {
  padding: 12px;
  color: var(--text-muted);
  font-size: 0.8rem;
  text-align: center;
}

/* === ITEM COMBOBOX === */
.combobox-wrapper.item-wrapper .combobox-dropdown {
  max-height: 180px;
}

/* === SAVE BAR === */
.save-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 16px 0;
}

.save-bar .btn .spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  display: none;
}

.save-bar .btn.loading .spinner {
  display: inline-block;
}

.save-bar .save-feedback {
  font-size: 0.8rem;
  color: var(--success);
  opacity: 0;
  transition: opacity var(--transition-normal);
}

.save-bar .save-feedback.show {
  opacity: 1;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* === STYLING SIDEBAR === */
.styling-sidebar {
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 20px;
  border: 1px solid var(--border);
  height: fit-content;
  position: sticky;
  top: 24px;
}

.styling-sidebar h3 {
  font-size: 0.875rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.styling-group {
  margin-bottom: 20px;
}

.styling-group label {
  display: block;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.border-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.border-option {
  padding: 10px;
  text-align: center;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.75rem;
  transition: all var(--transition-fast);
  background: var(--bg-primary);
}

.border-option:hover {
  border-color: var(--accent);
}

.border-option.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 20%, transparent);
}

.layout-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.layout-option {
  padding: 10px;
  text-align: center;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.75rem;
  transition: all var(--transition-fast);
  background: var(--bg-primary);
}

.layout-option:hover {
  border-color: var(--accent);
}

.layout-option.selected {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 20%, transparent);
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker-wrapper input[type="color"] {
  width: 48px;
  height: 48px;
  border: 2px solid var(--border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  padding: 2px;
  background: var(--bg-primary);
}

.color-picker-wrapper .color-hex {
  font-family: var(--font-mono);
  font-size: 0.875rem;
  color: var(--text-primary);
}

/* === MODAL === */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.75);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-overlay.open {
  display: flex;
}

.modal-content {
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  padding: 24px;
  width: 90%;
  max-width: 560px;
  box-shadow: var(--shadow-lg);
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h2 {
  margin-bottom: 16px;
}

.modal-content textarea {
  width: 100%;
  height: 200px;
  padding: 12px;
  background: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.8rem;
  resize: vertical;
  margin-bottom: 16px;
}

.modal-content textarea:focus {
  outline: none;
  border-color: var(--border-focus);
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

/* === MOBILE < 768px === */
@media (max-width: 767px) {
  .panel-header {
    padding: 12px 16px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .panel-layout {
    padding: 12px;
    gap: 12px;
  }

  .preview-section {
    position: sticky;
    top: 0;
    padding: 12px;
  }

  .slot-editor {
    padding: 12px;
  }

  .styling-sidebar {
    position: static;
  }

  .combobox-dropdown {
    position: fixed;
    top: auto;
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 50vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    z-index: 200;
  }

  .combobox-item {
    padding: 14px 16px;
    font-size: 1rem;
    min-height: 48px;
    display: flex;
    align-items: center;
  }
}
```

---

### Task 4: Database Service — `js/db-service.js`

**Files:**
- Create: `js/db-service.js`

- [ ] **Step 1: Create db-service.js with CRUD operations**

```javascript
import { db, auth } from "./firebase-config.js";
import { ref, set, get, onValue, off } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const CHANNELS_ROOT = "canales";

/**
 * Build the Firebase path for a given channel
 */
function channelPath(channelName) {
  return `${CHANNELS_ROOT}/${channelName.toLowerCase().trim()}`;
}

/**
 * Save team configuration to Firebase
 * @param {string} channelName 
 * @param {object} teamData - { slots: [{pokemon, item, shiny}], config: {style, color, layout} }
 * @returns {Promise<void>}
 */
export async function saveTeamConfig(channelName, teamData) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("You must be logged in to save.");
  }
  const path = channelPath(channelName);
  await set(ref(db, path), {
    team: teamData.slots,
    config: teamData.config,
    updatedAt: Date.now()
  });
}

/**
 * Read team configuration from Firebase (one-time)
 * @param {string} channelName 
 * @returns {Promise<object|null>}
 */
export async function getTeamConfig(channelName) {
  const snapshot = await get(ref(db, channelPath(channelName)));
  return snapshot.val();
}

/**
 * Subscribe to real-time updates for a channel
 * @param {string} channelName 
 * @param {function} onData - callback with data object
 * @returns {function} unsubscribe function
 */
export function subscribeChannel(channelName, onData) {
  const path = channelPath(channelName);
  const dbRef = ref(db, path);
  onValue(dbRef, (snapshot) => {
    const data = snapshot.val();
    onData(data);
  });
  return () => off(dbRef);
}
```

---

### Task 5: Showdown Importer — `js/importer-service.js`

**Files:**
- Create: `js/importer-service.js`

- [ ] **Step 1: Create importer-service.js with team parser**

```javascript
import pokemonList from "../data/pokemon_list.json" assert { type: "json" };
import itemList from "../data/item_list.json" assert { type: "json" };

/**
 * Build lookup maps from the static dictionaries
 */
const nameToPokemon = new Map();
const cdnFileToPokemon = new Map();
pokemonList.forEach(p => {
  nameToPokemon.set(p.name.toLowerCase(), p);
  cdnFileToPokemon.set(p.cdn_file.toLowerCase(), p);
});

const nameToItem = new Map();
itemList.forEach(i => {
  nameToItem.set(i.name.toLowerCase(), i);
});

/**
 * Parse a Pokemon Showdown team export string
 * @param {string} text - the raw team export
 * @returns {Array<{pokemonKey: string|null, itemKey: string|null, shiny: boolean, pokemonName: string|null, itemName: string|null}>} 
 */
export function parseShowdownTeam(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const slots = [];
  let currentSlot = null;

  for (const line of lines) {
    // Skip tier markers, EV/IV lines, moves, etc.
    if (line.startsWith('```') || line.startsWith('---')) continue;

    // Check if this is a Pokemon header line
    // Format examples:
    // "Charizard @ Life Orb"
    // "Tapu Koko @ Choice Specs"
    // "Pikachu" (no item)
    const pokemonMatch = line.match(/^([^(]+?)(?:\s*@\s*(.+))?$/);
    if (!pokemonMatch) continue;

    const rawName = pokemonMatch[1].trim();
    const rawItem = pokemonMatch[2] ? pokemonMatch[2].trim() : null;

    // Check for shiny indicator in the name (e.g., "Charizard (Shiny)")
    const shiny = /shiny/i.test(rawName) || /★/.test(rawName);
    const cleanName = rawName.replace(/\s*\(.*?\)\s*/g, '').replace(/[★☆]/g, '').trim();

    const pokemonEntry = nameToPokemon.get(cleanName.toLowerCase());
    let itemEntry = null;
    if (rawItem) {
      const itemClean = rawItem.replace(/\(.*?\)/g, '').trim();
      itemEntry = nameToItem.get(itemClean.toLowerCase());
    }

    slots.push({
      pokemonKey: pokemonEntry ? pokemonEntry.key : null,
      pokemonName: pokemonEntry ? pokemonEntry.name : cleanName,
      itemKey: itemEntry ? itemEntry.key : null,
      itemName: itemEntry ? itemEntry.name : rawItem,
      shiny: shiny
    });

    if (slots.length >= 6) break;
  }

  // Pad to 6 slots
  while (slots.length < 6) {
    slots.push({
      pokemonKey: null,
      pokemonName: null,
      itemKey: null,
      itemName: null,
      shiny: false
    });
  }

  return slots;
}

/**
 * Search pokemon list by name fragment (case-insensitive)
 * @param {string} query 
 * @returns {Array}
 */
export function searchPokemon(query) {
  const q = query.toLowerCase().trim();
  if (!q) return pokemonList.slice(0, 50);
  return pokemonList.filter(p => p.name.toLowerCase().includes(q));
}

/**
 * Search item list by name fragment (case-insensitive)
 * @param {string} query 
 * @returns {Array}
 */
export function searchItems(query) {
  const q = query.toLowerCase().trim();
  if (!q) return itemList.slice(0, 30);
  return itemList.filter(i => i.name.toLowerCase().includes(q));
}
```

- [ ] **Step 2: Build the static import maps for JSON modules**

The `assert { type: "json" }` syntax may not work in all browsers. Create a helper function to load JSON instead:

Replace the top imports with a dynamic fetch approach:

```javascript
let pokemonList = [];
let itemList = [];

export async function loadDictionaries() {
  const [pokeRes, itemRes] = await Promise.all([
    fetch("./data/pokemon_list.json"),
    fetch("./data/item_list.json")
  ]);
  pokemonList = await pokeRes.json();
  itemList = await itemRes.json();
  rebuildMaps();
}

function rebuildMaps() {
  nameToPokemon.clear();
  cdnFileToPokemon.clear();
  pokemonList.forEach(p => {
    nameToPokemon.set(p.name.toLowerCase(), p);
    cdnFileToPokemon.set(p.cdn_file.toLowerCase(), p);
  });
  nameToItem.clear();
  itemList.forEach(i => nameToItem.set(i.name.toLowerCase(), i));
}
```

Update `searchPokemon` and `searchItems` to work with the loaded array.

---

### Task 6: Full Pokémon Data — `data/pokemon_list.json`

**Files:**
- Modify: `data/pokemon_list.json`

- [ ] **Step 1: Write script to generate complete pokemon_list.json from Showdown's dex data**

Create a generator that produces entries for all 1025+ Pokémon with proper name, key, and cdn_file mappings. The cdn_file for most Pokémon follows the pattern of lowercase name with special characters removed (e.g., "Mr. Mime" -> "mrmime", "Flabébé" -> "flabebe", "Nidoran♀" -> "nidoranf", "Tapu Koko" -> "tapukoko").

Rather than manually listing all 1025, use a compact generation approach. Create a script that fetches from the PokeAPI and maps to the expected format:

```javascript
// scripts/generate-pokemon-data.js - Run with Node.js
// Fetches from PokeAPI and generates the pokemon_list.json
const fs = require('fs');
const path = require('path');

async function generate() {
  const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1025&offset=0');
  const data = await response.json();
  
  const results = [];
  for (const entry of data.results) {
    const name = entry.name; // PokeAPI uses hyphenated names
    // Convert to proper format
    const displayName = name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const key = name;
    const cdnFile = name.replace(/[^a-z0-9]/g, '').toLowerCase();
    results.push({ name: displayName, key, cdn_file: cdnFile });
  }
  
  fs.writeFileSync(
    path.join(__dirname, '..', 'data', 'pokemon_list.json'),
    JSON.stringify(results, null, 2)
  );
  console.log(`Generated ${results.length} Pokémon entries`);
}

generate().catch(console.error);
```

Run: `node scripts/generate-pokemon-data.js`

- [ ] **Step 2: Manual curation and correction**

After generation, manually fix known exceptions:
- "Nidoran♀" -> key: "nidoran-f", cdn_file: "nidoranf"
- "Nidoran♂" -> key: "nidoran-m", cdn_file: "nidoranm"
- "Mr. Mime" -> key: "mr-mime", cdn_file: "mrmime"
- "Mr. Rime" -> key: "mr-rime", cdn_file: "mrrime"
- "Mime Jr." -> key: "mime-jr", cdn_file: "mimejr"
- "Tapu Koko" -> key: "tapu-koko", cdn_file: "tapukoko"
- "Tapu Lele" -> key: "tapu-lele", cdn_file: "tapulele"
- "Tapu Bulu" -> key: "tapu-bulu", cdn_file: "tapubulu"
- "Tapu Fini" -> key: "tapu-fini", cdn_file: "tapufini"
- "Type: Null" -> key: "type-null", cdn_file: "typenull"
- "Jangmo-o" -> key: "jangmo-o", cdn_file: "jangmoo"
- "Hakamo-o" -> key: "hakamo-o", cdn_file: "hakamoo"
- "Kommo-o" -> key: "kommo-o", cdn_file: "kommoo"
- "Flabébé" -> key: "flabebe", cdn_file: "flabebe"
- "Farfetch'd" -> key: "farfetchd", cdn_file: "farfetchd"
- "Sirfetch'd" -> key: "sirfetchd", cdn_file: "sirfetchd"
- Forms (e.g., "Pikachu Rock Star") — add as separate entries with their form-specific cdn_file

---

### Task 7: Complete Item Data — `data/item_list.json`

**Files:**
- Modify: `data/item_list.json`

- [ ] **Step 1: Add all competitive items with proper keys**

```json
[
  { "name": "Assault Vest", "key": "assaultvest" },
  { "name": "Black Sludge", "key": "blacksludge" },
  { "name": "Choice Band", "key": "choiceband" },
  { "name": "Choice Scarf", "key": "choicescarf" },
  { "name": "Choice Specs", "key": "choicespecs" },
  { "name": "Eviolite", "key": "eviolite" },
  { "name": "Focus Sash", "key": "focussash" },
  { "name": "Heavy-Duty Boots", "key": "heavydutyboots" },
  { "name": "Leftovers", "key": "leftovers" },
  { "name": "Life Orb", "key": "lifeorb" },
  { "name": "Light Clay", "key": "lightclay" },
  { "name": "Rocky Helmet", "key": "rockyhelmet" },
  { "name": "Sitrus Berry", "key": "sitrusberry" },
  { "name": "Weakness Policy", "key": "weaknesspolicy" },
  { "name": "Air Balloon", "key": "airballoon" },
  { "name": "Assault Vest", "key": "assaultvest" },
  { "name": "Big Root", "key": "bigroot" },
  { "name": "Black Glasses", "key": "blackglasses" },
  { "name": "Bright Powder", "key": "brightpowder" },
  { "name": "Cell Battery", "key": "cellbattery" },
  { "name": "Damp Rock", "key": "damprock" },
  { "name": "Destiny Knot", "key": "destinyknot" },
  { "name": "Eject Button", "key": "ejectbutton" },
  { "name": "Eject Pack", "key": "ejectpack" },
  { "name": "Electric Seed", "key": "electricseed" },
  { "name": "Expert Belt", "key": "expertbelt" },
  { "name": "Flame Orb", "key": "flameorb" },
  { "name": "Focus Band", "key": "focusband" },
  { "name": "Grassy Seed", "key": "grassseed" },
  { "name": "Heat Rock", "key": "heatrock" },
  { "name": "Icy Rock", "key": "icyrock" },
  { "name": "Iron Ball", "key": "ironball" },
  { "name": "King's Rock", "key": "kingsrock" },
  { "name": "Lagging Tail", "key": "laggingtail" },
  { "name": "Life Orb", "key": "lifeorb" },
  { "name": "Light Ball", "key": "lightball" },
  { "name": "Lucky Punch", "key": "luckypunch" },
  { "name": "Luminous Moss", "key": "luminousmoss" },
  { "name": "Macho Brace", "key": "machobrace" },
  { "name": "Mental Herb", "key": "mentalherb" },
  { "name": "Metronome", "key": "metronome" },
  { "name": "Micle Berry", "key": "micleberry" },
  { "name": "Misty Seed", "key": "mistyseed" },
  { "name": "Muscle Band", "key": "muscleband" },
  { "name": "Power Herb", "key": "powerherb" },
  { "name": "Protective Pads", "key": "protectivepads" },
  { "name": "Psychic Seed", "key": "psychicseed" },
  { "name": "Quick Claw", "key": "quickclaw" },
  { "name": "Razor Claw", "key": "razorclaw" },
  { "name": "Razor Fang", "key": "razorfang" },
  { "name": "Red Card", "key": "redcard" },
  { "name": "Ring Target", "key": "ringtarget" },
  { "name": "Room Service", "key": "roomservice" },
  { "name": "Scope Lens", "key": "scopelens" },
  { "name": "Shell Bell", "key": "shellbell" },
  { "name": "Snowball", "key": "snowball" },
  { "name": "Smooth Rock", "key": "smoothrock" },
  { "name": "Sticky Barb", "key": "stickybarb" },
  { "name": "Terrain Extender", "key": "terrainextender" },
  { "name": "Throat Spray", "key": "throatspray" },
  { "name": "Toxic Orb", "key": "toxicorb" },
  { "name": "White Herb", "key": "whiteherb" },
  { "name": "Wide Lens", "key": "widelens" },
  { "name": "Wiki Berry", "key": "wikiberry" },
  { "name": "Zoom Lens", "key": "zoomlens" },
  { "name": "Absorb Bulb", "key": "absorbulb" },
  { "name": "Adrenaline Orb", "key": "adrenalineorb" },
  { "name": "Blunder Policy", "key": "blunderpolicy" },
  { "name": "Booster Energy", "key": "boosterenergy" },
  { "name": "Covert Cloak", "key": "covertcloak" },
  { "name": "Loaded Dice", "key": "loadeddice" },
  { "name": "Punching Glove", "key": "punchingglove" },
  { "name": "Clear Amulet", "key": "clearamulet" },
  { "name": "Mirror Herb", "key": "mirrorherb" }
]
```

---

### Task 8: Panel JavaScript — `js/panel.js`

**Files:**
- Create: `js/panel.js`

- [ ] **Step 1: Create panel.js with all panel logic**

```javascript
import { auth } from "./firebase-config.js";
import { loginStreamer, logoutStreamer, registerStreamer, setupAuthObserver } from "./auth-service.js";
import { saveTeamConfig } from "./db-service.js";
import { loadDictionaries, searchPokemon, searchItems, parseShowdownTeam } from "./importer-service.js";

// State
let currentUser = null;
let channelName = "";
let teamSlots = Array(6).fill(null).map(() => ({
  pokemonKey: null,
  pokemonName: "",
  itemKey: null,
  itemName: "",
  shiny: false
}));
let config = {
  style: "glow",
  color: "#8257e5",
  layout: "horizontal"
};
let activeCombobox = null;

// DOM refs
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const authView = $("#authView");
const panelView = $("#panelView");
const loginForm = $("#loginForm");
const registerForm = $("#registerForm");
const logoutBtn = $("#logoutBtn");
const importerBtn = $("#importerBtn");
const importerModal = $("#importerModal");
const importerText = $("#importerText");
const importerApply = $("#importerApply");
const importerCancel = $("#importerCancel");
const importerPaste = $("#importerPaste");
const saveBtn = $("#saveBtn");
const saveFeedback = $("#saveFeedback");
const channelDisplay = $("#channelDisplay");

// --- Init ---
export async function initPanel() {
  await loadDictionaries();
  setupAuthObserver(handleAuthChange);
  bindAuthEvents();
  bindPanelEvents();
}

function handleAuthChange(user) {
  currentUser = user;
  if (user) {
    channelName = user.email.split('@')[0];
    authView.classList.remove("active");
    panelView.classList.add("active");
    channelDisplay.textContent = channelName;
    loadExistingConfig();
  } else {
    authView.classList.add("active");
    panelView.classList.remove("active");
    channelName = "";
  }
}

// --- Auth ---
function bindAuthEvents() {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = $("#loginUsername").value.trim();
    const password = $("#loginPassword").value;
    try {
      await loginStreamer(username, password);
    } catch (err) {
      showAuthError(err.message);
    }
  });

  $("#showRegister").addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.style.display = "none";
    registerForm.style.display = "block";
  });

  $("#showLogin").addEventListener("click", (e) => {
    e.preventDefault();
    registerForm.style.display = "none";
    loginForm.style.display = "block";
  });

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = $("#regUsername").value.trim();
    const password = $("#regPassword").value;
    const invite = $("#regInvite").value.trim();
    try {
      await registerStreamer(username, password, invite);
    } catch (err) {
      showAuthError(err.message);
    }
  });

  logoutBtn.addEventListener("click", async () => {
    await logoutStreamer();
  });
}

function showAuthError(msg) {
  const el = $("#authError");
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => { el.style.display = "none"; }, 5000);
}

// --- Panel ---
function bindPanelEvents() {
  // Save
  saveBtn.addEventListener("click", handleSave);

  // Importer modal
  importerBtn.addEventListener("click", () => importerModal.classList.add("open"));
  importerCancel.addEventListener("click", () => importerModal.classList.remove("open"));
  importerApply.addEventListener("click", handleImporterApply);
  importerPaste.addEventListener("click", handleImporterPaste);

  // Close modal on overlay click
  importerModal.addEventListener("click", (e) => {
    if (e.target === importerModal) importerModal.classList.remove("open");
  });

  // Styling
  document.querySelectorAll("[data-border]").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll("[data-border]").forEach(b => b.classList.remove("selected"));
      el.classList.add("selected");
      config.style = el.dataset.border;
      updatePreview();
    });
  });

  document.querySelectorAll("[data-layout]").forEach(el => {
    el.addEventListener("click", () => {
      document.querySelectorAll("[data-layout]").forEach(l => l.classList.remove("selected"));
      el.classList.add("selected");
      config.layout = el.dataset.layout;
      updatePreview();
    });
  });

  $("#colorPicker").addEventListener("input", (e) => {
    config.color = e.target.value;
    $("#colorHex").textContent = e.target.value;
    updatePreview();
  });

  // Close comboboxes on outside click
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".combobox-wrapper")) {
      document.querySelectorAll(".combobox-dropdown.open").forEach(d => d.classList.remove("open"));
      activeCombobox = null;
    }
  });
}

// --- Slot Rendering ---
function renderSlots() {
  const container = $("#slotsContainer");
  container.innerHTML = "";

  for (let i = 0; i < 6; i++) {
    const slot = teamSlots[i];
    const editor = document.createElement("div");
    editor.className = "slot-editor";
    editor.innerHTML = `
      <div class="slot-header">
        <span class="slot-number">Slot ${i + 1}</span>
        <div class="slot-controls">
          <button class="shiny-toggle ${slot.shiny ? 'active' : ''}" data-slot="${i}">${slot.shiny ? '★' : '☆'} Shiny</button>
          <button class="clear-slot" data-slot="${i}">✕ Clear</button>
        </div>
      </div>
      <div class="combobox-wrapper" data-slot="${i}">
        <input type="text" class="pokemon-search" placeholder="Search Pokémon..." value="${slot.pokemonName}" data-slot="${i}" autocomplete="off">
        <div class="combobox-dropdown" data-type="pokemon" data-slot="${i}"></div>
      </div>
      <div class="combobox-wrapper item-wrapper" data-slot="${i}" style="margin-top: 8px;">
        <input type="text" class="item-search" placeholder="Held item (optional)" value="${slot.itemName}" data-slot="${i}" autocomplete="off">
        <div class="combobox-dropdown" data-type="item" data-slot="${i}"></div>
      </div>
    `;

    // Bind shiny toggle
    editor.querySelector(".shiny-toggle").addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.slot);
      teamSlots[idx].shiny = !teamSlots[idx].shiny;
      renderSlots();
      updatePreview();
    });

    // Bind clear
    editor.querySelector(".clear-slot").addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.slot);
      teamSlots[idx] = { pokemonKey: null, pokemonName: "", itemKey: null, itemName: "", shiny: false };
      renderSlots();
      updatePreview();
    });

    // Bind combobox
    const pokeInput = editor.querySelector(".pokemon-search");
    const pokeDropdown = editor.querySelector(".combobox-dropdown[data-type='pokemon']");
    setupCombobox(pokeInput, pokeDropdown, searchPokemon, (item) => {
      teamSlots[i].pokemonKey = item.key;
      teamSlots[i].pokemonName = item.name;
      pokeInput.value = item.name;
      pokeDropdown.classList.remove("open");
      updatePreview();
    });

    const itemInput = editor.querySelector(".item-search");
    const itemDropdown = editor.querySelector(".combobox-dropdown[data-type='item']");
    setupCombobox(itemInput, itemDropdown, searchItems, (item) => {
      teamSlots[i].itemKey = item.key;
      teamSlots[i].itemName = item.name;
      itemInput.value = item.name;
      itemDropdown.classList.remove("open");
    });

    container.appendChild(editor);
  }
}

// --- Combobox ---
function setupCombobox(input, dropdown, searchFn, onSelect) {
  input.addEventListener("input", () => {
    const query = input.value;
    const results = searchFn(query);
    renderDropdown(dropdown, results, onSelect);
    dropdown.classList.add("open");
    activeCombobox = dropdown;
  });

  input.addEventListener("focus", () => {
    const results = searchFn(input.value);
    renderDropdown(dropdown, results, onSelect);
    dropdown.classList.add("open");
    activeCombobox = dropdown;
  });

  input.addEventListener("keydown", (e) => {
    const items = dropdown.querySelectorAll(".combobox-item");
    const highlighted = dropdown.querySelector(".highlighted");
    let idx = Array.from(items).indexOf(highlighted);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = Math.min(idx + 1, items.length - 1);
      items.forEach(i => i.classList.remove("highlighted"));
      if (items[next]) items[next].classList.add("highlighted");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = Math.max(idx - 1, 0);
      items.forEach(i => i.classList.remove("highlighted"));
      if (items[prev]) items[prev].classList.add("highlighted");
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlighted) highlighted.click();
    } else if (e.key === "Escape") {
      dropdown.classList.remove("open");
    }
  });
}

function renderDropdown(dropdown, results, onSelect) {
  if (results.length === 0) {
    dropdown.innerHTML = '<div class="combobox-empty">No results found</div>';
    return;
  }
  dropdown.innerHTML = results.map(item => `
    <div class="combobox-item" data-key="${item.key}">${item.name}</div>
  `).join("");

  dropdown.querySelectorAll(".combobox-item").forEach(el => {
    el.addEventListener("click", () => onSelect({
      key: el.dataset.key,
      name: el.textContent
    }));
  });
}

// --- Preview ---
function updatePreview() {
  const frame = $("#previewFrame");
  frame.innerHTML = "";
  const container = document.createElement("div");
  container.className = `widget-team layout-${config.layout}`;
  container.style.setProperty("--main-color", config.color);
  container.dataset.border = config.style;

  for (const slot of teamSlots) {
    const slotEl = document.createElement("div");
    slotEl.className = "pokemon-slot";
    if (slot.pokemonKey) {
      const cdnFile = getCdnFile(slot.pokemonKey);
      const spriteUrl = slot.shiny
        ? `https://play.pokemonshowdown.com/sprites/ani-shiny/${cdnFile}.gif`
        : `https://play.pokemonshowdown.com/sprites/ani/${cdnFile}.gif`;
      
      if (config.style === "metallic") {
        slotEl.classList.add("border-metallic");
        slotEl.innerHTML = `<div class="slot-inner"><img class="sprite" src="${spriteUrl}" alt="${slot.pokemonName}" loading="lazy"></div>`;
      } else {
        if (config.style === "cyber") slotEl.classList.add("border-cyber");
        slotEl.innerHTML = `<img class="sprite" src="${spriteUrl}" alt="${slot.pokemonName}" loading="lazy">`;
      }
      
      if (slot.itemKey) {
        const itemUrl = `https://play.pokemonshowdown.com/sprites/itemdex/${slot.itemKey}.png`;
        slotEl.innerHTML += `<img class="item-icon" src="${itemUrl}" alt="${slot.itemName}" loading="lazy">`;
      }
    } else {
      slotEl.classList.add("slot-empty");
      slotEl.textContent = "?";
      slotEl.style.display = "flex";
      slotEl.style.alignItems = "center";
      slotEl.style.justifyContent = "center";
      slotEl.style.fontSize = "1.5rem";
      slotEl.style.color = "var(--text-muted)";
    }
    container.appendChild(slotEl);
  }

  frame.appendChild(container);
}

// --- Importer ---
function handleImporterApply() {
  const text = importerText.value;
  if (!text.trim()) return;
  const parsed = parseShowdownTeam(text);
  for (let i = 0; i < 6; i++) {
    if (parsed[i]) {
      teamSlots[i].pokemonKey = parsed[i].pokemonKey;
      teamSlots[i].pokemonName = parsed[i].pokemonName || "";
      teamSlots[i].itemKey = parsed[i].itemKey;
      teamSlots[i].itemName = parsed[i].itemName || "";
      teamSlots[i].shiny = parsed[i].shiny;
    }
  }
  importerText.value = "";
  importerModal.classList.remove("open");
  renderSlots();
  updatePreview();
}

async function handleImporterPaste() {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      importerText.value = text;
    }
  } catch {
    // Fallback: focus textarea
    importerText.focus();
  }
}

// --- Save ---
async function handleSave() {
  saveBtn.disabled = true;
  saveBtn.classList.add("loading");
  saveFeedback.classList.remove("show");

  try {
    await saveTeamConfig(channelName, {
      slots: teamSlots,
      config: config
    });
    saveFeedback.textContent = "Saved successfully!";
    saveFeedback.classList.add("show");
  } catch (err) {
    saveFeedback.textContent = `Error: ${err.message}`;
    saveFeedback.style.color = "var(--danger)";
    saveFeedback.classList.add("show");
    setTimeout(() => {
      saveFeedback.style.color = "var(--success)";
    }, 3000);
  } finally {
    saveBtn.disabled = false;
    saveBtn.classList.remove("loading");
  }
}

// --- Load existing ---
async function loadExistingConfig() {
  const { getTeamConfig } = await import("./db-service.js");
  const data = await getTeamConfig(channelName);
  if (data) {
    if (data.team) {
      teamSlots = data.team.map(s => ({
        pokemonKey: s.pokemonKey || null,
        pokemonName: s.pokemonName || "",
        itemKey: s.itemKey || null,
        itemName: s.itemName || "",
        shiny: s.shiny || false
      }));
    }
    if (data.config) {
      config = { ...config, ...data.config };
    }
    renderSlots();
    updatePreview();
    applyConfigToUI();
  } else {
    renderSlots();
    updatePreview();
  }
}

function applyConfigToUI() {
  // Border style
  document.querySelectorAll("[data-border]").forEach(el => {
    el.classList.toggle("selected", el.dataset.border === config.style);
  });
  // Layout
  document.querySelectorAll("[data-layout]").forEach(el => {
    el.classList.toggle("selected", el.dataset.layout === config.layout);
  });
  // Color
  $("#colorPicker").value = config.color;
  $("#colorHex").textContent = config.color;
}

// --- Helpers ---
function getCdnFile(pokemonKey) {
  // This could use the loaded pokemonList for proper mapping
  try {
    const { pokemonList } = await_import();
    const entry = pokemonList.find(p => p.key === pokemonKey);
    return entry ? entry.cdn_file : pokemonKey.replace(/-/g, '');
  } catch {
    return pokemonKey.replace(/-/g, '');
  }
}

// Bootstrap
document.addEventListener("DOMContentLoaded", initPanel);
```

Note: The `getCdnFile` function needs access to the loaded pokemonList. A better approach is to make it available from the importer-service module. Refactor to:

```javascript
import { searchPokemon, searchItems, parseShowdownTeam, loadDictionaries, getPokemonByKey } from "./importer-service.js";
```

Add `getPokemonByKey` to importer-service.js:
```javascript
export function getPokemonByKey(key) {
  return pokemonList.find(p => p.key === key) || null;
}
```

---

### Task 9: Full Management Panel HTML — `panel.html`

**Files:**
- Modify: `panel.html`

- [ ] **Step 1: Replace panel.html with full management panel**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Pokémon Champions — Management Panel</title>
  <link rel="stylesheet" href="css/panel.css">
</head>
<body>
  <!-- Auth View -->
  <div id="authView" class="auth-view active">
    <div class="auth-container">
      <h1>Pokémon Champions</h1>
      <p>Live Widget Management Panel</p>

      <!-- Login Form -->
      <form id="loginForm">
        <div class="form-group">
          <label for="loginUsername">Twitch Username</label>
          <input type="text" id="loginUsername" placeholder="your_twitch_name" required>
        </div>
        <div class="form-group">
          <label for="loginPassword">Password</label>
          <input type="password" id="loginPassword" placeholder="••••••••" required>
        </div>
        <button type="submit" class="btn btn-primary btn-full">Sign In</button>
        <p style="text-align:center;margin-top:12px;font-size:0.8rem;">
          <a href="#" id="showRegister" style="color:var(--accent);">Create account</a>
        </p>
      </form>

      <!-- Register Form -->
      <form id="registerForm" style="display:none;">
        <div class="form-group">
          <label for="regUsername">Twitch Username</label>
          <input type="text" id="regUsername" placeholder="your_twitch_name" required>
        </div>
        <div class="form-group">
          <label for="regPassword">Password</label>
          <input type="password" id="regPassword" placeholder="••••••••" required>
        </div>
        <div class="form-group">
          <label for="regInvite">Invitation Code</label>
          <input type="text" id="regInvite" placeholder="Enter alpha/beta code" required>
        </div>
        <button type="submit" class="btn btn-success btn-full">Register</button>
        <p style="text-align:center;margin-top:12px;font-size:0.8rem;">
          <a href="#" id="showLogin" style="color:var(--accent);">Already have an account?</a>
        </p>
      </form>

      <div id="authError" class="auth-error"></div>
    </div>
  </div>

  <!-- Panel View -->
  <div id="panelView" class="panel-view">
    <div class="panel-header">
      <h1>Pokémon Champions</h1>
      <div class="header-actions">
        <span class="user-badge" id="channelDisplay"></span>
        <button id="importerBtn" class="btn btn-outline">📥 Import Team</button>
        <button id="logoutBtn" class="btn btn-danger">Logout</button>
      </div>
    </div>

    <div class="panel-layout">
      <!-- Left: Preview + Slots -->
      <div class="edit-area">
        <!-- Preview -->
        <div class="preview-section">
          <h2>Live Preview</h2>
          <div class="preview-frame" id="previewFrame"></div>
        </div>

        <!-- Slots -->
        <div id="slotsContainer"></div>

        <!-- Save -->
        <div class="save-bar">
          <button id="saveBtn" class="btn btn-primary">
            <span class="spinner"></span>
            Save Configuration
          </button>
          <span id="saveFeedback" class="save-feedback"></span>
        </div>
      </div>

      <!-- Right: Styling -->
      <div class="styling-sidebar">
        <h3>Widget Styling</h3>

        <div class="styling-group">
          <label>Border Style</label>
          <div class="border-options">
            <div class="border-option selected" data-border="flat">Flat</div>
            <div class="border-option" data-border="glow">Glow</div>
            <div class="border-option" data-border="metallic">Metallic</div>
            <div class="border-option" data-border="cyber">Cyber</div>
          </div>
        </div>

        <div class="styling-group">
          <label>Accent Color</label>
          <div class="color-picker-wrapper">
            <input type="color" id="colorPicker" value="#8257e5">
            <span class="color-hex" id="colorHex">#8257e5</span>
          </div>
        </div>

        <div class="styling-group">
          <label>Layout</label>
          <div class="layout-options">
            <div class="layout-option selected" data-layout="horizontal">Horizontal</div>
            <div class="layout-option" data-layout="vertical">Vertical</div>
            <div class="layout-option" data-layout="grid-2x3">Grid 2×3</div>
            <div class="layout-option" data-layout="grid-3x2">Grid 3×2</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Importer Modal -->
  <div id="importerModal" class="modal-overlay">
    <div class="modal-content">
      <h2>Import from Pokémon Showdown</h2>
      <p style="color:var(--text-secondary);margin-bottom:12px;font-size:0.875rem;">
        Paste your team export from Pokémon Showdown below. The parser will extract up to 6 Pokémon and their held items.
      </p>
      <textarea id="importerText" placeholder="Paste your Pokémon Showdown team here...&#10;&#10;Example:&#10;Charizard @ Life Orb&#10;Tapu Koko @ Choice Specs&#10;Gengar&#10;..."></textarea>
      <div class="modal-actions">
        <button id="importerPaste" class="btn btn-outline">📋 Paste from clipboard</button>
        <button id="importerCancel" class="btn btn-outline">Cancel</button>
        <button id="importerApply" class="btn btn-primary">Apply</button>
      </div>
    </div>
  </div>

  <script type="module" src="js/panel.js"></script>
</body>
</html>
```

---

### Task 10: OBS Widget JavaScript — `js/widget.js`

**Files:**
- Create: `js/widget.js`

- [ ] **Step 1: Create widget.js with real-time listener and preloader**

```javascript
import { subscribeChannel } from "./db-service.js";

// Configuration — read from URL params
const urlParams = new URLSearchParams(window.location.search);
const channel = urlParams.get("channel") || "demo";

// DOM
const teamEl = document.getElementById("teamContainer");

// State
let currentSlots = [];
let currentConfig = {
  style: "glow",
  color: "#8257e5",
  layout: "horizontal"
};

// --- Init ---
function init() {
  subscribeChannel(channel, handleDataUpdate);
}

/**
 * Handle incoming data from Firebase
 */
function handleDataUpdate(data) {
  if (!data) return;

  const newSlots = data.team || [];
  const newConfig = data.config || currentConfig;

  // Preload images before updating DOM
  preloadSprites(newSlots, newConfig).then(() => {
    currentSlots = newSlots;
    currentConfig = newConfig;
    renderTeam();
  });
}

/**
 * Preload sprite images into browser cache before rendering
 * @param {Array} slots
 * @param {object} config
 * @returns {Promise<void>}
 */
function preloadSprites(slots, config) {
  const promises = [];

  for (const slot of slots) {
    if (!slot.pokemonKey) continue;

    const cdnFile = slot.pokemonKey.replace(/-/g, '');
    const spriteUrl = slot.shiny
      ? `https://play.pokemonshowdown.com/sprites/ani-shiny/${cdnFile}.gif`
      : `https://play.pokemonshowdown.com/sprites/ani/${cdnFile}.gif`;

    promises.push(loadImage(spriteUrl));

    if (slot.itemKey) {
      const itemUrl = `https://play.pokemonshowdown.com/sprites/itemdex/${slot.itemKey}.png`;
      promises.push(loadImage(itemUrl));
    }
  }

  return Promise.allSettled(promises);
}

/**
 * Load a single image into cache
 * @param {string} url
 * @returns {Promise<void>}
 */
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Don't block on load failures
    img.src = url;
  });
}

/**
 * Render the team in the DOM
 */
function renderTeam() {
  // Set config CSS variables
  document.documentElement.style.setProperty("--main-color", currentConfig.color);
  document.documentElement.dataset.border = currentConfig.style;

  // Build widget layout
  teamEl.className = `widget-team layout-${currentConfig.layout}`;

  // Clear existing slots
  teamEl.innerHTML = "";

  for (const slot of currentSlots) {
    const slotEl = document.createElement("div");
    slotEl.className = "pokemon-slot";

    if (slot.pokemonKey) {
      const cdnFile = slot.pokemonKey.replace(/-/g, '');
      const spriteUrl = slot.shiny
        ? `https://play.pokemonshowdown.com/sprites/ani-shiny/${cdnFile}.gif`
        : `https://play.pokemonshowdown.com/sprites/ani/${cdnFile}.gif`;

      if (currentConfig.style === "metallic") {
        slotEl.classList.add("border-metallic");
        slotEl.innerHTML = `<div class="slot-inner"><img class="sprite" src="${spriteUrl}" alt=""></div>`;
      } else {
        if (currentConfig.style === "cyber") slotEl.classList.add("border-cyber");
        slotEl.innerHTML = `<img class="sprite" src="${spriteUrl}" alt="">`;
      }

      if (slot.itemKey) {
        const itemUrl = `https://play.pokemonshowdown.com/sprites/itemdex/${slot.itemKey}.png`;
        slotEl.innerHTML += `<img class="item-icon" src="${itemUrl}" alt="">`;
      }
    } else {
      slotEl.classList.add("slot-empty");
      slotEl.textContent = "?";
      slotEl.style.display = "flex";
      slotEl.style.alignItems = "center";
      slotEl.style.justifyContent = "center";
      slotEl.style.fontSize = "1.5rem";
      slotEl.style.opacity = "0.4";
    }

    teamEl.appendChild(slotEl);
  }
}

// Bootstrap
document.addEventListener("DOMContentLoaded", init);
```

---

### Task 11: OBS Widget HTML — `index.html`

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create index.html for OBS browser source**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pokémon Team Widget</title>
  <link rel="stylesheet" href="css/widget.css">
  <style>
    html, body {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: transparent;
    }
  </style>
</head>
<body>
  <div id="teamContainer" class="widget-team layout-horizontal"></div>
  <script type="module" src="js/widget.js"></script>
</body>
</html>
```

---

### Task 12: Update firebase-config.js with real config

**Files:**
- Modify: `js/firebase-config.js`

- [ ] **Step 1: Update firebaseConfig to use environment-based or user-provided values**

Since this is a static site on GitHub Pages, use a `.env` replacement approach or document how the user replaces the placeholders. For now, update the comments to clearly document each field:

```javascript
// FIREBASE CONFIGURATION
// ======================
// Replace the placeholder values below with your Firebase project config.
// To find your config:
//   1. Go to https://console.firebase.google.com/
//   2. Open your project → Project Settings → General → Your apps → Web app
//   3. Copy the "firebaseConfig" object values here
//
// IMPORTANT: For GitHub Pages, these values are public by design.
// Security is enforced through Firebase Authentication and Realtime Database Rules,
// NOT through keeping these values secret.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

---

### Task 13: Verification — Manual Testing Checklist

**Files:**
- Create: `docs/testing.md`

- [ ] **Step 1: Create testing documentation**

```markdown
# Manual Testing Checklist

## Auth Flow
- [ ] Register a new user with Twitch username + invitation code
- [ ] Login with registered credentials
- [ ] Verify email is stored as `{username}@tuoverlay.com`
- [ ] Verify logout clears session
- [ ] Verify session persists across page reload (Firebase persistence)

## Panel
- [ ] Search for a Pokémon in the combobox
- [ ] Select a Pokémon from dropdown
- [ ] Toggle shiny mode (★)
- [ ] Clear a slot
- [ ] Add held item via item combobox
- [ ] Change border style (flat/glow/metallic/cyber)
- [ ] Change accent color with color picker
- [ ] Change layout (horizontal/vertical/grid-2x3/grid-3x2)
- [ ] Click Save — verify loading spinner appears
- [ ] Verify save feedback message
- [ ] Reload page — verify saved config loads

## Showdown Importer
- [ ] Open importer modal
- [ ] Paste valid team export text
- [ ] Click "Apply" — verify slots are populated
- [ ] Verify parse handles items (e.g., "Charizard @ Life Orb")
- [ ] Verify shiny indicator is recognized
- [ ] Verify modal closes after apply
- [ ] Test paste-from-clipboard button

## OBS Widget
- [ ] Open `index.html?channel=testchannel` in browser
- [ ] Verify widget connects to Firebase
- [ ] Make changes in panel — verify widget updates in <100ms
- [ ] Verify sprite images load correctly
- [ ] Verify shiny sprites load
- [ ] Verify item icons appear on sprites
- [ ] Verify layout modes render correctly
- [ ] Verify border styles render correctly
- [ ] Test with empty slots — verify placeholder shows

## Mobile (Chrome DevTools)
- [ ] Preview section is sticky at top
- [ ] Combobox opens as full-screen overlay on <768px
- [ ] Touch targets are at least 48px
```

---

### Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Firebase Auth (email/password, email mask) | Task 12 (existing) |
| `onIdTokenChanged` observer | Task 12 (existing in auth-service.js) |
| `setupAuthObserver` with auto-refresh | Task 12 (existing) |
| Panel Authentication UI | Task 9 (panel.html) |
| 6 Pokémon slots with autocomplete | Task 8 (panel.js combobox) |
| Shiny toggle per slot | Task 8 (panel.js shiny-toggle) |
| Clear slot button | Task 8 (panel.js clear-slot) |
| Showdown Importer Modal + parser | Task 5 (importer-service.js) + Task 9 (modal) |
| Priority: manual slots override importer | Task 8 (renderSlots called after importer) |
| Save button with loading spinner | Task 8 (handleSave spinner) |
| Border styles (flat/glow/metallic/cyber) | Task 1 (variables.css) + Task 8 (panel.js) |
| Color picker | Task 8 (colorPicker input) |
| Layout modes (H/V/Grid 2x3/Grid 3x2) | Task 2 (widget.css) + Task 8 |
| Preview mutates CSS in real-time | Task 8 (updatePreview) |
| Mobile: sticky preview top | Task 3 (panel.css @media) |
| Mobile: fullscreen combobox overlay | Task 3 (panel.css fixed dropdown) |
| Mobile: 48px touch targets | Task 3 (panel.css combobox-item min-height) |
| Importer clipboard reader + fallback | Task 8 (handleImporterPaste) |
| Firebase rules (canales/$canal/.write auth) | Documented in spec + Task 12 |
| OBS widget: real-time `.on('value')` | Task 10 (widget.js subscribeChannel) |
| OBS widget: image preloading | Task 10 (preloadSprites) |
| OBS widget: loading skeleton (slot-loading) | Task 2 (widget.css .slot-loading) |
| OBS widget: 300ms opacity transition | Task 2 (widget.css .pokemon-slot transition) |
| OBS widget: fluid CSS Grid layout | Task 2 (widget.css .widget-team) |
| CDN sprite URLs (ani/ani-shiny/itemdex) | Task 8 + Task 10 (URL construction) |
| pokemon_list.json (name/key/cdn_file) | Task 6 |
| item_list.json (name/key) | Task 7 |
| 2KB per channel data | Task 4 (db-service.js minimal schema) |
