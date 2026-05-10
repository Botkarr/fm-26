import { TEAMS, getTeam, teamStrength } from "./data";
import type { Tactics } from "./tactics";


/* ============================================================
 * Európai kupák — egyszerűsített BL / EL.
 *
 * Kvalifikáció: a szezonvégi NB I 1. helyezett → Bajnokok Ligája,
 * 2-3. helyezett → Európa Liga. (NB II-ből nincs.)
 *
 * Forma: 8 csapat csoportkör (8 fős mini liga, mindenki 7 meccs),
 * majd top 4 → kieséses (negyeddöntő → elődöntő → döntő).
 *
 * A 8 európai csapatból 1 a user, a többi 7 fiktív "top európai klub"
 * (rögzített pool, magyar-európai mintára). A fiktív klubok egyszerűsített
 * erősség-alapú szimulációval játszanak (nincs squad-juk).
 * ============================================================ */

export type EuropeCompetition = "cl" | "el" | "co";

export const EUROPE_LABEL: Record<EuropeCompetition, string> = {
  cl: "Bajnokok Ligája",
  el: "Európa Liga",
  co: "Konferencia Liga",
};

export const EUROPE_SHORT: Record<EuropeCompetition, string> = {
  cl: "BL",
  el: "EL",
  co: "KL",
};

export type EuropeStage = "group" | "sf" | "final" | "done";

export const EUROPE_STAGE_NAME: Record<EuropeStage, string> = {
  group: "Csoportkör",
  sf: "Elődöntő",
  final: "Döntő",
  done: "Befejezve",
};

/** Európai forduló-ütemezés (bajnoki forduló SZÁMA, ami után lejátszódik).
 * NB I 22 forduló — európai meccsek a köztes hetekre. */
export const EUROPE_GROUP_ROUNDS: Record<number, number> = {
  // group round → bajnoki round szám
  1: 2, 2: 5, 3: 7, 4: 10, 5: 13, 6: 15, 7: 17,
};
export const EUROPE_KO_ROUNDS = {
  sf: 19, final: 21,
};

/** Fiktív európai ellenfelek (nem magyar). Egyszerűsített rating + szín. */
export type FakeEuroClub = {
  id: string;
  name: string;
  short: string;
  country: string;
  flag: string;
  /** "Erősség" 100-180 — a magyar csapatok 60-170 közöttiek. */
  strength: number;
  color: string;
};

