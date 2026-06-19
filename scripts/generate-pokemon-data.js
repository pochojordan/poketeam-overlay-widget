const https = require('https');
const fs = require('fs');
const path = require('path');

const NAME_EXCEPTIONS = {
  'nidoran-f': { name: 'Nidoran\u2640', cdn_file: 'nidoranf' },
  'nidoran-m': { name: 'Nidoran\u2642', cdn_file: 'nidoranm' },
  'mr-mime': { name: 'Mr. Mime', cdn_file: 'mrmime' },
  'mr-rime': { name: 'Mr. Rime', cdn_file: 'mrrime' },
  'mime-jr': { name: 'Mime Jr.', cdn_file: 'mimejr' },
  'farfetchd': { name: "Farfetch'd", cdn_file: 'farfetchd' },
  'sirfetchd': { name: "Sirfetch'd", cdn_file: 'sirfetchd' },
  'type-null': { name: 'Type: Null', cdn_file: 'typenull' },
  'ho-oh': { name: 'Ho-Oh', cdn_file: 'hooh' },
  'porygon-z': { name: 'Porygon-Z', cdn_file: 'porygonz' },
  'wo-chien': { name: 'Wo-Chien', cdn_file: 'wochien' },
  'chien-pao': { name: 'Chien-Pao', cdn_file: 'chienpao' },
  'ting-lu': { name: 'Ting-Lu', cdn_file: 'tinglu' },
  'chi-yu': { name: 'Chi-Yu', cdn_file: 'chiyu' },
  'jangmo-o': { name: 'Jangmo-o', cdn_file: 'jangmoo' },
  'hakamo-o': { name: 'Hakamo-o', cdn_file: 'hakamoo' },
  'kommo-o': { name: 'Kommo-o', cdn_file: 'kommoo' },
  'flabebe': { name: 'Flab\u00e9b\u00e9', cdn_file: 'flabebe' },
};

