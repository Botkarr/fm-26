import type { PlayerProfile } from "./players/attributes";
import { generateSquadWithStars } from "./players/generate";
import { REAL_PLAYERS } from "./players/real-rosters";

/* ============================================================
 * Csapatok és játékosok — FM-szerű részletes adatbázissal.
 * A régi Player típus (name/pos/rating/age) megmarad mint
 * "lite view" — az engine ezt használja. A teljes profil
 * a player.profile mezőben elérhető a UI-nak.
 * ============================================================ */

export type Player = {
  name: string;
  pos: "GK" | "DF" | "MF" | "FW";
  rating: number; // 50-92, kompozit
  age: number;
  /** Teljes FM-szerű profil — UI-hoz / scoutinghoz. */
  profile?: PlayerProfile;
};

export type Division = "NB1" | "NB2";

export type Team = {
  id: string;
  name: string;
  short: string;
  city: string;
  color: string;
  manager: string;
  founded: number;
  stadium: string;
  defaultDivision: Division;
  squad: Player[];
};

const MANAGERS: Record<string, { name: string; founded: number; stadium: string }> = {
  ftc:           { name: "Robbie Keane",        founded: 1899, stadium: "Groupama Aréna" },
  puskas:        { name: "Hornyák Zsolt",       founded: 2005, stadium: "Pancho Aréna" },
  paks:          { name: "Bognár György",       founded: 1952, stadium: "Paksi FC Stadion" },
  mtk:           { name: "Horváth Dávid",       founded: 1888, stadium: "Hidegkuti Nándor Stadion" },
  debrecen:      { name: "Sergio Navarro",      founded: 1902, stadium: "Nagyerdei Stadion" },
  ujpest:        { name: "Damir Krznar",        founded: 1885, stadium: "Szusza Ferenc Stadion" },
  kisvarda:      { name: "Gerliczki Máté",      founded: 1911, stadium: "Várkerti Stadion" },
  diosgyor:      { name: "Vladimir Radenković", founded: 1910, stadium: "DVTK Stadion" },
  gyor:          { name: "Borbély Balázs",      founded: 1904, stadium: "ETO Park" },
  nyiregyhaza:   { name: "Szabó István",        founded: 1928, stadium: "Városi Stadion" },
  zte:           { name: "Márton Gábor",        founded: 1920, stadium: "ZTE Aréna" },
  kazincbarcika: { name: "Kuttor Attila",       founded: 1950, stadium: "Kolorcity Aréna" },
  honved:        { name: "Feczkó Tamás",        founded: 1909, stadium: "Bozsik Aréna" },
  vasas:         { name: "Kondás Elemér",       founded: 1911, stadium: "Illovszky Rudolf Stadion" },
  videoton:      { name: "Móri Tamás",          founded: 1941, stadium: "MOL Aréna Sóstó" },
  kecskemet:     { name: "Tímár Krisztián",     founded: 1911, stadium: "Széktói Stadion" },
  mezokovesd:    { name: "Bognár György",       founded: 1975, stadium: "Mezőkövesdi Városi Stadion" },
  bekescsaba:    { name: "Bertalan Zoltán",     founded: 1912, stadium: "Kórház utcai stadion" },
  budafok:       { name: "Csábi József",        founded: 1912, stadium: "Promontor utcai Stadion" },
  ajka:          { name: "Kis Károly",          founded: 1932, stadium: "Városi Sporttelep" },
  csakvar:       { name: "Kovács Zoltán",       founded: 1924, stadium: "AQVITAL Stadion" },
  bvsc:          { name: "Mészöly Géza",        founded: 1911, stadium: "Szőnyi úti stadion" },
  tiszakecske:   { name: "Pintér Attila",       founded: 1923, stadium: "Tiszakécske Sporttelep" },
  kozarmisleny:  { name: "Vas László",          founded: 1953, stadium: "Kozármislenyi Sportcentrum" },
  karcag:        { name: "Sándor Tamás",        founded: 1922, stadium: "Karcagi Városi Sporttelep" },
  soroksar:      { name: "Kalmár Zoltán",       founded: 1913, stadium: "Szamosi Mihály Sporttelep" },
  szeged:        { name: "Aczél Zoltán",        founded: 2011, stadium: "Szent Gellért Fórum" },
  szentlorinc:   { name: "Waltner Róbert",      founded: 1937, stadium: "Szentlőrinci Sporttelep" },
};