export const EURO_POOL_CL: FakeEuroClub[] = [
  { id: "rmd",  name: "Real Madrid",        short: "RMD", country: "ESP", flag: "🇪🇸", strength: 175, color: "oklch(0.95 0.02 90)" },
  { id: "mci",  name: "Manchester City",    short: "MCI", country: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", strength: 173, color: "oklch(0.7 0.15 220)" },
  { id: "bay",  name: "Bayern München",     short: "BAY", country: "GER", flag: "🇩🇪", strength: 170, color: "oklch(0.6 0.22 25)" },
  { id: "psg",  name: "Paris Saint-Germain",short: "PSG", country: "FRA", flag: "🇫🇷", strength: 168, color: "oklch(0.4 0.15 260)" },
  { id: "int",  name: "Inter",              short: "INT", country: "ITA", flag: "🇮🇹", strength: 165, color: "oklch(0.4 0.15 260)" },
  { id: "liv",  name: "Liverpool",          short: "LIV", country: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", strength: 165, color: "oklch(0.55 0.22 25)" },
  { id: "bar",  name: "Barcelona",          short: "BAR", country: "ESP", flag: "🇪🇸", strength: 167, color: "oklch(0.5 0.18 290)" },
  { id: "ats",  name: "Atlético Madrid",    short: "ATM", country: "ESP", flag: "🇪🇸", strength: 160, color: "oklch(0.6 0.2 25)" },
  { id: "dor",  name: "Borussia Dortmund",  short: "BVB", country: "GER", flag: "🇩🇪", strength: 158, color: "oklch(0.78 0.17 90)" },
  { id: "juv",  name: "Juventus",           short: "JUV", country: "ITA", flag: "🇮🇹", strength: 156, color: "oklch(0.95 0.01 240)" },
];

export const EURO_POOL_EL: FakeEuroClub[] = [
  { id: "ars",  name: "Arsenal",            short: "ARS", country: "ENG", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", strength: 152, color: "oklch(0.55 0.22 25)" },
  { id: "rom",  name: "Roma",               short: "ROM", country: "ITA", flag: "🇮🇹", strength: 145, color: "oklch(0.5 0.2 30)" },
  { id: "vil",  name: "Villarreal",         short: "VIL", country: "ESP", flag: "🇪🇸", strength: 142, color: "oklch(0.78 0.17 90)" },
  { id: "ben",  name: "Benfica",            short: "BEN", country: "POR", flag: "🇵🇹", strength: 148, color: "oklch(0.6 0.22 25)" },
  { id: "aja",  name: "Ajax",               short: "AJA", country: "NED", flag: "🇳🇱", strength: 140, color: "oklch(0.6 0.22 25)" },
  { id: "spo",  name: "Sporting CP",        short: "SPO", country: "POR", flag: "🇵🇹", strength: 144, color: "oklch(0.6 0.22 150)" },
  { id: "rbs",  name: "RB Salzburg",        short: "SLZ", country: "AUT", flag: "🇦🇹", strength: 138, color: "oklch(0.6 0.22 25)" },
  { id: "cfr",  name: "CFR Cluj",           short: "CFR", country: "ROU", flag: "🇷🇴", strength: 130, color: "oklch(0.55 0.2 290)" },
  { id: "sla",  name: "Slavia Praha",       short: "SLA", country: "CZE", flag: "🇨🇿", strength: 132, color: "oklch(0.55 0.22 25)" },
  { id: "mar",  name: "Olympique Marseille",short: "OM",  country: "FRA", flag: "🇫🇷", strength: 146, color: "oklch(0.7 0.15 220)" },
];

/** Egy résztvevő — vagy a user csapata, vagy fiktív euro-klub. */
export type EuroParticipant =
  | { kind: "user"; teamId: string }
  | { kind: "fake"; club: FakeEuroClub };

export type EuroMatch = {
  id: number;
  round: number; // group: 1..7, qf/sf/final: 1
  /** Két résztvevő. A `home`/`away` mező az ID (user esetén teamId, fake-nél club.id). */
  homeId: string;
  awayId: string;
  played: boolean;
  homeGoals?: number;
  awayGoals?: number;
};

export type EuroGroupRow = {
  participantId: string;
  p: number; w: number; d: number; l: number;
  gf: number; ga: number; pts: number;
};

export type EuropeState = {
  competition: EuropeCompetition;
  /** Aktuális szakasz. */
  stage: EuropeStage;
  /** 8 résztvevő — a user index 0. */
  participants: EuroParticipant[];
  /** Csoportkör meccsei. */
  groupMatches: EuroMatch[];
  /** Kieséses szakasz (qf, sf, final) meccsei. */
  knockoutMatches: EuroMatch[];
  /** Bajnok ID-je (user.teamId vagy fake.club.id). */
  championId?: string;
  /** A user kiesésének szakasza ("group" = nem jutott tovább, "qf"/"sf"/"final"/"champion"). */
  userExit?: "group" | "qf" | "sf" | "final" | "champion";
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Eldönti, hogy a user kvalifikálódott-e, és melyik kupára. */
export function qualifiesForEurope(args: {
  userDivision: "NB1" | "NB2";
  userPosition: number;
  wonCup: boolean;
}): EuropeCompetition | null {
  if (args.userDivision !== "NB1") return null;
  if (args.userPosition === 1) return "cl";
  if (args.userPosition <= 3) return "el";
  if (args.wonCup) return "el";
  return null;
}

/** Új európai kupa szezon eleji létrehozása. */
export function createEurope(userTeamId: string, comp: EuropeCompetition): EuropeState {
  const pool = comp === "cl" ? EURO_POOL_CL : EURO_POOL_EL;
  const opponents = shuffle(pool).slice(0, 7);
  const participants: EuroParticipant[] = [
    { kind: "user", teamId: userTeamId },
    ...opponents.map((c) => ({ kind: "fake" as const, club: c })),
  ];

  // Csoportkör: 7 forduló, mindenki mindenkivel egyszer
  const ids = participants.map(participantId);
  const groupMatches: EuroMatch[] = [];
  let mid = 0;
  // Round-robin (circle method)
  const arr = [...ids];
  if (arr.length % 2 === 1) arr.push("__BYE__");
  const n = arr.length;
  const rounds = n - 1;
  const half = n / 2;
  let rotated = [...arr];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = rotated[i];
      const b = rotated[n - 1 - i];
      if (a === "__BYE__" || b === "__BYE__") continue;
      const home = r % 2 === 0 ? a : b;
      const away = r % 2 === 0 ? b : a;
      groupMatches.push({ id: mid++, round: r + 1, homeId: home, awayId: away, played: false });
    }
    rotated = [rotated[0], rotated[n - 1], ...rotated.slice(1, n - 1)];
  }

  return {
    competition: comp,
    stage: "group",
    participants,
    groupMatches,
    knockoutMatches: [],
  };
}

export function participantId(p: EuroParticipant): string {
  return p.kind === "user" ? p.teamId : p.club.id;
}

export function participantName(p: EuroParticipant): string {
  return p.kind === "user" ? (getTeam(p.teamId)?.name ?? p.teamId) : p.club.name;
}

export function participantShort(p: EuroParticipant): string {
  return p.kind === "user" ? (getTeam(p.teamId)?.short ?? p.teamId) : p.club.short;
}

export function findParticipant(state: EuropeState, id: string): EuroParticipant | undefined {
  return state.participants.find((p) => participantId(p) === id);
}

/** Egyszerűsített meccs-szim két euro-résztvevő között. User esetén az engine simulateMatch-ét hívjuk. */
function simEuroMatch(
  state: EuropeState,
  homeId: string,
  awayId: string,
  opts?: { userTactics?: Tactics; userMoraleBoost?: number; userTeamId?: string },
): { hg: number; ag: number } {
  const home = findParticipant(state, homeId);
  const away = findParticipant(state, awayId);
  if (!home || !away) return { hg: 0, ag: 0 };

  // Ha a user részt vesz: a magyar csapat erőssége vs fiktív klub erőssége
  if (home.kind === "user" || away.kind === "user") {
    const userIsHome = home.kind === "user";
    const userTeam = getTeam(opts?.userTeamId ?? (home.kind === "user" ? home.teamId : (away as { kind: "user"; teamId: string }).teamId))!;
    const userStr = teamStrength(userTeam);
    const fake = (userIsHome ? away : home) as { kind: "fake"; club: FakeEuroClub };
    // Európai szint: a fake klubok +20–80 erősebbek mint az átlag magyar csapat.
    // Ezt a diff-et szimulált poisson-nal játszuk le — nem hívjuk az engine-t (squad-konzisztencia).
    const diff = userStr - fake.club.strength;
    const userBoost = opts?.userMoraleBoost ?? 0;
    const userLambda = Math.max(0.1, 1.1 + diff * 0.04 + (userIsHome ? 0.25 : 0) + userBoost);
    const fakeLambda = Math.max(0.15, 1.5 - diff * 0.04 + (userIsHome ? 0 : 0.2));
    const userGoals = poisson(userLambda);
    const fakeGoals = poisson(fakeLambda);
    return userIsHome
      ? { hg: userGoals, ag: fakeGoals }
      : { hg: fakeGoals, ag: userGoals };
  }

  // Két fake klub egymás ellen
  const hStr = (home as { kind: "fake"; club: FakeEuroClub }).club.strength;
  const aStr = (away as { kind: "fake"; club: FakeEuroClub }).club.strength;
  const diff = hStr - aStr;
  const hL = Math.max(0.2, 1.4 + diff * 0.04 + 0.25);
  const aL = Math.max(0.2, 1.3 - diff * 0.04);
  return { hg: poisson(hL), ag: poisson(aL) };
}

function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0; let p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return Math.min(7, k - 1);
}

/** Csoporttabella számítása. */
export function buildEuropeGroupTable(state: EuropeState): EuroGroupRow[] {
  const rows: Record<string, EuroGroupRow> = {};
  for (const p of state.participants) {
    rows[participantId(p)] = { participantId: participantId(p), p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
  }
  for (const m of state.groupMatches) {
    if (!m.played) continue;
    const h = rows[m.homeId]; const a = rows[m.awayId];
    if (!h || !a) continue;
    h.p++; a.p++;
    h.gf += m.homeGoals!; h.ga += m.awayGoals!;
    a.gf += m.awayGoals!; a.ga += m.homeGoals!;
    if (m.homeGoals! > m.awayGoals!) { h.w++; h.pts += 3; a.l++; }
    else if (m.homeGoals! < m.awayGoals!) { a.w++; a.pts += 3; h.l++; }
    else { h.d++; a.d++; h.pts++; a.pts++; }
  }
  return Object.values(rows).sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
}

/** Az aktuális csoportforduló user meccse. */
export function userEuropeMatchInRound(state: EuropeState, round: number, userTeamId: string): EuroMatch | undefined {
  if (state.stage !== "group") {
    // Knockout-ban van-e user meccs?
    return state.knockoutMatches.find((m) => !m.played && (m.homeId === userTeamId || m.awayId === userTeamId));
  }
  return state.groupMatches.find(
    (m) => m.round === round && !m.played && (m.homeId === userTeamId || m.awayId === userTeamId),
  );
}

/** A megadott csoportforduló minden hátralévő meccsét (a user MEZTLEN) szimulálja. */
export function finalizeEuropeRound(
  state: EuropeState,
  round: number,
  opts: { userTeamId: string; userTactics?: Tactics; userMoraleBoost?: number },
): EuropeState {
  if (state.stage !== "group") return state;
  const matches = state.groupMatches.map((m) => {
    if (m.round !== round || m.played) return m;
    const r = simEuroMatch(state, m.homeId, m.awayId, opts);
    return { ...m, played: true, homeGoals: r.hg, awayGoals: r.ag };
  });

  // Ha az utolsó (7.) csoportforduló is befejeződött → kieséses szakasz sorsolás
  const allGroupDone = matches.every((m) => m.played);
  let next: EuropeState = { ...state, groupMatches: matches };
  if (allGroupDone) {
    next = drawKnockout(next, opts.userTeamId);
  }
  return next;
}

/** Kieséses sorsolás: top 4 → 2 elődöntő → döntő. */
function drawKnockout(state: EuropeState, userTeamId: string): EuropeState {
  const table = buildEuropeGroupTable(state);
  const top4 = table.slice(0, 4).map((r) => r.participantId);
  // Elődöntők: 1. vs 4., 2. vs 3.
  const ko: EuroMatch[] = [
    { id: 0, round: 1, homeId: top4[0], awayId: top4[3], played: false },
    { id: 1, round: 1, homeId: top4[1], awayId: top4[2], played: false },
  ];
  const userIn = top4.includes(userTeamId);
  return {
    ...state,
    stage: "sf",
    knockoutMatches: ko,
    userExit: userIn ? undefined : "group",
  };
}

/** A megadott kieséses szakaszt fejezi be. */
export function finalizeKnockoutStage(
  state: EuropeState,
  opts: { userTeamId: string; userTactics?: Tactics; userMoraleBoost?: number },
): EuropeState {
  if (state.stage === "group" || state.stage === "done") return state;
  const stage = state.stage;
  const matches = state.knockoutMatches.map((m) => {
    if (m.played) return m;
    let r = simEuroMatch(state, m.homeId, m.awayId, opts);
    if (r.hg === r.ag) {
      const winnerHome = Math.random() < 0.5;
      r = winnerHome ? { hg: r.hg + 1, ag: r.ag } : { hg: r.hg, ag: r.ag + 1 };
    }
    return { ...m, played: true, homeGoals: r.hg, awayGoals: r.ag };
  });

  if (stage === "sf") {
    const sfMatches = matches.filter((m) => m.id <= 1);
    const winners = sfMatches.map((m) => (m.homeGoals! > m.awayGoals! ? m.homeId : m.awayId));
    const final: EuroMatch = { id: 2, round: 1, homeId: winners[0], awayId: winners[1], played: false };
    const userIn = winners.includes(opts.userTeamId);
    return {
      ...state,
      stage: "final",
      knockoutMatches: [...matches, final],
      userExit: userIn ? state.userExit : (state.userExit ?? "sf"),
    };
  }

  if (stage === "final") {
    const finalMatch = matches.find((m) => m.id === 2)!;
    const winner = finalMatch.homeGoals! > finalMatch.awayGoals! ? finalMatch.homeId : finalMatch.awayId;
    const userIn = winner === opts.userTeamId;
    return {
      ...state,
      stage: "done",
      knockoutMatches: matches,
      championId: winner,
      userExit: userIn ? "champion" : (state.userExit ?? "final"),
    };
  }

  return state;
}

/** Egyszerű tabella-megjelenítéshez: rangsor-pozíció. */
export function userPositionInGroup(state: EuropeState, userTeamId: string): number {
  const table = buildEuropeGroupTable(state);
  const idx = table.findIndex((r) => r.participantId === userTeamId);
  return idx + 1;
}

void TEAMS;
