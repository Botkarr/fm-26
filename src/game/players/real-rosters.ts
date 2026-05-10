import type { Pos, Foot } from "./attributes";

/* ============================================================
 * Valós NB I / NB II kulcsemberek 2024/25-26 keretek alapján.
 * Csak a kulcsjátékosok valós néven; a többit generátor tölti.
 * ca = current ability ~50..180 skálán (FM standard).
 * ============================================================ */

export type StarPlayer = {
  name: string;
  pos: Pos;
  ca: number;
  age: number;
  nationality?: string;
  foot?: Foot;
};

export const REAL_PLAYERS: Record<string, StarPlayer[]> = {
  /* ===== NB I ===== */
  ftc: [
    { name: "Dénes Dibusz",       pos: "GK", ca: 155, age: 34, nationality: "HU", foot: "right" },
    { name: "Habib Maïga",        pos: "MF", ca: 150, age: 28, nationality: "ML" },
    { name: "Cebrail Makreckis",  pos: "DF", ca: 145, age: 25, nationality: "LV" },
    { name: "Eldar Ćivić",        pos: "DF", ca: 145, age: 28, nationality: "BA" },
    { name: "Adama Traoré",       pos: "FW", ca: 160, age: 28, nationality: "ML" },
    { name: "Barnabás Varga",     pos: "FW", ca: 158, age: 30, nationality: "HU", foot: "right" },
    { name: "Krisztián Lisztes",  pos: "MF", ca: 152, age: 19, nationality: "HU" },
    { name: "Mohammad Abu Fani",  pos: "MF", ca: 148, age: 26, nationality: "IL" },
    { name: "Stefan Gartenmann",  pos: "DF", ca: 142, age: 27, nationality: "DK" },
    { name: "Naby Keita",         pos: "MF", ca: 155, age: 29, nationality: "GN" },
    { name: "Callum O'Dowda",     pos: "DF", ca: 145, age: 29, nationality: "IE", foot: "left" },
  ],
  puskas: [
    { name: "Tamás Markek",       pos: "GK", ca: 130, age: 25, nationality: "HU" },
    { name: "Dénes Dénes",        pos: "DF", ca: 125, age: 28, nationality: "HU" },
    { name: "Bálint Vécsei",      pos: "MF", ca: 138, age: 31, nationality: "HU" },
    { name: "Roland Sallói",      pos: "FW", ca: 135, age: 28, nationality: "HU" },
    { name: "Stefan Spirovski",   pos: "MF", ca: 132, age: 34, nationality: "MK" },
    { name: "Bence Mervó",        pos: "FW", ca: 128, age: 22, nationality: "HU" },
    { name: "Mathias Levak",      pos: "DF", ca: 130, age: 25, nationality: "HR" },
  ],
  paks: [
    { name: "Gergő Kovácsik",     pos: "GK", ca: 125, age: 36, nationality: "HU" },
    { name: "Bence Lenzsér",      pos: "DF", ca: 125, age: 30, nationality: "HU" },
    { name: "Ádám Vas",           pos: "DF", ca: 130, age: 30, nationality: "HU" },
    { name: "Bálint Szabó",       pos: "MF", ca: 132, age: 22, nationality: "HU" },
    { name: "Tamás Kis",          pos: "FW", ca: 128, age: 30, nationality: "HU" },
    { name: "János Hahn",         pos: "FW", ca: 132, age: 30, nationality: "HU" },
    { name: "Norbert Könyves",    pos: "FW", ca: 130, age: 35, nationality: "HU" },
    { name: "Krisztián Tamás",    pos: "MF", ca: 125, age: 26, nationality: "HU" },
  ],
  mtk: [
    { name: "Dávid Demjén",       pos: "GK", ca: 122, age: 30, nationality: "HU" },
    { name: "Levente Molnár",     pos: "DF", ca: 118, age: 27, nationality: "HU" },
    { name: "Patrik Vingler",     pos: "MF", ca: 120, age: 24, nationality: "HU" },
    { name: "Bence Lukács",       pos: "FW", ca: 122, age: 25, nationality: "HU" },
    { name: "Stipe Jurić",        pos: "MF", ca: 118, age: 28, nationality: "HR" },
  ],
  debrecen: [
    { name: "Filip Lichý",        pos: "GK", ca: 128, age: 28, nationality: "SK" },
    { name: "Dániel Lang",        pos: "DF", ca: 125, age: 32, nationality: "HU" },
    { name: "Erik Bárány",        pos: "FW", ca: 130, age: 28, nationality: "SK" },
    { name: "Filip Krastev",      pos: "MF", ca: 132, age: 23, nationality: "BG" },
    { name: "Marko Marin",        pos: "MF", ca: 130, age: 35, nationality: "DE" },
    { name: "Dorde Rakić",        pos: "FW", ca: 128, age: 26, nationality: "RS" },
  ],
  ujpest: [
    { name: "Tomislav Banić",     pos: "GK", ca: 128, age: 27, nationality: "HR" },
    { name: "Pierrot Yves",       pos: "FW", ca: 135, age: 26, nationality: "HT" },
    { name: "Branko Pauljević",   pos: "DF", ca: 125, age: 28, nationality: "RS" },
    { name: "Botond Antal",       pos: "MF", ca: 128, age: 23, nationality: "HU" },
    { name: "Aljaž Krefl",        pos: "DF", ca: 122, age: 27, nationality: "SI" },
    { name: "Florian Hoxha",      pos: "DF", ca: 125, age: 28, nationality: "AL" },
  ],
  kisvarda: [
    { name: "István Kovács",      pos: "GK", ca: 118, age: 27, nationality: "HU" },
    { name: "Dániel Mesanović",   pos: "FW", ca: 122, age: 27, nationality: "BA" },
    { name: "Krisztián Géresi",   pos: "FW", ca: 120, age: 32, nationality: "HU" },
    { name: "Stefan Spirovski",   pos: "MF", ca: 118, age: 33, nationality: "MK" },
  ],
  diosgyor: [
    { name: "Dávid Sentkereszti", pos: "GK", ca: 124, age: 26, nationality: "HU" },
    { name: "Marco Šokota",       pos: "DF", ca: 120, age: 30, nationality: "HR" },
    { name: "Bojan Sanković",     pos: "DF", ca: 122, age: 32, nationality: "ME" },
    { name: "Adis Jahović",       pos: "FW", ca: 125, age: 36, nationality: "MK" },
    { name: "Nemanja Ubiparip",   pos: "FW", ca: 122, age: 36, nationality: "RS" },
  ],
  gyor: [
    { name: "Patrik Demjén",      pos: "GK", ca: 122, age: 27, nationality: "HU" },
    { name: "Bence Mák",          pos: "MF", ca: 125, age: 24, nationality: "HU" },
    { name: "Botond Vitális",     pos: "MF", ca: 125, age: 24, nationality: "HU" },
    { name: "Patrick Soltesz",    pos: "DF", ca: 120, age: 26, nationality: "HU" },
    { name: "Marko Bajić",        pos: "MF", ca: 125, age: 28, nationality: "RS" },
  ],
  nyiregyhaza: [
    { name: "Dávid Kersák",       pos: "GK", ca: 118, age: 26, nationality: "HU" },
    { name: "Kornél Saláta",      pos: "DF", ca: 120, age: 35, nationality: "SK" },
    { name: "Vasja Marić",        pos: "FW", ca: 120, age: 28, nationality: "SI" },
    { name: "Bence Babos",        pos: "MF", ca: 118, age: 24, nationality: "HU" },
  ],
  zte: [
    { name: "Dejan Iliev",        pos: "GK", ca: 125, age: 30, nationality: "MK" },
    { name: "Stefan Spirovski",   pos: "MF", ca: 122, age: 33, nationality: "MK" },
    { name: "Cristian Ramírez",   pos: "DF", ca: 125, age: 30, nationality: "EC", foot: "left" },
    { name: "Nemanja Mihajlović", pos: "MF", ca: 128, age: 28, nationality: "RS" },
    { name: "Bence Sankovics",    pos: "MF", ca: 120, age: 25, nationality: "HU" },
  ],
  kazincbarcika: [
    { name: "Krisztián Hegedűs",  pos: "GK", ca: 115, age: 28, nationality: "HU" },
    { name: "Ádám Holdampf",      pos: "MF", ca: 118, age: 30, nationality: "HU" },
    { name: "Botond Csizmadia",   pos: "FW", ca: 115, age: 25, nationality: "HU" },
    { name: "Tamás Kovács",       pos: "DF", ca: 113, age: 27, nationality: "HU" },
  ],

  /* ===== NB II ===== */
  honved: [
    { name: "Dávid Banai",        pos: "GK", ca: 115, age: 30, nationality: "HU" },
    { name: "Ádám Bódi",          pos: "MF", ca: 120, age: 35, nationality: "HU" },
    { name: "Krisztián Lisztes",  pos: "MF", ca: 118, age: 26, nationality: "HU" },
    { name: "Bence Mezei",        pos: "DF", ca: 115, age: 26, nationality: "HU" },
  ],
  vasas: [
    { name: "Roland Veréb",       pos: "GK", ca: 115, age: 30, nationality: "HU" },
    { name: "Dávid Kovács",       pos: "MF", ca: 118, age: 27, nationality: "HU" },
    { name: "Marko Đukić",        pos: "DF", ca: 115, age: 27, nationality: "RS" },
    { name: "Bence Iyinbor",      pos: "FW", ca: 118, age: 26, nationality: "HU" },
  ],
  videoton: [
    { name: "Bartal Tóth",        pos: "GK", ca: 118, age: 28, nationality: "HU" },
    { name: "Dávid Hidi",         pos: "MF", ca: 120, age: 27, nationality: "HU" },
    { name: "Loïc Nego",          pos: "DF", ca: 122, age: 34, nationality: "FR" },
  ],
  kecskemet: [
    { name: "Dávid Varga",        pos: "GK", ca: 112, age: 30, nationality: "HU" },
    { name: "Kornél Szűcs",       pos: "DF", ca: 115, age: 26, nationality: "HU" },
    { name: "Tamás Vágó",         pos: "MF", ca: 118, age: 28, nationality: "HU" },
  ],
  mezokovesd: [
    { name: "Bence Bertoldi",     pos: "GK", ca: 110, age: 28, nationality: "HU" },
    { name: "Dávid Drazic",       pos: "DF", ca: 112, age: 30, nationality: "HU" },
    { name: "Erik Pekár",         pos: "MF", ca: 115, age: 28, nationality: "SK" },
  ],
  bekescsaba: [
    { name: "Bence Kővári",       pos: "GK", ca: 108, age: 27, nationality: "HU" },
    { name: "Dániel Csizmadia",   pos: "FW", ca: 112, age: 26, nationality: "HU" },
  ],
  budafok: [
    { name: "Patrik Hegyi",       pos: "GK", ca: 108, age: 26, nationality: "HU" },
    { name: "Roland Lukács",      pos: "FW", ca: 110, age: 28, nationality: "HU" },
  ],
  ajka: [
    { name: "Tamás Horváth",      pos: "GK", ca: 105, age: 29, nationality: "HU" },
    { name: "Dániel Tar",         pos: "MF", ca: 108, age: 25, nationality: "HU" },
  ],
  csakvar: [
    { name: "Mátyás Csizmadia",   pos: "GK", ca: 105, age: 27, nationality: "HU" },
  ],
  bvsc: [
    { name: "Bence Bíró",         pos: "GK", ca: 105, age: 28, nationality: "HU" },
  ],
  tiszakecske: [
    { name: "Tamás Banai",        pos: "GK", ca: 105, age: 27, nationality: "HU" },
  ],
  kozarmisleny: [
    { name: "Dávid Kapacina",     pos: "GK", ca: 102, age: 26, nationality: "HU" },
  ],
  karcag: [
    { name: "Bence Tóth",         pos: "GK", ca: 100, age: 26, nationality: "HU" },
  ],
  soroksar: [
    { name: "Patrik Vincze",      pos: "GK", ca: 102, age: 25, nationality: "HU" },
  ],
  szeged: [
    { name: "Dániel Vinczeffy",   pos: "GK", ca: 110, age: 30, nationality: "HU" },
    { name: "Bence Iyinbor",      pos: "FW", ca: 112, age: 26, nationality: "HU" },
  ],
  szentlorinc: [
    { name: "Roland Babos",       pos: "GK", ca: 102, age: 27, nationality: "HU" },
  ],
};