type RawTeam = {
  id: string; name: string; short: string; city: string; color: string;
  defaultDivision: Division;
  /** Bázis CA — a generátorhoz (50..180). */
  baseCA: number;
  /** Hány fős keret épüljön. */
  squadSize?: number;
};

const RAW_TEAMS: RawTeam[] = [
  // NB I
  { id: "ftc",           name: "Ferencváros",          short: "FTC",  city: "Budapest",      color: "oklch(0.6 0.22 150)",  defaultDivision: "NB1", baseCA: 145, squadSize: 24 },
  { id: "puskas",        name: "Puskás Akadémia",      short: "PAFC", city: "Felcsút",       color: "oklch(0.7 0.17 80)",   defaultDivision: "NB1", baseCA: 130, squadSize: 23 },
  { id: "paks",          name: "Paksi FC",             short: "PAKS", city: "Paks",          color: "oklch(0.65 0.2 30)",   defaultDivision: "NB1", baseCA: 128, squadSize: 23 },
  { id: "mtk",           name: "MTK Budapest",         short: "MTK",  city: "Budapest",      color: "oklch(0.65 0.18 250)", defaultDivision: "NB1", baseCA: 122, squadSize: 23 },
  { id: "debrecen",      name: "Debreceni VSC",        short: "DVSC", city: "Debrecen",      color: "oklch(0.65 0.2 30)",   defaultDivision: "NB1", baseCA: 124, squadSize: 23 },
  { id: "ujpest",        name: "Újpest FC",            short: "UTE",  city: "Budapest",      color: "oklch(0.55 0.2 290)",  defaultDivision: "NB1", baseCA: 122, squadSize: 23 },
  { id: "kisvarda",      name: "Kisvárda Master Good", short: "KMG",  city: "Kisvárda",      color: "oklch(0.7 0.17 80)",   defaultDivision: "NB1", baseCA: 118, squadSize: 22 },
  { id: "diosgyor",      name: "DVTK",                 short: "DVTK", city: "Miskolc",       color: "oklch(0.65 0.2 30)",   defaultDivision: "NB1", baseCA: 120, squadSize: 22 },
  { id: "gyor",          name: "ETO FC Győr",          short: "ETO",  city: "Győr",          color: "oklch(0.65 0.18 250)", defaultDivision: "NB1", baseCA: 122, squadSize: 23 },
  { id: "nyiregyhaza",   name: "Nyíregyháza Spartacus",short: "NYIR", city: "Nyíregyháza",   color: "oklch(0.7 0.17 80)",   defaultDivision: "NB1", baseCA: 116, squadSize: 22 },
  { id: "zte",           name: "ZTE FC",               short: "ZTE",  city: "Zalaegerszeg",  color: "oklch(0.65 0.18 250)", defaultDivision: "NB1", baseCA: 118, squadSize: 22 },
  { id: "kazincbarcika", name: "Kazincbarcikai SC",    short: "KSC",  city: "Kazincbarcika", color: "oklch(0.65 0.2 30)",   defaultDivision: "NB1", baseCA: 112, squadSize: 22 },
  // NB II
  { id: "honved",        name: "Budapest Honvéd",      short: "BHFC", city: "Budapest",      color: "oklch(0.6 0.2 30)",    defaultDivision: "NB2", baseCA: 112, squadSize: 22 },
  { id: "vasas",         name: "Vasas SC",             short: "VAS",  city: "Budapest",      color: "oklch(0.6 0.2 30)",    defaultDivision: "NB2", baseCA: 110, squadSize: 22 },
  { id: "videoton",      name: "Videoton FC Fehérvár", short: "VID",  city: "Székesfehérvár",color: "oklch(0.55 0.2 280)",  defaultDivision: "NB2", baseCA: 110, squadSize: 22 },
  { id: "kecskemet",     name: "Kecskeméti TE",        short: "KTE",  city: "Kecskemét",     color: "oklch(0.7 0.17 80)",   defaultDivision: "NB2", baseCA: 108, squadSize: 21 },
  { id: "mezokovesd",    name: "Mezőkövesd Zsóry",     short: "MZS",  city: "Mezőkövesd",    color: "oklch(0.6 0.2 30)",    defaultDivision: "NB2", baseCA: 105, squadSize: 21 },
  { id: "bekescsaba",    name: "Békéscsaba 1912",      short: "BCS",  city: "Békéscsaba",    color: "oklch(0.55 0.18 250)", defaultDivision: "NB2", baseCA: 102, squadSize: 21 },
  { id: "budafok",       name: "Budafoki MTE",         short: "BMTE", city: "Budapest",      color: "oklch(0.65 0.18 250)", defaultDivision: "NB2", baseCA: 100, squadSize: 21 },
  { id: "ajka",          name: "FC Ajka",              short: "AJK",  city: "Ajka",          color: "oklch(0.65 0.2 30)",   defaultDivision: "NB2", baseCA: 98,  squadSize: 21 },
  { id: "csakvar",       name: "Aqvital FC Csákvár",   short: "CSK",  city: "Csákvár",       color: "oklch(0.7 0.17 80)",   defaultDivision: "NB2", baseCA: 95,  squadSize: 21 },
  { id: "bvsc",          name: "BVSC-Zugló",           short: "BVSC", city: "Budapest",      color: "oklch(0.6 0.22 150)",  defaultDivision: "NB2", baseCA: 95,  squadSize: 21 },
  { id: "tiszakecske",   name: "Tiszakécskei LC",      short: "TLC",  city: "Tiszakécske",   color: "oklch(0.65 0.18 250)", defaultDivision: "NB2", baseCA: 95,  squadSize: 21 },
  { id: "kozarmisleny",  name: "HR-Rent Kozármisleny", short: "KOZ",  city: "Kozármisleny",  color: "oklch(0.6 0.2 30)",    defaultDivision: "NB2", baseCA: 92,  squadSize: 21 },
  { id: "karcag",        name: "Karcagi SE",           short: "KAR",  city: "Karcag",        color: "oklch(0.6 0.22 150)",  defaultDivision: "NB2", baseCA: 90,  squadSize: 21 },
  { id: "soroksar",      name: "Soroksár SC",          short: "SOR",  city: "Budapest",      color: "oklch(0.55 0.2 290)",  defaultDivision: "NB2", baseCA: 90,  squadSize: 21 },
  { id: "szeged",        name: "Szeged-Csanád GA",     short: "SZC",  city: "Szeged",        color: "oklch(0.6 0.22 150)",  defaultDivision: "NB2", baseCA: 100, squadSize: 21 },
  { id: "szentlorinc",   name: "Szentlőrinc SE",       short: "SZL",  city: "Szentlőrinc",   color: "oklch(0.65 0.2 30)",   defaultDivision: "NB2", baseCA: 90,  squadSize: 21 },
];

