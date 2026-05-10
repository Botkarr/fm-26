import { TEAMS, getTeam, teamStrength } from "./data";

/* ============================================================
 * Manager karrier — hírnév, klubajánlatok, célkitűzés, kirúgás.
 * Egyszerű, de hatásos modell: 0–100 hírnév, szezon eleji
 * board-elvárás, és a teljesítmény ezt formálja.
 * ============================================================ */

export type ManagerState = {
  /** Manager neve (user által adott vagy auto). */
  name: string;
  /** Hírnév 0–100. Nyert trófea, magas helyezés növeli; rossz forma csökkenti. */
  reputation: number;
  /** Hány szezont töltött a JELENLEGI klubnál. */
  seasonsAtClub: number;
  /** Mikor (melyik szezonban) szerződött ehhez a klubhoz. */
  hiredSeason: number;
  /** Aktuális szezon board-elvárása (helyezés vagy "trófea"). */
  expectation: BoardExpectation;
  /** Aktív állásajánlatok más kluboktól (max ~3). */
  jobOffers: JobOffer[];
  /** Kirúgási küszöb (0–100). Ha a board-bizalom ez alá esik → kirúgás. */
  boardConfidence: number;
  /** Trófeák, amiket ezzel a managerrel nyert (klubtól független). */
  trophies: Trophy[];
  /** Korábbi klubok listája (timeline). */
  pastClubs: { teamId: string; fromSeason: number; toSeason: number; reason: "resigned" | "fired" | "left_for_better" }[];
};

export type BoardExpectation = {
  /** Cél: helyezés legalább, vagy "champion", "promote", "avoid_relegation", "cup". */
  goal: "champion" | "top3" | "top6" | "midtable" | "avoid_relegation" | "promote" | "cup_run";
  /** Szöveges leírás. */
  text: string;
};

export type JobOffer = {
  id: string;
  fromTeamId: string;
  /** Hányadik szezonban érkezett (state.season). */
  season: number;
  /** Hányadik forduló után. */
  round: number;
  /** Lejárati forduló a JELENLEGI klubban (round-tól számítva). */
  expiresAfterRounds: number;
  /** Klub vonzereje 0..100 (a user dönthet). */
  prestige: number;
};

export type Trophy = {
  id: string;
  season: number;
  teamId: string;
  /** "league_nb1", "league_nb2", "cup", "europe_cl", "europe_el". */
  type: "league_nb1" | "league_nb2" | "cup" | "europe_cl" | "europe_el";
};

const FIRST_NAMES = [
  "Péter", "László", "Zoltán", "István", "Gábor", "József",
  "Bence", "Tamás", "Attila", "Dávid", "Krisztián", "Sándor",
];
const LAST_NAMES = [
  "Nagy", "Kovács", "Tóth", "Szabó", "Horváth", "Varga",
  "Kiss", "Molnár", "Németh", "Farkas", "Balogh", "Papp",
];

