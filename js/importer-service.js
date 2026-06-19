let pokemonList = [];
let itemList = [];

const nameToPokemon = new Map();
const keyToPokemon = new Map();
const nameToItem = new Map();
const keyToItem = new Map();

export async function loadDictionaries() {
  try {
    const [pokeRes, itemRes] = await Promise.all([
      fetch("./data/pokemon_list.json"),
      fetch("./data/item_list.json")
    ]);
    pokemonList = await pokeRes.json();
    itemList = await itemRes.json();
    rebuildMaps();
  } catch (error) {
    console.error("Error loading Pokémon dictionaries:", error);
    throw error;
  }
}

function rebuildMaps() {
  nameToPokemon.clear();
  keyToPokemon.clear();
  nameToItem.clear();
  pokemonList.forEach(p => {
    nameToPokemon.set(p.name.toLowerCase(), p);
    keyToPokemon.set(p.key, p);
  });
  itemList.forEach(i => {
    nameToItem.set(i.name.toLowerCase(), i);
    keyToItem.set(i.key, i);
  });
}

/**
 * Parse a Pokemon Showdown team export string
 * @param {string} text - the raw team export
 * @returns {Array<{pokemonKey: string|null, itemKey: string|null, shiny: boolean, pokemonName: string|null, itemName: string|null}>}
 */
function resolvePokemon(name, gender) {
  const key = name.toLowerCase().trim();
  let entry = nameToPokemon.get(key) || keyToPokemon.get(key);
  if (entry) {
    if (gender === 'F' && entry.key.endsWith('-male')) {
      const femaleKey = entry.key.replace(/-male$/, '-female');
      return keyToPokemon.get(femaleKey) || entry;
    }
    if (gender === 'M' && entry.key.endsWith('-female')) {
      const maleKey = entry.key.replace(/-female$/, '-male');
      return keyToPokemon.get(maleKey) || entry;
    }
    return entry;
  }

  const hyphenIdx = key.indexOf('-');
  if (hyphenIdx > 0) {
    const base = key.slice(0, hyphenIdx);
    const suffix = key.slice(hyphenIdx + 1);
    const parenKey = `${base} (${suffix})`;
    entry = nameToPokemon.get(parenKey);
    if (entry) return entry;
  }

  if (gender === 'F') {
    entry = nameToPokemon.get(`${key} (female)`) || keyToPokemon.get(`${key}-female`);
    if (entry) return entry;
  }
  if (gender === 'M') {
    entry = nameToPokemon.get(`${key} (male)`) || keyToPokemon.get(`${key}-male`);
    if (entry) return entry;
  }

  const male = keyToPokemon.get(`${key}-male`);
  if (male) return male;

  return null;
}

export function parseShowdownTeam(text) {
  if (!text || typeof text !== "string") {
    console.warn("parseShowdownTeam received invalid input");
    return [];
  }

  const blocks = text.split('\n\n').map(b => b.trim()).filter(b => b.length > 0);
  const slots = [];

  for (const block of blocks) {
    if (slots.length >= 6) break;

    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) continue;

    let firstLine = lines[0];
    if (firstLine.startsWith('```') || firstLine.startsWith('---')) continue;

    let item = null;
    const itemIdx = firstLine.indexOf(' @ ');
    if (itemIdx !== -1) {
      item = firstLine.slice(itemIdx + 3).trim();
      firstLine = firstLine.slice(0, itemIdx).trim();
    }

    let gender = null;
    if (firstLine.endsWith(' (M)')) {
      gender = 'M';
      firstLine = firstLine.slice(0, -4).trim();
    } else if (firstLine.endsWith(' (F)')) {
      gender = 'F';
      firstLine = firstLine.slice(0, -4).trim();
    } else if (firstLine.endsWith(' (Male)')) {
      gender = 'M';
      firstLine = firstLine.slice(0, -7).trim();
    } else if (firstLine.endsWith(' (Female)')) {
      gender = 'F';
      firstLine = firstLine.slice(0, -9).trim();
    } else if (firstLine.endsWith('-M')) {
      gender = 'M';
      firstLine = firstLine.slice(0, -2).trim();
    } else if (firstLine.endsWith('-F')) {
      gender = 'F';
      firstLine = firstLine.slice(0, -2).trim();
    }

    if (firstLine.endsWith(')') && firstLine.includes('(')) {
      const parenIdx = firstLine.lastIndexOf('(');
      const possibleSpecies = firstLine.slice(parenIdx + 1, -1).trim();
      if (possibleSpecies && possibleSpecies !== 'M' && possibleSpecies !== 'F') {
        const sl = possibleSpecies.toLowerCase();
        if (sl === 'male') {
          gender = 'M';
          firstLine = firstLine.slice(0, parenIdx).trim();
        } else if (sl === 'female') {
          gender = 'F';
          firstLine = firstLine.slice(0, parenIdx).trim();
        } else {
          firstLine = possibleSpecies;
        }
      }
    }

    const shiny = /shiny/i.test(firstLine) || /★/.test(firstLine);
    const cleanName = firstLine.replace(/[★☆]/g, '').trim();

    const pokemonEntry = resolvePokemon(cleanName, gender);
    let itemEntry = null;
    if (item) {
      const itemClean = item.replace(/\(.*?\)/g, '').trim();
      itemEntry = nameToItem.get(itemClean.toLowerCase()) || keyToItem.get(itemClean.toLowerCase());
    }

    slots.push({
      pokemonKey: pokemonEntry ? pokemonEntry.key : null,
      pokemonName: pokemonEntry ? cleanName : null,
      itemKey: itemEntry ? itemEntry.key : null,
      itemName: itemEntry ? itemEntry.name : item,
      shiny: shiny
    });
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
  return keyToPokemon.get(key) || null;
}

/**
 * Get an item entry by its key
 * @param {string} key
 * @returns {object|null}
 */
export function getItemByKey(key) {
  return keyToItem.get(key) || null;
}
