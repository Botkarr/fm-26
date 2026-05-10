import type { PlayerProfile, Pos } from "./attributes";
import { generatePlayer, generateSquad, makeRng } from "./generate";

/* ============================================================
 * Kibővített globális adatbázis:
 *   - NB III (8 régió × 14 csapat = 112 csapat, lazy generált)
 *   - Ifi régiók (NB I + NB II klubok U19 keretei)
 *   - Európai topligák: PL, La Liga, Bundesliga, Serie A, Ligue 1
 *   - Globális free agent / scouting pool (~4000 fő)
 *
 * Az engine-t NEM érintjük: ezek a "böngészhető" külső adatbázis
 * (scouting, free agent piac, ifi felhozatal). Csak a UI olvassa.
 * Determinisztikus PRNG → stabil kerek a session során.
 * Lazy: csak akkor generálódik, amikor először lekérik.
 * ============================================================ */

export type ExtClub = {
  id: string;
  name: string;
  country: string;     // ISO-2
  league: string;      // pl. "Premier League", "NB III Kelet"
  baseCA: number;
  squad: PlayerProfile[];
};

/* ===================== NB III RÉGIÓK ===================== */

const NB3_REGIONS = [
  "Nyugat", "Közép", "Kelet", "Észak", "Dél", "Duna", "Tisza", "Alföld",
] as const;

const NB3_TOWN_FRAGMENTS = [
  "Pápa", "Tatabánya", "Várpalota", "Komló", "Siófok", "Cegléd", "Hatvan",
  "Salgótarján", "Eger", "Tata", "Dunaújváros", "Mosonmagyaróvár", "Sárospatak",
  "Szigetvár", "Kalocsa", "Mátészalka", "Szolnok", "Hajdúszoboszló", "Baja",
  "Nagykőrös", "Pásztó", "Gyöngyös", "Marcali", "Hódmezővásárhely", "Makó",
  "Csongrád", "Edelény", "Komárom", "Vác", "Esztergom", "Balassagyarmat",
  "Ózd", "Békés", "Orosháza", "Putnok", "Szerencs", "Sárvár", "Celldömölk",
  "Mór", "Bonyhád", "Dombóvár", "Mohács", "Salgótarján", "Eger",
];
const NB3_SUFFIX = ["FC", "SE", "VSC", "TC", "SC", "KSE"];

function nb3ClubName(seed: number): { name: string; short: string; town: string } {
  const r = makeRng(seed);
  const town = NB3_TOWN_FRAGMENTS[Math.floor(r() * NB3_TOWN_FRAGMENTS.length)];
  const suf = NB3_SUFFIX[Math.floor(r() * NB3_SUFFIX.length)];
  return { name: `${town} ${suf}`, short: town.slice(0, 3).toUpperCase(), town };
}

let _nb3Cache: Record<string, ExtClub[]> | null = null;
export function getNB3(): Record<string, ExtClub[]> {
  if (_nb3Cache) return _nb3Cache;
  const out: Record<string, ExtClub[]> = {};
  let seed = 13037;
  for (const region of NB3_REGIONS) {
    out[region] = [];
    for (let i = 0; i < 14; i++) {
      seed += 91;
      const { name, short, town } = nb3ClubName(seed);
      const baseCA = 60 + Math.floor(((seed * 7) % 35));
      out[region].push({
        id: `nb3_${region.toLowerCase()}_${i}`,
        name, country: "HU", league: `NB III ${region}`,
        baseCA,
        squad: generateSquad(seed * 31, baseCA, { hungarianRatio: 0.97 }),
      });
      void short; void town;
    }
  }
  _nb3Cache = out;
  return out;
}

/* ===================== IFI / U19 KERETEK ===================== */

let _youthCache: Record<string, PlayerProfile[]> | null = null;
/** Egy adott felnőtt klub U19 kerete (12-16 fiatal). */
export function getYouthSquad(clubId: string): PlayerProfile[] {
  if (!_youthCache) _youthCache = {};
  if (_youthCache[clubId]) return _youthCache[clubId];
  const seed = clubId.split("").reduce((a, c) => a + c.charCodeAt(0) * 17, 0);
  const r = makeRng(seed);
  const positions: Pos[] = ["GK", "GK", "DF", "DF", "DF", "DF", "MF", "MF", "MF", "MF", "FW", "FW", "FW", "FW"];
  const out = positions.map((pos, i) => {
    const ca = 50 + Math.floor(r() * 50); // 50..100
    const age = 15 + Math.floor(r() * 5); // 15..19
    return generatePlayer(seed + i * 71, { pos, ca, age, hungarian: r() < 0.92 });
  });
  _youthCache[clubId] = out;
  return out;
}