export function generateManagerName(): string {
  const f = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const l = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${l} ${f}`;
}

/** Klub-prestige: erősség alapján. */
export function clubPrestige(teamId: string): number {
  const t = getTeam(teamId);
  if (!t) return 30;
  const s = teamStrength(t);
  // ~60..170 erősség → 20..95 prestige
  return Math.max(15, Math.min(95, Math.round(((s - 60) / 110) * 75 + 20)));
}

/** Szezon eleji board-elvárás meghatározása erősség és klub alapján. */
export function deriveExpectation(teamId: string, division: "NB1" | "NB2"): BoardExpectation {
  const presti = clubPrestige(teamId);
  if (division === "NB2") {
    if (presti >= 60) return { goal: "promote", text: "Feljutás az NB I-be" };
    if (presti >= 40) return { goal: "top6", text: "Felsőházi rájátszás (top 6)" };
    return { goal: "midtable", text: "Stabil középmezőny" };
  }
  if (presti >= 80) return { goal: "champion", text: "Bajnoki cím" };
  if (presti >= 65) return { goal: "top3", text: "Európai kupa-indulás (top 3)" };
  if (presti >= 45) return { goal: "top6", text: "Felsőházi finis (top 6)" };
  if (presti >= 30) return { goal: "midtable", text: "Bentmaradás biztosítása" };
  return { goal: "avoid_relegation", text: "Bennmaradás" };
}

/** Új manager létrehozása. */
export function createManager(userTeamId: string, name?: string): ManagerState {
  const team = getTeam(userTeamId)!;
  return {
    name: name ?? generateManagerName(),
    reputation: clubPrestige(userTeamId) - 10,
    seasonsAtClub: 0,
    hiredSeason: 1,
    expectation: deriveExpectation(userTeamId, team.defaultDivision),
    jobOffers: [],
    boardConfidence: 60,
    trophies: [],
    pastClubs: [],
  };
}

/** Forduló utáni board-bizalom frissítés. */
export function updateBoardConfidence(
  manager: ManagerState,
  args: {
    currentPosition: number; // 1-indexed
    expectedPosition: number; // számolt cél-pozíció
    won: boolean; drew: boolean; lost: boolean;
    streak: number; // negatív = vereség, pozitív = győzelem
  },
): ManagerState {
  let conf = manager.boardConfidence;
  // Helyezés vs cél: minden hely amivel rosszabb -> -1.5; amivel jobb -> +1.0
  const posDelta = args.expectedPosition - args.currentPosition;
  conf += posDelta * 1.2;
  // Eredmény
  if (args.won) conf += 1.5;
  if (args.drew) conf += 0.2;
  if (args.lost) conf -= 2.0;
  // Sorozat
  if (args.streak <= -3) conf -= 6;
  if (args.streak >= 4) conf += 4;
  conf = Math.max(0, Math.min(100, conf));
  return { ...manager, boardConfidence: conf };
}

/** Hírnév frissítés szezon végén — helyezés és trófea alapján. */
export function updateReputationSeasonEnd(
  manager: ManagerState,
  args: {
    division: "NB1" | "NB2";
    finalPosition: number;
    wonLeague: boolean;
    wonCup: boolean;
    wonEurope?: "cl" | "el" | null;
    promoted: boolean;
    relegated: boolean;
    season: number;
    teamId: string;
  },
): ManagerState {
  let rep = manager.reputation;
  if (args.wonLeague) rep += args.division === "NB1" ? 18 : 8;
  if (args.wonCup) rep += 12;
  if (args.wonEurope === "cl") rep += 28;
  if (args.wonEurope === "el") rep += 16;
  if (args.promoted) rep += 10;
  if (args.relegated) rep -= 14;
  // Helyezés bónusz
  if (args.division === "NB1") {
    if (args.finalPosition === 1) rep += 4;
    else if (args.finalPosition <= 3) rep += 2;
    else if (args.finalPosition >= 10) rep -= 4;
  }
  rep = Math.max(0, Math.min(100, rep));

  const trophies = [...manager.trophies];
  if (args.wonLeague) trophies.push({ id: `t-${args.season}-l`, season: args.season, teamId: args.teamId, type: args.division === "NB1" ? "league_nb1" : "league_nb2" });
  if (args.wonCup) trophies.push({ id: `t-${args.season}-c`, season: args.season, teamId: args.teamId, type: "cup" });
  if (args.wonEurope === "cl") trophies.push({ id: `t-${args.season}-cl`, season: args.season, teamId: args.teamId, type: "europe_cl" });
  if (args.wonEurope === "el") trophies.push({ id: `t-${args.season}-el`, season: args.season, teamId: args.teamId, type: "europe_el" });

  return { ...manager, reputation: rep, trophies };
}

/** Generál egy állásajánlatot ha a hírnév megengedi és véletlenül "happen". */
export function maybeGenerateJobOffer(
  manager: ManagerState,
  userTeamId: string,
  season: number,
  round: number,
): JobOffer | null {
  if (manager.reputation < 50) return null;
  if (manager.jobOffers.length >= 3) return null;
  if (Math.random() > 0.04) return null;
  // Olyan klub keres minket, ami nálunk magasabb prestiggel bír
  const myPresti = clubPrestige(userTeamId);
  const candidates = TEAMS
    .filter((t) => t.id !== userTeamId)
    .filter((t) => clubPrestige(t.id) > myPresti)
    .filter((t) => clubPrestige(t.id) <= manager.reputation + 15)
    .filter((t) => !manager.jobOffers.some((o) => o.fromTeamId === t.id));
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return {
    id: `jo-${season}-${round}-${pick.id}`,
    fromTeamId: pick.id,
    season,
    round,
    expiresAfterRounds: 3,
    prestige: clubPrestige(pick.id),
  };
}

/** Lejárt állásajánlatok kiszűrése. */
export function expireJobOffers(manager: ManagerState, round: number): ManagerState {
  const offers = manager.jobOffers.filter((o) => round - o.round < o.expiresAfterRounds);
  if (offers.length === manager.jobOffers.length) return manager;
  return { ...manager, jobOffers: offers };
}

/** Manager-szerződés átkötése új klubhoz (a user új csapatot kap). */
export function switchClub(
  manager: ManagerState,
  newTeamId: string,
  oldTeamId: string,
  season: number,
  reason: "left_for_better" | "fired" | "resigned",
): ManagerState {
  const newTeam = getTeam(newTeamId)!;
  return {
    ...manager,
    seasonsAtClub: 0,
    hiredSeason: season,
    expectation: deriveExpectation(newTeamId, newTeam.defaultDivision),
    boardConfidence: 65,
    jobOffers: [],
    pastClubs: [
      ...manager.pastClubs,
      { teamId: oldTeamId, fromSeason: manager.hiredSeason, toSeason: season, reason },
    ],
  };
}

export const EXPECTATION_LABEL: Record<BoardExpectation["goal"], string> = {
  champion: "Bajnoki cím",
  top3: "Top 3",
  top6: "Top 6",
  midtable: "Középmezőny",
  avoid_relegation: "Bennmaradás",
  promote: "Feljutás",
  cup_run: "Kupamenetelés",
};

export const TROPHY_ICON: Record<Trophy["type"], string> = {
  league_nb1: "🏆",
  league_nb2: "🥈",
  cup: "🏅",
  europe_cl: "⭐",
  europe_el: "✨",
};

export const TROPHY_LABEL: Record<Trophy["type"], string> = {
  league_nb1: "NB I bajnok",
  league_nb2: "NB II bajnok",
  cup: "Magyar Kupa",
  europe_cl: "Bajnokok Ligája",
  europe_el: "Európa Liga",
};

/** Számolt "elvárt helyezés" — board confidence-hez. */
export function expectedPositionForGoal(goal: BoardExpectation["goal"], divSize: number): number {
  switch (goal) {
    case "champion": return 1;
    case "top3": return 3;
    case "top6": return 6;
    case "promote": return 2;
    case "midtable": return Math.floor(divSize / 2);
    case "avoid_relegation": return divSize - 2;
    case "cup_run": return Math.floor(divSize / 2);
  }
}
