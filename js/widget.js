import { subscribeChannel } from "./db-service.js";

const urlParams = new URLSearchParams(window.location.search);
const channel = urlParams.get("channel") || "demo";

const teamEl = document.getElementById("teamContainer");

let currentConfig = {
  style: "glow",
  color: "#8257e5",
  layout: "horizontal"
};

function init() {
  subscribeChannel(channel, handleDataUpdate);
}

function handleDataUpdate(data) {
  if (!data) return;

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
  document.documentElement.style.setProperty("--main-color", currentConfig.color);
  document.documentElement.dataset.border = currentConfig.style;

  teamEl.className = `widget-team layout-${currentConfig.layout}`;
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
      slotEl.style.display = "flex";
      slotEl.style.alignItems = "center";
      slotEl.style.justifyContent = "center";
      slotEl.style.fontSize = "1.5rem";
      slotEl.style.opacity = "0.4";
    }

    teamEl.appendChild(slotEl);
  }
}

document.addEventListener("DOMContentLoaded", init);