/* ===================== EURÓPAI TOPLIGÁK ===================== */

type EuroLeagueDef = {
  key: string;
  name: string;
  country: string;
  baseCA: number; // top csapat tipikus CA
  clubs: { name: string; baseCA: number }[];
};

const EURO: EuroLeagueDef[] = [
  {
    key: "premier", name: "Premier League", country: "EN", baseCA: 175,
    clubs: [
      { name: "Manchester City",     baseCA: 178 },
      { name: "Arsenal",             baseCA: 175 },
      { name: "Liverpool",           baseCA: 175 },
      { name: "Chelsea",             baseCA: 168 },
      { name: "Manchester United",   baseCA: 168 },
      { name: "Tottenham Hotspur",   baseCA: 165 },
      { name: "Newcastle United",    baseCA: 162 },
      { name: "Aston Villa",         baseCA: 160 },
      { name: "Brighton & Hove Albion", baseCA: 155 },
      { name: "West Ham United",     baseCA: 152 },
      { name: "Crystal Palace",      baseCA: 148 },
      { name: "Brentford",           baseCA: 145 },
      { name: "Fulham",              baseCA: 142 },
      { name: "Wolverhampton",       baseCA: 140 },
      { name: "Everton",             baseCA: 138 },
      { name: "Nottingham Forest",   baseCA: 138 },
      { name: "AFC Bournemouth",     baseCA: 135 },
      { name: "Leeds United",        baseCA: 132 },
      { name: "Burnley",             baseCA: 128 },
      { name: "Sunderland",          baseCA: 125 },
    ],
  },
  {
    key: "laliga", name: "La Liga", country: "ES", baseCA: 172,
    clubs: [
      { name: "Real Madrid",         baseCA: 180 },
      { name: "FC Barcelona",        baseCA: 175 },
      { name: "Atlético Madrid",     baseCA: 168 },
      { name: "Athletic Bilbao",     baseCA: 158 },
      { name: "Real Sociedad",       baseCA: 155 },
      { name: "Real Betis",          baseCA: 152 },
      { name: "Villarreal",          baseCA: 152 },
      { name: "Valencia",            baseCA: 145 },
      { name: "Sevilla",             baseCA: 148 },
      { name: "Girona",              baseCA: 145 },
      { name: "Celta Vigo",          baseCA: 140 },
      { name: "Rayo Vallecano",      baseCA: 138 },
      { name: "Osasuna",             baseCA: 135 },
      { name: "Mallorca",            baseCA: 132 },
      { name: "Getafe",              baseCA: 130 },
      { name: "Espanyol",            baseCA: 128 },
      { name: "Alavés",              baseCA: 128 },
      { name: "Levante",             baseCA: 125 },
      { name: "Elche",               baseCA: 122 },
      { name: "Real Oviedo",         baseCA: 120 },
    ],
  },
  {
    key: "bundes", name: "Bundesliga", country: "DE", baseCA: 170,
    clubs: [
      { name: "Bayern München",      baseCA: 178 },
      { name: "Bayer Leverkusen",    baseCA: 170 },
      { name: "Borussia Dortmund",   baseCA: 165 },
      { name: "RB Leipzig",          baseCA: 162 },
      { name: "VfB Stuttgart",       baseCA: 155 },
      { name: "Eintracht Frankfurt", baseCA: 152 },
      { name: "SC Freiburg",         baseCA: 145 },
      { name: "VfL Wolfsburg",       baseCA: 142 },
      { name: "Borussia Mönchengladbach", baseCA: 142 },
      { name: "Werder Bremen",       baseCA: 138 },
      { name: "TSG Hoffenheim",      baseCA: 138 },
      { name: "1. FC Köln",          baseCA: 135 },
      { name: "FSV Mainz 05",        baseCA: 135 },
      { name: "FC Augsburg",         baseCA: 132 },
      { name: "FC St. Pauli",        baseCA: 128 },
      { name: "1. FC Heidenheim",    baseCA: 125 },
      { name: "Hamburger SV",        baseCA: 132 },
      { name: "1. FC Union Berlin",  baseCA: 135 },
    ],
  },
  {
    key: "seriea", name: "Serie A", country: "IT", baseCA: 170,
    clubs: [
      { name: "Inter",               baseCA: 175 },
      { name: "Juventus",            baseCA: 168 },
      { name: "AC Milan",            baseCA: 168 },
      { name: "Napoli",              baseCA: 168 },
      { name: "Roma",                baseCA: 162 },
      { name: "Lazio",               baseCA: 158 },
      { name: "Atalanta",            baseCA: 162 },
      { name: "Fiorentina",          baseCA: 152 },
      { name: "Bologna",             baseCA: 150 },
      { name: "Torino",              baseCA: 142 },
      { name: "Udinese",             baseCA: 138 },
      { name: "Genoa",               baseCA: 135 },
      { name: "Cagliari",            baseCA: 132 },
      { name: "Hellas Verona",       baseCA: 132 },
      { name: "Lecce",               baseCA: 128 },
      { name: "Parma",               baseCA: 130 },
      { name: "Como",                baseCA: 132 },
      { name: "Empoli",              baseCA: 128 },
      { name: "Sassuolo",            baseCA: 130 },
      { name: "Pisa",                baseCA: 125 },
    ],
  },
  {
    key: "ligue1", name: "Ligue 1", country: "FR", baseCA: 168,
    clubs: [
      { name: "Paris Saint-Germain", baseCA: 178 },
      { name: "Marseille",           baseCA: 162 },
      { name: "Monaco",              baseCA: 158 },
      { name: "Lille",               baseCA: 152 },
      { name: "Lyon",                baseCA: 150 },
      { name: "Nice",                baseCA: 148 },
      { name: "Rennes",              baseCA: 145 },
      { name: "Strasbourg",          baseCA: 140 },
      { name: "Lens",                baseCA: 142 },
      { name: "Nantes",              baseCA: 138 },
      { name: "Toulouse",            baseCA: 135 },
      { name: "Brest",               baseCA: 138 },
      { name: "Reims",               baseCA: 135 },
      { name: "Montpellier",         baseCA: 132 },
      { name: "Angers",              baseCA: 128 },
      { name: "Auxerre",             baseCA: 128 },
      { name: "Le Havre",            baseCA: 125 },
      { name: "Metz",                baseCA: 125 },
    ],
  },
];