/** Profilból "lite" Player rekord. */
function toLitePlayer(p: PlayerProfile): Player {
  return { name: p.name, pos: p.pos, rating: p.rating, age: p.age, profile: p };
}

let seedCounter = 1;
function buildTeam(raw: RawTeam): Team {
  const stars = REAL_PLAYERS[raw.id] ?? [];
  const profiles = generateSquadWithStars(
    raw.id.charCodeAt(0) * 137 + (raw.baseCA * 31) + (seedCounter++ * 17),
    raw.baseCA,
    stars,
    raw.squadSize ?? 22,
  );
  const m = MANAGERS[raw.id] ?? { name: "Ismeretlen", founded: 1900, stadium: "Stadion" };
  return {
    id: raw.id,
    name: raw.name,
    short: raw.short,
    city: raw.city,
    color: raw.color,
    defaultDivision: raw.defaultDivision,
    manager: m.name,
    founded: m.founded,
    stadium: m.stadium,
    squad: profiles.map(toLitePlayer),
  };
}

export const TEAMS: Team[] = RAW_TEAMS.map(buildTeam);

export function getTeam(id: string) {
  return TEAMS.find((t) => t.id === id);
}

export function teamsByDefaultDivision(div: Division): Team[] {
  return TEAMS.filter((t) => t.defaultDivision === div);
}

export function teamStrength(team: Team) {
  const sorted = [...team.squad].sort((a, b) => b.rating - a.rating).slice(0, 11);
  return sorted.reduce((s, p) => s + p.rating, 0) / 11;
}

export const NB1_SIZE = 12;
export const NB2_SIZE = 16;
export const NB1_ROUNDS = (NB1_SIZE - 1) * 2; // 22
export const NB2_ROUNDS = (NB2_SIZE - 1) * 2; // 30
