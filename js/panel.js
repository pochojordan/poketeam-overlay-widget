import { auth } from "./firebase-config.js";
import { loginStreamer, logoutStreamer, registerStreamer, setupAuthObserver } from "./auth-service.js";
import { saveTeamConfig, getTeamConfig } from "./db-service.js";
import { loadDictionaries, searchPokemon, searchItems, parseShowdownTeam, getPokemonByKey } from "./importer-service.js";

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

export async function initPanel() {
  try {
    await loadDictionaries();
    setupAuthObserver(handleAuthChange);
    bindAuthEvents();
    bindPanelEvents();
  } catch (err) {
    console.error("[Panel] Init error:", err);
  }
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

function bindPanelEvents() {
  saveBtn.addEventListener("click", handleSave);

  importerBtn.addEventListener("click", () => importerModal.classList.add("open"));
  importerCancel.addEventListener("click", () => importerModal.classList.remove("open"));
  importerApply.addEventListener("click", handleImporterApply);
  importerPaste.addEventListener("click", handleImporterPaste);

  importerModal.addEventListener("click", (e) => {
    if (e.target === importerModal) importerModal.classList.remove("open");
  });

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

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".combobox-wrapper")) {
      document.querySelectorAll(".combobox-dropdown.open").forEach(d => d.classList.remove("open"));
    }
  });
}

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

    editor.querySelector(".shiny-toggle").addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.slot);
      teamSlots[idx].shiny = !teamSlots[idx].shiny;
      renderSlots();
      updatePreview();
    });

    editor.querySelector(".clear-slot").addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.slot);
      teamSlots[idx] = { pokemonKey: null, pokemonName: "", itemKey: null, itemName: "", shiny: false };
      renderSlots();
      updatePreview();
    });

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

function setupCombobox(input, dropdown, searchFn, onSelect) {
  input.addEventListener("input", () => {
    const results = searchFn(input.value);
    renderDropdown(dropdown, results, onSelect);
    dropdown.classList.add("open");
  });

  input.addEventListener("focus", () => {
    const results = searchFn(input.value);
    renderDropdown(dropdown, results, onSelect);
    dropdown.classList.add("open");
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

function updatePreview() {
  const frame = $("#previewFrame");
  frame.innerHTML = "";
  const container = document.createElement("div");
  container.className = `widget-team layout-${config.layout}`;
  container.dataset.border = config.style;

  for (const slot of teamSlots) {
    const slotEl = document.createElement("div");
    slotEl.className = "pokemon-slot";

    if (slot.pokemonKey) {
      const entry = getPokemonByKey(slot.pokemonKey);
      const cdnFile = entry ? entry.cdn_file : slot.pokemonKey.replace(/-/g, '');
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
      slotEl.style.display = "flex";
      slotEl.style.alignItems = "center";
      slotEl.style.justifyContent = "center";
      slotEl.style.fontSize = "1.5rem";
      slotEl.style.color = "rgba(115, 115, 128, 0.5)";
    }

    container.appendChild(slotEl);
  }

  frame.appendChild(container);
}

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
    if (text) importerText.value = text;
  } catch {
    importerText.focus();
  }
}

async function handleSave() {
  saveBtn.disabled = true;
  saveBtn.classList.add("loading");
  saveFeedback.classList.remove("show");
  saveFeedback.style.color = "var(--success)";

  try {
    await saveTeamConfig(channelName, { slots: teamSlots, config });
    saveFeedback.textContent = "Saved successfully!";
    saveFeedback.classList.add("show");
  } catch (err) {
    saveFeedback.textContent = `Error: ${err.message}`;
    saveFeedback.style.color = "var(--danger)";
    saveFeedback.classList.add("show");
  } finally {
    saveBtn.disabled = false;
    saveBtn.classList.remove("loading");
  }
}

async function loadExistingConfig() {
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
  document.querySelectorAll("[data-border]").forEach(el => {
    el.classList.toggle("selected", el.dataset.border === config.style);
  });
  document.querySelectorAll("[data-layout]").forEach(el => {
    el.classList.toggle("selected", el.dataset.layout === config.layout);
  });
  $("#colorPicker").value = config.color;
  $("#colorHex").textContent = config.color;
}

document.addEventListener("DOMContentLoaded", initPanel);
