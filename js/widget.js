import { subscribeChannel } from "./db-service.js";

const urlParams = new URLSearchParams(window.location.search);
const channel = urlParams.get("channel") || "demo";

const teamEl = document.getElementById("teamContainer");
let itemIndexMap = {};

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

let currentConfig = {
  style: "glow",
  color: "#8257e5",
  layout: "horizontal",
  circleSize: 72,
  slotGap: 8,
  itemPos: "right"
};

async function init() {
  await Promise.all([
    loadItemIndexes(),
    loadImage("https://play.pokemonshowdown.com/sprites/itemicons-sheet.png")
  ]);
  subscribeChannel(channel, handleDataUpdate);
}

async function loadItemIndexes() {
  try {
    const res = await fetch("./data/item_list.json");
    const items = await res.json();
    for (const item of items) {
      if (item.i !== undefined) itemIndexMap[item.key] = item.i;
    }
  } catch (e) {
    console.warn("Failed to load item index map", e);
  }
}

function handleDataUpdate(data) {
  if (!data) {
    teamEl.innerHTML = '<div class="widget-empty">Waiting for team data...</div>';
    return;
  }

  const newSlots = data.team || [];
  const newConfig = data.config || currentConfig;

  preloadSprites(newSlots, newConfig).then(() => {
    currentSlots = newSlots;
    currentConfig = newConfig;
    renderTeam();
  });
}

function preloadSprites(slots, config) {
  const promises = [];

  for (const slot of slots) {
    if (!slot.pokemonKey) continue;

    const spriteId = getSpriteId(slot.pokemonKey);
    const spriteUrl = slot.shiny
      ? `https://play.pokemonshowdown.com/sprites/home-centered-shiny/${spriteId}.png`
      : `https://play.pokemonshowdown.com/sprites/home-centered/${spriteId}.png`;

    promises.push(loadImage(spriteUrl));
  }

  return Promise.allSettled(promises);
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = url;
  });
}

let currentSlots = [];

function renderTeam() {
  teamEl.dataset.style = currentConfig.style;
  teamEl.className = `widget-team layout-${currentConfig.layout}`;
  teamEl.style.setProperty("--circle-size", (currentConfig.circleSize || 72) + "px");
  teamEl.style.setProperty("--slot-gap", (currentConfig.slotGap || 8) + "px");
  const iconScale = Math.min(1, (currentConfig.circleSize || 72) / 60);
  teamEl.style.setProperty("--icon-scale", iconScale.toString());
  teamEl.dataset.itemPos = currentConfig.itemPos || "right";
  teamEl.innerHTML = "";

  for (const slot of currentSlots) {
    const slotEl = document.createElement("div");
    slotEl.className = "pokemon-slot";

    if (slot.pokemonKey) {
      const spriteId = getSpriteId(slot.pokemonKey);
      const spriteUrl = slot.shiny
        ? `https://play.pokemonshowdown.com/sprites/home-centered-shiny/${spriteId}.png`
        : `https://play.pokemonshowdown.com/sprites/home-centered/${spriteId}.png`;

      const circle = document.createElement("div");
      circle.className = "slot-circle";
      circle.style.setProperty("--slot-color", currentConfig.color);
      circle.innerHTML = `<img class="sprite" src="${spriteUrl}" alt="">`;

      if (slot.itemKey) {
        const idx = itemIndexMap[slot.itemKey];
        const icon = document.createElement("div");
        icon.className = "item-icon";
        icon.style.setProperty("--icon-scale", iconScale.toString());
        if (idx !== undefined) {
          const tileX = (idx % 16) * -24;
          const tileY = Math.floor(idx / 16) * -24;
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

    teamEl.appendChild(slotEl);
  }
}

document.addEventListener("DOMContentLoaded", init);