const NON_FORM_HYPHENATED = new Set([
  'nidoran-f', 'nidoran-m', 'mr-mime', 'mr-rime', 'mime-jr',
  'farfetchd', 'sirfetchd', 'type-null', 'ho-oh', 'porygon-z',
  'wo-chien', 'chien-pao', 'ting-lu', 'chi-yu',
  'jangmo-o', 'hakamo-o', 'kommo-o', 'flabebe',
  'tapu-koko', 'tapu-lele', 'tapu-bulu', 'tapu-fini',
  'great-tusk', 'scream-tail', 'brute-bonnet', 'flutter-mane',
  'slither-wing', 'sandy-shocks', 'iron-treads', 'iron-bundle',
  'iron-hands', 'iron-jugulis', 'iron-moth', 'iron-thorns',
  'roaring-moon', 'iron-valiant', 'walking-wake', 'iron-leaves',
  'gouging-fire', 'raging-bolt', 'iron-boulder', 'iron-crown',
]);

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { timeout: 30000 }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Failed to parse JSON')); }
      });
    }).on('error', reject).on('timeout', function () {
      this.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

async function fetchShowdownSpriteList() {
  try {
    const html = await fetchJSON('https://play.pokemonshowdown.com/sprites/ani/');
    return null;
  } catch {
    return null;
  }
}

function capitalizeWord(word) {
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function generateEntry(pokeapiName) {
  if (NAME_EXCEPTIONS[pokeapiName]) {
    const exc = NAME_EXCEPTIONS[pokeapiName];
    return { name: exc.name, key: pokeapiName, cdn_file: exc.cdn_file };
  }

  let displayName;
  let key = pokeapiName;
  let cdnFile;

  if (!pokeapiName.includes('-')) {
    displayName = capitalizeWord(pokeapiName);
    cdnFile = pokeapiName;
  } else if (NON_FORM_HYPHENATED.has(pokeapiName)) {
    displayName = pokeapiName.split('-').map(capitalizeWord).join(' ');
    cdnFile = pokeapiName.replace(/-/g, '');
    // Post-process: Fix "Tapu Koko" -> already correct
  } else {
    const firstHyphen = pokeapiName.indexOf('-');
    const basePart = pokeapiName.substring(0, firstHyphen);
    const formPart = pokeapiName.substring(firstHyphen + 1);
    const baseName = capitalizeWord(basePart);
    const formName = formPart.split('-').map(capitalizeWord).join(' ');
    displayName = `${baseName} (${formName})`;
    cdnFile = pokeapiName.replace(/-/g, '');
  }

  return { name: displayName, key, cdn_file: cdnFile };
}

function generateFallback() {
  const fallbackNames = [
    "bulbasaur", "ivysaur", "venusaur", "charmander", "charmeleon",
    "charizard", "squirtle", "wartortle", "blastoise", "caterpie",
    "metapod", "butterfree", "weedle", "kakuna", "beedrill",
    "pidgey", "pidgeotto", "pidgeot", "rattata", "raticate",
    "spearow", "fearow", "ekans", "arbok", "pikachu",
    "raichu", "sandshrew", "sandslash", "nidoran-f", "nidorina",
    "nidoqueen", "nidoran-m", "nidorino", "nidoking", "clefairy",
    "clefable", "vulpix", "ninetales", "jigglypuff", "wigglytuff",
    "zubat", "golbat", "oddish", "gloom", "vileplume",
    "paras", "parasect", "venonat", "venomoth", "diglett",
    "dugtrio", "meowth", "persian", "psyduck", "golduck",
    "mankey", "primeape", "growlithe", "arcanine", "poliwag",
    "poliwhirl", "poliwrath", "abra", "kadabra", "alakazam",
    "machop", "machoke", "machamp", "bellsprout", "weepinbell",
    "victreebel", "tentacool", "tentacruel", "geodude", "graveler",
    "golem", "ponyta", "rapidash", "slowpoke", "slowbro",
    "magnemite", "magneton", "farfetchd", "doduo", "dodrio",
    "seel", "dewgong", "grimer", "muk", "shellder",
    "cloyster", "gastly", "haunter", "gengar", "onix",
    "drowzee", "hypno", "krabby", "kingler", "voltorb",
    "electrode", "exeggcute", "exeggutor", "cubone", "marowak",
    "hitmonlee", "hitmonchan", "lickitung", "koffing", "weezing",
    "rhyhorn", "rhydon", "chansey", "tangela", "kangaskhan",
    "horsea", "seadra", "goldeen", "seaking", "staryu",
    "starmie", "mr-mime", "scyther", "jynx", "electabuzz",
    "magmar", "pinsir", "tauros", "magikarp", "gyarados",
    "lapras", "ditto", "eevee", "vaporeon", "jolteon",
    "flareon", "porygon", "omanyte", "omastar", "kabuto",
    "kabutops", "aerodactyl", "snorlax", "articuno", "zapdos",
    "moltres", "dratini", "dragonair", "dragonite", "mewtwo",
    "mew",
    // Gen 2
    "chikorita", "bayleef", "meganium", "cyndaquil", "quilava",
    "typhlosion", "totodile", "croconaw", "feraligatr", "sentret",
    "furret", "hoothoot", "noctowl", "ledyba", "ledian",
    "spinarak", "ariados", "crobat", "chinchou", "lanturn",
    "pichu", "cleffa", "igglybuff", "togepi", "togetic",
    "natu", "xatu", "mareep", "flaaffy", "ampharos",
    "bellossom", "marill", "azumarill", "sudowoodo", "politoed",
    "hoppip", "skiploom", "jumpluff", "aipom", "sunkern",
    "sunflora", "yanma", "wooper", "quagsire", "espeon",
    "umbreon", "murkrow", "slowking", "misdreavus", "unown",
    "wobbuffet", "girafarig", "pineco", "forretress", "dunsparce",
    "gligar", "steelix", "snubbull", "granbull", "qwilfish",
    "scizor", "shuckle", "heracross", "sneasel", "teddiursa",
    "ursaring", "slugma", "magcargo", "swinub", "piloswine",
    "corsola", "remoraid", "octillery", "delibird", "mantine",
    "skarmory", "houndour", "houndoom", "kingdra", "phanpy",
    "donphan", "porygon2", "stantler", "smeargle", "tyrogue",
    "hitmontop", "smoochum", "elekid", "magby", "miltank",
    "blissey", "raikou", "entei", "suicune", "larvitar",
    "pupitar", "tyranitar", "lugia", "ho-oh", "celebi",
    // Gen 3
    "treecko", "grovyle", "sceptile", "torchic", "combusken",
    "blaziken", "mudkip", "marshtomp", "swampert", "poochyena",
    "mightyena", "zigzagoon", "linoone", "wurmple", "silcoon",
    "beautifly", "cascoon", "dustox", "lotad", "lombre",
    "ludicolo", "seedot", "nuzleaf", "shiftry", "taillow",
    "swellow", "wingull", "pelipper", "ralts", "kirlia",
    "gardevoir", "surskit", "masquerain", "shroomish", "breloom",
    "slakoth", "vigoroth", "slaking", "nincada", "ninjask",
    "shedinja", "whismur", "loudred", "exploud", "makuhita",
    "hariyama", "azurill", "nosepass", "skitty", "delcatty",
    "sableye", "mawile", "aron", "lairon", "aggron",
    "meditite", "medicham", "electrike", "manectric", "plusle",
    "minun", "volbeat", "illumise", "roselia", "gulpin",
    "swalot", "carvanha", "sharpedo", "wailmer", "wailord",
    "numel", "camerupt", "torkoal", "spoink", "grumpig",
    "spinda", "trapinch", "vibrava", "flygon", "cacnea",
    "cacturne", "swablu", "altaria", "zangoose", "seviper",
    "lunatone", "solrock", "barboach", "whiscash", "corphish",
    "crawdaunt", "baltoy", "claydol", "lileep", "cradily",
    "anorith", "armaldo", "feebas", "milotic", "castform",
    "kecleon", "shuppet", "banette", "duskull", "dusclops",
    "tropius", "chimecho", "absol", "wynaut", "snorunt",
    "glalie", "spheal", "sealeo", "walrein", "clamperl",
    "huntail", "gorebyss", "relicanth", "luvdisc", "bagon",
    "shelgon", "salamence", "beldum", "metang", "metagross",
    "regirock", "regice", "registeel", "latias", "latios",
    "kyogre", "groudon", "rayquaza", "jirachi", "deoxys",
    // Gen 4
    "turtwig", "grotle", "torterra", "chimchar", "monferno",
    "infernape", "piplup", "prinplup", "empoleon", "starly",
    "staravia", "staraptor", "bidoof", "bibarel", "kricketot",
    "kricketune", "shinx", "luxio", "luxray", "budew",
    "roserade", "cranidos", "rampardos", "shieldon", "bastiodon",
    "burmy", "wormadam", "mothim", "combee", "vespiquen",
    "pachirisu", "buizel", "floatzel", "cherubi", "cherrim",
    "shellos", "gastrodon", "ambipom", "drifloon", "drifblim",
    "buneary", "lopunny", "mismagius", "honchkrow", "glameow",
    "purugly", "chingling", "stunky", "skuntank", "bronzor",
    "bronzong", "bonsly", "mime-jr", "happiny", "chatot",
    "spiritomb", "gible", "gabite", "garchomp", "munchlax",
    "riolu", "lucario", "hippopotas", "hippowdon", "skorupi",
    "drapion", "croagunk", "toxicroak", "carnivine", "finneon",
    "lumineon", "mantyke", "snover", "abomasnow", "weavile",
    "magnezone", "lickilicky", "rhyperior", "tangrowth", "electivire",
    "magmortar", "togekiss", "yanmega", "leafeon", "glaceon",
    "gliscor", "mamoswine", "porygon-z", "gallade", "probopass",
    "dusknoir", "froslass", "rotom", "uxie", "mesprit",
    "azelf", "dialga", "palkia", "heatran", "regigigas",
    "giratina", "cresselia", "phione", "manaphy", "darkrai",
    "shaymin", "arceus",
    // Gen 5
    "victini", "snivy", "servine", "serperior", "tepig",
    "pignite", "emboar", "oshawott", "dewott", "samurott",
    "patrat", "watchog", "lillipup", "herdier", "stoutland",
    "purrloin", "liepard", "pansage", "simisage", "pansear",
    "simisear", "panpour", "simipour", "munna", "musharna",
    "pidove", "tranquill", "unfezant", "blitzle", "zebstrika",
    "roggenrola", "boldore", "gigalith", "woobat", "swoobat",
    "drilbur", "excadrill", "audino", "timburr", "gurdurr",
    "conkeldurr", "tympole", "palpitoad", "seismitoad", "throh",
    "sawk", "sewaddle", "swadloon", "leavanny", "venipede",
    "whirlipede", "scolipede", "cottonee", "whimsicott", "petilil",
    "lilligant", "basculin", "sandile", "krokorok", "krookodile",
    "darumaka", "darmanitan", "maractus", "dwebble", "crustle",
    "scraggy", "scrafty", "sigilyph", "yamask", "cofagrigus",
    "tirtouga", "carracosta", "archen", "archeops", "trubbish",
    "garbodor", "zorua", "zoroark", "minccino", "cinccino",
    "gothita", "gothorita", "gothitelle", "solosis", "duosion",
    "reuniclus", "ducklett", "swanna", "vanillite", "vanillish",
    "vanilluxe", "deerling", "sawsbuck", "emolga", "karrablast",
    "escavalier", "foongus", "amoonguss", "frillish", "jellicent",
    "alomomola", "joltik", "galvantula", "ferroseed", "ferrothorn",
    "klink", "klang", "klinklang", "tynamo", "eelektrik",
    "eelektross", "elgyem", "beheeyem", "litwick", "lampent",
    "chandelure", "axew", "fraxure", "haxorus", "cubchoo",
    "beartic", "cryogonal", "shelmet", "accelgor", "stunfisk",
    "mienfoo", "mienshao", "druddigon", "golett", "golurk",
    "pawniard", "bisharp", "bouffalant", "rufflet", "braviary",
    "vullaby", "mandibuzz", "heatmor", "durant", "deino",
    "zweilous", "hydreigon", "larvesta", "volcarona", "cobalion",
    "terrakion", "virizion", "tornadus", "thundurus", "reshiram",
    "zekrom", "landorus", "kyurem", "keldeo", "meloetta",
    "genesect",
    // Gen 6
    "chespin", "quilladin", "chesnaught", "fennekin", "braixen",
    "delphox", "froakie", "frogadier", "greninja", "bunnelby",
    "diggersby", "fletchling", "fletchinder", "talonflame", "scatterbug",
    "spewpa", "vivillon", "litleo", "pyroar", "flabebe",
    "floette", "florges", "skiddo", "gogoat", "pancham",
    "pangoro", "furfrou", "espurr", "meowstic", "honedge",
    "doublade", "aegislash", "spritzee", "aromatisse", "swirlix",
    "slurpuff", "inkay", "malamar", "binacle", "barbaracle",
    "skrelp", "dragalge", "clauncher", "clawitzer", "helioptile",
    "heliolisk", "tyrunt", "tyrantrum", "amaura", "aurorus",
    "sylveon", "hawlucha", "dedenne", "carbink", "goomy",
    "sliggoo", "goodra", "klefki", "phantump", "trevenant",
    "pumpkaboo", "gourgeist", "bergmite", "avalugg", "noibat",
    "noivern", "xerneas", "yveltal", "zygarde", "diancie",
    "hoopa", "volcanion",
    // Gen 7
    "rowlet", "dartrix", "decidueye", "litten", "torracat",
    "incineroar", "popplio", "brionne", "primarina", "pikipek",
    "trumbeak", "toucannon", "yungoos", "gumshoos", "grubbin",
    "charjabug", "vikavolt", "crabrawler", "crabominable", "oricorio",
    "cutiefly", "ribombee", "rockruff", "lycanroc", "wishiwashi",
    "mareanie", "toxapex", "mudbray", "mudsdale", "dewpider",
    "araquanid", "fomantis", "lurantis", "morelull", "shiinotic",
    "salandit", "salazzle", "stufful", "bewear", "bounsweet",
    "steenee", "tsareena", "comfey", "oranguru", "passimian",
    "wimpod", "golisopod", "sandygast", "palossand", "pyukumuku",
    "type-null", "silvally", "minior", "komala", "turtonator",
    "togedemaru", "mimikyu", "bruxish", "drampa", "dhelmise",
    "jangmo-o", "hakamo-o", "kommo-o", "tapu-koko", "tapu-lele",
    "tapu-bulu", "tapu-fini", "cosmog", "cosmoem", "solgaleo",
    "lunala", "nihilego", "buzzwole", "pheromosa", "xurkitree",
    "celesteela", "kartana", "guzzlord", "necrozma", "magearna",
    "marshadow", "poipole", "naganadel", "stakataka", "blacephalon",
    "zeraora",
    // Gen 8
    "grookey", "thwackey", "rillaboom", "scorbunny", "raboot",
    "cinderace", "sobble", "drizzile", "inteleon", "blipbug",
    "dottler", "orbeetle", "rookidee", "corvisquire", "corviknight",
    "skwovet", "greedent", "nickit", "thievul", "yamper",
    "boltund", "rolycoly", "carkol", "coalossal", "applin",
    "flapple", "appletun", "silicobra", "sandaconda", "cramorant",
    "arrokuda", "barraskewda", "toxel", "toxtricity", "sizzlipede",
    "centiskorch", "clobbopus", "grapploct", "sinistea", "polteageist",
    "hatenna", "hattrem", "hatterene", "impidimp", "morgrem",
    "grimmsnarl", "obstagoon", "perrserker", "cursola", "sirfetchd",
    "runerigus", "milcery", "alcremie", "falinks", "pincurchin",
    "snom", "frosmoth", "stonjourner", "eiscue", "indeedee",
    "morpeko", "cufant", "copperajah", "dracozolt", "arctozolt",
    "dracovish", "arctovish", "duraludon", "dragapult", "zacian",
    "zamazenta", "eternatus", "kubfu", "urshifu", "zarude",
    "regieleki", "regidrago", "glastrier", "spectrier", "calyrex",
    // Gen 9
    "sprigatito", "floragato", "meowscarada", "fuecoco", "crocalor",
    "skeledirge", "quaxly", "quaxwell", "quaquaval", "lechonk",
    "oinkologne", "tarountula", "spidops", "nymble", "lokix",
    "pawmi", "pawmo", "pawmot", "tandemaus", "maushold",
    "fidough", "dachsbun", "smoliv", "dolliv", "arboliva",
    "squawkabilly", "nacli", "naclstack", "garganacl", "charcadet",
    "armarouge", "ceruledge", "tadbulb", "bellibolt", "wattrel",
    "kilowattrel", "maschiff", "mabosstiff", "shroodle", "grafaiai",
    "bramblin", "brambleghast", "toedscool", "toedscruel", "klawf",
    "capsakid", "scovillain", "rellor", "rabsca", "flittle",
    "espathra", "tinkatink", "tinkatuff", "tinkaton", "wiglett",
    "wugtrio", "bombirdier", "finizen", "palafin", "varoom",
    "revavroom", "cyclizar", "orthworm", "glimmet", "glimmora",
    "greavard", "houndstone", "flamigo", "cetoddle", "cetitan",
    "veluza", "dondozo", "tatsugiri", "annihilape", "clodsire",
    "farigiraf", "dudunsparce", "kingambit", "great-tusk", "scream-tail",
    "brute-bonnet", "flutter-mane", "slither-wing", "sandy-shocks",
    "iron-treads", "iron-bundle", "iron-hands", "iron-jugulis",
    "iron-moth", "iron-thorns", "roaring-moon", "iron-valiant",
    "wo-chien", "chien-pao", "ting-lu", "chi-yu",
    "walking-wake", "iron-leaves", "gouging-fire", "raging-bolt",
    "iron-boulder", "iron-crown", "koraidon", "miraidon",
  ];
  return fallbackNames.map(generateEntry);
}

async function main() {
  let entries;
  try {
    console.log('Fetching Pokémon list from PokeAPI...');
    const info = await fetchJSON('https://pokeapi.co/api/v2/pokemon?limit=1&offset=0');
    const totalCount = info.count;
    console.log(`Total Pokémon in API: ${totalCount}`);
    const data = await fetchJSON(`https://pokeapi.co/api/v2/pokemon?limit=${totalCount}&offset=0`);
    const names = data.results.map(r => r.name);
    console.log(`Fetched ${names.length} Pokémon from API`);
    entries = names.map(generateEntry);
  } catch (err) {
    console.warn('PokeAPI unavailable, using fallback list:', err.message);
    entries = generateFallback();
  }

  entries.sort((a, b) => a.key.localeCompare(b.key));

  const outputPath = path.join(__dirname, '..', 'data', 'pokemon_list.json');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(entries, null, 2) + '\n');
  console.log(`Wrote ${entries.length} entries to ${outputPath}`);
}

main().catch(console.error);
