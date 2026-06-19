let pokemonList = [];
let itemList = [];

const nameToPokemon = new Map();
const cdnFileToPokemon = new Map();
const nameToItem = new Map();

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
  nameToItem.clear();
  pokemonList.forEach(p => {
    nameToPokemon.set(p.name.toLowerCase(), p);
    cdnFileToPokemon.set(p.cdn_file.toLowerCase(), p);
  });
  itemList.forEach(i => nameToItem.set(i.name.toLowerCase(), i));
}

/**
 * Parse a Pokemon Showdown team export string
 * @param {string} text - the raw team export
 * @returns {Array<{pokemonKey: string|null, itemKey: string|null, shiny: boolean, pokemonName: string|null, itemName: string|null}>}
 */
export function parseShowdownTeam(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const slots = [];

  for (const line of lines) {
    if (line.startsWith('```') || line.startsWith('---')) continue;

    const pokemonMatch = line.match(/^([^(]+?)(?:\s*@\s*(.+))?$/);
    if (!pokemonMatch) continue;

    const rawName = pokemonMatch[1].trim();
    const rawItem = pokemonMatch[2] ? pokemonMatch[2].trim() : null;

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

/**
 * Get a Pokemon entry by its key
 * @param {string} key
 * @returns {object|null}
 */
export function getPokemonByKey(key) {
  return pokemonList.find(p => p.key === key) || null;
}
