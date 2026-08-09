import { auth } from "./firebase-config.js";
import { loginStreamer, logoutStreamer, registerStreamer, setupAuthObserver } from "./auth-service.js";
import { saveTeamConfig, getTeamConfig } from "./db-service.js";
import { loadTeams, persistTeams, makeTeamId } from "./saved-teams.js";
import { loadDictionaries, searchPokemon, searchItems, parseShowdownTeam, getPokemonByKey, getItemByKey } from "./importer-service.js";

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
  layout: "horizontal",
  circleSize: 72,
  slotGap: 8,
  itemPos: "right"
};
let savedTeams = [];

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const loadingView = $("#loadingView");
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
const saveTeamBtn = $("#saveTeamBtn");
const savedTeamsList = $("#savedTeamsList");
const saveTeamModal = $("#saveTeamModal");
const saveTeamHint = $("#saveTeamHint");
const saveTeamName = $("#saveTeamName");
const saveTeamCancel = $("#saveTeamCancel");
const saveTeamAsNew = $("#saveTeamAsNew");
const saveTeamConfirm = $("#saveTeamConfirm");

export async function initPanel() {
  try {
    await Promise.all([
      loadDictionaries(),
      loadImage("https://play.pokemonshowdown.com/sprites/itemicons-sheet.png")
    ]);
    setupAuthObserver(handleAuthChange);
    bindAuthEvents();
    bindPanelEvents();
  } catch (err) {
    console.error("[Panel] Init error:", err);
  }
}