let _euroCache: Record<string, ExtClub[]> | null = null;
export function getEuropeanLeagues(): Record<string, ExtClub[]> {
  if (_euroCache) return _euroCache;
  const out: Record<string, ExtClub[]> = {};
  for (const l of EURO) {
    out[l.name] = l.clubs.map((c, i) => ({
      id: `${l.key}_${i}`,
      name: c.name,
      country: l.country,
      league: l.name,
      baseCA: c.baseCA,
      squad: generateSquad(
        l.key.charCodeAt(0) * 311 + i * 991 + c.baseCA * 7,
        c.baseCA,
        { hungarianRatio: 0.02 }, // top ligák: nemzetközi kerek
      ),
    }));
  }
  _euroCache = out;
  return out;
}

/* ===================== GLOBÁLIS FREE AGENT POOL ===================== */

let _faCache: PlayerProfile[] | null = null;
/** ~600 free agent (gyors teljes lista). Korábban is generált, stabil. */
export function getFreeAgents(): PlayerProfile[] {
  if (_faCache) return _faCache;
  const r = makeRng(424242);
  const out: PlayerProfile[] = [];
  const positions: Pos[] = ["GK", "DF", "MF", "FW"];
  for (let i = 0; i < 600; i++) {
    const pos = positions[Math.floor(r() * positions.length)];
    const ca = 50 + Math.floor(r() * 110); // 50..160
    const age = 18 + Math.floor(r() * 18);
    const hungarian = r() < 0.45;
    out.push(generatePlayer(800000 + i * 13, { pos, ca, age, hungarian }));
  }
  _faCache = out;
  return out;
}

/* ===================== ÖSSZESÍTETT STATISZTIKÁK ===================== */

export function getDatabaseStats() {
  // Lazy: csak akkor számolja, ha valaki kéri (és az egyes részek lazy-k).
  const nb3 = getNB3();
  const euro = getEuropeanLeagues();
  let nb3Count = 0;
  for (const reg of Object.values(nb3)) for (const c of reg) nb3Count += c.squad.length;
  let euroCount = 0;
  for (const lg of Object.values(euro)) for (const c of lg) euroCount += c.squad.length;
  const fa = getFreeAgents().length;
  const youth = 14 * 28; // 28 NB I/II klub × 14 fő
  return {
    nb3Clubs: Object.values(nb3).reduce((s, r) => s + r.length, 0),
    nb3Players: nb3Count,
    euroLeagues: Object.keys(euro).length,
    euroClubs: Object.values(euro).reduce((s, c) => s + c.length, 0),
    euroPlayers: euroCount,
    freeAgents: fa,
    youthPlayers: youth,
    totalEstimate: nb3Count + euroCount + fa + youth,
  };
}