function getSpriteId(key) {
  const singleFile = ['nidoran-f','nidoran-m','mr-mime','mr-rime','mime-jr',
    'farfetchd','sirfetchd','type-null','ho-oh','porygon-z',
    'wo-chien','chien-pao','ting-lu','chi-yu','jangmo-o','hakamo-o','kommo-o'];
  if (singleFile.includes(key)) return key.replace(/-/g, '');

  if (key.endsWith('-male') || key.endsWith('-female')) {
    const idx = key.lastIndexOf('-');
    return key.slice(0, idx);
  }

  if (!key.includes('-')) return key;
  const idx = key.indexOf('-');
  return key.slice(0, idx) + '-' + key.slice(idx + 1).replace(/[^a-z0-9]/g, '');
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

function showView(activeView) {
  [loadingView, authView, panelView].forEach(v => v.classList.remove("active"));
  activeView.classList.add("active");
}

function handleAuthChange(user) {
  currentUser = user;
  if (user) {
    channelName = user.email.split('@')[0];
    showView(panelView);
    channelDisplay.textContent = channelName;
    loadExistingConfig();
    loadSavedTeamsForChannel();
  } else {
    showView(authView);
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

  $("#circleSize").addEventListener("input", (e) => {
    config.circleSize = parseInt(e.target.value);
    $("#circleSizeValue").textContent = config.circleSize + "px";
    updatePreview();
  });

  $("#slotGap").addEventListener("input", (e) => {
    config.slotGap = parseInt(e.target.value);
    $("#slotGapValue").textContent = config.slotGap + "px";
    updatePreview();
  });

  document.querySelectorAll("[name=itemPos]").forEach(el => {
    el.addEventListener("change", (e) => {
      config.itemPos = e.target.value;
      updatePreview();
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".combobox-wrapper")) {
      document.querySelectorAll(".combobox-dropdown.open").forEach(d => d.classList.remove("open"));
    }
  });

  saveTeamBtn.addEventListener("click", openSaveTeamModal);
  saveTeamCancel.addEventListener("click", closeSaveTeamModal);
  saveTeamAsNew.addEventListener("click", handleSaveTeamAsNew);
  saveTeamConfirm.addEventListener("click", handleSaveTeamConfirm);
  saveTeamModal.addEventListener("click", (e) => {
    if (e.target === saveTeamModal) closeSaveTeamModal();
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
        <span class="slot-number">#${i + 1}</span>
        <div class="slot-controls">
          <button class="shiny-toggle ${slot.shiny ? 'active' : ''}" data-slot="${i}" title="Toggle Shiny">${slot.shiny ? '★' : '☆'}</button>
          <button class="clear-slot" data-slot="${i}" title="Clear slot">🗑</button>
        </div>
      </div>
      <div class="combobox-wrapper" data-slot="${i}">
        <input type="text" class="pokemon-search" placeholder="Pokémon..." value="${slot.pokemonName}" data-slot="${i}" autocomplete="off">
        <div class="combobox-dropdown" data-type="pokemon" data-slot="${i}"></div>
      </div>
      <div class="combobox-wrapper item-wrapper" data-slot="${i}" style="margin-top: 8px;">
        <input type="text" class="item-search" placeholder="Item" value="${slot.itemName}" data-slot="${i}" autocomplete="off">
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
      teamSlots[i].pokemonName = item.name.replace(/\s*\((Male|Female)\)\s*$/i, '').trim();
      pokeInput.value = teamSlots[i].pokemonName;
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
      updatePreview();
    });

    container.appendChild(editor);
  }
}

function setupCombobox(input, dropdown, searchFn, onSelect) {
  function closeOthers() {
    document.querySelectorAll(".combobox-dropdown.open").forEach(d => {
      if (d !== dropdown) d.classList.remove("open");
    });
  }

  input.addEventListener("input", () => {
    const results = searchFn(input.value);
    renderDropdown(dropdown, results, onSelect);
    closeOthers();
    dropdown.classList.add("open");
  });

  input.addEventListener("focus", () => {
    const results = searchFn(input.value);
    renderDropdown(dropdown, results, onSelect);
    closeOthers();
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
  container.dataset.style = config.style;
  container.style.setProperty("--circle-size", config.circleSize + "px");
  container.style.setProperty("--slot-gap", config.slotGap + "px");
  const iconScale = Math.min(1, config.circleSize / 60);
  container.style.setProperty("--icon-scale", iconScale.toString());
  container.dataset.itemPos = config.itemPos;

  for (const slot of teamSlots) {
    const slotEl = document.createElement("div");
    slotEl.className = "pokemon-slot";

    if (slot.pokemonKey) {
      const entry = getPokemonByKey(slot.pokemonKey);
      const spriteId = getSpriteId(slot.pokemonKey);
      const spriteUrl = slot.shiny
        ? `https://play.pokemonshowdown.com/sprites/home-centered-shiny/${spriteId}.png`
        : `https://play.pokemonshowdown.com/sprites/home-centered/${spriteId}.png`;

      const circle = document.createElement("div");
      circle.className = "slot-circle";
      circle.style.setProperty("--slot-color", config.color);
      circle.innerHTML = `<img class="sprite" src="${spriteUrl}" alt="${slot.pokemonName}" loading="lazy">`;

      if (slot.itemKey) {
        const itemEntry = getItemByKey(slot.itemKey);
        const icon = document.createElement("div");
        icon.className = "item-icon";
        icon.style.setProperty("--icon-scale", iconScale.toString());
        if (itemEntry && itemEntry.i !== undefined) {
          const tileX = (itemEntry.i % 16) * -24;
          const tileY = Math.floor(itemEntry.i / 16) * -24;
          icon.style.setProperty("--item-pos", `${tileX}px ${tileY}px`);
        }
        circle.appendChild(icon);
      }

      slotEl.appendChild(circle);
    } else {
      slotEl.classList.add("slot-empty");
      const circle = document.createElement("div");
      circle.className = "slot-circle";
      slotEl.appendChild(circle);
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
  $("#circleSize").value = config.circleSize;
  $("#circleSizeValue").textContent = config.circleSize + "px";
  $("#slotGap").value = config.slotGap;
  $("#slotGapValue").textContent = config.slotGap + "px";
  const posRadio = document.querySelector(`[name=itemPos][value="${config.itemPos}"]`);
  if (posRadio) posRadio.checked = true;
}

function loadSavedTeamsForChannel() {
  savedTeams = loadTeams(channelName);
  renderSavedTeams();
}

function renderSavedTeams() {
  savedTeamsList.innerHTML = "";
  if (savedTeams.length === 0) {
    savedTeamsList.innerHTML = '<div class="saved-teams-empty">No saved teams yet.</div>';
    return;
  }
  savedTeams.forEach(team => {
    const card = document.createElement("div");
    card.className = "saved-team-card";
    card.innerHTML = `
      <div class="saved-team-info">
        <span class="saved-team-name"></span>
        <div class="saved-team-sprites"></div>
      </div>
      <div class="saved-team-actions">
        <button class="btn btn-outline btn-sm saved-team-load" data-id="${team.id}">Load</button>
        <button class="btn btn-danger btn-sm saved-team-delete" data-id="${team.id}">Delete</button>
      </div>
    `;
    card.querySelector(".saved-team-name").textContent = team.name;
    const sprites = card.querySelector(".saved-team-sprites");
    for (const slot of team.slots) {
      const img = document.createElement("img");
      img.className = "saved-team-sprite";
      img.alt = "";
      if (slot.pokemonKey) {
        img.src = `https://play.pokemonshowdown.com/sprites/home-centered/${getSpriteId(slot.pokemonKey)}.png`;
      } else {
        img.classList.add("saved-team-sprite-empty");
      }
      sprites.appendChild(img);
    }
    card.querySelector(".saved-team-load").addEventListener("click", () => loadTeam(team.id));
    card.querySelector(".saved-team-delete").addEventListener("click", () => deleteTeam(team.id));
    savedTeamsList.appendChild(card);
  });
}

function loadTeam(id) {
  const team = savedTeams.find(t => t.id === id);
  if (!team) return;
  teamSlots = team.slots.map(s => ({ ...s }));
  renderSlots();
  updatePreview();
  showSaveFeedback(`Loaded "${team.name}". Press Save to publish.`, false);
}

function deleteTeam(id) {
  const team = savedTeams.find(t => t.id === id);
  if (!team) return;
  if (!confirm(`Delete team "${team.name}"?`)) return;
  const teams = savedTeams.filter(t => t.id !== id);
  try {
    persistTeams(channelName, teams);
  } catch (error) {
    showSaveFeedback("Could not delete team: storage error.", true);
    return;
  }
  savedTeams = teams;
  renderSavedTeams();
  showSaveFeedback("Team deleted.", false);
}

function showSaveFeedback(msg, isError) {
  saveFeedback.textContent = msg;
  saveFeedback.style.color = isError ? "var(--danger)" : "var(--success)";
  saveFeedback.classList.add("show");
}

function closeSaveTeamModal() {
  saveTeamModal.classList.remove("open");
}

function openSaveTeamModal() {
  const hasAny = teamSlots.some(s => s.pokemonKey);
  if (!hasAny) {
    showSaveFeedback("Add at least one Pokémon before saving a team.", true);
    return;
  }
  saveTeamName.value = "";
  saveTeamHint.textContent = "Enter a name for this team.";
  saveTeamHint.classList.remove("error");
  saveTeamAsNew.style.display = "none";
  saveTeamConfirm.textContent = "Save";
  saveTeamModal.classList.add("open");
  saveTeamName.focus();
}

function handleSaveTeamConfirm() {
  const name = saveTeamName.value.trim();
  if (!name) {
    saveTeamHint.textContent = "The team name cannot be empty.";
    saveTeamHint.classList.add("error");
    return;
  }
  const existing = savedTeams.find(t => t.name === name);
  if (existing && saveTeamConfirm.textContent !== "Overwrite") {
    saveTeamHint.textContent = `A team named "${name}" already exists.`;
    saveTeamHint.classList.add("error");
    saveTeamAsNew.style.display = "inline-flex";
    saveTeamConfirm.textContent = "Overwrite";
    return;
  }
  const slots = teamSlots.map(s => ({ ...s }));
  let teams;
  if (existing) {
    existing.slots = slots;
    existing.updatedAt = Date.now();
    teams = savedTeams;
  } else {
    const newTeam = { id: makeTeamId(), name, slots, updatedAt: Date.now() };
    teams = [...savedTeams, newTeam];
  }
  try {
    persistTeams(channelName, teams);
  } catch (error) {
    showSaveFeedback("Could not save team: storage error.", true);
    return;
  }
  savedTeams = teams;
  closeSaveTeamModal();
  renderSavedTeams();
  showSaveFeedback("Team saved!", false);
}

function handleSaveTeamAsNew() {
  const name = saveTeamName.value.trim();
  if (!name) return;
  const copyName = `${name} (copy)`;
  const newTeam = { id: makeTeamId(), name: copyName, slots: teamSlots.map(s => ({ ...s })), updatedAt: Date.now() };
  const teams = [...savedTeams, newTeam];
  try {
    persistTeams(channelName, teams);
  } catch (error) {
    showSaveFeedback("Could not save team: storage error.", true);
    return;
  }
  savedTeams = teams;
  closeSaveTeamModal();
  renderSavedTeams();
  showSaveFeedback("Team saved!", false);
}

document.addEventListener("DOMContentLoaded", initPanel);
